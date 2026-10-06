// "Bugün" ekranı — pano: çalışma etkinliği, Hedefim (soru girişi), son deneme, profil,
// rozet/hediye karoları. Giriş ve deneme ayrıntısı drawer'da, rozet/hediyeler ortada pencerede.
import { SUBJECTS, METRICS, BADGES } from '../data.js';
import * as store from '../store.js';
import { dayTotals, summarize, levelInfo, streakRisk, unlockedGifts } from '../gamify.js';
import { todayKey, fmtNet, netOf, esc, clampInt, keyOf, addDays, fmtShort, daysBetween, dateOf, estimateScore } from '../utils.js';
import { miniRing, curves } from '../charts.js';
import { confetti } from '../confetti.js';
import { streakWarning, badgeCard, allBadgeStates } from './badges.js';
import * as gifts from './gifts.js';
import { rankEmblem, rankOf, nextRank } from '../rank.js';

const dayKey = todayKey; // her render'da yeniden okunur (gece yarısını geçse de doğru)
const nf = n => Number(n).toLocaleString('tr-TR');

let drawer = null;         // null | { mode:'entry', subj } | { mode:'exam' }
let modal = null;          // null | 'badges' | 'gifts'
let badgeTab = 'next';     // rozet penceresi: 'next' | 'earned'
let justOpened = false;
let escHandler = null;
// giriş animasyonları yalnız sayfaya ilk girişte (drawer/pencere açılıp kapanırken tekrar etmesin)
let animateNext = true;
export const reset = () => { drawer = null; modal = null; animateNext = true; };

const METRIC_TONE = { d: 'ok', y: 'bad', b: 'mute', ct: 'teach' };

/* ---------------- soru girişi drawer'ı ---------------- */
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

const SHORT = { turkce: 'Türkçe', matematik: 'Matematik', fen: 'Fen', inkilap: 'İnkılap', ingilizce: 'İngilizce', din: 'Din' };
const shortName = s => SHORT[s.key] || s.name;

const subjQ = key => { const r = store.recOf(dayKey(), key); return r.d + r.y + r.b + r.ct; };

/** Ders seçim kutuları (iki satır): ad + bugünkü soru */
const subjSwitch = active => SUBJECTS.map(x => {
  const q = subjQ(x.key);
  return `
  <button type="button" class="ssw-b ${x.key === active ? 'on' : ''} ${q ? 'has' : ''}" data-subjtab="${x.key}" style="--c:${x.color};--i:${x.ink}">
    <span class="ssw-e">${x.emoji}</span>
    <span class="ssw-n">${esc(shortName(x))}</span>
    <span class="ssw-q">${q ? q + ' soru' : '–'}</span>
  </button>`;
}).join('');

function drawerSummary(s) {
  const r = store.recOf(dayKey(), s.key);
  const own = r.d + r.y + r.b;
  return `
    <span><b>${own + r.ct}</b>soru</span>
    <span><b>${fmtNet(netOf(r.d, r.y))}</b>net</span>
    <span><b>${own ? '%' + Math.round((r.d / own) * 100) : '–'}</b>doğruluk</span>`;
}

function entryDrawer() {
  const s = SUBJECTS.find(x => x.key === drawer.subj) || SUBJECTS[0];
  const r = store.recOf(dayKey(), s.key);
  const i = SUBJECTS.findIndex(x => x.key === s.key);
  const nx = SUBJECTS[i + 1];
  return `
  <div class="drawer-scrim" data-closedrawer></div>
  <aside class="drawer xdrawer sdrawer ${justOpened ? 'opening' : ''}" style="--c:${s.color};--i:${s.ink}"
         role="dialog" aria-modal="true" aria-label="Soru girişi">
    <div class="drawer-head">
      <span class="sdrawer-ico">✏️</span>
      <div class="drawer-title"><div class="book-name">Bugünkü soruların</div><div class="book-sub">Dersi seç, sayıları gir</div></div>
      <button type="button" class="drawer-x" data-closedrawer aria-label="kapat">✕</button>
    </div>
    <div class="drawer-body">
      <div class="ssw" data-ssw>${subjSwitch(s.key)}</div>
      <div class="sname"><span>${s.emoji}</span>${esc(s.name)}</div>
      <div class="bsteps">${METRICS.map(m => bigStepper(s.key, m, r[m.key])).join('')}</div>
      <p class="xt-hint">🧑‍🏫 Çözdürdüğün sorular da soru sayına eklenir ve iki kat puan kazandırır.</p>
    </div>
    <div class="xdrawer-foot">
      <div class="xprev" data-dsum>${drawerSummary(s)}</div>
      ${nx
        ? `<button type="button" class="btn-primary" data-subjtab="${nx.key}">Sıradaki: ${esc(shortName(nx))} →</button>`
        : '<button type="button" class="btn-primary" data-closedrawer>Tamam ✓</button>'}
    </div>
  </aside>`;
}

