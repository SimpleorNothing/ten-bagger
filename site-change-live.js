/* Keep the visible site-change modal in sync with deploy-verified site changes. */
(function(){
  'use strict';
  var rows=[];
  var ready=false;
  function fmtDate(s){
    var m=String(s||'').match(/(\d{4})-(\d{2})-(\d{2})/);
    return m?m[1]+'.'+m[2]+'.'+m[3]:'—';
  }
  function esc(s){return String(s==null?'':s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
  function keyOf(d,t){return String(d||'')+'\u0000'+String(t||'').trim();}
  function normalize(input){
    if(!Array.isArray(input))return [];
    return input.map(function(x){
      var c=x&&x.commit||{},a=c.author||{};
      return {d:String(a.date||'').slice(0,10),t:String(c.message||'').split('\n')[0].trim(),sha:String(x&&x.sha||'')};
    }).filter(function(x){return x.d&&x.t;});
  }
  function patchModal(){
    if(!ready)return;
    var pop=document.querySelector('.cyc-pop');
    if(!pop||!pop.classList.contains('on'))return;
    var ul=pop.querySelector('ul');
    if(!ul)return;
    var existing=new Set();
    Array.prototype.forEach.call(ul.querySelectorAll('li'),function(li){
      var d=(li.querySelector('.d')||{}).textContent||'';
      var t=(li.querySelector('.n')||{}).textContent||'';
      existing.add(keyOf(d.replace(/\./g,'-'),t));
    });
    rows.slice().sort(function(a,b){return String(b.d).localeCompare(String(a.d));}).forEach(function(r){
      if(existing.has(keyOf(r.d,r.t)))return;
      var li=document.createElement('li');
      li.setAttribute('data-live-site-change',r.sha||'1');
      li.innerHTML='<span class="d">'+fmtDate(r.d)+'</span><span class="n">'+esc(r.t)+'</span>';
      ul.insertBefore(li,ul.firstChild);
    });
    var total=ul.querySelectorAll('li').length;
    var count=pop.querySelector('.cyc-pop-h span');
    if(count)count.textContent='총 '+total+'건';
    patchBadges(total);
  }
  function patchBadges(total){
    if(!rows.length)return;
    var latest=rows.slice().sort(function(a,b){return String(b.d).localeCompare(String(a.d));})[0];
    Array.prototype.forEach.call(document.querySelectorAll('.mkt-upd'),function(n){
      n.innerHTML='update : '+fmtDate(latest.d)+' · <span class="his">이력 '+total+'</span>';
      n.setAttribute('title','실제 배포 확인된 사이트 변경일 · 클릭 시 사이트 변경 이력');
    });
  }
  function fetchRows(){
    fetch('/__site_changes?t='+Date.now(),{cache:'no-store',credentials:'same-origin'})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
      .then(function(data){rows=normalize(data);ready=true;patchModal();})
      .catch(function(e){if(window.console&&console.warn)console.warn('[site-change-live]',e&&e.message||e);});
  }
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('.mkt-upd'))setTimeout(patchModal,0);},true);
  if(window.MutationObserver&&document.body){new MutationObserver(function(){patchModal();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});}
  fetchRows();
})();

/* 02 기업분석 자가 마운트 로더. index.html 대용량 파일을 직접 패치하지 않는다. */
(function(){
  if(document.querySelector('script[data-company-analysis-loader]'))return;
  var s=document.createElement('script');
  s.src='/company.js?v=20260817-marvell-audit';
  s.defer=true;
  s.setAttribute('data-company-analysis-loader','1');
  document.body.appendChild(s);
})();

/* 02 기업분석 두 시계는 gamma.json을 별도 SoT로 no-store 조회한다. */
(function(){
  if(document.querySelector('script[data-company-clock-loader]'))return;
  var s=document.createElement('script');
  s.src='/company-clock.js?v=20260817-marvell-audit';
  s.defer=true;
  s.setAttribute('data-company-clock-loader','1');
  document.body.appendChild(s);
})();

/* 기업별 data schema 표시 보정과 CANDIDATES/CASCADES stage를 gamma.json SoT로 동기화한다. */
(function(){
  if(document.querySelector('script[data-company-patch-loader]'))return;
  var s=document.createElement('script');
  s.src='/company-patch.js?v=20260817-lumentum-audit';
  s.defer=true;
  s.setAttribute('data-company-patch-loader','1');
  document.body.appendChild(s);
})();

/* 02 기업분석 주요 뉴스는 company_news.json을 no-store로 읽는 별도 오버레이로 유지한다. */
(function(){
  if(document.querySelector('script[data-company-news-loader]'))return;
  var s=document.createElement('script');
  s.src='/company-news.js?v=20260820-daily-material-news';
  s.defer=true;
  s.setAttribute('data-company-news-loader','1');
  document.body.appendChild(s);
})();
