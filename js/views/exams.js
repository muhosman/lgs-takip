// "Denemeler" ekranı — deneme girişi, net/puan tahmini, trend
import { SUBJECTS } from '../data.js';
import * as store from '../store.js';
import { netOf, fmtNet, estimateScore, todayKey, dateOf, fmtShort, clampInt, esc } from '../utils.js';
import { line } from '../charts.js';
import { confetti } from '../confetti.js';

const examNet = ex => SUBJECTS.reduce((a, s) => a + netOf(ex.subjects[s.key]?.d, ex.subjects[s.key]?.y), 0);

function examCard(ex) {
  const score = estimateScore(ex.subjects);
  const total = examNet(ex);
  return `
  <div class="exam-item">
    <div class="exam-top">
      <div style="flex:1;min-width:0">
        <div class="exam-name">${esc(ex.name)}</div>
        <div class="exam-date">${fmtShort(dateOf(ex.date))} ${dateOf(ex.date).getFullYear()} · ${fmtNet(total)} net</div>
      </div>
      <div class="exam-score">${score}<small>tahmini puan</small></div>
      <button type="button" class="del-x" data-del="${ex.id}" aria-label="sil">🗑</button>
    </div>
    <div class="exam-bars">
      ${SUBJECTS.map(s => {
        const r = ex.subjects[s.key] || { d: 0, y: 0 };
        const n = netOf(r.d, r.y);
        const h = Math.round((n / s.q) * 100);
        return `<div class="exam-bar">
          <div class="bar"><div class="fill" style="height:${h}%;background:${s.color}"></div></div>
          <div class="n">${fmtNet(n)}</div>
          <div class="t">${esc(s.name.split(' ')[0].slice(0, 5))}</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

export function render() {
  const state = store.get();
  const exams = state.exams;

  const trend = exams.map(e => ({ label: fmtShort(dateOf(e.date)), value: estimateScore(e.subjects) }));
  const best = exams.length ? Math.max(...trend.map(t => t.value)) : 0;
  const last = exams.length ? trend[trend.length - 1].value : 0;
  const prev = exams.length > 1 ? trend[trend.length - 2].value : null;
  const diff = prev !== null ? last - prev : null;

  return `
  <div class="card">
    <div class="card-title">➕ Yeni deneme ekle</div>
    <div class="exam-form">
      <div class="frow">
        <div>
          <label class="lbl" for="exName">Deneme adı</label>
          <input id="exName" class="inp" type="text" placeholder="Örn: 3. Deneme" maxlength="40">
        </div>
        <div>
          <label class="lbl" for="exDate">Tarih</label>
          <input id="exDate" class="inp" type="date" value="${todayKey()}">
        </div>
      </div>
      <div>
        <div class="dy-head"><span>Ders</span><span>Doğru</span><span>Yanlış</span></div>
        ${SUBJECTS.map(s => `
          <div class="dy-grid">
            <div class="dy-name">${s.emoji} ${esc(s.name)} <span style="color:#957085;font-size:11px">/${s.q}</span></div>
            <input type="number" inputmode="numeric" min="0" max="${s.q}" placeholder="0" data-ex="${s.key}" data-f="d">
            <input type="number" inputmode="numeric" min="0" max="${s.q}" placeholder="0" data-ex="${s.key}" data-f="y">
          </div>`).join('')}
      </div>
      <div id="exPreview" class="mini-stats" style="justify-content:space-around">
        <div class="mini-stat"><b id="exNet">0</b>net</div>
        <div class="mini-stat"><b id="exScore">100</b>tahmini puan</div>
      </div>
      <button type="button" id="exSave" class="btn-primary wide">Denemeyi kaydet 🏆</button>
    </div>
  </div>

  ${exams.length ? `
    <div class="stat-grid">
      <div class="stat-box"><div class="stat-val">${exams.length}</div><div class="stat-lbl">deneme</div></div>
      <div class="stat-box"><div class="stat-val">${best}</div><div class="stat-lbl">en yüksek puan</div></div>
      <div class="stat-box"><div class="stat-val">${diff === null ? '–' : (diff >= 0 ? '+' : '') + diff}</div><div class="stat-lbl">son değişim</div></div>
    </div>
    <div class="card">
      <div class="card-title">📈 Puan gelişimin</div>
      ${line(trend, { min: 100, max: 500, height: 165 })}
    </div>
    <div class="sec-title">Deneme geçmişi</div>
    ${[...exams].reverse().map(examCard).join('')}
  ` : `<div class="card"><div class="empty"><div>🏆</div>
      Henüz deneme girmedin.<br>İlk denemeni ekle, gelişimini grafikte görelim! 📈</div></div>`}
  `;
}

export function bind(root, ctx) {
  const readForm = () => {
    const subjects = {};
    for (const s of SUBJECTS) {
      const d = clampInt(root.querySelector(`[data-ex="${s.key}"][data-f="d"]`)?.value || 0, 0, s.q);
      const y = clampInt(root.querySelector(`[data-ex="${s.key}"][data-f="y"]`)?.value || 0, 0, s.q);
      subjects[s.key] = { d, y };
    }
    return subjects;
  };

  const preview = () => {
    const subjects = readForm();
    const net = SUBJECTS.reduce((a, s) => a + netOf(subjects[s.key].d, subjects[s.key].y), 0);
    const nEl = root.querySelector('#exNet');
    const sEl = root.querySelector('#exScore');
    if (nEl) nEl.textContent = fmtNet(net);
    if (sEl) sEl.textContent = estimateScore(subjects);
  };

  root.addEventListener('input', e => {
    if (e.target.closest('[data-ex]')) preview();
  });

  root.addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (del) {
      if (confirm('Bu denemeyi silmek istediğine emin misin?')) {
        store.removeExam(del.dataset.del);
        ctx.rerender();
        ctx.toast('Deneme silindi');
      }
      return;
    }

    if (e.target.closest('#exSave')) {
      const name = (root.querySelector('#exName').value || '').trim();
      const date = root.querySelector('#exDate').value || todayKey();
      const subjects = readForm();
      const any = SUBJECTS.some(s => subjects[s.key].d || subjects[s.key].y);
      if (!any) { ctx.toast('Önce doğru/yanlış sayılarını gir 🙂'); return; }

      store.addExam({
        id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: name || `Deneme ${store.get().exams.length + 1}`,
        date,
        subjects,
      });
      confetti(1600);
      ctx.toast('Deneme kaydedildi! 🏆');
      ctx.rerender();
      ctx.checkBadges();
    }
  });
}
