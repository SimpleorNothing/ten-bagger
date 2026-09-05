/* 02 기업분석 — iframe 없이 Alpha Map 본문에 기업 전략 보드를 직접 렌더링한다. */
(function(){
  'use strict';
  var COMPANIES=[
    {id:'marvell',label:'Marvell Technology · MRVL',data:'/marvell/data.json'},
    {id:'lumentum',label:'Lumentum · LITE',data:'/lumentum/data.json'},
    {id:'micron',label:'Micron Technology · MU',data:'/micron/data.json'},
    {id:'vertiv',label:'Vertiv · VRT',data:'/vertiv/data.json'},
    {id:'nvidia',label:'NVIDIA · NVDA',data:'/nvidia/data.json'},
    {id:'broadcom',label:'Broadcom · AVGO',data:'/broadcom/data.json'},
    {id:'credo',label:'Credo Technology · CRDO',data:'/credo/data.json'}
  ];
  var CACHE={};

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function num(v){return v==null?'없음':Number(v).toLocaleString('en-US',{maximumFractionDigits:1});}
  function pct(v){return v==null?'없음':(v>0?'+':'')+num(v)+'%';}
  function qMoney(v){if(v==null)return '미공시';var n=Number(v);if(!isFinite(n))return '미공시';return (n<0?'-':'')+'$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:3});}
  function qAxisMoney(v){var n=Number(v);if(!isFinite(n)||Math.abs(n)<0.000001)return '$0';return (n<0?'-':'')+'$'+Math.abs(n).toLocaleString('en-US',{maximumFractionDigits:2})+'B';}
  function qNiceStep(raw){var n=Math.max(0.1,Number(raw)||0.1);var power=Math.pow(10,Math.floor(Math.log(n)/Math.LN10));var normalized=n/power;var multiple=normalized<=1?1:normalized<=2?2:normalized<=2.5?2.5:normalized<=5?5:10;return multiple*power;}
  function marginClass(v){return v==null?'':Number(v)<0?' ca-neg':' ca-pos';}
  function kindLabel(k){return k==='actual'?'실적':k==='management'?'경영진 전망':k==='guidance'?'가이던스':k==='strategic'?'전략':' ';}

  function installStyle(){
    if(document.getElementById('company-analysis-style'))return;
    var st=document.createElement('style');
    st.id='company-analysis-style';
    st.textContent=''
      +'#v-company{min-width:0}'
      +'#v-company .ca-switch{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 18px;padding:9px 10px;background:var(--panel);border:1px solid var(--line);border-radius:9px}'
      +'#v-company .ca-switch-label{font-size:12px;font-weight:700;color:var(--faint);margin-right:3px}'
      +'#v-company .company-switch{font-weight:700}'
      +'#v-company .company-switch.on{color:var(--onacc)!important;background:var(--dawn)!important;border-color:var(--dawn)!important}'
      +'#v-company .ca-app{min-width:0}'
      +'#v-company .ca-card,#v-company .ca-axis,#v-company .ca-visibility,#v-company .ca-risk,#v-company .ca-src,#v-company .ca-fin{background:var(--panel);border:1px solid var(--line);border-radius:3px}'
      +'#v-company .ca-frame{padding:22px;display:grid;grid-template-columns:minmax(0,1.6fr) minmax(240px,.8fr);gap:22px;margin-bottom:12px}'
      +'#v-company .ca-section-label{font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--faint);font-weight:700}'
      +'#v-company .ca-company-title{font-size:20px;margin:4px 0 6px}'
      +'#v-company .ca-company-title span{font-size:13px;color:var(--faint)}'
      +'#v-company .ca-statement{font-size:23px;line-height:1.3;font-weight:800;letter-spacing:-.02em;margin:4px 0 10px}'
      +'#v-company .ca-redef{font-size:14px;color:var(--dim);max-width:860px}'
      +'#v-company .ca-frame ul{margin:14px 0 0;padding-left:20px}'
      +'#v-company .ca-frame li{margin:5px 0}'
      +'#v-company .ca-frame-side{border-left:1px solid var(--line);padding-left:20px;display:flex;flex-direction:column;justify-content:space-between;gap:16px}'
      +'#v-company .ca-big{font-size:20px;font-weight:800;margin-top:4px}'
      +'#v-company .ca-note{color:var(--dim);font-size:13px}'
      +'#v-company .ca-quarterly{min-width:0}'
      +'#v-company .ca-quarterly-head{display:flex;align-items:end;justify-content:space-between;gap:10px;margin:2px 0 7px}'
      +'#v-company .ca-quarterly-control{display:inline-flex;align-items:center;gap:6px;color:var(--st-accel);font:inherit;font-size:12px;font-weight:700;white-space:nowrap;cursor:pointer;border:0;background:transparent;padding:4px;border-radius:3px}'
      +'#v-company .ca-quarterly-control:hover,#v-company .ca-quarterly-control:focus-visible{background:rgba(42,111,151,.10);outline:2px solid transparent}'
      +'#v-company .ca-q-calendar{position:relative;display:inline-block;width:12px;height:12px;border:1.5px solid var(--st-accel);border-radius:2px;box-sizing:border-box}'
      +'#v-company .ca-q-calendar:before{content:"";position:absolute;left:1px;right:1px;top:3px;border-top:1px solid var(--st-accel)}'
      +'#v-company .ca-q-calendar:after{content:"";position:absolute;left:2px;top:-3px;width:1px;height:4px;background:var(--st-accel);box-shadow:5px 0 0 var(--st-accel)}'
      +'#v-company .ca-q-chevron{width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid var(--st-accel);margin-left:2px}'
      +'#v-company .ca-q-legend{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px;color:var(--faint);font-size:12px}'
      +'#v-company .ca-q-legend-item{display:inline-flex;align-items:center;gap:3px;white-space:nowrap}'
      +'#v-company .ca-q-swatch{width:8px;height:8px;display:inline-block;border-radius:2px}'
      +'#v-company .ca-q-swatch-rev{background:var(--st-accel)}'
      +'#v-company .ca-q-swatch-op{background:var(--st-dawn)}'
      +'#v-company .ca-q-swatch-est{border:1px dashed var(--st-mature);background:rgba(154,123,47,.28)}'
      +'#v-company .ca-q-unit{margin-left:auto;color:var(--faint);font-variant-numeric:tabular-nums;white-space:nowrap}'
      +'#v-company .ca-qchart{min-width:0;margin-top:9px}'
      +'#v-company .ca-q-plot{position:relative;height:142px;padding-right:43px;box-sizing:border-box}'
      +'#v-company .ca-q-grid{position:absolute;left:0;right:43px;top:0;bottom:0;display:block;pointer-events:none}'
      +'#v-company .ca-q-gridline{position:absolute;left:0;right:0;height:0;border-top:1px solid var(--line);box-sizing:border-box}'
      +'#v-company .ca-q-yaxis{position:absolute;right:0;top:0;bottom:0;width:38px;display:block;color:var(--faint);font-size:12px;line-height:1;font-variant-numeric:tabular-nums;text-align:left}'
      +'#v-company .ca-q-yaxis span{position:absolute;left:0;transform:translateY(-50%);white-space:nowrap}'
      +'#v-company .ca-q-columns{position:absolute;left:0;right:43px;top:0;bottom:0;display:grid;align-items:stretch;gap:4px}'
      +'#v-company .ca-q-group{height:100%;min-width:0;display:block;position:relative}'
      +'#v-company .ca-q-bar{position:absolute;display:block;width:44%;max-width:18px;min-width:3px;border-radius:3px 3px 0 0;background:var(--st-accel);box-sizing:border-box}'
      +'#v-company .ca-q-bar-rev{left:3%}'
      +'#v-company .ca-q-bar-op{right:3%;background:var(--st-dawn)}'
      +'#v-company .ca-q-bar.ca-q-negative{border-radius:0 0 3px 3px}'
      +'#v-company .ca-q-bar-empty{height:2px!important;background:var(--line2,var(--line));border:1px dashed var(--faint)}'
      +'#v-company .ca-q-zero{position:absolute;left:0;right:0;height:0;border-top:1px solid var(--line2,var(--line));z-index:1}'
      +'#v-company .ca-q-est .ca-q-bar{opacity:.68;outline:1px dashed var(--st-mature);outline-offset:-1px}'
      +'#v-company .ca-q-xlabels{display:grid;align-items:start;gap:4px;margin:6px 43px 0 0}'
      +'#v-company .ca-q-xlabel{min-width:0;color:var(--faint);font-size:12px;line-height:1.15;text-align:center;white-space:nowrap;font-variant-numeric:tabular-nums}'
      +'#v-company .ca-q-est .ca-q-xlabel,#v-company .ca-q-xlabel.ca-q-est{color:var(--st-mature);font-weight:700}'
      +'#v-company .ca-q-missing-note{margin-top:4px;color:var(--faint);font-size:12px;line-height:1.35}'
      +'#v-company .ca-q-notes{margin-top:7px;color:var(--faint);font-size:12px;line-height:1.45}'
      +'#v-company .ca-q-notes div+div{margin-top:3px}'
      +'#v-company .ca-pill{display:inline-flex;align-items:center;border:1px solid rgba(42,111,151,.35);border-radius:20px;padding:3px 8px;color:var(--st-accel);background:rgba(42,111,151,.06);font-size:12px;font-weight:700;white-space:nowrap}'
      +'#v-company .ca-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:10px 0 30px}'
      +'#v-company .ca-kpi{padding:14px 15px;background:var(--panel);border:1px solid var(--line);border-radius:3px;min-width:0}'
      +'#v-company .ca-kpi-label{font-size:12px;color:var(--faint);font-weight:700}'
      +'#v-company .ca-kpi-value{font-size:20px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums;margin:3px 0}'
      +'#v-company .ca-kpi-note{font-size:13px;color:var(--dim)}'
      +'#v-company .ca-block{margin-top:30px}'
      +'#v-company .ca-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:11px}'
      +'#v-company .ca-head h2{font-size:20px;margin:0}'
      +'#v-company .ca-head p{margin:0;color:var(--dim);font-size:13px}'
      +'#v-company .ca-axes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}'
      +'#v-company .ca-axis{padding:18px;min-width:0}'
      +'#v-company .ca-axis-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}'
      +'#v-company .ca-axis-code{font-size:12px;color:var(--faint);font-weight:800;letter-spacing:.06em}'
      +'#v-company .ca-axis h3{font-size:17px;line-height:1.3;margin:3px 0 4px}'
      +'#v-company .ca-org{font-size:12px;color:var(--faint)}'
      +'#v-company .ca-summary{font-size:14px;margin:13px 0;color:var(--txt)}'
      +'#v-company .ca-fact,#v-company .ca-interp{padding:12px 13px;border-left:2px solid var(--line2,var(--line));background:var(--ink);margin:10px 0}'
      +'#v-company .ca-fact b,#v-company .ca-interp b{display:block;font-size:12px;letter-spacing:.05em;margin-bottom:5px}'
      +'#v-company .ca-fact ul{margin:0;padding-left:19px}'
      +'#v-company .ca-fact li{margin:4px 0}'
      +'#v-company .ca-interp{border-left-color:var(--dawn);color:var(--dim)}'
      +'#v-company .ca-kpi-list{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;margin-top:12px}'
      +'#v-company .ca-kpi-line{font-size:13px;border-top:1px solid var(--line);padding-top:7px;overflow-wrap:anywhere}'
      +'#v-company .ca-axis-foot{margin-top:14px;display:flex;gap:8px;align-items:center;justify-content:space-between}'
      +'#v-company .ca-axis-foot button{font:inherit;font-size:13px;font-weight:700;padding:7px 10px;border-radius:3px;border:1px solid var(--line2,var(--line));background:var(--panel2,var(--panel));color:var(--txt);cursor:pointer}'
      +'#v-company .ca-timeline-link{font:inherit;font-size:13px;font-weight:700;padding:7px 10px;border-radius:3px;border:1px solid var(--line2,var(--line));background:var(--panel2,var(--panel));color:var(--txt);text-decoration:none}'
      +'#v-company .ca-risk-inline{font-size:11px;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:65%}'
      +'#v-company .ca-timeline{display:none;margin-top:10px;padding:13px;background:var(--panel);border:1px solid var(--line);border-radius:3px}'
      +'#v-company .ca-timeline.on{display:block}'
      +'#v-company .ca-event{display:grid;grid-template-columns:92px 52px 1fr;gap:10px;padding:9px 0;border-bottom:1px solid var(--line)}'
      +'#v-company .ca-event:last-child{border-bottom:0}'
      +'#v-company .ca-event-date,#v-company .ca-event-type{font-size:12px;color:var(--faint)}'
      +'#v-company .ca-event-type{font-weight:800;color:var(--dawn)}'
      +'#v-company .ca-event-title{font-weight:700}'
      +'#v-company .ca-event-detail{color:var(--dim);margin-top:2px;font-size:13px}'
      +'#v-company .ca-roadmap-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--line);background:var(--panel)}'
      +'#v-company .ca-roadmap{width:100%;min-width:940px;border-collapse:collapse;table-layout:fixed}'
      +'#v-company .ca-roadmap th,#v-company .ca-roadmap td{border-right:1px solid var(--line);border-bottom:1px solid var(--line);vertical-align:top}'
      +'#v-company .ca-roadmap th:last-child,#v-company .ca-roadmap td:last-child{border-right:0}'
      +'#v-company .ca-roadmap thead th{padding:11px 9px;background:var(--ink);font-size:14px;text-align:center}'
      +'#v-company .ca-roadmap thead th:first-child{width:190px;text-align:left;position:sticky;left:0;z-index:3}'
      +'#v-company .ca-roadmap-company{padding:11px 10px;background:var(--panel);position:sticky;left:0;z-index:2}'
      +'#v-company .ca-roadmap-company b{display:block;font-size:13px;line-height:1.25}'
      +'#v-company .ca-roadmap-company span{display:block;margin-top:3px;color:var(--faint);font-size:11px}'
      +'#v-company .ca-roadmap-sector td{padding:9px 10px;background:var(--ink);font-size:12px;font-weight:800;color:var(--txt);letter-spacing:.03em}'
      +'#v-company .ca-roadmap-cell{padding:7px;min-height:54px}'
      +'#v-company .ca-deal{padding:8px;border-left:3px solid var(--dawn);background:color-mix(in srgb,var(--dawn) 8%,var(--panel));font-size:12px;line-height:1.4}'
      +'#v-company .ca-deal+.ca-deal{margin-top:6px}'
      +'#v-company .ca-deal[data-status="인수"]{border-left-color:var(--st-hot)}'
      +'#v-company .ca-deal[data-status="라이선스·인력"]{border-left-color:var(--st-accel)}'
      +'#v-company .ca-deal[data-status="의향·협상"]{border:1px dashed var(--st-hot);background:transparent}'
      +'#v-company .ca-deal-top{display:flex;justify-content:space-between;gap:6px;color:var(--faint);font-size:10px}'
      +'#v-company .ca-deal-type{font-weight:800;color:var(--dawn)}'
      +'#v-company .ca-deal b{display:block;margin:3px 0 2px;font-size:12px;color:var(--txt)}'
      +'#v-company .ca-deal-detail{color:var(--dim)}'
      +'#v-company .ca-roadmap-legend{display:flex;flex-wrap:wrap;gap:8px 14px;margin-bottom:9px;color:var(--faint);font-size:11px}'
      +'#v-company .ca-roadmap-note{margin-top:9px;color:var(--faint);font-size:11px;line-height:1.45}'
      +'#v-company .ca-fin{overflow:hidden}'
      +'#v-company .ca-table-wrap{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}'
      +'#v-company .ca-table{width:100%;min-width:760px;border-collapse:collapse;table-layout:auto}'
      +'#v-company .ca-table th,#v-company .ca-table td{padding:10px 11px;border-bottom:1px solid var(--line);text-align:center;font-variant-numeric:tabular-nums;vertical-align:middle}'
      +'#v-company .ca-table th{font-size:12px;color:var(--faint);font-weight:800;background:var(--ink)}'
      +'#v-company .ca-table th:first-child,#v-company .ca-table td:first-child{text-align:left;white-space:nowrap;position:sticky;left:0;background:var(--panel);z-index:1}'
      +'#v-company .ca-table th:first-child{background:var(--ink);z-index:2}'
      +'#v-company .ca-kind{display:block;margin-top:3px;font-size:10px;font-weight:700;color:var(--faint)}'
      +'#v-company .ca-pos{color:var(--st-hot);font-weight:700}'
      +'#v-company .ca-neg{color:var(--st-accel);font-weight:700}'
      +'#v-company .ca-fin-notes{padding:10px 12px;color:var(--dim);font-size:12px;border-top:1px solid var(--line)}'
      +'#v-company .ca-fin-notes div+div{margin-top:4px}'
      +'#v-company .ca-visibility{padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:22px}'
      +'#v-company .ca-visibility h3{font-size:17px;margin:4px 0 8px}'
      +'#v-company .ca-visibility ul{margin:0;padding-left:20px}'
      +'#v-company .ca-visibility li{margin:5px 0}'
      +'#v-company .ca-next{background:var(--ink);border:1px solid var(--line);border-radius:3px;padding:15px}'
      +'#v-company .ca-next b{display:block;margin-bottom:6px}'
      +'#v-company .ca-risks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}'
      +'#v-company .ca-risk{padding:14px;min-width:0}'
      +'#v-company .ca-risk h3{font-size:15px;margin:0 0 5px}'
      +'#v-company .ca-risk p{font-size:13px;color:var(--dim);margin:0}'
      +'#v-company .ca-sources{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}'
      +'#v-company .ca-src{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;text-decoration:none;min-width:0}'
      +'#v-company .ca-src-name{font-weight:700;overflow-wrap:anywhere}'
      +'#v-company .ca-src-type{font-size:11px;color:var(--faint);white-space:nowrap}'
      +'#v-company .ca-loading,#v-company .ca-error{padding:18px;background:var(--panel);border:1px solid var(--line);border-radius:3px}'
      +'#v-company .ca-error{color:var(--st-hot)}'
      +'#v-company .ca-footnote{margin-top:18px;padding-top:12px;border-top:1px solid var(--line);color:var(--faint);font-size:11px}'
      +'@media(max-width:900px){#v-company .ca-frame{grid-template-columns:1fr}#v-company .ca-frame-side{border-left:0;border-top:1px solid var(--line);padding-left:0;padding-top:15px}#v-company .ca-kpis{grid-template-columns:repeat(2,1fr)}#v-company .ca-axes{grid-template-columns:1fr}#v-company .ca-risks{grid-template-columns:repeat(2,1fr)}#v-company .ca-visibility{grid-template-columns:1fr}#v-company .ca-sources{grid-template-columns:1fr}}'
      +'@media(max-width:620px){#v-company .ca-switch{position:sticky;top:0;z-index:8;border-radius:0;margin-left:-14px;margin-right:-14px;padding-left:14px;padding-right:14px}#v-company .ca-statement{font-size:20px}#v-company .ca-kpis{grid-template-columns:1fr 1fr;gap:7px}#v-company .ca-kpi{padding:11px}#v-company .ca-kpi-value{font-size:17px}#v-company .ca-kpi-note{font-size:11px}#v-company .ca-kpi-list{grid-template-columns:1fr}#v-company .ca-risks{grid-template-columns:1fr}#v-company .ca-event{grid-template-columns:76px 42px 1fr;gap:6px}}'
      +'@media(max-width:620px){#v-company .ca-q-plot{height:132px}#v-company .ca-q-yaxis{width:35px}#v-company .ca-q-grid,#v-company .ca-q-columns{right:40px}#v-company .ca-q-xlabels{margin-right:40px}#v-company .ca-q-bar{max-width:15px}#v-company .ca-q-columns,#v-company .ca-q-xlabels{gap:2px}}';
    document.head.appendChild(st);
  }

  function yearlyTimelineHtml(a){
    var years=a.timelineYears||[];
    var groups=a.timelineGroups||[];
    var legend='<div class="ca-roadmap-legend"><span>전략투자·공동금융</span><span>인수</span><span>라이선스·핵심인력</span><span>의향·협상(점선)</span></div>';
    var head='<thead><tr><th>업체 · 분야</th>'+years.map(function(y){return '<th>\''+esc(String(y).slice(-2))+'</th>';}).join('')+'</tr></thead>';
    var body=groups.map(function(g){
      var sector='<tr class="ca-roadmap-sector"><td colspan="'+(years.length+1)+'">'+esc(g.sector)+'</td></tr>';
      var rows=(g.companies||[]).map(function(c){
        var cells=years.map(function(y){
          var deals=(c.deals||[]).filter(function(d){return String(d.date||'').slice(0,4)===String(y);});
          return '<td class="ca-roadmap-cell">'+deals.map(function(d){
            return '<div class="ca-deal" data-status="'+esc(d.status||'')+'"><div class="ca-deal-top"><span class="ca-deal-type">'+esc(d.status||'')+'</span><span>'+esc(String(d.date||'').slice(5))+'</span></div><b>'+esc(d.amount||'금액 미공시')+'</b><div class="ca-deal-detail">'+esc(d.detail||'')+'</div></div>';
          }).join('')+'</td>';
        }).join('');
        return '<tr><td class="ca-roadmap-company"><b>'+esc(c.company)+'</b><span>'+esc(c.role||'')+'</span></td>'+cells+'</tr>';
      }).join('');
      return sector+rows;
    }).join('');
    return legend+'<div class="ca-roadmap-wrap"><table class="ca-roadmap">'+head+'<tbody>'+body+'</tbody></table></div><div class="ca-roadmap-note">'+esc(a.timelineNote||'')+'</div>';
  }

  function axisHtml(a,i){
    var events=(a.events||[]).map(function(e){return '<div class="ca-event"><div class="ca-event-date">'+esc(e.date)+'</div><div class="ca-event-type">'+esc(e.type)+'</div><div><div class="ca-event-title">'+esc(e.title)+'</div><div class="ca-event-detail">'+esc(e.detail)+'</div></div></div>';}).join('');
    var standalone=a.timelineView==='yearly-table'&&a.timelineHref;
    var timeline=a.timelineView==='yearly-table'?yearlyTimelineHtml(a):events;
    var timelineLabel=a.timelineView==='yearly-table'?'연도별 타임라인 보기':'타임라인 보기';
    var timelineFoot=standalone
      ?'<a class="ca-timeline-link" href="'+esc(a.timelineHref)+'" target="_blank" rel="noopener">'+esc(timelineLabel)+' ↗</a>'
      :'<button type="button" data-ca-timeline="ca-tl-'+i+'" data-ca-label="'+esc(timelineLabel)+'" aria-expanded="false">'+esc(timelineLabel)+'</button>';
    return '<article class="ca-axis">'
      +'<div class="ca-axis-top"><div><div class="ca-axis-code">'+esc(a.code)+' · '+esc(a.basis)+'</div><h3>'+esc(a.title)+'</h3><div class="ca-org">'+esc(a.org)+'</div></div><span class="ca-pill">'+esc(a.status)+'</span></div>'
      +'<div class="ca-summary">'+esc(a.summary)+'</div>'
      +'<div class="ca-fact"><b>확인된 사실</b><ul>'+(a.facts||[]).map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></div>'
      +'<div class="ca-interp"><b>투자 해석</b>'+esc(a.interpretation)+'</div>'
      +'<div class="ca-kpi-list">'+(a.kpis||[]).map(function(k){return '<div class="ca-kpi-line">'+esc(k)+'</div>';}).join('')+'</div>'
      +'<div class="ca-axis-foot">'+timelineFoot+'<div class="ca-risk-inline" title="'+esc((a.risks||[]).join(' · '))+'">주요 위험: '+esc((a.risks||[]).join(' · '))+'</div></div>'
      +(standalone?'':'<div class="ca-timeline" id="ca-tl-'+i+'">'+timeline+'</div>')+'</article>';
  }

  function financialHtml(rows){
    rows=rows||[];
    var heads=rows.map(function(r){return '<th>'+esc(r.fy)+'<span class="ca-kind">'+esc(kindLabel(r.kind))+'</span></th>';}).join('');
    function cells(fn,cls){return rows.map(function(r){var v=fn(r);var c=cls?cls(r):'';return '<td class="'+c+'">'+v+'</td>';}).join('');}
    var notes=rows.filter(function(r){return r.note;}).map(function(r){return '<div><b>'+esc(r.fy)+'</b> '+esc(r.note)+'</div>';}).join('');
    return '<div class="ca-fin"><div class="ca-table-wrap"><table class="ca-table"><thead><tr><th>지표</th>'+heads+'</tr></thead><tbody>'
      +'<tr><td>매출 ($B)</td>'+cells(function(r){return num(r.revenue);})+'</tr>'
      +'<tr><td>YoY</td>'+cells(function(r){return pct(r.growth);},function(r){return marginClass(r.growth).trim();})+'</tr>'
      +'<tr><td>영업이익률</td>'+cells(function(r){return pct(r.opMargin);},function(r){return marginClass(r.opMargin).trim();})+'</tr>'
      +'<tr><td>순이익률</td>'+cells(function(r){return pct(r.netMargin);},function(r){return marginClass(r.netMargin).trim();})+'</tr>'
      +'<tr><td>수주잔고</td>'+cells(function(r){return esc(r.backlog||'미공시');})+'</tr>'
      +'</tbody></table></div>'+(notes?'<div class="ca-fin-notes">'+notes+'</div>':'')+'</div>';
  }

  function qBar(v,span,baseline,cls,label){
    var n=v==null?null:Number(v);var title=label+' '+qMoney(v);
    if(n==null||!isFinite(n))return '<span class="ca-q-bar '+cls+' ca-q-bar-empty" style="height:2px;bottom:'+baseline.toFixed(1)+'%" title="'+esc(title)+'" aria-label="'+esc(title)+'"></span>';
    var height=Math.max(1.5,Math.min(100,Math.abs(n)/span*100));
    var bottom=n<0?Math.max(0,baseline-height):baseline;
    return '<span class="ca-q-bar '+cls+(n<0?' ca-q-negative':'')+'" style="height:'+height.toFixed(1)+'%;bottom:'+bottom.toFixed(1)+'%" title="'+esc(title)+'" aria-label="'+esc(title)+'"></span>';
  }

  function qShortLabel(r){
    var cy=String(r.cy||'').replace(/^CY/,'').replace(/\s*대응.*$/,'');
    return cy||String(r.period||'').replace(/^FY/,'');
  }

  function annualRows(financials){
    return (financials||[]).map(function(r){
      var revenue=Number(r.revenue),margin=Number(r.opMargin);
      return {
        period:r.fy,
        cy:r.fy,
        revenue:isFinite(revenue)?revenue:null,
        // 공개된 연간 매출과 GAAP 영업이익률만으로 계산한다. 전망의 미공개 마진은 비워 둔다.
        operatingIncome:isFinite(revenue)&&isFinite(margin)?revenue*margin/100:null,
        kind:r.kind==='actual'?'actual':'derived'
      };
    });
  }

  function quarterlyHtml(q,financials,companyName,period){
    var annual=period==='annual';
    var rows=annual?annualRows(financials):(q&&q.rows||[]);if(!rows.length)return '';
    var maxAbs=rows.reduce(function(m,r){
      var rv=Number(r.revenue),op=Number(r.operatingIncome);
      if(isFinite(rv)&&Math.abs(rv)>m)m=Math.abs(rv);
      if(isFinite(op)&&Math.abs(op)>m)m=Math.abs(op);
      return m;
    },0)||1;
    var hasNegative=rows.some(function(r){var rv=Number(r.revenue),op=Number(r.operatingIncome);return (isFinite(rv)&&rv<0)||(isFinite(op)&&op<0);});
    var domainRange=hasNegative?maxAbs*2:maxAbs;
    var step=qNiceStep(domainRange/5);
    var scale=Math.max(step,Math.ceil(maxAbs/step)*step);
    var domainMin=hasNegative?-scale:0;
    var span=scale-domainMin;
    var baseline=(-domainMin)/span*100;
    var grid=[],axis=[];
    for(var value=scale,guard=0;value>=domainMin-step*0.01&&guard<51;value-=step,guard++){
      var tick=Math.abs(value)<step*0.0001?0:Number(value.toFixed(6));
      var top=(scale-tick)/span*100;
      grid.push('<span class="ca-q-gridline" style="top:'+top.toFixed(2)+'%"></span>');
      axis.push('<span style="top:'+top.toFixed(2)+'%">'+qAxisMoney(tick)+'</span>');
    }
    var zero='<span class="ca-q-zero" style="bottom:'+baseline.toFixed(2)+'%"></span>';
    var body=rows.map(function(r){
      var est=r.kind!=='actual';
      var label=r.period+' '+r.cy+' · 매출 '+qMoney(r.revenue)+' · 영업이익 '+qMoney(r.operatingIncome);
      return '<div class="ca-q-group '+(est?'ca-q-est':'')+'" role="listitem" aria-label="'+esc(label)+'">'+qBar(r.revenue,span,baseline,'ca-q-bar-rev','매출')+qBar(r.operatingIncome,span,baseline,'ca-q-bar-op','영업이익')+'</div>';
    }).join('');
    var labels=rows.map(function(r){var est=r.kind!=='actual';return '<div class="ca-q-xlabel '+(est?'ca-q-est':'')+'" title="'+esc(r.period+' · '+r.cy)+'">'+esc(qShortLabel(r)+(est?'E':''))+'</div>';}).join('');
    var notes=annual
      ?'<div>연간 영업이익 = 해당 연도 매출 × 공개된 GAAP 영업이익률. 전망 연도의 영업이익률이 미공개이면 막대를 표시하지 않습니다.</div>'
      :(q.notes||[]).map(function(n){return '<div>'+esc(n)+'</div>';}).join('');
    var periodLabel=annual?'연간별':'분기별';
    var chartLabel=(companyName||'기업')+' '+(annual?'연간':'분기')+' GAAP 매출과 영업이익 막대그래프';
    return '<div class="ca-quarterly"><div class="ca-quarterly-head"><div class="ca-section-label">'+(annual?'연간 실적·전망':'분기 실적·전망')+'</div><button type="button" class="ca-quarterly-control" data-ca-period-toggle aria-label="'+periodLabel+' 보기" aria-pressed="'+(annual?'true':'false')+'"><span class="ca-q-calendar" aria-hidden="true"></span><span>'+periodLabel+'</span><span class="ca-q-chevron" aria-hidden="true"></span></button></div><div class="ca-q-legend" aria-label="그래프 범례"><span class="ca-q-legend-item"><i class="ca-q-swatch ca-q-swatch-rev" aria-hidden="true"></i>매출</span><span class="ca-q-legend-item"><i class="ca-q-swatch ca-q-swatch-op" aria-hidden="true"></i>영업이익</span><span class="ca-q-legend-item"><i class="ca-q-swatch ca-q-swatch-est" aria-hidden="true"></i>전망</span><span class="ca-q-unit">GAAP · $B</span></div><div class="ca-qchart" role="list" aria-label="'+esc(chartLabel)+'"><div class="ca-q-plot"><div class="ca-q-grid" aria-hidden="true">'+grid.join('')+zero+'</div><div class="ca-q-yaxis" aria-hidden="true">'+axis.join('')+'</div><div class="ca-q-columns" style="grid-template-columns:repeat('+rows.length+',minmax(0,1fr))">'+body+'</div></div><div class="ca-q-xlabels" style="grid-template-columns:repeat('+rows.length+',minmax(0,1fr))">'+labels+'</div></div>'+(notes?'<div class="ca-q-notes">'+notes+'</div>':'')+'</div>';
  }

  function renderCompany(d){
    var app=document.getElementById('companyApp');if(!app)return;
    var frame=d.company&&d.company.frame||{};
    var kpis=(d.headlineKpis||[]).map(function(k){return '<div class="ca-kpi"><div class="ca-kpi-label">'+esc(k.label)+'</div><div class="ca-kpi-value">'+esc(k.value)+'</div><div class="ca-kpi-note">'+esc(k.note)+'</div></div>';}).join('');
    var risks=(d.risks||[]).map(function(r){return '<div class="ca-risk"><h3>'+esc(r.title)+'</h3><p>'+esc(r.detail)+'</p></div>';}).join('');
    var sources=(d.sources||[]).map(function(s){return '<a class="ca-src" href="'+esc(s.url)+'" target="_blank" rel="noopener"><span class="ca-src-name">'+esc(s.label)+'</span><span class="ca-src-type">'+esc(s.type)+'</span></a>';}).join('');
    var vis=d.visibility||{};
    var period='quarterly';try{period=sessionStorage.getItem('alpha_company_period')==='annual'?'annual':'quarterly';}catch(e){}
    var quarterly=quarterlyHtml(d.quarterly,d.financials,d.company&&d.company.name,period);
    app.innerHTML=''
      +'<section class="ca-card ca-frame"><div><div class="ca-section-label">전략 프레임</div><h2 class="ca-company-title">'+esc(d.company.name)+' <span>'+esc(d.company.ticker)+'</span></h2><div class="ca-statement">'+esc(frame.statement)+'</div><div class="ca-redef">'+esc(frame.redefinition)+'</div><ul>'+(frame.evidence||[]).map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></div>'
      +'<div class="ca-frame-side"><div><div class="ca-section-label">현재 상태</div><div class="ca-big">'+esc(frame.status)+'</div></div>'+quarterly+'<div class="ca-note">확인된 사실과 경영진 전망, 투자 해석을 구분해 표시합니다.</div></div></section>'
      +'<div class="ca-kpis">'+kpis+'</div>'
      +'<section class="ca-block"><div class="ca-head"><h2>'+esc((d.axes||[]).length)+'개 전략축 실행 현황</h2><p>카드를 열면 축별 사건 타임라인을 확인할 수 있습니다.</p></div><div class="ca-axes">'+(d.axes||[]).map(axisHtml).join('')+'</div></section>'
      +'<section class="ca-block"><div class="ca-head"><h2>FY2023~FY2028 실적·전망</h2><p>실적 = GAAP · 전망 = 명시된 경영진/자료 기준</p></div>'+financialHtml(d.financials)+'</section>'
      +'<section class="ca-block"><div class="ca-head"><h2>수주·매출 가시성</h2><p>공개되지 않은 총 backlog는 임의 추정하지 않습니다.</p></div><div class="ca-visibility"><div><div class="ca-section-label">현재 확인</div><h3>'+esc(vis.headline)+'</h3><ul>'+(vis.facts||[]).map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></div><div class="ca-next"><b>다음 확인 포인트</b>'+esc(vis.next)+'</div></div></section>'
      +'<section class="ca-block"><div class="ca-head"><h2>핵심 위험</h2><p>실적·전략 논리를 무효화할 수 있는 요인</p></div><div class="ca-risks">'+risks+'</div></section>'
      +'<section class="ca-block"><div class="ca-head"><h2>원문 출처</h2><p>공시·회사 발표·신뢰 가능한 원문 보도</p></div><div class="ca-sources">'+sources+'</div></section>'
      +'<div class="ca-footnote">데이터 기준일 '+esc(d.asOf||'—')+' · 회사가 공개하지 않은 수치는 추정값으로 채우지 않습니다.</div>';
    var stamp=document.querySelector('#v-company .updstamp');if(stamp&&d.asOf)stamp.textContent='update : '+String(d.asOf).replace(/-/g,'.');
  }

  function setButtons(sec,id){
    Array.prototype.forEach.call(sec.querySelectorAll('[data-company]'),function(b){var on=b.getAttribute('data-company')===id;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false');});
  }
  function selectedCompany(sec){
    var on=sec.querySelector('[data-company].on');
    return on?on.getAttribute('data-company'):'marvell';
  }
  function getCompany(id){for(var i=0;i<COMPANIES.length;i++)if(COMPANIES[i].id===id)return COMPANIES[i];return null;}
  function selectCompany(sec,id){
    var c=getCompany(id);if(!c)return;
    setButtons(sec,id);
    var app=document.getElementById('companyApp');if(app)app.innerHTML='<div class="ca-loading">'+esc(c.label)+' 데이터를 불러오는 중입니다.</div>';
    try{sessionStorage.setItem('alpha_company',id);}catch(e){}
    if(CACHE[id]){renderCompany(CACHE[id]);return;}
    fetch(c.data+'?t='+Date.now(),{cache:'no-store',credentials:'same-origin'})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
      .then(function(d){CACHE[id]=d;renderCompany(d);})
      .catch(function(e){if(app)app.innerHTML='<div class="ca-error">기업분석 데이터를 불러오지 못했습니다. '+esc(e&&e.message||e)+'</div>';});
  }

  function mount(){
    var nav=document.getElementById('nav');
    var main=document.querySelector('main.wrap');
    if(!nav||!main)return;
    installStyle();

    var btn=nav.querySelector('.tab[data-v="company"]');
    if(!btn){
      btn=document.createElement('button');btn.className='tab';btn.setAttribute('data-v','company');btn.innerHTML='<span class="n"></span>기업분석';
      var market=nav.querySelector('.tab[data-v="market"]');if(market)nav.insertBefore(btn,market.nextSibling);else nav.insertBefore(btn,nav.firstChild);
    }

    var sec=document.getElementById('v-company');
    if(!sec){
      sec=document.createElement('section');sec.className='view';sec.id='v-company';
      var switchButtons=COMPANIES.map(function(c,i){return '<button type="button" class="iobtn company-switch'+(i===0?' on':'')+'" data-company="'+c.id+'" aria-pressed="'+(i===0?'true':'false')+'">'+esc(c.label)+'</button>';}).join('');
      sec.innerHTML='<div class="vhead" style="position:relative"><div class="vkick">Company Analysis · 기업별 전략·실적 추적</div><h1 class="vtitle">기업의 <em>전략과 실행</em>을 한 화면에서</h1><p class="vsub">사업 전략, 제품·고객·투자, 실적 궤적과 수주 가시성을 기업별로 추적합니다. 확인된 사실과 투자 해석을 분리해 표시합니다.</p><span class="updstamp abs">update : 2026.08.17</span></div>'
        +'<div id="companySwitch" class="ca-switch" aria-label="기업 선택"><span class="ca-switch-label">기업</span>'+switchButtons+'</div><div id="companyApp" class="ca-app"><div class="ca-loading">기업분석 데이터를 불러오는 중입니다.</div></div>';
      var insight=document.getElementById('v-insight');if(insight)main.insertBefore(sec,insight);else main.appendChild(sec);
    } else {
      var oldFrame=sec.querySelector('#companyFrame');if(oldFrame)oldFrame.remove();
      if(!sec.querySelector('#companyApp')){var app=document.createElement('div');app.id='companyApp';app.className='ca-app';sec.appendChild(app);}
    }

    function renumber(){Array.prototype.forEach.call(nav.querySelectorAll('.tab'),function(t,i){var n=t.querySelector('.n');if(n)n.textContent=(i+1<10?'0':'')+(i+1);});}
    function activate(){
      Array.prototype.forEach.call(nav.querySelectorAll('.tab'),function(t){t.classList.remove('on');});
      Array.prototype.forEach.call(main.querySelectorAll('.view'),function(v){v.classList.remove('on');});
      btn.classList.add('on');sec.classList.add('on');
      var ab=document.getElementById('asofBox');if(ab)ab.style.display='none';
      try{window.scrollTo({top:0,behavior:'auto'});}catch(e){window.scrollTo(0,0);}
    }

    /* index.html의 정적 기본값(01 시장 모니터링)이 먼저 페인트되는 경로를 없앤다.
       기존 탭 초기화 타이머보다 뒤에 실행해, 첫 표시 화면을 02 기업분석으로 확정한다. */
    function activateDefault(){
      activate();
      document.body.classList.remove('company-default-pending');
      document.body.classList.add('company-default-ready');
    }

    btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();activate();});
    nav.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('.tab');if(!t||t===btn)return;sec.classList.remove('on');var ab=document.getElementById('asofBox');if(ab)ab.style.display='';});
    sec.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('[data-company]');if(b){selectCompany(sec,b.getAttribute('data-company'));return;}
      var period=e.target.closest&&e.target.closest('[data-ca-period-toggle]');if(period){try{sessionStorage.setItem('alpha_company_period',period.getAttribute('aria-pressed')==='true'?'quarterly':'annual');}catch(err){}var id=selectedCompany(sec);if(CACHE[id])renderCompany(CACHE[id]);return;}
      var tlb=e.target.closest&&e.target.closest('[data-ca-timeline]');if(tlb){var id=tlb.getAttribute('data-ca-timeline'),tl=document.getElementById(id);if(!tl)return;var on=tl.classList.toggle('on');tlb.setAttribute('aria-expanded',on?'true':'false');tlb.textContent=on?'타임라인 닫기':(tlb.getAttribute('data-ca-label')||'타임라인 보기');}
    });
    renumber();
    var initial='marvell';try{var saved=sessionStorage.getItem('alpha_company');if(getCompany(saved))initial=saved;}catch(e){}
    selectCompany(sec,initial);
    setTimeout(activateDefault,0);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
