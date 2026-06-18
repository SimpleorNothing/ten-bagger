/* Strait of Hormuz daily transit calls (IMF PortWatch).
   Source: /api/hormuz (live) with ./hormuz.json fallback.
   Self-injects a panel under the WTI chart on the 06 US10Y tab and renders #hmzChart.
   Global IIFE, self-wired. Korean text is \uXXXX-escaped so this file is pure ASCII. */
(function(){
  "use strict";
  var $=function(id){return document.getElementById(id);};
  var num=function(x,d){d=(d==null?2:d);return (x==null||isNaN(x))?'\u2013':Number(x).toFixed(d);};
  var pts=null, tfBound=false, range=365, chart=null;
  var HCOL='#1c7ed6', HMA='#e8590c', HTICK='#5F5E5A', HGRID='rgba(0,0,0,0.08)';
  function buildPanel(){
    if($('hmzChart'))return true;
    var w=$('wtiWrap'); var anchor=w?w.closest('.panel'):null; if(!anchor||!anchor.parentNode)return false;
    var p=document.createElement('div'); p.className='panel';
    p.innerHTML='<div class="panel-h"><h3>\ud638\ub974\ubb34\uc988 \ud574\ud611 \xb7 \uc77c\ubcc4 \ud1b5\uacfc \ucc99\uc218 (IMF PortWatch)</h3><span class="stamp" id="hmzStamp">\ub9c8\uc6b0\uc2a4 \ud720=\uae30\uac04 \ud655\ub300/\ucd95\uc18c \xb7 \ud638\ubc84 \uc0c1\uc138</span></div>'
      +'<div id="hmzWrap" style="position:relative;width:100%;height:320px"><canvas id="hmzChart" role="img" aria-label="\ud638\ub974\ubb34\uc988 \ud574\ud611 AIS \uc77c\ubcc4 \ud1b5\uacfc \ucc99\uc218\uc640 7\uc77c \uc774\ub3d9\ud3c9\uade0 (IMF PortWatch)"></canvas></div>'
      +'<div class="u10-tf" id="hmzTf"><button data-d="90">3M</button><button data-d="365" class="on">1Y</button><button data-d="1095">3Y</button><button data-d="1825">5Y</button></div>'
      +'<div class="readout">\ucd9c\ucc98: <a href="https://portwatch.imf.org/pages/chokepoint6" target="_blank" rel="noopener">IMF PortWatch</a>(Daily_Chokepoints_Data \xb7 chokepoint6) \u2014 <b>\uc8fc1\ud68c \uac31\uc2e0</b>(\ud654 09:00 ET). n_total=AIS \uc77c\ubcc4 \ud1b5\uacfc \ucc99\uc218 \u2014 \uc2a4\ud478\ud551\xb7\ub2e4\ud06c\uc120\ubc15\uc73c\ub85c <b>\uc2e4\uc81c\uac12 \uacfc\uc18c</b> \uac00\ub2a5. \ud3c9\uc18c(\uc704\uae30 \uc804)\u2248<b>94\ucc99/\uc77c</b> \ub300\ube44\ub85c \uc77d\ub294\ub2e4. \u201926.2.28 \uac1c\uc804\xb7\ud638\ub974\ubb34\uc988 \ubd09\uc1c4 \ud6c4 3~5\uc6d4 \ud3c9\uade0\u2248<b>6\ucc99</b>\xb76/14 0\ucc99. <b>WTI\uc758 \uc120\ud589\xb7\ub3d9\ud589 \uc9c0\uc815\ud559 \uac8c\uc774\uc9c0</b>(narrative\u2260numbers \u2014 \uc11c\uc0ac\ub97c \uc218\uce58\ub85c).</div>';
    anchor.parentNode.insertBefore(p, anchor.nextSibling);
    return true;
  }
  function ma7(a){var out=new Array(a.length).fill(null);
    for(var i=0;i<a.length;i++){var s=0,c=0;for(var k=Math.max(0,i-6);k<=i;k++){var v=a[k][1];if(v!=null){s+=v;c++;}}if(c)out[i]=s/c;}
    return out;}
  function fitY(){
    if(!chart)return; var xs=chart.scales.x;
    var lo=Math.max(0,Math.floor(xs.min)), hi=Math.min(pts.length-1,Math.ceil(xs.max));
    var mx=-Infinity; for(var i=lo;i<=hi;i++){var v=pts[i][1]; if(v!=null&&v>mx)mx=v;}
    if(mx===-Infinity)return; var pad=Math.max(4,mx*0.12);
    chart.options.scales.y.min=0; chart.options.scales.y.max=Math.ceil(mx+pad); chart.update('none');}
  function setRange(days){
    range=days; var last=pts.length-1, min=Math.max(0,last-(days<=1?1:days));
    chart.options.scales.x.min=min; chart.options.scales.x.max=last; chart.update('none');
    var tf=$('hmzTf'); if(tf)Array.prototype.forEach.call(tf.querySelectorAll('button'),function(b){b.classList.toggle('on',+b.dataset.d===days);});
    fitY();}
  function build(){
    var cv=$('hmzChart'); if(!cv)return; if(chart){chart.destroy();chart=null;}
    if(window.ChartZoom&&Chart.registry&&!Chart.registry.plugins.get('zoom')){try{Chart.register(window.ChartZoom);}catch(e){}}
    var n=pts.length, dRaw=pts.map(function(p,i){return {x:i,y:p[1]};});
    var dMa=ma7(pts).map(function(v,i){return {x:i,y:v};});
    var lastV=null,i; for(i=n-1;i>=0;i--){if(pts[i][1]!=null){lastV=pts[i][1];break;}}
    chart=new Chart(cv,{type:'line',
      data:{datasets:[
        {label:'\uc77c\ubcc4 \ud1b5\uacfc \ucc99\uc218',data:dRaw,borderColor:HCOL,backgroundColor:HCOL,borderWidth:1,tension:0,pointRadius:0,pointHoverRadius:3,pointBackgroundColor:HCOL,fill:false,order:2},
        {label:'7\uc77c \uc774\ub3d9\ud3c9\uade0',data:dMa,borderColor:HMA,backgroundColor:HMA,borderWidth:1.8,tension:0.25,pointRadius:0,pointHoverRadius:0,fill:false,spanGaps:true,order:1}
      ]},
      plugins:[{id:'hmzp',afterDraw:function(c){if(!c.chartArea||lastV==null)return;var ctx=c.ctx,y=c.scales.y.getPixelForValue(lastV);
        ctx.save();ctx.fillStyle=HCOL;ctx.font='700 12px Pretendard,system-ui,sans-serif';ctx.textBaseline='middle';ctx.fillText(num(lastV,0)+'\ucc99',c.chartArea.right-2,y);ctx.restore();}}],
      options:{responsive:true,maintainAspectRatio:false,animation:false,layout:{padding:{right:8,top:8}},
        interaction:{mode:'index',intersect:false},
        scales:{x:{type:'linear',min:0,max:n-1,ticks:{color:HTICK,font:{size:11},maxTicksLimit:8,callback:function(v){var p=pts[Math.round(v)];return p?p[0]:'';}},grid:{color:HGRID}},
          y:{min:0,ticks:{color:HTICK,font:{size:11}},grid:{color:HGRID},title:{display:true,text:'\ucc99/\uc77c',color:HTICK,font:{size:11}}}},
        plugins:{legend:{display:true,position:'top',align:'end',labels:{boxWidth:10,boxHeight:10,font:{size:11},color:HTICK}},
          tooltip:{enabled:true,backgroundColor:'rgba(255,255,255,0.97)',titleColor:'#2C2C2A',bodyColor:'#444441',borderColor:HGRID,borderWidth:1,padding:9,
            callbacks:{title:function(it){var p=pts[it[0].dataIndex];return p?p[0]:'';},label:function(c){return '  '+c.dataset.label+': '+(c.raw.y==null?'\u2013':num(c.raw.y,c.datasetIndex===1?1:0))+'\ucc99';}}},
          zoom:{limits:{x:{min:0,max:n-1}},pan:{enabled:true,mode:'x',onPanComplete:fitY},zoom:{wheel:{enabled:true},pinch:{enabled:true},mode:'x',onZoomComplete:fitY}}}}});
    setRange(range);}
  function loadAndRender(){
    if(!buildPanel())return;
    if(typeof Chart==='undefined'){return setTimeout(loadAndRender,80);}
    if(pts){return paint();}
    fetch('/api/hormuz',{credentials:'same-origin'})
      .then(function(r){return r.ok?r.json():Promise.reject(0);})
      .then(function(j){if(j&&Array.isArray(j.points)&&j.points.length){pts=j.points;return;}throw 0;})
      .catch(function(){return fetch('./hormuz.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){if(j&&Array.isArray(j.points))pts=j.points;});})
      .then(paint).catch(paint);
    function paint(){ if(!pts||!pts.length)return; build();
      if(!tfBound){tfBound=true;var tf=$('hmzTf'); if(tf)tf.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;setRange(+b.dataset.d);});}}
  }
  function wire(){
    var tab=document.querySelector('.tab[data-v="us10y"]');
    if(tab)tab.addEventListener('click',function(){setTimeout(loadAndRender,60);});
    var sec=document.getElementById('v-us10y');
    if(sec&&sec.classList.contains('on'))setTimeout(loadAndRender,60);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire); else wire();
  window.renderHormuz=loadAndRender;
})();
