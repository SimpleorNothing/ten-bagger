/* R2 insights.json의 채택된 매크로 관점을 01 시장 맥락(signal_log.json)에 1회 동기화한다.
   숫자 보드·보유비중은 수정하지 않는다. */
import fs from "node:fs";

const [insightsPath = "insights.json", logPath = "signal_log.json"] = process.argv.slice(2);
const insights = JSON.parse(fs.readFileSync(insightsPath, "utf8"));
const doc = JSON.parse(fs.readFileSync(logPath, "utf8"));
if (!Array.isArray(insights)) throw new Error("insights.json은 배열이어야 합니다.");
if (!Array.isArray(doc.log)) doc.log = [];

const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const norm = (v) => String(v ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
const eligible = (c) => {
  const n = Number(c?.novelty || 0), i = Number(c?.impact || 0), f = Number(c?.confidence || 0);
  return c?.pick !== false && c?.route === "macro" && c?.text && n + i + f >= 4 && i >= 1 && f >= 1;
};
const already = new Set(doc.log.flatMap((entry) => (entry.items || []).map((item) => norm(item?.html))));
const kst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace("Z", "+09:00");
const date = kst.slice(0, 10);
let added = 0;

for (const rec of insights) {
  for (const claim of (rec?.claims || [])) {
    if (!eligible(claim)) continue;
    const needle = norm(claim.text);
    if (!needle || [...already].some((old) => old.includes(needle) || needle.includes(old))) continue;
    const src = rec.src || {};
    const srcLabel = [src.title, src.publisher, src.date].filter(Boolean).join(" · ") || "02 인사이트 찾기 채택 관점";
    const srcDate = /^\d{4}-\d{2}-\d{2}$/.test(String(src.date || "")) ? src.date : date;
    const why = String(claim.why || "").trim();
    doc.log.push({
      date: srcDate,
      at: kst,
      source: `${srcLabel} — 02 인사이트 R2 일괄 반영`,
      srcs: [{ label: srcLabel, ...(src.url ? { url: String(src.url).slice(0, 1000) } : {}) }],
      items: [{
        tag: "매크로·인사이트 반영",
        layer: claim.layer || null,
        col: "#e03131",
        html: `<b>${esc(claim.text)}</b>${why ? ` ${esc(why)}` : ""} <b>narrative≠numbers — 숫자 파일 불변.</b>`,
      }],
    });
    already.add(needle);
    added++;
  }
}
if (added) doc.asOf = date;
fs.writeFileSync(logPath, JSON.stringify(doc, null, 2) + "\n");
console.log(`동기화 완료: ${added}건 추가`);
