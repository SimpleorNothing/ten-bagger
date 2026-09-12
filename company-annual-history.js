/* 02 기업분석 · Credo 연간 차트 확장 — FY2022~FY2026 GAAP + FY2027E 경영진 성장 하단. */
(function(){
  'use strict';
  var DATA=null,LOADING=false,TIMER=null;

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function selectedId(){var on=document.querySelector('#v-company [data-company].on');return on?on.getAttribute('data-company'):'';}
  function annualMode(){try{return sessionStorage.getItem('alpha_company_period')==='annual';}catch(e){return false;}}
  function niceStep(raw){var n=Math.max(0.05,Number(raw)||0.05),p=Math.pow(10,Math.floor(Math.log(n)/Math.LN10)),z=n/p,m=z<=1?1:z<=2?2:z<=2.5?2.5:z<=5?5:10;return m*p;}
  function axisMoney(v){var n=Number(v);if(!isFinite(n)||Math.abs(n)<1e-9)return '$0';return (n<0?'-':'')+'$'+Math.abs(n).toLocaleString('en-US',{maximumFractionDigits:2})+'B';}
  function money(v,prefix){if(v==null)return '미공시';var n=Number(v);if(!isFinite(n))return '미공시';return (prefix||'')+(n<0?'-':'')+'$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:3})+'B';}
  function shortFy(fy){return String(fy||'').replace(/^FY20/,'FY');}
  function bar(v,span,baseline,cls,label,titlePrefix){
    var n=v==null?null:Number(v),title=titlePrefix+' · '+label+' '+money(v,'');
    if(n==null||!isFinite(n))return '<span class="ca-q-bar '+cls+' ca-q-bar-empty" style="height:2px;bottom:'+baseline.toFixed(1)+'%" title="'+esc(title)+'" aria-label="'+esc(title)+'"></span>';
    var height=Math.max(1.5,Math.min(100,Math.abs(n)/span*100)),bottom=n<0?Math.max(0,baseline-height):baseline;
    return '<span class="ca-q-bar '+cls+(n<0?' ca-q-negative':'')+'" style="height:'+height.toFixed(1)+'%;bottom:'+bottom.toFixed(1)+'%" title="'+esc(title)+'" aria-label="'+esc(title)+'"></span>';
  }
  function html(d){
    var rows=(d.annualFinancials||[]).map(function(r){return {fy:r.fy,revenue:r.revenue,operatingIncome:r.operatingIncome,kind:r.kind};});
    if(!rows.length)return '';
    var maxPos=rows.reduce(function(m,r){[r.revenue,r.operatingIncome].forEach(function(v){var n=Number(v);if(isFinite(n)&&n>m)m=n;});return m;},0)||1;
    var minNeg=rows.reduce(function(m,r){[r.revenue,r.operatingIncome].forEach(function(v){var n=Number(v);if(isFinite(n)&&n<m)m=n;});return m;},0);
    var step=niceStep(maxPos/5),domainMax=Math.ceil(maxPos/step)*step,domainMin=minNeg<0?-step:0,span=domainMax-domainMin,baseline=(-domainMin)/span*100;
    var grid=[],axis=[];
    for(var value=domainMax,guard=0;value>=-step*0.01&&guard<30;value-=step,guard++){
      var tick=Math.abs(value)<step*0.0001?0:Number(value.toFixed(6)),top=(domainMax-tick)/span*100;
      grid.push('<span class="ca-q-gridline" style="top:'+top.toFixed(2)+'%"></span>');
      axis.push('<span style="top:'+top.toFixed(2)+'%">'+axisMoney(tick)+'</span>');
    }
    if(domainMin<0){grid.push('<span class="ca-q-gridline" style="top:100%"></span>');axis.push('<span style="top:100%">'+axisMoney(domainMin)+'</span>');}
    var groups=rows.map(function(r){
      var est=r.kind!=='actual',prefix=r.kind==='management_floor'?'>':'';
      var label=r.fy+' · 매출 '+money(r.revenue,prefix)+' · 영업이익 '+money(r.operatingIncome,'');
      return '<div class="ca-q-group '+(est?'ca-q-est':'')+'" role="listitem" aria-label="'+esc(label)+'">'+bar(r.revenue,span,baseline,'ca-q-bar-rev','매출',r.fy)+bar(r.operatingIncome,span,baseline,'ca-q-bar-op','영업이익',r.fy)+'</div>';
    }).join('');
    var labels=rows.map(function(r){var est=r.kind!=='actual';return '<div class="ca-q-xlabel '+(est?'ca-q-est':'')+'" title="'+esc(r.fy)+'">'+esc(shortFy(r.fy))+'</div>';}).join('');
    return '<div class="ca-quarterly" data-credo-annual-history="1">'
      +'<div class="ca-quarterly-head"><div class="ca-section-label">연간 실적·전망</div><button type="button" class="ca-quarterly-control" data-ca-period-toggle aria-label="연간별 보기" aria-pressed="true"><span class="ca-q-calendar" aria-hidden="true"></span><span>연간별</span><span class="ca-q-chevron" aria-hidden="true"></span></button></div>'
      +'<div class="ca-q-legend" aria-label="그래프 범례"><span class="ca-q-legend-item"><i class="ca-q-swatch ca-q-swatch-rev" aria-hidden="true"></i>매출</span><span class="ca-q-legend-item"><i class="ca-q-swatch ca-q-swatch-op" aria-hidden="true"></i>영업이익</span><span class="ca-q-legend-item"><i class="ca-q-swatch ca-q-swatch-est" aria-hidden="true"></i>전망</span><span class="ca-q-unit">GAAP · $B</span></div>'
      +'<div class="ca-qchart" role="list" aria-label="Credo FY2022~FY2027 연간 GAAP 매출과 영업이익"><div class="ca-q-plot"><div class="ca-q-grid" aria-hidden="true">'+grid.join('')+'<span class="ca-q-zero" style="bottom:'+baseline.toFixed(2)+'%"></span></div><div class="ca-q-yaxis" aria-hidden="true">'+axis.join('')+'</div><div class="ca-q-columns" style="grid-template-columns:repeat('+rows.length+',minmax(0,1fr))">'+groups+'</div></div><div class="ca-q-xlabels" style="grid-template-columns:repeat('+rows.length+',minmax(0,1fr))">'+labels+'</div></div>'
      +'<div class="ca-q-notes"><div>FY2022~FY2026은 SEC GAAP 연간 실적입니다. FY2027E 매출은 경영진의 “85% 초과 성장” 전망을 FY2026 매출에 적용한 산술 하단(>$2.470B)이며, GAAP 연간 영업이익률은 미공시라 영업이익 막대를 표시하지 않습니다.</div></div></div>';
  }
  function patch(){
    if(selectedId()!=='credo'||!annualMode()||!DATA)return;
    var side=document.querySelector('#v-company .ca-frame-side');if(!side)return;
    var old=side.querySelector('.ca-quarterly');if(!old||old.getAttribute('data-credo-annual-history')==='1')return;
    var wrap=document.createElement('div');wrap.innerHTML=html(DATA);var node=wrap.firstElementChild;if(node)old.replaceWith(node);
  }
  function load(){
    if(DATA){patch();return;}
    if(LOADING)return;LOADING=true;
    fetch('/credo/deepdive.json?t='+Date.now(),{cache:'no-store',credentials:'same-origin'})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
      .then(function(d){DATA=d;LOADING=false;patch();})
      .catch(function(e){LOADING=false;if(window.console&&console.warn)console.warn('[company-annual-history]',e&&e.message||e);});
  }
  function schedule(){clearTimeout(TIMER);TIMER=setTimeout(function(){if(selectedId()==='credo'&&annualMode())load();},30);}
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#v-company [data-ca-period-toggle],#v-company [data-company]'))setTimeout(schedule,0);},true);
  if(window.MutationObserver&&document.body)new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
})();
