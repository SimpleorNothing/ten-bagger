import fs from 'node:fs';

const GAMMA='gamma.json';
const g=JSON.parse(fs.readFileSync(GAMMA,'utf8'));
const r1=(x)=>x==null?null:+x.toFixed(1);
const chgPct=(now,then)=>(now==null||then==null||then<=0)?null:r1(((now/then)-1)*100);
const eq=(a,b,tol=0.11)=>a==null&&b==null||(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol);
let valid=0,invalid=0;
for(const [tk,e] of Object.entries(g.gamma||{})){
  const rev=e.rev;
  if(!rev)continue;
  const p=rev.provenance;
  let reason='';
  if(!p?.provider||!p?.sourceUrl||!p?.rawRef||!p?.retrievedAt)reason='missing provenance';
  else if(!fs.existsSync(p.rawRef))reason='raw snapshot missing';
  else{
    try{
      const s=JSON.parse(fs.readFileSync(p.rawRef,'utf8'));
      if(s.provider!==p.provider||s.sourceUrl!==p.sourceUrl)reason='source metadata mismatch';
      else{
        const f=s.financialData||{},fy=s.earningsTrend?.fy1||{};
        const c30=chgPct(fy.epsTrend?.current,fy.epsTrend?.['30daysAgo']);
        const c90=chgPct(fy.epsTrend?.current,fy.epsTrend?.['90daysAgo']);
        if(!eq(rev.tp?.now,f.targetMeanPrice,0.02))reason='TP raw mismatch';
        else if(!eq(rev.eps?.fy1?.now,fy.epsTrend?.current,0.02))reason='EPS current raw mismatch';
        else if(!eq(rev.eps?.fy1?.c30,c30))reason='EPS 30d recompute mismatch';
        else if(!eq(rev.eps?.fy1?.c90,c90))reason='EPS 90d recompute mismatch';
      }
    }catch(err){reason='raw snapshot parse error: '+err.message;}
  }
  if(reason){
    delete e.rev;
    e.revInvalid={at:new Date().toISOString(),reason};
    invalid++;
    console.log(`INVALID ${tk}: ${reason} -> rev removed`);
  }else{
    delete e.revInvalid;
    valid++;
    console.log(`VALID ${tk}: ${p.provider} ${p.rawRef}`);
  }
}
g.revisionAudit={at:new Date().toISOString(),policy:'use-only-when-provider-source-and-raw-snapshot-are-present-and-reproducible',valid,invalid};
fs.writeFileSync(GAMMA,JSON.stringify(g,null,2)+'\n');
console.log(`revision audit: ${valid} valid, ${invalid} removed`);
