import fs from 'node:fs';

const OUT='company_news.json';
const COMPANY_JS='company.js';
const BLOCK=/\b(price target|target price|analyst|upgrade|downgrade|rating|premarket|pre-market|should you buy|buy now|sell now|technical analysis)\b|목표가|투자의견|장전|시간외|기술적 분석/i;

function fail(msg){ console.error('company-news validation:',msg); process.exit(1); }
let d;
try{d=JSON.parse(fs.readFileSync(OUT,'utf8'));}catch(e){fail('JSON parse failed: '+e.message);}
if(d.schemaVersion!==1)fail('schemaVersion must be 1');
if(!d.checkedAt || isNaN(new Date(d.checkedAt)))fail('checkedAt invalid');
if(!Number.isInteger(d.windowDays)||d.windowDays<1||d.windowDays>90)fail('windowDays invalid');
if(!d.companies||typeof d.companies!=='object')fail('companies missing');

const js=fs.readFileSync(COMPANY_JS,'utf8');
const paths=[...js.matchAll(/data:'([^']+\/data\.json)'/g)].map((m)=>m[1].replace(/^\/+/,''));
if(!paths.length)fail('company paths not found');
const tickers=paths.map((p)=>{
  const x=JSON.parse(fs.readFileSync(p,'utf8'));
  return String(x.company&&x.company.ticker||'').toUpperCase();
}).filter(Boolean);
for(const t of tickers)if(!d.companies[t])fail(`missing company ${t}`);

for(const [ticker,c] of Object.entries(d.companies)){
  if(!c||!Array.isArray(c.items))fail(`${ticker}: items missing`);
  if(c.items.length>12)fail(`${ticker}: too many items`);
  const ids=new Set(), urls=new Set();
  for(const [i,it] of c.items.entries()){
    if(!it.id||ids.has(it.id))fail(`${ticker}[${i}]: bad/duplicate id`); ids.add(it.id);
    if(!it.title||BLOCK.test(it.title))fail(`${ticker}[${i}]: blocked/non-material title`);
    if(!it.url||urls.has(it.url))fail(`${ticker}[${i}]: bad/duplicate url`); urls.add(it.url);
    if(!it.source)fail(`${ticker}[${i}]: source missing`);
    if(!it.published||isNaN(new Date(it.published)))fail(`${ticker}[${i}]: published invalid`);
    if(!Number.isInteger(it.sourceTier)||it.sourceTier<1||it.sourceTier>2)fail(`${ticker}[${i}]: only official/trusted sourceTier allowed`);
    if(!['official','trusted-news'].includes(it.verified))fail(`${ticker}[${i}]: verified invalid`);
  }
}
console.log(`company-news validation OK: ${Object.keys(d.companies).join(', ')}`);
