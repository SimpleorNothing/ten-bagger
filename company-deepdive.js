/* 02 기업분석 확장: 종목별 deepdive 데이터가 있으면 기업개요·제품·시장·경쟁·연도별 성장전략을 보강한다. */
(function(){
  'use strict';
  var DATA_URLS={credo:'/credo/deepdive.json'};
  var CACHE={};
  var queued=false;

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function signMoney(v){if(v==null)return '—';var n=Number(v);if(!isFinite(n))return '—';return (n<0?'-':'')+'$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:3})+'B';}
  function selectedId(){var on=document.querySelector('#v-company [data-company].on');return on?on.getAttribute('data-company'):'';}
  function installStyle(){
    if(document.getElementById('company-deepdive-style'))return;
    var st=document.createElement('style');st.id='company-deepdive-style';
    st.textContent=''
      +'#v-company .ca-dd{margin-top:30px}'
      +'#v-company .ca-dd-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}'
      +'#v-company .ca-dd-card{background:var(--panel);border:1px solid var(--line);border-radius:3px;padding:16px;min-width:0}'
      +'#v-company .ca-dd-card h3{font-size:16px;margin:3px 0 8px}'
      +'#v-company .ca-dd-card p{margin:5px 0;color:var(--dim);font-size:13px;line-height:1.55}'
      +'#v-company .ca-dd-label{font-size:11px;font-weight:800;letter-spacing:.06em;color:var(--faint);text-transform:uppercase}'
      +'#v-company .ca-dd-list{margin:7px 0 0;padding-left:18px;color:var(--dim);font-size:13px;line-height:1.55}'
      +'#v-company .ca-dd-list li{margin:4px 0}'
      +'#v-company .ca-dd-table-wrap{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--line);background:var(--panel)}'
      +'#v-company .ca-dd-table{width:100%;min-width:900px;border-collapse:collapse}'
      +'#v-company .ca-dd-table th,#v-company .ca-dd-table td{padding:10px 11px;border-bottom:1px solid var(--line);border-right:1px solid var(--line);text-align:left;vertical-align:top;font-size:12px;line-height:1.5}'
      +'#v-company .ca-dd-table th:last-child,#v-company .ca-dd-table td:last-child{border-right:0}'
      +'#v-company .ca-dd-table th{background:var(--ink);color:var(--faint);font-weight:800;white-space:nowrap}'
      +'#v-company .ca-dd-table td:first-child{font-weight:800;white-space:nowrap}'
      +'#v-company .ca-dd-stage{display:inline-flex;padding:2px 7px;border:1px solid rgba(42,111,151,.32);border-radius:14px;color:var(--st-accel);font-size:11px;font-weight:800;white-space:nowrap}'
      +'#v-company .ca-dd-split{display:grid;grid-template-columns:1fr 1fr;gap:12px}'
      +'#v-company .ca-dd-callout{padding:14px;border-left:3px solid var(--dawn);background:var(--ink);font-size:13px;line-height:1.6;color:var(--dim)}'
      +'#v-company .ca-dd-callout b{display:block;color:var(--txt);margin-bottom:4px}'
      +'#v-company .ca-dd-sources{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:10px}'
      +'#v-company .ca-dd-src{display:flex;justify-content:space-between;gap:9px;padding:9px 10px;border:1px solid var(--line);background:var(--panel);text-decoration:none;color:var(--txt);font-size:12px}'
      +'#v-company .ca-dd-src span:last-child{color:var(--faint);white-space:nowrap}'
      +'#v-company .ca-dd-note{margin-top:8px;color:var(--faint);font-size:11px;line-height:1.5}'
      +'#v-company .ca-dd-fact{color:var(--txt)}'
      +'#v-company .ca-dd-view{font-variant-numeric:tabular-nums}'
      +'@media(max-width:900px){#v-company .ca-dd-grid{grid-template-columns:1fr 1fr}#v-company .ca-dd-split{grid-template-columns:1fr}}'
      +'@media(max-width:620px){#v-company .ca-dd-grid{grid-template-columns:1fr}#v-company .ca-dd-sources{grid-template-columns:1fr}}';
    document.head.appendChild(st);
  }
  function head(title,desc){return '<div class="ca-head"><h2>'+esc(title)+'</h2><p>'+esc(desc||'')+'</p></div>';}
  function renderProfile(d){
    var p=d.profile||{};
    var profile='<article class="ca-dd-card"><div class="ca-dd-label">Company Profile</div><h3>기업 개요</h3>'
      +'<p><b>설립</b> · '+esc(p.founded)+' · '+esc(p.listed)+'</p>'
      +'<p><b>운영 본사</b> · '+esc(p.headquarters)+'</p>'
      +'<p><b>법적 등록</b> · '+esc(p.legalDomicile)+'</p>'
      +'<p><b>사업모델</b> · '+esc(p.businessModel)+'</p>'
      +'<p><b>원천기술</b> · '+esc(p.coreTechnology)+'</p></article>';
    var products=(d.products||[]).slice(0,3).map(function(x){return '<li><b>'+esc(x.category)+'</b> · '+esc(x.products)+'</li>';}).join('');
    var product='<article class="ca-dd-card"><div class="ca-dd-label">Products</div><h3>제품 포트폴리오</h3><ul class="ca-dd-list">'+products+'<li>Retimer · OmniConnect · IP/Chiplets · PILOT까지 확장</li></ul></article>';
    var m=d.market||{};
    var market='<article class="ca-dd-card"><div class="ca-dd-label">Addressed Market</div><h3>참여시장·성장성</h3><p class="ca-dd-fact">'+esc(m.headline)+'</p><ul class="ca-dd-list">'
      +(m.servedMarkets||[]).map(function(x){return '<li><b>'+esc(x.name)+'</b> · '+esc(x.size)+' · '+esc(x.growth)+'</li>';}).join('')+'</ul></article>';
    return '<section class="ca-dd" data-credo-deepdive>'+head('기업 개요 · 제품 · 참여시장','확인된 회사/공시 사실을 기준으로 구성')+'<div class="ca-dd-grid">'+profile+product+market+'</div></section>';
  }
  function renderProducts(d){
    return '<section class="ca-dd">'+head('제품 종류와 솔루션','제품이 해결하는 AI 인프라 병목과 현재 단계')+'<div class="ca-dd-table-wrap"><table class="ca-dd-table"><thead><tr><th>영역</th><th>제품</th><th>고객 문제/솔루션</th><th>현재 단계</th></tr></thead><tbody>'
      +(d.products||[]).map(function(x){return '<tr><td>'+esc(x.category)+'</td><td>'+esc(x.products)+'</td><td>'+esc(x.solution)+'</td><td><span class="ca-dd-stage">'+esc(x.stage)+'</span></td></tr>';}).join('')
      +'</tbody></table></div></section>';
  }
  function renderMarket(d){
    var m=d.market||{};
    return '<section class="ca-dd">'+head('시장 크기 · 성장 동인','공식 TAM이 없는 영역은 임의 추정하지 않음')+'<div class="ca-dd-split">'
      +'<article class="ca-dd-card"><div class="ca-dd-label">확인된 시장 사실</div><ul class="ca-dd-list">'+(m.facts||[]).map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></article>'
      +'<article class="ca-dd-card"><div class="ca-dd-label">구조적 성장 동인</div><ul class="ca-dd-list">'+(m.growthDrivers||[]).map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></article>'
      +'</div></section>';
  }
  function renderCompetition(d){
    var c=d.competition||{};
    var edges=(d.advantages||[]).map(function(x){return '<article class="ca-dd-card"><div class="ca-dd-label">Competitive Edge</div><h3>'+esc(x.title)+'</h3><p class="ca-dd-fact"><b>사실</b> · '+esc(x.fact)+'</p><p><b>투자 해석</b> · '+esc(x.meaning)+'</p></article>';}).join('');
    return '<section class="ca-dd">'+head('경쟁환경 변화 · Credo 차별화','사실과 투자 해석을 분리')+'<div class="ca-dd-split"><article class="ca-dd-card"><div class="ca-dd-label">Competition</div><h3>'+esc(c.change)+'</h3><ul class="ca-dd-list">'+(c.current||[]).map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></article><div class="ca-dd-grid" style="grid-template-columns:1fr 1fr">'+edges+'</div></div></section>';
  }
  function renderStrategy(d){
    return '<section class="ca-dd">'+head('연도별 성장 전략','실적 변화와 전략 전환을 같은 축에서 확인')+'<div class="ca-dd-table-wrap"><table class="ca-dd-table"><thead><tr><th>연도</th><th>단계</th><th>확인된 사실</th><th>전략 해석</th><th>다음 검증</th></tr></thead><tbody>'
      +(d.growthStrategy||[]).map(function(x){return '<tr><td>'+esc(x.fy)+'</td><td><span class="ca-dd-stage">'+esc(x.phase)+'</span></td><td>'+esc(x.fact)+'</td><td>'+esc(x.strategy)+'</td><td>'+esc(x.check)+'</td></tr>';}).join('')
      +'</tbody></table></div></section>';
  }
  function financialTable(d){
    var rows=d.annualFinancials||[];
    function money(r,key){return r[key]==null?'—':signMoney(r[key]);}
    function rev(r){if(r.revenue==null)return '—';var p=r.kind==='management_floor'?'>':'';return p+'$'+Number(r.revenue).toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:3})+'B';}
    function growth(r){if(r.growth==null)return '—';var p=r.kind==='management_floor'?'>':'';return p+'+'+Number(r.growth).toLocaleString('en-US',{maximumFractionDigits:1})+'%';}
    function pct0(v){if(v==null)return '—';var n=Number(v);return (n>0?'+':'')+n.toLocaleString('en-US',{maximumFractionDigits:1})+'%';}
    var body=rows.map(function(r){
      return '<tr><td>'+esc(r.fy)+(r.kind==='management_floor'?'<br><span class="ca-kind">경영진 전망 하단</span>':'<br><span class="ca-kind">GAAP 실적</span>')+'</td>'
        +'<td>'+rev(r)+'</td><td>'+growth(r)+'</td><td>'+pct0(r.grossMargin)+'</td><td>'+money(r,'operatingIncome')+'</td><td>'+pct0(r.operatingMargin)+'</td><td>'+money(r,'netIncome')+'</td><td>'+pct0(r.netMargin)+'</td></tr>';
    }).join('');
    var note='<div class="ca-fin-notes"><div><b>FY2022~FY2026</b> SEC GAAP 연간 실적. FY2027E는 경영진의 “매출 85% 초과 성장”을 FY2026 매출에 적용한 산술 하단($2.470B)이며 회사가 달러 매출액이나 GAAP 연간 마진을 직접 가이던스한 값이 아닙니다.</div></div>';
    return '<div class="ca-fin ca-dd-view"><div class="ca-table-wrap"><table class="ca-table"><thead><tr><th>연도</th><th>매출</th><th>YoY</th><th>총마진</th><th>영업이익</th><th>영업이익률</th><th>순이익</th><th>순이익률</th></tr></thead><tbody>'+body+'</tbody></table></div>'+note+'</div>';
  }
  function replaceAnnual(app,d){
    var blocks=app.querySelectorAll('.ca-block');
    for(var i=0;i<blocks.length;i++){
      var h=blocks[i].querySelector('.ca-head h2');
      if(h&&String(h.textContent||'').indexOf('FY2023~FY2028')===0){
        blocks[i].innerHTML=head('최근 5년 실적 · FY27 전망','FY2022~FY2026 GAAP 실적 · FY2027은 경영진 전망 하단')+financialTable(d);
        blocks[i].setAttribute('data-credo-annual','1');
        return;
      }
    }
  }
  function renderOutlook(d){
    var o=d.outlook||{};
    var src=(d.sources||[]).map(function(s){return '<a class="ca-dd-src" href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer"><span>'+esc(s.label)+'</span><span>'+esc(s.type)+'</span></a>';}).join('');
    return '<section class="ca-dd">'+head('향후 전망 · 투자논리 검증','회사 전망과 자체 해석을 구분')+'<div class="ca-dd-split"><article class="ca-dd-card"><div class="ca-dd-label">확인된 전망/사실</div><ul class="ca-dd-list">'+(o.confirmed||[]).map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></article>'
      +'<div><div class="ca-dd-callout"><b>자체 해석</b>'+esc(o.interpretation)+'</div><div class="ca-dd-callout" style="margin-top:8px"><b>투자논리 무효화 조건</b><ul class="ca-dd-list">'+(o.invalidation||[]).map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></div></div></div>'
      +'<div class="ca-dd-sources">'+src+'</div><div class="ca-dd-note">데이터 기준일 '+esc(d.asOf)+' · 정확한 공식 TAM/가이던스가 없는 숫자는 추정으로 채우지 않습니다.</div></section>';
  }
  function render(d){
    if(selectedId()!=='credo')return;
    var app=document.getElementById('companyApp');if(!app||app.querySelector('[data-credo-deepdive]'))return;
    installStyle();
    var kpis=app.querySelector('.ca-kpis');
    var holder=document.createElement('div');
    holder.innerHTML=renderProfile(d)+renderProducts(d)+renderMarket(d)+renderCompetition(d)+renderStrategy(d)+renderOutlook(d);
    var frag=document.createDocumentFragment();while(holder.firstChild)frag.appendChild(holder.firstChild);
    if(kpis&&kpis.parentNode)kpis.parentNode.insertBefore(frag,kpis.nextSibling);else app.insertBefore(frag,app.firstChild);
    replaceAnnual(app,d);
    var stamp=document.querySelector('#v-company .updstamp');if(stamp&&d.asOf)stamp.textContent='update : '+String(d.asOf).replace(/-/g,'.');
  }
  function load(id){
    var url=DATA_URLS[id];if(!url)return;
    if(CACHE[id]){render(CACHE[id]);return;}
    fetch(url+'?t='+Date.now(),{cache:'no-store',credentials:'same-origin'})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
      .then(function(d){CACHE[id]=d;render(d);})
      .catch(function(e){if(window.console&&console.warn)console.warn('[company-deepdive]',e&&e.message||e);});
  }
  function sync(){queued=false;var id=selectedId();if(DATA_URLS[id])load(id);}
  function queue(){if(queued)return;queued=true;setTimeout(sync,0);}
  document.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest('#v-company [data-company]');if(b)queue();},true);
  if(window.MutationObserver&&document.body)new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){if(ms[i].type==='childList'&&ms[i].addedNodes&&ms[i].addedNodes.length){queue();break;}}}).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
})();
