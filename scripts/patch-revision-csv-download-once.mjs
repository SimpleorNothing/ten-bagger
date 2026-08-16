import fs from 'node:fs';
const p='index.html';
let s=fs.readFileSync(p,'utf8');
const old=`    var csvBtn=document.getElementById('revCsvDownload');
    if(csvBtn)csvBtn.addEventListener('click',function(){
      var cols=['종목','티커','목표가','상승여력(%)','TP리비전7일(%)','TP리비전30일(%)','FY+1 EPS','EPS리비전30일(%)','EPS리비전90일(%)','상향30일','하향30일','주가30일(%)','주가90일(%)','강등게이트30일(%p)','원천데이터'];
      var val=function(v){return v==null?'':v;};
      var lines=[cols].concat(rows.map(function(o){var r=o.r,f=o.f1||{},tp=r.tp||{},px=r.px||{},pr=r.provenance||{};return [NM[o.tk]||o.tk,o.tk,val(tp.now),val(o.e.pct),val(tp.c7),val(tp.c30),val(f.now),val(f.c30),val(f.c90),val(f.up30),val(f.dn30),val(px.c30),val(px.c90),val(o.gate),val(pr.rawRef)];}));
      var csv='\\ufeff'+lines.map(function(a){return a.map(function(v){return '\"'+String(v).replace(/\"/g,'\"\"')+'\"';}).join(',');}).join('\\r\\n');
      var url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
      a.href=url;a.download='revision-tracker-'+asOf+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},0);
      var d=document.getElementById('revRawMenu');if(d)d.open=false;
    });`;
const neu=`    var csvBtn=document.getElementById('revCsvDownload');
    if(csvBtn)csvBtn.addEventListener('click',function(){
      var a=document.createElement('a');
      a.href='/raw/revisions/latest.csv';
      a.download='revision-tracker-'+asOf+'.csv';
      document.body.appendChild(a);a.click();a.remove();
      var d=document.getElementById('revRawMenu');if(d)d.open=false;
    });`;
const n=s.split(old).length-1;
if(n!==1)throw new Error('expected exactly one legacy revision CSV handler, found '+n);
s=s.replace(old,neu);
fs.writeFileSync(p,s);
console.log('materialized revision CSV v2 download handler');
