// "Hediyelerim" — üstte karosel (ortadaki büyük ve parlak), altta Sepetim / Kazanılacaklar kartları.
// Hazır hediye titrer; dokununca tam ekran açılış: kutu patlar, kediden hediye çıkar.
import { GIFT_KIND_MAP } from '../data.js';
import * as store from '../store.js';
import { summarize, giftProgress } from '../gamify.js';
import { esc, fmtNet } from '../utils.js';
import { confetti } from '../confetti.js';
import { giftBox, playReveal } from '../giftArt.js';

// 'basket' | 'todo'; null ise ilk açılışta duruma göre seçilir
let mode = null;
let focus = 0;              // karoselde ortadaki hediye
export const resetMode = () => { mode = null; focus = 0; };

const condText = g => (GIFT_KIND_MAP[g.kind]?.cond || (t => `${t}`))(g.target);
const kindEmoji = g => GIFT_KIND_MAP[g.kind]?.emoji || '🎁';

/** Kilitli hediyede gösterilen ilerleme. Seri için bugünkü seri: yeni bir seri kurması gerekiyor. */
function shownProgress(g, st, p) {
  const cur = g.kind === 'streak' ? st.streak : p.cur;
  const left = Math.max(0, g.target - cur);
  const leftTxt = GIFT_KIND_MAP[g.kind]?.left(g.kind === 'net' ? fmtNet(left) : Math.ceil(left)) || '';
  const curTxt = g.kind === 'net' ? fmtNet(Math.min(cur, g.target)) : Math.min(Math.floor(cur), g.target);
  return { pct: g.target > 0 ? Math.min(100, (cur / g.target) * 100) : 0, curTxt, leftTxt };
}

/** Hediyelerin durumu ve sırası: hazırlar, teslim bekleyenler, en yakın kilitliler, teslim edilenler */
function giftStates() {
  const state = store.get();
  const st = summarize(state);
  const opened = store.openedMap(state);
  const list = (state.gifts || []).map(g => {
    const p = giftProgress(g, st);
    const status = !p.unlocked ? 'locked' : !opened[g.id] ? 'ready' : 'opened';
    return { g, p, status, prog: shownProgress(g, st, p) };
  });
  const rank = x => x.status === 'ready' ? -3 : x.status === 'opened' ? (x.g.delivered ? 2 : -2) : -(x.p.cur / (x.g.target || 1));
  return { st, list: list.sort((a, b) => rank(a) - rank(b)) };
}

/* ---------------- karosel ---------------- */
function slide(x, off) {
  const { g, status, prog } = x;
  const art = status === 'locked' ? giftBox({ size: 150, locked: true })
    : status === 'ready' ? giftBox({ size: 150 })
    : giftBox({ size: 150, cat: true, open: true });
  const title = status === 'opened' ? esc(g.name) : status === 'ready' ? 'Hediyen hazır!' : esc(condText(g));
  const pill = status === 'locked'
    ? `<span class="gc-pill"><b>${prog.curTxt}</b>/${g.target} · ${esc(prog.leftTxt)}</span>`
    : status === 'ready'
      ? '<span class="gc-pill go">✨ Açmak için dokun</span>'
      : `<span class="gc-pill done">${g.delivered ? '💝 Teslim edildi' : '⏳ Teslim bekliyor'}</span>`;
  return `
  <div class="gc-slide ${status} ${off === 0 ? 'center' : ''} ${Math.abs(off) > 2 ? 'far' : ''}" style="--o:${off}"
       data-gslide="${g.id}" data-status="${status}" role="button" tabindex="${off === 0 ? 0 : -1}">
    <div class="gc-art ${status === 'ready' ? 'tremble' : ''}">${art}</div>
    <div class="gc-title">${title}</div>
    <div class="gc-sub">${status === 'locked' ? `${kindEmoji(g)} ${esc(GIFT_KIND_MAP[g.kind]?.label || '')}` : esc(condText(g)) + ' ✓'}</div>
    ${status === 'locked' ? `<span class="gc-bar"><i style="width:${prog.pct}%"></i></span>` : ''}
    ${pill}
  </div>`;
}

function carousel(list) {
  if (!list.length) return '';
  focus = Math.max(0, Math.min(list.length - 1, focus));
  const slides = list.map((x, i) => ({ x, off: i - focus }));
  return `
  <div class="gc" data-gcarousel>
    <div class="gc-glow" aria-hidden="true"></div>
    <button type="button" class="gc-nav l" data-gstep="-1" ${focus === 0 ? 'disabled' : ''} aria-label="önceki">‹</button>
    <div class="gc-track">${slides.map(s => slide(s.x, s.off)).join('')}</div>
    <button type="button" class="gc-nav r" data-gstep="1" ${focus >= list.length - 1 ? 'disabled' : ''} aria-label="sonraki">›</button>
    <div class="gc-dots">${list.map((x, i) => `<i class="${i === focus ? 'on' : ''} ${x.status}"></i>`).join('')}</div>
  </div>`;
}

