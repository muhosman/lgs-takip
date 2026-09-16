// Adam asmaca — Türkçe anlamı verilir, İngilizce kelime harf harf tahmin edilir
import { typeLabel } from '../data.js';
import { esc } from '../utils.js';

export const meta = { key:'hangman', emoji:'🎪', name:'Adam asmaca', desc:'Harf seçerek kelimeyi bul', min:1 };

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LIVES = 6;

// Asılma aşamaları — her yanlış harfte bir sonraki çizilir
const STAGES = ['😀', '🙂', '😐', '😟', '😰', '😵', '💀'];

let guessed = new Set();   // seçilen harfler
let misses = 0;
let finished = false;      // tur bitti mi (bildi ya da asıldı)
let won = false;

/** Kelimenin tahmin edilecek harfleri (boşluk ve tire hediye) */
const letters = word => word.en.toLocaleUpperCase('en').split('');
const isGuessable = ch => /[A-Z]/.test(ch);

function reset() { guessed = new Set(); misses = 0; finished = false; won = false; }

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

  return `
  <div class="card game-card">
    <div class="game-type">${esc(typeLabel(w.type))}</div>
    <div class="hm-top">
      <span class="hm-face">${STAGES[Math.min(misses, STAGES.length - 1)]}</span>
      <span class="hm-lives">${'❤️'.repeat(Math.max(0, LIVES - misses))}${'🤍'.repeat(Math.min(misses, LIVES))}</span>
    </div>
    <div class="game-prompt hm-clue">${esc(w.tr)}</div>
    <div class="hm-word">${shown}</div>

    ${finished ? `
      <div class="game-feedback ${won ? 'ok' : 'no'}">
        ${won
          ? 'Buldun! <b>+1 ✓</b>'
          : `Kelime: <b>${esc(w.en)}</b> · <b>−1 ✓</b>`}
      </div>
      <button type="button" class="btn-primary wide" data-next>Devam →</button>`
    : `
      <div class="hm-keys">
        ${LETTERS.map(l => `
          <button type="button" class="hm-key ${guessed.has(l) ? (letters(w).includes(l) ? 'hit' : 'miss') : ''}"
                  data-letter="${l}" ${guessed.has(l) ? 'disabled' : ''}>${l}</button>`).join('')}
      </div>`}
  </div>`;
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

  if (!letters(w).includes(l)) misses++;

  if (solved(w)) { finished = true; won = true; session.answer(w.id, true); }
  else if (misses >= LIVES) { finished = true; won = false; session.answer(w.id, false); }
  return true;
}
