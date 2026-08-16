from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# Replace any earlier injected zero-base block instead of stacking versions.
s = re.sub(r'\n?<!-- ZERO_BASE_INVESTMENT_SCORE_V[12] -->\n<script>.*?</script>\n?', '\n', s, flags=re.S)

script = r'''
<!-- ZERO_BASE_INVESTMENT_SCORE_V2 -->
<script>
(function(){
 const ZB={gamma:null,holdings:null};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const scoreRange=(v,lo,hi)=>v==null?null:clamp((v-lo)/(hi-lo)*100,0,100);
 const invRange=(v,lo,hi)=>v==null?null:100-scoreRange(v,lo,hi);
 const weighted=(items)=>{let sw=0,sv=0,full=0;items.forEach(x=>{full+=x[1];if(x[0]!=null&&isFinite(x[0])){sw+=x[1];sv+=x[0]*x[1]}});return {score:sw?sv/sw:null,coverage:full?sw/full:0};};
 const fmt=(v)=>v==null?'—':String(Math.round(v));
 function findTracker(){return Array.from(document.querySelectorAll('h1,h2,h3,h4,div,span')).find(e=>e.childElementCount<4&&/추정 리비전 트래커/.test(e.textContent||''));}
 function tickerOf(txt){const a=String(txt||'').match(/\b(\d{6}|[A-Z]{1,6})\b/g);return a&&a.length?a[a.length-1]:null;}
 function stageScore(s){return ({'태동':72,'초입':82,'가속':92,'성숙':58,'과열':30})[s]??null;}
 function gammaScore(g){return ({open:88,flagged:55,spent:20})[g]??null;}
 function breadth(up,dn){if(up==null&&dn==null)return null;up=up||0;dn=dn||0;return up+dn?100*up/(up+dn):null;}
 function calc(G){
   if(!G)return {score:null,coverage:0,penalty:0,detail:{}};
   const R=G.rev||{}, E=R.eps||{}, fy1=E.fy1||{}, fy0=E.fy0||{}, q1=E.q1||{}, px=R.px||{}, tp=R.tp||{}, rating=R.rating||{};
   const epsGrowth=(fy1.now!=null&&fy0.now!=null&&fy0.now>0&&fy1.now>0)?((fy1.now/fy0.now)-1)*100:null;
   const fwdPE=(G.price!=null&&fy1.now!=null&&fy1.now>0)?G.price/fy1.now:null;
   const garp=(epsGrowth!=null&&fwdPE!=null&&fwdPE>0)?epsGrowth/fwdPE:null;
   const br=breadth(fy1.up30,fy1.dn30);
   const s3=weighted([
     [scoreRange(q1.c30,-8,15),50],
     [scoreRange(q1.c90,-15,30),20],
     [scoreRange(fy1.c30,-8,15),30]
   ]);
   const s6=weighted([
     [scoreRange(epsGrowth,-10,60),60],
     [scoreRange(fy1.c90,-15,40),25],
     [scoreRange(fy1.c30,-8,15),15]
   ]);
   const val=weighted([
     [scoreRange(G.pct,-10,60),45],
     [scoreRange(garp,0,2),35],
     [scoreRange(tp.c30,-5,10),20]
   ]);
   const cat=weighted([
     [scoreRange(q1.c30,-8,15),25],
     [scoreRange(tp.c30,-5,10),20],
     [gammaScore(G.g),25],
     [stageScore(G.stage),15],
     [br,15]
   ]);
   const con=weighted([
     [br,60],
     [rating.mean!=null?invRange(rating.mean,1,5):null,40]
   ]);
   const dims=[['3M',s3,30],['6M',s6,25],['밸류',val,20],['촉매',cat,15],['컨센',con,10]];
   let ew=0,ev=0;dims.forEach(x=>{if(x[1].score!=null){const w=x[2]*x[1].coverage;ew+=w;ev+=x[1].score*w;}});
   const coverage=ew/100;
   let penalty=0;
   if(px.c30!=null&&fy1.c30!=null){const gap=px.c30-fy1.c30;if(gap>10)penalty+=clamp((gap-10)/20*6,0,6);}
   if(q1.c30!=null&&q1.c30<0)penalty+=clamp(-q1.c30/8*4,0,4);
   if(fy1.c30!=null&&fy1.c30<0)penalty+=clamp(-fy1.c30/8*4,0,4);
   if(G.g==='spent')penalty+=6;else if(G.flagged||G.g==='flagged')penalty+=3;
   if(G.stage==='과열')penalty+=8;
   if(G.pct!=null&&G.pct>60&&tp.c30!=null&&tp.c30<=0){
     penalty+=clamp(((G.pct-60)/60*5)+((-tp.c30)/5*2),0,7);
   }
   if(fy1.up30!=null||fy1.dn30!=null){const u=fy1.up30||0,d=fy1.dn30||0;if(d>u)penalty+=clamp((d-u)/Math.max(1,u+d)*4,0,4);}
   penalty=clamp(penalty,0,20);
   const base=ew?ev/ew:null;
   const final=(coverage>=0.55&&base!=null)?Math.round(clamp(base-penalty,0,100)):null;
   return {score:final,base:base,coverage:coverage,penalty:penalty,detail:{s3:s3.score,s6:s6.score,val:val.score,cat:cat.score,con:con.score,epsGrowth:epsGrowth,fwdPE:fwdPE,garp:garp}};
 }
 function label(s){return s==null?'자료부족':s>=80?'최우선':s>=68?'우선':s>=55?'중립':s>=45?'관찰':'후순위';}
 function tone(s){return s==null?'var(--faint)':s>=80?'var(--st-dawn)':s>=68?'var(--st-accel)':s>=55?'var(--st-mature)':'var(--st-hot)';}
 function heldSet(){const out={};((ZB.holdings&&ZB.holdings.detail)||[]).forEach(x=>{if(x&&x.ticker&&x.qty!=null&&Number(x.qty)>0)out[String(x.ticker).toUpperCase()]=x;});return out;}
 function render(){
   const h=findTracker();if(!h)return false;
   const root=h.closest('section,.card,.panel,.box,article')||h.parentElement;if(!root)return false;
   const table=root.querySelector('table');if(!table)return false;
   const head=table.querySelector('thead tr')||table.querySelector('tr');if(!head)return false;
   table.querySelectorAll('[data-zb-score]').forEach(e=>e.remove());
   const ths=Array.from(head.children),stockIdx=ths.findIndex(x=>/종목/.test(x.textContent||''));if(stockIdx<0)return false;
   const oldRisk=ths.findIndex(x=>/위험조정/.test(x.textContent||''));
   if(oldRisk>=0)table.querySelectorAll('tr').forEach(tr=>{if(tr.children[oldRisk])tr.children[oldRisk].style.display='none';});
   const th=document.createElement('th');th.dataset.zbScore='1';th.innerHTML='투자매력도<br><small style="font-weight:400;color:var(--faint)">제로베이스 · 100</small>';head.insertBefore(th,head.children[stockIdx+1]||null);
   const held=heldSet(), gamma=(ZB.gamma&&ZB.gamma.gamma)||ZB.gamma||{}, rows=[];
   Array.from(table.querySelectorAll('tbody tr')).forEach((tr,order)=>{
     const cells=Array.from(tr.children),ticker=tickerOf(cells[stockIdx]?cells[stockIdx].textContent:'');
     const G=ticker?gamma[ticker]:null,r=calc(G),isHeld=!!(ticker&&held[ticker]);
     tr.dataset.zbTicker=ticker||'';tr.dataset.zbHeld=isHeld?'1':'0';tr.dataset.zbScoreValue=r.score==null?'':String(r.score);
     const td=document.createElement('td');td.dataset.zbScore='1';td.style.minWidth='124px';
     const d=r.detail||{};const cov=Math.round((r.coverage||0)*100),rankTag=isHeld?'<span data-zb-rank style="font-weight:700;color:var(--dim)"></span>':'<span style="font-size:10px;color:var(--faint)">후보</span>';
     const baseLine=r.base!=null?'기초점수 '+r.base.toFixed(1)+' - 리스크 '+r.penalty.toFixed(1)+' = 최종 '+fmt(r.score):'기초점수 계산 불가';
     const title=[
       '현재값: 3M '+fmt(d.s3)+' · 6M '+fmt(d.s6)+' · 밸류 '+fmt(d.val)+' · 촉매 '+fmt(d.cat)+' · 컨센 '+fmt(d.con)+' · 리스크 -'+r.penalty.toFixed(1)+' · 데이터 '+cov+'%',
       baseLine,
       '',
       '최종 = 가중 기초점수 - 리스크 페널티',
       '가중 기초점수 = (3M×30% + 6M×25% + 밸류×20% + 촉매×15% + 컨센×10%) / 유효 데이터 가중치',
       '3M = 다음분기 EPS 30일 리비전×50% + 다음분기 EPS 90일 리비전×20% + FY+1 EPS 30일 리비전×30%',
       '6M = FY+1 EPS 성장률×60% + FY+1 EPS 90일 리비전×25% + FY+1 EPS 30일 리비전×15%',
       '밸류 = 목표가 상승여력×45% + (EPS성장률/FY+1 P/E)×35% + 목표가 30일 리비전×20%',
       '촉매 = 다음분기 EPS 30일 리비전×25% + 목표가 30일 리비전×20% + γ×25% + 사이클 단계×15% + EPS 상향 비율×15%',
       '컨센 = FY+1 EPS 상향 비율×60% + 애널리스트 평점×40%',
       '리스크 = 주가가 EPS30 개선을 10%p 초과 선반영 + 단기/FY+1 EPS 하향 + γ spent/flagged + 과열 + 과도한 목표가 괴리 + 하향 리비전 우세 (합계 최대 20점)',
       d.epsGrowth!=null?'참고: FY+1 EPS증가 '+d.epsGrowth.toFixed(1)+'%':null,
       d.fwdPE!=null?'참고: FY+1 P/E '+d.fwdPE.toFixed(1)+'x':null
     ].filter(x=>x!=null).join('\n');
     if(r.score==null){td.innerHTML='<div style="font-weight:800;color:var(--faint)">자료부족</div><div style="font-size:10px;color:var(--faint)">데이터 '+cov+'%</div>';}
     else td.innerHTML='<div style="display:flex;gap:6px;align-items:baseline;white-space:nowrap">'+rankTag+'<b style="font-size:19px;color:'+tone(r.score)+'">'+r.score+'</b><span style="font-size:10px;color:var(--faint)">'+label(r.score)+'</span></div><div style="font-size:9.5px;color:var(--dim);white-space:nowrap">3M '+fmt(d.s3)+' · 6M '+fmt(d.s6)+' · V '+fmt(d.val)+'</div><div style="font-size:9.5px;color:var(--faint);white-space:nowrap">촉매 '+fmt(d.cat)+' · 리스크 -'+Math.round(r.penalty)+' · '+cov+'%</div>';
     td.title=title;tr.insertBefore(td,tr.children[stockIdx+1]||null);rows.push({tr,score:r.score,isHeld,order});
   });
   const body=table.querySelector('tbody');if(body){rows.sort((a,b)=>{if(a.score==null&&b.score==null)return a.order-b.order;if(a.score==null)return 1;if(b.score==null)return -1;return b.score-a.score;}).forEach(x=>body.appendChild(x.tr));}
   const heldRows=rows.filter(x=>x.isHeld&&x.score!=null).sort((a,b)=>b.score-a.score);heldRows.forEach((x,i)=>{const e=x.tr.querySelector('[data-zb-rank]');if(e)e.textContent='보유 #'+(i+1);});
   return true;
 }
 async function boot(){
   try{const rr=await Promise.all([fetch('./gamma.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),fetch('./holdings.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)]);ZB.gamma=rr[0];ZB.holdings=rr[1];}catch(e){}
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
