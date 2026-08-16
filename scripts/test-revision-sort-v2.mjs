import fs from 'node:fs';
const js=fs.readFileSync('revision-tracker-fix.js','utf8');
const worker=fs.readFileSync('worker-hotfix.js','utf8');
const must=[
  [js.includes('data-rev-sort'), 'sort data attribute missing'],
  [js.includes("document.addEventListener('click'"), 'delegated click missing'],
  [js.includes('MutationObserver'), 'rerender observer missing'],
  [js.includes("dataset.zbScoreValue"), 'investment score path missing'],
  [js.includes('/실제 비중조절/'), 'portfolio score path missing'],
  [worker.includes('/revision-tracker-fix.js?v=20260816-sort-v2'), 'worker injection missing'],
  [worker.includes('"/revision-tracker-fix.js"'), 'fresh path missing'],
];
for(const [ok,msg] of must)if(!ok)throw new Error(msg);
console.log('revision sort v2 wiring OK');
