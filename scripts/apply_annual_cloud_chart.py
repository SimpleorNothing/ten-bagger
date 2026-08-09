from pathlib import Path
import re

p = Path('aisd.js')
s = p.read_text(encoding='utf-8')

func = r'''function mountAnnualCloudChart(root){
 var box=root.querySelector('[data-mini-chart="annual"]'),canvas=box&&box.querySelector('canvas'),tip=box&&box.querySelector('.ds-mini-tip');if(!canvas)return;
 var d={years:['2024','2025','2026E','2027E','2028E','2029E','2030E'],rpo:[568,1112,1900,2300,2600,2800,2800],revenue:[303,377,465,570,670,765,850],capex:[211,341,585,700,750,700,620]},ctx=canvas.getContext('2d'),active=-1;
 function col(name){return getComputedStyle(root).getPropertyValue(name).trim()||'#496176'}
 function fmt(v){return Math.round(v)+'B'}
 function draw(){var r=box.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(290,Math.round(r.width)),h=Math.max(240,Math.round(r.height));canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  var pad={l:52,r:18,t:30,b:40},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b,yMax=3000,x=function(i){return pad.l+pw*i/(d.years.length-1)},y=function(v){return pad.t+ph*(1-v/yMax)};
  ctx.font='11px '+getComputedStyle(root).getPropertyValue('--mono');ctx.textBaseline='middle';ctx.lineWidth=1;ctx.strokeStyle=col('--line');ctx.fillStyle=col('--faint');
  [0,500,1000,1500,2000,2500,3000].forEach(function(v){var yy=y(v);ctx.beginPath();ctx.moveTo(pad.l,yy+.5);ctx.lineTo(w-pad.r,yy+.5);ctx.stroke();ctx.textAlign='right';ctx.fillText(fmt(v),pad.l-7,yy)});
  function line(vals,color){ctx.strokeStyle=col(color);ctx.lineWidth=2.2;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();vals.forEach(function(v,i){var xx=x(i),yy=y(v);if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy)});ctx.stroke();vals.forEach(function(v,i){var xx=x(i),yy=y(v);ctx.fillStyle=col('--panel');ctx.strokeStyle=col(color);ctx.lineWidth=2;ctx.beginPath();ctx.arc(xx,yy,4,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=col(color);ctx.font='700 10px '+getComputedStyle(root).getPropertyValue('--mono');ctx.textAlign='center';ctx.fillText(Math.round(v),xx,Math.max(12,yy-11))})}
  if(active>=0){var xx=x(active);ctx.fillStyle='rgba(73,97,118,.07)';ctx.fillRect(xx-pw/(d.years.length-1)/2,pad.t,pw/(d.years.length-1),ph)}
  line(d.rpo,'--dawn');line(d.revenue,'--st-hot');line(d.capex,'--st-mature');
  d.years.forEach(function(yr,i){ctx.fillStyle=i>=2?col('--st-mature'):col('--faint');ctx.font='11px '+getComputedStyle(root).getPropertyValue('--mono');ctx.textAlign='center';ctx.fillText(yr,x(i),h-14)});
  ctx.font='10px '+getComputedStyle(root).getPropertyValue('--mono');ctx.textAlign='left';ctx.fillStyle=col('--dawn');ctx.fillText('— RPO',pad.l,pad.t-15);ctx.fillStyle=col('--st-hot');ctx.fillText('— 매출',pad.l+58,pad.t-15);ctx.fillStyle=col('--st-mature');ctx.fillText('— CAPEX',pad.l+112,pad.t-15)
 }
 function show(e){var r=canvas.getBoundingClientRect(),px=e.clientX-r.left;active=Math.max(0,Math.min(d.years.length-1,Math.round((px-52)/(r.width-70)*(d.years.length-1))));var i=active;tip.innerHTML='<b>'+d.years[i]+'</b><br>RPO · '+fmt(d.rpo[i])+'<br>Cloud 매출 · '+fmt(d.revenue[i])+'<br>CAPEX · '+fmt(d.capex[i])+'<br>RPO/매출 · '+(d.rpo[i]/d.revenue[i]).toFixed(1)+'배'+(i>=2?'<br><span style="color:var(--st-mature)">Base Case 전망</span>':'<br>실제');tip.style.display='block';tip.style.left=Math.min(r.width-170,Math.max(4,px+10))+'px';tip.style.top='8px';draw()}
 canvas.addEventListener('pointermove',show);canvas.addEventListener('pointerdown',show);canvas.addEventListener('pointerleave',function(e){if(e.pointerType!=='touch'){active=-1;tip.style.display='none';draw()}});var ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(draw):null;if(ro)ro.observe(box);else window.addEventListener('resize',draw);draw();
}
'''
pattern = r'function mountAnnualCloudChart\(root\)\{.*?\n\}\n(?=function mount\(\)\{)'
s2, n = re.subn(pattern, func, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit(f'annual chart function replace failed: {n}')
s2 = s2.replace('② 클라우드 RPO·매출·CAPEX 연도별 전망', '② 클라우드 RPO·매출·CAPEX 연도별 추이')
s2 = s2.replace('2026E 이후 전망치는 Base Case이며 실적과 구분해 점선·테두리로 표시', '2026E 이후 전망치는 Base Case이며 실적과 구분해 E 표기로 표시 · 꺾은선 그래프 · 단일 축(0~3,000B)')
s2 = s2.replace('2026E 이후 전망치는 Base Case이며 실적과 구분해 E 표기로 표시 · 꺾은선 그래프', '2026E 이후 전망치는 Base Case이며 실적과 구분해 E 표기로 표시 · 꺾은선 그래프 · 단일 축(0~3,000B)')
p.write_text(s2, encoding='utf-8')
