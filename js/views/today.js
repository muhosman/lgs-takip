// "Bugün" ekranı — pano: solda bugünün dersleri, sağda profil, XP, eylemler ve çalışma etkinliği
import { SUBJECTS, METRICS, MOTIVATION } from '../data.js';
import * as store from '../store.js';
import { dayTotals, summarize, levelInfo, streakRisk, unlockedGifts } from '../gamify.js';
import { todayKey, fmtNet, netOf, esc, clampInt, keyOf, addDays, fmtShort, daysBetween, dateOf, estimateScore } from '../utils.js';
import { miniRing, curves } from '../charts.js';
import { confetti } from '../confetti.js';
import { streakWarning } from './badges.js';

const dayKey = todayKey; // her render'da yeniden okunur (gece yarısını geçse de doğru)
const nf = n => Number(n).toLocaleString('tr-TR');

/* ---------------- sol: ders kutuları + giriş drawer'ı ---------------- */
// Kutu yalnız yapılanı gösterir; giriş, kutuya dokununca açılan drawer'da.
let openSubj = null;       // drawer'da açık ders
let justOpened = false;
// giriş animasyonları yalnız sayfaya ilk girişte (drawer açılıp kapanırken tekrar etmesin)
let animateNext = true;
export const reset = () => { openSubj = null; animateNext = true; };

const METRIC_TONE = { d: 'ok', y: 'bad', b: 'mute', ct: 'teach' };

/** Ders kutusu: bugünkü soru, yapılan metrikler, doğruluk halkası */
function subjectCard(s) {
  const r = store.recOf(dayKey(), s.key);
  const own = r.d + r.y + r.b;
  const q = own + r.ct;
  const acc = own ? Math.round((r.d / own) * 100) : 0;
  const done = METRICS.filter(m => r[m.key] > 0);
  return `
  <button type="button" class="tbox ${q ? '' : 'empty'}" data-subj="${s.key}" style="--c:${s.color};--i:${s.ink}">
    <span class="tbox-ico">${s.emoji}</span>
    <span class="tbox-main">
      <span class="tbox-name">${esc(s.name)}</span>
      ${q ? `
        <span class="tbox-q"><b>${q}</b> soru · <b>${fmtNet(netOf(r.d, r.y))}</b> net</span>
        <span class="tbox-tags">${done.map(m => `<i class="tg ${METRIC_TONE[m.key]}">${m.emoji} ${r[m.key]}</i>`).join('')}</span>`
      : '<span class="tbox-none">Henüz girilmedi</span>'}
    </span>
    <span class="tbox-ring">${miniRing(acc, { size: 54, stroke: 6, color: s.ink, track: s.color + '55' })}<b>${own ? '%' + acc : '+'}</b></span>
  </button>`;
}

function bigStepper(subject, metric, value) {
  return `
  <div class="bstep ${METRIC_TONE[metric.key]}">
    <span class="bstep-lbl">${metric.emoji} ${esc(metric.label)}</span>
    <div class="bstep-row">
      <button type="button" data-act="dec" data-s="${subject}" data-m="${metric.key}" aria-label="azalt">−</button>
      <input type="number" inputmode="numeric" min="0" max="9999" value="${value}"
             data-s="${subject}" data-m="${metric.key}" aria-label="${esc(metric.label)}">
      <button type="button" data-act="inc" data-s="${subject}" data-m="${metric.key}" aria-label="artır">+</button>
    </div>
    <div class="bstep-quick">
      <button type="button" data-act="add5" data-s="${subject}" data-m="${metric.key}">+5</button>
      <button type="button" data-act="add10" data-s="${subject}" data-m="${metric.key}">+10</button>
    </div>
  </div>`;
}

function drawerSummary(s) {
  const r = store.recOf(dayKey(), s.key);
  const own = r.d + r.y + r.b;
  return `
    <span><b>${own + r.ct}</b>soru</span>
    <span><b>${fmtNet(netOf(r.d, r.y))}</b>net</span>
    <span><b>${own ? '%' + Math.round((r.d / own) * 100) : '–'}</b>doğruluk</span>`;
}

