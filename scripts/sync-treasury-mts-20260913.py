import json, pathlib, urllib.parse, urllib.request
from datetime import datetime, timezone, timedelta

root=pathlib.Path('.')
KST=timezone(timedelta(hours=9)); now=datetime.now(KST).replace(microsecond=0); iso=now.isoformat(); stamp=now.strftime('%Y-%m-%d %H:%M KST')
api='https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_1'
q=urllib.parse.urlencode({'filter':'record_date:eq:2026-08-31','page[size]':'100'})
url=api+'?'+q
req=urllib.request.Request(url,headers={'User-Agent':'SimpleorNothing AlphaMap official-release-sync/1.0'})
with urllib.request.urlopen(req,timeout=30) as r: raw=json.load(r)
rows=raw.get('data',[]); groups={}; cur=None
for row in rows:
    desc=row.get('classification_desc','')
    if desc.startswith('FY '): cur=desc; groups[cur]=[]
    elif cur: groups[cur].append(row)
def pick(fy,label): return next((r for r in groups.get(fy,[]) if r.get('classification_desc')==label),None)
def b(v): return round(float(v)/1e9,6)
months=['October','November','December','January','February','March','April','May','June','July','August']
yms={'October':'2025-10','November':'2025-11','December':'2025-12','January':'2026-01','February':'2026-02','March':'2026-03','April':'2026-04','May':'2026-05','June':'2026-06','July':'2026-07','August':'2026-08'}
series=[]
for m in months:
    r=pick('FY 2026',m)
    if not r: raise SystemExit('missing FY2026 '+m)
    series.append({'ym':yms[m],'receiptsB':b(r['current_month_gross_rcpt_amt']),'outlaysB':b(r['current_month_gross_outly_amt']),'deficitB':b(r['current_month_dfct_sur_amt'])})
july=pick('FY 2026','July'); aug=pick('FY 2026','August'); ytd=pick('FY 2026','Year-to-Date'); py_aug=pick('FY 2025','August'); py_ytd=pick('FY 2025','Year-to-Date')
for x in [july,aug,ytd,py_aug,py_ytd]:
    if not x: raise SystemExit('required MTS row missing')
