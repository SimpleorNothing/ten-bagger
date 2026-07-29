// 04 signal_log 자동 캡처 크론 러너.
// 흐름: earnings-watch.json 읽기 → 사이트 로그인(비밀번호 게이트, daily-brief-slack.mjs 의
// warmLogin() 과 동일 패턴) → POST /api/earnings-capture(쿠키 포함) → 결과를 슬랙 DM 로 요약.
// 실제 조사·작성·검증·커밋은 전부 워커(handleEarningsCapture)가 한다 — 이 스크립트는 트리거·보고만.
// narrative≠numbers — 이 경로는 signal_log.json 만 건드린다(워커 코드 자체가 다른 파일에 쓰지 않음).
import { readFileSync } from "node:fs";

const SITE_URL = process.env.SITE_URL || "https://simpleornothing.com";
const SITE_PW = process.env.SITE_PASSWORD;
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_DM = process.env.SLACK_DM_CHANNEL;

function loadWatch() {
  // EC_TARGETS/EC_CONTEXT 로 워크플로 dispatch 시 즉석 오버라이드 가능(선택) — 기본은 리포 파일.
  const envTargets = process.env.EC_TARGETS ? JSON.parse(process.env.EC_TARGETS) : null;
  if (envTargets && envTargets.length) {
    return { targets: envTargets, context: process.env.EC_CONTEXT || "" };
  }
  const w = JSON.parse(readFileSync("earnings-watch.json", "utf8"));
  return { targets: Array.isArray(w.targets) ? w.targets : [], context: w.context || "" };
}

async function login() {
  const res = await fetch(`${SITE_URL}/__auth`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: SITE_PW }).toString(),
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  const sc = res.headers.get("set-cookie");
  if (!sc) throw new Error(`사이트 로그인 실패 (${res.status}) — SITE_PASSWORD 확인`);
  return sc.split(";")[0];
}

async function slack(text) {
  if (!SLACK_TOKEN || !SLACK_DM) { console.log("[slack] 토큰/채널 없음 — 콘솔에만 출력\n" + text); return; }
  const r = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8", "authorization": `Bearer ${SLACK_TOKEN}` },
    body: JSON.stringify({ channel: SLACK_DM, text }),
  });
  const j = await r.json();
  if (!j.ok) console.log("[slack] 전송 실패:", j.error);
}

async function main() {
  const { targets, context } = loadWatch();
  if (!targets.length) {
    console.log("[earnings-capture] earnings-watch.json targets 비어있음 — 건너뜀");
    return;
  }
  if (!SITE_PW) throw new Error("SITE_PASSWORD 없음");

  console.log("[earnings-capture] targets:", targets.map((t) => t.ticker).join(", "));
  const cookie = await login();

  const res = await fetch(`${SITE_URL}/api/earnings-capture`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ targets, context }),
    signal: AbortSignal.timeout(150000),
  });
  const j = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = `⚠️ *signal_log 자동 캡처 실패* (${targets.map((t) => t.ticker).join("·")})\n` +
      `상태 ${res.status} · ${j.error || "unknown error"}`;
    console.log(msg);
    await slack(msg);
    return;
  }
  if (j.changed === false) {
    console.log("[earnings-capture] 변경 없음:", j.reason);
    // 중복 스킵은 정상 동작(같은 날 재실행) — 슬랙 소음 방지 위해 조용히 넘어간다.
    return;
  }

  const tags = (j.entry && j.entry.tags) || [];
  const msg = `📥 *signal_log 자동 캡처 완료* — ${targets.map((t) => t.ticker).join("·")}\n` +
    `날짜 ${j.entry?.date || "?"} · ${j.entry?.source || ""}\n` +
    (tags.length ? `태그: ${tags.join(" · ")}\n` : "") +
    (j.commitSha ? `커밋 \`${String(j.commitSha).slice(0, 7)}\`\n` : "") +
    `📄 <${SITE_URL}/#v-thread|04 시장과 실적 전망에서 확인>`;
  console.log(msg);
  await slack(msg);
}

main().catch(async (e) => {
  console.error("[earnings-capture] 실패:", e.message);
  await slack(`⚠️ *signal_log 자동 캡처 스크립트 오류*\n${e.message}`);
  process.exitCode = 1;
});
