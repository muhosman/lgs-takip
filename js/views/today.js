// "Bugün" ekranı — günlük hedef + ders kartları
import { SUBJECTS, METRICS, MOTIVATION } from '../data.js';
import * as store from '../store.js';
import { dayTotals } from '../gamify.js';
import { todayKey, fmtNet, netOf, esc, clampInt } from '../utils.js';
import { ring } from '../charts.js';
import { confetti } from '../confetti.js';
import { streakWarning } from './badges.js';

const dayKey = todayKey; // her render'da yeniden okunur (gece yarısını geçse de doğru)

function goalCard(state) {
  const key = dayKey();
  const t = dayTotals(state.days[key]);
  const goal = store.goalFor(key) || 0;
  const pct = goal ? Math.min(100, (t.q / goal) * 100) : 0;
  const done = goal > 0 && t.q >= goal;

  const msg = done
    ? 'Günlük hedefini tamamladın! Harikasın 🎉'
    : goal > 0
      ? `Hedefe <b>${Math.max(0, goal - t.q)}</b> soru kaldı. ${MOTIVATION[new Date().getDate() % MOTIVATION.length]}`
      : MOTIVATION[new Date().getDate() % MOTIVATION.length];

  return `
  <div class="card goal-card">
    <div class="ring">
      ${ring(pct)}
      <div class="ring-txt">
        <div class="ring-num">${t.q}</div>
        <div class="ring-lbl">soru</div>
      </div>
    </div>
    <div class="goal-info">
      <div class="goal-head">${done ? '🎉 Hedef tamam!' : `Hedef: ${goal} soru`}</div>
      <div class="goal-msg">${msg}</div>
      <div class="mini-stats">
        <div class="mini-stat"><b>${fmtNet(t.net)}</b>bugünkü net</div>
        <div class="mini-stat"><b>${t.own ? Math.round((t.d / t.own) * 100) : 0}%</b>doğruluk</div>
        <div class="mini-stat"><b>${t.ct}</b>çözdürdüğüm</div>
        <div class="mini-stat"><b>${t.xp}</b>bugünkü puan</div>
      </div>
    </div>
  </div>`;
}

function stepper(subject, metric, value) {
  return `
  <div class="step">
    <div class="step-lbl">${metric.emoji} ${esc(metric.short)}</div>
    <div class="step-row">
      <button type="button" data-act="dec" data-s="${subject}" data-m="${metric.key}" aria-label="azalt">−</button>
      <input type="number" inputmode="numeric" min="0" max="9999" value="${value}"
             data-s="${subject}" data-m="${metric.key}" aria-label="${esc(metric.label)}">
      <button type="button" data-act="inc" data-s="${subject}" data-m="${metric.key}" aria-label="artır">+</button>
    </div>
  </div>`;
}

function subjectCard(state, s) {
  const r = store.recOf(dayKey(), s.key);
  const q = r.d + r.y + r.b + r.ct;          // çözdürdüğü de bir sorudur
  const main = METRICS.slice(0, 3);
  const extra = METRICS.slice(3);
  return `
  <div class="subj" style="background:${s.color}22;border-color:${s.color}66">
    <div class="subj-head">
      <span class="subj-emoji">${s.emoji}</span>
      <span class="subj-name" style="color:${s.ink}">${s.name}</span>
      <span class="subj-net" style="color:${s.ink}"><b>${q}</b> soru · <b>${fmtNet(netOf(r.d, r.y))}</b> net</span>
    </div>
    <div class="steps">${main.map(m => stepper(s.key, m, r[m.key])).join('')}</div>
    <div class="steps extra">${extra.map(m => stepper(s.key, m, r[m.key])).join('')}</div>
  </div>`;
}

export function render() {
  const state = store.get();
  return `
    <div id="warnSlot">${streakWarning(state)}</div>
    ${goalCard(state)}
    <div class="sec-title">Bugünün dersleri</div>
    <div class="subj-list">${SUBJECTS.map(s => subjectCard(state, s)).join('')}</div>
    <p class="hint">Sayıya dokunup klavyeyle de yazabilirsin ✍️<br>
    🧑‍🏫 Çözdürdüğün sorular da soru sayına eklenir ve <b>iki kat puan</b> kazandırır.</p>
  `;
}

export function bind(root, ctx) {
  const key = dayKey();

  const afterChange = () => {
    const t = dayTotals(store.get().days[key]);
    const goal = store.goalFor(key) || 0;
    const flag = 'goal-' + key;
    if (goal > 0 && t.q >= goal && sessionStorage.getItem(flag) !== '1') {
      sessionStorage.setItem(flag, '1');
      confetti();
      ctx.toast('🎉 Günlük hedefini tamamladın!');
    }
    ctx.refreshHeader();
    ctx.checkBadges();
  };

  // Kartın tamamını yeniden çizmeden sadece başlık ve hedef alanını tazele
  const softUpdate = () => {
    const t = dayTotals(store.get().days[key]);
    const goal = store.goalFor(key) || 0;
    const pct = goal ? Math.min(100, (t.q / goal) * 100) : 0;
    const ws = root.querySelector('#warnSlot');
    if (ws) ws.innerHTML = streakWarning(store.get());   // soru girilince uyarı kalkar
    const gc = root.querySelector('.goal-card');
    if (gc) {
      gc.outerHTML = goalCard(store.get());
    }
    for (const s of SUBJECTS) {
      const r = store.recOf(key, s.key);
      const card = root.querySelector(`.subj [data-s="${s.key}"]`)?.closest('.subj');
      const netEl = card?.querySelector('.subj-net');
      if (netEl) netEl.innerHTML = `<b>${r.d + r.y + r.b + r.ct}</b> soru · <b>${fmtNet(netOf(r.d, r.y))}</b> net`;
    }
    void pct;
  };

  root.addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const { act, s, m } = btn.dataset;
    const input = root.querySelector(`input[data-s="${s}"][data-m="${m}"]`);
    const cur = clampInt(input.value);
    const next = act === 'inc' ? cur + 1 : Math.max(0, cur - 1);
    input.value = next;
    store.setValue(key, s, m, next);
    softUpdate();
    afterChange();
  });

  root.addEventListener('input', e => {
    const input = e.target.closest('input[data-s][data-m]');
    if (!input) return;
    store.setValue(key, input.dataset.s, input.dataset.m, input.value);
    softUpdate();
  });

  root.addEventListener('change', e => {
    const input = e.target.closest('input[data-s][data-m]');
    if (!input) return;
    input.value = clampInt(input.value);
    store.setValue(key, input.dataset.s, input.dataset.m, input.value);
    softUpdate();
    afterChange();
  });

  root.addEventListener('focusin', e => {
    if (e.target.matches('input[data-s][data-m]')) e.target.select();
  });
}
