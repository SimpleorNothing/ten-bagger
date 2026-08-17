import fs from 'node:fs';

const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const fail=m=>{throw new Error(m)};

const marvell=readJson('marvell/data.json');
const calendar=readJson('calendar.json');
const earnings=readJson('earnings.json');

const fy28=marvell.financials.find(x=>x.fy==='FY2028E');
if(!fy28||fy28.growth!==43.5)fail('FY2028E growth must be 43.5');
if(!marvell.axes.some(a=>(a.facts||[]).some(x=>x.includes('1.4nm(A14)'))))fail('A14 roadmap missing');
if(!marvell.axes.some(a=>(a.facts||[]).some(x=>x.includes('20억달러'))))fail('NVIDIA $2B investment missing');
if(!marvell.risks.some(r=>r.title==='고객 집중'&&r.detail.includes('37%')&&r.detail.includes('82%')))fail('customer concentration metrics missing');
if(!marvell.axes.some(a=>(a.events||[]).some(e=>e.date==='2026-05-28'&&e.title.includes('$870M'))))fail('capacity disclosure date missing');
if(!marvell.axes.some(a=>(a.events||[]).some(e=>e.date==='2026-06-15'&&e.title.includes('Dan Durn'))))fail('CFO transition missing');
if(!marvell.risks.some(r=>r.detail.includes('$4.961B')))fail('debt metric missing');
if(!marvell.risks.some(r=>r.detail.includes('26.8M')&&r.detail.includes('21.778M')))fail('dilution metrics missing');
if(!marvell.axes.some(a=>a.code==='A3'&&(a.facts||[]).some(x=>x.includes('Tomahawk 6'))))fail('T100 competitive timing missing');

const mrvlCal=calendar.events.find(x=>x.tk==='MRVL'&&x.lbl.includes('FY27 Q2'));
if(!mrvlCal||mrvlCal.d!=='2026-08-28')fail('MRVL Q2 KST calendar event missing');
if(!calendar.events.some(x=>x.tk==='MRVL'&&x.d==='2026-10-06'&&x.lbl.includes('Investor Day')))fail('MRVL Investor Day missing');
if(!earnings.moves?.MRVL||earnings.moves.MRVL.date!=='2026-08-27'||earnings.moves.MRVL.basis!=='event-iv')fail('MRVL earnings gate missing');
if(Object.keys(earnings.moves).some(k=>k!=='MRVL'))fail('expired earnings events remain');

const clock=fs.readFileSync('company-clock.js','utf8');
if(!clock.includes("fetch('/gamma.json?t='")||!clock.includes("cache:'no-store'"))fail('company clock must read gamma.json no-store');
if(!clock.includes('fy1.c30')||!clock.includes('fy1.c90')||!clock.includes('px.c30')||!clock.includes('px.c90'))fail('30/90 day clocks missing');
const company=fs.readFileSync('company.js','utf8');
if(company.includes('<iframe')||/createElement\(['"]iframe['"]\)/.test(company))fail('iframe regression in company analysis');

console.log('company analysis integrity: OK');
