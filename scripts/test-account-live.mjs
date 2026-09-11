import fs from 'node:fs';

const js = fs.readFileSync('account-live.js','utf8');
const worker = fs.readFileSync('worker-hotfix.js','utf8');

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
  [!js.includes('/order') && !js.includes('/buy') && !js.includes('/sell'), 'no trading endpoints'],
];

for (const [ok,label] of checks) {
  if (!ok) throw new Error(`계좌현황 회귀: ${label}`);
}
console.log(`account-live checks passed (${checks.length})`);
