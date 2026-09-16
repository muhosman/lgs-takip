// Eşleştirme oyunu — 5 kelime ve 5 anlam karışık durur, ikisi eşleştirilir
import { esc } from '../utils.js';
import { shuffle } from './session.js';

export const meta = { key:'match', emoji:'🧩', name:'Eşleştirme', desc:'Kelimeleri anlamlarıyla eşleştir', min:5 };

const ROUND = 5;             // bir turda kaç çift

let left = [], right = [];   // ekrandaki kartlar
let matched = new Set();     // eşleşmiş kelime id'leri
let selLeft = null, selRight = null;
let missId = null;           // az önce yanlış eşleşen çift (kırmızı yanıp sönsün)

/** Oturumun tamamını 5'erli turlara böler; her tur bir "sayfa" */
function deal(session) {
  const slice = session.queue.slice(session.index, session.index + ROUND);
  left = shuffle(slice);
  right = shuffle(slice);
  matched = new Set();
  selLeft = selRight = missId = null;
}

export function start(session) { deal(session); }

const roundDone = () => left.length > 0 && matched.size === left.length;

export function render(session) {
  if (!left.length) return '';

  const card = (w, side) => {
    const sel = side === 'l' ? selLeft : selRight;
    const done = matched.has(w.id);
    const cls = [
      'match-card',
      done ? 'done' : '',
      sel === w.id ? 'sel' : '',
      missId === w.id ? 'miss' : '',
    ].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}" data-match="${side}|${w.id}" ${done ? 'disabled' : ''}>
      ${esc(side === 'l' ? w.en : w.tr)}
    </button>`;
  };

  return `
  <div class="card game-card">
    <div class="game-ask">Eşleşenlere dokun — ${matched.size}/${left.length}</div>
    <div class="match-grid">
      <div class="match-col">${left.map(w => card(w, 'l')).join('')}</div>
      <div class="match-col">${right.map(w => card(w, 'r')).join('')}</div>
    </div>
    ${roundDone() ? `<button type="button" class="btn-primary wide" data-next style="margin-top:12px">Devam →</button>` : ''}
  </div>`;
}

export function handle(e, session) {
  if (e.target.closest('[data-next]')) {
    session.index = Math.min(session.index + left.length, session.queue.length);
    if (!session.done) deal(session);
    return true;
  }

  const btn = e.target.closest('[data-match]');
  if (!btn) return false;

  const [side, id] = btn.dataset.match.split('|');
  missId = null;
  if (side === 'l') selLeft = id; else selRight = id;

  if (selLeft && selRight) {
    const ok = selLeft === selRight;
    // Eşleştirmede doğru/yanlış aynı kelimeye işlenir: doğru +1, yanlış −1
    session.answer(selLeft, ok);
    if (ok) matched.add(selLeft);
    else missId = selRight;
    selLeft = selRight = null;
  }
  return true;
}
