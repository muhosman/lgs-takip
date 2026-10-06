// "Rozetler" ekranı — kazanılan ve kilitli rozetler, kategori kategori
import { BADGES, BADGE_GROUPS, GIFT_KIND_MAP } from '../data.js';
import * as store from '../store.js';
import { summarize, earnedBadges, giftProgress } from '../gamify.js';
import { esc, fmtNet } from '../utils.js';
import { confetti } from '../confetti.js';

const condText = g => (GIFT_KIND_MAP[g.kind]?.cond || (t => `${t}`))(g.target);
const fmtCur = (g, cur) => g.kind === 'net' ? fmtNet(Math.min(cur, g.target)) : Math.min(Math.floor(cur), g.target);

/**
 * Hediye satırı. Üç hâl:
 *  kilitli  → soluk kutu, yalnız koşul ve ilerleme (ne olduğu gizli)
 *  hazır    → sallanan kutu, dokununca açılır
 *  açılmış  → hediyenin adı ve teslim durumu
 */
function giftRow(g, st, opened) {
  const p = giftProgress(g, st);
  if (!p.unlocked) {
    const pct = p.target > 0 ? Math.min(100, (p.cur / p.target) * 100) : 0;
    return `
    <div class="gift locked">
      <div class="gift-box">🎁</div>
      <div class="gift-body">
        <div class="gift-cond">${esc(condText(g))}</div>
        <div class="badge-prog gift-prog">
          <span class="badge-prog-bar"><i style="width:${pct}%"></i></span>
          <span class="badge-prog-txt">${fmtCur(g, p.cur)}/${g.target}</span>
        </div>
      </div>
    </div>`;
  }
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

function giftsSection(state, st) {
  const gifts = state.gifts || [];
  if (!gifts.length) return '';
  const opened = state.openedGifts || {};
  // hazırlar, sonra teslim bekleyen açılmışlar, sonra en yakın kilitliler, en sonda teslim edilenler
  // (açılan kutu yerinde kalsın, aşağı kaymasın)
  const rank = g => {
    const p = giftProgress(g, st);
    if (p.unlocked && !opened[g.id]) return -3;
    if (p.unlocked) return g.delivered ? 1 : -2;
    return -(p.target ? p.cur / p.target : 0);
  };
  const list = [...gifts].sort((a, b) => rank(a) - rank(b));
  const got = gifts.filter(g => giftProgress(g, st).unlocked).length;
  return `
  <div class="sec-title">🎁 Hediyelerim <span class="sec-count">${got}/${gifts.length}</span></div>
  <div class="card gifts">${list.map(g => giftRow(g, st, opened)).join('')}</div>`;
}

/** Kilitli rozette "340/500" ve ince bir çubuk; ilerlemesi olmayanlarda boş */
function progressBar(badge, st) {
  if (typeof badge.progress !== 'function') return '';
  const [cur, target] = badge.progress(st);
  const pct = target > 0 ? Math.min(100, (cur / target) * 100) : 0;
  return `
    <div class="badge-prog">
      <span class="badge-prog-bar"><i style="width:${pct}%"></i></span>
      <span class="badge-prog-txt">${cur}/${target}</span>
    </div>`;
}

function badgeCard(b, earned, st) {
  const has = earned.has(b.id);
  return `
  <div class="badge ${has ? 'earned' : 'locked'}">
    <div class="badge-ico">${has ? b.ico : '🔒'}</div>
    <div class="badge-name">${esc(b.name)}</div>
    <div class="badge-desc">${esc(b.desc)}</div>
    ${has ? '' : progressBar(b, st)}
  </div>`;
}

export function render() {
  const state = store.get();
  const st = summarize(state);
  const earned = new Set(earnedBadges(st));
  const pct = BADGES.length ? (earned.size / BADGES.length) * 100 : 0;

  // Kazanmaya en yakın 3 kilitli rozet — "sıradaki hedefin" kartı
  const next = BADGES
    .filter(b => !earned.has(b.id) && typeof b.progress === 'function')
    .map(b => { const [cur, target] = b.progress(st); return { b, ratio: target ? cur / target : 0, cur, target }; })
    .sort((x, y) => y.ratio - x.ratio)
    .slice(0, 3);

  const groups = BADGE_GROUPS.map(g => {
    const list = BADGES.filter(b => b.group === g.key);
    if (!list.length) return '';
    const got = list.filter(b => earned.has(b.id)).length;
    return `
    <div class="sec-title">${g.emoji} ${g.label} <span class="sec-count">${got}/${list.length}</span></div>
    <div class="badges">${list.map(b => badgeCard(b, earned, st)).join('')}</div>`;
  }).join('');

  return `
  ${giftsSection(state, st)}
  <div class="card badge-summary">
    <div class="badge-sum-head">
      <div class="badge-sum-num">${earned.size}<i>/${BADGES.length}</i></div>
      <div class="badge-sum-lbl">rozet kazandın 🏅</div>
    </div>
    <span class="badge-sum-bar"><i style="width:${pct}%"></i></span>
    ${next.length ? `
    <div class="badge-next">
      <div class="badge-next-title">Kazanmaya en yakın</div>
      ${next.map(n => `
        <div class="badge-next-row">
          <span class="badge-next-ico">${n.b.ico}</span>
          <span class="badge-next-name">${esc(n.b.name)}</span>
          <span class="badge-next-num">${n.cur}/${n.target}</span>
        </div>`).join('')}
    </div>` : ''}
  </div>
  ${groups}
  <p class="hint">Her rozet bir alışkanlığın işareti 🌸 Sene boyunca hepsini toplayabilirsin!</p>`;
}

export function bind(root, ctx) {
  root.addEventListener('click', e => {
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
