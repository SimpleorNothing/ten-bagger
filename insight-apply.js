/* ===== 02 인사이트 찾기 → 04 시장과 실적 전망 반영 (자가 마운트) =====
   02 「04 시장과 실적 전망에 반영」 버튼 → /api/insight-apply(worker→Claude)가 채택 관점을
   04 라이브 상태(γ·단계·사이클 군집·강물·매크로)에 대조해 '반영 가능/보류'를 판정하고,
   반영분만 04 상단 카드(#insApThread)에 서술 레이어로 얹는다. 결과는 R2 저장 → 모든 기기 공유.

   불변 규율(뽑기≠반영의 연장):
   · narrative ≠ numbers — 이 경로는 gamma·cycle·judgment·earnings·holdings 를 한 글자도 쓰지 않는다.
     숫자가 바뀌어야 성립하는 관점은 '보류'로 남고, 어떤 §1 트리거가 필요한지만 표시된다.
   · 검토는 판단 보조일 뿐 매매 지시가 아니다 — 반영 = 04 화면의 서술 한 줄이 늘어나는 것뿐.
   index.html·insight.js 무편집(worker <script defer> 주입 · 앵커는 DOM 으로 생성). */
window.INSIGHT_APPLY=(function(){
 var API='/api/insight-apply', busy=false, last=null;
 var BLOCKS={roadmap:'AI 수요·공급 로드맵',cycle:'반도체 사이클',quad:'주도주 4사분면',
             gamma:'γ · 단계(Dawn Map)',river:'관통 강물 · 현재 전선',instant:'즉답 요약'};
 var ORDER=['roadmap','cycle','quad','gamma','river','instant'];
 function $(id){return document.getElementById(id);}
 function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
 function msg(t){var e=$('insApMsg');if(e)e.textContent=t||'';}

 /* --- 02 채택 관점 수집 --- 소음(route=none)은 제외, 점수순 상한 40건(워커도 동일 상한) */
 function collect(){
  var api=window.INSIGHT;
  if(!api||!api.adopted)return [];
  var f=api.adopted()||[];
  return f.filter(function(o){return o.c&&o.c.route!=='none'&&o.c.text;})
   .map(function(o){
    var r=o.r||{},c=o.c,s=r.src||{};
    return {id:c.id,text:c.text,layer:c.layer||'',route:c.route||'',type:c.type||'narrative',
            tickers:c.tickers||[],grade:c.grade==null?null:c.grade,
            nic:'N'+(c.novelty||0)+'I'+(c.impact||0)+'C'+(c.confidence||0),
            why:c.why||'',src:s.title||s.outlet||s.kind||'',date:s.date||''};
   })
   .sort(function(a,b){return (b.grade||0)-(a.grade||0);})
   .slice(0,40);
 }

 /* --- 04 카드 렌더 --- 반영분은 블록별로 묶고, 보류는 사유와 함께 아래에 남긴다 */
 function render(){
  var e=$('insApThread');if(!e)return;
  if(!last||!last.items||!last.items.length){e.innerHTML='';return;}
  var ap=last.items.filter(function(i){return i.apply&&i.line;});
  var hd=last.items.filter(function(i){return !i.apply;});
  var when=last.at?new Date(last.at).toLocaleString('ko-KR',{hour12:false}):'';
  var h='<div class="ins-ap-h">02 인사이트 반영 <span class="m">채택 관점 '+(last.reviewed||0)+'건 검토 · '+esc(when)+'</span></div>';
  if(last.verdict)h+='<div class="ins-ap-vd">'+esc(last.verdict)+'</div>';
  ORDER.forEach(function(b){
   var rows=ap.filter(function(i){return i.block===b;});
   if(!rows.length)return;
   h+='<div class="ins-ap-blk"><div class="bh">'+esc(BLOCKS[b]||b)+'</div>'+rows.map(function(i){
    var meta=[i.layer,(i.tickers||[]).join('·'),i.src].filter(Boolean).join(' · ');
    return '<div class="ins-ap-it"><div class="ln">'+esc(i.line)+'</div>'+
     (i.basis?'<div class="bs">'+esc(i.basis)+'</div>':'')+
     (meta?'<span class="m">'+esc(meta)+'</span>':'')+'</div>';
   }).join('')+'</div>';
  });
  if(hd.length){
   h+='<div class="ins-ap-blk hold"><div class="bh">보류 — 숫자 트리거·근거 미충족</div>'+hd.map(function(i){
    return '<div class="ins-ap-it"><div class="ln">'+esc(i.claim||i.line)+'</div>'+
     (i.hold?'<div class="bs">'+esc(i.hold)+'</div>':'')+'</div>';
   }).join('')+'</div>';
  }
  if(last.steelman)h+='<div class="ins-ap-st">스틸맨 — '+esc(last.steelman)+'</div>';
  h+='<div class="ins-ap-note">서술 레이어입니다 — 실적·판단·단계·비중 파일은 이 경로로 바뀌지 않습니다(narrative ≠ numbers). '+
     '숫자 변경은 실적 비트·가이던스 상향·확정 수주가 확인될 때만 별도로 반영하세요.</div>';
  e.innerHTML=h;
 }

 function load(){
  fetch(API,{headers:{'accept':'application/json'}}).then(function(r){return r.json();})
   /* 저장본이 화면의 최신 결과보다 오래됐으면 덮어쓰지 않는다(방금 돌린 검토가 지워지는 것 방지) */
   .then(function(j){if(j&&!j.error&&(!last||(j.at||0)>=(last.at||0))){last=j;render();stamp();}}).catch(function(){});
 }
 function stamp(){
  var e=$('insApWhen');if(!e)return;
  e.textContent=last&&last.at?('최근 반영 검토 : '+new Date(last.at).toLocaleString('ko-KR',{hour12:false})+' · 반영 '+
   (last.items||[]).filter(function(i){return i.apply;}).length+'건'):'';
 }

 function run(){
  if(busy)return;
  var claims=collect();
  if(!claims.length){msg('채택한 관점이 없습니다 — 먼저 관점을 뽑아 채택하세요.');return;}
  busy=true;
  var b=$('insApRun');if(b)b.disabled=true;
  var t0=Date.now(),tmr=setInterval(function(){msg('반영 검토 중… '+Math.floor((Date.now()-t0)/1000)+'초');},1000);
  msg('반영 검토 중… 0초');
  fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({claims:claims})})
   .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};});})
   .then(function(o){
    if(!o.ok||o.j.error)throw new Error(o.j.error||'검토 실패');
    last=o.j;render();stamp();
    var n=(last.items||[]).filter(function(i){return i.apply;}).length;
    msg('반영 완료 — '+n+'건이 04 시장과 실적 전망에 얹혔습니다(보류 '+((last.items||[]).length-n)+'건).');
   })
   .catch(function(e){msg('실패 — '+(e&&e.message?e.message:e));})
   .then(function(){clearInterval(tmr);busy=false;if(b)b.disabled=false;});
 }

 /* --- 자가 마운트 --- 02 버튼 바 + 04 카드 앵커 */
 function mount(){
  /* 02: 「채택한 관점」 등급 보드 위에 버튼 바 */
  if(!$('insApBar')){
   var gb=$('insGradeBoard');
   if(gb&&gb.parentNode){
    var bar=document.createElement('div');bar.className='ins-ap-bar';bar.id='insApBar';
    bar.innerHTML='<button class="ins-btn primary" id="insApRun">04 시장과 실적 전망에 반영</button>'+
     '<span class="ins-msg" id="insApMsg"></span><span class="ins-ap-when" id="insApWhen"></span>'+
     '<div class="ins-ap-hint">채택한 관점을 04 블록(로드맵·사이클·사분면·γ/단계·강물·즉답요약)에 대조해 '+
     '<b>반영 가능한 것만</b> 04 상단에 얹습니다. 숫자 파일은 바뀌지 않습니다.</div>';
    gb.parentNode.insertBefore(bar,gb);
    var rb=$('insApRun');if(rb)rb.onclick=run;
   }
  }
  /* 04: 로드맵 아래·숫자 반영 대기 스트립 위 */
  if(!$('insApThread')){
   var th=document.querySelector('#v-thread');
   if(th){
    var d=document.createElement('div');d.className='ins-ap-card';d.id='insApThread';
    var ref=th.querySelector('#insStripDec')||th.querySelector('.vhead');
    if(ref)th.insertBefore(d,ref);else th.appendChild(d);
   }
  }
 }
 function init(){mount();if($('insApThread')||$('insApBar'))load();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 return {run:run,reload:load,last:function(){return last;}};
})();