function subjDrawer() {
  const s = SUBJECTS.find(x => x.key === openSubj);
  if (!s) return '';
  const r = store.recOf(dayKey(), s.key);
  return `
  <div class="drawer-scrim" data-closesubj></div>
  <aside class="drawer xdrawer sdrawer ${justOpened ? 'opening' : ''}" style="--c:${s.color};--i:${s.ink}"
         role="dialog" aria-modal="true" aria-label="${esc(s.name)}">
    <div class="drawer-head">
      <span class="sdrawer-ico">${s.emoji}</span>
      <div class="drawer-title"><div class="book-name">${esc(s.name)}</div><div class="book-sub">Bugünkü girişin</div></div>
      <button type="button" class="drawer-x" data-closesubj aria-label="kapat">✕</button>
    </div>
    <div class="drawer-body">
      <div class="ssw">${SUBJECTS.map(x => `
        <button type="button" class="ssw-b ${x.key === s.key ? 'on' : ''}" data-subjtab="${x.key}" style="--c:${x.color};--i:${x.ink}" title="${esc(x.name)}">${x.emoji}</button>`).join('')}
      </div>
      <div class="bsteps">${METRICS.map(m => bigStepper(s.key, m, r[m.key])).join('')}</div>
      <p class="xt-hint">🧑‍🏫 Çözdürdüğün sorular da soru sayına eklenir ve iki kat puan kazandırır.</p>
    </div>
    <div class="xdrawer-foot">
      <div class="xprev" data-dsum>${drawerSummary(s)}</div>
      ${(() => {
        const i = SUBJECTS.findIndex(x => x.key === s.key);
        const nx = SUBJECTS[i + 1];
        return nx
          ? `<button type="button" class="btn-primary" data-subjtab="${nx.key}">Sıradaki: ${nx.emoji} →</button>`
          : '<button type="button" class="btn-primary" data-closesubj>Tamam ✓</button>';
      })()}
    </div>
  </aside>`;
}

/* ---------------- sağ: profil, XP, eylemler ---------------- */
function profileCard(state, st) {
  const lvl = levelInfo(st.xp);
  const kalan = daysBetween(new Date(), dateOf(state.examDate));
  const risk = streakRisk(state);
  const opened = store.openedMap(state);
  const won = unlockedGifts(state.gifts, st);
  const waiting = won.some(id => !opened[id]);
  return `
  <div class="tprofile">
    <div class="tprofile-cover" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    <div class="tprofile-avatar">${esc((state.name || '🌸').slice(0, 1).toLocaleUpperCase('tr'))}</div>
    <div class="tprofile-name">${esc(state.name || 'Öğrenci')}</div>
    <div class="tprofile-sub">Sv. ${lvl.level} · ${esc(lvl.title)}</div>
    <div class="tprofile-tiles">
      <div class="ttile ${risk.atRisk ? 'danger' : ''}" title="${risk.atRisk ? 'Serin tehlikede! Bugün en az 1 soru gir' : 'Üst üste çalıştığın gün'}"><span>🔥</span><b data-count="${st.streak}">${st.streak}</b>gün seri</div>
      <div class="ttile"><span>⏳</span><b ${kalan >= 0 ? `data-count="${kalan}"` : ''}>${kalan >= 0 ? kalan : '–'}</b>LGS'ye gün</div>
      ${(state.gifts || []).length ? `
      <button type="button" class="ttile tgift ${waiting ? 'waiting' : ''}" data-go="gifts"><span>🧺</span><b>${won.length}</b>hediye</button>` : ''}
    </div>
  </div>`;
}

function xpCard(st) {
  const lvl = levelInfo(st.xp);
  return `
  <div class="txp">
    <div class="txp-medal" aria-hidden="true">🏅</div>
    <div class="txp-main">
      <div class="txp-val"><span data-count="${st.xp}">${nf(st.xp)}</span> <small>XP</small></div>
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
  <div class="tact tact-goal">
    <div class="tact-ring">${miniRing(pct, { size: 58, stroke: 7, color: '#fff', track: 'rgba(255,255,255,.3)' })}<b>${Math.round(pct)}%</b></div>
    <div class="tact-title">${done ? 'Hedef tamam! 🎉' : 'Hedefim'}</div>
    <div class="tact-desc">${goal
      ? (done ? `${t.q}/${goal} soru. Harikasın!` : `${goal} soruluk hedefe <b>${goal - t.q}</b> soru kaldı`)
      : 'Ayarlar\'dan günlük hedef koy'}</div>
  </div>`;
}

