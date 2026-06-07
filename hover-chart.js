/* ===== 1Y HOVER PRICE CHART (worker.js가 모든 HTML에 주입) =====
   스택 트리의 종목 칩(.chip[data-id])에 마우스를 올리면 1Y 일봉 차트 팝업.
   시계열은 charts.json {series:{id:{t:[epoch day],c:[close]}}} — update-prices 크론이 생성.
   index.html 본문을 수정하지 않기 위해 별도 파일 + worker 주입으로 분리.
   페이지 전역(C·PRICES·PRICES_ASOF·fmtMoney·fmtKST·STAGE_HEX)을 재사용하며, 전부 typeof 가드.
   이벤트는 document 위임 → renderAll 재렌더에도 리바인딩 불필요. 터치 기기는 기존 클릭(드로어) 유지. */
(function () {
  'use strict';
  if (!matchMedia('(hover:hover)').matches) return; // 터치 전용 기기는 기존 탭→드로어 흐름 유지
  if (typeof C === 'undefined') return;             // 잠금 페이지 등 대시보드가 아닌 HTML

  var CHARTS = {}, CHARTS_ASOF = null;
  fetch('./charts.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j) { CHARTS = j.series || {}; CHARTS_ASOF = j.asOf || null; } })
    .catch(function () {});

  var css = document.createElement('style');
  css.textContent = [
    '#pxpop{position:fixed;z-index:240;width:340px;max-width:calc(100vw - 20px);background:var(--panel,#fff);border:1px solid var(--line2,#d3d9df);border-radius:12px;box-shadow:0 14px 34px rgba(22,36,45,.16);padding:14px 16px;display:none}',
    '#pxpop.on{display:block}',
    '#pxpop .pxp-h{display:flex;align-items:center;gap:7px}',
    '#pxpop .pxp-h b{font-size:14px;font-weight:800;letter-spacing:-.01em}',
    '#pxpop .pxp-tk{font-family:var(--mono,monospace);font-size:11px;color:var(--dim,#5c6f7e)}',
    '#pxpop .pxp-stg{margin-left:auto;font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:999px}',
    '#pxpop .pxp-p{margin-top:8px;font-family:var(--mono,monospace);font-size:21px;font-weight:800;letter-spacing:-.01em}',
    '#pxpop .pxp-chg{font-family:var(--mono,monospace);font-size:11.5px;color:var(--dim,#5c6f7e);margin-left:8px;font-weight:600}',
    '#pxpop .pxp-c{margin-top:10px;border-top:1px solid var(--line,#e7eaee);padding-top:10px}',
    '#pxpop .pxp-none{font-size:12px;color:var(--dim,#5c6f7e);padding:26px 0;text-align:center}',
    '#pxpop .pxp-m{margin-top:8px;font-size:10.5px;color:var(--faint,#9aa6b0)}'
  ].join('\n');
  document.head.appendChild(css);
  var pop = document.createElement('div');
  pop.id = 'pxpop';
  document.body.appendChild(pop);

  function money(v, cur) {
    if (typeof fmtMoney === 'function') return fmtMoney(v, cur);
    return (cur === 'KRW' ? '₩' : '$') + Math.round(v).toLocaleString();
  }
  function kst(iso) { return typeof fmtKST === 'function' ? fmtKST(iso) : (iso || '—'); }

  function chartSVG(s) {
    var T = s.t, Cv = s.c, W = 308, H = 128, pl = 36, pr = 4, pt = 6, pb = 18, cw = W - pl - pr, ch = H - pt - pb;
    var mn = Math.min.apply(null, Cv), mx = Math.max.apply(null, Cv);
    var sp = (mx - mn) || 1; mn -= sp * 0.06; mx += sp * 0.06;
    var X = function (i) { return pl + cw * i / (Cv.length - 1); };
    var Y = function (v) { return pt + ch * (1 - (v - mn) / (mx - mn)); };
    var line = 'M' + X(0).toFixed(1) + ' ' + Y(Cv[0]).toFixed(1);
    for (var i = 1; i < Cv.length; i++) line += 'L' + X(i).toFixed(1) + ' ' + Y(Cv[i]).toFixed(1);
    var area = line + 'L' + X(Cv.length - 1).toFixed(1) + ' ' + (pt + ch) + 'L' + pl + ' ' + (pt + ch) + 'Z';
    var grid = '', ylab = '', k, v, y, lab;
    for (k = 0; k < 3; k++) {
      v = mn + (mx - mn) * (0.2 + 0.3 * k); y = Y(v);
      grid += '<line x1="' + pl + '" y1="' + y.toFixed(1) + '" x2="' + (W - pr) + '" y2="' + y.toFixed(1) + '" stroke="var(--line,#e7eaee)" stroke-width="1"/>';
      lab = v >= 10000 ? Math.round(v / 1000) + 'k' : v >= 100 ? Math.round(v) : v.toFixed(1);
      ylab += '<text x="' + (pl - 4) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" font-size="9" fill="var(--dim,#5c6f7e)">' + lab + '</text>';
    }
    var xlab = '';
    for (k = 0; k < 4; k++) {
      var idx = Math.min(Cv.length - 1, Math.round((Cv.length - 1) * (k + 0.5) / 4));
      var d = new Date(T[idx] * 864e5);
      lab = String(d.getUTCFullYear()).slice(2) + '.' + (d.getUTCMonth() + 1);
      xlab += '<text x="' + (pl + cw * (k + 0.5) / 4).toFixed(1) + '" y="' + (H - 5) + '" text-anchor="middle" font-size="9" fill="var(--dim,#5c6f7e)">' + lab + '</text>';
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="pxpg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16242d" stop-opacity=".10"/><stop offset="1" stop-color="#16242d" stop-opacity="0"/></linearGradient></defs>' +
      grid + ylab +
      '<path d="' + area + '" fill="url(#pxpg)"/>' +
      '<path d="' + line + '" fill="none" stroke="var(--txt,#16242d)" stroke-width="1.5"/>' +
      '<circle cx="' + X(Cv.length - 1).toFixed(1) + '" cy="' + Y(Cv[Cv.length - 1]).toFixed(1) + '" r="2.6" fill="var(--txt,#16242d)"/>' +
      xlab + '</svg>';
  }

  function popHTML(co) {
    var q = (typeof PRICES !== 'undefined' && PRICES[co.id]) || null;
    var s = CHARTS[co.id] && CHARTS[co.id].c && CHARTS[co.id].c.length > 1 ? CHARTS[co.id] : null;
    var sc = (typeof STAGE_HEX !== 'undefined' && STAGE_HEX[co.stage]) || '#5c6f7e';
    var px = q && q.price != null ? money(q.price, q.currency) : '—';
    var ytd = q && q.changePct != null ? ('YTD ' + (q.changePct >= 0 ? '▲' : '▼') + Math.abs(Math.round(q.changePct)) + '%') : '';
    var y1 = '';
    if (s) {
      var r1 = (s.c[s.c.length - 1] / s.c[0] - 1) * 100;
      y1 = (ytd ? ' · ' : '') + '1Y ' + (r1 >= 0 ? '▲' : '▼') + Math.abs(Math.round(r1)) + '%';
    }
    var chart = s ? chartSVG(s) : '<div class="pxp-none">1Y 차트 데이터 준비 전 — 다음 시세 크론(06:37 KST) 이후 표시</div>';
    var asof = CHARTS_ASOF || (typeof PRICES_ASOF !== 'undefined' ? PRICES_ASOF : null);
    return '<div class="pxp-h"><b>' + co.name + '</b><span class="pxp-tk">' + co.ticker + '</span>' +
      '<span class="pxp-stg" style="background:' + sc + '22;color:' + sc + '">' + co.stage + '</span></div>' +
      '<div class="pxp-p">' + px + '<span class="pxp-chg">' + ytd + y1 + '</span></div>' +
      '<div class="pxp-c">' + chart + '</div>' +
      '<div class="pxp-m">' + kst(asof) + ' · 일봉 1Y</div>';
  }

  var hideT = null, curId = null;
  function show(chip) {
    var id = chip.dataset.id, co = null;
    for (var i = 0; i < C.length; i++) if (C[i].id === id) { co = C[i]; break; }
    if (!co) return;
    curId = id;
    pop.innerHTML = popHTML(co);
    pop.classList.add('on');
    var r = chip.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    var l = r.left + r.width / 2 - pw / 2;
    l = Math.max(10, Math.min(l, innerWidth - pw - 10));
    var t = r.bottom + 8;
    if (t + ph > innerHeight - 10) t = r.top - ph - 8;
    if (t < 10) t = 10;
    pop.style.left = l + 'px';
    pop.style.top = t + 'px';
  }
  function hide() { pop.classList.remove('on'); curId = null; }

  document.addEventListener('mouseover', function (e) {
    var ch = e.target.closest && e.target.closest('.chip[data-id]');
    if (!ch) return;
    clearTimeout(hideT);
    if (curId !== ch.dataset.id) show(ch);
  });
  document.addEventListener('mouseout', function (e) {
    var ch = e.target.closest && e.target.closest('.chip[data-id]');
    if (!ch) return;
    hideT = setTimeout(hide, 150);
  });
  pop.addEventListener('mouseenter', function () { clearTimeout(hideT); });
  pop.addEventListener('mouseleave', function () { hideT = setTimeout(hide, 150); });
  addEventListener('scroll', hide, { passive: true });
  document.addEventListener('click', hide);
})();
