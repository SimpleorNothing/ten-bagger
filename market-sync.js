/* market-sync.js — 02 인사이트 찾기 → 01 시장 모니터링 자동 반영.
   저장된 자료 중 사용자가 채택한(pick) 매크로 관점만 후보로 보내며, 실제 원문·점수 검증과
   중복 차단은 Worker/R2에서 수행한다. 숫자 보드에는 쓰지 않고 signal_log 서술 레이어만 갱신한다. */
(function(){
  var busy=false, timer=null;
  function eligible(c){
    var n=Number(c&&c.novelty||0), i=Number(c&&c.impact||0), f=Number(c&&c.confidence||0);
    return !!(c&&c.pick!==false&&c.route==='macro'&&c.text&&n+i+f>=4&&i>=1&&f>=1);
  }
  function candidates(){
    var api=window.INSIGHT, all=api&&api.all?api.all():[];
    var out=[];
    (Array.isArray(all)?all:[]).forEach(function(r){
      (Array.isArray(r&&r.claims)?r.claims:[]).forEach(function(c){
        if(eligible(c)&&r&&r.id&&c.id)out.push({recordId:String(r.id),claimId:String(c.id)});
      });
    });
    return out.slice(0,8);
  }
  function run(){
    if(busy)return;
    var items=candidates();if(!items.length)return;
    busy=true;
    fetch('/api/market-sync',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({items:items})})
      .catch(function(){}).then(function(){busy=false;});
  }
  function boot(){
    clearTimeout(timer);timer=setTimeout(run,1600);
    setInterval(run,30000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
