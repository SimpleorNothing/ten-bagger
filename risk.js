/* risk.js — 01 시장 모니터링 「리스크 보드」 자가 마운트 (index.html 무편집)
 *
 * 왜: 01은 지금까지 「무엇이 오르내렸나」(지표·보유·뉴스)만 보여줬다. 「무엇이 이 판을 끝낼 수 있나」를
 *     상시로 못 박아 두는 자리가 없었다 → 리스크 3축(사모 크레딧 · 채권 자경단 · 수출 바통)을
 *     보드로 고정하고, 상태·게이지·점등 조건을 한 화면에서 읽는다.
 * 무엇: risk.json(판단 캡처) + news.json(자동 수집) 키워드 매칭 → 축마다 「최근 반영 기사」 자동 반영.
 *      뉴스 크론(06:12·18:12)이 돌 때마다 별도 작업 없이 보드가 갱신된다.
 * 규율: narrative ≠ numbers — 관측·표시 전용. gamma·judgment·holdings·earnings 어느 것도 바꾸지 않는다.
 *      상태 전환(연기→점등)은 item.trigger 조건 충족 시 risk.json 수기 갱신으로만.
 * 디자인: STYLE_GUIDE §6 레퍼런스 복제 — mkt-grid/mkt-card · 렌즈 2줄(§6-4) · 빈 상태 문구(§6-6).
 *        등락색 = 상승 적(--st-hot) / 하락 청(--st-accel) · 판정색 = ok/wn/nt(§6-4). 신규 :root 토큰 0.
 * 부수: 「보유 종목」 스파크라인 섹션은 이 모듈이 런타임에 제거한다(SimpleorNothing 지시 2026-07-25).
 *      개별 종목 그래프는 01 「종목 뉴스」 블록·05 트래커에 그대로 있다.
 */
