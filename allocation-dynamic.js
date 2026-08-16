/* Dynamic allocation hurdle — concentration is a hurdle, not an automatic buy ban.
 * Display-only decision overlay. Source data remains holdings.json + gamma.json.
 * Macro execution gates remain authoritative; this module only removes the mechanical
 * "target exceeded => no buy" interpretation and shows the extra hurdle required.
 */
(function(){
  'use strict';
  var mounted=false;
  function n(v){v=Number(v);return Number.isFinite(v)?v:null;}
  function pct(v){return v==null?'—':v.toFixed(1)+'%';}
  function getLayer(H,id){return ((H&&H.holdings)||[]).find(function(x){return x&&x.layer===id;})||null;}
  function muState(G){
    var g=G&&G.gamma&&G.gamma.MU;if(!g)return null;
    var f=g.rev&&g.rev.eps&&g.rev.eps.fy1||{}, px=g.rev&&g.rev.px||{};
    var gap=(n(px.c30)!=null&&n(f.c30)!=null)?n(px.c30)-n(f.c30):null;
    return {stage:g.stage||'—',gamma:g.g||'—',e30:n(f.c30),e90:n(f.c90),gap:gap};
  }
  function band(stage){
    if(stage==='가속'||stage==='초입')return {base:'38–45%',hard:50};
    if(stage==='성숙')return {base:'34–40%',hard:47};
    if(stage==='과열')return {base:'28–35%',hard:42};
    return {base:'34–40%',hard:47};
  }
  function verdict(w,m,b){
    if(w==null)return {tag:'자료대기',text:'L3 비중 데이터 대기'};
    if(w<=37)return {tag:'일반 허들',text:'정상 범위 — 종목 매력도와 매크로 게이트로 판단'};
    if(w>b.hard)return {tag:'극단 집중',text:'추가매수 원칙 제한 — EPS 상향 가속과 가격 재매력화가 동시에 확인될 때만 예외'};
    var strong=m&&m.gamma==='open'&&m.e30!=null&&m.e30>0&&m.e90!=null&&m.e90>10&&m.gap!=null&&m.gap<=5;
    if(strong)return {tag:'조건부 허용',text:'비중 초과 자체는 금지 사유 아님 — EPS 리비전이 가격보다 앞서고 매크로 게이트가 열리면 분할 추가매수 가능'};
    return {tag:'허들 상향',text:'추가매수 금지가 아니라 요구수익률 상향 — EPS 리비전 > 주가가 재확인될 때까지 신규자금은 대기'};
  }
  function rewriteLegacy(root){
    if(!root)return;
    var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT), node, arr=[];
    while(node=walker.nextNode())arr.push(node);
    arr.forEach(function(t){
      var s=t.nodeValue||'';
      if(/L3/.test(s)&&/34[–-]37%/.test(s))s=s.replace(/적정\s*34[–-]37%/g,'기준 34–37% · 사이클 동적');
      if(/L3/.test(s)&&/추가매수 금지/.test(s))s=s.replace(/추가매수 금지/g,'추가매수 허들 상향');
      if(/L3/.test(s)&&/오버/.test(s))s=s.replace(/오버/g,'고집중');
      t.nodeValue=s;
    });
  }
  function mount(H,G){
    var host=document.getElementById('decisionBoard');if(!host)return false;
    rewriteLegacy(host);
    var old=document.getElementById('dynamicAllocHurdle');if(old)old.remove();
    var l3=getLayer(H,'L3'),w=l3?n(l3.w):null,m=muState(G),b=band(m&&m.stage),v=verdict(w,m,b);
    var box=document.createElement('div');box.id='dynamicAllocHurdle';box.className='mp-card';
    box.style.cssText='margin:10px 0 14px;padding:14px 16px;border:1px solid var(--line);background:var(--panel2);border-radius:10px;font-size:12px;line-height:1.65;color:var(--dim)';
    var gap=m&&m.gap!=null?((m.gap>0?'+':'')+m.gap.toFixed(1)+'%p'):'—';
    box.innerHTML='<div style="font-weight:800;color:var(--txt);margin-bottom:5px">L3 동적 비중 규율 · '+v.tag+'</div>'+
      '<div><b style="color:var(--txt)">현재 '+pct(w)+'</b> · 사이클 '+(m?m.stage:'—')+' · 권고밴드 <b>'+b.base+'</b> · 집중 상한 '+b.hard+'%</div>'+
      '<div>'+v.text+'</div>'+
      '<div style="margin-top:4px;color:var(--faint)">추가매수 허들: γ '+(m?m.gamma:'—')+' · FY+1 EPS 30d '+(m&&m.e30!=null?(m.e30>0?'+':'')+m.e30.toFixed(1)+'%':'—')+' · 90d '+(m&&m.e90!=null?(m.e90>0?'+':'')+m.e90.toFixed(1)+'%':'—')+' · 주가−EPS 30d '+gap+'. 비중 초과는 단독 매수금지·매도 사유가 아니다. 매크로 게이트는 별도 적용.</div>';
    host.appendChild(box);mounted=true;return true;
  }
  function boot(){
    Promise.all([
      fetch('./holdings.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;}),
      fetch('./gamma.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;})
    ]).then(function(x){
      var H=x[0],G=x[1],tries=0;
      function run(){tries++;if(mount(H,G)||tries>50)return;setTimeout(run,200);}run();
      var h=document.getElementById('decisionBoard');if(h){new MutationObserver(function(){if(!document.getElementById('dynamicAllocHurdle'))mount(H,G);else rewriteLegacy(h);}).observe(h,{childList:true,subtree:true});}
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
