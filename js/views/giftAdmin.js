// "Hediye yönetimi" ekranı — Ayarlar'dan açılır, yönetici şifresiyle korunur.
// Hediyeler koşul türüne göre gruplanır; ekleme ve düzenleme aynı pencerede.
import { GIFT_KINDS, GIFT_KIND_MAP } from '../data.js';
import * as store from '../store.js';
import { summarize, giftProgress } from '../gamify.js';
import { esc, clampInt, fmtNet } from '../utils.js';
import * as admin from '../admin.js';

let sheet = null;           // null | { mode:'add', kind } | { mode:'edit', id } | { mode:'pin' }
export const reset = () => { sheet = null; };

const kindOptions = sel => GIFT_KINDS.map(k =>
  `<option value="${k.key}" ${k.key === sel ? 'selected' : ''}>${k.emoji} ${esc(k.label)}</option>`).join('');

/* ---------------- kilit ---------------- */
const gate = () => `
  <button type="button" class="back-link" data-back>← Ayarlar</button>
  ${admin.gateHtml({ title: 'Hediye yönetimi', hint: 'Devam etmek için yönetici şifresini gir.' })}`;

/* ---------------- liste ---------------- */
function row(g, st, opened) {
  const p = giftProgress(g, st);
  const cur = g.kind === 'net' ? fmtNet(p.cur) : Math.floor(p.cur);
  const status = !p.unlocked
    ? `<span class="ga-tag">🔒 ${cur}/${g.target}</span>`
    : opened[g.id]
      ? '<span class="ga-tag ok">🎉 açıldı</span>'
      : '<span class="ga-tag ready">🎁 hazır, açılmadı</span>';
  return `
  <li class="ga-row">
    <div class="ga-main">
      <div class="ga-name">${esc(g.name)}</div>
      <div class="ga-sub">Hedef: <b>${g.target}</b> ${status}</div>
    </div>
    <label class="ga-done" title="Teslim edildi">
      <input type="checkbox" data-gdeliver="${g.id}" ${g.delivered ? 'checked' : ''}><span>teslim</span>
    </label>
    <button type="button" class="ga-btn" data-gedit="${g.id}" aria-label="düzenle">✏️</button>
    <button type="button" class="ga-btn danger" data-gdel="${g.id}" aria-label="sil">🗑</button>
  </li>`;
}

function section(kind, gifts, st, opened) {
  const list = gifts.filter(g => g.kind === kind.key).sort((a, b) => a.target - b.target);
  return `
  <section class="ga-sec">
    <div class="ga-sec-head">
      <span class="ga-sec-title">${kind.emoji} ${esc(kind.label)} <i>${list.length}</i></span>
      <button type="button" class="ga-add-mini" data-gadd="${kind.key}">+ Ekle</button>
    </div>
    ${list.length
      ? `<ul class="ga-list">${list.map(g => row(g, st, opened)).join('')}</ul>`
      : '<div class="ga-empty">Bu koşulda hediye yok.</div>'}
  </section>`;
}

function sheetHtml(s) {
  if (!sheet) return '';
  if (sheet.mode === 'pin') {
    return `
    <div class="modal-scrim" data-gclose></div>
    <div class="modal" role="dialog" aria-modal="true" aria-label="Yönetici şifresi">
      <div class="modal-head"><span class="modal-title">🔒 Yönetici şifresini değiştir</span>
        <button type="button" class="drawer-x" data-gclose aria-label="kapat">✕</button></div>
      <div class="modal-body">
        <input id="gaNewPin" class="inp" type="password" inputmode="numeric" maxlength="12" placeholder="Yeni şifre (4-12 rakam)" autocomplete="off">
      </div>
      <div class="modal-foot"><div class="btn-row">
        <button type="button" class="btn-primary" data-gpinsave>Kaydet</button>
        <button type="button" class="btn-ghost" data-gclose>Vazgeç</button>
      </div></div>
    </div>`;
  }
  const g = sheet.mode === 'edit' ? store.findGift(sheet.id) : null;
  const kind = g ? g.kind : sheet.kind || 'net';
  return `
  <div class="modal-scrim" data-gclose></div>
  <div class="modal" role="dialog" aria-modal="true" aria-label="${g ? 'Hediyeyi düzenle' : 'Hediye ekle'}">
    <div class="modal-head"><span class="modal-title">${g ? '✏️ Hediyeyi düzenle' : '🎁 Hediye ekle'}</span>
      <button type="button" class="drawer-x" data-gclose aria-label="kapat">✕</button></div>
    <div class="modal-body">
      <label class="lbl" for="gaName">Hediye</label>
      <input id="gaName" class="inp" type="text" maxlength="80" value="${g ? esc(g.name) : ''}" placeholder="Örn: Sinema bileti">
      <div class="frow" style="margin-top:10px">
        <div>
          <label class="lbl" for="gaKind">Koşul</label>
          <select id="gaKind" class="inp">${kindOptions(kind)}</select>
        </div>
        <div>
          <label class="lbl" for="gaTarget">Hedef</label>
          <input id="gaTarget" class="inp" type="number" inputmode="numeric" min="1" value="${g ? g.target : ''}" placeholder="Örn: 70">
        </div>
      </div>
      <p class="hint" id="gaCond" style="text-align:left;margin:9px 0 0"></p>
      ${g ? '<p class="hint" style="text-align:left;margin:6px 0 0">Koşulu ya da hedefi değiştirirsen hediye baştan başlar.</p>' : ''}
    </div>
    <div class="modal-foot"><div class="btn-row">
      <button type="button" class="btn-primary" data-gsave>${g ? 'Kaydet' : 'Ekle'}</button>
      <button type="button" class="btn-ghost" data-gclose>Vazgeç</button>
    </div></div>
  </div>`;
}

