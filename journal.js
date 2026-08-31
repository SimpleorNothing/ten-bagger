/* ===== 08 투자일지 (v-journal) — 판단 시간축 기록 + 저장 시점 스냅샷 =====
 * 07 메모(무구조 캡처)·02 관점(외부 소스發 논제)·05 결정 보드(실제 체결)와 별개 층 —
 * SimpleorNothing 본인의 판단(관찰/가설/결정예고/회고)을 시간순으로 남기고,
 * 저장 시점 γ·stage·가격·매크로 게이트를 얼려 나중에 대조한다.
 * narrative≠numbers — 이 모듈은 gamma/holdings/signals를 읽기만 하며 그 값을 바꾸지 않는다.
 * index.html·pantone.css·insight.css 무편집(risk.js/brief.js 자가 마운트 패턴).
 * 신규 :root 토큰 0 — 전역 토큰 + .vhead/.vkick/.vtitle/.vsub/.mkt-card/.mkt-lens 재사용.
 */
(function () {
  var API = '/api/journal';
  var CACHE_KEY = 'am_journal_v1';
  var TYPES = ['관찰', '가설', '결정예고', '회고'];
  var LAYERS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8'];
  var $ = function (id) { return document.getElementById(id); };
  var entries = [];
  var filterType = '전체';
  var putTimer = null;

  var CSS = ''
    + '#v-journal h2.msec{font-size:20px;font-weight:700;letter-spacing:-.3px;margin:26px 0 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}'
    + '#v-journal .mnote{font:12px var(--mono);color:var(--faint);letter-spacing:.04em}'
    + '#v-journal .jr-row{display:flex;gap:22px;flex-wrap:wrap}'
    + '#v-journal .jr-col{flex:1 1 320px;min-width:0}'
    + '#v-journal .jr-field{margin-bottom:16px}'
    + '#v-journal .jr-label{display:block;font:600 12px var(--mono);color:var(--dim);letter-spacing:.02em;margin-bottom:7px}'
    + '#v-journal .jr-seg{display:flex;gap:6px;flex-wrap:wrap}'
    + '#v-journal .jr-seg button{font:600 14px var(--sans);color:var(--txt);background:var(--panel2);border:1px solid var(--line2);border-radius:3px;padding:8px 14px;cursor:pointer}'
    + '#v-journal .jr-seg button.on{background:var(--dawn);border-color:var(--dawn);color:var(--onacc)}'
    + '#v-journal .jr-chip{font:600 12px var(--mono);color:var(--dim);background:var(--panel2);border:1px solid var(--line2);border-radius:20px;padding:5px 12px;cursor:pointer;user-select:none;display:inline-block}'
    + '#v-journal .jr-chip.on{background:var(--panel);border:2px solid var(--dawn);color:var(--dawn);padding:4px 11px;font-weight:700}'
    + '#v-journal .jr-input,#v-journal .jr-ta{width:100%;font:14px var(--sans);color:var(--txt);background:var(--panel2);border:1px solid var(--line2);border-radius:3px;padding:9px 11px}'
    + '#v-journal .jr-ta{min-height:110px;resize:vertical;line-height:1.55}'
    + '#v-journal .jr-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}'
    + '#v-journal .jr-tag{font:700 12px var(--mono);color:var(--dawn);background:var(--panel);border:1px solid var(--dawn);border-radius:20px;padding:4px 8px 4px 12px;display:inline-flex;align-items:center;gap:6px}'
    + '#v-journal .jr-tag b{cursor:pointer;font-weight:400;color:var(--faint)}'
    + '#v-journal .jr-range-row{display:flex;align-items:center;gap:12px;max-width:320px}'
    + '#v-journal .jr-range-row input[type=range]{flex:1}'
    + '#v-journal .jr-range-val{font:700 15px var(--mono);color:var(--txt);min-width:34px;text-align:right;font-variant-numeric:tabular-nums}'
    + '#v-journal .jr-snap-toggle{display:flex;align-items:center;gap:8px;font:600 13px var(--sans);color:var(--dim);margin:4px 0 0}'
    + '#v-journal .jr-snap-toggle input{width:15px;height:15px}'
    + '#v-journal .jr-save{margin-top:6px;font:700 14px var(--sans);color:var(--onacc);background:var(--dawn);border:none;border-radius:3px;padding:11px 20px;cursor:pointer}'
    + '#v-journal .jr-msg{font:12px var(--mono);color:var(--faint);margin-left:10px}'
    + '#v-journal .jr-filters{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:12px}'
    + '#v-journal .jr-list{display:flex;flex-direction:column;gap:12px}'
    + '#v-journal .jr-entry{position:relative}'
    + '#v-journal .jr-eh{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}'
    + '#v-journal .jr-date{font:12px var(--mono);color:var(--faint)}'
    + '#v-journal .jr-type{font:700 11px var(--mono);color:var(--dim);background:var(--panel2);border:1px solid var(--line);border-radius:20px;padding:2px 9px}'
    + '#v-journal .jr-lb{font:700 11px var(--mono);color:var(--dim);background:var(--panel2);border-radius:3px;padding:2px 6px}'
    + '#v-journal .jr-tk{font:700 11px var(--mono);color:var(--dawn)}'
    + '#v-journal .jr-body{font-size:14px;line-height:1.6;color:var(--txt);margin:0 0 4px;white-space:pre-wrap}'
    + '#v-journal .jr-compare{margin-top:10px}'
    + '#v-journal .jr-cmp-btn{font:600 12px var(--sans);color:var(--dawn);background:none;border:1px solid var(--dawn);border-radius:3px;padding:5px 10px;cursor:pointer}'
    + '#v-journal .jr-cmp-box{display:none;margin-top:10px;padding-top:10px;border-top:1px dashed var(--line2);font-size:13px;color:var(--dim)}'
    + '#v-journal .jr-cmp-box.show{display:block}'
    + '#v-journal .jr-cmp-box .up{color:var(--st-hot);font-weight:700}'
    + '#v-journal .jr-cmp-box .dn{color:var(--st-accel);font-weight:700}'
    + '#v-journal .jr-conv{font:12px var(--mono);color:var(--faint);margin-top:8px}'
    + '#v-journal .jr-ph{text-align:center;font:12px var(--mono);color:var(--faint);padding:20px 0}'
    + '#v-journal .jr-del{position:absolute;top:12px;right:12px;font:600 11px var(--mono);color:var(--st-hot);background:var(--panel);border:1px solid var(--st-hot);border-radius:3px;padding:3px 8px;cursor:pointer;display:none}'
    + '#v-journal .jr-entry.show-del .jr-del{display:block}'
    + '@media(max-width:700px){#v-journal .jr-row{flex-direction:column;gap:0}}';

  var SECTION = ''
    + '<div class="vhead">'
    + '<div class="vkick">Journal · 투자일지</div>'
    + '<h1 class="vtitle">판단의 <em>궤적</em>을 남긴다</h1>'
    + '<p class="vsub">관찰·가설·결정예고·회고를 저장 시점 스냅샷(γ·stage·가격·매크로 게이트)과 함께 남긴다 — 07 메모·02 관점·05 결정 보드와 별개로, 판단 자체를 감사하는 층.</p>'
    + '</div>'
    + '<h2 class="msec">새 기록 <span class="mnote">유형·레이어·티커·확신도 · 저장 시 스냅샷 자동첨부</span></h2>'
    + '<div class="mkt-card" id="jrComposer" style="max-width:none">'
    + '<div class="jr-row">'
    + '<div class="jr-col">'
    + '<div class="jr-field"><label class="jr-label">유형</label><div class="jr-seg" id="jrSegType">'
    + TYPES.map(function (t, i) { return '<button data-v="' + t + '"' + (i === 0 ? ' class="on"' : '') + '>' + t + '</button>'; }).join('')
    + '</div></div>'
    + '<div class="jr-field"><label class="jr-label">관련 레이어</label><div class="jr-chips" id="jrChipLayers">'
    + LAYERS.map(function (l) { return '<span class="jr-chip" data-v="' + l + '">' + l + '</span>'; }).join('')
    + '</div></div>'
    + '<div class="jr-field"><label class="jr-label">관련 티커</label>'
    + '<input class="jr-input" id="jrTkInput" placeholder="티커 입력 후 Enter (예: MU)">'
    + '<div class="jr-tags" id="jrTkTags"></div></div>'
    + '</div>'
    + '<div class="jr-col">'
    + '<div class="jr-field"><label class="jr-label">본문</label>'
    + '<textarea class="jr-ta" id="jrBody" placeholder="지금 이 판단을 왜 하는지 남긴다 — 근거·전제·언제 틀렸다고 볼지"></textarea></div>'
    + '<div class="jr-field"><label class="jr-label">확신도</label><div class="jr-range-row">'
    + '<input type="range" min="1" max="5" step="1" value="3" id="jrConv"><span class="jr-range-val" id="jrConvVal">3/5</span>'
    + '</div></div>'
    + '<label class="jr-snap-toggle"><input type="checkbox" id="jrSnapToggle" checked> 기록 시점 스냅샷 포함(γ·stage·가격·매크로 게이트)</label>'
    + '<div class="mkt-lens" id="jrSnapPreview"><div class="l1"><b>스냅샷</b>티커 입력 시 미리보기</div><div class="l2">티커를 입력하면 실시간 γ·stage·가격을 여기에 표시한다.</div></div>'
    + '</div>'
    + '</div>'
    + '<button class="jr-save" id="jrSave">기록 저장</button><span class="jr-msg" id="jrMsg"></span>'
    + '</div>'
    + '<h2 class="msec">타임라인 <span class="mnote">최신순 · 유형 필터</span></h2>'
    + '<div class="jr-filters" id="jrFilters">'
    + ['전체'].concat(TYPES).map(function (t, i) { return '<span class="jr-chip' + (i === 0 ? ' on' : '') + '" data-f="' + t + '">' + t + '</span>'; }).join('')
    + '</div>'
    + '<div class="jr-list" id="jrList"></div>';

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmtDate(ts) { var d = new Date(ts); var p = function (n) { return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function num(v) { return (v == null || isNaN(v)) ? null : v; }
  function pctFmt(v) { return v == null ? '—' : (v > 0 ? '+' : '') + v + '%'; }

  function evalMacro(sig) {
    if (typeof window.macroEval === 'function') {
      try { return window.macroEval(sig); } catch (e) { return null; }
    }
    return null;
  }

  function fetchLiveJson(path) {
    return fetch(path, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }

  function fetchSnapshot(tickers) {
    return Promise.all([fetchLiveJson('/gamma.json'), fetchLiveJson('/holdings.json'), fetchLiveJson('/signals.json')])
      .then(function (r) {
        var g = r[0], h = r[1], s = r[2];
        var tk = (tickers && tickers[0]) ? String(tickers[0]).toUpperCase() : null;
        var gi = (tk && g && g.gamma) ? g.gamma[tk] : null;
        var hd = (tk && h && Array.isArray(h.detail)) ? h.detail.filter(function (d) { return String(d.ticker || '').toUpperCase() === tk; })[0] : null;
        var avg = (tk && h && h.avg) ? h.avg[tk.toLowerCase()] : null;
        var mac = s ? evalMacro(s) : null;
        var avgDiff = (gi && gi.price != null && avg) ? Math.round((gi.price / avg - 1) * 1000) / 10 : null;
        return {
          asOf: (g && g.asOf) || null, ticker: tk,
          g: gi ? gi.g : null, stage: gi ? gi.stage : null,
          price: gi ? num(gi.price) : null, target: gi ? num(gi.target) : null, pct: gi ? num(gi.pct) : null,
          layer: hd ? hd.layer : null, weight: hd ? num(hd.w) : null,
          avgCost: avg || null, avgDiffPct: avgDiff,
          macroGrade: mac ? mac.grade : null, vix: s ? num(s.vix) : null, fg: s ? num(s.fearGreed) : null, dd: s ? num(s.nasdaqDrawdownPct) : null
        };
      });
  }

  function snapLens(snap) {
    if (!snap) return '<div class="l1"><b>스냅샷</b>수집 실패</div><div class="l2">gamma·holdings·signals 응답 없음 → 스냅샷 생략(narrative≠numbers, 원본 무변)</div>';
    if (snap.ticker && snap.g == null && snap.stage == null) {
      return '<div class="l1"><b>스냅샷</b>' + esc(snap.ticker) + '</div><div class="l2">gamma.json에 없는 티커 — 매크로만: VIX ' + (snap.vix == null ? '—' : snap.vix) + ' · F&amp;G ' + (snap.fg == null ? '—' : snap.fg) + ' · 나스닥 DD ' + (snap.dd == null ? '—' : snap.dd + '%') + ' · 게이트 ' + (snap.macroGrade == null ? '—' : snap.macroGrade) + '/3</div>';
    }
    if (!snap.ticker) {
      return '<div class="l1"><b>스냅샷</b>매크로만</div><div class="l2">VIX ' + (snap.vix == null ? '—' : snap.vix) + ' · F&amp;G ' + (snap.fg == null ? '—' : snap.fg) + ' · 나스닥 DD ' + (snap.dd == null ? '—' : snap.dd + '%') + ' · 매크로 게이트 ' + (snap.macroGrade == null ? '—' : snap.macroGrade) + '/3</div>';
    }
    var l1 = '<div class="l1"><b>스냅샷</b>' + esc(snap.ticker) + (snap.layer ? ' · ' + esc(snap.layer) : '') + '</div>';
    var l2 = '<div class="l2">γ ' + esc(snap.g || '—') + ' · ' + esc(snap.stage || '—')
      + (snap.price != null ? ' · ' + snap.price.toLocaleString() : '')
      + (snap.avgDiffPct != null ? '(평단 대비 ' + pctFmt(snap.avgDiffPct) + ')' : '')
      + ' · 매크로 게이트 ' + (snap.macroGrade == null ? '—' : snap.macroGrade) + '/3</div>';
    return l1 + l2;
  }

  function cacheGet() { try { var v = localStorage.getItem(CACHE_KEY); var a = v ? JSON.parse(v) : []; return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function cacheSet() { try { localStorage.setItem(CACHE_KEY, JSON.stringify(entries)); } catch (e) { } }

  function setMsg(t) { var m = $('jrMsg'); if (m) { m.textContent = t; if (t) setTimeout(function () { if (m.textContent === t) m.textContent = ''; }, 2400); } }

  function persist() {
    cacheSet();
    clearTimeout(putTimer);
    putTimer = setTimeout(function () {
      fetch(API, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entries) })
        .then(function (r) { setMsg(r.ok ? '저장됨' : '오프라인 — 로컬에만 저장됨'); })
        .catch(function () { setMsg('오프라인 — 로컬에만 저장됨'); });
    }, 180);
  }

  function loadEntries() {
    entries = cacheGet();
    renderList();
    fetch(API, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (a) {
      if (Array.isArray(a)) { entries = a; cacheSet(); renderList(); }
    }).catch(function () { });
  }

  function entryRow(e) {
    var layers = (e.layers || []).map(function (l) { return '<span class="jr-lb">' + esc(l) + '</span>'; }).join('');
    var tickers = (e.tickers || []).map(function (t) { return '<span class="jr-tk">' + esc(t) + '</span>'; }).join(' ');
    var lens = e.snap ? '<div class="mkt-lens">' + snapLens(e.snap) + '</div>' : '';
    var cmp = e.tickers && e.tickers.length
      ? '<div class="jr-compare"><button class="jr-cmp-btn" data-cmp="' + esc(e.id) + '">지금과 비교</button><div class="jr-cmp-box" id="jrCmp-' + esc(e.id) + '"></div></div>'
      : '';
    return '<div class="jr-entry mkt-card" data-id="' + esc(e.id) + '" data-type="' + esc(e.type) + '" style="max-width:none">'
      + '<button class="jr-del" data-del="' + esc(e.id) + '">삭제</button>'
      + '<div class="jr-eh"><span class="jr-date">' + esc(fmtDate(e.ts)) + '</span><span class="jr-type">' + esc(e.type) + '</span>' + layers + ' ' + tickers + '</div>'
      + '<p class="jr-body">' + esc(e.body) + '</p>'
      + lens + cmp
      + '<div class="jr-conv">당시 확신도 ' + esc(e.conviction) + '/5</div>'
      + '</div>';
  }

  function renderList() {
    var list = $('jrList'); if (!list) return;
    var filtered = entries.filter(function (e) { return filterType === '전체' || e.type === filterType; });
    if (!filtered.length) {
      list.innerHTML = '<div class="jr-ph">' + (entries.length ? '이 유형의 기록 없음' : '아직 기록 없음 — 첫 판단을 남겨보세요') + '</div>';
      return;
    }
    list.innerHTML = filtered.slice().sort(function (a, b) { return b.ts - a.ts; }).map(entryRow).join('');
  }

  function longPressDelete(container) {
    var timer = null, moved = false, sx = 0, sy = 0;
    container.addEventListener('pointerdown', function (e) {
      var entry = e.target.closest ? e.target.closest('.jr-entry') : null; if (!entry) return;
      if (e.target.closest('[data-del]') || e.target.closest('[data-cmp]')) return;
      moved = false; sx = e.clientX; sy = e.clientY;
      timer = setTimeout(function () { if (!moved) entry.classList.add('show-del'); }, 600);
    });
    container.addEventListener('pointermove', function (e) {
      if (Math.abs(e.clientX - sx) > 4 || Math.abs(e.clientY - sy) > 4) { moved = true; clearTimeout(timer); }
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { container.addEventListener(ev, function () { clearTimeout(timer); }); });
    container.addEventListener('click', function (e) {
      var del = e.target.closest('[data-del]');
      if (del) {
        var id = del.getAttribute('data-del');
        entries = entries.filter(function (x) { return x.id !== id; });
        cacheSet(); persist(); renderList();
        return;
      }
      var cmpBtn = e.target.closest('[data-cmp]');
      if (cmpBtn) {
        var eid = cmpBtn.getAttribute('data-cmp');
        var box = $('jrCmp-' + eid);
        if (box) {
          box.classList.toggle('show');
          if (box.classList.contains('show') && !box.__loaded) {
            box.__loaded = true; box.textContent = '불러오는 중…';
            var entry = entries.filter(function (x) { return x.id === eid; })[0];
            if (entry && entry.tickers && entry.tickers.length) {
              fetchSnapshot(entry.tickers).then(function (cur) {
                box.innerHTML = renderCompare(entry.snap, cur);
              });
            } else { box.textContent = '비교할 티커 없음'; }
          }
        }
        return;
      }
      if (!e.target.closest('.jr-entry')) return;
      Array.prototype.forEach.call(container.querySelectorAll('.jr-entry.show-del'), function (x) {
        if (x !== e.target.closest('.jr-entry')) x.classList.remove('show-del');
      });
    });
  }

  function renderCompare(then, now) {
    if (!then || !now) return '스냅샷 비교 불가(원본 미수집)';
    function diffSpan(a, b, unit) {
      if (a == null || b == null) return '';
      var d = Math.round((b - a) * 100) / 100;
      if (d === 0) return '(변화 없음)';
      var cls = d > 0 ? 'up' : 'dn';
      return '(<span class="' + cls + '">' + (d > 0 ? '+' : '') + d + (unit || '') + '</span>)';
    }
    var parts = [];
    if (now.price != null) parts.push('가격 ' + now.price.toLocaleString() + ' ' + diffSpan(then.price, now.price));
    if (now.g != null) parts.push('γ ' + esc(now.g) + (then.g !== now.g ? '(당시 ' + esc(then.g || '—') + ')' : ''));
    if (now.stage != null) parts.push('stage ' + esc(now.stage) + (then.stage !== now.stage ? '(당시 ' + esc(then.stage || '—') + ')' : ''));
    if (now.macroGrade != null) parts.push('매크로 게이트 ' + now.macroGrade + '/3 ' + diffSpan(then.macroGrade, now.macroGrade, ''));
    return parts.join(' · ') || '비교 데이터 없음';
  }

  function bindComposer() {
    var segType = $('jrSegType');
    segType.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      Array.prototype.forEach.call(segType.querySelectorAll('button'), function (x) { x.classList.remove('on'); });
      b.classList.add('on');
    });
    $('jrChipLayers').addEventListener('click', function (e) {
      var c = e.target.closest('.jr-chip'); if (!c) return;
      c.classList.toggle('on');
    });
    var tkInput = $('jrTkInput');
    tkInput.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || !tkInput.value.trim()) return;
      e.preventDefault();
      var v = tkInput.value.trim().toUpperCase();
      var tags = $('jrTkTags');
      if (!Array.prototype.some.call(tags.children, function (t) { return t.textContent.indexOf(v) === 0; })) {
        var tag = document.createElement('span'); tag.className = 'jr-tag';
        tag.innerHTML = esc(v) + '<b data-x="' + esc(v) + '">×</b>';
        tags.appendChild(tag);
      }
      tkInput.value = '';
      refreshSnapPreview();
    });
    $('jrTkTags').addEventListener('click', function (e) {
      if (e.target.tagName === 'B') { e.target.closest('.jr-tag').remove(); refreshSnapPreview(); }
    });
    $('jrConv').addEventListener('input', function () { $('jrConvVal').textContent = this.value + '/5'; });
    $('jrSnapToggle').addEventListener('change', function () { $('jrSnapPreview').style.display = this.checked ? '' : 'none'; });
    $('jrSave').addEventListener('click', onSave);
    $('jrFilters').addEventListener('click', function (e) {
      var c = e.target.closest('.jr-chip'); if (!c) return;
      Array.prototype.forEach.call($('jrFilters').querySelectorAll('.jr-chip'), function (x) { x.classList.remove('on'); });
      c.classList.add('on');
      filterType = c.getAttribute('data-f');
      renderList();
    });
    longPressDelete($('jrList'));
  }

  function currentTickers() {
    return Array.prototype.map.call($('jrTkTags').children, function (t) { return t.firstChild.textContent; });
  }
  function currentLayers() {
    return Array.prototype.map.call($('jrChipLayers').querySelectorAll('.jr-chip.on'), function (c) { return c.getAttribute('data-v'); });
  }

  var previewTimer = null;
  function refreshSnapPreview() {
    var tickers = currentTickers();
    var box = $('jrSnapPreview'); if (!box) return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(function () {
      fetchSnapshot(tickers).then(function (s) { box.innerHTML = snapLens(s); });
    }, 250);
  }

  function onSave() {
    var body = $('jrBody').value.trim();
    var msg = $('jrMsg');
    if (!body) { msg.textContent = '본문을 입력해줘'; msg.style.color = 'var(--st-hot)'; setTimeout(function () { msg.textContent = ''; msg.style.color = ''; }, 2400); return; }
    var type = $('jrSegType').querySelector('button.on').getAttribute('data-v');
    var layers = currentLayers();
    var tickers = currentTickers();
    var conviction = Number($('jrConv').value);
    var includeSnap = $('jrSnapToggle').checked;
    var btn = $('jrSave'); btn.disabled = true; setMsg('저장 중…');
    var doSave = function (snap) {
      entries.unshift({
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        ts: Date.now(), type: type, layers: layers, tickers: tickers, body: body, conviction: conviction,
        snap: snap || null
      });
      cacheSet(); persist(); renderList();
      $('jrBody').value = ''; $('jrTkTags').innerHTML = '';
      btn.disabled = false; setMsg('저장됨');
    };
    if (includeSnap) fetchSnapshot(tickers).then(doSave); else doSave(null);
  }

  function mountNav() {
    var nav = document.getElementById('nav'); if (!nav) return;
    if (!nav.querySelector('.tab[data-v="journal"]')) {
      var b = document.createElement('button'); b.className = 'tab'; b.setAttribute('data-v', 'journal');
      b.innerHTML = '<span class="n">08</span>투자일지';
      nav.appendChild(b);
    }
    if (!nav.__journalBound) {
      nav.__journalBound = true;
      nav.addEventListener('click', function (e) {
        var t = e.target.closest('.tab');
        if (t && t.getAttribute('data-v') === 'journal') loadEntries();
      });
    }
  }

  function mountView() {
    var main = document.querySelector('main.wrap'); if (!main) return;
    if (document.getElementById('v-journal')) return;
    var sec = document.createElement('section'); sec.className = 'view'; sec.id = 'v-journal';
    sec.innerHTML = SECTION;
    main.appendChild(sec);
    bindComposer();
    loadEntries();
  }

  function mount() {
    if (!document.getElementById('journal-css')) {
      var st = document.createElement('style'); st.id = 'journal-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    mountNav();
    mountView();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();

  window.JOURNAL = { mount: mount, reload: loadEntries };
})();
