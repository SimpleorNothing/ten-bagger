/* 주간 브리핑 러너 — 토 09:00 KST (weekly-brief-slack.yml)
 *
 * 데일리(daily-brief-slack.mjs)와 역할이 다르다.
 *   데일리 = 매일 07:45, 본문에 게이트 보드·레이어 갭을 결정론적으로 계산해 싣는다.
 *   주간   = 토 09:00, 본문은 짧게 두고 **주간 회차(span=w)를 미리 굽는 것**이 본업이다.
 *
 * 왜 09:00 인가: 08:30 compute-alpha.yml 이 alpha.json 을 재계산한다. 08:00 에 발행하면
 * 모멘텀이 한 주 스테일이다. 06:37 signals·prices(금요일 미국 종가) → 08:30 alpha → 09:00 주간.
 *
 * narrative ≠ numbers — 이 러너는 라이브 값을 읽어 회차를 만들고 링크를 보낼 뿐,
 * gamma·judgment·holdings·earnings 어느 것도 쓰지 않는다.
 */

const TOKEN = process.env.SLACK_BOT_TOKEN;
const DM = process.env.SLACK_DM_CHANNEL;
const SITE_URL = process.env.SITE_URL || "https://simpleornothing.com";
const BRIEF_URL = process.env.BRIEF_URL || "https://simpleornothing.com/brief.html";
const SITE_PW = process.env.SITE_PASSWORD;

/* 게이트(비밀번호) 뒤라 러너가 직접 로그인해 쿠키를 받는다. daily 와 같은 패턴. */
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

/* 주간 회차 워밍. p0(텍스트 12섹션)는 항상, 대담(w1·w2)은 WEEKLY_WARM_PODCAST=1 일 때만.
   주간 텍스트는 max_tokens 8000 + 신용 보드가 FRED 를 2회 치므로 타임아웃을 넉넉히 준다. */
async function warmWeekly() {
  if (!SITE_PW) { console.log("[weekly] SITE_PASSWORD 없음 — 워밍 건너뜀"); return null; }
  let head = null;
  try {
    const cookie = await login();
    const parts = process.env.WEEKLY_WARM_PODCAST ? [0, 1, 2] : [0];
    for (const p of parts) {
      try {
        const r = await fetch(`${SITE_URL}/api/brief?span=w&part=${p}`, {
          headers: { cookie }, signal: AbortSignal.timeout(180000),
        });
        const j = await r.json().catch(() => ({}));
        if (j.error) { console.log(`[weekly] part${p} 실패: ${j.error}`); continue; }
        if (p === 0) head = { no: j.no ?? null, headline: j.headline ?? "" };
        console.log(`[weekly] part${p} ok`, p === 0 ? `주간 제${j.no ?? "?"}호 · ${j.headline ?? ""}` : "");
      } catch (e) { console.log(`[weekly] part${p} 생략:`, e.message); }
    }
  } catch (e) {
    console.log("[weekly] 워밍 생략:", e.message);
  }
  return head;
}

const head = await warmWeekly();

const kst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const text =
  `*🗓 알파맵 주간 브리핑 · ${kst}*\n` +
  (head ? `${head.no ? `주간 제${head.no}호 — ` : ""}${head.headline}\n` : "") +
  "\n한 주 델타 · 레이어 드리프트 · *신용 스트레스 보드* · 감마 주간 궤적까지 한 회차에 담았습니다.\n" +
  `\n📄 <${SITE_URL}/?span=w#v-brief|주간 회차 읽기>  ·  🎧 <${BRIEF_URL}?span=w|주간 브리핑 듣기 (약 8분)>`;

if (!TOKEN || !DM) {
  console.log("[weekly] SLACK_BOT_TOKEN·SLACK_DM_CHANNEL 없음 — 전송 생략\n" + text);
} else {
  const r = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8", authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ channel: DM, text, unfurl_links: false, unfurl_media: false }),
  });
  const j = await r.json();
  if (!j.ok) { console.error("[weekly] 슬랙 전송 실패:", j.error); process.exit(1); }
  console.log("[weekly] 슬랙 전송 완료");
}
