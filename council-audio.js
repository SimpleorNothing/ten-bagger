/* council-audio.js — 03 전문가 원탁 「음성 토론」 고품질 AI 음성(구글 AI 스튜디오/Gemini) 승격
 * (자가 마운트 · index.html 무편집 · 06 모닝 브리핑 듣기와 동일한 HiFi 오디오 방식)
 *
 * 흐름: 원탁 진단 리포트(또는 1인 심층 자문)를 발언 시퀀스로 만들어 /api/council-audio 로 보내면
 *       워커가 발언마다 그 화자 음성으로 단일화자 Gemini TTS 를 굽고 이어붙인 WAV 를 준다.
 *       그 WAV 를 재생하며 발언 시작 시각(ms)에 맞춰 말풍선을 메신저형으로 하이라이트한다.
 *       WAV 실패(키 부재·오류)면 기존 브라우저 TTS(window.COUNCIL.playReport 원본)로 자동 폴백.
 *
 * 통합: ① window.COUNCIL.playReport 를 감싸 1인 심층 자문(council-ask.js) 음성도 HiFi 로 승격
 *       ② 원탁 리포트의 「▶ 음성 토론 재생」(.cl-playbtn)은 인라인 클로저에 바인딩돼 있어
 *          캡처 단계 클릭 인터셉트 + 리포트 DOM 파싱으로 d 를 복원해 가로챈다.
 * 규율: 신규 :root 토큰·CSS 0 (기존 .cl-* 전면 재사용) · narrative≠numbers(관점 텍스트일 뿐 숫자 파일 불변). */
