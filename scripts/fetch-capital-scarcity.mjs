// Daily AI capital-scarcity monitor.
// Primary source: U.S. Treasury daily nominal and real yield-curve CSVs (no API key).
// Optional term-premium source: FRED/NY Fed ACM; failure is non-fatal.
// Output is non-destructive: if a source fails, the last known snapshot is preserved.
import fs from 'node:fs';

const OUT='capital_scarcity.json';
const UA={'User-Agent':'Mozilla/5.0'};
const YEAR=new Date().getUTCFullYear();
const BASE='https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/'+YEAR+'/all?_format=csv&field_tdr_date_value='+YEAR+'&page=&type=';

function csvRows(txt){
  const lines=txt.replace(/^\uFEFF/,'').trim().split(/\r?\n/); if(lines.length<2)throw new Error('csv empty');
  const parse=(s)=>{const out=[];let cur='',q=false;for(let i=0;i<s.length;i++){const ch=s[i];if(ch==='"'){if(q&&s[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(ch===','&&!q){out.push(cur);cur='';}else cur+=ch;}out.push(cur);return out;};
  const head=parse(lines[0]).map(s=>s.trim());
  return lines.slice(1).map(line=>{const a=parse(line),o={};head.forEach((h,i)=>o[h]=(a[i]??'').trim());return o;});
}
async function treasury(type){
  const r=await fetch(BASE+encodeURIComponent(type),{headers:UA,signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw new Error('Treasury '+type+' HTTP '+r.status);
  return csvRows(await r.text());
}
function pick10y(rows){
  const k=Object.keys(rows[0]||{}).find(x=>/^10\s*yr$/i.test(x)||/^10-year$/i.test(x)||/^10 year$/i.test(x));
  if(!k)throw new Error('10Y column missing');
  return rows.map(r=>{const d=r.Date||r.DATE||r.date,v=Number(r[k]);return d&&Number.isFinite(v)?[new Date(d+' UTC').toISOString().slice(0,10),v]:null;}).filter(Boolean).sort((a,b)=>a[0].localeCompare(b[0]));
}
async function fredTermPremium(){
  const u='https://fred.stlouisfed.org/graph/fredgraph.csv?id=THREEFYTP10&cosd=2024-01-01';
  const r=await fetch(u,{headers:UA,signal:AbortSignal.timeout(5000)}); if(!r.ok)throw new Error('FRED term premium HTTP '+r.status);
  const pts=[];for(const line of (await r.text()).trim().split(/\r?\n/).slice(1)){const i=line.indexOf(',');if(i<0)continue;const d=line.slice(0,i),v=line.slice(i+1).trim();if(d&&v&&v!=='.'&&Number.isFinite(+v))pts.push([d,+v]);}
  if(!pts.length)throw new Error('term premium empty');return pts;
}
const latest=a=>a[a.length-1];
const delta=(a,days)=>{const last=latest(a),cut=Date.parse(last[0])-days*864e5;let p=a[0];for(const x of a){if(Date.parse(x[0])<=cut)p=x;else break;}return +((last[1]-p[1])*100).toFixed(0);};

async function main(){
  let prev={};try{prev=JSON.parse(fs.readFileSync(OUT,'utf8'));}catch{}
  const errors=[];let nominal=null,real=null,tp=null;
  try{nominal=pick10y(await treasury('daily_treasury_yield_curve'));}catch(e){errors.push(e.message);}
  try{real=pick10y(await treasury('daily_treasury_real_yield_curve'));}catch(e){errors.push(e.message);}
  try{tp=await fredTermPremium();}catch(e){errors.push(e.message);}
  if(!nominal||!real){if(prev?.values?.nominal10y!=null&&prev?.values?.real10y!=null){console.log('critical Treasury source failure; keeping previous');return;}throw new Error(errors.join('; '));}
  const n=latest(nominal),r=latest(real),date=n[0]<r[0]?n[0]:r[0];
  const nMap=Object.fromEntries(nominal),rMap=Object.fromEntries(real);
  const common=[...new Set(nominal.map(x=>x[0]))].filter(d=>rMap[d]!=null).sort();
  const aligned=common.map(d=>[d,rMap[d]]),be=+(nMap[date]-rMap[date]).toFixed(2);
  const tpVal=tp?latest(tp)[1]:(prev.values||{}).termPremium10y??null;
  let score=0,max=3;if(rMap[date]>=2.25)score++;if(rMap[date]>=2.5)score++;if(delta(aligned,90)>=25)score++;if(tpVal!=null){max++;if(tpVal>=0.5)score++;}
  const level=(score>=3||(max===3&&score===3))?'red':score>=2?'amber':'green';
  const out={asOf:date,source:'U.S. Treasury · NY Fed ACM(FRED optional)',values:{nominal10y:+nMap[date].toFixed(2),real10y:+rMap[date].toFixed(2),breakeven10y:be,termPremium10y:tpVal==null?null:+tpVal.toFixed(2)},changeBp:{real10y_1m:delta(aligned,30),real10y_3m:delta(aligned,90),termPremium_3m:tp?delta(tp,90):null},level,score,scoreMax:max,thresholds:{watchReal:2.25,warningReal:2.5,termPremium:0.5,real3mBp:25},interpretation:level==='red'?'자본 희소성 경고: 실질 할인율 상승이 AI 인프라 WACC를 압박':level==='amber'?'주의: 실질금리 상승을 AI CAPEX·회사채·기간 프리미엄과 함께 확인':'정상: 실질 할인율 기반 자본 희소성 경고 미점등',errors};
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
}
main().catch(e=>{console.error(e);process.exit(1);});
