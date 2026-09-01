import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const fail=m=>{throw new Error(m)};

const marvell=readJson('marvell/data.json');
const lumentum=readJson('lumentum/data.json');
const micron=readJson('micron/data.json');
const vertiv=readJson('vertiv/data.json');
const nvidia=readJson('nvidia/data.json');
const broadcom=readJson('broadcom/data.json');
const calendar=readJson('calendar.json');
const earnings=readJson('earnings.json');
const companyTabs=fs.readFileSync('company.js','utf8');

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
validateCompanySchema('MU',micron);
validateCompanySchema('VRT',vertiv);
validateCompanySchema('NVDA',nvidia);
validateCompanySchema('AVGO',broadcom);

for(const [name,id,d] of [['MU','micron',micron],['VRT','vertiv',vertiv],['NVDA','nvidia',nvidia],['AVGO','broadcom',broadcom]]){
  if(d.company.ticker!==name)fail(name+': ticker mismatch');
  if(!Array.isArray(d.headlineKpis)||d.headlineKpis.length<4)fail(name+': headline KPI set missing');
  if(!Array.isArray(d.axes)||d.axes.length<4)fail(name+': strategy axes missing');
  if(!Array.isArray(d.quarterly?.rows)||d.quarterly.rows.length<5)fail(name+': quarterly series missing');
  for(const [i,r] of d.quarterly.rows.entries()){
    if(typeof r.period!=='string'||typeof r.cy!=='string')fail(name+': quarterly['+i+'] period/cy missing');
    if(!['actual','guidance','derived'].includes(r.kind))fail(name+': quarterly['+i+'] kind invalid');
    if(r.revenue!==null&&typeof r.revenue!=='number')fail(name+': quarterly['+i+'] revenue must be number/null');
    if(r.operatingIncome!==null&&typeof r.operatingIncome!=='number')fail(name+': quarterly['+i+'] operatingIncome must be number/null');
  }
  if(!d.sources.some(s=>String(s.url||'').startsWith('https://')))fail(name+': official source URL missing');
if(!companyTabs.includes("id:'"+id+"'")||!companyTabs.includes("data:'/"+id+"/data.json'"))fail(name+': company tab registration missing');
}

const avgoQ2=broadcom.quarterly.rows.find(x=>x.period==='FY26 Q2');
if(!avgoQ2||avgoQ2.revenue!==22.187||avgoQ2.operatingIncome!==10.788||avgoQ2.kind!=='actual')fail('AVGO FY26 Q2 GAAP actuals missing');
const avgoQ3=broadcom.quarterly.rows.find(x=>x.period==='FY26 Q3E');
if(!avgoQ3||avgoQ3.revenue!==29.4||avgoQ3.operatingIncome!==null||avgoQ3.kind!=='guidance')fail('AVGO FY26 Q3 guidance missing');
if(!broadcom.headlineKpis.some(k=>k.label.includes('AI 반도체')&&k.value==='$10.8B'))fail('AVGO AI semiconductor KPI missing');
if(!broadcom.axes.some(a=>a.code==='A5'&&(a.facts||[]).some(x=>x.includes('42%'))))fail('AVGO customer concentration missing');
if(!broadcom.sources.some(s=>s.type==='SEC 10-Q'))fail('AVGO SEC source missing');

