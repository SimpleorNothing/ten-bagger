import fs from 'node:fs';
const sync=fs.readFileSync('market-sync.js','utf8');
const alloc=fs.readFileSync('allocation-dynamic.js','utf8');
if(!sync.includes('/allocation-dynamic.js')) throw new Error('market-sync.js does not load allocation-dynamic.js');
if(!alloc.includes('dynamicAllocHurdle')) throw new Error('allocation-dynamic.js lacks allocation hurdle mount');
if(alloc.includes('weeklyAllocationReview')) throw new Error('allocation-dynamic.js still mounts weekly review');
console.log('allocation hurdle loader OK');
