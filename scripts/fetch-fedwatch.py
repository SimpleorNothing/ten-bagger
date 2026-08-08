#!/usr/bin/env python3
import io,json,re,sys,zipfile
from datetime import datetime,timezone
from urllib.request import Request,urlopen
from xml.etree import ElementTree as ET
OUT="fedwatch.json";URL="https://www.cmegroup.com/CmeWS/mvc/fedwatch/meetings/all/upcoming.xlsx";NS={"m":"http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
def txt(n): return "".join(n.itertext()).strip() if n is not None else ""
def sheets():
 req=Request(URL,headers={"User-Agent":"Mozilla/5.0 (compatible; ten-bagger/1.0)","Accept":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})
 with urlopen(req,timeout=40) as r: raw=r.read()
 z=zipfile.ZipFile(io.BytesIO(raw));shared=[]
 if "xl/sharedStrings.xml" in z.namelist(): shared=[txt(x) for x in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si",NS)]
 out=[]
 for name in z.namelist():
  if re.fullmatch(r"xl/worksheets/sheet\d+\.xml",name):
   rows=[]
   for row in ET.fromstring(z.read(name)).findall(".//m:sheetData/m:row",NS):
    vals=[]
    for c in row.findall("m:c",NS):
     v=txt(c.find("m:v",NS));vals.append(shared[int(v)] if c.get("t")=="s" and v.isdigit() and int(v)<len(shared) else v)
    rows.append(vals)
   out.append(rows)
 return out
def parse(rows):
 cands=[]
 for i,row in enumerate(rows):
  if not re.search(r"\b(?:9|10)\s+Dec\s?26\b|\bDec(?:ember)?\s+2026\b|\bDec26\b"," ".join(row),re.I): continue
  ps=[]
  for cells in rows[i:min(i+45,len(rows))]:
   line=" ".join(cells);m=re.search(r"\b(\d{2,3})\s*[-–]\s*(\d{2,3})\b",line)
   if not m: continue
   nums=re.findall(r"(\d+(?:\.\d+)?)\s*%?",line[m.end():])
   if nums and 0<=float(nums[0])<=100: ps.append({"label":f"{int(m.group(1))/100:.2f}%–{int(m.group(2))/100:.2f}%","low":int(m.group(1))/100,"high":int(m.group(2))/100,"probability":float(nums[0])})
  if len(ps)>=2 and 98<=sum(x["probability"] for x in ps)<=102:cands.append(ps)
 if not cands: raise ValueError("Dec-2026 probability table not found")
 return max(cands,key=len)
def main():
 ranges=None
 for rows in sheets():
  try:ranges=parse(rows);break
  except ValueError:pass
 if not ranges:raise RuntimeError("CME December 2026 FedWatch data unavailable")
 expected=sum(((x["low"]+x["high"])/2)*x["probability"]/100 for x in ranges);today=datetime.now(timezone.utc).date().isoformat()
 try:doc=json.load(open(OUT,encoding="utf-8"))
 except Exception:doc={"meeting":"2026-12 FOMC","source":"CME FedWatch","history":[]}
 hist=[x for x in doc.get("history",[]) if x.get("date")!=today];hist.append({"date":today,"expectedRate":round(expected,4),"ranges":ranges})
 doc.update({"meeting":"2026-12 FOMC","source":"CME FedWatch","sourceUrl":"https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html","asOf":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"history":hist[-370:]})
 with open(OUT,"w",encoding="utf-8") as f:json.dump(doc,f,ensure_ascii=False,separators=(",",":"));f.write("\n")
 print(f"FedWatch Dec-2026: {len(ranges)} ranges, expected {expected:.2f}%")
if __name__=="__main__":
 try:main()
 except Exception as e:print(f"ERROR: {e}",file=sys.stderr);sys.exit(1)
