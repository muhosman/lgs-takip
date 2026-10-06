// Çoktan seçmeli oyun — kelimeyi gör, doğru karşılığını 4 şıktan seç
import { typeLabel } from '../data.js';
import { esc } from '../utils.js';
import { pool, pick, shuffle } from './session.js';
import { mascot } from './art.js';

export const meta = { key:'choice', emoji:'🎯', name:'Çoktan seçmeli', desc:'4 şıktan doğrusunu seç', min:4, theme:'violet' };

let options = [];    // o anki şıklar
let picked = null;   // seçilen şıkkın kelime id'si
let wasRight = false;

/** Çeldiriciler önce aynı türden seçilir; yetmezse havuzun kalanından tamamlanır */
function buildOptions(session) {
  const word = session.current;
  const all = pool().filter(w => w.id !== word.id);
  const sameType = all.filter(w => w.type === word.type);
  const others = all.filter(w => w.type !== word.type);
  const distractors = [...pick(sameType, 3), ...pick(others, 3)].slice(0, 3);
  options = shuffle([word, ...distractors]);
  picked = null;
}

export function start(session) { if (!session.done) buildOptions(session); }

export function render(session) {
  const w = session.current;
  if (!w) return '';
  const askEn = session.asksEnglish(w);
  const prompt = askEn ? w.en : w.tr;
  const answerOf = o => (askEn ? o.tr : o.en);

  const LETTERS = ['A', 'B', 'C', 'D'];
  return `
  <div class="gq">
    <div class="gq-ask">
      <div class="gq-mascot">${mascot(picked ? (wasRight ? 'happy' : 'sad') : 'think', 84)}</div>
      <div class="gq-bubble">
        <span class="gq-type">${esc(typeLabel(w.type))}</span>
        <b class="gq-word">${esc(prompt)}</b>
        <span class="gq-hint">${askEn ? 'Türkçesi hangisi?' : 'İngilizcesi hangisi?'}</span>
      </div>
    </div>
    <div class="gq-opts">
      ${options.map((o, i) => {
        const isAnswer = o.id === w.id;
        let cls = '';
        if (picked) cls = isAnswer ? 'right' : (o.id === picked ? 'wrong' : 'dim');
        return `<button type="button" class="gq-opt c${i} ${cls}" data-choice="${o.id}" ${picked ? 'disabled' : ''}>
          <span class="gq-l">${LETTERS[i]}</span><span class="gq-t">${esc(answerOf(o))}</span>
        </button>`;
      }).join('')}
    </div>
  </div>
  ${picked ? `
    <div class="gsheet ${wasRight ? 'ok' : 'no'}">
      <div class="gsheet-msg">${wasRight
        ? '<b>Harika! 🎉</b><span>+1 ✓ kazandın</span>'
        : `<b>Olmadı 😿</b><span>Doğrusu: <em>${esc(answerOf(w))}</em></span>`}</div>
      <button type="button" class="gsheet-go" data-next>Devam →</button>
    </div>` : ''}`;
}

/** true dönerse görünüm yeniden çizilmeli */
export function handle(e, session) {
  const c = e.target.closest('[data-choice]');
  if (c && !picked) {
    picked = c.dataset.choice;
    wasRight = picked === session.current.id;
    session.answer(session.current.id, wasRight);
    return true;
  }
  if (e.target.closest('[data-next]')) {
    session.advance();
    if (!session.done) buildOptions(session);
    return true;
  }
  return false;
}
