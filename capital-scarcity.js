/* AI capital scarcity monitor — injects into 01 Market indicator grid. */
(function(){'use strict';
 function f(v,d){return v==null||!isFinite(v)?'—':Number(v).toFixed(d==null?2:d);}
 function removeDuplicateZeroBaseNote(){
  document.querySelectorAll('div[data-zb-score]').forEach(function(el){el.remove();});
 }
 function watchDuplicateZeroBaseNote(){
  removeDuplicateZeroBaseNote();
  var mo=new MutationObserver(removeDuplicateZeroBaseNote);
  mo.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(function(){removeDuplicateZeroBaseNote();mo.disconnect();},10000);
 }
 function paintNegativeTrackerValues(){
  var row=document.querySelector('tr[data-zb-score-value]');
  var table=row&&row.closest('table');
  if(!table)return;
  table.querySelectorAll('span,b,[data-actual-action]').forEach(function(el){
   var txt=(el.textContent||'').trim();
   if(/(^|\s|[·(])−?\-\d+(?:\.\d+)?(?:%|점|p)?(?:\s|$|[·)])/u.test(txt)||/\-\d+(?:\.\d+)?(?:%|점|p)/u.test(txt))el.style.color='#b42318';
  });
 }
 function watchNegativeTrackerValues(){
  paintNegativeTrackerValues();
  var mo=new MutationObserver(paintNegativeTrackerValues);
  mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  setTimeout(function(){paintNegativeTrackerValues();mo.disconnect();},10000);
 }
 function trackerTable(){var row=document.querySelector('tr[data-zb-score-value]');return row&&row.closest('table');}
 function firstNumber(txt){
  var m=String(txt||'').replace(/,/g,'').match(/[+\-−]?\d+(?:\.\d+)?/);
  if(!m)return null;
  var n=Number(m[0].replace('−','-'));return isFinite(n)?n:null;
 }
 function sortValue(th,td,tr){
  var h=(th.textContent||'').replace(/[↕↓↑]/g,'').replace(/\s+/g,' ').trim();
  if(/투자매력도|제로베이스/.test(h)){var z=Number(tr.dataset.zbScoreValue);return isFinite(z)?z:null;}
  if(/실제 비중조절/.test(h)){var b=td&&td.querySelector('b');return firstNumber(b?b.textContent:td&&td.textContent);}
  if(/점수 기여도/.test(h)){
   var vals=Array.from((td&&td.querySelectorAll('span'))||[]).map(function(x){return firstNumber(x.textContent);}).filter(function(x){return x!=null;});
   return vals.length?vals.reduce(function(a,b){return a+b;},0):null;
  }
  return firstNumber(td&&td.textContent);
 }
 function decorateTrackerSort(){
  var table=trackerTable();if(!table)return false;
  var head=table.querySelector('thead tr')||table.querySelector('tr');if(!head)return false;
  Array.from(head.children).forEach(function(th){
   var name=(th.textContent||'').replace(/[↕↓↑]/g,'').replace(/\s+/g,' ').trim();
   if(!name||/^종목/.test(name))return;
   th.dataset.trackerSort='1';
   th.style.cursor='pointer';th.style.userSelect='none';th.title='클릭하여 정렬';
   var mark=th.querySelector('[data-sort-mark]');
   if(!mark){mark=document.createElement('span');mark.dataset.sortMark='1';mark.style.cssText='margin-left:4px;font-size:9px;color:var(--faint)';mark.textContent='↕';th.appendChild(mark);}
  });
  return true;
 }
 function sortTrackerBy(th){
  if(!th||th.dataset.trackerSort!=='1')return false;
  var table=th.closest('table');if(!table||!table.querySelector('tr[data-zb-score-value]'))return false;
  var head=table.querySelector('thead tr')||table.querySelector('tr'),body=table.querySelector('tbody');if(!head||!body)return false;
  var idx=Array.from(head.children).indexOf(th);if(idx<0)return false;
  var dir=th.dataset.sortDir==='desc'?'asc':'desc';
  Array.from(head.children).forEach(function(x){x.dataset.sortDir='';var m=x.querySelector('[data-sort-mark]');if(m)m.textContent='↕';});
  th.dataset.sortDir=dir;var mark=th.querySelector('[data-sort-mark]');if(mark)mark.textContent=dir==='desc'?'↓':'↑';
  var rows=Array.from(body.querySelectorAll('tr[data-zb-score-value]')).map(function(tr,order){return {tr:tr,order:order,v:sortValue(th,tr.children[idx],tr)};});
  rows.sort(function(a,b){if(a.v==null&&b.v==null)return a.order-b.order;if(a.v==null)return 1;if(b.v==null)return -1;if(a.v===b.v)return a.order-b.order;return dir==='desc'?b.v-a.v:a.v-b.v;});
  rows.forEach(function(x){body.appendChild(x.tr);});
  return true;
 }
 function watchTrackerSort(){
  decorateTrackerSort();
  if(!document.documentElement._trackerSortDelegated){
   document.documentElement._trackerSortDelegated=true;
   document.addEventListener('click',function(e){
    var th=e.target&&e.target.closest?e.target.closest('th[data-tracker-sort="1"]'):null;
    if(th&&sortTrackerBy(th)){e.preventDefault();e.stopPropagation();}
   },true);
  }
  var scheduled=false;
  var mo=new MutationObserver(function(){
   if(scheduled)return;scheduled=true;
   requestAnimationFrame(function(){scheduled=false;decorateTrackerSort();});
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});
 }
 function paint(){var grid=document.getElementById('mktIndicators');if(!grid)return;var el=document.getElementById('mkt_capital_scarcity');if(!el){el=document.createElement('div');el.className='mkt-card';el.id='mkt_capital_scarcity';el.setAttribute('data-indicator-key','capital_scarcity');grid.appendChild(el);}
  fetch('capital_scarcity.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(function(j){var v=j.values||{},c=j.changeBp||{};var lv=j.level||'green';var ko=lv==='red'?'경고':lv==='amber'?'주의':'정상';var cls=lv==='red'?'wn':lv==='amber'?'nt':'ok';var mx=j.scoreMax||4;
   el.innerHTML='<div class="mkt-nm">AI 자본 희소성</div><div class="mkt-val">실질 '+f(v.real10y)+'%</div><div class="mkt-lens"><div class="l1"><b>할인율 분해</b> 10Y TIPS · BEI · 기간 프리미엄</div><div class="l2">BEI '+f(v.breakeven10y)+'% · TP '+f(v.termPremium10y)+'% · 실질 3M '+(c.real10y_3m==null?'—':(c.real10y_3m>=0?'+':'')+c.real10y_3m+'bp')+' → <span class="'+cls+'">'+ko+' '+(j.score||0)+'/'+mx+'</span></div></div><div class="mkt-span">'+(j.asOf||'수집 대기')+' · U.S. Treasury / NY Fed</div>';
  }).catch(function(){el.innerHTML='<div class="mkt-nm">AI 자본 희소성</div><div class="mkt-ph">실질금리·기간프리미엄 수집 대기</div>';});}
 function wire(){watchDuplicateZeroBaseNote();watchNegativeTrackerValues();watchTrackerSort();paint();var t=document.querySelector('.tab[data-v="market"]');if(t)t.addEventListener('click',function(){setTimeout(function(){paint();paintNegativeTrackerValues();decorateTrackerSort();},80);});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
 window.renderCapitalScarcity=paint;
})();
