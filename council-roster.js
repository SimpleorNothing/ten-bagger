/* council-roster.js — 03 전문가 원탁 「패널 관리」 (자가 마운트 · index.html 훅 사용)
 * 전문가 카드 명단을 UI에서 추가·삭제·편집. 서버(R2 council_roster.json) 저장 → 모든 기기 공유.
 * 인라인 COUNCIL 은 getExperts/setExperts 훅만 노출 — 이 스크립트가 로스터를 주입해
 * 토론·1인 자문 양쪽이 커스텀/편집 명단으로 동작한다. 뷰/스탠스 편집은 기존 council_log
 * 채널에도 흘려 council-sot 덮어쓰기를 피한다. 신규 :root 토큰 0 · 기존 .cl-* 재사용.
 * narrative≠numbers — 관점·명단 텍스트일 뿐 숫자 파일 불변. */
(function () {
  if (window.__councilRoster) return; window.__councilRoster = 1;

  var SCC = { '강세': 'var(--st-dawn,#2f7d63)', '중립': 'var(--st-mature,#9a7b2f)', '약세': 'var(--st-hot,#b4472f)' };
  function sc(s) { return SCC[s] || SCC['중립']; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function nowLocal() { var d = new Date(); function z(n) { return (n < 10 ? '0' : '') + n; } return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes()); }
  async function jget(u) { try { var r = await fetch(u, { credentials: 'same-origin', cache: 'no-store' }); return r.ok ? await r.json() : null; } catch (e) { return null; } }
  async function jpost(u, p) { try { var r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(p) }); return r.ok; } catch (e) { return false; } }

  var BENCH = [['thesis', '논제 시계'], ['price', '가격·규율 시계'], ['chair', '좌장(SoT)']];
  function benchLabel(b) { for (var i = 0; i < BENCH.length; i++) if (BENCH[i][0] === b) return BENCH[i][1]; return '논제 시계'; }
  var PRESETS = [
    { k: 'a', cfg: { skin: '#e8b78f', hair: '#4d4a47', style: 'side', glasses: true, disc: '#e6e9e4', shirt: '#5b6b7a' } },
    { k: 'b', cfg: { skin: '#d99a6c', hair: '#33312f', style: 'short', glasses: false, disc: '#e5e8ec', shirt: '#6a7a70' } },
    { k: 'c', cfg: { skin: '#f0c9a4', hair: '#2a2118', style: 'bun', glasses: false, disc: '#ece2e6', shirt: '#7a5f6b' } },
    { k: 'd', cfg: { skin: '#c98a5a', hair: '#141014', style: 'short', glasses: true, disc: '#ece7dd', shirt: '#8a7a55' } },
    { k: 'e', cfg: { skin: '#e8b78f', hair: '#2a2a2a', style: 'curly', glasses: false, disc: '#e4e7ec', shirt: '#5f7183' } },
    { k: 'chair', cfg: { emblem: true, disc: '#16324a' } }
  ];

  var C = null, BASE = null, WORK = [], editId = null;

  // 관리 목록 아바타: 렌더된 카드에서 클론, 없으면 disc 색 점.
  function avatarFor(e) {
    var card = document.querySelector('#v-council .cl-card[data-id="' + (window.CSS && CSS.escape ? CSS.escape(e.id) : e.id) + '"] .cl-top svg');
    if (card) { var s = card.cloneNode(true); s.setAttribute('width', '40'); s.setAttribute('height', '40'); return s.outerHTML; }
    var disc = (e.cfg && e.cfg.disc) || '#e6e9e4';
    return '<svg width="40" height="40" viewBox="0 0 100 100"><circle cx="50" cy="50" r="49" fill="' + esc(disc) + '"/><circle cx="50" cy="50" r="48" fill="none" stroke="var(--line2)" stroke-width="1.5"/><text x="50" y="60" font-size="34" text-anchor="middle" fill="var(--txt)" font-family="var(--serif)">' + esc((e.name || '?').slice(0, 1)) + '</text></svg>';
  }

  function ensureModal() {
    var m = $('clRoster');
    if (m) return m;
    m = document.createElement('div');
    m.className = 'cl-modal'; m.id = 'clRoster'; m.hidden = true;
    m.innerHTML = '<div class="cl-sheet" id="clRosterSheet" style="max-width:600px">' +
      '<div style="display:flex;align-items:center;gap:8px"><span class="cl-eye">패널 관리</span><span id="clRosterCount" style="font-size:12px;color:var(--faint)"></span><span style="flex:1"></span><button class="cl-btn" data-r="restore">기본 6인 복원</button><button class="cl-btn" data-r="close">닫기</button></div>' +
      '<p class="cl-note" style="margin:8px 0 0">전문가 카드 명단을 추가·삭제·편집합니다. 서버에 저장돼 모든 기기에 공유되며, 토론·1인 자문 양쪽에 반영됩니다. 관점 시뮬레이션일 뿐 숫자 파일을 바꾸지 않습니다(narrative≠numbers).</p>' +
      '<div id="clRosterBody" style="margin-top:12px"></div></div>';
    document.getElementById('v-council').appendChild(m);
    m.addEventListener('click', function (e) {
      if (e.target === m) { m.hidden = true; return; }
      var t = e.target.closest('[data-r]'); if (!t) return;
      var a = t.getAttribute('data-r');
      if (a === 'close') m.hidden = true;
      else if (a === 'restore') doRestore();
      else if (a === 'add') openForm('__new__');
      else if (a === 'edit') openForm(t.getAttribute('data-id'));
      else if (a === 'del') doDelete(t.getAttribute('data-id'));
      else if (a === 'formcancel') renderList();
      else if (a === 'formsave') saveForm();
      else if (a === 'preset') { editId && setPreset(t.getAttribute('data-k')); }
    });
    return m;
  }

  function renderList() {
    editId = null;
    var body = $('clRosterBody'); if (!body) return;
    $('clRosterCount').textContent = '총 ' + WORK.length + '인';
    var rows = WORK.map(function (e) {
      var c = sc(e.stance);
      return '<div class="cl-blk" style="display:flex;gap:10px;align-items:center;margin-bottom:8px">' +
        '<span style="flex:0 0 40px;line-height:0">' + avatarFor(e) + '</span>' +
        '<div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><span class="cl-nm" style="font-size:14px">' + esc(e.name) + '</span>' +
        '<span class="cl-pill" style="color:' + c + ';background:color-mix(in srgb,' + c + ' 12%,transparent);border:1px solid color-mix(in srgb,' + c + ' 45%,transparent)">' + esc(e.stance) + '</span>' +
        (e.chip ? '<span class="cl-chip">' + esc(e.chip) + '</span>' : '') + '<span class="cl-chip">' + esc(benchLabel(e.bench)) + '</span>' + (e.custom ? '<span class="cl-chip">추가</span>' : '') + '</div>' +
        '<div class="cl-field" style="margin-top:2px">' + esc(e.field) + '</div></div>' +
        '<div style="flex:0 0 auto;display:flex;gap:6px"><button class="cl-btn" data-r="edit" data-id="' + esc(e.id) + '">편집</button><button class="cl-btn" data-r="del" data-id="' + esc(e.id) + '">삭제</button></div></div>';
    }).join('');
    body.innerHTML = rows + '<div style="display:flex;justify-content:flex-end;margin-top:6px"><button class="cl-btnp" data-r="add">+ 패널 추가</button></div>';
  }

  var formCfg = null;
  function openForm(id) {
    editId = id;
    var e = (id === '__new__') ? { id: '', name: '', field: '', chip: '', bench: 'thesis', stance: '중립', view: '', cfg: copy(PRESETS[0].cfg), custom: true } : WORK.filter(function (x) { return x.id === id; })[0];
    if (!e) return renderList();
    formCfg = copy(e.cfg || PRESETS[0].cfg);
    var body = $('clRosterBody');
    function field(lb, html) { return '<div style="margin-top:10px"><div class="cl-eye" style="margin-bottom:4px">' + lb + '</div>' + html + '</div>'; }
    var benchOpts = BENCH.map(function (b) { return '<option value="' + b[0] + '"' + (e.bench === b[0] ? ' selected' : '') + '>' + b[1] + '</option>'; }).join('');
    var stOpts = ['강세', '중립', '약세'].map(function (s) { return '<option value="' + s + '"' + (e.stance === s ? ' selected' : '') + '>' + s + '</option>'; }).join('');
    var presets = PRESETS.map(function (p) { var on = JSON.stringify(p.cfg) === JSON.stringify(formCfg); return '<button type="button" class="cl-btn" data-r="preset" data-k="' + p.k + '" style="width:34px;height:34px;padding:0;border-radius:20px;background:' + (p.cfg.disc || '#ccc') + (on ? ';border:2px solid var(--dawn)' : '') + '" title="' + p.k + '"></button>'; }).join('');
    body.innerHTML = '<div class="cl-eye">' + (id === '__new__' ? '패널 추가' : '패널 편집 · ' + esc(e.name)) + '</div>' +
      field('이름', '<input class="cl-in" id="rfName" maxlength="40" value="' + esc(e.name) + '">') +
      field('전문 (한 줄)', '<input class="cl-in" id="rfField" maxlength="80" value="' + esc(e.field) + '" placeholder="예: 반도체·HBM 기술 (KAIST)">') +
      field('레이어 태그', '<input class="cl-in" id="rfChip" maxlength="40" value="' + esc(e.chip) + '" placeholder="예: L3·L4 · 기술">') +
      field('시계 (자리)', '<select class="cl-in" id="rfBench">' + benchOpts + '</select>') +
      field('스탠스', '<select class="cl-in" id="rfStance">' + stOpts + '</select>') +
      field('관점 (렌즈 요약)', '<textarea class="cl-ta" id="rfView" rows="5" placeholder="이 전문가의 공개 발언·콘텐츠 기반 렌즈 요약">' + esc(e.view) + '</textarea>') +
      field('아바타', '<div id="rfPresets" style="display:flex;gap:8px;flex-wrap:wrap">' + presets + '</div>') +
      '<div class="cl-err" id="rfErr" style="display:none"></div>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="cl-btn" data-r="formcancel">취소</button><button class="cl-btnp" data-r="formsave">저장</button></div>';
    document.getElementById('rfStance').value = e.stance;
    document.getElementById('rfBench').value = e.bench;
  }
  function setPreset(k) {
    var p = PRESETS.filter(function (x) { return x.k === k; })[0]; if (!p) return;
    formCfg = copy(p.cfg);
    // 프리셋 하이라이트 갱신
    var wrap = $('rfPresets'); if (!wrap) return;
    Array.prototype.forEach.call(wrap.querySelectorAll('[data-r=preset]'), function (b) {
      b.style.border = (b.getAttribute('data-k') === k) ? '2px solid var(--dawn)' : '';
    });
  }

  function genId() { return 'x' + Date.now().toString(36) + Math.floor((Date.now() % 997)).toString(36); }
  async function saveForm() {
    var name = ($('rfName').value || '').trim();
    if (!name) { var er = $('rfErr'); er.style.display = ''; er.textContent = '이름을 입력하세요.'; return; }
    var stance = $('rfStance').value, bench = $('rfBench').value, view = ($('rfView').value || '').trim();
    var rec;
    if (editId === '__new__') {
      rec = { id: genId(), bench: bench, name: name, chip: ($('rfChip').value || '').trim(), field: ($('rfField').value || '').trim(), stance: stance, updated: '패널 관리 · ' + nowLocal().slice(0, 10), view: view, cfg: copy(formCfg), custom: true };
      WORK.push(rec);
    } else {
      rec = WORK.filter(function (x) { return x.id === editId; })[0]; if (!rec) return renderList();
      rec.name = name; rec.chip = ($('rfChip').value || '').trim(); rec.field = ($('rfField').value || '').trim();
      rec.bench = bench; rec.stance = stance; rec.view = view; rec.cfg = copy(formCfg);
      rec.updated = '패널 관리 · ' + nowLocal().slice(0, 10);
    }
    await persist();
    // 뷰·스탠스는 council_log 채널에도 흘려 council-sot 덮어쓰기를 피한다(관점 SoT 일원화).
    if (view) jpost('/api/council-log', { at: nowLocal(), expertId: rec.id, expert: rec.name, source: '패널 관리', view: view, stance: stance });
    if (C && C.setExperts) C.setExperts(copy(WORK));
    renderList();
  }
  async function doDelete(id) {
    if (WORK.length <= 1) return;
    WORK = WORK.filter(function (x) { return x.id !== id; });
    await persist();
    if (C && C.setExperts) C.setExperts(copy(WORK));
    renderList();
  }
  async function doRestore() {
    WORK = copy(BASE);
    await persist();
    if (C && C.setExperts) C.setExperts(copy(WORK));
    renderList();
  }
  async function persist() { await jpost('/api/council-roster', { experts: WORK }); }

  function injectBtn() {
    if ($('clRosterBtn')) return;
    var anchor = $('clLogBtn'); if (!anchor || !anchor.parentNode) return;
    var b = document.createElement('button');
    b.className = 'cl-btn'; b.id = 'clRosterBtn'; b.type = 'button'; b.textContent = '패널 관리';
    b.style.marginTop = '8px'; b.style.marginLeft = '6px';
    anchor.parentNode.insertBefore(b, anchor.nextSibling);
    b.addEventListener('click', function () { ensureModal().hidden = false; renderList(); });
  }

  async function boot() {
    C = window.COUNCIL;
    if (!C || !C.getExperts || !C.setExperts) { return void setTimeout(boot, 200); }
    if (!$('v-council')) return void setTimeout(boot, 200);
    BASE = copy(C.getExperts());
    injectBtn();
    var data = await jget('/api/council-roster');
    if (data && Array.isArray(data.experts) && data.experts.length) {
      WORK = data.experts.map(function (e) { if (!e.cfg) e.cfg = copy(PRESETS[0].cfg); return e; });
      C.setExperts(copy(WORK));
    } else {
      WORK = copy(BASE);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
