/* Keep the visible site-change history in sync with deploy-verified site changes.
 * The update badge owns its click behavior so it does not depend on changelog.js
 * successfully opening a legacy .cyc-pop modal first.
 */
(function(){
  'use strict';
  var rows=[];
  /* 배포 커밋 수집 지연과 무관하게 사용자에게 보이는 변경은 즉시 이력에 남긴다. */
  var REQUIRED_VISIBLE_ROWS=[
    {d:'2026-09-04',t:'00 시장 지도 신설 — 기존 메뉴를 유지한 채 시장 레짐·자금 이동·전력·달러/금융·차세대 성장축을 한 화면에서 확인',sha:'world-overview-20260904'},
    {d:'2026-09-02',t:'02 기업분석을 페이지 초기 화면으로 변경 — 01 시장 모니터링이 먼저 보였다가 전환되는 현상 제거',sha:'company-initial-view-20260902'}
  ];
  var ready=false;
  var modal=null;
  var badgePatchQueued=false;
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
  function parseCurated(text){
    var out=[];
    String(text||'').replace(/\{d:'(\d{4}-\d{2}-\d{2})',t:'((?:\\'|[^'])*)'\}/g,function(_,d,t){
      out.push({d:d,t:t.replace(/\\'/g,"'"),sha:'curated-'+out.length});return _;
    });
    return out;
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
    badgePatchQueued=false;
    if(!rows.length)return;
    var latest=latestRows()[0];
    var total=rows.length;
    var html='update : '+fmtDate(latest.d)+' · <span class="his">이력 '+total+'</span>';
    Array.prototype.forEach.call(document.querySelectorAll('.mkt-upd'),function(n){
      if(n.innerHTML!==html)n.innerHTML=html;
      if(n.getAttribute('title')!=='실제 배포 확인된 사이트 변경일 · 클릭 시 사이트 변경 이력')n.setAttribute('title','실제 배포 확인된 사이트 변경일 · 클릭 시 사이트 변경 이력');
      if(n.getAttribute('role')!=='button')n.setAttribute('role','button');
      if(n.getAttribute('tabindex')!=='0')n.setAttribute('tabindex','0');
      if(n.style.cursor!=='pointer')n.style.cursor='pointer';
    });
  }
  function queueBadgePatch(){
    if(badgePatchQueued)return;
    badgePatchQueued=true;
    (window.requestAnimationFrame||function(cb){return setTimeout(cb,16);})(patchBadges);
  }
  function finish(data){rows=REQUIRED_VISIBLE_ROWS.concat(Array.isArray(data)?data:[]);ready=true;queueBadgePatch();if(modal&&modal.style.display==='flex')renderModal();}
  function fetchCurated(){
    return fetch('/changelog.js?t='+Date.now(),{cache:'no-store',credentials:'same-origin'})
      .then(function(r){if(!r.ok)throw new Error('changelog HTTP '+r.status);return r.text();})
      .then(function(text){var parsed=parseCurated(text);finish(parsed);return parsed;});
  }
  function fetchRows(){
    fetch('/__site_changes?t='+Date.now(),{cache:'no-store',credentials:'same-origin'})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
      .then(function(data){var normalized=normalize(data);if(normalized.length){finish(normalized);return;}return fetchCurated();})
      .catch(function(e){
        fetchCurated().catch(function(e2){finish([]);if(window.console&&console.warn)console.warn('[site-change-live]',e2&&e2.message||e2,e&&e.message||e);});
      });
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
  if(window.MutationObserver&&document.body){
    new MutationObserver(function(mutations){
      var needs=false;
      for(var i=0;i<mutations.length&&!needs;i++){
        var added=mutations[i].addedNodes||[];
        for(var j=0;j<added.length;j++){
          var node=added[j];
          if(!node||node.nodeType!==1)continue;
          if((node.matches&&node.matches('.mkt-upd'))||(node.querySelector&&node.querySelector('.mkt-upd')))needs=true;
        }
      }
      if(needs)queueBadgePatch();
    }).observe(document.body,{childList:true,subtree:true});
  }
  fetchRows();
})();

/* 00 시장 지도 자가 마운트 로더. 기존 메뉴를 건드리지 않고 첫 번째 탭 앞에 00을 삽입한다. */
(function(){
  if(document.querySelector('script[data-world-overview-loader]'))return;
  var s=document.createElement('script');
  s.src='/world-overview.js?v=20260904';
  s.defer=true;
  s.setAttribute('data-world-overview-loader','1');
  document.body.appendChild(s);
})();

/* 02 기업분석 자가 마운트 로더. index.html 대용량 파일을 직접 패치하지 않는다. */
(function(){
  if(document.querySelector('script[data-company-analysis-loader]'))return;
  var s=document.createElement('script');
  s.src='/company.js?v=20260901-broadcom';
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
  s.src='/company-patch.js?v=20260901-broadcom';
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
