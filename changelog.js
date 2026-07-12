/* changelog.js — 01 시장 모니터링 헤더 업데이트 이력 위젯 (insight.js 처럼 자가 마운트).
   헤더 우상단에 'update : YYYY.MM.DD 주요내용' 배지를 얹고, 클릭 시 전체 이력을 팝업으로 띄운다.
   index.html 의 기존 .cyc-upd(배지)·.cyc-pop(모달) CSS 를 재사용한다 — 신규 컴포넌트·토큰 없음.
   신규 항목은 아래 MKT_CHANGELOG 맨 위에 {d:'YYYY-MM-DD',t:'주요내용'} 로 추가한다(최신순). */
(function(){
  var MKT_CHANGELOG=[
    {d:'2026-07-12',t:'종목 뉴스 차트: 시작·마지막 값을 그래프 끝점에 붙여 표시 + 수치 표기 정리(10 미만 소수 1자리·10 이상 정수)'},
    {d:'2026-07-12',t:'지표·보유 카드 그래프 높이 정렬 + 끝점 값 라벨 가독성 개선(배경 투명)'},
    {d:'2026-07-12',t:'지표·보유 종목 기간 선택 버튼(1M·6M·1Y·3Y·5Y) 추가'},
    {d:'2026-07-12',t:'헤더에 업데이트 이력 배지·팝업 추가 — 클릭하면 사이트 변경 이력을 한눈에'},
    {d:'2026-07-12',t:'종목 뉴스 그래프를 카드 상단 정렬 + 처음·마지막 값 헤더 표시'},
    {d:'2026-07-12',t:'스파크라인에 X축 시작·끝 라벨(시점·값) 추가'},
    {d:'2026-07-12',t:'지표·보유 종목 카드에 전일대비 변동 병기'},
    {d:'2026-07-12',t:'관련 기사 매크로 축 정규화 — 중복 블록 8→5개로 정리'},
    {d:'2026-07-12',t:'종목 뉴스 1일 2회 갱신(06:12 미장·18:12 한장) + 3개월 창·더보기'},
    {d:'2026-07-12',t:'03 관점과 정보 얻기 — 관점 등급(관찰→확신) 자동 승격 도입'}
  ];
  var CSS='.mkt-upd{position:absolute;top:2px;right:0;margin:0;max-width:min(52vw,440px);'
    +'white-space:nowrap;flex-wrap:nowrap;z-index:3}'
    +'.mkt-upd .mu-t{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    +'.mkt-upd .his{flex:0 0 auto}'
    +'@media(max-width:600px){.mkt-upd{position:static;margin:10px 0 0;max-width:100%}}';
  function injectCSS(){
    if(document.getElementById('mktUpdCss'))return;
    var s=document.createElement('style');s.id='mktUpdCss';s.textContent=CSS;
    (document.head||document.documentElement).appendChild(s);
  }
  function fmtDate(d){return d?String(d).replace(/-/g,'.'):'—';}
  function esc(s){return String(s==null?'':s).replace(/[&<>]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[m];});}
  function sorted(){return MKT_CHANGELOG.slice().sort(function(a,b){return String(b.d).localeCompare(String(a.d));});}
  var bg,pop;
  function els(){
    if(!bg){bg=document.createElement('div');bg.className='cyc-pop-bg';document.body.appendChild(bg);bg.addEventListener('click',hide);}
    if(!pop){pop=document.createElement('div');pop.className='cyc-pop';document.body.appendChild(pop);}
  }
  function hide(){if(bg)bg.classList.remove('on');if(pop)pop.classList.remove('on');}
  function open(){
    els();
    var list=sorted();
    var rows=list.length?('<ul>'+list.map(function(h){return '<li><span class="d">'+fmtDate(h.d)+'</span><span class="n">'+esc(h.t)+'</span></li>';}).join('')+'</ul>'):'<div class="cyc-pop-empty">기록된 업데이트 이력이 없습니다.</div>';
    pop.innerHTML='<div class="cyc-pop-h"><b>업데이트 이력</b><span>총 '+list.length+'건</span><span class="cyc-pop-x" title="닫기">✕</span></div>'+rows;
    pop.querySelector('.cyc-pop-x').addEventListener('click',hide);
    bg.classList.add('on');pop.classList.add('on');
  }
  function render(n){
    var list=sorted();
    if(!list.length){n.textContent='';return;}
    var top=list[0];
    n.innerHTML='update : '+fmtDate(top.d)+' · <span class="mu-t">'+esc(top.t)+'</span> · <span class="his">이력 '+list.length+'</span>';
    n.setAttribute('title','클릭 시 전체 업데이트 이력');
    if(!n._wired){n._wired=true;
      n.addEventListener('click',open);
      n.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
    }
  }
  function mount(){
    var vh=document.querySelector('#v-market .vhead');if(!vh)return;
    injectCSS();
    var n=vh.querySelector('.mkt-upd');
    if(!n){
      vh.style.position='relative';
      n=document.createElement('span');
      n.className='cyc-upd mkt-upd';n.id='mktUpd';
      n.setAttribute('role','button');n.setAttribute('tabindex','0');n.setAttribute('aria-haspopup','dialog');
      vh.appendChild(n);
    }
    render(n);
  }
  document.addEventListener('keydown',function(e){if(e.key==='Escape')hide();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
