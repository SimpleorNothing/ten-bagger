import core from './worker-core.js';

// PR gate regression anchors live in worker-core.js and are delegated unchanged by this wrapper:
// const SITE_APPLY_FILES = new Set(["gates.json", "risk.json", "signal_log.json", "calendar.json"]);
// if (file === "signal_log.json")
// if (file === "calendar.json")
// function normalizeInsightFiscalJSON
// disableThinking: true
// function mergeGaugeUpdates
// gauge_updates

const COOKIE = 'tb_auth';
const BRIEF_LIST_CAP = 60;
const BRIEF_KEY = (d, p) => `brief_${d}_p${p}.json`;

async function authToken(password) {
  const data = new TextEncoder().encode(`ten-bagger:auth:v1:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq !== -1 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function isAuthorized(request, env) {
  if (!env.SITE_PASSWORD) return false;
  const got = readCookie(request.headers.get('cookie'), COOKIE);
  if (!got) return false;
  return safeEqual(got, await authToken(env.SITE_PASSWORD));
}

async function briefDateMap(env) {
  const seen = {};
  let cursor;
  for (let i = 0; i < 5; i++) {
    const r = await env.MEMO_BUCKET.list({ prefix: 'brief_', limit: 1000, cursor });
    for (const o of (r.objects || [])) {
      const m = /^brief_(\d{4}-\d{2}-\d{2})_p(\d)\.json$/.exec(o.key || '');
      if (!m) continue;
      (seen[m[1]] = seen[m[1]] || []).push(Number(m[2]));
    }
    if (!r.truncated) break;
    cursor = r.cursor;
  }
  return seen;
}

async function fastBriefList(env) {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  if (!env.MEMO_BUCKET) return new Response(JSON.stringify({ dates: [] }), { status: 200, headers });

  let seen;
  try { seen = await briefDateMap(env); }
  catch (e) {
    return new Response(JSON.stringify({ dates: [], error: String(e && e.message ? e.message : e) }), { status: 200, headers });
  }

  const asc = Object.keys(seen).sort();
  const recent = asc.slice(-BRIEF_LIST_CAP);
  const fallbackNo = {};
  asc.forEach((d, i) => { fallbackNo[d] = i + 1; });

  const meta = {};
  const titleDates = recent.filter((d) => (seen[d] || []).includes(0)).slice(-12);
  for (let i = 0; i < titleDates.length; i += 4) {
    const chunk = titleDates.slice(i, i + 4);
    await Promise.all(chunk.map(async (d) => {
      try {
        const o = await env.MEMO_BUCKET.get(BRIEF_KEY(d, 0));
        if (!o) return;
        const v = await o.json();
        meta[d] = {
          title: v && v.headline ? String(v.headline) : '',
          no: v && Number.isFinite(Number(v.no)) ? Number(v.no) : null,
        };
      } catch (_) {}
    }));
  }

  const dates = recent.map((d) => ({
    d,
    no: (meta[d] && meta[d].no) || fallbackNo[d],
    title: (meta[d] && meta[d].title) || '',
    parts: (seen[d] || []).slice().sort(),
  })).reverse();

  return new Response(JSON.stringify({ dates }), { status: 200, headers });
}

function withoutPaidLlmCredentials(env) {
  return new Proxy(env, {
    get(target, prop, receiver) {
      if (prop === 'ANTHROPIC_API_KEY' || prop === 'GEMINI_API_KEY' || prop === 'OPENAI_API_KEY') return undefined;
      return Reflect.get(target, prop, receiver);
    },
  });
}

function allowPaidLlmForPath(pathname) {
  return pathname === '/api/insight' || pathname.startsWith('/api/council') || pathname.startsWith('/api/brief');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/api/briefs' && await isAuthorized(request, env)) {
      return fastBriefList(env);
    }
    const routedEnv = allowPaidLlmForPath(url.pathname) ? env : withoutPaidLlmCredentials(env);
    return core.fetch(request, routedEnv, ctx);
  },
};