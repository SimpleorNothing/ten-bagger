import fs from 'node:fs';

const js = fs.readFileSync('account-live.js','utf8');
const worker = fs.readFileSync('worker-hotfix.js','utf8');
const tradingRouteLiteral = /['"]\/(?:api\/)?(?:order|orders|buy|sell|trade)(?:\/|['"?])/i.test(js);

const requiredLiveFields = [
  'itg_bnc_qty', 'now_pr', 'eal_amt', 'eal_pls_amt', 'pft_rt',
  'cns_bse_bnc_qty', 'fc_sec_end_pr', 'krw_eal_amt', 'krw_eal_pls_amt', 'eal_pft_rt', 'cur_cd',
];

const requestedAccounts = [
  "{suffix:'7747',label:'종합매매'}",
  "{suffix:'0473',label:'개인형IRP'}",
  "{suffix:'2728',label:'DC'}",
];

const hasPrivacyNotice =
  js.includes('계좌번호와 인증정보는 화면과 저장소에 노출하지 않는다') ||
  js.includes('계좌번호/고객식별자/인증정보는 마스킹 또는 제거됨');

const compactHeader = '<th>종목</th><th>현재가</th><th>수량</th><th>평가금액</th><th>수익률</th>';

const checks = [
  [js.includes("API='/api/portfolio/live'"), 'NHPLUG live endpoint'],
  [js.includes("FALLBACK='/holdings.json'"), 'holdings fallback'],
  [js.includes("b.dataset.v='account'"), 'account navigation tab'],
  [js.includes("sec.id='v-account'"), 'account view mount'],
  [js.includes("j.readOnly!==true"), 'read-only response validation'],
  [js.includes("credentials:'same-origin'"), 'same-origin authenticated fetch'],
  [js.includes('setInterval') && js.includes('300000'), 'five-minute active-view refresh'],
  [hasPrivacyNotice, 'privacy notice'],
  [worker.includes('/account-live.js?v=20260912-01'), 'HTML loader injection'],
  [worker.includes('"/account-live.js"'), 'freshness header coverage'],
  [requiredLiveFields.every((field) => js.includes(field)), 'actual NHPLUG domestic/overseas balance field mapping'],
  [js.includes('priceText(r.price,r.market,r.currency)'), 'overseas price currency rendering'],
  [requestedAccounts.every((row) => js.includes(row)), 'requested brokerage/IRP/DC account set'],
  [js.includes('ACCOUNT_TARGETS.map') && js.includes('targetAccount(accounts,target)'), 'requested-account filtering'],
  [js.includes('NHPLUG 미노출') && js.includes('연금 보유내역이 반환되지 않습니다'), 'pension API limitation messaging'],
  [js.includes(compactHeader), 'compact site fields: current price, quantity, value, return'],
  [!js.includes('<th>평가손익</th>'), 'profit/loss hidden from site table'],
  [js.includes("['eal_pft_rt1','eal_pft_rt'"), 'KRW return rate preferred for overseas positions'],
  [!js.includes("suffix:'6580'") && !js.includes("suffix:'6588'"), 'exclude incidental order-agent accounts'],
  [!tradingRouteLiteral, 'no trading route literals'],
];

for (const [ok,label] of checks) {
  if (!ok) throw new Error(`계좌현황 회귀: ${label}`);
}
console.log(`account-live checks passed (${checks.length})`);
