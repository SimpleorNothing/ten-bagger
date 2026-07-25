/* trade.js — 01 시장 모니터링 「한국 수출 (반도체 중심)」 섹션 자가 마운트 (index.html 무편집)
 *
 * 왜: 한국 반도체 수출(월간)은 L3 메모리 수요의 실시간 선행 읽기다. 수출이 계속 폭증 =
 *     DRAM/NAND 롤오버 미도래 → MU γ-닫힘 ③(공급 정상화)의 반증 신호.
 * 위치: 「지표」 그리드 바로 뒤(= 지표와 리스크 보드 사이). #mkt_dxi(지표 마지막 카드)의
 *      부모 .mkt-grid 뒤에 삽입 — risk.js 로드 순서와 무관하게 지표→한국수출→리스크보드 보장.
 * 데이터: trade.json (산업통상부 월간 수출입 동향 · 매월 1일 발표 직후 스케줄 태스크가 1점 append).
 * 규율: 관측치 표시 전용 — 판단·숫자 파일 무관(narrative≠numbers). 신규 :root 토큰 0.
 * 디자인: STYLE_GUIDE §6 레퍼런스(01 mkt-grid/mkt-card + 렌즈 2줄 + 빈 상태 문구) 복제.
 *        등락색 = 상승 적(--st-hot) / 하락 청(--st-accel). 「전일」 프리픽스 강제되는 .mkt-dod 대신
 *        커스텀 span(전월비)을 쓴다. 스파크라인은 기존 .spark(54px)·기능색만.
 */
