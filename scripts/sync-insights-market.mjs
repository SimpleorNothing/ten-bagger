/* R2 insights.json의 채택된 매크로 관점을 01에 1회 동기화한다.
   모든 매크로 관점은 시장 맥락(signal_log.json)에 남기고, FOMC·CPI·고용처럼
   기존 일정 카드와 정확히 연결되는 확정 결과만 calendar.json의 같은 카드에 덧붙인다.
   숫자 보드·보유비중은 수정하지 않는다. */
import fs from "node:fs";

const [insightsPath = "insights.json", logPath = "signal_log.json", calendarPath = "calendar.json"] = process.argv.slice(2);
const insights = JSON.parse(fs.readFileSync(insightsPath, "utf8"));
const doc = JSON.parse(fs.readFileSync(logPath, "utf8"));
const calendar = JSON.parse(fs.readFileSync(calendarPath, "utf8"));
if (!Array.isArray(insights)) throw new Error("insights.json은 배열이어야 합니다.");
if (!Array.isArray(doc.log)) doc.log = [];
if (!Array.isArray(calendar.events)) calendar.events = [];

const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const norm = (v) => String(v ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
const eligible = (c) => {
  const n = Number(c?.novelty || 0), i = Number(c?.impact || 0), f = Number(c?.confidence || 0);
  return c?.pick !== false && c?.route === "macro" && c?.text && n + i + f >= 4 && i >= 1 && f >= 1;
};
const already = new Set(doc.log.flatMap((entry) => (entry.items || []).map((item) => norm(item?.html))));
const kst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace("Z", "+09:00");
const date = kst.slice(0, 10);
let added = 0, calendarUpdated = 0;

function eventFor(claim, src) {
  const text = `${claim?.text || ""} ${claim?.why || ""} ${src?.title || ""} ${src?.publisher || ""}`.toLowerCase();
  const patterns = [
    [/\bfomc\b|federal reserve|연방공개시장위원회|연준.{0,12}(금리|결정|통화정책)/i, /\bfomc\b|연준/i],
    [/\bcpi\b|소비자물가/i, /\bcpi\b|소비자물가/i],
    [/\bpce\b|개인소비지출물가/i, /\bpce\b|개인소비지출/i],
    [/\bppi\b|생산자물가/i, /\bppi\b|생산자물가/i],
    [/\bnfp\b|고용보고서|실업률|비농업/i, /고용보고서|\bnfp\b|실업률/i],
    [/\becb\b|유럽중앙은행/i, /\becb\b|유럽중앙은행/i],
    [/\bboj\b|일본은행.*(금정|금리|통화정책)/i, /일본은행|\bboj\b/i],
    [/한국.*(금통위|기준금리)|한국은행.*(금통위|기준금리)/i, /한국 금통위|한국은행/i],
  ];
  for (const [claimPattern, eventPattern] of patterns) {
    if (!claimPattern.test(text)) continue;
    const matches = calendar.events.filter((event) => eventPattern.test(`${event.lbl || ""} ${event.meta || ""}`));
    if (!matches.length) return null;
    // 날짜가 있는 원문은 같은 발표일에 가장 가까운 카드만 고른다. 과거 결과가 다음 회의
    // 일정에 잘못 섞이지 않도록 최대 10일 차이 밖의 카드는 갱신하지 않는다.
    const srcDate = String(src?.date || "").match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (!srcDate) return matches[0];
    const base = Date.parse(`${srcDate}T00:00:00Z`);
    const nearest = matches.map((event) => ({ event, gap: Math.abs(Date.parse(`${event.d}T00:00:00Z`) - base) / 86400000 }))
      .filter((x) => Number.isFinite(x.gap) && x.gap <= 10)
      .sort((a, b) => a.gap - b.gap)[0];
    return nearest?.event || null;
  }
  return null;
}

function updateCalendar(event, claim, src) {
  if (!event) return false;
  const incoming = [claim.text, claim.why].filter(Boolean).join(" · ").replace(/\s+/g, " ").trim();
  if (!incoming || norm(event.meta).includes(norm(claim.text))) return false;
  const source = [src?.title, src?.publisher, src?.date].filter(Boolean).join(" · ");
  event.meta = [event.meta, `02 인사이트 결과: ${incoming}`, source ? `출처: ${source}` : ""].filter(Boolean).join(" · ").slice(0, 900);
  return true;
}

for (const rec of insights) {
  for (const claim of (rec?.claims || [])) {
    if (!eligible(claim)) continue;
    const src = rec.src || {};
    const needle = norm(claim.text);
    if (needle && ![...already].some((old) => old.includes(needle) || needle.includes(old))) {
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
    if (updateCalendar(eventFor(claim, src), claim, src)) calendarUpdated++;
  }
}
if (added) doc.asOf = date;
if (calendarUpdated) calendar.asOf = kst;
fs.writeFileSync(logPath, JSON.stringify(doc, null, 2) + "\n");
fs.writeFileSync(calendarPath, JSON.stringify(calendar, null, 2) + "\n");
console.log(`동기화 완료: 시장 맥락 ${added}건 · 일정 카드 ${calendarUpdated}건`);
