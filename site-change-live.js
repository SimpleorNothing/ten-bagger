/* Keep the visible site-change history in sync with deploy-verified site changes.
 * The update badge owns its click behavior so it does not depend on changelog.js
 * successfully opening a legacy .cyc-pop modal first.
 */
(function(){
  'use strict';
  var rows=[];
  var ready=false;
  var modal=null;
  function fmtDate(s){
    var m=String(s||'').match(/(\d{4})-(\d{2})-(\d{2})/);
    return m?m[1]+'.'+m[2]+'.'+m[3]:'—';
  }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function normalize(input){
    if(!Array.isArray(input))return [];
    return input.map(function(x){
      var c=x&&x.commit||{},a=c.author||{};
      return {d:String(a.date||'').slice(0,10),t:String(c.message||'').split('\n')[0].trim(),sha:String(x&&x.sha||'')};
    }).filter(function(x){return x.d&&x.t;});
  }
  function latestRows(){
    return rows.slice().sort(function(a,b){
      var d=String(b.d).localeCompare(String(a.d));
      return d||String(b.sha).localeCompare(String(a.sha));
    });
  }
  function ensureModal(){
    if(modal&&document.body.contains(modal))return modal;
    modal=document.createElement('div');
    modal.id='siteChangeHistoryModal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','siteChangeHistoryTitle');
    modal.style.cssText='position:fixed;inset:0;z-index:220;display:none;align-items:center;justify-content:center;padding:22px;background:rgba(15,23,42,.38);backdrop-filter:blur(2px)';
    modal.innerHTML='<div data-site-history-panel style="width:min(760px,96vw);max-height:min(78vh,760px);overflow:hidden;background:var(--panel,#fff);color:var(--txt,#14323f);border:1px solid var(--line,#ccd8dc);border-radius:14px;box-shadow:0 22px 70px rgba(15,23,42,.22);display:flex;flex-direction:column">'+
      '<div style="display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid var(--line,#ccd8dc)"><div style="min-width:0"><div id="siteChangeHistoryTitle" style="font-weight:800;font-size:16px">사이트 변경 이력</div><div data-site-history-count style="font-size:11px;color:var(--faint,#8ba0a9);margin-top:2px">불러오는 중</div></div><button type="button" data-site-history-close aria-label="닫기" style="margin-left:auto;border:1px solid var(--line,#ccd8dc);background:transparent;color:var(--dim,#5c7885);border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:18px">×</button></div>'+
      '<div data-site-history-list style="overflow:auto;padding:4px 18px 16px"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',function(e){if(e.target===modal)closeModal();});
    modal.querySelector('[data-site-history-close]').addEventListener('click',closeModal);
    return modal;
  }
  function renderModal(){
    ensureModal();
    var list=modal.querySelector('[data-site-history-list]');
    var count=modal.querySelector('[data-site-history-count]');
    if(!ready){count.textContent='불러오는 중';list.innerHTML='<div style="padding:18px 0;color:var(--faint,#8ba0a9)">변경 이력을 불러오는 중입니다.</div>';return;}
    var sorted=latestRows();
    count.textContent='총 '+sorted.length+'건';
    if(!sorted.length){list.innerHTML='<div style="padding:18px 0;color:var(--faint,#8ba0a9)">표시할 변경 이력이 없습니다.</div>';return;}
    list.innerHTML=sorted.map(function(r){return '<div data-live-site-change="'+esc(r.sha||'1')+'" style="display:grid;grid-template-columns:92px 1fr;gap:12px;padding:11px 0;border-bottom:1px solid var(--line,#ccd8dc)"><div style="font-variant-numeric:tabular-nums;color:var(--faint,#8ba0a9);font-size:11px">'+fmtDate(r.d)+'</div><div style="font-size:12px;line-height:1.55;color:var(--txt,#14323f)">'+esc(r.t)+'</div></div>';}).join('');
  }
  function openModal(){
    ensureModal();
    renderModal();
    modal.style.display='flex';
    document.documentElement.style.overflow='hidden';
    var btn=modal.querySelector('[data-site-history-close]');if(btn)btn.focus();
  }
  function closeModal(){
    if(!modal)return;
    modal.style.display='none';
    document.documentElement.style.overflow='';
  }
  function patchBadges(){
    if(!rows.length)return;
    var latest=latestRows()[0];
    var total=rows.length;
    Array.prototype.forEach.call(document.querySelectorAll('.mkt-upd'),function(n){
      n.innerHTML='update : '+fmtDate(latest.d)+' · <span class="his">이력 '+total+'</span>';
      n.setAttribute('title','실제 배포 확인된 사이트 변경일 · 클릭 시 사이트 변경 이력');
      n.setAttribute('role','button');
      n.setAttribute('tabindex','0');
      n.style.cursor='pointer';
    });
  }
  function fetchRows(){
    fetch('/__site_changes?t='+Date.now(),{cache:'no-store',credentials:'same-origin'})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
      .then(function(data){rows=normalize(data);ready=true;patchBadges();if(modal&&modal.style.display==='flex')renderModal();})
      .catch(function(e){ready=true;rows=[];if(modal&&modal.style.display==='flex')renderModal();if(window.console&&console.warn)console.warn('[site-change-live]',e&&e.message||e);});
  }
  document.addEventListener('click',function(e){
    var hit=e.target&&e.target.closest&&e.target.closest('.mkt-upd');
    if(!hit)return;
    e.preventDefault();
    e.stopPropagation();
    openModal();
  },true);
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&modal&&modal.style.display==='flex'){e.preventDefault();closeModal();return;}
    if((e.key==='Enter'||e.key===' ')&&e.target&&e.target.closest&&e.target.closest('.mkt-upd')){e.preventDefault();openModal();}
  },true);
  if(window.MutationObserver&&document.body){new MutationObserver(function(){patchBadges();}).observe(document.body,{childList:true,subtree:true});}
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
