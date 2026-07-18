/* raer.js — 「기대수익 점수」 컬럼 자가 마운트 (추정 리비전 트래커 #probEst 증강)
 *
 * 무엇: 추정 리비전 트래커 테이블에 위험조정 기대수익(RAER) 점수 컬럼을 주입하고,
 *       점수 내림차순으로 행을 재정렬하며, 현금 행을 종목으로 추가한다.
 * 왜:   "백지 재투자 시 향후 상승 가능성"을 여력만이 아니라 실현확률·리스크로 보정해
 *       한 눈에 순위화한다. 기간은 점수로 쪼개지 않는다(촉매=별개 관측).
 * 원칙: index.html 무편집(flags.js/aisd.js 패턴 — worker.js <script defer> 주입).
 *       gamma.json 단일 소스 재사용. 신규 :root 토큰 0(check-docs 무관).
 *       관측·휴리스틱 스코어이며 예측·투자권유 아님.
 *
 * RAER = 여력(e.pct) × 실현확률 p ÷ 리스크 R,  14행(현금 포함) 상대 정규화 0–100.
 *   p = clamp(0.5 + .010·EPS90 + .006·EPS30 + .15·(상향−하향)/(상향+하향) − (γ spent ? .25:0), .35, 1)
 *   R = 단계(여명.9/가속1.0/성숙1.2/과열1.45) + 90d급등(>50:+.20·>30:+.10·null:+.05)
 *       + (γ spent:+.15) + 단기고변동(|30d|>30:+.10·>20:+.05)
 *   현금: 여력=한은 기준금리(무위험)·p=1·R=.85 → 상승 기대수익 바닥(옵션 가치는 별개).
 */
