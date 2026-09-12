import json, pathlib, urllib.request
from datetime import datetime, timezone, timedelta

root=pathlib.Path('.')
KST=timezone(timedelta(hours=9)); now=datetime.now(KST).replace(microsecond=0); iso=now.isoformat(); stamp=now.strftime('%Y-%m-%d %H:%M KST')
api='https://www.treasurydirect.gov/TA_WS/securities/auctioned?format=json'
req=urllib.request.Request(api,headers={'User-Agent':'SimpleorNothing AlphaMap official-release-sync/1.0','Accept':'application/json'})
with urllib.request.urlopen(req,timeout=60) as r: rows=json.load(r)

def dt(x): return str(x or '')[:10]
def f(x): return float(x) if str(x or '').strip() else None
def b(x): return round(float(x)/1e9,6) if str(x or '').strip() else None

def normalize(r):
    competitive=f(r.get('competitiveAccepted')) or 0.0
    indirect=f(r.get('indirectBidderAccepted')) or 0.0
    direct=f(r.get('directBidderAccepted')) or 0.0
    dealer=f(r.get('primaryDealerAccepted')) or 0.0
    return {
      'auctionDate':dt(r.get('auctionDate')),'updatedTimestamp':r.get('updatedTimestamp'),'term':r.get('term'),
      'cusip':r.get('cusip'),'reopening':r.get('reopening'),'couponPct':f(r.get('interestRate')),
      'highYieldPct':f(r.get('highYield')),'medianYieldPct':f(r.get('averageMedianYield')),'bidToCover':f(r.get('bidToCoverRatio')),
      'offeringB':b(r.get('offeringAmount')),'totalAcceptedB':b(r.get('totalAccepted')),
      'indirectSharePct':round(indirect/competitive*100,1) if competitive else None,
      'directSharePct':round(direct/competitive*100,1) if competitive else None,
      'dealerSharePct':round(dealer/competitive*100,1) if competitive else None,
      'resultPdf':'https://www.treasurydirect.gov/instit/annceresult/press/preanre/2026/'+r.get('pdfFilenameCompetitiveResults','')
    }

series={}
for term in ['3-Year','10-Year','30-Year']:
    xs=[normalize(r) for r in rows if r.get('term')==term and dt(r.get('auctionDate'))<='2026-09-10' and f(r.get('highYield')) is not None]
    xs=sorted(xs,key=lambda x:x['auctionDate'])
    series[term]=xs[-6:]
    if len(series[term])<2: raise SystemExit('insufficient '+term+' history')
latest={k:v[-1] for k,v in series.items()}; previous={k:v[-2] for k,v in series.items()}
expected={'3-Year':('2026-09-08',4.474,2.72),'10-Year':('2026-09-09',4.834,2.71),'30-Year':('2026-09-10',5.308,2.61)}
for k,(d,y,btc) in expected.items():
    z=latest[k]
    if z['auctionDate']!=d or abs(z['highYieldPct']-y)>1e-9 or abs(z['bidToCover']-btc)>1e-9: raise SystemExit(f'unexpected {k}: {z}')
