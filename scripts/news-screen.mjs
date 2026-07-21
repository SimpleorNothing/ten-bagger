// 뉴스 물질성 스크리너 · MV=3  (scripts/fetch-news.mjs 가 import)
//
// 기준은 하나 — **앞으로의 등락에 영향을 줄 시그널인가.** 지나간 등락의 해설은 시그널이 아니다.
//   m=2 논제(펀더멘털)          : 실적·가이던스·수주·계약·출하·고객·공급망·가격(고정거래가)·증설·규제·M&A
//   m=1 리비전·수급 실사건      : 목표가·등급·추정 변경(= MU γ-닫힘 트리거 ① 입력)·지수 편출입·지분공시·증자
//   m=0 비물질(사이트 표시 제외): 사후 등락 서술("X% 급락")·홍보·추측·추천 리스트·콘텐츠팜(st=9)·종목 무관
//                                 + **날짜 없는 '실적 발표 일정 공시'**(언제 발표하는지가 빠지면 시그널 가치 0)
// m=0 도 news_archive.json 에는 전건 보존한다(삭제가 아니라 '표시 창'에서만 뺀다).
//
// MV = 스크리너 세대. 사다리 정의가 바뀌면 올린다 → it.mv !== MV 인 과거 기사는 자동 재채점
// (요약 a·w 는 재사용하므로 토큰을 다시 쓰지 않는다).
export const MV = 3;

// ---- 소스 티어 (items[].st) ----
// 구글 뉴스는 매체를 고르지 않는다 → 종목명 검색 상위를 SEO 콘텐츠팜이 먹는다. 그래서 우리가 고른다.
// 실측(news_archive 254건): st=9 매체군의 m=2(펀더멘털) 산출은 0건.
//   1 원문·통신사(IR 배포 포함) / 2 산업 전문지 / 3 집계·해설 / 9 콘텐츠팜(확정 사건 없으면 m=0)
const SRC_T1 = /reuters|bloomberg|financial times|wall street journal|wsj|nikkei|associated press|globenewswire|business ?wire|pr ?newswire|stock ?titan|sec\.gov|연합뉴스|한국경제|매일경제|조선일보|서울경제|머니투데이|이데일리|파이낸셜뉴스/i;
const SRC_T2 = /digitimes|trendforce|semianalysis|counterpoint|omdia|yole|ee ?times|tom'?s hardware|anandtech|the register|data ?cent(?:er|re) ?dynamics|datacenterknowledge|utility ?dive|latitude ?media|lightwave|gazettabyte|converge ?digest|전자신문|디일렉|zdnet|더구루/i;
const SRC_DENY = /motley ?fool|simplywall|24\/7 wall|kavout|trefis|tikr|marketbeat|stocktwits|quiver|benzinga|zacks|aol\.com|insider ?monkey|gurufocus|invezz|barchart|tipranks|moomoo|富途|mitrade|씽크풀|팍스넷/i;

export function srcTier(s) {
  const t = String(s || '');
  if (SRC_DENY.test(t)) return 9;
  if (SRC_T1.test(t)) return 1;
  if (SRC_T2.test(t)) return 2;
  return 3;
}

