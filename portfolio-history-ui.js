(function(){
  'use strict';

  var API='/api/portfolio/history';
  var nf=new Intl.NumberFormat('ko-KR');
  var modal=null, listHost=null, detailHost=null, statusHost=null;

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});}
  function money(v){var n=Number(v);return Number.isFinite(n)?nf.format(Math.round(n))+'원':'—';}
  function pct(v){var n=Number(v);return Number.isFinite(n)?n.toFixed(2)+'%':'—';}
  function qty(v){var n=Number(v);return Number.isFinite(n)?nf.format(n):'—';}
  function kstTime(v){if(!v)return '';try{return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v));}catch(_){return '';}}

  function injectStyle(){
    if(document.getElementById('phStyle'))return;
    var st=document.createElement('style');st.id='phStyle';st.textContent='\
#portfolioHistoryDownload{max-width:1340px;margin:0 auto 72px;padding:0 22px}.ph-box{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}.ph-title{font-weight:800;font-size:16px}.ph-sub{margin-top:3px;color:var(--dim);font-size:12px}.ph-open{flex:0 0 auto;border:1px solid var(--line2);background:var(--dawn);color:var(--onacc);font:700 13px var(--sans);padding:9px 13px;border-radius:9px;cursor:pointer}.ph-bg{position:fixed;inset:0;z-index:130;background:rgba(4,10,15,.48);backdrop-filter:blur(3px);display:none}.ph-bg.on{display:block}.ph-modal{position:fixed;z-index:131;left:50%;top:50%;transform:translate(-50%,-50%);width:min(820px,94vw);max-height:84vh;overflow:auto;background:var(--ink2);border:1px solid var(--line2);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.28);display:none;padding:20px}.ph-modal.on{display:block}.ph-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}.ph-head h3{font-size:20px}.ph-note{font-size:12px;color:var(--dim);margin-top:3px}.ph-close{width:32px;height:32px;border:1px solid var(--line);border-radius:8px;background:var(--panel);cursor:pointer;color:var(--txt)}.ph-status{font-size:12px;color:var(--dim);padding:8px 0}.ph-row{display:grid;grid-template-columns:110px 1fr auto;gap:10px;align-items:center;border-top:1px solid var(--line);padding:11px 2px}.ph-date{font-weight:800;font-size:13px}.ph-meta{font-size:12px;color:var(--dim);line-height:1.45}.ph-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.ph-actions button,.ph-actions a{border:1px solid var(--line);background:var(--panel);color:var(--txt);padding:6px 8px;border-radius:7px;text-decoration:none;cursor:pointer;font:600 11px var(--sans)}.ph-detail{margin-top:14px;border-top:2px solid var(--line2);padding-top:12px}.ph-detail h4{font-size:15px;margin:4px 0 8px}.ph-account{margin:12px 0 5px;font-weight:800;font-size:12px}.ph-tablewrap{overflow:auto;border:1px solid var(--line);border-radius:9px}.ph-table{width:100%;border-collapse:collapse;min-width:690px;font-size:11px}.ph-table th,.ph-table td{padding:7px 8px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}.ph-table th{background:var(--panel2);color:var(--dim);font-weight:700}.ph-table th:nth-child(-n+3),.ph-table td:nth-child(-n+3){text-align:left}.ph-empty{padding:22px 4px;color:var(--dim);text-align:center;font-size:13px}@media(max-width:700px){.ph-box{align-items:flex-start}.ph-row{grid-template-columns:1fr}.ph-actions{justify-content:flex-start}.ph-modal{padding:16px}.ph-sub{max-width:230px}}';document.head.appendChild(st);
  }

  function flatten(snapshot){
    var out=[];(snapshot&&Array.isArray(snapshot.accounts)?snapshot.accounts:[]).forEach(function(a){
      var label=String(a.label||a.accountType||'계좌'),src=String(a.dataSource||'');
      var d=a.domestic&&Array.isArray(a.domestic.Output_1)?a.domestic.Output_1:[];
      d.forEach(function(r){out.push({account:label,src:src,market:'KR',code:r.iem_cd||'',name:r.iem_nm||'',qty:r.itg_bnc_qty!=null?r.itg_bnc_qty:(r.rsdl_qty!=null?r.rsdl_qty:r.qty),eval:r.eal_amt!=null?r.eal_amt:r.krw_eal_amt,pnl:r.eal_pls_amt!=null?r.eal_pls_amt:r.krw_eal_pls_amt,ret:r.pft_rt});});
      (Array.isArray(a.overseas)?a.overseas:[]).forEach(function(m){var rows=m&&m.data&&Array.isArray(m.data.Output_1)?m.data.Output_1:[];rows.forEach(function(r){out.push({account:label,src:src,market:r.fc_sec_trd_nat_nm||m.nation||'해외',code:r.iem_cd||'',name:r.iem_nm||'',qty:r.cns_bse_bnc_qty!=null?r.cns_bse_bnc_qty:r.qty,eval:r.krw_eal_amt!=null?r.krw_eal_amt:r.eal_amt,pnl:r.krw_eal_pls_amt!=null?r.krw_eal_pls_amt:r.eal_pls_amt,ret:r.eal_pft_rt1!=null?r.eal_pft_rt1:(r.eal_pft_rt!=null?r.eal_pft_rt:r.pft_rt)});});});
    });return out;
  }

  function renderDetail(stored){
    var rows=flatten(stored&&stored.snapshot);var groups={};rows.forEach(function(r){(groups[r.account]=groups[r.account]||[]).push(r);});
    var html='<div class="ph-detail"><h4>'+esc(stored.snapshotDate)+' 자산현황</h4><div class="ph-note">평가금액은 보유종목 기준이며 현금·예수금은 별도 확인되지 않은 계좌가 있을 수 있습니다.</div>';
    Object.keys(groups).forEach(function(k){html+='<div class="ph-account">'+esc(k)+'</div><div class="ph-tablewrap"><table class="ph-table"><thead><tr><th>시장</th><th>종목</th><th>코드</th><th>수량</th><th>평가금액</th><th>평가손익</th><th>수익률</th></tr></thead><tbody>'+groups[k].map(function(r){return '<tr><td>'+esc(r.market)+'</td><td>'+esc(r.name||r.code)+'</td><td>'+esc(r.code)+'</td><td>'+qty(r.qty)+'</td><td>'+money(r.eval)+'</td><td>'+money(r.pnl)+'</td><td>'+pct(r.ret)+'</td></tr>';}).join('')+'</tbody></table></div>';});
    if(!rows.length)html+='<div class="ph-empty">저장된 보유종목이 없습니다.</div>';
    html+='</div>';detailHost.innerHTML=html;
  }

  async function showDetail(date){
    detailHost.innerHTML='<div class="ph-status">'+esc(date)+' 현황을 불러오는 중…</div>';
    try{var r=await fetch(API+'/'+encodeURIComponent(date),{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);renderDetail(await r.json());}
    catch(e){detailHost.innerHTML='<div class="ph-empty">현황을 불러오지 못했습니다. '+esc(e.message||e)+'</div>';}
  }

  function renderList(data){
    var dates=data&&Array.isArray(data.dates)?data.dates:[];
    if(!dates.length){listHost.innerHTML='<div class="ph-empty">아직 저장된 일별 자산현황이 없습니다. 매일 17:00(KST)에 자동 저장됩니다.</div>';return;}
    listHost.innerHTML=dates.map(function(x){return '<div class="ph-row"><div class="ph-date">'+esc(x.date)+'</div><div class="ph-meta">보유종목 '+nf.format(Number(x.holdingCount||0))+'개 · 보유종목 평가액 '+money(x.holdingValueKrw)+'<br>저장 '+esc(kstTime(x.savedAt))+' KST · 현금 제외</div><div class="ph-actions"><button type="button" data-ph-view="'+esc(x.date)+'">보기</button><a href="'+API+'/'+encodeURIComponent(x.date)+'.csv" download>CSV</a><a href="'+API+'/'+encodeURIComponent(x.date)+'.json" download>JSON</a></div></div>';}).join('');
    Array.prototype.forEach.call(listHost.querySelectorAll('[data-ph-view]'),function(b){b.addEventListener('click',function(){showDetail(b.getAttribute('data-ph-view'));});});
  }

  async function loadList(){
    statusHost.textContent='일자별 현황을 불러오는 중…';listHost.innerHTML='';detailHost.innerHTML='';
    try{var r=await fetch(API,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);var data=await r.json();statusHost.textContent='매일 17:00 KST 자동 저장 · CSV/JSON 다운로드';renderList(data);}
    catch(e){statusHost.textContent='불러오기 실패';listHost.innerHTML='<div class="ph-empty">자산현황 이력을 불러오지 못했습니다. '+esc(e.message||e)+'</div>';}
  }

  function close(){document.getElementById('phBg').classList.remove('on');modal.classList.remove('on');}
  function open(){document.getElementById('phBg').classList.add('on');modal.classList.add('on');loadList();}

  function mount(){
    if(document.getElementById('portfolioHistoryDownload'))return;injectStyle();
    var section=document.createElement('section');section.id='portfolioHistoryDownload';section.innerHTML='<div class="ph-box"><div><div class="ph-title">일자별 자산현황</div><div class="ph-sub">매일 17:00 KST 스냅샷 저장 · 날짜별 상세보기 및 CSV/JSON 다운로드</div></div><button type="button" class="ph-open" id="phOpen">자산현황 다운로드</button></div>';
    var main=document.querySelector('main');if(main&&main.parentNode)main.parentNode.insertBefore(section,main.nextSibling);else document.body.appendChild(section);
    var bg=document.createElement('div');bg.className='ph-bg';bg.id='phBg';document.body.appendChild(bg);
    modal=document.createElement('div');modal.className='ph-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.innerHTML='<div class="ph-head"><div><h3>일자별 자산현황</h3><div class="ph-note">저장된 시점의 보유종목을 확인하거나 파일로 내려받을 수 있습니다.</div></div><button type="button" class="ph-close" id="phClose" aria-label="닫기">×</button></div><div class="ph-status" id="phStatus"></div><div id="phList"></div><div id="phDetail"></div>';
    document.body.appendChild(modal);listHost=document.getElementById('phList');detailHost=document.getElementById('phDetail');statusHost=document.getElementById('phStatus');
    document.getElementById('phOpen').addEventListener('click',open);document.getElementById('phClose').addEventListener('click',close);bg.addEventListener('click',close);document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
