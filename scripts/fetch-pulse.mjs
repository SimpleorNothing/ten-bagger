// fetch-pulse.mjs — 「시장 맥박」 동인 브리핑 합성 → pulse.json
// ─────────────────────────────────────────────────────────────
// 목적: 01 시장 모니터링 상단 '지금 무엇이 시장을 움직이나'를 6축(지정학·유가·금리·환율·수급·심리)으로
//       LLM이 합성한다. 주가는 심리게임 요소가 있으므로, 물질성 필터(m≥1)에 걸러지는 센티먼트·수급·지정학
//       동인까지 다각도로 관측한다.
// 규율(OPS §1): narrative ≠ numbers — 이 파일은 **관측·판정 전용**이다. gamma/holdings/judgment 등
//       숫자 파일은 절대 건드리지 않는다. 매매 권유가 아니라 프레임 도출.
// 입력: news.json(MACRO items+macroTopics) · news_digest.json(macro 요약) · signals.json(게이지) ·
//       gamma.json(stage) · holdings.json(레이어). 출력: pulse.json.
// 실패 정책: 키 없음/LLM 실패 → 기존 pulse.json 유지(exit 0, 뉴스 커밋 비차단). 단 조용히 넘어가지 않고
//       ::warning:: 로 Actions 요약에 원인을 남긴다(OPS §1 침묵하는 오류 방지).
// 비용: 실행 횟수에 비례(신규 기사 수 아님). Sonnet 4.6 기준 1회 ≈ $0.01~0.02.

import fs from 'node:fs';

const OUT = 'pulse.json';
const MODEL = 'claude-sonnet-4-6';

function readJSON(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }

// LLM 응답에서 JSON 객체만 견고하게 뽑는다: 코드펜스 제거 → 첫 '{' ~ 마지막 '}' 슬라이스.
// 모델이 "다음은 JSON입니다:" 같은 서론을 붙이거나 펜스로 감싸도 파싱이 깨지지 않는다.
function extractJSON(text) {
  const noFence = text.replace(/```json|```/g, '').trim();
  const s = noFence.indexOf('{');
  const e = noFence.lastIndexOf('}');
  if (s === -1 || e === -1 || e < s) throw new Error('no JSON object in response: ' + noFence.slice(0, 200));
  return noFence.slice(s, e + 1);
}

function buildPrompt(ctx) {
  const { macroLines, digestMacro, sig, stages, layers } = ctx;
  return `너는 AI 인프라 투자 관측소 '알파맵'의 시장 관측 파트너다. 아래 라이브 데이터로 **지금 시장을 움직이는 동인**을 6축으로 합성하라.

[불변 규율]
- narrative ≠ numbers: 관측·판정만 한다. 매수/매도 권유·목표가·비중 변경은 절대 쓰지 않는다.
- 사실만. 아래 데이터·헤드라인에 없는 수치를 지어내지 않는다.
- 주가는 심리게임 요소가 있다 → 지정학·수급·센티먼트처럼 '물질성 필터'에 걸리는 축도 반드시 포함한다.
- 한국어. verdict 종결은 명사형/'~리스크'/'~국면' 등 간결하게. HTML 태그 금지(순수 텍스트).

[6축 — 고정]
1 지정학  2 유가/에너지  3 금리/Fed  4 환율/달러  5 수급/플로우(반도체·외국인)  6 심리/센티먼트

[각 축 판정]
- dir: "risk"(위험·부담) | "opp"(기회·우호) | "neutral"(중립·미확정)
- layer: 이 동인이 닿는 알파맵 레이어나 성격(예: "L7 전력·에너지", "할인율·L8", "L3 메모리", "수급·외국인", "센티먼트")
- l1: 이 축에서 지금 벌어지는 일(프레임) 한 줄
- l2: 라이브 상황·수치 요약(1~2문장)
- verdict: → 뒤에 붙을 판정 한 조각(간결)
- srcs: 아래 매크로 헤드라인 중 이 축과 맞는 기사 1~2개의 {t: 제목축약, u: 링크} (없으면 빈 배열)

[라이브 게이지] VIX ${sig.vix ?? '--'} (3M ${sig.vix3m ?? '--'}) · CNN F&G ${sig.fearGreed ?? '--'} · 나스닥 드로다운 ${sig.nasdaqDrawdownPct ?? '--'}% · 40주선 ${sig.wma40SlopeUp ? '상승' : '하락'} · S&P 일간 ${sig.spDailyPct ?? '--'}% · KR 서킷 ${sig.circuitKR ? 'ON' : 'off'}/사이드카 ${sig.sidecarKR ? 'ON' : 'off'}
[레이어 stage] ${stages || '(gamma 없음)'}
[보유 레이어] ${layers || '(holdings 없음)'}
${digestMacro ? '[매크로 다이제스트 요약]\n' + digestMacro + '\n' : ''}
[매크로 헤드라인 (축|이름|날짜|제목|링크)]
${macroLines || '(없음)'}

다음 JSON만 출력하라(마크다운·설명 금지):
{"headline":"오늘 시장을 한 문장으로(무엇이 위험선호를 눌렀나/밀었나)",
 "drivers":[{"ax":"geopolitics","name":"지정학 · ...","dir":"risk","layer":"지정학","l1":"...","l2":"...","verdict":"...","srcs":[{"t":"...","u":"https://..."}]}, ... 6개]}`;
}

async function main() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { console.log('::warning::pulse: ANTHROPIC_API_KEY 없음 → 스킵(기존 유지)'); return; }

  const news = readJSON('news.json', { items: [], macroTopics: [] });
  const digest = readJSON('news_digest.json', {});
  const sig = readJSON('signals.json', {});
  const gamma = readJSON('gamma.json', {});
  const holdings = readJSON('holdings.json', {});

  const macroItems = (news.items || []).filter((it) => it.ticker === 'MACRO');
  const macroLines = macroItems
    .map((it) => `${it.ax || ''}|${it.name || ''}|${(it.published || '').slice(0, 10)}|${it.title || ''}|${it.link || ''}`)
    .join('\n');
  const digestMacro = ((digest.macro || []).map((m) => `${m.id || ''}: ${m.s || ''}`).join('\n')) || '';

  const G = gamma.gamma || {};
  const stages = Object.keys(G).slice(0, 24).map((k) => `${k}:${G[k].stage || ''}`).filter((s) => !s.endsWith(':')).join(' · ');
  const layers = (holdings.detail || []).filter((d) => d && d.ticker && (+d.w) > 0)
    .map((d) => `${d.ticker}=${d.layer || '?'}`).join(' · ');

  const prompt = buildPrompt({ macroLines, digestMacro, sig, stages, layers });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      throw new Error('anthropic HTTP ' + r.status + ' ' + body.slice(0, 300));
    }
    const j = await r.json();
    if (j.stop_reason === 'max_tokens') console.log('::warning::pulse: 응답이 max_tokens 로 잘렸을 수 있음 → 추출 시도');
    const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const clean = extractJSON(text);
    const parsed = JSON.parse(clean);
    if (!parsed.headline || !Array.isArray(parsed.drivers) || !parsed.drivers.length) throw new Error('pulse shape invalid');
    // asOf 는 KST 분단위(사이트 표시용). new Date() → UTC → +9h.
    const kst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 16);
    const out = { asOf: kst, gen: Date.now(), model: MODEL, headline: parsed.headline, drivers: parsed.drivers };
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
    console.log(`pulse: ${OUT} 작성 (drivers=${parsed.drivers.length})`);
  } catch (e) {
    console.log('::warning::pulse 실패(이전 파일 유지): ' + e.message);
  }
}

main();
