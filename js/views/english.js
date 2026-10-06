// "İngilizce" ekranı — Kelimelerim · Oyunlar · İlerleme alt sekmeleri
import { WORD_TYPES, typeLabel, LEARNED_AT } from '../data.js';
import * as store from '../store.js';
import { esc } from '../utils.js';
import { confetti } from '../confetti.js';
import * as words from '../english/words.js';
import { createSession, pool, isLearned } from '../english/session.js';
import * as choice from '../english/game-choice.js';
import * as match from '../english/game-match.js';
import * as hangman from '../english/game-hangman.js';
import { mascot } from '../english/art.js';

const GAMES = [choice, match, hangman];
const GAME_MAP = Object.fromEntries(GAMES.map(g => [g.meta.key, g]));

let tab = 'words';               // words | games | progress
let game = null;                 // oynanan oyun modülü
let session = null;              // açık oturum
let opts = { types: [], count: 10, direction: 'mix' };

/* ---------------- oyunlar ---------------- */

function gameSetup() {
  const all = store.get().words || [];
  const selectable = WORD_TYPES.filter(t => all.some(w => w.type === t.key));
  return `
  <div class="gl-set">
    <div class="gl-row">
      <span class="gl-lbl">Türler</span>
      <div class="gl-chips">
        <button type="button" class="gl-chip ${!opts.types.length ? 'on' : ''}" data-otype="__all">Hepsi</button>
        ${selectable.map(t => `
          <button type="button" class="gl-chip ${opts.types.includes(t.key) ? 'on' : ''}" data-otype="${t.key}" style="--c:${t.color}">${t.emoji} ${esc(t.en)}</button>`).join('')}
      </div>
    </div>
    <div class="gl-row">
      <span class="gl-lbl">Kelime</span>
      <div class="gl-chips">${[5, 10, 20, 40].map(n => `
        <button type="button" class="gl-chip ${opts.count === n ? 'on' : ''}" data-ocount="${n}">${n}</button>`).join('')}</div>
      <span class="gl-lbl">Yön</span>
      <div class="gl-chips">${[['mix', '🔀 Karışık'], ['en', '🇬🇧→🇹🇷'], ['tr', '🇹🇷→🇬🇧']].map(([k, l]) => `
        <button type="button" class="gl-chip ${opts.direction === k ? 'on' : ''}" data-odir="${k}">${l}</button>`).join('')}</div>
    </div>
  </div>`;
}

const GAME_ART = {
  choice: '<span class="ga-a">A</span><span class="ga-b">B</span><span class="ga-c">C</span><span class="ga-d">D</span>',
  match: '<span class="ga-m1">cat</span><span class="ga-link"></span><span class="ga-m2">kedi</span>',
  hangman: '<span class="ga-bl b1"></span><span class="ga-bl b2"></span><span class="ga-bl b3"></span><span class="ga-word">B _ _ L O _ N</span>',
};

function gameList() {
  const all = store.get().words || [];
  const learned = all.filter(isLearned).length;
  const available = pool(opts.types).length;
  return `
  <div class="gl-hero">
    <div class="gl-mascot">${mascot('happy', 96)}</div>
    <div class="gl-hero-txt">
      <small>Kelime oyunları</small>
      <b>Hadi oynayalım! 🎮</b>
      <span><b>${all.length}</b> kelime · <b>${learned}</b> öğrenildi · seçili havuzda <b>${available}</b></span>
    </div>
    <div class="gl-bubbles" aria-hidden="true"><i>ABC</i><i>★</i><i>Hi!</i></div>
  </div>
  ${gameSetup()}
  <div class="gl-games">
    ${GAMES.map(g => {
      const locked = available < g.meta.min;
      return `
      <button type="button" class="gl-game t-${g.meta.theme} ${locked ? 'locked' : ''}" data-play="${g.meta.key}" ${locked ? 'disabled' : ''}>
        <span class="gl-art">${GAME_ART[g.meta.key] || g.meta.emoji}</span>
        <span class="gl-name">${g.meta.emoji} ${esc(g.meta.name)}</span>
        <span class="gl-desc">${locked ? `🔒 En az ${g.meta.min} kelime gerekiyor (şu an ${available})` : esc(g.meta.desc)}</span>
        <span class="gl-play">${locked ? 'Kilitli' : 'OYNA ▶'}</span>
      </button>`;
    }).join('')}
  </div>`;
}

function gameResult() {
  const total = session.correct + session.wrong;
  const pct = total ? Math.round((session.correct / total) * 100) : 0;
  const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : pct > 0 ? 1 : 0;
  return `
  <div class="gr">
    <div class="gr-stars">${[1, 2, 3].map(n => `<span class="${n <= stars ? 'on' : ''}" style="--n:${n}">★</span>`).join('')}</div>
    <div class="gr-mascot">${mascot(pct >= 50 ? 'happy' : 'sad', 120)}</div>
    <div class="gr-title">${pct >= 90 ? 'Muhteşem! 🏆' : pct >= 60 ? 'Çok iyi! 🌟' : pct > 0 ? 'Devam et! 💪' : 'Bir daha deneyelim 💪'}</div>
    <div class="gr-stats">
      <div class="ok"><b>${session.correct}</b>doğru</div>
      <div class="no"><b>${session.wrong}</b>yanlış</div>
      <div><b>%${pct}</b>başarı</div>
    </div>
    <div class="gr-btns">
      <button type="button" class="gr-again" data-replay>🔁 Tekrar oyna</button>
      <button type="button" class="gr-back" data-quit>Oyunlara dön</button>
    </div>
  </div>`;
}

