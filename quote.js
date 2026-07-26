/* quote.js — 01 시장 모니터링 상단 「오늘의 투자 명언」 자가 마운트 (index.html 무편집)
 *
 * 왜: 상단 메뉴와 뷰 헤더 사이(nav ↔ .vhead)에 그날 증시 체온을 반영한 투자 명언을 한 줄 띄운다
 *     (SimpleorNothing 지시 2026-07-26). 숫자 대시보드에 들어가기 전, 규율을 상기시키는 문지방.
 * 무엇: signals.json(VIX·CNN F&G·나스닥 드로다운)으로 시장 레짐(공포/중립/과열) 판정 →
 *      레짐별 명언 풀에서 랜덤 1개. 스트립 클릭 시 같은 레짐 안에서 다른 명언으로 교체.
 * 규율: narrative ≠ numbers — 표시 전용. 레짐 판정은 명언 「선곡」에만 쓰고, 매크로 게이트
 *      (3중 AND) 판정과는 별개 렌즈다. gamma·judgment·holdings 어느 것도 바꾸지 않는다.
 * 디자인: STYLE_GUIDE 관행 준수 — 면 radius 3px(--panel/--line) · 신규 :root 토큰 0 ·
 *        레짐 칩 색 = 등락색 규약(공포=하락측 청 --st-accel · 과열=상승측 적 --st-hot · 중립 무채색).
 *        스타일은 <style id="quote-css">로 주입하고 전 선택자를 #mktQuote 로 스코프.
 *        빈 상태(§6-6): signals 수집 실패 시 중립 풀 + 「지표 수집 대기」 칩.
 */
