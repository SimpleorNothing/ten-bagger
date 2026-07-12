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

 /* ===== 근거 등급(Evidence Grade) — 유사 관점이 다른 출처에서 보강되면 자동 승격 =====
    E1 관측(단일 출처) → E2 정황(복수 출처 또는 고임팩트) → E3 확증(독립 3출처, 또는 2출처+숫자)
    → E4 확립(3출처 + 숫자 + 고점수). 승격은 파생값이다 — 채택 시각순으로 재생해 매번 다시 계산하므로
    스키마 변경·수기 등급 부여가 없다. **등급이 올라가도 숫자 파일은 자동으로 바뀌지 않는다**(narrative ≠ numbers):
    E4 는 '숫자 검증 대상' 자격일 뿐이고, 반영은 사람이 검증 후 04에서 표시한다. */
 var GRADE=[{k:'E1',nm:'관측'},{k:'E2',nm:'정황'},{k:'E3',nm:'확증'},{k:'E4',nm:'확립'}];
 var STALE_D=60;   /* 최근 보강 60일 초과 = 식음(표시만·강등 없음) */
 var STOP={'그리고':1,'하지만':1,'대비':1,'전망':1,'가능성':1,'것으로':1,'있다':1,'했다':1,'된다':1,'대한':1,'관련':1,'이상':1,'통해':1,'위해':1,'대해':1,'있는':1,'되는':1,'예상':1,'수준':1,'경우':1,'the':1,'and':1,'for':1,'with':1,'that':1,'from':1,'this':1};
 function toks(s){
  var out={};
  String(s==null?'':s).toLowerCase().replace(/[^0-9a-z가-힣]+/g,' ').split(/\s+/).forEach(function(w){
   if(w.length<2||STOP[w])return;
   if(/^\d+$/.test(w)&&w.length<3)return;
   out[w]=1;
   if(/^[가-힣]{4,}$/.test(w))out[w.slice(0,3)]=1;   /* 조사 흡수용 어간 근사 */
  });
  return out;
 }
 function dice(a,b){
  var ka=Object.keys(a),kb=Object.keys(b);
  if(!ka.length||!kb.length)return 0;
  var i=0;ka.forEach(function(k){if(b[k])i++;});
  return 2*i/(ka.length+kb.length);
 }
 function tkz(c){if(!c._tk)c._tk=toks((c.text||'')+' '+(c.why||''));return c._tk;}
 function linked(a,b){
  var d=dice(tkz(a),tkz(b));
  var sameTk=(a.tickers||[]).some(function(x){return (b.tickers||[]).indexOf(x)>=0;});
  var sameLy=!!a.layer&&a.layer===b.layer;
  if(sameTk&&d>=.18)return true;    /* 같은 종목 + 내용 겹침 */
  if(sameLy&&d>=.28)return true;    /* 같은 레이어 + 내용 겹침 */
  return d>=.36;                    /* 종목·레이어 없이도 내용이 충분히 겹침 */
 }
 function gradeOf(st){
  if(st.srcN>=3&&st.num&&st.max>=5)return 3;               /* E4 확립 */
  if(st.srcN>=3||(st.srcN>=2&&st.num))return 2;            /* E3 확증 */
  if(st.srcN>=2||st.max>=5)return 1;                       /* E2 정황 */
  return 0;                                                /* E1 관측 */
 }
 function srcKey(r){return String((r.src&&(r.src.publisher||r.src.title||r.src.kind))||'?').trim().toLowerCase();}
 function uniq(a){var s={},o=[];a.forEach(function(v){if(v&&!s[v]){s[v]=1;o.push(v);}});return o;}
 function tally(mem){   /* 채택 시각순 재생 → 최종 등급 + 승격 이력 */
  var st={srcs:[],srcN:0,num:false,max:0},tl=[],g=-1;
  mem.forEach(function(o){
   var s=srcKey(o.r);if(st.srcs.indexOf(s)<0){st.srcs.push(s);st.srcN++;}
   if(o.c.type==='numbers')st.num=true;
   var sc=score(o.c);if(sc>st.max)st.max=sc;
   var ng=gradeOf(st);
   if(ng>g){g=ng;tl.push({g:ng,t:o.r.t});}
  });
  return {g:g<0?0:g,tl:tl,srcN:st.srcN,num:st.num,max:st.max};
 }
 var CL=[],CIX={};
 function cluster(){
  var f=flat().sort(function(a,b){return a.r.t-b.r.t;});   /* 오래된 것부터 = 승격 재생 */
  var cl=[];
  f.forEach(function(o){
   var hit=null;
   for(var i=0;i<cl.length&&!hit;i++)
    for(var j=0;j<cl[i].m.length;j++)
     if(linked(o.c,cl[i].m[j].c)){hit=cl[i];break;}
   if(!hit){hit={id:'k'+o.c.id,m:[]};cl.push(hit);}
   hit.m.push(o);
  });
  cl.forEach(function(k){
   var t=tally(k.m);
   k.g=t.g;k.tl=t.tl;k.srcN=t.srcN;k.num=t.num;k.max=t.max;
   k.last=k.m.reduce(function(m,o){return Math.max(m,o.r.t);},0);
   k.stale=(Date.now()-k.last)>STALE_D*864e5;
   k.pend=k.m.some(function(o){return NUM[o.c.route]&&!o.c.applied;});
   k.layers=uniq(k.m.map(function(o){return o.c.layer;}));
   k.tickers=uniq([].concat.apply([],k.m.map(function(o){return o.c.tickers||[];})));
   k.top=k.m.slice().sort(function(a,b){return score(b.c)-score(a.c)||b.r.t-a.r.t;})[0];
  });
  cl.sort(function(a,b){return b.g-a.g||b.m.length-a.m.length||b.last-a.last;});
  CL=cl;CIX={};
  cl.forEach(function(k){k.m.forEach(function(o){CIX[o.c.id]=k;});});
  return cl;
 }
 function gr(id){var k=CIX[id];return k?k.g:0;}
 function gbadge(g,stale){return '<span class="ins-g g'+(g+1)+(stale?' st':'')+'">'+GRADE[g].k+' '+GRADE[g].nm+'</span>';}
 function md(t){var d=new Date(t);return (d.getMonth()+1)+'/'+d.getDate();}
 function cut(s,n){s=String(s||'');return s.length>n?s.slice(0,n)+'…':s;}
 /* 추출 결과 화면용 — 이 관점을 채택하면 어느 클러스터를 보강하고 등급이 어떻게 되는가 */
 function preview(c){
  var hit=null;
  for(var i=0;i<CL.length&&!hit;i++)
   for(var j=0;j<CL[i].m.length;j++)
    if(linked(c,CL[i].m[j].c)){hit=CL[i];break;}
  if(!hit)return {k:null,now:-1,g:gradeOf({srcN:1,num:c.type==='numbers',max:score(c)})};
  var t=tally(hit.m.concat([{r:{t:Date.now(),src:(cur&&cur.src)||{}},c:c}]));
  return {k:hit,now:hit.g,g:t.g};
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
  busy=true;$('insRun').disabled=true;setMsg(text?'관점 뽑는 중…':'본문이 없어 URL을 웹검색으로 확인하는 중… (최대 1~2분)');
  fetch(GEN,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
    kind:$('insKind').value, publisher:($('insPub').value||'').trim(), title:($('insTitle').value||'').trim(), url:url, text:text})})
   .then(function(r){return r.json().then(function(j){return {ok:r.ok,st:r.status,j:j};});})
   .then(function(o){
    if(!o.ok||o.j.error)throw new Error(o.j.error||('HTTP '+o.st));
    var raw=((o.j.content||[]).map(function(b){return b.text||'';}).join('')||'').trim();
    var i=raw.indexOf('{'), n=raw.lastIndexOf('}');
    if(i<0||n<0)throw new Error('응답 파싱 실패');
    var pj=JSON.parse(raw.slice(i,n+1));
    cur={id:uid(),t:Date.now(),
     src:{kind:$('insKind').value,publisher:($('insPub').value||'').trim(),title:(($('insTitle').value||'').trim()||((pj.src||{}).title||'')),url:url,date:(pj.src||{}).date||''},
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
  var pv=preview(c);
  var gtag=pv.k
   ? '<span class="ins-tag gp'+(pv.g>pv.now?' up':'')+'">기존 관점 보강 · '+GRADE[pv.now].k+(pv.g>pv.now?' → '+GRADE[pv.g].k+' '+GRADE[pv.g].nm+' 승격':' 유지')+'</span>'
   : '<span class="ins-tag gp">신규 관점 · '+GRADE[pv.g].k+' '+GRADE[pv.g].nm+'</span>';
  return '<div class="ins-claim'+(c.pick?'':' rej')+'" data-row="'+c.id+'">'+
   '<input type="checkbox" class="ck" data-cid="'+c.id+'"'+(c.pick?' checked':'')+'>'+
   '<div><div class="ins-txt">'+esc(c.text||'')+'</div>'+
   (c.why?'<div class="ins-why">'+esc(c.why)+'</div>':'')+
   (c.verify?'<div class="ins-vf">확인 필요 — '+esc(c.verify)+'</div>':'')+
   (pv.k?'<div class="ins-vf">보강 대상 — '+esc(cut(pv.k.top.c.text,54))+' (출처 '+pv.k.srcN+' · 관점 '+pv.k.m.length+')</div>':'')+
   '<div class="ins-tags">'+
    (c.layer?'<span class="ins-tag">'+esc(c.layer)+'</span>':'')+
    (c.tickers.length?'<span class="ins-tag">'+esc(c.tickers.join(' · '))+'</span>':'')+
    '<span class="ins-tag '+(c.type==='numbers'?'num':'nar')+'">'+(c.type==='numbers'?'numbers':'narrative')+'</span>'+
    '<span class="ins-tag rt">→ '+esc(RT[c.route]||c.route)+'</span>'+
    (c.clamped?'<span class="ins-tag">내러티브 → 로그로 강등</span>':'')+
    '<span class="ins-tag">N'+c.novelty+'·I'+c.impact+'·C'+c.confidence+' ('+score(c)+'/6)</span>'+
    gtag+
   '</div></div></div>';
 }
 function renderResult(){
  var box=$('insResult');if(!box)return;
  if(!cur){box.hidden=true;box.innerHTML='';return;}
  box.hidden=false;cluster();
  var picked=cur.claims.filter(function(c){return c.pick;}).length;
  box.innerHTML='<p class="ins-sum">'+esc(cur.summary||'(요약 없음)')+'</p>'+
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
  var sel=cur.claims.filter(function(c){return c.pick;});
  var promo=sel.map(preview).filter(function(p){return p.k&&p.g>p.now;});
  var picked=sel.map(function(c){
   return {id:c.id,text:c.text||'',layer:c.layer||'',tickers:c.tickers,type:c.type,novelty:c.novelty,impact:c.impact,
           confidence:c.confidence,route:c.route,why:c.why||'',verify:c.verify||'',applied:false};});
  if(!picked.length){setMsg('채택한 관점이 없습니다 — 하나 이상 체크하세요.');return;}
  recs.unshift({id:cur.id,t:cur.t,src:cur.src,summary:cur.summary,steelman:cur.steelman,claims:picked});
  cur=null;renderResult();persist();
  ['insText','insUrl','insTitle','insPub'].forEach(function(id){var e=$(id);if(e)e.value='';});
  setMsg('저장 완료 — 채택한 관점만 다른 메뉴에 반영됩니다.'+
   (promo.length?' 등급 승격 '+promo.length+'건: '+promo.map(function(p){return GRADE[p.now].k+'→'+GRADE[p.g].k;}).join(' · '):''));
 }

 /* --- 저장 목록 --- */
 function claimLine(r,c,showBtn){
  var pend=NUM[c.route]&&!c.applied;
  var k=CIX[c.id];
  return '<div class="ins-si'+(pend?' pend':'')+'">'+gbadge(gr(c.id),!!(k&&k.stale))+' '+esc(c.text)+
   '<span class="m">'+(c.layer?esc(c.layer)+' · ':'')+esc(RT[c.route]||c.route)+' · N'+c.novelty+'I'+c.impact+'C'+c.confidence+
   (k&&k.m.length>1?' · 확증 '+k.srcN+'출처/'+k.m.length+'관점':'')+
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
    if(/^g[1-3]$/.test(filt))return gr(c.id)>=+filt.slice(1);   /* g1=E2+ · g2=E3+ · g3=E4 */
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

 /* --- 등급 보드(관점군) — 렌즈 2줄 규약(STYLE_GUIDE §6-4) --- */
 function judge(k){
  if(k.g>=3)return '<span class="wn">확립 — 숫자 검증 대상(자동 변경 없음)</span>';
  if(k.g===2)return '<span class="ok">확증 — 판단 투입 가능</span>';
  if(k.g===1)return '<span class="nt">정황 — 추가 출처 대기</span>';
  return '<span class="nt">관측 — 단일 출처, 아직 근거 아님</span>';
 }
 function gcard(k){
  var head=(k.layers[0]||k.tickers[0]||'macro')+' · '+GRADE[k.g].nm+'('+GRADE[k.g].k+')';
  var tl=k.tl.map(function(s){return GRADE[s.g].k+' '+GRADE[s.g].nm+' '+md(s.t);}).join(' → ');
  var mem=k.m.slice().sort(function(a,b){return b.r.t-a.r.t;}).slice(0,4);
  return '<div class="ins-gcard g'+(k.g+1)+(k.stale?' st':'')+'">'+
   '<div class="mkt-lens"><div class="l1"><b>'+esc(head)+'</b>'+esc(cut(k.top.c.text,52))+'</div>'+
   '<div class="l2">출처 '+k.srcN+' · 관점 '+k.m.length+' · 최근 보강 '+md(k.last)+(k.stale?' (60일↑ 식음)':'')+' → '+judge(k)+'</div></div>'+
   '<div class="ins-gtl">'+esc(tl)+'</div>'+
   '<div class="ins-tags">'+
    (k.layers.length?'<span class="ins-tag">'+esc(k.layers.join(' · '))+'</span>':'')+
    (k.tickers.length?'<span class="ins-tag">'+esc(k.tickers.slice(0,4).join(' · '))+'</span>':'')+
    (k.num?'<span class="ins-tag num">numbers 포함</span>':'<span class="ins-tag nar">narrative</span>')+
    (k.pend?'<span class="ins-tag rt">숫자 반영 대기</span>':'')+
   '</div>'+
   '<div class="ins-gm">'+mem.map(function(o){
     return '<div class="ins-gml">'+esc(cut(o.c.text,72))+'<span class="m">'+esc(o.r.src.publisher||o.r.src.kind||'')+' · '+md(o.r.t)+'</span></div>';
    }).join('')+(k.m.length>4?'<div class="ins-gml more">+ '+(k.m.length-4)+'건 더</div>':'')+'</div>'+
  '</div>';
 }
 function renderGrades(){
  var box=$('insGrades'),cnt=$('insGCount');if(!box)return;
  if(!CL.length){
   box.innerHTML='<div class="mkt-ph-box">채택한 관점이 없습니다 — 자료를 넣고 <b>관점 뽑기</b>를 누르면 등급이 매겨집니다.</div>';
   if(cnt)cnt.textContent='';return;
  }
  if(cnt)cnt.textContent=CL.length+'개 관점군 · 확증(E3) 이상 '+CL.filter(function(k){return k.g>=2;}).length+'개';
  box.innerHTML=CL.map(gcard).join('');
 }

 /* --- 반영(다른 메뉴 스트립) — 채택분만, 등급이 노출 우선순위를 지배, 숫자는 '대기'로만 --- */
 function byGrade(a,b){return gr(b.c.id)-gr(a.c.id)||score(b.c)-score(a.c)||b.r.t-a.r.t;}
 function strip(id,list,head,note){
  var e=$(id);if(!e)return;
  if(!list.length){e.innerHTML='';return;}
  e.innerHTML='<div class="sh">'+head+'</div>'+list.map(function(o){
   var pend=NUM[o.c.route]&&!o.c.applied,k=CIX[o.c.id];
   return '<div class="ins-si'+(pend?' pend':'')+'">'+gbadge(gr(o.c.id),!!(k&&k.stale))+' '+esc(o.c.text)+
    '<span class="m">'+(o.c.layer?esc(o.c.layer)+' · ':'')+esc(o.r.src.publisher||o.r.src.kind||'')+
    ' · '+new Date(o.r.t).toLocaleDateString('ko-KR')+(k&&k.m.length>1?' · 확증 '+k.srcN+'출처':'')+
    (pend?' · 숫자 반영 대기':'')+'</span></div>';}).join('')+
   (note?'<div class="ins-noise">'+note+'</div>':'');
 }
 function renderStrips(){
  var f=flat();
  strip('insStripMarket',f.filter(function(o){return o.c.route==='macro';}).sort(byGrade).slice(0,4),'관점과 정보 — 채택한 매크로 관점(등급순)');
  strip('insStripSig',f.filter(function(o){return o.c.route==='signal_log';}).sort(byGrade).slice(0,5),'관점과 정보 — 시그널 로그 후보(등급순 · 승격은 수동)');
  strip('insStripCal',f.filter(function(o){return o.c.route==='calendar';}).sort(byGrade).slice(0,4),'관점과 정보 — 채택한 일정 관점(등급순)');
  strip('insStripThread',f.filter(function(o){return /^L[1-8]$/.test(o.c.layer||'')&&o.c.route!=='none';}).sort(byGrade).slice(0,4),'관점과 정보 — 채택한 레이어 관점(등급순)');
  strip('insStripDec',f.filter(function(o){return !!NUM[o.c.route]&&!o.c.applied;}).sort(byGrade).slice(0,5),'관점과 정보 — 숫자 반영 대기(등급순)',
   '실적·판단·단계·비중 파일은 자동으로 바뀌지 않습니다. <b>E4 확립</b>이어도 자동 변경은 없습니다 — 검증 후 반영하고 03에서 <b>반영 완료</b>로 표시하세요.');
 }
 function stamp(){
  var e=$('updIns');if(!e)return;
  var t=0;recs.forEach(function(r){if(r.t>t)t=r.t;});
  e.textContent=t?('update : '+new Date(t).toLocaleString('ko-KR',{hour12:false})):'';
 }
 function renderAll(){cluster();renderGrades();renderList();renderStrips();stamp();}

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
    if(!$('insTitle').value)$('insTitle').value=f.name.replace(/\.[^.]+$/,'');
    setMsg(f.name+' — '+t.length.toLocaleString()+'자 추출');
   }catch(e){setMsg(f.name+' 추출 실패: '+(e&&e.message?e.message:e));}
  }
 }

 /* --- 바인딩 --- */
 function bind(){
  $('insRun').onclick=run;
  $('insClear').onclick=function(){['insText','insUrl','insTitle','insPub'].forEach(function(id){$(id).value='';});cur=null;renderResult();setMsg('');};
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
  '<b>뽑는 것과 반영하는 것은 분리한다</b> — 체크해 채택한 관점만 다른 메뉴에 뜬다. 채택분은 <b>근거 등급(E1 관측 → E4 확립)</b>을 달고, '+
  '다른 출처에서 같은 내용이 보강되면 <b>등급이 자동 승격</b>된다. 숫자 파일(실적·판단·단계·비중)은 등급과 무관하게 자동으로 바뀌지 않는다(narrative ≠ numbers).</p></div>'+
  '<div class="ins-wrap">'+
   '<div class="ins-card">'+
    '<div class="ins-row">'+
     '<select class="ins-sel" id="insKind"><option>증권사 리포트</option><option>기사</option><option>유튜브</option><option>기타</option></select>'+
     '<input class="ins-in" id="insPub" placeholder="출처 (예: 미래에셋 · Reuters · 채널명)">'+
     '<input class="ins-in" id="insTitle" placeholder="제목">'+
    '</div>'+
    '<div class="ins-row" style="margin-top:8px"><input class="ins-in" id="insUrl" placeholder="URL (선택 — 본문이 없으면 URL만으로 웹검색해 시도)"></div>'+
    '<textarea class="ins-ta" id="insText" style="margin-top:8px" placeholder="본문·스크립트를 붙여넣으세요. 유튜브는 자막 스크립트를 넣는 편이 URL만 주는 것보다 정확합니다."></textarea>'+
    '<input type="file" id="insFile" accept=".pdf,.txt,.md,.csv,.json" multiple hidden>'+
    '<div class="ins-drop" id="insDrop" role="button" tabindex="0">PDF·TXT 파일을 끌어다 놓거나 클릭해 선택 — 본문 텍스트만 추출해 위 칸에 채웁니다</div>'+
    '<div class="ins-bar">'+
     '<button class="ins-btn primary" id="insRun">관점 뽑기</button>'+
     '<button class="ins-btn" id="insClear">비우기</button>'+
     '<span class="ins-msg" id="insMsg"></span>'+
    '</div>'+
   '</div>'+
   '<div class="ins-card" id="insResult" hidden></div>'+
   '<div><h2 class="ins-h2">관점 등급 <span class="n" id="insGCount"></span></h2>'+
    '<div class="ins-glg">'+
     '<span class="ins-g g1">E1 관측</span> 단일 출처 · 아직 근거 아님 &nbsp;'+
     '<span class="ins-g g2">E2 정황</span> 2출처 또는 고임팩트 &nbsp;'+
     '<span class="ins-g g3">E3 확증</span> 독립 3출처 또는 2출처+숫자 &nbsp;'+
     '<span class="ins-g g4">E4 확립</span> 3출처+숫자+고점수 → 숫자 검증 대상'+
     '<div class="ins-noise" style="margin-top:6px">같은 내용이 <b>다른 출처</b>에서 다시 채택되면 등급이 자동 승격된다(승격 이력은 채택 시각순 재생). 60일 넘게 보강이 없으면 <b>식음</b> 표시 — 강등은 없다. <b>E4 라도 숫자 파일은 자동으로 바뀌지 않는다.</b></div>'+
    '</div>'+
    '<div class="ins-gwrap" id="insGrades"></div></div>'+
   '<div><h2 class="ins-h2">채택한 관점 <span class="n" id="insCount"></span></h2>'+
    '<div class="ins-bar" style="margin:0 0 8px">'+
     '<input class="ins-in" id="insSearch" style="flex:1 1 200px" placeholder="검색 (내용·종목·출처)">'+
     '<select class="ins-sel" id="insFilter" style="flex:0 0 170px">'+
      '<option value="">전체</option><option value="pending">숫자 반영 대기</option>'+
      '<option value="g3">E4 확립</option><option value="g2">E3 확증 이상</option><option value="g1">E2 정황 이상</option>'+
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
 return {render:renderAll, all:function(){return recs;}, adopted:function(){return flat();},
         grades:function(){cluster();return CL.map(function(k){
          return {grade:GRADE[k.g].k, name:GRADE[k.g].nm, title:k.top.c.text, srcN:k.srcN, n:k.m.length,
                  layers:k.layers, tickers:k.tickers, numbers:k.num, stale:k.stale, last:k.last,
                  timeline:k.tl.map(function(s){return {grade:GRADE[s.g].k,t:s.t};})};});}};
})();