latest={
 'ym':'2026-08','receiptsB':b(aug['current_month_gross_rcpt_amt']),'outlaysB':b(aug['current_month_gross_outly_amt']),'deficitB':b(aug['current_month_dfct_sur_amt']),
 'prevDeficitB':b(july['current_month_dfct_sur_amt']),'priorYearDeficitB':b(py_aug['current_month_dfct_sur_amt']),
 'ytdDeficitB':b(ytd['current_month_dfct_sur_amt']),'priorYearYtdDeficitB':b(py_ytd['current_month_dfct_sur_amt'])
}
latest['momPct']=round((latest['deficitB']/latest['prevDeficitB']-1)*100,1)
latest['yoyPct']=round((latest['deficitB']/latest['priorYearDeficitB']-1)*100,1)
latest['ytdYoyPct']=round((latest['ytdDeficitB']/latest['priorYearYtdDeficitB']-1)*100,1)
data={'asOf':'2026-09-11','registeredAt':'2026-09-11','checkedAt':iso,'source':'U.S. Treasury Bureau of the Fiscal Service — Monthly Treasury Statement Table 1','sourceUrl':url,'unit':'USD billion','metric':'federal receipts, outlays, deficit/surplus','note':'Positive deficitB denotes deficit; values are official MTS Table 1 amounts converted from dollars to USD billions. No forecasts.','series':series,'latest':latest}
(root/'treasury_budget.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# 01 market card and actual chart endpoint.
p=root/'trade.js'; s=p.read_text(encoding='utf-8')
if 'function mountTreasuryBudget()' not in s:
    insert=r'''
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
'''
    marker='\n  function boot() {\n'
    if marker not in s: raise SystemExit('trade.js boot marker missing')
    s=s.replace(marker,'\n'+insert+marker,1)
old='    mount(); mountGlobalSemi(); mountChinaTrade(); mountSteo(); mountCpi(); mountPpi(); mountEiaWeekly();\n    var n = 0, timer = setInterval(function () { var a=mount(), b=mountGlobalSemi(), c=mountChinaTrade(), d=mountSteo(), e=mountCpi(), f=mountPpi(), g=mountEiaWeekly(); if ((a && b && c && d && e && f && g) || ++n > 40) clearInterval(timer); }, 250);'
new='    mount(); mountGlobalSemi(); mountChinaTrade(); mountSteo(); mountCpi(); mountPpi(); mountEiaWeekly(); mountTreasuryBudget();\n    var n = 0, timer = setInterval(function () { var a=mount(), b=mountGlobalSemi(), c=mountChinaTrade(), d=mountSteo(), e=mountCpi(), f=mountPpi(), g=mountEiaWeekly(), h=mountTreasuryBudget(); if ((a && b && c && d && e && f && g && h) || ++n > 40) clearInterval(timer); }, 250);'
if old in s: s=s.replace(old,new,1)
elif 'mountTreasuryBudget();' not in s: raise SystemExit('trade.js boot shape unexpected')
p.write_text(s,encoding='utf-8')

# Calendar release result.
p=root/'calendar.json'; cal=json.loads(p.read_text(encoding='utf-8')); cal['asOf']=iso
ev={'d':'2026-09-11','cat':'macro','lbl':'미 재무부 월간 재정수지(MTS) · 2026년 8월','meta':f"발표 확인 · 8월 연방 재정적자 ${latest['deficitB']:.1f}B(7월 ${latest['prevDeficitB']:.1f}B, 전년동월 ${latest['priorYearDeficitB']:.1f}B), 세입 ${latest['receiptsB']:.1f}B·지출 ${latest['outlaysB']:.1f}B. FY2026 10~8월 누적 적자 ${latest['ytdDeficitB']/1000:.3f}T, 전년동기 ${latest['priorYearYtdDeficitB']/1000:.3f}T({latest['ytdYoyPct']:+.1f}%). 공식 MTS Table 1: {url} · 등록일 2026-09-11 · 확인 {stamp}",'when':'09-11 ET (발표 완료 · 8월 적자 $166.8B)'}
events=cal.setdefault('events',[]); events[:]=[x for x in events if x.get('lbl')!=ev['lbl']]; events.append(ev); events.sort(key=lambda x:(x.get('d','9999-99-99'),x.get('when',''),x.get('lbl','')))
p.write_text(json.dumps(cal,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# Market context: rates/fiscal supply path.
p=root/'pulse.json'; pulse=json.loads(p.read_text(encoding='utf-8')); pulse['asOf']=iso
rates=next((x for x in pulse.get('drivers',[]) if x.get('ax')=='rates'),None)
if rates:
    rates['l2']=rates.get('l2','')+f" 미 재무부 8월 MTS는 월간 적자 ${latest['deficitB']:.1f}B로 7월 ${latest['prevDeficitB']:.1f}B보다 축소됐지만 FY26 누적 적자는 ${latest['ytdDeficitB']/1000:.2f}T로 전년동기 대비 {latest['ytdYoyPct']:+.1f}% 확대됐다. 월간 개선과 누적 재정 부담을 함께 반영한다."
    rates['verdict']='CPI 혼재 + FY26 누적 재정적자 확대 · 할인율/국채공급 부담 관찰'
    srcs=[x for x in rates.setdefault('srcs',[]) if 'Monthly Treasury Statement' not in x.get('t','')]
    srcs.insert(0,{'t':'U.S. Treasury Monthly Treasury Statement · August 2026','u':url,'d':'2026-09-11'}); rates['srcs']=srcs
pulse['headline']=f"미 재무부 8월 MTS는 월간 적자 ${latest['deficitB']:.1f}B로 7월보다 줄었지만 FY26 누적 적자는 ${latest['ytdDeficitB']/1000:.2f}T({latest['ytdYoyPct']:+.1f}% YoY)로 확대돼 장기금리·국채공급 리스크의 누적 배경을 강화한다. "+pulse.get('headline','')
p.write_text(json.dumps(pulse,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Cycle periodic context (macro discount-rate channel, not semiconductor demand signal).
p=root/'cycle.json'; cyc=json.loads(p.read_text(encoding='utf-8')); cyc['asOf']='2026-09-13'; ctx=cyc.setdefault('periodicReleaseContext',{})
ctx['treasuryBudget']={'release':'2026-08','monthlyDeficitB':latest['deficitB'],'prevMonthlyDeficitB':latest['prevDeficitB'],'receiptsB':latest['receiptsB'],'outlaysB':latest['outlaysB'],'ytdDeficitB':latest['ytdDeficitB'],'priorYearYtdDeficitB':latest['priorYearYtdDeficitB'],'ytdYoyPct':latest['ytdYoyPct'],'source':url,'registeredAt':'2026-09-11','interpretation':'월간 적자는 7월보다 축소됐지만 FY 누적 적자는 전년동기보다 확대. 반도체 수요 신호가 아니라 장기금리·국채공급·조달비용 경로의 매크로 리스크로만 사용.'}
p.write_text(json.dumps(cyc,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')

# Risk consumers: bond + fiscal.
p=root/'risk.json'; risk=json.loads(p.read_text(encoding='utf-8')); risk['asOf']='2026-09-13'
bond=next((x for x in risk.get('items',[]) if x.get('id')=='bond'),None); fiscal=next((x for x in risk.get('items',[]) if x.get('id')=='fiscal'),None)
add=f" 8월 MTS는 월간 적자 ${latest['deficitB']:.1f}B로 7월 ${latest['prevDeficitB']:.1f}B보다 축소됐지만 FY26 누적 적자는 ${latest['ytdDeficitB']/1000:.2f}T로 전년동기 ${latest['priorYearYtdDeficitB']/1000:.2f}T 대비 {latest['ytdYoyPct']:+.1f}% 확대됐다. 월간 개선만으로 공급 부담 해소로 판정하지 않는다."
for item in [bond,fiscal]:
    if item:
        if '8월 MTS는 월간 적자' not in item.get('verdict',''): item['verdict']=item.get('verdict','')+add
        srcs=item.setdefault('srcs',[])
        if not any('Monthly Treasury Statement · August 2026' in x.get('label','') for x in srcs): srcs.append({'label':'U.S. Treasury — Monthly Treasury Statement · August 2026 (2026-09-11)','url':url})
        item['upd']='2026-09-13'
p.write_text(json.dumps(risk,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# 02 + 04 shared signal context.
p=root/'signal_log.json'; sig=json.loads(p.read_text(encoding='utf-8')); sig['asOf']='2026-09-13'; log=sig.setdefault('log',[])
source='U.S. Treasury 2026년 8월 Monthly Treasury Statement 공식 발표'; log[:]=[x for x in log if x.get('source')!=source]
log.append({'date':'2026-09-11','at':iso,'source':source,'srcs':[{'label':'U.S. Treasury Bureau of the Fiscal Service — MTS Table 1','url':url}],'items':[{'tag':'매크로·재정','layer':'L2','col':'#e03131','html':f"<b>[09-11] 8월 미 연방 재정적자 ${latest['deficitB']:.1f}B, 7월 ${latest['prevDeficitB']:.1f}B에서 축소.</b> 세입 ${latest['receiptsB']:.1f}B·지출 ${latest['outlaysB']:.1f}B. 다만 FY26 10~8월 누적 적자는 <b>${latest['ytdDeficitB']/1000:.2f}T</b>로 전년동기 ${latest['priorYearYtdDeficitB']/1000:.2f}T보다 {latest['ytdYoyPct']:+.1f}% 확대. 월간 개선과 누적 국채공급·장기금리 부담을 분리해 해석. 반도체 수요 숫자에는 직접 반영하지 않음."}]})
log.sort(key=lambda x:(x.get('date',''),x.get('at',''))); p.write_text(json.dumps(sig,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Audit and change history.
audit={'date':'2026-09-13','checkedAt':iso,'status':'신규 발표 반영 완료','newOfficialReleases':[{'indicator':'U.S. Treasury Monthly Treasury Statement 2026년 8월','registeredAt':'2026-09-11','sourceUrl':url,'values':latest}],'pending':[],'consumers':['01 미국 재정수지(MTS) 카드','treasury_budget.json 시계열','calendar.json','pulse.json rates context','cycle.json periodicReleaseContext','risk.json ② bond + ④ fiscal','02 signal_log.json','04 council-context shared pulse/cycle/signal_log','changelog.js'],'liveVerification':{'status':'pending','verifiedAt':None,'checks':['simpleornothing.com authenticated browser','treasury_budget.json latest + latest series endpoint','01 미국 재정수지(MTS) displayed latest value + July comparison + FY YTD + SVG chart']}}
(root/'periodic_release_check.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
ad=root/'audit/official-release-checks/2026-09-13.json'; ad.parent.mkdir(parents=True,exist_ok=True); ad.write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

p=root/'changelog.js'; ch=p.read_text(encoding='utf-8'); marker='  var MKT_CHANGELOG=[\n'; entry=f"    {{d:'2026-09-13',t:'01~06 정기 발표 동기화 — 미 재무부 8월 MTS(월간 적자 ${latest['deficitB']:.1f}B, 7월 ${latest['prevDeficitB']:.1f}B, FY26 누적 ${latest['ytdDeficitB']/1000:.2f}T)를 01 카드·시계열·캘린더·시장맥락·사이클·리스크·02/04 공유 signal_log에 공식값으로 동기화'}},\n"
if entry not in ch:
    if marker not in ch: raise SystemExit('changelog marker missing')
    ch=ch.replace(marker,marker+entry,1); p.write_text(ch,encoding='utf-8')

print(json.dumps({'latest':latest,'series_end':series[-2:]},ensure_ascii=False,indent=2))
