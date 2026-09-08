// Bulut senkronu: HTTP (ilk yükleme / yedek yol) + WebSocket (anlık yayın)
import { API_BASE } from './config.js';

export const enabled = () => !!API_BASE && !API_BASE.startsWith('PLACEHOLDER');

/* ---------------- durum ---------------- */
// off | idle | syncing | synced | live | offline | error
let status = enabled() ? 'idle' : 'off';
let peers = 0;
const listeners = new Set();

export const onStatus = fn => { listeners.add(fn); fn(status, peers); return () => listeners.delete(fn); };
export const getStatus = () => status;
export const getPeers = () => peers;

function setStatus(s, p = peers) {
  // canlı bağlantı varken geçici "syncing" durumu göstergeyi titretmesin
  status = s; peers = p;
  listeners.forEach(fn => fn(status, peers));
}

/* ---------------- HTTP ---------------- */
async function call(path, options = {}, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(API_BASE + path, { ...options, signal: ctrl.signal });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

/** true = doğru · false = yanlış · null = sunucuya ulaşılamadı */
export async function login(pin) {
  if (!enabled()) return null;
  try {
    const { status: code } = await call('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (code === 200) { setStatus('idle'); return true; }
    if (code === 401) return false;
    setStatus('error');
    return null;
  } catch {
    setStatus('offline');
    return null;
  }
}

export async function pull(pin) {
  if (!enabled()) return null;
  try {
    const { status: code, body } = await call('/data', { headers: { 'X-Pin': pin } });
    if (code !== 200) { setStatus('error'); return null; }
    setStatus(live() ? 'live' : 'synced');
    return body.doc || null;
  } catch {
    setStatus('offline');
    return null;
  }
}

export async function push(pin, doc) {
  if (!enabled()) return false;
  try {
    const { status: code } = await call(`/data?from=${encodeURIComponent(clientId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Pin': pin },
      body: JSON.stringify(doc),
    });
    if (code === 200) { setStatus(live() ? 'live' : 'synced'); return true; }
    setStatus('error');
    return false;
  } catch {
    setStatus('offline');
    return false;
  }
}

/* ---------------- WebSocket (anlık) ---------------- */
const clientId =
  (globalThis.crypto?.randomUUID?.() || String(Math.random())).slice(0, 12);

let ws = null;
let activePin = '';
let onDoc = null;
let backoff = 1000;
let reconnectTimer = null;
let pingTimer = null;
let closedByUs = false;

export const live = () => !!ws && ws.readyState === WebSocket.OPEN;
export const myId = () => clientId;

const wsUrl = () => API_BASE.replace(/^http/, 'ws') + '/ws';

/** Anlık bağlantıyı açar. onDocFn(doc) uzaktan gelen her değişiklikte çağrılır. */
export function connectLive(pin, onDocFn) {
  if (!enabled()) return;
  activePin = pin;
  onDoc = onDocFn;
  closedByUs = false;
  openSocket();
}

function openSocket() {
  if (!enabled() || closedByUs) return;
  clearTimeout(reconnectTimer);
  try { ws?.close(); } catch { /* zaten kapalı */ }

  let sock;
  try { sock = new WebSocket(wsUrl()); } catch { scheduleReconnect(); return; }
  ws = sock;

  sock.onopen = () => {
    sock.send(JSON.stringify({ type: 'auth', pin: activePin, id: clientId }));
    clearInterval(pingTimer);
    // bağlantıyı canlı tut
    pingTimer = setInterval(() => {
      if (sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify({ type: 'ping' }));
    }, 45000);
  };

  sock.onmessage = ev => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }

    if (msg.type === 'ready') {
      backoff = 1000;
      setStatus('live', msg.peers || 1);
      if (msg.doc && onDoc) onDoc(msg.doc);
      return;
    }
    if (msg.type === 'sync') {
      setStatus('live');
      if (msg.doc && onDoc) onDoc(msg.doc);
      return;
    }
    if (msg.type === 'peers') { setStatus('live', msg.peers); return; }
    if (msg.type === 'denied') { closedByUs = true; setStatus('error'); return; }
  };

  sock.onclose = () => {
    clearInterval(pingTimer);
    if (ws === sock) ws = null;
    if (!closedByUs) { setStatus('offline', 0); scheduleReconnect(); }
  };

  sock.onerror = () => { /* onclose zaten devreye girecek */ };
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(openSocket, backoff);
  backoff = Math.min(backoff * 2, 15000);
}

/** Değişikliği anlık kanaldan gönderir. Bağlantı yoksa false döner. */
export function sendLive(doc) {
  if (!live()) return false;
  try {
    ws.send(JSON.stringify({ type: 'update', doc }));
    return true;
  } catch {
    return false;
  }
}

export function disconnectLive() {
  closedByUs = true;
  clearTimeout(reconnectTimer);
  clearInterval(pingTimer);
  try { ws?.close(); } catch { /* zaten kapalı */ }
  ws = null;
  setStatus(enabled() ? 'idle' : 'off', 0);
}
