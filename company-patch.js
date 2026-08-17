/* 02 기업분석 후처리 — 공통 스키마 표시 보정 + gamma.json stage SoT 동기화. */
(function(){
  'use strict';

  var META={
    marvell:{ticker:'MRVL',name:'Marvell'},
    lumentum:{ticker:'LITE',name:'Lumentum'}
  };
  var timer=null;
  var gammaCache=null;
  var dataCache={};

  function selectedId(){
    var on=document.querySelector('#v-company [data-company].on');
    return on?on.getAttribute('data-company'):'marvell';
  }
  function currentMeta(){return META[selectedId()]||META.marvell;}
  function revenue(v){
    if(v===null||v===undefined||v==='')return '없음';
    var n=Number(v);
    if(!isFinite(n))return '없음';
    return n.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:3});
  }

  function patchRevenue(data){
    if(!data||!Array.isArray(data.financials))return;
    var table=document.querySelector('#v-company .ca-table');
    if(!table)return;
    var rows=table.querySelectorAll('tbody tr');
    var row=null;
    Array.prototype.some.call(rows,function(r){
      var c=r.querySelector('td');
      if(c&&String(c.textContent||'').trim().indexOf('매출')===0){row=r;return true;}
      return false;
    });
    if(!row)return;
    var cells=row.querySelectorAll('td');
    data.financials.forEach(function(f,i){if(cells[i+1])cells[i+1].textContent=revenue(f.revenue);});
  }

  function syncGlobalStage(meta,stage){
    if(!stage)return;
    try{
      if(typeof CANDIDATES!=='undefined'&&Array.isArray(CANDIDATES)){
        CANDIDATES.forEach(function(c){
          if(!c)return;
          if(String(c.ticker||'').toUpperCase()===meta.ticker||String(c.name||'').toLowerCase()===meta.name.toLowerCase())c.stage=stage;
        });
      }
    }catch(e){}
    try{
      if(typeof CASCADES!=='undefined'&&Array.isArray(CASCADES)){
        CASCADES.forEach(function(c){
          (c&&c.nodes||[]).forEach(function(n){
            (n&&n.cos||[]).forEach(function(co){
              if(!Array.isArray(co))return;
              var nm=String(co[0]||'').toLowerCase();
              if(nm===meta.name.toLowerCase()||nm===meta.ticker.toLowerCase())co[1]=stage;
            });
          });
        });
      }
    }catch(e){}
  }

  function patchStage(meta,g){
    if(!g)return;
    var stage=g.stage||'자료 없음';
    var el=document.querySelector('#v-company .ca-frame-side .ca-big');
    if(el){
      el.textContent=stage;
      el.setAttribute('title','SoT: gamma.json · '+String(g.checkedAt||'기준일 없음'));
      el.setAttribute('data-stage-sot','gamma.json');
    }
    syncGlobalStage(meta,stage);
  }

  function fetchJson(url){
    return fetch(url+(url.indexOf('?')>=0?'&':'?')+'t='+Date.now(),{cache:'no-store',credentials:'same-origin'})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();});
  }

  function getData(id){
    if(dataCache[id])return Promise.resolve(dataCache[id]);
    return fetchJson('/'+id+'/data.json').then(function(d){dataCache[id]=d;return d;});
  }
  function getGamma(force){
    if(gammaCache&&!force)return Promise.resolve(gammaCache);
    return fetchJson('/gamma.json').then(function(d){gammaCache=d&&d.gamma||{};return gammaCache;});
  }

  function apply(forceGamma){
    var id=selectedId(),meta=currentMeta();
    Promise.all([getData(id),getGamma(!!forceGamma)])
      .then(function(v){patchRevenue(v[0]);patchStage(meta,v[1]&&v[1][meta.ticker]);})
      .catch(function(e){if(window.console&&console.warn)console.warn('[company-patch]',e&&e.message||e);});
  }

  function schedule(){
    clearTimeout(timer);
    timer=setTimeout(function(){apply(false);},40);
  }

  function mount(){
    apply(true);
    var app=document.getElementById('companyApp');
    if(app&&window.MutationObserver)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
    document.addEventListener('click',function(e){
      if(e.target&&e.target.closest&&e.target.closest('#v-company [data-company]'))setTimeout(function(){apply(false);},100);
    },true);
    setInterval(function(){getGamma(true).then(function(g){var m=currentMeta();patchStage(m,g&&g[m.ticker]);});},300000);
    setTimeout(function(){getGamma(true).then(function(g){Object.keys(META).forEach(function(k){var m=META[k];syncGlobalStage(m,g&&g[m.ticker]&&g[m.ticker].stage);});});},1000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
