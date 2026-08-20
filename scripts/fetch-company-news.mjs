// 02 기업분석에 등록된 기업을 매일 검색해 company_news.json을 갱신한다.
// 유료 LLM 없이 Google News RSS를 사용하며, 헤드라인/출처 기반으로
// 실적·가이던스·수주·투자·제품·고객·M&A·규제 등 물질적 사건만 선별한다.
// 핵심 전략/재무 수치(data.json)는 자동 수정하지 않는다.

import fs from 'node:fs';
import crypto from 'node:crypto';

const COMPANY_JS = 'company.js';
const OUT = 'company_news.json';
const ARCHIVE = 'archive/company_news_archive.json';
const WINDOW_DAYS = 30;
const MAX_PER_COMPANY = 8;
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MATERIAL = /\b(earnings?|results?|revenue|sales|guidance|outlook|forecast|bookings?|backlog|orders?|contracts?|agreement|customer|hyperscaler|capacity|capex|investment|invests?|factory|fab|manufactur|shipment|ships?|production|sampling|qualification|launch|unveil|introduc|availability|product|technology|silicon|optical|photon|switch|cxl|ethernet|acqui|merger|partnership|collaborat|supply|export control|regulat|fcc|sec|ceo|cfo)\b|실적|가이던스|전망|매출|수주|계약|고객|투자|증설|생산|출하|양산|샘플|제품|기술|인수|합병|협력|공급|규제|수출통제|경영진/i;
const REJECT = /\b(price target|target price|analyst|upgrade|downgrade|rating|premarket|pre-market|after hours|stock (?:rises|falls|jumps|drops|surges|plunges)|why .* stock|should you buy|buy now|sell now|top pick|best stock|options activity|short interest|technical analysis)\b|목표가|투자의견|상향 조정|하향 조정|장전|시간외|주가 급등|주가 급락|매수 추천|매도 추천|기술적 분석/i;
const BLOCKED_SOURCES = /Stocktwits|24\/7 Wall St|Motley Fool|Seeking Alpha|TradingView|TradingKey|Simply Wall St|TipRanks|GuruFocus|Zacks|Insider Monkey/i;
const TRUSTED_SOURCES = /Reuters|Business Wire|GlobeNewswire|PR Newswire|MarketWatch|Barron's|Investor's Business Daily|Light Reading|Counterpoint Research|The Register|ServeTheHome/i;

