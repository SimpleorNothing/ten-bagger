// scripts/fetch-tsla-deliveries.mjs  ← 테스트 버전(임시 교체용)
// ───────────────────────────────────────────────────────────────────────────
// ⚠️ 이것은 Slack 알림 경로 검증 전용 테스트입니다.
//    - 이미 발표된 Q1 2026(실제 358,023대)을 강제로 fetch → 무조건 summary 생성
//    - signal_log.json은 건드리지 않음(리포 오염 방지)
//    - dispatch 실행 시 Slack이 오는지만 확인
//    검증 끝나면 원본 fetch-tsla-deliveries.mjs로 되돌릴 것.
// ───────────────────────────────────────────────────────────────────────────
import fs from "node:fs";

// 이미 발표된 분기로 고정 (Q1 2026)
const QI = 0;                 // first quarter
const YEAR = 2026;
const QUARTER_WORD = ["first", "second", "third", "fourth"];

function candidateUrls(qi, year) {
  const w = QUARTER_WORD[qi];
  return [
    `https://ir.tesla.com/press-release/tesla-${w}-quarter-${year}-production-deliveries-and-deployments`,
    `https://ir.tesla.com/press-release/tesla-${w}-quarter-${year}-production-deliveries-deployments`,
  ];
}
async function fetchText(url) {
  try { const r = await fetch(url, { headers: { "user-agent": "alpha-map-bot/1.0" } }); return r.ok ? await r.text() : null; }
  catch { return null; }
}
function parseReport(text) {
  if (!text) return null;
  const norm = text.replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const del = norm.match(/delivered over ([\d,]+) vehicles/i);
  const prod = norm.match(/produced over ([\d,]+) vehicles/i);
  const gwh = norm.match(/deployed ([\d.]+) GWh/i);
  const toNum = (s) => Number(s.replace(/,/g, ""));
  if (!del) return null;
  return { deliveries: toNum(del[1]), production: prod ? toNum(prod[1]) : null, energyGWh: gwh ? Number(gwh[1]) : null };
}
function fmt(n) { return n == null ? "—" : n.toLocaleString("en-US"); }

async function main() {
  const qLabel = `Q${QI + 1} ${YEAR}`;
  let report = null;
  for (const u of candidateUrls(QI, YEAR)) { report = parseReport(await fetchText(u)); if (report) break; }

  // fetch/파싱 실패해도 알림 경로 검증은 되도록 폴백 값 사용
  if (!report) {
    console.log("[test] 실측 파싱 실패 — 폴백 값으로 Slack 경로만 검증");
    report = { deliveries: 358023, production: 362615, energyGWh: 12.5 };
  }

  const consensus = Number(process.env.TSLA_CONSENSUS_FALLBACK || "0") || null;
  const pctStr = consensus ? `${(((report.deliveries - consensus) / consensus) * 100).toFixed(1)}%` : "—";

  const summary =
    `🧪 [TEST] TSLA ${qLabel} 인도 보고 (알림 경로 검증)\n`
  + `인도 ${fmt(report.deliveries)} / 컨센(폴백) ${fmt(consensus)} → *${pctStr}*\n`
  + `생산 ${fmt(report.production)} · 에너지 ${report.energyGWh ?? "—"}GWh\n`
  + `※ 이것은 테스트 알림입니다. signal_log 미변경. 확인 후 원본 복구.`;

  console.log(summary);
  const out = process.env.GITHUB_OUTPUT;
  if (out) fs.appendFileSync(out, `summary<<EOF\n${summary}\nEOF\n`);
}
main().catch((e) => { console.log("[test] 예외:", e?.message); });
