import fs from 'node:fs';

const sourceUrl='https://investor.oracle.com/investor-news/news-details/2026/Oracle-Announces-Q1-Results-Driven-by-Triple-Digit-Growth-in-Cloud-Infrastructure-Revenues/default.aspx';
const now='2026-09-12T08:15:00+09:00';
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const writeJson=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
const addSrc=(arr,label,url,d='2026-09-10')=>{arr=Array.isArray(arr)?arr:[];if(!arr.some(x=>x&&x.u===url))arr.unshift({t:label,u:url,d});return arr;};

// 01 market card loader.
{
  const p='index.html'; let s=fs.readFileSync(p,'utf8');
  if(!s.includes('oracle-release-card.js')){
    const tag='<script defer src="oracle-release-card.js?v=20260912"></script>';
    if(!s.includes('</body>')) throw new Error('index.html body anchor missing');
    s=s.replace('</body>',tag+'\n</body>'); fs.writeFileSync(p,s);
  }
}

// 01 market pulse context.
{
  const p='pulse.json',j=readJson(p); j.asOf='2026-09-12T08:15';
  if(!j.headline.includes('Oracle FY27 Q1')) j.headline='Oracle FY27 Q1 OCI $7.4B(+121% YoY)·RPO $664B·CAPEX $28.499B가 AI 클라우드 수요의 실적 전환을 확인하는 동시에 FCF -$5.396B로 자본집약도 리스크도 재확인한다. '+j.headline;
  const d=(j.drivers||[]).find(x=>x.ax==='flow');
  if(d){
    d.l1='Oracle FY27 Q1 OCI $7.4B(+121% YoY), RPO $664B, 추가 AI Cloud 계약 $30B+와 850MW 추가 DC 캐파가 중국 무역·한국 반도체 수출·SIA/WSTS·AVGO·CRDO와 함께 AI 인프라 실수요 방향을 지지한다.';
    d.l2='Oracle은 Q1 CAPEX $28.499B(전년동기 $8.502B)와 FCF -$5.396B를 기록했다. 따라서 OCI 수요 강세를 실수요 확인으로 반영하되 대규모 CAPEX·외부자금 조달에 따른 신용/할인율 리스크를 분리해서 본다. 중국 전체 무역과 협력 LOI는 AI 매출로 직접 환산하지 않는다.';
    d.verdict='Oracle OCI/RPO 급증으로 실수요 강화 · CAPEX/FCF 조달 리스크 병존';
    d.srcs=addSrc(d.srcs,'Oracle FY27 Q1 공식 실적',sourceUrl);
  }
  writeJson(p,j);
}

// Cycle demand-leading context.
{
  const p='cycle.json',j=readJson(p),d=(j.clusters||[]).find(x=>x.id==='D');
  if(d){
    const tag='Oracle FY27 Q1 OCI $7.4B(+121% YoY)·RPO $664B·CAPEX $28.499B';
    if(!String(d.now).includes('Oracle FY27 Q1')) d.now=tag+' · '+d.now;
    d.updated='2026-09-12'; d.history=Array.isArray(d.history)?d.history:[];
    if(!d.history.some(x=>x.date==='2026-09-12'&&String(x.note).includes('Oracle'))) d.history.unshift({date:'2026-09-12',note:'Oracle FY27 Q1: OCI $7.4B(+121% YoY), RPO $638B→$664B, Q1 CAPEX $28.499B, 추가 AI Cloud 계약 $30B+, Q2 Cloud 성장 +65~71% 가이던스. 수요 선행 신호 강화와 자본집약도 리스크를 동시에 반영.'});
  }
  j.periodicReleaseContext=j.periodicReleaseContext||{};
  j.periodicReleaseContext.oracle={release:'FY27 Q1',periodEnded:'2026-08-31',revenueB:19.345,cloudRevenueB:11.607,iaasRevenueB:7.4,iaasYoy:121,rpoB:664,prevRpoB:638,capexB:28.499,freeCashFlowB:-5.396,q2RevenueGrowthPct:[30,34],q2CloudGrowthPct:[65,71],source:sourceUrl,registeredAt:'2026-09-10',interpretation:'OCI·RPO 급증은 AI 인프라 수요의 실적 전환 확인. CAPEX·FCF는 조달 리스크 병행 점검.'};
  writeJson(p,j);
}

