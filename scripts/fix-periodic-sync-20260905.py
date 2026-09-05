#!/usr/bin/env python3
import json
from pathlib import Path

CHECKED='2026-09-05 11:56 KST'

# calendar
p=Path('calendar.json'); cal=json.loads(p.read_text(encoding='utf-8')); cal['asOf']='2026-09-05T11:56:00+09:00'; ev=cal.setdefault('events',[])
for e in ev:
    if e.get('tk')=='AVGO' and 'FY26 Q3' in e.get('lbl',''):
        e['meta']='발표 확인 · Broadcom 공식 IR 2026-09-02 등록. FY26 Q3 매출 $29.591B(+86% YoY), GAAP 영업이익 $15.955B, 비GAAP EPS $3.32, AI 반도체 매출 $16.7B(+221% YoY, +54% QoQ). FY26 Q4 매출 가이던스 약 $34.8B, AI 반도체 매출 전망 $21.7B. · 원문: https://investors.broadcom.com/news-releases/news-release-details/broadcom-inc-announces-third-quarter-fiscal-year-2026-financial · 등록일: 2026-09-02 · 확인: '+CHECKED
        e['when']='09-03 KST (발표 완료 · 매출 $29.591B / AI 반도체 $16.7B)'
def upsert(label,obj):
    for i,e in enumerate(ev):
        if e.get('lbl')==label: ev[i]=obj; return
    ev.append(obj)
upsert('한국 소비자물가 · 2026년 8월',{'d':'2026-09-02','cat':'macro','lbl':'한국 소비자물가 · 2026년 8월','meta':'발표 확인 · 국가데이터처 2026-09-02 공식 발표. 소비자물가지수 120.05(2020=100), 전월비 +0.2%, 전년동월비 +3.1%. 6월 +3.2%, 7월 +2.8%에 이어 8월 다시 3%대로 상승. · 원문: https://www.mods.go.kr/cpi/ · 등록일: 2026-09-02 · 확인: '+CHECKED,'when':'09-02 KST (발표 완료 · CPI +3.1% YoY)'})
upsert('美 고용보고서 (실업률·NFP) · 8월분',{'d':'2026-09-04','cat':'macro','lbl':'美 고용보고서 (실업률·NFP) · 8월분','meta':'발표 확인 · BLS 2026-09-04 08:30 ET 등록. 비농업고용 +162K, 실업률 4.1%, 민간 비농업 평균 시간당임금 +0.3% MoM/+3.1% YoY. 6월 NFP +20K→+31K, 7월 -23K→+21K로 두 달 합계 +55K 상향 수정. · 원문: https://www.bls.gov/news.release/archives/empsit_09042026.htm · 등록일: 2026-09-04 · 확인: '+CHECKED,'when':'09-04 21:30 KST (발표 완료 · NFP +162K / 실업률 4.1%)'})
ev.sort(key=lambda x:(x.get('d','9999-99-99'),x.get('when',''),x.get('lbl',''))); p.write_text(json.dumps(cal,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# pulse rates
p=Path('pulse.json'); pulse=json.loads(p.read_text(encoding='utf-8')); pulse['asOf']='2026-09-05T11:56'
for d in pulse.get('drivers',[]):
    if d.get('ax')=='rates':
        d.update({'dir':'risk','l1':'미국 8월 NFP +162K·실업률 4.1%로 고용 급랭은 피했지만 임금은 +3.1% YoY이고, 한국 8월 CPI도 +3.1% YoY로 재상승했다.','l2':'미국 고용은 6·7월 합계 +55K 상향 수정돼 급격한 침체 신호를 약화시킨다. 동시에 임금 상승과 한국 물가 재상승은 글로벌 금리·할인율 하락을 일방적으로 기대하기 어렵게 한다. 9월 미국 CPI·PPI와 FOMC를 다음 확인 게이트로 둔다.','verdict':'고용 견조·물가 압력 병존 · 금리/할인율 리스크 유지','srcs':[{'t':'BLS Employment Situation · August 2026','u':'https://www.bls.gov/news.release/archives/empsit_09042026.htm','d':'2026-09-04'},{'t':'국가데이터처 소비자물가지수 · 2026년 8월','u':'https://www.mods.go.kr/cpi/','d':'2026-09-02'}]})
p.write_text(json.dumps(pulse,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# CPI chart
p=Path('cpi.json'); c=json.loads(p.read_text(encoding='utf-8')); kr={d:v for d,v in c.setdefault('series',{}).setdefault('kr',[])}; kr.update({'2026-06-01':3.2,'2026-07-01':2.8,'2026-08-01':3.1}); c['series']['kr']=sorted([[d,v] for d,v in kr.items()]); c['asOf']='2026-09-05T02:56:00.000Z'; p.write_text(json.dumps(c,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')

# stale hard-coded consumer labels
p=Path('worker-core.js'); s=p.read_text(encoding='utf-8').replace('return "美 CPI · 6월분";','return "美 CPI · 8월분";').replace('return "美 고용보고서 (실업률·NFP) · 7월분";','return "美 고용보고서 (실업률·NFP) · 8월분";'); p.write_text(s,encoding='utf-8')

# changelog
p=Path('changelog.js'); s=p.read_text(encoding='utf-8'); entry="    {d:'2026-09-05',t:'01 정기 발표 동기화 — BLS 8월 고용 NFP +162K·실업률 4.1%·임금 +3.1% YoY와 6·7월 +55K 상향수정, 한국 8월 CPI +3.1% YoY를 카드·캘린더·시장맥락·CPI 시계열에 반영'},\n"; marker='  var MKT_CHANGELOG=[\n';
if entry not in s: s=s.replace(marker,marker+entry,1)
p.write_text(s,encoding='utf-8')

# prevent CPI reversion
p=Path('scripts/fetch-cpi.mjs'); s=p.read_text(encoding='utf-8')
if 'KR_OFFICIAL_YOY' not in s:
    block="""const KR_OFFICIAL_YOY = {\n  '2026-06-01': 3.2,\n  '2026-07-01': 2.8,\n  '2026-08-01': 3.1,\n};\n\nfunction applyOfficialOverrides(key, series) {\n  if (key !== 'kr') return series;\n  const m = new Map(series || []);\n  for (const [d, v] of Object.entries(KR_OFFICIAL_YOY)) m.set(d, v);\n  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));\n}\n\n"""
    s=s.replace('async function main() {',block+'async function main() {',1)
s=s.replace('const best = freshest([prev.series && prev.series[k], ...cands]);','const best = applyOfficialOverrides(k, freshest([prev.series && prev.series[k], ...cands]));',1); p.write_text(s,encoding='utf-8')

# trigger fetcher changes
p=Path('.github/workflows/update-cpi.yml'); s=p.read_text(encoding='utf-8'); add="      - 'scripts/fetch-cpi.mjs'\n"; needle="      - '.github/workflows/update-cpi.yml'\n";
if add not in s: s=s.replace(needle,needle+add,1)
p.write_text(s,encoding='utf-8')

# archive failed patch carriers
ap=Path('patches/applied'); ap.mkdir(parents=True,exist_ok=True)
for name in ['2026-09-05-sync-nfp-kr-cpi.b64','2026-09-05-01-calendar.b64','2026-09-05-02-pulse-rates.b64','2026-09-05-03-worker-map.b64','2026-09-05-04-changelog.b64','2026-09-05-05-fetch-cpi-overrides.b64','2026-09-05-06-fetch-cpi-use-overrides.b64','2026-09-05-07-update-cpi-trigger.b64']:
    src=Path('patches')/name
    if src.exists() and not (ap/name).exists(): src.rename(ap/name)