(function () {
  'use strict';
  var MOUNT_ID = 'mktTrade';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pct(v, d) { return v == null ? '—' : (v > 0 ? '+' : '') + (d == null ? v : v.toFixed(d)) + '%'; }
  function cls(v) { return v == null ? '' : v > 0 ? 'up' : v < 0 ? 'dn' : ''; }
  function num(v) { return v == null ? '—' : v; }

  // 시계열 → 인라인 SVG 스파크라인(자족 · 신규 CSS 0). 색은 방향 기능색.
  function spark(vals, up) {
    var pts = vals.filter(function (v) { return v != null; });
    if (pts.length < 2) return '';
    var w = 200, h = 54, pad = 4;
    var mn = Math.min.apply(null, pts), mx = Math.max.apply(null, pts);
    var rng = (mx - mn) || 1;
    var stroke = up ? 'var(--st-hot)' : 'var(--st-accel)';
    var d = pts.map(function (v, i) {
      var x = pad + (w - 2 * pad) * (i / (pts.length - 1));
      var y = h - pad - (h - 2 * pad) * ((v - mn) / rng);
      return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ');
    var lx = pad + (w - 2 * pad);
    var ly = h - pad - (h - 2 * pad) * ((pts[pts.length - 1] - mn) / rng);
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="2.6" fill="' + stroke + '"/></svg>';
  }

  function lensRow(l1html, l2html) {
    return '<div class="mkt-lens"><div class="l1">' + l1html + '</div><div class="l2">' + l2html + '</div></div>';
  }

  function foot(ym, tag) {
    return '<div style="margin-top:auto;font:600 11px var(--mono);color:var(--faint)">' + esc(ym || '') + ' · ' + esc(tag) + '</div>';
  }

  // 반도체 수출 = 메인 카드(값·전년비 + 전월비 span + 스파크라인 + 렌즈)
  function semiCard(s, prev, series) {
    var mom = (prev && prev.semi) ? (s.semi / prev.semi - 1) * 100 : null;
    var share = (s.exp ? (s.semi / s.exp * 100) : null);
    var yoyUp = s.semiYoy != null && s.semiYoy >= 0;
    var accel = (prev && prev.semiYoy != null && s.semiYoy != null) ? (s.semiYoy >= prev.semiYoy) : true;
    var judge = accel ? '<span class="ok">가속</span>' : '<span class="nt">둔화</span>';
    var l2 = '반도체 ' + num(s.semi) + '억달러 · 전년비 ' + pct(s.semiYoy, 1) +
      (share != null ? ' · 수출의 ' + share.toFixed(0) + '%' : '') +
      ' · <b style="font:inherit">MU γ-닫힘 ③ 반증</b>';
    return '<div class="mkt-card">' +
      '<div class="mkt-nm">반도체 수출</div>' +
      '<div class="mkt-val">' + num(s.semi) + ' <span style="font-size:12px;color:var(--faint)">억달러</span></div>' +
      '<div class="mkt-chg ' + cls(s.semiYoy) + '">' + pct(s.semiYoy, 1) +
      '<span style="font:600 12px var(--mono);margin-left:8px;color:var(--faint)">전월 ' +
      (mom == null ? '—' : '<span style="color:var(--' + (mom >= 0 ? 'st-hot' : 'st-accel') + ')">' + pct(mom, 1) + '</span>') + '</span></div>' +
      spark(series.map(function (r) { return r.semi; }), yoyUp) +
      lensRow('<b>L3 메모리</b> 수요 선행 ' + judge, l2) +
      foot(s.ym, 'MOTIE 수출입 동향') +
      '</div>';
  }

  function expCard(s, prev) {
    var mom = (prev && prev.exp) ? (s.exp / prev.exp - 1) * 100 : null;
    return '<div class="mkt-card">' +
      '<div class="mkt-nm">총수출</div>' +
      '<div class="mkt-val">' + num(s.exp) + ' <span style="font-size:12px;color:var(--faint)">억달러</span></div>' +
      '<div class="mkt-chg ' + cls(s.expYoy) + '">' + pct(s.expYoy, 1) +
      '<span style="font:600 12px var(--mono);margin-left:8px;color:var(--faint)">전월 ' +
      (mom == null ? '—' : '<span style="color:var(--' + (mom >= 0 ? 'st-hot' : 'st-accel') + ')">' + pct(mom, 1) + '</span>') + '</span></div>' +
      lensRow('<b>매크로</b> 대외수요 배경', '월 ' + num(s.exp) + '억달러 · 전년비 ' + pct(s.expYoy, 1) + ' — 한국 대외 수요의 총량 시계') +
      foot(s.ym, '전체 수출') +
      '</div>';
  }

  function balCard(s, prev) {
    var d = (prev && prev.bal != null && s.bal != null) ? (s.bal - prev.bal) : null;
    var pos = s.bal != null && s.bal >= 0;
    return '<div class="mkt-card">' +
      '<div class="mkt-nm">무역수지</div>' +
      '<div class="mkt-val ' + (pos ? 'up' : 'dn') + '">' + (s.bal == null ? '—' : (pos ? '+' : '') + s.bal) +
      ' <span style="font-size:12px;color:var(--faint)">억달러</span></div>' +
      '<div class="mkt-chg">' + (pos ? '<span class="ok" style="color:var(--st-dawn)">흑자</span>' : '<span class="wn" style="color:var(--st-hot)">적자</span>') +
      '<span style="font:600 12px var(--mono);margin-left:8px;color:var(--faint)">전월 ' +
      (d == null ? '—' : '<span style="color:var(--' + (d >= 0 ? 'st-dawn' : 'st-hot') + ')">' + (d >= 0 ? '+' : '') + d.toFixed(1) + '억</span>') + '</span></div>' +
      lensRow('<b>매크로</b> 대외 균형', (pos ? '흑자 ' : '적자 ') + (s.bal == null ? '—' : Math.abs(s.bal)) + '억달러 — 수출>수입 지속 여부') +
      foot(s.ym, '수출−수입') +
      '</div>';
  }

  function render(td, host) {
    var ser = td && td.series && td.series.slice().sort(function (a, b) { return a.ym < b.ym ? -1 : 1; });
    if (!ser || !ser.length) {
      host.innerHTML = '<div class="mkt-ph" style="grid-column:1/-1">수집 대기 — 매월 1일 수출입 동향 발표 후 갱신</div>';
      return;
    }
    var last = ser[ser.length - 1], prev = ser.length > 1 ? ser[ser.length - 2] : null;
    host.innerHTML = semiCard(last, prev, ser) + expCard(last, prev) + balCard(last, prev);
  }

  // 「지표」 그리드 = #mkt_dxi(지표 마지막 카드)를 품은 .mkt-grid.
  function indicatorGrid() {
    var dxi = document.getElementById('mkt_dxi');
    if (!dxi) return null;
    if (dxi.closest) return dxi.closest('.mkt-grid');
    var p = dxi.parentNode;
    return (p && p.classList && p.classList.contains('mkt-grid')) ? p : null;
  }

  function mount() {
    if (document.getElementById(MOUNT_ID)) return true;
    var indGrid = indicatorGrid();
    var macro = document.getElementById('mktMacroNews');
    if (!indGrid && !macro) return false;

    var h = document.createElement('h2');
    h.className = 'msec';
    h.innerHTML = '한국 수출 <span class="mnote">산업통상부 수출입 동향 · 월간 · 반도체 중심 / 전년동월비</span>';
    var grid = document.createElement('div');
    grid.className = 'mkt-grid';
    grid.id = MOUNT_ID;
    grid.innerHTML = '<div class="mkt-ph" style="grid-column:1/-1">로딩…</div>';

    if (indGrid) {
      // 「지표」 그리드 바로 뒤 = 지표와 리스크 보드 사이(risk.js 로드 순서 무관)
      indGrid.parentNode.insertBefore(h, indGrid.nextSibling);
      h.parentNode.insertBefore(grid, h.nextSibling);
    } else {
      // 폴백: 「관련 기사」 헤더 앞(뉴스보다 위)
      var prevH = macro.previousElementSibling;
      var ref = (prevH && prevH.tagName === 'H2') ? prevH : macro;
      ref.parentNode.insertBefore(h, ref);
      ref.parentNode.insertBefore(grid, ref);
    }

    fetch('trade.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { render(j, grid); })
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
