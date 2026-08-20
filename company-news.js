/* 02 기업분석 · 주요 뉴스 데일리 오버레이.
   기업 본문(company.js)과 분리해 company_news.json을 no-store로 읽고
   선택 기업의 최근 주요 뉴스만 렌더링한다. */
(function(){
  'use strict';
  var DATA=null, LOADING=false, LAST_KEY='', TIMER=null;

  function esc(s){
    return String(s==null?'':s).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function fmtDate(s){
    var m=String(s||'').match(/(\d{4})-(\d{2})-(\d{2})/);
    return m?m[1]+'.'+m[2]+'.'+m[3]:'—';
  }
  function fmtChecked(s){
    if(!s)return '—';
    try{
      var d=new Date(s);
      if(isNaN(d))return fmtDate(s);
      return new Intl.DateTimeFormat('ko-KR',{
        timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',
        hour:'2-digit',minute:'2-digit',hour12:false
      }).format(d).replace(/\.\s?/g,'.').replace(/\.$/,'');
    }catch(e){return fmtDate(s);}
  }
  function installStyle(){
    if(document.getElementById('company-news-style'))return;
    var st=document.createElement('style');
    st.id='company-news-style';
    st.textContent=''
      +'#v-company .ca-news-list{display:grid;gap:8px}'
      +'#v-company .ca-news-item{display:grid;grid-template-columns:92px minmax(0,1fr);gap:12px;padding:13px 14px;background:var(--panel);border:1px solid var(--line);border-radius:3px}'
      +'#v-company .ca-news-date{font-size:12px;color:var(--faint);font-variant-numeric:tabular-nums;padding-top:2px}'
      +'#v-company .ca-news-meta{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:5px}'
      +'#v-company .ca-news-tag{font-size:11px;font-weight:800;color:var(--dawn);border:1px solid rgba(42,111,151,.26);border-radius:12px;padding:2px 7px;background:rgba(42,111,151,.05)}'
      +'#v-company .ca-news-source{font-size:11px;color:var(--faint)}'
      +'#v-company .ca-news-title{font-size:14px;line-height:1.45;font-weight:750;color:var(--txt);text-decoration:none}'
      +'#v-company .ca-news-title:hover{text-decoration:underline}'
      +'#v-company .ca-news-summary{font-size:13px;line-height:1.45;color:var(--dim);margin-top:5px}'
      +'#v-company .ca-news-empty{padding:15px;background:var(--panel);border:1px solid var(--line);border-radius:3px;color:var(--dim);font-size:13px}'
      +'#v-company .ca-news-rule{margin-top:8px;color:var(--faint);font-size:11px}'
      +'@media(max-width:620px){#v-company .ca-news-item{grid-template-columns:1fr;gap:4px}#v-company .ca-news-date{padding-top:0}}';
    document.head.appendChild(st);
  }
  function tierLabel(item){
    if(item&&item.verified==='official')return '공식 원문';
    if(item&&item.sourceTier===2)return '신뢰 원문';
    return '확인 기사';
  }
  function currentTicker(){
    var n=document.querySelector('#v-company .ca-company-title span');
    return n?String(n.textContent||'').trim().toUpperCase():'';
  }
  function render(){
    installStyle();
    var app=document.getElementById('companyApp');
    var ticker=currentTicker();
    if(!app||!ticker||!DATA)return;
    var entry=DATA.companies&&DATA.companies[ticker];
    var items=entry&&Array.isArray(entry.items)?entry.items:[];
    var key=ticker+'|'+String(DATA.checkedAt||'')+'|'+items.map(function(x){return x.id||x.url||x.title;}).join('|');
    var existing=app.querySelector('[data-company-news]');
    if(existing&&existing.getAttribute('data-company-news-key')===key)return;
    if(existing)existing.remove();

    var rows=items.map(function(it){
      var summary=it.factualSummary?'<div class="ca-news-summary">'+esc(it.factualSummary)+'</div>':'';
      return '<article class="ca-news-item">'
        +'<div class="ca-news-date">'+fmtDate(it.published)+'</div>'
        +'<div><div class="ca-news-meta"><span class="ca-news-tag">'+esc(it.category||'주요 뉴스')+'</span>'
        +'<span class="ca-news-source">'+esc(it.source||'출처 미상')+' · '+esc(tierLabel(it))+'</span></div>'
        +'<a class="ca-news-title" href="'+esc(it.url||'#')+'" target="_blank" rel="noopener">'+esc(it.title||'')+'</a>'
        +summary+'</div></article>';
    }).join('');

    var sec=document.createElement('section');
    sec.className='ca-block ca-news-block';
    sec.setAttribute('data-company-news','1');
    sec.setAttribute('data-company-news-key',key);
    sec.innerHTML='<div class="ca-head"><h2>주요 뉴스 · 데일리</h2><p>검색 '+esc(fmtChecked(DATA.checkedAt))+' · 최근 '+esc(DATA.windowDays||30)+'일</p></div>'
      +(rows?'<div class="ca-news-list">'+rows+'</div>':'<div class="ca-news-empty">최근 기간에 기준을 통과한 주요 뉴스가 없습니다.</div>')
      +'<div class="ca-news-rule">실적·가이던스, 수주·계약, 투자·CAPEX, 제품·기술·공급, 고객·M&A·규제처럼 향후 실적에 영향을 줄 수 있는 기사만 남기고 목표가 변경·하루 주가 등락·단순 수급 기사는 제외합니다.</div>';

    var axes=app.querySelector('.ca-axes');
    var axesBlock=axes&&axes.closest?axes.closest('.ca-block'):null;
    if(axesBlock)app.insertBefore(sec,axesBlock);
    else app.appendChild(sec);
    LAST_KEY=key;
  }
  function schedule(){
    clearTimeout(TIMER);
    TIMER=setTimeout(function(){
      var ticker=currentTicker();
      if(!ticker)return;
      if(!DATA){load();return;}
      render();
    },30);
  }
  function load(){
    if(LOADING||DATA)return;
    LOADING=true;
    fetch('/company_news.json?t='+Date.now(),{cache:'no-store',credentials:'same-origin'})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
      .then(function(d){DATA=d||{};LOADING=false;render();})
      .catch(function(e){LOADING=false;if(window.console&&console.warn)console.warn('[company-news]',e&&e.message||e);});
  }
  function mount(){
    installStyle();
    var app=document.getElementById('companyApp');
    if(!app){setTimeout(mount,120);return;}
    if(window.MutationObserver){
      new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
    }
    load();
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
