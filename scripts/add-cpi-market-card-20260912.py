from pathlib import Path
import json

root=Path('.')

# 1) 01 market CPI card, using official release metadata + CPI series as the render source.
p=root/'trade.js'; s=p.read_text(encoding='utf-8')
if 'function mountCpi()' not in s:
    marker='\n  function mountPpi() {\n'
    if marker not in s: raise SystemExit('trade.js CPI insert marker missing')
    insert=r'''
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
'''
    s=s.replace(marker,'\n'+insert+marker,1)
    s=s.replace('mount(); mountGlobalSemi(); mountChinaTrade(); mountSteo(); mountPpi(); mountEiaWeekly();','mount(); mountGlobalSemi(); mountChinaTrade(); mountSteo(); mountCpi(); mountPpi(); mountEiaWeekly();')
    s=s.replace("var a=mount(), b=mountGlobalSemi(), c=mountChinaTrade(), d=mountSteo(), e=mountPpi(), f=mountEiaWeekly(); if ((a && b && c && d && e && f)","var a=mount(), b=mountGlobalSemi(), c=mountChinaTrade(), d=mountSteo(), e=mountCpi(), f=mountPpi(), g=mountEiaWeekly(); if ((a && b && c && d && e && f && g)")
    p.write_text(s,encoding='utf-8')

