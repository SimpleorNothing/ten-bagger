import fs from 'node:fs';

const OUT='momentum-radar.json';
const UA={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'};
const MAX_SCORE=12;

const LEADERS=[
  {id:'crcl',symbol:'CRCL',name:'Circle',kind:'equity'},
  {id:'coin',symbol:'COIN',name:'Coinbase',kind:'equity'},
  {id:'hood',symbol:'HOOD',name:'Robinhood',kind:'equity'},
  {id:'btc',symbol:'BTC-USD',name:'Bitcoin',kind:'crypto'}
];

const CANDIDATES=[
  {code:'234340',name:'헥토파이낸셜',linkPoints:2,linkage:'Circle CPN 한국 유일 파트너 · USDC 크로스보더 결제/정산',catalyst:{date:'2026-08-28',label:'CPN 한국 유일 파트너·스테이블코인 성장축 재확인',source:'https://hectofinancial.co.kr/company/news'}},
  {code:'060250',name:'NHN KCP',linkPoints:2,linkage:'LINE NEXT와 스테이블코인 결제 확대 MOU · 결제창 연동',catalyst:{date:'2026-08-20',label:'LINE NEXT 스테이블코인 결제 확대 MOU',source:'https://www.newsis.com/view/NISX20260820_0003755370'}}
];

const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const kstNow=()=>new Date(Date.now()+9*3600e3);
const kstIso=()=>kstNow().toISOString().replace('Z','+09:00');
const ymd=(d)=>d.toISOString().slice(0,10).replace(/-/g,'');

async function yahooQuote(symbol){
  const u=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=10d`;
  const r=await fetch(u,{headers:UA});
  if(!r.ok)throw new Error(`${symbol} yahoo HTTP ${r.status}`);
  const j=await r.json(),res=j?.chart?.result?.[0],meta=res?.meta;
  if(!meta||meta.regularMarketPrice==null)throw new Error(`${symbol} yahoo no price`);
  const px=Number(meta.regularMarketPrice),prev=Number(meta.chartPreviousClose ?? meta.previousClose);
  const changePct=Number.isFinite(prev)&&prev!==0?+((px/prev-1)*100).toFixed(2):null;
  return {price:px,changePct,source:u};
}

async function naverHistory(code){
  const end=ymd(new Date());
  const start=ymd(new Date(Date.now()-45*864e5));
  const u=`https://api.finance.naver.com/siseJson.naver?symbol=${encodeURIComponent(code)}&requestType=1&startTime=${start}&endTime=${end}&timeframe=day`;
  const r=await fetch(u,{headers:UA});
  if(!r.ok)throw new Error(`${code} naver HTTP ${r.status}`);
  const txt=await r.text();
  const arr=JSON.parse(txt.replace(/'/g,'"'));
  const rows=arr.slice(1).filter(x=>Array.isArray(x)&&x.length>=5&&Number.isFinite(Number(x[4])));
  if(rows.length<6)throw new Error(`${code} naver insufficient history`);
  const closes=rows.map(x=>Number(x[4]));
  const now=closes.at(-1),base=closes.at(-6);
  return {recent5dPct:+((now/base-1)*100).toFixed(2),lastPrice:now,source:u};
}

function leaderPoints(map){
  const crcl=Number(map.crcl?.changePct),btc=Number(map.btc?.changePct);
  const peers=['crcl','coin','hood'].filter(k=>Number(map[k]?.changePct)>=7).length;
  const core=Number.isFinite(crcl)?(crcl>=10?3:crcl>=7?2:crcl>=4?1:0):0;
  return {
    core:{label:'CRCL 핵심선행',available:Number.isFinite(crcl),points:core,max:3},
    btc:{label:'BTC +4%',available:Number.isFinite(btc),points:Number.isFinite(btc)&&btc>=4?1:0,max:1},
    peers:{label:'동종 2개 +7%',available:true,points:peers>=2?1:0,max:1}
  };
}
function sumPoints(obj){return Object.values(obj).reduce((a,x)=>a+(Number(x?.points)||0),0);}
function catalystComponent(c,asOf){
  if(!c)return {label:'최근 사업촉매',available:false,points:0,max:1};
  const days=Math.floor((asOf-new Date(c.date+'T00:00:00+09:00'))/864e5);
  return {label:'최근 사업촉매',available:true,points:days>=0&&days<=30?1:0,max:1,date:c.date,detail:c.label,source:c.source};
}
function pullbackComponent(v){
  return Number.isFinite(Number(v))?{label:'최근 5D 눌림',available:true,points:Number(v)<=-3?1:0,max:1,valuePct:Number(v)}:{label:'최근 5D 눌림',available:false,points:0,max:1};
}

const leaderMap={};
for(const x of LEADERS){
  try{const q=await yahooQuote(x.symbol);leaderMap[x.id]={...x,...q,session:x.kind==='crypto'?'24h 근사':'미국 정규장'};}
  catch(e){leaderMap[x.id]={...x,changePct:null,error:String(e.message||e),session:x.kind==='crypto'?'24h 근사':'미국 정규장'};}
  await sleep(250);
}
const common=leaderPoints(leaderMap),commonScore=sumPoints(common),now=kstNow();
const candidates=[];
for(const c of CANDIDATES){
  let hist={recent5dPct:null,lastPrice:null,source:null};
  try{hist=await naverHistory(c.code);}catch(e){hist.error=String(e.message||e);}
  const components={
    ...common,
    linkage:{label:'직접 사업연계',available:true,points:c.linkPoints,max:2},
    catalyst:catalystComponent(c.catalyst,now),
    pullback:pullbackComponent(hist.recent5dPct),
    policy:{label:'정책 촉매',available:false,points:0,max:1},
    sensitivity:{label:'과거 동일재료 민감도',available:false,points:0,max:2}
  };
  candidates.push({code:c.code,name:c.name,score:sumPoints(components),maxScore:MAX_SCORE,recent5dPct:hist.recent5dPct,lastPrice:hist.lastPrice,linkage:c.linkage,components,sources:[hist.source,c.catalyst?.source].filter(Boolean)});
  await sleep(250);
}

const availableMax=Object.values(candidates[0]?.components||{}).reduce((a,x)=>a+(x?.available===false?0:Number(x?.max)||0),0);
const leaders=LEADERS.map(x=>leaderMap[x.id]);
const top=Math.max(0,...candidates.map(x=>x.score));
const doc={
  schema:'momentum-radar-v1',
  asOf:kstIso(),
  status:leaders.every(x=>Number.isFinite(Number(x.changePct)))?'auto-verified':'partial',
  maxScore:MAX_SCORE,
  coveredMaxScore:availableMax,
  theme:{id:'stablecoin-payment',name:'스테이블코인·전자결제',signalSummary:top>=8?'해외 선행신호 강함 — 국내 직접 연계주 우선 관찰':top>=6?'해외 선행신호 확인 — 국내 후보 관찰':'선행신호 약함'},
  leaders,
  candidates,
  rules:{high:8,watch:6,coreLeader:'+10% = 3점, +7% = 2점, +4% = 1점',btc:'+4% = 1점',peerConfirm:'CRCL·COIN·HOOD 중 2개 이상 +7% = 1점',pullback:'최근 5거래일 -3% 이하 = 1점'},
  note:'정책 촉매와 과거 동일 재료 민감도는 검증 가능한 원자료 연결 전까지 점수에서 제외한다.'
};
fs.writeFileSync(OUT,JSON.stringify(doc,null,2)+'\n');
console.log(`wrote ${OUT}: common=${commonScore}, top=${top}/${MAX_SCORE}, coverage=${availableMax}/${MAX_SCORE}`);