// Risk: financing intensity and FCF pressure.
{
  const p='risk.json',j=readJson(p),x=(j.items||[]).find(v=>v.id==='credit');
  if(x){
    const fact='Oracle FY27 Q1 CAPEX $28.499B·FCF -$5.396B·$20B ATM equity 완료, OCI +121%·RPO $664B';
    if(!String(x.verdict).includes('FY27 Q1 CAPEX')) x.verdict=fact+' — 강한 수요가 대규모 선투자와 외부자금 조달을 동시에 요구한다. '+x.verdict;
    x.gauge=Array.isArray(x.gauge)?x.gauge:[];
    const g=x.gauge.find(v=>v.k==='Oracle FY27 Q1 자본집약도');
    if(g){g.v='$28.5B CAPEX';g.d='up';g.n='FCF -$5.4B · $20B ATM equity 완료 · RPO $664B';} else x.gauge.unshift({k:'Oracle FY27 Q1 자본집약도',v:'$28.5B CAPEX',d:'up',n:'FCF -$5.4B · $20B ATM equity 완료 · RPO $664B'});
    x.srcs=Array.isArray(x.srcs)?x.srcs:[]; if(!x.srcs.some(v=>String(v.label).includes('Oracle FY27 Q1')))x.srcs.unshift({label:'Oracle FY27 Q1 공식 실적 — OCI +121%·RPO $664B·CAPEX $28.499B·FCF -$5.396B',url:sourceUrl});
    x.upd='2026-09-12';
  }
  j.asOf='2026-09-12'; writeJson(p,j);
}

// Calendar result card.
{
  const p='calendar.json',j=readJson(p); j.asOf=now;
  j.note=(j.note||'')+' 2026-09-12 Oracle FY27 Q1 공식 실적을 AI 인프라 분기 발표 소비처에 동기화.';
  j.events=Array.isArray(j.events)?j.events:[];
  if(!j.events.some(e=>e.lbl==='Oracle FY27 Q1 실적')) j.events.push({d:'2026-09-11',cat:'earn',lbl:'Oracle FY27 Q1 실적',tk:'ORCL',meta:'발표 확인 · Oracle 공식 IR 2026-09-10 등록. FY27 Q1 매출 $19.345B(+30% YoY), Cloud $11.607B(+62%), OCI/IaaS $7.4B(+121%), RPO $664B(Q4 $638B), CAPEX $28.499B(전년동기 $8.502B), FCF -$5.396B. Q2 가이던스: 매출 +30~34%, Cloud +65~71%, 비GAAP EPS $1.85~1.93. FY27 매출 최소 $90B, 비GAAP EPS $8.10. · 원문: '+sourceUrl+' · 등록일: 2026-09-10 · 확인: 2026-09-12 08:15 KST',when:'09-11 KST (발표 완료 · OCI $7.4B +121% / RPO $664B)'});
  j.events.sort((a,b)=>String(a.d).localeCompare(String(b.d))||String(a.lbl).localeCompare(String(b.lbl))); writeJson(p,j);
}

// 02 signal log; 04 consumes the shared signal context.
{
  const p='signal_log.json',j=readJson(p); j.asOf='2026-09-12'; j.log=Array.isArray(j.log)?j.log:[];
  if(!j.log.some(e=>String(e.source).includes('Oracle FY27 Q1 공식 실적'))) j.log.push({date:'2026-09-10',at:now,source:'Oracle FY27 Q1 공식 실적 — AI 인프라 수요·CAPEX·RPO 동기화',srcs:[{label:'Oracle FY27 Q1 official results',url:sourceUrl}],items:[
    {tag:'L2·AI Cloud 실수요',layer:'L2',col:'#0ca678',html:'<b>Oracle FY27 Q1 OCI/IaaS $7.4B(+121% YoY), RPO $664B(Q4 $638B), 추가 AI Cloud 계약 $30B+.</b> 300,000개+ GPU 전달과 850MW 추가 데이터센터 캐파가 계약→설비→매출 전환을 동시에 확인. Q2 Cloud 성장 +65~71% 가이던스로 수요 둔화 신호는 아직 없음.'},
    {tag:'자본집약도·조달',layer:'macro',col:'#e03131',html:'<b>Q1 CAPEX $28.499B(전년동기 $8.502B), FCF -$5.396B, $20B ATM equity 완료.</b> 수요 강세가 곧바로 FCF 개선을 뜻하지 않으며 AI 인프라 투자 확대가 외부자금 조달·신용스프레드·할인율 민감도를 높이는 경로를 함께 반영.'}
  ]});
  writeJson(p,j);
}

