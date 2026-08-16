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
 function paint(){var grid=document.getElementById('mktIndicators');if(!grid)return;var el=document.getElementById('mkt_capital_scarcity');if(!el){el=document.createElement('div');el.className='mkt-card';el.id='mkt_capital_scarcity';el.setAttribute('data-indicator-key','capital_scarcity');grid.appendChild(el);}
  fetch('capital_scarcity.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(function(j){var v=j.values||{},c=j.changeBp||{};var lv=j.level||'green';var ko=lv==='red'?'경고':lv==='amber'?'주의':'정상';var cls=lv==='red'?'wn':lv==='amber'?'nt':'ok';var mx=j.scoreMax||4;
   el.innerHTML='<div class="mkt-nm">AI 자본 희소성</div><div class="mkt-val">실질 '+f(v.real10y)+'%</div><div class="mkt-lens"><div class="l1"><b>할인율 분해</b> 10Y TIPS · BEI · 기간 프리미엄</div><div class="l2">BEI '+f(v.breakeven10y)+'% · TP '+f(v.termPremium10y)+'% · 실질 3M '+(c.real10y_3m==null?'—':(c.real10y_3m>=0?'+':'')+c.real10y_3m+'bp')+' → <span class="'+cls+'">'+ko+' '+(j.score||0)+'/'+mx+'</span></div></div><div class="mkt-span">'+(j.asOf||'수집 대기')+' · U.S. Treasury / NY Fed</div>';
  }).catch(function(){el.innerHTML='<div class="mkt-nm">AI 자본 희소성</div><div class="mkt-ph">실질금리·기간 프리미엄 수집 대기</div>';});}
 function wire(){watchDuplicateZeroBaseNote();paint();var t=document.querySelector('.tab[data-v="market"]');if(t)t.addEventListener('click',function(){setTimeout(paint,80);});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
 window.renderCapitalScarcity=paint;
})();
