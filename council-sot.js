/* council-sot.js — 04 전문가 원탁 관점 단일 SoT(council.json) 배선 (소형 인핸서)
   flags.js 가 동적 로드. index.html·worker 무편집.
   - window.COUNCIL(인라인 클로저)은 건드리지 않는다(EXPERTS 비공개).
   - 카드 렌더 후 council.json 값으로 .cl-view/stance/updated 를 패치한다.
     단 「관점 갱신」(/api/council-log KV) 이 있는 전문가는 건드리지 않는다 = 라이브가 파일을 이김.
   - synthesis(수렴/발산/긴장/인사이트/스틸맨)를 「관점 지형」(#clSynth)에 렌더.
   - 로드/파싱 실패 시 아무 것도 안 함 → 원본 인라인 COUNCIL 이 그대로 폴백. */
(function () {
  "use strict";
  if (window.__councilSotRan) return;
  window.__councilSotRan = 1;

  var SC = { "강세": "var(--st-dawn,#2f7d63)", "중립": "var(--st-mature,#9a7b2f)", "약세": "var(--st-hot,#b4472f)" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function gj(u) { return fetch(u, { credentials: "same-origin", cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }

  var DATA = null, KV = {}, patching = false;
  function byId(id) { var a = (DATA && DATA.experts) || []; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }

  function patchCards() {
    if (!DATA) return;
    document.querySelectorAll("#v-council .cl-card").forEach(function (card) {
      var id = card.getAttribute("data-id");
      if (!id || KV[id]) return; // 관점 갱신(KV) 있는 전문가는 라이브 우선 — 건드리지 않음
      var e = byId(id); if (!e) return;
      var c = SC[e.stance] || SC["중립"];
      var v = card.querySelector(".cl-view");
      if (v && e.view && v.textContent !== e.view) { v.textContent = e.view; v.style.borderLeftColor = c; }
      var p = card.querySelector(".cl-pill");
      if (p && e.stance && p.textContent !== e.stance) {
        p.textContent = e.stance; p.style.color = c;
        p.style.background = "color-mix(in srgb," + c + " 12%,transparent)";
        p.style.border = "1px solid color-mix(in srgb," + c + " 45%,transparent)";
      }
      var f = card.querySelector(".cl-upd");
      if (f && e.updated) f.textContent = "업데이트 " + e.updated;
    });
  }

  function blk(title, color, items) {
    if (!items || !items.length) return "";
    return '<div class="cl-blk"><div class="cl-eye" style="color:' + color + '">' + esc(title) + '</div><ul style="margin:8px 0 0;padding-left:16px;line-height:1.7;font-size:14px">' +
      items.map(function (x) { return '<li style="margin-bottom:5px">' + esc(x) + "</li>"; }).join("") + "</ul></div>";
  }
  function renderSynth() {
    var s = DATA && DATA.synthesis; if (!s) return;
    var price = document.getElementById("clPrice"); if (!price || !price.parentNode) return;
    var el = document.getElementById("clSynth");
    if (!el) {
      var h = document.createElement("h2"); h.className = "msec"; h.style.marginTop = "26px";
      h.innerHTML = '관점 지형 <span class="mnote">같고 다름 한눈에 · 토론 없이도 · council.json SoT</span>';
      el = document.createElement("div"); el.id = "clSynth";
      price.parentNode.insertBefore(h, price.nextSibling);
      price.parentNode.insertBefore(el, h.nextSibling);
    }
    var two = '<div class="cl-two">' + blk("합의 · 같음", SC["강세"], s.converge) + blk("이견 · 다름", SC["중립"], s.diverge) + "</div>";
    var ten = (s.tension && s.tension.length) ? '<div style="margin-top:14px"><div class="cl-eye">긴장축 · 대립 렌즈</div><ul style="margin:8px 0 0;padding-left:18px;line-height:1.8;font-size:14px">' + s.tension.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" : "";
    var ins = s.insight ? '<div class="cl-steel"><div class="cl-eye">좌장 · 한 줄 인사이트</div><p style="margin:6px 0 0;font-size:14px;line-height:1.7">' + esc(s.insight) + "</p></div>" : "";
    var stl = s.steelman ? '<div class="cl-steel" style="border-left-color:var(--st-hot,#b4472f)"><div class="cl-eye">스틸맨 반론</div><p style="margin:6px 0 0;font-size:14px;line-height:1.7">' + esc(s.steelman) + "</p></div>" : "";
    el.innerHTML = '<div class="cl-rep">' + two + ten + ins + stl + "</div>";
  }

  function apply() { if (patching) return; patching = true; try { patchCards(); renderSynth(); } catch (e) {} setTimeout(function () { patching = false; }, 0); }

  function boot() {
    Promise.all([gj("/council.json"), gj("/api/council-log")]).then(function (r) {
      DATA = r[0];
      var log = r[1];
      if (Array.isArray(log)) log.forEach(function (e) { if (e && e.expertId) KV[e.expertId] = true; });
      if (!DATA) return;
      apply();
      var root = document.getElementById("v-council");
      if (root && window.MutationObserver) {
        var mo = new MutationObserver(function () { if (patching) return; clearTimeout(boot._t); boot._t = setTimeout(apply, 60); });
        ["clChair", "clThesis", "clPrice"].forEach(function (gid) { var g = document.getElementById(gid); if (g) mo.observe(g, { childList: true, subtree: true }); });
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
