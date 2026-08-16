/* upside-bars.js — 05 추정 리비전 트래커 목표가 상승여력 비교 막대 */
(function(){
  'use strict';
  function css(){
    if(document.getElementById('upside-bars-css'))return;
    var s=document.createElement('style');s.id='upside-bars-css';
    s.textContent='.pe-room{min-width:72px}.pe-room-bar{display:block;width:72px;height:5px;margin:4px auto 0;border-radius:3px;overflow:hidden;background:var(--line)}'
      +'.pe-room-bar>i{display:block;height:100%;border-radius:inherit;background:var(--st-dawn)}.pe-room-bar.neg>i{background:var(--st-hot)}';
    document.head.appendChild(s);
  }
  function enhance(){
    var host=document.getElementById('probEst');if(!host)return;
    host.querySelectorAll('.pe-p').forEach(function(label){
      var m=label.textContent.trim().match(/^여력\s+([+-]?\d+(?:\.\d+)?)%/);if(!m)return;
      var cell=label.closest('td');if(!cell||cell.querySelector('.pe-room-bar'))return;
      var value=Number(m[1]);if(!Number.isFinite(value))return;
      var bar=document.createElement('span');bar.className='pe-room-bar'+(value<0?' neg':'');
      bar.setAttribute('role','img');bar.setAttribute('aria-label','목표가 상승여력 '+(value>0?'+':'')+value+'%, 100% 기준 막대');
      bar.title='0~100% 동일 기준';bar.innerHTML='<i style="width:'+Math.min(100,Math.abs(value))+'%"></i>';
      cell.classList.add('pe-room');cell.appendChild(bar);
    });
  }
  function boot(){
    css();enhance();
    var host=document.getElementById('probEst');
    if(host&&window.MutationObserver)new MutationObserver(enhance).observe(host,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
