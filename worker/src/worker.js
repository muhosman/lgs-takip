/**
 * LGS Takip senkron servisi — Cloudflare Worker + KV
 *
 * Şifre sunucu tarafında doğrulanır; istemci kodunda şifre bulunmaz.
 * Tek bir "pano" saklanır: { pin, doc, updatedAt }
 */

const KV_KEY = 'board';
const MAX_BODY = 2_000_000;          // ~2MB
const MAX_FAILS = 20;                // saatte yanlış şifre denemesi
const FAIL_WINDOW = 60 * 60;         // saniye

const ALLOWED = [
  'https://muhosman.github.io',
  'http://localhost:8000',
  'http://localhost:8765',
  'http://127.0.0.1:8765',
  'http://127.0.0.1:8766',
];

function corsHeaders(origin) {
  const allow = ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Pin',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) },
  });

/** Zamanlama saldırısına kapalı karşılaştırma */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function readBoard(env) {
  const raw = await env.LGS.get(KV_KEY);
  if (!raw) return { pin: env.INITIAL_PIN || '050669', doc: null, updatedAt: 0 };
  try {
    return JSON.parse(raw);
  } catch {
    return { pin: env.INITIAL_PIN || '050669', doc: null, updatedAt: 0 };
  }
}

const writeBoard = (env, board) => env.LGS.put(KV_KEY, JSON.stringify(board));

/** Kaba kuvvet koruması: IP başına yanlış deneme sayacı */
async function failCount(env, ip) {
  const n = await env.LGS.get('fail:' + ip);
  return n ? Number(n) : 0;
}
const bumpFail = (env, ip, n) =>
  env.LGS.put('fail:' + ip, String(n + 1), { expirationTtl: FAIL_WINDOW });
const clearFail = (env, ip) => env.LGS.delete('fail:' + ip);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    const ip = request.headers.get('CF-Connecting-IP') || 'bilinmiyor';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === '/health') {
      return json({ ok: true, service: 'lgs-takip' }, 200, origin);
    }

    // --- şifre doğrulama (login ve veri uçlarının ortak adımı) ---
    const authorize = async pin => {
      const fails = await failCount(env, ip);
      if (fails >= MAX_FAILS) return { ok: false, status: 429, message: 'Çok fazla deneme, biraz sonra tekrar dene.' };
      const board = await readBoard(env);
      if (!safeEqual(String(pin || ''), String(board.pin))) {
        await bumpFail(env, ip, fails);
        return { ok: false, status: 401, message: 'Şifre yanlış.' };
      }
      if (fails) await clearFail(env, ip);
      return { ok: true, board };
    };

    try {
      if (url.pathname === '/login' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const auth = await authorize(body.pin);
        if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status, origin);
        return json({ ok: true, hasData: !!auth.board.doc, updatedAt: auth.board.updatedAt }, 200, origin);
      }

      if (url.pathname === '/data' && request.method === 'GET') {
        const auth = await authorize(request.headers.get('X-Pin'));
        if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status, origin);
        return json({ ok: true, doc: auth.board.doc, updatedAt: auth.board.updatedAt }, 200, origin);
      }

      if (url.pathname === '/data' && request.method === 'PUT') {
        const auth = await authorize(request.headers.get('X-Pin'));
        if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status, origin);

        const text = await request.text();
        if (text.length > MAX_BODY) return json({ ok: false, message: 'Veri çok büyük.' }, 413, origin);

        let doc;
        try { doc = JSON.parse(text); } catch { return json({ ok: false, message: 'Geçersiz JSON.' }, 400, origin); }
        if (!doc || typeof doc !== 'object' || typeof doc.days !== 'object') {
          return json({ ok: false, message: 'Geçersiz veri biçimi.' }, 400, origin);
        }

        const updatedAt = Date.now();
        // şifre uygulamadan değiştirildiyse sunucudaki de güncellensin
        const nextPin = typeof doc.pin === 'string' && /^\d{4,8}$/.test(doc.pin) ? doc.pin : auth.board.pin;
        await writeBoard(env, { pin: nextPin, doc, updatedAt });
        return json({ ok: true, updatedAt }, 200, origin);
      }

      return json({ ok: false, message: 'Bulunamadı.' }, 404, origin);
    } catch (err) {
      return json({ ok: false, message: 'Sunucu hatası: ' + err.message }, 500, origin);
    }
  },
};
