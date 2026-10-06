// Yönetici kilidi — hediye yönetimi ve deneme girişi aynı şifreyi kullanır.
// Şifre `giftPin` alanında durur (eski adı; eşitlenen belgeler bozulmasın diye değişmedi).
// Kilit oturumluk ve bellekte: başka bir sekmeye geçince app.js kapatır.
import * as store from './store.js';
import { esc } from './utils.js';

let unlocked = false;

export const isUnlocked = () => unlocked;
export const lock = () => { unlocked = false; };
export const pinOk = v => /^\d{4,12}$/.test(v);

/** Kilit kartı. Şifre henüz yoksa belirleme formu olur. */
export function gateHtml({ title, hint }) {
  const first = !store.get().giftPin;
  return `
  <div class="card admin-gate">
    <div class="admin-gate-ico">🔐</div>
    <div class="card-title" style="justify-content:center">${first ? 'Yönetici şifresi belirle' : esc(title)}</div>
    <p class="hint" style="margin:0 0 12px">
      ${first
        ? 'Yalnız senin bileceğin 4-12 rakamlı bir şifre seç. Hediyeler ve deneme girişi bu şifreyle açılır 🤫'
        : esc(hint)}
    </p>
    <input class="inp" data-admin-pin type="password" inputmode="numeric" maxlength="12"
           placeholder="${first ? '4-12 rakam' : 'Yönetici şifresi'}" autocomplete="off">
    <div style="height:10px"></div>
    <button type="button" class="btn-primary wide" data-admin-go>${first ? 'Şifreyi belirle' : 'Aç 🔓'}</button>
  </div>`;
}

/** Kilit kartının olaylarını bağlar; doğru şifrede `onOpen` çağrılır. */
export function bindGate(root, ctx, onOpen) {
  const input = root.querySelector('[data-admin-pin]');
  if (!input) return;
  const go = () => {
    const v = (input.value || '').trim();
    const s = store.get();
    if (!s.giftPin) {
      if (!pinOk(v)) { ctx.toast('Şifre 4-12 rakam olmalı'); return; }
      store.setMeta({ giftPin: v });
    } else if (v !== s.giftPin) { ctx.toast('Şifre yanlış'); return; }
    unlocked = true;
    onOpen();
  };
  root.querySelector('[data-admin-go]').addEventListener('click', go);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}
