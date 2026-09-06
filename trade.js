/* trade.js — 한국 반도체 수출 카드를 01 시장 모니터링의 통합 지표 그리드에 주입한다. */
(function () {
  'use strict';
  var MOUNT_ID = 'mkt_trade_semi';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pct(v, d) { return v == null ? '—' : (v > 0 ? '+' : '') + (d == null ? v : v.toFixed(d)) + '%'; }
  function cls(v) { return v == null ? '' : v > 0 ? 'up' : v < 0 ? 'dn' : ''; }
  function num(v) { return v == null ? '—' : v; }

  function spark(vals, up) {
    var pts = vals.filter(function (v) { return v != null; });
    if (pts.length < 2) return '';
    var w = 200, h = 54, pad = 4;
    var mn = Math.min.apply(null, pts), mx = Math.max.apply(null, pts), rng = (mx - mn) || 1;
    var stroke = up ? 'var(--st-hot)' : 'var(--st-accel)';
    var d = pts.map(function (v, i) {
      var x = pad + (w - 2 * pad) * (i / (pts.length - 1));
      var y = h - pad - (h - 2 * pad) * ((v - mn) / rng);
      return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ');
    var lx = w - pad;
    var ly = h - pad - (h - 2 * pad) * ((pts[pts.length - 1] - mn) / rng);
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="2.6" fill="' + stroke + '"/></svg>';
  }
  function lensRow(l1, l2) {
    return '<div class="mkt-lens"><div class="l1">' + l1 + '</div><div class="l2">' + l2 + '</div></div>';
  }

  function semiCard(s, prev, series) {
    var mom = (prev && prev.semi) ? (s.semi / prev.semi - 1) * 100 : null;
    var share = s.exp ? (s.semi / s.exp * 100) : null;
    var accel = (prev && prev.semiYoy != null && s.semiYoy != null) ? s.semiYoy >= prev.semiYoy : true;
    var judge = accel ? '<span class="ok">가속</span>' : '<span class="nt">둔화</span>';
    return '<div class="mkt-nm">반도체 수출</div>' +
      '<div class="mkt-val">' + num(s.semi) + ' <span style="font-size:12px;color:var(--faint)">억달러</span></div>' +
      '<div class="mkt-chg ' + cls(s.semiYoy) + '">' + pct(s.semiYoy, 1) +
      '<span style="font:600 12px var(--mono);margin-left:8px;color:var(--faint)">전월 ' +
      (mom == null ? '—' : '<span style="color:var(--' + (mom >= 0 ? 'st-hot' : 'st-accel') + ')">' + pct(mom, 1) + '</span>') + '</span></div>' +
      lensRow('<b>L3 메모리</b> 수요 선행 ' + judge,
        '반도체 ' + num(s.semi) + '억달러 · 전년비 ' + pct(s.semiYoy, 1) +
        (share != null ? ' · 수출 내 ' + share.toFixed(0) + '%' : '') + ' · MU·삼성·하이닉스 실적 선행') +
      '<div class="mkt-chart">' +
      spark(series.map(function (r) { return r.semi; }), s.semiYoy != null && s.semiYoy >= 0) +
      '</div>' +
      '<div class="mkt-span">' + esc(s.ym || '') + ' · MOTIE 수출입 동향</div>';
  }

  function render(td, host) {
    var ser = td && td.series && td.series.slice().sort(function (a, b) { return a.ym < b.ym ? -1 : 1; });
    if (!ser || !ser.length) {
      host.innerHTML = '<div class="mkt-ph">수집 대기 · 매월 수출입 동향 발표 후 갱신</div>';
      return;
    }
    var last = ser[ser.length - 1], prev = ser.length > 1 ? ser[ser.length - 2] : null;
    host.innerHTML = semiCard(last, prev, ser);
  }

  function mount() {
    if (document.getElementById(MOUNT_ID)) return true;
    var grid = document.getElementById('mktIndicators');
    if (!grid) return false;
    var card = document.createElement('div');
    card.className = 'mkt-card';
    card.id = MOUNT_ID;
    card.setAttribute('data-indicator-key', 'semi-export');
    card.innerHTML = '<div class="mkt-ph">반도체 수출 로딩…</div>';
    grid.appendChild(card);
    fetch('trade.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { render(j, card); })
      .catch(function () { render(null, card); });
    return true;
  }

  function mountGlobalSemi() {
    var id = 'mkt_global_semi_sales';
    if (document.getElementById(id)) return true;
    var grid = document.getElementById('mktIndicators');
    if (!grid) return false;
    var card = document.createElement('div');
    card.className = 'mkt-card'; card.id = id;
    card.setAttribute('data-indicator-key', 'global-semi-sales');
    card.innerHTML = '<div class="mkt-ph">글로벌 반도체 판매 로딩…</div>';
    grid.appendChild(card);
    fetch('semi_sales.json?t=' + Date.now(), { cache: 'no-store' }).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){
      if(!j || !j.latest || !j.series || !j.series.length){ card.innerHTML='<div class="mkt-ph">발표 대기 · SIA/WSTS 월간 판매</div>'; return; }
      var z=j.latest, vals=j.series.map(function(x){return x.sales;});
      card.innerHTML='<div class="mkt-nm">글로벌 반도체 판매</div><div class="mkt-val">$'+z.sales.toFixed(1)+'B</div>'+
        '<div class="mkt-chg up">+'+z.mom.toFixed(1)+'% MoM <span style="font:600 12px var(--mono);margin-left:8px;color:var(--faint)">YoY +'+z.yoy.toFixed(1)+'%</span></div>'+
        lensRow('<b>AI·인프라 수요</b> 확장 지속 <span class="ok">가속</span>','7월 $'+z.sales.toFixed(1)+'B · 6월 수정 $'+z.priorMonthSales.toFixed(1)+'B · 17개월 연속 MoM 증가 · WSTS 3개월 이동평균')+
        '<div class="mkt-chart">'+spark(vals,true)+'</div><div class="mkt-span">'+esc(z.ym)+' · SIA/WSTS · 등록 2026-09-04</div>';
    }).catch(function(){ card.innerHTML='<div class="mkt-ph">SIA/WSTS 데이터 로딩 실패</div>'; });
    return true;
  }

  function boot() {
    mount(); mountGlobalSemi();
    var n = 0, timer = setInterval(function () { var a=mount(), b=mountGlobalSemi(); if ((a && b) || ++n > 40) clearInterval(timer); }, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
