// "Çizelge" ekranı — referans tablonun canlı hâli
import { SUBJECTS, METRICS } from '../data.js';
import * as store from '../store.js';
import { dayTotals } from '../gamify.js';
import {
  weekStart, addDays, keyOf, todayKey, DAY_NAMES, DAY_EMOJI, DAY_SHORT,
  fmtShort, clampInt, esc,
} from '../utils.js';

let anchor = weekStart(new Date()); // görüntülenen hafta
let offResize = null;               // önceki render'ın resize dinleyicisi

const ROWS = [
  { key:'q',  label:'✏️ Toplam Soru', auto:true },   // doğru + yanlış + boş + çözdürdüğüm
  ...METRICS.map(m => ({ key:m.key, label:`${m.emoji} ${m.label}`, auto:false })),
];

function cellValue(key, subject, row) {
  const r = store.recOf(key, subject);
  return row.auto ? r.d + r.y + r.b + r.ct : r[row.key];
}

/* ---------- hedef / ilerleme şeridi ---------- */

/** O gün çözülen toplam soru (çözdürdükleri dâhil) */
const dayQ = key => dayTotals(store.get().days[key]).q;

/** Bir hücrenin içi — hem ilk çizimde hem canlı tazelemede kullanılır */
function goalInner(done, goal) {
  const pct = goal > 0 ? Math.min(100, Math.round((done / goal) * 100)) : 0;
  const hit = goal > 0 && done >= goal;
  return `<span class="goal-n">${done}<i>/${goal || '–'}</i>${hit ? ' ✓' : ''}</span>`
       + `<span class="goal-bar"><i style="width:${pct}%"></i></span>`;
}

const isHit = (done, goal) => goal > 0 && done >= goal;

function goalCell(id, done, goal, extraCls = '') {
  const cls = ['goal-h', extraCls, isHit(done, goal) ? 'hit' : ''].filter(Boolean).join(' ');
  return `<th class="${cls}" data-goal="${id}">${goalInner(done, goal)}</th>`;
}

export function render() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
  const tk = todayKey();
  const end = days[6];
  const label = `${fmtShort(anchor)} – ${fmtShort(end)} ${end.getFullYear()}`;

  let head = '<tr><th rowspan="2">📚 DERS</th><th rowspan="2">💗 DURUM</th>';
  days.forEach((d, i) => {
    head += `<th class="${keyOf(d) === tk ? 'today-col' : ''}">`
          + `<span class="d-full">${DAY_NAMES[i]} ${DAY_EMOJI[i]}</span>`
          + `<span class="d-short">${DAY_SHORT[i].toUpperCase()}<br>${DAY_EMOJI[i]}</span></th>`;
  });
  head += '<th>TOPLAM 🏆</th></tr>';

  // Gün başlıklarının altındaki hedef/ilerleme şeridi
  let goalRow = '<tr class="goal-row">';
  let wDone = 0, wGoal = 0;
  for (const d of days) {
    const k = keyOf(d);
    const done = dayQ(k);
    const goal = store.goalFor(k);     // o gün yürürlükte olan hedef
    wDone += done; wGoal += goal;
    goalRow += goalCell(k, done, goal, k === tk ? 'today-col' : '');
  }
  goalRow += goalCell('week', wDone, wGoal, 'week-goal') + '</tr>';
  head += goalRow;

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
  <p class="hint">Hücrelere dokunup yazabilirsin · "Toplam Soru" otomatik hesaplanır (doğru + yanlış + boş + çözdürdüğüm)<br>
  🎯 Gün başlıklarının altındaki şerit o günün hedefini ve ilerlemeni gösterir</p>`;
}

export function bind(root, ctx) {
  const days = Array.from({ length: 7 }, (_, i) => keyOf(addDays(anchor, i)));

  const paintGoal = (id, done, goal) => {
    const th = root.querySelector(`[data-goal="${id}"]`);
    if (!th) return;
    th.innerHTML = goalInner(done, goal);
    th.classList.toggle('hit', isHit(done, goal));
  };

  const refreshGoals = () => {
    let wDone = 0, wGoal = 0;
    for (const k of days) {
      const done = dayQ(k);
      const goal = store.goalFor(k);
      wDone += done; wGoal += goal;
      paintGoal(k, done, goal);
    }
    paintGoal('week', wDone, wGoal);
  };

  // İkinci başlık satırı ilkinin altına yapışsın diye gerçek yüksekliği ölçüyoruz
  const alignSticky = () => {
    const firstTh = root.querySelector('table.grid thead tr:first-child th');
    const wrap = root.querySelector('.table-wrap');
    if (firstTh && wrap) wrap.style.setProperty('--wk-head-h', `${firstTh.offsetHeight}px`);
  };
  alignSticky();
  requestAnimationFrame(alignSticky);   // yazı tipleri yüklendikten sonra tekrar ölç
  // Kapsayıcı her render'da yenilenir ama window dinleyicisi kalır: öncekini bırak
  if (offResize) window.removeEventListener('resize', offResize);
  offResize = alignSticky;
  window.addEventListener('resize', alignSticky);

  const recalc = (subject, metricKey) => {
    // ilgili satırın toplamı
    const tdTotal = root.querySelector(`[data-total="${subject}|${metricKey}"]`);
    if (tdTotal) {
      const sum = days.reduce((a, k) => a + store.recOf(k, subject)[metricKey], 0);
      tdTotal.textContent = sum || '';
    }
    // çözülen satırı (otomatik) ve toplamı
    if (['d', 'y', 'b', 'ct'].includes(metricKey)) {
      let qSum = 0;
      for (const k of days) {
        const r = store.recOf(k, subject);
        const q = r.d + r.y + r.b + r.ct;
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
    refreshGoals();
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
