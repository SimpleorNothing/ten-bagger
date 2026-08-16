/* Topic Radar deletion sync — R2 server state shared by all authenticated devices. */
(function () {
  'use strict';

  const LOCAL_KEY = 'am_topic_radar_hidden_v1';
  const API = '/api/topic-radar-prefs';

  function uniqKeys(values) {
    const out = [];
    const seen = new Set();
    (Array.isArray(values) ? values : []).forEach(function (value) {
      const key = String(value == null ? '' : value).trim();
      if (!key || key.length > 80 || seen.has(key)) return;
      seen.add(key);
      out.push(key);
    });
    return out.slice(0, 200);
  }

  function readLocal() {
    try { return uniqKeys(JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')); }
    catch (_) { return []; }
  }

  function writeLocal(values) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(uniqKeys(values))); }
    catch (_) { /* localStorage unavailable: server state still remains SoT */ }
  }

  async function addServerHidden(values) {
    const hidden = uniqKeys(values);
    if (!hidden.length) return true;
    try {
      const response = await fetch(API, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hidden: hidden })
      });
      return response.ok;
    } catch (_) {
      return false;
    }
  }

  async function hydrateFromServer() {
    let remote = [];
    try {
      const response = await fetch(API, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store'
      });
      if (!response.ok) return;
      const data = await response.json();
      remote = uniqKeys(data && data.hidden);
    } catch (_) {
      return;
    }

    const local = readLocal();
    const localSet = new Set(local);
    const remoteSet = new Set(remote);
    const union = uniqKeys(local.concat(remote));
    const remoteAddedToThisDevice = remote.some(function (key) { return !localSet.has(key); });
    const localMissingOnServer = local.filter(function (key) { return !remoteSet.has(key); });

    if (union.length !== local.length || remoteAddedToThisDevice) writeLocal(union);

    // 기존 브라우저에서 이미 삭제했던 카드도 최초 접속 시 서버로 이관한다.
    if (localMissingOnServer.length) await addServerHidden(localMissingOnServer);

    // 인라인 토픽 렌더러가 localStorage를 초기 필터로 사용하므로, 다른 기기에서
    // 새로 받은 삭제 상태가 있으면 한 번만 새로고침해 카드 배열/레이아웃까지 일관되게 재구성한다.
    if (remoteAddedToThisDevice) location.reload();
  }

  // 기존 삭제 핸들러는 confirm 후 localStorage에 키를 기록하고 stopPropagation 한다.
  // capture 단계에서 키만 기억한 뒤 다음 tick에 localStorage를 확인하면 취소된 삭제를 서버에 쓰지 않는다.
  document.addEventListener('click', function (event) {
    const button = event.target && event.target.closest ? event.target.closest('#mktMacroNews .stk-topic-del') : null;
    if (!button) return;
    const card = button.closest('.stk-blk[data-topic-key]');
    const key = card && card.getAttribute('data-topic-key');
    if (!key) return;
    setTimeout(function () {
      if (readLocal().indexOf(key) >= 0) addServerHidden([key]);
    }, 0);
  }, true);

  hydrateFromServer();
})();
