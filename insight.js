/* ===== 03 관점과 정보 얻기 — 인테이크(Claude 추출) · 선별 · 반영 =====
   규율: 뽑기 ≠ 반영. 서버(/api/insight)는 '후보 정렬'까지만 하고, 채택은 사람이 체크한다.
   · narrative 는 숫자 라우트(earnings/judgment/stage/holdings)로 못 간다 → 클라에서 signal_log 로 강등(clamp).
   · 채택돼도 숫자 파일은 자동 변경 없음 — '반영 대기'로만 04 리밸런싱에 뜬다(수기 검증 후 반영 완료 표시).
   저장소: R2(/api/insights) + localStorage 캐시. 추출: /api/insight (worker → Claude, 본문 없으면 웹검색). */
window.INSIGHT=(function(){
 var GEN='/api/insight', STORE='/api/insights', CK='ins_cache_v1';
 var recs=[], cur=null, busy=false, q='', filt='', putTimer=null;
 var MAXRAW=20000;   /* 원문 저장 상한(자) — R2 배열·localStorage 캐시 비대 방지. 초과분은 rawcut에 전체 길이 기록 */
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

 /* --- 등급(승격) — 관점·정보의 확신도. 기본 점수(N·I·C) + 유사 관점 보강 횟수로 산정.
    같은 얘기가 다른 자료에서 반복 채택될수록(보강) 등급이 오른다. narrative≠numbers 규율과 무관 — 표시 전용. */
 var GRD=['관찰','후보','지지','확립','확신'];   /* g0..g4 */
 function gradeOf(c){var s=score(c),r=c.reinf||0,g=(s>=5?2:s>=3?1:0)+Math.min(r,3);return Math.max(0,Math.min(4,g));}
 function ntoks(c){
  var s=((c.text||'')+' '+((c.tickers||[]).join(' '))+' '+(c.layer||'')).toLowerCase().replace(/[^가-힣a-z0-9]+/g,' ');
  var seen={},out=[];s.split(/\s+/).forEach(function(w){if(w.length>1&&!seen[w]){seen[w]=1;out.push(w);}});return out;
 }
 function jac(a,b){if(!a.length||!b.length)return 0;var m={},n=0;a.forEach(function(w){m[w]=1;});b.forEach(function(w){if(m[w])n++;});return n/(a.length+b.length-n);}
 function similar(a,b){
  var ta=a.tickers||[],tb=b.tickers||[];
  var tk=ta.some(function(x){return x&&tb.indexOf(x)>=0;});
  var j=jac(ntoks(a),ntoks(b));
  return (tk&&j>=0.16)||j>=0.5;
 }
 /* 채택분 전체를 pairwise 로 훑어 각 관점의 보강 횟수(reinf)·보강 출처(corr)·등급(grade)을 재산정.
    같은 자료(rec) 내부는 self-corroboration 이므로 제외. 파생값이라 매 렌더마다 멱등 재계산. */
 function recomputeGrades(){
  var f=flat(),i,j;
  f.forEach(function(o){o.c.reinf=0;o.c.corr=[];});
  for(i=0;i<f.length;i++)for(j=i+1;j<f.length;j++){
   if(f[i].r.id===f[j].r.id)continue;
   if(similar(f[i].c,f[j].c)){
    f[i].c.reinf++;f[j].c.reinf++;
    f[i].c.corr.push({t:f[j].r.t,title:f[j].r.src.title||''});
    f[j].c.corr.push({t:f[i].r.t,title:f[i].r.src.title||''});
   }
  }
  f.forEach(function(o){o.c.grade=gradeOf(o.c);});
 }
 /* 아직 저장 전(cur)인 관점의 채택 시 등급 예고 — 기존 채택분 중 유사 건수로 산정. */
 function previewGrade(c){
  var n=flat().filter(function(o){return similar(o.c,c);}).length;
  return {n:n,g:gradeOf({novelty:c.novelty,impact:c.impact,confidence:c.confidence,reinf:n})};
 }
 function gradeBadge(g,reinf){return '<span class="ins-gr g'+g+'">'+GRD[g]+(reinf?' · 보강 '+reinf:'')+'</span>';}

 /* --- 출처(소스 정보) — 채택 관점은 '어디서 왔는지'를 항상 달고 다닌다(시그널 로그 출처 표기 규율).
    링크는 둘: ①원문 URL(있으면) ②저장 원문 = 인테이크 때 넣은 본문(R2 보관) → /api/insights/raw?id= 영구 링크. */
 function rawUrl(r){return '/api/insights/raw?id='+encodeURIComponent(r.id);}
 function cut(s,n){s=String(s||'');return s.length>n?s.slice(0,n)+'…':s;}
 function srcBits(r){
  var s=r.src||{},b=[];
  if(s.publisher)b.push(s.publisher);
  if(s.kind)b.push(s.kind);
  if(!b.length)b.push('출처 미상');
  b.push(s.date||new Date(r.t).toLocaleDateString('ko-KR'));
  return b.join(' · ');
 }
 function srcLinks(r){
  var s=r.src||{};
  return (s.url?'<a class="ins-cs-lk" href="'+esc(s.url)+'" target="_blank" rel="noopener">원문 ↗</a>':'')+
         (r.raw?'<a class="ins-cs-lk" href="'+rawUrl(r)+'" target="_blank" rel="noopener">저장 원문 ↗</a>':'');
 }
 /* 관점 1건에 붙는 출처 줄. withTitle = 자료 카드 밖(다른 메뉴 스트립)이라 제목까지 보여줘야 하는 경우. */
 function claimSrc(r,withTitle){
  var s=r.src||{};
  return '<span class="ins-cs">출처: '+esc(srcBits(r))+
   (withTitle&&s.title?' — '+esc(cut(s.title,44)):'')+srcLinks(r)+'</span>';
 }

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
  busy=true;$('insRun').disabled=true;
  // 서버(/api/insight)는 단일 비스트리밍 호출이라 실제 서버 내부 진척은 알 수 없다.
  // 사용자에게 "멈춘 게 아니다"를 알리려 클라 단계(전송→분석→정리) + 경과초 카운터를 돌린다.
  var isUrl=!text;
  var STG=isUrl?['URL 전송','웹검색·관점 분석','결과 정리']:['자료 전송','관점 분석','결과 정리'];
  var t0=Date.now(), stage=0, progTimer=null, toAnalyze=null;
  function tick(){
   var s=Math.floor((Date.now()-t0)/1000);
   setMsg('관점 뽑는 중… ('+(stage+1)+'/3 '+STG[stage]+' · '+s+'초'+(isUrl?' · 최대 1~2분':'')+')');
  }
  function setStage(i){stage=i;tick();}
  function stopProg(){if(progTimer){clearInterval(progTimer);progTimer=null;}if(toAnalyze){clearTimeout(toAnalyze);toAnalyze=null;}}
  progTimer=setInterval(tick,1000); setStage(0);
  toAnalyze=setTimeout(function(){if(stage<1)setStage(1);},900); // 전송은 짧다 → 곧 분석 단계로
  fetch(GEN,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:url, text:text})})
   .then(function(r){return r.json().then(function(j){return {ok:r.ok,st:r.status,j:j};});})
   .then(function(o){
    setStage(2); // 응답 수신 → 결과 정리
    if(!o.ok||o.j.error)throw new Error(o.j.error||('HTTP '+o.st));
    var raw=((o.j.content||[]).map(function(b){return b.text||'';}).join('')||'').trim();
    var i=raw.indexOf('{'), n=raw.lastIndexOf('}');
    if(i<0||n<0)throw new Error('응답 파싱 실패');
    var pj=JSON.parse(raw.slice(i,n+1));
    var ps=pj.src||{};
    var rawFull=text||'';   /* 뽑을 때 넣은 원문(스크립트/본문). URL만 준 경우 빈 문자열 */
    cur={id:uid(),t:Date.now(),
     src:{kind:ps.kind||'',publisher:ps.publisher||'',title:ps.title||'',url:url||ps.url||'',date:ps.date||''},
     summary:pj.summary||'', steelman:pj.steelman||'', noise:Array.isArray(pj.noise)?pj.noise:[],
     raw:rawFull.length>MAXRAW?rawFull.slice(0,MAXRAW):rawFull,   /* 원문 저장(상한 캡) */
     rawcut:rawFull.length>MAXRAW?rawFull.length:0,               /* 잘렸으면 전체 길이 */
     claims:(Array.isArray(pj.claims)?pj.claims:[]).slice(0,8).map(function(c){c=clampClaim(c);c.id=uid();c.pick=recommend(c);return c;})};
    renderResult();
    stopProg();
    setMsg('추출 완료 — 체크한 관점만 저장·반영됩니다.');
   })
   .catch(function(e){stopProg();setMsg('실패: '+(e&&e.message?e.message:e));})
   .then(function(){stopProg();busy=false;$('insRun').disabled=false;});
 }

 /* --- 결과(선별 화면) --- */
 function claimRow(c){
  var pv=previewGrade(c);
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
    '<span class="ins-tag gpv g'+pv.g+'">'+(pv.n?'기존 '+pv.n+'건 보강 → '+GRD[pv.g]:'신규 · '+GRD[pv.g])+'</span>'+
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
  recs.unshift({id:cur.id,t:cur.t,src:cur.src,summary:cur.summary,steelman:cur.steelman,raw:cur.raw||'',rawcut:cur.rawcut||0,claims:picked});
  cur=null;renderResult();persist();
  ['insText','insUrl'].forEach(function(id){var e=$(id);if(e)e.value='';});
  setMsg('저장 완료 — 채택한 관점만 다른 메뉴에 반영됩니다.');
 }

 /* --- 시그널 로그 (2026-07-14 · 03으로 이관) -----------------------------------
    구 `#v-siglog` 독립 메뉴는 6탭 재편 때 nav에서 빠져 도달 불가한 고아 뷰가 됐다.
    → 로그를 03의 '채택한 관점' 밑으로 옮긴다. 시그널은 관점을 뒷받침하는 컨텍스트지
      그 자체로 독립 화면이 아니다(누적 판단 컨텍스트 — OPS §0-4).
    데이터: index.html 전역 `window.SIGNAL_LOG`(인라인 히스토리 + signal_log.json 병합분) 우선,
            없으면 signal_log.json 직접 페치(폴백 — 03은 index.html 로드 순서에 의존하지 않는다).
    매칭:   ①티커가 시그널 본문·출처에 등장 → 정밀 매칭(이것만 씀)  ②없으면 레이어 일치
    미연결: 어느 관점에도 안 붙은 시그널은 하단 블록에 전건 보존(로그는 아카이브가 아니라 컨텍스트 — 유실 금지). */
 var SIG=[], SIGCTX={all:[],used:{}}, sigN=-1;
 function sigStrip(h){return String(h||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
 /* 전역 SIGNAL_LOG 읽기. index.html 은 `let SIGNAL_LOG=[...]`(인라인 히스토리) 로 선언하고
    signal_log.json 이 도착하면 `SIGNAL_LOG=SIGNAL_LOG.concat(...)` 로 재할당한다.
    top-level `let` 은 window 에 안 붙지만 클래식 스크립트 간 전역 렉시컬 환경은 공유되므로
    bare 식별자로 읽힌다(insight.js 는 defer → 인라인 실행 후라 TDZ 아님). index.html 무패치. */
 function sigGlobal(){
  try{if(typeof SIGNAL_LOG!=='undefined'&&Array.isArray(SIGNAL_LOG))return SIGNAL_LOG;}catch(x){}
  return null;
 }
 /* 병합은 비동기라 init 시점엔 인라인분만 있을 수 있다 → 길이가 늘면 재렌더(추종). */
 function sigSync(){
  var g=sigGlobal();
  if(!g||g.length===sigN)return false;
  SIG=g;sigN=g.length;return true;
 }
 function sigLoad(){
  if(sigSync())renderAll();
  [900,2500,6000].forEach(function(ms){setTimeout(function(){if(sigSync())renderAll();},ms);});
  if(sigGlobal())return;   /* 전역이 있으면 폴백 페치 불필요 */
  fetch('./signal_log.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;})
   .then(function(d){if(!sigGlobal()&&d&&Array.isArray(d.log)&&d.log.length){SIG=d.log;sigN=d.log.length;renderAll();}}).catch(function(){});
 }
 /* 엔트리 → 아이템 평탄화(엔트리 메타를 아이템에 부착) · 최신순 */
 function sigFlat(){
  var out=[];
  SIG.forEach(function(en,ei){
   if(!en||!Array.isArray(en.items))return;
   var srcs=(en.srcs||[]).map(function(s){return s&&s.label||'';}).filter(Boolean).join(' · ');
   en.items.forEach(function(it,ii){
    if(!it)return;
    /* tx = 티커 매칭 대상. 엔트리 메타(source·srcs)는 제외한다 —
       한 인테이크에 여러 종목이 섞이면(예: "MRVL·MU 뉴스") 엔트리 텍스트로는 서로를 오매칭한다.
       시그널의 주장은 items[].html 에 있다. */
    out.push({key:ei+'#'+ii, date:en.date||'', at:en.at||en.date||'', source:en.source||'', srcs:srcs,
      tag:it.tag||'', layer:it.layer||'', col:it.col||'#868e96', html:it.html||'',
      tx:(sigStrip(it.html)+' '+(it.tag||'')).toUpperCase()});
   });
  });
  out.sort(function(a,b){return a.at<b.at?1:a.at>b.at?-1:0;});
  return out;
 }
 function sigFor(c,all){
  var tk=(c.tickers||[]).filter(Boolean);
  if(tk.length){
   var byTk=all.filter(function(s){
    return tk.some(function(t){return s.tx.indexOf(String(t).toUpperCase())>=0;});});
   if(byTk.length)return byTk.slice(0,4);
  }
  if(/^L[1-8]$/.test(c.layer||''))return all.filter(function(s){return s.layer===c.layer;}).slice(0,3);
  return [];
 }
 /* 매칭은 표시 필터와 무관하게 채택분 전체 기준으로 한 번만 산정(멱등) */
 function sigCtx(){
  var all=sigFlat(), used={};
  flat().forEach(function(o){sigFor(o.c,all).forEach(function(s){used[s.key]=1;});});
  return {all:all,used:used};
 }
 function sigItem(s){
  return '<div class="ins-sig-it">'+
   (s.tag?'<span class="ins-sig-tag" style="background:'+esc(s.col)+'22;color:'+esc(s.col)+'">'+esc(s.tag)+'</span>':'')+
   '<div class="ins-sig-tx">'+s.html+'</div>'+
   '<div class="ins-sig-m">'+esc(s.date)+(s.source?' · '+esc(cut(s.source,72)):'')+
   (s.srcs?'<span class="ins-cs">출처: '+esc(cut(s.srcs,80))+'</span>':'')+'</div></div>';
 }
 function sigBlock(c){
  var list=sigFor(c,SIGCTX.all);
  if(!list.length)return '';
  return '<div class="ins-sig"><div class="ins-sig-h">관련 시그널 로그 · '+list.length+'건</div>'+
   list.map(sigItem).join('')+'</div>';
 }
 /* 미연결 시그널 — 관점이 아직 안 붙은 로그. 로그는 삭제되지 않는다. */
 function renderSigRest(){
  var e=$('insSigRest');if(!e)return;
  var rest=SIGCTX.all.filter(function(s){return !SIGCTX.used[s.key];});
  if(!SIGCTX.all.length){e.innerHTML='';return;}
  if(!rest.length){
   e.innerHTML='<h2 class="ins-h2">미연결 시그널 <span class="n">0개 — 모든 시그널이 관점에 붙었습니다</span></h2>';
   return;
  }
  e.innerHTML='<h2 class="ins-h2">미연결 시그널 <span class="n">'+rest.length+'개 · 관점 '+SIGCTX.all.length+'건 중</span></h2>'+
   '<div class="ins-noise" style="margin-bottom:8px">아직 어떤 채택 관점과도 티커·레이어가 겹치지 않는 시그널입니다. '+
   '해당 종목·레이어의 관점을 채택하면 자동으로 그 관점 아래로 들어갑니다.</div>'+
   '<div class="ins-sig rest">'+rest.map(sigItem).join('')+'</div>';
  try{if(window.vcDecorate)window.vcDecorate(e);}catch(x){}
 }

 /* --- 저장 목록 --- */
 function claimLine(r,c,showBtn){
  var pend=NUM[c.route]&&!c.applied;
  return '<div class="ins-si'+(pend?' pend':'')+'">'+gradeBadge(c.grade||0,c.reinf)+' '+esc(c.text)+
   '<span class="m">'+(c.layer?esc(c.layer)+' · ':'')+esc(RT[c.route]||c.route)+' · N'+c.novelty+'I'+c.impact+'C'+c.confidence+
   (c.reinf?' · 유사 '+c.reinf+'건 보강':'')+
   (NUM[c.route]?(c.applied?' · 반영 완료':' · 반영 대기(자동 변경 없음)'):'')+'</span>'+
   claimSrc(r,false)+
   (showBtn&&NUM[c.route]?'<button class="ins-btn" style="margin-top:7px;padding:4px 9px;font-size:12px" data-ap="'+c.id+'">'+(c.applied?'대기로 되돌리기':'반영 완료 표시')+'</button>':'')+
   sigBlock(c)+
   '</div>';
 }
 function renderList(){
  var L=$('insList');if(!L)return;
  var qq=q.toLowerCase();
  var html=recs.map(function(r){
   var cs=(r.claims||[]).filter(function(c){
    if(filt==='pending')return !!NUM[c.route]&&!c.applied;
    if(/^g[0-4]$/.test(filt))return (c.grade||0)===+filt.slice(1);
    if(filt)return c.route===filt;
    return true;});
   if(!cs.length)return '';
   if(qq){
    var hay=((r.src.title||'')+' '+(r.src.publisher||'')+' '+cs.map(function(c){return c.text+' '+c.tickers.join(' ')+' '+(c.layer||'');}).join(' ')).toLowerCase();
    if(hay.indexOf(qq)<0)return '';
   }
   var s=r.src||{};
   var lk=s.url?'<a class="ins-src-lk" href="'+esc(s.url)+'" target="_blank" rel="noopener">원문 링크 ↗</a>':'';
   var rb=r.raw?'<button class="ins-src-lk" data-raw="'+r.id+'">원문 보기</button>':'';
   var pl=r.raw?'<a class="ins-src-lk" href="'+rawUrl(r)+'" target="_blank" rel="noopener">저장 원문 ↗</a>':'';
   var bar=(lk||rb||pl)?'<div class="ins-srcbar">'+lk+rb+pl+'</div>':'';
   var rawbox=r.raw?'<pre class="ins-raw" id="raw-'+r.id+'" hidden></pre>':'';
   return '<div class="ins-rec"><button class="ins-del" data-rid="'+r.id+'">삭제</button>'+
    '<h4>'+esc(r.src.title||'(제목 없음)')+'</h4>'+
    '<div class="meta">'+esc(r.src.kind||'')+(r.src.publisher?' · '+esc(r.src.publisher):'')+' · '+new Date(r.t).toLocaleDateString('ko-KR')+'</div>'+
    bar+rawbox+
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
  Array.prototype.forEach.call(L.querySelectorAll('[data-raw]'),function(b){
   b.onclick=function(){
    var id=b.getAttribute('data-raw'), box=document.getElementById('raw-'+id);if(!box)return;
    if(box.hidden){
     if(!box.getAttribute('data-filled')){
      var rec=recs.filter(function(x){return x.id===id;})[0];
      var t=rec&&rec.raw||'';
      if(rec&&rec.rawcut)t+='\n\n…(원문 '+rec.rawcut.toLocaleString()+'자 중 앞 '+t.length.toLocaleString()+'자만 저장됨)';
      box.textContent=t;box.setAttribute('data-filled','1');
     }
     box.hidden=false;b.textContent='원문 닫기';
    }else{box.hidden=true;b.textContent='원문 보기';}
   };});
  /* 중첩된 시그널 로그 본문의 종목명·티커 → 밸류체인 호버 팝업(index.html 전역 재사용) */
  try{if(window.vcDecorate)window.vcDecorate(L);}catch(x){}
 }

 /* --- 등급 보드 — 채택 관점을 등급별 집계, 칸 클릭 시 그 등급으로 필터 --- */
 function renderGradeBoard(){
  var e=$('insGradeBoard');if(!e)return;
  var f=flat();
  if(!f.length){e.innerHTML='';return;}
  var cnt=[0,0,0,0,0];f.forEach(function(o){cnt[o.c.grade||0]++;});
  var cells='';
  for(var g=4;g>=0;g--){
   cells+='<button class="ins-gcell g'+g+(filt==='g'+g?' on':'')+'" data-g="'+g+'">'+
    '<span class="gn">'+GRD[g]+'</span><span class="gc">'+cnt[g]+'</span></button>';
  }
  e.innerHTML='<div class="ins-gtitle">등급 — 유사 관점이 보강될수록 승격</div><div class="ins-grow">'+cells+'</div>';
  Array.prototype.forEach.call(e.querySelectorAll('[data-g]'),function(b){
   b.onclick=function(){
    var v='g'+b.getAttribute('data-g');
    filt=(filt===v)?'':v;
    var sel=$('insFilter');if(sel&&/^g[0-4]$/.test(filt))sel.value='';   /* 등급 필터는 셀렉트에 없음 → 셀렉트 초기화 */
    renderGradeBoard();renderList();
   };});
 }

 /* --- 반영(다른 메뉴 스트립) — 채택분만, 숫자는 '대기'로만 --- */
 function strip(id,list,head,note){
  var e=$(id);if(!e)return;
  if(!list.length){e.innerHTML='';return;}
  e.innerHTML='<div class="sh">'+head+'</div>'+list.map(function(o){
   var pend=NUM[o.c.route]&&!o.c.applied;
   return '<div class="ins-si'+(pend?' pend':'')+'">'+gradeBadge(o.c.grade||0,o.c.reinf)+' '+esc(o.c.text)+
    '<span class="m">'+(o.c.layer?esc(o.c.layer)+' · ':'')+esc(RT[o.c.route]||o.c.route)+
    (pend?' · 숫자 반영 대기':'')+'</span>'+claimSrc(o.r,true)+'</div>';}).join('')+
   (note?'<div class="ins-noise">'+note+'</div>':'');
 }
 function renderStrips(){
  var f=flat();
  strip('insStripMarket',f.filter(function(o){return o.c.route==='macro';}).sort(byScore).slice(0,4),'관점과 정보 — 채택한 매크로 관점');
  /* insStripSig 폐지 — 앵커였던 #v-siglog 가 사라졌고, 시그널 로그는 03의 관점 아래로 들어왔다. */
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
 function renderAll(){recomputeGrades();SIGCTX=sigCtx();renderGradeBoard();renderList();renderSigRest();renderStrips();stamp();}

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
 /* 텍스트 레이어 품질 판정 = 실제 글자(한글·영숫자) 수. 스캔 PDF(빈 텍스트)와
    ToUnicode 깨진 PDF(글자가 —·치환문자로만 매핑) 둘 다 실글자 수가 0에 수렴한다.
    실측(20260716_CXMT.pdf): Word 2019 Batang CID 폰트가 전 글자를 U+2014(—)로 매핑
    → getTextContent 는 "— — —"만 준다. 실글자 수로 판정해 OCR 로 폴백한다. */
 function realLetters(s){var m=String(s||'').match(/[가-힣a-zA-Z0-9]/g);return m?m.length:0;}
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
  var txt=out.join('\n');
  /* 텍스트 레이어가 비었거나 깨졌으면(실글자 < 페이지당 8자 수준) 렌더→OCR 폴백.
     OCR 은 정상 텍스트 PDF 에도 안전(느릴 뿐)이라 컷은 보수적으로 둔다. */
  if(realLetters(txt)<Math.max(24,N*8))return await pdfOcr(doc,N);
  return txt;
 }
 /* PDF 페이지를 캔버스로 렌더 → tesseract(kor+eng) OCR. 이미지 OCR 워커 재사용. 클라 전용·서버 무변경. */
 async function pdfOcr(doc,N){
  var w=await ocrWorker();
  var M=Math.min(N,20),out=[];   /* OCR 은 느리다 → 앞 20페이지 상한(리포트 본문은 앞부분 집중) */
  for(var i=1;i<=M;i++){
   setMsg('텍스트 레이어가 없어 OCR 로 읽는 중 — '+i+'/'+M+' 페이지');
   var pg=await doc.getPage(i);
   var vp=pg.getViewport({scale:2.2});   /* ~158dpi 상당 — 한글 인식 정확도 확보 */
   var cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;
   await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
   var r=await w.recognize(cv);
   out.push(r&&r.data&&r.data.text?r.data.text:'');
   cv.width=cv.height=0;   /* 캔버스 메모리 해제 */
  }
  var t=out.join('\n').replace(/[ \t]+\n/g,'\n').trim();
  if(N>M)t+='\n\n…(총 '+N+'페이지 중 앞 '+M+'페이지만 OCR)';
  return t;
 }

 /* --- 이미지(캡처·붙여넣기) → 글자 인식(OCR) --- */
 var _tessP=null;
 function tesseract(){
  if(window.Tesseract)return Promise.resolve(window.Tesseract);
  if(_tessP)return _tessP;
  _tessP=new Promise(function(res,rej){
   var s=document.createElement('script');
   s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
   s.onload=function(){res(window.Tesseract);};
   s.onerror=function(){_tessP=null;rej(new Error('tesseract.js 로드 실패'));};
   document.head.appendChild(s);});
  return _tessP;
 }
 var _ocrW=null;
 async function ocrWorker(){
  if(_ocrW)return _ocrW;
  var T=await tesseract();
  _ocrW=await T.createWorker(['kor','eng'],1,{logger:function(m){
   if(m&&m.status==='recognizing text')setMsg('글자 인식 중 — '+Math.round((m.progress||0)*100)+'%');
  }});
  return _ocrW;
 }
 async function ocrImage(file){
  var w=await ocrWorker();
  var r=await w.recognize(file);
  return (r&&r.data&&r.data.text?r.data.text:'').replace(/[ \t]+\n/g,'\n').trim();
 }
 function isImg(f){return /^image\//.test(f.type||'')||/\.(png|jpe?g|gif|bmp|webp)$/i.test(f.name||'');}

 async function addFiles(files){
  for(var i=0;i<files.length;i++){
   var f=files[i];
   var img=isImg(f),name=f.name||(img?'붙여넣은 이미지':'파일');
   setMsg((img?'이미지 글자 인식 준비 — ':'읽는 중 — ')+name);
   try{
    var t=img?await ocrImage(f)
            :(/\.pdf$/i.test(f.name)||f.type==='application/pdf')?await pdfText(f):await f.text();
    t=(t||'').trim();
    var ta=$('insText');
    ta.value=(ta.value?ta.value+'\n\n':'')+'--- '+name+' ---\n'+t;
    setMsg(name+' — '+t.length.toLocaleString()+'자 '+(img?'인식':'추출')+' · 종류·출처·제목은 내용에서 판별합니다');
   }catch(e){setMsg(name+(img?' 글자 인식 실패: ':' 추출 실패: ')+(e&&e.message?e.message:e));}
  }
 }
 function pasteImgs(e){
  var items=((e.clipboardData||window.clipboardData||{}).items)||[],imgs=[];
  for(var i=0;i<items.length;i++){
   if(items[i].kind==='file'&&/^image\//.test(items[i].type||'')){
    var f=items[i].getAsFile();if(f)imgs.push(f);
   }
  }
  if(imgs.length){e.preventDefault();addFiles(imgs);}
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
  $('insText').addEventListener('paste',pasteImgs);
  dz.addEventListener('paste',pasteImgs);
  $('insSearch').oninput=function(e){q=(e.target.value||'').trim();renderList();};
  $('insFilter').onchange=function(e){filt=e.target.value;renderGradeBoard();renderList();};
 }

 /* --- 자가 마운트 --- index.html 은 <script src="/insight.js"> 한 줄만 추가하고,
    탭·섹션·반영 스트립 앵커는 여기서 DOM 으로 생성한다(대용량 index.html 패치 최소화). */
 var SECTION_HTML='<div class="vhead" style="position:relative"><div class="vkick">Insight Intake · 관점과 정보</div>'+
  '<h1 class="vtitle">자료에서 <em>유의미한 것</em>만 — 그리고 선별 반영</h1>'+
  '<span class="updstamp abs" id="updIns"></span>'+
  '<p class="vsub">증권사 리포트·기사·유튜브(링크 또는 스크립트)를 넣으면 8레이어·단계 프레임으로 관점과 정보를 구조화해 뽑는다. '+
  '<b>뽑는 것과 반영하는 것은 분리한다</b> — 체크해 채택한 관점만 다른 메뉴에 뜬다. 숫자 파일(실적·판단·단계·비중)은 자동으로 바뀌지 않는다(narrative ≠ numbers). '+
  '채택 관점은 <b>등급</b>(관찰→후보→지지→확립→확신)을 갖고, 다른 자료에서 유사한 내용이 보강될수록 자동 승격된다. '+
  '<b>시그널 로그</b>는 관련 관점 밑에 붙어 그 관점의 누적 컨텍스트가 된다 — 티커가 겹치면 종목 기준, 없으면 레이어 기준으로 매칭된다.</p></div>'+
  '<div class="ins-wrap">'+
   '<div class="ins-card">'+
    '<div class="ins-row"><input class="ins-in" id="insUrl" placeholder="URL (선택 — 본문이 없으면 URL만으로 웹검색해 시도)"></div>'+
    '<textarea class="ins-ta" id="insText" style="margin-top:8px" placeholder="본문·스크립트를 붙여넣으세요. 캡처 이미지를 붙여넣으면(Ctrl/⌘+V) 글자를 인식해 채웁니다. 종류·출처·제목은 내용에서 자동 판별합니다. 유튜브는 자막 스크립트를 넣는 편이 URL만 주는 것보다 정확합니다."></textarea>'+
    '<input type="file" id="insFile" accept=".pdf,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.gif,.bmp,.webp,image/*" multiple hidden>'+
    '<div class="ins-drop" id="insDrop" role="button" tabindex="0">PDF·TXT·이미지 파일을 끌어다 놓거나 클릭해 선택 · 캡처 이미지는 붙여넣기(Ctrl/⌘+V)만 해도 글자를 인식합니다</div>'+
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
    '</div><div class="ins-gboard" id="insGradeBoard"></div><div id="insList"></div></div>'+
   '<div id="insSigRest"></div>'+
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
   /* 전문가 원탁(council)을 리밸런싱(port) 앞으로 → 04 전문가 원탁 · 05 리밸런싱 (SimpleorNothing 지시 2026-07-17) */
   var council=nav.querySelector('.tab[data-v="council"]');
   if(council&&port)nav.insertBefore(council,port);
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
  /* 고아 뷰 정리 — #v-siglog 는 6탭 재편 때 nav 탭을 잃어 도달 불가였다.
     로그가 03으로 들어왔으니 죽은 섹션은 걷어낸다. index.html 의 renderSignalLog() 는
     `if(!el)return;` 가드가 있어 섹션이 없으면 조용히 no-op 이 된다(패치 불필요). */
  var orphan=document.getElementById('v-siglog');
  if(orphan&&orphan.parentNode)orphan.parentNode.removeChild(orphan);

  anchor('insStripMarket','#v-market','after','.vhead');
  anchor('insStripDec','#v-decision','before','#decisionBoard');
  anchor('insStripCal','#v-cal','after','.vhead');
  anchor('insStripThread','#v-thread','after','#instantAnswer');
 }

 function init(){mount();if(!document.getElementById('insList'))return;bind();load();sigLoad();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 return {render:renderAll, all:function(){return recs;}, adopted:function(){return flat();}};
})();