# 2) Current official release metadata for the new card.
release={
  'registeredAt':'2026-09-11',
  'sourceUrl':'https://www.bls.gov/news.release/cpi.nr0.htm',
  'latest':{
    'ym':'2026-08','monthLabel':'8월','prevMonthLabel':'7월',
    'headlineMom':0.4,'headlineYoy':3.4,'coreMom':0.3,'coreYoy':2.4,
    'prevHeadlineMom':0.1,'prevHeadlineYoy':3.4,'prevCoreYoy':2.5
  }
}
(root/'cpi_release.json').write_text(json.dumps(release,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# 3) Make future BLS CPI sync write the card metadata every release.
p=root/'scripts/sync-us-cpi-release.mjs'; s=p.read_text(encoding='utf-8')
needle="write('cpi.json',cpi,true);"
if "write('cpi_release.json'" not in s:
    repl=needle+"\nconst prevMonthName=month===1?'12월':`${month-1}월`;\nwrite('cpi_release.json',{registeredAt:releaseDate,sourceUrl:URL,latest:{ym,monthLabel:`${month}월`,prevMonthLabel:prevMonthName,headlineMom,headlineYoy,coreMom,coreYoy,prevHeadlineMom:null,prevHeadlineYoy:prev?.[1]??null,prevCoreYoy:null}},false);"
    if needle not in s: raise SystemExit('sync CPI cpi.json write marker missing')
    s=s.replace(needle,repl,1)
# Preserve explicitly known prior-month release fields for the current release; future values remain null rather than guessed.
s=s.replace("prevHeadlineMom:null,prevHeadlineYoy:prev?.[1]??null,prevCoreYoy:null","prevHeadlineMom:(ym==='2026-08'?0.1:null),prevHeadlineYoy:prev?.[1]??null,prevCoreYoy:(ym==='2026-08'?2.5:null)")
s=s.replace("check.consumers=['01 CPI 현재값+cpi.json 시계열'","check.consumers=['01 CPI 카드(cpi_release.json)+cpi.json 시계열'")
p.write_text(s,encoding='utf-8')

# 4) Future CPI workflow: commit release metadata and validate dynamically, not with one hard-coded month.
p=root/'.github/workflows/update-cpi.yml'; s=p.read_text(encoding='utf-8')
s=s.replace("const c=JSON.parse(fs.readFileSync('cpi.json','utf8'));\n          const last=c.series.us.at(-1); if(last[0]!=='2026-08-01'||last[1]!==3.4) throw new Error('CPI series endpoint mismatch');", "const c=JSON.parse(fs.readFileSync('cpi.json','utf8')); const rel=JSON.parse(fs.readFileSync('cpi_release.json','utf8'));\n          const last=c.series.us.at(-1); if(!rel.latest||last[0]!==rel.latest.ym+'-01'||last[1]!==rel.latest.headlineYoy) throw new Error('CPI series/release endpoint mismatch');")
s=s.replace("          const p=JSON.parse(fs.readFileSync('pulse.json','utf8')); const r=p.drivers.find(x=>x.ax==='rates'); if(!r||!r.l1.includes('8월 CPI')||!r.l1.includes('+0.4%')||!r.l1.includes('+3.4%')) throw new Error('pulse CPI mismatch');", "          const p=JSON.parse(fs.readFileSync('pulse.json','utf8')); const r=p.drivers.find(x=>x.ax==='rates'); if(!r||!r.l1.includes('CPI')||!r.l1.includes(String(rel.latest.headlineYoy))) throw new Error('pulse CPI mismatch');")
s=s.replace("          const cal=JSON.parse(fs.readFileSync('calendar.json','utf8')); const ev=cal.events.find(x=>x.lbl==='美 CPI · 8월분'); if(!ev||!ev.meta.includes('+0.4%')||!ev.meta.includes('+3.4%')||!ev.meta.includes('+2.4%')) throw new Error('calendar CPI mismatch');", "          const cal=JSON.parse(fs.readFileSync('calendar.json','utf8')); const ev=cal.events.find(x=>x.lbl==='美 CPI · '+Number(rel.latest.ym.slice(5))+'월분'); if(!ev||!ev.meta.includes(String(rel.latest.headlineYoy))||!ev.meta.includes(String(rel.latest.coreYoy))) throw new Error('calendar CPI mismatch');")
s=s.replace("          const sig=JSON.parse(fs.readFileSync('signal_log.json','utf8')); if(!sig.log.some(x=>x.source==='BLS CPI August 2026 공식 발표')) throw new Error('signal log CPI missing');", "          const sig=JSON.parse(fs.readFileSync('signal_log.json','utf8')); if(!sig.log.some(x=>(x.source||'').startsWith('BLS CPI ')&&x.source.endsWith(' 공식 발표'))) throw new Error('signal log CPI missing');")
s=s.replace('FILES="cpi.json calendar.json','FILES="cpi.json cpi_release.json calendar.json')
p.write_text(s,encoding='utf-8')

# 5) Production verifier: 01 card + cpi.json endpoint, plus PPI/EIA regressions.
verify='''name: Verify periodic release live

on:
  workflow_run:
    workflows: ["Deploy to Cloudflare Workers"]
    types: [completed]
  workflow_dispatch: {}

permissions:
  contents: read

jobs:
  verify:
    if: ${{ github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    env:
      SITE_PASSWORD: ${{ secrets.SITE_PASSWORD }}
    steps:
      - name: Verify CPI, PPI and EIA live JSON, cards and charts
        run: |
          set -euo pipefail
          if [ -z "${SITE_PASSWORD:-}" ]; then echo 'ERROR: SITE_PASSWORD required'; exit 1; fi
          mkdir -p /tmp/periodic-live && cd /tmp/periodic-live
          npm init -y >/dev/null 2>&1
          npm install playwright@1.55.0 >/dev/null 2>&1
          npx playwright install chromium >/dev/null 2>&1
          cat > check.js <<'NODE'
          const { chromium } = require('playwright');
          const BASE='https://simpleornothing.com', pw=process.env.SITE_PASSWORD;
          (async()=>{
            const browser=await chromium.launch({headless:true});
            const context=await browser.newContext({viewport:{width:1440,height:2200}});
            const auth=await context.request.post(BASE+'/__auth',{form:{password:pw},timeout:30000}); if(!auth.ok()) throw new Error('site auth failed '+auth.status());
            const get=async p=>{const r=await context.request.get(BASE+'/'+p+'?t='+Date.now(),{timeout:30000,headers:{'Cache-Control':'no-cache'}}); if(!r.ok())throw new Error(p+' HTTP '+r.status()); return r.json();};
            const cpi=await get('cpi.json'), rel=await get('cpi_release.json'), ppi=await get('ppi.json'), eia=await get('eia_weekly.json');
            const us=cpi.series?.us||[], last=us.at(-1), prev=us.at(-2), z=rel.latest;
            console.log('LIVE CPI JSON',JSON.stringify({last,prev,release:z,asOf:cpi.asOf},null,2));
            if(!z||last?.[0]!==z.ym+'-01'||last?.[1]!==z.headlineYoy) throw new Error('live CPI series/release mismatch');
            if(z.ym!=='2026-08'||z.headlineMom!==0.4||z.headlineYoy!==3.4||z.coreMom!==0.3||z.coreYoy!==2.4||z.prevHeadlineMom!==0.1||z.prevCoreYoy!==2.5) throw new Error('live CPI official values mismatch');
            if(ppi.latest?.ym!=='2026-08'||ppi.latest?.headlineMom!==0.4||ppi.latest?.headlineYoy!==5.4) throw new Error('live PPI regression mismatch');
            if(eia.latest?.weekEnding!=='2026-09-04'||eia.latest?.commercialCrudeMb!==424.069) throw new Error('live EIA regression mismatch');
            const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
            await page.goto(BASE+'/?periodic-smoke='+Date.now(),{waitUntil:'domcontentloaded',timeout:90000});
            await page.waitForSelector('#nav .tab[data-v="market"]',{state:'visible',timeout:30000}); await page.click('#nav .tab[data-v="market"]');
            for(const id of ['#mkt_us_cpi','#mkt_us_ppi','#mkt_eia_weekly_crude']) await page.waitForSelector(id,{state:'visible',timeout:45000});
            await page.waitForFunction(()=>{const t=document.querySelector('#mkt_us_cpi')?.innerText||'';return t.includes('+0.4% MoM')&&t.includes('YoY +3.4%')&&t.includes('7월 +0.1%→8월 +0.4%')&&t.includes('근원 +0.3% MoM / +2.4% YoY')&&t.includes('2026-08');},{timeout:45000});
            const result=await page.evaluate(()=>{const out={};for(const id of ['mkt_us_cpi','mkt_us_ppi','mkt_eia_weekly_crude']){const el=document.getElementById(id),r=el?.getBoundingClientRect();out[id]={visible:!!el&&!!r&&r.width>0&&r.height>0,text:(el?.innerText||'').trim(),hasSvg:!!el?.querySelector('svg')};}return out;});
            console.log('LIVE PERIODIC CARDS',JSON.stringify(result,null,2));
            for(const [id,x] of Object.entries(result)) if(!x.visible||!x.hasSvg) throw new Error(id+' card/chart not rendered');
            const fatal=errors.filter(e=>/SyntaxError|cpi|ppi|eia_weekly|mkt_us_cpi|mkt_us_ppi|mkt_eia/i.test(e)); if(fatal.length) throw new Error('production browser errors '+JSON.stringify(fatal));
            await browser.close();
          })().catch(e=>{console.error(e);process.exit(1)});
          NODE
          node check.js
'''
(root/'.github/workflows/verify-periodic-live.yml').write_text(verify,encoding='utf-8')

# 6) Audit consumer inventory reflects the actual 01 card and render source.
for fp in [root/'periodic_release_check.json',root/'audit/official-release-checks/2026-09-12.json']:
    if fp.exists():
        j=json.loads(fp.read_text(encoding='utf-8'))
        j['consumers']=['01 CPI 카드(cpi_release.json)+cpi.json 시계열','calendar.json','pulse.json','cycle.json','risk.json','02 signal_log.json','04 council-context shared pulse/cycle/signal_log','changelog.js']
        j['liveVerification']={'status':'pending','verifiedAt':None,'checks':['simpleornothing.com authenticated browser','cpi_release.json official values','cpi.json latest series endpoint','01 CPI card latest value/prior comparison/interpretation/SVG chart']}
        fp.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

print('patched CPI 01 card + release metadata + future sync + live verifier')
