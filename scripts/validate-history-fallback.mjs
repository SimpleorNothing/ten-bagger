import fs from 'node:fs';
const s=fs.readFileSync('site-change-live.js','utf8');
if(!s.includes("fetch('/changelog.js?t=")) throw new Error('missing changelog fallback');
if(!s.includes('parseCurated')) throw new Error('missing curated parser');
if(!s.includes('siteChangeHistoryModal')) throw new Error('missing history modal');
console.log('site history fallback OK');
