// Daily AI capital-scarcity monitor.
// FRED public CSV, no API key: nominal 10Y, 10Y TIPS real yield, 10Y breakeven, ACM 10Y term premium.
// Output is non-destructive: if a source fails, the last known snapshot is preserved.
import fs from 'node:fs';

const OUT='capital_scarcity.json';
const UA={'User-Agent':'Mozilla/5.0'};
const IDS={nominal10y:'DGS10',real10y:'DFII10',breakeven10y:'T10YIE',termPremium10y:'THREEFYTP10'};

async function fred(id){
  const u='https://fred.stlouisfed.org/graph/fredgraph.csv?id='+encodeURIComponent(id)+'&cosd=2024-01-01';
  const r=await fetch(u,{headers:UA,signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error(id+' HTTP '+r.status);
  const pts=[];
  for(const line of (await r.text()).trim().split('\n').slice(1)){
    const i=line.indexOf(','); if(i<0)continue;
    const d=line.slice(0,i),v=line.slice(i+1).trim();
    if(d&&v&&v!=='.'&&Number.isFinite(+v))pts.push([d,+v]);
  }
  if(!pts.length)throw new Error(id+' empty');
  return pts;
}
const latest=(a)=>a[a.length-1];
const delta=(a,days)=>{const last=a[a.length-1][1],cut=Date.parse(a[a.length-1][0])-days*864e5;let p=a[0];for(const x of a){if(Date.parse(x[0])<=cut)p=x;else break;}return +((last-p[1])*100).toFixed(0);};

async function main(){
  let prev={};try{prev=JSON.parse(fs.readFileSync(OUT,'utf8'));}catch{}
  const series={},errors=[];
  for(const [k,id] of Object.entries(IDS))try{series[k]=await fred(id);}catch(e){errors.push(e.message);}
  if(!series.real10y||!series.breakeven10y){if(Object.keys(prev).length){console.log('critical source failure; keeping previous');return;}throw new Error(errors.join('; '));}
  const val=(k)=>series[k]?latest(series[k])[1]:(prev.values||{})[k]??null;
  const asOf=Object.values(series).map(latest).map(x=>x[0]).sort().at(-1);
  const real=val('real10y'),be=val('breakeven10y'),tp=val('termPremium10y'),nom=val('nominal10y');
  let score=0; if(real>=2.25)score++; if(real>=2.5)score++; if(tp!=null&&tp>=0.5)score++; if(series.real10y&&delta(series.real10y,90)>=25)score++;
  const level=score>=3?'red':score>=2?'amber':'green';
  const out={asOf,source:'FRED · Federal Reserve Bank of New York ACM',values:{nominal10y:nom,real10y:real,breakeven10y:be,termPremium10y:tp},changeBp:{real10y_1m:series.real10y?delta(series.real10y,30):null,real10y_3m:series.real10y?delta(series.real10y,90):null,termPremium_3m:series.termPremium10y?delta(series.termPremium10y,90):null},level,score,thresholds:{watchReal:2.25,warningReal:2.5,termPremium:0.5,real3mBp:25},interpretation:level==='red'?'자본 희소성 경고: 실질 할인율·기간 프리미엄 상승이 AI 인프라 WACC를 압박':level==='amber'?'주의: 실질금리/기간 프리미엄 상승 여부를 AI CAPEX·회사채와 함께 확인':'정상: 실질 할인율 기반 자본 희소성 경고 미점등',errors};
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
}
main().catch(e=>{console.error(e);process.exit(1);});