(function () {
  'use strict';
  var MOUNT_ID = 'riskBoard';
  var NEWS_DAYS = 45;   // 최근 반영 기사 창(일)
  var NEWS_MAX = 3;     // 축당 표시 건수
  var HIDDEN_KEY = 'am_risk_board_hidden_v1', hiddenCards = [];
  try { hiddenCards = JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]'); if (!Array.isArray(hiddenCards)) hiddenCards = []; } catch (e) { hiddenCards = []; }
  function saveHidden() { try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenCards)); } catch (e) {} }

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
    if (document.getElementById('risk-css')) return;
    var s = document.createElement('style');
    s.id = 'risk-css';
    s.textContent = [
      '#riskLens{background:var(--panel);border:1px solid var(--line);border-radius:3px;padding:11px 14px;margin:0 0 12px}',
      '#riskBoard{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}',
      '#riskBoard .mkt-card{padding:15px 16px 13px;position:relative}',
      '#riskBoard .rk-hd{display:flex;align-items:baseline;gap:7px;flex-wrap:wrap;margin-bottom:6px}',
      '#riskBoard .rk-no{font:700 13px var(--mono);color:var(--faint);flex:0 0 auto}',
      '#riskBoard .rk-st{flex:0 0 auto;font:700 12px var(--mono);letter-spacing:.04em;border-radius:20px;padding:1px 8px;color:var(--onacc)}',
      '#riskBoard .rk-st.wn{background:var(--st-hot)}',
      '#riskBoard .rk-st.nt{background:var(--st-mature)}',
      '#riskBoard .rk-st.ok{background:var(--st-dawn)}',
      '#riskBoard .rk-g{margin:9px 0 0;border-top:1px solid var(--line);padding-top:8px}',
      '#riskBoard .rk-gr{display:flex;align-items:baseline;gap:8px;padding:3px 0}',
      '#riskBoard .rk-gk{flex:1;min-width:0;font-size:14px;color:var(--dim);line-height:1.45}',
      '#riskBoard .rk-gv{flex:0 0 auto;font:700 14px var(--mono);color:var(--txt);font-variant-numeric:tabular-nums}',
      '#riskBoard .rk-gv.up{color:var(--st-hot)}#riskBoard .rk-gv.dn{color:var(--st-accel)}',
      '#riskBoard .rk-gn{font:12px var(--mono);color:var(--faint);line-height:1.45;margin:0 0 3px}',
      '#riskBoard .rk-tr{margin-top:10px;border-top:1px dashed var(--line2);padding-top:8px;font-size:14px;line-height:1.5;color:var(--txt)}',
      '#riskBoard .rk-tr b{font:700 12px var(--mono);color:var(--dim)}',
      '#riskBoard .rk-rd{margin-top:6px;border-left:2px solid var(--line2);padding-left:9px;font-size:14px;line-height:1.5;color:var(--dim)}',
      '#riskBoard .rk-nw{margin-top:10px;border-top:1px solid var(--line);padding-top:6px}',
      '#riskBoard .rk-nwh{font:700 12px var(--mono);letter-spacing:.04em;color:var(--faint);margin-bottom:2px}',
      '#riskBoard .rk-nw .arow{padding:6px 0;border-top:1px solid var(--line);background:transparent}',
      '#riskBoard .rk-nw .arow:first-of-type{border-top:0}',
      '#riskBoard .rk-nw .arow:hover{background:var(--panel2)}',
      '#riskBoard .rk-nw .asum{font-size:14px;font-weight:500}',
      '#riskBoard .rk-src{margin-top:9px;font:12px var(--mono);color:var(--faint);line-height:1.5}',
      '#riskBoard .rk-morebox{margin-top:auto;padding-top:9px}',
      '#riskBoard .rk-more{width:100%;border:0;border-top:1px dashed var(--line2);background:transparent;padding:8px 0 0;text-align:left;font:700 12px var(--mono);color:var(--faint);cursor:help}',
      '#riskBoard .rk-more:focus-visible{outline:2px solid var(--st-accel);outline-offset:3px}',
      '#riskBoard .rk-detail{display:none;position:absolute;z-index:12;left:12px;right:12px;bottom:42px;max-height:min(68vh,460px);overflow:auto;background:var(--panel);border:1px solid var(--line2);border-radius:3px;padding:11px 12px;box-shadow:0 10px 28px rgba(22,36,45,.16)}',
      '#riskBoard .rk-morebox:hover .rk-detail,#riskBoard .rk-morebox:focus-within .rk-detail,#riskBoard .mkt-card.show-detail .rk-detail{display:block}',
      '#riskBoard .rk-del{display:none;position:absolute;z-index:14;top:8px;right:8px;border:1px solid var(--st-hot);border-radius:3px;background:var(--panel);color:var(--st-hot);padding:4px 9px;font:700 12px var(--mono);cursor:pointer}',
      '#riskBoard .mkt-card.show-delete .rk-del{display:block}',
      '@media(max-width:600px){#riskBoard{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(s);
  }

  // 라틴 키워드는 단어 경계로 본다 — 부분 문자열이면 Ares→"shares", PIK→"pikachu" 식 오탐이 난다.
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
    if (!items || !items.length || !keys || !keys.length) return [];
    var ms = keys.map(matcher).filter(Boolean);
    var xs = (xkeys || []).map(matcher).filter(Boolean);   // 같은 글자를 쓰지만 다른 사건(예: 「수출통제」) 배제
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
      return '<div class="rk-nw"><div class="rk-nwh">최근 반영 기사</div>' +
        '<div class="mkt-ph" style="padding:6px 0">최근 ' + NEWS_DAYS + '일 매칭 기사 없음 — 다음 뉴스 크론 대기</div></div>';
    }
    return '<div class="rk-nw"><div class="rk-nwh">최근 반영 기사 · ' + list.length + '건</div>' +
      list.map(function (n) {
        return '<a class="arow" href="' + esc(n.link) + '" target="_blank" rel="noopener">' +
          '<span class="adt">' + esc(md(n.published)) + '</span>' +
          '<span class="atx"><span class="asum">' + esc(n.a || n.title || '') + '</span></span></a>';
      }).join('') + '</div>';
  }

  // 토픽 레이더에서 수집된 관점·기사를 같은 키워드로 연결한다.
  // 이는 확인 대상을 보여 주는 용도이며, 리스크 상태나 게이지를 자동 변경하지 않는다.
  function topicRefs(keys) {
    if (window.TopicRadar && typeof window.TopicRadar.match === 'function') {
      var matched = window.TopicRadar.match(keys, 2).map(function (t) { return t.name || '관련 토픽'; });
      return matched.length ? '<div class="topic-ref"><b>토픽 레이더 연관</b> ' + esc(matched.join(' · ')) + '</div>' : '';
    }
    var topics = (window.TopicRadar && window.TopicRadar.items) || [], out = [];
    keys = (keys || []).map(function (k) { return String(k || '').toLowerCase(); }).filter(Boolean);
    topics.forEach(function (t) {
      var hay = [t.name, t.summary].concat(t.items || []).map(function (x) {
        return typeof x === 'string' ? x : [x && x.title, x && x.a, x && x.w].join(' ');
      }).join(' ').toLowerCase();
      if (keys.some(function (k) { return hay.indexOf(k) >= 0; })) out.push(t.name || '관련 토픽');
    });
    return out.length ? '<div class="topic-ref"><b>토픽 레이더 연관</b> ' + esc(out.slice(0, 2).join(' · ')) + '</div>' : '';
  }

  function card(it, news) {
    var st = stCls(it.state);
    var g = (it.gauge || []).map(function (x) {
      return '<div class="rk-gr"><span class="rk-gk">' + esc(x.k) + '</span>' +
        '<span class="rk-gv ' + dcls(x.d) + '">' + esc(x.v) + '</span></div>' +
        (x.n ? '<div class="rk-gn">' + esc(x.n) + '</div>' : '');
    }).join('');
    var src = (it.srcs || []).map(function (s) { return esc(s.label); }).join(' · ');
    var detail = (it.trigger ? '<div class="rk-tr">' + esc(it.trigger) + '</div>' : '') +
      (it.read ? '<div class="rk-rd">' + esc(it.read) + '</div>' : '') + newsHTML(news) +
      (src ? '<div class="rk-src">근거 · ' + src + '</div>' : '');
    return '<div class="mkt-card" data-board-key="' + esc(it.id || it.no || it.name) + '">' +
      '<button type="button" class="rk-del" aria-label="' + esc(it.name || '리스크') + ' 카드 삭제">삭제</button>' +
      '<div class="rk-hd"><span class="rk-no">' + esc(it.no || '') + '</span>' +
      '<span class="mkt-nm" style="margin:0">' + esc(it.name) + '</span>' +
      '<span class="rk-st ' + st + '">' + esc(it.stateLabel || '') + '</span></div>' +
      '<div class="mkt-lens"><div class="l1"><b>' + esc(it.tag || '') + '</b> ' + esc(it.frame || '') + '</div>' +
      '<div class="l2"><span class="' + st + '">판정</span> ' + esc(it.verdict || '') + '</div></div>' +
      (g ? '<div class="rk-g">' + g + '</div>' : '') +
      topicRefs((it.keys || []).concat([it.name, it.tag, it.frame, it.verdict])) +
      '<div class="rk-morebox"><button type="button" class="rk-more" aria-expanded="false">조건·근거 보기 ↑</button>' +
      '<div class="rk-detail" role="region">' + detail + '</div></div>' +
      '</div>';
  }

  function wireDeletes(host) {
    var cards = Array.prototype.slice.call(host.querySelectorAll('.mkt-card[data-board-key]'));
    function hideDeletes() { cards.forEach(function (c) { c.classList.remove('show-delete'); }); }
    cards.forEach(function (card) {
      var hold=null,press=null,longPress=false,del=card.querySelector('.rk-del');
      function clearHold(){if(hold){clearTimeout(hold);hold=null;}}
      card.addEventListener('pointerdown',function(e){if(e.button!==0||e.target.closest('a,button,.rk-detail'))return;hideDeletes();longPress=false;press={id:e.pointerId,x:e.clientX,y:e.clientY};clearHold();hold=setTimeout(function(){hold=null;longPress=true;card.classList.add('show-delete');},600);});
      card.addEventListener('pointermove',function(e){if(press&&press.id===e.pointerId&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>=4)clearHold();});
      card.addEventListener('pointerup',function(){clearHold();press=null;if(longPress)longPress=false;});
      card.addEventListener('pointercancel',function(){clearHold();press=null;longPress=false;});
      del.addEventListener('pointerdown',function(e){e.stopPropagation();});
      del.addEventListener('click',function(e){e.stopPropagation();var key=card.getAttribute('data-board-key'),name=(card.querySelector('.mkt-nm')||{}).textContent||'리스크 카드';if(!window.confirm('이 카드를 삭제할까요?\n'+name))return;if(hiddenCards.indexOf(key)<0)hiddenCards.push(key);saveHidden();card.remove();cards=cards.filter(function(c){return c!==card;});if(!cards.length)host.innerHTML='<div class="mkt-ph" style="grid-column:1/-1">모든 리스크 카드가 숨김 처리되었습니다</div>';});
    });
    return hideDeletes;
  }

  function wireDetails(host) {
    host.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.rk-more');
      if (!b) return;
      host.querySelectorAll('.mkt-card.show-delete').forEach(function (x) { x.classList.remove('show-delete'); });
      var card = b.closest('.mkt-card'), open = !card.classList.contains('show-detail');
      host.querySelectorAll('.mkt-card.show-detail').forEach(function (x) { x.classList.remove('show-detail'); var q=x.querySelector('.rk-more');if(q)q.setAttribute('aria-expanded','false'); });
      card.classList.toggle('show-detail', open);b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* 보드에서 뽑은 인사이트 2줄 — l1은 상태 집계 자동 파생, l2는 risk.json 해석 한 줄. */
  function lensHTML(risk) {
    var its = risk.items || [];
    var lit = its.filter(function (x) { return x.state === 'wn'; });
    var smo = its.filter(function (x) { return x.state === 'nt'; });
    var okc = its.filter(function (x) { return x.state === 'ok'; });
    var tally = '점등 <span class="wn">' + lit.length + '</span> · 연기 <span class="nt">' + smo.length +
      '</span> · 완화·반전 <span class="ok">' + okc.length + '</span>';
    var who = lit.length
      ? ' — 지금 켜진 축은 <span class="wn">' + esc(lit.map(function (x) { return x.name; }).join(' · ')) + '</span>'
      : ' — 현재 점등 축 없음';
    return '<div class="mkt-lens"><div class="l1"><b>리스크 3축</b><span>' + tally + who + '</span></div>' +
      '<div class="l2">' + esc(risk.insight || '') + '</div></div>';
  }

  function render(risk, news, host) {
    if (!risk || !risk.items || !risk.items.length) {
      host.innerHTML = '<div class="mkt-ph" style="grid-column:1/-1">리스크 축 정의 대기 (risk.json)</div>';
      return;
    }
    var lens = document.getElementById('riskLens');
    if (lens) lens.innerHTML = lensHTML(risk);
    var items = (news && news.items) || [];
    var visible = risk.items.filter(function (it) { return hiddenCards.indexOf(String(it.id || it.no || it.name)) < 0; });
    host.innerHTML = visible.length ? visible.map(function (it) { return card(it, matchNews(items, it.keys, it.xkeys)); }).join('') : '<div class="mkt-ph" style="grid-column:1/-1">모든 리스크 카드가 숨김 처리되었습니다</div>';
    wireDetails(host);
    wireDeletes(host);
  }

  document.addEventListener('am:topic-radar', function () {
    var host = document.getElementById(MOUNT_ID);
    if (host && host._riskData) render(host._riskData[0], host._riskData[1], host);
  });

  /* 「보유 종목」 스파크라인 섹션 제거(h2 + #mktHoldings) — SimpleorNothing 지시 2026-07-25 */
  function dropHoldings() {
    var grid = document.getElementById('mktHoldings');
    if (!grid) return null;
    var h = grid.previousElementSibling;
    var ref = (h && h.tagName === 'H2') ? h : grid;
    var parent = ref.parentNode, mark = document.createComment('holdings-removed');
    parent.insertBefore(mark, ref);
    if (h && h.tagName === 'H2') parent.removeChild(h);
    parent.removeChild(grid);
    return mark;
  }

  function mount() {
    if (document.getElementById(MOUNT_ID)) return true;
    var mark = dropHoldings();
    var ref = mark;
    if (!ref) {
      // 이미 제거된 뒤(재마운트) 또는 스키마 변경 — 「관련 기사」 앞으로 폴백
      var anchor = document.getElementById('mktMacroNews');
      if (!anchor) return false;
      var prevH = anchor.previousElementSibling;
      while (prevH && prevH.tagName !== 'H2') prevH = prevH.previousElementSibling;   // 스트립 div 건너뛰기(lead.js 동일 픽스)
      ref = prevH || anchor;
    }
    css();
    var h = document.createElement('h2');
    h.className = 'msec';
    h.innerHTML = '리스크 보드 <span class="mnote">3축 · 핵심만 표시 · 카드 하단 호버/탭으로 조건·근거</span>';
    var lens = document.createElement('div');
    lens.id = 'riskLens';
    var grid = document.createElement('div');
    grid.className = 'mkt-grid';
    grid.id = MOUNT_ID;
    grid.innerHTML = '<div class="mkt-ph" style="grid-column:1/-1">로딩…</div>';
    var p = ref.parentNode;
    p.insertBefore(h, ref);
    p.insertBefore(lens, ref);
    p.insertBefore(grid, ref);

    var t = Date.now();
    Promise.all([
      fetch('risk.json?t=' + t, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('news.json?t=' + t, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (a) { grid._riskData = a; render(a[0], a[1], grid); });
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
