/* financing-gate.js — 01 시장 모니터링 AI Financing Gate.
 * 무위험금리와 신용스프레드를 분리해 AI CAPEX 금융 스트레스의 전파경로를 표시한다.
 * 수치가 검증되지 않은 상태에서는 값을 추정하지 않고 '자료 대기'로 표시한다.
 */
(function(){
'use strict';
var ID='financingGate';
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function css(){if(document.getElementById('financingGateCss'))return;var s=document.createElement('style');s.id='financingGateCss';s.textContent=[
'#financingGateLens{background:var(--panel);border:1px solid var(--line);border-radius:3px;padding:11px 14px;margin:22px 0 12px}',
'#financingGateLens .fg-head{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}',
'#financingGateLens .fg-title{font-weight:800;font-size:17px}',
'#financingGateLens .fg-state{font:700 12px var(--mono);border:1px solid var(--line2);border-radius:20px;padding:1px 8px}',
'#financingGateLens .fg-sub{margin-top:5px;color:var(--dim);font-size:14px;line-height:1.55}',
'#financingGate{grid-template-columns:repeat(auto-fit,minmax(250px,1fr));margin-bottom:12px}',
'#financingGate .mkt-card{padding:14px 15px}',
'#financingGate .fg-k{font:700 12px var(--mono);color:var(--faint);letter-spacing:.04em}',
'#financingGate .fg-v{font-weight:800;font-size:17px;margin:3px 0}',
'#financingGate .fg-n{font-size:13px;line-height:1.5;color:var(--dim)}',
'#financingGate .fg-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:9px}',
'#financingGate .fg-reg{border-top:1px solid var(--line);padding-top:6px;font-size:12px;line-height:1.45}',
'#financingGate .fg-reg b{display:block;font-size:13px}',
'#financingGate .fg-flow{font:600 13px var(--mono);line-height:1.65;color:var(--txt)}',
'#financingGate .fg-layer{display:flex;justify-content:space-between;gap:10px;border-top:1px solid var(--line);padding:5px 0;font-size:13px}',
'#financingGate .fg-layer:first-child{border-top:0}',
'#financingGate .fg-sens{font-weight:700;white-space:nowrap}',
'@media(max-width:600px){#financingGate{grid-template-columns:1fr}#financingGate .fg-grid{grid-template-columns:1fr}}'
].join('');document.head.appendChild(s);}
function card(k,v,n,extra){return '<div class="mkt-card"><div class="fg-k">'+esc(k)+'</div><div class="fg-v">'+esc(v)+'</div><div class="fg-n">'+esc(n)+'</div>'+(extra||'')+'</div>';}
function render(d){css();var lens=document.getElementById('financingGateLens'),grid=document.getElementById(ID);if(!lens){lens=document.createElement('div');lens.id='financingGateLens';}if(!grid){grid=document.createElement('div');grid.id=ID;grid.className='mkt-grid';}
lens.innerHTML='<div class="fg-head"><span class="fg-title">AI Financing Gate</span><span class="fg-state">'+esc(d.stateLabel||'자료 대기')+'</span></div><div class="fg-sub">'+esc(d.summary)+'</div>';
var regimes='<div class="fg-grid">'+d.regimes.map(function(x){return '<div class="fg-reg"><b>'+esc(x.name)+'</b>'+esc(x.read)+'</div>';}).join('')+'</div>';
var layers=d.layers.map(function(x){return '<div class="fg-layer"><span>'+esc(x.layer+' '+x.name)+'</span><span class="fg-sens">'+esc(x.sensitivity)+'</span></div>';}).join('');
grid.innerHTML=card('실제 조달비용','국채금리 + Credit Spread','10Y 하나로 판단하지 않는다. 무위험금리와 신용위험이 동시에 오르면 조달비용이 비선형적으로 악화될 수 있다.',regimes)+card('전파 경로','L7·L8 선행 관측','현재 8레이어 정의에서 전력·냉각과 발전·그리드는 장기 회수·대규모 자본투자 성격 때문에 금융환경 악화의 직접 영향을 먼저 확인한다.','<div class="fg-flow">Treasury/Term Premium → Credit Spread → 실제 조달금리 → DC IRR/Payback → AI CAPEX → 수주·매출·EPS</div>')+card('레이어 금리 민감도','구조적 민감도','주가 할인율 민감도와 EPS·CAPEX 민감도를 구분한다. 아래는 후자를 중심으로 한 관측 우선순위다.','<div>'+layers+'</div>')+card('투자매력도 반영 규율','기계적 감점 금지','10Y 상승만으로 종목 점수를 낮추지 않는다. 금융 스트레스가 고객 CAPEX·수주·EPS 전망으로 전이됐다는 검증 가능한 근거가 있을 때만 판단에 반영한다.');
var anchor=document.getElementById('gatesBoard');if(anchor&&anchor.parentNode){var host=anchor.parentNode;host.insertBefore(lens,anchor);host.insertBefore(grid,anchor);}else{var market=document.getElementById('v-market');if(market){market.appendChild(lens);market.appendChild(grid);}}
}
function boot(){fetch('/financing-gate.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();}).then(render).catch(function(){render({stateLabel:'자료 대기',summary:'검증 가능한 원자료가 확보될 때까지 수치를 추정하지 않습니다.',regimes:[{name:'10Y↑ / Spread↔↓',read:'CAPEX 훼손 확인 필요'},{name:'10Y↑ / Spread↑',read:'금융 스트레스 경고'},{name:'10Y↓ / Spread↑',read:'경기·신용위험 경고'},{name:'10Y↓ / Spread↓',read:'금융환경 우호'}],layers:[]});});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();