// scripts/sync-holdings.mjs
// 자산현황_YYMMDD.xlsx (Google Drive, 고정 파일ID) → holdings.json 자동 동기화.
// · 파일명은 매주 바뀌지만 파일ID는 영구 고정 → ID로 fetch (리네임 무관).
// · 행 매핑은 '정리(26년)' 시트 고정 행 규칙(자산현황 작업가이드)을 따름. 행은 고정, 열만 매주 우측 누적.
// · 레이어 집계는 6/13 holdings.json 전 레이어 역산 검증 완료(2026-06-20).
// · 토요일 엑셀 = 금액(평가) 전체를 그대로 리셋(권위값). 추가로 수량·티커·통화·NH환율을 기록해
//   평일 하루 2회 시가평가(fetch-prices revalueHoldings)가 '수량 고정 × 최신가 × NH환율'로 돌게 한다.

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
  kospi50px:R(117),                                                // 시장지수비교 'PLUS 코스피50' 종가(코스피50 IRP 수량 역산용)
};

// 레이어 집계 정의 (OPS §7 · 6/13 역산 검증) — [layer, label, [ROW 키…], [detail name…](members)]
const LAYERS = [
  ['L2','연산칩 (마벨·KODEX 미국AI반도체TOP3+)',              ['marvell','dcTop3'],                                  ['마벨','KODEX 미국AI반도체TOP3+']],
  ['L3','메모리 (마이크론·삼성전자·HBM ETF·삼성SK채권혼합)',   ['micron','samsung','irpHBM','dcHBM','irpSSK','dcSSK'], ['마이크론','삼성전자','글로벌HBM반도체','삼성·SK 채권혼합']],
  ['L4','소부장 (KODEX AI반도체핵심장비)',                    ['dcEquip'],                                           ['KODEX AI반도체핵심장비']],
  ['L6','연결 (루멘텀·KODEX 미국AI광통신네트워크)',            ['lumentum','dcOptic'],                                ['루멘텀','KODEX 미국AI광통신네트워크']],
  ['L7','전력·냉각 in-rack (버티브)',                         ['vertiv'],                                            ['버티브']],
  ['L8','그리드·송전·발전 (KODEX·SOL 전력ETF + 블룸)',        ['bloom','dcPower','dcSolPower'],                      ['블룸에너지','KODEX AI전력핵심설비','SOL 미국AI전력인프라']],
  ['기타','테슬라',                                          ['tesla'],                                             ['테슬라']],
  ['기타','지수·채권혼합 (코스피50·채권혼합)',                ['irpKospi','irpBond','dcBond'],                       ['코스피50','코스피200 채권혼합']],
  ['현금','현금',                                            ['pCash','dcCash'],                                    ['현금']],
];