data={'asOf':'2026-09-10','checkedAt':iso,'source':'U.S. TreasuryDirect Auction Query API','sourceUrl':api,'unit':'percent / ratio / USD billion','note':'Coupon auctions only. High yield, bid-to-cover and bidder allocation are official TreasuryDirect auction result fields; no estimates.','series':series,'latest':latest,'previous':previous}
(root/'treasury_auctions.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# 01 market monitoring card + actual 30Y auction-yield history chart.
p=root/'trade.js'; s=p.read_text(encoding='utf-8')
if 'function mountTreasuryAuctions()' not in s:
    insert=r'''
  function mountTreasuryAuctions() {
    var id='mkt_us_treasury_auctions'; if(document.getElementById(id)) return true;
    var grid=document.getElementById('mktIndicators'); if(!grid) return false;
    var card=document.createElement('div'); card.className='mkt-card'; card.id=id; card.setAttribute('data-indicator-key','us-treasury-auctions'); card.innerHTML='<div class="mkt-ph">미 국채 입찰 로딩…</div>'; grid.appendChild(card);
    fetch('treasury_auctions.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){
      if(!j||!j.latest||!j.series){card.innerHTML='<div class="mkt-ph">발표 대기 · U.S. TreasuryDirect</div>';return;}
      var y3=j.latest['3-Year'],y10=j.latest['10-Year'],y30=j.latest['30-Year'],p30=j.previous['30-Year'];
      var vals=(j.series['30-Year']||[]).map(function(x){return x.highYieldPct;});
      card.innerHTML='<div class="mkt-nm">미 국채 입찰(3Y·10Y·30Y)</div><div class="mkt-val">30Y '+y30.highYieldPct.toFixed(3)+'%</div>'+
        '<div class="mkt-chg">BTC '+y30.bidToCover.toFixed(2)+' · 직전 '+p30.highYieldPct.toFixed(3)+'% / '+p30.bidToCover.toFixed(2)+'</div>'+
        lensRow('<b>장기금리 수요</b> 10Y '+y10.highYieldPct.toFixed(3)+'%(BTC '+y10.bidToCover.toFixed(2)+') · 3Y '+y3.highYieldPct.toFixed(3)+'%(BTC '+y3.bidToCover.toFixed(2)+')',
          '30Y 간접낙찰 '+y30.indirectSharePct.toFixed(1)+'% · 10Y '+y10.indirectSharePct.toFixed(1)+'% · 3Y '+y3.indirectSharePct.toFixed(1)+'%')+
        '<div class="mkt-chart">'+spark(vals,false)+'</div><div class="mkt-span">30Y 최근 6회 고금리 낙찰수익률 · 최신 2026-09-10 · TreasuryDirect</div>';
    }).catch(function(){card.innerHTML='<div class="mkt-ph">TreasuryDirect 입찰 데이터 로딩 실패</div>';});
    return true;
  }
'''
    marker='\n  function boot() {\n'
    if marker not in s: raise SystemExit('trade.js boot marker missing')
    s=s.replace(marker,'\n'+insert+marker,1)
old='    mount(); mountGlobalSemi(); mountChinaTrade(); mountSteo(); mountCpi(); mountPpi(); mountEiaWeekly(); mountTreasuryBudget();\n    var n = 0, timer = setInterval(function () { var a=mount(), b=mountGlobalSemi(), c=mountChinaTrade(), d=mountSteo(), e=mountCpi(), f=mountPpi(), g=mountEiaWeekly(), h=mountTreasuryBudget(); if ((a && b && c && d && e && f && g && h) || ++n > 40) clearInterval(timer); }, 250);'
new='    mount(); mountGlobalSemi(); mountChinaTrade(); mountSteo(); mountCpi(); mountPpi(); mountEiaWeekly(); mountTreasuryBudget(); mountTreasuryAuctions();\n    var n = 0, timer = setInterval(function () { var a=mount(), b=mountGlobalSemi(), c=mountChinaTrade(), d=mountSteo(), e=mountCpi(), f=mountPpi(), g=mountEiaWeekly(), h=mountTreasuryBudget(), i=mountTreasuryAuctions(); if ((a && b && c && d && e && f && g && h && i) || ++n > 40) clearInterval(timer); }, 250);'
if old in s: s=s.replace(old,new,1)
elif 'mountTreasuryAuctions();' not in s: raise SystemExit('trade.js boot shape unexpected')
p.write_text(s,encoding='utf-8')

# Calendar: each coupon auction release result.
p=root/'calendar.json'; cal=json.loads(p.read_text(encoding='utf-8')); cal['asOf']=iso; evs=cal.setdefault('events',[])
for term,label in [('3-Year','미 재무부 3년물 국채 입찰'),('10-Year','미 재무부 10년물 국채 입찰'),('30-Year','미 재무부 30년물 국채 입찰')]:
    z=latest[term]; prev=previous[term]
    ev={'d':z['auctionDate'],'cat':'macro','lbl':label,'meta':f"발표 확인 · 고금리 낙찰수익률 {z['highYieldPct']:.3f}%, bid-to-cover {z['bidToCover']:.2f}, 간접낙찰 비중 {z['indirectSharePct']:.1f}%, 발행예정액 ${z['offeringB']:.0f}B. 직전 동일 만기 입찰 {prev['auctionDate']} {prev['highYieldPct']:.3f}% / BTC {prev['bidToCover']:.2f}. 원문: {z['resultPdf']} · TreasuryDirect 업데이트 {z['updatedTimestamp']} ET · 확인 {stamp}",'when':z['auctionDate']+' ET (발표 완료)'}
    evs[:]=[x for x in evs if x.get('lbl')!=label or x.get('d')!=z['auctionDate']]; evs.append(ev)
evs.sort(key=lambda x:(x.get('d','9999-99-99'),x.get('when',''),x.get('lbl','')))
p.write_text(json.dumps(cal,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# Market rates context.
p=root/'pulse.json'; pulse=json.loads(p.read_text(encoding='utf-8')); pulse['asOf']=iso; rates=next((x for x in pulse.get('drivers',[]) if x.get('ax')=='rates'),None)
summary=f"9월 정기 쿠폰 입찰은 3Y {latest['3-Year']['highYieldPct']:.3f}%/BTC {latest['3-Year']['bidToCover']:.2f}, 10Y {latest['10-Year']['highYieldPct']:.3f}%/{latest['10-Year']['bidToCover']:.2f}, 30Y {latest['30-Year']['highYieldPct']:.3f}%/{latest['30-Year']['bidToCover']:.2f}. 30Y 간접낙찰 비중 {latest['30-Year']['indirectSharePct']:.1f}%로 실제 장기물 수요를 금리 리스크 판단에 반영한다."
if rates:
    if '9월 정기 쿠폰 입찰은' not in rates.get('l2',''): rates['l2']=rates.get('l2','')+' '+summary
    rates['verdict']='CPI 혼재 + FY26 누적 재정적자 확대 + 9월 3Y/10Y/30Y 입찰 수요 확인 · 할인율/국채공급 부담 관찰'
    urls=[x for x in rates.setdefault('srcs',[]) if 'TreasuryDirect 2026-09 coupon auctions' not in x.get('t','')]
    urls.insert(0,{'t':'TreasuryDirect 2026-09 coupon auctions (3Y/10Y/30Y)','u':api,'d':'2026-09-10'}); rates['srcs']=urls
pulse['headline']=summary+' '+pulse.get('headline','')
p.write_text(json.dumps(pulse,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Cycle/risk context.
p=root/'cycle.json'; cyc=json.loads(p.read_text(encoding='utf-8')); cyc['asOf']='2026-09-13'; ctx=cyc.setdefault('periodicReleaseContext',{})
ctx['treasuryAuctions']={'latest':latest,'previous':previous,'source':api,'registeredThrough':'2026-09-10','interpretation':'국채 수요와 장기 할인율의 매크로 경로. 반도체 수요 신호에는 직접 사용하지 않음.'}
p.write_text(json.dumps(cyc,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
p=root/'risk.json'; risk=json.loads(p.read_text(encoding='utf-8')); risk['asOf']='2026-09-13'; bond=next((x for x in risk.get('items',[]) if x.get('id')=='bond'),None); fiscal=next((x for x in risk.get('items',[]) if x.get('id')=='fiscal'),None)
add=' '+summary
for item in [bond,fiscal]:
    if item:
        if '9월 정기 쿠폰 입찰은' not in item.get('verdict',''): item['verdict']=item.get('verdict','')+add
        srcs=item.setdefault('srcs',[])
        if not any('TreasuryDirect — Sep 2026 3Y/10Y/30Y auctions' in x.get('label','') for x in srcs): srcs.append({'label':'TreasuryDirect — Sep 2026 3Y/10Y/30Y auctions','url':api})
        item['upd']='2026-09-13'
p.write_text(json.dumps(risk,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Shared 02/04 context.
p=root/'signal_log.json'; sig=json.loads(p.read_text(encoding='utf-8')); sig['asOf']='2026-09-13'; log=sig.setdefault('log',[]); source='U.S. Treasury 2026년 9월 3Y·10Y·30Y 국채 입찰 공식 결과'; log[:]=[x for x in log if x.get('source')!=source]
log.append({'date':'2026-09-10','at':iso,'source':source,'srcs':[{'label':'TreasuryDirect Auction Query API','url':api}],'items':[{'tag':'매크로·국채수요','layer':'L2','col':'#e03131','html':f"<b>9월 쿠폰 입찰: 3Y {latest['3-Year']['highYieldPct']:.3f}%/BTC {latest['3-Year']['bidToCover']:.2f}, 10Y {latest['10-Year']['highYieldPct']:.3f}%/{latest['10-Year']['bidToCover']:.2f}, 30Y {latest['30-Year']['highYieldPct']:.3f}%/{latest['30-Year']['bidToCover']:.2f}.</b> 30Y 간접낙찰 {latest['30-Year']['indirectSharePct']:.1f}%. 실제 장기물 수요와 할인율 경로에만 반영하고 AI 수요 신호와 분리."}]})
log.sort(key=lambda x:(x.get('date',''),x.get('at',''))); p.write_text(json.dumps(sig,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Daily audit: append auction official releases and reset overall live status until production check.
for fp in [root/'periodic_release_check.json',root/'audit/official-release-checks/2026-09-13.json']:
    audit=json.loads(fp.read_text(encoding='utf-8')); releases=audit.setdefault('newOfficialReleases',[]); releases[:]=[x for x in releases if not x.get('indicator','').startswith('U.S. Treasury 2026년 9월 국채 입찰')]
    releases.append({'indicator':'U.S. Treasury 2026년 9월 국채 입찰(3Y·10Y·30Y)','registeredAt':'2026-09-08~2026-09-10','sourceUrl':api,'values':latest})
    for c in ['01 미 국채 입찰(3Y·10Y·30Y) 카드','treasury_auctions.json 3Y/10Y/30Y 시계열','calendar.json 3Y/10Y/30Y 결과','pulse.json rates context','cycle.json periodicReleaseContext','risk.json ② bond + ④ fiscal','02 signal_log.json','04 council-context shared pulse/cycle/signal_log']:
        if c not in audit.setdefault('consumers',[]): audit['consumers'].append(c)
    audit['liveVerification']={'status':'pending','verifiedAt':None,'checks':['simpleornothing.com authenticated browser','treasury_budget.json + treasury_auctions.json latest/previous series endpoints','01 미국 재정수지(MTS) + 미 국채 입찰 cards displayed official values and SVG charts','CPI/PPI/EIA regression checks']}
    fp.write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

p=root/'changelog.js'; ch=p.read_text(encoding='utf-8'); marker='  var MKT_CHANGELOG=[\n'; entry="    {d:'2026-09-13',t:'01~06 정기 발표 보완 — TreasuryDirect 9월 3Y·10Y·30Y 입찰 결과를 01 카드·시계열·캘린더·rates/cycle/risk·02/04 공유 컨텍스트에 공식값으로 동기화'},\n"
if entry not in ch:
    if marker not in ch: raise SystemExit('changelog marker missing')
    ch=ch.replace(marker,marker+entry,1); p.write_text(ch,encoding='utf-8')
print(json.dumps({'latest':latest,'previous':previous},ensure_ascii=False,indent=2))
