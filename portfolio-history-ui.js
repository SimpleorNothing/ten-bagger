(function(){
  'use strict';

  var API='/api/portfolio/history';
  var nf=new Intl.NumberFormat('ko-KR');
  var modal=null, listHost=null, detailHost=null, statusHost=null;

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});}
  function money(v){var n=Number(v);return Number.isFinite(n)?nf.format(Math.round(n))+'원':'—';}
  function pct(v){var n=Number(v);return Number.isFinite(n)?n.toFixed(2)+'%':'—';}
  function qty(v){var n=Number(v);return Number.isFinite(n)?nf.format(n):'—';}
  function price(v,market,currency){var n=Number(v);if(!Number.isFinite(n))return '—';if(market==='OVERSEAS'||market==='해외'||(currency&&currency!=='KRW'))return n.toLocaleString('ko-KR',{maximumFractionDigits:4})+(currency?' '+currency:'');return money(n);}
  function kstTime(v){if(!v)return '';try{return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v));}catch(_){return '';}}

  function injectStyle(){
    if(document.getElementById('phStyle'))return;
    var st=document.createElement('style');st.id='phStyle';st.textContent='\
#portfolioHistoryDownload{margin:22px 0 calc(var(--am-ticker-h) + 24px);padding:0}.ph-box{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}.ph-title{font-weight:800;font-size:16px}.ph-sub{margin-top:3px;color:var(--dim);font-size:12px}.ph-open{flex:0 0 auto;border:1px solid var(--line2);background:var(--dawn);color:var(--onacc);font:700 13px var(--sans);padding:9px 13px;border-radius:9px;cursor:pointer}.ph-bg{position:fixed;inset:0;z-index:130;background:rgba(4,10,15,.48);backdrop-filter:blur(3px);display:none}.ph-bg.on{display:block}.ph-modal{position:fixed;z-index:131;left:50%;top:50%;transform:translate(-50%,-50%);width:min(820px,94vw);max-height:84vh;overflow:auto;background:var(--ink2);border:1px solid var(--line2);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.28);display:none;padding:20px}.ph-modal.on{display:block}.ph-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}.ph-head h3{font-size:20px}.ph-note{font-size:12px;color:var(--dim);margin-top:3px}.ph-close{width:32px;height:32px;border:1px solid var(--line);border-radius:8px;background:var(--panel);cursor:pointer;color:var(--txt)}.ph-status{font-size:12px;color:var(--dim);padding:8px 0}.ph-row{display:grid;grid-template-columns:110px 1fr auto;gap:10px;align-items:center;border-top:1px solid var(--line);padding:11px 2px}.ph-date{font-weight:800;font-size:13px}.ph-meta{font-size:12px;color:var(--dim);line-height:1.45}.ph-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.ph-actions button,.ph-actions a{border:1px solid var(--line);background:var(--panel);color:var(--txt);padding:6px 8px;border-radius:7px;text-decoration:none;cursor:pointer;font:600 11px var(--sans)}.ph-detail{margin-top:14px;border-top:2px solid var(--line2);padding-top:12px}.ph-detail h4{font-size:15px;margin:4px 0 8px}.ph-account{margin:12px 0 5px;font-weight:800;font-size:12px}.ph-tablewrap{overflow:auto;border:1px solid var(--line);border-radius:9px}.ph-table{width:100%;border-collapse:collapse;min-width:640px;font-size:11px}.ph-table th,.ph-table td{padding:7px 8px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}.ph-table th{background:var(--panel2);color:var(--dim);font-weight:700}.ph-table th:first-child,.ph-table td:first-child{text-align:left}.ph-code{display:block;color:var(--faint);font-size:10px;margin-top:2px}.ph-empty{padding:22px 4px;color:var(--dim);text-align:center;font-size:13px}@media(max-width:700px){.ph-box{align-items:flex-start}.ph-row{grid-template-columns:1fr}.ph-actions{justify-content:flex-start}.ph-modal{padding:16px}.ph-sub{max-width:230px}}';document.head.appendChild(st);
  }

  function flatten(snapshot){
    var out=[];(snapshot&&Array.isArray(snapshot.accounts)?snapshot.accounts:[]).forEach(function(a){
      var label=String(a.label||a.accountType||'계좌'),src=String(a.dataSource||'');
      var d=a.domestic&&Array.isArray(a.domestic.Output_1)?a.domestic.Output_1:[];
      d.forEach(function(r){out.push({account:label,src:src,market:'KR',code:r.iem_cd||'',name:r.iem_nm||'',qty:r.itg_bnc_qty!=null?r.itg_bnc_qty:(r.rsdl_qty!=null?r.rsdl_qty:r.qty),price:r.now_pr!=null?r.now_pr:r.end_pr,currency:'KRW',eval:r.eal_amt!=null?r.eal_amt:r.krw_eal_amt,ret:r.pft_rt});});
      (Array.isArray(a.overseas)?a.overseas:[]).forEach(function(m){var rows=m&&m.data&&Array.isArray(m.data.Output_1)?m.data.Output_1:[];rows.forEach(function(r){out.push({account:label,src:src,market:'OVERSEAS',code:r.iem_cd||'',name:r.iem_nm||'',qty:r.cns_bse_bnc_qty!=null?r.cns_bse_bnc_qty:r.qty,price:r.fc_sec_end_pr!=null?r.fc_sec_end_pr:r.end_pr,currency:r.cur_cd||'',eval:r.krw_eal_amt!=null?r.krw_eal_amt:r.eal_amt,ret:r.eal_pft_rt1!=null?r.eal_pft_rt1:(r.eal_pft_rt!=null?r.eal_pft_rt:r.pft_rt)});});});
    });return out;
  }

  function renderDetail(stored){
    var rows=flatten(stored&&stored.snapshot);var groups={};rows.forEach(function(r){(groups[r.account]=groups[r.account]||[]).push(r);});
    var html='<div class="ph-detail"><h4>'+esc(stored.snapshotDate)+' 자산현황</h4><div class="ph-note">화면은 현재가·수량·평가금액·수익률만 표시합니다. 매입가·손익·수수료·세금·환율 등 상세 필드는 JSON DB에 보존됩니다.</div>';
    Object.keys(groups).forEach(function(k){html+='<div class="ph-account">'+esc(k)+'</div><div class="ph-tablewrap"><table class="ph-table"><thead><tr><th>종목</th><th>현재가</th><th>수량</th><th>평가금액</th><th>수익률</th></tr></thead><tbody>'+groups[k].map(function(r){return '<tr><td>'+esc(r.name||r.code)+'<span class="ph-code">'+esc(r.code)+'</span></td><td>'+price(r.price,r.market,r.currency)+'</td><td>'+qty(r.qty)+'</td><td>'+money(r.eval)+'</td><td>'+pct(r.ret)+'</td></tr>';}).join('')+'</tbody></table></div>';});
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

  function close(){var bg=document.getElementById('phBg');if(bg)bg.classList.remove('on');if(modal)modal.classList.remove('on');}
  function open(){document.getElementById('phBg').classList.add('on');modal.classList.add('on');loadList();}

  function mount(){
    if(document.getElementById('portfolioHistoryDownload'))return true;
    var accountView=document.getElementById('v-account');
    if(!accountView)return false;
    injectStyle();
    var section=document.createElement('section');section.id='portfolioHistoryDownload';section.innerHTML='<div class="ph-box"><div><div class="ph-title">일자별 자산현황</div><div class="ph-sub">매일 17:00 KST 스냅샷 저장 · 화면은 핵심값만, JSON DB는 상세 원본 보존</div></div><button type="button" class="ph-open" id="phOpen">자산현황 다운로드</button></div>';
    accountView.appendChild(section);
    var bg=document.createElement('div');bg.className='ph-bg';bg.id='phBg';document.body.appendChild(bg);
    modal=document.createElement('div');modal.className='ph-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.innerHTML='<div class="ph-head"><div><h3>일자별 자산현황</h3><div class="ph-note">화면은 핵심 4개 값만 표시하고 상세 NHPLUG 필드는 JSON DB에 저장합니다.</div></div><button type="button" class="ph-close" id="phClose" aria-label="닫기">×</button></div><div class="ph-status" id="phStatus"></div><div id="phList"></div><div id="phDetail"></div>';
    document.body.appendChild(modal);listHost=document.getElementById('phList');detailHost=document.getElementById('phDetail');statusHost=document.getElementById('phStatus');
    document.getElementById('phOpen').addEventListener('click',open);document.getElementById('phClose').addEventListener('click',close);bg.addEventListener('click',close);document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
    return true;
  }

  function boot(){
    if(mount())return;
    var obs=new MutationObserver(function(){if(mount())obs.disconnect();});
    obs.observe(document.body,{childList:true,subtree:true});
    setTimeout(function(){obs.disconnect();mount();},10000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
