/* 08 계좌현황 — NHPLUG read-only 잔고를 Alpha Map에서 조회한다. */
(function () {
  'use strict';
  var API='/api/portfolio/live', FALLBACK='/holdings.json', mounted=false, loading=false, latest=null, lastLoad=0;
  var ACCOUNT_TARGETS=[
    {suffix:'7747',label:'개인투자'},
    {suffix:'2728',label:'DC연금'},
    {suffix:'0473',label:'IRP'}
  ];
  var $=function(id){return document.getElementById(id);};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  var CSS=`
  #v-account .ac-headbar{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:-2px 0 16px;flex-wrap:wrap}
  #v-account .ac-state{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--dim)}
  #v-account .ac-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border:1px solid var(--line2);background:var(--panel2);font-weight:800;color:var(--txt);border-radius:3px}
  #v-account .ac-badge.live{border-color:var(--st-dawn);color:var(--st-dawn)}
  #v-account .ac-badge.fallback{border-color:var(--st-mature);color:var(--st-mature)}
  #v-account .ac-dot{width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block}
  #v-account .ac-refresh{border:1px solid var(--line2);background:var(--panel2);color:var(--txt);padding:8px 11px;border-radius:3px;font:700 12px inherit;cursor:pointer}
  #v-account .ac-refresh:disabled{opacity:.5;cursor:default}
  #v-account .ac-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}
  #v-account .ac-kpi{background:var(--panel);border:1px solid var(--line);padding:13px 14px;min-width:0}
  #v-account .ac-kpi b{display:block;font-size:20px;line-height:1.2;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #v-account .ac-kpi span{display:block;font-size:11px;color:var(--faint);margin-top:5px}
  #v-account .ac-note{border:1px solid var(--line);background:var(--panel2);padding:10px 12px;margin-bottom:14px;font-size:12px;line-height:1.6;color:var(--dim)}
  #v-account .ac-list{display:flex;flex-direction:column;gap:12px}
  #v-account .ac-card{border:1px solid var(--line);background:var(--panel)}
  #v-account .ac-card-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line);background:var(--panel2)}
  #v-account .ac-card-hd b{font-size:14px;color:var(--txt)}
  #v-account .ac-card-hd span{font-size:11px;color:var(--faint)}
  #v-account .ac-market{padding:12px 14px 6px}
  #v-account .ac-market-title{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:7px}
  #v-account .ac-market-title b{font-size:12px;color:var(--txt)}
  #v-account .ac-market-title span{font-size:11px;color:var(--faint)}
  #v-account .ac-table{width:100%;border-collapse:collapse;table-layout:fixed}
  #v-account .ac-table th,#v-account .ac-table td{padding:8px 6px;border-top:1px solid var(--line);font-size:12px;text-align:right;vertical-align:middle;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #v-account .ac-table th{font-size:10px;color:var(--faint);font-weight:800}
  #v-account .ac-table th:first-child,#v-account .ac-table td:first-child{text-align:left;width:34%}
  #v-account .ac-name{font-weight:800;color:var(--txt)}
  #v-account .ac-code{display:block;font-size:10px;color:var(--faint);font-weight:500;margin-top:2px}
  #v-account .ac-up{color:var(--st-dawn);font-weight:800}#v-account .ac-down{color:var(--st-hot);font-weight:800}
  #v-account .ac-empty,#v-account .ac-error{padding:34px 12px;text-align:center;color:var(--faint);font-size:13px;line-height:1.6}
  #v-account .ac-error b{display:block;color:var(--txt);font-size:14px;margin-bottom:6px}
  #v-account .ac-foot{font-size:11px;color:var(--faint);margin:14px 0 calc(var(--am-ticker-h) + 12px);line-height:1.6}
  @media(max-width:850px){#v-account .ac-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:520px){#v-account .ac-summary{grid-template-columns:1fr 1fr}#v-account .ac-kpi b{font-size:17px}#v-account .ac-table th,#v-account .ac-table td{padding:8px 4px;font-size:11px}#v-account .ac-table th:first-child,#v-account .ac-table td:first-child{width:40%}}
  `;
  var SECTION=`<div class="vhead"><div class="vkick">Portfolio · NHPLUG Read-only</div><h1 class="vtitle">나무증권 <em>계좌현황</em></h1><p class="vsub">Alpha Map이 NHPLUG에서 국내·해외 잔고를 직접 읽는다. 주문 기능은 연결하지 않았으며 계좌번호와 인증정보는 화면과 저장소에 노출하지 않는다.</p></div>
  <div class="ac-headbar"><div class="ac-state" id="acState"><span class="ac-badge"><i class="ac-dot"></i>조회 준비</span></div><button type="button" class="ac-refresh" id="acRefresh">지금 새로고침</button></div>
  <div class="ac-summary" id="acSummary"></div><div class="ac-note" id="acNote">계좌현황을 불러오는 중입니다.</div><div class="ac-list" id="acList"><div class="ac-empty">NHPLUG 잔고 조회 중…</div></div><div class="ac-foot" id="acFoot"></div>`;

  function n(v){if(v==null||v==='')return null;if(typeof v==='number')return isFinite(v)?v:null;var x=Number(String(v).replace(/[,\s원$%]/g,''));return isFinite(x)?x:null;}
  function val(o,keys){o=o&&typeof o==='object'?o:{};for(var i=0;i<keys.length;i++){var v=o[keys[i]];if(v!==undefined&&v!==null&&String(v)!=='')return v;}return '';}
  function num(o,keys){return n(val(o,keys));}
  function one(v){return Array.isArray(v)?(v[0]||{}):(v&&typeof v==='object'?v:{});}
  function arr(v){return Array.isArray(v)?v:[];}
  function money(v){v=n(v);if(v==null)return '—';var a=Math.abs(v),s=v<0?'-':'';if(a>=100000000)return s+(a/100000000).toLocaleString('ko-KR',{maximumFractionDigits:1})+'억';if(a>=10000)return s+(a/10000).toLocaleString('ko-KR',{maximumFractionDigits:0})+'만';return v.toLocaleString('ko-KR',{maximumFractionDigits:0})+'원';}
  function qty(v){v=n(v);return v==null?'—':v.toLocaleString('ko-KR',{maximumFractionDigits:4});}
  function pct(v){v=n(v);if(v==null)return '—';return (v>0?'+':'')+v.toLocaleString('ko-KR',{maximumFractionDigits:2})+'%';}
  function priceText(v,market,currency){v=n(v);if(v==null)return '—';if(market==='해외')return v.toLocaleString('ko-KR',{maximumFractionDigits:4})+(currency?' '+currency:'');return money(v);}
  function dt(v){if(!v)return '—';var d=new Date(v);return isNaN(d)?String(v):d.toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});}
  function typeName(t){return t==='01'?'일반':t==='02'?'주문대리인':t==='03'?'모의':(t||'계좌');}
  function accountSuffix(v){var s=String(v||'');return s.slice(-4);}
  function targetAccount(accounts,target){for(var i=0;i<accounts.length;i++)if(accountSuffix(accounts[i]&&accounts[i].account)===target.suffix)return accounts[i];return null;}
  function targetMask(target){return '*******'+target.suffix;}
  function unavailableBlock(message){return '<div class="ac-empty">'+esc(message)+'</div>';}
  function position(r,market){
    r=r||{};var overseas=market==='해외';
    var code=val(r,['iem_cd','pdno','stck_shrn_iscd','ticker','symbol','item_cd','isu_cd','ovrs_pdno']);
    var name=val(r,['iem_nm','prdt_name','prdt_nm','item_nm','stk_nm','name','ovrs_item_name','ovrs_prdt_name']);
    var q=num(r,overseas?['cns_bse_bnc_qty','byn_cns_qty','bnc_qty','hld_qty','hldg_qty','hold_qty','qty']:['itg_bnc_qty','rsdl_qty','bnc_qty','hld_qty','hldg_qty','hold_qty','qty']);
    var evalAmt=num(r,overseas?['krw_eal_amt','evlu_amt','evl_amt','ovrs_stck_evlu_amt','valuation_amt','market_value']:['eal_amt','evlu_amt','evl_amt','stck_evlu_amt','valuation_amt','market_value']);
    var buyAmt=num(r,overseas?['krw_cns_bse_phs_xps','krw_abk_amt1','pchs_amt','buy_amt','purchase_amt']:['pchs_amt','pur_amt','buy_amt','purchase_amt']);
    var pnl=num(r,overseas?['krw_eal_pls_amt','fc_eal_pls_amt','evlu_pfls_amt','evl_pl_amt','profit_loss','pnl_amt']:['eal_pls_amt','evlu_pfls_amt','evl_pl_amt','profit_loss','pnl_amt']);
    var rate=num(r,overseas?['eal_pft_rt1','eal_pft_rt','krw_sll_pft_rt','pft_rt','profit_rate','pnl_rate']:['pft_rt','evlu_pfls_rt','evl_pl_rt','profit_rate','pnl_rate']);
    var price=num(r,overseas?['fc_sec_end_pr','end_pr','ovrs_now_pric1','last_pric','current_price']:['now_pr','stck_prpr','prpr','now_prc','cur_prc','current_price']);
    var currency=overseas?String(val(r,['cur_cd','currency'])||''):'';
    if(rate==null&&pnl!=null&&buyAmt){rate=pnl/buyAmt*100;}
    return {code:String(code||''),name:String(name||code||'종목'),qty:q,evalAmt:evalAmt,buyAmt:buyAmt,pnl:pnl,rate:rate,price:price,currency:currency,market:market};
  }
  function summary(d){var o=one(d&&d.Output_0);return {cash:num(o,['dca','krw_dca','dnca_tot_amt','cash_amt','ord_psbl_cash']),total:num(o,['tot_aet_amt','tot_evlu_amt','tot_asst_amt']),foreign:num(o,['fc_aet_amt','frcr_tot_asst_amt'])};}
  function positions(d,market){return arr(d&&d.Output_1).map(function(r){return position(r,market);}).filter(function(r){return r.name||r.code||r.qty||r.evalAmt;});}
  function marketBlock(title,s,p,sub){
    var total=s&&s.total!=null?money(s.total):'자료에서 확인되지 않음';
    p=p.slice().sort(function(a,b){return (b.evalAmt==null?-Infinity:b.evalAmt)-(a.evalAmt==null?-Infinity:a.evalAmt);});
    var rows=p.length?p.map(function(r){var cls=r.rate>0?'ac-up':r.rate<0?'ac-down':'';return '<tr><td><span class="ac-name">'+esc(r.name)+'</span><span class="ac-code">'+esc(r.code||r.market||'')+'</span></td><td>'+priceText(r.price,r.market,r.currency)+'</td><td>'+qty(r.qty)+'</td><td>'+money(r.evalAmt)+'</td><td class="'+cls+'">'+pct(r.rate)+'</td></tr>';}).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--faint)">보유종목 없음</td></tr>';
    return '<div class="ac-market"><div class="ac-market-title"><b>'+esc(title)+'</b><span>'+esc(sub||'')+' · 자산 '+esc(total)+'</span></div><table class="ac-table"><thead><tr><th>종목</th><th>현재가</th><th>수량</th><th>평가금액</th><th>수익률</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  }
  function accountValue(a){
    if(!a)return null;
    var rows=positions(a.domestic,'국내');
    arr(a.overseas).forEach(function(x){rows=rows.concat(positions(x.data,'해외'));});
    if(!rows.length||rows.some(function(r){return r.evalAmt==null;}))return null;
    return rows.reduce(function(sum,r){return sum+r.evalAmt;},0);
  }
  function kpi(label,value,detail){return '<div class="ac-kpi"><b>'+ (value==null?'확인 불가':money(value))+'</b><span>'+esc(label)+'</span><span>'+esc(detail||'종목 평가금액 합계')+'</span></div>';}
  function renderLive(data){
    latest=data;var accounts=arr(data.accounts),values=ACCOUNT_TARGETS.map(function(t){return accountValue(targetAccount(accounts,t));}),domTotal=0,overTotal=0,cash=0,count=0;
    var cards=ACCOUNT_TARGETS.map(function(target,idx){
      var a=targetAccount(accounts,target);
      if(!a)return '<article class="ac-card"><div class="ac-card-hd"><b>'+esc(target.label)+'</b><span>'+esc(targetMask(target))+' · NHPLUG 미노출</span></div>'+unavailableBlock(target.label==='DC연금'?'DC 계좌는 현재 NHPLUG 공통 계좌목록 응답에 포함되지 않아 잔고를 표시하지 않습니다.':'지정 계좌가 NHPLUG 응답에 없습니다.')+'</article>';
      var ds=summary(a.domestic),dp=positions(a.domestic,'국내');if(ds.total!=null)domTotal+=ds.total;if(ds.cash!=null)cash+=ds.cash;count+=dp.length;
      var ovs=arr(a.overseas),ob='',overRows=0;
      ovs.forEach(function(x){var os=summary(x.data),op=positions(x.data,'해외');if(os.total!=null)overTotal+=os.total;count+=op.length;overRows+=op.length;ob+=marketBlock('해외주식',os,op,'국가코드 '+esc(x.nation||'—'));});
      var emptyPension=target.label!=='개인투자'&&dp.length===0&&overRows===0&&!(ds.total>0);
      var body=emptyPension?unavailableBlock('계좌는 NHPLUG에서 확인되지만 일반 주식 잔고 API에서 연금 보유내역이 반환되지 않습니다.'):marketBlock('국내주식',ds,dp,ds.cash!=null?'예수금 '+money(ds.cash):'예수금 확인 불가')+ob;
      return '<article class="ac-card"><div class="ac-card-hd"><b>'+esc(target.label)+'</b><span>'+esc(a.account||targetMask(target))+' · '+esc(typeName(a.accountType))+' · 평가금액 합계 '+(accountValue(a)==null?'확인 불가':money(accountValue(a)))+'</span></div>'+body+'</article>';
    }).join('');
    var known=values.filter(function(v){return v!=null;});
    $('acSummary').innerHTML=kpi('전체 합계',known.length?known.reduce(function(sum,v){return sum+v;},0):null,known.length===values.length?'종목 평가금액 합계 · 예수금 제외':'조회된 계좌만 합산 · 예수금 제외')+ACCOUNT_TARGETS.map(function(t,i){return kpi(t.label,values[i]);}).join('');
    $('acList').innerHTML=cards||'<div class="ac-empty">조회 가능한 계좌가 없습니다.</div>';
    var age=Date.now()-new Date(data.fetchedAt||0).getTime(),fresh=isFinite(age)&&age>=0&&age<=10*60*1000;
    $('acState').innerHTML='<span class="ac-badge live"><i class="ac-dot"></i>NHPLUG LIVE</span><span>조회 '+esc(dt(data.fetchedAt))+(fresh?' · 10분 이내':' · 갱신 필요')+'</span>';
    $('acNote').innerHTML='<b>합계는 국내·해외 종목 평가금액 기준(예수금 제외)</b> · 미조회 계좌는 합계에서 제외합니다. 종목은 각 국내·해외 표에서 평가금액 내림차순으로 표시합니다. <b>화면은 핵심 4개 값만 표시</b> · 현재가·수량·평가금액·수익률만 보여줍니다. 매입가·매입금액·평가손익·매도가능수량·수수료·세금·환율·미결제수량·대출/만기일 등 NHPLUG가 반환하는 상세 필드는 일별 DB 원본에 보존합니다. 주문 API는 구현하지 않았습니다.';
    $('acFoot').textContent='출처: NHPLUG · 환경: '+String(data.environment||'live')+' · 계좌번호/고객식별자/인증정보는 마스킹 또는 제거됨';
  }
  function renderFallback(h,reason){
    latest=null;var d=arr(h.detail).filter(function(x){return n(x.amt)>0||n(x.qty)>0;}),cashRow=d.find(function(x){return x.layer==='현금'||x.name==='현금';}),total=n(h.total),cashM=cashRow?n(cashRow.amt):null;
    $('acSummary').innerHTML='<div class="ac-kpi"><b>'+(total==null?'—':money(total*1000000))+'</b><span>주간 원장 총자산</span></div><div class="ac-kpi"><b>'+(cashM==null?'—':money(cashM*1000000))+'</b><span>주간 원장 현금</span></div><div class="ac-kpi"><b>'+d.filter(function(x){return x.name!=='현금';}).length+'</b><span>보유종목</span></div><div class="ac-kpi"><b>'+esc(h.asOf||'—')+'</b><span>원장 기준일</span></div>';
    var rows=d.filter(function(x){return x.name!=='현금';}).sort(function(a,b){return (n(b.amt)||0)-(n(a.amt)||0);}).map(function(x){var ret=n(x.returnPct!=null?x.returnPct:x.ret);var cls=ret>0?'ac-up':ret<0?'ac-down':'';return '<tr><td><span class="ac-name">'+esc(x.name)+'</span><span class="ac-code">'+esc(x.ticker||x.layer||'')+'</span></td><td>—</td><td>'+qty(x.qty)+'</td><td>'+money((n(x.amt)||0)*1000000)+'</td><td class="'+cls+'">'+pct(ret)+'</td></tr>';}).join('');
    $('acList').innerHTML='<article class="ac-card"><div class="ac-card-hd"><b>주간 보유 원장</b><span>fallback</span></div><div class="ac-market"><div class="ac-market-title"><b>전체 보유종목</b><span>실시간 현재가는 제공되지 않음</span></div><table class="ac-table"><thead><tr><th>종목</th><th>현재가</th><th>수량</th><th>평가금액</th><th>수익률</th></tr></thead><tbody>'+rows+'</tbody></table></div></article>';
    $('acState').innerHTML='<span class="ac-badge fallback"><i class="ac-dot"></i>주간 원장 FALLBACK</span><span>기준 '+esc(h.asOf||'—')+'</span>';
    $('acNote').innerHTML='<b>실시간 NHPLUG 조회 실패.</b> 현재 화면은 holdings.json의 마지막 확정 원장을 표시합니다.'+(reason?' <span style="color:var(--faint)">('+esc(reason)+')</span>':'');
    $('acFoot').textContent='출처: holdings.json · 이 상태의 수치는 실시간 계좌 잔고가 아님';
  }
  function renderError(msg){$('acSummary').innerHTML='';$('acList').innerHTML='<div class="ac-error"><b>계좌현황을 불러오지 못했습니다.</b>'+esc(msg||'알 수 없는 오류')+'</div>';$('acState').innerHTML='<span class="ac-badge fallback"><i class="ac-dot"></i>조회 실패</span>';$('acNote').textContent='NHPLUG와 주간 원장 모두 읽지 못했습니다.';}
  function load(force){if(loading)return;if(!force&&Date.now()-lastLoad<60000)return;loading=true;lastLoad=Date.now();var btn=$('acRefresh');if(btn){btn.disabled=true;btn.textContent='조회 중…';}$('acState').innerHTML='<span class="ac-badge"><i class="ac-dot"></i>NHPLUG 조회 중</span>';
    fetch(API+'?t='+Date.now(),{cache:'no-store',credentials:'same-origin'}).then(function(r){if(!r.ok)return r.json().catch(function(){return {};}).then(function(j){throw new Error(j.code||('HTTP '+r.status));});return r.json();}).then(function(j){if(!j||j.source!=='NHPLUG'||j.readOnly!==true||!Array.isArray(j.accounts))throw new Error('invalid live response');renderLive(j);}).catch(function(e){return fetch(FALLBACK+'?t='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw e;return r.json();}).then(function(h){renderFallback(h,e&&e.message);}).catch(function(){renderError(e&&e.message);});}).finally(function(){loading=false;if(btn){btn.disabled=false;btn.textContent='지금 새로고침';}});
  }
  function activate(){var nav=$('nav'),main=document.querySelector('main.wrap'),b=nav&&nav.querySelector('[data-v="account"]'),sec=$('v-account');if(!nav||!main||!b||!sec)return;Array.prototype.forEach.call(nav.querySelectorAll('.tab'),function(t){t.classList.toggle('on',t===b);});Array.prototype.forEach.call(main.querySelectorAll('.view'),function(v){v.classList.toggle('on',v===sec);});var ab=$('asofBox');if(ab)ab.style.display='none';load(false);}
  function mount(){if(mounted)return;var nav=$('nav'),main=document.querySelector('main.wrap');if(!nav||!main)return;mounted=true;if(!$('account-live-css')){var st=document.createElement('style');st.id='account-live-css';st.textContent=CSS;document.head.appendChild(st);}var b=nav.querySelector('[data-v="account"]');if(!b){b=document.createElement('button');b.className='tab';b.dataset.v='account';b.innerHTML='<span class="n">08</span>계좌현황';var brief=nav.querySelector('[data-v="brief"]'),memo=nav.querySelector('[data-v="memo"]');nav.insertBefore(b,brief||memo||null);}function renumber(){var i=1;Array.prototype.forEach.call(nav.querySelectorAll('.tab'),function(t){var x=t.querySelector('.n'),next;if(!x)return;if(t.dataset.v==='world')next='00';else{next=(i<10?'0':'')+i;i++;}if(x.textContent!==next)x.textContent=next;});}renumber();if(!nav.__accountRenumber){nav.__accountRenumber=true;new MutationObserver(renumber).observe(nav,{childList:true});}var sec=$('v-account');if(!sec){sec=document.createElement('section');sec.className='view';sec.id='v-account';sec.innerHTML=SECTION;var bv=$('v-brief'),mv=$('v-memo');main.insertBefore(sec,bv||mv||null);}b.addEventListener('click',activate);$('acRefresh').onclick=function(){load(true);};nav.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('.tab');if(t&&t.dataset.v!=='account'){var ab=$('asofBox');if(ab&&t.dataset.v!=='memo'&&t.dataset.v!=='council')ab.style.display='';}});setInterval(function(){if(document.visibilityState==='visible'&&$('v-account')&&$('v-account').classList.contains('on'))load(true);},300000);load(false);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
