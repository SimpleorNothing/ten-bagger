/* aisd.js — 02 궁금한 것 맨위 「AI 수요·공급 로드맵」 자가 마운트 블록 (#dsAisd)
   index.html 은 건드리지 않고 worker.js 가 <script defer> 로 주입한다 (flags.js 패턴).
   narrative 층 — 숫자 파일(gamma/earnings/judgment) 무관 · 수동/분기 갱신(컨센서스 캡처).
   신규 :root 토큰 0(전역 토큰만 · ds-* 스코프) · 면 3px/배지 20px · 상향 ▲=--st-hot · 하향 ▼=--st-accel.
   리비전 트랙 수치는 캡처 축적 전 예시 표시 — 연동 시 분기 스냅샷 비교로 파생. */
(function(){
'use strict';
if(window.__dsAisd)return;window.__dsAisd=1;
var CSS=`#dsAisd{margin:2px 0 38px}
#dsAisd .ds-kick{font-family:var(--mono);font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:var(--dim)}
#dsAisd .ds-title{font-size:24px;font-weight:700;letter-spacing:-.02em;margin:4px 0 2px}
#dsAisd .ds-title em{font-style:normal;color:var(--dawn)}
#dsAisd .ds-upd{font-family:var(--mono);font-size:12px;color:var(--faint)}
#dsAisd .ds-sec{font-size:18px;font-weight:700;letter-spacing:-.3px;margin:24px 0 10px;display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}
#dsAisd .ds-note{font-family:var(--mono);font-size:12px;font-weight:400;color:var(--faint);letter-spacing:.03em}
#dsAisd .ds-lens{margin:0 0 12px}
#dsAisd .ds-l1{font-size:14px;font-weight:600;color:var(--txt);display:flex;align-items:center;gap:7px;flex-wrap:wrap}
#dsAisd .ds-l1 b{font-family:var(--mono);font-size:12px;font-weight:600;background:var(--panel2);border:1px solid var(--line);border-radius:6px;padding:2px 7px;color:var(--txt)}
#dsAisd .ds-l2{font-size:14px;color:var(--faint);margin-top:4px}
#dsAisd .ds-ok{color:var(--st-dawn);font-weight:600}
#dsAisd .ds-wn{color:var(--st-hot);font-weight:600}
#dsAisd .ds-nt{color:var(--st-mature);font-weight:600}
#dsAisd .ds-card{background:var(--panel);border:1px solid var(--line);border-radius:3px;padding:15px 16px}
#dsAisd .ds-vd{display:grid;grid-template-columns:1fr 1fr 1.5fr;gap:12px;margin:2px 0 4px}
#dsAisd .ds-vdc{background:var(--panel);border:1px solid var(--line);border-radius:3px;padding:13px 15px}
#dsAisd .ds-vdc.sum{border-left:3px solid var(--dawn)}
#dsAisd .ds-vq{font-family:var(--mono);font-size:12px;color:var(--faint);letter-spacing:.06em;text-transform:uppercase}
#dsAisd .ds-vt{font-size:15px;font-weight:700;margin-top:5px;display:flex;align-items:center;gap:8px;line-height:1.35}
#dsAisd .ds-lamp{width:9px;height:9px;border-radius:50%;display:inline-block;flex:0 0 9px}
#dsAisd .ds-lamp.g{background:var(--st-dawn)}
#dsAisd .ds-lamp.a{background:var(--st-mature)}
#dsAisd .ds-vd0{font-size:14px;color:var(--dim);margin-top:6px;line-height:1.55}
#dsAisd .ds-vtr{margin-top:8px;font-size:12.5px;color:var(--faint);border-top:1px dashed var(--line);padding-top:8px;line-height:1.55}
#dsAisd .ds-vtr b{color:var(--txt)}
#dsAisd .ds-rev{font-family:var(--mono);font-size:12px;font-weight:700;margin-left:5px;white-space:nowrap}
#dsAisd .ds-rev.up{color:var(--st-hot)}
#dsAisd .ds-rev.dn{color:var(--st-accel)}
#dsAisd .ds-rev.fl{color:var(--faint)}
#dsAisd .ds-rt{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:11px;padding:9px 12px;background:var(--ink2);border:1px solid var(--line);border-radius:3px}
#dsAisd .ds-rtl{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--dim);letter-spacing:.03em}
#dsAisd .ds-rts{font-family:var(--mono);font-size:12.5px;font-weight:700;color:var(--txt);font-variant-numeric:tabular-nums}
#dsAisd .ds-rts i{font-style:normal;font-size:12px;font-weight:400;color:var(--faint);display:block}
#dsAisd .ds-rta{color:var(--faint);font-size:12px}
#dsAisd .ds-rtv{font-family:var(--mono);font-size:12px;font-weight:700;margin-left:auto}
#dsAisd .ds-rtv.up{color:var(--st-hot)}
#dsAisd .ds-evo{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid var(--line);border-radius:3px;overflow:hidden;background:var(--panel)}
#dsAisd .ds-ph{padding:13px 14px 15px;border-right:1px solid var(--line);position:relative}
#dsAisd .ds-ph:last-child{border-right:0}
#dsAisd .ds-ph::before{content:"";position:absolute;left:0;top:0;right:0;height:3px}
#dsAisd .ds-ph.p1::before{background:var(--st-nascent)}
#dsAisd .ds-ph.p2::before{background:var(--st-accel)}
#dsAisd .ds-ph.p3::before{background:var(--st-mature)}
#dsAisd .ds-ph.p4::before{background:repeating-linear-gradient(90deg,var(--st-hot) 0 6px,transparent 6px 10px)}
#dsAisd .ds-eyr{font-family:var(--mono);font-size:12px;color:var(--faint)}
#dsAisd .ds-enm{font-size:15px;font-weight:700;margin:4px 0 2px}
#dsAisd .ds-een{font-family:var(--mono);font-size:12px;color:var(--dim);margin-bottom:6px}
#dsAisd .ds-eds{font-size:14px;color:var(--dim);line-height:1.55}
#dsAisd .ds-ebg{display:inline-block;font-family:var(--mono);font-size:12px;padding:2px 8px;border-radius:20px;margin-top:8px;border:1px solid var(--line2);color:var(--dim)}
#dsAisd .ds-ebg.est{border-style:dashed;color:var(--st-mature)}
#dsAisd .ds-bars{display:flex;align-items:flex-end;gap:12px;height:170px;padding:12px 4px 0;border-bottom:1px solid var(--line2);margin-bottom:5px}
#dsAisd .ds-bc{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:5px}
#dsAisd .ds-bv{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--txt);white-space:nowrap}
#dsAisd .ds-bar{width:100%;max-width:56px;background:var(--dawn);border-radius:3px 3px 0 0;min-height:3px}
#dsAisd .ds-bar.est{background:var(--panel2);border:1px solid var(--dawn);border-bottom:0}
#dsAisd .ds-bx{display:flex;gap:12px;padding:0 4px}
#dsAisd .ds-bx span{flex:1;text-align:center;font-family:var(--mono);font-size:12px;color:var(--dim)}
#dsAisd .ds-bx span.est{color:var(--faint)}
#dsAisd .ds-mtx{width:100%;border-collapse:collapse;font-size:14px}
#dsAisd .ds-mtx th,#dsAisd .ds-mtx td{padding:9px 10px;text-align:right;border-bottom:1px solid var(--line)}
#dsAisd .ds-mtx th{font-family:var(--mono);font-size:12px;font-weight:600;color:var(--dim);letter-spacing:.03em;border-bottom:1.5px solid var(--line2)}
#dsAisd .ds-mtx th.est{color:var(--faint)}
#dsAisd .ds-mtx td:first-child,#dsAisd .ds-mtx th:first-child{text-align:left}
#dsAisd .ds-mtx .ds-co{font-weight:700;color:var(--txt);font-size:14px}
#dsAisd .ds-mtx .ds-co small{display:block;font-weight:400;font-size:12px;color:var(--faint);font-family:var(--mono)}
#dsAisd .ds-mtx td{font-family:var(--mono);font-variant-numeric:tabular-nums;color:var(--txt)}
#dsAisd .ds-mtx td.dim{color:var(--faint)}
#dsAisd .ds-mtx td.nt{font-family:inherit;font-size:13px;color:var(--dim);text-align:left;font-variant-numeric:normal}
#dsAisd .ds-mtx tbody tr:hover td{background:var(--panel2)}
#dsAisd .ds-mtx tr.exp{cursor:pointer}
#dsAisd .ds-mtx tr.exp td:first-child::before{content:"▸";display:inline-block;margin-right:7px;color:var(--dawn);font-size:12px;transition:transform .12s;vertical-align:1px}
#dsAisd .ds-mtx tr.exp.on td:first-child::before{transform:rotate(90deg)}
#dsAisd .ds-mtx tr.exp:focus-visible{outline:2px solid var(--st-accel);outline-offset:2px}
#dsAisd .ds-mtx tr.dtl{display:none}
#dsAisd .ds-mtx tr.dtl.on{display:table-row}
#dsAisd .ds-mtx tr.dtl td,#dsAisd .ds-mtx tr.dtl:hover td{padding:0;background:var(--panel2)}
#dsAisd .ds-yrp{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:var(--line);border-top:1px solid var(--line)}
#dsAisd .ds-yc{background:var(--panel2);padding:10px 12px;text-align:left}
#dsAisd .ds-yy{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--dawn)}
#dsAisd .ds-yy.est{color:var(--st-mature)}
#dsAisd .ds-yv{font-family:var(--mono);font-size:13.5px;font-weight:700;color:var(--txt);margin-top:2px;font-variant-numeric:tabular-nums}
#dsAisd .ds-yt{font-size:13px;color:var(--dim);line-height:1.5;margin-top:3px;font-variant-numeric:normal;font-family:inherit}
#dsAisd .ds-mtx.plan th{text-align:left}
#dsAisd .ds-mtx.plan td{font-family:inherit;text-align:left;font-variant-numeric:normal;font-size:14px;color:var(--dim);line-height:1.55;vertical-align:top}
#dsAisd .ds-mtx.plan td b{color:var(--txt)}
#dsAisd .ds-role{font-family:var(--mono);font-size:12px;color:var(--onacc);padding:2px 8px;border-radius:20px;display:inline-block;margin-top:4px}
#dsAisd .ds-role.lead{background:var(--st-dawn)}
#dsAisd .ds-role.chase{background:var(--st-accel)}
#dsAisd .ds-role.cn{background:var(--st-hot)}
#dsAisd .ds-mtx.plan tr.sumrow td,#dsAisd .ds-mtx.plan tr.sumrow:hover td{border-top:1.5px solid var(--line2);color:var(--txt);font-weight:600;background:var(--ink2)}
#dsAisd .ds-vct{background:var(--panel);border:1px solid var(--line);border-radius:3px;padding:13px 15px;position:relative}
#dsAisd .ds-vct::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px}
#dsAisd .ds-vct.t1::before{background:var(--st-nascent)}
#dsAisd .ds-vct.t2::before{background:var(--st-dawn)}
#dsAisd .ds-vct.t3::before{background:var(--st-accel)}
#dsAisd .ds-vct.t4::before{background:var(--st-hot)}
#dsAisd .ds-tno{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--onacc);background:var(--txt);width:24px;height:24px;border-radius:3px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 24px}
#dsAisd .ds-vch{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
#dsAisd .ds-vcn{font-size:16px;font-weight:700}
#dsAisd .ds-vce{font-family:var(--mono);font-size:12px;color:var(--faint);letter-spacing:.03em}
#dsAisd .ds-vcr{font-size:13px;color:var(--dim);margin-left:auto;text-align:right}
#dsAisd .ds-vcr b{color:var(--txt)}
#dsAisd .ds-vcb{margin-top:9px;display:flex;gap:9px;flex-wrap:wrap}
#dsAisd .ds-vcg{flex:1;min-width:220px;background:var(--panel2);border:1px solid var(--line);border-radius:3px;padding:9px 11px}
#dsAisd .ds-vcgt{font-size:13.5px;font-weight:700;margin-bottom:5px}
#dsAisd .ds-vcgt small{font-family:var(--mono);font-size:12px;font-weight:400;color:var(--faint);margin-left:4px}
#dsAisd .ds-chips{display:flex;gap:5px;flex-wrap:wrap}
#dsAisd .ds-chip{font-family:var(--mono);font-size:12px;padding:2px 8px;border-radius:20px;background:var(--panel);border:1px solid var(--line2);color:var(--txt)}
#dsAisd .ds-chip.hold{border-color:var(--dawn);color:var(--dawn);font-weight:700}
#dsAisd .ds-lb{font-family:var(--mono);font-size:12px;font-weight:700;padding:1px 7px;border-radius:20px;color:var(--onacc);margin-left:4px}
#dsAisd .ds-lb.sem{background:var(--st-accel)}
#dsAisd .ds-lb.pow{background:var(--st-hot)}
#dsAisd .ds-vcf{display:flex;align-items:center;gap:10px;padding:6px 0 6px 26px;flex-wrap:wrap}
#dsAisd .ds-vcfa{font-size:17px;color:var(--dawn);line-height:1}
#dsAisd .ds-vcft{font-size:13px;color:var(--dim)}
#dsAisd .ds-vcft b{color:var(--txt)}
#dsAisd .ds-vcfm{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--st-hot)}
#dsAisd .ds-vco{margin-top:10px;background:var(--ink2);border:1px dashed var(--line2);border-radius:3px;padding:11px 13px;font-size:14px;color:var(--dim);line-height:1.55}
#dsAisd .ds-vco b{color:var(--txt)}
#dsAisd .ds-vces{margin-top:9px;border-top:1px dashed var(--line);padding-top:8px;display:flex;gap:6px 18px;flex-wrap:wrap;font-size:13px;color:var(--dim);line-height:1.5}
#dsAisd .ds-vces span{white-space:nowrap}
#dsAisd .ds-vces .k{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--faint);margin-right:4px;letter-spacing:.03em}
#dsAisd .ds-vces b{color:var(--txt);font-variant-numeric:tabular-nums}
#dsAisd .ds-vces .pf-ok{color:var(--st-dawn);font-weight:700}
#dsAisd .ds-vces .pf-no{color:var(--st-hot);font-weight:700}
#dsAisd .ds-vces .pf-mid{color:var(--st-mature);font-weight:700}
#dsAisd .ds-steel{border-left:2px solid var(--line2);padding:3px 0 3px 13px;color:var(--dim);font-size:14px;margin-top:8px;line-height:1.55}
#dsAisd .ds-steel b{color:var(--txt)}
#dsAisd .ds-fn{font-family:var(--mono);font-size:12px;color:var(--faint);margin-top:8px;text-align:right}
@media(max-width:760px){
 #dsAisd .ds-vd{grid-template-columns:1fr}
 #dsAisd .ds-vcr{margin-left:0;text-align:left;width:100%}
 #dsAisd .ds-evo{grid-template-columns:1fr 1fr}
 #dsAisd .ds-ph:nth-child(2){border-right:0}
 #dsAisd .ds-ph:nth-child(1),#dsAisd .ds-ph:nth-child(2){border-bottom:1px solid var(--line)}
 #dsAisd .ds-mtx{font-size:13px}
 #dsAisd .ds-mtx th,#dsAisd .ds-mtx td{padding:7px 6px}
 #dsAisd .ds-mtx .nt{display:none}
 #dsAisd .ds-yrp{grid-template-columns:1fr 1fr}
 #dsAisd .ds-mtx.plan thead th:nth-child(2),#dsAisd .ds-mtx.plan tbody tr:not(.sumrow) td:nth-child(2){display:none}
 #dsAisd .ds-rt{gap:7px}
 #dsAisd .ds-rtv{margin-left:0;width:100%}
}`;
var HTML=`<div style="position:relative">
  <div class="ds-kick">AI Value Chain · Demand · Supply</div>
  <h2 class="ds-title">AI <em>수요·공급</em> — 밸류체인으로 보는 상류·병목</h2>
  <div class="ds-upd">update : 2026.07.18 · 컨센서스 방향성 추정 · 수동 갱신(분기 캡처) · 리비전 트랙은 캡처 축적 전 예시</div>
</div>

<div class="ds-sec">판정 <span class="ds-note">이 블록이 답하는 질문 · 결론 먼저</span></div>
<div class="ds-lens">
  <div class="ds-l1"><b>판정 질문</b> ① 수요 성장률 — 가속인가 둔화인가 · ② 수요−공급 갭 — AI 주가 상승 여력이 남았나</div>
  <div class="ds-l2">판정 도구 = <b>추정 리비전 방향</b> — 연도별 추정치가 갱신될 때마다 ▲상향/▼하향 추적 · <span class="ds-nt">트리거는 가격이 아니라 리비전</span></div>
</div>
<div class="ds-vd">
  <div class="ds-vdc">
    <div class="ds-vq">Q1 · 수요 시계</div>
    <div class="ds-vt"><span class="ds-lamp g"></span>가속 유지</div>
    <div class="ds-vd0">CAPEX 컨센서스 2026E ~$700B → 2027E &gt;$1T → 2028E ~$1.2T — 최근 캡처 연속 <span class="ds-rev up">▲상향</span>. 리비전이 꺾이지 않는 한 수요 피크 미도래.</div>
  </div>
  <div class="ds-vdc">
    <div class="ds-vq">Q2 · 공급 추격</div>
    <div class="ds-vt"><span class="ds-lamp a"></span>타이트 지속</div>
    <div class="ds-vd0">3사 캐파 확대(~$575B)에도 선단(HBM4·1c) 램프가 병목. 중국은 레거시부터 잠식 — 선단 갭은 시간차.</div>
  </div>
  <div class="ds-vdc sum">
    <div class="ds-vq">종합 · 주가 상승 여력</div>
    <div class="ds-vt"><span class="ds-lamp g"></span>여력 유지 — 수요 리비전 ↑ × 공급 타이트 = γ open</div>
    <div class="ds-vd0">추정이 가격보다 빨리 오르는 국면 = 논제 유지. 상승 여력은 「수요 추정의 상향 속도 − 공급 캐파의 추격 속도」에서 나온다.</div>
    <div class="ds-vtr"><b>재판정 트리거(하나라도 점등 시 재판정):</b> ① 2026E~2028E 추정 <span class="ds-rev dn">▼하향</span> 전환(수요 둔화 경보) · ② DDR5 현물&lt;계약 롤오버(공급 과잉 신호) · ③ 가격 상승률이 리비전 속도 추월(성숙 전환)</div>
  </div>
</div>

<div class="ds-sec">밸류체인 — 전체 구조 <span class="ds-note">돈이 위에서 아래로 · 구조는 수동 판단</span></div>
<div class="ds-lens">
  <div class="ds-l1"><b>구조 · 돈의 강</b> 각 층의 지불이 아래층의 매출 — 병목은 돈이 몰리는데 공급이 못 따라오는 층에서 열린다</div>
  <div class="ds-l2">현재 병목 = <span class="ds-wn">④ Factory(반도체·전력)</span> · 상류 지불이 꺾이면(리비전 ▼) 하류 매출이 시차를 두고 꺾인다 → <span class="ds-nt">위 판정 보드와 연동</span></div>
  <div class="ds-l2"><b style="color:var(--txt)">ROI 점검</b> — 각 티어 하단에 매출·투자/비용·이익·전망: 이익은 아직 <span class="ds-ok">④에만 고인다</span> · ①~③의 ROI 증명이 지연되면 ④ 수요의 지속성이 꺾인다 → <span class="ds-nt">티어별 매출 리비전으로 감시</span></div>
</div>
<div class="ds-vct t1">
  <div class="ds-vch"><span class="ds-tno">①</span><span class="ds-vcn">AI 수요자</span><span class="ds-vce">Demand</span>
    <span class="ds-vcr">AI를 쓰고 돈을 낸다 — <b>수요의 원천</b></span></div>
  <div class="ds-vcb">
    <div class="ds-vcg"><div class="ds-vcgt">일반 소비자<small>B2C</small></div><div class="ds-chips"><span class="ds-chip">구독(챗봇·앱)</span><span class="ds-chip">디바이스 AI</span></div></div>
    <div class="ds-vcg"><div class="ds-vcgt">기업<small>B2B</small></div><div class="ds-chips"><span class="ds-chip">API·토큰</span><span class="ds-chip">코파일럿·에이전트</span><span class="ds-chip">자체 구축</span></div></div>
    <div class="ds-vcg"><div class="ds-vcgt">정부·공공<small>B2G</small></div><div class="ds-chips"><span class="ds-chip">소버린 AI</span><span class="ds-chip">국방·행정</span></div></div>
  </div>
  <div class="ds-vces">
    <span><span class="k">지불</span>글로벌 AI 지출 <b>▲ 급증</b>(기업 예산 편성 확대)</span>
    <span><span class="k">효용</span><span class="pf-mid">검증 진행형</span> — 파일럿→정착 전환율이 관건</span>
    <span><span class="k">전망</span>지불 의사 리비전 <b style="color:var(--st-hot)">▲</b> · 꺾이면 전체 사슬의 최상류 경보</span>
  </div>
</div>
<div class="ds-vcf"><span class="ds-vcfa">▼</span><span class="ds-vcft"><b>구독료·API 요금·라이선스</b> 지불</span><span class="ds-vcfm">$ 수요의 원천</span></div>
<div class="ds-vct t2">
  <div class="ds-vch"><span class="ds-tno">②</span><span class="ds-vcn">AI 판매자</span><span class="ds-vce">Model · Service</span>
    <span class="ds-vcr">모델·서비스로 수요를 수취 = 8레이어의 <b>L1</b></span></div>
  <div class="ds-vcb">
    <div class="ds-vcg"><div class="ds-vcgt">범용 AI 모델<small>Frontier</small></div><div class="ds-chips"><span class="ds-chip">OpenAI</span><span class="ds-chip">Anthropic</span><span class="ds-chip">Gemini</span><span class="ds-chip">DeepSeek</span></div></div>
    <div class="ds-vcg"><div class="ds-vcgt">특화 AI 모델·응용 서비스<small>Vertical · App</small></div><div class="ds-chips"><span class="ds-chip">구글 서비스</span><span class="ds-chip">MS(Copilot)</span><span class="ds-chip">오라클</span><span class="ds-chip">버티컬 SaaS</span></div></div>
  </div>
  <div class="ds-vces">
    <span><span class="k">매출</span>랩 합산 run-rate <b>~$40B±</b> · <b style="color:var(--st-hot)">▲</b> 연 2~3× 급성장</span>
    <span><span class="k">비용</span>컴퓨트·학습비가 <b>매출 상회</b>(OpenAI 연 손실 수십억$ 관측)</span>
    <span><span class="k">이익</span><span class="pf-no">적자 — ROI 미증명</span> · 성장으로 정당화 중</span>
    <span><span class="k">전망</span>매출 리비전 <b style="color:var(--st-hot)">▲</b> · 흑자 시점은 <b style="color:var(--st-accel)">▼ 후퇴</b></span>
  </div>
</div>
<div class="ds-vcf"><span class="ds-vcfa">▼</span><span class="ds-vcft"><b>컴퓨팅 비용</b> 지불(클라우드 임대·추론 토큰 원가)</span><span class="ds-vcfm">$ 매출→원가 전환</span></div>
<div class="ds-vct t3">
  <div class="ds-vch"><span class="ds-tno">③</span><span class="ds-vcn">컴퓨팅 판매자</span><span class="ds-vce">Cloud · Compute</span>
    <span class="ds-vcr">AI 서비스에 필요한 컴퓨팅을 판매 — <b>CAPEX의 주체</b></span></div>
  <div class="ds-vcb">
    <div class="ds-vcg"><div class="ds-vcgt">하이퍼스케일러<small>4사 = CAPEX 최상류 신호</small></div><div class="ds-chips"><span class="ds-chip">AWS</span><span class="ds-chip">Azure</span><span class="ds-chip">GCP</span><span class="ds-chip">Meta(자가)</span></div></div>
    <div class="ds-vcg"><div class="ds-vcgt">뉴클라우드·소버린<small>임대→주권 강물</small></div><div class="ds-chips"><span class="ds-chip">CoreWeave</span><span class="ds-chip">Oracle OCI</span><span class="ds-chip">국가 DC</span></div></div>
  </div>
  <div class="ds-vces">
    <span><span class="k">매출</span>클라우드 AI 증분 <b>~$150B±/년</b> · <b style="color:var(--st-hot)">▲</b> 두 자릿수 성장</span>
    <span><span class="k">투자</span>CAPEX <b>~$700B</b>(2026E) — 매출 증분을 크게 상회</span>
    <span><span class="k">이익</span><span class="pf-mid">클라우드 본업 흑자(마진 25~35%)</span> · AI 증분 ROI는 미증명 — 감가상각 파도 2027~</span>
    <span><span class="k">전망</span>capex <b style="color:var(--st-hot)">▲</b> &gt; AI 매출 <b style="color:var(--st-hot)">▲</b> → <span class="pf-no">갭 확대 = 경고 플래그</span></span>
  </div>
</div>
<div class="ds-vcf"><span class="ds-vcfa">▼</span><span class="ds-vcft"><b>CAPEX</b> — 컴퓨팅을 만들기 위한 <b>Factory 건설</b>(2026E 합산 ~$700B)</span><span class="ds-vcfm">$ 아래 ③ CAPEX 차트</span></div>
<div class="ds-vct t4">
  <div class="ds-vch"><span class="ds-tno">④</span><span class="ds-vcn">AI Factory</span><span class="ds-vce">Datacenter</span>
    <span class="ds-vcr"><b>반도체 + 전력</b>이 중심 — 현재 병목·알파맵 집중 구간</span></div>
  <div class="ds-vcb">
    <div class="ds-vcg"><div class="ds-vcgt">반도체<span class="ds-lb sem">L2–L6</span></div>
      <div class="ds-chips"><span class="ds-chip">컴퓨트 L2 · NVDA</span><span class="ds-chip hold">메모리 L3 · MU·삼성</span><span class="ds-chip">패키징·장비 L4</span><span class="ds-chip">서버 L5</span><span class="ds-chip hold">옵티컬 L6 · LITE</span></div></div>
    <div class="ds-vcg"><div class="ds-vcgt">전력<span class="ds-lb pow">L7–L8</span></div>
      <div class="ds-chips"><span class="ds-chip hold">전력·냉각 L7 · VRT·BE</span><span class="ds-chip hold">발전·그리드 L8 · CEG·VST</span></div></div>
  </div>
  <div class="ds-vces">
    <span><span class="k">매출</span>NVDA <b>~$200B+/년</b> · HBM·전력기기 <b style="color:var(--st-hot)">▲</b> 급증</span>
    <span><span class="k">투자</span>메모리 3사 <b>~$575B</b>(~2027) · 팹·캐파 경쟁</span>
    <span><span class="k">이익</span><span class="pf-ok">밸류체인 유일 확실 흑자</span> — NVDA 순마진 ~50%·HBM 고마진</span>
    <span><span class="k">전망</span>마진 피크 논쟁 진행 · 리비전은 아직 <b style="color:var(--st-hot)">▲</b></span>
  </div>
</div>
<div class="ds-vco"><b>알파맵의 관측 위치</b> — 돈은 ①→④로 내려가지만, 관측소는 <b>④ Factory(반도체·전력)에 ~80% 집중</b>한다. ①~③은 승자 판별이 어렵고(모델 경쟁·마진 미검증), ④는 <b>누가 이기든 팔리는 곡괭이·삽</b>이기 때문. <b>손익 지도도 같은 그림</b> — ② 적자·③ AI 증분 미증명·④만 확실 흑자. ①~③의 ROI 증명(매출 리비전)이 ④ 수요 지속성의 선행 지표다 — 위 판정 보드가 그 도구. <span style="font-family:var(--mono);font-size:12px;color:var(--faint)">· 티어 손익 수치는 공개 관측 기반 방향성(분기 캡처 갱신)</span></div>

<div class="ds-sec">① 수요 — AI의 진화 <span class="ds-note">방향만 · 추정 · 연도는 대략치</span></div>
<div class="ds-lens">
  <div class="ds-l1"><b>수요 성격</b> 학습(1회성)에서 추론·자율실행(상시)로 이동 = 컴퓨트 수요의 <span class="ds-ok">상시화</span></div>
  <div class="ds-l2">생성형 → Agentic(토큰 수요 ~24× by 2030, Goldman 추정) → 피지컬 → AGI <span class="ds-nt">방향 제시, 시점은 미지</span></div>
</div>
<div class="ds-evo">
  <div class="ds-ph p1"><div class="ds-eyr">~2022–2024</div><div class="ds-enm">생성형</div><div class="ds-een">Generative</div><div class="ds-eds">챗봇·콘텐츠 생성. 대규모 <b>학습(training)</b> 중심 — 1회성 컴퓨트 스파이크.</div><span class="ds-ebg">학습 주도</span></div>
  <div class="ds-ph p2"><div class="ds-eyr">2025–2026</div><div class="ds-enm">Agentic</div><div class="ds-een">자율 에이전트</div><div class="ds-eds">툴 사용·다단계 자율 실행. <b>추론(inference)</b> 토큰 폭증 — 컴퓨트 상시 점유.</div><span class="ds-ebg">추론 주도 · 현재</span></div>
  <div class="ds-ph p3"><div class="ds-eyr">2027–2028E</div><div class="ds-enm">피지컬</div><div class="ds-een">Physical AI</div><div class="ds-eds">로보틱스·자율주행·온디바이스. 물리세계 상호작용 → <b>엣지·전력</b> 수요로 확산.</div><span class="ds-ebg est">추정</span></div>
  <div class="ds-ph p4"><div class="ds-eyr">2029E+</div><div class="ds-enm">AGI</div><div class="ds-een">범용 지능</div><div class="ds-eds">범용 자율 지능. 시점·형태 모두 <b>미지</b> — 방향만 표시하고 숫자화하지 않는다.</div><span class="ds-ebg est">방향만</span></div>
</div>

<div class="ds-sec">② AI 판매자 — 모델·서비스 연도별 <span class="ds-note">L1 · 매출·계획은 공개 관측 기반 방향성 · 신규</span></div>
<div class="ds-lens">
  <div class="ds-l1"><b>② · L1</b> 판매자 매출 성장이 ③의 CAPEX를 정당화하는가 — capex/매출 갭의 분자</div>
  <div class="ds-l2">판매자 매출은 급성장 중이나 절대액이 CAPEX에 크게 못 미침 → <span class="ds-nt">갭 유지 = 아직 증명 전 · 판매자 매출 리비전이 꺾이면 상류보다 먼저 경보</span></div>
</div>
<div class="ds-card">
  <table class="ds-mtx plan">
    <thead><tr><th style="width:14%">업체</th><th style="width:20%">~2025</th><th class="est" style="width:23%">2026E</th><th class="est" style="width:22%">2027E</th><th class="est" style="width:21%">2028E~</th></tr></thead>
    <tbody>
      <tr><td class="ds-co">OpenAI<span class="ds-role lead">범용</span></td>
        <td>ChatGPT 주간 8억 사용자 · 매출 run-rate <b>~$13B</b> · GPT-5</td>
        <td>매출 ~$30B± 관측 · <b>Stargate 자체 DC</b> 착공 · 에이전트 상용화</td>
        <td>컴퓨트 원가가 손익 압박 — <b>흑자 전환 시점</b>이 관건 · IPO 관측</td>
        <td>자체 인프라 비중 확대 = ③층 의존 일부 탈피 시도</td></tr>
      <tr><td class="ds-co">Anthropic<span class="ds-role lead">범용</span></td>
        <td>기업 API·코딩 강세 · run-rate <b>~$5B</b></td>
        <td>~$9B+ 관측 · 에이전트(Claude Code) 확장</td>
        <td>기업 시장 점유 확대 — 효율·안전 우위 경쟁</td>
        <td>흑자 전환 목표 관측 — 범용 2강 구도 시험대</td></tr>
      <tr><td class="ds-co">Google<small>Gemini</small><span class="ds-role lead">범용</span></td>
        <td>검색·워크스페이스 통합 · <b>TPU 원가 우위</b></td>
        <td>추론 트래픽 폭증 — 자체칩으로 원가 방어</td>
        <td>유통(안드로이드·검색) 지렛대 극대화</td>
        <td>풀스택(모델+칩+클라우드) 수직통합 표준 후보</td></tr>
      <tr><td class="ds-co">DeepSeek<span class="ds-role cn">범용·中</span></td>
        <td><b>저비용 오픈모델</b> 충격 · 중국 내수 중심</td>
        <td>효율화 압력 전파 — 토큰 단가 하락 주도</td>
        <td>수출 제약 속 국산 칩 결합</td>
        <td>중국 AI 스택 자립의 축</td></tr>
      <tr><td class="ds-co">특화·응용<small>MS·오라클 등</small><span class="ds-role chase">특화</span></td>
        <td>Copilot 시트당 과금 정착 실험 · OCI AI 수주</td>
        <td>에이전트 SaaS 확산 — <b>ROI 증명</b>이 관건</td>
        <td>업무 침투율이 수요 지속성 결정</td>
        <td>응용층 마진 = 밸류체인 상류 정당화의 최종 심판</td></tr>
    </tbody>
  </table>
  <div class="ds-fn">매출·계획은 공개 관측 기반 방향성(비상장 다수 · 확정치 아님) — narrative 층</div>
</div>

<div class="ds-sec">③ 컴퓨팅 판매자 — CAPEX · 주요 업체 투자계획 <span class="ds-note">4사 합산 · $B · 2027E &gt;$1T · 2028E 컨센서스 희박 · 업체 클릭 = 연도별 상세</span></div>
<div class="ds-lens">
  <div class="ds-l1"><b>상류 · 수요 선행</b> 하이퍼스케일러 capex = 8레이어 전체 수요의 최상류 신호</div>
  <div class="ds-l2">2025 ~$460B(실적) → 2026E ~$700B → 2027E <span class="ds-wn">$1T 돌파 전망</span> → 2028E ~$1.2T · 우상향 지속 = 고점 미점등, 추정 리비전 확인 필요</div>
</div>
<div class="ds-card">
  <div class="ds-bars">
    <div class="ds-bc"><span class="ds-bv">$150B</span><div class="ds-bar" style="height:12%"></div></div>
    <div class="ds-bc"><span class="ds-bv">$230B</span><div class="ds-bar" style="height:18%"></div></div>
    <div class="ds-bc"><span class="ds-bv">$460B</span><div class="ds-bar" style="height:36%"></div></div>
    <div class="ds-bc"><span class="ds-bv">~$700B</span><div class="ds-bar est" style="height:55%"></div></div>
    <div class="ds-bc"><span class="ds-bv">&gt;$1,000B</span><div class="ds-bar est" style="height:78%"></div></div>
    <div class="ds-bc"><span class="ds-bv">~$1,200B</span><div class="ds-bar est" style="height:94%;border-style:dashed"></div></div>
  </div>
  <div class="ds-bx"><span>2023</span><span>2024</span><span>2025</span><span class="est">2026E</span><span class="est">2027E</span><span class="est">2028E</span></div>
  <div class="ds-rt"><span class="ds-rtl">2026E 리비전 트랙<br>4사 합산 · 캡처별</span>
    <span class="ds-rts"><i>25.10</i>$610B</span><span class="ds-rta">→</span>
    <span class="ds-rts"><i>26.01</i>$630B <span class="ds-rev up">▲20</span></span><span class="ds-rta">→</span>
    <span class="ds-rts"><i>26.04</i>$690B <span class="ds-rev up">▲60</span></span><span class="ds-rta">→</span>
    <span class="ds-rts"><i>26.07</i>~$700B <span class="ds-rev up">▲10</span></span>
    <span class="ds-rtv up">▲ 상향 지속 = 수요 가속</span></div>
  <div class="ds-rt"><span class="ds-rtl">2027E 리비전 트랙<br>4사 합산 · 캡처별</span>
    <span class="ds-rts"><i>26.01</i>$820B</span><span class="ds-rta">→</span>
    <span class="ds-rts"><i>26.04</i>$950B <span class="ds-rev up">▲130</span></span><span class="ds-rta">→</span>
    <span class="ds-rts"><i>26.07</i>&gt;$1,000B <span class="ds-rev up">▲50</span></span>
    <span class="ds-rtv up">▲ 상향 지속 · 폭은 둔화 관찰</span></div>
  <div class="ds-rt"><span class="ds-rtl">2028E 리비전 트랙<br>4사 합산 · 캡처별</span>
    <span class="ds-rts"><i>26.04</i>$1,050B</span><span class="ds-rta">→</span>
    <span class="ds-rts"><i>26.07</i>~$1,200B <span class="ds-rev up">▲150</span></span>
    <span class="ds-rtv up">▲ 상향 · 캡처 2회 = 신뢰 낮음</span></div>
  <div class="ds-fn">채워진 막대=실적 · 테두리=추정(E) · 점선=컨센서스 희박 · 리비전 트랙은 캡처 축적 전 예시 — 연동 시 분기 스냅샷 비교로 자동 파생</div>
</div>

<div class="ds-lens" style="margin-top:14px">
  <div class="ds-l1"><b>수요 · 4사 분해</b> 누가 얼마를 · 어느 방향으로 늘리나</div>
  <div class="ds-l2">4사 모두 동시 증액 = 경쟁적 과투자 국면 · <span class="ds-nt">capex/매출 갭 확대는 가격시계 경고 플래그</span></div>
</div>
<div class="ds-card">
  <table class="ds-mtx">
    <thead><tr><th>업체</th><th>2024</th><th>2025</th><th class="est">2026E</th><th class="est">2027E</th><th class="est">2028E</th><th class="nt">방향</th></tr></thead>
    <tbody>
      <tr class="exp" tabindex="0"><td class="ds-co">Amazon<small>AWS</small></td><td>83</td><td>~118</td><td class="dim">~200 <span class="ds-rev up">▲25</span></td><td class="dim">↑ <span class="ds-rev up">▲</span></td><td class="dim">↑</td><td class="nt">최대 규모 · Trainium 자체칩 병행</td></tr>
      <tr class="dtl"><td colspan="7"><div class="ds-yrp">
        <div class="ds-yc"><div class="ds-yy">2024</div><div class="ds-yv">$83B</div><div class="ds-yt">생성형 수요 대응 — DC·네트워크 확장, Trainium2 도입 개시</div></div>
        <div class="ds-yc"><div class="ds-yy">2025</div><div class="ds-yv">~$118B</div><div class="ds-yt">Trainium2 램프 · 자체 DC 가속 · Anthropic 수요 연동</div></div>
        <div class="ds-yc"><div class="ds-yy est">2026E</div><div class="ds-yv">~$200B</div><div class="ds-yt">「수요가 캐파 초과」 — Trainium3 · 전력 확보 경쟁</div></div>
        <div class="ds-yc"><div class="ds-yy est">2027E</div><div class="ds-yv">↑ 지속</div><div class="ds-yt">AWS AI 매출 성장 연동 증액 시사 · 구체 가이던스 미제시</div></div>
        <div class="ds-yc"><div class="ds-yy est">2028E</div><div class="ds-yv">컨센 희박</div><div class="ds-yt">AWS 매출·전력 확보 속도 연동 — 애널 소수 추정만 존재</div></div>
      </div></td></tr>
      <tr class="exp" tabindex="0"><td class="ds-co">Google<small>Alphabet</small></td><td>53</td><td>~85</td><td class="dim">~185 <span class="ds-rev up">▲40</span></td><td class="dim">↑ <span class="ds-rev up">▲</span></td><td class="dim">↑</td><td class="nt">TPU·데이터센터 공격적 상향</td></tr>
      <tr class="dtl"><td colspan="7"><div class="ds-yrp">
        <div class="ds-yc"><div class="ds-yy">2024</div><div class="ds-yv">$53B</div><div class="ds-yt">TPU v5·DC 증설 — Gemini 학습 인프라</div></div>
        <div class="ds-yc"><div class="ds-yy">2025</div><div class="ds-yv">~$85B</div><div class="ds-yt">가이던스 반복 상향 · TPU 확대 · 클라우드 수요</div></div>
        <div class="ds-yc"><div class="ds-yy est">2026E</div><div class="ds-yv">~$185B</div><div class="ds-yt">대폭 상향 — TPU 차세대 · Gemini 추론 트래픽 폭증 대응</div></div>
        <div class="ds-yc"><div class="ds-yy est">2027E</div><div class="ds-yv">↑ 지속</div><div class="ds-yt">자체칩(TPU) 비중 확대 = NVIDIA 의존 일부 완화 변수</div></div>
        <div class="ds-yc"><div class="ds-yy est">2028E</div><div class="ds-yv">컨센 희박</div><div class="ds-yt">TPU 세대 교체 주기 지속 전제 — 추론 트래픽이 규모 결정</div></div>
      </div></td></tr>
      <tr class="exp" tabindex="0"><td class="ds-co">Meta</td><td>39</td><td>~72</td><td class="dim">~125 <span class="ds-rev up">▲10</span></td><td class="dim">↑ <span class="ds-rev fl">→</span></td><td class="dim">↑</td><td class="nt">추론·자체 클러스터 집중</td></tr>
      <tr class="dtl"><td colspan="7"><div class="ds-yrp">
        <div class="ds-yc"><div class="ds-yy">2024</div><div class="ds-yv">$39B</div><div class="ds-yt">Llama 학습 · 추천 시스템 GPU 확충</div></div>
        <div class="ds-yc"><div class="ds-yy">2025</div><div class="ds-yv">~$72B</div><div class="ds-yt">추론 캐파 집중 · 자체 DC 건설 가속</div></div>
        <div class="ds-yc"><div class="ds-yy est">2026E</div><div class="ds-yv">~$125B</div><div class="ds-yt">기가와트급 클러스터(Hyperion·Prometheus) 착공·램프</div></div>
        <div class="ds-yc"><div class="ds-yy est">2027E</div><div class="ds-yv">↑ 지속</div><div class="ds-yt">수년간 기가와트 단위 증설 로드맵 공언 — 전력이 제약</div></div>
        <div class="ds-yc"><div class="ds-yy est">2028E</div><div class="ds-yv">↑ 로드맵</div><div class="ds-yt">Hyperion 5GW급 완공 목표 구간 — 전력·부지 확보가 상한</div></div>
      </div></td></tr>
      <tr class="exp" tabindex="0"><td class="ds-co">Microsoft<small>Azure/OpenAI</small></td><td>44</td><td>~80</td><td class="dim">~120 <span class="ds-rev up">▲5</span></td><td class="dim">↑ <span class="ds-rev fl">→</span></td><td class="dim">~</td><td class="nt">OpenAI 연동 · 임대+자가 혼합</td></tr>
      <tr class="dtl"><td colspan="7"><div class="ds-yrp">
        <div class="ds-yc"><div class="ds-yy">2024</div><div class="ds-yv">$44B</div><div class="ds-yt">Azure AI 인프라 — OpenAI 학습·서빙 수요</div></div>
        <div class="ds-yc"><div class="ds-yy">2025</div><div class="ds-yv">~$80B</div><div class="ds-yt">FY 기준 $80B+ 공언 · 자가 DC + 임대(리스) 병행</div></div>
        <div class="ds-yc"><div class="ds-yy est">2026E</div><div class="ds-yv">~$120B</div><div class="ds-yt">증가율은 둔화·절대액 확대 — 전력 계약(원전 포함) 선점</div></div>
        <div class="ds-yc"><div class="ds-yy est">2027E</div><div class="ds-yv">↑ 지속</div><div class="ds-yt">OpenAI 자체 DC(Stargate) 분산 = MS 단독 부담 완화 변수</div></div>
        <div class="ds-yc"><div class="ds-yy est">2028E</div><div class="ds-yv">~ 재조정</div><div class="ds-yt">Stargate 분산 후 자가/임대 비중 재조정 — 4사 중 증가율 최저 가능</div></div>
      </div></td></tr>
    </tbody>
  </table>
  <div class="ds-fn"><span class="ds-rev up">▲</span>/<span class="ds-rev dn">▼</span> = 직전 컨센서스 캡처(분기) 대비 상향/하향 · <span class="ds-rev fl">→</span> = 변동 없음 — 리비전 방향이 상단 판정 보드의 입력</div>
</div>

<div class="ds-sec">④ Factory — 구성요소별 투자 <span class="ds-note">공급 · 컴퓨팅을 만드는 Factory의 부품 — L2~L8 · 연도별</span></div>
<div class="ds-lens">
  <div class="ds-l1"><b>④ · L2–L8</b> Factory 구성요소별 — 병목이 어느 요소로 이동하나</div>
  <div class="ds-l2">컴퓨트는 공급 완화 방향 · 메모리(HBM) 타이트 지속 · <span class="ds-wn">전력·냉각 리드타임이 새 병목 후보</span> → 병목은 사슬 아래로 이동 중</div>
</div>
<div class="ds-card">
  <table class="ds-mtx plan">
    <thead><tr><th style="width:14%">업체</th><th style="width:20%">~2025</th><th class="est" style="width:23%">2026E</th><th class="est" style="width:22%">2027E</th><th class="est" style="width:21%">2028E~</th></tr></thead>
    <tbody>
      <tr><td class="ds-co">컴퓨트 반도체<small>NVDA · AMD · 인텔</small><span class="ds-lb sem">L2</span></td>
        <td>NVIDIA <b>Blackwell 램프</b> · 점유 ~90% · AMD MI300/350 추격 · 인텔 Gaudi 부진</td>
        <td>NVIDIA <b>Rubin 출시</b> · AMD MI400(대형 수주 확보) · 인텔 가속기 재편</td>
        <td>Rubin Ultra · 자체칩(TPU·Trainium) 경쟁 심화 — 점유 잠식 변수</td>
        <td>세대 교체 주기 단축 지속 — 컴퓨트 공급은 완화 방향, 수급 균형이 관건</td></tr>
      <tr><td class="ds-co">메모리<small>삼성 · SK하이닉스 · Micron</small><span class="ds-lb sem">L3</span></td>
        <td>HBM3E 타이트 · SK 독주 · 3사 캐파 경쟁 개시</td>
        <td>SK <b>+$15B 팹</b>(M15X·용인) · 삼성 <b>HBM +50%</b>·HBM4 퀄 · Micron 싱가포르 패키징 — 합산 <b>~$575B</b>(2027까지) <span class="ds-rev up">▲</span></td>
        <td>용인 1기·P4/P5·아이다호 가동 — 공급 확대에도 선단(1c·HBM4) 타이트</td>
        <td>신규 캐파 동시 램프 = <b>과잉 리스크 최대 구간</b> · HBM4E→HBM5 전환</td></tr>
      <tr><td class="ds-co">통신·네트워킹<small>Broadcom · Marvell · 옵티컬(LITE·Coherent)</small><span class="ds-lb sem">L6</span></td>
        <td><b>800G 광모듈 램프</b> · 커스텀 ASIC(TPU·Trainium) 수주 급증</td>
        <td><b>1.6T 전환 개시</b> · CPO(co-packaged optics) 상용화 시동</td>
        <td>스케일업/아웃 네트워크 재편 — 대역폭 병목으로 옵티컬 비중 확대</td>
        <td>CPO 표준화가 광모듈 업체 마진의 분수령</td></tr>
      <tr><td class="ds-co">냉각<small>Vertiv 등</small><span class="ds-lb pow">L7</span></td>
        <td>공랭→<b>수랭(liquid) 전환 가속</b> · 랙당 전력밀도 급등</td>
        <td>리퀴드 쿨링 표준화(GB300급) — 수주잔고 확대</td>
        <td>신축 DC 대부분 수랭 설계 — 냉각이 건설 리드타임 변수</td>
        <td>2상 냉각·침지 등 차세대 방식 경쟁</td></tr>
      <tr><td class="ds-co">전력·발전<small>CEG · VST · Bloom · 그리드</small><span class="ds-lb pow">L7–L8</span></td>
        <td>DC 전력 계약(원전 PPA) <b>선점 경쟁</b></td>
        <td>가스터빈·변압기 <b>리드타임 병목</b> — 연료전지(온사이트)로 우회 수요</td>
        <td>신규 원전·SMR 착공 · 그리드 증설 본격화</td>
        <td><b>전력이 Factory 증설의 최종 상한</b> — 병목의 종착지 후보</td></tr>
      <tr class="sumrow"><td class="ds-co">병목 이동</td>
        <td colspan="4">컴퓨트(완화 방향) → <b>메모리(타이트 지속)</b> → 통신(1.6T·CPO 전환) → <b>냉각·전력(새 병목 부상)</b> — 층 고정이 아니라 <b>병목 추적</b>이 알파의 원천 · 메모리 상세는 γ-닫힘 3트리거(MU)·01 DXI로 라이브 감시</td></tr>
    </tbody>
  </table>
</div>

<div class="ds-sec">④ Factory — 중국 업체 확대 계획 <span class="ds-note">공급 · CXMT·YMTC·SMIC · 캐파 2배 시도 · 선단 격차 존재</span></div>
<div class="ds-lens">
  <div class="ds-l1"><b>공급 · 후미 위협</b> 레거시부터 잠식 · 선단(HBM4·EUV)은 아직 격차</div>
  <div class="ds-l2">CXMT 분기 흑자 전환·캐파 2배 계획 · 신규 팹 2기 → <span class="ds-nt">레거시 DRAM/NAND 공급 압박, 선단은 시간차</span></div>
</div>
<div class="ds-card">
  <table class="ds-mtx plan">
    <thead><tr><th style="width:14%">업체</th><th style="width:20%">~2025</th><th class="est" style="width:23%">2026E</th><th class="est" style="width:22%">2027E</th><th class="est" style="width:21%">2028E~</th></tr></thead>
    <tbody>
      <tr><td class="ds-co">CXMT<small>창신 · DRAM</small><span class="ds-role cn">DRAM</span></td>
        <td>DRAM 양산 확대 · <b>분기 흑자 전환</b>($4.9B급 관측) · 웨이퍼 기준 Micron 물량 근접</td>
        <td><b>캐파 2배 확대</b> 시도 · <b>신규 팹 2기</b> 착공·램프 — AI 붐이 증설 명분·수요 커버</td>
        <td>선단(1z 이후) 진입 시도 — 수율·선단 미검증 · HBM은 시간차</td>
        <td><b>캐파 2배 도달 목표 구간</b> · HBM 자립 시도 — 성패가 글로벌 레거시 가격의 최대 변수</td></tr>
      <tr><td class="ds-co">YMTC<small>양쯔 · NAND</small><span class="ds-role cn">NAND</span></td>
        <td>NAND 캐파 확대 · 내수 우선 공급</td>
        <td>신규 팹 램프 · 캐파 대폭 확대 — 글로벌 낸드 공급 하방 압력</td>
        <td>고층 적층 추격 · 장비 국산화 의존도가 속도 변수</td>
        <td>적층 고도화 · 내수 넘어 수출 확대 시 낸드 가격 구조 압박</td></tr>
      <tr><td class="ds-co">SMIC<small>파운드리</small><span class="ds-role cn">로직</span></td>
        <td>성숙 노드 풀가동 · 선단 시도</td>
        <td>캐파 확대 지속 — <b>성숙 노드 중심</b>, AI 가속기 국산 수요 흡수</td>
        <td>EUV 제약으로 <b>7nm 이하 램프 한계</b> 지속 — 격차 유지 전망</td>
        <td>성숙 노드 글로벌 점유 확대 · 선단은 정체 — 국산 장비(EUV 대체) 진전이 유일 변수</td></tr>
      <tr class="sumrow"><td class="ds-co">정책 · 5개년</td>
        <td colspan="4">차기 5개년 계획(2026~2030)이 메모리·장비 <b>국산화·보조금</b>을 밀어붙임 — big 3와 격차 축소 시도. <b>레거시부터 잠식</b>, 선단(HBM4·EUV)은 시간차 · 2028E는 5개년 중간 점검 시점 = 잠식 속도 재평가 구간</td></tr>
    </tbody>
  </table>
</div>

<div class="ds-sec">스틸맨 <span class="ds-note">이 프레임에 대한 반론</span></div>
<div class="ds-card">
  <div class="ds-steel"><b>수요측:</b> capex/매출 갭이 벌어지는 중 — 상류 지출이 실제 AI 매출보다 빠르다. 2027 $1T 전망은 리비전이 뒷받침되지 않으면 되레 성숙 신호(가격시계 과열)일 수 있다.</div>
  <div class="ds-steel"><b>공급측:</b> Samsung +50%·SK +$15B·중국 ×2가 동시 램프되면 2027~2028 <b>공급 과잉·가격 롤오버</b> 위험. DDR5 현물이 계약 아래로 롤오버되면 사이클 후반 전환 텔.</div>
  <div class="ds-steel"><b>중국측:</b> 웨이퍼 캐파 접근 ≠ 승리. HBM4·1c·EUV 격차가 유지되는 한 선단 시장은 방어된다 — 위협은 레거시 마진 잠식에 국한될 수 있다.</div>
  <div class="ds-steel"><b>밸류체인측:</b> ②층이 효율화(DeepSeek式 저비용 추론)에 성공하면 ③→④로 내려오는 돈이 줄 수 있다(Jevons 반론: 싸지면 총수요가 더 는다 — 강물 2). ④ 안에서도 병목은 이동한다(컴퓨트→메모리→패키징→전력) — 층 고정이 아니라 <b>병목 추적</b>이 알파의 원천.</div>
</div>`;
function mount(){
 var host=document.getElementById('v-thread');
 if(!host||document.getElementById('dsAisd'))return;
 var st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
 var wrap=document.createElement('div');wrap.id='dsAisd';wrap.innerHTML=HTML;
 host.insertBefore(wrap,host.firstChild);
 wrap.querySelectorAll('tr.exp').forEach(function(r){
  function tg(){r.classList.toggle('on');var d=r.nextElementSibling;if(d&&d.classList.contains('dtl'))d.classList.toggle('on');}
  r.addEventListener('click',tg);
  r.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();tg();}});
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