(function () {
  'use strict';
  var HOST_ID = 'mktQuote';

  /* --- 명언 풀 (레짐별) — 널리 알려진 짧은 경구·격언, 한국어 표기 --- */
  var POOL = {
    fear: [
      { t: '다른 사람들이 두려워할 때 탐욕스러워라.', by: '워런 버핏' },
      { t: '비관론이 최고조일 때가 가장 좋은 매수 시점이다.', by: '존 템플턴' },
      { t: '강세장은 비관 속에서 태어나 회의 속에서 자란다.', by: '존 템플턴' },
      { t: '조정을 예측하며 잃은 돈이 조정 그 자체로 잃은 돈보다 훨씬 많다.', by: '피터 린치' },
      { t: '주식시장은 인내심 없는 자의 돈을 인내심 있는 자에게 옮기는 장치다.', by: '워런 버핏' },
      { t: '위기에서 현금과 용기의 조합은 값을 매길 수 없다.', by: '워런 버핏' },
      { t: '남들이 낙담해 팔 때 사고, 남들이 탐욕스럽게 살 때 팔려면 큰 용기가 필요하다. 그러나 보상도 가장 크다.', by: '존 템플턴' },
      { t: '가격이 가치 아래로 내려가는 순간은 대개 공포가 만들어 준다.', by: '하워드 막스' }
    ],
    greed: [
      { t: '다른 사람들이 탐욕스러울 때 두려워하라.', by: '워런 버핏' },
      { t: '강세장은 낙관 속에서 성숙하고 도취 속에서 죽는다.', by: '존 템플턴' },
      { t: '"이번엔 다르다"는 투자에서 가장 값비싼 네 단어다.', by: '존 템플턴' },
      { t: '썰물이 빠지고 나서야 누가 벌거벗고 헤엄쳤는지 드러난다.', by: '워런 버핏' },
      { t: '나무는 하늘까지 자라지 않는다.', by: '월가 격언' },
      { t: '가격은 당신이 지불하는 것이고, 가치는 당신이 얻는 것이다.', by: '워런 버핏' },
      { t: '시장은 단기적으로 투표기계, 장기적으로 저울이다.', by: '벤저민 그레이엄' },
      { t: '가장 위험한 순간은 모두가 위험이 없다고 믿을 때다.', by: '하워드 막스' }
    ],
    neutral: [
      { t: '큰돈은 사고파는 데 있지 않다. 기다리는 데 있다.', by: '찰리 멍거' },
      { t: '투자에서 가장 중요한 자질은 지능이 아니라 기질이다.', by: '워런 버핏' },
      { t: '자신이 무엇을 보유했는지, 왜 보유했는지 알아야 한다.', by: '피터 린치' },
      { t: '위험은 자신이 무엇을 하는지 모르는 데서 온다.', by: '워런 버핏' },
      { t: '규칙 1: 돈을 잃지 마라. 규칙 2: 규칙 1을 잊지 마라.', by: '워런 버핏' },
      { t: '예측할 수는 없어도 준비할 수는 있다.', by: '하워드 막스' },
      { t: '시장에 머무는 시간이 시장 타이밍 맞히기를 이긴다.', by: '월가 격언' },
      { t: '뛰어난 결과는 남과 다른, 그리고 옳은 판단에서만 나온다.', by: '하워드 막스' }
    ]
  };
  var RG_LB = { fear: '공포 구간', greed: '과열 구간', neutral: '중립 구간' };

  /* --- 레짐 판정: F&G·VIX·나스닥 드로다운 3입력 합산 스코어 ---
     매크로 게이트(3중 AND)와는 별개의 「선곡」 렌즈. score<0 공포 / >0 과열 / 0 중립. */
  function regime(sig) {
    if (!sig) return null;
    var s = 0, fg = +sig.fearGreed, vx = +sig.vix, dd = +sig.nasdaqDrawdownPct;
    if (isFinite(fg)) { if (fg <= 25) s -= 2; else if (fg <= 45) s -= 1; else if (fg >= 75) s += 2; else if (fg >= 55) s += 1; }
    if (isFinite(vx)) { if (vx >= 28) s -= 2; else if (vx >= 22) s -= 1; else if (vx <= 14) s += 1; }
    if (isFinite(dd)) { if (dd <= -15) s -= 2; else if (dd <= -8) s -= 1; else if (dd >= -3) s += 1; }
    return s < 0 ? 'fear' : s > 0 ? 'greed' : 'neutral';
  }
  function chipTx(sig) {
    if (!sig) return '지표 수집 대기';
    var p = [];
    if (isFinite(+sig.fearGreed)) p.push('F&G ' + Math.round(+sig.fearGreed));
    if (isFinite(+sig.vix)) p.push('VIX ' + (+sig.vix).toFixed(1));
    if (isFinite(+sig.nasdaqDrawdownPct)) p.push('나스닥 ' + (+sig.nasdaqDrawdownPct).toFixed(1) + '%');
    return p.join(' · ') || '지표 수집 대기';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function css() {
    if (document.getElementById('quote-css')) return;
    var s = document.createElement('style');
    s.id = 'quote-css';
    s.textContent = [
      '#mktQuote{display:flex;align-items:baseline;gap:10px 14px;flex-wrap:wrap;background:var(--panel);border:1px solid var(--line);border-radius:3px;padding:12px 16px;margin:0 0 18px;cursor:pointer;user-select:none}',
      '#mktQuote:hover{border-color:var(--line2)}',
      '#mktQuote .qz-tx{font-size:15px;font-weight:600;color:var(--txt);line-height:1.55}',
      '#mktQuote .qz-tx::before{content:"\\201C";color:var(--dawn);font-weight:700;margin-right:2px}',
      '#mktQuote .qz-tx::after{content:"\\201D";color:var(--dawn);font-weight:700;margin-left:2px}',
      '#mktQuote .qz-by{font-family:var(--mono);font-size:12px;color:var(--faint);white-space:nowrap}',
      '#mktQuote .qz-rg{font-family:var(--mono);font-size:12px;color:var(--faint);margin-left:auto;white-space:nowrap}',
      '#mktQuote .qz-rg b{font-weight:700}',
      '#mktQuote .qz-rg b.fear{color:var(--st-accel)}',
      '#mktQuote .qz-rg b.greed{color:var(--st-hot)}',
      '#mktQuote .qz-rg b.neutral{color:var(--dim)}',
      '@media(max-width:600px){#mktQuote .qz-rg{margin-left:0;flex-basis:100%}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  var ST = { rg: 'neutral', sig: null, last: -1 };

  function pick() {
    var pool = POOL[ST.rg] || POOL.neutral;
    if (pool.length < 2) return pool[0];
    var i;
    do { i = Math.floor(Math.random() * pool.length); } while (i === ST.last);
    ST.last = i;
    return pool[i];
  }

  function render(host) {
    var q = pick();
    host.innerHTML =
      '<span class="qz-tx">' + esc(q.t) + '</span>' +
      '<span class="qz-by">— ' + esc(q.by) + '</span>' +
      '<span class="qz-rg"><b class="' + ST.rg + '">' + RG_LB[ST.rg] + '</b> · ' + esc(chipTx(ST.sig)) + '</span>';
  }

  function mount() {
    var v = document.getElementById('v-market');
    if (!v || document.getElementById(HOST_ID)) return;
    css();
    var host = document.createElement('div');
    host.id = HOST_ID;
    host.title = '누르면 다른 명언';
    v.insertBefore(host, v.firstChild);
    render(host);
    host.addEventListener('click', function () { render(host); });
    fetch('/signals.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var rg = regime(j);
        if (!rg) return;               /* 수집 실패 → 중립 풀 + 대기 칩 유지(§6-6) */
        ST.sig = j;
        if (rg !== ST.rg) { ST.rg = rg; ST.last = -1; }
        render(host);
      })
      .catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
