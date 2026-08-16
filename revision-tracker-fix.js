/* 05 추정 리비전 트래커 정렬 + 포워드 지표 보강
 * - 현재가 컬럼 추가
 * - 포워드 PER = 현재가 / 다음 달력연도 EPS
 * - 포워드 EPS는 provider의 단순 +1y가 아니라 '현재 달력연도 + 1' 종료연도를 선택
 * - 화면에는 중복 FY+1 EPS를 숨기고 검증된 다음 달력연도 EPS만 표시
 */
(function(){
  'use strict';
  var STATE={gamma:null,prices:null};
  var TARGET_YEAR=(new Date()).getFullYear()+1;
  function trackerTable(){var host=document.getElementById('probEst');if(!host)return null;var rows=host.querySelectorAll('tr[data-zb-score-value]');if(rows.length)return rows[0].closest('table');var tables=host.querySelectorAll('table.pe-tbl');return tables.length?tables[tables.length-1]:null;}
  function firstNumber(txt){var m=String(txt||'').replace(/,/g,'').match(/[+\-−]?\d+(?:\.\d+)?/);if(!m)return null;var n=Number(m[0].replace('−','-'));return Number.isFinite(n)?n:null;}
  function cleanHead(th){return String(th&&th.textContent||'').replace(/[↕↓↑]/g,'').replace(/\s+/g,' ').trim();}
  function tickerOf(tr){var el=tr&&tr.querySelector('.pe-nm .tk');if(el&&el.textContent)return el.textContent.trim().toUpperCase();var tk=tr&&tr.dataset&&tr.dataset.zbTicker;if(tk)return String(tk).trim().toUpperCase();var first=tr&&tr.children&&tr.children[0];var a=String(first&&first.textContent||'').match(/\b(\d{6}|[A-Z]{1,6})\b/g);return a&&a.length?a[a.length-1].toUpperCase():null;}
  function gammaRow(tk){return (((STATE.gamma||{}).gamma)||STATE.gamma||{})[tk]||null;}
  function priceFor(tk,G){var qs=(STATE.prices&&STATE.prices.quotes)||{};var keys=Object.keys(qs);for(var i=0;i<keys.length;i++){var q=qs[keys[i]];if(q&&String(q.ticker||'').toUpperCase()===tk&&Number.isFinite(Number(q.price)))return Number(q.price);}return G&&Number.isFinite(Number(G.price))?Number(G.price):null;}
  function yearOf(end){var m=String(end||'').match(/^(\d{4})-/);return m?Number(m[1]):null;}
  function forwardPeriod(G){var E=G&&G.rev&&G.rev.eps;if(!E)return null;var candidates=[E.fy0,E.fy1].filter(Boolean);for(var i=0;i<candidates.length;i++){if(yearOf(candidates[i].end)===TARGET_YEAR)return candidates[i];}return null;}
  function fmtPrice(v){if(v==null||!Number.isFinite(Number(v)))return '—';v=Number(v);var d=v>=1000?0:2;return v.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:d});}
  function fmtEps(v){if(v==null||!Number.isFinite(Number(v)))return '—';return Number(v).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2});}
  function signed(v,suffix){if(v==null||!Number.isFinite(Number(v)))return '—';v=Number(v);return (v>0?'+':'')+v.toFixed(1)+(suffix||'');}
  function color(v){return v==null?'var(--faint)':Number(v)<0?'var(--st-hot)':'var(--st-dawn)';}
  function headIndex(head,re){return Array.from(head.children).findIndex(function(x){return re.test(cleanHead(x));});}
  function makeHead(html){var th=document.createElement('th');th.className='c';th.setAttribute('data-forward-metric','1');th.innerHTML=html;return th;}
  function makeCell(html){var td=document.createElement('td');td.className='c';td.setAttribute('data-forward-metric','1');td.innerHTML=html;return td;}
  function hideLegacyFy1(table){var head=table&&table.querySelector('thead tr');if(!head)return;var hs=Array.from(head.children);hs.forEach(function(th,idx){var name=cleanHead(th);if(/^EPS\s*FY\+1/.test(name)||(/^EPS\b/.test(name)&&/FY\+1/.test(name))){th.style.display='none';Array.from(table.querySelectorAll('tbody tr')).forEach(function(tr){if(tr.children[idx])tr.children[idx].style.display='none';});}});}
  function enhanceMetrics(){
    var table=trackerTable();if(!table||!STATE.gamma||!STATE.prices)return false;var head=table.querySelector('thead tr'),body=table.querySelector('tbody');if(!head||!body)return false;
    hideLegacyFy1(table);
    if(table.dataset.forwardMetrics==='1')return true;
    var targetIdx=headIndex(head,/^목표가/);if(targetIdx<0)return false;
    head.insertBefore(makeHead('현재가<br><span style="font-weight:400;color:var(--faint)">latest</span>'),head.children[targetIdx+1]||null);
    head.insertBefore(makeHead('PER<br><span style="font-weight:400;color:var(--faint)">Forward '+TARGET_YEAR+'E</span>'),head.children[targetIdx+2]||null);
    var epsIdx=headIndex(head,/^EPS\b/);if(epsIdx>=0&&head.children[epsIdx].style.display!=='none')head.children[epsIdx].innerHTML='EPS<br><span style="font-weight:400;color:var(--faint)">Forward '+TARGET_YEAR+'E</span>';
    var revIdx=headIndex(head,/^EPS 리비전/),udIdx=headIndex(head,/^상향\/하향/),gateIdx=headIndex(head,/강등 게이트/),revInserted=false;
    if(revIdx<0&&udIdx>=0){head.insertBefore(makeHead('EPS 리비전<br><span style="font-weight:400;color:var(--faint)">30d · 90d</span>'),head.children[udIdx]||null);revIdx=udIdx;udIdx++;if(gateIdx>=0)gateIdx++;revInserted=true;}
    Array.from(body.querySelectorAll('tr')).forEach(function(tr){
      if(tr.children.length<2)return;var tk=tickerOf(tr),G=tk?gammaRow(tk):null,F=forwardPeriod(G),px=tk?priceFor(tk,G):null;var eps=F&&Number.isFinite(Number(F.now))?Number(F.now):null;var pe=(px!=null&&eps!=null&&eps>0)?px/eps:null;
      tr.insertBefore(makeCell('<b>'+fmtPrice(px)+'</b><div class="pe-p">현재가</div>'),tr.children[targetIdx+1]||null);
      tr.insertBefore(makeCell('<b>'+(pe==null?'—':pe.toFixed(1)+'x')+'</b><div class="pe-p">'+TARGET_YEAR+'E</div>'),tr.children[targetIdx+2]||null);
      if(revInserted)tr.insertBefore(makeCell(''),tr.children[revIdx]||null);
      if(epsIdx>=0){var ecell=tr.children[epsIdx];if(ecell&&ecell.style.display!=='none')ecell.innerHTML='<b>'+fmtEps(eps)+'</b><div class="pe-p">'+(F?TARGET_YEAR:'자료없음')+'</div>';}
      if(revIdx>=0){var rcell=tr.children[revIdx],c30=F&&F.c30,c90=F&&F.c90;if(rcell)rcell.innerHTML='<b style="color:'+color(c30)+'">'+signed(c30,'%')+'</b><div class="pe-p">90d '+signed(c90,'%')+'</div>';}
      if(udIdx>=0){var ucell=tr.children[udIdx],up=F&&F.up30,dn=F&&F.dn30;if(ucell)ucell.innerHTML='<b style="color:var(--st-dawn)">▲'+(up==null?'—':up)+'</b> / <b style="color:var(--st-hot)">▼'+(dn==null?'—':dn)+'</b><div class="pe-p">애널 30d</div>';}
      if(gateIdx>=0){var gcell=tr.children[gateIdx],p30=G&&G.rev&&G.rev.px&&G.rev.px.c30,c30g=F&&F.c30,gap=(p30==null||c30g==null)?null:Number(p30)-Number(c30g);if(gcell)gcell.innerHTML='<b style="color:'+color(-gap)+'">'+signed(gap,'p')+'</b><div class="pe-p">주가−EPS 30d</div>';}
    });table.dataset.forwardMetrics='1';hideLegacyFy1(table);return true;
  }
  function sortValue(th,td,tr){var h=cleanHead(th);if(/투자매력도|제로베이스/.test(h)){var z=Number(tr.dataset.zbScoreValue);return Number.isFinite(z)?z:null;}if(/실제 비중조절/.test(h)){var b=td&&td.querySelector('b');return firstNumber(b?b.textContent:td&&td.textContent);}if(/점수 기여도/.test(h)){var vals=Array.from((td&&td.querySelectorAll('span'))||[]).map(function(x){return firstNumber(x.textContent);}).filter(function(x){return x!=null;});return vals.length?vals.reduce(function(a,b){return a+b;},0):null;}if(/상향\/하향/.test(h)){var t=String(td&&td.textContent||'').replace(/,/g,'');var up=t.match(/▲\s*(\d+(?:\.\d+)?)/),dn=t.match(/▼\s*(\d+(?:\.\d+)?)/);return (up?Number(up[1]):0)-(dn?Number(dn[1]):0);}return firstNumber(td&&td.textContent);}
  function decorate(){var table=trackerTable();if(!table)return false;enhanceMetrics();hideLegacyFy1(table);var head=table.querySelector('thead tr');if(!head)return false;Array.from(head.children).forEach(function(th){var name=cleanHead(th);if(!name||/^종목/.test(name)||th.style.display==='none')return;th.setAttribute('data-rev-sort','1');th.style.cursor='pointer';th.style.userSelect='none';th.title='클릭하여 정렬';var mark=th.querySelector('[data-rev-sort-mark]');if(!mark){mark=document.createElement('span');mark.setAttribute('data-rev-sort-mark','1');mark.style.cssText='margin-left:4px;font-size:9px;color:var(--faint)';mark.textContent='↕';th.appendChild(mark);}});return true;}
  function sort(th){var table=th&&th.closest('table');if(!table)return;var head=table.querySelector('thead tr'),body=table.querySelector('tbody');if(!head||!body)return;var idx=Array.from(head.children).indexOf(th);if(idx<0)return;var dir=th.getAttribute('data-sort-dir')==='desc'?'asc':'desc';Array.from(head.children).forEach(function(x){x.removeAttribute('data-sort-dir');var m=x.querySelector('[data-rev-sort-mark]');if(m)m.textContent='↕';});th.setAttribute('data-sort-dir',dir);var mark=th.querySelector('[data-rev-sort-mark]');if(mark)mark.textContent=dir==='desc'?'↓':'↑';var all=Array.from(body.children).filter(function(tr){return tr.tagName==='TR';});var sortable=all.filter(function(tr){return tr.hasAttribute('data-zb-score-value');});if(!sortable.length)sortable=all.filter(function(tr){return tr.children.length>1;});var mapped=sortable.map(function(tr,order){return {tr:tr,order:order,v:sortValue(th,tr.children[idx],tr)};});mapped.sort(function(a,b){if(a.v==null&&b.v==null)return a.order-b.order;if(a.v==null)return 1;if(b.v==null)return -1;if(a.v===b.v)return a.order-b.order;return dir==='desc'?b.v-a.v:a.v-b.v;});mapped.forEach(function(x){body.appendChild(x.tr);});}
  document.addEventListener('click',function(e){var th=e.target&&e.target.closest?e.target.closest('th[data-rev-sort="1"]'):null;if(!th)return;e.preventDefault();e.stopPropagation();sort(th);},true);
  function boot(){Promise.all([fetch('/gamma.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;}),fetch('/prices.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;})]).then(function(x){STATE.gamma=x[0];STATE.prices=x[1];decorate();});var host=document.getElementById('probEst')||document.body;if(window.MutationObserver&&host){var queued=false;new MutationObserver(function(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;decorate();});}).observe(host,{childList:true,subtree:true});}var tries=0,t=setInterval(function(){tries++;if((decorate()&&STATE.gamma&&STATE.prices)||tries>80)clearInterval(t);},250);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();