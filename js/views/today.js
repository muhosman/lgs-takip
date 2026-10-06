// "Bugün" ekranı — pano: solda bugünün dersleri, sağda profil, XP, eylemler ve çalışma etkinliği
import { SUBJECTS, METRICS, MOTIVATION } from '../data.js';
import * as store from '../store.js';
import { dayTotals, summarize, levelInfo } from '../gamify.js';
import { todayKey, fmtNet, netOf, esc, clampInt, keyOf, addDays, fmtShort, daysBetween, dateOf } from '../utils.js';
import { miniRing, curves } from '../charts.js';
import { confetti } from '../confetti.js';
import { streakWarning } from './badges.js';

const dayKey = todayKey; // her render'da yeniden okunur (gece yarısını geçse de doğru)
const nf = n => Number(n).toLocaleString('tr-TR');

/* ---------------- sol: ders kartları ---------------- */
function stepper(subject, metric, value) {
  return `
  <div class="tstep">
    <span class="tstep-lbl">${metric.emoji} ${esc(metric.short)}</span>
    <div class="tstep-row">
      <button type="button" data-act="dec" data-s="${subject}" data-m="${metric.key}" aria-label="azalt">−</button>
      <input type="number" inputmode="numeric" min="0" max="9999" value="${value}"
             data-s="${subject}" data-m="${metric.key}" aria-label="${esc(metric.label)}">
      <button type="button" data-act="inc" data-s="${subject}" data-m="${metric.key}" aria-label="artır">+</button>
    </div>
  </div>`;
}

/** Halka ve alt satır: bugünkü doğruluk ve net (girişte yerinde tazelenir) */
function subjSummary(s) {
  const r = store.recOf(dayKey(), s.key);
  const own = r.d + r.y + r.b;
  const q = own + r.ct;
  const acc = own ? Math.round((r.d / own) * 100) : 0;
  return {
    ring: `${miniRing(acc, { color: s.ink, track: s.color + '55' })}<span class="tsubj-emoji">${s.emoji}</span>`,
    foot: `
      <span class="tsubj-acc" style="color:${s.ink}">${own ? '%' + acc : '–'}</span>
      <span class="tsubj-meta"><b>${q}</b> soru · <b>${fmtNet(netOf(r.d, r.y))}</b> net</span>`,
  };
}

function subjectCard(s) {
  const r = store.recOf(dayKey(), s.key);
  const sum = subjSummary(s);
  return `
  <article class="tsubj" style="--c:${s.color};--i:${s.ink}">
    <div class="tsubj-ring" data-ring="${s.key}">${sum.ring}</div>
    <div class="tsubj-main">
      <div class="tsubj-name">${esc(s.name)}</div>
      <div class="tsteps">${METRICS.map(m => stepper(s.key, m, r[m.key])).join('')}</div>
      <div class="tsubj-foot" data-foot="${s.key}">${sum.foot}</div>
    </div>
  </article>`;
}

/* ---------------- sağ: profil, XP, eylemler ---------------- */
function profileCard(state, st) {
  const lvl = levelInfo(st.xp);
  const t = dayTotals(state.days[dayKey()]);
  const kalan = daysBetween(new Date(), dateOf(state.examDate));
  return `
  <div class="tprofile">
    <div class="tprofile-cover" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    <div class="tprofile-avatar">${esc((state.name || '🌸').slice(0, 1).toLocaleUpperCase('tr'))}</div>
    <div class="tprofile-name">${esc(state.name || 'Öğrenci')}</div>
    <div class="tprofile-sub">Sv. ${lvl.level} · ${esc(lvl.title)}</div>
    <div class="tprofile-tiles">
      <div class="ttile"><span>📝</span><b>${t.q}</b>bugün soru</div>
      <div class="ttile"><span>⏳</span><b>${kalan >= 0 ? kalan : '–'}</b>gün kaldı</div>
    </div>
  </div>`;
}

function xpCard(st) {
  const lvl = levelInfo(st.xp);
  return `
  <div class="txp">
    <div class="txp-medal" aria-hidden="true">🏅</div>
    <div class="txp-main">
      <div class="txp-val">${nf(st.xp)} <small>XP</small></div>
      <div class="txp-lbl">Sv. ${lvl.level + 1}'e ${nf(lvl.need - lvl.into)} XP</div>
      <span class="txp-bar"><i style="width:${lvl.pct}%"></i></span>
      <div class="txp-btns">
        <button type="button" class="btn-out" data-go="badges">Rozetler</button>
        <button type="button" class="btn-fill" data-go="gifts">Hediyeler</button>
      </div>
    </div>
  </div>`;
}

