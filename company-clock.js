/* 02 기업분석 — gamma.json SoT를 직접 읽는 가격 vs EPS 리비전 두 시계. */
(function(){
  'use strict';
  var TICKERS={marvell:'MRVL',lumentum:'LITE'};
  var lastTicker='';
  var loading=false;
  var refreshTimer=null;

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function finite(v){return v!==null&&v!==undefined&&v!==''&&isFinite(Number(v));}
  function fmtPct(v,digits){if(!finite(v))return '자료에서 확인되지 않음';var n=Number(v);return (n>0?'+':'')+n.toFixed(digits==null?1:digits)+'%';}
  function fmtPp(v){if(!finite(v))return '자료에서 확인되지 않음';var n=Number(v);return (n>0?'+':'')+n.toFixed(1)+'%p';}
  function gap(px,eps){return finite(px)&&finite(eps)?Number(px)-Number(eps):null;}
  function gapLabel(v){if(!finite(v))return '비교 불가';v=Number(v);if(v>1)return '가격 추월';if(v<-1)return 'EPS 개선 우위';return '대체로 동행';}
  function stateLabel(g){return g==='open'?'open':g==='spent'?'spent':g==='flagged'?'flagged':(g||'자료 없음');}

  function installStyle(){
    if(document.getElementById('company-clock-style'))return;
    var st=document.createElement('style');st.id='company-clock-style';
    st.textContent=''
      +'#v-company .ca-clock{margin:0 0 30px;background:var(--panel);border:1px solid var(--line);border-radius:3px;overflow:hidden}'
      +'#v-company .ca-clock-head{padding:14px 16px 12px;display:flex;align-items:flex-end;justify-content:space-between;gap:14px;border-bottom:1px solid var(--line)}'
      +'#v-company .ca-clock-title{font-size:17px;font-weight:800;margin-top:2px}'
      +'#v-company .ca-clock-meta{font-size:12px;color:var(--faint);text-align:right;font-variant-numeric:tabular-nums}'
      +'#v-company .ca-clock-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}'
      +'#v-company .ca-clock-row{padding:14px 16px;min-width:0}'
      +'#v-company .ca-clock-row+ .ca-clock-row{border-left:1px solid var(--line)}'
      +'#v-company .ca-clock-window{font-size:12px;font-weight:800;color:var(--dawn);letter-spacing:.06em}'
      +'#v-company .ca-clock-values{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:8px}'
      +'#v-company .ca-clock-cell{min-width:0}'
      +'#v-company .ca-clock-cell b{display:block;font-size:16px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}'
      +'#v-company .ca-clock-cell span{font-size:11px;color:var(--faint)}'
      +'#v-company .ca-clock-flag{margin-top:9px;font-size:12px;font-weight:700}'
      +'#v-company .ca-clock-foot{padding:9px 16px;border-top:1px solid var(--line);font-size:11px;color:var(--faint)}'
      +'#v-company .ca-clock-error{padding:14px 16px;color:var(--dim)}'
      +'@media(max-width:700px){#v-company .ca-clock-head{align-items:flex-start;flex-direction:column}#v-company .ca-clock-meta{text-align:left}#v-company .ca-clock-grid{grid-template-columns:1fr}#v-company .ca-clock-row+ .ca-clock-row{border-left:0;border-top:1px solid var(--line)}#v-company .ca-clock-values{grid-template-columns:1fr 1fr 1fr}}';
    document.head.appendChild(st);
  }

  function selectedId(){
    var on=document.querySelector('#v-company [data-company].on');
    return on?on.getAttribute('data-company'):'marvell';
  }
  function ticker(){return TICKERS[selectedId()]||'MRVL';}

  function windowHtml(label,px,eps){
    var d=gap(px,eps);
    return '<div class="ca-clock-row">'
      +'<div class="ca-clock-window">'+esc(label)+'</div>'
      +'<div class="ca-clock-values">'
      +'<div class="ca-clock-cell"><b>'+esc(fmtPct(px))+'</b><span>주가</span></div>'
      +'<div class="ca-clock-cell"><b>'+esc(fmtPct(eps))+'</b><span>FY+1 EPS 리비전</span></div>'
      +'<div class="ca-clock-cell"><b>'+esc(fmtPp(d))+'</b><span>주가 − EPS</span></div>'
      +'</div><div class="ca-clock-flag">'+esc(gapLabel(d))+'</div></div>';
  }

  function render(g,t){
    var app=document.getElementById('companyApp');if(!app)return;
    var existing=document.getElementById('companyClockLive');if(existing)existing.remove();
    var kpis=app.querySelector('.ca-kpis');if(!kpis)return;
    var box=document.createElement('section');box.id='companyClockLive';box.className='ca-clock';
    if(!g){box.innerHTML='<div class="ca-clock-error">'+esc(t)+'의 두 시계 라이브 데이터를 gamma.json에서 확인하지 못했습니다.</div>';kpis.insertAdjacentElement('afterend',box);return;}
    var rev=g.rev||{},px=rev.px||{},fy1=((rev.eps||{}).fy1)||{};
    box.innerHTML='<div class="ca-clock-head"><div><div class="ca-section-label">PRICE vs EPS REVISION · LIVE</div><div class="ca-clock-title">가격과 실적 추정의 두 시계</div></div>'
      +'<div class="ca-clock-meta">γ '+esc(fmtPct(g.pct))+' · g='+esc(stateLabel(g.g))+' · stage '+esc(g.stage||'자료 없음')+' · '+esc(g.checkedAt||rev.at||'기준일 없음')+'</div></div>'
      +'<div class="ca-clock-grid">'+windowHtml('30D',px.c30,fy1.c30)+windowHtml('90D',px.c90,fy1.c90)+'</div>'
      +'<div class="ca-clock-foot">SoT: gamma.json 실시간 연결(no-store). 양수 갭은 주가 상승 속도가 FY+1 EPS 리비전보다 앞섰음을 뜻하며, 이 카드는 company data에 값을 복사하지 않습니다.</div>';
    kpis.insertAdjacentElement('afterend',box);
  }

  function load(force){
    var view=document.getElementById('v-company');if(!view)return;
    var t=ticker();
    if(!force&&loading&&lastTicker===t)return;
    lastTicker=t;loading=true;
    fetch('/gamma.json?t='+Date.now(),{cache:'no-store',credentials:'same-origin'})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
      .then(function(d){var all=d&&d.gamma||{};render(all[t],t);})
      .catch(function(){render(null,t);})
      .finally(function(){loading=false;});
  }

  function schedule(){clearTimeout(refreshTimer);refreshTimer=setTimeout(function(){if(document.querySelector('#v-company.view.on'))load(true);schedule();},300000);}
  function mount(){
    installStyle();
    var app=document.getElementById('companyApp');if(!app){setTimeout(mount,150);return;}
    var pending=false;
    new MutationObserver(function(){if(pending)return;pending=true;setTimeout(function(){pending=false;var t=ticker();if(t!==lastTicker||!document.getElementById('companyClockLive'))load(true);},40);}).observe(app,{childList:true,subtree:true});
    document.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest('#v-company [data-company]');if(b)setTimeout(function(){load(true);},80);},true);
    load(true);schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