const fy28=marvell.financials.find(x=>x.fy==='FY2028E');
if(!fy28||fy28.revenue!==18.0||fy28.growth!==50.0)fail('FY2028E raised outlook must be $18.0B / 50.0%');
const mrvlQuarters=marvell.quarterly?.rows;
if(!Array.isArray(mrvlQuarters)||mrvlQuarters.length!==8)fail('MRVL FY26 Q1 through FY27 Q4 quarterly series missing');
const q2fy27=mrvlQuarters.find(x=>x.period==='FY27 Q2');
if(!q2fy27||q2fy27.kind!=='actual'||q2fy27.revenue!==2.739||q2fy27.operatingIncome!==0.460)fail('MRVL FY27 Q2 GAAP actuals missing');
const q3fy27=mrvlQuarters.find(x=>x.period==='FY27 Q3E');
if(!q3fy27||q3fy27.kind!=='guidance'||q3fy27.revenue!==3.150||q3fy27.operatingIncome!==0.667)fail('MRVL FY27 Q3 guidance midpoint calculation missing');
const q4fy27=mrvlQuarters.find(x=>x.period==='FY27 Q4E');
if(!q4fy27||q4fy27.kind!=='derived'||q4fy27.revenue!==3.693||q4fy27.operatingIncome!==null)fail('MRVL FY27 Q4 implied revenue / undisclosed GAAP operating income missing');
const liteQuarters=lumentum.quarterly?.rows;
if(!Array.isArray(liteQuarters)||liteQuarters.length!==8)fail('LITE CY25.1Q through CY26.4Q quarterly series missing');
const liteExpectedCy=['CY25.1Q 대응','CY25.2Q 대응','CY25.3Q 대응','CY25.4Q 대응','CY26.1Q 대응','CY26.2Q 대응','CY26.3Q 대응','CY26.4Q 대응'];
if(liteQuarters.map(x=>x.cy).join('|')!==liteExpectedCy.join('|'))fail('LITE quarterly CY ordering missing');
const liteQuarterMap=Object.fromEntries(liteQuarters.map(x=>[x.cy,x]));
const liteActuals=[
  ['CY25.1Q 대응',0.4252,-0.0377],
  ['CY25.2Q 대응',0.4807,-0.0084],
  ['CY25.3Q 대응',0.5338,0.0067],
  ['CY25.4Q 대응',0.6655,0.0643],
  ['CY26.1Q 대응',0.8084,0.1745],
  ['CY26.2Q 대응',1.0063,0.2793]
];
for(const [cy,revenue,operatingIncome] of liteActuals){
  const row=liteQuarterMap[cy];
  if(!row||row.kind!=='actual'||row.revenue!==revenue||row.operatingIncome!==operatingIncome)fail('LITE '+cy+' GAAP actuals missing');
}
const liteQ1e=liteQuarterMap['CY26.3Q 대응'];
if(!liteQ1e||liteQ1e.period!=='FY27 Q1E'||liteQ1e.kind!=='guidance'||liteQ1e.revenue!==1.25||liteQ1e.operatingIncome!==null)fail('LITE FY27 Q1 guidance midpoint / undisclosed GAAP operating income missing');
const liteQ2e=liteQuarterMap['CY26.4Q 대응'];
if(!liteQ2e||liteQ2e.period!=='FY27 Q2E'||liteQ2e.kind!=='guidance'||liteQ2e.revenue!==null||liteQ2e.operatingIncome!==null)fail('LITE FY27 Q2 undisclosed guidance slot missing');
if(!Array.isArray(lumentum.quarterly?.notes)||!lumentum.quarterly.notes.some(x=>x.includes('FY27 Q2E')&&x.includes('미공시')))fail('LITE quarterly undisclosed-guidance note missing');
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
const mrvlCompleted=String(mrvlCal.meta||'').includes('발표 확인');
if(mrvlCompleted){
  if(earnings.moves?.MRVL)fail('expired MRVL earnings gate remains after completed event');
}else if(!earnings.moves?.MRVL||earnings.moves.MRVL.date!=='2026-08-27'||earnings.moves.MRVL.basis!=='event-iv'){
  fail('MRVL earnings gate missing');
}
if(Object.keys(earnings.moves).some(k=>k!=='MRVL'))fail('expired earnings events remain');

const clock=fs.readFileSync('company-clock.js','utf8');
if(!clock.includes("fetch('/gamma.json?t='")||!clock.includes("cache:'no-store'"))fail('company clock must read gamma.json no-store');
if(!clock.includes('fy1.c30')||!clock.includes('fy1.c90')||!clock.includes('px.c30')||!clock.includes('px.c90'))fail('30/90 day clocks missing');
const company=fs.readFileSync('company.js','utf8');
if(company.includes('<iframe')||/createElement\(['"]iframe['"]\)/.test(company))fail('iframe regression in company analysis');
if(!company.includes('quarterlyHtml(d.quarterly')||!company.includes('ca-qchart')||!company.includes('ca-q-plot')||!company.includes('ca-q-yaxis')||!company.includes('ca-q-columns')||!company.includes('ca-q-zero')||!company.includes('ca-q-negative')||!company.includes('분기별')||!company.includes('ca-q-bar-rev')||!company.includes('ca-q-bar-op')||!company.includes('분기 실적·전망')||!company.includes('GAAP · $B'))fail('quarterly grouped bar-chart renderer missing');
const patch=fs.readFileSync('company-patch.js','utf8');
if(!patch.includes("fetchJson('/gamma.json')")||!patch.includes("cache:'no-store'"))fail('company patch must read gamma.json no-store');
if(!patch.includes("typeof CANDIDATES!=='undefined'")||!patch.includes("typeof CASCADES!=='undefined'"))fail('company stage SoT runtime sync missing');
if(!patch.includes('minimumFractionDigits:1')||!patch.includes('maximumFractionDigits:3'))fail('company revenue precision formatter missing');
const loader=fs.readFileSync('site-change-live.js','utf8');
if(!loader.includes('data-company-patch-loader')||!loader.includes('/company-patch.js'))fail('company patch loader missing');
execFileSync(process.execPath,['--check','company-patch.js'],{stdio:'inherit'});

console.log('company analysis integrity: OK');
