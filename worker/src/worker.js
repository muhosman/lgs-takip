/**
 * LGS Takip senkron servisi — Cloudflare Worker + Durable Object
 *
 * Tek bir "pano" bir Durable Object içinde tutulur:
 *   - güçlü tutarlılık (yazdığın anda okunur, KV'deki yayılma gecikmesi yok)
 *   - WebSocket ile bağlı tüm cihazlara anlık yayın
 *
 * Şifre sunucuda doğrulanır; istemci kodunda şifre bulunmaz.
 */

const MAX_BODY = 2_000_000;
const MAX_FAILS = 20;
const FAIL_WINDOW_MS = 60 * 60 * 1000;

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

const validDoc = doc => doc && typeof doc === 'object' && typeof doc.days === 'object';

/* ==================== Durable Object ==================== */

export class Board {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async read() {
    let board = await this.state.storage.get('board');
    if (!board) {
      // Eski KV sürümünden tek seferlik taşıma
      try {
        const raw = this.env.LGS && (await this.env.LGS.get('board'));
        if (raw) board = JSON.parse(raw);
      } catch { /* taşıma başarısızsa sıfırdan başla */ }
    }
    return board || { pin: this.env.INITIAL_PIN || '050669', doc: null, updatedAt: 0 };
  }

  write(board) {
    return this.state.storage.put('board', board);
  }

  /** IP başına yanlış şifre denemesi sayacı */
  async checkFails(ip) {
    const rec = await this.state.storage.get('fail:' + ip);
    if (!rec || Date.now() - rec.at > FAIL_WINDOW_MS) return 0;
    return rec.n;
  }
  bumpFail(ip, n) { return this.state.storage.put('fail:' + ip, { n: n + 1, at: Date.now() }); }
  clearFail(ip) { return this.state.storage.delete('fail:' + ip); }

  async authorize(pin, ip) {
    if ((await this.checkFails(ip)) >= MAX_FAILS) {
      return { ok: false, status: 429, message: 'Çok fazla deneme, biraz sonra tekrar dene.' };
    }
    const board = await this.read();
    if (!safeEqual(String(pin || ''), String(board.pin))) {
      await this.bumpFail(ip, await this.checkFails(ip));
      return { ok: false, status: 401, message: 'Şifre yanlış.' };
    }
    await this.clearFail(ip);
    return { ok: true, board };
  }

  /** Belgeyi kaydeder ve gönderen dışındaki tüm bağlı cihazlara yayınlar. */
  async saveAndBroadcast(doc, prevBoard, senderId) {
    const updatedAt = Date.now();
    const nextPin =
      typeof doc.pin === 'string' && /^\d{4,8}$/.test(doc.pin) ? doc.pin : prevBoard.pin;
    await this.write({ pin: nextPin, doc, updatedAt });

    const payload = JSON.stringify({ type: 'sync', doc, updatedAt, from: senderId });
    for (const ws of this.state.getWebSockets()) {
      const att = ws.deserializeAttachment();
      if (!att || !att.authed || att.id === senderId) continue;
      try { ws.send(payload); } catch { /* kopmuş bağlantıyı yok say */ }
    }
    return updatedAt;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const ip = request.headers.get('CF-Connecting-IP') || 'bilinmiyor';

    /* ---- WebSocket ---- */
    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('websocket bekleniyor', { status: 426 });
      }
      // WebSocket'te CORS çalışmaz; kaynağı burada elle doğruluyoruz.
      // (Origin başlığı olmayan istemciler -> komut satırı araçları, testler)
      if (origin && !ALLOWED.includes(origin)) {
        return new Response('kaynak izinli değil', { status: 403 });
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      // Hazırda bekleme (hibernation) API'si: boşta duran bağlantılar ücret üretmez
      this.state.acceptWebSocket(server);
      server.serializeAttachment({ authed: false, id: null, ip });
      return new Response(null, { status: 101, webSocket: client });
    }

    /* ---- HTTP ---- */
    if (url.pathname === '/login' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const auth = await this.authorize(body.pin, ip);
      if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status, origin);
      return json(
        { ok: true, hasData: !!auth.board.doc, updatedAt: auth.board.updatedAt },
        200, origin,
      );
    }

    if (url.pathname === '/data' && request.method === 'GET') {
      const auth = await this.authorize(request.headers.get('X-Pin'), ip);
      if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status, origin);
      return json({ ok: true, doc: auth.board.doc, updatedAt: auth.board.updatedAt }, 200, origin);
    }

    if (url.pathname === '/data' && request.method === 'PUT') {
      const auth = await this.authorize(request.headers.get('X-Pin'), ip);
      if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status, origin);

      const text = await request.text();
      if (text.length > MAX_BODY) return json({ ok: false, message: 'Veri çok büyük.' }, 413, origin);
      let doc;
      try { doc = JSON.parse(text); } catch { return json({ ok: false, message: 'Geçersiz JSON.' }, 400, origin); }
      if (!validDoc(doc)) return json({ ok: false, message: 'Geçersiz veri biçimi.' }, 400, origin);

      const senderId = url.searchParams.get('from') || null;
      const updatedAt = await this.saveAndBroadcast(doc, auth.board, senderId);
      return json({ ok: true, updatedAt }, 200, origin);
    }

    return json({ ok: false, message: 'Bulunamadı.' }, 404, origin);
  }

  /* ---- WebSocket olayları (hibernation API) ---- */

  async webSocketMessage(ws, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const att = ws.deserializeAttachment() || {};

    if (msg.type === 'auth') {
      const auth = await this.authorize(msg.pin, att.ip || 'ws');
      if (!auth.ok) {
        ws.send(JSON.stringify({ type: 'denied', message: auth.message }));
        ws.close(4001, 'yetkisiz');
        return;
      }
      const id = msg.id || crypto.randomUUID();
      ws.serializeAttachment({ ...att, authed: true, id });
      ws.send(JSON.stringify({
        type: 'ready',
        doc: auth.board.doc,
        updatedAt: auth.board.updatedAt,
        peers: this.countPeers(),
      }));
      this.announcePeers();
      return;
    }

    if (!att.authed) return;   // yetkisiz mesajları yok say

    if (msg.type === 'update' && validDoc(msg.doc)) {
      const board = await this.read();
      const updatedAt = await this.saveAndBroadcast(msg.doc, board, att.id);
      ws.send(JSON.stringify({ type: 'saved', updatedAt }));
      return;
    }

    if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
  }

  countPeers() {
    let n = 0;
    for (const ws of this.state.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (a && a.authed) n++;
    }
    return n;
  }

  announcePeers() {
    const payload = JSON.stringify({ type: 'peers', peers: this.countPeers() });
    for (const ws of this.state.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (a && a.authed) { try { ws.send(payload); } catch { /* yok say */ } }
    }
  }

  webSocketClose() { this.announcePeers(); }
  webSocketError() { this.announcePeers(); }
}

/* ==================== Worker girişi ==================== */

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (url.pathname === '/health') {
      return json({ ok: true, service: 'lgs-takip', live: true }, 200, origin);
    }

    // Tek pano: sabit isimli tek bir Durable Object
    const id = env.BOARD.idFromName('tek-pano');
    return env.BOARD.get(id).fetch(request);
  },
};
