/* council-material.js — 03 전문가 원탁 자료 기반 토론
 * PDF·PPTX·DOCX·텍스트·CSV·자막과 붙여넣은 텍스트·캡처 이미지를 자료 텍스트로 만들고,
 * 기존 /api/council 요청에 material 을 덧붙인다. 원탁 렌더·이력·Gemini 음성은 기존 경로 재사용.
 * index.html 무편집 · 신규 :root 토큰 0 · narrative≠numbers. */
(function () {
  'use strict';

  if (window.__councilMaterialMounted) return;
  window.__councilMaterialMounted = true;

  var items = [];
  var busy = false;
  var lastSent = null;
  var nativeFetch = window.fetch.bind(window);
  var MAX_ITEM_CHARS = 40000;
  var MAX_TOTAL_CHARS = 100000;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function norm(s) {
    return String(s || '')
      .replace(/\u0000/g, '')
      .replace(/\r/g, '')
      .replace(/[ \t\u3000]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  function trimText(s) {
    s = norm(s);
    if (s.length <= MAX_ITEM_CHARS) return s;
    return s.slice(0, 26000) + '\n\n[중간 생략: 자료 글자 수 제한]\n\n' + s.slice(-14000);
  }
  function ext(name) {
    var m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : '';
  }
  function loadScript(src, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    return new Promise(function (resolve, reject) {
      var old = document.querySelector('script[data-cl-lib="' + globalName + '"]');
      if (old) {
        old.addEventListener('load', function () { resolve(window[globalName]); }, { once: true });
        old.addEventListener('error', reject, { once: true });
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.dataset.clLib = globalName;
      s.onload = function () {
        if (window[globalName]) resolve(window[globalName]);
        else reject(new Error(globalName + ' 로드 실패'));
      };
      s.onerror = function () { reject(new Error(globalName + ' 로드 실패')); };
      document.head.appendChild(s);
    });
  }
  function xmlText(xml) {
    var doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) return '';
    return Array.prototype.map.call(doc.getElementsByTagNameNS('*', 't'), function (n) {
      return n.textContent || '';
    }).join(' ');
  }
  function numberedPath(a, re) {
    return a.sort(function (x, y) {
      var ax = +(x.match(re) || [0, 0])[1], ay = +(y.match(re) || [0, 0])[1];
      return ax - ay;
    });
  }
  async function readPdf(file) {
    var pdfjs = await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'pdfjsLib');
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    var doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    var pages = [];
    for (var i = 1; i <= doc.numPages; i++) {
      var page = await doc.getPage(i);
      var tc = await page.getTextContent();
      var text = tc.items.map(function (x) { return x.str || ''; }).join(' ');
      if (text.trim()) pages.push('[페이지 ' + i + ']\n' + text);
    }
    if (!pages.length) throw new Error('텍스트가 없는 PDF입니다. 스캔본은 OCR 후 올려주세요.');
    return pages.join('\n\n');
  }
  async function readDocx(file) {
    var mammoth = await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js', 'mammoth');
    var out = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    if (!out.value || !out.value.trim()) throw new Error('DOCX에서 텍스트를 찾지 못했습니다.');
    return out.value;
  }
  async function readPptx(file) {
    var JSZip = await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'JSZip');
    var zip = await JSZip.loadAsync(await file.arrayBuffer());
    var names = Object.keys(zip.files);
    var slides = numberedPath(names.filter(function (n) {
      return /^ppt\/slides\/slide\d+\.xml$/.test(n);
    }), /slide(\d+)\.xml$/);
    if (!slides.length) throw new Error('PPTX 슬라이드를 찾지 못했습니다.');
    var out = [];
    for (var i = 0; i < slides.length; i++) {
      var sx = await zip.file(slides[i]).async('string');
      var st = xmlText(sx);
      var noteName = 'ppt/notesSlides/notesSlide' + (i + 1) + '.xml';
      var nt = '';
      if (zip.file(noteName)) nt = xmlText(await zip.file(noteName).async('string'));
      out.push('[슬라이드 ' + (i + 1) + ']\n' + st + (nt ? '\n[발표자 노트]\n' + nt : ''));
    }
    return out.join('\n\n');
  }
  async function readFile(file) {
    if (!file) throw new Error('파일이 없습니다.');
    var x = ext(file.name);
    if (x === 'pdf') return trimText(await readPdf(file));
    if (x === 'docx') return trimText(await readDocx(file));
    if (x === 'pptx') return trimText(await readPptx(file));
    if (x === 'ppt') throw new Error('구형 PPT는 PPTX 또는 PDF로 저장해 올려주세요.');
    if (/^image\//.test(file.type || '')) return readImage(file);
    if (/^(txt|md|csv|json|srt|vtt|html|htm)$/.test(x)) return trimText(await file.text());
    throw new Error('지원하지 않는 형식입니다. PDF·PPTX·DOCX·텍스트·CSV·자막을 사용하세요.');
  }
  function totalText() {
    var used = 0, parts = [];
    items.filter(function (x) { return x.ok; }).forEach(function (x, i) {
      var head = '[자료 ' + (i + 1) + ' · ' + x.name + ']\n';
      var room = MAX_TOTAL_CHARS - used - head.length;
      if (room <= 0) return;
      var body = x.text.slice(0, room);
      parts.push(head + body);
      used += head.length + body.length;
    });
    return parts.join('\n\n');
  }
  function payload() {
    var good = items.filter(function (x) { return x.ok; });
    if (!good.length) return null;
    return {
      title: good.map(function (x) { return x.name; }).join(' · ').slice(0, 500),
      sources: good.map(function (x) {
        return { name: x.name.slice(0, 180), type: x.type || ext(x.name), chars: x.text.length };
      }),
      content: totalText()
    };
  }
  function setMsg(s, bad) {
    var el = $('clMatMsg');
    if (!el) return;
    el.textContent = s;
    el.style.color = bad ? 'var(--st-hot,#b4472f)' : 'var(--dim)';
  }
  function render() {
    var host = $('clMatList');
    if (!host) return;
    host.innerHTML = items.map(function (x, i) {
      var state = x.pending ? '읽는 중…' : (x.ok ? x.text.length.toLocaleString() + '자' : x.error);
      return '<div class="cl-blk" style="display:flex;align-items:center;gap:8px;margin-top:6px">' +
        '<span class="cl-chip">' + esc((ext(x.name) || 'FILE').toUpperCase()) + '</span>' +
        '<span style="flex:1;min-width:0;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(x.name) + '</span>' +
        '<span style="font-size:12px;color:' + (x.ok ? 'var(--dim)' : 'var(--st-hot,#b4472f)') + '">' + esc(state) + '</span>' +
        '<button type="button" class="cl-btn" data-clmat-rm="' + i + '" style="padding:2px 8px">삭제</button></div>';
    }).join('');
    var good = items.filter(function (x) { return x.ok; });
    if (busy) setMsg('자료를 읽고 있습니다. 완료되면 토론을 시작할 수 있습니다.');
    else if (good.length) setMsg(good.length + '개 자료 준비 완료 · 총 ' + totalText().length.toLocaleString() + '자 · 토론 시작 시 자동 첨부');
    else setMsg('');
  }
  async function addFiles(list) {
    var files = Array.prototype.slice.call(list || []);
    if (!files.length) return;
    var added = files.map(function (f) {
      return { file: f, name: f.name || '자료', type: f.type || '', text: '', ok: false, pending: true, error: '' };
    });
    items = items.concat(added);
    busy = true;
    render();
    await Promise.all(added.map(async function (x) {
      try {
        x.text = await readFile(x.file);
        x.ok = !!x.text.trim();
        if (!x.ok) x.error = '텍스트 없음';
      } catch (e) {
        x.error = String(e && e.message ? e.message : e).slice(0, 100);
      } finally {
        x.pending = false;
        render();
      }
    }));
    busy = items.some(function (x) { return x.pending; });
    render();
  }
  async function readImage(file) {
    if (file.size > 8 * 1024 * 1024) throw new Error('이미지는 8MB 이하로 붙여넣어 주세요.');
    var data = await new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error('이미지를 읽지 못했습니다.')); };
      reader.readAsDataURL(file);
    });
    var r = await nativeFetch('/api/council-image', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: file.name || '붙여넣은 캡처 이미지', data: data }) });
    var j = await r.json().catch(function () { return null; });
    if (!r.ok || !j || !j.text) throw new Error((j && j.error) || '이미지 내용을 읽지 못했습니다.');
    return trimText('[캡처 이미지에서 확인된 내용]\n' + j.text);
  }
  function addText(text, name) {
    text = trimText(text);
    if (!text) return;
    items.push({ name: name || '붙여넣은 텍스트', type: 'text', text: text, ok: true, pending: false, error: '' });
    render();
  }
  function addClipboard(e) {
    var cd = e.clipboardData;
    if (!cd) return false;
    // Chromium 계열 브라우저는 clipboardData.files 를 비워 두고 items 에만
    // 스크린샷 File 을 넣는 경우가 있다. 두 경로를 함께 읽어야 붙여넣기가 안정적이다.
    var files = Array.prototype.slice.call(cd.files || []).filter(function (f) { return /^image\//.test(f.type || ''); });
    if (!files.length && cd.items) {
      files = Array.prototype.slice.call(cd.items).map(function (item) {
        return /^image\//.test(item.type || '') && item.getAsFile ? item.getAsFile() : null;
      }).filter(Boolean);
    }
    if (files.length) { e.preventDefault(); addFiles(files); return true; }
    var text = cd.getData('text/plain') || cd.getData('text');
    if (text && text.trim()) { e.preventDefault(); addText(text, '붙여넣은 텍스트'); return true; }
    return false;
  }
  function reportMaterial() {
    var rep = document.querySelector('#clResult .cl-rep');
    if (!rep || !lastSent || rep.querySelector('#clMatUsed')) return;
    var line = document.createElement('div');
    line.id = 'clMatUsed';
    line.className = 'cl-note';
    line.style.cssText = 'margin:8px 0 12px;padding:8px 10px;border-left:3px solid var(--dawn);background:var(--panel2)';
    line.innerHTML = '<span class="cl-eye">분석 자료</span> ' +
      lastSent.sources.map(function (x) { return '<span class="cl-chip">' + esc(x.name) + '</span>'; }).join(' ') +
      '<br><span style="font-size:12px;color:var(--dim)">각 전문가는 같은 자료를 자신의 공개 관점 렌즈로 해석했습니다. 자료 사실과 AI 해석을 구분해 읽어주세요.</span>';
    var diag = rep.querySelector('.cl-diag');
    if (diag && diag.nextSibling) rep.insertBefore(line, diag.nextSibling);
    else rep.insertBefore(line, rep.firstChild);
  }
  function mount() {
    var topic = $('clTopic');
    if (!topic || $('clMaterial')) return false;
    var heading = topic.previousElementSibling;
    var sec = document.createElement('section');
    sec.id = 'clMaterial';
    sec.innerHTML =
      '<h2 class="msec">참고할 자료</h2>' +
      '<input id="clMatFile" type="file" multiple hidden accept=".pdf,.pptx,.ppt,.docx,.txt,.md,.csv,.json,.srt,.vtt,.html,.htm,image/*">' +
      '<div id="clMatDrop" class="cl-drop" role="button" tabindex="0">클릭 또는 드래그하여 자료 업로드</div>' +
      '<div style="margin-top:8px;display:flex;gap:8px;align-items:flex-start">' +
        '<textarea id="clMatText" class="cl-ta" rows="4" placeholder="여기에 텍스트 또는 캡처 이미지를 붙여넣으세요. 텍스트는 직접 입력 후 추가할 수도 있습니다." aria-label="참고자료 텍스트 입력"></textarea>' +
        '<button type="button" id="clMatTextAdd" class="cl-btn" style="margin-top:1px;white-space:nowrap">텍스트 추가</button>' +
      '</div>' +
      '<p class="cl-note" style="margin:5px 0 0">텍스트·캡처 이미지는 위 입력칸에 Ctrl+V로 붙여넣으세요. 이미지는 내용 인식 후 자료 목록에 추가됩니다.</p>' +
      '<div id="clMatList"></div>' +
      '<p id="clMatMsg" class="cl-note" style="margin:6px 0 16px"></p>';
    heading.parentNode.insertBefore(sec, heading);
    var input = $('clMatFile'), drop = $('clMatDrop'), textInput = $('clMatText');
    drop.addEventListener('click', function () { input.click(); });
    drop.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); addFiles(e.dataTransfer.files); });
    drop.addEventListener('paste', addClipboard);
    input.addEventListener('change', function () { addFiles(input.files); input.value = ''; });
    // 파일 선택 영역은 클릭 시 file input으로 포커스가 이동한다. 따라서 실제 텍스트
    // 붙여넣기 대상은 별도 textarea로 두어 Ctrl+V가 브라우저별로 항상 수신되게 한다.
    textInput.addEventListener('paste', function (e) {
      if (addClipboard(e)) return;
      // 일반 텍스트는 textarea에 남겨 사용자가 확인한 뒤 「텍스트 추가」로 넣는다.
    });
    $('clMatTextAdd').addEventListener('click', function () {
      var text = textInput.value;
      if (!text.trim()) { setMsg('추가할 텍스트를 입력하거나 붙여넣어 주세요.', true); textInput.focus(); return; }
      addText(text, '직접 입력한 텍스트');
      textInput.value = '';
      setMsg('텍스트 자료를 추가했습니다.');
    });
    // capture 단계에서 처리해야 다른 화면 스크립트가 버블 단계에서 이벤트를
    // 중단해도 원탁 자료 붙여넣기가 누락되지 않는다.
    document.addEventListener('paste', function (e) {
      var view = $('v-council');
      if (!view || !view.classList.contains('on') || e.defaultPrevented) return;
      var target = e.target;
      if (target && /^(INPUT|TEXTAREA)$/i.test(target.tagName)) return;
      addClipboard(e);
    }, true);
    $('clMatList').addEventListener('click', function (e) {
      var b = e.target.closest('[data-clmat-rm]');
      if (!b) return;
      items.splice(+b.getAttribute('data-clmat-rm'), 1);
      render();
    });
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'clRun' && busy) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setMsg('자료 읽기가 끝난 뒤 토론을 시작해주세요.', true);
      }
    }, true);
    new MutationObserver(reportMaterial).observe($('clResult'), { childList: true, subtree: true });
    render();
    return true;
  }

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : ((input && input.url) || '');
    if (url === '/api/council' && init && String(init.method || 'GET').toUpperCase() === 'POST') {
      var p = payload();
      if (p && !busy) {
        try {
          var body = JSON.parse(init.body || '{}');
          body.material = p;
          init = Object.assign({}, init, { body: JSON.stringify(body) });
          lastSent = p;
        } catch (_) {}
      } else {
        lastSent = null;
      }
    }
    return nativeFetch(input, init);
  };

  if (!mount()) {
    var tries = 0, timer = setInterval(function () {
      if (mount() || ++tries > 80) clearInterval(timer);
    }, 100);
  }
})();
