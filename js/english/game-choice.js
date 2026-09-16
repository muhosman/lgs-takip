// Çoktan seçmeli oyun — kelimeyi gör, doğru karşılığını 4 şıktan seç
import { typeLabel } from '../data.js';
import { esc } from '../utils.js';
import { pool, pick, shuffle } from './session.js';

export const meta = { key:'choice', emoji:'🎯', name:'Çoktan seçmeli', desc:'4 şıktan doğrusunu seç', min:4 };

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

  return `
  <div class="card game-card">
    <div class="game-type">${esc(typeLabel(w.type))}</div>
    <div class="game-prompt">${esc(prompt)}</div>
    <div class="game-ask">${askEn ? 'Türkçesi hangisi?' : "İngilizcesi hangisi?"}</div>
    <div class="choices">
      ${options.map(o => {
        const isAnswer = o.id === w.id;
        let cls = '';
        if (picked) cls = isAnswer ? 'right' : (o.id === picked ? 'wrong' : 'dim');
        return `<button type="button" class="choice ${cls}" data-choice="${o.id}" ${picked ? 'disabled' : ''}>
          ${esc(answerOf(o))}
        </button>`;
      }).join('')}
    </div>
    ${picked ? `
      <div class="game-feedback ${wasRight ? 'ok' : 'no'}">
        ${wasRight ? '✅ Doğru! <b>+1 ✓</b>' : `❌ Doğrusu: <b>${esc(answerOf(w))}</b> · <b>−1 ✓</b>`}
      </div>
      <button type="button" class="btn-primary wide" data-next>Devam →</button>` : ''}
  </div>`;
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
