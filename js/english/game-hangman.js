// Adam asmaca — Türkçe anlamı verilir, İngilizce kelime harf harf tahmin edilir
import { typeLabel } from '../data.js';
import { esc } from '../utils.js';
import { balloons } from './art.js';

export const meta = { key:'hangman', emoji:'🎈', name:'Balon patlatma', desc:'Harf seçerek kelimeyi bul, balonları kurtar', min:1, theme:'sun' };

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LIVES = 6;

let popped = -1;            // az önce patlayan balon (efekt için)

let guessed = new Set();   // seçilen harfler
let misses = 0;
let finished = false;      // tur bitti mi (bildi ya da asıldı)
let won = false;

/** Kelimenin tahmin edilecek harfleri (boşluk ve tire hediye) */
const letters = word => word.en.toLocaleUpperCase('en').split('');
const isGuessable = ch => /[A-Z]/.test(ch);

function reset() { guessed = new Set(); misses = 0; finished = false; won = false; popped = -1; }

export function start() { reset(); }

const solved = word => letters(word).every(ch => !isGuessable(ch) || guessed.has(ch));

export function render(session) {
  const w = session.current;
  if (!w) return '';

  const shown = letters(w)
    .map(ch => {
      if (!isGuessable(ch)) return ch === ' ' ? '<i class="hm-space"></i>' : `<i class="hm-fixed">${esc(ch)}</i>`;
      return `<i class="hm-slot ${guessed.has(ch) ? 'on' : ''}">${guessed.has(ch) ? esc(ch) : ''}</i>`;
    }).join('');

  const lives = LIVES - misses;
  const mood = finished ? (won ? 'happy' : 'sad') : lives <= 2 ? 'think' : 'idle';
  return `
  <div class="gq">
    ${balloons(lives, LIVES, { justPopped: popped, mood })}
    <div class="hm-clue-box">
      <span class="gq-type">${esc(typeLabel(w.type))}</span>
      <b class="hm-clue">${esc(w.tr)}</b>
    </div>
    <div class="hm-word">${shown}</div>
    ${finished ? '' : `
      <div class="hm-keys">
        ${LETTERS.map(l => `
          <button type="button" class="hm-key ${guessed.has(l) ? (letters(w).includes(l) ? 'hit' : 'miss') : ''}"
                  data-letter="${l}" ${guessed.has(l) ? 'disabled' : ''}>${l}</button>`).join('')}
      </div>`}
  </div>
  ${finished ? `
    <div class="gsheet ${won ? 'ok' : 'no'}">
      <div class="gsheet-msg">${won
        ? `<b>Buldun! 🎈</b><span>${lives} balon kurtardın · +1 ✓</span>`
        : `<b>Balonlar bitti 😿</b><span>Kelime: <em>${esc(w.en)}</em></span>`}</div>
      <button type="button" class="gsheet-go" data-next>Devam →</button>
    </div>` : ''}`;
}

export function handle(e, session) {
  if (e.target.closest('[data-next]')) {
    session.advance();
    reset();
    return true;
  }

  const k = e.target.closest('[data-letter]');
  if (!k || finished) return false;

  const w = session.current;
  const l = k.dataset.letter;
  if (guessed.has(l)) return false;
  guessed.add(l);

  popped = -1;
  if (!letters(w).includes(l)) { misses++; popped = LIVES - misses; }

  if (solved(w)) { finished = true; won = true; session.answer(w.id, true); }
  else if (misses >= LIVES) { finished = true; won = false; session.answer(w.id, false); }
  return true;
}
