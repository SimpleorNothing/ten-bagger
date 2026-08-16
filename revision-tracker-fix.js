/* 05 추정 리비전 트래커 정렬 회귀 핫픽스 */
(function(){
  'use strict';
  function trackerTable(){
    var host=document.getElementById('probEst');
    if(!host)return null;
    var rows=host.querySelectorAll('tr[data-zb-score-value]');
    if(rows.length)return rows[0].closest('table');
    var tables=host.querySelectorAll('table.pe-tbl');
    return tables.length?tables[tables.length-1]:null;
  }
  function firstNumber(txt){
    var m=String(txt||'').replace(/,/g,'').match(/[+\-−]?\d+(?:\.\d+)?/);
    if(!m)return null;
    var n=Number(m[0].replace('−','-'));
    return Number.isFinite(n)?n:null;
  }
  function cleanHead(th){return String(th&&th.textContent||'').replace(/[↕↓↑]/g,'').replace(/\s+/g,' ').trim();}
  function sortValue(th,td,tr){
    var h=cleanHead(th);
    if(/투자매력도|제로베이스/.test(h)){
      var z=Number(tr.dataset.zbScoreValue);return Number.isFinite(z)?z:null;
    }
    if(/실제 비중조절/.test(h)){
      var b=td&&td.querySelector('b');return firstNumber(b?b.textContent:td&&td.textContent);
    }
    if(/점수 기여도/.test(h)){
      var vals=Array.from((td&&td.querySelectorAll('span'))||[]).map(function(x){return firstNumber(x.textContent);}).filter(function(x){return x!=null;});
      return vals.length?vals.reduce(function(a,b){return a+b;},0):null;
    }
    if(/상향\/하향/.test(h)){
      var t=String(td&&td.textContent||'').replace(/,/g,'');
      var up=t.match(/▲\s*(\d+(?:\.\d+)?)/),dn=t.match(/▼\s*(\d+(?:\.\d+)?)/);
      return (up?Number(up[1]):0)-(dn?Number(dn[1]):0);
    }
    return firstNumber(td&&td.textContent);
  }
  function decorate(){
    var table=trackerTable();if(!table)return false;
    var head=table.querySelector('thead tr');if(!head)return false;
    Array.from(head.children).forEach(function(th){
      var name=cleanHead(th);
      if(!name||/^종목/.test(name))return;
      th.setAttribute('data-rev-sort','1');
      th.style.cursor='pointer';th.style.userSelect='none';th.title='클릭하여 정렬';
      var mark=th.querySelector('[data-rev-sort-mark]');
      if(!mark){mark=document.createElement('span');mark.setAttribute('data-rev-sort-mark','1');mark.style.cssText='margin-left:4px;font-size:9px;color:var(--faint)';mark.textContent='↕';th.appendChild(mark);}
    });
    return true;
  }
  function sort(th){
    var table=th&&th.closest('table');if(!table)return;
    var head=table.querySelector('thead tr'),body=table.querySelector('tbody');if(!head||!body)return;
    var idx=Array.from(head.children).indexOf(th);if(idx<0)return;
    var dir=th.getAttribute('data-sort-dir')==='desc'?'asc':'desc';
    Array.from(head.children).forEach(function(x){x.removeAttribute('data-sort-dir');var m=x.querySelector('[data-rev-sort-mark]');if(m)m.textContent='↕';});
    th.setAttribute('data-sort-dir',dir);var mark=th.querySelector('[data-rev-sort-mark]');if(mark)mark.textContent=dir==='desc'?'↓':'↑';
    var all=Array.from(body.children).filter(function(tr){return tr.tagName==='TR';});
    var sortable=all.filter(function(tr){return tr.hasAttribute('data-zb-score-value');});
    if(!sortable.length)sortable=all.filter(function(tr){return tr.children.length>1;});
    var mapped=sortable.map(function(tr,order){return {tr:tr,order:order,v:sortValue(th,tr.children[idx],tr)};});
    mapped.sort(function(a,b){
      if(a.v==null&&b.v==null)return a.order-b.order;if(a.v==null)return 1;if(b.v==null)return -1;
      if(a.v===b.v)return a.order-b.order;return dir==='desc'?b.v-a.v:a.v-b.v;
    });
    mapped.forEach(function(x){body.appendChild(x.tr);});
  }
  document.addEventListener('click',function(e){
    var th=e.target&&e.target.closest?e.target.closest('th[data-rev-sort="1"]'):null;
    if(!th)return;
    e.preventDefault();e.stopPropagation();sort(th);
  },true);
  function boot(){
    decorate();
    var host=document.getElementById('probEst')||document.body;
    if(window.MutationObserver&&host){
      var queued=false;
      new MutationObserver(function(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;decorate();});}).observe(host,{childList:true,subtree:true});
    }
    var tries=0,t=setInterval(function(){tries++;if(decorate()||tries>60)clearInterval(t);},250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
