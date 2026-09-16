// "Rozetler" ekranı — kazanılan ve kilitli rozetler, kategori kategori
import { BADGES, BADGE_GROUPS } from '../data.js';
import * as store from '../store.js';
import { summarize, earnedBadges } from '../gamify.js';
import { esc } from '../utils.js';

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
  const st = summarize(store.get());
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

export function bind() {}
