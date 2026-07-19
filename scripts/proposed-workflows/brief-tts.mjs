// scripts/proposed-workflows/brief-tts.mjs
// ───────────────────────────────────────────────────────────────────────────
// 제안본(A안) — 데일리 브리핑 대본 → Gemini 멀티스피커 TTS → MP3 → 슬랙 DM 첨부.
//
// 흐름
//   1) POST /__auth 로 사이트 쿠키 획득(워커 비밀번호 게이트)
//   2) GET /api/brief?part=1, part=2 → 2인 대담 대본(R2 날짜 캐시라 재호출도 저렴)
//   3) 대본을 청크로 나눠 Gemini 멀티스피커 TTS(gemini-3.1-flash-tts-preview ·
//      「The Energetic Co-Host」 팟캐스트 톤 · 진행자·애널리스트 2보이스) → PCM
//   4) PCM 이어붙여 WAV → ffmpeg 로 MP3(48kbps mono ≈ 8분 3MB)
//   5) 슬랙 files.getUploadURLExternal → PUT → completeUploadExternal 로 DM 첨부
//
// 규율: narrative ≠ numbers — 이 스크립트는 읽기만 한다. 리포의 어떤 숫자·판단 파일도 쓰지 않는다.
// 실패해도 throw 로 워크플로만 붉게 만들고 데이터는 건드리지 않는다(텍스트 브리핑은 별도라 무영향).
// ───────────────────────────────────────────────────────────────────────────
import { spawnSync } from "node:child_process";

const SITE = process.env.SITE_URL || "https://simpleornothing.com";
const PW = process.env.SITE_PASSWORD;
const GKEY = process.env.GEMINI_API_KEY;
const SLACK = process.env.SLACK_BOT_TOKEN;
const DM = process.env.SLACK_DM_CHANNEL;
// AI Studio 「The Energetic Co-Host(Podcast style)」 템플릿 기준.
// 모델·보이스·스타일 모두 env 로 덮어쓸 수 있다(운영자가 스튜디오에서 고른 값으로 교체).
const TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview";
const SR = 24000;

// 화자 → Gemini 프리셋 보이스. 활기찬 공동 진행 톤(Puck=경쾌 · Kore=또렷)으로 두 채널을 분리한다.
const VOICE = { host: process.env.GEMINI_VOICE_HOST || "Puck", ana: process.env.GEMINI_VOICE_ANA || "Kore" };
const LABEL = { host: "진행자", ana: "애널리스트" };

// 「The Energetic Co-Host」 연출 지시 — 밝고 에너지 있는 팟캐스트 대담 톤.
const STYLE = process.env.GEMINI_TTS_STYLE ||
  "당신은 활기찬 팟캐스트 공동 진행자 두 명입니다. 밝고 에너지 넘치는 구어체로, 서로 맞장구치며 " +
  "리듬감 있게 주고받으세요. 과장은 피하되 톤은 지루하지 않게 생동감 있게 — 숫자와 판정은 정확히 전달합니다.";

const need = (v, n) => { if (!v) throw new Error(`${n} 미설정`); return v; };
need(PW, "SITE_PASSWORD"); need(GKEY, "GEMINI_API_KEY"); need(SLACK, "SLACK_BOT_TOKEN");

/* ── 1) 사이트 인증 쿠키 ─────────────────────────────────────────── */
async function login() {
  const res = await fetch(`${SITE}/__auth`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: PW }).toString(),
    redirect: "manual",
  });
  const sc = res.headers.get("set-cookie");
  if (!sc) throw new Error(`사이트 로그인 실패 (${res.status}) — SITE_PASSWORD 확인`);
  return sc.split(";")[0];
}

/* ── 2) 대본 ─────────────────────────────────────────────────────── */
async function fetchBrief(cookie) {
  const get = async (part) => {
    const r = await fetch(`${SITE}/api/brief?part=${part}`, { headers: { cookie } });
    const j = await r.json();
    if (j.error) throw new Error(`/api/brief part${part}: ${j.error}`);
    return j;
  };
  const p1 = await get(1);
  const p2 = await get(2).catch((e) => { console.log("[warn] 후반부 실패 — 전반부만 만듭니다:", e.message); return { script: [] }; });
  return { title: p1.title || "알파맵 데일리 브리핑", asOf: p1.asOf, script: [...p1.script, ...(p2.script || [])] };
}

