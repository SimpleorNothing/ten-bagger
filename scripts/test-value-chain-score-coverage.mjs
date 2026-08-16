import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const gamma = JSON.parse(fs.readFileSync('gamma.json', 'utf8')).gamma || {};
const scores = JSON.parse(fs.readFileSync('scores.json', 'utf8')).rows || {};
const start = html.indexOf('const C=[');
const end = html.indexOf('];\n\n/* ===== STATE', start);
if (start < 0 || end < 0) throw new Error('Value Chain candidate array not found');

const block = html.slice(start, end);
const tickers = [...block.matchAll(/\{id:'[^']+',name:'[^']+',ticker:'([^']+)'/g)].map((m) => m[1]);
const unique = [...new Set(tickers)];
const missingGamma = unique.filter((ticker) => !gamma[ticker]);
const missingScores = unique.filter((ticker) => !scores[ticker]);

if (unique.length < 28) throw new Error(`Value Chain ticker count too small: ${unique.length}`);
if (missingGamma.length) throw new Error(`gamma coverage missing: ${missingGamma.join(', ')}`);
if (missingScores.length) throw new Error(`scores coverage missing: ${missingScores.join(', ')}`);

console.log(`Value Chain investment-score coverage OK: ${unique.length}/${unique.length}`);
