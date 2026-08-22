import fs from 'node:fs';
const sync=fs.readFileSync('market-sync.js','utf8');
const alloc=fs.readFileSync('allocation-dynamic.js','utf8');
const review=JSON.parse(fs.readFileSync('allocation-review.json','utf8'));
if(!sync.includes('/allocation-dynamic.js')) throw new Error('market-sync.js does not load allocation-dynamic.js');
if(!alloc.includes('weeklyAllocationReview')) throw new Error('allocation-dynamic.js lacks weekly review mount');
if(!Array.isArray(review.actions)||!review.actions.length) throw new Error('allocation-review.json actions missing');
console.log('allocation review loader OK');
