import fs from 'node:fs';

const js = fs.readFileSync('account-live.js','utf8');
const worker = fs.readFileSync('worker-hotfix.js','utf8');
const tradingRouteLiteral = /['"]\/(?:api\/)?(?:order|orders|buy|sell|trade)(?:\/|['"?])/i.test(js);

const requiredLiveFields = [
  'itg_bnc_qty', 'now_pr', 'eal_amt', 'eal_pls_amt', 'pft_rt',
  'cns_bse_bnc_qty', 'fc_sec_end_pr', 'krw_eal_amt', 'krw_eal_pls_amt', 'eal_pft_rt', 'cur_cd',
];

const checks = [
  [js.includes("API='/api/portfolio/live'"), 'NHPLUG live endpoint'],
  [js.includes("FALLBACK='/holdings.json'"), 'holdings fallback'],
  [js.includes("b.dataset.v='account'"), 'account navigation tab'],
  [js.includes("sec.id='v-account'"), 'account view mount'],
  [js.includes("j.readOnly!==true"), 'read-only response validation'],
  [js.includes("credentials:'same-origin'"), 'same-origin authenticated fetch'],
  [js.includes('setInterval') && js.includes('300000'), 'five-minute active-view refresh'],
  [js.includes('계좌번호/고객식별자/인증정보는 마스킹 또는 제거됨'), 'privacy notice'],
  [worker.includes('/account-live.js?v=20260912-01'), 'HTML loader injection'],
  [worker.includes('"/account-live.js"'), 'freshness header coverage'],
  [requiredLiveFields.every((field) => js.includes(field)), 'actual NHPLUG domestic/overseas balance field mapping'],
  [js.includes('priceText(r.price,r.market,r.currency)'), 'overseas price currency rendering'],
  [!tradingRouteLiteral, 'no trading route literals'],
];

for (const [ok,label] of checks) {
  if (!ok) throw new Error(`계좌현황 회귀: ${label}`);
}
console.log(`account-live checks passed (${checks.length})`);
