/* changelog.js — 01~07 메뉴별 업데이트 배지 (자가 마운트).
   배지: 'update : YYYY.MM.DD' — 각 메뉴의 최신 변경일만 표시한다.
   클릭: 모든 메뉴의 변경 이력을 팝업으로 표시한다.
   index.html 의 기존 .cyc-upd(배지)·.cyc-pop(모달) CSS 를 재사용한다 — 신규 컴포넌트·토큰 없음.
   신규 변경 항목은 아래 MKT_CHANGELOG 맨 위에 {d:'YYYY-MM-DD',t:'주요내용'} 로 추가한다(최신순). */
(function(){
  var MENU_LAST={
    market:'2026-08-03', insight:'2026-08-03', council:'2026-08-01',
    thread:'2026-08-01', decision:'2026-08-01', brief:'2026-08-01', memo:'2026-08-01'
  };
  var MKT_CHANGELOG=[
    {d:'2026-08-03',t:'01 토픽 레이더의 각 기사에 원문 발행일을 YYYY.MM.DD 형식으로 표시하고, 원문 날짜가 없으면 날짜 미상으로 구분'},
    {d:'2026-08-03',t:'02 인사이트 찾기에 저장된 고신뢰 매크로 관점을 01 시장 모니터링의 시장 맥락으로 자동 반영하고, R2 처리 이력으로 중복 반영을 차단'},
    {d:'2026-08-02',t:'01 토픽 레이더의 관점·근거를 핵심어 기준으로 시장 맥박·리스크 보드·사이클 판별 보드 카드에 표시하고, 토픽 갱신 시 즉시 다시 연결'},
    {d:'2026-08-02',t:'01 토픽 레이더 보드 복구: 종목 뉴스 상한으로 MACRO 기사가 누락되던 오류를 수정하고, 기존 아카이브의 축별 최신 근거를 다시 반영'},
    {d:'2026-08-02',t:'01 사이클 판별 보드의 AWS 수주잔고를 2Q 실적자료 기준 $496B로 갱신하고, 인사이트 반영 시 저장 원문을 함께 검증하도록 보완'},
    {d:'2026-08-02',t:'04 분기 통합 차트의 24.1Q~26.2Q 수주잔고·Microsoft Cloud 매출·CAPEX를 기업별 공시값으로 전면 정정하고 지표 정의 차이 주석 추가'},
    {d:'2026-08-02',t:'04 분기 통합 차트의 수주잔고는 3사 모두 공개된 분기만 합산하고, AWS 26.2Q 컨퍼런스콜 기준 $496B를 반영'},
    {d:'2026-08-02',t:'04 분기 통합 차트에 AWS 26.1Q 공개 RPO $364B를 반영하고, Microsoft Intelligent Cloud 공시 영업이익률을 가중평균에 포함'},
    {d:'2026-08-02',t:'04 분기 통합 차트를 CY 실적발표 기준으로 정정: 매출은 3사 공시액, 수주잔고는 Microsoft RPO·Google Cloud backlog만 합산'},
    {d:'2026-08-02',t:'04 분기 통합 차트의 3사 구분 색상을 블루-그레이 단일 톤으로 통일'},
    {d:'2026-08-02',t:'04 분기 통합 차트의 매출 값 아래에 AWS·Google Cloud 공개 영업이익률의 매출 가중평균을 표시'},
    {d:'2026-08-02',t:'04 분기 통합 차트의 수주잔고 아래에 최신 분기 매출 연환산 기준 배수를 표시하고, 매출 아래 수주잔고 대비 비율은 제거'},
    {d:'2026-08-02',t:'04 클라우드 수요·투자 분기 차트를 수주잔고·매출·CAPEX 통합 막대그래프로 변경하고, 3사(Amazon·Microsoft·Alphabet)만 표시'},
    {d:'2026-08-02',t:'04 분기 통합 차트에 좌측 수주잔고 축($2.0T·$0.5T 간격)과 우측 매출·CAPEX 축($300B·$100B 간격)을 적용'},
    {d:'2026-08-01',t:'03 전문가 원탁 카드의 하단 정렬을 통일하고, 레이어 태그 넘침과 관점 갱신 버튼의 글자 단위 줄바꿈을 보완'},
    {d:'2026-08-01',t:'03 전문가 원탁의 고정 결과 요약 블록과 중복 이력 안내를 제거하고, 실제 토론 이력만 표시하도록 배포 갱신'},
    {d:'2026-08-01',t:'06 모닝 브리핑처럼 동적으로 생성되는 메뉴에도 제목 우측 공통 업데이트 이력이 자동 표시되도록 보완'},
    {d:'2026-08-01',t:'06 모닝 브리핑 본문의 시세·정보 갱신 시각을 제거하고, 모든 메뉴의 공통 업데이트 이력만 표시'},
    {d:'2026-08-01',t:'01 미국 지수·미 10년물·WTI 등 장 마감 데이터 갱신을 06:05 KST 1차 실행과 06:35 KST 재시도로 보강'},
    {d:'2026-08-01',t:'01~07 모든 메뉴의 업데이트 이력을 제목 우측 공통 배지로 통일하고, 화면 본문의 중복 업데이트 표시는 제거'},
    {d:'2026-08-01',t:'03 전문가 원탁의 기존 토론 이력을 모두 복구하고, 새 토론부터 최신순 최대 20건 보관'},
    {d:'2026-07-31',t:'04 전문가 원탁 토론 이력은 롱 프레스 없이 클릭만으로 삭제 버튼 표시'},
    {d:'2026-07-31',t:'04 전문가 원탁 실제 토론 이력에 롱 프레스 삭제 버튼과 서버 삭제 기능 적용'},
    {d:'2026-07-31',t:'공통 상단 시장 티커: 미국 프리마켓에는 S&P 500·NASDAQ 현물 대신 ES·NQ 선물 실시간 수치와 등락률 표시'},
    {d:'2026-07-31',t:'01~07 각 메뉴 헤더에 업데이트 날짜·전체 변경 이력 팝업 추가'},
    {d:'2026-07-31',t:'04 전문가 원탁 토론 이력에 삭제 버튼·롱 프레스 삭제 기능 추가'},
    {d:'2026-07-31',t:'01 미국 비농업고용(NFP) 월별 증감 그래프를 모든 기간에서 0선 기준 막대로 표시'},
    {d:'2026-07-30',t:'01 반도체 수출 카드의 판정 멘트를 그래프 위로 이동하고 다른 지표와 그래프 하단 위치 통일'},
    {d:'2026-07-29',t:'화면별 주가그래프 기본 기간 분리 — 01 시장 모니터링은 6M, 04 Value Chain 종목은 1Y'},
    {d:'2026-07-29',t:'주가그래프 기본 기간을 6개월에서 1년(1Y)으로 변경'},
    {d:'2026-07-28',t:'01 나스닥 드로다운 지표 카드 삭제 + NFP 6개월 월별 막대그래프 전환'},
    {d:'2026-07-28',t:'01 VIX·원/달러 공식 일별 최근 3년 전체 백필 + 기간 차트·실시간 병합'},
    {d:'2026-07-28',t:'01 미국 비농업고용(NFP) BLS 공식 최근 3년·36개월 백필 추가 + FRED 장애 시 자동 대체'},
    {d:'2026-07-28',t:'01 리스크·사이클 판별 카드도 길게 누르면 삭제 버튼 표시 — 확인 후 해당 카드 숨김'},
    {d:'2026-07-28',t:'01 리스크 보드·사이클 판별 보드는 핵심만 표시 — 카드 하단에 마우스를 올리거나 탭하면 조건·근거·관련 기사 표시'},
    {d:'2026-07-28',t:'01 지표 한곳에 VIX·공포탐욕·드로다운·환율·반도체 수출 통합 + 미국 NFP 그래프·데스크톱 카드 순서 드래그 추가'},
    {d:'2026-07-26',t:'01 맨 위에 「오늘의 투자 명언」 — 그날 증시 체온(공포·중립·과열)을 반영해 랜덤 표시, 누르면 다른 명언'},
    {d:'2026-07-17',t:'전문가 원탁 화면 헤더에도 업데이트 배지 추가 — 우상단에서 클릭하면 사이트 변경 이력을 한눈에'},
    {d:'2026-07-16',t:'04 전문가 원탁 신설 — 반도체·매크로·상대가치 전문가 5인 + 「알파맵」좌장(라이브 데이터)으로 현 상황을 교차 토론하고 이력을 남기는 화면'},
    {d:'2026-07-14',t:'종목 뉴스 차트: 기간을 여러 해로 넓히면 X축 날짜에 연도 표시(예 21-07-14 → 26-07-13) — 시작·끝이 몇 해 차인지 정확히'},
    {d:'2026-07-12',t:'03 관점과 정보 얻기 — 측처 이미지를 붙여넣기(Ctrl/⌘+V)하거나 끌어다 놓으면 글자를 인식(OCR)해 자동 입력'},
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
  // main의 커밋 이력을 GitHub API에서 읽어 모든 화면의 변경 이력에 자동 합산한다.
  // 수동 배열은 과거 이력 보존용이며, 이후 머지되는 변경은 별도 등록 없이 자동 표시된다.
  var AUTO_READY=false;
  function loadAutoHistory(){
    if(AUTO_READY)return;AUTO_READY=true;
    fetch('https://api.github.com/repos/SimpleorNothing/ten-bagger/commits?sha=main&per_page=100',{headers:{'Accept':'application/vnd.github+json'}})
      .then(function(r){return r.ok?r.json():[];}).then(function(rows){
        if(!Array.isArray(rows))return;
        rows.forEach(function(x){var c=x&&x.commit||{},d=(c.author&&c.author.date||'').slice(0,10),t=String(c.message||'').split('\n')[0].trim();if(d&&t&&!MKT_CHANGELOG.some(function(h){return h.d===d&&h.t===t;}))MKT_CHANGELOG.push({d:d,t:t});});
        renderAll();
      }).catch(function(){});
  }
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
  // 데이터 asOf("2026-07-15T23:26" KST 또는 "…YYYY-MM-DD…") → "2026.07.15 23:26" / "2026.07.15".
  function fmtStamp(s){
    if(!s)return '';
    var m=String(s).match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if(m)return m[1]+'.'+m[2]+'.'+m[3]+' '+m[4]+':'+m[5];
    var d=String(s).match(/(\d{4})-(\d{2})-(\d{2})/);
    return d?d[1]+'.'+d[2]+'.'+d[3]:'';
  }
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
    pop.innerHTML='<div class="cyc-pop-h"><b>사이트 변경 이력</b><span>총 '+list.length+'건</span><span class="cyc-pop-x" title="닫기">✕</span></div>'+rows;
    pop.querySelector('.cyc-pop-x').addEventListener('click',hide);
    bg.classList.add('on');pop.classList.add('on');
  }
  function wire(n){
    if(n._wired)return;
    n._wired=true;
    n.addEventListener('click',open);
    n.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
  }
  function render(n){
    var list=sorted();
    var his=list.length?'<span class="his">이력 '+list.length+'</span>':'';
    if(list.length){
      // update 배지는 데이터 최신 시각이 아니라 코드·UI 변경 이력의 최신 날짜를 표시한다.
      var top=list[0];
      n.innerHTML='update : '+fmtDate(top.d)+(his?' · '+his:'');
      n.setAttribute('title','최신 코드 변경일 · 클릭 시 사이트 변경 이력');
    } else {
      n.textContent='';
      return;
    }
    wire(n);
  }
  var NODES=[];
  function renderAll(){for(var i=0;i<NODES.length;i++)render(NODES[i]);}
  // 뷰 헤더(.vhead) 우상단에 배지 마운트 — 01~07 공통. .cyc-upd/.mkt-upd 스타일 재사용.
  function mountHead(sel,id,menu){
    var vh=document.querySelector(sel);if(!vh)return;
    injectCSS();
    var n=vh.querySelector('.mkt-upd');
    if(!n){
      if(getComputedStyle(vh).position==='static')vh.style.position='relative';
      n=document.createElement('span');
      n.className='cyc-upd mkt-upd';n.id=id;
      n.setAttribute('data-menu',menu);
      n.setAttribute('role','button');n.setAttribute('tabindex','0');n.setAttribute('aria-haspopup','dialog');
      vh.appendChild(n);
    }
    if(NODES.indexOf(n)<0)NODES.push(n);
    render(n);      // 즉시 폴백(변경 로그 날짜) 렌더
  }
  // 04는 aisd.js가 자체 헤더를 주입하므로, 해당 제목의 우측에도 같은 배지를 마운트한다.
  function mountThreadAisd(){
    var title=document.querySelector('#dsAisd .ds-title');if(!title)return;
    var host=title.parentNode;if(!host)return;
    injectCSS();if(getComputedStyle(host).position==='static')host.style.position='relative';
    var n=host.querySelector('.mkt-upd'),made=false;
    if(!n){n=document.createElement('span');n.className='cyc-upd mkt-upd';n.id='mktUpdThreadAisd';n.setAttribute('data-menu','thread');n.setAttribute('role','button');n.setAttribute('tabindex','0');n.setAttribute('aria-haspopup','dialog');host.appendChild(n);made=true;}
    if(NODES.indexOf(n)<0)NODES.push(n);
    // MutationObserver가 감시 중인 DOM을 매번 다시 쓰면 자기 자신을 재호출한다.
    // 신규 마운트일 때만 렌더하고, 이력 비동기 갱신은 renderAll()이 한 번 처리한다.
    if(made)render(n);
  }
  // 05 리밸런싱 추정 리비전 트래커 「기대수익 점수」 컬럼 로더(raer.js 자가 마운트).
  // index.html 무편집·worker 무편집을 위해 이미 로드되는 이 부트스트랩에서 <script>를 주입한다.
  function loadRaer(){
    if(document.getElementById('raerJs'))return;
    var s=document.createElement('script');s.id='raerJs';s.src='/raer.js';s.defer=true;
    (document.body||document.documentElement).appendChild(s);
  }
  // 01 시장 모니터링 「월간 선행지표」 카드 로더(lead.js 자가 마운트).
  function loadLead(){
    if(document.getElementById('leadJs'))return;
    var s=document.createElement('script');s.id='leadJs';s.src='/lead.js';s.defer=true;
    (document.body||document.documentElement).appendChild(s);
  }
  // 01 시장 모니터링 「리스크 보드」 로더(risk.js 자가 마운트).
  // 보유 종목 스파크라인 섹션 제거 + 리스크 3축 보드 주입을 함께 맡는다.
  function loadRisk(){
    if(document.getElementById('riskJs'))return;
    var s=document.createElement('script');s.id='riskJs';s.src='/risk.js';s.defer=true;
    (document.body||document.documentElement).appendChild(s);
  }
  // 01 시장 모니터링 「사이클 판별 보드」 로더(gates.js 자가 마운트).
  // AI capex 4지표(수주잔고·상각·조달 규율·모델 레이어) — 리스크 보드 다음에 주입.
  function loadGates(){
    if(document.getElementById('gatesJs'))return;
    var s=document.createElement('script');s.id='gatesJs';s.src='/gates.js';s.defer=true;
    (document.body||document.documentElement).appendChild(s);
  }
  // 01 시장 모니터링 통합 지표 「반도체 수출」 카드 로더(trade.js 자가 마운트).
  function loadTrade(){
    if(document.getElementById('tradeJs'))return;
    var s=document.createElement('script');s.id='tradeJs';s.src='/trade.js';s.defer=true;
    (document.body||document.documentElement).appendChild(s);
  }
  // 01 시장 모니터링 상단 「오늘의 투자 명언」 스트립 로더(quote.js 자가 마운트).
  function loadQuote(){
    if(document.getElementById('quoteJs'))return;
    var s=document.createElement('script');s.id='quoteJs';s.src='/quote.js';s.defer=true;
    (document.body||document.documentElement).appendChild(s);
  }
  function loadMarketSync(){
    if(document.getElementById('marketSyncJs'))return;
    var s=document.createElement('script');s.id='marketSyncJs';s.src='/market-sync.js?v=20260803';s.defer=true;
    (document.body||document.documentElement).appendChild(s);
  }
  function mountAll(){
    mountHead('#v-market .vhead','mktUpdMarket','market');
    mountHead('#v-insight .vhead','mktUpdInsight','insight');
    mountHead('#v-council .vhead','mktUpdCouncil','council');
    mountHead('#v-thread .vhead','mktUpdThread','thread');
    mountHead('#v-decision .vhead','mktUpdDecision','decision');
    mountHead('#v-brief .vhead','mktUpdBrief','brief');
    mountHead('#v-memo .vhead','mktUpdMemo','memo');
  }
  function boot(){
    mountAll();
    mountThreadAisd();
    loadAutoHistory();
    loadRaer();                                     // 추정 리비전 트래커 기대수익 컬럼
    loadLead();                                     // 01 월간 선행지표(FRED) 카드
    loadRisk();                                     // 01 리스크 3축 보드
    loadGates();                                        // 01 사이클 판별 보드(AI capex 4지표)
    loadTrade();                                    // 01 통합 지표 반도체 수출 카드
    loadQuote();                                    // 01 상단 투자 명언 스트립
    loadMarketSync();                               // 02 고신뢰 매크로 관점 → 01 자동 동기화
  }
  document.addEventListener('keydown',function(e){if(e.key==='Escape')hide();});
  function watchDynamicViews(){
    if(!document.body||!window.MutationObserver)return;
    new MutationObserver(function(){
      if(document.getElementById('v-brief')&&!document.getElementById('mktUpdBrief'))mountHead('#v-brief .vhead','mktUpdBrief','brief');
      mountThreadAisd();
    }).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){boot();watchDynamicViews();});else{boot();watchDynamicViews();}
})();
