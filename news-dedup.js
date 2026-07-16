/* news-dedup.js — 동일 내용(같은 사건) 기사 접기.
   출처만 다른 근접 중복(예: VRT 「2분기 실적 컨퍼런스콜 7/29 확정」 = 「2분기 실적 발표일 및 컨퍼런스콜 공지」)이
   한 종목/토픽 블록에 나란히 뜨는 것을 렌더 직후 DOM에서 1건으로 접는다. 표시 전용 — 데이터 파일 무변경(narrative≠numbers).
   판정 = 표시 요약(.asum) char-bigram Jaccard ≥ 0.35(실측 news.json 217쌍: 같은 사건 17쌍 전부 ≥.35·다른 사건 <.25).
   #mktDigest(종목 뉴스)·#mktMacroNews(관련 기사) 재렌더·「더 보기」 확장마다 MutationObserver로 재적용. */
(function(){
  function bigr(s){var n=String(s||'').toLowerCase().replace(/[^0-9a-z가-힣]/g,'');var g={};if(n.length<2){if(n)g[n]=1;return g;}for(var i=0;i<n.length-1;i++)g[n.substr(i,2)]=1;return g;}
  function sim(a,b){var ga=bigr(a),gb=bigr(b),ka=Object.keys(ga),kb=Object.keys(gb);if(!ka.length||!kb.length)return 0;var x=0;for(var i=0;i<ka.length;i++)if(gb[ka[i]])x++;var u=ka.length+kb.length-x;return u?x/u:0;}
  var TH=0.35;
  function dedupeBlock(blk){
    var seen=[];
    blk.querySelectorAll('.arow').forEach(function(a){
      var el=a.querySelector('.asum');
      var t=(el?el.textContent:a.textContent)||'';
      var dup=seen.some(function(s){return sim(t,s)>=TH;});
      if(dup)a.remove(); else seen.push(t);
    });
  }
  function run(){document.querySelectorAll('.stk-blk').forEach(dedupeBlock);}
  function watch(id){
    var host=document.getElementById(id);if(!host)return;
    var mo=new MutationObserver(function(){clearTimeout(host._dd);host._dd=setTimeout(run,60);});
    mo.observe(host,{childList:true,subtree:true});
  }
  function boot(){watch('mktDigest');watch('mktMacroNews');setTimeout(run,400);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
