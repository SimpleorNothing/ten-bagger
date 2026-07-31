/* council-sot.js — 04 전문가 원탁 관점 단일 SoT(council.json) 배선 (소형 인핸서)
   flags.js 가 동적 로드. index.html·worker 무편집.
   - window.COUNCIL(인라인 클로저)은 건드리지 않는다(EXPERTS 비공개).
   - 카드 렌더 후 council.json 값으로 .cl-view/stance/updated 를 패치한다.
     단 「관점 갱신」(/api/council-log KV) 이 있는 전문가는 건드리지 않는다 = 라이브가 파일을 이김.
   - synthesis(수렴/발산/긴장/인사이트/스틸맨)를 「관점 지형」(#clSynth)에 렌더.
   - 토론 이력: 생성된 토론을 localStorage 에 저장·복원, 최신순 정렬, 음성 재생 연결.
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

  // ── 토론 이력 localStorage 키
  var HISTORY_KEY = "csot_debate_history";

  // 이력 로드 (최신순 배열)
  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  // 이력 저장
  function saveHistory(arr) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); } catch (e) {}
  }

  // 토론 항목 추가 (최신순 — 앞에 삽입, 최대 20개 유지)
  function appendHistory(entry) {
    var arr = loadHistory();
    arr.unshift(entry);
    if (arr.length > 20) arr = arr.slice(0, 20);
    saveHistory(arr);
  }

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

  // 이력에서 d 구조 복원 (저장된 항목 직접 사용)
  function buildDFromEntry(entry) {
    if (!entry) return null;
    return {
      diagnosis: entry.diagnosis || "",
      board: entry.board || [],
      consensus: entry.consensus || [],
      tension: entry.tension || [],
      steelman: entry.steelman || ""
    };
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
      // 이력 섹션
      ".csot-hist-wrap{display:flex;flex-direction:column;gap:8px;margin-top:4px}",
      ".csot-hist-item{background:#fff;border:1px solid #e4e2dc;border-radius:9px;padding:11px 13px}",
      ".csot-hist-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}",
      ".csot-hist-num{font-size:10px;font-weight:700;color:#9e9b95;letter-spacing:.06em}",
      ".csot-hist-date{font-size:10px;color:#b8b5ae}",
      ".csot-hist-topic{font-size:12.5px;font-weight:600;color:#252525;margin-bottom:4px;line-height:1.5}",
      ".csot-hist-meta{display:flex;gap:8px;flex-wrap:wrap}",
      ".csot-hist-tag{font-size:10px;padding:2px 7px;border-radius:4px;background:#f0ede7;color:#6e6b65}",
      ".csot-hist-playbtn{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:600;",
      "padding:3px 9px;border-radius:5px;border:1px solid #bcc8ea;background:#eef2fb;color:#2a4a8a;",
      "cursor:pointer;transition:background .15s;margin-top:6px}",
      ".csot-hist-playbtn:hover{background:#dce6f8}",
    ].join("");
    document.head.appendChild(s);
  }

  function pointItems(arr) {
    return (arr || []).map(function (x) {
      return '<div class="csot-point-item">' + esc(x) + "</div>";
    }).join("");
  }

  // 날짜 포맷 (YYYYMMDDHHmmss → 읽기 편한 형태)
  function fmtDate(ts) {
    if (!ts) return "";
    var s = String(ts);
    if (s.length >= 12) {
      return s.slice(0, 4) + "-" + s.slice(4, 6) + "-" + s.slice(6, 8) + " " + s.slice(8, 10) + ":" + s.slice(10, 12);
    }
    return s;
  }

  // 타임스탬프 생성
  function nowTs() {
    var d = new Date();
    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    return "" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }

  // 이력 항목 렌더 (단일)
  function renderHistItem(entry, idx) {
    var num = idx + 1;
    var dateStr = fmtDate(entry.ts);
    var topicText = entry.topic || entry.diagnosis || "(주제 없음)";
    var consensus = entry.consensus || [];
    var tension = entry.tension || [];
    var tags = [];
    if (consensus.length) tags.push("합의 " + consensus.length + "건");
    if (tension.length) tags.push("이견 " + tension.length + "건");
    if (entry.material) tags.push("첨부 반영");
    var tagHtml = tags.map(function (t) { return '<span class="csot-hist-tag">' + esc(t) + "</span>"; }).join("");
    return [
      '<div class="csot-hist-item" data-hist-idx="' + idx + '">',
      '<div class="csot-hist-header">',
      '<span class="csot-hist-num">토론 #' + num + "</span>",
      '<span class="csot-hist-date">' + esc(dateStr) + "</span>",
      "</div>",
      '<div class="csot-hist-topic">' + esc(topicText) + "</div>",
      '<div class="csot-hist-meta">' + tagHtml + "</div>",
      '<button type="button" class="csot-hist-playbtn" data-hist-idx="' + idx + '">▶ 음성 재생</button>',
      "</div>"
    ].join("");
  }

  // 이력 섹션 전체 렌더
  function renderHistSection(container) {
    var arr = loadHistory();
    if (!arr.length) {
      container.innerHTML = '<div style="font-size:12px;color:#9e9b95;padding:8px 0">생성된 토론 이력이 없습니다.</div>';
      return;
    }
    var items = arr.map(function (entry, idx) { return renderHistItem(entry, idx); }).join("");
    container.innerHTML = '<div class="csot-hist-wrap">' + items + "</div>";
    // 음성 재생 버튼 이벤트
    container.querySelectorAll(".csot-hist-playbtn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(btn.getAttribute("data-hist-idx"), 10);
        var arr2 = loadHistory();
        var entry = arr2[idx];
        if (!entry) return;
        var d = buildDFromEntry(entry);
        if (!d) return;
        if (window.COUNCIL && window.COUNCIL.playReport) {
          window.COUNCIL.playReport(d);
        }
      });
    });
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

    // ── 이력 섹션 삽입
    injectHistSection(el);
  }

  // 이력 섹션 (#clSynth 아래에 삽입)
  function injectHistSection(synthEl) {
    var histWrap = document.getElementById("csotHistSection");
    if (!histWrap) {
      var h2 = document.createElement("h2"); h2.className = "msec"; h2.style.marginTop = "22px";
      h2.innerHTML = '토론 이력 <span class="mnote">최신순 · 새로고침 후에도 유지 · 최대 20건</span>';
      histWrap = document.createElement("div"); histWrap.id = "csotHistSection";
      synthEl.parentNode.insertBefore(h2, synthEl.nextSibling);
      synthEl.parentNode.insertBefore(histWrap, h2.nextSibling);
    }
    renderHistSection(histWrap);
  }

  function apply() { if (patching) return; patching = true; try { patchCards(); renderSynth(); } catch (e) {} setTimeout(function () { patching = false; }, 0); }

  // 외부(council-ask.js 또는 index.html 인라인) 에서 토론 생성 완료 시 이력에 저장하도록 훅 노출
  // window.CSOT.saveDebate(d, topic, materialFlag) 호출
  window.CSOT = window.CSOT || {};
  window.CSOT.saveDebate = function (d, topic, hasMaterial) {
    if (!d) return;
    var entry = {
      ts: nowTs(),
      topic: topic || d.diagnosis || "",
      diagnosis: d.diagnosis || "",
      board: d.board || [],
      consensus: d.consensus || [],
      tension: d.tension || [],
      steelman: d.steelman || "",
      material: !!hasMaterial
    };
    appendHistory(entry);
    // 이력 섹션 갱신
    var histWrap = document.getElementById("csotHistSection");
    if (histWrap) renderHistSection(histWrap);
  };

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
