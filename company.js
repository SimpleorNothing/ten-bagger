/* 02 기업분석 — 독립 기업 전략 보드를 알파맵 상단 메뉴에 연결한다. */
(function(){
  'use strict';
  function mount(){
    var nav=document.getElementById('nav');
    var main=document.querySelector('main.wrap');
    if(!nav||!main)return;

    var btn=nav.querySelector('.tab[data-v="company"]');
    if(!btn){
      btn=document.createElement('button');
      btn.className='tab';
      btn.setAttribute('data-v','company');
      btn.innerHTML='<span class="n"></span>기업분석';
      var market=nav.querySelector('.tab[data-v="market"]');
      if(market)nav.insertBefore(btn,market.nextSibling); else nav.insertBefore(btn,nav.firstChild);
    }

    var sec=document.getElementById('v-company');
    if(!sec){
      sec=document.createElement('section');
      sec.className='view';
      sec.id='v-company';
      sec.innerHTML=''
        +'<div class="vhead" style="position:relative">'
        +'<div class="vkick">Company Analysis · 기업별 전략·실적 추적</div>'
        +'<h1 class="vtitle">기업의 <em>전략과 실행</em>을 한 화면에서</h1>'
        +'<p class="vsub">사업 전략, 제품·고객·투자, 실적 궤적과 수주 가시성을 기업별로 추적합니다. 확인된 사실과 투자 해석을 분리해 표시합니다.</p>'
        +'<span class="updstamp abs">update : 2026.08.17</span>'
        +'</div>'
        +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 14px">'
        +'<button type="button" class="iobtn" data-company="marvell" style="color:var(--onacc);background:var(--dawn);border-color:var(--dawn)">Marvell Technology · MRVL</button>'
        +'</div>'
        +'<div style="background:var(--panel);border:1px solid var(--line);border-radius:3px;overflow:hidden">'
        +'<iframe id="companyFrame" src="/marvell/" title="Marvell 기업분석" loading="eager" style="display:block;width:100%;height:1200px;border:0;background:var(--ink)"></iframe>'
        +'</div>';
      var insight=document.getElementById('v-insight');
      if(insight)main.insertBefore(sec,insight); else main.appendChild(sec);
    }

    function renumber(){
      Array.prototype.forEach.call(nav.querySelectorAll('.tab'),function(t,i){
        var n=t.querySelector('.n');
        if(n)n.textContent=(i+1<10?'0':'')+(i+1);
      });
    }
    function activate(){
      Array.prototype.forEach.call(nav.querySelectorAll('.tab'),function(t){t.classList.remove('on');});
      Array.prototype.forEach.call(main.querySelectorAll('.view'),function(v){v.classList.remove('on');});
      btn.classList.add('on');
      sec.classList.add('on');
      var ab=document.getElementById('asofBox');if(ab)ab.style.display='none';
      try{window.scrollTo({top:0,behavior:'auto'});}catch(e){window.scrollTo(0,0);}
      resizeFrame();
    }
    function resizeFrame(){
      var f=document.getElementById('companyFrame');if(!f)return;
      try{
        var d=f.contentDocument;
        if(!d)return;
        var h=Math.max(d.documentElement.scrollHeight,d.body?d.body.scrollHeight:0,900);
        f.style.height=Math.min(Math.max(h,900),5200)+'px';
      }catch(e){}
    }

    btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();activate();});
    nav.addEventListener('click',function(e){
      var t=e.target.closest&&e.target.closest('.tab');
      if(!t||t===btn)return;
      sec.classList.remove('on');
    });
    var frame=document.getElementById('companyFrame');
    if(frame)frame.addEventListener('load',function(){resizeFrame();setTimeout(resizeFrame,250);setTimeout(resizeFrame,1000);});
    window.addEventListener('resize',function(){if(sec.classList.contains('on'))resizeFrame();});
    renumber();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
