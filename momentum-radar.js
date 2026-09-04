/* momentum-radar.js — 00 시장 지도: 해외 선행자산 → 국내 다음 거래일 급등 후보 레이더. */
(function(){
  'use strict';
  var DATA_URL='/momentum-radar.json', cached=null, loading=false;
  var CSS=[
    '#v-world .mr-panel{margin:0 0 14px;padding:16px 18px}',
    '#v-world .mr-head{display:flex;gap:16px;align-items:flex-start;justify-content:space-between;margin-bottom:13px}',
    '#v-world .mr-kicker{font-size:12px;font-weight:800;letter-spacing:.08em;color:var(--dawn)}',
    '#v-world .mr-title{font-size:19px;font-weight:800;color:var(--txt);margin:4px 0 4px;letter-spacing:-.02em}',
    '#v-world .mr-desc{font-size:13px;line-height:1.55;color:var(--dim);margin:0}',
    '#v-world .mr-refresh{flex:0 0 auto;border:1px solid var(--line2);background:var(--panel2);color:var(--dim);padding:7px 10px;font:inherit;font-size:12px;cursor:pointer}',
    '#v-world .mr-summary{display:grid;grid-template-columns:minmax(230px,.8fr) minmax(0,1.2fr);gap:10px;margin-bottom:12px}',
    '#v-world .mr-signal{border:1px solid var(--line);background:var(--panel2);padding:13px 14px}',
    '#v-world .mr-signal .lab{font-size:11px;color:var(--faint);font-weight:700;letter-spacing:.06em}',
    '#v-world .mr-signal .row{display:flex;align-items:baseline;gap:10px;margin-top:5px}',
    '#v-world .mr-signal .score{font-size:30px;line-height:1;font-weight:850;color:var(--txt);font-variant-numeric:tabular-nums}',
    '#v-world .mr-signal .grade{font-size:12px;font-weight:800;color:var(--dawn)}',
    '#v-world .mr-signal .why{font-size:12px;line-height:1.5;color:var(--dim);margin-top:8px}',
    '#v-world .mr-leaders{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}',
    '#v-world .mr-lead{border:1px solid var(--line);background:var(--panel);padding:10px 11px}',
    '#v-world .mr-lead b{display:block;font-size:12px;color:var(--txt)}',
    '#v-world .mr-lead strong{display:block;font-size:17px;margin-top:3px;font-variant-numeric:tabular-nums}',
    '#v-world .mr-lead span{display:block;font-size:10px;color:var(--faint);margin-top:2px}',
    '#v-world .mr-up{color:var(--st-dawn)}#v-world .mr-down{color:var(--st-hot)}',
    '#v-world .mr-tablewrap{overflow:auto;border:1px solid var(--line)}',
    '#v-world .mr-table{width:100%;border-collapse:collapse;min-width:720px}',
    '#v-world .mr-table th{font-size:11px;color:var(--faint);font-weight:700;text-align:left;padding:8px 10px;background:var(--panel2);border-bottom:1px solid var(--line)}',
    '#v-world .mr-table td{font-size:12px;color:var(--dim);padding:10px;border-bottom:1px solid var(--line);vertical-align:top;line-height:1.45}',
    '#v-world .mr-table tr:last-child td{border-bottom:0}',
    '#v-world .mr-table .rank{width:38px;color:var(--faint);font-weight:800}',
    '#v-world .mr-table .name{color:var(--txt);font-weight:800;white-space:nowrap}',
    '#v-world .mr-table .pts{font-size:16px;font-weight:850;color:var(--txt);font-variant-numeric:tabular-nums;white-space:nowrap}',
    '#v-world .mr-chip{display:inline-block;border:1px solid var(--line2);background:var(--panel2);padding:2px 6px;margin:1px 3px 1px 0;font-size:10px;color:var(--dim)}',
    '#v-world .mr-meta{display:flex;gap:10px;flex-wrap:wrap;margin-top:9px;font-size:11px;color:var(--faint);line-height:1.5}',
    '#v-world .mr-note{margin-top:10px;padding-top:10px;border-top:1px solid var(--line);font-size:11px;line-height:1.55;color:var(--faint)}',
    '#v-world .mr-empty{padding:14px;border:1px solid var(--line);background:var(--panel2);font-size:12px;color:var(--dim)}',
    '@media(max-width:760px){#v-world .mr-summary{grid-template-columns:1fr}#v-world .mr-leaders{grid-template-columns:1fr 1fr}#v-world .mr-head{flex-direction:column}#v-world .mr-refresh{align-self:flex-start}}'
  ].join('');

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function pct(v){var n=Number(v);return Number.isFinite(n)?(n>0?'+':'')+n.toFixed(1)+'%':'—';}
  function grade(score){return score>=10?'매우 강함':score>=8?'강한 후보':score>=6?'관찰':'낮음';}
  function componentChips(row){var c=row&&row.components||{};return Object.keys(c).map(function(k){var x=c[k]||{};var txt=(x.label||k)+' '+(x.available===false?'자료없음':('+'+(Number(x.points)||0)));return '<span class="mr-chip">'+esc(txt)+'</span>';}).join('');}
  function leaderHTML(x){var n=Number(x&&x.changePct),cls=Number.isFinite(n)?(n>=0?'mr-up':'mr-down'):'';return '<div class="mr-lead"><b>'+esc(x&&x.name||x&&x.symbol||'—')+'</b><strong class="'+cls+'">'+pct(n)+'</strong><span>'+esc(x&&x.session||'미국장 종가/24h')+'</span></div>';}
  function candidateHTML(row,i){return '<tr><td class="rank">'+(i+1)+'</td><td><div class="name">'+esc(row.name||row.code)+'</div><div>'+esc(row.code||'')+'</div></td><td><span class="pts">'+esc(row.score)+'/'+esc(row.maxScore||12)+'</span><div>'+esc(grade(Number(row.score)||0))+'</div></td><td>'+esc(row.linkage||'—')+'</td><td>'+pct(row.recent5dPct)+'</td><td>'+componentChips(row)+'</td></tr>';}
  function ensurePanel(){
    var host=document.getElementById('wmBody');if(!host)return null;
    var foot=host.querySelector('.wm-foot');if(!foot)return null;
    var panel=document.getElementById('wmMomentumRadar');
    if(!panel){panel=document.createElement('section');panel.id='wmMomentumRadar';panel.className='wm-card mr-panel';foot.parentNode.insertBefore(panel,foot);}
    if(!host.__mrObserved&&window.MutationObserver){host.__mrObserved=true;new MutationObserver(function(){if(!document.getElementById('wmMomentumRadar')&&host.querySelector('.wm-foot')){ensurePanel();render(cached);}}).observe(host,{childList:true});}
    return panel;
  }
  function render(data){
    var panel=ensurePanel();if(!panel)return;
    if(!data){panel.innerHTML='<div class="mr-empty">해외 선행자산 레이더 데이터를 불러오는 중입니다.</div>';return;}
    var leaders=Array.isArray(data.leaders)?data.leaders:[],rows=Array.isArray(data.candidates)?data.candidates:[];
    var top=rows.slice().sort(function(a,b){return Number(b.score||0)-Number(a.score||0);})[0]||null;
    var covered=Number(data.coveredMaxScore)||0,max=Number(data.maxScore)||12;
    var common=(data.theme&&data.theme.signalSummary)||'미국 선행자산 움직임을 국내 직접 연계주에 매핑';
    panel.innerHTML='<div class="mr-head"><div><div class="mr-kicker">LEAD-LAG RADAR · 다음 거래일</div><h3 class="mr-title">해외 선행자산 → 국내 급등 후보</h3><p class="mr-desc">미국장 마감 후 선행주·Bitcoin 움직임과 국내 사업연결도·최근 눌림을 결합한다. 사전확률 탐지이며 매수 신호가 아니다.</p></div><button type="button" class="mr-refresh" data-mr-refresh>새로고침</button></div>'+
      '<div class="mr-summary"><div class="mr-signal"><div class="lab">현재 최상위 후보</div><div class="row"><div class="score">'+esc(top?top.score:'—')+(top?'/'+esc(top.maxScore||max):'')+'</div><div class="grade">'+esc(top?grade(Number(top.score)||0):'자료 대기')+'</div></div><div class="why">'+esc(top?(top.name+' · '+(top.linkage||common)):common)+'</div></div><div class="mr-leaders">'+leaders.map(leaderHTML).join('')+'</div></div>'+
      (rows.length?'<div class="mr-tablewrap"><table class="mr-table"><thead><tr><th>순위</th><th>국내 후보</th><th>점수</th><th>사업 연결</th><th>최근 5D</th><th>점수 근거</th></tr></thead><tbody>'+rows.slice().sort(function(a,b){return Number(b.score||0)-Number(a.score||0);}).map(candidateHTML).join('')+'</tbody></table></div>':'<div class="mr-empty">현재 임계치를 넘은 국내 후보가 없습니다.</div>')+
      '<div class="mr-meta"><span>기준 '+esc(data.asOf||'—')+'</span><span>테마 '+esc(data.theme&&data.theme.name||'—')+'</span><span>현재 점수 커버리지 '+esc(covered)+'/'+esc(max)+'</span><span>상태 '+esc(data.status||'—')+'</span></div>'+
      '<div class="mr-note">현재 v1은 스테이블코인·결제 테마부터 적용한다. 정책 촉매와 과거 동일 재료 민감도는 검증 가능한 원자료가 연결될 때만 점수에 포함한다. 미연결 항목은 임의 추정하지 않는다.</div>';
    var b=panel.querySelector('[data-mr-refresh]');if(b)b.addEventListener('click',function(){load(true);});
  }
  function load(force){
    if(loading)return;if(cached&&!force){render(cached);return;}loading=true;render(cached);
    fetch(DATA_URL+'?t='+Date.now(),{cache:'no-store',credentials:'same-origin'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(function(j){cached=j;render(j);}).catch(function(e){var p=ensurePanel();if(p&&!cached)p.innerHTML='<div class="mr-empty">급등 후보 데이터를 불러오지 못했습니다. '+esc(e&&e.message||e)+'</div>';}).finally(function(){loading=false;});
  }
  function init(){
    if(!document.getElementById('momentum-radar-css')){var st=document.createElement('style');st.id='momentum-radar-css';st.textContent=CSS;document.head.appendChild(st);}
    var p=ensurePanel();if(p)load(false);else setTimeout(init,250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.MOMENTUM_RADAR={load:load,render:render};
})();
