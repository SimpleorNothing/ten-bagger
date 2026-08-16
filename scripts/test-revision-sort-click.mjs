import fs from 'node:fs';
const s=fs.readFileSync('capital-scarcity.js','utf8');
const must=[
  "data-tracker-sort=\"1\"",
  "document.addEventListener('click'",
  "sortTrackerBy(th)",
  "MutationObserver(function()",
  "decorateTrackerSort();"
];
for(const x of must){if(!s.includes(x))throw new Error('missing sort regression anchor: '+x);}
if(!/rows\.forEach\(function\(x\)\{body\.appendChild\(x\.tr\);\}\)/.test(s))throw new Error('tbody reorder missing');
console.log('revision tracker delegated-sort regression anchors OK');
