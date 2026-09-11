import fs from 'node:fs';

const URL = 'https://www.bls.gov/news.release/cpi.nr0.htm';
const fmt = v => `${v >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`;
const monthNo = name => ({January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12})[name];
const kstNow = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date()).replace(' ','T') + '+09:00';
function signed(re,text,label){const m=text.match(re); if(!m) throw new Error(`Could not parse ${label}`); const v=Number(m[2]); return /fall|decreas|declin/.test(m[1].toLowerCase())?-v:v;}
function read(path){return JSON.parse(fs.readFileSync(path,'utf8'));}
function write(path,obj,compact=false){fs.writeFileSync(path,JSON.stringify(obj,null,compact?0:2)+'\n');}

const r = await fetch(URL,{headers:{'User-Agent':'Mozilla/5.0 ten-bagger/1.0'}});
if(!r.ok) throw new Error(`BLS CPI fetch failed: ${r.status}`);
const html=await r.text();
const text=html.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
const h=text.match(/CONSUMER PRICE INDEX - ([A-Z][a-z]+) (20\d{2})/i);
if(!h) throw new Error('Could not parse CPI reference month');
const monthName=h[1][0].toUpperCase()+h[1].slice(1).toLowerCase();
const year=Number(h[2]), month=monthNo(monthName);
const release=text.match(/8:30 a\.m\. \(ET\) [A-Za-z]+, ([A-Z][a-z]+) (\d{1,2}), (20\d{2})/i);
if(!release) throw new Error('Could not parse CPI release date');
const releaseDate=`${release[3]}-${String(monthNo(release[1][0].toUpperCase()+release[1].slice(1).toLowerCase())).padStart(2,'0')}-${String(release[2]).padStart(2,'0')}`;
const ym=`${year}-${String(month).padStart(2,'0')}`;
const seriesDate=`${ym}-01`;
const headlineMom=signed(/CPI-U\) (increased|rose|fell|decreased|declined) ([0-9.]+) percent on a seasonally adjusted basis in [A-Za-z]+/i,text,'headline MoM');
const headlineYoy=signed(/Over the last 12 months, the all items index (increased|rose|fell|decreased|declined) ([0-9.]+) percent/i,text,'headline YoY');
const coreMom=signed(/index for all items less food and energy (increased|rose|fell|decreased|declined) ([0-9.]+) percent/i,text,'core MoM');
const coreYoy=signed(/all items less food and energy index (increased|rose|fell|decreased|declined) ([0-9.]+) percent over the year/i,text,'core YoY');
const stamp=kstNow(), today=stamp.slice(0,10), confirmKst=stamp.replace('T',' ').slice(0,16)+' KST';

// 1) 01 current value + chart endpoint: official BLS CPI overrides lagging mirrors/FRED.
const cpi=read('cpi.json');
const us=new Map((cpi.series?.us||[]).map(([d,v])=>[d,v]));
const prev=[...us.entries()].filter(([d])=>d<seriesDate).sort((a,b)=>a[0].localeCompare(b[0])).at(-1);
us.set(seriesDate,headlineYoy);
cpi.series=cpi.series||{}; cpi.series.us=[...us.entries()].sort((a,b)=>a[0].localeCompare(b[0])); cpi.asOf=stamp;
write('cpi.json',cpi,true);

// 2) calendar result.
const cal=read('calendar.json');
const lbl=`美 CPI · ${month}월분`;
let ev=(cal.events||[]).find(e=>e.lbl===lbl);
if(!ev){ev={d:releaseDate,cat:'infl',lbl}; cal.events.push(ev);}
ev.meta=`발표 확인 · BLS ${releaseDate} 공식 발표. 헤드라인 CPI 전월비 ${fmt(headlineMom)}, 전년비 ${fmt(headlineYoy)}; 근원 CPI 전월비 ${fmt(coreMom)}, 전년비 ${fmt(coreYoy)}. 직전월 헤드라인 YoY ${prev?fmt(prev[1]):'없음'}와 비교. · 원문: ${URL} · 등록일: ${releaseDate} · 확인/갱신: ${confirmKst}`;
ev.when=`${releaseDate.slice(5)} 21:30 KST (발표 완료 · CPI ${fmt(headlineMom)} MoM / ${fmt(headlineYoy)} YoY)`;
cal.asOf=stamp; const calNote=`${today} 정기 발표 점검에서 BLS ${month}월 CPI 공식값을 전 소비처 동기화.`; if(!(cal.note||'').includes(calNote)) cal.note=`${cal.note||''} ${calNote}`.trim(); write('calendar.json',cal);

