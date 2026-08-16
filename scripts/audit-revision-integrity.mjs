import fs from 'node:fs';

const GAMMA='gamma.json';
const PRICES='prices.json';
const CHARTS='charts.json';

const read=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const g=read(GAMMA);
const prices=read(PRICES);
const charts=read(CHARTS);
const now=new Date();
const DAY=86400000;
const num=(v)=>Number.isFinite(Number(v))?Number(v):null;
const pctDiff=(a,b)=>{a=num(a);b=num(b);return a==null||b==null||b===0?null:Math.abs(a-b)/Math.abs(b)*100;};
const dateMs=(s)=>{const t=Date.parse(s||'');return Number.isFinite(t)?t:null;};
const priceKey=(tk)=>{
  const direct=String(tk).toLowerCase();
  if(prices.quotes?.[direct])return direct;
  for(const [k,v] of Object.entries(prices.quotes||{}))if(String(v?.ticker||'').toUpperCase()===String(tk).toUpperCase())return k;
  return null;
};

let verified=0,blocked=0,warned=0;
const issues=[];

for(const [tk,e] of Object.entries(g.gamma||{})){
  const rev=e.rev;
  if(!rev)continue;
  const p=rev.provenance;
  const q={status:'verified',checkedAt:new Date().toISOString(),fields:{price:'verified',tp:'verified',eps:'verified'},warnings:[],blocking:[]};
  let raw=null;
  try{
    if(!p?.rawRef||!fs.existsSync(p.rawRef))throw new Error('raw snapshot missing');
    raw=read(p.rawRef);
  }catch(err){
    q.status='blocked';q.blocking.push(err.message);rev.quality=q;blocked++;issues.push(`${tk}: ${err.message}`);continue;
  }

  const fd=raw.financialData||{};
  const key=priceKey(tk);
  const sitePrice=key?num(prices.quotes?.[key]?.price):null;
  const rawPrice=num(fd.currentPrice);
  const lastChart=(()=>{const s=key?charts.series?.[key]:null;return Array.isArray(s?.c)&&s.c.length?num(s.c[s.c.length-1]):null;})();
  const priceDiv=Math.max(pctDiff(rawPrice,sitePrice)??0,pctDiff(rawPrice,lastChart)??0);
  if(rawPrice==null){q.fields.price='blocked';q.blocking.push('currentPrice missing');}
  else if((sitePrice!=null||lastChart!=null)&&priceDiv>3){q.fields.price='blocked';q.blocking.push(`currentPrice divergence ${priceDiv.toFixed(2)}%`);}
  else if(priceDiv>1){q.fields.price='warning';q.warnings.push(`currentPrice divergence ${priceDiv.toFixed(2)}%`);}
  if(key==null)q.warnings.push('independent price key not found');

  const mean=num(fd.targetMeanPrice),hi=num(fd.targetHighPrice),lo=num(fd.targetLowPrice),n=num(fd.numberOfAnalystOpinions);
  if(mean==null||mean<=0){q.fields.tp='blocked';q.blocking.push('targetMeanPrice missing/non-positive');}
  if(lo!=null&&hi!=null&&mean!=null&&!(lo<=mean&&mean<=hi)){q.fields.tp='blocked';q.blocking.push(`target mean outside range ${lo}..${hi}`);}
  if(n!=null&&n<2){q.fields.tp='warning';q.warnings.push(`analyst count low: ${n}`);}

  const fy0=raw.earningsTrend?.fy0||null;
  const fy1=raw.earningsTrend?.fy1||null;
  const e0=dateMs(fy0?.endDate),e1=dateMs(fy1?.endDate);
  let periodState='ok';
  let displayYear=null;
  if(!fy1?.epsTrend||num(fy1.epsTrend.current)==null){
    q.fields.eps='blocked';q.blocking.push('next-year EPS missing');
  }else if(e0==null||e1==null||e1<=e0||((e1-e0)/DAY<300)||((e1-e0)/DAY>430)){
    q.fields.eps='blocked';q.blocking.push('annual EPS period structure invalid');periodState='invalid';
  }else{
    const fy0AgeDays=Math.floor((now.getTime()-e0)/DAY);
    if(fy0AgeDays>7){
      periodState='rollover-stale';
      q.fields.eps='blocked';
      q.blocking.push(`Yahoo annual period rollover stale: 0y ended ${fy0AgeDays}d ago (${fy0.endDate})`);
    }else{
      displayYear=new Date(e1).getUTCFullYear();
    }
  }

  const trend=fy1?.epsTrend||{};
  for(const k of ['current','30daysAgo','90daysAgo']){
    const v=num(trend[k]);
    if(v==null||v<=0){q.fields.eps='blocked';q.blocking.push(`next-year EPS ${k} missing/non-positive`);break;}
  }

  rev.quality=q;
  rev.epsSemantics={
    providerPeriod:'+1y',
    meaning:'Yahoo Finance quoteSummary next-year consensus',
    rawEndDate:fy1?.endDate||null,
    currentYearRawEndDate:fy0?.endDate||null,
    periodState,
    displayYear,
    scoringEligible:q.fields.eps==='verified'
  };

  if(q.fields.eps!=='verified'){
    rev.epsRaw=rev.eps||null;
    rev.eps=null;
    if(rev.gate){rev.gate.d30=null;rev.gate.d90=null;}
  }
  if(q.fields.tp!=='verified'&&rev.tp){
    rev.tp={...rev.tp,now:null,c7:null,c30:null,c90:null};
  }

  if(q.blocking.length){q.status='blocked';blocked++;issues.push(`${tk}: ${q.blocking.join('; ')}`);}
  else if(q.warnings.length){q.status='warning';warned++;}
  else verified++;
}

g.revisionIntegrity={
  at:new Date().toISOString(),
  policy:'field-level semantic validation; raw retained, ambiguous values excluded from scoring',
  verified,warning:warned,blocked,issues
};
fs.writeFileSync(GAMMA,JSON.stringify(g,null,2)+'\n');
console.log(`revision integrity: ${verified} verified, ${warned} warning, ${blocked} blocked`);
for(const x of issues)console.log('BLOCK '+x);