/* ── 3) Gemini 멀티스피커 TTS ────────────────────────────────────── */
// 한 번에 다 넣으면 출력 상한에 걸린다 → 발언 6개씩 청크.
function chunk(arr, n) { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; }

async function ttsChunk(lines) {
  const prompt = STYLE + "\n\n다음 대담을 읽어 주세요.\n\n"
    + lines.map((l) => `${LABEL[l.s] || LABEL.ana}: ${l.say}`).join("\n");
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: Object.keys(VOICE).map((k) => ({
            speaker: LABEL[k],
            voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE[k] } },
          })),
        },
      },
    },
  };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": GKEY },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`gemini tts ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  const b64 = j?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
  if (!b64) throw new Error("gemini tts: 오디오 없음");
  return Buffer.from(b64, "base64");   // raw PCM s16le 24kHz mono
}

/* ── 4) PCM → WAV → MP3 ─────────────────────────────────────────── */
function wavHeader(len) {
  const b = Buffer.alloc(44);
  b.write("RIFF", 0); b.writeUInt32LE(36 + len, 4); b.write("WAVE", 8);
  b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(len, 40);
  return b;
}
function toMp3(pcm) {
  const wav = Buffer.concat([wavHeader(pcm.length), pcm]);
  const p = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "wav", "-i", "pipe:0",
    "-ac", "1", "-ar", String(SR), "-b:a", "48k", "-f", "mp3", "pipe:1"], { input: wav, maxBuffer: 1 << 28 });
  if (p.status !== 0 || !p.stdout?.length) throw new Error("ffmpeg 변환 실패");
  return p.stdout;
}

/* ── 5) 슬랙 업로드 ─────────────────────────────────────────────── */
async function slackUpload(mp3, filename, title) {
  const u = await (await fetch("https://slack.com/api/files.getUploadURLExternal", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", authorization: `Bearer ${SLACK}` },
    body: new URLSearchParams({ filename, length: String(mp3.length) }).toString(),
  })).json();
  if (!u.ok) throw new Error(`slack getUploadURL: ${u.error}`);

  const put = await fetch(u.upload_url, { method: "POST", body: mp3 });
  if (!put.ok) throw new Error(`slack upload ${put.status}`);

  const done = await (await fetch("https://slack.com/api/files.completeUploadExternal", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8", authorization: `Bearer ${SLACK}` },
    body: JSON.stringify({
      files: [{ id: u.file_id, title }],
      channel_id: DM,
      initial_comment: `🎧 *${title}*\n_2인 대담 · 게이트·레이어 갭·액션·스틸맨 · narrative≠numbers_`,
    }),
  })).json();
  if (!done.ok) throw new Error(`slack complete: ${done.error}`);
  return done;
}

/* ── main ───────────────────────────────────────────────────────── */
const cookie = await login();
const brief = await fetchBrief(cookie);
if (!brief.script.length) throw new Error("대본이 비었습니다");
console.log(`[ok] 대본 ${brief.script.length}발언 · ${brief.script.reduce((a, x) => a + x.say.length, 0)}자`);

const pcms = [];
for (const c of chunk(brief.script, 6)) {
  pcms.push(await ttsChunk(c));
  console.log(`[tts] ${pcms.length}청크 누적 ${(pcms.reduce((a, b) => a + b.length, 0) / SR / 2).toFixed(0)}초`);
}
const mp3 = toMp3(Buffer.concat(pcms));
console.log(`[ok] mp3 ${(mp3.length / 1024 / 1024).toFixed(2)}MB`);

await slackUpload(mp3, `alphamap-brief-${brief.asOf}.mp3`, `알파맵 데일리 브리핑 · ${brief.asOf} — ${brief.title}`);
console.log("[ok] 슬랙 전송 완료");