// 3) market context used by 01/04.
const pulse=read('pulse.json');
const rates=(pulse.drivers||[]).find(d=>d.ax==='rates');
if(rates){
  const ppi=(rates.srcs||[]).find(x=>/producer price|ppi/i.test(String(x?.t||''))||/ppi/.test(String(x?.u||'')));
  rates.dir='neutral';
  rates.l1=`${month}월 CPI는 헤드라인 ${fmt(headlineMom)} MoM·${fmt(headlineYoy)} YoY, 근원 ${fmt(coreMom)}·${fmt(coreYoy)}로 확인. 8월 PPI의 생산단 압력과 함께 봐야 한다.`;
  rates.l2=`헤드라인 전월비는 7월 +0.1%에서 ${fmt(headlineMom)}로 재가속했지만 전년비는 ${fmt(headlineYoy)}로 동일했고, 근원 전년비는 2.5%→${fmt(coreYoy)}로 둔화했다. 따라서 단일 방향 신호보다 에너지발 월간 재가속과 근원 둔화를 함께 반영해 FOMC 금리경로를 혼재로 판단한다.`;
  rates.verdict='헤드라인 MoM 재가속 vs 근원 YoY 둔화 · 금리경로 혼재';
  rates.srcs=[{t:`BLS Consumer Price Index - ${monthName} ${year}`,u:URL,d:releaseDate},...(ppi?[ppi]:[])];
}
pulse.asOf=stamp.slice(0,16); write('pulse.json',pulse);

// 4) cycle/risk context: macro discount-rate context only, no semiconductor-demand inference.
const cycle=read('cycle.json'); cycle.asOf=today; cycle.periodicReleaseContext=cycle.periodicReleaseContext||{}; cycle.periodicReleaseContext.cpi={release:ym,headlineMom,headlineYoy,coreMom,coreYoy,prevHeadlineYoy:prev?.[1]??null,source:URL,registeredAt:releaseDate,interpretation:'헤드라인 MoM 재가속과 근원 YoY 둔화가 공존; AI 실수요가 아니라 할인율·조달비용 경로의 혼재 신호'}; write('cycle.json',cycle,true);
const risk=read('risk.json'); risk.asOf=today; risk.periodicReleaseContext=risk.periodicReleaseContext||{}; risk.periodicReleaseContext.cpi={release:ym,headlineMom,headlineYoy,coreMom,coreYoy,source:URL,registeredAt:releaseDate,interpretation:'에너지발 월간 물가 재가속은 장기금리 상방 위험, 근원 둔화는 완충 요인'}; write('risk.json',risk);

// 5) 02/04 shared signal context.
const sig=read('signal_log.json'); sig.asOf=today;
if(!(sig.log||[]).some(x=>x.source===`BLS CPI ${monthName} ${year} 공식 발표`)){
  sig.log.push({date:releaseDate,at:stamp,source:`BLS CPI ${monthName} ${year} 공식 발표`,srcs:[{label:`BLS Consumer Price Index - ${monthName} ${year}`,url:URL}],items:[{tag:'물가·금리',layer:'macro',col:'#7048e8',html:`<b>${month}월 CPI ${fmt(headlineMom)} MoM·${fmt(headlineYoy)} YoY, 근원 ${fmt(coreMom)}·${fmt(coreYoy)}.</b> 헤드라인 월간 상승률은 7월 +0.1%에서 재가속했지만 근원 YoY는 2.5%→${fmt(coreYoy)}로 둔화. 금리·할인율에는 혼재 신호로 반영하고 AI 실수요 숫자로 직접 환산하지 않음.`}]});
}
write('signal_log.json',sig);

// 6) daily official-release audit; live verification remains pending until deployment workflow succeeds.
const releaseObj={indicator:`BLS CPI ${year}년 ${month}월`,registeredAt:releaseDate,sourceUrl:URL,values:{ym,headlineMom,headlineYoy,coreMom,coreYoy,prevHeadlineYoy:prev?.[1]??null}};
const checkPath='periodic_release_check.json'; const check=read(checkPath); check.date=today; check.checkedAt=stamp; check.status='신규 발표 반영 완료'; check.newOfficialReleases=(check.newOfficialReleases||[]).filter(x=>!/^BLS CPI/.test(x.indicator||'')); check.newOfficialReleases.push(releaseObj); check.pending=(check.pending||[]).filter(x=>!/^BLS CPI/.test(x.indicator||'')); check.consumers=['01 CPI 현재값+cpi.json 시계열','calendar.json','pulse.json','cycle.json','risk.json','02 signal_log.json','04 council-context shared pulse/cycle/signal_log','changelog.js']; check.liveVerification={status:'pending',verifiedAt:null,checks:['simpleornothing.com authenticated browser','cpi.json latest series endpoint','01 CPI displayed latest value and chart endpoint']}; write(checkPath,check);
const auditDir='audit/official-release-checks'; fs.mkdirSync(auditDir,{recursive:true}); write(`${auditDir}/${today}.json`,check);

// 7) changelog.
let s=fs.readFileSync('changelog.js','utf8'); s=s.replace(/market:'\d{4}-\d{2}-\d{2}'/,`market:'${today}'`); const entry=`    {d:'${today}',t:'01·02·04 미국 CPI ${month}월 공식값 동기화 — 헤드라인 ${fmt(headlineMom)} MoM·${fmt(headlineYoy)} YoY, 근원 ${fmt(coreMom)}·${fmt(coreYoy)}; CPI 카드/시계열·캘린더·시장맥락·사이클·리스크·시그널로그·감사이력 동시 반영'},\n`; if(!s.includes(`미국 CPI ${month}월 공식값 동기화`)) s=s.replace('  var MKT_CHANGELOG=[\n','  var MKT_CHANGELOG=[\n'+entry); fs.writeFileSync('changelog.js',s);

console.log(JSON.stringify({ym,releaseDate,headlineMom,headlineYoy,coreMom,coreYoy,prevHeadlineYoy:prev?.[1]??null,stamp}));
