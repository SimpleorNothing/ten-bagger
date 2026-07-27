/* gates.js — 01 시장 모니터링 「사이클 판별 보드」 자가 마운트 (index.html 무편집)
 *
 * 왜: 리스크 보드는 「무엇이 이 판을 끝낼 수 있나」를 못 박았지만, AI capex 사이클의
 *     '의도된 FCF 마이너스'가 '위험한 마이너스'로 변질되는 순서를 상시 관측하는 자리가 없었다
 *     → 4지표(수주잔고 vs capex · 상각기간 재조정 · 조달 가속·환원 축소 · 모델 레이어 조달)를
 *     보드로 고정하고, 상태·게이지·점등 조건을 한 화면에서 읽는다.
 * 무엇: gates.json(판단 캡처) + news.json(자동 수집) 키워드 매칭 → 지표마다 「최근 반영 기사」 자동 반영.
 *      뉴스 크론(06:12·18:12)이 돌 때마다 별도 작업 없이 보드가 갱신된다.
 * 규율: narrative ≠ numbers — 관측·표시 전용. gamma·judgment·holdings·earnings 어느 것도 바꾸지 않는다.
 *      상태 전환(미점등→황색→점등)은 item.trigger 조건 충족 시 gates.json 수기 갱신으로만.
 * 갱신: 분기 실적 시즌(게이지 수치·bookings·상각 문구·바이백) + 대형 공시(증자·IPO) 때 수기.
 * 디자인: risk.js = STYLE_GUIDE §6 레퍼런스 복제 그대로 계승 — mkt-grid/mkt-card · 렌즈 2줄(§6-4) ·
 *        빈 상태 문구(§6-6). 상태 배지 wn(점등)/nt(황색)/ok(미점등) · 등락색 = 상승 적(--st-hot) /
 *        하락 청(--st-accel). 신규 :root 토큰 0(#gatesBoard 스코프 gt-*).
 * 위치: 리스크 보드(#riskBoard) 바로 다음. risk.js 도 자가 마운트라 보드 출현을 대기(interval)하고,
 *      장기 미출현 시 「관련 기사」(#mktMacroNews) 앞 폴백 — 선행 H2 역행 픽스(lead/risk 동일) 계승.
 */