// 02 AI demand/supply roadmap direct current fact.
{
  const p='aisd.js'; let s=fs.readFileSync(p,'utf8');
  if(!s.includes('Oracle FY27 Q1 · OCI $7.4B')){
    const anchor='    <span><span class="k">매출</span>클라우드 AI 증분';
    if(!s.includes(anchor)) throw new Error('aisd Oracle consumer anchor missing');
    s=s.replace(anchor,'    <span><span class="k">Oracle FY27 Q1</span>OCI <b>$7.4B(+121%)</b> · RPO <b>$664B</b> · CAPEX <b>$28.499B</b> · FCF <b>-$5.396B</b></span>\n'+anchor);
    s=s.replace('Oracle FY27 Q1</span>OCI','Oracle FY27 Q1 · OCI');
    fs.writeFileSync(p,s);
  }
}

// 04 AI bubble watch: keep 3-hyperscaler aggregate definition unchanged, add Oracle as supplemental official evidence.
{
  const p='council-view-collapse.js'; let s=fs.readFileSync(p,'utf8');
  if(!s.includes('Oracle FY27 Q1 공식 보조신호')){
    const anchor="'<div class=\"ab-foot\">' + Q.asOf + ' 기준. RPO·매출·CAPEX·영업이익률은 바로 위 클라우드 분기 그래프와 동일 데이터로 계산. 현재 값만으로 산업 전체의 버블 여부를 단정하지 않으며, 공급망 지표는 근거 데이터 연결 전까지 점수에 포함하지 않음.</div>'";
    if(!s.includes(anchor)) throw new Error('council Oracle foot anchor missing');
    const rep="'<div class=\"ab-foot\">' + Q.asOf + ' 기준. RPO·매출·CAPEX·영업이익률은 바로 위 클라우드 분기 그래프와 동일 데이터로 계산. 현재 값만으로 산업 전체의 버블 여부를 단정하지 않으며, 공급망 지표는 근거 데이터 연결 전까지 점수에 포함하지 않음. <b>Oracle FY27 Q1 공식 보조신호:</b> OCI $7.4B(+121% YoY), RPO $664B, CAPEX $28.499B, FCF -$5.396B, Q2 Cloud +65~71% 가이던스. 기존 3사 합계 시계열 정의에는 섞지 않고 별도 교차검증으로 사용.</div>'";
    s=s.replace(anchor,rep); fs.writeFileSync(p,s);
  }
}

// Changelog.
{
  const p='changelog.js'; let s=fs.readFileSync(p,'utf8');
  if(!s.includes('Oracle FY27 Q1 OCI $7.4B')){
    const anchor='  var MKT_CHANGELOG=[\n'; if(!s.includes(anchor))throw new Error('changelog anchor missing');
    s=s.replace(anchor,anchor+"    {d:'2026-09-12',t:'01·02·04 Oracle FY27 Q1 공식 실적 동기화 — 매출 $19.345B, OCI $7.4B(+121% YoY), RPO $664B, CAPEX $28.499B, FCF -$5.396B, Q2 Cloud +65~71% 가이던스를 01 카드·RPO 시계열·캘린더·pulse/cycle/risk·02 signal_log·04 버블경보 보조신호에 동시 반영'},\n");
    fs.writeFileSync(p,s);
  }
}

console.log('Oracle FY27 Q1 release consumers synchronized');