(function () {
  if (window.__councilAudio) return;

  var _orig = null, _avn = 0;
  var host = null, audio = null, curURL = null;
  var seqRef = [], startsRef = [], els = [], revealIx = 0, activeIx = -1;

  // 좌장(알파맵)=Kore 고정 · 나머지는 착석 순서로 서로 다른 프리셋 배정(로컬 build.py 화자 팔레트 계승).
  var VOICE_POOL = ['Puck', 'Charon', 'Aoede', 'Iapetus', 'Fenrir', 'Orus', 'Zephyr', 'Leda', 'Umbriel'];

  var SC = { '강세': 'var(--st-dawn,#2f7d63)', '중립': 'var(--st-mature,#9a7b2f)', '약세': 'var(--st-hot,#b4472f)' };
  function sc(s) { return SC[s] || SC['중립']; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(id) { return document.getElementById(id); }

  // ── 아바타 SVG (인라인 COUNCIL avatar() 복제 · clipPath id 는 렌더마다 고유) ──
  function avatar(c, size) {
    c = c || {}; size = size || 56; var cid = 'cavh' + (c.id || '') + (_avn++);
    if (c.emblem) { return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 100 100" style="display:block"><circle cx="50" cy="50" r="49" fill="' + (c.disc || '#16324a') + '"/><g fill="none" stroke="#7fd0d0" stroke-width="2" opacity="0.5"><circle cx="50" cy="50" r="30"/><circle cx="50" cy="50" r="20"/><circle cx="50" cy="50" r="10"/></g><circle cx="50" cy="50" r="3.5" fill="#a6e6e6"/><circle cx="50" cy="50" r="48" fill="none" stroke="var(--line2)" stroke-width="1.5"/></svg>'; }
    var hair = '';
    if (c.style !== 'bald') hair += '<path d="M33 47 A17.5 18.5 0 0 1 67 47 C67 37 60 30 50 30 C40 30 33 37 33 47 Z" fill="' + c.hair + '"/>';
    if (c.style === 'side') hair += '<path d="M33 47 C33 41 41 37 50 37 C44 41 41 45 44 50 Z" fill="' + c.hair + '"/>';
    if (c.style === 'long') hair += '<path d="M32 46 L31 68 Q35 70 38 61 L38 46 Z" fill="' + c.hair + '"/><path d="M68 46 L69 68 Q65 70 62 61 L62 46 Z" fill="' + c.hair + '"/>';
    if (c.style === 'bun') hair += '<circle cx="50" cy="27" r="5.5" fill="' + c.hair + '"/>';
    if (c.style === 'curly') { [36, 44, 50, 56, 64].forEach(function (x, i) { hair += '<circle cx="' + x + '" cy="' + (31 + (i % 2) * 2) + '" r="5" fill="' + c.hair + '"/>'; }); }
    if (c.style === 'bald') hair += '<path d="M34 47 C34 44 37 41 41 40 C38 44 37 47 38 50 C36 50 34 49 34 47 Z" fill="' + c.hair + '"/>';
    var beard = c.beard ? '<path d="M35 48 C37 63 63 63 65 48 C61 58 39 58 35 48 Z" fill="' + c.hair + '" opacity=".9"/>' : '';
    var gl = c.glasses ? '<g stroke="#2a2a2a" stroke-width="1.4" fill="none" opacity=".8"><rect x="39.5" y="41" width="9" height="7" rx="2"/><rect x="51.5" y="41" width="9" height="7" rx="2"/><line x1="48.5" y1="44" x2="51.5" y2="44"/><line x1="39.5" y1="43" x2="34" y2="45"/><line x1="60.5" y1="43" x2="66" y2="45"/></g>' : '';
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 100 100" style="display:block"><defs><clipPath id="' + cid + '"><circle cx="50" cy="50" r="49"/></clipPath></defs>' +
      '<g clip-path="url(#' + cid + ')"><rect width="100" height="100" fill="' + (c.disc || '#e6e9e4') + '"/>' +
      '<path d="M8 100 C8 78 28 70 50 70 C72 70 92 78 92 100 Z" fill="' + (c.shirt || '#5b6b7a') + '"/>' +
      '<rect x="43" y="56" width="14" height="16" rx="5" fill="' + (c.skin || '#e8b78f') + '"/>' +
      '<ellipse cx="50" cy="44" rx="16.5" ry="18.5" fill="' + (c.skin || '#e8b78f') + '"/>' +
      '<circle cx="33.5" cy="46" r="3.2" fill="' + (c.skin || '#e8b78f') + '"/><circle cx="66.5" cy="46" r="3.2" fill="' + (c.skin || '#e8b78f') + '"/>' +
      beard + hair +
      '<rect x="41" y="40.5" width="6" height="1.6" rx=".8" fill="#3a3a3a"/><rect x="53" y="40.5" width="6" height="1.6" rx=".8" fill="#3a3a3a"/>' +
      '<circle cx="44" cy="44.5" r="1.7" fill="#2b2b2b"/><circle cx="56" cy="44.5" r="1.7" fill="#2b2b2b"/>' +
      '<path d="M45 53.5 Q50 56 55 53.5" fill="none" stroke="#7a3b3b" stroke-width="1.4" stroke-linecap="round"/>' + gl +
      '</g><circle cx="50" cy="50" r="48" fill="none" stroke="var(--line2)" stroke-width="1.5"/></svg>';
  }

  function getExperts() { try { return (window.COUNCIL && window.COUNCIL.getExperts && window.COUNCIL.getExperts()) || []; } catch (e) { return []; } }
  function getEx(id) { var a = getExperts(); for (var i = 0; i < a.length; i++) { if (a[i].id === id) return a[i]; } return { name: id }; }
  function idByName(name) { var a = getExperts(); for (var i = 0; i < a.length; i++) { if (a[i].name === name) return a[i].id; } return name; }

  // TTS 낭독용 평문 — 기호를 말로 푼다(감마·레이어·퍼센트 …). 화면 말풍선은 원문 그대로 둔다.
  function sayNorm(s) {
    return String(s || '')
      .replace(/S&P\s*500/gi, '에스앤피 오백')
      .replace(/F&G/g, '공포탐욕지수')
      .replace(/DXI/g, '메모리 현물 지수')
      .replace(/\bL([1-8])\b/g, '레이어 $1')
      .replace(/VIX/gi, '빅스')
      .replace(/γ/g, '감마')
      .replace(/%p/g, '퍼센트포인트')
      .replace(/%/g, '퍼센트')
      .replace(/→/g, ' 로 ')
      .replace(/↑/g, ' 상승 ')
      .replace(/↓/g, ' 하락 ')
      .replace(/·/g, ', ')
      .replace(/&/g, ' 앤드 ')
      .replace(/\s+/g, ' ').trim();
  }

  function clStrip(s) { return String(s || '').replace(/^(합의점을 좁히겠습니다\. |이견과 긴장을 짚겠습니다\. |스틸맨 반론입니다\. )/, ''); }

  // 인라인 COUNCIL buildSeq 복제(getExperts 로 라이브 로스터 반영).
  function buildSeq(d) {
    var seq = [], chair = getEx('chair');
    if (d.diagnosis) seq.push({ vid: 'chair', name: chair.name || '알파맵', cfg: chair.cfg, chip: chair.chip || '좌장 · SoT', say: String(d.diagnosis), me: true });
    (d.board || []).forEach(function (b) { var ex = getEx(b.id); seq.push({ vid: b.id, name: ex.name || b.name || b.id, cfg: ex.cfg, chip: ex.chip || '', call: b.call, say: String(b.take || '') }); });
    if (d.consensus && d.consensus.length) seq.push({ vid: 'chair', me: true, kind: 'agree', title: '좌장 정리 · 합의점', items: d.consensus, say: '합의점을 좁히겠습니다. ' + d.consensus.join('. ') });
    if (d.tension && d.tension.length) seq.push({ vid: 'chair', me: true, kind: 'tension', title: '좌장 정리 · 이견 · 긴장', items: d.tension, say: '이견과 긴장을 짚겠습니다. ' + d.tension.join('. ') });
    if (d.steelman) seq.push({ vid: 'chair', name: chair.name || '알파맵', cfg: chair.cfg, chip: '스틸맨', me: true, say: '스틸맨 반론입니다. ' + d.steelman });
    return seq.filter(function (m) { return m.kind || String(m.say || '').trim(); });
  }

  // 리포트 DOM(#clResult .cl-rep)에서 d 복원 — 원탁 버튼은 인라인 클로저에 바인딩돼 d 를 못 받으므로.
  function readReportDOM(rep) {
    function tx(el) { return el ? el.textContent.trim() : ''; }
    var d = { diagnosis: '', board: [], consensus: [], tension: [], steelman: '' };
    d.diagnosis = tx(rep.querySelector('.cl-diag'));
    Array.prototype.forEach.call(rep.querySelectorAll('.cl-brow'), function (row) {
      var name = tx(row.querySelector('.cl-nm')), call = tx(row.querySelector('.cl-pill')), p = row.querySelector('p');
      var take = p ? p.textContent.trim() : '';
      if (name || take) d.board.push({ id: idByName(name), name: name, call: call, take: take });
    });
    Array.prototype.forEach.call(rep.querySelectorAll('.cl-two .cl-blk'), function (blk) {
      var eye = tx(blk.querySelector('.cl-eye'));
      var items = Array.prototype.map.call(blk.querySelectorAll('li'), function (li) { return li.textContent.trim(); }).filter(Boolean);
      if (/합의/.test(eye)) d.consensus = items; else if (/이견|긴장/.test(eye)) d.tension = items;
    });
    Array.prototype.forEach.call(rep.querySelectorAll('.cl-steel'), function (sl) {
      if (/스틸맨/.test(tx(sl.querySelector('.cl-eye')))) { var p = sl.querySelector('p'); if (p) d.steelman = p.textContent.trim(); }
    });
    return d;
  }

  // ── 플레이어(고품질 오디오) — 기존 .cl-* 재사용, id 만 clPlayHi 로 분리(인라인 #clPlay 와 무충돌) ──
  function callout(m) {
    var col = m.kind === 'agree' ? 'var(--st-dawn,#2f7d63)' : 'var(--st-mature,#9a7b2f)';
    return '<div class="cl-pcall ' + m.kind + '"><div class="cl-eye" style="color:' + col + '">' + esc(m.title || '') + '</div><ul style="margin:6px 0 0;padding-left:16px;font-size:14px;line-height:1.6">' + (m.items || []).map(function (x) { return '<li style="margin-bottom:3px">' + esc(x) + '</li>'; }).join('') + '</ul></div>';
  }
  function renderBubble(m) {
    var chat = host.querySelector('.cl-pchat'), el = document.createElement('div');
    if (m.kind) { el.className = 'cl-pmsg me'; el.innerHTML = callout(m); }
    else {
      el.className = 'cl-pmsg' + (m.me ? ' me' : '');
      var pill = m.call ? '<span class="cl-pill" style="color:' + sc(m.call) + ';background:color-mix(in srgb,' + sc(m.call) + ' 12%,transparent);border:1px solid color-mix(in srgb,' + sc(m.call) + ' 45%,transparent)">' + esc(m.call) + '</span>' : '';
      var chip = m.chip ? '<span class="cl-chip">' + esc(m.chip) + '</span>' : '';
      el.innerHTML = '<div class="cl-pav">' + (m.cfg ? avatar(m.cfg, 40) : '') + '</div><div class="cl-pbody"><div class="cl-pmeta"><span class="cl-pnm">' + esc(m.name) + '</span>' + pill + chip + '</div><div class="cl-pbub">' + esc(clStrip(m.say)) + '</div></div>';
    }
    chat.appendChild(el); chat.scrollTop = chat.scrollHeight; return el;
  }
  function resetChat() { if (host) host.querySelector('.cl-pchat').innerHTML = ''; els = []; revealIx = 0; activeIx = -1; }
  function setStat(t) { var s = host && host.querySelector('.cl-pstat'); if (s) s.textContent = t || ''; }
  function setToggle(t) { var b = host && host.querySelector('[data-a=toggle]'); if (b) b.textContent = t; }

  function onTick() {
    if (!audio || startsRef.length !== seqRef.length) return;
    var ms = audio.currentTime * 1000;
    while (revealIx < seqRef.length && ms >= startsRef[revealIx] - 30) { els[revealIx] = renderBubble(seqRef[revealIx]); revealIx++; }
    var cur = -1;
    for (var i = 0; i < seqRef.length; i++) { if (ms >= startsRef[i]) cur = i; else break; }
    if (cur !== activeIx) {
      if (activeIx >= 0 && els[activeIx]) { var b0 = els[activeIx].querySelector('.cl-pbub'); if (b0) b0.classList.remove('on'); }
      if (cur >= 0 && els[cur]) { var b1 = els[cur].querySelector('.cl-pbub'); if (b1) b1.classList.add('on'); setStat((seqRef[cur].name || '알파맵') + ' 발언 중…'); }
      activeIx = cur;
    }
  }

  function buildHost() {
    host = document.createElement('div');
    host.id = 'clPlayHi'; host.className = 'cl-play'; host.hidden = true;
    host.innerHTML = '<div class="cl-psheet"><div class="cl-phead"><span class="cl-ptitle">원탁 음성 토론</span><span class="cl-chip" style="margin-left:6px">고품질 AI 음성</span><button type="button" class="cl-btn" data-a="mute" title="음성 켜기/끄기">🔊</button><button type="button" class="cl-btn" data-a="close">닫기</button></div><div class="cl-pchat"></div><div class="cl-pfoot"><button type="button" class="cl-btnp" data-a="toggle">⏸ 일시정지</button><span class="cl-pstat"></span></div></div>';
    (document.getElementById('v-council') || document.body).appendChild(host);
    host.addEventListener('click', function (e) {
      var t = e.target.closest('[data-a]'); if (!t) return; var a = t.getAttribute('data-a');
      if (a === 'close') { try { if (audio) audio.pause(); } catch (_e) {} host.hidden = true; }
      else if (a === 'mute') { if (audio) { audio.muted = !audio.muted; t.textContent = audio.muted ? '🔇' : '🔊'; } }
      else if (a === 'toggle') {
        if (!audio) return;
        if (audio.ended) { resetChat(); try { audio.currentTime = 0; } catch (_e) {} audio.play(); setToggle('⏸ 일시정지'); setStat(''); }
        else if (audio.paused) { audio.play(); setToggle('⏸ 일시정지'); }
        else { audio.pause(); setToggle('▶ 재생'); setStat('일시정지'); }
      }
    });
  }

  function hifiPlay(d) {
    var seq = buildSeq(d || {}); if (!seq.length) { if (_orig) _orig(d); return; }
    var order = []; seq.forEach(function (m) { if (m.vid !== 'chair' && order.indexOf(m.vid) < 0) order.push(m.vid); });
    function vf(vid) { if (vid === 'chair') return 'Kore'; var k = order.indexOf(vid); return VOICE_POOL[(k < 0 ? 0 : k) % VOICE_POOL.length]; }
    var turns = seq.map(function (m) { return { say: sayNorm(m.say), voice: vf(m.vid) }; }).filter(function (t) { return t.say; });
    if (!turns.length) { if (_orig) _orig(d); return; }

    if (audio) { try { audio.pause(); } catch (_e) {} audio.src = ''; audio = null; }
    if (!host) buildHost();
    resetChat();
    host.querySelector('.cl-ptitle').textContent = '원탁 음성 토론' + (d && d.diagnosis ? ' — ' + String(d.diagnosis).slice(0, 32) + '…' : '');
    setToggle('⏸ 일시정지'); setStat('고품질 AI 음성 준비 중…'); host.hidden = false;
    seqRef = seq; startsRef = [];

    fetch('/api/council-audio', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ turns: turns }) })
      .then(function (r) { if (!r.ok) throw new Error('audio ' + r.status); var st = r.headers.get('x-council-starts'); return r.blob().then(function (b) { return { b: b, starts: st }; }); })
      .then(function (o) {
        if (curURL) { try { URL.revokeObjectURL(curURL); } catch (_e) {} }
        curURL = URL.createObjectURL(o.b);
        audio = new Audio(); audio.preload = 'auto'; audio.src = curURL;
        var arr = (o.starts || '').split(',').map(function (x) { return parseInt(x, 10); }).filter(function (x) { return !isNaN(x); });
        audio.addEventListener('loadedmetadata', function () {
          if (arr.length === seqRef.length) { startsRef = arr; return; }
          // 폴백 — 발언 글자수 비례로 시작 시각 근사(06 모닝 브리핑 하이라이트 방식).
          var lens = seqRef.map(function (m) { return Math.max(1, String(m.say || '').length); });
          var tot = lens.reduce(function (a, b) { return a + b; }, 0), totMs = (audio.duration || 1) * 1000, acc = 0;
          startsRef = lens.map(function (L) { var s = acc; acc += L / tot * totMs; return Math.round(s); });
        });
        audio.addEventListener('timeupdate', onTick);
        audio.addEventListener('ended', function () { setToggle('▶ 다시'); setStat('토론 종료 · 다시 눌러 재생'); if (activeIx >= 0 && els[activeIx]) { var bb = els[activeIx].querySelector('.cl-pbub'); if (bb) bb.classList.remove('on'); } });
        setStat('');
        var p = audio.play();
        if (p && p.catch) p.catch(function () { setToggle('▶ 재생'); setStat('▶ 를 눌러 재생하세요'); });
      })
      .catch(function () { host.hidden = true; if (_orig) { try { _orig(d); } catch (_e) {} } });
  }

  // 원탁 리포트의 「▶ 음성 토론 재생」(.cl-playbtn)은 인라인 클로저에 바인딩 → 캡처 단계에서 가로챈다.
  function onCapture(e) {
    var pb = e.target.closest && e.target.closest('.cl-playbtn'); if (!pb) return;
    if (!pb.closest('#v-council')) return;
    var rep = pb.closest('.cl-rep'); if (!rep) return;
    var d = readReportDOM(rep);
    if (!d || !buildSeq(d).length) return; // 파싱 실패 → 인라인 브라우저 TTS 그대로 실행
    e.preventDefault(); e.stopImmediatePropagation();
    hifiPlay(d);
  }

  function boot() {
    if (!(window.COUNCIL && window.COUNCIL.playReport)) return false;
    if (window.COUNCIL.__hifi) return true;
    window.COUNCIL.__hifi = 1;
    _orig = window.COUNCIL.playReport;                 // 폴백(브라우저 TTS)·1인 자문 원본
    window.COUNCIL.playReport = function (d) { return hifiPlay(d); };  // 1인 심층 자문(council-ask) 경유분도 HiFi
    document.addEventListener('click', onCapture, true);              // 원탁 재생 버튼(인라인 클로저)
    return true;
  }

  (function init(tries) {
    if (window.__councilAudio) return;
    if (boot()) { window.__councilAudio = 1; return; }
    if (tries > 0) setTimeout(function () { init(tries - 1); }, 200);
  })(40);
})();
