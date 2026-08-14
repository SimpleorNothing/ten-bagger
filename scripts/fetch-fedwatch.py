#!/usr/bin/env python3
"""Daily December-2026 FedWatch snapshot.

Source priority:
1) CME FedWatch End-of-Day API (official; OAuth bearer token required)
2) Investing.com Fed Rate Monitor (CME 30-Day Fed Funds futures based)
3) pyfedwatch direct calculation, only as a tertiary validation fallback

Never fabricate a fresh probability snapshot when source inputs cannot be verified.
"""
import json, os, re
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode, quote
from urllib.request import Request, urlopen

import pandas as pd
from bs4 import BeautifulSoup
from pyfedwatch.datareader import get_fomc_data_fed
from pyfedwatch.fedwatch import FedWatch

OUT = "fedwatch.json"
TARGET_MEETING = "2026-12-09"
CME_BASE = "https://markets.api.cmegroup.com/fedwatch/v1"
CME_DOC = "https://cmegroupclientsite.atlassian.net/wiki/spaces/EPICSANDBOX/pages/457320466/CME+FedWatch+End-of-Day+API"
INVESTING_URL = "https://www.investing.com/central-banks/fed-rate-monitor"
PYFEDWATCH_URL = "https://github.com/ARahimiQuant/pyfedwatch"
FRED_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={}"
YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{}?period1={}&period2={}&interval=1d&events=history"
UA = "Mozilla/5.0 (compatible; AlphaMap-FedWatch/2.0)"


def now_iso(): return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
def today_iso(): return datetime.now(timezone.utc).date().isoformat()

def load_doc():
    try:
        with open(OUT, encoding="utf-8") as f: return json.load(f)
    except Exception:
        return {"meeting":"2026-12 FOMC","history":[]}

def save_doc(doc):
    with open(OUT,"w",encoding="utf-8") as f:
        json.dump(doc,f,ensure_ascii=False,separators=(",",":")); f.write("\n")

def record(doc, status, source=None, source_url=None, reason=None, meta=None, ranges=None, source_date=None):
    checked = now_iso(); today = today_iso()
    checks = [x for x in doc.get("checks",[]) if x.get("date") != today]
    item={"date":today,"checkedAt":checked,"status":status}
    if source: item["source"] = source
    if source_date: item["sourceDate"] = source_date
    if reason: item["reason"] = reason
    if meta: item["inputs"] = meta
    checks.append(item)
    doc.update({"meeting":"2026-12 FOMC","checkedAt":checked,"status":status,"checks":checks[-370:]})
    if source: doc["source"] = source
    if source_url: doc["sourceUrl"] = source_url
    if reason: doc["statusReason"] = reason
    else: doc.pop("statusReason",None)
    if ranges:
        exp=sum(((x["low"]+x["high"])/2)*x["probability"]/100 for x in ranges)
        hist=[x for x in doc.get("history",[]) if x.get("date") != today]
        hist.append({"date":today,"expectedRate":round(exp,4),"ranges":ranges,"source":source,"sourceDate":source_date,"inputs":meta or {}})
        doc["history"]=hist[-370:]; doc["asOf"]=checked
    return doc

def norm_ranges(rows):
    out=[]
    for low,high,p in rows:
        low=float(low); high=float(high); p=float(p)
        out.append({"label":f"{low:.2f}%–{high:.2f}%","low":low,"high":high,"probability":round(p,1)})
    out.sort(key=lambda x:x["low"])
    total=sum(x["probability"] for x in out)
    if len(out)<2 or not 98<=total<=102: raise RuntimeError(f"probability validation failed n={len(out)} total={total}")
    return out

def fetch_cme():
    token=os.getenv("CME_FEDWATCH_TOKEN","").strip()
    if not token: raise RuntimeError("CME_FEDWATCH_TOKEN secret unavailable")
    url=f"{CME_BASE}/forecasts?"+urlencode({"meetingDt":TARGET_MEETING})
    req=Request(url,headers={"Authorization":f"Bearer {token}","Accept":"application/json","User-Agent":UA})
    with urlopen(req,timeout=30) as r: payload=json.loads(r.read().decode())
    rows=[]; reporting=[]
    def walk(x):
        if isinstance(x,dict):
            keys={k.lower():k for k in x}
            if "lowerrt" in keys and "upperrt" in keys and "probability" in keys:
                rows.append((x[keys["lowerrt"]],x[keys["upperrt"]],x[keys["probability"]]))
                for rk in ("reportingdt","reportingdate"):
                    if rk in keys: reporting.append(str(x[keys[rk]]))
            for v in x.values(): walk(v)
        elif isinstance(x,list):
            for v in x: walk(v)
    walk(payload)
    ranges=norm_ranges(rows)
    source_date=max(reporting) if reporting else today_iso()
    return ranges, source_date, {"meetingDt":TARGET_MEETING,"api":"CME FedWatch End-of-Day API","official":True}

