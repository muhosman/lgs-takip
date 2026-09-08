// "Çizelge" ekranı — referans tablonun canlı hâli
import { SUBJECTS, METRICS } from '../data.js';
import * as store from '../store.js';
import {
  weekStart, addDays, keyOf, todayKey, DAY_NAMES, DAY_EMOJI,
  fmtShort, clampInt, esc,
} from '../utils.js';

let anchor = weekStart(new Date()); // görüntülenen hafta

const ROWS = [
  { key:'q',  label:'✏️ Çözülen Soru', auto:true },
  ...METRICS.map(m => ({ key:m.key, label:`${m.emoji} ${m.label}`, auto:false })),
];

function cellValue(key, subject, row) {
  const r = store.recOf(key, subject);
  return row.auto ? r.d + r.y + r.b : r[row.key];
}

export function render() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
  const tk = todayKey();
  const end = days[6];
  const label = `${fmtShort(anchor)} – ${fmtShort(end)} ${end.getFullYear()}`;

  let head = '<tr><th>📚 DERS</th><th>💗 DURUM</th>';
  days.forEach((d, i) => {
    head += `<th class="${keyOf(d) === tk ? 'today-col' : ''}">${DAY_NAMES[i]} ${DAY_EMOJI[i]}</th>`;
  });
  head += '<th>TOPLAM 🏆</th></tr>';

  let body = '';
  for (const s of SUBJECTS) {
    ROWS.forEach((row, ri) => {
      body += '<tr' + (ri === 0 ? ' class="subj-start"' : '') + '>';
      if (ri === 0) {
        body += `<td class="subj-cell" rowspan="${ROWS.length}" style="background:${s.color}">${s.emoji}<br>${esc(s.name)}</td>`;
      }
      body += `<td class="metric">${row.label}</td>`;
      let total = 0;
      for (const d of days) {
        const k = keyOf(d);
        const v = cellValue(k, s.key, row);
        total += v;
        if (row.auto) {
          body += `<td class="auto" data-auto="${s.key}|${k}">${v || ''}</td>`;
        } else {
          body += `<td><input type="number" inputmode="numeric" min="0" max="9999"
                    value="${v || ''}" placeholder="·"
                    data-s="${s.key}" data-m="${row.key}" data-k="${k}"
                    aria-label="${esc(s.name)} ${esc(row.label)}"></td>`;
        }
      }
      body += `<td class="total" data-total="${s.key}|${row.key}">${total || ''}</td></tr>`;
    });
  }

  return `
  <div class="week-nav">
    <button type="button" data-w="-1" aria-label="önceki hafta">◀</button>
    <div class="week-label">${label}</div>
    <button type="button" data-w="1" aria-label="sonraki hafta">▶</button>
  </div>
  <div class="table-wrap">
    <table class="grid"><thead>${head}</thead><tbody>${body}</tbody></table>
  </div>
  <div class="btn-row" style="margin-top:11px">
    <button type="button" class="btn-ghost" data-w="today">📍 Bu haftaya dön</button>
  </div>
  <p class="hint">Hücrelere dokunup yazabilirsin · "Çözülen Soru" otomatik hesaplanır (doğru + yanlış + boş)</p>`;
}

export function bind(root, ctx) {
  const days = Array.from({ length: 7 }, (_, i) => keyOf(addDays(anchor, i)));

  const recalc = (subject, metricKey) => {
    // ilgili satırın toplamı
    const tdTotal = root.querySelector(`[data-total="${subject}|${metricKey}"]`);
    if (tdTotal) {
      const sum = days.reduce((a, k) => a + store.recOf(k, subject)[metricKey], 0);
      tdTotal.textContent = sum || '';
    }
    // çözülen satırı (otomatik) ve toplamı
    if (['d', 'y', 'b'].includes(metricKey)) {
      let qSum = 0;
      for (const k of days) {
        const r = store.recOf(k, subject);
        const q = r.d + r.y + r.b;
        qSum += q;
        const cell = root.querySelector(`[data-auto="${subject}|${k}"]`);
        if (cell) cell.textContent = q || '';
      }
      const qTotal = root.querySelector(`[data-total="${subject}|q"]`);
      if (qTotal) qTotal.textContent = qSum || '';
    }
  };

  root.addEventListener('click', e => {
    const b = e.target.closest('button[data-w]');
    if (!b) return;
    if (b.dataset.w === 'today') anchor = weekStart(new Date());
    else anchor = addDays(anchor, Number(b.dataset.w) * 7);
    ctx.rerender();
  });

  const write = input => {
    const { s, m, k } = input.dataset;
    store.setValue(k, s, m, input.value);
    recalc(s, m);
  };

  root.addEventListener('input', e => {
    const i = e.target.closest('input[data-k]');
    if (i) write(i);
  });

  root.addEventListener('change', e => {
    const i = e.target.closest('input[data-k]');
    if (!i) return;
    const v = clampInt(i.value);
    i.value = v || '';
    write(i);
    ctx.refreshHeader();
    ctx.checkBadges();
  });

  root.addEventListener('focusin', e => {
    if (e.target.matches('input[data-k]')) e.target.select();
  });
}
