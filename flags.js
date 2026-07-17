/* flags.js — 투자 캘린더 아젠다(#v-cal .cal-row) 행별 색상 플래그.
   index.html 은 건드리지 않고 worker.js 가 <script defer> 로 주입한다.
   행에 고유 id 가 없으므로 키 = djb2(날짜칩 + 제목텍스트). 날짜/제목 수정 시 해당 플래그는 초기화됨.
   저장: 서버 R2(/api/calflags)가 권위 — 모든 기기 공유. localStorage 는 즉시 페인트·오프라인 캐시. */
(function () {
  "use strict";
  if (window.__calFlags) return;
  window.__calFlags = true;

  var COLORS = ["#f23645", "#2962ff", "#22ab94", "#ff9800", "#9c27b0", "#00bcd4", "#ec407a"];
  var LS_KEY = "tb.calflags";   // 로컬 캐시(즉시 페인트·오프라인 폴백)
  var API = "/api/calflags";    // R2 서버(기기 간 공유·권위)

  var mem = {};
  function lsLoad() { try { var v = localStorage.getItem(LS_KEY); return v ? JSON.parse(v) : {}; } catch (e) { return mem; } }
  function lsSave(o) { mem = o; try { localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch (e) {} }

  var flags = lsLoad();
  var dirty = false;            // 로컬에서 변경이 일어나면 true → 진행 중인 서버 pull 이 덮어쓰지 않게

  function pushToServer() {
    try {
      fetch(API, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(flags) })
        .catch(function () {});
    } catch (e) {}
  }
  function pullFromServer(done) {
    try {
      fetch(API, { headers: { "accept": "application/json" } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!dirty && data && typeof data === "object" && !Array.isArray(data)) {
            flags = data; lsSave(flags); if (done) done();
          }
        })
        .catch(function () {});
    } catch (e) {}
  }

  function hashKey(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return "f" + (h >>> 0).toString(36);
  }

  function rowKey(row) {
    var dc = row.querySelector(".date-chip");
    var ti = row.querySelector(".cal-body .ti");
    var date = dc ? dc.textContent.trim() : "";
    var title = "";
    if (ti) {
      var c = ti.cloneNode(true);
      var drop = c.querySelectorAll(".tk, .mbadge");
      for (var i = 0; i < drop.length; i++) drop[i].remove();
      title = c.textContent.replace(/\s+/g, " ").trim();
    }
    return hashKey(date + "|" + title);
  }

  var FLAG_SVG =
    '<svg viewBox="0 0 16 18" aria-hidden="true">' +
    '<path class="cf-fill" d="M3 2h9l-2 4 2 4H3z"/>' +
    '<path class="cf-stroke" d="M3 1.5v15M3 2h9l-2 4 2 4H3" stroke-linejoin="round" stroke-linecap="round"/>' +
    "</svg>";

  function injectStyle() {
    if (document.getElementById("cf-style")) return;
    var css =
      "#v-cal .cal-row{grid-template-columns:18px 78px 14px 1fr}" +
      "@media(max-width:760px){#v-cal .cal-row{grid-template-columns:16px 70px 12px 1fr}}" +
      "#v-cal .cal-row.cf-on{box-shadow:inset 3px 0 0 var(--cf);background:color-mix(in srgb,var(--cf) 8%,transparent)}" +
      ".cf-flag{display:flex;align-items:flex-start;justify-content:center;padding-top:2px;cursor:pointer;background:none;border:0;margin:0}" +
      ".cf-flag svg{width:14px;height:15px;display:block;transition:.12s}" +
      ".cf-flag .cf-fill{fill:none}" +
      ".cf-flag .cf-stroke{stroke:#c3c8d0;stroke-width:1.6;fill:none;transition:.12s}" +
      "#v-cal .cal-row:hover .cf-flag .cf-stroke{stroke:#9aa0a8}" +
      "#v-cal .cal-row.cf-on .cf-flag .cf-fill{fill:var(--cf)}" +
      "#v-cal .cal-row.cf-on .cf-flag .cf-stroke{stroke:var(--cf)}" +
      ".cf-pop{position:fixed;z-index:9999;background:#fff;border:1px solid #e6e9ee;border-radius:12px;" +
      "box-shadow:0 8px 30px rgba(20,30,50,.16);padding:12px 14px;min-width:184px;" +
      "font-family:'Pretendard',system-ui,-apple-system,sans-serif}" +
      ".cf-pop .cf-h{font-size:13px;font-weight:700;color:#1a1d21;margin-bottom:10px}" +
      ".cf-pop .cf-row{display:flex;gap:8px;margin-bottom:11px}" +
      ".cf-pop .cf-row button{width:21px;height:21px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;transition:.1s}" +
      ".cf-pop .cf-row button:hover{transform:scale(1.12)}" +
      ".cf-pop .cf-row button.cf-sel{box-shadow:0 0 0 2px #fff,0 0 0 4px currentColor}" +
      ".cf-pop .cf-clr{background:none;border:0;cursor:pointer;font:inherit;font-size:12.5px;color:#5b6470;padding:0;" +
      "display:flex;align-items:center;gap:6px}" +
      ".cf-pop .cf-clr:hover{color:#1a1d21}" +
      ".cf-pop .cf-clr svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:1.6}";
    var st = document.createElement("style");
    st.id = "cf-style";
    st.textContent = css;
    document.head.appendChild(st);
  }

  var openPop = null;
  function closePop() { if (openPop) { openPop.remove(); openPop = null; } }

  function applyRow(row) {
    var c = flags[row._cfKey];
    if (c) { row.classList.add("cf-on"); row.style.setProperty("--cf", c); }
    else { row.classList.remove("cf-on"); row.style.removeProperty("--cf"); }
  }
  function applyAll() {
    var rows = document.querySelectorAll("#v-cal .cal-row");
    for (var i = 0; i < rows.length; i++) if (rows[i]._cfKey) applyRow(rows[i]);
  }

  function commit() { dirty = true; lsSave(flags); pushToServer(); }

  function openPicker(btn, row) {
    closePop();
    var key = row._cfKey;
    var cur = flags[key] || null;
    var pop = document.createElement("div");
    pop.className = "cf-pop";
    var html = '<div class="cf-h">플래그 / 해제</div><div class="cf-row">';
    for (var i = 0; i < COLORS.length; i++) {
      var c = COLORS[i];
      html += '<button data-c="' + c + '" style="background:' + c + ';color:' + c + '"' + (c === cur ? ' class="cf-sel"' : "") + "></button>";
    }
    html += "</div>";
    html += '<button class="cf-clr"><svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12" stroke-linecap="round" stroke-linejoin="round"/></svg>전체 플래그 해제</button>';
    pop.innerHTML = html;
    pop.addEventListener("click", function (e) { e.stopPropagation(); });

    var picks = pop.querySelectorAll(".cf-row button");
    for (var j = 0; j < picks.length; j++) {
      picks[j].addEventListener("click", function () {
        var c = this.getAttribute("data-c");
        if (flags[key] === c) delete flags[key]; else flags[key] = c;
        commit(); applyRow(row); closePop();
      });
    }
    pop.querySelector(".cf-clr").addEventListener("click", function () {
      flags = {}; commit(); applyAll(); closePop();
    });

    document.body.appendChild(pop);
    var r = btn.getBoundingClientRect();
    var w = pop.offsetWidth;
    var left = Math.min(r.left, window.innerWidth - w - 10);
    pop.style.left = Math.max(8, left) + "px";
    pop.style.top = (r.bottom + 6) + "px";
    openPop = pop;
  }

  function init() {
    var rows = document.querySelectorAll("#v-cal .cal-row");
    if (!rows.length) return;
    injectStyle();
    for (var i = 0; i < rows.length; i++) {
      (function (row) {
        if (row.querySelector(".cf-flag")) return;
        row._cfKey = rowKey(row);
        var btn = document.createElement("button");
        btn.className = "cf-flag";
        btn.type = "button";
        btn.title = "플래그";
        btn.innerHTML = FLAG_SVG;
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          if (openPop) { closePop(); return; }
          openPicker(btn, row);
        });
        row.insertBefore(btn, row.firstChild);
        applyRow(row);
      })(rows[i]);
    }
    // 캐시로 즉시 페인트한 뒤, 서버(R2) 권위 데이터로 동기화.
    pullFromServer(applyAll);
    document.addEventListener("click", closePop);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePop(); });
    window.addEventListener("scroll", closePop, true);
    window.addEventListener("resize", closePop);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/* ── 04 전문가 원탁: council.json 관점 SoT 배선 로더 (별도 관심사·자가 실행) ──
   worker 미편집 — 이미 주입되는 flags.js 에서 신규 정적 파일 /council-sot.js 를
   동적 로드(Workers Assets 자동 서빙)해 window.COUNCIL 을 council.json 기반
   강화판으로 재할당한다(로드 실패 시 index.html 인라인 COUNCIL 이 폴백). */
(function () {
  if (window.__councilSot) return;
  window.__councilSot = 1;
  var s = document.createElement("script");
  s.src = "/council-sot.js";
  s.defer = true;
  document.head.appendChild(s);
})();
