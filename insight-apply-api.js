/* ===== 02 채택 관점 → 04 시장과 실적 전망 반영 검토 (서버) · R2 insight_apply.json =====
   worker.js 가 import 해 쓰는 모듈. 공용 헬퍼(memoJson·briefAsset·briefText·anthropicText)는
   worker.js 에 있으므로 인자(h)로 주입받는다 — 순환 import 회피 · worker.js 편집면 최소화.

   불변 규율: narrative ≠ numbers — 이 경로는 gamma·cycle·judgment·earnings·holdings 를 절대 쓰지 않는다.
   숫자가 바뀌어야 성립하는 관점은 apply=false(보류) + 어떤 §1 트리거가 필요한지로만 돌려준다. */
export const INSIGHT_APPLY_KEY = "insight_apply.json";

export async function handleInsightApplyGet(env, h) {
  if (!env.MEMO_BUCKET) return h.memoJson({ error: "MEMO_BUCKET not configured" }, 503);
  const obj = await env.MEMO_BUCKET.get(INSIGHT_APPLY_KEY);
  if (!obj) return h.memoJson({ at: 0, items: [] }, 200);
  const t = await obj.text();
  let j; try { j = JSON.parse(t); } catch { j = { at: 0, items: [] }; }
  return h.memoJson(j, 200);
}

