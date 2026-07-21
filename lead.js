/* lead.js — 01 시장 모니터링 「월간 선행지표」 섹션 자가 마운트 (index.html 무편집)
 *
 * 왜: 알파맵 자동층은 전부 일간 시세(후행·동행)라 「변화를 미리」 보는 축이 없었다.
 *     signals.json.lead(FRED 월간, fetch-signals.mjs 산출)를 01 관련 기사 앞에 카드로 띄운다.
 * 규율: 관측치 표시 전용 — 판단·숫자 파일 무관(narrative≠numbers). 신규 :root 토큰 0.
 * 디자인: STYLE_GUIDE §6 레퍼런스(01 mkt-grid/mkt-card + 렌즈 2줄 + 빈 상태 문구) 복제.
 *        등락색 = 상승 적(--st-hot) / 하락 청(--st-accel).
 */
(function () {
  'use strict';
  var MOUNT_ID = 'mktLead';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pct(v) { return v == null ? '—' : (v > 0 ? '+' : '') + v + '%'; }
  function cls(v) { return v == null ? '' : v > 0 ? 'up' : v < 0 ? 'dn' : ''; }

  // 방향 → 8레이어 함의 한 줄(렌즈 2행: l1=판정 프레임 · l2=라이브 수치→판정)
  function lens(it) {
    var d = it.dir;
    var judge = d === 'up' ? '<span class="ok">확장</span>'
      : d === 'down' ? '<span class="wn">둔화</span>'
        : d === 'flat' ? '<span class="nt">횡보</span>' : '판정 보류';
    var why = d === 'unknown'
      ? '데이터 부족 — 다음 발표 대기'
      : '최근 3개월 평균이 직전 3개월 대비 ' + pct(it.mom3) + ' · 전년동월비 ' + pct(it.yoy);
    return '<div class="mkt-lens"><div class="l1"><b>' + esc(it.layer) + '</b> 3개월 모멘텀 ' + judge +
      '</div><div class="l2">' + why + '</div></div>';
  }

  function card(it) {
    return '<div class="mkt-card">' +
      '<div class="mkt-nm">' + esc(it.name) + '</div>' +
      '<div class="mkt-val">' + (it.v == null ? '—' : it.v) + ' <span style="font-size:12px;color:var(--faint)">' + esc(it.unit || '') + '</span></div>' +
      '<div class="mkt-chg ' + cls(it.mom3) + '">' + pct(it.mom3) +
      '<span class="mkt-dod ' + cls(it.yoy) + '" style="margin-left:8px">' + pct(it.yoy) + '</span></div>' +
      lens(it) +
      '<div style="margin-top:auto;font:600 11px var(--mono);color:var(--faint)">' + esc(it.ym || '') + ' · ' + esc(it.id) + '</div>' +
      '</div>';
  }

  function render(lead, host) {
    if (!lead || !lead.items || !lead.items.length) {
      host.innerHTML = '<div class="mkt-ph">수집 대기 — 다음 신호 크론에서 생성</div>';
      return;
    }
    host.innerHTML = lead.items.map(card).join('');
  }

  function mount() {
    if (document.getElementById(MOUNT_ID)) return true;
    var anchor = document.getElementById('mktMacroNews');
    if (!anchor) return false;
    var h = document.createElement('h2');
    h.className = 'msec';
    h.innerHTML = '월간 선행지표 <span class="mnote">FRED · 3개월 모멘텀 / 전년동월비</span>';
    var grid = document.createElement('div');
    grid.className = 'mkt-grid';
    grid.id = MOUNT_ID;
    grid.innerHTML = '<div class="mkt-ph" style="grid-column:1/-1">로딩…</div>';
    // 「관련 기사」 헤더 앞에 삽입 — 뉴스(서술)보다 위, 지표(수치) 블록 다음
    var prevH = anchor.previousElementSibling;
    var ref = (prevH && prevH.tagName === 'H2') ? prevH : anchor;
    ref.parentNode.insertBefore(h, ref);
    ref.parentNode.insertBefore(grid, ref);

    fetch('signals.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { render(j && j.lead, grid); })
      .catch(function () { render(null, grid); });
    return true;
  }

  function boot() {
    if (mount()) return;
    var n = 0;
    var t = setInterval(function () { if (mount() || ++n > 40) clearInterval(t); }, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
