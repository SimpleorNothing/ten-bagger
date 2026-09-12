/* trade.js — 한국 반도체 수출 카드를 01 시장 모니터링의 통합 지표 그리드에 주입한다. */
(function () {
  'use strict';
  var MOUNT_ID = 'mkt_trade_semi';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pct(v, d) { return v == null ? '—' : (v > 0 ? '+' : '') + (d == null ? v : v.toFixed(d)) + '%'; }
  function cls(v) { return v == null ? '' : v > 0 ? 'up' : v < 0 ? 'dn' : ''; }
  function num(v) { return v == null ? '—' : v; }

  function spark(vals, up) {
    var pts = vals.filter(function (v) { return v != null; });
    if (pts.length < 2) return '';
    var w = 200, h = 54, pad = 4;
    var mn = Math.min.apply(null, pts), mx = Math.max.apply(null, pts), rng = (mx - mn) || 1;
    var stroke = up ? 'var(--st-hot)' : 'var(--st-accel)';
    var d = pts.map(function (v, i) {
      var x = pad + (w - 2 * pad) * (i / (pts.length - 1));
      var y = h - pad - (h - 2 * pad) * ((v - mn) / rng);
      return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ');
    var lx = w - pad;
    var ly = h - pad - (h - 2 * pad) * ((pts[pts.length - 1] - mn) / rng);
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="2.6" fill="' + stroke + '"/></svg>';
  }
  function lensRow(l1, l2) {
    return '<div class="mkt-lens"><div class="l1">' + l1 + '</div><div class="l2">' + l2 + '</div></div>';
  }

  function semiCard(s, prev, series) {
    var mom = (prev && prev.semi) ? (s.semi / prev.semi - 1) * 100 : null;
    var share = s.exp ? (s.semi / s.exp * 100) : null;
    var accel = (prev && prev.semiYoy != null && s.semiYoy != null) ? s.semiYoy >= prev.semiYoy : true;
    var judge = accel ? '<span class="ok">가속</span>' : '<span class="nt">둔화</span>';
    return '<div class="mkt-nm">반도체 수출</div>' +
      '<div class="mkt-val">' + num(s.semi) + ' <span style="font-size:12px;color:var(--faint)">억달러</span></div>' +
      '<div class="mkt-chg ' + cls(s.semiYoy) + '">' + pct(s.semiYoy, 1) +
      '<span style="font:600 12px var(--mono);margin-left:8px;color:var(--faint)">전월 ' +
      (mom == null ? '—' : '<span style="color:var(--' + (mom >= 0 ? 'st-hot' : 'st-accel') + ')">' + pct(mom, 1) + '</span>') + '</span></div>' +
      lensRow('<b>L3 메모리</b> 수요 선행 ' + judge,
        '반도체 ' + num(s.semi) + '억달러 · 전년비 ' + pct(s.semiYoy, 1) +
        (share != null ? ' · 수출 내 ' + share.toFixed(0) + '%' : '') + ' · MU·삼성·하이닉스 실적 선행') +
      '<div class="mkt-chart">' +
      spark(series.map(function (r) { return r.semi; }), s.semiYoy != null && s.semiYoy >= 0) +
      '</div>' +
      '<div class="mkt-span">' + esc(s.ym || '') + ' · MOTIE 수출입 동향</div>';
  }

  function render(td, host) {
    var ser = td && td.series && td.series.slice().sort(function (a, b) { return a.ym < b.ym ? -1 : 1; });
    if (!ser || !ser.length) {
      host.innerHTML = '<div class="mkt-ph">수집 대기 · 매월 수출입 동향 발표 후 갱신</div>';
      return;
    }
    var last = ser[ser.length - 1], prev = ser.length > 1 ? ser[ser.length - 2] : null;
    host.innerHTML = semiCard(last, prev, ser);
  }

  function mount() {
    if (document.getElementById(MOUNT_ID)) return true;
    var grid = document.getElementById('mktIndicators');
    if (!grid) return false;
    var card = document.createElement('div');
    card.className = 'mkt-card';
    card.id = MOUNT_ID;
    card.setAttribute('data-indicator-key', 'semi-export');
    card.innerHTML = '<div class="mkt-ph">반도체 수출 로딩…</div>';
    grid.appendChild(card);
    fetch('trade.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { render(j, card); })
      .catch(function () { render(null, card); });
    return true;
  }

  function mountGlobalSemi() {
    var id = 'mkt_global_semi_sales';
    if (document.getElementById(id)) return true;
    var grid = document.getElementById('mktIndicators');
    if (!grid) return false;
    var card = document.createElement('div');
    card.className = 'mkt-card'; card.id = id;
    card.setAttribute('data-indicator-key', 'global-semi-sales');
    card.innerHTML = '<div class="mkt-ph">글로벌 반도체 판매 로딩…</div>';
    grid.appendChild(card);
    fetch('semi_sales.json?t=' + Date.now(), { cache: 'no-store' }).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){
      if(!j || !j.latest || !j.series || !j.series.length){ card.innerHTML='<div class="mkt-ph">발표 대기 · SIA/WSTS 월간 판매</div>'; return; }
      var z=j.latest, vals=j.series.map(function(x){return x.sales;});
      card.innerHTML='<div class="mkt-nm">글로벌 반도체 판매</div><div class="mkt-val">$'+z.sales.toFixed(1)+'B</div>'+
        '<div class="mkt-chg up">+'+z.mom.toFixed(1)+'% MoM <span style="font:600 12px var(--mono);margin-left:8px;color:var(--faint)">YoY +'+z.yoy.toFixed(1)+'%</span></div>'+
        lensRow('<b>AI·인프라 수요</b> 확장 지속 <span class="ok">가속</span>','7월 $'+z.sales.toFixed(1)+'B · 6월 수정 $'+z.priorMonthSales.toFixed(1)+'B · 17개월 연속 MoM 증가 · WSTS 3개월 이동평균')+
        '<div class="mkt-chart">'+spark(vals,true)+'</div><div class="mkt-span">'+esc(z.ym)+' · SIA/WSTS · 등록 2026-09-04</div>';
    }).catch(function(){ card.innerHTML='<div class="mkt-ph">SIA/WSTS 데이터 로딩 실패</div>'; });
    return true;
  }


  function mountChinaTrade() {
    var id = 'mkt_china_trade';
    if (document.getElementById(id)) return true;
    var grid = document.getElementById('mktIndicators');
    if (!grid) return false;
    var card = document.createElement('div');
    card.className = 'mkt-card'; card.id = id;
    card.setAttribute('data-indicator-key', 'china-trade');
    card.innerHTML = '<div class="mkt-ph">중국 수출입 로딩…</div>';
    grid.appendChild(card);
    fetch('china_trade.json?t=' + Date.now(), { cache: 'no-store' }).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){
      if(!j || !j.latest || !j.series || !j.series.length){ card.innerHTML='<div class="mkt-ph">발표 대기 · 중국 해관총서 월간 수출입</div>'; return; }
      var z=j.latest, vals=j.series.map(function(x){return x.expYoy;});
      var expDir=z.expYoy>=z.prevExpYoy, impDir=z.impYoy>=z.prevImpYoy;
      card.innerHTML='<div class="mkt-nm">중국 수출입</div><div class="mkt-val">수출 +'+z.expYoy.toFixed(1)+'%</div>'+
        '<div class="mkt-chg '+(expDir?'up':'dn')+'">수입 +'+z.impYoy.toFixed(1)+'% YoY <span style="font:600 12px var(--mono);margin-left:8px;color:var(--faint)">흑자 $'+z.balance.toFixed(2)+'B</span></div>'+
        lensRow('<b>글로벌 상품수요</b> '+(expDir&&impDir?'<span class="ok">개선</span>':'<span class="nt">혼조</span>'),
          '수출 '+z.prevExpYoy.toFixed(1)+'%→'+z.expYoy.toFixed(1)+'% · 수입 '+z.prevImpYoy.toFixed(1)+'%→'+z.impYoy.toFixed(1)+'% · 무역흑자 $'+z.prevBalance.toFixed(2)+'B→$'+z.balance.toFixed(2)+'B')+
        '<div class="mkt-chart">'+spark(vals,expDir)+'</div><div class="mkt-span">'+esc(z.ym)+' · 중국 해관총서 · 등록 2026-09-08</div>';
    }).catch(function(){ card.innerHTML='<div class="mkt-ph">중국 해관총서 데이터 로딩 실패</div>'; });
    return true;
  }

  function mountSteo() {
    var id = 'mkt_eia_steo';
    if (document.getElementById(id)) return true;
    var grid = document.getElementById('mktIndicators');
    if (!grid) return false;
    var card = document.createElement('div');
    card.className = 'mkt-card'; card.id = id;
    card.setAttribute('data-indicator-key', 'eia-steo');
    card.innerHTML = '<div class="mkt-ph">EIA STEO 로딩…</div>';
    grid.appendChild(card);
    fetch('steo.json?t=' + Date.now(), { cache: 'no-store' }).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){
      if(!j || !j.latest || !j.series || !j.series.length){ card.innerHTML='<div class="mkt-ph">발표 대기 · EIA 월간 STEO</div>'; return; }
      var z=j.latest, vals=j.series.map(function(x){return x.brent2026;});
      var d=z.brent2026-z.prevBrent2026;
      card.innerHTML='<div class="mkt-nm">EIA 단기 에너지 전망(STEO)</div><div class="mkt-val">Brent $'+z.brent2026+'/b</div>'+
        '<div class="mkt-chg '+(d>=0?'up':'dn')+'">전월 전망 $'+z.prevBrent2026+'→$'+z.brent2026+' <span style="font:600 12px var(--mono);margin-left:8px;color:var(--faint)">2027 $'+z.brent2027+'</span></div>'+
        lensRow('<b>L8 전력·에너지</b> 데이터센터 수요 <span class="ok">확장</span>','2026 전력생산 '+z.electricityGeneration2026+'BkWh(+'+z.electricityGenerationGrowth2026.toFixed(1)+'%) · 전력판매 '+z.electricitySales2026+'BkWh · 2027 '+z.electricitySales2027+'BkWh')+
        '<div class="mkt-chart">'+spark(vals,d>=0)+'</div><div class="mkt-span">2026-09 · EIA STEO · 등록 2026-09-09</div>';
    }).catch(function(){ card.innerHTML='<div class="mkt-ph">EIA STEO 데이터 로딩 실패</div>'; });
    return true;
  }


  function mountCpi() {
    var id='mkt_us_cpi'; if(document.getElementById(id)) return true;
    var grid=document.getElementById('mktIndicators'); if(!grid) return false;
    var card=document.createElement('div'); card.className='mkt-card'; card.id=id; card.setAttribute('data-indicator-key','us-cpi'); card.innerHTML='<div class="mkt-ph">미국 CPI 로딩…</div>'; grid.appendChild(card);
    Promise.all([
      fetch('cpi_release.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}),
      fetch('cpi.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;})
    ]).then(function(a){
      var j=a[0], c=a[1]; if(!j||!j.latest||!c||!c.series||!c.series.us||!c.series.us.length){card.innerHTML='<div class="mkt-ph">발표 대기 · BLS CPI</div>';return;}
      var z=j.latest, us=c.series.us.slice().sort(function(x,y){return x[0]<y[0]?-1:1;}), vals=us.slice(-24).map(function(x){return x[1];});
      var mix=z.headlineMom>z.prevHeadlineMom && z.coreYoy<z.prevCoreYoy;
      card.innerHTML='<div class="mkt-nm">미국 소비자물가(CPI)</div><div class="mkt-val">'+pct(z.headlineMom,1)+' MoM</div>'+
        '<div class="mkt-chg '+(z.headlineMom>z.prevHeadlineMom?'up':'dn')+'">YoY '+pct(z.headlineYoy,1)+' <span style="font:600 12px var(--mono);margin-left:8px;color:var(--faint)">'+esc(z.prevMonthLabel)+' '+pct(z.prevHeadlineMom,1)+'→'+esc(z.monthLabel)+' '+pct(z.headlineMom,1)+'</span></div>'+
        lensRow('<b>소비자 물가</b> '+(mix?'<span class="nt">혼재</span>':(z.coreYoy<z.prevCoreYoy?'<span class="ok">둔화</span>':'<span class="nt">상방</span>')),
          '근원 '+pct(z.coreMom,1)+' MoM / '+pct(z.coreYoy,1)+' YoY · 근원 YoY '+pct(z.prevCoreYoy,1)+'→'+pct(z.coreYoy,1)+' · 헤드라인 MoM 재가속과 근원 둔화 병존')+
        '<div class="mkt-chart">'+spark(vals,z.headlineYoy>=z.prevHeadlineYoy)+'</div><div class="mkt-span">'+esc(z.ym)+' · BLS · 등록 '+esc(j.registeredAt)+'</div>';
    }).catch(function(){card.innerHTML='<div class="mkt-ph">BLS CPI 데이터 로딩 실패</div>';}); return true;
  }

  function mountPpi() {
    var id='mkt_us_ppi'; if(document.getElementById(id)) return true;
    var grid=document.getElementById('mktIndicators'); if(!grid) return false;
    var card=document.createElement('div'); card.className='mkt-card'; card.id=id; card.setAttribute('data-indicator-key','us-ppi'); card.innerHTML='<div class="mkt-ph">미국 PPI 로딩…</div>'; grid.appendChild(card);
    fetch('ppi.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){if(!j||!j.latest||!j.series||!j.series.length){card.innerHTML='<div class="mkt-ph">발표 대기 · BLS PPI</div>';return;} var z=j.latest,vals=j.series.map(function(x){return x.headlineMom;}); card.innerHTML='<div class="mkt-nm">미국 생산자물가(PPI)</div><div class="mkt-val">+'+z.headlineMom.toFixed(1)+'% MoM</div><div class="mkt-chg up">YoY +'+z.headlineYoy.toFixed(1)+'% <span style="font:600 12px var(--mono);margin-left:8px;color:var(--faint)">7월 +'+z.prevHeadlineMom.toFixed(1)+'%→8월 +'+z.headlineMom.toFixed(1)+'%</span></div>'+lensRow('<b>생산단 물가</b> <span class="nt">재가속</span>','식품·에너지·무역서비스 제외 +'+z.coreMom.toFixed(1)+'% MoM / +'+z.coreYoy.toFixed(1)+'% YoY · 7월 +'+z.prevCoreMom.toFixed(1)+'%')+'<div class="mkt-chart">'+spark(vals,true)+'</div><div class="mkt-span">'+esc(z.ym)+' · BLS · 등록 '+esc(j.registeredAt)+'</div>';}).catch(function(){card.innerHTML='<div class="mkt-ph">BLS PPI 데이터 로딩 실패</div>';}); return true;
  }
  function mountEiaWeekly() {
    var id='mkt_eia_weekly_crude'; if(document.getElementById(id)) return true;
    var grid=document.getElementById('mktIndicators'); if(!grid) return false;
    var card=document.createElement('div'); card.className='mkt-card'; card.id=id; card.setAttribute('data-indicator-key','eia-weekly-crude'); card.innerHTML='<div class="mkt-ph">EIA 원유재고 로딩…</div>'; grid.appendChild(card);
    fetch('eia_weekly.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){if(!j||!j.latest||!j.series||!j.series.length){card.innerHTML='<div class="mkt-ph">발표 대기 · EIA 주간 원유재고</div>';return;} var z=j.latest,vals=j.series.map(function(x){return x.commercialCrudeMb;}); card.innerHTML='<div class="mkt-nm">EIA 주간 원유재고</div><div class="mkt-val">'+z.commercialCrudeMb.toFixed(3)+'M bbl</div><div class="mkt-chg dn">WoW '+z.changeMb.toFixed(3)+'M <span style="font:600 12px var(--mono);margin-left:8px;color:var(--faint)">전주 '+z.previousMb.toFixed(3)+'M</span></div>'+lensRow('<b>에너지 재고</b> 소폭 감소','주간 변동 폭이 작아 유가 방향 신호로 과대해석하지 않음 · STEO 중기 전망과 분리')+'<div class="mkt-chart">'+spark(vals,false)+'</div><div class="mkt-span">'+esc(z.weekEnding)+' · EIA WPSR · 등록 '+esc(j.registeredAt)+'</div>';}).catch(function(){card.innerHTML='<div class="mkt-ph">EIA 주간 재고 데이터 로딩 실패</div>';}); return true;
  }


  function mountTreasuryBudget() {
    var id='mkt_us_treasury_budget'; if(document.getElementById(id)) return true;
    var grid=document.getElementById('mktIndicators'); if(!grid) return false;
    var card=document.createElement('div'); card.className='mkt-card'; card.id=id; card.setAttribute('data-indicator-key','us-treasury-budget'); card.innerHTML='<div class="mkt-ph">미국 재정수지 로딩…</div>'; grid.appendChild(card);
    fetch('treasury_budget.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){
      if(!j||!j.latest||!j.series||!j.series.length){card.innerHTML='<div class="mkt-ph">발표 대기 · U.S. Treasury MTS</div>';return;}
      var z=j.latest, vals=j.series.map(function(x){return x.deficitB;});
      var narrowed=z.deficitB<z.prevDeficitB;
      card.innerHTML='<div class="mkt-nm">미국 재정수지(MTS)</div><div class="mkt-val">적자 $'+z.deficitB.toFixed(1)+'B</div>'+
        '<div class="mkt-chg '+(narrowed?'dn':'up')+'">7월 $'+z.prevDeficitB.toFixed(1)+'B→8월 $'+z.deficitB.toFixed(1)+'B <span style="font:600 12px var(--mono);margin-left:8px;color:var(--faint)">YoY '+pct(z.yoyPct,1)+'</span></div>'+
        lensRow('<b>재정·국채 공급</b> 월간 적자 '+(narrowed?'<span class="ok">축소</span>':'<span class="nt">확대</span>'),
          '세입 $'+z.receiptsB.toFixed(1)+'B · 지출 $'+z.outlaysB.toFixed(1)+'B · FY26 누적 적자 $'+(z.ytdDeficitB/1000).toFixed(2)+'T(전년동기 '+pct(z.ytdYoyPct,1)+')')+
        '<div class="mkt-chart">'+spark(vals,!narrowed)+'</div><div class="mkt-span">2026-08 · U.S. Treasury MTS · 등록 2026-09-11</div>';
    }).catch(function(){card.innerHTML='<div class="mkt-ph">U.S. Treasury MTS 데이터 로딩 실패</div>';});
    return true;
  }

  function boot() {
    mount(); mountGlobalSemi(); mountChinaTrade(); mountSteo(); mountCpi(); mountPpi(); mountEiaWeekly(); mountTreasuryBudget();
    var n = 0, timer = setInterval(function () { var a=mount(), b=mountGlobalSemi(), c=mountChinaTrade(), d=mountSteo(), e=mountCpi(), f=mountPpi(), g=mountEiaWeekly(), h=mountTreasuryBudget(); if ((a && b && c && d && e && f && g && h) || ++n > 40) clearInterval(timer); }, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
