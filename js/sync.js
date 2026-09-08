// Bulut senkronu: Cloudflare Worker ile konuşan ince katman
import { API_BASE } from './config.js';

export const enabled = () => !!API_BASE && !API_BASE.startsWith('PLACEHOLDER');

const listeners = new Set();
let status = enabled() ? 'idle' : 'off';   // off | idle | syncing | synced | offline | error

export const onStatus = fn => { listeners.add(fn); fn(status); return () => listeners.delete(fn); };
export const getStatus = () => status;

function setStatus(s) {
  status = s;
  listeners.forEach(fn => fn(s));
}

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

/**
 * Şifreyi sunucuda doğrular.
 * @returns {true} doğru · {false} yanlış · {null} sunucuya ulaşılamadı
 */
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

/** Sunucudaki belgeyi getirir. Ulaşılamazsa null. */
export async function pull(pin) {
  if (!enabled()) return null;
  setStatus('syncing');
  try {
    const { status: code, body } = await call('/data', { headers: { 'X-Pin': pin } });
    if (code !== 200) { setStatus('error'); return null; }
    setStatus('synced');
    return body.doc || null;
  } catch {
    setStatus('offline');
    return null;
  }
}

/** Belgeyi sunucuya yazar. Başarılıysa true. */
export async function push(pin, doc) {
  if (!enabled()) return false;
  setStatus('syncing');
  try {
    const { status: code } = await call('/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Pin': pin },
      body: JSON.stringify(doc),
    });
    if (code === 200) { setStatus('synced'); return true; }
    setStatus('error');
    return false;
  } catch {
    setStatus('offline');
    return false;
  }
}
