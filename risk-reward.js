/* 05 추정 리비전 트래커 · 손익비(R/R) 열
   손익비 = 목표가 상승여력(gamma.pct) ÷ 현재가→최근접 지지선 하락여지
     지지선 = {200일선, 52주 저점} 중 현재가 아래에서 가장 가까운 값(중 최근접)
     하락여지% = (현재가 − 지지선) / 현재가 × 100
   ≥2 양호 · 1~2 중립 · <1 불리. 지지선은 charts.json 실측 과거값(모델 아님) —
   미래 하방을 보장하지 않는다. 관측치 · 투자권유 아님. */
(function(){
  var PXID={MRVL:'mrvl','005930':'sec',MU:'mu',LITE:'lite',VRT:'vrt',BE:'be',AMD:'amd',RMBS:'rmbs',
            CEG:'ceg',QCOM:'qcom',APH:'aph',BESI:'besi','000660':'skhynix',TSLA:'tsla',PLTR:'pltr',ALAB:'alab',
            CBRS:'cbrs',SNDK:'sndk','009150':'sem','353200':'ddk','471990':'kodexeq','089030':'twng','0522':'asmpt',
            SMCI:'smci',COHR:'cohr','0173Y0':'optetf',VICR:'vicr',OKLO:'oklo',TER:'ter'};
  var S={gamma:null,charts:null};
  var q=function(sel,root){return (root||document).querySelector(sel);};
  var qa=function(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel));};
  function gammaRow(t){return (((S.gamma&&S.gamma.gamma)||S.gamma||{})[t])||null;}
  function tickerOf(txt){var a=String(txt||'').match(/\b(\d{6}|[A-Z]{1,6})\b/g);return a&&a.length?a[a.length-1]:null;}
  function series(t){var k=PXID[t];if(!k)return null;var s=S.charts&&S.charts.series&&S.charts.series[k];var c=s&&s.c;if(!Array.isArray(c))return null;c=c.filter(function(x){return typeof x==='number'&&x>0;});return c.length?c:null;}
  function rr(t){
    var G=gammaRow(t);if(!G)return {st:'nd',msg:'감마 없음'};
    var P=Number(G.price),up=Number(G.pct);
    if(!isFinite(P)||P<=0)return {st:'nd',msg:'가격 없음'};
    if(!isFinite(up))return {st:'nd',msg:'상방 없음'};
    if(up<=0)return {st:'spent',up:up};
    var c=series(t);if(!c)return {st:'nd',msg:'차트 없음'};
    var n=c.length;
    var loWin=c.slice(-Math.min(252,n)),lo=Math.min.apply(null,loWin);
    var maWin=c.slice(-Math.min(200,n)),ma=maWin.reduce(function(a,b){return a+b;},0)/maWin.length;
    var cands=[{v:ma,nm:(n>=200?'200일선':'추세평균')},{v:lo,nm:(n>=252?'52주 저점':'기간 저점')}]
      .filter(function(x){return isFinite(x.v)&&x.v<P;});
    if(!cands.length)return {st:'floor'};
    cands.sort(function(a,b){return b.v-a.v;});
    var an=cands[0],down=(P-an.v)/P*100;
    if(!(down>0))return {st:'floor'};
    if(down<2)return {st:'near',up:up,anchor:an.nm};  /* 지지선 근접(하방여지<2%): 분모=노이즈 → 배수 불안정 */
    return {st:'ok',ratio:up/down,up:up,down:down,anchor:an.nm};
  }
  function cell(t){
    var r=rr(t);
    if(r.st==='spent')return '<b style="color:var(--st-mature)">상방 소진</b><div class="pe-p">여력 '+r.up.toFixed(1)+'%</div>';
    if(r.st==='floor')return '<b style="color:var(--st-mature)">바닥권</b><div class="pe-p">지지선 하회</div>';
    if(r.st==='nd')return '<b style="color:var(--faint)">자료부족</b><div class="pe-p">'+r.msg+'</div>';
    if(r.st==='near')return '<b style="color:var(--st-mature)">지지선 근접</b><div class="pe-p" style="white-space:nowrap">▲'+r.up.toFixed(0)+'% · ▼&lt;2%</div><div class="pe-p" style="color:var(--faint)">'+r.anchor+'</div>';
    var col=r.ratio>=2?'var(--st-dawn)':(r.ratio>=1?'var(--st-accel)':'var(--st-hot)');
    var lab=r.ratio>=2?'양호':(r.ratio>=1?'중립':'불리');
    var title=('손익비 '+r.ratio.toFixed(2)+'x = 상방 '+r.up.toFixed(1)+'% ÷ 하방 '+r.down.toFixed(1)+'%\n'
      +'하방 기준 = '+r.anchor+'(현재가 아래 최근접 지지선)\n'
      +'상방=목표가 상승여력 · 하방=현재가→지지선 · 실측 과거값(모델 아님) · 미래 하방 보장 아님').replace(/"/g,'&quot;');
    var disp=r.ratio>9.9?'9.9x+':r.ratio.toFixed(1)+'x';
    return '<b style="font-size:16px;color:'+col+'" title="'+title+'">'+disp+'</b>'
      +'<div class="pe-p" style="white-space:nowrap"><span style="color:var(--st-dawn)">▲'+r.up.toFixed(0)+'%</span> / <span style="color:var(--st-hot)">▼'+r.down.toFixed(0)+'%</span></div>'
      +'<div class="pe-p" style="color:var(--faint)">'+lab+' · '+r.anchor+'</div>';
  }
  function render(){
    var rows=qa('tr[data-zb-score-value]');if(!rows.length)return false;
    var table=rows[0].closest('table');if(!table)return false;
    qa('[data-dual-rank]',table).forEach(function(e){e.remove();});
    var oldNote=q('[data-dual-rank-note]');if(oldNote)oldNote.remove();
    var head=q('thead tr',table)||q('tr',table);if(!head)return false;
    var zbIdx=qa('th',head).findIndex(function(x){return x.hasAttribute('data-zb-score');});if(zbIdx<0)return false;
    var thR=document.createElement('th');thR.className='c';thR.dataset.dualRank='1';
    thR.innerHTML='손익비<br><small style="font-weight:400;color:var(--faint)">상방÷하방 · 지지선</small>';
    head.insertBefore(thR,head.children[zbIdx+1]||null);
    rows.forEach(function(tr){
      var t=(tr.dataset.zbTicker||tickerOf((tr.children[0]||{}).textContent||'')||'').toUpperCase();
      var td=document.createElement('td');td.className='c';td.dataset.dualRank='1';td.style.minWidth='118px';
      td.innerHTML=cell(t);
      tr.insertBefore(td,tr.children[zbIdx+1]||null);
    });
    var note=document.createElement('div');note.dataset.dualRank='1';note.dataset.dualRankNote='1';
    note.style.cssText='margin:8px 0 10px;padding:7px 9px;border:1px solid var(--line);border-radius:5px;font-size:11px;color:var(--dim);line-height:1.55';
    note.innerHTML='<b>손익비(R/R)</b> = 목표가 상승여력 ÷ 현재가→<b>최근접 지지선</b> 하락여지. 지지선은 <b>200일선·52주 저점</b> 중 현재가 아래에서 가장 가까운 값을 쓴다(charts.json 실측). <b>≥2 양호(파랑) · 1~2 중립 · &lt;1 불리(빨강)</b>. 지지선은 과거 실측이라 미래 하방을 보장하지 않는다 — 관측치 · 투자권유 아님.';
    table.parentElement.insertBefore(note,table);
    return true;
  }
  function boot(){
    Promise.all([
      fetch('./gamma.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;}),
      fetch('./charts.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;})
    ]).then(function(a){S.gamma=a[0];S.charts=a[1];var tries=0;var t=setInterval(function(){tries++;if(render()||tries>40)clearInterval(t);},250);});
  }
  boot();
})();
