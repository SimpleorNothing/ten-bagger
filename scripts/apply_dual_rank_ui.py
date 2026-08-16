from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# Replace prior rank UI injection instead of stacking versions.
s = re.sub(r'\n?<!-- DUAL_RANK_UI_V[123] -->\n<script>.*?</script>\n?', '\n', s, flags=re.S)

script = r'''
<!-- DUAL_RANK_UI_V3 -->
<script>
(function(){
 const S={gamma:null};
 const q=(sel,root=document)=>root.querySelector(sel);
 const qa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const scoreRange=(v,lo,hi)=>v==null?null:clamp((v-lo)/(hi-lo)*100,0,100);
 function tickerOf(txt){const a=String(txt||'').match(/\b(\d{6}|[A-Z]{1,6})\b/g);return a&&a.length?a[a.length-1]:null;}
 function gammaRow(ticker){return (((S.gamma&&S.gamma.gamma)||S.gamma||{})[ticker])||null;}
 function contributionReasons(ticker){
   const G=gammaRow(ticker);if(!G)return [];
   const R=G.rev||{},E=R.eps||{},fy1=E.fy1||{};
   const out=[];
   if(fy1.c30!=null){const c=scoreRange(fy1.c30,-8,15)*0.1275;out.push({label:'EPS30',points:c});}
   if(fy1.c90!=null){const c=scoreRange(fy1.c90,-15,40)*0.0625;out.push({label:'EPS90',points:c});}
   if(G.pct!=null){const c=scoreRange(G.pct,-10,60)*0.09;out.push({label:'상승여력',points:c});}
   return out.sort((a,b)=>Math.abs(b.points)-Math.abs(a.points)).map(x=>x.label+' +'+x.points.toFixed(1)+'점');
 }
 function render(){
   const rows=qa('tr[data-zb-score-value]');if(!rows.length)return false;const table=rows[0].closest('table');if(!table)return false;
   qa('[data-dual-rank]',table).forEach(e=>e.remove());
   const oldNote=q('[data-dual-rank-note]');if(oldNote)oldNote.remove();
   const head=q('thead tr',table)||q('tr',table);if(!head)return false;
   const zbHead=q('th[data-zb-score]',head);if(zbHead)zbHead.innerHTML='투자매력도<br><small style="font-weight:400;color:var(--faint)">제로베이스 · 100</small>';
   const stockIdx=qa('th',head).findIndex(x=>/종목/.test(x.textContent||''));if(stockIdx<0)return false;
   const zbIdx=qa('th',head).findIndex(x=>x.hasAttribute('data-zb-score'));if(zbIdx<0)return false;
   const thR=document.createElement('th');thR.dataset.dualRank='1';thR.innerHTML='점수 기여도<br><small style="font-weight:400;color:var(--faint)">실제 기여점수</small>';head.insertBefore(thR,head.children[zbIdx+1]||null);
   rows.forEach((tr)=>{
     const ticker=(tr.dataset.zbTicker||tickerOf((tr.children[stockIdx]||{}).textContent||'')||'').toUpperCase();
     const tdR=document.createElement('td');tdR.dataset.dualRank='1';tdR.style.minWidth='170px';const rs=contributionReasons(ticker);tdR.innerHTML=rs.length?rs.map(x=>'<span style="display:inline-block;margin:1px 3px 1px 0;padding:1px 4px;border:1px solid var(--line);border-radius:3px;font-size:9px;white-space:nowrap">'+x+'</span>').join(''):'<span style="font-size:10px;color:var(--faint)">기여도 자료 부족</span>';const ref=tr.children[zbIdx+1]||null;tr.insertBefore(tdR,ref);
   });
   const note=document.createElement('div');note.dataset.dualRank='1';note.dataset.dualRankNote='1';note.style.cssText='margin:8px 0 10px;padding:7px 9px;border:1px solid var(--line);border-radius:5px;font-size:11px;color:var(--dim);line-height:1.55';note.innerHTML='<b>투자매력도</b>는 현재 보유비중·레이어 집중도·중복노출을 반영하지 않는 제로베이스 100점 점수입니다. <b>점수 기여도</b>는 원자료의 단순 변화율이 아니라 모델에 실제 더해지는 점수이며, FY+1 EPS 30일 리비전 최대 12.75점, 90일 최대 6.25점, 목표가 상승여력 최대 9.0점을 표시합니다.';table.parentElement.insertBefore(note,table);return true;
 }
 async function boot(){try{S.gamma=await fetch('./gamma.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);}catch(e){}let tries=0;const t=setInterval(()=>{tries++;if(render()||tries>40)clearInterval(t);},250);}
 boot();
})();
</script>
'''

pos = s.rfind('</body>')
if pos < 0:
    raise SystemExit('body close not found')
s = s[:pos] + script + '\n' + s[pos:]
p.write_text(s, encoding='utf-8')