/* ---------------- kartlar ---------------- */
function card(x) {
  const { g, status, prog } = x;
  if (status === 'locked') {
    return `
    <div class="gk locked">
      <div class="gk-art">${giftBox({ size: 92, locked: true })}</div>
      <div class="gk-main">
        <span class="gk-kind">${kindEmoji(g)} ${esc(GIFT_KIND_MAP[g.kind]?.label || '')}</span>
        <div class="gk-title">${esc(condText(g))}</div>
        <span class="gk-bar"><i style="width:${prog.pct}%"></i></span>
        <div class="gk-sub"><b>${prog.curTxt}</b>/${g.target} · ${esc(prog.leftTxt)}</div>
      </div>
    </div>`;
  }
  if (status === 'ready') {
    return `
    <button type="button" class="gk ready" data-opengift="${g.id}">
      <div class="gk-art tremble">${giftBox({ size: 92 })}</div>
      <div class="gk-main">
        <span class="gk-kind">✨ Hediyen hazır</span>
        <div class="gk-title">Açmak için dokun!</div>
        <div class="gk-sub">${esc(condText(g))} ✓</div>
      </div>
    </button>`;
  }
  return `
  <div class="gk opened ${g.delivered ? 'delivered' : ''}">
    <div class="gk-art">${giftBox({ size: 92, cat: true, open: true })}</div>
    <div class="gk-main">
      <span class="gk-kind">${g.delivered ? '💝 Teslim edildi' : '⏳ Teslim bekliyor'}</span>
      <div class="gk-title">${esc(g.name)}</div>
      <div class="gk-sub">${esc(condText(g))} ✓</div>
    </div>
  </div>`;
}

export function render() {
  const { list } = giftStates();
  const won = list.filter(x => x.status !== 'locked');
  const todo = list.filter(x => x.status === 'locked');
  const waiting = won.some(x => x.status === 'ready');
  if (!mode) mode = waiting || !todo.length ? 'basket' : 'todo';
  const pct = list.length ? (won.length / list.length) * 100 : 0;

  if (!list.length) {
    return `<div class="gpage"><div class="card"><div class="empty"><div>🎁</div>Henüz hediye eklenmedi.</div></div></div>`;
  }

  const body = mode === 'basket'
    ? (won.length ? `<div class="gks">${won.map(card).join('')}</div>`
      : `<div class="card"><div class="empty"><div>🧺</div>Sepetin henüz boş.<br>Kazanılacak hediyelere bak, ilki çok yakın olabilir!</div></div>`)
    : (todo.length ? `<div class="gks">${todo.map(card).join('')}</div>
         <p class="hint">Hediyenin ne olduğu kazanınca, kutuyu açtığında belli olur 🤫</p>`
      : `<div class="card"><div class="empty"><div>🏆</div>Hepsini kazandın! Sepetine bak 💗</div></div>`);

  return `
  <div class="gpage">
    ${carousel(list)}
    <div class="ghead">
      <div class="ghead-num"><b>${won.length}</b>/${list.length}<small>hediye kazandın</small></div>
      <span class="ghead-bar"><i style="width:${pct}%"></i></span>
    </div>
    <div class="bfilters gift-tabs">
      <button type="button" class="seg ${mode === 'basket' ? 'on' : ''}" data-gmode="basket">🧺 Sepetim (${won.length})</button>
      <button type="button" class="seg ${mode === 'todo' ? 'on' : ''}" data-gmode="todo">🎯 Kazanılacak (${todo.length})</button>
    </div>
    ${body}
  </div>`;
}

export function bind(root, ctx) {
  const open = id => {
    const g = store.findGift(id);
    if (!g) return;
    playReveal(g.name, {
      onBurst: () => { store.markGiftOpened(id); confetti(2600); },
      onClose: () => { store.markGiftOpened(id); ctx.refreshHeader(); ctx.rerender(); },
    });
  };

  root.addEventListener('click', e => {
    const tab = e.target.closest('[data-gmode]');
    if (tab) { mode = tab.dataset.gmode; ctx.rerender(); return; }

    const st = e.target.closest('[data-gstep]');
    if (st) { slideTo(focus + Number(st.dataset.gstep)); return; }

    // karosel: ortadaki hazır hediye açılır, yandaki ortaya gelir
    const sl = e.target.closest('[data-gslide]');
    if (sl) {
      const slides = [...root.querySelectorAll('[data-gslide]')];
      const i = slides.indexOf(sl);
      if (i === focus) { if (sl.dataset.status === 'ready') open(sl.dataset.gslide); }
      else slideTo(i);
      return;
    }

    const og = e.target.closest('[data-opengift]');
    if (og) open(og.dataset.opengift);
  });

  // Karoseli yeniden çizmeden kaydırır: yalnız konumlar değişir, CSS geçişi akıcı kaydırır
  function slideTo(i) {
    const slides = [...root.querySelectorAll('[data-gslide]')];
    if (!slides.length) return;
    focus = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((el, k) => {
      const off = k - focus;
      el.style.setProperty('--o', off);
      el.classList.toggle('center', off === 0);
      el.classList.toggle('far', Math.abs(off) > 2);
      el.tabIndex = off === 0 ? 0 : -1;
    });
    root.querySelectorAll('.gc-dots i').forEach((d, k) => d.classList.toggle('on', k === focus));
    const l = root.querySelector('.gc-nav.l'), r = root.querySelector('.gc-nav.r');
    if (l) l.disabled = focus === 0;
    if (r) r.disabled = focus >= slides.length - 1;
  }

  root.addEventListener('keydown', e => {
    const sl = e.target.closest?.('[data-gslide]');
    if (sl && sl.classList.contains('center') && sl.dataset.status === 'ready' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault(); open(sl.dataset.gslide); return;
    }
    if (e.target.closest?.('[data-gcarousel]') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      slideTo(focus + (e.key === 'ArrowRight' ? 1 : -1)); return;
    }
    const og = e.target.closest?.('[data-opengift]');
    if (og && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(og.dataset.opengift); }
  });

  // karoselde kaydırma (dokunmatik)
  let sx = null;
  root.addEventListener('touchstart', e => { if (e.target.closest('[data-gcarousel]')) sx = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    sx = null;
    if (Math.abs(dx) > 40) slideTo(focus + (dx < 0 ? 1 : -1));
  }, { passive: true });
}
