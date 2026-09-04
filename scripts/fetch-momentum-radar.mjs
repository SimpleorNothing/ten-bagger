import fs from 'node:fs';

const OUT='momentum-radar.json';
const UA={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'};
const MAX_SCORE=12;

const THEMES=[
  {
    id:'stablecoin-payment',name:'스테이블코인·전자결제',short:'스테이블코인',primary:'crcl',
    description:'미국 디지털자산 결제·거래 플랫폼의 위험선호가 국내 결제 인프라로 전이되는지 본다.',
    leaders:[
      {id:'crcl',symbol:'CRCL',name:'Circle',kind:'equity'},
      {id:'coin',symbol:'COIN',name:'Coinbase',kind:'equity'},
      {id:'hood',symbol:'HOOD',name:'Robinhood',kind:'equity'},
      {id:'btc',symbol:'BTC-USD',name:'Bitcoin',kind:'crypto'}
    ],
    candidates:[
      {code:'234340',name:'헥토파이낸셜',linkPoints:2,linkage:'Circle CPN·USDC 크로스보더 결제/정산',catalyst:{date:'2026-08-28',label:'CPN·스테이블코인 성장축 재확인',source:'https://hectofinancial.co.kr/company/news'}},
      {code:'060250',name:'NHN KCP',linkPoints:2,linkage:'스테이블코인 결제창·PG 인프라 연동',catalyst:{date:'2026-08-20',label:'LINE NEXT 스테이블코인 결제 확대 MOU',source:'https://www.newsis.com/view/NISX20260820_0003755370'}}
    ]
  },
  {
    id:'power-grid',name:'전력·Grid',short:'전력/Grid',primary:'gev',
    description:'AI 데이터센터 전력 수요와 북미 전력망 투자 강도가 국내 변압기·배전·전선 업체로 전달되는지 본다.',
    leaders:[
      {id:'gev',symbol:'GEV',name:'GE Vernova',kind:'equity'},
      {id:'vrt',symbol:'VRT',name:'Vertiv',kind:'equity'},
      {id:'etn',symbol:'ETN',name:'Eaton',kind:'equity'},
      {id:'pwr',symbol:'PWR',name:'Quanta Services',kind:'equity'}
    ],
    candidates:[
      {code:'267260',name:'HD현대일렉트릭',linkPoints:2,linkage:'초고압 변압기·전력기기'},
      {code:'010120',name:'LS ELECTRIC',linkPoints:2,linkage:'배전·전력기기·데이터센터 전력 인프라'},
      {code:'298040',name:'효성중공업',linkPoints:2,linkage:'초고압 변압기·GIS'},
      {code:'103590',name:'일진전기',linkPoints:2,linkage:'초고압 변압기·전선'}
    ]
  },
  {
    id:'ai-semiconductor',name:'AI·반도체',short:'AI/반도체',primary:'nvda',
    description:'GPU·HBM·ASIC·AI 네트워크 선행주의 움직임이 국내 메모리·후공정 장비로 확산되는지 본다.',
    leaders:[
      {id:'nvda',symbol:'NVDA',name:'NVIDIA',kind:'equity'},
      {id:'mu',symbol:'MU',name:'Micron',kind:'equity'},
      {id:'avgo',symbol:'AVGO',name:'Broadcom',kind:'equity'},
      {id:'crdo',symbol:'CRDO',name:'Credo',kind:'equity'}
    ],
    candidates:[
      {code:'000660',name:'SK하이닉스',linkPoints:2,linkage:'HBM·DRAM 메모리'},
      {code:'005930',name:'삼성전자',linkPoints:2,linkage:'HBM·DRAM·NAND 및 반도체 제조'},
      {code:'042700',name:'한미반도체',linkPoints:2,linkage:'HBM용 TC 본더·후공정 장비'},
      {code:'089030',name:'테크윙',linkPoints:2,linkage:'메모리 테스트·검사 장비'}
    ]
  },
  {
    id:'nuclear',name:'원전·SMR',short:'원전',primary:'ccj',
    description:'우라늄·원전 기자재·SMR 관련 미국주의 동조가 국내 원전 제작·설계·EPC·정비로 전이되는지 본다.',
    leaders:[
      {id:'ccj',symbol:'CCJ',name:'Cameco',kind:'equity'},
      {id:'bwxt',symbol:'BWXT',name:'BWX Technologies',kind:'equity'},
      {id:'smr',symbol:'SMR',name:'NuScale',kind:'equity'},
      {id:'oklo',symbol:'OKLO',name:'Oklo',kind:'equity'}
    ],
    candidates:[
      {code:'034020',name:'두산에너빌리티',linkPoints:2,linkage:'원전 주기기·SMR 제작'},
      {code:'052690',name:'한전기술',linkPoints:2,linkage:'원전 설계·엔지니어링'},
      {code:'000720',name:'현대건설',linkPoints:2,linkage:'원전 EPC·건설'},
      {code:'051600',name:'한전KPS',linkPoints:2,linkage:'원전 정비·서비스'}
    ]
  },
  {
    id:'defense',name:'방산',short:'방산',primary:'ita',
    description:'미국 방산 섹터와 대형 방산주의 움직임을 국내 수출 방산주와 연결하되 지정학·수주 이벤트는 별도 확인한다.',
    leaders:[
      {id:'ita',symbol:'ITA',name:'US Defense ETF',kind:'equity'},
      {id:'rtx',symbol:'RTX',name:'RTX',kind:'equity'},
      {id:'lmt',symbol:'LMT',name:'Lockheed Martin',kind:'equity'},
      {id:'noc',symbol:'NOC',name:'Northrop Grumman',kind:'equity'}
    ],
    candidates:[
      {code:'012450',name:'한화에어로스페이스',linkPoints:2,linkage:'지상방산·항공엔진·유도무기'},
      {code:'079550',name:'LIG넥스원',linkPoints:2,linkage:'유도무기·레이더·방공'},
      {code:'064350',name:'현대로템',linkPoints:2,linkage:'전차·지상무기체계'},
      {code:'047810',name:'한국항공우주',linkPoints:2,linkage:'군용기·항공우주'}
    ]
  },
  {
    id:'ess-battery',name:'ESS·배터리',short:'ESS',primary:'flnc',
    description:'미국 ESS 시스템·배터리·리튬 체인의 움직임이 국내 ESS 셀과 소재 업체로 전이되는지 본다.',
    leaders:[
      {id:'flnc',symbol:'FLNC',name:'Fluence',kind:'equity'},
      {id:'tsla',symbol:'TSLA',name:'Tesla',kind:'equity'},
      {id:'alb',symbol:'ALB',name:'Albemarle',kind:'equity'},
      {id:'sqm',symbol:'SQM',name:'SQM',kind:'equity'}
    ],
    candidates:[
      {code:'373220',name:'LG에너지솔루션',linkPoints:2,linkage:'ESS용 배터리 셀·시스템 공급'},
      {code:'006400',name:'삼성SDI',linkPoints:2,linkage:'ESS용 배터리 셀·시스템'},
      {code:'003670',name:'POSCO퓨처엠',linkPoints:1,linkage:'배터리 양극재·음극재'},
      {code:'247540',name:'에코프로비엠',linkPoints:1,linkage:'배터리 양극재'}
    ]
  }
];

const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const kstIso=()=>{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+09:00`;
};
const ymd=(d)=>d.toISOString().slice(0,10).replace(/-/g,'');
const finite=(v)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));

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

function primaryComponent(theme,map){
  const row=map[theme.primary],ok=finite(row?.changePct),v=ok?Number(row.changePct):NaN;
  const points=ok?(v>=7?3:v>=4?2:v>=2?1:0):0;
  return {label:`${row?.name||theme.primary} 핵심선행`,available:ok,points,max:3,valuePct:ok?v:null};
}
function breadthComponent(theme,map){
  const values=theme.leaders.filter(x=>finite(map[x.id]?.changePct)).map(x=>Number(map[x.id].changePct));
  const positive=values.filter(v=>v>=3).length;
  const points=values.length>=2?(positive>=3?2:positive>=2?1:0):0;
  return {label:'해외 동종 강도',available:values.length>=2,points,max:2,detail:`+3% 이상 ${positive}/${values.length}`};
}
function sumPoints(obj){return Object.values(obj).reduce((a,x)=>a+(Number(x?.points)||0),0);}
function catalystComponent(c,asOf){
  if(!c)return {label:'최근 사업촉매',available:false,points:0,max:1};
  const days=Math.floor((asOf-new Date(c.date+'T00:00:00+09:00'))/864e5);
  return {label:'최근 사업촉매',available:true,points:days>=0&&days<=30?1:0,max:1,date:c.date,detail:c.label,source:c.source};
}
function pullbackComponent(v){
  return finite(v)?{label:'최근 5D 눌림',available:true,points:Number(v)<=-3?1:0,max:1,valuePct:Number(v)}:{label:'최근 5D 눌림',available:false,points:0,max:1};
}
function themeSummary(score){
  return score>=8?'강한 해외 선행신호 — 국내 직접 연계주 우선 관찰':score>=6?'해외 선행신호 확인 — 국내 후보 관찰':score>=4?'초기 신호 — 확산 여부 확인':'선행신호 약함';
}

const leaderCache=new Map();
for(const theme of THEMES){
  for(const x of theme.leaders){
    if(leaderCache.has(x.symbol))continue;
    try{const q=await yahooQuote(x.symbol);leaderCache.set(x.symbol,{...x,...q,session:x.kind==='crypto'?'24h 근사':'미국 정규장'});}
    catch(e){leaderCache.set(x.symbol,{...x,changePct:null,error:String(e.message||e),session:x.kind==='crypto'?'24h 근사':'미국 정규장'});}
    await sleep(180);
  }
}

const now=new Date();
const themeRows=[];
for(const theme of THEMES){
  const map={};
  for(const l of theme.leaders)map[l.id]={...leaderCache.get(l.symbol),id:l.id,name:l.name,symbol:l.symbol,kind:l.kind};
  const common={primary:primaryComponent(theme,map),breadth:breadthComponent(theme,map)};
  const candidates=[];
  for(const c of theme.candidates){
    let hist={recent5dPct:null,lastPrice:null,source:null};
    try{hist=await naverHistory(c.code);}catch(e){hist.error=String(e.message||e);}
    const components={
      ...common,
      linkage:{label:'직접 산업연계',available:true,points:c.linkPoints,max:2},
      catalyst:catalystComponent(c.catalyst,now),
      pullback:pullbackComponent(hist.recent5dPct),
      policy:{label:'정책·수주 촉매',available:false,points:0,max:1},
      sensitivity:{label:'과거 동일재료 민감도',available:false,points:0,max:2}
    };
    const coveredMaxScore=Object.values(components).reduce((a,x)=>a+(x?.available===false?0:Number(x?.max)||0),0);
    candidates.push({
      code:c.code,name:c.name,score:sumPoints(components),maxScore:MAX_SCORE,coveredMaxScore,
      recent5dPct:hist.recent5dPct,lastPrice:hist.lastPrice,linkage:c.linkage,components,
      sources:[hist.source,c.catalyst?.source].filter(Boolean)
    });
    await sleep(150);
  }
  candidates.sort((a,b)=>b.score-a.score || (b.recent5dPct??-999)-(a.recent5dPct??-999));
  const score=Math.max(0,...candidates.map(x=>x.score));
  const coveredMaxScore=candidates.length?Math.min(...candidates.map(x=>x.coveredMaxScore)):0;
  const leaders=theme.leaders.map(x=>map[x.id]);
  themeRows.push({
    id:theme.id,name:theme.name,short:theme.short,description:theme.description,
    signalScore:score,maxScore:MAX_SCORE,coveredMaxScore,signalSummary:themeSummary(score),
    leaders,candidates
  });
}

themeRows.sort((a,b)=>b.signalScore-a.signalScore || a.name.localeCompare(b.name,'ko'));
const allLeaders=themeRows.flatMap(t=>t.leaders);
const doc={
  schema:'momentum-radar-v2',
  asOf:kstIso(),
  status:allLeaders.every(x=>finite(x.changePct))?'auto-verified':'partial',
  maxScore:MAX_SCORE,
  themes:themeRows,
  rules:{
    primary:'테마 핵심 선행자산 +7% = 3점, +4% = 2점, +2% = 1점',
    breadth:'테마 내 +3% 이상 선행자산 3개 = 2점, 2개 = 1점',
    linkage:'국내 기업의 직접 산업연계 0~2점',
    pullback:'최근 5거래일 -3% 이하 = 1점',
    catalyst:'30일 내 검증된 사업 촉매 = 1점',
    unavailable:'정책·수주 촉매와 과거 동일재료 민감도는 원자료 연결 전까지 점수에서 제외'
  },
  note:'레이더는 다음 거래일의 사전 관찰 우선순위를 만드는 휴리스틱이다. 미연결 데이터는 0점으로 추정하지 않고 커버리지에서 제외한다.'
};
fs.writeFileSync(OUT,JSON.stringify(doc,null,2)+'\n');
console.log(`wrote ${OUT}: themes=${themeRows.length}, leaders=${allLeaders.length}, candidates=${themeRows.reduce((a,t)=>a+t.candidates.length,0)}`);
for(const t of themeRows)console.log(`${t.name}: top=${t.candidates[0]?.name||'—'} ${t.signalScore}/${MAX_SCORE}, coverage=${t.coveredMaxScore}/${MAX_SCORE}`);