/* ---------------- son deneme ayrıntısı drawer'ı ---------------- */
const rec = v => typeof v === 'number' ? { d: 0, y: v } : { d: v?.d || 0, y: v?.y || 0 };

function examDrawer() {
  const exams = store.get().exams || [];
  const ex = exams[exams.length - 1];
  if (!ex) return '';
  const net = SUBJECTS.reduce((a, s) => a + netOf(ex.subjects[s.key]?.d, ex.subjects[s.key]?.y), 0);
  const score = estimateScore(ex.subjects);
  const prev = exams[exams.length - 2];
  const diff = prev ? score - estimateScore(prev.subjects) : null;
  const topics = Object.entries(ex.topics || {})
    .flatMap(([subject, m]) => Object.entries(m).map(([name, v]) => ({ subject, name, ...rec(v) })))
    .sort((a, b) => b.y - a.y);
  return `
  <div class="drawer-scrim" data-closedrawer></div>
  <aside class="drawer xdrawer edrawer ${justOpened ? 'opening' : ''}" role="dialog" aria-modal="true" aria-label="${esc(ex.name)}">
    <div class="drawer-head">
      <span class="sdrawer-ico">🏆</span>
      <div class="drawer-title"><div class="book-name">${esc(ex.name)}</div><div class="book-sub">${fmtShort(dateOf(ex.date))} ${dateOf(ex.date).getFullYear()}</div></div>
      <button type="button" class="drawer-x" data-closedrawer aria-label="kapat">✕</button>
    </div>
    <div class="drawer-body">
      <div class="xstats estats">
        <div class="xstat"><b>${fmtNet(net)}</b>net</div>
        <div class="xstat"><b>${score}</b>tahmini puan</div>
        <div class="xstat"><b class="${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${diff === null ? '–' : (diff >= 0 ? '+' : '') + diff}</b>önceki denemeye göre</div>
      </div>
      <div class="erows">${SUBJECTS.map(s => {
        const r = ex.subjects[s.key] || { d: 0, y: 0 };
        const n = netOf(r.d, r.y);
        return `
        <div class="erow" style="--c:${s.color};--i:${s.ink}">
          <span class="erow-ico">${s.emoji}</span>
          <span class="erow-main">
            <span class="erow-name">${esc(s.name)}</span>
            <span class="erow-bar"><i style="width:${Math.round((n / s.q) * 100)}%"></i></span>
          </span>
          <span class="erow-tags"><i class="tg ok">✅ ${r.d || 0}</i><i class="tg bad">❌ ${r.y || 0}</i></span>
          <b class="erow-net">${fmtNet(n)}<small>/${s.q}</small></b>
        </div>`;
      }).join('')}</div>
      ${topics.length ? `
        <div class="esec">📚 Konular</div>
        <ul class="etopics">${topics.map(t => `
          <li><span class="wtop-dot" style="background:${SUBJECTS.find(s => s.key === t.subject)?.color || '#ddd'}"></span>
            <span class="etopic-name">${esc(t.name)}</span>
            <i class="tg ok">✅ ${t.d}</i><i class="tg bad">❌ ${t.y}</i></li>`).join('')}</ul>` : ''}
    </div>
  </aside>`;
}