function goalAction(state) {
  const key = dayKey();
  const t = dayTotals(state.days[key]);
  const goal = store.goalFor(key) || 0;
  const pct = goal ? Math.min(100, (t.q / goal) * 100) : 0;
  const done = goal > 0 && t.q >= goal;
  return `
  <div class="tact tact-goal" data-go="settings" role="button" tabindex="0">
    <span class="tact-go" aria-hidden="true">↗</span>
    <div class="tact-ring">${miniRing(pct, { size: 58, stroke: 7, color: '#fff', track: 'rgba(255,255,255,.3)' })}<b>${Math.round(pct)}%</b></div>
    <div class="tact-title">${done ? 'Hedef tamam! 🎉' : 'Hedefim'}</div>
    <div class="tact-desc">${goal
      ? (done ? `${t.q}/${goal} soru. Harikasın!` : `${goal} soruluk hedefe <b>${goal - t.q}</b> soru kaldı`)
      : 'Ayarlar\'dan günlük hedef koy'}</div>
  </div>`;
}

const examAction = () => `
  <div class="tact tact-exam" data-addexam role="button" tabindex="0">
    <span class="tact-go" aria-hidden="true">↗</span>
    <div class="tact-ico">🏆</div>
    <div class="tact-title">Deneme ekle</div>
    <div class="tact-desc">Deneme sonucunu ve konu yanlışlarını gir</div>
  </div>`;

function activity(state) {
  const labels = [], q = [], d = [];
  for (let i = 29; i >= 0; i--) {
    const day = addDays(new Date(), -i);
    const t = dayTotals(state.days[keyOf(day)]);
    labels.push(fmtShort(day));
    q.push(t.q);
    d.push(t.d);
  }
  return `
  <div class="tactivity">
    <div class="tactivity-head">
      <div class="tactivity-title">Çalışma etkinliği</div>
      <div class="tlegend"><span><i style="background:#C2427F"></i>Soru</span><span><i style="background:#4FC9A6"></i>Doğru</span></div>
      <span class="tactivity-range">Son 30 gün</span>
    </div>
    ${curves([
      { name: 'Soru', color: '#C2427F', values: q },
      { name: 'Doğru', color: '#4FC9A6', values: d },
    ], labels, { height: 230 })}
  </div>`;
}

/* ---------------- ekran ---------------- */
export function render() {
  const state = store.get();
  const st = summarize(state);
  return `
  <div id="warnSlot">${streakWarning(state)}</div>
  <div class="tdash">
    <section class="tleft">
      <div class="tsec-head">
        <h2 class="tsec-title">Bugünün dersleri</h2>
      </div>
      <div class="tsubjs">${SUBJECTS.map(subjectCard).join('')}</div>
      <p class="hint">🧑‍🏫 Çözdürdüğün sorular da soru sayına eklenir ve <b>iki kat puan</b> kazandırır.</p>
    </section>
    <aside class="tright">
      <div class="tright-top">
        <div id="tProfile">${profileCard(state, st)}</div>
        <div id="tXp">${xpCard(st)}</div>
      </div>
      <div class="tacts">
        <div id="tGoal">${goalAction(state)}</div>
        ${examAction()}
      </div>
      <div id="tActivity">${activity(state)}</div>
    </aside>
  </div>`;
}

export function bind(root, ctx) {
  const key = dayKey();
  const $ = sel => root.querySelector(sel);

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

  // Sayfayı yeniden çizmeden yalnız değişen parçaları tazele (girişte odak kaybolmasın)
  const softUpdate = subject => {
    const state = store.get();
    const st = summarize(state);
    const s = SUBJECTS.find(x => x.key === subject);
    if (s) {
      const sum = subjSummary(s);
      $(`[data-ring="${s.key}"]`).innerHTML = sum.ring;
      $(`[data-foot="${s.key}"]`).innerHTML = sum.foot;
    }
    $('#warnSlot').innerHTML = streakWarning(state);
    $('#tGoal').innerHTML = goalAction(state);
    $('#tXp').innerHTML = xpCard(st);
    $('#tProfile').innerHTML = profileCard(state, st);
    $('#tActivity').innerHTML = activity(state);
  };

  root.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) { ctx.go(go.dataset.go); return; }
    if (e.target.closest('[data-addexam]')) { ctx.openExamAdd(); return; }

    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const { act, s, m } = btn.dataset;
    const input = root.querySelector(`input[data-s="${s}"][data-m="${m}"]`);
    const cur = clampInt(input.value);
    const next = act === 'inc' ? cur + 1 : Math.max(0, cur - 1);
    input.value = next;
    store.setValue(key, s, m, next);
    softUpdate(s);
    afterChange();
  });

  root.addEventListener('keydown', e => {
    const card = e.target.closest('.tact');
    if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); card.click(); }
  });

  root.addEventListener('input', e => {
    const input = e.target.closest('input[data-s][data-m]');
    if (!input) return;
    store.setValue(key, input.dataset.s, input.dataset.m, input.value);
    softUpdate(input.dataset.s);
  });

  root.addEventListener('change', e => {
    const input = e.target.closest('input[data-s][data-m]');
    if (!input) return;
    input.value = clampInt(input.value);
    store.setValue(key, input.dataset.s, input.dataset.m, input.value);
    softUpdate(input.dataset.s);
    afterChange();
  });

  root.addEventListener('focusin', e => {
    if (e.target.matches('input[data-s][data-m]')) e.target.select();
  });
}
