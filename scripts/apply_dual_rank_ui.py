from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# Replace prior dual-rank UI injection instead of stacking versions.
s = re.sub(r'\n?<!-- DUAL_RANK_UI_V1 -->\n<script>.*?</script>\n?', '\n', s, flags=re.S)

script = r'''
<!-- DUAL_RANK_UI_V1 -->
<script>
(function(){
 const S={holdings:null,gamma:null};
 const q=(sel,root=document)=>root.querySelector(sel);
 const qa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
 const pct=(v)=>v==null||!isFinite(v)?'—':((v>0?'+':'')+Number(v).toFixed(1)+'%');
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function tickerOf(txt){const a=String(txt||'').match(/\b(\d{6}|[A-Z]{1,6})\b/g);return a&&a.length?a[a.length-1]:null;}
 function layerMap(){
   const out={};((S.holdings&&S.holdings.holdings)||[]).forEach(x=>{if(x&&x.layer)out[x.layer]=x;});return out;
 }
 function detailMap(){
   const out={};((S.holdings&&S.holdings.detail)||[]).forEach(x=>{if(x&&x.ticker)out[String(x.ticker).toUpperCase()]=x;});return out;
 }
 function l3Ceiling(){
   const g=((S.gamma&&S.gamma.gamma)||S.gamma||{}).MU||{};
   const st=g.stage;
   if(st==='태동'||st==='초입'||st==='가속')return 45;
   if(st==='성숙')return 40;
   if(st==='과열')return 35;
   return 40;
 }
 function concentrationPenalty(ticker){
   const dm=detailMap(), lm=layerMap(), d=dm[ticker]||{}, layer=d.layer, row=lm[layer];
   if(!row||row.w==null)return {penalty:0,label:null};
   const w=Number(row.w)||0;
   if(layer==='L3'){
     const cap=l3Ceiling();
     const excess=Math.max(0,w-cap);
     const proximity=(w>=cap-2&&w<=cap)?2:0;
     return {penalty:clamp(excess*2+proximity,0,14),label:'L3 '+w.toFixed(1)+'%'};
   }
   const mild=Math.max(0,w-15)*0.5;
   return {penalty:clamp(mild,0,6),label:w>=12?layer+' '+w.toFixed(1)+'%':null};
 }
 function overlapPenalty(ticker){
   const dm=detailMap(), d=dm[ticker]||{}; if(!d.layer)return {penalty:0,label:null};
   const peers=((S.holdings&&S.holdings.detail)||[]).filter(x=>x&&x.layer===d.layer&&Number(x.w||0)>0);
   if(peers.length<2)return {penalty:0,label:null};
   if(d.layer==='L3')return {penalty:3,label:'중복노출↑'};
   return {penalty:1.5,label:'중복노출'};
 }
 function gammaRow(ticker){return (((S.gamma&&S.gamma.gamma)||S.gamma||{})[ticker])||null;}
 function reasons(ticker){
   const G=gammaRow(ticker), out=[];
   if(G){
     const R=G.rev||{}, E=R.eps||{}, fy1=E.fy1||{};
     if(fy1.c30!=null)out.push('EPS30 '+pct(fy1.c30));
     if(fy1.c90!=null)out.push('EPS90 '+pct(fy1.c90));
     if(G.pct!=null)out.push('상승여력 '+pct(G.pct));
     if(G.g)out.push('γ '+G.g);
   }
   const c=concentrationPenalty(ticker), o=overlapPenalty(ticker);
   if(c.label)out.push(c.label);
   if(o.label)out.push(o.label);
   return out.slice(0,3);
 }
 function actionFor(score,isHeld,pen){
   if(score==null)return '자료부족';
   if(isHeld){
     if(score>=68&&pen<8)return '확대';
     if(score>=55)return '유지';
     if(score>=45)return '관찰';
     return '축소';
   }
   if(score>=70&&pen<8)return '신규';
   if(score>=55)return '관찰';
   return '후순위';
 }
 function render(){
   const rows=qa('tr[data-zb-score-value]'); if(!rows.length)return false;
   const table=rows[0].closest('table'); if(!table)return false;
   qa('[data-dual-rank]',table).forEach(e=>e.remove());
   const head=q('thead tr',table)||q('tr',table); if(!head)return false;
   const zbHead=q('th[data-zb-score]',head);
   if(zbHead)zbHead.innerHTML='제로베이스<br><small style="font-weight:400;color:var(--faint)">매력도 · 100</small>';
   const stockIdx=qa('th',head).findIndex(x=>/종목/.test(x.textContent||''));
   if(stockIdx<0)return false;
   const zbIdx=qa('th',head).findIndex(x=>x.hasAttribute('data-zb-score'));
   if(zbIdx<0)return false;
   const thA=document.createElement('th');thA.dataset.dualRank='1';thA.innerHTML='실제 비중조절<br><small style="font-weight:400;color:var(--faint)">포트폴리오 반영</small>';
   const thR=document.createElement('th');thR.dataset.dualRank='1';thR.innerHTML='순위 근거<br><small style="font-weight:400;color:var(--faint)">핵심 3개</small>';
   head.insertBefore(thR,head.children[zbIdx+1]||null);
   head.insertBefore(thA,thR);
   const scored=[];
   rows.forEach((tr,order)=>{
     const ticker=(tr.dataset.zbTicker||tickerOf((tr.children[stockIdx]||{}).textContent||'')||'').toUpperCase();
     const zb=tr.dataset.zbScoreValue===''?null:Number(tr.dataset.zbScoreValue);
     const c=concentrationPenalty(ticker),o=overlapPenalty(ticker),pen=(c.penalty||0)+(o.penalty||0);
     const actual=zb==null?null:Math.round(clamp(zb-pen,0,100));
     const held=tr.dataset.zbHeld==='1';
     scored.push({tr,ticker,zb,actual,held,pen,order});
     const tdA=document.createElement('td');tdA.dataset.dualRank='1';tdA.style.minWidth='112px';
     tdA.innerHTML=actual==null?'<b style="color:var(--faint)">자료부족</b>':'<div style="display:flex;gap:5px;align-items:baseline;white-space:nowrap"><span data-actual-rank style="font-weight:800;color:var(--dim)"></span><b style="font-size:17px">'+actual+'</b></div><div data-actual-action style="font-size:10px;color:var(--faint);white-space:nowrap"></div>';
     const tdR=document.createElement('td');tdR.dataset.dualRank='1';tdR.style.minWidth='150px';
     const rs=reasons(ticker);tdR.innerHTML=rs.length?rs.map(x=>'<span style="display:inline-block;margin:1px 3px 1px 0;padding:1px 4px;border:1px solid var(--line);border-radius:3px;font-size:9px;white-space:nowrap">'+x+'</span>').join(''):'<span style="font-size:10px;color:var(--faint)">근거 부족</span>';
     const ref=tr.children[zbIdx+1]||null;tr.insertBefore(tdR,ref);tr.insertBefore(tdA,tdR);
   });
   scored.filter(x=>x.actual!=null).sort((a,b)=>b.actual-a.actual||a.order-b.order).forEach((x,i)=>{
     const rank=q('[data-actual-rank]',x.tr), act=q('[data-actual-action]',x.tr);
     if(rank)rank.textContent='#'+(i+1);
     if(act)act.textContent=actionFor(x.actual,x.held,x.pen)+(x.pen>0?' · 집중/중복 -'+x.pen.toFixed(1):'');
   });
   const old=q('[data-dual-rank-note]');if(old)old.remove();
   const note=document.createElement('div');note.dataset.dualRank='1';note.dataset.dualRankNote='1';
   note.style.cssText='margin:8px 0 10px;padding:7px 9px;border:1px solid var(--line);border-radius:5px;font-size:11px;color:var(--dim);line-height:1.55';
   note.innerHTML='<b>상승여력 ≠ 매수 우선순위</b> · 상승여력은 목표가 대비 기대수익입니다. <b>제로베이스 매력도</b>는 오늘 전량 현금이라고 가정한 종목 자체의 투자매력도이고, <b>실제 비중조절</b>은 현재 레이어 집중도와 동일 레이어 중복노출을 추가 반영합니다. L3는 사이클별 동적 상단(초입·가속 45% / 성숙 40% / 과열 35%)을 적용합니다.';
   table.parentElement.insertBefore(note,table);
   return true;
 }
 async function boot(){
   try{const rr=await Promise.all([fetch('./holdings.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),fetch('./gamma.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)]);S.holdings=rr[0];S.gamma=rr[1];}catch(e){}
   let tries=0;const t=setInterval(()=>{tries++;if(render()||tries>40)clearInterval(t);},250);
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