// 홍보·수상·문화·행사 (회사 PR 채널 + 언론 전재)
const RE_PR = /\b(award|awards|awarded|honoring|honou?red|recogniz(?:ed|ing)|named (?:one|to|among)|best (?:companies|places)|great place to work|top workplace|employee|workplace|culture|diversity|inclusion|scholarship|internship|sponsor|celebrat|anniversary|webinar|podcast|blog|newsletter|life at|csr|esg report|philanthrop|donat|charit)\b|수상|시상|표창|사회공헌|기부|후원|채용|사내|기업문화|웨비나|세미나 개최/i;
// 사후 추측 해설·가정 시나리오·추천 리스트 (콘텐츠팜 전형)
const RE_SPEC = /\b(why (?:is|are|did|has)\b.*\b(?:stock|shares)|what (?:a|would) .*(?:crash|happen)|should you (?:buy|sell)|is .* (?:still )?a (?:buy|sell)|(?:best|top) \d*\s*(?:ai |growth |value |chip )?stocks?|\d+ (?:reasons|predictions?)|prediction for|here'?s why you|stock (?:forecast|prediction)|better buy|vs\.? .*\b(?:stock|which|has more upside)|moving (?:higher|lower) today)\b|왜 (?:하락|급락|상승|급등)|매수해야|유망주|추천주|투자 포인트|주가 전망|급등주|테마주/i;
// 사후 등락 서술 — 주가가 어떻게 움직였는지만 말하는 제목(MV=2에서 m=0로 강등).
export const RE_MOVE = /\b(?:stock|stocks|shares?)\b[^.]{0,40}\b(?:is|are|was|were|has|have)?\s*(?:down|up|fall(?:s|ing|en)?|drop(?:s|ped|ping)?|slid(?:e|es|ing)?|slump(?:s|ed)?|plunge[sd]?|tumbl(?:e|es|ed|ing)|sink(?:s|ing)?|jump(?:s|ed)?|surg(?:e|es|ed|ing)|soar(?:s|ed|ing)?|rall(?:y|ies|ied)|clim(?:b|bs|bed)|gain(?:s|ed)?|rise[sn]?|rose|pop(?:s|ped)?|slip(?:s|ped)?)\b|\b(?:down|up)\s+\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?%\s+(?:drop|gain|decline|jump|surge|plunge)\b|\b(?:52-week|all-time)\s+(?:high|low)\b|주가[^.]{0,20}(?:하락|급락|상승|급등|약세|강세|반등|폭락|폭등|신저가|신고가)|(?:하락|급락|상승|급등|반등)\s*(?:마감|출발|전환)|장중\s*(?:급등|급락)/i;
// 확정 사건(EVENT) — 등락 단어가 섞여도 이건 시그널이다.
// ("Micron shares rise after company announces billions in U.S. investment" → 사건은 투자 발표)
export const RE_EVENT = /\b(?:earnings|guidance|results|revenue|beats?|misse[sd]|orders?|contracts?|deals?|alliance|partnership|agreements?|suppl(?:y|ies)|shipments?|ship(?:s|ped|ping)?|lands?|landed|wins?|won|secure[sd]?|signs?|signed|announc\w*|unveil\w*|launch\w*|introduc\w*|expan\w*|invest\w*|capex|capacity|fab|plant|acquisi\w*|acquir\w*|merger|takeover|ipo|priced|qualif\w*|yields?|tariffs?|export controls?|bans?|banned|approv\w*|certif\w*|recall\w*|lawsuit|settle\w*|delay\w*|postpone\w*|short.?seller|rebut\w*|loan|subsid\w*|funding)\b|실적|가이던스|수주|계약|공급|납품|출시|공개|발표|투자|증설|양산|가동|인수|합병|상장|규제|관세|승인|리콜|소송|지연|연기|보조금/i;
// 리비전·수급 실사건(REVISION) — γ 트리거 ①의 입력이므로 등락 단어와 섞여도 살린다.
const RE_REVISION = /\b(?:price target|pt raised|pt cut|upgrad\w*|downgrad\w*|initiate[sd]? coverage|estimates? (?:raised|cut)|reiterat\w*|outperform|overweight|underweight|added to|removed from|index (?:inclusion|addition|removal)|s&p 500|nasdaq-100|russell|13[fdg]|stakes?|insider (?:buy|sell)\w*|buyback|offering)\b|목표주가|목표가|투자의견|커버리지|편입|편출|지수 편|대량보유|지분\s*(?:취득|매각|공시)|자사주|유상증자/i;
export const RE_KEEP = new RegExp(RE_EVENT.source + '|' + RE_REVISION.source, 'i');

// 실적 발표 '일정/일자'를 알리는 기사(결과 발표가 아니라 언제 발표할지의 공시).
// 파이프라인은 제목만 LLM에 넘기므로 본문의 발표일이 요약에 담기지 못한다 → 제목·요약에 날짜가
// 없으면 "일정 공시했다"는 사실만 남고 정작 '언제'가 빠져 시그널 가치가 0이다(SimpleorNothing 규율).
export const RE_ERN_SCHED = /reporting\s+date|earnings\s+(?:date|release\s+date|call\s+date)|date\s+of\s+(?:its\s+|the\s+)?(?:first|second|third|fourth|q[1-4]|quarter|fiscal|full[-\s]?year|fy|20\d\d)[^.]{0,50}?(?:earnings|results|release)|(?:announce[sd]?|sets?|to\s+announce|schedule[sd]?)[^.]{0,45}(?:date|schedule|conference\s+call)[^.]{0,45}(?:earnings|results|report|review)|conference\s+call\s+to\s+(?:review|discuss)[^.]{0,30}(?:results|earnings|quarter)|실적\s*발표\s*(?:일정|일자|예정일|날짜|예정)|실적\s*발표일|발표\s*일정\s*(?:공시|공지|확정|안내|소개)|컨퍼런스\s*콜\s*일정/i;
// 구체적 발표일(월·일)이 실제로 박혀 있는가 — 있으면 일정 공시라도 살린다.
export const RE_HAS_DATE = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{1,2}\b|\b\d{1,2}\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b|\b\d{1,2}\/\d{1,2}\b|\b20\d\d[-.\/]\d{1,2}[-.\/]\d{1,2}\b|\d{1,2}\s*월\s*\d{1,2}\s*일|\d{1,2}\s*일(?![정자])/i;
export const isSchedNoDate = (t, a) => (RE_ERN_SCHED.test(t) || RE_ERN_SCHED.test(a)) && !RE_HAS_DATE.test(t) && !RE_HAS_DATE.test(a);

// 하드룰. 0 = 확정 배제, undefined = 판정 보류(LLM 스코어러로).
export function ruleM(it) {
  const t = String(it.title || '');
  const s = String(it.source || '');
  const a = String(it.a || '');
  const w = String(it.w || '');
  if (srcTier(s) === 9 && !RE_EVENT.test(t)) return 0;   // 콘텐츠팜: 확정 사건 기사만 생존(특종 유실 방지)
  if (RE_PR.test(t) || RE_PR.test(a)) return 0;
  if (RE_SPEC.test(t)) return 0;
  if (RE_MOVE.test(t) && !RE_KEEP.test(t)) return 0;     // 사후 등락 서술 → 표시 제외
  if (isSchedNoDate(t, a)) return 0;                     // 날짜 없는 실적 발표 일정 공시 → 표시 제외
  if (/실질 영향 (?:없|미미)|회사 무관|무관 노이즈|가정적 시나리오|영향 없는 중립/.test(w)) return 0;
  if (/회사 무관/.test(a)) return 0;
  return undefined;
}

// 등급이 없거나 구세대(mv !== MV) 등급이면 재채점 대상. 매크로·병목축은 LLM 미채점(축 자체가 관측 대상).
export const needsGrade = (it) => it.ticker !== 'MACRO' && (!Number.isInteger(it.m) || it.mv !== MV);

// LLM 프롬프트에 공통으로 박는 사다리 정의(요약 생성 · 과거분 백필 양쪽에서 재사용).
export const LADDER = `m = 이 기사가 **앞으로의** 주가에 영향을 줄 시그널인가 (정수 0·1·2)
- **m=2 논제(펀더멘털)**: 실적·가이던스·수주·계약·출하·고객 확보·공급망·제품 가격(고정거래가 등)·증설·규제·M&A 등 확정되거나 구체적인 사실.
- **m=1 리비전·수급 실사건**: 애널리스트 목표가·투자의견·추정치 변경, 지수 편출입, 대량보유·내부자 지분 공시, 자사주·증자.
- **m=0 비물질(제외)**: **"주가가 X% 올랐다/내렸다"는 사후 등락 서술**, "왜 떨어졌나" 해설, 홍보·수상·채용·블로그, 가정 시나리오·가격 예측, 매수 추천·베스트 리스트, 종목 무관 기사.
- 핵심 구분: 주가 움직임 **자체를 보도하는** 기사는 원인이 사실이어도 m=0("지수 편출 이후 22.6% 하락"). 그 원인을 **사건으로 보도하면** 살린다("S&P500 편출 결정" → m=1).
- **날짜 없는 실적 발표 '일정 공시'는 m=0**: "실적 발표 일정을 공시/공지했다"만 있고 **실제 발표 날짜(월·일)가 제목에 없으면** 시그널 가치가 없다("실적 발표일 공시"→m=0 / "실적 발표일 7월 29일 확정"→m=1). 날짜가 있으면 살린다.
- 지나간 등락의 해설은 시그널이 아니다. m=0 은 사이트에 표시되지 않는다. 애매하면 m=1.`;

// ---- 시그널축 ----
// 종목명 단독 검색은 콘텐츠팜을 부른다("Why MU stock is down…") → 확정 사실 키워드를 결합해 한 번 더 긁는다.
export const SIG_TERMS_EN = '(guidance OR earnings OR capex OR contract OR order OR backlog OR "supply deal" OR pricing OR shipment OR qualification OR "design win" OR capacity OR cancel OR delay OR postpone OR "push out" OR cut OR halt)';
export const SIG_TERMS_KO = '(실적 OR 가이던스 OR 수주 OR 계약 OR 공급 OR 증설 OR 가동 OR 양산 OR 수율 OR 캐파 OR 취소 OR 연기 OR 지연 OR 감산 OR 축소 OR 보류 OR 중단)';

// ---- 병목축 (고정) ----
// 리밸런싱은 종목 뉴스가 아니라 **어느 레이어의 병목이 조여졌나/풀렸나**에서 나온다.
// 트렌딩 발굴에 맡기면 조용한 주에 이 축이 통째로 사라진다 → 고정으로 상시 관측.
// 매크로 토픽과 같은 ticker='MACRO' 레인을 재사용하므로 사이트 렌더 변경이 필요 없다.
export const BOTTLENECK_TOPICS = [
  { id: 'bneck_l3_dram', ticker: 'MACRO', name: 'L3 · DRAM/HBM 가격·공급', q: 'DRAM 고정거래가 HBM 공급 계약', mkt: 'KOSPI' },
  { id: 'bneck_l4_pkg', ticker: 'MACRO', name: 'L4 · 패키징 캐파', q: 'CoWoS capacity hybrid bonding advanced packaging', mkt: 'US' },
  { id: 'bneck_l6_opt', ticker: 'MACRO', name: 'L6 · 옵티컬 리드타임', q: '1.6T optical transceiver CPO lead time', mkt: 'US' },
  { id: 'bneck_l8_pwr', ticker: 'MACRO', name: 'L7·L8 · 전력 병목', q: 'transformer lead time grid interconnection queue data center power', mkt: 'US' },
  { id: 'bneck_capex', ticker: 'MACRO', name: '상류 · 하이퍼스케일러 capex', q: 'hyperscaler capex guidance data center spending', mkt: 'US' },
  { id: 'bneck_silicon', ticker: 'MACRO', name: '상류 · 빅테크 자체 실리콘', q: 'Google TPU Amazon Trainium Microsoft Maia Meta MTIA custom silicon', mkt: 'US' },
  { id: 'bneck_asic', ticker: 'MACRO', name: 'L2 · 커스텀 실리콘·전력효율', q: 'custom AI accelerator ASIC inference performance per watt roadmap', mkt: 'US' },
];
