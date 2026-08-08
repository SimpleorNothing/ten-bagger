/* council-view-collapse.js — 전문가 카드 관점 본문 접기/펼치기 */
(function () {
  "use strict";
  if (window.__councilViewCollapse) return;
  window.__councilViewCollapse = true;
  function injectStyle() {
    if (document.getElementById("councilViewCollapseStyle")) return;
    var s = document.createElement("style"); s.id = "councilViewCollapseStyle";
    s.textContent = "#v-council .cl-view{cursor:pointer;position:relative;max-height:4.8em;overflow:hidden;transition:max-height .18s ease;padding-right:18px}#v-council .cl-view::after{content:'클릭하여 펼치기';position:absolute;right:0;bottom:0;padding:2px 0 0 12px;font-size:11px;font-weight:600;color:var(--dawn,#9a7b2f);background:linear-gradient(90deg,transparent,var(--panel,#fff) 28%)}#v-council .cl-view.is-expanded{max-height:2000px}#v-council .cl-view.is-expanded::after{content:'클릭하여 접기';background:none}";
    document.head.appendChild(s);
  }
  function mount(root) {
    var nodes = (root || document).querySelectorAll("#v-council .cl-view");
    for (var i=0;i<nodes.length;i++) {
      var el=nodes[i]; if (el.dataset.viewCollapseBound) continue;
      el.dataset.viewCollapseBound="1"; el.setAttribute("role","button"); el.setAttribute("tabindex","0"); el.setAttribute("aria-expanded","false"); el.title="클릭하여 전문가 관점을 펼치거나 접습니다";
      el.addEventListener("click",function(e){e.stopPropagation();var open=this.classList.toggle("is-expanded");this.setAttribute("aria-expanded",open?"true":"false");});
      el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();this.click();}});
    }
  }
  function boot(){injectStyle();mount(document);var t=document.getElementById("v-council");if(t)new MutationObserver(function(){mount(t);}).observe(t,{childList:true,subtree:true});}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();