function escQuery(s){ return encodeURIComponent(String(s||'').trim()); }
function decode(s){
  return String(s||'')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
    .replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&apos;/g,"'")
    .replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')
    .trim();
}
function parseRSS(xml){
  const out=[]; const re=/<item>([\s\S]*?)<\/item>/g; let m;
  while((m=re.exec(xml))){
    const b=m[1];
    const t=(b.match(/<title>([\s\S]*?)<\/title>/)||[])[1];
    const l=(b.match(/<link>([\s\S]*?)<\/link>/)||[])[1];
    const p=(b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)||[])[1];
    const s=(b.match(/<source[^>]*>([\s\S]*?)<\/source>/)||[])[1];
    if(!t||!l)continue;
    const d=p?new Date(p):null;
    out.push({title:decode(t),url:decode(l),published:d&&!isNaN(d)?d.toISOString():null,source:s?decode(s):''});
  }
  return out;
}
async function fetchRSS(url){
  let last;
  for(let i=0;i<3;i++){
    try{
      const r=await fetch(url,{headers:UA});
      if(r.ok)return parseRSS(await r.text());
      last=new Error('HTTP '+r.status);
    }catch(e){last=e;}
    if(i<2)await sleep(1500*(i+1));
  }
  throw last||new Error('RSS fetch failed');
}
function companyPaths(){
  const src=fs.readFileSync(COMPANY_JS,'utf8');
  const out=[]; const seen=new Set();
  const re=/data:'([^']+\/data\.json)'/g; let m;
  while((m=re.exec(src))){
    const p=m[1].replace(/^\/+/,'');
    if(!seen.has(p)){seen.add(p);out.push(p);}
  }
  if(!out.length)throw new Error('company.js data paths not found');
  return out;
}
function readCompanies(){
  return companyPaths().map((p)=>{
    const d=JSON.parse(fs.readFileSync(p,'utf8'));
    if(!d.company||!d.company.ticker||!d.company.name)throw new Error(`${p}: company metadata missing`);
    return {path:p,ticker:String(d.company.ticker).toUpperCase(),name:String(d.company.name)};
  });
}
function sourceTier(item, company){
  const s=String(item.source||'');
  if(new RegExp(company.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i').test(s))return 1;
  if(company.ticker==='MRVL'&&/Marvell/i.test(s))return 1;
  if(company.ticker==='LITE'&&/Lumentum/i.test(s))return 1;
  if(/Securities and Exchange Commission|SEC\.gov/i.test(s))return 1;
  if(TRUSTED_SOURCES.test(s))return 2;
  return 3;
}
function category(title){
  const t=String(title||'');
  if(/earnings?|results?|revenue|sales|guidance|outlook|forecast|실적|가이던스|매출/i.test(t))return '실적·가이던스';
  if(/bookings?|backlog|orders?|contracts?|agreement|수주|계약/i.test(t))return '수주·계약';
  if(/capex|investment|invests?|capacity|factory|fab|manufactur|투자|증설|생산/i.test(t))return '투자·CAPEX';
  if(/acqui|merger|stake|convertible|capital|인수|합병|지분|자본/i.test(t))return 'M&A·자본';
  if(/customer|hyperscaler|partnership|collaborat|supply|고객|협력|공급/i.test(t))return '고객·공급망';
  if(/regulat|export control|fcc|sec|규제|수출통제/i.test(t))return '규제·정책';
  if(/ceo|cfo|chief|경영진|대표이사/i.test(t))return '경영진';
  return '제품·기술';
}
function idOf(ticker,item){
  return crypto.createHash('sha1').update(`${ticker}|${item.published||''}|${item.title||''}`).digest('hex').slice(0,16);
}
function relevant(item, company){
  const text=`${item.title||''} ${item.source||''}`;
  if(BLOCKED_SOURCES.test(item.source||''))return false;
  if(REJECT.test(item.title||''))return false;
  if(!MATERIAL.test(text))return false;
  // 자동 반영은 회사/SEC 원문과 사전 정의한 신뢰 매체만 허용한다.
  // 기타 출처는 헤드라인이 물질적이어도 사이트에 올리지 않는다.
  if(sourceTier(item,company)>2)return false;
  const companyHit=new RegExp(`${company.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}|${company.ticker}`,'i').test(text)
    || (company.ticker==='MRVL'&&/Marvell/i.test(text))
    || (company.ticker==='LITE'&&/Lumentum/i.test(text));
  return companyHit;
}
function feedUrls(company){
  const loc='hl=en-US&gl=US&ceid=US:en';
  const q1=`"${company.name}" ${company.ticker} when:2d`;
  const q2=`"${company.name}" (earnings OR guidance OR revenue OR order OR contract OR investment OR capacity OR acquisition OR product OR AI OR optical OR silicon OR customer OR partnership) when:7d`;
  return [
    `https://news.google.com/rss/search?q=${escQuery(q1)}&${loc}`,
    `https://news.google.com/rss/search?q=${escQuery(q2)}&${loc}`,
  ];
}
function normalize(item,company,prev){
  const tier=sourceTier(item,company);
  const key=(prev||[]).find((x)=>x.url===item.url || (x.title===item.title&&String(x.published||'').slice(0,10)===String(item.published||'').slice(0,10)));
  return {
    id:key&&key.id||idOf(company.ticker,item),
    published:item.published,
    category:category(item.title),
    source:item.source||'출처 미상',
    sourceTier:tier,
    verified:tier===1?'official':tier===2?'trusted-news':'headline-only',
    title:item.title,
    url:item.url,
    ...(key&&key.factualSummary?{factualSummary:key.factualSummary}:{})
  };
}
function loadJson(path,fallback){ try{return JSON.parse(fs.readFileSync(path,'utf8'));}catch{return fallback;} }

async function collectCompany(company,prevItems){
  const got=[];
  for(const u of feedUrls(company)){
    const rows=await fetchRSS(u);
    got.push(...rows);
    await sleep(300);
  }
  const cutoff=Date.now()-WINDOW_DAYS*864e5;
  const map=new Map();
  for(const it of got){
    if(!relevant(it,company))continue;
    const t=it.published?new Date(it.published).getTime():0;
    if(t&&t<cutoff)continue;
    const n=normalize(it,company,prevItems);
    const dedup=`${n.title}|${String(n.published||'').slice(0,10)}`;
    const cur=map.get(dedup);
    if(!cur || n.sourceTier<cur.sourceTier)map.set(dedup,n);
  }
  // 이전에 검증된 공식/신뢰 원문을 30일 창 안에서 보존한다.
  for(const p of (prevItems||[])){
    const t=p.published?new Date(p.published).getTime():0;
    if(t&&t<cutoff)continue;
    const dedup=`${p.title}|${String(p.published||'').slice(0,10)}`;
    if(!map.has(dedup))map.set(dedup,p);
  }
  return [...map.values()]
    .sort((a,b)=>new Date(b.published||0)-new Date(a.published||0) || (a.sourceTier||9)-(b.sourceTier||9))
    .slice(0,MAX_PER_COMPANY);
}

async function main(){
  const prev=loadJson(OUT,{companies:{}});
  const oldArchive=loadJson(ARCHIVE,{companies:{}});
  const companies=readCompanies();
  const next={schemaVersion:1,checkedAt:new Date().toISOString(),windowDays:WINDOW_DAYS,policy:'material-company-news-v1',companies:{}};
  const archive={schemaVersion:1,checkedAt:next.checkedAt,companies:{...(oldArchive.companies||{})}};
  const errors=[];
  for(const c of companies){
    try{
      const prevItems=((prev.companies||{})[c.ticker]||{}).items||[];
      const items=await collectCompany(c,prevItems);
      next.companies[c.ticker]={name:c.name,items};
      const hist=[...((((archive.companies||{})[c.ticker]||{}).items)||[]),...items];
      const byId=new Map();
      for(const it of hist)if(it&&it.id&&!byId.has(it.id))byId.set(it.id,it);
      archive.companies[c.ticker]={name:c.name,items:[...byId.values()].sort((a,b)=>new Date(b.published||0)-new Date(a.published||0))};
      console.log(`OK ${c.ticker}: ${items.length} items`);
    }catch(e){
      errors.push(`${c.ticker}: ${e.message}`);
      console.error(`FAIL ${c.ticker}: ${e.message}`);
    }
  }
  if(errors.length)throw new Error('company news refresh failed: '+errors.join(' | '));
  fs.mkdirSync('archive',{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(next,null,2)+'\n');
  fs.writeFileSync(ARCHIVE,JSON.stringify(archive,null,2)+'\n');
}
main().catch((e)=>{console.error(e);process.exit(1);});