// 종목 단위 분해 (index.html HOLD_DETAIL 머지 키 = name, 정확히 일치시킬 것)
// [name, ticker, layer, [평가 ROW 키…], meta] — IRP+DC 동일 instrument는 합산.
// meta.priceKey = prices.json quotes 키(개별주는 기존 키 재사용) · ccy · mkt(시세 소스)
// meta.qk = 수량 서브행이 있는 ROW 키(개인·DC, cellAt +1) · meta.irp = [[평가키,현재가키]](IRP분 역산)
// meta.pxRow/irpEval = IRP 전용(코스피50)용 벤치마크 종가행으로 수량 역산.
const DETAIL = [
  ['마벨','MRVL','L2',['marvell'],                 {priceKey:'mrvl',ccy:'USD',mkt:'NASDAQ',qk:['marvell']}],
  ['KODEX 미국AI반도체TOP3+','0151S0','L2',['dcTop3'],{priceKey:'k_semitop3',ccy:'KRW',mkt:'KOSPI',qk:['dcTop3']}],
  ['마이크론','MU','L3',['micron'],                {priceKey:'mu',ccy:'USD',mkt:'NASDAQ',qk:['micron']}],
  ['글로벌HBM반도체','442580','L3',['irpHBM','dcHBM'],{priceKey:'k_hbm',ccy:'KRW',mkt:'KOSPI',qk:['dcHBM'],irp:[['irpHBM','dcHBM']]}],
  ['삼성전자','005930','L3',['samsung'],           {priceKey:'sec',ccy:'KRW',mkt:'KOSPI',qk:['samsung']}],
  ['삼성·SK 채권혼합','0162Z0','L3',['irpSSK','dcSSK'],{priceKey:'k_ssk',ccy:'KRW',mkt:'KOSPI',qk:['dcSSK'],irp:[['irpSSK','dcSSK']]}],
  ['KODEX AI반도체핵심장비','471990','L4',['dcEquip'],{priceKey:'kodexeq',ccy:'KRW',mkt:'KOSPI',qk:['dcEquip']}],
  ['루멘텀','LITE','L6',['lumentum'],              {priceKey:'lite',ccy:'USD',mkt:'NASDAQ',qk:['lumentum']}],
  ['KODEX 미국AI광통신네트워크','0173Y0','L6',['dcOptic'],{priceKey:'optetf',ccy:'KRW',mkt:'KOSPI',qk:['dcOptic']}],
  ['버티브','VRT','L7',['vertiv'],                 {priceKey:'vrt',ccy:'USD',mkt:'NYSE',qk:['vertiv']}],
  ['KODEX AI전력핵심설비','487240','L8',['dcPower'],{priceKey:'k_power',ccy:'KRW',mkt:'KOSPI',qk:['dcPower']}],
  ['SOL 미국AI전력인프라','486450','L8',['dcSolPower'],{priceKey:'k_solpower',ccy:'KRW',mkt:'KOSPI',qk:['dcSolPower']}],
  ['블룸에너지','BE','L8',['bloom'],               {priceKey:'be',ccy:'USD',mkt:'NYSE',qk:['bloom']}],
  ['테슬라','TSLA','기타',['tesla'],               {priceKey:'tsla',ccy:'USD',mkt:'NASDAQ',qk:['tesla']}],
  ['코스피50','122090','기타',['irpKospi'],        {priceKey:'k_kospi50',ccy:'KRW',mkt:'KOSPI',pxRow:'kospi50px',irpEval:'irpKospi'}],
  ['코스피200 채권혼합','183700','기타',['irpBond','dcBond'],{priceKey:'k_kbbond',ccy:'KRW',mkt:'KOSPI',qk:['dcBond'],irp:[['irpBond','dcBond']]}],
  ['현금','—','현금',['pCash','dcCash'],            {}],
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

// 수량 산출: 개인·DC 는 수량 서브행 직접(qk), IRP분은 DC 현재가로 역산(irp), 코스피50(IRP전용)은 벤치마크 종가로 역산(pxRow).
// 가격이 유효하지 않으면 null 반환 → 시가평가에서 그 라인은 직전 amt 유지(비파괴).
function qtyOf(m, cell, cellAt) {
  if (!m || (!m.qk && !m.irp && !m.pxRow)) return null;   // 현금
  let q = 0;
  if (m.qk) for (const k of m.qk) q += cellAt(k, 1);
  if (m.irp) for (const [ek, pk] of m.irp) { const px = cellAt(pk, 3); if (!(px > 0)) return null; q += Math.round(cell(ek) / px); }
  if (m.pxRow) { const px = cell(m.pxRow), ev = cell(m.irpEval); if (!(px > 0)) return null; q += Math.round(ev / px); }
  return q > 0 ? q : null;
}

function build({ asOf, cell, cellAt }) {
  const totalNH = cell('total');                            // NH합계(73) = 권위값
  let layerSum = 0;
  const holdings = LAYERS.map(([layer, label, keys, members]) => {
    const amt = keys.reduce((a, k) => a + cell(k), 0);
    layerSum += amt;
    return { layer, label, amt: Math.round(amt / 1e6), w: +((amt / totalNH) * 100).toFixed(1), members };
  });

  // 안전 가드 — 추적종목 추가/행 이동 시 침묵 오류 차단(OPS §1). IRP 미추적 잔차(~2만원) 허용.
  const drift = Math.abs(totalNH - layerSum);
  if (drift > 1_000_000)
    throw new Error(`스키마 드리프트 의심: NH합계 ${totalNH.toLocaleString()} vs 레이어합 ${layerSum.toLocaleString()} ` +
                    `(차 ${drift.toLocaleString()}원). ROW/LAYERS 맵과 시트 추적종목을 대조하라.`);

  const detail = DETAIL.map(([name, ticker, layer, keys, meta]) => {
    const amt = keys.reduce((a, k) => a + cell(k), 0);
    const row = { name, ticker, layer, amt: Math.round(amt / 1e6), w: +((amt / totalNH) * 100).toFixed(2) };
    if (meta && meta.priceKey) {
      const qty = qtyOf(meta, cell, cellAt);
      row.qty = qty; row.priceKey = meta.priceKey; row.ccy = meta.ccy; row.mkt = meta.mkt;
    }
    return row;
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

  // NH 적용환율 = US 개별주 KRW평가합 ÷ USD가치합(수량×현재가). 평일 시가평가에서 USD 라인에 곱함.
  let usKRW = 0, usUSD = 0;
  for (const key of ['marvell', 'micron', 'lumentum', 'vertiv', 'bloom', 'tesla']) {
    usKRW += cell(key); usUSD += cellAt(key, 1) * cellAt(key, 3);
  }
  const fx = usUSD > 0 ? +(usKRW / usUSD).toFixed(1) : null;
  if (!(fx > 500 && fx < 3000))
    throw new Error(`NH 환율 역산 이상: ${fx} (usKRW=${usKRW} usUSD=${usUSD}). US 블록 정렬 확인.`);

  return { asOf, total: Math.round(totalNH / 1e6), holdings, detail, avg, fx, totalNH };
}

const next = build(parse(await downloadXlsx()));

let prev = {};
try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}
const wow = prev.total ? ((next.total / prev.total - 1) * 100).toFixed(1) : null;

// note는 편집성(괴리율·이벤트 코멘트)이라 자동은 사실 스텁만. 직전 note 보존 금지(침묵 스테일 방지).
const out = {
  asOf: next.asOf,          // 시가평가 asOf(주간 동기 직후=체결일). 평일 fetch-prices가 시가평가 시각으로 갱신.
  qtyAsOf: next.asOf,       // 수량(체결) 기준일 — 주간 엑셀 동기 때만 갱신. 보드 '체결일' 표기용.
  total: next.total,
  fx: { usdkrw: next.fx, asOf: next.asOf, src: 'NH 엑셀 역산(US KRW평가÷USD가치)' },
  note: `자산현황 ${next.asOf} 자동 동기화 · total ${next.total}M` +
        (wow !== null ? ` (WoW ${wow >= 0 ? '+' : ''}${wow}%)` : '') +
        `. 금액·비중은 하루 2회 시가 파생(fetch-prices, 수량 고정×최신가×NH환율) · 수량(체결)은 이 주간 동기만 갱신. ` +
        `레이어=holdings[].w·종목=detail[].w·수량=detail[].qty·평단=avg{}·환율=fx.usdkrw. ※ 괴리율·이벤트 등 편집성 메모는 수동 보강.`,
  holdings: next.holdings,
  detail: next.detail,
  avg: next.avg,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
const missing = next.detail.filter(d => d.priceKey && d.qty == null).map(d => d.name);
console.log(`holdings.json 갱신: asOf=${out.asOf} total=${out.total}M fx=${next.fx} ` +
            `drift=${Math.round(Math.abs(next.totalNH - next.holdings.reduce((s,h)=>s+h.amt*1e6,0))).toLocaleString()}원` +
            (missing.length ? ` · 수량 역산 실패(플랫 유지): ${missing.join(', ')}` : ''));
