/* 02 기업분석 — 독립 기업 전략 보드를 알파맵 상단 메뉴에 연결한다. */
(function(){
  'use strict';
  var COMPANIES=[
    {id:'marvell',label:'Marvell Technology · MRVL',src:'/marvell/',title:'Marvell 기업분석'},
    {id:'lumentum',label:'Lumentum · LITE',src:'/lumentum/',title:'Lumentum 기업분석'}
  ];
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
      var switchButtons=COMPANIES.map(function(c,i){
        return '<button type="button" class="iobtn company-switch'+(i===0?' on':'')+'" data-company="'+c.id+'" aria-pressed="'+(i===0?'true':'false')+'" style="font-weight:700;'+(i===0?'color:var(--onacc);background:var(--dawn);border-color:var(--dawn)':'')+'">'+c.label+'</button>';
      }).join('');
      sec.innerHTML=''
        +'<div class="vhead" style="position:relative">'
        +'<div class="vkick">Company Analysis · 기업별 전략·실적 추적</div>'
        +'<h1 class="vtitle">기업의 <em>전략과 실행</em>을 한 화면에서</h1>'
        +'<p class="vsub">사업 전략, 제품·고객·투자, 실적 궤적과 수주 가시성을 기업별로 추적합니다. 확인된 사실과 투자 해석을 분리해 표시합니다.</p>'
        +'<span class="updstamp abs">update : 2026.08.17</span>'
        +'</div>'
        +'<div id="companySwitch" aria-label="기업 선택" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 14px;padding:9px 10px;background:var(--panel);border:1px solid var(--line);border-radius:9px">'
        +'<span style="font-size:12px;font-weight:700;color:var(--faint);margin-right:3px">기업</span>'+switchButtons
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
    function resizeFrame(){
      var f=document.getElementById('companyFrame');if(!f)return;
      try{
        var d=f.contentDocument;
        if(!d)return;
        var h=Math.max(d.documentElement.scrollHeight,d.body?d.body.scrollHeight:0,900);
        f.style.height=Math.min(Math.max(h,900),6200)+'px';
      }catch(e){}
    }
    function selectCompany(id){
      var c=null;
      for(var i=0;i<COMPANIES.length;i++)if(COMPANIES[i].id===id){c=COMPANIES[i];break;}
      if(!c)return;
      var f=document.getElementById('companyFrame');
      Array.prototype.forEach.call(sec.querySelectorAll('[data-company]'),function(b){
        var on=b.getAttribute('data-company')===id;
        b.classList.toggle('on',on);
        b.setAttribute('aria-pressed',on?'true':'false');
        b.style.color=on?'var(--onacc)':'';
        b.style.background=on?'var(--dawn)':'';
        b.style.borderColor=on?'var(--dawn)':'';
      });
      if(f){
        var current=f.getAttribute('data-company');
        f.setAttribute('data-company',id);
        f.title=c.title;
        if(current!==id){f.style.height='1200px';f.src=c.src;}
      }
      try{sessionStorage.setItem('alpha_company',id);}catch(e){}
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

    btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();activate();});
    nav.addEventListener('click',function(e){
      var t=e.target.closest&&e.target.closest('.tab');
      if(!t||t===btn)return;
      sec.classList.remove('on');
    });
    sec.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('[data-company]');
      if(!b)return;
      selectCompany(b.getAttribute('data-company'));
    });
    var frame=document.getElementById('companyFrame');
    if(frame)frame.addEventListener('load',function(){resizeFrame();setTimeout(resizeFrame,250);setTimeout(resizeFrame,1000);});
    window.addEventListener('resize',function(){if(sec.classList.contains('on'))resizeFrame();});
    renumber();
    var initial='marvell';
    try{var saved=sessionStorage.getItem('alpha_company');if(COMPANIES.some(function(c){return c.id===saved;}))initial=saved;}catch(e){}
    selectCompany(initial);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
