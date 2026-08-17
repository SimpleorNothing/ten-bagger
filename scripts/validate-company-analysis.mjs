import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const fail=m=>{throw new Error(m)};

const marvell=readJson('marvell/data.json');
const lumentum=readJson('lumentum/data.json');
const calendar=readJson('calendar.json');
const earnings=readJson('earnings.json');

function validateCompanySchema(name,d){
  if(!d||!d.company||!Array.isArray(d.financials)||!Array.isArray(d.risks)||!Array.isArray(d.sources))fail(name+': base schema missing');
  d.financials.forEach((r,i)=>{
    if(!Object.prototype.hasOwnProperty.call(r,'growth'))fail(name+': financials['+i+'].growth missing');
    if(Object.prototype.hasOwnProperty.call(r,'yoy'))fail(name+': legacy financials['+i+'].yoy forbidden');
  });
  d.risks.forEach((r,i)=>{
    if(typeof r.detail!=='string'||!r.detail.trim())fail(name+': risks['+i+'].detail missing');
    if(Object.prototype.hasOwnProperty.call(r,'text'))fail(name+': legacy risks['+i+'].text forbidden');
  });
  d.sources.forEach((s,i)=>{
    if(typeof s.label!=='string'||!s.label.trim())fail(name+': sources['+i+'].label missing');
    if(Object.prototype.hasOwnProperty.call(s,'name'))fail(name+': legacy sources['+i+'].name forbidden');
  });
  const v=d.visibility||{};
  if(typeof v.headline!=='string'||!Array.isArray(v.facts)||typeof v.next!=='string')fail(name+': visibility headline/facts/next contract missing');
  if(Object.prototype.hasOwnProperty.call(v,'disclosed')||Object.prototype.hasOwnProperty.call(v,'caveat'))fail(name+': legacy visibility disclosed/caveat forbidden');
}

validateCompanySchema('MRVL',marvell);
validateCompanySchema('LITE',lumentum);

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

const lite26=lumentum.financials.find(x=>x.fy==='FY2026');
if(!lite26||lite26.growth!==83.2||lite26.opMargin!==17.4||lite26.netMargin!==-230.1)fail('LITE FY2026 GAAP financials missing');
if(!String(lite26.note||'').includes('$7.8B')||!String(lite26.note||'').includes('비현금'))fail('LITE FY2026 debt-extinguishment footnote missing');
if(!String(lumentum.company?.frame?.status||'').includes('gamma.json'))fail('LITE frame stage must defer to gamma.json');
if(!lumentum.headlineKpis.some(k=>k.label.includes('Q4 비GAAP GM')&&k.value==='50.4%'))fail('LITE Q4 gross-margin KPI missing');
if(!lumentum.headlineKpis.some(k=>k.label.includes('Q1 수익성')&&k.value.includes('39.5')&&k.note.includes('$4.05~4.35')))fail('LITE Q1 OPM/EPS guidance missing');
if(!lumentum.axes.some(a=>a.code==='A2'&&(a.facts||[]).some(x=>x.includes('nonexclusive')&&x.includes('Coherent'))))fail('LITE NVIDIA nonexclusive dual-sourcing context missing');
if(!lumentum.axes.some(a=>a.code==='A5'&&(a.facts||[]).some(x=>x.includes('Qorvo'))&&(a.facts||[]).some(x=>x.includes('retrofit'))))fail('LITE Greensboro brownfield context missing');
if(!lumentum.axes.some(a=>a.code==='A6'&&(a.facts||[]).some(x=>x.includes('78억달러'))))fail('LITE capital-structure axis missing');
if(!lumentum.sources.some(s=>s.label.includes('FY2026 Q4')&&s.type.includes('공식')))fail('LITE FY26 Q4 official source missing');
if(!lumentum.sources.some(s=>s.label.includes('FY2026 Q2')&&s.type.includes('공식')))fail('LITE FY26 Q2 official source missing');
if(lumentum.sources.some(s=>String(s.url||'').includes('marketwatch.com')))fail('LITE MarketWatch must not be primary source');

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
const patch=fs.readFileSync('company-patch.js','utf8');
if(!patch.includes("fetchJson('/gamma.json')")||!patch.includes("cache:'no-store'"))fail('company patch must read gamma.json no-store');
if(!patch.includes("typeof CANDIDATES!=='undefined'")||!patch.includes("typeof CASCADES!=='undefined'"))fail('company stage SoT runtime sync missing');
if(!patch.includes('minimumFractionDigits:1')||!patch.includes('maximumFractionDigits:3'))fail('company revenue precision formatter missing');
const loader=fs.readFileSync('site-change-live.js','utf8');
if(!loader.includes('data-company-patch-loader')||!loader.includes('/company-patch.js'))fail('company patch loader missing');
execFileSync(process.execPath,['--check','company-patch.js'],{stdio:'inherit'});

console.log('company analysis integrity: OK');