/** Son deneme özeti (salt bilgi): net, puan, bir öncekine göre değişim */
function lastExam(state) {
  const exams = state.exams || [];
  const ex = exams[exams.length - 1];
  if (!ex) {
    return `
    <div class="tact tact-exam">
      <div class="tact-ico">🏆</div>
      <div class="tact-title">Son deneme</div>
      <div class="tact-desc">Henüz deneme girilmedi</div>
    </div>`;
  }
  const net = SUBJECTS.reduce((a, s) => a + netOf(ex.subjects[s.key]?.d, ex.subjects[s.key]?.y), 0);
  const score = estimateScore(ex.subjects);
  const prev = exams[exams.length - 2];
  const diff = prev ? score - estimateScore(prev.subjects) : null;
  return `
  <div class="tact tact-exam">
    <div class="tact-ico">🏆</div>
    <div class="tact-title">${esc(ex.name)}</div>
    <div class="tact-nums"><span><b>${fmtNet(net)}</b>net</span><span><b>${score}</b>puan</span>${diff === null ? '' : `<span><b>${diff >= 0 ? '+' : ''}${diff}</b>değişim</span>`}</div>
    <div class="tact-desc">${fmtShort(dateOf(ex.date))} ${dateOf(ex.date).getFullYear()}</div>
  </div>`;
}

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
  const anim = animateNext;
  animateNext = false;
  const html = `
  <div class="tdash ${anim ? 'anim' : ''}">
    <section class="tleft">
      <div id="tActivity">${activity(state)}</div>
      <div class="tlessons">
        <div class="tsec-head"><h2 class="tsec-title">Bugünün dersleri</h2></div>
        <div class="tboxes">${SUBJECTS.map(subjectCard).join('')}</div>
      </div>
    </section>
    <aside class="tright">
      <div class="tright-top">
        <div id="tProfile">${profileCard(state, st)}</div>
        <div id="tXp">${xpCard(st)}</div>
      </div>
      <div id="warnSlot">${streakWarning(state)}</div>
      <div class="tacts">
        <div id="tGoal">${goalAction(state)}</div>
        ${lastExam(state)}
      </div>
    </aside>
  </div>
  <div id="sDrawer">${subjDrawer()}</div>`;
  justOpened = false;
  return html;
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
      const card = $(`[data-subj="${s.key}"]`);
      if (card) card.outerHTML = subjectCard(s);
      const ds = $('[data-dsum]');
      if (ds) ds.innerHTML = drawerSummary(s);
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

    const subj = e.target.closest('[data-subj]');
    if (subj) { openSubj = subj.dataset.subj; justOpened = true; ctx.rerender(); return; }
    const tabb = e.target.closest('[data-subjtab]');
    if (tabb) { openSubj = tabb.dataset.subjtab; ctx.rerender(); return; }
    if (e.target.closest('[data-closesubj]')) { openSubj = null; ctx.rerender(); return; }

    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const { act, s, m } = btn.dataset;
    const input = root.querySelector(`input[data-s="${s}"][data-m="${m}"]`);
    const cur = clampInt(input.value);
    const step = { inc: 1, dec: -1, add5: 5, add10: 10 }[act] || 0;
    const next = Math.max(0, cur + step);
    input.value = next;
    store.setValue(key, s, m, next);
    softUpdate(s);
    afterChange();
  });

  // animasyonlar bitince sınıf kalksın: yerinde tazelenen kutular yeniden zıplamasın
  const dash = root.querySelector('.tdash.anim');
  if (dash) setTimeout(() => dash.classList.remove('anim'), 2600);

  // ilk girişte sayılar sıfırdan yukarı sayar
  if (dash && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.querySelectorAll('.tdash [data-count]').forEach((el, k) => {
      const end = Number(el.dataset.count) || 0;
      if (!end) return;
      const t0 = performance.now() + 250 + k * 80, dur = 900;
      const tick = now => {
        const p = Math.min(1, Math.max(0, (now - t0) / dur));
        el.textContent = nf(Math.round(end * (1 - Math.pow(1 - p, 3))));
        if (p < 1 && el.isConnected) requestAnimationFrame(tick);
      };
      el.textContent = '0';
      requestAnimationFrame(tick);
    });
  }

  document.body.classList.toggle('drawer-open', !!openSubj);
  if (openSubj) setTimeout(() => root.querySelector('.sdrawer input[data-m="d"]')?.focus({ preventScroll: true }), 60);

  root.addEventListener('keydown', e => {
    if (e.key === 'Escape' && openSubj) { openSubj = null; ctx.rerender(); return; }
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
