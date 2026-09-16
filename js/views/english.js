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
  <div class="card">
    <div class="card-title">⚙️ Oyun ayarı</div>

    <label class="lbl">Hangi türler? <span class="hint-inline">(seçmezsen hepsi)</span></label>
    <div class="subj-picker">
      ${selectable.map(t => `
        <button type="button" class="spick ${opts.types.includes(t.key) ? 'on' : ''}" data-otype="${t.key}"
                style="--c:${t.color};--i:var(--ink)">${t.emoji} ${esc(typeLabel(t.key))}</button>`).join('')
      || '<p class="hint" style="margin:0">Önce kelime ekle 🌸</p>'}
    </div>

    <label class="lbl" style="margin-top:13px">Kaç kelime?</label>
    <div class="pill-row">
      ${[5, 10, 20, 40].map(n => `
        <button type="button" class="pill ${opts.count === n ? 'on' : ''}" data-ocount="${n}">${n}</button>`).join('')}
    </div>

    <label class="lbl" style="margin-top:13px">Soru yönü</label>
    <div class="pill-row">
      ${[['mix', '🔀 Karışık'], ['en', '🇬🇧 → 🇹🇷'], ['tr', '🇹🇷 → 🇬🇧']].map(([k, l]) => `
        <button type="button" class="pill ${opts.direction === k ? 'on' : ''}" data-odir="${k}">${l}</button>`).join('')}
    </div>
  </div>`;
}

function gameList() {
  const available = pool(opts.types).length;
  return `
  ${gameSetup()}
  <div class="grid-cards">
    ${GAMES.map(g => {
      const locked = available < g.meta.min;
      return `
      <button type="button" class="card game-pick ${locked ? 'locked' : ''}" data-play="${g.meta.key}" ${locked ? 'disabled' : ''}>
        <span class="game-pick-ico">${g.meta.emoji}</span>
        <span class="game-pick-main">
          <span class="game-pick-name">${esc(g.meta.name)}</span>
          <span class="game-pick-desc">${locked
            ? `En az ${g.meta.min} kelime gerekiyor (şu an ${available})`
            : esc(g.meta.desc)}</span>
        </span>
        <span class="game-pick-go">${locked ? '🔒' : '▶'}</span>
      </button>`;
    }).join('')}
  </div>`;
}

function gameResult() {
  const total = session.correct + session.wrong;
  const pct = total ? Math.round((session.correct / total) * 100) : 0;
  return `
  <div class="card game-card">
    <div class="game-done-ico">${pct >= 80 ? '🏆' : pct >= 50 ? '🌟' : '💪'}</div>
    <div class="game-done-title">Oyun bitti!</div>
    <div class="mini-stats" style="justify-content:center">
      <div class="mini-stat"><b>${session.correct}</b>doğru</div>
      <div class="mini-stat"><b>${session.wrong}</b>yanlış</div>
      <div class="mini-stat"><b>%${pct}</b>başarı</div>
    </div>
    <div class="btn-row" style="margin-top:14px">
      <button type="button" class="btn-primary" data-replay>🔁 Tekrar oyna</button>
      <button type="button" class="btn-ghost" data-quit>Oyunlara dön</button>
    </div>
  </div>`;
}

function gameScreen() {
  const done = session.done;
  const bar = done ? 100 : (session.index / session.total) * 100;
  return `
  <div class="game-bar">
    <button type="button" class="btn-ghost game-quit" data-quit>✕</button>
    <div class="pbar game-progress"><div class="pfill" style="width:${bar}%"></div></div>
    <span class="game-score">✅ ${session.correct} · ❌ ${session.wrong}</span>
  </div>
  ${done ? gameResult() : game.render(session)}`;
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
  ${session ? '' : `
  <div class="subtabs">
    ${TABS.map(t => `
      <button type="button" class="subtab ${tab === t.key ? 'on' : ''}" data-sub="${t.key}">
        ${t.emoji} ${esc(t.label)}
      </button>`).join('')}
  </div>`}
  ${body}`;
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
        if (!wasDone && session.done && session.correct > session.wrong) confetti();
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
      opts.types = opts.types.includes(k) ? opts.types.filter(x => x !== k) : [...opts.types, k];
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

/** Öğrenilmiş kelime eşiği — başka ekranlar da kullanabilsin */
export { LEARNED_AT };