/* 04 시장과 실적 전망 — 클라우드 차트 하단 AI 버블 조기경보판 */
(function () {
  "use strict";
  if (window.__aiBubbleWatch) return;
  window.__aiBubbleWatch = true;

  var Q = {
    asOf: "26.2Q",
    backlog: [669, 1688],
    revenue: [91.1, 126.3],
    capex: [78.7, 140.1],
    opMargin: [35, 39]
  };

  function pct(now, prev) { return prev ? (now / prev - 1) * 100 : null; }
  function pp(now, prev) { return now - prev; }
  function n(v) { return Math.round(v); }
  function signed(v, suffix) { return (v > 0 ? "+" : "") + n(v) + (suffix || "%"); }

  function addStyle() {
    if (document.getElementById("aiBubbleWatchStyle")) return;
    var s = document.createElement("style");
    s.id = "aiBubbleWatchStyle";
    s.textContent = [
      "#dsAisd .ab-wrap{margin:-16px 0 28px;background:var(--panel);border:1px solid var(--line);border-radius:3px;padding:14px 15px}",
      "#dsAisd .ab-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:11px}",
      "#dsAisd .ab-title{font-size:15px;font-weight:700;letter-spacing:-.01em}",
      "#dsAisd .ab-sub{font-size:12.5px;line-height:1.5;color:var(--faint);margin-top:3px}",
      "#dsAisd .ab-summary{font-family:var(--mono);font-size:12px;font-weight:700;border:1px solid var(--line2);border-radius:20px;padding:4px 9px;color:var(--txt);white-space:nowrap}",
      "#dsAisd .ab-flow{font-family:var(--mono);font-size:12px;color:var(--dim);background:var(--panel2);border:1px solid var(--line);border-radius:3px;padding:8px 10px;margin-bottom:10px;line-height:1.5}",
      "#dsAisd .ab-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border:1px solid var(--line);border-radius:3px;overflow:hidden}",
      "#dsAisd .ab-item{padding:10px 11px;border-right:1px solid var(--line);min-width:0;background:var(--panel)}",
      "#dsAisd .ab-item:last-child{border-right:0}",
      "#dsAisd .ab-k{font-family:var(--mono);font-size:11px;color:var(--faint);letter-spacing:.03em}",
      "#dsAisd .ab-v{font-family:var(--mono);font-size:15px;font-weight:700;color:var(--txt);margin-top:4px;white-space:nowrap}",
      "#dsAisd .ab-d{font-size:12px;color:var(--dim);line-height:1.45;margin-top:4px}",
      "#dsAisd .ab-state{display:inline-block;font-family:var(--mono);font-size:11px;font-weight:700;margin-top:6px;padding:2px 7px;border-radius:20px;border:1px solid var(--line2)}",
      "#dsAisd .ab-state.ok{color:var(--st-dawn)}",
      "#dsAisd .ab-state.warn{color:var(--st-hot)}",
      "#dsAisd .ab-state.na{color:var(--faint);border-style:dashed}",
      "#dsAisd .ab-rule{margin-top:10px;padding-top:9px;border-top:1px dashed var(--line);display:flex;gap:12px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;font-size:12.5px;line-height:1.55;color:var(--dim)}",
      "#dsAisd .ab-rule b{color:var(--txt)}",
      "#dsAisd .ab-foot{font-size:11.5px;color:var(--faint);margin-top:8px;line-height:1.5}",
      "@media(max-width:900px){#dsAisd .ab-grid{grid-template-columns:1fr 1fr}#dsAisd .ab-item{border-bottom:1px solid var(--line)}#dsAisd .ab-item:nth-child(2n){border-right:0}#dsAisd .ab-item:last-child{grid-column:1/-1;border-bottom:0}}",
      "@media(max-width:560px){#dsAisd .ab-grid{grid-template-columns:1fr}#dsAisd .ab-item{border-right:0}#dsAisd .ab-item:last-child{grid-column:auto}}"
    ].join("");
    document.head.appendChild(s);
  }

  function mount() {
    var root = document.getElementById("dsAisd");
    if (!root || root.querySelector(".ab-wrap")) return !!root;
    var charts = root.querySelector(".ds-topcharts");
    if (!charts) return false;

    var rpo = pct(Q.backlog[1], Q.backlog[0]);
    var rev = pct(Q.revenue[1], Q.revenue[0]);
    var cap = pct(Q.capex[1], Q.capex[0]);
    var gap = cap - rev;
    var margin = pp(Q.opMargin[1], Q.opMargin[0]);

    var warnings = 0;
    var capWarn = gap >= 25;
    if (capWarn) warnings++;
    var checked = 4;

    addStyle();
    var el = document.createElement("section");
    el.className = "ab-wrap";
    el.setAttribute("aria-label", "AI 버블 조기경보판");
    el.innerHTML = [
      '<div class="ab-head"><div><div class="ab-title">AI 버블 조기경보</div><div class="ab-sub">주가가 아니라 수요 → 투자 → 매출 → 수익성 → 공급망의 연결이 끊기는지를 판정</div></div><div class="ab-summary">현재 경고 ' + warnings + '/' + checked + ' · 공급망 1개 미확인</div></div>',
      '<div class="ab-flow">RPO·고객수요 → CAPEX → 6~24개월 → Cloud 매출 → 영업이익·FCF · 이 연결이 연속적으로 약화될수록 버블 해소 위험 상승</div>',
      '<div class="ab-grid">',
        '<div class="ab-item"><div class="ab-k">1 수요 · RPO</div><div class="ab-v">YoY ' + signed(rpo) + '</div><div class="ab-d">수주잔고가 CAPEX를 선행해 뒷받침하는지 확인</div><span class="ab-state ok">경고 아님</span></div>',
        '<div class="ab-item"><div class="ab-k">2 투자 · CAPEX</div><div class="ab-v">YoY ' + signed(cap) + '</div><div class="ab-d">Cloud 매출보다 ' + signed(gap, '%p') + ' 빠름</div><span class="ab-state ' + (capWarn ? 'warn">경계' : 'ok">경고 아님') + '</span></div>',
        '<div class="ab-item"><div class="ab-k">3 수익화 · Cloud 매출</div><div class="ab-v">YoY ' + signed(rev) + '</div><div class="ab-d">CAPEX가 실제 서비스 매출로 전환되는지 확인</div><span class="ab-state ok">경고 아님</span></div>',
        '<div class="ab-item"><div class="ab-k">4 수익성 · 영업이익률</div><div class="ab-v">YoY ' + signed(margin, '%p') + '</div><div class="ab-d">공개 클라우드 부문 매출가중 참고치 ' + Q.opMargin[1] + '%</div><span class="ab-state ok">경고 아님</span></div>',
        '<div class="ab-item"><div class="ab-k">5 공급망 · GPU/HBM/네트워크</div><div class="ab-v">자료 미연결</div><div class="ab-d">리드타임·가격·재고·주문취소를 함께 확인</div><span class="ab-state na">미확인</span></div>',
      '</div>',
      '<div class="ab-rule"><div><b>판정 규칙</b> · 0~2개 악화 = 구조적 투자 범위 · 3개 동시 악화 = 신규 확대 중단/관찰 · 4~5개 = 버블 해소 위험 급상승</div><div><b>핵심 조합</b> · RPO 둔화 + CAPEX 고성장 + 매출 둔화 + margin 하락 + 공급망 재고 증가</div></div>',
      '<div class="ab-foot">' + Q.asOf + ' 기준. RPO·매출·CAPEX·영업이익률은 바로 위 클라우드 분기 그래프와 동일 데이터로 계산. 현재 값만으로 산업 전체의 버블 여부를 단정하지 않으며, 공급망 지표는 근거 데이터 연결 전까지 점수에 포함하지 않음.</div>'
    ].join("");
    charts.insertAdjacentElement("afterend", el);
    return true;
  }

  function boot() {
    if (mount()) return;
    var obs = new MutationObserver(function () { if (mount()) obs.disconnect(); });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () { try { obs.disconnect(); } catch (_) {} mount(); }, 10000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();