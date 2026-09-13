#!/usr/bin/env python3
import json
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
FED=ROOT/'fedwatch.json'; PULSE=ROOT/'pulse.json'; AUDIT=ROOT/'audit/alpha-map/2026-09-13.json'
UPDATED='Sep 12, 2026 14:35 EST'; CHECKED='2026-09-13T08:40:00Z'

f=json.loads(FED.read_text(encoding='utf-8'))
f['checkedAt']=CHECKED
f['status']='확인됨(2순위)'
f['source']='Investing.com Fed Rate Monitor'
f['sourceUpdatedAt']=UPDATED
f['statusReason']=('CME FedWatch End-of-Day API는 자동화 실행환경에서 CME_FEDWATCH_TOKEN을 사용할 수 없어 직접 검증하지 못함. '
                   'Investing.com Fed Rate Monitor의 표시값을 ChatGPT 웹 검증으로 2순위 사용. '
                   f'원문 Updated={UPDATED}; Future Price 95.910; 확률 2.6/22.7/47.3/27.4%; <=4.00% 누적 25.3%. '
                   '9/13은 일요일이므로 검증되지 않은 새 거래일 값을 생성하지 않음.')
for h in f.get('history',[]):
    if (h.get('sourceDate') or h.get('date'))=='2026-09-12':
        h['checkedAt']=CHECKED; h['sourceUpdatedAt']=UPDATED
        h.setdefault('inputs',{})['updated']=UPDATED
        h['inputs']['parser']='direct-web-verified-summary'
checks=[x for x in f.get('checks',[]) if x.get('date')!='2026-09-13']
checks.append({'date':'2026-09-13','checkedAt':CHECKED,'status':'확인됨(2순위)','source':'Investing.com Fed Rate Monitor','sourceDate':'2026-09-12','sourceUpdatedAt':UPDATED,
               'reason':'CME EOD API token unavailable. GitHub runner Investing request returned 403 and pyfedwatch timed out, but ChatGPT web search directly verified the Investing.com displayed 2026-09-12 snapshot; Sunday check keeps the real source date instead of promoting 9/13.',
               'inputs':{'updated':UPDATED,'futurePrice':'95.910','basis':'CME Group 30-Day Fed Fund futures','parser':'direct-web-verified-summary'}})
f['checks']=checks[-370:]
FED.write_text(json.dumps(f,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

p=json.loads(PULSE.read_text(encoding='utf-8'))
def repl(s): return str(s).replace('Sep 12, 2026 14:25 EST',UPDATED).replace('Sep 12 14:25 EST',UPDATED)
p['headline']=repl(p.get('headline',''))
for d in p.get('drivers',[]):
    d['l1']=repl(d.get('l1','')); d['l2']=repl(d.get('l2','')); d['verdict']=repl(d.get('verdict',''))
p['asOf']='2026-09-13T17:40'
PULSE.write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if AUDIT.exists():
    a=json.loads(AUDIT.read_text(encoding='utf-8'))
    a.setdefault('fedWatch',{})['sourceUpdatedAt']=UPDATED
    a['fedWatch']['checkedAt']=CHECKED
    a['fedWatch']['verification']='ChatGPT web direct verification; GitHub runner automated sources failed safely without promoting stale data'
    AUDIT.write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
