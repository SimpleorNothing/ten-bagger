/* news-dedup.js — 동일 내용(같은 사건) 기사 접기.
   출처만 다른 근접 중복(예: VRT 「2분기 실적 컨퍼런스콜 7/29 확정」 = 「2분기 실적 발표일 및 컨퍼런스콜 공지」)이
   한 종목/토픽 블록에 나란히 뜨는 것을 렌더 직후 DOM에서 1건으로 접는다. 표시 전용 — 데이터 파일 무변경(narrative≠numbers).
   판정 = 표시 요약(.asum) char-bigram Jaccard ≥ 0.35(실측 news.json 217쌍: 같은 사건 17쌍 전부 ≥.35·다른 사건 <.25).
   #mktDigest(종목 뉴스)·#mktMacroNews(관련 기사) 재렌더·「더 보기」 확장마다 MutationObserver로 재적용. */
(function(){
  function bigr(s){var n=String(s||'').toLowerCase().replace(/[^0-9a-z가-힣]/g,'');var g={};if(n.length<2){if(n)g[n]=1;return g;}for(var i=0;i<n.length-1;i++)g[n.substr(i,2)]=1;return g;}
  function sim(a,b){var ga=bigr(a),gb=bigr(b),ka=Object.keys(ga),kb=Object.keys(gb);if(!ka.length||!kb.length)return 0;var x=0;for(var i=0;i<ka.length;i++)if(gb[ka[i]])x++;var u=ka.length+kb.length-x;return u?x/u:0;}
  var TH=0.35;
  function dedupeBlock(blk){
    var seen=[];
    blk.querySelectorAll('.arow').forEach(function(a){
      var el=a.querySelector('.asum');
      var t=(el?el.textContent:a.textContent)||'';
      var dup=seen.some(function(s){return sim(t,s)>=TH;});
      if(dup)a.remove(); else seen.push(t);
    });
  }
  function run(){document.querySelectorAll('.stk-blk').forEach(dedupeBlock);}
  function watch(id){
    var host=document.getElementById(id);if(!host)return;
    var mo=new MutationObserver(function(){clearTimeout(host._dd);host._dd=setTimeout(run,60);});
    mo.observe(host,{childList:true,subtree:true});
  }
  function boot(){watch('mktDigest');watch('mktMacroNews');setTimeout(run,400);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

/* ── 토픽 레이더 — 채택 매크로 관점을 「토픽 레이더」(구 관련 기사) 토픽 블록에 축(ax) 매칭 배치 ──
   SimpleorNothing 지시 2026-07-18(이름=토픽 레이더 · 배치=B 축 매칭 + 미매칭 마지막).
   ① window.INSIGHT.adopted()에서 route=macro 채택 관점을 읽어(insight.js 내부 미의존 — 공개 API만),
      같은 축(ax) 토픽 블록의 .stk-sum 아래 [data-macviews]에 .ins-si로 **렌더**한다(노드 이동 아님 → loadMacroNews 블록 재생성에도 유실 0).
   ② 축 미매칭/해당 축 토픽 부재 시 → #mktMacroNews 맨 마지막 공통 컨테이너(#trStripRest, 2열 폭).
   ③ h2 「관련 기사」→「토픽 레이더」 리네임 · insight.js의 상단 매크로 스트립(#insStripMarket)은 숨김 · 「채택한 일정 관점」(#insStripCal)은 토픽 레이더 h2 아래로 이동.
   narrative≠numbers — .ins-si 컴포넌트 그대로(뉴스 .arow로 평탄화 안 함 · 숫자 파일 불변).
   index.html·insight.js·CSS 무편집(이 소형 파일에서 DOM 배치만 · .ins-si/.ins-strip/.sh는 insight.css 톱레벨 룰 재사용).
   AXR·렌더 포맷은 index.html loadMacroNews()·insight.js와 동일 소스 — 셋이 갈라지면 어긋난다(변경 시 동기 유지). */
(function(){
  if(!window.MutationObserver)return;
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function cut(s,n){s=String(s||'');return s.length>n?s.slice(0,n)+'…':s;}
  var GRD=['관찰','후보','지지','확립','확신'];
  var RT={signal_log:'시그널 로그',earnings:'실적(earnings)',judgment:'판단(judgment)',stage:'단계(gamma)',holdings:'비중(holdings)',macro:'시장 모니터링',calendar:'캘린더',none:'소음'};
  var NUM={earnings:1,judgment:1,stage:1,holdings:1};
  var AXR=[['china',/중국|china/],
    ['capex',/capex|하이퍼스케일러|hyperscaler|빅테크투자|ai투자/],
    ['chip',/반도체|수출통제|공급망|hbm|semiconductor|chip|exportcontrol|supplychain/],
    ['power',/전력|원전|그리드|송전|냉각|power|grid|nuclear|smr|electric/],
    ['energy',/중동|이란|호르무즈|유가|원유|석유|oil|opec|에너지|energy|지정학|geopolit|전쟁|war|이스라엘|israel/],
    ['trade',/관세|무역|tariff|trade/],
    ['rates',/금리|연준|기준금리|통화정책|물가|인플레|cpi|pce|fomc|fed|inflation|rate/],
    ['fx',/환율|원화|달러|dollar|forex|fx/]];
  function axOf(s){var t=String(s||'').toLowerCase().replace(/[^0-9a-z가-힣]/g,'');for(var i=0;i<AXR.length;i++)if(AXR[i][1].test(t))return AXR[i][0];return 'x_'+(t||'macro');}
  function badge(g,reinf){g=g||0;return '<span class="ins-gr g'+g+'">'+GRD[g]+(reinf?' · 보강 '+reinf:'')+'</span>';}
  function srcBits(r){var s=r.src||{},b=[];if(s.publisher)b.push(s.publisher);if(s.kind)b.push(s.kind);if(!b.length)b.push('출처 미상');b.push(s.date||new Date(r.t).toLocaleDateString('ko-KR'));return b.join(' · ');}
  function srcLinks(r){var s=r.src||{};return (s.url?'<a class="ins-cs-lk" href="'+esc(s.url)+'" target="_blank" rel="noopener">원문 ↗</a>':'')+(r.raw?'<a class="ins-cs-lk" href="/api/insights/raw?id='+encodeURIComponent(r.id)+'" target="_blank" rel="noopener">저장 원문 ↗</a>':'');}
  function claimSrc(r){var s=r.src||{};return '<span class="ins-cs">출처: '+esc(srcBits(r))+(s.title?' — '+esc(cut(s.title,44)):'')+srcLinks(r)+'</span>';}
  function itemHTML(o){var c=o.c,pend=NUM[c.route]&&!c.applied;
    return '<div class="ins-si'+(pend?' pend':'')+'">'+badge(c.grade,c.reinf)+' '+esc(c.text)+
      '<span class="m">'+(c.layer?esc(c.layer)+' · ':'')+esc(RT[c.route]||c.route)+(pend?' · 숫자 반영 대기':'')+'</span>'+claimSrc(o.r)+'</div>';}
  function views(){
    var f;try{f=(window.INSIGHT&&window.INSIGHT.adopted)?window.INSIGHT.adopted():[];}catch(e){return [];}
    return (f||[]).filter(function(o){return o&&o.c&&o.c.route==='macro';})
      .sort(function(a,b){var sa=(a.c.novelty||0)+(a.c.impact||0)+(a.c.confidence||0),sb=(b.c.novelty||0)+(b.c.impact||0)+(b.c.confidence||0);return sb-sa||(b.r.t||0)-(a.r.t||0);})
      .slice(0,4);
  }
  function viewAx(o){return o.c.ax?String(o.c.ax):axOf([o.c.text,((o.c.tickers||[]).join(' '))].filter(Boolean).join(' '));}
  var OBS=null,busy=false;
  function render(){
    var host=document.getElementById('mktMacroNews');if(!host)return;
    if(busy)return;busy=true;if(OBS)OBS.disconnect();
    try{
      var h=host.previousElementSibling;   /* h2 「관련 기사」→「토픽 레이더」 — insight.js가 host 앞에 #insStripMarket을 끼우므로 h2.msec 만날 때까지 역행 */
      while(h&&!(h.classList&&h.classList.contains('msec')))h=h.previousElementSibling;
      if(h&&!h.getAttribute('data-radar')){
        h.setAttribute('data-radar','1');
        h.innerHTML='토픽 레이더 <span class="mnote">매크로 관점 · 토픽별</span>';}
      var cal=document.getElementById('insStripCal');   /* 「채택한 일정 관점」 스트립을 상단(.vhead 뒤)→토픽 레이더 h2 바로 아래로 이동. insight.js는 id로 채우므로 옷겨도 계속 렌더됨(anchor는 이미 존재 시 재생성 안 함) */
      if(cal&&h&&h.nextElementSibling!==cal)h.parentNode.insertBefore(cal,h.nextElementSibling);
      var ins=document.getElementById('insStripMarket');   /* insight.js 상단 스트립 숨김(우리 것은 #trStripRest) */
      if(ins&&ins.id!=='trStripRest')ins.style.display='none';
      Array.prototype.forEach.call(host.querySelectorAll('[data-macviews]'),function(n){if(n.parentNode)n.parentNode.removeChild(n);});
      var rest=document.getElementById('trStripRest');if(rest)rest.innerHTML='';
      var list=views();
      if(list.length){
        var byAx={};   /* 토픽 블록 축 = 블록 제목(.stk-hd .nm)에서 파생 · 축당 첫 블록 */
        Array.prototype.forEach.call(host.querySelectorAll('.stk-blk'),function(b){
          var nm=b.querySelector('.stk-hd .nm'),a=axOf(nm?nm.textContent:'');
          if(a&&!byAx[a])byAx[a]=b;});
        var leftover=[];
        list.forEach(function(o){
          var b=byAx[viewAx(o)];
          if(b){var box=b.querySelector('[data-macviews]');
            if(!box){box=document.createElement('div');box.setAttribute('data-macviews','1');
              var sum=b.querySelector('.stk-sum');
              if(sum&&sum.nextSibling)b.insertBefore(box,sum.nextSibling);
              else if(sum)b.appendChild(box);
              else{var hd=b.querySelector('.stk-hd');if(hd&&hd.nextSibling)b.insertBefore(box,hd.nextSibling);else b.appendChild(box);}}
            box.insertAdjacentHTML('beforeend',itemHTML(o));}
          else leftover.push(o);});   /* 미매칭 = 맨 마지막 공통 컨테이너 */
        if(leftover.length){
          if(!rest){rest=document.createElement('div');rest.id='trStripRest';rest.className='ins-strip';host.appendChild(rest);}
          else host.appendChild(rest);   /* 항상 끝으로 */
          rest.style.gridColumn='1 / -1';
          rest.innerHTML='<div class="sh">관점과 정보 — 채택한 매크로 관점</div>'+leftover.map(itemHTML).join('');}
      }
    }catch(e){}
    busy=false;
    if(!OBS)OBS=new MutationObserver(function(){setTimeout(render,0);});
    OBS.observe(host,{childList:true});   /* loadMacroNews 재렌더(host.innerHTML) 추종 · 우리 작업은 disconnect로 무한루프 차단 */
  }
  function boot(){
    var host=document.getElementById('mktMacroNews');if(!host)return false;
    render();
    [400,1200,3000,6000].forEach(function(ms){setTimeout(render,ms);});   /* insight.js adopted()가 비동기로 늦게 채워짐 → 재시도 추종 */
    return true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else if(!boot()){var iv=setInterval(function(){if(boot())clearInterval(iv);},400);setTimeout(function(){clearInterval(iv);},10000);}
})();
