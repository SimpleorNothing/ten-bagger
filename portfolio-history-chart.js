(function(){
  'use strict';

  var SEED='/portfolio-history-seed.json',HISTORY='/api/portfolio/history',LIVE='/api/portfolio/live';
  var mounted=false,allSeries=null,activeRange='ALL';
  var COLORS={total:'phc-total',principal:'phc-principal',personal:'phc-personal',dc:'phc-dc',irp:'phc-irp'};
  var LABELS={total:'전체 평가금액',principal:'전체 투자원금',personal:'개인투자',dc:'DC연금',irp:'IRP'};
  var ORDER=['total','principal','personal','dc','irp'];
  var nf=new Intl.NumberFormat('ko-KR');

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});}
  function n(v){var x=Number(v);return Number.isFinite(x)?x:null;}
  function dateMs(s){var x=Date.parse(String(s)+'T00:00:00+09:00');return Number.isFinite(x)?x:null;}
  function kstDate(v){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));}catch(_){return '';}}
  function money(v){v=n(v);if(v==null)return '—';var a=Math.abs(v),s=v<0?'-':'';if(a>=100000000)return s+(a/100000000).toLocaleString('ko-KR',{maximumFractionDigits:2})+'억';if(a>=10000)return s+(a/10000).toLocaleString('ko-KR',{maximumFractionDigits:0})+'만';return nf.format(Math.round(v))+'원';}
  function shortDate(s){var p=String(s).split('-');return p.length===3?(Number(p[1])+'/'+Number(p[2])):s;}
  function mapFromPairs(pairs,source){var m=new Map();(Array.isArray(pairs)?pairs:[]).forEach(function(p){if(Array.isArray(p)&&p.length>=2&&dateMs(p[0])!=null&&n(p[1])!=null)m.set(String(p[0]),{date:String(p[0]),value:n(p[1]),source:source});});return m;}
  function sortedValues(m){return Array.from(m.values()).sort(function(a,b){return a.date.localeCompare(b.date);});}

  function accountValue(a){
    if(!a)return null;var vals=[];
    var d=a.domestic&&Array.isArray(a.domestic.Output_1)?a.domestic.Output_1:[];
    d.forEach(function(r){vals.push(n(r&&((r.eal_amt!=null)?r.eal_amt:r.krw_eal_amt)));});
    (Array.isArray(a.overseas)?a.overseas:[]).forEach(function(m){var rows=m&&m.data&&Array.isArray(m.data.Output_1)?m.data.Output_1:[];rows.forEach(function(r){vals.push(n(r&&((r.krw_eal_amt!=null)?r.krw_eal_amt:r.eal_amt)));});});
    if(!vals.length||vals.some(function(v){return v==null;}))return null;
    return vals.reduce(function(s,v){return s+v;},0);
  }
  function labelOf(a){return String(a&&a.label||'').trim();}
  function personalValue(snapshot){var accounts=snapshot&&Array.isArray(snapshot.accounts)?snapshot.accounts:[];for(var i=0;i<accounts.length;i++){var a=accounts[i],label=labelOf(a);if((label==='개인투자'||label==='종합매매')&&String(a.dataSource||'').toUpperCase()!=='MANUAL_CAPTURE')return accountValue(a);}return null;}
  function manualValue(snapshot,kind){var accounts=snapshot&&Array.isArray(snapshot.accounts)?snapshot.accounts:[];for(var i=0;i<accounts.length;i++){var a=accounts[i],label=labelOf(a),src=String(a.dataSource||'').toUpperCase();if(src!=='MANUAL_CAPTURE')continue;if(kind==='dc'&&(label==='DC'||label==='DC연금'||label==='퇴직연금'))return {value:accountValue(a),date:String(a.asOf||kstDate(snapshot.fetchedAt||Date.now()))};if(kind==='irp'&&/IRP/i.test(label))return {value:accountValue(a),date:String(a.asOf||kstDate(snapshot.fetchedAt||Date.now()))};}return null;}

  function weekKey(date){var d=new Date(date+'T00:00:00Z');var day=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-day+3);var first=new Date(Date.UTC(d.getUTCFullYear(),0,4));var week=1+Math.round(((d-first)/86400000-3+((first.getUTCDay()+6)%7))/7);return d.getUTCFullYear()+'-W'+String(week).padStart(2,'0');}
  function pickApiDates(rows){
    var now=Date.now(),cut=now-548*86400000,buckets=new Map();
    (Array.isArray(rows)?rows:[]).forEach(function(x){var date=String(x&&x.date||'');var ms=dateMs(date);if(ms==null||date<'2026-01-01')return;var key=ms>=cut?weekKey(date):date.slice(0,7);var prev=buckets.get(key);if(!prev||date>prev)buckets.set(key,date);});
    return Array.from(buckets.values()).sort();
  }
  async function fetchJson(url){var r=await fetch(url,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}
  async function fetchPersonalHistory(dates){
    var out=[];var queue=dates.slice();var workers=[];var count=Math.min(6,queue.length);
    async function worker(){while(queue.length){var date=queue.shift();try{var j=await fetchJson(HISTORY+'/'+encodeURIComponent(date));var v=personalValue(j&&j.snapshot);if(v!=null)out.push({date:date,value:v,source:'NHPLUG'});}catch(_){}}}
    for(var i=0;i<count;i++)workers.push(worker());await Promise.all(workers);return out;
  }

  function buildTotal(personal,dc,irp){
    var firstIrp=irp.size?Array.from(irp.keys()).sort()[0]:null;var dates=new Set();personal.forEach(function(_,d){dates.add(d);});dc.forEach(function(_,d){dates.add(d);});irp.forEach(function(_,d){dates.add(d);});var total=[];
    Array.from(dates).sort().forEach(function(d){var p=personal.get(d),c=dc.get(d),r=irp.get(d);if(!p||!c)return;if(firstIrp&&d>=firstIrp&&!r)return;var iv=r?r.value:0;total.push({date:d,value:p.value+c.value+iv,source:'합산'});});
    return total;
  }

  function rangeStart(maxDate,key){var max=dateMs(maxDate);if(max==null||key==='ALL')return -Infinity;var days=key==='6M'?183:key==='1Y'?366:key==='3Y'?1096:99999;return max-days*86400000;}
  function filteredSeries(data,key){var maxDate='';ORDER.forEach(function(k){(data[k]||[]).forEach(function(p){if(p.date>maxDate)maxDate=p.date;});});var start=rangeStart(maxDate,key),out={};ORDER.forEach(function(k){out[k]=(data[k]||[]).filter(function(p){return dateMs(p.date)>=start;});});return out;}

  function injectStyle(){if(document.getElementById('phcStyle'))return;var st=document.createElement('style');st.id='phcStyle';st.textContent='\
#portfolioHistoryChart{margin:0 0 14px;border:1px solid var(--line);background:var(--panel)}.phc-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:13px 14px 9px;flex-wrap:wrap}.phc-title{font-size:14px;font-weight:800;color:var(--txt)}.phc-sub{font-size:11px;line-height:1.5;color:var(--faint);margin-top:3px}.phc-ranges{display:flex;gap:5px;flex-wrap:wrap}.phc-ranges button{border:1px solid var(--line2);background:var(--panel2);color:var(--dim);font:700 10px var(--sans);padding:5px 8px;border-radius:4px;cursor:pointer}.phc-ranges button.on{background:var(--txt);color:var(--ink2)}.phc-legend{display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding:0 14px 8px;font-size:11px;color:var(--dim)}.phc-legend i{display:inline-block;width:16px;height:3px;border-radius:3px;margin-right:5px;vertical-align:middle}.phc-svgwrap{position:relative;padding:0 8px 10px}.phc-svg{width:100%;height:428px;display:block;overflow:visible}.phc-grid{stroke:var(--line);stroke-width:1}.phc-axis{fill:var(--faint);font:10px var(--sans)}.phc-path{fill:none;stroke-width:2.2;vector-effect:non-scaling-stroke}.phc-total{stroke:var(--txt)}.phc-principal{stroke:var(--faint);stroke-dasharray:7 4}.phc-personal{stroke:var(--dawn)}.phc-dc{stroke:var(--st-mature)}.phc-irp{stroke:var(--st-hot)}.phc-dot-total{background:var(--txt)}.phc-dot-principal{background:var(--faint)}.phc-dot-personal{background:var(--dawn)}.phc-dot-dc{background:var(--st-mature)}.phc-dot-irp{background:var(--st-hot)}.phc-cross{stroke:var(--faint);stroke-width:1;stroke-dasharray:3 3}.phc-hit{fill:transparent;cursor:crosshair}.phc-tip{position:absolute;display:none;z-index:3;min-width:180px;padding:9px 10px;border:1px solid var(--line2);background:var(--ink2);box-shadow:0 8px 25px rgba(0,0,0,.16);font-size:11px;line-height:1.6;pointer-events:none}.phc-tip b{display:block;color:var(--txt);font-size:12px;margin-bottom:2px}.phc-tip-row{display:flex;justify-content:space-between;gap:14px}.phc-loading,.phc-empty{padding:36px 14px;text-align:center;color:var(--faint);font-size:12px}@media(max-width:650px){.phc-svg{height:360px}.phc-sub{max-width:280px}.phc-legend{gap:8px}}';document.head.appendChild(st);}

  function pathFor(points,x,y){if(!points.length)return '';return points.map(function(p,i){return (i?'L':'M')+x(dateMs(p.date)).toFixed(1)+' '+y(p.value).toFixed(1);}).join(' ');}
  function render(data){
    var host=document.getElementById('phcBody');if(!host)return;var s=filteredSeries(data,activeRange),all=[];ORDER.forEach(function(k){all=all.concat(s[k]||[]);});if(!all.length){host.innerHTML='<div class="phc-empty">표시할 이력이 없습니다.</div>';return;}
    var minX=Math.min.apply(null,all.map(function(p){return dateMs(p.date);})),maxX=Math.max.apply(null,all.map(function(p){return dateMs(p.date);}));if(minX===maxX)maxX=minX+86400000;var maxY=Math.max.apply(null,all.map(function(p){return p.value;}));maxY=Math.max(maxY,1)*1.08;
    var W=960,H=428,L=66,R=18,T=12,B=34;var x=function(ms){return L+(ms-minX)/(maxX-minX)*(W-L-R);};var y=function(v){return T+(1-v/maxY)*(H-T-B);};
    var svg='<svg class="phc-svg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-label="계좌 평가금액 추이">';
    for(var i=0;i<=4;i++){var yy=T+(H-T-B)*i/4,val=maxY*(1-i/4);svg+='<line class="phc-grid" x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'"></line><text class="phc-axis" x="'+(L-8)+'" y="'+(yy+3)+'" text-anchor="end">'+esc((val/100000000).toFixed(val>=100000000?1:2))+'억</text>';}
    var ticks=5;for(i=0;i<ticks;i++){var ms=minX+(maxX-minX)*i/(ticks-1),ds=kstDate(ms);svg+='<text class="phc-axis" x="'+x(ms)+'" y="'+(H-10)+'" text-anchor="middle">'+esc(ds.slice(2,7).replace('-','.'))+'</text>';}
    ORDER.forEach(function(k){var pts=s[k]||[];if(pts.length)svg+='<path class="phc-path '+COLORS[k]+'" d="'+pathFor(pts,x,y)+'"></path>';});
    svg+='<line id="phcCross" class="phc-cross" x1="0" x2="0" y1="'+T+'" y2="'+(H-B)+'" style="display:none"></line><rect id="phcHit" class="phc-hit" x="'+L+'" y="'+T+'" width="'+(W-L-R)+'" height="'+(H-T-B)+'"></rect></svg><div class="phc-tip" id="phcTip"></div>';
    host.innerHTML=svg;
    var hit=document.getElementById('phcHit'),cross=document.getElementById('phcCross'),tip=document.getElementById('phcTip'),dates=Array.from(new Set(all.map(function(p){return p.date;}))).sort();
    function nearest(ms){var best=dates[0],dist=Math.abs(dateMs(best)-ms);for(var j=1;j<dates.length;j++){var d=Math.abs(dateMs(dates[j])-ms);if(d<dist){best=dates[j];dist=d;}}return best;}
    function valAt(k,d){var a=s[k]||[];for(var j=0;j<a.length;j++)if(a[j].date===d)return a[j];return null;}
    hit.addEventListener('mousemove',function(e){var r=hit.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),ms=minX+ratio*(maxX-minX),d=nearest(ms),xx=x(dateMs(d));cross.setAttribute('x1',xx);cross.setAttribute('x2',xx);cross.style.display='';var html='<b>'+esc(d)+'</b>';ORDER.forEach(function(k){var p=valAt(k,d);html+='<div class="phc-tip-row"><span>'+esc(LABELS[k])+'</span><strong>'+esc(p?money(p.value):'—')+'</strong></div>';});tip.innerHTML=html;tip.style.display='block';var wrap=hit.closest('.phc-svgwrap').getBoundingClientRect();tip.style.left=Math.min(wrap.width-200,Math.max(8,e.clientX-wrap.left+12))+'px';tip.style.top=Math.max(4,e.clientY-wrap.top-28)+'px';});
    hit.addEventListener('mouseleave',function(){cross.style.display='none';tip.style.display='none';});
  }

  async function load(){
    var body=document.getElementById('phcBody');if(body)body.innerHTML='<div class="phc-loading">과거 보유현황과 NHPLUG 이력을 불러오는 중…</div>';
    try{
      var seed=await fetchJson(SEED),principal=mapFromPairs(seed&&seed.series&&seed.series.principal,'첨부 원장'),personal=mapFromPairs(seed&&seed.series&&seed.series.personal,'첨부 원장'),dc=mapFromPairs(seed&&seed.series&&seed.series.dc,'첨부 원장'),irp=mapFromPairs(seed&&seed.series&&seed.series.irp,'첨부 원장');
      var history=null,live=null;try{history=await fetchJson(HISTORY);}catch(_){}try{live=await fetchJson(LIVE);}catch(_){}
      if(history&&Array.isArray(history.dates)){var dates=pickApiDates(history.dates);var apiPoints=await fetchPersonalHistory(dates);apiPoints.forEach(function(p){personal.set(p.date,p);});}
      if(live&&live.readOnly===true){var pv=personalValue(live),pd=kstDate(live.fetchedAt||Date.now());if(pv!=null&&pd)personal.set(pd,{date:pd,value:pv,source:'NHPLUG LIVE'});var dm=manualValue(live,'dc');if(dm&&dm.value!=null&&dm.date)dc.set(dm.date,{date:dm.date,value:dm.value,source:'수동 스냅샷'});var im=manualValue(live,'irp');if(im&&im.value!=null&&im.date)irp.set(im.date,{date:im.date,value:im.value,source:'수동 스냅샷'});}
      allSeries={principal:sortedValues(principal),personal:sortedValues(personal),dc:sortedValues(dc),irp:sortedValues(irp)};allSeries.total=buildTotal(personal,dc,irp);render(allSeries);
    }catch(e){if(body)body.innerHTML='<div class="phc-empty">보유현황 그래프를 불러오지 못했습니다. '+esc(e&&e.message||e)+'</div>';}
  }

  function mount(){
    if(mounted||document.getElementById('portfolioHistoryChart'))return true;var note=document.getElementById('acNote');if(!note||!note.parentNode)return false;mounted=true;injectStyle();var sec=document.createElement('section');sec.id='portfolioHistoryChart';sec.innerHTML='<div class="phc-hd"><div><div class="phc-title">보유자산 평가금액 추이</div><div class="phc-sub">실선은 평가금액, 회색 점선은 전체 투자원금 · 개인투자 2023~2025 과거원장 · 2026 NHPLUG 우선(API 저장 전 구간은 2026 원장 백필) · DC/IRP 첨부·수동 스냅샷</div></div><div class="phc-ranges"><button data-r="6M">6M</button><button data-r="1Y">1Y</button><button data-r="3Y">3Y</button><button class="on" data-r="ALL">ALL</button></div></div><div class="phc-legend"><span><i class="phc-dot-total"></i>전체 평가금액</span><span><i class="phc-dot-principal"></i>전체 투자원금</span><span><i class="phc-dot-personal"></i>개인투자</span><span><i class="phc-dot-dc"></i>DC연금</span><span><i class="phc-dot-irp"></i>IRP</span></div><div class="phc-svgwrap" id="phcBody"><div class="phc-loading">그래프 준비 중…</div></div>';
    note.parentNode.insertBefore(sec,note.nextSibling);Array.prototype.forEach.call(sec.querySelectorAll('[data-r]'),function(b){b.addEventListener('click',function(){activeRange=b.getAttribute('data-r')||'ALL';Array.prototype.forEach.call(sec.querySelectorAll('[data-r]'),function(x){x.classList.toggle('on',x===b);});if(allSeries)render(allSeries);});});load();return true;
  }
  function boot(){if(mount())return;var obs=new MutationObserver(function(){if(mount())obs.disconnect();});obs.observe(document.body,{childList:true,subtree:true});setTimeout(function(){obs.disconnect();mount();},10000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
