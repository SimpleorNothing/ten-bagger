// scripts/fetch-tsla-deliveries.mjs
// ───────────────────────────────────────────────────────────────────────────
// 알파맵 — 테슬라 분기 인도 보고 자동 센싱 (위성 / narrative≠numbers)
//
// 1) 직전 분기의 IR 인도 보도자료 URL 후보 생성 → fetch → 인도량·GWh 파싱
// 2) IR 컨센 페이지에서 해당 분기 Total 컨센 파싱(실패 시 폴백 상수)
// 3) 비트/미스 1차 태깅(±베이스효과 캐비엇 포함)
// 4) signal_log.json에 엔트리 append (idempotent: 이미 있으면 skip)
// 5) GH Actions output 'summary'로 알림 텍스트 노출
//
// ⚠️ 초안: URL 패턴('and' 유무)·파싱 정규식은 발표 포맷 변동 시 점검 필요.
//    실패해도 throw하지 않고 'skip' 처리 → 다음 cron/세션에서 재시도.
// ───────────────────────────────────────────────────────────────────────────
import fs from "node:fs";

const QUARTER_WORD = ["first", "second", "third", "fourth"];

// 직전 분기 산출 (발표는 분기 종료 후 2일이므로 '직전 분기'가 대상)
function prevQuarter(now = new Date()) {
  const m = now.getUTCMonth();         // 0~11
  const y = now.getUTCFullYear();
  const q = Math.floor(m / 3);         // 0~3 (현재 분기)
  // 직전 분기
  if (q === 0) return { qi: 3, year: y - 1 };  // 1월 발표 → 작년 Q4
  return { qi: q - 1, year: y };
}

function candidateUrls(qi, year) {
  const w = QUARTER_WORD[qi];
  // 'and' 유무가 분기마다 달라 둘 다 시도
  return [
    `https://ir.tesla.com/press-release/tesla-${w}-quarter-${year}-production-deliveries-deployments`,
    `https://ir.tesla.com/press-release/tesla-${w}-quarter-${year}-production-deliveries-and-deployments`,
  ];
}

async function fetchText(url) {
  try {
    const r = await fetch(url, { headers: { "user-agent": "alpha-map-bot/1.0" } });
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; }
}

// 보도자료 본문에서 인도/생산/에너지 파싱
function parseReport(text) {
  if (!text) return null;
  const norm = text.replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const del = norm.match(/delivered over ([\d,]+) vehicles/i);
  const prod = norm.match(/produced over ([\d,]+) vehicles/i);
  const gwh = norm.match(/deployed ([\d.]+) GWh/i);
  if (!del) return null;
  const toNum = (s) => Number(s.replace(/,/g, ""));
  return {
    deliveries: toNum(del[1]),
    production: prod ? toNum(prod[1]) : null,
    energyGWh: gwh ? Number(gwh[1]) : null,
  };
}

// IR 컨센 페이지에서 해당 분기 Total 컨센 파싱(폴백: env 상수)
async function fetchConsensus(qi, year) {
  const w = QUARTER_WORD[qi];
  const url = `https://ir.tesla.com/press-release/delivery-consensus-${w}-quarter-${year}`;
  const t = await fetchText(url);
  // 표에서 'Total deliveries ... <Q컨센>' 추출은 포맷 의존 → 실패 시 폴백
  const m = t && t.replace(/\s+/g, " ").match(/Total deliveries[^\d]*[\d,]+[^\d]+([\d,]+)/i);
  if (m) return Number(m[1].replace(/,/g, ""));
  const fb = Number(process.env.TSLA_CONSENSUS_FALLBACK || "0");
  return fb > 0 ? fb : null;
}

function classify(deliveries, consensus) {
  if (!consensus) return { tag: "확인필요", col: "#e03131" };
  const d = deliveries - consensus;
  const pct = (d / consensus) * 100;
  if (pct >= 2.5) return { tag: "강비트", col: "#0ca678", pct };
  if (pct >= 0.5) return { tag: "비트", col: "#0ca678", pct };
  if (pct > -1.0) return { tag: "인라인", col: "#868e96", pct };
  return { tag: "미스", col: "#e03131", pct };
}

function fmt(n) { return n == null ? "—" : n.toLocaleString("en-US"); }

async function main() {
  const { qi, year } = prevQuarter();
  const qLabel = `Q${qi + 1} ${year}`;
  const stamp = new Date().toISOString();

  // ── 1) 보도자료 fetch ──
  let report = null;
  for (const u of candidateUrls(qi, year)) {
    report = parseReport(await fetchText(u));
    if (report) break;
  }
  if (!report) {
    console.log(`[skip] ${qLabel} 인도 보도자료 미게시/파싱실패 — 다음 트리거 재시도`);
    return;
  }

  // ── 2) signal_log idempotency ──
  const path = "signal_log.json";
  const raw = JSON.parse(fs.readFileSync(path, "utf8"));
  const log = Array.isArray(raw.log) ? raw.log : [];
  const uniq = `TSLA-DLV-${qLabel}`;
  if (JSON.stringify(log).includes(uniq)) {
    console.log(`[skip] ${qLabel} 이미 적재됨(${uniq})`);
    return;
  }

  // ── 3) 컨센·분류 ──
  const consensus = await fetchConsensus(qi, year);
  const c = classify(report.deliveries, consensus);
  const pctStr = c.pct != null ? `${c.pct >= 0 ? "+" : ""}${c.pct.toFixed(1)}%` : "";

  // ── 4) 엔트리 append ──
  const entry = {
    date: stamp.slice(0, 10),
    at: stamp,
    source: `[${uniq}] TSLA ${qLabel} 인도 보고 자동 센싱 — 위성·narrative≠numbers(stage 무변, 게이트 판단용)`,
    srcs: [{ label: "Tesla IR Production & Deliveries", url: candidateUrls(qi, year)[0] }],
    items: [{
      tag: `TSLA 인도 ${c.tag}`,
      layer: "기타",
      col: c.col,
      html: `${qLabel}: 인도 <b>${fmt(report.deliveries)}</b> (컨센 ${fmt(consensus)} 대비 ${pctStr}) · `
          + `생산 ${fmt(report.production)} · 에너지 ${report.energyGWh ?? "—"}GWh. `
          + `⚠️ 베이스효과·매물벽 반응 미반영 — 트림 실행가는 호출 세션에서 확정.`,
    }],
  };
  log.push(entry);
  raw.log = log;
  fs.writeFileSync(path, JSON.stringify(raw, null, 2));
  console.log(`[ok] ${qLabel} 적재: 인도 ${fmt(report.deliveries)} (${c.tag} ${pctStr})`);

  // ── 5) 알림 텍스트 → GH output ──
  const summary =
    `🚗 TSLA ${qLabel} 인도 보고\n`
  + `인도 ${fmt(report.deliveries)} / 컨센 ${fmt(consensus)} → *${c.tag} ${pctStr}*\n`
  + `생산 ${fmt(report.production)} · 에너지 ${report.energyGWh ?? "—"}GWh\n`
  + `※ 1차 태깅. 매물벽·거래량 반응은 알파맵 호출로 확정.`;
  const out = process.env.GITHUB_OUTPUT;
  if (out) fs.appendFileSync(out, `summary<<EOF\n${summary}\nEOF\n`);
}

main().catch((e) => { console.log("[skip] 예외 — 다음 트리거 재시도:", e?.message); });
