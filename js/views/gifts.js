// "Hediyelerim" ekranı — sağ üstteki sepetten açılır: kazanılanlar ve kazanılacaklar
import { GIFT_KIND_MAP } from '../data.js';
import * as store from '../store.js';
import { summarize, giftProgress } from '../gamify.js';
import { esc, fmtNet } from '../utils.js';
import { confetti } from '../confetti.js';

// 'basket' | 'todo'; null ise ilk açılışta duruma göre seçilir
let mode = null;
export const resetMode = () => { mode = null; };

const condText = g => (GIFT_KIND_MAP[g.kind]?.cond || (t => `${t}`))(g.target);

/**
 * Kilitli hediyede gösterilen ilerleme. Seri için bugünkü seri gösterilir:
 * yeni bir seri kurması gerekiyor, en iyisi değil.
 */
function shownProgress(g, st, p) {
  const cur = g.kind === 'streak' ? st.streak : p.cur;
  const left = Math.max(0, g.target - cur);
  const leftTxt = GIFT_KIND_MAP[g.kind]?.left(g.kind === 'net' ? fmtNet(left) : Math.ceil(left)) || '';
  const curTxt = g.kind === 'net' ? fmtNet(Math.min(cur, g.target)) : Math.min(Math.floor(cur), g.target);
  return { pct: g.target > 0 ? Math.min(100, (cur / g.target) * 100) : 0, curTxt, leftTxt };
}

function lockedRow(g, st, p) {
  const s = shownProgress(g, st, p);
  return `
  <div class="gift locked">
    <div class="gift-box">🎁</div>
    <div class="gift-body">
      <div class="gift-cond">${esc(condText(g))}</div>
      <div class="badge-prog gift-prog">
        <span class="badge-prog-bar"><i style="width:${s.pct}%"></i></span>
        <span class="badge-prog-txt">${s.curTxt}/${g.target} · ${esc(s.leftTxt)}</span>
      </div>
    </div>
  </div>`;
}

function wonRow(g, opened) {
  if (!opened[g.id]) {
    return `
    <button type="button" class="gift ready" data-opengift="${g.id}">
      <div class="gift-box">🎁</div>
      <div class="gift-body">
        <div class="gift-name">Hediyen hazır!</div>
        <div class="gift-cond">${esc(condText(g))} ✓ · açmak için dokun</div>
      </div>
    </button>`;
  }
  return `
  <div class="gift opened">
    <div class="gift-box">${g.delivered ? '💝' : '🎉'}</div>
    <div class="gift-body">
      <div class="gift-name">${esc(g.name)}</div>
      <div class="gift-cond">${esc(condText(g))} ✓</div>
    </div>
    <span class="gift-state ${g.delivered ? 'done' : ''}">${g.delivered ? 'Teslim edildi ✓' : 'Teslim bekliyor'}</span>
  </div>`;
}

export function render() {
  const state = store.get();
  const st = summarize(state);
  const opened = store.openedMap(state);
  const all = (state.gifts || []).map(g => ({ g, p: giftProgress(g, st) }));
  const won = all.filter(x => x.p.unlocked);
  const todo = all.filter(x => !x.p.unlocked);
  const waiting = won.some(x => !opened[x.g.id]);
  if (!mode) mode = waiting || !todo.length ? 'basket' : 'todo';

  // sepette: açılmayı bekleyenler, teslim bekleyenler, en sonda teslim edilenler
  const wonRank = ({ g }) => !opened[g.id] ? 0 : g.delivered ? 2 : 1;
  won.sort((a, b) => wonRank(a) - wonRank(b));
  // kazanılacaklar: en yakın olan üstte
  todo.sort((a, b) => (b.p.cur / b.g.target) - (a.p.cur / a.g.target));

  const body = mode === 'basket'
    ? (won.length
        ? `<div class="card gifts">${won.map(x => wonRow(x.g, opened)).join('')}</div>`
        : `<div class="card"><div class="empty"><div>🧺</div>Sepetin henüz boş.<br>Kazanılacak hediyelere bak, ilki çok yakın olabilir!</div></div>`)
    : (todo.length
        ? `<div class="card gifts">${todo.map(x => lockedRow(x.g, st, x.p)).join('')}</div>
           <p class="hint">Hediyenin ne olduğu kazanınca, kutuyu açtığında belli olur 🤫</p>`
        : `<div class="card"><div class="empty"><div>🏆</div>Hepsini kazandın! Sepetine bak 💗</div></div>`);

  const pct = all.length ? (won.length / all.length) * 100 : 0;
  return `
  <div class="card badge-summary">
    <div class="badge-sum-head">
      <div class="badge-sum-num">${won.length}<i>/${all.length}</i></div>
      <div class="badge-sum-lbl">hediye kazandın 🎁</div>
    </div>
    <span class="badge-sum-bar"><i style="width:${pct}%"></i></span>
  </div>
  <div class="subtabs gift-tabs">
    <button type="button" class="subtab ${mode === 'basket' ? 'on' : ''}" data-gmode="basket">🧺 Sepetim (${won.length})</button>
    <button type="button" class="subtab ${mode === 'todo' ? 'on' : ''}" data-gmode="todo">🎯 Kazanılacak Hediyeler (${todo.length})</button>
  </div>
  ${body}`;
}

export function bind(root, ctx) {
  root.addEventListener('click', e => {
    const tab = e.target.closest('[data-gmode]');
    if (tab) { mode = tab.dataset.gmode; ctx.rerender(); return; }

    const btn = e.target.closest('[data-opengift]');
    if (!btn || btn.classList.contains('opening')) return;
    const id = btn.dataset.opengift;
    btn.classList.add('opening');           // kutu büyüyüp kaybolur
    setTimeout(() => {
      store.markGiftOpened(id);
      confetti(2400);
      ctx.refreshHeader();
      ctx.rerender();
      const g = store.findGift(id);
      if (g) ctx.toast(`🎉 ${g.name}`);
    }, 750);
  });
}