/* ---------------- rozet / hediye pencereleri ---------------- */
function badgesModal() {
  const states = allBadgeStates();
  const risk = streakRisk(store.get());
  const RANK = { diamond: 0, gold: 1, silver: 2, bronze: 3 };
  const earned = states.filter(x => x.has).sort((a, b) => RANK[a.b.rarity] - RANK[b.b.rarity]);
  const next = states.filter(x => !x.has && x.isNext).sort((a, b) => b.ratio - a.ratio);
  const list = badgeTab === 'earned' ? earned : next;
  return `
  <div class="modal-scrim" data-closemodal></div>
  <div class="modal tmodal" role="dialog" aria-modal="true" aria-label="Rozetlerim">
    <div class="modal-head">
      <span class="modal-title">🏅 Rozetlerim <small>${earned.length}/${BADGES.length}</small></span>
      <button type="button" class="drawer-x" data-closemodal aria-label="kapat">✕</button>
    </div>
    <div class="bfilters tmodal-tabs">
      <button type="button" class="seg ${badgeTab === 'next' ? 'on' : ''}" data-btab="next">🎯 Sıradakiler (${next.length})</button>
      <button type="button" class="seg ${badgeTab === 'earned' ? 'on' : ''}" data-btab="earned">🏆 Kazandıkların (${earned.length})</button>
    </div>
    <div class="modal-body">
      ${list.length ? `<div class="bcards">${list.map(x => badgeCard(x, risk)).join('')}</div>`
        : `<div class="empty"><div>${badgeTab === 'earned' ? '🌱' : '🦄'}</div>${badgeTab === 'earned' ? 'İlk soruyu çöz, ilk rozet gelsin!' : 'Hepsini topladın!'}</div>`}
    </div>
  </div>`;
}

function giftsModal() {
  return `
  <div class="modal-scrim" data-closemodal></div>
  <div class="modal tmodal" role="dialog" aria-modal="true" aria-label="Hediyelerim">
    <div class="modal-head">
      <span class="modal-title">🎁 Hediyelerim</span>
      <button type="button" class="drawer-x" data-closemodal aria-label="kapat">✕</button>
    </div>
    <div class="modal-body">${gifts.render()}</div>
  </div>`;
}