(function () {
  'use strict';
  var MOUNT_ID = 'gatesBoard';
  var NEWS_DAYS = 45;   // 최근 반영 기사 창(일)
  var NEWS_MAX = 3;     // 지표당 표시 건수

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function dcls(d) { return d === 'up' ? 'up' : d === 'down' || d === 'dn' ? 'dn' : ''; }
  function stCls(s) { return s === 'wn' || s === 'nt' || s === 'ok' ? s : 'nt'; }
  function md(iso) {
    var m = String(iso || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? (+m[2]) + '/' + (+m[3]) : '';
  }

  function css() {
    if (document.getElementById('gates-css')) return;
    var s = document.createElement('style');
    s.id = 'gates-css';
    s.textContent = [
      '#gatesLens{background:var(--panel);border:1px solid var(--line);border-radius:3px;padding:11px 14px;margin:0 0 12px}',
      '#gatesBoard{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}',
      '#gatesBoard .mkt-card{padding:15px 16px 13px}',
      '#gatesBoard .gt-hd{display:flex;align-items:baseline;gap:7px;flex-wrap:wrap;margin-bottom:6px}',
      '#gatesBoard .gt-no{font:700 13px var(--mono);color:var(--faint);flex:0 0 auto}',
      '#gatesBoard .gt-st{flex:0 0 auto;font:700 12px var(--mono);letter-spacing:.04em;border-radius:20px;padding:1px 8px;color:var(--onacc)}',
      '#gatesBoard .gt-st.wn{background:var(--st-hot)}',
      '#gatesBoard .gt-st.nt{background:var(--st-mature)}',
      '#gatesBoard .gt-st.ok{background:var(--st-dawn)}',
      '#gatesBoard .gt-g{margin:9px 0 0;border-top:1px solid var(--line);padding-top:8px}',
      '#gatesBoard .gt-gr{display:flex;align-items:baseline;gap:8px;padding:3px 0}',
      '#gatesBoard .gt-gk{flex:1;min-width:0;font-size:14px;color:var(--dim);line-height:1.45}',
      '#gatesBoard .gt-gv{flex:0 0 auto;font:700 14px var(--mono);color:var(--txt);font-variant-numeric:tabular-nums}',
      '#gatesBoard .gt-gv.up{color:var(--st-hot)}#gatesBoard .gt-gv.dn{color:var(--st-accel)}',
      '#gatesBoard .gt-gn{font:12px var(--mono);color:var(--faint);line-height:1.45;margin:0 0 3px}',
      '#gatesBoard .gt-tr{margin-top:10px;border-top:1px dashed var(--line2);padding-top:8px;font-size:14px;line-height:1.5;color:var(--txt)}',
      '#gatesBoard .gt-tr b{font:700 12px var(--mono);color:var(--dim)}',
      '#gatesBoard .gt-rd{margin-top:6px;border-left:2px solid var(--line2);padding-left:9px;font-size:14px;line-height:1.5;color:var(--dim)}',
      '#gatesBoard .gt-nw{margin-top:10px;border-top:1px solid var(--line);padding-top:6px}',
      '#gatesBoard .gt-nwh{font:700 12px var(--mono);letter-spacing:.04em;color:var(--faint);margin-bottom:2px}',
      '#gatesBoard .gt-nw .arow{padding:6px 0;border-top:1px solid var(--line);background:transparent}',
      '#gatesBoard .gt-nw .arow:first-of-type{border-top:0}',
      '#gatesBoard .gt-nw .arow:hover{background:var(--panel2)}',
      '#gatesBoard .gt-nw .asum{font-size:14px;font-weight:500}',
      '#gatesBoard .gt-src{margin-top:9px;font:12px var(--mono);color:var(--faint);line-height:1.5}',
      '@media(max-width:600px){#gatesBoard{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(s);
  }

  // 라틴 키워드는 단어 경계로 본다 — 부분 문자열이면 FCF→"..." 식 오탐이 난다(risk.js 동일 규칙).
  // 한글은 교착어라 경계가 없으므로 부분 일치를 쓰되, 키워드 자체를 구체적으로 잡아 오탐을 줄인다.
  function matcher(key) {
    var k = String(key).toLowerCase();
    if (!k) return null;
    if (/^[\x20-\x7e]+$/.test(k)) {
      var esc2 = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var re = new RegExp('(^|[^a-z0-9])' + esc2 + '([^a-z0-9]|$)');
      return function (hay) { return re.test(hay); };
    }
    return function (hay) { return hay.indexOf(k) >= 0; };
  }

  function matchNews(items, keys, xkeys) {
    var ms = (keys || []).map(matcher).filter(Boolean);
    var xs = (xkeys || []).map(matcher).filter(Boolean);
    if (!ms.length) return [];
    var cut = Date.now() - NEWS_DAYS * 86400000;
    var seen = {}, out = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || !it.link || seen[it.link]) continue;
      var p = Date.parse(it.published || '');
      if (isFinite(p) && p < cut) continue;
      var hay = ((it.title || '') + ' ' + (it.a || '') + ' ' + (it.w || '') + ' ' + (it.name || '')).toLowerCase();
      var drop = false;
      for (var x = 0; x < xs.length; x++) { if (xs[x](hay)) { drop = true; break; } }
      if (drop) continue;
      for (var k = 0; k < ms.length; k++) {
        if (ms[k](hay)) { seen[it.link] = 1; out.push(it); break; }
      }
    }
    out.sort(function (a, b) { return (Date.parse(b.published || 0) || 0) - (Date.parse(a.published || 0) || 0); });
    return out.slice(0, NEWS_MAX);
  }

  function newsHTML(list) {
    if (!list.length) {
      return '<div class="gt-nw"><div class="gt-nwh">최근 반영 기사</div>' +
        '<div class="mkt-ph" style="padding:6px 0">최근 ' + NEWS_DAYS + '일 매칭 기사 없음 — 다음 뉴스 크론 대기</div></div>';
    }
    return '<div class="gt-nw"><div class="gt-nwh">최근 반영 기사 · ' + list.length + '건</div>' +
      list.map(function (n) {
        return '<a class="arow" href="' + esc(n.link) + '" target="_blank" rel="noopener">' +
          '<span class="adt">' + esc(md(n.published)) + '</span>' +
          '<span class="atx"><span class="asum">' + esc(n.a || n.title || '') + '</span></span></a>';
      }).join('') + '</div>';
  }

  function card(it, news) {
    var st = stCls(it.state);
    var g = (it.gauge || []).map(function (x) {
      return '<div class="gt-gr"><span class="gt-gk">' + esc(x.k) + '</span>' +
        '<span class="gt-gv ' + dcls(x.d) + '">' + esc(x.v) + '</span></div>' +
        (x.n ? '<div class="gt-gn">' + esc(x.n) + '</div>' : '');
    }).join('');
    var src = (it.srcs || []).map(function (s) { return esc(s.label); }).join(' · ');
    return '<div class="mkt-card">' +
      '<div class="gt-hd"><span class="gt-no">' + esc(it.no || '') + '</span>' +
      '<span class="mkt-nm" style="margin:0">' + esc(it.name) + '</span>' +
      '<span class="gt-st ' + st + '">' + esc(it.stateLabel || '') + '</span></div>' +
      '<div class="mkt-lens"><div class="l1"><b>' + esc(it.tag || '') + '</b> ' + esc(it.frame || '') + '</div>' +
      '<div class="l2"><span class="' + st + '">판정</span> ' + esc(it.verdict || '') + '</div></div>' +
      (g ? '<div class="gt-g">' + g + '</div>' : '') +
      (it.trigger ? '<div class="gt-tr">' + esc(it.trigger) + '</div>' : '') +
      (it.read ? '<div class="gt-rd">' + esc(it.read) + '</div>' : '') +
      newsHTML(news) +
      (src ? '<div class="gt-src">근거 · ' + src + '</div>' : '') +
      '</div>';
  }

  /* 보드에서 뽑은 인사이트 2줄 — l1은 상태 집계 자동 파생, l2는 gates.json 해석 한 줄. */
  function lensHTML(gates) {
    var its = gates.items || [];
    var lit = its.filter(function (x) { return x.state === 'wn'; });
    var amb = its.filter(function (x) { return x.state === 'nt'; });
    var okc = its.filter(function (x) { return x.state === 'ok'; });
    var tally = '점등 <span class="wn">' + lit.length + '</span> · 황색 <span class="nt">' + amb.length +
      '</span> · 미점등 <span class="ok">' + okc.length + '</span>';
    var who = lit.length
      ? ' — 지금 켜진 지표는 <span class="wn">' + esc(lit.map(function (x) { return x.name; }).join(' · ')) + '</span>'
      : (amb.length
        ? ' — 황색은 <span class="nt">' + esc(amb.map(function (x) { return x.name; }).join(' · ')) + '</span>'
        : ' — 전 지표 미점등');
    return '<div class="mkt-lens"><div class="l1"><b>capex 4지표</b><span>' + tally + who + '</span></div>' +
      '<div class="l2">' + esc(gates.insight || '') + '</div></div>';
  }

  function render(gates, news, host) {
    if (!gates || !gates.items || !gates.items.length) {
      host.innerHTML = '<div class="mkt-ph" style="grid-column:1/-1">판별 지표 정의 대기 (gates.json)</div>';
      return;
    }
    var lens = document.getElementById('gatesLens');
    if (lens) lens.innerHTML = lensHTML(gates);
    var items = (news && news.items) || [];
    host.innerHTML = gates.items.map(function (it) { return card(it, matchNews(items, it.keys, it.xkeys)); }).join('');
  }

  /* 앵커 — 1순위: 리스크 보드(#riskBoard) 바로 뒤(다음 형제 앞).
   * 폴백(리스크 보드 장기 미출현): 「관련 기사」(#mktMacroNews) 앞 — 선행 H2 역행(lead/risk 동일 픽스). */
  function anchorAfterRisk() {
    var rb = document.getElementById('riskBoard');
    if (!rb) return null;
    return { parent: rb.parentNode, ref: rb.nextSibling };   // nextSibling 이 null 이면 부모 끝에 append
  }
  function anchorFallback() {
    var anchor = document.getElementById('mktMacroNews');
    if (!anchor) return null;
    var prevH = anchor.previousElementSibling;
    while (prevH && prevH.tagName !== 'H2') prevH = prevH.previousElementSibling;   // 스트립 div 건너뛰기
    var ref = prevH || anchor;
    return { parent: ref.parentNode, ref: ref };
  }

  function mount(allowFallback) {
    if (document.getElementById(MOUNT_ID)) return true;
    var a = anchorAfterRisk() || (allowFallback ? anchorFallback() : null);
    if (!a) return false;
    css();
    var h = document.createElement('h2');
    h.className = 'msec';
    h.innerHTML = '사이클 판별 보드 <span class="mnote">AI capex 4지표 · \u2018의도된 FCF 마이너스\u2019가 변질되는 신호 · 관련 기사 자동 반영</span>';
    var lens = document.createElement('div');
    lens.id = 'gatesLens';
    var grid = document.createElement('div');
    grid.className = 'mkt-grid';
    grid.id = MOUNT_ID;
    grid.innerHTML = '<div class="mkt-ph" style="grid-column:1/-1">로딩…</div>';
    a.parent.insertBefore(h, a.ref);
    a.parent.insertBefore(lens, a.ref);
    a.parent.insertBefore(grid, a.ref);

    var t = Date.now();
    Promise.all([
      fetch('gates.json?t=' + t, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('news.json?t=' + t, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (a2) { render(a2[0], a2[1], grid); });
    return true;
  }

  function boot() {
    if (mount(false)) return;
    var n = 0;
    // 처음 6초(24회)는 리스크 보드 출현만 대기, 이후엔 폴백 앵커 허용(총 10초 시도 = risk.js 와 동일 예산)
    var t = setInterval(function () { if (mount(++n > 24) || n > 40) clearInterval(t); }, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