// 라이브 04 상태를 워커가 직접 읽어 컨텍스트로 만든다(클라 캅처 외삽 금지 · 스테일 방지).
async function ctxOf(env, request, h) {
  const gamma = await h.briefAsset(env, request, "/gamma.json");
  const cycle = await h.briefAsset(env, request, "/cycle.json");
  const signals = await h.briefAsset(env, request, "/signals.json");
  const idx = await h.briefText(env, request, "/index.html");

  const stages = [];
  if (gamma && gamma.gamma) {
    for (const k of Object.keys(gamma.gamma).slice(0, 40)) {
      const v = gamma.gamma[k] || {};
      stages.push({ t: k, stage: v.stage || "", g: v.g || "", pct: v.pct == null ? null : v.pct, lock: !!v.lock });
    }
  }
  const clusters = (cycle && Array.isArray(cycle.clusters) ? cycle.clusters : [])
    .map((c) => ({ id: c.id, name: c.name, lamp: c.lamp, now: String(c.now || "").slice(0, 260) }));

  // 관통 강물(RIVERS)은 index.html 단일 소스 — 번호·제목·전선만 정규식으로 읽는다(하드코딩 금지).
  const rivers = [];
  const blk = /const RIVERS=\[([\s\S]*?)\n\];/.exec(idx || "");
  if (blk) {
    for (const m of blk[1].matchAll(/\{n:(\d+),title:'([^']*)'[\s\S]*?front:'([^']*)'/g)) {
      rivers.push({ n: +m[1], title: m[2], front: m[3].slice(0, 120) });
      if (rivers.length >= 8) break;
    }
  }
  return {
    asOf: (gamma && gamma.asOf) || "",
    stages, clusters, rivers,
    macro: signals ? {
      vix: signals.vix, fearGreed: signals.fearGreed,
      nasdaqDrawdownPct: signals.nasdaqDrawdownPct, asOf: signals.asOf,
    } : null,
  };
}

export async function handleInsightApplyPost(request, env, h) {
  if (!env.ANTHROPIC_API_KEY) return h.memoJson({ error: "ANTHROPIC_API_KEY not configured" }, 503);

  let body;
  try { body = await request.json(); } catch { return h.memoJson({ error: "invalid json" }, 400); }
  const raw = Array.isArray(body && body.claims) ? body.claims : [];
  if (!raw.length) return h.memoJson({ error: "claims required" }, 400);

  const claims = raw.slice(0, 40).map((c) => ({
    id: String(c.id || "").slice(0, 40),
    text: String(c.text || "").slice(0, 300),
    layer: String(c.layer || "").slice(0, 8),
    route: String(c.route || "").slice(0, 20),
    type: c.type === "numbers" ? "numbers" : "narrative",
    tickers: Array.isArray(c.tickers) ? c.tickers.slice(0, 4).map((t) => String(t).slice(0, 12)) : [],
    grade: c.grade == null ? null : +c.grade,
    nic: String(c.nic || "").slice(0, 12),
    why: String(c.why || "").slice(0, 200),
    src: String(c.src || "").slice(0, 120),
    date: String(c.date || "").slice(0, 20),
  }));

  const ctx = await ctxOf(env, request, h);

  const prompt = [
    "너는 'AI 인프라 8레이어' 관측소(알파맵)의 운영 파트너다. 02 인사이트 찾기에서 사람이 이미 채택한 관점을",
    "04 시장과 실적 전망 화면에 서술 레이어로 반영할 수 있는지만 검토한다. 새 관점을 만들어내지 마라 — 주어진 것만 판정한다.",
    "",
    "[04 블록 — 이 중 하나로만 배치]",
    "· roadmap = AI 수요·공급 로드맵(밸류체인·이익률 매트릭스·병목 온도계)",
    "· cycle = 반도체 사이클(D 수요선행 · D2 메모리매출 · C DDR5 · E군집)",
    "· quad = 주도주 4사분면(예상↔실현 초과수익·무게중심)",
    "· gamma = 감마·단계(Dawn Map 태동→초입→가속→성숙→과열)",
    "· river = 관통 강물(RIVERS)·현재 전선",
    "· instant = 즉답 요약(전선·단계분포·상대가치)",
    "",
    "[불변 규율 — 어기면 실패]",
    "1. narrative != numbers. 이 경로는 숫자 파일(gamma·cycle·judgment·earnings·holdings)을 절대 바꾸지 않는다.",
    "   숫자가 바뀌어야 말이 되는 관점은 apply=false 로 두고, hold 에 '어떤 트리거(실적 비트·가이던스 상향·확정 수주)가 확인돼야 하는지'를 적는다.",
    "2. 가격 상승 그 자체는 단계 강등 근거가 아니다. 강등 트리거 = 가격 상승률 vs FY+1/+2 EPS 리비전 속도.",
    "3. 상대가치가 핵심 — 어느 레이어가 싸졌고 어느 레이어가 비싸졌나를 바꾸는 관점을 우선 반영한다(언더웨이트 레이어 우선).",
    "4. 이미 04 라이브 상태(아래 context)가 말하고 있는 내용과 같은 말이면 반영하지 않는다(apply=false, hold='이미 반영된 상태와 동일'). 새 정보만 얹는다.",
    "5. 근거 없는 확신 금지 — 관점의 등급(grade)·N/I/C 가 낮고 출처가 얇으면 보류한다.",
    "",
    "[출력]",
    "line 은 04 화면에 그대로 얹힐 한 줄(80자 내외, 결론 먼저, 한국어, 종결어 '~하겠습니다/~할게', '및' 회피).",
    "basis 는 왜 그 블록인지 한 줄. hold 는 apply=false 일 때만 채운다.",
    "반드시 아래 JSON만 출력한다(코드펜스·설명 금지).",
    'JSON: {"verdict":"이번 검토 총평 1~2문장","items":[{"id":"관점 id","block":"roadmap|cycle|quad|gamma|river|instant","apply":true,"line":"04에 얹을 한 줄","basis":"배치 근거 한 줄","hold":""}],"steelman":"이 반영이 틀릴 수 있는 스틸맨 반론 1~2문장"}',
    "",
    "[04 라이브 상태(context)]",
    JSON.stringify(ctx),
    "",
    "[채택 관점(claims)]",
    JSON.stringify(claims),
  ].join("\n");

  const r = await h.anthropicText(env, prompt, false, 4000);
  if (r.error) return h.memoJson({ error: r.error, detail: r.detail || "" }, 502);

  let out;
  try {
    const t = String(r.text || "").replace(/```json|```/g, "").trim();
    const s = t.indexOf("{"), e = t.lastIndexOf("}");
    out = JSON.parse(s >= 0 ? t.slice(s, e + 1) : t);
  } catch {
    return h.memoJson({ error: "판정 결과 파싱 실패", detail: String(r.text || "").slice(0, 300) }, 502);
  }

  const byId = {};
  claims.forEach((c) => { byId[c.id] = c; });
  const BLOCKS = { roadmap: 1, cycle: 1, quad: 1, gamma: 1, river: 1, instant: 1 };
  const items = (Array.isArray(out.items) ? out.items : []).slice(0, 40).map((it) => {
    const c = byId[String(it.id || "")] || {};
    return {
      id: String(it.id || "").slice(0, 40),
      block: BLOCKS[it.block] ? it.block : "instant",
      apply: !!it.apply,
      line: String(it.line || "").slice(0, 300),
      basis: String(it.basis || "").slice(0, 300),
      hold: String(it.hold || "").slice(0, 300),
      claim: c.text || "", layer: c.layer || "", tickers: c.tickers || [],
      src: c.src || "", grade: c.grade == null ? null : c.grade,
    };
  }).filter((it) => it.line || it.hold);

  const saved = {
    at: Date.now(),
    asOf: ctx.asOf || "",
    verdict: String(out.verdict || "").slice(0, 500),
    steelman: String(out.steelman || "").slice(0, 500),
    reviewed: claims.length,
    items,
  };
  if (env.MEMO_BUCKET) {
    try {
      await env.MEMO_BUCKET.put(INSIGHT_APPLY_KEY, JSON.stringify(saved),
        { httpMetadata: { contentType: "application/json" } });
    } catch { /* 저장 실패해도 이번 응답은 살린다 */ }
  }
  return h.memoJson(saved, 200);
}