/* ---------------- sağ: profil, rozet/hediye karoları ---------------- */
function profileCard(state, st) {
  const lvl = levelInfo(st.xp);
  const kalan = daysBetween(new Date(), dateOf(state.examDate));
  const risk = streakRisk(state);
  const rk = rankOf(lvl.level), nr = nextRank(lvl.level);
  return `
  <div class="tprofile">
    <div class="tprofile-cover" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    <span class="tprofile-rank" title="${esc(rk.name)} rütbesi">${rankEmblem(lvl.level, 104)}</span>
    <div class="tprofile-name">${esc(state.name || 'Öğrenci')}</div>
    <div class="tprofile-sub">Sv. ${lvl.level} · ${esc(lvl.title)}</div>
    <span class="tprofile-rankname">${esc(rk.name)} rütbesi${nr ? ` · ${esc(nr.name)}'e ${nr.min - lvl.level} seviye` : ' · en üst rütbe'}</span>
    <div class="txp-line">
      <span class="txp-val"><span data-count="${st.xp}">${nf(st.xp)}</span> <small>XP</small></span>
      <span class="txp-lbl">Sv. ${lvl.level + 1}'e ${nf(lvl.need - lvl.into)}</span>
    </div>
    <span class="txp-bar"><i style="width:${lvl.pct}%"></i></span>
    <div class="tprofile-tiles">
      <div class="ttile ${risk.atRisk ? 'danger' : ''}" title="${risk.atRisk ? 'Serin tehlikede! Bugün en az 1 soru gir' : 'Üst üste çalıştığın gün'}"><span>🔥</span><b data-count="${st.streak}">${st.streak}</b>gün seri</div>
      <div class="ttile"><span>⏳</span><b ${kalan >= 0 ? `data-count="${kalan}"` : ''}>${kalan >= 0 ? kalan : '–'}</b>LGS'ye gün</div>
    </div>
  </div>`;
}

/** Rozetler ve Hediyeler: alanı dolduran iki büyük karo, tıklayınca ortada pencere */
function hubCard(state, st) {
  const states = allBadgeStates();
  const RANK = { diamond: 0, gold: 1, silver: 2, bronze: 3 };
  const earned = states.filter(x => x.has).sort((a, b) => RANK[a.b.rarity] - RANK[b.b.rarity]);
  const nextOne = states.filter(x => !x.has && x.isNext).sort((a, b) => b.ratio - a.ratio)[0];
  const giftList = state.gifts || [];
  const opened = store.openedMap(state);
  const won = unlockedGifts(giftList, st);
  const waiting = won.some(id => !opened[id]);
  return `
  <div class="thub">
    <button type="button" class="thub-t tb" data-modal="badges">
      <span class="thub-top"><span class="thub-ico">🏅</span><span class="thub-go">↗</span></span>
      <span class="thub-val"><b>${earned.length}</b><small>/${BADGES.length}</small></span>
      <span class="thub-lbl">Rozetlerim</span>
      <span class="thub-icos">${earned.slice(0, 5).map(x => `<i class="r-${x.b.rarity}">${x.b.ico}</i>`).join('') || '<em>Henüz yok</em>'}</span>
      ${nextOne ? `<span class="thub-next">Sıradaki: ${esc(nextOne.b.name)} · ${nf(nextOne.cur)}/${nf(nextOne.target)}</span>` : ''}
    </button>
    <button type="button" class="thub-t tg2 ${waiting ? 'waiting' : ''}" data-modal="gifts">
      <span class="thub-top"><span class="thub-ico">🎁</span><span class="thub-go">↗</span></span>
      <span class="thub-val"><b>${won.length}</b><small>/${giftList.length}</small></span>
      <span class="thub-lbl">Hediyelerim</span>
      <span class="thub-next">${waiting ? '🎉 Açılmayı bekleyen hediyen var!' : giftList.length ? 'Kazanılacak hediyelerine bak' : 'Henüz hediye eklenmedi'}</span>
    </button>
  </div>`;
}

/* ---------------- sol: Hedefim ve son deneme ---------------- */
function goalAction(state) {
  const key = dayKey();
  const t = dayTotals(state.days[key]);
  const goal = store.goalFor(key) || 0;
  const pct = goal ? Math.min(100, (t.q / goal) * 100) : 0;
  const done = goal > 0 && t.q >= goal;
  const doneSubj = SUBJECTS.filter(s => subjQ(s.key) > 0);
  return `
  <button type="button" class="tact tact-goal" data-entry>
    <span class="tact-go" aria-hidden="true">✏️</span>
    <span class="tact-ring">${miniRing(pct, { size: 58, stroke: 7, color: '#fff', track: 'rgba(255,255,255,.3)' })}<b>${Math.round(pct)}%</b></span>
    <span class="tact-title">${done ? 'Hedef tamam! 🎉' : 'Hedefim'}</span>
    <span class="tact-desc">${goal
      ? (done ? `${t.q}/${goal} soru. Harikasın!` : `${goal} soruluk hedefe <b>${goal - t.q}</b> soru kaldı`)
      : 'Ayarlar\'dan günlük hedef koy'}</span>
    <span class="tact-subj">${doneSubj.length
      ? doneSubj.map(s => `<i>${s.emoji} ${subjQ(s.key)}</i>`).join('')
      : '<i>Soru girmek için dokun</i>'}</span>
  </button>`;
}

/** Son deneme özeti; dokununca ayrıntı drawer'da */
function lastExam(state) {
  const exams = state.exams || [];
  const ex = exams[exams.length - 1];
  if (!ex) {
    return `
    <div class="tact tact-exam">
      <span class="tact-ico">🏆</span>
      <span class="tact-title">Son deneme</span>
      <span class="tact-desc">Henüz deneme girilmedi</span>
    </div>`;
  }
  const net = SUBJECTS.reduce((a, s) => a + netOf(ex.subjects[s.key]?.d, ex.subjects[s.key]?.y), 0);
  const score = estimateScore(ex.subjects);
  const prev = exams[exams.length - 2];
  const diff = prev ? score - estimateScore(prev.subjects) : null;
  return `
  <button type="button" class="tact tact-exam" data-examdetail>
    <span class="tact-go" aria-hidden="true">↗</span>
    <span class="tact-ico">🏆</span>
    <span class="tact-title">${esc(ex.name)}</span>
    <span class="tact-nums"><span><b>${fmtNet(net)}</b>net</span><span><b>${score}</b>puan</span>${diff === null ? '' : `<span><b>${diff >= 0 ? '+' : ''}${diff}</b>değişim</span>`}</span>
    <span class="tact-desc">${fmtShort(dateOf(ex.date))} ${dateOf(ex.date).getFullYear()} · ayrıntı için dokun</span>
  </button>`;
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
      <div class="tacts">
        <div id="tGoal">${goalAction(state)}</div>
        <div id="tExam">${lastExam(state)}</div>
      </div>
    </section>
    <aside class="tright">
      <div id="tProfile">${profileCard(state, st)}</div>
      <div id="tHub">${hubCard(state, st)}</div>
      <div id="warnSlot">${streakWarning(state)}</div>
    </aside>
  </div>
  <div id="tLayer">${drawer?.mode === 'entry' ? entryDrawer() : drawer?.mode === 'exam' ? examDrawer() : ''}${
    modal === 'badges' ? badgesModal() : modal === 'gifts' ? giftsModal() : ''}</div>`;
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
      const ds = $('[data-dsum]');
      if (ds) ds.innerHTML = drawerSummary(s);
      const sw = $('[data-ssw]');
      if (sw) sw.innerHTML = subjSwitch(s.key);
    }
    $('#warnSlot').innerHTML = streakWarning(state);
    $('#tGoal').innerHTML = goalAction(state);
    $('#tHub').innerHTML = hubCard(state, st);
    $('#tProfile').innerHTML = profileCard(state, st);
    $('#tActivity').innerHTML = activity(state);
  };

  const open = next => { drawer = next; justOpened = true; ctx.rerender(); };

  root.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('[data-entry]')) {
      // girilmemiş ilk derse aç; hepsi girildiyse ilk ders
      const first = SUBJECTS.find(s => !subjQ(s.key)) || SUBJECTS[0];
      open({ mode: 'entry', subj: first.key });
      return;
    }
    if (t.closest('[data-examdetail]')) { open({ mode: 'exam' }); return; }
    const tabb = t.closest('[data-subjtab]');
    if (tabb) { drawer = { mode: 'entry', subj: tabb.dataset.subjtab }; ctx.rerender(); return; }
    if (t.closest('[data-closedrawer]')) { drawer = null; ctx.rerender(); return; }

    const md = t.closest('[data-modal]');
    if (md) {
      modal = md.dataset.modal;
      if (modal === 'gifts') gifts.resetMode();
      ctx.rerender();
      return;
    }
    if (t.closest('[data-closemodal]')) { modal = null; ctx.rerender(); return; }
    const bt = t.closest('[data-btab]');
    if (bt) { badgeTab = bt.dataset.btab; ctx.rerender(); return; }

    const btn = t.closest('button[data-act]');
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

  // hediye penceresi açıkken sekme/kutu açma olayları hediye modülünde
  if (modal === 'gifts') gifts.bind(root, ctx);

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

  document.body.classList.toggle('drawer-open', !!drawer);
  document.body.classList.toggle('modal-open', !!modal);
  if (drawer?.mode === 'entry') setTimeout(() => root.querySelector('.sdrawer input[data-m="d"]')?.focus({ preventScroll: true }), 60);

  // Esc: odak hangi elemanda olursa olsun (belgeye bağlı; her çizimde öncekini kaldır)
  if (escHandler) document.removeEventListener('keydown', escHandler);
  escHandler = e => {
    if (e.key !== 'Escape' || !root.isConnected) return;
    if (modal) { modal = null; ctx.rerender(); return; }
    if (drawer) { drawer = null; ctx.rerender(); }
  };
  document.addEventListener('keydown', escHandler);

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