def fetch_investing():
    req=Request(INVESTING_URL,headers={"User-Agent":UA,"Accept-Language":"en-US,en;q=0.9"})
    with urlopen(req,timeout=30) as r: html=r.read().decode("utf-8","ignore")
    text=BeautifulSoup(html,"html.parser").get_text(" ",strip=True)
    marker=re.search(r"Dec\s+09,\s*2026",text,re.I)
    if not marker: raise RuntimeError("December 9 2026 block not found")
    chunk=text[marker.start():marker.start()+3000]
    rows=[]
    for m in re.finditer(r"(\d\.\d{2})\s*-\s*(\d\.\d{2})\s+(\d{1,3}(?:\.\d+)?)%",chunk):
        key=(m.group(1),m.group(2))
        if key not in [(a,b) for a,b,_ in rows]: rows.append((m.group(1),m.group(2),m.group(3)))
    ranges=norm_ranges(rows)
    um=re.search(r"Updated:\s*([A-Z][a-z]{2}\s+\d{1,2},\s*2026\s+\d{2}:\d{2}[AP]M\s+EDT)",chunk)
    updated=um.group(1) if um else None
    source_date=None
    if updated:
        try: source_date=datetime.strptime(updated,"%b %d, %Y %I:%M%p EDT").date().isoformat()
        except Exception: pass
    if not source_date: raise RuntimeError("Investing.com Updated timestamp unavailable")
    return ranges, source_date, {"updated":updated,"futurePrice":(re.search(r"Future Price:\s*(\d+\.\d+)",chunk).group(1) if re.search(r"Future Price:\s*(\d+\.\d+)",chunk) else None),"basis":"CME Group 30-Day Fed Fund futures"}

def latest_fred(series):
    req=Request(FRED_URL.format(series),headers={"User-Agent":UA})
    with urlopen(req,timeout=30) as r: df=pd.read_csv(r)
    dc="DATE" if "DATE" in df.columns else df.columns[0]
    df[dc]=pd.to_datetime(df[dc],errors="coerce"); df[series]=pd.to_numeric(df[series],errors="coerce"); df=df.dropna()
    row=df.iloc[-1]; return float(row[series]),row[dc].date().isoformat()

def globex_to_yahoo(s): return s+".CBT"
def read_yahoo(symbol):
    ys=globex_to_yahoo(symbol); end=datetime.now(timezone.utc)+timedelta(days=1); start=end-timedelta(days=420)
    url=YAHOO_CHART.format(quote(ys,safe=""),int(start.timestamp()),int(end.timestamp()))
    req=Request(url,headers={"User-Agent":UA,"Accept":"application/json"})
    with urlopen(req,timeout=30) as r: j=json.loads(r.read().decode())
    result=((j.get("chart") or {}).get("result") or [None])[0]
    if not result: raise RuntimeError(f"Yahoo unavailable for {ys}")
    ts=result.get("timestamp") or []; close=((((result.get("indicators") or {}).get("quote") or [{}])[0]).get("close") or [])
    rows=[(datetime.fromtimestamp(t,timezone.utc).date().isoformat(),float(c)) for t,c in zip(ts,close) if c is not None]
    df=pd.DataFrame(rows,columns=["Date","Close"]); df["Date"]=pd.to_datetime(df["Date"]); return df.set_index("Date")

def fetch_pyfedwatch():
    fomc=get_fomc_data_fed(); ll,d1=latest_fred("DFEDTARL"); ul,d2=latest_fred("DFEDTARU")
    if d1!=d2: raise RuntimeError("FRED dates differ")
    fw=FedWatch(watch_date=today_iso(),fomc_dates=fomc,num_upcoming=4,user_func=read_yahoo)
    ex=fw.generate_hike_info(rate_cols=True,watch_rate_range=(ll,ul)); target=None
    for idx in ex.index:
        if str(idx[-1] if isinstance(idx,tuple) else idx)==TARGET_MEETING: target=idx; break
    if target is None: raise RuntimeError("target meeting absent")
    rows=[]
    for label,val in ex.loc[target].items():
        m=re.fullmatch(r"(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)",str(label))
        if m: rows.append((m.group(1),m.group(2),float(val)*100))
    return norm_ranges(rows), today_iso(), {"methodology":"pyfedwatch 1.2.0","futuresSource":"Yahoo Finance ZQ contracts","targetRateAsOf":d1}

def main():
    doc=load_doc(); errors=[]
    for name,url,fn in [
        ("CME FedWatch End-of-Day API",CME_DOC,fetch_cme),
        ("Investing.com Fed Rate Monitor",INVESTING_URL,fetch_investing),
        ("PyFedWatch methodology",PYFEDWATCH_URL,fetch_pyfedwatch),
    ]:
        try:
            ranges,source_date,meta=fn()
            # Secondary web page may be stale; keep as verified reference, not today's snapshot.
            if name=="Investing.com Fed Rate Monitor" and source_date!=today_iso():
                errors.append(f"Investing.com stale Updated date {source_date}")
                continue
            record(doc,"확인",name,url,meta=meta,ranges=ranges,source_date=source_date); save_doc(doc)
            print(f"FedWatch source={name} sourceDate={source_date} ranges={len(ranges)}"); return
        except Exception as e:
            errors.append(f"{name}: {type(e).__name__}: {e}")
    reason=" / ".join(errors)+". 검증 가능한 당일 확률을 확보하지 못해 이전 값을 최신값처럼 기록하지 않음."
    record(doc,"확인 필요",reason=reason); save_doc(doc); print(reason)

if __name__=="__main__": main()