(function () {
  "use strict";
  var RF = 2.75; // 한은 기준금리(무위험, 2026-07 · 2.75%). 정책금리 변경 시 갱신.
  var NM = { MRVL:'마벨','005930':'삼성전자',MU:'마이크론',LITE:'루멘텀',VRT:'버티브',
    BE:'블룸에너지',AMD:'AMD',RMBS:'램버스',CEG:'컨스텔레이션',QCOM:'퀄컴',
    APH:'앰페놀',BESI:'BESI','000660':'SK하이닉스' };
  var STAGE_R = { '여명':0.9,'가속':1.0,'성숙':1.2,'과열':1.45 };
  var _scores = null; // {tk: {score, raer}} 캐시(gamma 1회 페치)

  function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }

  function compute(G){
    var list=[];
    Object.keys(G).forEach(function(tk){
      var e=G[tk]; if(!e||!e.rev) return;
      var r=e.rev, f1=(r.eps&&r.eps.fy1)?r.eps.fy1:{}, px=r.px||{};
      var e30=f1.c30, e90=f1.c90, up=f1.up30||0, dn=f1.dn30||0;
      var px30=px.c30, px90=px.c90, room=(e.pct==null?0:e.pct);
      var br=(up-dn)/Math.max(1,up+dn);
      var p=clamp(0.5 + 0.010*(e90||0) + 0.006*(e30||0) + 0.15*br + (e.g==='spent'?-0.25:0), 0.35, 1.0);
      var R=STAGE_R[e.stage]||1.0;
      if(px90==null) R+=0.05; else if(px90>50) R+=0.20; else if(px90>30) R+=0.10;
      if(e.g==='spent') R+=0.15;
      if(px30!=null){ if(Math.abs(px30)>30) R+=0.10; else if(Math.abs(px30)>20) R+=0.05; }
      list.push({ tk:tk, raer: room*p/R });
    });
    list.push({ tk:'CASH', raer: RF*1.0/0.85 });
    var vs=list.map(function(o){return o.raer;}), mn=Math.min.apply(null,vs), mx=Math.max.apply(null,vs);
    var out={};
    list.forEach(function(o){ out[o.tk]={ raer:o.raer, score: mx===mn?0:Math.round((o.raer-mn)/(mx-mn)*100) }; });
    return out;
  }

  function tier(s){ // 기능색 재사용(insight 등급·aisd 판정 선례). 낮음=경고(--st-hot).
    if(s>=60) return 'var(--st-dawn)';
    if(s>=40) return 'var(--st-mature)';
    if(s>=20) return 'var(--st-hot)';
    return 'var(--faint)';
  }
  function scoreCell(s, isCash){
    var col=isCash?'var(--faint)':tier(s);
    return '<td class="c raer-c">'
      + '<div class="raer-sc" style="color:'+col+'">'+s+'</div>'
      + '<div class="raer-bar"><i style="width:'+Math.max(3,s)+'%;background:'+col+'"></i></div>'
      + '</td>';
  }

  function ensureCss(){
    if(document.getElementById('raer-css')) return;
    var s=document.createElement('style'); s.id='raer-css';
    s.textContent='.raer-c{min-width:64px}'
      +'.raer-sc{font-weight:700;font-size:15px;font-variant-numeric:tabular-nums;line-height:1.1}'
      +'.raer-bar{height:6px;border-radius:4px;overflow:hidden;background:var(--line);margin:3px auto 0;max-width:60px}'
      +'.raer-bar>i{display:block;height:100%;border-radius:4px}'
      +'.raer-note b.rk{color:var(--dawn)}';
    document.head.appendChild(s);
  }

  function cashRow(sc){
    var dash='<span style="color:var(--faint)">—</span>';
    return '<tr class="raer-cash">'
      +'<td><span class="pe-nm">현금<span class="tk">CASH</span></span>'
        +'<div class="pe-p">무위험 · 대기 실탄</div></td>'
      + scoreCell(sc.score, true)
      +'<td class="c"><b>'+dash+'</b><div class="pe-p">여력 +'+RF+'%/yr</div></td>'
      +'<td class="c">'+dash+'</td>'
      +'<td class="c"><b>'+dash+'</b></td>'
      +'<td class="c"><b>'+dash+'</b></td>'
      +'<td class="c">'+dash+'</td>'
      +'<td class="c">'+dash+'</td>'
      +'<td class="c">'+dash+'<div class="pe-p">게이트 잠김 시 배분</div></td>'
    +'</tr>';
  }

  function enhance(table){
    if(!table || table.dataset.raer==='1' || !_scores) return;
    var headRow=table.querySelector('thead tr');
    var body=table.querySelector('tbody');
    if(!headRow || !body) return;
    // 헤더: 종목(0) 뒤에 기대수익 컬럼 삽입
    var th=document.createElement('th'); th.className='c';
    th.innerHTML='기대수익<br><span style="font-weight:400;color:var(--faint)">위험조정 · 0–100</span>';
    headRow.insertBefore(th, headRow.children[1]||null);
    // 각 행: 티커 파싱 → 점수 셀 삽입
    var trs=[].slice.call(body.querySelectorAll('tr'));
    var withTk=[];
    trs.forEach(function(tr){
      var tkEl=tr.querySelector('.pe-nm .tk');
      if(!tkEl){ tr.remove(); return; } // 빈상태 행 등
      var tk=tkEl.textContent.trim();
      var sc=_scores[tk]||{score:0};
      // 점수 셀을 종목(0) 다음에 삽입
      var tpl=document.createElement('template');
      tpl.innerHTML=scoreCell(sc.score,false).trim();
      tr.insertBefore(tpl.content.firstChild, tr.children[1]||null);
      withTk.push({tr:tr, score:sc.score});
    });
    // 점수 내림차순 재정렬 → 스코어보드
    withTk.sort(function(a,b){ return b.score-a.score; });
    withTk.forEach(function(o){ body.appendChild(o.tr); });
    // 현금 행 = 항상 맨 아래(상승 기대수익 바닥)
    body.insertAdjacentHTML('beforeend', cashRow(_scores.CASH||{score:0}));
    // 설명 노트
    var card=table.closest('.mp-card');
    if(card && !card.querySelector('.raer-note')){
      var note=document.createElement('div');
      note.className='mp-note raer-note';
      note.innerHTML='<b class="rk">기대수익 점수</b> = 여력 × 실현확률 ÷ 리스크(14행 상대 0–100). '
        +'실현확률 = EPS 리비전(90d·30d)·애널 상향폭·γ 건전성(하향이면 급감) · '
        +'리스크 = 단계(성숙·과열)·90d 급등·γ 소진·고변동 가산. '
        +'<b>기간은 점수로 나누지 않는다</b> — 「언제」는 촉매(실적 D-N)가 답한다. '
        +'현금은 상승 기대수익 최저이나 게이트 잠김 시 배분용 실탄(옵션 가치 별도). '
        +'<b>관측·휴리스틱이며 예측·투자권유 아님.</b>';
      card.appendChild(note);
    }
    table.dataset.raer='1';
  }

  function tick(){
    var host=document.getElementById('probEst'); if(!host) return;
    var table=host.querySelector('table.pe-tbl');
    if(table && table.dataset.raer!=='1') enhance(table);
  }

  function boot(){
    ensureCss();
    fetch('gamma.json?t='+Date.now(), {cache:'no-store'})
      .then(function(r){ return r.ok?r.json():null; })
      .then(function(GM){
        var G=GM&&GM.gamma?GM.gamma:null; if(!G) return;
        _scores=compute(G);
        tick();
        // 트래커가 늦게/다시 렌더돼도 컬럼을 유지
        var host=document.getElementById('probEst');
        if(host){
          var mo=new MutationObserver(function(){ tick(); });
          mo.observe(host, {childList:true, subtree:true});
        }
        // 폴백: 최대 ~10초 폴링
        var n=0, iv=setInterval(function(){ n++; tick();
          var t=document.querySelector('#probEst table.pe-tbl');
          if((t&&t.dataset.raer==='1')||n>50) clearInterval(iv); }, 200);
      })
      .catch(function(){});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
