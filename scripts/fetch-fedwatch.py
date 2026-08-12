#!/usr/bin/env python3
import io,json,re,sys,zipfile
from datetime import datetime,timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request,urlopen
from xml.etree import ElementTree as ET

OUT="fedwatch.json"
LEGACY_URL="https://www.cmegroup.com/CmeWS/mvc/fedwatch/meetings/all/upcoming.xlsx"
SOURCE_URL="https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html"
API_INFO_URL="https://www.cmegroup.com/market-data/market-data-api/fedwatch-api.html"
NS={"m":"http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

def now_iso():
 return datetime.now(timezone.utc).isoformat().replace("+00:00","Z")

def today_iso():
 return datetime.now(timezone.utc).date().isoformat()

def txt(n):
 return "".join(n.itertext()).strip() if n is not None else ""

def load_doc():
 try:
  with open(OUT,encoding="utf-8") as f:return json.load(f)
 except Exception:
  return {"meeting":"2026-12 FOMC","source":"CME FedWatch","history":[]}

def save_doc(doc):
 with open(OUT,"w",encoding="utf-8") as f:
  json.dump(doc,f,ensure_ascii=False,separators=(",",":"));f.write("\n")

def record_check(doc,status,reason=None):
 checked=now_iso();today=today_iso()
 checks=[x for x in doc.get("checks",[]) if x.get("date")!=today]
 item={"date":today,"checkedAt":checked,"status":status}
 if reason:item["reason"]=reason
 checks.append(item)
 doc.update({
  "meeting":"2026-12 FOMC","source":"CME FedWatch","sourceUrl":SOURCE_URL,
  "apiInfoUrl":API_INFO_URL,"checkedAt":checked,"status":status,"checks":checks[-370:]
 })
 if reason:doc["statusReason"]=reason
 else:doc.pop("statusReason",None)
 return doc

def sheets():
 req=Request(LEGACY_URL,headers={
  "User-Agent":"Mozilla/5.0 (compatible; ten-bagger/1.0)",
  "Accept":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
 })
 with urlopen(req,timeout=40) as r:raw=r.read()
 z=zipfile.ZipFile(io.BytesIO(raw));shared=[]
 if "xl/sharedStrings.xml" in z.namelist():
  shared=[txt(x) for x in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si",NS)]
 out=[]
 for name in z.namelist():
  if re.fullmatch(r"xl/worksheets/sheet\d+\.xml",name):
   rows=[]
   for row in ET.fromstring(z.read(name)).findall(".//m:sheetData/m:row",NS):
    vals=[]
    for c in row.findall("m:c",NS):
     v=txt(c.find("m:v",NS))
     vals.append(shared[int(v)] if c.get("t")=="s" and v.isdigit() and int(v)<len(shared) else v)
    rows.append(vals)
   out.append(rows)
 return out

def parse(rows):
 cands=[]
 for i,row in enumerate(rows):
  if not re.search(r"\b(?:9|10)\s+Dec\s?26\b|\bDec(?:ember)?\s+2026\b|\bDec26\b"," ".join(row),re.I):continue
  ps=[]
  for cells in rows[i:min(i+45,len(rows))]:
   line=" ".join(cells);m=re.search(r"\b(\d{2,3})\s*[-–]\s*(\d{2,3})\b",line)
   if not m:continue
   nums=re.findall(r"(\d+(?:\.\d+)?)\s*%?",line[m.end():])
   if nums and 0<=float(nums[0])<=100:
    ps.append({"label":f"{int(m.group(1))/100:.2f}%–{int(m.group(2))/100:.2f}%","low":int(m.group(1))/100,"high":int(m.group(2))/100,"probability":float(nums[0])})
  if len(ps)>=2 and 98<=sum(x["probability"] for x in ps)<=102:cands.append(ps)
 if not cands:raise ValueError("Dec-2026 probability table not found")
 return max(cands,key=len)

def main():
 doc=load_doc()
 try:
  ranges=None
  for rows in sheets():
   try:ranges=parse(rows);break
   except ValueError:pass
  if not ranges:raise RuntimeError("CME December 2026 FedWatch data unavailable")
 except (HTTPError,URLError,RuntimeError,ValueError,zipfile.BadZipFile) as e:
  reason=("CME FedWatch 기존 무료 XLSX 수집 경로를 사용할 수 없음"
          f" ({type(e).__name__}: {e}). 공식 FedWatch API는 현재 별도 API 액세스가 필요한 상품이므로 "
          "확인되지 않은 대체값이나 이전 값을 최신값처럼 기록하지 않음.")
  record_check(doc,"확인 필요",reason)
  save_doc(doc)
  print("FedWatch official snapshot unavailable; status recorded as 확인 필요")
  return
 expected=sum(((x["low"]+x["high"])/2)*x["probability"]/100 for x in ranges)
 today=today_iso();checked=now_iso()
 hist=[x for x in doc.get("history",[]) if x.get("date")!=today]
 hist.append({"date":today,"expectedRate":round(expected,4),"ranges":ranges})
 doc["history"]=hist[-370:]
 doc["asOf"]=checked
 record_check(doc,"확인")
 save_doc(doc)
 print(f"FedWatch Dec-2026: {len(ranges)} ranges, expected {expected:.2f}%")

if __name__=="__main__":
 try:main()
 except Exception as e:
  print(f"ERROR: {e}",file=sys.stderr);sys.exit(1)
