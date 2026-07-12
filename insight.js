/* ===== 03 관점과 정보 얻기 — 인테이크(Claude 추출) · 선별 · 반영 =====
   규율: 뽑기 ≠ 반영. 서버(/api/insight)는 '후보 정렬'까지만 하고, 채택은 사람이 체크한다.
   · narrative 는 숫자 라우트(earnings/judgment/stage/holdings)로 못 간다 → 클라에서 signal_log 로 강등(clamp).
   · 채택돼도 숫자 파일은 자동 변경 없음 — '반영 대기'로만 04 리밸런싱에 뜬다(수기 검증 후 반영 완료 표시).
   저장소: R2(/api/insights) + localStorage 캐시. 추출: /api/insight (worker → Claude, 본문 없으면 웹검색). */
window.INSIGHT=(function(){
 var GEN='/api/insight', STORE='/api/insights', CK='ins_cache_v1';
 var recs=[], cur=null, busy=false, q='', filt='', putTimer=null;
 function $(id){return document.getElementById(id);}
 function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
 function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
 function setMsg(t){var e=$('insMsg');if(e)e.textContent=t||'';}
 var NUM={earnings:1,judgment:1,stage:1,holdings:1};
 var RT={signal_log:'시그널 로그',earnings:'실적(earnings)',judgment:'판단(judgment)',stage:'단계(gamma)',holdings:'비중(holdings)',macro:'시장 모니터링',calendar:'캘린더',none:'소음'};

 /* --- 선별 규율 --- */
 function clampClaim(c){
  c=c||{};
  c.type=(c.type==='numbers')?'numbers':'narrative';
  if(!RT[c.route])c.route='signal_log';
  if(c.type!=='numbers'&&NUM[c.route]){c.route='signal_log';c.clamped=1;}   /* narrative ≠ numbers */
  ['novelty','impact','confidence'].forEach(function(k){var v=Math.round(+c[k]);c[k]=isFinite(v)?Math.max(0,Math.min(2,v)):0;});
  c.tickers=Array.isArray(c.tickers)?c.tickers.slice(0,4):[];
  return c;
 }
 function score(c){return (c.novelty||0)+(c.impact||0)+(c.confidence||0);}
 function recommend(c){return c.route!=='none'&&score(c)>=4&&(c.impact||0)>=1;}   /* 기본 체크 = 추천일 뿐, 결정은 사람 */

 /* --- 저장(R2) --- */
 function cacheGet(){try{var v=JSON.parse(localStorage.getItem(CK)||'[]');return Array.isArray(v)?v:[];}catch(e){return [];}}
 function cacheSet(){try{localStorage.setItem(CK,JSON.stringify(recs));}catch(e){}}
 function push(){
  fetch(STORE,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(recs)})
   .then(function(r){if(!r.ok)setMsg('클라우드 저장 실패(로컬에는 보관됨)');})
   .catch(function(){setMsg('클라우드 저장 실패(로컬에는 보관됨)');});
 }
 function persist(){cacheSet();clearTimeout(putTimer);putTimer=setTimeout(push,200);renderAll();}
 function load(){
  recs=cacheGet();renderAll();
  fetch(STORE,{cache:'no-store'}).then(function(r){return r.ok?r.json():null;})
   .then(function(a){if(Array.isArray(a)){recs=a;cacheSet();renderAll();}}).catch(function(){});
 }
 function flat(){var out=[];recs.forEach(function(r){(r.claims||[]).forEach(function(c){out.push({r:r,c:c});});});return out;}
 function byScore(a,b){return score(b.c)-score(a.c)||b.r.t-a.r.t;}

 /* --- 추출 --- */
 function run(){
  if(busy)return;
  var text=($('insText').value||'').trim(), url=($('insUrl').value||'').trim();
  if(!text&&!url){setMsg('본문이나 URL 중 하나는 있어야 합니다.');return;}
  busy=true;$('insRun').disabled=true;setMsg(text?'관점 뽑는 중…':'본문이 없어 URL을 웹검색으로 확인하는 중… (최대 1~2분)');
  fetch(GEN,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:url, text:text})})
   .then(function(r){return r.json().then(function(j){return {ok:r.ok,st:r.status,j:j};});})
   .then(function(o){
    if(!o.ok||o.j.error)throw new Error(o.j.error||('HTTP '+o.st));
    var raw=((o.j.content||[]).map(function(b){return b.text||'';}).join('')||'').trim();
    var i=raw.indexOf('{'), n=raw.lastIndexOf('}');
    if(i<0||n<0)throw new Error('응답 파싱 실패');
    var pj=JSON.parse(raw.slice(i,n+1));
    var ps=pj.src||{};
    cur={id:uid(),t:Date.now(),
     src:{kind:ps.kind||'',publisher:ps.publisher||'',title:ps.title||'',url:url||ps.url||'',date:ps.date||''},
     summary:pj.summary||'', steelman:pj.steelman||'', noise:Array.isArray(pj.noise)?pj.noise:[],
     claims:(Array.isArray(pj.claims)?pj.claims:[]).slice(0,8).map(function(c){c=clampClaim(c);c.id=uid();c.pick=recommend(c);return c;})};
    renderResult();
    setMsg('추출 완료 — 체크한 관점만 저장·반영됩니다.');
   })
   .catch(function(e){setMsg('실패: '+(e&&e.message?e.message:e));})
   .then(function(){busy=false;$('insRun').disabled=false;});
 }

 /* --- 결과(선별 화면) --- */
 function claimRow(c){
  return '<div class="ins-claim'+(c.pick?'':' rej')+'" data-row="'+c.id+'">'+
   '<input type="checkbox" class="ck" data-cid="'+c.id+'"'+(c.pick?' checked':'')+'>'+
   '<div><div class="ins-txt">'+esc(c.text||'')+'</div>'+
   (c.why?'<div class="ins-why">'+esc(c.why)+'</div>':'')+
   (c.verify?'<div class="ins-vf">확인 필요 — '+esc(c.verify)+'</div>':'')+
   '<div class="ins-tags">'+
    (c.layer?'<span class="ins-tag">'+esc(c.layer)+'</span>':'')+
    (c.tickers.length?'<span class="ins-tag">'+esc(c.tickers.join(' · '))+'</span>':'')+
    '<span class="ins-tag '+(c.type==='numbers'?'num':'nar')+'">'+(c.type==='numbers'?'numbers':'narrative')+'</span>'+
    '<span class="ins-tag rt">→ '+esc(RT[c.route]||c.route)+'</span>'+
    (c.clamped?'<span class="ins-tag">내러티브 → 로그로 강등</span>':'')+
    '<span class="ins-tag">N'+c.novelty+'·I'+c.impact+'·C'+c.confidence+' ('+score(c)+'/6)</span>'+
   '</div></div></div>';
 }
 function renderResult(){
  var box=$('insResult');if(!box)return;
  if(!cur){box.hidden=true;box.innerHTML='';return;}
  box.hidden=false;
  var picked=cur.claims.filter(function(c){return c.pick;}).length;
  var sm=[cur.src.kind,cur.src.publisher,cur.src.date].filter(Boolean).join(' · ');
  box.innerHTML=(cur.src.title||sm?'<div class="ins-srcline"><b>'+esc(cur.src.title||'(제목 미판별)')+'</b>'+(sm?'<span> — '+esc(sm)+'</span>':'')+'</div>':'')+
   '<p class="ins-sum">'+esc(cur.summary||'(요약 없음)')+'</p>'+
   (cur.claims.length?cur.claims.map(claimRow).join(''):'<div class="ins-noise">유의미한 관점 없음 — 전부 소음으로 분류됐습니다.</div>')+
   (cur.steelman?'<div class="ins-steel"><b>스틸맨</b> — '+esc(cur.steelman)+'</div>':'')+
   (cur.noise.length?'<div class="ins-noise"><b>버린 것</b><br>· '+cur.noise.map(esc).join('<br>· ')+'</div>':'')+
   '<div class="ins-bar"><button class="ins-btn primary" id="insSave">채택 저장 (<span id="insPickN">'+picked+'</span>건)</button>'+
   '<button class="ins-btn" id="insDiscard">이번 자료 버리기</button>'+
   '<span class="ins-msg">체크 = 채택. 숫자 파일(실적·판단·단계·비중)은 자동으로 바뀌지 않고 <b>반영 대기</b>로만 올라갑니다.</span></div>';
  Array.prototype.forEach.call(box.querySelectorAll('.ck'),function(el){
   el.onchange=function(){
    var c=cur.claims.filter(function(x){return x.id===el.getAttribute('data-cid');})[0];if(!c)return;
    c.pick=el.checked;
    var row=box.querySelector('[data-row="'+c.id+'"]');if(row)row.className='ins-claim'+(c.pick?'':' rej');
    var n=$('insPickN');if(n)n.textContent=cur.claims.filter(function(x){return x.pick;}).length;
   };});
  var sv=$('insSave');if(sv)sv.onclick=save;
  var dc=$('insDiscard');if(dc)dc.onclick=function(){cur=null;renderResult();setMsg('버렸습니다.');};
 }
 function save(){
  if(!cur)return;
  var picked=cur.claims.filter(function(c){return c.pick;}).map(function(c){
   return {id:c.id,text:c.text||'',layer:c.layer||'',tickers:c.tickers,type:c.type,novelty:c.novelty,impact:c.impact,
           confidence:c.confidence,route:c.route,why:c.why||'',verify:c.verify||'',applied:false};});
  if(!picked.length){setMsg('채택한 관점이 없습니다 — 하나 이상 체크하세요.');return;}
  recs.unshift({id:cur.id,t:cur.t,src:cur.src,summary:cur.summary,steelman:cur.steelman,claims:picked});
  cur=null;renderResult();persist();
  ['insText','insUrl'].forEach(function(id){var e=$(id);if(e)e.value='';});
  setMsg('저장 완료 — 채택한 관점만 다른 메뉴에 반영됩니다.');
 }

 /* --- 저장 목록 --- */
 function claimLine(r,c,showBtn){
  var pend=NUM[c.route]&&!c.applied;
  return '<div class="ins-si'+(pend?' pend':'')+'">'+esc(c.text)+
   '<span class="m">'+(c.layer?esc(c.layer)+' · ':'')+esc(RT[c.route]||c.route)+' · N'+c.novelty+'I'+c.impact+'C'+c.confidence+
   (NUM[c.route]?(c.applied?' · 반영 완료':' · 반영 대기(자동 변경 없음)'):'')+'</span>'+
   (showBtn&&NUM[c.route]?'<button class="ins-btn" style="margin-top:7px;padding:4px 9px;font-size:11px" data-ap="'+c.id+'">'+(c.applied?'대기로 되돌리기':'반영 완료 표시')+'</button>':'')+
   '</div>';
 }
 function renderList(){
  var L=$('insList');if(!L)return;
  var qq=q.toLowerCase();
  var html=recs.map(function(r){
   var cs=(r.claims||[]).filter(function(c){
    if(filt==='pending')return !!NUM[c.route]&&!c.applied;
    if(filt)return c.route===filt;
    return true;});
   if(!cs.length)return '';
   if(qq){
    var hay=((r.src.title||'')+' '+(r.src.publisher||'')+' '+cs.map(function(c){return c.text+' '+c.tickers.join(' ')+' '+(c.layer||'');}).join(' ')).toLowerCase();
    if(hay.indexOf(qq)<0)return '';
   }
   return '<div class="ins-rec"><button class="ins-del" data-rid="'+r.id+'">삭제</button>'+
    '<h4>'+esc(r.src.title||'(제목 없음)')+'</h4>'+
    '<div class="meta">'+esc(r.src.kind||'')+(r.src.publisher?' · '+esc(r.src.publisher):'')+' · '+new Date(r.t).toLocaleDateString('ko-KR')+'</div>'+
    cs.map(function(c){return claimLine(r,c,true);}).join('')+'</div>';
  }).filter(Boolean).join('');
  L.innerHTML=html||'<div class="ins-noise">해당하는 관점이 없습니다. 위에 자료를 넣고 <b>관점 뽑기</b>를 누르세요.</div>';
  var cnt=$('insCount');if(cnt)cnt.textContent=recs.length?(flat().length+'개 관점 · 자료 '+recs.length+'건'):'';
  Array.prototype.forEach.call(L.querySelectorAll('[data-rid]'),function(b){
   b.onclick=function(){
    if(!window.confirm('이 자료에서 채택한 관점을 모두 삭제할까요?'))return;
    var id=b.getAttribute('data-rid');
    recs=recs.filter(function(x){return x.id!==id;});persist();};});
  Array.prototype.forEach.call(L.querySelectorAll('[data-ap]'),function(b){
   b.onclick=function(){
    var id=b.getAttribute('data-ap');
    flat().forEach(function(o){if(o.c.id===id)o.c.applied=!o.c.applied;});
    persist();};});
 }

 /* --- 반영(다른 메뉴 스트립) — 채택분만, 숫자는 '대기'로만 --- */
 function strip(id,list,head,note){
  var e=$(id);if(!e)return;
  if(!list.length){e.innerHTML='';return;}
  e.innerHTML='<div class="sh">'+head+'</div>'+list.map(function(o){
   var pend=NUM[o.c.route]&&!o.c.applied;
   return '<div class="ins-si'+(pend?' pend':'')+'">'+esc(o.c.text)+
    '<span class="m">'+(o.c.layer?esc(o.c.layer)+' · ':'')+esc(o.r.src.publisher||o.r.src.kind||'')+
    ' · '+new Date(o.r.t).toLocaleDateString('ko-KR')+(pend?' · 숫자 반영 대기':'')+'</span></div>';}).join('')+
   (note?'<div class="ins-noise">'+note+'</div>':'');
 }
 function renderStrips(){
  var f=flat();
  strip('insStripMarket',f.filter(function(o){return o.c.route==='macro';}).sort(byScore).slice(0,4),'관점과 정보 — 채택한 매크로 관점');
  strip('insStripSig',f.filter(function(o){return o.c.route==='signal_log';}).sort(byScore).slice(0,5),'관점과 정보 — 시그널 로그 후보(승격은 수동)');
  strip('insStripCal',f.filter(function(o){return o.c.route==='calendar';}).sort(byScore).slice(0,4),'관점과 정보 — 채택한 일정 관점');
  strip('insStripThread',f.filter(function(o){return /^L[1-8]$/.test(o.c.layer||'')&&o.c.route!=='none';}).sort(byScore).slice(0,4),'관점과 정보 — 채택한 레이어 관점');
  strip('insStripDec',f.filter(function(o){return !!NUM[o.c.route]&&!o.c.applied;}).sort(byScore).slice(0,5),'관점과 정보 — 숫자 반영 대기',
   '실적·판단·단계·비중 파일은 자동으로 바뀌지 않습니다. 검증 후 반영하고 03에서 <b>반영 완료</b>로 표시하세요.');
 }
 function stamp(){
  var e=$('updIns');if(!e)return;
  var t=0;recs.forEach(function(r){if(r.t>t)t=r.t;});
  e.textContent=t?('update : '+new Date(t).toLocaleString('ko-KR',{hour12:false})):'';
 }
 function renderAll(){renderList();renderStrips();stamp();}

 /* --- 파일(PDF·TXT) → 텍스트 --- */
 var _pdfP=null;
 function pdfjs(){
  if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
  if(_pdfP)return _pdfP;
  _pdfP=new Promise(function(res,rej){
   var s=document.createElement('script');
   s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
   s.onload=function(){try{window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';}catch(e){}res(window.pdfjsLib);};
   s.onerror=function(){_pdfP=null;rej(new Error('pdf.js 로드 실패'));};
   document.head.appendChild(s);});
  return _pdfP;
 }
 async function pdfText(file){
  var lib=await pdfjs();
  var buf=await file.arrayBuffer();
  var doc=await lib.getDocument({data:buf}).promise;
  var out=[],N=Math.min(doc.numPages,40);
  for(var i=1;i<=N;i++){
   var pg=await doc.getPage(i);
   var tc=await pg.getTextContent();
   out.push(tc.items.map(function(it){return it.str;}).join(' '));
  }
  return out.join('\n');
 }
 async function addFiles(files){
  for(var i=0;i<files.length;i++){
   var f=files[i];
   setMsg('읽는 중 — '+f.name);
   try{
    var t=(/\.pdf$/i.test(f.name)||f.type==='application/pdf')?await pdfText(f):await f.text();
    t=(t||'').trim();
    var ta=$('insText');
    ta.value=(ta.value?ta.value+'\n\n':'')+'--- '+f.name+' ---\n'+t;
    setMsg(f.name+' — '+t.length.toLocaleString()+'자 추출 · 종류·출처·제목은 내용에서 판별합니다');
   }catch(e){setMsg(f.name+' 추출 실패: '+(e&&e.message?e.message:e));}
  }
 }

 /* --- 바인딩 --- */
 function bind(){
  $('insRun').onclick=run;
  $('insClear').onclick=function(){['insText','insUrl'].forEach(function(id){$(id).value='';});cur=null;renderResult();setMsg('');};
  $('insDrop').onclick=function(){$('insFile').click();};
  $('insDrop').addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();$('insFile').click();}});
  $('insFile').addEventListener('change',function(e){addFiles(Array.prototype.slice.call(e.target.files||[]));e.target.value='';});
  var dz=$('insDrop');
  ['dragover','dragenter'].forEach(function(ev){dz.addEventListener(ev,function(e){e.preventDefault();dz.classList.add('drag');});});
  dz.addEventListener('dragleave',function(e){e.preventDefault();dz.classList.remove('drag');});
  dz.addEventListener('drop',function(e){e.preventDefault();dz.classList.remove('drag');addFiles(Array.prototype.slice.call((e.dataTransfer||{}).files||[]));});
  $('insSearch').oninput=function(e){q=(e.target.value||'').trim();renderList();};
  $('insFilter').onchange=function(e){filt=e.target.value;renderList();};
 }

 /* --- 자가 마운트 --- index.html 은 <script src="/insight.js"> 한 줄만 추가하고,
    탭·섹션·반영 스트립 앵커는 여기서 DOM 으로 생성한다(대용량 index.html 패치 최소화). */
 var SECTION_HTML='<div class="vhead" style="position:relative"><div class="vkick">Insight Intake · 관점과 정보</div>'+
  '<h1 class="vtitle">자료에서 <em>유의미한 것</em>만 — 그리고 선별 반영</h1>'+
  '<span class="updstamp abs" id="updIns"></span>'+
  '<p class="vsub">증권사 리포트·기사·유튜브(링크 또는 스크립트)를 넣으면 8레이어·단계 프레임으로 관점과 정보를 구조화해 뽑는다. '+
  '<b>뽑는 것과 반영하는 것은 분리한다</b> — 체크해 채택한 관점만 다른 메뉴에 뜬다. 숫자 파일(실적·판단·단계·비중)은 자동으로 바뀌지 않는다(narrative ≠ numbers).</p></div>'+
  '<div class="ins-wrap">'+
   '<div class="ins-card">'+
    '<div class="ins-row"><input class="ins-in" id="insUrl" placeholder="URL (선택 — 본문이 없으면 URL만으로 웹검색해 시도)"></div>'+
    '<textarea class="ins-ta" id="insText" style="margin-top:8px" placeholder="본문·스크립트를 붙여넣으세요. 종류·출처·제목은 내용에서 자동 판별합니다. 유튜브는 자막 스크립트를 넣는 편이 URL만 주는 것보다 정확합니다."></textarea>'+
    '<input type="file" id="insFile" accept=".pdf,.txt,.md,.csv,.json" multiple hidden>'+
    '<div class="ins-drop" id="insDrop" role="button" tabindex="0">PDF·TXT 파일을 끌어다 놓거나 클릭해 선택 — 본문 텍스트만 추출해 위 칸에 채웁니다</div>'+
    '<div class="ins-bar">'+
     '<button class="ins-btn primary" id="insRun">관점 뽑기</button>'+
     '<button class="ins-btn" id="insClear">비우기</button>'+
     '<span class="ins-msg" id="insMsg"></span>'+
    '</div>'+
   '</div>'+
   '<div class="ins-card" id="insResult" hidden></div>'+
   '<div><h2 class="ins-h2">채택한 관점 <span class="n" id="insCount"></span></h2>'+
    '<div class="ins-bar" style="margin:0 0 8px">'+
     '<input class="ins-in" id="insSearch" style="flex:1 1 200px" placeholder="검색 (내용·종목·출처)">'+
     '<select class="ins-sel" id="insFilter" style="flex:0 0 170px">'+
      '<option value="">전체</option><option value="pending">숫자 반영 대기</option>'+
      '<option value="signal_log">시그널 로그</option><option value="macro">시장 모니터링</option><option value="calendar">캘린더</option>'+
     '</select>'+
    '</div><div id="insList"></div></div>'+
  '</div>';
 function el(tag,cls,id){var e=document.createElement(tag);if(cls)e.className=cls;if(id)e.id=id;return e;}
 function anchor(id,parentSel,mode,refSel){
  if(document.getElementById(id))return;
  var p=document.querySelector(parentSel);if(!p)return;
  var d=el('div','ins-strip',id), ref=refSel?p.querySelector(refSel):null;
  if(mode==='before'&&ref)p.insertBefore(d,ref);
  else if(mode==='after'&&ref)p.insertBefore(d,ref.nextSibling);
  else p.appendChild(d);
 }
 function mount(){
  if(!document.getElementById('insight-css')){
   var l=document.createElement('link');l.id='insight-css';l.rel='stylesheet';l.href='/insight.css';document.head.appendChild(l);
  }
  var nav=document.getElementById('nav');
  if(nav&&!nav.querySelector('.tab[data-v="insight"]')){
   var b=el('button','tab');b.setAttribute('data-v','insight');
   b.innerHTML='<span class="n"></span>관점과 정보 얻기';
   var port=nav.querySelector('.tab[data-v="port"]');
   if(port)nav.insertBefore(b,port);else nav.appendChild(b);
   Array.prototype.forEach.call(nav.querySelectorAll('.tab'),function(t,i){
    var n=t.querySelector('.n');if(n)n.textContent=(i+1<10?'0':'')+(i+1);});
   nav.addEventListener('click',function(e){
    var t=e.target.closest?e.target.closest('.tab'):null;
    if(t&&t.getAttribute('data-v')==='insight')renderAll();});
  }
  var main=document.querySelector('main.wrap');
  if(main&&!document.getElementById('v-insight')){
   var sec=el('section','view','v-insight');sec.innerHTML=SECTION_HTML;
   var memo=document.getElementById('v-memo');
   if(memo)main.insertBefore(sec,memo);else main.appendChild(sec);
  }
  anchor('insStripMarket','#v-market','after','.vhead');
  anchor('insStripSig','#v-siglog','before','#signalLog');
  anchor('insStripDec','#v-decision','before','#decisionBoard');
  anchor('insStripCal','#v-cal','after','.vhead');
  anchor('insStripThread','#v-thread','after','#instantAnswer');
 }

 function init(){mount();if(!document.getElementById('insList'))return;bind();load();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 return {render:renderAll, all:function(){return recs;}, adopted:function(){return flat();}};
})();
