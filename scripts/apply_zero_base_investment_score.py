from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
marker='<!-- ZERO_BASE_INVESTMENT_SCORE_V1 -->'
if marker in s:
    raise SystemExit('already applied')
script=r'''
<!-- ZERO_BASE_INVESTMENT_SCORE_V1 -->
<script>
(function(){
 function num(t){var m=String(t||'').replace(/,/g,'').match(/[+\-]?\d+(?:\.\d+)?/);return m?parseFloat(m[0]):null}
 function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
 function pctScore(v,lo,hi){if(v==null)return 50;return clamp((v-lo)/(hi-lo)*100,0,100)}
 function findTracker(){return Array.from(document.querySelectorAll('h1,h2,h3,h4,div,span')).find(function(e){return e.childElementCount<4&&/추정 리비전 트래커/.test(e.textContent||'')})}
 function apply(){
  var h=findTracker();if(!h)return false;var root=h.closest('section,.card,.panel,.box,article')||h.parentElement;if(!root)return false;
  var table=root.querySelector('table');if(!table)return false;var head=table.querySelector('thead tr')||table.querySelector('tr');if(!head)return false;
  var ths=Array.from(head.children), stockIdx=ths.findIndex(function(x){return /종목/.test(x.textContent)});if(stockIdx<0)return false;
  if(head.querySelector('[data-zb-score]'))return true;
  var oldRisk=ths.findIndex(function(x){return /위험조정/.test(x.textContent)});
  if(oldRisk>=0){table.querySelectorAll('tr').forEach(function(tr){if(tr.children[oldRisk])tr.children[oldRisk].style.display='none'})}
  var th=document.createElement('th');th.dataset.zbScore='1';th.innerHTML='투자매력도<br><small style="font-weight:400;color:var(--faint)">제로베이스 ·100</small>';head.insertBefore(th,head.children[stockIdx+1]||null);
  var headers=Array.from(head.children).map(function(x){return (x.textContent||'').replace(/\s+/g,' ') });
  function idx(re){return headers.findIndex(function(x){return re.test(x)})}
  var tpI=idx(/목표가|TP 평균/), epsI=idx(/EPS 리비전/), breadthI=idx(/상향.*하향|애널 수/), priceI=idx(/^주가|주가\s/), gateI=idx(/가격.*강도|강도.*게이트/), epsFYI=idx(/EPS\s*FY\+1/);
  Array.from(table.querySelectorAll('tbody tr')).forEach(function(tr){var c=Array.from(tr.children);if(!c.length)return;
   function txt(i){return i>=0&&c[i]?c[i].textContent:''}
   var tpText=txt(tpI),epsText=txt(epsI),breadth=txt(breadthI),priceText=txt(priceI),gateText=txt(gateI),epsFY=txt(epsFYI);
   var upside=(tpText.match(/여력\s*([+\-]?\d+(?:\.\d+)?)%/)||[])[1];upside=upside!=null?parseFloat(upside):null;
   var rev30=(epsText.match(/30d\s*([+\-]?\d+(?:\.\d+)?)%/)||[])[1];var rev90=(epsText.match(/90d\s*([+\-]?\d+(?:\.\d+)?)%/)||[])[1];rev30=rev30!=null?parseFloat(rev30):null;rev90=rev90!=null?parseFloat(rev90):null;
   var up=(breadth.match(/▲\s*(\d+)/)||[])[1],dn=(breadth.match(/▼\s*(\d+)/)||[])[1];up=up?+up:0;dn=dn?+dn:0;var breadthScore=(up+dn)?100*up/(up+dn):50;
   var p30=(priceText.match(/30d\s*([+\-]?\d+(?:\.\d+)?)%/)||[])[1];var p90=(priceText.match(/90d\s*([+\-]?\d+(?:\.\d+)?)%/)||[])[1];p30=p30!=null?parseFloat(p30):null;p90=p90!=null?parseFloat(p90):null;
   var gate=num(gateText);var fy=num(epsFY);
   var revisionScore=0.6*pctScore(rev30,-5,10)+0.4*pctScore(rev90,-10,25);
   var valuationScore=pctScore(upside,0,80);
   var momentumScore=0.55*pctScore(p30,-20,20)+0.45*pctScore(p90,-30,40);
   var gateScore=gate==null?50:pctScore(-gate,-25,15);
   var visibilityScore=fy==null?50:55; // FY+1 추정치 존재 자체를 최소 가시성으로 반영
   var score=Math.round(0.30*revisionScore+0.20*valuationScore+0.18*breadthScore+0.12*momentumScore+0.10*gateScore+0.10*visibilityScore);
   var td=document.createElement('td');td.dataset.zbScore='1';var tone=score>=75?'var(--st-dawn)':score>=60?'var(--st-accel)':score>=45?'var(--st-mature)':'var(--st-hot)';td.innerHTML='<div style="font-weight:800;font-size:18px;color:'+tone+'">'+score+'</div><div style="font-size:10px;color:var(--faint);white-space:nowrap">'+(score>=75?'최우선':score>=60?'우선':score>=45?'중립':'후순위')+'</div>';tr.insertBefore(td,tr.children[stockIdx+1]||null);
  });
  var note=document.createElement('div');note.dataset.zbScore='1';note.style.cssText='margin:8px 0 12px;font-size:11px;color:var(--dim);line-height:1.55';note.innerHTML='<b>투자매력도(제로베이스)</b> · 오늘 보유수량·매입가·기존 수익률을 모두 무시하고 다시 산다는 가정. EPS 리비전 30% + 목표가 여력 20% + 애널리스트 상향폭 18% + 주가 모멘텀 12% + 가격/추정 괴리 10% + FY+1 실적가시성 10%. <b>보유비중은 점수에 넣지 않으며</b>, 비중조절 단계에서만 중복노출·집중도를 별도로 적용.';
  table.parentElement.insertBefore(note,table);
  return true;
 }
 if(!apply()){var mo=new MutationObserver(function(){if(apply())mo.disconnect()});mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(function(){apply();mo.disconnect()},10000)}
})();
</script>
'''
if '</body>' not in s: raise SystemExit('body close not found')
s=s.replace('</body>',script+'\n</body>',1)
p.write_text(s,encoding='utf-8')
