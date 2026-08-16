import fs from 'node:fs';
import path from 'node:path';

const GAMMA='gamma.json';
const OUT_ROOT='raw/revisions';
const UA={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'};
const MODULES='financialData,earningsTrend,recommendationTrend,upgradeDowngradeHistory';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const num=(v)=>{const x=(v&&typeof v==='object')?v.raw:v;return (typeof x==='number'&&isFinite(x))?x:null;};
const r2=(x)=>x==null?null:+x.toFixed(2);
const r1=(x)=>x==null?null:+x.toFixed(1);
const chgPct=(now,then)=>(now==null||then==null||then<=0)?null:r1(((now/then)-1)*100);

function symbol(ticker,mkt){
  switch(mkt){
    case 'KR': case 'KOSPI': return ticker+'.KS';
    case 'KOSDAQ': return ticker+'.KQ';
    case 'EU': return ticker+'.AS';
    case 'TWSE': return ticker+'.TW';
    case 'TSE': return ticker+'.T';
    default:return ticker;
  }
}

let cookie='',crumb='';
async function auth(){
  try{const r=await fetch('https://fc.yahoo.com',{headers:UA});const sc=r.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0];}catch{}
  try{const r=await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb',{headers:{...UA,...(cookie?{Cookie:cookie}:{})}});if(r.ok){const t=(await r.text()).trim();if(t&&t.length<40&&!t.includes('<'))crumb=t;}}catch{}
}

async function fetchSource(sym){
  const q=crumb?`&crumb=${encodeURIComponent(crumb)}`:'';
  const url=`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=${MODULES}${q}`;
  const r=await fetch(url,{headers:{...UA,...(cookie?{Cookie:cookie}:{})}});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const j=await r.json();
  const res=j?.quoteSummary?.result?.[0];
  if(!res)throw new Error('no quoteSummary.result');
  return {url,res};
}

function epsOne(arr,p){
  const t=Array.isArray(arr)?arr.find(x=>x?.period===p):null;
  if(!t)return null;
  const et=t.epsTrend||{},er=t.epsRevisions||{};
  const now=num(et.current),d7=num(et['7daysAgo']),d30=num(et['30daysAgo']),d60=num(et['60daysAgo']),d90=num(et['90daysAgo']);
  return {
    period:p,endDate:t.endDate||null,
    epsTrend:{current:r2(now),'7daysAgo':r2(d7),'30daysAgo':r2(d30),'60daysAgo':r2(d60),'90daysAgo':r2(d90)},
    epsRevisionPct:{d7:chgPct(now,d7),d30:chgPct(now,d30),d90:chgPct(now,d90)},
    epsRevisions:{upLast7days:num(er.upLast7days),downLast7days:num(er.downLast7days),upLast30days:num(er.upLast30days),downLast30days:num(er.downLast30days),downLast90days:num(er.downLast90days)},
    revenueEstimateAvg:r2(num(t.revenueEstimate?.avg)),
  };
}

function normalize(sym,url,res,retrievedAt){
  const fd=res?.financialData||{};
  const arr=res?.earningsTrend?.trend||[];
  return {
    schema:'revision-source-v1',
    provider:'Yahoo Finance',
    sourceType:'provider quoteSummary',
    sourceUrl:url.replace(/&crumb=[^&]+/,'&crumb=<redacted>'),
    symbol:sym,
    retrievedAt,
    financialData:{
      currentPrice:r2(num(fd.currentPrice)),targetMeanPrice:r2(num(fd.targetMeanPrice)),targetHighPrice:r2(num(fd.targetHighPrice)),targetLowPrice:r2(num(fd.targetLowPrice)),
      recommendationMean:r2(num(fd.recommendationMean)),numberOfAnalystOpinions:num(fd.numberOfAnalystOpinions)
    },
    earningsTrend:{fy1:epsOne(arr,'+1y'),fy0:epsOne(arr,'0y'),q1:epsOne(arr,'+1q')},
    recommendationTrend:Array.isArray(res?.recommendationTrend?.trend)?res.recommendationTrend.trend.slice(0,4).map(x=>({period:x?.period||null,strongBuy:num(x?.strongBuy),buy:num(x?.buy),hold:num(x?.hold),sell:num(x?.sell),strongSell:num(x?.strongSell)})):[],
    upgradeDowngradeHistory:Array.isArray(res?.upgradeDowngradeHistory?.history)?res.upgradeDowngradeHistory.history.slice(0,10).map(x=>({epochGradeDate:num(x?.epochGradeDate),firm:x?.firm||null,toGrade:x?.toGrade||null,fromGrade:x?.fromGrade||null,action:x?.action||null})):[]
  };
}

const g=JSON.parse(fs.readFileSync(GAMMA,'utf8'));
const day=new Date().toISOString().slice(0,10);
const dir=path.join(OUT_ROOT,day);fs.mkdirSync(dir,{recursive:true});
await auth();
let ok=0,fail=0;
for(const [tk,e] of Object.entries(g.gamma||{})){
  const sym=symbol(tk,e.mkt||'US');
  try{
    const retrievedAt=new Date().toISOString();
    const {url,res}=await fetchSource(sym);
    const snap=normalize(sym,url,res,retrievedAt);
    const ref=path.join(dir,`${tk}.json`).replaceAll('\\','/');
    fs.writeFileSync(ref,JSON.stringify(snap,null,2)+'\n');
    e.rev=e.rev||{};
    e.rev.provenance={provider:'Yahoo Finance',sourceUrl:snap.sourceUrl,retrievedAt,rawRef:ref,schema:snap.schema};
    ok++;
    console.log(`SOURCE ${tk} -> ${ref}`);
  }catch(err){
    if(e.rev)delete e.rev.provenance;
    fail++;
    console.log(`SOURCE FAIL ${tk}: ${err.message}`);
  }
  await sleep(250);
}
fs.writeFileSync(GAMMA,JSON.stringify(g,null,2)+'\n');
console.log(`revision provenance: ${ok} ok, ${fail} failed`);