function gameScreen() {
  const done = session.done;
  const bar = done ? 100 : (session.index / session.total) * 100;
  return `
  <div class="gs t-${game.meta.theme}">
    <div class="gs-bar">
      <button type="button" class="gs-quit" data-quit aria-label="oyundan çık">✕</button>
      <div class="gs-prog"><i style="width:${bar}%"></i><span style="left:${bar}%">⭐</span></div>
      <span class="gs-score"><b class="ok">✓ ${session.correct}</b><b class="no">✕ ${session.wrong}</b></span>
    </div>
    ${done ? gameResult() : game.render(session)}
  </div>`;
}

/* ---------------- ilerleme ---------------- */

function progressScreen() {
  const all = store.get().words || [];
  if (!all.length) {
    return `<div class="card"><div class="empty"><div>📊</div>
      Kelime ekleyip oyun oynadıkça ilerlemen burada görünecek 🌸</div></div>`;
  }

  const learned = all.filter(isLearned);
  const hardest = all.filter(w => (w.wrong || 0) > 0)
    .sort((a, b) => (b.wrong || 0) - (a.wrong || 0))
    .slice(0, 10);

  return `
  <div class="stat-grid">
    <div class="stat-box"><div class="stat-val">${all.length}</div><div class="stat-lbl">kelime</div></div>
    <div class="stat-box"><div class="stat-val">${learned.length}</div><div class="stat-lbl">öğrenildi</div></div>
    <div class="stat-box"><div class="stat-val">${all.reduce((a, w) => a + (w.ticks || 0), 0)}</div><div class="stat-lbl">toplam ✓</div></div>
  </div>

  <div class="sec-title">Türlere göre</div>
  <div class="card">
    ${WORD_TYPES.map(t => {
      const list = all.filter(w => w.type === t.key);
      if (!list.length) return '';
      const done = list.filter(isLearned).length;
      return `
      <div class="tprog">
        <div class="tprog-head">
          <span>${t.emoji} ${esc(typeLabel(t.key))}</span>
          <b>${done}/${list.length}</b>
        </div>
        <div class="pbar"><div class="pfill" style="width:${(done / list.length) * 100}%"></div></div>
      </div>`;
    }).join('') || '<p class="hint" style="margin:0">Henüz kelime yok.</p>'}
  </div>

  ${hardest.length ? `
  <div class="sec-title">En çok zorlandıkların</div>
  <ul class="wlist">
    ${hardest.map(w => `
      <li class="wrow">
        <span class="w-en">${esc(w.en)}</span>
        <span class="w-tr">${esc(w.tr)}</span>
        <span class="w-ticks">❌ ${w.wrong}</span>
      </li>`).join('')}
  </ul>` : ''}`;
}

/* ---------------- kabuk ---------------- */

const TABS = [
  { key:'words',    label:'Kelimelerim', emoji:'📖' },
  { key:'games',    label:'Oyunlar',     emoji:'🎮' },
  { key:'progress', label:'İlerleme',    emoji:'📊' },
];

export function render() {
  const body = session ? gameScreen()
    : tab === 'words' ? words.render()
    : tab === 'games' ? gameList()
    : progressScreen();

  // Oyun oynanırken alt sekmeler gizlenir: ekran oyuna kalsın
  return `
  <div class="xpage">
  ${session ? '' : `
  <div class="bfilters esubs">
    ${TABS.map(t => `
      <button type="button" class="seg ${tab === t.key ? 'on' : ''}" data-sub="${t.key}">${t.emoji} ${esc(t.label)}</button>`).join('')}
  </div>`}
  ${body}
  </div>`;
}

export function bind(root, ctx) {
  const startGame = key => {
    game = GAME_MAP[key];
    session = createSession({ ...opts, min: game.meta.min });
    if (!session.ready) {
      session = null; game = null;
      ctx.toast(`Bu oyun için en az ${GAME_MAP[key].meta.min} kelime gerekiyor`);
      return;
    }
    game.start(session);
    ctx.rerender();
  };

  root.addEventListener('click', e => {
    const t = e.target;

    // --- oyun içindeyken ---
    if (session) {
      if (t.closest('[data-quit]')) { session = null; game = null; ctx.rerender(); return; }
      if (t.closest('[data-replay]')) { startGame(game.meta.key); return; }

      const wasDone = session.done;
      if (game.handle(e, session)) {
        ctx.rerender();
        ctx.refreshHeader();
        if (!wasDone && session.done && session.correct >= session.wrong) confetti();
      }
      return;
    }

    const sub = t.closest('[data-sub]');
    if (sub) { tab = sub.dataset.sub; ctx.rerender(); return; }

    const play = t.closest('[data-play]');
    if (play) { startGame(play.dataset.play); return; }

    const ot = t.closest('[data-otype]');
    if (ot) {
      const k = ot.dataset.otype;
      opts.types = k === '__all' ? [] : opts.types.includes(k) ? opts.types.filter(x => x !== k) : [...opts.types, k];
      ctx.rerender();
      return;
    }

    const oc = t.closest('[data-ocount]');
    if (oc) { opts.count = Number(oc.dataset.ocount); ctx.rerender(); return; }

    const od = t.closest('[data-odir]');
    if (od) { opts.direction = od.dataset.odir; ctx.rerender(); return; }
  });

  // Kelimelerim ekranının kendi dinleyicileri
  if (!session && tab === 'words') words.bind(root, ctx);
}

/** Sekmeden çıkarken kelime formu ve filtreler sıfırlansın */
export const reset = () => words.reset();

/** Öğrenilmiş kelime eşiği — başka ekranlar da kullanabilsin */
export { LEARNED_AT };
