/* council-material.js — 03 전문가 원탁 자료 기반 토론
 * PDF·PPTX·DOCX·텍스트·CSV·자막을 브라우저에서 텍스트로 추출하고,
 * 기존 /api/council 요청에 material 을 덧붙인다. 원탁 렌더·이력·Gemini 음성은 기존 경로 재사용.
 * index.html 무편집 · 신규 :root 토큰 0 · narrative≠numbers. */
(function () {
  'use strict';

  if (window.__councilMaterialMounted) return;
  window.__councilMaterialMounted = true;

  var MAX_FILES = 6;
  var MAX_FILE_BYTES = 25 * 1024 * 1024;
  var MAX_FILE_CHARS = 40000;
  var MAX_TOTAL_CHARS = 100000;
  var items = [];
  var busy = false;
  var lastSent = null;
  var nativeFetch = window.fetch.bind(window);

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
    if (s.length <= MAX_FILE_CHARS) return s;
    return s.slice(0, 26000) + '\n\n[중간 내용 생략]\n\n' + s.slice(-14000);
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
    if (file.size > MAX_FILE_BYTES) throw new Error('파일당 25MB까지 지원합니다.');
    var x = ext(file.name);
    if (x === 'pdf') return trimText(await readPdf(file));
    if (x === 'docx') return trimText(await readDocx(file));
    if (x === 'pptx') return trimText(await readPptx(file));
    if (x === 'ppt') throw new Error('구형 PPT는 PPTX 또는 PDF로 저장해 올려주세요.');
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
    else setMsg('최대 6개 · 파일당 25MB · PDF·PPTX·DOCX·TXT·MD·CSV·JSON·SRT·VTT 지원');
  }
  async function addFiles(list) {
    var files = Array.prototype.slice.call(list || []);
    if (!files.length) return;
    if (items.length + files.length > MAX_FILES) {
      setMsg('자료는 최대 ' + MAX_FILES + '개까지 올릴 수 있습니다.', true);
      files = files.slice(0, Math.max(0, MAX_FILES - items.length));
    }
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
      '<h2 class="msec">분석 자료 <span class="mnote">실적 발표자료 · 프레젠테이션 · 컨콜 스크립트 · 여러 파일 통합</span></h2>' +
      '<input id="clMatFile" type="file" multiple hidden accept=".pdf,.pptx,.ppt,.docx,.txt,.md,.csv,.json,.srt,.vtt,.html,.htm">' +
      '<div id="clMatDrop" class="cl-drop" role="button" tabindex="0">클릭 또는 드래그하여 자료 업로드</div>' +
      '<div id="clMatList"></div>' +
      '<p id="clMatMsg" class="cl-note" style="margin:6px 0 16px"></p>';
    heading.parentNode.insertBefore(sec, heading);
    var input = $('clMatFile'), drop = $('clMatDrop');
    drop.addEventListener('click', function () { input.click(); });
    drop.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); addFiles(e.dataTransfer.files); });
    input.addEventListener('change', function () { addFiles(input.files); input.value = ''; });
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
