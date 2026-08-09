/* council-context.js — 전문가 원탁 「알파맵 전체 컨텍스트」 자동 주입
 * 매 토론 시작 시 01~06 전 메뉴의 최신 자료를 역할별로 압축해
 * 최신 데이터에서 압축해 /api/council 의 siteContext 로 보낸다.
 * index.html 무편집 · 기존 fetch 계약 유지 · 신규 :root 토큰 0 · narrative≠numbers. */
(function () {
  'use strict';

  if (window.__councilContextMounted) return;
  window.__councilContextMounted = true;

  var innerFetch = window.fetch.bind(window);
  var cache = null;
  var cachedAt = 0;
  var CACHE_MS = 60000;

  function $(id) { return document.getElementById(id); }
  function cut(s, n) {
    s = String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }
  function num(v) { return v == null || v === '' || isNaN(+v) ? null : +v; }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function compactSource(x) {
    if (!x || typeof x !== 'object') return null;
    return { asOf: x.asOf || x.checkedAt || '', source: cut(x.source || '', 180) };
  }
  async function getJSON(url) {
    try {
      var r = await innerFetch(url, { credentials: 'same-origin', cache: 'no-store' });
      return r.ok ? await r.json() : null;
    } catch (_) {
      return null;
    }
  }
  function assetSection(H, P) {
    if (!H) return null;
    var quotes = P && P.quotes ? P.quotes : {};
    var avg = H.avg || {};
    var positions = (Array.isArray(H.detail) ? H.detail : []).slice(0, 30).map(function (x) {
      var q = quotes[x.priceKey] || {};
      return {
        name: x.name || x.ticker || '',
        ticker: x.ticker || '',
        layer: x.layer || '',
        amount: num(x.amt),
        weightPct: num(x.w),
        qty: num(x.qty),
        currentPrice: num(q.price),
        currency: q.currency || x.ccy || '',
        avgPrice: num(avg[x.priceKey])
      };
    });
    return {
      asOf: H.asOf || '',
      qtyAsOf: H.qtyAsOf || '',
      total: num(H.total),
      totalNote: cut(H.note || '', 700),
      fx: H.fx || null,
      layers: (Array.isArray(H.holdings) ? H.holdings : []).slice(0, 16).map(function (x) {
        return { layer: x.layer || '', label: cut(x.label || '', 180), amount: num(x.amt), weightPct: num(x.w) };
      }),
      positions: positions
    };
  }
  function marketSection(S, C, G, L, Cal, H) {
    var held = {};
    (H && Array.isArray(H.detail) ? H.detail : []).forEach(function (x) {
      if (x.ticker) held[String(x.ticker).toUpperCase()] = 1;
    });
    var gg = G && G.gamma ? G.gamma : {};
    var gamma = Object.keys(gg).filter(function (k) { return held[String(k).toUpperCase()]; }).slice(0, 30).map(function (k) {
      var x = gg[k] || {};
      return {
        ticker: k, state: x.g || '', stage: x.stage || '', lock: !!x.lock,
        price: num(x.price), target: num(x.target), upsidePct: num(x.pct), trend: x.trend || '',
        checkedAt: x.checkedAt || '', revision: x.rev ? {
          eps7dPct: x.rev.eps && x.rev.eps.fy1 ? num(x.rev.eps.fy1.c7) : null,
          eps30dPct: x.rev.eps && x.rev.eps.fy1 ? num(x.rev.eps.fy1.c30) : null
        } : null
      };
    });
    var log = L && Array.isArray(L.log) ? L.log.slice(-8).reverse().map(function (e) {
      return {
        date: e.date || '', source: cut(e.source || '', 220),
        items: (Array.isArray(e.items) ? e.items : []).slice(0, 5).map(function (x) {
          return { tag: x.tag || '', layer: x.layer || '', text: cut(x.html || '', 420) };
        })
      };
    }) : [];
    var td = today();
    var events = Cal && Array.isArray(Cal.events) ? Cal.events.filter(function (x) {
      return !x.d || x.d >= td;
    }).slice(0, 12).map(function (x) {
      return { date: x.d || '', category: x.cat || '', label: x.lbl || '', ticker: x.tk || '', detail: cut(x.meta || '', 300), when: x.when || '' };
    }) : [];
    return {
      signals: S ? {
        asOf: S.asOf || '', vix: num(S.vix), vixHigh: num(S.vixHigh), fearGreed: num(S.fearGreed),
        nasdaqDrawdownPct: num(S.nasdaqDrawdownPct), spDailyPct: num(S.spDailyPct),
        wma40SlopeUp: S.wma40SlopeUp, wma40GapPct: num(S.wma40GapPct),
        sidecarKR: !!S.sidecarKR, circuitKR: !!S.circuitKR
      } : null,
      semiconductorCycle: C && Array.isArray(C.clusters) ? C.clusters.map(function (x) {
        return { id: x.id || '', name: x.name || '', state: x.lamp || '', now: cut(x.now || '', 420), trigger: cut(x.on || '', 320), updated: x.updated || '' };
      }) : [],
      heldGamma: gamma,
      latestSignals: log,
      upcomingEvents: events
    };
  }
  // 02는 저장된 원문(raw)까지 포함해 항상 전량 전달한다. 요약·절단 금지.
  function insightSection(records) {
    if (!Array.isArray(records)) return [];
    return records.map(function (r) {
      return { id: r.id || '', savedAt: r.t || '', source: r.src || {}, originalText: String(r.raw || ''), claims: Array.isArray(r.claims) ? r.claims : [] };
    });
  }
  function fingerprint(x) {
    var s = JSON.stringify(x == null ? null : x), h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24); }
    return (h >>> 0).toString(36) + ':' + s.length;
  }
  function deltaObject(previous, current) {
    if (!previous || typeof current !== 'object' || current == null || Array.isArray(current)) return current;
    var out = {}, changed = false;
    Object.keys(current).forEach(function (k) { if (fingerprint(previous[k]) !== fingerprint(current[k])) { out[k] = current[k]; changed = true; } });
    return changed ? out : null;
  }
  function prepareDelta(full) {
    var key = 'council_context_snapshot_v2', old = {};
    try { old = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (_) {}
    var next = {}, result = { generatedAt: full.generatedAt, rule: full.rule, sources: full.sources, transfer: {} };
    ['menu01_marketMonitoring','menu03_portfolioRebalance','menu04_marketAndEarnings','menu05_cycleAndForecast','menu06_memos'].forEach(function (name) {
      var changed = deltaObject(old[name], full[name]); next[name] = full[name];
      if (changed !== null) { result[name] = changed; result.transfer[name] = 'updated'; } else result.transfer[name] = 'unchanged — not sent';
    });
    result.menu02_insights = full.menu02_insights; result.transfer.menu02_insights = 'full — original documents included'; next.menu02_insights = full.menu02_insights;
    try { localStorage.setItem(key, JSON.stringify(next)); } catch (_) {}
    return result;
  }
  function boardItems(d) {
    return d && Array.isArray(d.items) ? d.items.map(function (x) {
      return {
        id: x.id || '', name: x.name || '', state: x.stateLabel || x.state || '',
        verdict: cut(x.verdict || '', 600), trigger: cut(x.trigger || '', 420), updated: x.upd || '',
        gauges: (Array.isArray(x.gauge) ? x.gauge : []).slice(0, 6).map(function (g) {
          return { name: g.k || '', value: g.v == null ? '' : String(g.v), direction: g.d || '', note: cut(g.n || '', 260) };
        })
      };
    }) : [];
  }
  function outlookSection(Gates, Risk, Earnings, Judgment, H) {
    var td = today();
    var moves = Earnings && Earnings.moves ? Object.keys(Earnings.moves).map(function (k) {
      var x = Earnings.moves[k] || {};
      return { ticker: k, date: x.date || '', expectedMovePct: num(x.pct), basis: x.basis || '', source: cut(x.src || '', 220) };
    }).filter(function (x) { return !x.date || x.date >= td; }).sort(function (a, b) {
      return String(a.date).localeCompare(String(b.date));
    }).slice(0, 20) : [];
    var held = {};
    (H && Array.isArray(H.detail) ? H.detail : []).forEach(function (x) {
      if (x.ticker) held[String(x.ticker).toUpperCase()] = 1;
    });
    var ov = Judgment && Judgment.overrides ? Judgment.overrides : {};
    var judgments = Object.keys(ov).filter(function (k) {
      return held[String(k).toUpperCase()] || k === '한국 ETF';
    }).map(function (k) {
      var x = ov[k] || {};
      return { ticker: k, horizonAlpha: x.aN || [], gamma: x.g || '', why: cut(x.why || '', 800) };
    });
    return {
      capexGates: { asOf: Gates && Gates.asOf || '', summary: cut(Gates && Gates.insight || '', 800), items: boardItems(Gates) },
      riskBoard: { asOf: Risk && Risk.asOf || '', summary: cut(Risk && Risk.insight || '', 800), items: boardItems(Risk) },
      earnings: { asOf: Earnings && Earnings.asOf || '', upcoming: moves },
      heldJudgments: { asOf: Judgment && Judgment.asOf || '', items: judgments }
    };
  }
  function newsSection(Pulse, Calendar, News, Digest) {
    function items(x, n) {
      var a = x && (x.items || x.articles || x.news);
      return Array.isArray(a) ? a.slice(0, n).map(function (v) {
        return {
          date: v.date || v.publishedAt || v.pubDate || '', title: cut(v.title || v.headline || '', 260),
          summary: cut(v.summary || v.description || v.text || '', 420), source: cut(v.source || v.publisher || '', 120),
          tickers: Array.isArray(v.tickers) ? v.tickers.slice(0, 8) : []
        };
      }) : [];
    }
    return {
      marketPulse: Pulse ? { asOf: Pulse.asOf || '', summary: cut(Pulse.summary || Pulse.insight || Pulse.now || '', 1000), items: items(Pulse, 8) } : null,
      calendar: Calendar && Array.isArray(Calendar.events) ? Calendar.events.slice(0, 25).map(function (v) {
        return { date: v.d || v.date || '', category: v.cat || v.category || '', label: v.lbl || v.label || '', detail: cut(v.meta || v.detail || '', 260) };
      }) : [],
      macroNews: items(News, 12),
      holdingsNews: items(Digest, 18)
    };
  }
  function portfolioSection(H, P, G, J, A, Snapshots) {
    var held = assetSection(H, P);
    var ov = J && J.overrides ? J.overrides : {};
    return {
      asOf: (H && H.asOf) || (J && J.asOf) || '',
      holdings: held ? held.positions : [],
      layerAllocation: held ? held.layers : [],
      gammaAndJudgment: Object.keys(ov).slice(0, 40).map(function (k) {
        var j = ov[k] || {}, g = G && G.gamma && G.gamma[k] || {};
        return { ticker: k, gamma: j.g || g.g || '', stage: g.stage || '', lock: !!g.lock, rationale: cut(j.why || '', 600), horizonAlpha: j.aN || [] };
      }),
      alphaMap: A ? { asOf: A.asOf || '', summary: cut(A.insight || A.summary || '', 900) } : null,
      recentSnapshots: Array.isArray(Snapshots) ? Snapshots.slice(-3).map(function (x) { return { asOf: x.asOf || x.date || '', note: cut(x.note || x.reason || '', 500) }; }) : []
    };
  }
  function cycleForecastSection(Cycle, Gates, Risk, Earnings, MarketHistory) {
    return {
      semiconductorCycle: Cycle ? { asOf: Cycle.asOf || '', clusters: (Cycle.clusters || []).map(function (x) {
        return { id: x.id || '', name: x.name || '', state: x.lamp || '', now: cut(x.now || '', 500), trigger: cut(x.on || '', 320), updated: x.updated || '' };
      }), memoryMarket: Cycle.memMarket || null } : null,
      capexAndRiskGates: outlookSection(Gates, Risk, Earnings, null, null),
      marketHistory: MarketHistory ? { asOf: MarketHistory.asOf || '', summary: cut(MarketHistory.summary || MarketHistory.insight || '', 700) } : null
    };
  }
  function memoSection(Memo) {
    var a = Array.isArray(Memo) ? Memo : (Memo && (Memo.items || Memo.memos || Memo.data));
    return Array.isArray(a) ? a.slice(0, 12).map(function (m) {
      return { at: m.at || m.createdAt || m.date || '', title: cut(m.title || '', 200), tags: Array.isArray(m.tags) ? m.tags.slice(0, 8) : [], body: cut(m.body || m.text || m.content || '', 900) };
    }) : [];
  }
  async function buildContext() {
    if (cache && Date.now() - cachedAt < CACHE_MS) return cache;
    var urls = [
      '/holdings.json', '/prices.json', '/signals.json', '/cycle.json', '/gamma.json', '/signal_log.json',
      '/api/insights', '/gates.json', '/risk.json', '/earnings.json', '/judgment.json', '/calendar.json',
      '/pulse.json', '/news.json', '/news_digest.json', '/alpha.json', '/snapshots.json', '/market_history.json', '/api/memo'
    ];
    var vals = await Promise.all(urls.map(getJSON));
    var H = vals[0], P = vals[1], S = vals[2], C = vals[3], G = vals[4], L = vals[5];
    var Ins = vals[6], Gates = vals[7], Risk = vals[8], Earnings = vals[9], Judgment = vals[10], Cal = vals[11];
    var Pulse = vals[12], News = vals[13], Digest = vals[14], Alpha = vals[15], Snapshots = vals[16], MarketHistory = vals[17], Memo = vals[18];
    cache = {
      generatedAt: new Date().toISOString(),
      rule: '02 인사이트는 저장 원문을 포함한 전체 자료를 항상 공유한다. 01·03·04·05·06은 직전 원탁 이후 변경된 자료만 공유한다. 각 전문가는 수치와 해석을 구분하고 메뉴·기준일·근거를 발언에 남긴다. 팩트체크 규율: 입력 자료의 퍼센트·배수·증가율은 원시 수치로 반드시 재계산해 산술오류를 그대로 인용하지 않는다. 회사별 RPO·backlog처럼 정의·범위가 다른 지표는 동일 개념으로 단순 합산하거나 같은 수주잔고라고 단정하지 않고, 비교 한계를 함께 밝힌다. RPO 잔액 증가를 신규수주와 동일시하지 않는다. 직접 인용·공개 발언과 전문가 렌즈의 해석을 분리하며, 당사자가 실제로 말하지 않은 자인·의도·예측은 사실처럼 쓰지 않는다. 숫자·발행액·전망치·보유비중의 기준일과 분모가 확인되지 않으면 자료에서 확인되지 않음으로 표시한다. 버블·리스크 게이트는 단일 지표로 확정하지 말고 RPO 성장 둔화, 클라우드 매출 성장 둔화, CAPEX 고성장 지속, 감가상각비/매출 상승, 클라우드 마진 악화를 분리 점검한다. 실행 규율은 1개 악화=관찰 강화, 2개 악화=신규매수 중단·비중 동결, 3개 이상이 2개 분기 연속 악화=본격 축소 검토로 단계화한다.',
      sources: {
        assets: compactSource(H), market: compactSource(S), cycle: compactSource(C),
        insights: { asOf: new Date().toISOString(), source: 'R2 /api/insights · 운영자가 채택한 관점' },
        gates: compactSource(Gates), risk: compactSource(Risk), earnings: compactSource(Earnings), judgment: compactSource(Judgment),
        pulse: compactSource(Pulse), news: compactSource(News), digest: compactSource(Digest), alpha: compactSource(Alpha), memo: { asOf: new Date().toISOString(), source: '/api/memo · 사용자가 저장한 메모' }
      },
      menu01_marketMonitoring: Object.assign(marketSection(S, C, G, L, Cal, H), newsSection(Pulse, Cal, News, Digest)),
      menu02_insights: { allInsightsWithOriginals: insightSection(Ins), alphaMap: Alpha ? { asOf: Alpha.asOf || '', summary: cut(Alpha.insight || Alpha.summary || '', 900) } : null },
      menu03_portfolioRebalance: portfolioSection(H, P, G, Judgment, Alpha, Snapshots),
      menu04_marketAndEarnings: outlookSection(Gates, Risk, Earnings, Judgment, H),
      menu05_cycleAndForecast: cycleForecastSection(C, Gates, Risk, Earnings, MarketHistory),
      menu06_memos: memoSection(Memo)
    };
    cachedAt = Date.now();
    return cache;
  }
  function setStatus(text, bad) {
    var el = $('clAutoCtxStatus');
    if (!el) return;
    el.textContent = text || '';
    el.style.color = bad ? 'var(--st-hot,#b4472f)' : 'var(--dim)';
  }
  function mountNote() {
    var ta = $('clCtx');
    if (!ta || $('clAutoCtxStatus')) return false;
    var p = document.createElement('p');
    p.id = 'clAutoCtxStatus';
    p.className = 'cl-note';
    p.style.margin = '6px 0 12px';
    p.textContent = '기본 참조: 02는 원문 포함 전체 · 01·03~06은 마지막 원탁 이후 변경분만';
    ta.insertAdjacentElement('afterend', p);
    return true;
  }

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : ((input && input.url) || '');
    if (url === '/api/council' && init && String(init.method || 'GET').toUpperCase() === 'POST') {
      return (async function () {
        setStatus('알파맵 최신 컨텍스트를 모으는 중…');
        try {
          var ctx = prepareDelta(await buildContext());
          var body = JSON.parse(init.body || '{}');
          body.siteContext = ctx;
          init = Object.assign({}, init, { body: JSON.stringify(body) });
          setStatus('참조 완료: 02 원문 포함 전체 · 01·03~06은 변경분만 전달');
        } catch (e) {
          setStatus('일부 알파맵 컨텍스트를 읽지 못해 현 상황 입력으로 토론합니다.', true);
        }
        return innerFetch(input, init);
      })();
    }
    return innerFetch(input, init);
  };

  if (!mountNote()) {
    var tries = 0, timer = setInterval(function () {
      if (mountNote() || ++tries > 80) clearInterval(timer);
    }, 100);
  }
})();