import json, pathlib, re
P=pathlib.Path
stamp='2026-09-11T07:30:38+09:00'; date='2026-09-11'
ppi_url='https://www.dol.gov/newsroom/economicdata/ppi_09102026.pdf'
eia_url='https://www.eia.gov/petroleum/supply/weekly/'
ppi={'asOf':stamp,'release':'2026-08','registeredAt':'2026-09-10','source':ppi_url,'definition':'BLS Producer Price Index for final demand. MoM seasonally adjusted; YoY unadjusted. Core = final demand less foods, energy, and trade services.','latest':{'ym':'2026-08','headlineMom':0.4,'headlineYoy':5.4,'coreMom':0.3,'coreYoy':4.7,'prevHeadlineMom':0.1,'prevCoreMom':0.4},'series':[{'ym':'2026-06','headlineMom':-0.1},{'ym':'2026-07','headlineMom':0.1},{'ym':'2026-08','headlineMom':0.4}]}
P('ppi.json').write_text(json.dumps(ppi,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
eia={'asOf':stamp,'weekEnding':'2026-09-04','registeredAt':'2026-09-10','source':eia_url,'definition':'EIA Weekly Petroleum Status Report, U.S. commercial crude oil stocks excluding lease stocks, thousand barrels.','latest':{'weekEnding':'2026-09-04','commercialCrudeKb':424069,'commercialCrudeMb':424.069,'previousKb':424460,'previousMb':424.460,'changeKb':-391,'changeMb':-0.391},'series':[{'weekEnding':'2026-08-14','commercialCrudeMb':428.815},{'weekEnding':'2026-08-21','commercialCrudeMb':428.910},{'weekEnding':'2026-08-28','commercialCrudeMb':424.460},{'weekEnding':'2026-09-04','commercialCrudeMb':424.069}]}
P('eia_weekly.json').write_text(json.dumps(eia,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Calendar consumers
p=P('calendar.json'); cal=json.loads(p.read_text(encoding='utf-8')); events=cal.setdefault('events',[])
pmeta=f'BLS 확정 · 8월 최종수요 PPI 전월비 +0.4%(7월 +0.1%), 전년비 +5.4%. 식품·에너지·무역서비스 제외 최종수요 PPI 전월비 +0.3%(7월 +0.4%), 전년비 +4.7%. 생산단 물가 재가속으로 금리·할인율 하방을 제약하는 입력. · 원문: {ppi_url} · 등록일: 2026-09-10 · 확인/갱신: 2026-09-11 07:30 KST'
hit=False
for e in events:
    if 'PPI' in str(e.get('lbl','')) and ('8월' in str(e.get('lbl','')) or e.get('d')=='2026-09-10'):
        e.update({'d':'2026-09-10','lbl':'美 PPI · 8월분','meta':pmeta,'when':'09-10 21:30 KST (확정)'}); hit=True
if not hit: events.append({'d':'2026-09-10','cat':'macro','lbl':'美 PPI · 8월분','meta':pmeta,'when':'09-10 21:30 KST (확정)'})
emeta=f'EIA 확정 · 9/4 종료 주간 미국 상업용 원유재고 424.069M배럴, 전주 424.460M배럴 대비 -0.391M배럴. 노동절로 9/10 지연 발표. 단기 재고는 소폭 감소했으며 규모가 작아 단독 방향 신호로 과대해석하지 않음. · 원문: {eia_url} · 등록일: 2026-09-10 · 확인/갱신: 2026-09-11 07:30 KST'
ehit=False
for e in events:
    if '원유재고' in str(e.get('lbl','')) and (e.get('d')=='2026-09-10' or 'EIA' in str(e.get('lbl',''))):
        e.update({'d':'2026-09-10','cat':'macro','lbl':'EIA 주간 원유재고 · 9/4 주간','meta':emeta,'when':'09-10 (확정)'}); ehit=True
if not ehit: events.append({'d':'2026-09-10','cat':'macro','lbl':'EIA 주간 원유재고 · 9/4 주간','meta':emeta,'when':'09-10 (확정)'})
cal['asOf']=stamp
note='2026-09-11 정기 발표 점검에서 BLS 8월 PPI와 EIA 9/4 주간 원유재고를 공식값으로 전 소비처 동기화.'
if note not in cal.get('note',''): cal['note']=(cal.get('note','')+' '+note).strip()
p.write_text(json.dumps(cal,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Shared market context for 01/04
p=P('pulse.json'); pulse=json.loads(p.read_text(encoding='utf-8')); pulse['asOf']='2026-09-11T07:30'
rates=next((x for x in pulse.get('drivers',[]) if x.get('ax')=='rates'),None)
if rates:
    rates.update({'dir':'risk','l1':'8월 PPI +0.4% MoM·+5.4% YoY로 생산단 물가 재가속','l2':'최종수요 PPI는 7월 +0.1%에서 8월 +0.4%로 상승했고, 식품·에너지·무역서비스 제외 지표는 +0.3% MoM·+4.7% YoY다. 9월 11일 CPI 발표 전까지 Fed 금리·고밸류 AI 인프라 할인율에는 상방 리스크 입력으로 본다.','verdict':'PPI 재가속 · CPI 확인 전 할인율 경계','srcs':[{'t':'BLS Producer Price Index - August 2026','u':ppi_url,'d':'2026-09-10'}]})
energy=next((x for x in pulse.get('drivers',[]) if '에너지' in str(x.get('layer',''))),None)
if energy:
    energy['l2']='9월 STEO의 데이터센터·제조업발 전력수요 확대 전망은 유지. 9/4 종료 주간 상업용 원유재고는 424.069M배럴로 전주 424.460M배럴 대비 0.391M배럴 감소했으나 변동 폭이 작아 유가 방향 신호로 과대해석하지 않는다.'
    srcs=[x for x in energy.get('srcs',[]) if 'Weekly Petroleum' not in str(x.get('t',''))]
    srcs.append({'t':'EIA Weekly Petroleum Status Report - week ending Sep 4, 2026','u':eia_url,'d':'2026-09-10'}); energy['srcs']=srcs
p.write_text(json.dumps(pulse,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# 02/04 shared signal log
p=P('signal_log.json'); sig=json.loads(p.read_text(encoding='utf-8')); sig['asOf']=date; log=sig.setdefault('log',[])
log=[x for x in log if not (x.get('date')==date and x.get('source')=='정기 공식발표 동기화')]
log.append({'date':date,'at':'07:30','source':'정기 공식발표 동기화','srcs':[{'label':'BLS PPI - August 2026','url':ppi_url},{'label':'EIA WPSR - Sep 4 week','url':eia_url}],'items':[{'tag':'물가·금리','layer':'macro','col':'#e03131','html':'<b>8월 최종수요 PPI +0.4% MoM·+5.4% YoY.</b> 7월 +0.1%에서 재가속. 식품·에너지·무역서비스 제외 PPI는 +0.3% MoM·+4.7% YoY. CPI 확인 전 금리·할인율 상방 리스크.'},{'tag':'에너지·재고','layer':'macro','col':'#e03131','html':'<b>EIA 9/4 주간 상업용 원유재고 424.069M배럴, WoW -0.391M배럴.</b> 소폭 감소로 단독 유가 방향 신호로는 중립에 가깝게 해석.'}]}); sig['log']=log
p.write_text(json.dumps(sig,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Cycle/risk official context, without changing unrelated scores
for fn in ['cycle.json','risk.json']:
    p=P(fn); obj=json.loads(p.read_text(encoding='utf-8')); obj['asOf']=date; ctx=obj.setdefault('periodicReleaseContext',{})
    ctx['ppi']={'release':'2026-08','headlineMom':0.4,'headlineYoy':5.4,'coreMom':0.3,'coreYoy':4.7,'source':ppi_url,'registeredAt':'2026-09-10','interpretation':'생산단 물가 재가속으로 금리·할인율 하방 제약'}
    ctx['eiaWeeklyCrude']={'weekEnding':'2026-09-04','commercialCrudeMb':424.069,'wowChangeMb':-0.391,'source':eia_url,'registeredAt':'2026-09-10','interpretation':'소폭 재고 감소; 단독 방향 신호 과대해석 금지'}
    p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# 01 actual cards and SVG time-series endpoints
p=P('trade.js'); s=p.read_text(encoding='utf-8')
if 'function mountPpi()' not in s:
    inject='''
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
'''
    s=s.replace('\n  function boot() {',inject+'\n  function boot() {')
    s=s.replace('mount(); mountGlobalSemi(); mountChinaTrade(); mountSteo();','mount(); mountGlobalSemi(); mountChinaTrade(); mountSteo(); mountPpi(); mountEiaWeekly();')
    s=s.replace('var a=mount(), b=mountGlobalSemi(), c=mountChinaTrade(), d=mountSteo(); if ((a && b && c && d) || ++n > 40)','var a=mount(), b=mountGlobalSemi(), c=mountChinaTrade(), d=mountSteo(), e=mountPpi(), f=mountEiaWeekly(); if ((a && b && c && d && e && f) || ++n > 40)')
    p.write_text(s,encoding='utf-8')

# Audit and daily status
cons=['01 PPI 카드+ppi.json 시계열','01 EIA 주간 원유재고 카드+eia_weekly.json 시계열','calendar.json','pulse.json','cycle.json','risk.json','02 signal_log.json','04 council-context shared pulse/cycle/signal_log','changelog.js']
audit={'date':date,'checkedAt':stamp,'status':'신규 발표 반영 완료','newOfficialReleases':[{'indicator':'BLS PPI 2026년 8월','registeredAt':'2026-09-10','sourceUrl':ppi_url,'values':ppi['latest']},{'indicator':'EIA 주간 원유재고 2026-09-04 종료 주간','registeredAt':'2026-09-10','sourceUrl':eia_url,'values':eia['latest']}],'pending':[{'indicator':'BLS CPI 2026년 8월','status':'발표 대기','scheduled':'2026-09-11 21:30 KST'}],'consumers':cons,'liveVerification':'pending until main merge/deploy'}
P('audit/official-release-checks').mkdir(parents=True,exist_ok=True); P('audit/official-release-checks/2026-09-11.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); P('periodic_release_check.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

p=P('changelog.js'); s=p.read_text(encoding='utf-8'); s=re.sub(r"market:'\d{4}-\d{2}-\d{2}'","market:'2026-09-11'",s,count=1)
entry="    {d:'2026-09-11',t:'01~06 정기 공식발표 동기화 — BLS 8월 PPI(+0.4% MoM/+5.4% YoY, 기조 +0.3%/+4.7%)와 EIA 9/4 주간 상업용 원유재고 424.069M배럴(WoW -0.391M)을 카드·시계열·캘린더·pulse/cycle/risk·02/04 컨텍스트에 동시 반영'},\n"
if 'BLS 8월 PPI(+0.4%' not in s: s=s.replace('  var MKT_CHANGELOG=[\n','  var MKT_CHANGELOG=[\n'+entry)
p.write_text(s,encoding='utf-8')
