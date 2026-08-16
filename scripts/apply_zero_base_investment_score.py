from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')
s = re.sub(r'\n?<!-- ZERO_BASE_INVESTMENT_SCORE_V[1-4] -->\n<script>.*?</script>\n?', '\n', s, flags=re.S)

script = r'''
<!-- ZERO_BASE_INVESTMENT_SCORE_V4 -->
<script>
(function(){
 'use strict';
 const ZB={scores:null,holdings:null,benchmark:null,error:null};
 const fmt=(v,d=0)=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toFixed(d);
 const tone=(s)=>s==null?'var(--faint)':s>=80?'var(--st-dawn)':s>=68?'var(--st-accel)':s>=55?'var(--st-mature)':'var(--st-hot)';
 function tracker(){const host=document.getElementById('probEst');return host&&host.querySelector('table.pe-tbl,table');}
 function tickerOf(tr){const el=tr.querySelector('.pe-nm[data-ticker],[data-ticker]');return el?String(el.dataset.ticker||'').trim().toUpperCase():null;}
 function heldSet(){const out={};((ZB.holdings&&ZB.holdings.detail)||[]).forEach(x=>{if(x&&x.ticker&&Number(x.qty)>0)out[String(x.ticker).toUpperCase()]=1;});return out;}
 function note(table){
   let el=table.parentNode.querySelector('[data-zb-v4-note]');if(!el){el=document.createElement('div');el.dataset.zbV4Note='1';table.parentNode.insertBefore(el,table);}
   if(ZB.error){el.style.cssText='margin:0 0 8px;padding:7px 10px;border:1px solid var(--st-hot);border-radius:7px;color:var(--st-hot);font-size:10.5px';el.textContent='투자매력도 산출 실패 · '+ZB.error;return;}
   const b=ZB.benchmark||{},m=b.metrics||{},ns=Object.values(m).map(x=>Number(x&&x.n)).filter(Number.isFinite);
   el.style.cssText='margin:0 0 8px;padding:7px 10px;border:1px solid var(--line);border-radius:7px;background:var(--panel);font-size:10.5px;color:var(--dim);line-height:1.45';
   el.innerHTML='<b style="color:var(--txt)">V4 투자매력도</b> · Nasdaq-100 순위 백분위(P50=50) · 외생 데이터 점수와 내부 판단 보정 분리 · 기준 '+String(b.asOf||'').slice(0,10)+' · 유효표본 '+(ns.length?Math.min(...ns)+'~'+Math.max(...ns):'—')+'개';
 }
 function render(){
   const table=tracker();if(!table)return false;note(table);
   const head=table.querySelector('thead tr')||table.querySelector('tr'),body=table.querySelector('tbody');if(!head||!body)return false;
   table.querySelectorAll('[data-zb-score]').forEach(e=>e.remove());
   const stockIdx=Array.from(head.children).findIndex(x=>/종목/.test(x.textContent||''));if(stockIdx<0)return false;
   const th=document.createElement('th');th.dataset.zbScore='1';th.innerHTML='투자매력도<br><small style="font-weight:400;color:var(--faint)">V4 데이터+판단 · 100</small>';head.insertBefore(th,head.children[stockIdx+1]||null);
   const held=heldSet(),rows=[];
   Array.from(body.querySelectorAll('tr')).forEach((tr,order)=>{
     const ticker=tickerOf(tr),snap=ticker&&ZB.scores&&ZB.scores.rows&&ZB.scores.rows[ticker],v=snap&&snap.v4,old=snap&&snap.v3;
     tr.dataset.zbTicker=ticker||'';tr.dataset.zbHeld=ticker&&held[ticker]?'1':'0';tr.dataset.zbScoreValue=v&&v.score!=null?String(v.score):'';
     const td=document.createElement('td');td.dataset.zbScore='1';td.style.minWidth='142px';
     if(ZB.error)td.innerHTML='<b style="color:var(--st-hot)">산출 실패</b><div class="pe-p">scores.json 확인</div>';
     else if(!v||v.score==null)td.innerHTML='<b style="color:var(--faint)">자료부족</b><div class="pe-p">커버 '+fmt(v&&v.coverage*100)+'%</div>';
     else{
       const d=v.dimensions||{},adj=Number(v.adjustment||0),rank=ticker&&held[ticker]?'<span data-zb-rank style="font-weight:700;color:var(--dim)"></span>':'<span style="font-size:10px;color:var(--faint)">후보</span>';
       td.innerHTML='<div style="display:flex;gap:6px;align-items:baseline;white-space:nowrap">'+rank+'<b style="font-size:19px;color:'+tone(v.score)+'">'+v.score+'</b><span style="font-size:10px;color:var(--faint)">'+v.label+'</span></div><div style="font-size:9.5px;color:var(--dim);white-space:nowrap">리비전 '+fmt(d.revisionMomentum)+' · 성장 '+fmt(d.growth)+' · 밸류 '+fmt(d.valuation)+'</div><div style="font-size:9.5px;color:var(--faint);white-space:nowrap">괴리 '+fmt(d.estimateLead)+' · 판단 '+(adj>0?'+':'')+fmt(adj)+' · '+fmt(v.coverage*100)+'%</div>';
       td.title=['V4 최종 '+v.score+' = 외생 데이터 '+fmt(v.dataScore,1)+' + 내부 판단 '+(adj>0?'+':'')+fmt(adj,1),'리비전 모멘텀 '+fmt(d.revisionMomentum,1)+' · EPS 성장 '+fmt(d.growth,1)+' · 실제 밸류 '+fmt(d.valuation,1)+' · 컨센서스 '+fmt(d.consensus,1)+' · 가격-EPS 괴리 '+fmt(d.estimateLead,1),'판단 보정: γ '+(v.adjustmentDetail.gamma>0?'+':'')+fmt(v.adjustmentDetail.gamma,1)+' · 사이클 '+(v.adjustmentDetail.stage>0?'+':'')+fmt(v.adjustmentDetail.stage,1),'절대 EPS 상태: '+v.inputs.absoluteRevision+' · FY+1 EPS30 '+fmt((ZB.scores.rows[ticker].v4.inputs||{}).fy1c30,1),'기존 V3 '+fmt(old&&old.score)+' · 변화 '+(snap.delta>0?'+':'')+fmt(snap.delta),'모델 '+ZB.scores.modelVersion+' · 스냅샷 '+String(ZB.scores.asOf||'')].join('\n');
     }
     tr.insertBefore(td,tr.children[stockIdx+1]||null);rows.push({tr,score:v&&v.score,isHeld:!!(ticker&&held[ticker]),order});
   });
   rows.sort((a,b)=>a.score==null&&b.score==null?a.order-b.order:a.score==null?1:b.score==null?-1:b.score-a.score).forEach(x=>body.appendChild(x.tr));
   rows.filter(x=>x.isHeld&&x.score!=null).sort((a,b)=>b.score-a.score).forEach((x,i)=>{const e=x.tr.querySelector('[data-zb-rank]');if(e)e.textContent='보유 #'+(i+1);});
   return true;
 }
 async function boot(){
   const get=async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw new Error(u+' HTTP '+r.status);return r.json();};
   try{const x=await Promise.all([get('./scores.json'),get('./holdings.json'),get('./revision-benchmark.json')]);ZB.scores=x[0];ZB.holdings=x[1];ZB.benchmark=x[2];if(ZB.scores.schema!=='investment-scores-v4')throw new Error('scores schema 불일치');if(ZB.benchmark.schema!=='revision-benchmark-v2')throw new Error('benchmark schema 불일치');}
   catch(e){ZB.error=String(e&&e.message||e);}
   if(!render()){const mo=new MutationObserver(()=>{if(render())mo.disconnect();});mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>{render();mo.disconnect();},10000);}
 }
 boot();
})();
</script>
'''

pos = s.rfind('</body>')
if pos < 0:
    raise SystemExit('body close not found')
s = s[:pos] + script + '\n' + s[pos:]
p.write_text(s, encoding='utf-8')
