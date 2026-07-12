// scripts/sync-holdings.mjs
// 자산현황_YYMMDD.xlsx (Google Drive, 고정 파일ID) → holdings.json 자동 동기화.
// · 파일명은 매주 바뀌지만 파일ID는 영구 고정 → ID로 fetch (리네임 무관).
// · 행 매핑은 '정리(26년)' 시트 고정 행 규칙(자산현황 작업가이드)을 따름. 행은 고정, 열만 매주 우측 누적.
// · 레이어 집계는 6/13 holdings.json 전 레이어 역산 검증 완료(2026-06-20).

import { google } from 'googleapis';
import * as XLSX from 'xlsx';
import fs from 'node:fs';

const FILE_ID = '12dHsxFAc3ZfQrIySL6CDfvA9mO9HPpxe';   // 자산현황 (리네임돼도 ID 불변)
const SHEET   = '정리(26년)';
const OUT     = 'holdings.json';
const YEAR    = 2026;

// '평가금액' 행 = 각 종목 4셀 블록(평가/수량/매입/현재)의 첫 셀. 1-indexed 시트행 → 0-indexed.
const R = n => n - 1;
const ROW = {
  tesla:R(5), marvell:R(9), micron:R(13), lumentum:R(17), vertiv:R(21),
  bloom:R(25), samsung:R(29), pCash:R(33),                         // 개인투자
  irpKospi:R(35), irpBond:R(36), irpHBM:R(37), irpSSK:R(38),       // IRP
  dcBond:R(40), dcTop3:R(44), dcHBM:R(48), dcSSK:R(52),            // DC
  dcEquip:R(56), dcOptic:R(60), dcPower:R(64), dcSolPower:R(68), dcCash:R(72),
  total:R(73),                                                     // NH합계(총자산)=권위값
};

// 레이어 집계 정의 (OPS §7 · 6/13 역산 검증) — [layer, label, [ROW 키…]]
const LAYERS = [
  ['L2','연산칩 (마벨·KODEX 미국AI반도체TOP3+)',              ['marvell','dcTop3']],
  ['L3','메모리 (마이크론·삼성전자·HBM ETF·삼성SK채권혼합)',   ['micron','samsung','irpHBM','dcHBM','irpSSK','dcSSK']],
  ['L4','소부장 (KODEX AI반도체핵심장비)',                    ['dcEquip']],
  ['L6','연결 (루멘텀·KODEX 미국AI광통신네트워크)',            ['lumentum','dcOptic']],
  ['L7','전력·냉각 in-rack (버티브)',                         ['vertiv']],
  ['L8','그리드·송전·발전 (KODEX·SOL 전력ETF + 블룸)',        ['bloom','dcPower','dcSolPower']],
  ['기타','테슬라',                                          ['tesla']],
  ['기타','지수·채권혼합 (코스피50·채권혼합)',                ['irpKospi','irpBond','dcBond']],
  ['현금','현금',                                            ['pCash','dcCash']],
];

// 종목 단위 분해 (index.html HOLD_DETAIL 머지 키 = name, 정확히 일치시킬 것)
// [name, ticker, layer, [ROW 키…]] — IRP+DC 동일 instrument는 합산.
const DETAIL = [
  ['마벨','MRVL','L2',['marvell']],
  ['KODEX 미국AI반도체TOP3+','ETF','L2',['dcTop3']],
  ['마이크론','MU','L3',['micron']],
  ['글로벌HBM반도체','ETF','L3',['irpHBM','dcHBM']],
  ['삼성전자','005930','L3',['samsung']],
  ['삼성·SK 채권혼합','ETF','L3',['irpSSK','dcSSK']],
  ['KODEX AI반도체핵심장비','471990','L4',['dcEquip']],
  ['루멘텀','LITE','L6',['lumentum']],
  ['KODEX 미국AI광통신네트워크','0173Y0','L6',['dcOptic']],
  ['버티브','VRT','L7',['vertiv']],
  ['KODEX AI전력핵심설비','ETF','L8',['dcPower']],
  ['SOL 미국AI전력인프라','ETF','L8',['dcSolPower']],
  ['블룸에너지','BE','L8',['bloom']],
  ['테슬라','TSLA','기타',['tesla']],
  ['코스피50','ETF','기타',['irpKospi']],
  ['코스피200 채권혼합','ETF','기타',['irpBond','dcBond']],
  ['현금','—','현금',['pCash','dcCash']],
];

