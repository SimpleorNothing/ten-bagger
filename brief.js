/* brief.js — 06 모닝 브리핑 (자가 마운트)
 * ─────────────────────────────────────────────────────────────────────────
 * index.html 무편집. worker 가 <script defer src="/brief.js"> 를 주입하면
 * 이 모듈이 nav 탭(06)과 뷰(#v-brief)를 런타임에 만들어 붙인다(insight.js 패턴).
 *
 * 하는 일
 *   ① 텍스트 브리핑  — /api/brief?part=0 (결론·게이트 보드·레이어 갭·볼 것·액션·스틸맨)
 *   ② 오늘 브리핑 듣기 — /api/brief?part=1,2 (2인 대담 8분) 브라우저 TTS 재생
 *   ③ 지난 브리핑 저장 — /api/briefs (R2 보관분 날짜 목록) → 날짜 클릭 = 그날 것 열람·재생
 *
 * 규율: narrative ≠ numbers. 여기서 만드는 건 전부 '읽어서 말하는' 관점 텍스트이며
 *       gamma·judgment·holdings·earnings 어느 파일도 쓰지 않는다.
 *       신규 :root 토큰 0 — 기존 전역 토큰만 쓴다(STYLE_GUIDE §1·§4-1).
 */
window.BRIEF = (function () {
  "use strict";

  var CSS = [
    '#v-brief .br-top{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 18px}',
    '#v-brief .br-btn{font-family:inherit;font-size:13.5px;font-weight:700;padding:10px 16px;border-radius:3px;',
    ' background:var(--panel2);border:1px solid var(--line2);color:var(--txt);cursor:pointer;transition:border-color .14s,box-shadow .14s}',
    '#v-brief .br-btn:hover{border-color:var(--dim);box-shadow:0 4px 14px rgba(22,36,45,.06)}',
    '#v-brief .br-btn.p{background:var(--dawn);border-color:var(--dawn);color:var(--onacc)}',
    '#v-brief .br-btn[disabled]{opacity:.45;cursor:default;box-shadow:none}',
    '#v-brief .br-date{font-size:12px;color:var(--faint);margin-left:auto}',
    '#v-brief .br-card{background:var(--panel);border:1px solid var(--line);padding:16px 18px;margin:0 0 14px}',
    '#v-brief .br-eye{font-size:12px;font-weight:700;letter-spacing:.1em;color:var(--faint);margin:0 0 9px}',
    '#v-brief .br-head{font-size:19px;font-weight:700;line-height:1.45;letter-spacing:-.3px;color:var(--txt);margin:0}',
    '#v-brief .br-gate{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px;margin-top:4px}',
    '#v-brief .br-g{background:var(--panel2);border:1px solid var(--line);padding:10px 12px}',
    '#v-brief .br-g .k{font-size:11.5px;color:var(--dim);font-weight:600}',
    '#v-brief .br-g .v{font-size:17px;font-weight:700;color:var(--txt);margin-top:3px;letter-spacing:-.3px}',
    '#v-brief .br-g .s{font-size:11.5px;font-weight:700;margin-top:2px}',
    '#v-brief .br-g.on .s{color:var(--st-hot)}#v-brief .br-g.off .s{color:var(--dim)}',
    '#v-brief .br-verdict{margin-top:11px;font-size:14px;font-weight:700;color:var(--dawn)}',
    '#v-brief table.br-t{width:100%;border-collapse:collapse;font-size:13.5px}',
    '#v-brief .br-t th{text-align:left;font-size:11.5px;color:var(--faint);font-weight:700;padding:0 8px 7px 0;border-bottom:1px solid var(--line)}',
    '#v-brief .br-t td{padding:9px 8px 9px 0;border-bottom:1px solid var(--line);vertical-align:top;color:var(--txt)}',
    '#v-brief .br-t td.n{font-weight:700;white-space:nowrap}',
    '#v-brief .br-t .over{color:var(--st-mature);font-weight:700}#v-brief .br-t .under{color:var(--st-dawn);font-weight:700}',
    '#v-brief ul.br-l{margin:0;padding-left:17px}#v-brief ul.br-l li{margin:0 0 7px;font-size:14px;line-height:1.62}',
    '#v-brief .br-steel{border-left:2px solid var(--line2);padding-left:12px;color:var(--dim);font-size:13.5px;line-height:1.68}',
    '#v-brief .br-note{font-size:11.5px;color:var(--faint);line-height:1.55;margin-top:12px}',
    '#v-brief .br-arch{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}',
    '#v-brief .br-ad{font-size:12.5px;font-weight:600;padding:6px 11px;border-radius:3px;background:var(--panel2);',
    ' border:1px solid var(--line);color:var(--dim);cursor:pointer}',
    '#v-brief .br-ad.on{background:var(--dawn);border-color:var(--dawn);color:var(--onacc)}',
    '#v-brief .br-play{background:var(--panel);border:1px solid var(--line);padding:14px 16px;margin:0 0 14px}',
    '#v-brief .br-msg{display:flex;gap:9px;align-items:flex-start;margin:0 0 11px}',
    '#v-brief .br-msg.host{flex-direction:row-reverse}',
    '#v-brief .br-av{flex:0 0 27px;width:27px;height:27px;border-radius:50%;display:flex;align-items:center;justify-content:center;',
    ' font-size:11px;font-weight:700;color:var(--onacc);background:var(--dawn);margin-top:2px}',
    '#v-brief .br-msg.ana .br-av{background:var(--mature)}',
    '#v-brief .br-bd{max-width:84%;min-width:0}',
    '#v-brief .br-nm{font-size:10.5px;font-weight:700;color:var(--faint);margin:0 2px 3px}',
    '#v-brief .br-msg.host .br-nm{text-align:right}',
    '#v-brief .br-bub{background:var(--panel2);border:1px solid var(--line);padding:9px 12px;border-radius:12px;',
    ' font-size:14px;line-height:1.66;cursor:pointer}',
    '#v-brief .br-msg.ana .br-bub{background:var(--panel);border-color:var(--line)}',
    '#v-brief .br-bub.on{border-color:var(--dawn);box-shadow:inset 0 0 0 1px var(--dawn)}',
    '#v-brief .br-bub.done{opacity:.72}',
    '#v-brief .br-ctl{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:10px;padding-top:11px;border-top:1px solid var(--line)}',
    '#v-brief .br-stat{font-size:11.5px;color:var(--faint);margin-top:8px}',
    '#v-brief .br-err{border:1px solid var(--line2);background:var(--panel);padding:13px 15px;font-size:13.5px;color:var(--txt)}',
    '@media(max-width:700px){#v-brief .br-bd{max-width:90%}#v-brief .br-date{margin-left:0;width:100%}}'
  ].join('');

  var SECTION =
    '<div class="vhead">' +
    '<div class="vkick">Morning Brief · 매일 저장</div>' +
    '<h1 class="vtitle">오늘 아침, <em>게이트</em>부터 확인한다</h1>' +
    '<p class="vsub">라이브 게이트·비중·일정으로 매일 아침 브리핑을 만들어 <b>날짜별로 보관</b>한다. ' +
    '텍스트로 훑고, 이동 중이면 2인 대담으로 듣는다. <b>narrative ≠ numbers</b> — 브리핑은 라이브 값을 읽어 말할 뿐 숫자·판단 파일을 바꾸지 않는다.</p>' +
    '</div>' +
    '<div class="br-top">' +
    '<button class="br-btn p" id="brListen">▶ 오늘 브리핑 듣기</button>' +
    '<button class="br-btn" id="brRegen">다시 만들기</button>' +
    '<span class="br-date" id="brDate"></span>' +
    '</div>' +
    '<div id="brPlayer"></div>' +
    '<div id="brBody"></div>' +
    '<div class="br-card"><div class="br-eye">지난 브리핑 · 저장분</div><div id="brArch">불러오는 중 …</div>' +
    '<div class="br-note">보관은 R2(<code>brief_{날짜}_p{0,1,2}.json</code>). ' +
    '텍스트(p0)·대담 전반(p1)·후반(p2)이 각각 그날 처음 열람할 때 한 번 만들어져 저장된다 — 이후 재열람은 무료다. ' +
    '「다시 만들기」는 그날치를 새 라이브 값으로 덮어쓴다.</div></div>';

  var SPK = {
    host: { nm: '진행자', av: '진', pref: 'f', rate: 1.0, pitch: 1.04 },
    ana:  { nm: '알파맵 애널리스트', av: '애', pref: 'm', rate: 0.98, pitch: 0.98 }
  };

  var cur = null;          // 현재 보고 있는 날짜(null = 오늘)
  var SCRIPT = [], idx = -1, playing = false, busy = false, rate = 1, muted = false;
  var p2pend = null, p2done = false, voices = [];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function kst() { return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); }

  /* ── 음성 ─────────────────────────────────────────────── */
  var F = /(sunhi|heami|yuna|jimin|soonbok|yujin|female|여성|여자)/i;
  var M = /(injoon|hyunsu|bongjin|gookmin|guy|male|남성|남자)/i;
  function score(v) {
    var n = ((v.name || '') + ' ' + (v.voiceURI || '')).toLowerCase(), s = 0;
    if (/^ko(-|_|$)/i.test(v.lang) || /ko-kr/i.test(v.lang)) s += 100;
    if (/natural|neural/.test(n)) s += 70;
    if (/google/.test(n)) s += 55;
    if (/enhanced|premium|siri/.test(n)) s += 45;
    if (v.localService === false) s += 12;
    if (/compact|espeak/.test(n)) s -= 40;
    return s;
  }
  function loadVoices() {
    if (typeof speechSynthesis === 'undefined') return;
    voices = speechSynthesis.getVoices().filter(function (v) { return /ko/i.test(v.lang); })
      .map(function (v) {
        var n = ((v.name || '') + ' ' + (v.voiceURI || '')).toLowerCase();
        return { v: v, s: score(v), g: F.test(n) ? 'f' : M.test(n) ? 'm' : '?' };
      }).sort(function (a, b) { return b.s - a.s; });
    if (!voices.length) { SPK.host.voice = SPK.ana.voice = null; return; }
    var f = voices.filter(function (x) { return x.g === 'f'; });
    var m = voices.filter(function (x) { return x.g === 'm'; });
    var u = voices.filter(function (x) { return x.g === '?'; });
    SPK.host.voice = (f[0] || u[0] || voices[0]).v;
    SPK.ana.voice = (m[0] || u[1] || u[0] || voices[1] || voices[0]).v;
  }

  /* ── API ──────────────────────────────────────────────── */
  function api(part, regen) {
    var p = new URLSearchParams();
    p.set('part', String(part));
    if (cur) p.set('d', cur);
    if (regen) p.set('regen', '1');
    return fetch('/api/brief?' + p.toString(), { credentials: 'same-origin' }).then(function (r) { return r.json(); });
  }

  /* ── 텍스트 브리핑 렌더 ───────────────────────────────── */
  function renderText(d) {
    var b = $('brBody'); if (!b) return;
    if (d.error) {
      b.innerHTML = '<div class="br-err"><b>브리핑을 만들지 못했습니다.</b><br>' + esc(d.error) +
        '<br><br>잠시 뒤 다시 시도하거나, 슬랙 텍스트 요약으로 확인해 주세요.</div>';
      return;
    }
    var h = '';
    h += '<div class="br-card"><div class="br-eye">결론</div><p class="br-head">' + esc(d.headline || '') + '</p></div>';

    if (Array.isArray(d.gate) && d.gate.length) {
      h += '<div class="br-card"><div class="br-eye">매크로 게이트 · 3중 AND</div><div class="br-gate">';
      d.gate.forEach(function (g) {
        var on = /충족|점등/.test(String(g.s || '')) && !/미/.test(String(g.s || ''));
        h += '<div class="br-g ' + (on ? 'on' : 'off') + '"><div class="k">' + esc(g.k) + '</div>' +
             '<div class="v">' + esc(g.v) + '</div><div class="s">' + esc(g.s) + '</div></div>';
      });
      h += '</div>';
      if (d.gateVerdict) h += '<div class="br-verdict">' + esc(d.gateVerdict) + '</div>';
      h += '</div>';
    }

    if (Array.isArray(d.layers) && d.layers.length) {
      h += '<div class="br-card"><div class="br-eye">레이어 갭 · 비중 vs 적정밴드</div>' +
           '<table class="br-t"><thead><tr><th>레이어</th><th>비중</th><th>밴드</th><th>상태</th><th>메모</th></tr></thead><tbody>';
      d.layers.forEach(function (l) {
        var cls = /오버/.test(String(l.state || '')) ? 'over' : /언더/.test(String(l.state || '')) ? 'under' : '';
        h += '<tr><td class="n">' + esc(l.l) + '</td><td class="n">' + esc(l.w) + '</td><td>' + esc(l.band || '—') +
             '</td><td class="' + cls + '">' + esc(l.state || '—') + '</td><td>' + esc(l.note || '') + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }

    if (Array.isArray(d.watch) && d.watch.length) {
      h += '<div class="br-card"><div class="br-eye">오늘 볼 것</div><ul class="br-l">' +
        d.watch.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    }
    if (Array.isArray(d.actions) && d.actions.length) {
      h += '<div class="br-card"><div class="br-eye">액션 아이템 · 전부 조건부 AND</div><ul class="br-l">' +
        d.actions.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    }
    if (d.steelman) {
      h += '<div class="br-card"><div class="br-eye">스틸맨 반론</div><div class="br-steel">' + esc(d.steelman) + '</div></div>';
    }
    b.innerHTML = h;
    var dt = $('brDate');
    if (dt) dt.textContent = '기준일 ' + (d.asOf || cur || kst()) + (cur ? ' · 보관분' : ' · 오늘');
  }

  function loadText(regen) {
    var b = $('brBody'); if (b) b.innerHTML = '<div class="br-card">브리핑을 정리하는 중입니다 … <span id="brEl">0</span>초</div>';
    var s = 0, iv = setInterval(function () { var e = $('brEl'); if (e) e.textContent = String(++s); }, 1000);
    return api(0, regen).then(function (d) { clearInterval(iv); renderText(d); })
      .catch(function (e) { clearInterval(iv); renderText({ error: String(e && e.message || e) }); });
  }

  /* ── 낭독 ─────────────────────────────────────────────── */
  function stop() { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); }
  function say(it, bub, done) {
    var sp = SPK[it.s] || SPK.ana, fin = false;
    function end() { if (fin) return; fin = true; if (bub) { bub.classList.remove('on'); bub.classList.add('done'); } done && done(); }
    if (bub) bub.classList.add('on');
    if (muted || typeof speechSynthesis === 'undefined') {
      stat(sp.nm, muted ? '낭독(음소거) …' : '낭독 …');
      return void setTimeout(end, Math.min(9000, 1200 + it.say.length * 52) / rate);
    }
    stop();
    var u = new SpeechSynthesisUtterance(it.say);
    u.lang = 'ko-KR';
    if (sp.voice) u.voice = sp.voice;
    u.rate = Math.min(1.7, sp.rate * rate);
    u.pitch = (SPK.host.voice === SPK.ana.voice) ? sp.pitch : 1;
    stat(sp.nm, '발언 중 …');
    var wd = setTimeout(end, Math.min(60000, 2500 + it.say.length * 130) / rate);
    u.onend = function () { clearTimeout(wd); end(); };
    u.onerror = function () { clearTimeout(wd); end(); };
    speechSynthesis.speak(u);
  }
  function stat(who, t) {
    var e = $('brStat'); if (!e) return;
    e.innerHTML = (who ? '<b style="color:var(--dawn)">' + esc(who) + '</b> · ' : '') + esc(t);
  }
  function step() {
    if (!playing) return;
    if (idx + 1 >= SCRIPT.length) {
      if (!p2done && p2pend) { stat('', '후반부 대본을 받는 중입니다 …'); p2pend.then(function () { if (playing) step(); }); return; }
      playing = false; var pb = $('brPlay'); if (pb) pb.textContent = '▶';
      stat('브리핑 종료', '말풍선을 누르면 그 대목만 다시 들을 수 있습니다');
      return;
    }
    idx++;
    var it = SCRIPT[idx];
    var el = document.querySelector('#brChat .br-msg[data-i="' + idx + '"]');
    if (el && el.scrollIntoView) { try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {} }
    busy = true;
    say(it, el && el.querySelector('.br-bub'), function () { busy = false; if (playing) setTimeout(step, 180); });
  }
  function play() { if (playing) return; playing = true; var pb = $('brPlay'); if (pb) pb.textContent = '❚❚'; step(); }
  function pause() { playing = false; busy = false; stop(); var pb = $('brPlay'); if (pb) pb.textContent = '▶'; stat('일시정지', '재생을 누르면 이어서 듣습니다'); }

  function addMsgs(list) {
    var chat = $('brChat'); if (!chat) return;
    list.forEach(function (it) {
      var i = SCRIPT.length; SCRIPT.push(it);
      var sp = SPK[it.s] || SPK.ana;
      var d = document.createElement('div');
      d.className = 'br-msg ' + it.s; d.setAttribute('data-i', String(i));
      d.innerHTML = '<div class="br-av">' + sp.av + '</div><div class="br-bd"><div class="br-nm">' + sp.nm + '</div>' +
                    '<div class="br-bub">' + esc(it.say) + '</div></div>';
      chat.appendChild(d);
      d.querySelector('.br-bub').addEventListener('click', function () {
        if (busy) return; stop(); say(it, d.querySelector('.br-bub'), function () {});
      });
    });
  }

  function openPlayer() {
    var p = $('brPlayer'); if (!p) return;
    SCRIPT = []; idx = -1; playing = false; busy = false; p2done = false; p2pend = null;
    p.innerHTML = '<div class="br-play"><div class="br-eye">2인 대담 · 약 8분</div><div id="brChat"></div>' +
      '<div class="br-ctl">' +
      '<button class="br-btn p" id="brPlay">▶</button>' +
      '<button class="br-btn" id="brMute">🔊</button>' +
      '<button class="br-btn" id="brX">닫기</button>' +
      '<span style="font-size:12px;color:var(--faint)">배속</span>' +
      '<button class="br-btn br-sp" data-r="1">1×</button>' +
      '<button class="br-btn br-sp" data-r="1.25">1.25×</button>' +
      '<button class="br-btn br-sp" data-r="1.5">1.5×</button>' +
      '</div><div class="br-stat" id="brStat">대본을 받는 중입니다 …</div></div>';

    $('brPlay').onclick = function () { playing ? pause() : play(); };
    $('brMute').onclick = function () { muted = !muted; $('brMute').textContent = muted ? '🔇' : '🔊'; if (muted) stop(); };
    $('brX').onclick = function () { pause(); p.innerHTML = ''; };
    Array.prototype.forEach.call(p.querySelectorAll('.br-sp'), function (b) {
      b.onclick = function () {
        rate = parseFloat(b.getAttribute('data-r'));
        Array.prototype.forEach.call(p.querySelectorAll('.br-sp'), function (x) { x.classList.toggle('p', x === b); });
      };
    });
    /* iOS 오디오 언락 — 사용자 제스처 안에서 빈 발화 */
    if (typeof speechSynthesis !== 'undefined') {
      var u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); loadVoices();
    }

    api(1).then(function (d1) {
      if (d1.error) { stat('중단', d1.error); return; }
      addMsgs(d1.script || []);
      play();
      p2pend = api(2).then(function (d2) {
        if (d2 && !d2.error && d2.script) addMsgs(d2.script);
        p2done = true;
      }).catch(function () { p2done = true; });
    }).catch(function (e) { stat('중단', String(e && e.message || e)); });
  }

  /* ── 보관분 목록 ──────────────────────────────────────── */
  function loadArch() {
    var a = $('brArch'); if (!a) return;
    fetch('/api/briefs', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
      var ds = (j && j.dates) || [];
      if (!ds.length) { a.innerHTML = '<span style="font-size:13px;color:var(--faint)">아직 저장된 브리핑이 없습니다 — 오늘 것이 첫 회차입니다.</span>'; return; }
      var today = kst();
      a.innerHTML = '<div class="br-arch">' + ds.map(function (x) {
        var d = x.d || x;
        var on = (cur ? cur === d : d === today);
        return '<button class="br-ad' + (on ? ' on' : '') + '" data-d="' + esc(d) + '">' + esc(d) + '</button>';
      }).join('') + '</div>';
      Array.prototype.forEach.call(a.querySelectorAll('.br-ad'), function (b) {
        b.onclick = function () {
          var d = b.getAttribute('data-d');
          cur = (d === today) ? null : d;
          var p = $('brPlayer'); if (p) { pause(); p.innerHTML = ''; }
          loadText(false).then(loadArch);
        };
      });
    }).catch(function () { a.innerHTML = '<span style="font-size:13px;color:var(--faint)">목록을 불러오지 못했습니다.</span>'; });
  }

  /* ── 마운트 ───────────────────────────────────────────── */
  var booted = false;
  function renderAll() { if (!booted) { booted = true; loadText(false); loadArch(); } }

  function mount() {
    if (!document.getElementById('brief-css')) {
      var st = document.createElement('style'); st.id = 'brief-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    var nav = document.getElementById('nav');
    if (nav && !nav.querySelector('.tab[data-v="brief"]')) {
      var b = document.createElement('button'); b.className = 'tab';
      b.setAttribute('data-v', 'brief');
      b.innerHTML = '<span class="n"></span>모닝 브리핑';
      /* 06 = 메모 앞. insight.js 가 이미 01~06 을 재번호했으므로 여기서 다시 매긴다(멱등). */
      var memo = nav.querySelector('.tab[data-v="memo"]');
      if (memo) nav.insertBefore(b, memo); else nav.appendChild(b);
      Array.prototype.forEach.call(nav.querySelectorAll('.tab'), function (t, i) {
        var n = t.querySelector('.n'); if (n) n.textContent = (i + 1 < 10 ? '0' : '') + (i + 1);
      });
      nav.addEventListener('click', function (e) {
        var t = e.target.closest ? e.target.closest('.tab') : null;
        if (t && t.getAttribute('data-v') === 'brief') renderAll();
      });
    }
    var main = document.querySelector('main.wrap');
    if (main && !document.getElementById('v-brief')) {
      var sec = document.createElement('section'); sec.className = 'view'; sec.id = 'v-brief';
      sec.innerHTML = SECTION;
      var mv = document.getElementById('v-memo');
      if (mv) main.insertBefore(sec, mv); else main.appendChild(sec);
      var lb = $('brListen'); if (lb) lb.onclick = openPlayer;
      var rb = $('brRegen'); if (rb) rb.onclick = function () {
        rb.disabled = true;
        loadText(true).then(function () { rb.disabled = false; loadArch(); });
      };
    }
  }

  function init() {
    mount();
    if (typeof speechSynthesis !== 'undefined') {
      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;
      setTimeout(loadVoices, 500); setTimeout(loadVoices, 1500);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { render: renderAll, mount: mount, open: openPlayer };
})();
