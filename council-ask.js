/* council-ask.js — 03 전문가 원탁 「1인 심층 자문」 (자가 마운트 · index.html 무편집)
 * 카드 1명 선택 시 하단 바(#clBar)에 「심층 자문」 버튼을 띄운다. 그 전문가 렌즈만으로
 * 깊은 진단·직접 실행 조언·자기 반증(watch)을 /api/council-ask 로 받아 #clResult 에 렌더.
 * 좌장(알파맵) 오버레이 없음 — 운영자 결정(2026-07-18). 신규 :root 토큰 0 · 기존 .cl-* 재사용.
 * narrative≠numbers — 관점 텍스트일 뿐 숫자 파일 불변. 실존 인물 렌즈 시뮬레이션(투자자문 아님). */
(function () {
  if (window.__councilAsk) return; window.__councilAsk = 1;

  var SC = { '강세': 'var(--st-dawn,#2f7d63)', '중립': 'var(--st-mature,#9a7b2f)', '약세': 'var(--st-hot,#b4472f)' };
  function sc(s) { return SC[s] || SC['중립']; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function extractJSON(t) { t = String(t).replace(/```json/gi, '').replace(/```/g, '').trim(); var a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a >= 0 && b >= 0) t = t.slice(a, b + 1); return JSON.parse(t); }
  function textOf(j) { return (j.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n'); }
  function nowLocal() { var d = new Date(); function z(n) { return (n < 10 ? '0' : '') + n; } return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes()); }

  function selectedCards() { return Array.prototype.slice.call(document.querySelectorAll('#v-council .cl-card.on')); }

  // 선택된 카드에서 전문가 데이터를 그대로 읽는다 — council-sot/restoreCards 의 라이브 오버라이드를 자동 반영.
  function readExpert(card) {
    function tx(sel) { var el = card.querySelector(sel); return el ? el.textContent.trim() : ''; }
    var svg = card.querySelector('.cl-top svg');
    return { id: card.getAttribute('data-id'), name: tx('.cl-nm'), field: tx('.cl-field'), chip: tx('.cl-chip'), stance: tx('.cl-pill'), view: tx('.cl-view'), avatar: svg ? svg.outerHTML : '' };
  }

  function ul(items) { return '<ul style="margin:8px 0 0;padding-left:16px;line-height:1.7;font-size:14px">' + items.map(function (x) { return '<li style="margin-bottom:4px">' + esc(x) + '</li>'; }).join('') + '</ul>'; }
  function blk(title, color, items) { if (!items || !items.length) return ''; return '<div class="cl-blk"><div class="cl-eye" style="color:' + color + '">' + esc(title) + '</div>' + ul(items) + '</div>'; }

  function reportHTML(ex, q, d) {
    var c = sc(d.stance || ex.stance);
    var head = '<div class="cl-rep"><div style="display:flex;gap:10px;align-items:center">' + (ex.avatar || '') +
      '<div style="min-width:0"><div class="cl-eye">1인 심층 자문</div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span class="cl-nm" style="font-size:16px">' + esc(ex.name) + '</span>' +
      ((d.stance || ex.stance) ? '<span class="cl-pill" style="color:' + c + ';background:color-mix(in srgb,' + c + ' 12%,transparent);border:1px solid color-mix(in srgb,' + c + ' 45%,transparent)">' + esc(d.stance || ex.stance) + '</span>' : '') +
      (ex.chip ? '<span class="cl-chip">' + esc(ex.chip) + '</span>' : '') + '</div>' + (ex.field ? '<div class="cl-field" style="margin-top:2px">' + esc(ex.field) + '</div>' : '') + '</div></div>';
    var qline = q ? '<div class="cl-eye" style="color:var(--dawn);margin-top:10px">질문 · ' + esc(q) + '</div>' : '';
    var diag = '<div class="cl-diag">' + esc(d.diagnosis || '') + '</div>';
    var play = '<button type="button" class="cl-btn cl-askplay" style="margin:2px 0 6px">▶ 음성 자문 재생</button>';
    var ans = (d.answer && String(d.answer).trim()) ? '<div class="cl-steel" style="border-left-color:var(--dawn)"><div class="cl-eye" style="color:var(--dawn)">질문에 대한 답</div><p style="margin:6px 0 0;font-size:14px;line-height:1.7">' + esc(d.answer) + '</p></div>' : '';
    var basis = blk('진단 근거', 'var(--txt)', d.basis);
    var advice = (d.advice && d.advice.length) ? '<div class="cl-blk" style="border-left:3px solid ' + c + '"><div class="cl-eye" style="color:' + c + '">실행 조언 · 이 렌즈 기준</div>' + ul(d.advice) + '</div>' : '';
    var watch = (d.watch && d.watch.length) ? '<div class="cl-steel"><div class="cl-eye">이 렌즈가 꺾이는 지점 · 자기 반증</div>' + ul(d.watch) + '</div>' : '';
    var note = '<p class="cl-note" style="margin-top:12px">' + esc(ex.name) + ' 렌즈의 <b>공개 발언·콘텐츠 기반 시뮬레이션</b>이며 실제 발언·투자자문이 아닙니다. 관점 텍스트일 뿐 숫자 파일을 바꾸지 않습니다(narrative≠numbers). 매매 판단으로 올릴 땐 05 리밸런싱의 라이브 게이트로 재대조하세요.</p>';
    return head + qline + diag + play + ans + '<div class="cl-two">' + basis + advice + '</div>' + watch + note + '</div>';
  }

  // 음성 재생은 인라인 window.COUNCIL.playReport 를 재사용하되, 좌장(chair)이 읽는 diagnosis/steelman 을
  // 비워 두고 모든 발언을 board(=이 전문가 목소리)로 몰아 순수 렌즈를 지킨다.
  function speak(ex, d) {
    if (!(window.COUNCIL && window.COUNCIL.playReport)) return;
    var call = d.stance || ex.stance || '중립';
    var board = [{ id: ex.id, call: call, take: d.diagnosis || '' }];
    if (d.answer && String(d.answer).trim()) board.push({ id: ex.id, call: call, take: '질문에 대한 답. ' + d.answer });
    if (d.advice && d.advice.length) board.push({ id: ex.id, call: call, take: '실행 조언. ' + d.advice.join('. ') });
    if (d.watch && d.watch.length) board.push({ id: ex.id, call: call, take: '이 렌즈가 꺾이는 지점. ' + d.watch.join('. ') });
    window.COUNCIL.playReport({ diagnosis: '', board: board });
  }

  async function post(url, payload) { var r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload) }); var j = await r.json().catch(function () { return null; }); if (!r.ok || !j) throw new Error((j && j.error) ? j.error : ('HTTP ' + r.status)); if (j.error) throw new Error(j.error); return j; }

  async function save(ex, q, d) {
    try {
      await fetch('/api/council-discussions', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({
        at: nowLocal(), members: [ex.name],
        diagnosis: '[심층 자문] ' + ex.name + (q ? (' · ' + q) : '') + ' — ' + String(d.diagnosis || ''),
        board: [{ id: ex.id, name: ex.name, call: d.stance || ex.stance || '중립', take: d.diagnosis || '' }],
        consensus: [], tension: [],
        actions: (d.advice || []).slice(),
        steelman: (d.watch && d.watch.length) ? ('이 렌즈가 꺾이는 지점 — ' + d.watch.join(' · ')) : ''
      }) });
      var h = $('clHistBtn'); if (h) h.click();
    } catch (e) {}
  }

  async function run() {
    var cards = selectedCards(); if (cards.length !== 1) return;
    var ex = readExpert(cards[0]);
    var btn = $('clAsk'); if (!btn) return; btn.disabled = true; var lb = btn.textContent; btn.textContent = '심층 진단 중…';
    var res = $('clResult'); if (res) res.innerHTML = '';
    var q = (($('clTopic') && $('clTopic').value) || '').trim();
    var ctx = (($('clCtx') && $('clCtx').value) || '');
    try {
      var j = await post('/api/council-ask', { expert: { id: ex.id, name: ex.name, field: ex.field, stance: ex.stance, view: ex.view }, situation: ctx, question: q });
      var d = extractJSON(textOf(j));
      if (res) { res.innerHTML = reportHTML(ex, q, d); var pb = res.querySelector('.cl-askplay'); if (pb) pb.addEventListener('click', function () { speak(ex, d); }); if (res.scrollIntoView) { try { res.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {} } }
      save(ex, q, d);
    } catch (err) { if (res) res.innerHTML = '<div class="cl-err" style="margin-top:20px">심층 자문 실패: ' + esc(err.message) + '</div>'; }
    finally { btn.textContent = lb; sync(); }
  }

  var btnEl = null;
  function ensureBtn() {
    if (btnEl && document.body.contains(btnEl)) return btnEl;
    var bar = $('clBar'); if (!bar) return null;
    btnEl = $('clAsk');
    if (!btnEl) {
      btnEl = document.createElement('button');
      btnEl.id = 'clAsk'; btnEl.type = 'button'; btnEl.className = 'cl-btnp';
      btnEl.textContent = '심층 자문'; btnEl.style.display = 'none'; btnEl.style.marginRight = '8px';
      bar.insertBefore(btnEl, $('clRun') || null);
      btnEl.addEventListener('click', run);
    }
    return btnEl;
  }
  function sync() {
    var b = ensureBtn(); if (!b) return;
    var n = selectedCards().length;
    if (n === 1) {
      b.style.display = ''; b.disabled = false;
      var cr = $('clCrumb'); if (cr) cr.textContent = '1명 착석 · 심층 자문 준비 완료 (2명+면 토론)';
    } else { b.style.display = 'none'; b.disabled = true; }
  }

  function boot() {
    if (!$('v-council')) return;
    ensureBtn(); sync();
    ['clChair', 'clThesis', 'clPrice'].forEach(function (gid) { var g = $(gid); if (g) new MutationObserver(sync).observe(g, { childList: true, subtree: true }); });
    var bar = $('clBar'); if (bar) new MutationObserver(function () { ensureBtn(); }).observe(bar, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
