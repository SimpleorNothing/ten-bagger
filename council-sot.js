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

  // SoT council.json 데이터를 council-audio.js 의 hifiPlay 에 넘기기 위한 d 구조 빌드.
  // index.html buildSeq 와 동일한 형태: { diagnosis, board[], consensus[], tension[], steelman }.
  function buildSotD() {
    if (!DATA) return null;
    var s = DATA.synthesis || {};
    var d = { diagnosis: "", board: [], consensus: s.converge || [], tension: s.diverge || [], steelman: s.steelman || "" };
    // 좌장 진단: insight 를 diagnosis 로 사용(가장 밀도 높은 1줄 요약).
    d.diagnosis = s.insight || "";
    // 전문가 발언: experts 배열에서 id·name·call(stance)·take(view) 추출.
    (DATA.experts || []).forEach(function (e) {
      if (e.id === "chair" || !e.view) return;
      d.board.push({ id: e.id, name: e.name || e.id, call: e.stance || "", take: e.view || "" });
    });
    // tension 은 diverge + tension 합산(council.json 에서 diverge·tension 둘 다 존재할 수 있음).
    var tensions = (s.tension || []).concat(s.diverge || []);
    d.tension = tensions.filter(function (x, i, a) { return a.indexOf(x) === i; }); // dedup
    d.consensus = s.converge || [];
    return d;
  }

  // ── CSS 주입 (첨부 UI 토큰 · 기존 .cl-* 무충돌 · csot- 네임스페이스)
  function injectCSS() {
    if (document.getElementById("csotStyle")) return;
    var s = document.createElement("style");
    s.id = "csotStyle";
    s.textContent = [
      // 카드 공통
      ".csot-card{background:#fff;border:1px solid #e4e2dc;border-radius:10px;padding:13px 14px;margin-bottom:0}",
      ".csot-card-label{font-size:10px;font-weight:700;letter-spacing:.08em;color:#9e9b95;margin-bottom:8px;display:flex;align-items:center;gap:5px}",
      ".csot-card-label::after{content:'';flex:1;height:1px;background:#e4e2dc}",
      // 합의 카드
      ".csot-agree{border-color:#b8d9c2;background:#f0f7f2}",
      ".csot-agree .csot-card-label{color:#1a4a2e}",
      // 이견 카드
      ".csot-disagree{border-color:#e8c4c4;background:#fdf4f4}",
      ".csot-disagree .csot-card-label{color:#3a1a1a}",
      // 두 컬럼
      ".csot-two{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}",
      "@media(max-width:600px){.csot-two{grid-template-columns:1fr}}",
      // 포인트 리스트
      ".csot-point-list{display:flex;flex-direction:column;gap:7px}",
      ".csot-point-item{display:flex;gap:7px;font-size:12.5px;line-height:1.55}",
      ".csot-point-item::before{content:'·';flex-shrink:0;color:#9e9b95;margin-top:.1em}",
      // 긴장축
      ".csot-tension-card{border-color:#c0ccee;background:#f4f6fd}",
      ".csot-tension-card .csot-card-label{color:#1a2a4a}",
      ".csot-tension-list{display:flex;flex-direction:column;gap:7px}",
      ".csot-tension-item{font-size:12.5px;line-height:1.55;padding-left:10px;border-left:2px solid #c0ccee}",
      // 인사이트
      ".csot-insight-card{border-color:#e8d8a8;background:#fefaf2}",
      ".csot-insight-card .csot-card-label{color:#7a5a10}",
      ".csot-insight-body{font-size:13px;line-height:1.7}",
      // 스틸맨
      ".csot-steel-card{border-color:#d4cce8;background:#f8f6ff}",
      ".csot-steel-card .csot-card-label{color:#3d2e6e}",
      ".csot-steel-body{font-size:13px;line-height:1.7}",
      // 재생 버튼
      ".csot-playbtn{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;",
      "padding:4px 11px;border-radius:6px;border:1px solid #bcc8ea;background:#eef2fb;color:#2a4a8a;",
      "cursor:pointer;margin-bottom:8px;transition:background .15s}",
      ".csot-playbtn:hover{background:#dce6f8}",
      // 래퍼
      ".csot-wrap{display:flex;flex-direction:column;gap:10px}",
    ].join("");
    document.head.appendChild(s);
  }

  function pointItems(arr) {
    return (arr || []).map(function (x) {
      return '<div class="csot-point-item">' + esc(x) + "</div>";
    }).join("");
  }

  function renderSynth() {
    var s = DATA && DATA.synthesis; if (!s) return;
    var price = document.getElementById("clPrice"); if (!price || !price.parentNode) return;
    injectCSS();

    var el = document.getElementById("clSynth");
    if (!el) {
      var h = document.createElement("h2"); h.className = "msec"; h.style.marginTop = "26px";
      h.innerHTML = '관점 지형 <span class="mnote">같고 다름 한눈에 · 토론 없이도 · council.json SoT</span>';
      el = document.createElement("div"); el.id = "clSynth";
      price.parentNode.insertBefore(h, price.nextSibling);
      price.parentNode.insertBefore(el, h.nextSibling);
    }

    // ── 합의·이견 두 컬럼 카드
    var agreeCard = '<div class="csot-card csot-agree"><div class="csot-card-label">합의 · 갈음</div><div class="csot-point-list">' + pointItems(s.converge) + "</div></div>";
    var disagreeCard = '<div class="csot-card csot-disagree"><div class="csot-card-label">이견 · 다름</div><div class="csot-point-list">' + pointItems(s.diverge) + "</div></div>";
    var two = '<div class="csot-two">' + agreeCard + disagreeCard + "</div>";

    // ── 긴장축 카드
    var ten = "";
    if (s.tension && s.tension.length) {
      var tenItems = s.tension.map(function (x) { return '<div class="csot-tension-item">' + esc(x) + "</div>"; }).join("");
      ten = '<div class="csot-card csot-tension-card"><div class="csot-card-label">긴장축 · 대립 렌즈</div><div class="csot-tension-list">' + tenItems + "</div></div>";
    }

    // ── 착장 인사이트 카드
    var ins = s.insight
      ? '<div class="csot-card csot-insight-card"><div class="csot-card-label">착장 · 한 줄 인사이트</div><div class="csot-insight-body">' + esc(s.insight) + "</div></div>"
      : "";

    // ── 스틸맨 반론 카드
    var stl = s.steelman
      ? '<div class="csot-card csot-steel-card"><div class="csot-card-label">스틸맨 반론</div><div class="csot-steel-body">' + esc(s.steelman) + "</div></div>"
      : "";

    // ── ▶ 음성 토론 재생 버튼 (Gemini TTS hifiPlay 연결 · data-sot=1 가드 유지)
    var playBtn = '<button type="button" class="csot-playbtn cl-playbtn" data-sot="1">▶ 음성 토론 재생</button>';

    el.innerHTML = '<div class="cl-rep csot-wrap">' + playBtn + two + ten + ins + stl + "</div>";

    // 버튼 클릭 — council-audio.js(hifiPlay/Gemini TTS) 우선, 폴백은 인라인 브라우저 TTS
    var btn = el.querySelector(".cl-playbtn[data-sot]");
    if (btn) {
      btn.addEventListener("click", function (e) {
        e.stopImmediatePropagation(); // council-audio.js 캡처 리스너 선제 차단
        var d = buildSotD();
        if (!d) return;
        if (window.COUNCIL && window.COUNCIL.playReport) {
          window.COUNCIL.playReport(d);
        }
      });
    }
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
