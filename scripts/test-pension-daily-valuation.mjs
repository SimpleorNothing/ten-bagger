import assert from 'node:assert/strict';
import { applyPensionDailyValuation, fetchNaverClose, snapshotNeedsSameDayCaptureRefresh } from '../pension-daily-valuation.js';

// These tests are intentionally network-free; production quote access is verified after deployment.
function naverResponse(rows,status=200){return new Response(JSON.stringify([['날짜','시가','고가','저가','종가','거래량'],...rows]).replace(/"/g,"'"),{status});}

const base={source:'NHPLUG',readOnly:true,accounts:[
  {label:'개인투자',dataSource:'NHPLUG',domestic:{Output_1:[{iem_cd:'005930',itg_bnc_qty:2,now_pr:260000,eal_amt:520000}]},overseas:[]},
  {label:'DC',dataSource:'MANUAL_CAPTURE',asOf:'2026-09-12',domestic:{Output_0:[{tot_evlu_amt:2000}],Output_1:[{iem_cd:'111111',iem_nm:'A',itg_bnc_qty:2,pchs_amt:1600,now_pr:1000,eal_amt:2000}]},overseas:[]},
  {label:'개인형IRP',dataSource:'MANUAL_CAPTURE',asOf:'2026-09-12',domestic:{Output_0:[{tot_evlu_amt:3000}],Output_1:[{iem_cd:'222222',iem_nm:'B',itg_bnc_qty:3,pchs_amt:2100,now_pr:1000,eal_amt:3000}]},overseas:[]},
]};

let calls=0;
const fetchMock=async (url)=>{calls++;if(url.includes('111111'))return naverResponse([['20260911',0,0,0,1200,0]]);if(url.includes('222222'))return naverResponse([['20260911',0,0,0,900,0]]);return naverResponse([],200);};

const captureDay=await applyPensionDailyValuation(base,'2026-09-12',fetchMock);
assert.equal(calls,0,'capture date must not fetch market prices');
assert.equal(captureDay.accounts[1].valuationMode,'CAPTURE_EXACT');
assert.equal(captureDay.accounts[1].domestic.Output_1[0].eal_amt,2000);
assert.equal(captureDay.accounts[0].domestic.Output_1[0].eal_amt,520000,'personal NHPLUG value must stay untouched');

const nextDay=await applyPensionDailyValuation(base,'2026-09-13',fetchMock);
assert.equal(nextDay.accounts[1].valuationMode,'QUANTITY_X_DAILY_PRICE');
assert.equal(nextDay.accounts[1].quantityAsOf,'2026-09-12');
assert.equal(nextDay.accounts[1].valuationDate,'2026-09-13');
assert.equal(nextDay.accounts[1].valuationPriceDate,'2026-09-11');
assert.equal(nextDay.accounts[1].domestic.Output_1[0].now_pr,1200);
assert.equal(nextDay.accounts[1].domestic.Output_1[0].eal_amt,2400);
assert.equal(nextDay.accounts[1].domestic.Output_1[0].eal_pls_amt,800);
assert.equal(nextDay.accounts[1].domestic.Output_1[0].pft_rt,50);
assert.equal(nextDay.accounts[1].domestic.Output_0[0].tot_evlu_amt,2400);
assert.equal(nextDay.accounts[2].domestic.Output_1[0].eal_amt,2700);
assert.equal(nextDay.accounts[0].domestic.Output_1[0].eal_amt,520000);

const q=await fetchNaverClose('111111','2026-09-13',fetchMock);
assert.deepEqual(q,{code:'111111',price:1200,marketDate:'2026-09-11',source:'NAVER_CLOSE'});

const fallbackDay=await applyPensionDailyValuation(base,'2026-09-13',async()=>naverResponse([]));
assert.equal(fallbackDay.accounts[1].valuationSource,'NAVER_CLOSE_OR_PREVIOUS_VALID_PRICE');
assert.equal(fallbackDay.accounts[1].domestic.Output_1[0].now_pr,1000);
assert.equal(fallbackDay.accounts[1].domestic.Output_1[0].eal_amt,2000);
assert.equal(fallbackDay.accounts[1].domestic.Output_1[0].valuation_source,'PREVIOUS_VALID_PRICE');
assert.equal(fallbackDay.accounts[1].domestic.Output_1[0].valuation_price_date,'2026-09-12');

const noPreviousPrice=structuredClone(base);
delete noPreviousPrice.accounts[1].domestic.Output_1[0].now_pr;
await assert.rejects(()=>applyPensionDailyValuation(noPreviousPrice,'2026-09-13',async()=>naverResponse([])),/PENSION_PRICE_EMPTY/);

const storedEstimated={snapshot:{accounts:[{label:'DC',dataSource:'MANUAL_CAPTURE',quantityAsOf:'2026-09-12',valuationMode:'QUANTITY_X_DAILY_PRICE'}]}};
const currentCapture=[{label:'DC',dataSource:'MANUAL_CAPTURE',asOf:'2026-09-13'}];
assert.equal(snapshotNeedsSameDayCaptureRefresh(storedEstimated,currentCapture,'2026-09-13'),true);
const storedExact={snapshot:{accounts:[{label:'DC',dataSource:'MANUAL_CAPTURE',quantityAsOf:'2026-09-13',valuationMode:'CAPTURE_EXACT'}]}};
assert.equal(snapshotNeedsSameDayCaptureRefresh(storedExact,currentCapture,'2026-09-13'),false);

console.log('pension daily valuation checks passed');
