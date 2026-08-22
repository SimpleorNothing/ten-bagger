import fs from 'node:fs';
const H=JSON.parse(fs.readFileSync('holdings.json','utf8'));
const G=fs.existsSync('gamma.json')?JSON.parse(fs.readFileSync('gamma.json','utf8')):{};
const layer=id=>(H.holdings||[]).find(x=>x.layer===id)||{};
const w=id=>Number(layer(id).w||0);
const mu=G?.gamma?.MU||{}; const fy1=mu?.rev?.eps?.fy1||{}, px=mu?.rev?.px||{};
const gap=Number.isFinite(Number(px.c30))&&Number.isFinite(Number(fy1.c30))?Number(px.c30)-Number(fy1.c30):null;
const stage=mu.stage||'—';
const band=stage==='가속'||stage==='초입'?'38–45%':stage==='성숙'?'34–40%':stage==='과열'?'28–35%':'34–40%';
const hard=stage==='가속'||stage==='초입'?50:stage==='과열'?42:47;
const l3=w('L3');
const l3Action=l3>hard?'축소 검토 / 추가매수 원칙 제한':l3>Number(band.split('–')[1].replace('%',''))?'유지 / 추가매수 허들 상향':'유지';
const p=x=>`${x.toFixed(1)}%`;
const data={
 asOf:H.asOf,
 summary:`최신 보유원장 기준 AI 인프라 집중도가 높으며 L3 메모리 ${p(l3)}는 ${stage} 사이클 권고밴드 ${band}${l3>hard?` 및 집중상한 ${hard}% 초과`:`에 대해 집중도를 점검할 구간`}이다. 과거 수익률이 아니라 EPS 리비전·가격·업황·중복노출로 추가매수 여부를 판단한다.`,
 actions:[
  {area:'L3 메모리',weight:p(l3),action:l3Action,note:`${stage} 밴드 ${band}, 집중상한 ${hard}%. MU FY+1 EPS 30d ${fy1.c30??'—'}%, 90d ${fy1.c90??'—'}%, 주가−EPS 30d ${gap==null?'—':gap.toFixed(1)+'%p'}`},
  {area:'L2 연산칩',weight:p(w('L2')),action:'유지',note:'실적·가이던스와 AI ASIC 수요 확인'},
  {area:'L6 연결·광통신',weight:p(w('L6')),action:'조건부 확대 후보',note:'EPS 리비전·수주 가시성과 ETF 중복노출 비교'},
  {area:'L8 전력 인프라',weight:p(w('L8')),action:'조건부 확대 후보',note:'데이터센터 전력 CAPEX와 수주·백로그 확인'},
  {area:'L4 소부장',weight:p(w('L4')),action:'관찰',note:'실적 가시성이 높은 병목 후보 우선'},
  {area:'기타',weight:p(w('기타')),action:'유지',note:'AI 인프라와 다른 수익동인 및 개별 변동성 관리'},
  {area:'현금',weight:p(w('현금')),action:'유지',note:'L3 약화 또는 L6/L8 상대매력 개선 시 재배치 옵션'}
 ],
 next:'축소 조건: MU 30/90일 EPS 리비전 둔화·하향과 DRAM/HBM 선행지표 약화가 동반되면 L3 사이클·비중을 재평가. 추가매수 조건: EPS 개선 속도가 주가보다 빠르고 γ·수요·가격 근거가 강화되며 매크로 매수 게이트가 열릴 때만 분할 접근.'
};
fs.writeFileSync('allocation-review.json',JSON.stringify(data,null,2)+'\n');
console.log(`allocation review updated: ${data.asOf}`);