const num = v => {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  return Number(String(v).replace(/[",\s]/g, '')) || 0;
};

async function downloadXlsx() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GDRIVE_SA_KEY),     // 서비스계정 JSON (GitHub Secret)
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const drive = google.drive({ version: 'v3', auth });
  const res = await drive.files.get(
    { fileId: FILE_ID, alt: 'media' },                       // xlsx 원본 바이트 다운로드
    { responseType: 'arraybuffer' }
  );
  return Buffer.from(res.data);
}

function parse(buf) {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[SHEET];
  if (!ws) throw new Error(`시트 '${SHEET}' 없음`);
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });

  // 날짜 헤더 행(상단 6행 내 'M.D' 패턴) → 가장 오른쪽 날짜 열 = 최신 데이터 열
  let hdrRow = -1;
  for (let i = 0; i < 6; i++)
    if ((grid[i] || []).some(c => /^\d{1,2}\.\d{1,2}$/.test(String(c).trim()))) { hdrRow = i; break; }
  if (hdrRow < 0) throw new Error('날짜 헤더 행 못 찾음');

  let col = -1, label = '';
  grid[hdrRow].forEach((c, j) => {
    if (/^\d{1,2}\.\d{1,2}$/.test(String(c).trim())) { col = j; label = String(c).trim(); }
  });
  const [mm, dd] = label.split('.').map(Number);
  const asOf = `${YEAR}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const cell = key => num((grid[ROW[key]] || [])[col]);
  const cellAt = (key, off) => num((grid[ROW[key] + off] || [])[col]);   // 0=평가 1=수량 2=매입가 3=현재가
  return { asOf, cell, cellAt };
}

// 평단 추출 대상 (개별 종목만 — ETF·현금은 xlsx에 매입가 블록 없음). [프론트 차트 키, ROW 키]
const AVG_KEYS = [
  ['mrvl','marvell'], ['mu','micron'], ['lite','lumentum'],
  ['vrt','vertiv'],   ['be','bloom'],  ['tsla','tesla'],
];

function build({ asOf, cell, cellAt }) {
  const totalNH = cell('total');                            // NH합계(73) = 권위값
  let layerSum = 0;
  const holdings = LAYERS.map(([layer, label, keys]) => {
    const amt = keys.reduce((a, k) => a + cell(k), 0);
    layerSum += amt;
    return { layer, label, amt: Math.round(amt / 1e6), w: +((amt / totalNH) * 100).toFixed(1) };
  });

  // 안전 가드 — 추적종목 추가/행 이동 시 침묵 오류 차단(OPS §1). IRP 미추적 잔차(~2만원) 허용.
  const drift = Math.abs(totalNH - layerSum);
  if (drift > 1_000_000)
    throw new Error(`스키마 드리프트 의심: NH합계 ${totalNH.toLocaleString()} vs 레이어합 ${layerSum.toLocaleString()} ` +
                    `(차 ${drift.toLocaleString()}원). ROW/LAYERS 맵과 시트 추적종목을 대조하라.`);

  const detail = DETAIL.map(([name, ticker, layer, keys]) => {
    const amt = keys.reduce((a, k) => a + cell(k), 0);
    return { name, ticker, layer, amt: Math.round(amt / 1e6), w: +((amt / totalNH) * 100).toFixed(2) };
  });

  // 평단(주당 매입가) — 블록 오프셋 +2. 수량·현재가 동시 검증으로 행 이동(스키마 드리프트) 침묵 오류 차단.
  const avg = {};
  for (const [id, key] of AVG_KEYS) {
    const qty = cellAt(key, 1), px = cellAt(key, 2), cur = cellAt(key, 3);
    if (!(qty > 0 && px > 0 && cur > 0))
      throw new Error(`평단 블록 드리프트 의심: ${id}(${key}) 수량=${qty} 매입가=${px} 현재가=${cur}. ` +
                      `ROW 맵과 시트 블록(평가/수량/매입/현재) 정렬을 대조하라.`);
    avg[id] = +px.toFixed(2);
  }

  return { asOf, total: Math.round(totalNH / 1e6), holdings, detail, avg, totalNH };
}

const next = build(parse(await downloadXlsx()));

let prev = {};
try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}
const wow = prev.total ? ((next.total / prev.total - 1) * 100).toFixed(1) : null;

// note는 편집성(괴리율·이벤트 코멘트)이라 자동은 사실 스텁만. 직전 note 보존 금지(침묵 스테일 방지).
const out = {
  asOf: next.asOf,
  total: next.total,
  note: `자산현황 ${next.asOf} 자동 동기화 · total ${next.total}M` +
        (wow !== null ? ` (WoW ${wow >= 0 ? '+' : ''}${wow}%)` : '') +
        `. 레이어 비중은 holdings[].w·종목 비중은 detail[].w·평단(주당 매입가)은 avg{} 참조. ※ 괴리율·이벤트 등 편집성 메모는 수동 보강.`,
  holdings: next.holdings,
  detail: next.detail,
  avg: next.avg,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`holdings.json 갱신: asOf=${out.asOf} total=${out.total}M ` +
            `drift=${Math.round(Math.abs(next.totalNH - next.holdings.reduce((s,h)=>s+h.amt*1e6,0))).toLocaleString()}원`);
