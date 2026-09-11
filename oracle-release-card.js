/* oracle-release-card.js — 01 market monitoring Oracle quarterly release card */
(function(){
  'use strict';
  if(window.__oracleReleaseCard)return; window.__oracleReleaseCard=1;
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function n(v,d){return Number(v).toFixed(d==null?1:d);}
  function spark(vals){
    vals=(vals||[]).filter(function(v){return Number.isFinite(Number(v));}).map(Number); if(vals.length<2)return '';
    var w=220,h=54,p=5,min=Math.min.apply(null,vals),max=Math.max.apply(null,vals),span=max-min||1;
    var pts=vals.map(function(v,i){var x=p+(w-2*p)*(i/(vals.length-1)),y=h-p-(h-2*p)*((v-min)/span);return x.toFixed(1)+','+y.toFixed(1);}).join(' ');
    return '<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Oracle RPO 분기 추이"><polyline fill="none" stroke="currentColor" stroke-width="2" points="'+pts+'"/></svg>';
  }
  function mount(){
    if(document.getElementById('mkt_oracle_q1fy27'))return true;
    var grid=document.getElementById('mktIndicators'); if(!grid)return false;
    var card=document.createElement('div'); card.className='mkt-card'; card.id='mkt_oracle_q1fy27'; card.setAttribute('data-indicator-key','oracle-q1fy27'); card.innerHTML='<div class="mkt-ph">Oracle FY27 Q1 로딩…</div>'; grid.appendChild(card);
    fetch('oracle_q1fy27.json?t='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(function(j){
      var z=j.latest||{},p=j.previousQuarter||{},g=j.guidance||{},s=(j.series||[]).map(function(x){return x.rpoB;});
      var qoq=p.iaasRevenueB?((z.iaasRevenueB/p.iaasRevenueB-1)*100):null;
      var capYoy=z.priorYearQ1CapexB?((z.capexB/z.priorYearQ1CapexB-1)*100):null;
      card.innerHTML='<div class="mkt-nm">Oracle AI Cloud · FY27 Q1</div>'+
        '<div class="mkt-val">OCI $'+n(z.iaasRevenueB,1)+'B</div>'+
        '<div class="mkt-chg up">+ '+n(z.iaasRevenueYoy,0)+'% YoY <span style="font:600 12px var(--mono);margin-left:8px;color:var(--faint)">Q4 $'+n(p.iaasRevenueB,1)+'B → Q1 $'+n(z.iaasRevenueB,1)+'B ('+(qoq>=0?'+':'')+n(qoq,1)+'% QoQ)</span></div>'+
        '<div class="mkt-lens"><div><b>RPO</b> $'+n(p.rpoB,0)+'B → <b>$'+n(z.rpoB,0)+'B</b></div><div>CAPEX $'+n(z.capexB,3)+'B · YoY '+(capYoy>=0?'+':'')+n(capYoy,0)+'% · FCF $'+n(z.freeCashFlowB,3)+'B</div></div>'+
        '<div class="mkt-lens"><div><b>Q2 가이던스</b> 매출 +'+g.revenueGrowthPct[0]+'~'+g.revenueGrowthPct[1]+'% · Cloud +'+g.cloudRevenueGrowthUsdPct[0]+'~'+g.cloudRevenueGrowthUsdPct[1]+'%</div><div>수요 강세 확인과 자본집약도 상승을 동시에 반영</div></div>'+
        '<div class="mkt-chart">'+spark(s)+'</div><div class="mkt-span">'+esc(j.period)+' · Oracle IR · 등록 '+esc(j.registeredAt)+' · RPO 최신 $'+n(z.rpoB,0)+'B</div>';
    }).catch(function(){card.innerHTML='<div class="mkt-ph">Oracle 공식 실적 데이터 로딩 실패</div>';});
    return true;
  }
  function boot(){if(mount())return;var n=0,t=setInterval(function(){if(mount()||++n>40)clearInterval(t);},250);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
