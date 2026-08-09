from pathlib import Path

p = Path('aisd.js')
s = p.read_text(encoding='utf-8')

if 'data-mini-chart="annual"' not in s:
    needle = '  </section>\n</div>\n\n<div class="ds-sec">판정'
    insert = '''  </section>
  <section class="ds-topchart wide">
    <h3>② 클라우드 RPO·매출·CAPEX 연도별 전망</h3>
    <div class="ds-l2">AWS·Microsoft Cloud·Google Cloud 기준 · 2024~2025 실제 · 2026E~2030E Base Case 전망</div>
    <div class="ds-mini-chart" data-mini-chart="annual"><canvas tabindex="0" role="img" aria-label="2024년부터 2030년까지 클라우드 RPO 매출 CAPEX 연도별 전망"></canvas><div class="ds-mini-tip" role="status" aria-live="polite"></div></div>
    <div class="ds-topfn">단위 $B · RPO=연말 잔액 · 매출=AWS+Microsoft Cloud+Google Cloud · CAPEX=Amazon+Microsoft+Alphabet 전사 기준 · 2026E 이후 전망치는 Base Case이며 실적과 구분해 점선·테두리로 표시</div>
  </section>
</div>

<div class="ds-sec">판정'''
    if needle not in s:
        raise SystemExit('HTML insertion point not found')
    s = s.replace(needle, insert, 1)

if 'function mountAnnualCloudChart(root)' not in s:
    needle = 'function mount(){\n'
    func = r'''function mountAnnualCloudChart(root){
 var box=root.querySelector('[data-mini-chart="annual"]'),canvas=box&&box.querySelector('canvas'),tip=box&&box.querySelector('.ds-mini-tip');if(!canvas)return;
 var d={years:['2024','2025','2026E','2027E','2028E','2029E','2030E'],rpo:[568,1112,1900,2300,2600,2800,2800],revenue:[303,377,465,570,670,765,850],capex:[211,341,585,700,750,700,620]},ctx=canvas.getContext('2d'),active=-1;
 function col(name){return getComputedStyle(root).getPropertyValue(name).trim()||'#496176'}
 function fmt(v){return Math.round(v)+'B'}
 function draw(){var r=box.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(290,Math.round(r.width)),h=Math.max(240,Math.round(r.height));canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  var pad={l:48,r:48,t:28,b:40},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b,leftMax=3000,rightMax=900,x=function(i){return pad.l+pw*(i+.5)/d.years.length},yL=function(v){return pad.t+ph*(1-v/leftMax)},yR=function(v){return pad.t+ph*(1-v/rightMax)};
  ctx.font='11px '+getComputedStyle(root).getPropertyValue('--mono');ctx.textBaseline='middle';ctx.lineWidth=1;ctx.strokeStyle=col('--line');ctx.fillStyle=col('--faint');
  [0,500,1000,1500,2000,2500,3000].forEach(function(v){var yy=yL(v);ctx.beginPath();ctx.moveTo(pad.l,yy+.5);ctx.lineTo(w-pad.r,yy+.5);ctx.stroke();ctx.textAlign='right';ctx.fillText(fmt(v),pad.l-7,yy)});
  [0,300,600,900].forEach(function(v){ctx.fillStyle=col('--dim');ctx.textAlign='left';ctx.fillText(fmt(v),w-pad.r+7,yR(v))});
  var bw=Math.max(10,Math.min(28,pw/d.years.length*.22));
  d.years.forEach(function(yr,i){var est=i>=2,xx=x(i);if(active===i){ctx.fillStyle='rgba(73,97,118,.07)';ctx.fillRect(xx-pw/d.years.length/2,pad.t,pw/d.years.length,ph)}
   var specs=[{v:d.rpo[i],x:xx-bw-3,y:yL(d.rpo[i]),c:'--dawn'},{v:d.revenue[i],x:xx,y:yR(d.revenue[i]),c:'--st-hot'},{v:d.capex[i],x:xx+bw+3,y:yR(d.capex[i]),c:'--st-mature'}];
   specs.forEach(function(o,j){var base=j===0?yL(0):yR(0);ctx.fillStyle=est?col('--panel2'):col(o.c);ctx.strokeStyle=col(o.c);ctx.lineWidth=1.4;ctx.fillRect(o.x-bw/2,o.y,bw,base-o.y);if(est){ctx.setLineDash([4,3]);ctx.strokeRect(o.x-bw/2+.7,o.y+.7,bw-1.4,base-o.y-1.4);ctx.setLineDash([])}ctx.fillStyle=col(o.c);ctx.font='700 10px '+getComputedStyle(root).getPropertyValue('--mono');ctx.textAlign='center';ctx.fillText(Math.round(o.v),o.x,Math.max(12,o.y-10))});
   ctx.fillStyle=est?col('--st-mature'):col('--faint');ctx.font='11px '+getComputedStyle(root).getPropertyValue('--mono');ctx.textAlign='center';ctx.fillText(yr,xx,h-14)
  });
  ctx.font='10px '+getComputedStyle(root).getPropertyValue('--mono');ctx.textAlign='left';ctx.fillStyle=col('--dawn');ctx.fillText('■ RPO',pad.l,pad.t-14);ctx.fillStyle=col('--st-hot');ctx.fillText('■ 매출',pad.l+58,pad.t-14);ctx.fillStyle=col('--st-mature');ctx.fillText('■ CAPEX',pad.l+112,pad.t-14)
 }
 function show(e){var r=canvas.getBoundingClientRect(),px=e.clientX-r.left;active=Math.max(0,Math.min(d.years.length-1,Math.round((px-48)/(r.width-96)*d.years.length-.5)));var i=active;tip.innerHTML='<b>'+d.years[i]+'</b><br>RPO · '+fmt(d.rpo[i])+'<br>Cloud 매출 · '+fmt(d.revenue[i])+'<br>CAPEX · '+fmt(d.capex[i])+'<br>RPO/매출 · '+(d.rpo[i]/d.revenue[i]).toFixed(1)+'배'+(i>=2?'<br><span style="color:var(--st-mature)">Base Case 전망</span>':'<br>실제');tip.style.display='block';tip.style.left=Math.min(r.width-170,Math.max(4,px+10))+'px';tip.style.top='8px';draw()}
 canvas.addEventListener('pointermove',show);canvas.addEventListener('pointerdown',show);canvas.addEventListener('pointerleave',function(e){if(e.pointerType!=='touch'){active=-1;tip.style.display='none';draw()}});var ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(draw):null;if(ro)ro.observe(box);else window.addEventListener('resize',draw);draw();
}
'''
    if needle not in s:
        raise SystemExit('mount insertion point not found')
    s = s.replace(needle, func + needle, 1)

if 'mountAnnualCloudChart(wrap);' not in s:
    needle = 'mountQuarterlyCloudChart(wrap);'
    if needle not in s:
        raise SystemExit('mount call point not found')
    s = s.replace(needle, needle + '\n mountAnnualCloudChart(wrap);', 1)

p.write_text(s, encoding='utf-8')