export function render() {
  const s = store.get();
  if (!admin.isUnlocked()) return gate();

  const st = summarize(s);
  const opened = store.openedMap(s);
  const gifts = s.gifts || [];
  const won = gifts.filter(g => giftProgress(g, st).unlocked).length;
  const delivered = gifts.filter(g => g.delivered).length;

  return `
  <button type="button" class="back-link" data-back>← Ayarlar</button>
  <div class="card ga-head">
    <div>
      <div class="ga-head-title">🎁 Hediye yönetimi</div>
      <div class="ga-head-sub">${gifts.length} hediye · ${won} kazanıldı · ${delivered} teslim edildi</div>
    </div>
    <button type="button" class="btn-primary" data-gadd="net">+ Hediye ekle</button>
  </div>
  <div class="ga-grid">${GIFT_KINDS.map(k => section(k, gifts, st, opened)).join('')}</div>
  <p class="hint">Kardeşin yalnız koşulu ve ilerlemeyi görür. Koşul sağlanınca kutu sallanır, dokununca hediyenin adı açılır.</p>
  <div class="btn-row" style="margin-top:10px">
    <button type="button" class="btn-ghost" data-gpin>🔒 Şifreyi değiştir</button>
    <button type="button" class="btn-ghost" data-glock>Kilitle ve çık</button>
  </div>
  <div id="gaSheet">${sheetHtml(s)}</div>`;
}

export function bind(root, ctx) {
  const $ = sel => root.querySelector(sel);
  document.body.classList.toggle('modal-open', !!sheet);

  const openSheet = next => { sheet = next; ctx.rerender(); };
  const goBack = () => { admin.lock(); sheet = null; ctx.go('settings'); };

  // Kilit ekranı (hediyeler ve deneme girişi ortak)
  admin.bindGate(root, ctx, () => ctx.rerender());
  setTimeout(() => root.querySelector('[data-admin-pin]')?.focus(), 150);

  // Pencerede koşul seçilince örnek cümle
  const condPreview = () => {
    const k = GIFT_KIND_MAP[$('#gaKind')?.value];
    const t = clampInt($('#gaTarget')?.value, 0, 999999);
    const el = $('#gaCond');
    if (el && k) el.textContent = t > 0 ? `Kardeşin şunu görecek: "${k.cond(t)}"` : '';
  };
  condPreview();
  root.addEventListener('input', e => { if (e.target.closest('#gaTarget, #gaKind')) condPreview(); });
  root.addEventListener('change', e => {
    if (e.target.closest('#gaKind')) { condPreview(); return; }
    const cb = e.target.closest('[data-gdeliver]');
    if (!cb) return;
    store.setGiftDelivered(cb.dataset.gdeliver, cb.checked);
    ctx.toast(cb.checked ? 'Teslim edildi olarak işaretlendi 💝' : 'Teslim işareti kaldırıldı');
  });

  root.addEventListener('click', e => {
    if (e.target.closest('[data-back]')) { goBack(); return; }
    if (e.target.closest('[data-glock]')) { goBack(); ctx.toast('Kilitlendi 🔒'); return; }
    if (e.target.closest('[data-gclose]')) { openSheet(null); return; }
    if (e.target.closest('[data-gpin]')) { openSheet({ mode: 'pin' }); return; }

    const add = e.target.closest('[data-gadd]');
    if (add) { openSheet({ mode: 'add', kind: add.dataset.gadd }); return; }
    const ed = e.target.closest('[data-gedit]');
    if (ed) { openSheet({ mode: 'edit', id: ed.dataset.gedit }); return; }

    if (e.target.closest('[data-gpinsave]')) {
      const v = ($('#gaNewPin').value || '').trim();
      if (!admin.pinOk(v)) { ctx.toast('Şifre 4-12 rakam olmalı'); return; }
      store.setMeta({ giftPin: v });
      openSheet(null);
      ctx.toast('Yönetici şifresi güncellendi 🔒');
      return;
    }

    if (e.target.closest('[data-gsave]')) {
      const name = ($('#gaName').value || '').trim();
      const kind = $('#gaKind').value;
      const target = clampInt($('#gaTarget').value, 0, 999999);
      if (!name) { ctx.toast('Hediyenin adını yaz'); return; }
      if (!GIFT_KIND_MAP[kind] || target < 1) { ctx.toast('Hedefi gir'); return; }
      if (sheet.mode === 'edit') {
        store.updateGift(sheet.id, { name, kind, target });
        ctx.toast('Hediye güncellendi 🎁');
      } else {
        store.addGift({ name, kind, target });
        ctx.toast('Hediye eklendi 🎁');
      }
      sheet = null;
      ctx.refreshHeader();
      ctx.rerender();
      return;
    }

    const del = e.target.closest('[data-gdel]');
    if (del) {
      const g = store.findGift(del.dataset.gdel);
      if (!g || !confirm(`"${g.name}" silinsin mi?`)) return;
      store.removeGift(g.id);
      ctx.refreshHeader();
      ctx.rerender();
    }
  });

  root.addEventListener('keydown', e => { if (e.key === 'Escape' && sheet) openSheet(null); });
}
