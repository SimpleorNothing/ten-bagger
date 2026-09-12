from pathlib import Path
p=Path('.github/workflows/verify-periodic-live.yml')
s=p.read_text(encoding='utf-8')
needle="            const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(String(e)));"
block="""            const taResp=await context.request.get(BASE+'/treasury_auctions.json?t='+Date.now(),{timeout:30000,headers:{'Cache-Control':'no-cache'}});\n            if(!taResp.ok()) throw new Error('live treasury_auctions.json HTTP '+taResp.status());\n            const ta=await taResp.json();\n            const ae={'3-Year':['2026-09-08',4.474,2.72,62.1],'10-Year':['2026-09-09',4.834,2.71,79.2],'30-Year':['2026-09-10',5.308,2.61,79.5]};\n            for(const [k,v] of Object.entries(ae)){const z=ta.latest?.[k];if(!z||z.auctionDate!==v[0]||z.highYieldPct!==v[1]||z.bidToCover!==v[2]||z.indirectSharePct!==v[3]) throw new Error('live '+k+' Treasury auction mismatch '+JSON.stringify(z));}\n            const tap=ta.previous?.['30-Year']; if(!tap||tap.auctionDate!=='2026-08-13'||tap.highYieldPct!==5.216||tap.bidToCover!==2.39) throw new Error('live 30Y previous auction mismatch '+JSON.stringify(tap));\n            const tas=(ta.series?.['30-Year']||[]), tal=tas.at(-1); if(tal?.auctionDate!=='2026-09-10'||tal?.highYieldPct!==5.308) throw new Error('live 30Y auction series endpoint mismatch');\n"""+needle
if "live treasury_auctions.json HTTP" not in s:
    if needle not in s: raise SystemExit('page marker missing')
    s=s.replace(needle,block,1)
s=s.replace("['#mkt_us_cpi','#mkt_us_ppi','#mkt_eia_weekly_crude','#mkt_us_treasury_budget']","['#mkt_us_cpi','#mkt_us_ppi','#mkt_eia_weekly_crude','#mkt_us_treasury_budget','#mkt_us_treasury_auctions']")
wait="""            await page.waitForFunction(()=>{const t=document.querySelector('#mkt_us_treasury_auctions')?.innerText||''; return t.includes('30Y 5.308%')&&t.includes('BTC 2.61')&&t.includes('직전 5.216% / 2.39')&&t.includes('10Y 4.834%')&&t.includes('3Y 4.474%')&&t.includes('30Y 간접낙찰 79.5%')&&t.includes('2026-09-10');},{timeout:45000});\n"""
marker="            const result=await page.evaluate(()=>{const out={};"
if "30Y 간접낙찰 79.5%" not in s:
    if marker not in s: raise SystemExit('result marker missing')
    s=s.replace(marker,wait+marker,1)
s=s.replace("['mkt_us_cpi','mkt_us_ppi','mkt_eia_weekly_crude','mkt_us_treasury_budget']","['mkt_us_cpi','mkt_us_ppi','mkt_eia_weekly_crude','mkt_us_treasury_budget','mkt_us_treasury_auctions']")
s=s.replace("treasury_budget|mkt_us_cpi", "treasury_budget|treasury_auctions|mkt_us_cpi")
s=s.replace("mkt_us_treasury/i", "mkt_us_treasury/i")
p.write_text(s,encoding='utf-8')
