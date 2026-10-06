// "Bugün" ekranı — pano:
//   üst: çalışma etkinliği | öğrenci kutusu (rütbe, XP, rozet/hediye/son deneme karoları, uyarı)
//   alt: ay takvimi (tam günler zincirle bağlı) | seçili günün hedefleri (ders kutuları)
// Giriş ve deneme ayrıntısı drawer'da, rozet/hediyeler ortada pencerede.
import { SUBJECTS, METRICS, BADGES } from '../data.js';
import * as store from '../store.js';
import { dayTotals, summarize, levelInfo, streakRisk, unlockedGifts } from '../gamify.js';
import {
  todayKey, fmtNet, netOf, esc, clampInt, keyOf, addDays, fmtShort, daysBetween, dateOf,
  estimateScore, DAY_SHORT, MONTHS,
} from '../utils.js';
import { miniRing, curves } from '../charts.js';
import { confetti } from '../confetti.js';
import { streakWarning, badgeCard, allBadgeStates } from './badges.js';
import * as gifts from './gifts.js';
import { rankEmblem, rankOf, nextRank, RANKS } from '../rank.js';

const nf = n => Number(n).toLocaleString('tr-TR');

let drawer = null;         // null | { mode:'entry', day, subj } | { mode:'exam' }
let modal = null;          // null | 'badges' | 'gifts' | 'ranks'
let badgeTab = 'next';     // rozet penceresi: 'next' | 'earned'
let selDay = todayKey();   // takvimde seçili gün
let month = null;          // takvimde görünen ay (ayın 1'i)
let justOpened = false;
let modalFresh = false;     // pencere bu çizimde mi açıldı (açılış animasyonu yalnız o zaman)
let escHandler = null;
// giriş animasyonları yalnız sayfaya ilk girişte (drawer/pencere açılıp kapanırken tekrar etmesin)
let animateNext = true;
export const reset = () => { drawer = null; modal = null; animateNext = true; selDay = todayKey(); month = null; };

const METRIC_TONE = { d: 'ok', y: 'bad', b: 'mute', ct: 'teach' };
const SHORT = { turkce: 'Türkçe', matematik: 'Matematik', fen: 'Fen', inkilap: 'İnkılap', ingilizce: 'İngilizce', din: 'Din' };
const shortName = s => SHORT[s.key] || s.name;
const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const fmtLongDay = key => { const d = dateOf(key); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${DAY_NAMES[d.getDay()]}`; };

/** Soru girişi yalnız son 1 haftaya (bugün ve önceki 6 gün); daha eskisi görüntülenir, düzenlenmez */
export const EDIT_DAYS = 7;
const editable = key => key <= todayKey() && daysBetween(dateOf(key), dateOf(todayKey())) < EDIT_DAYS;

/* ---------------- gün durumu (takvim ve panel) ---------------- */
function dayInfo(key) {
  const t = dayTotals(store.get().days[key]);
  const goal = store.goalFor(key) || 0;
  const today = todayKey();
  const pct = goal ? Math.min(100, Math.round((t.q / goal) * 100)) : 0;
  const status = key > today ? 'future'
    : goal > 0 && t.q >= goal ? 'perfect'
    : t.q > 0 ? 'partial'
    : key === today ? 'today' : 'missed';
  const ratio = goal ? t.q / goal : 0;
  // alev: hedefin çok üstü (%150 → 2 katman, %200 → 3 katman)
  const fire = status === 'perfect' ? (ratio >= 2 ? 3 : ratio >= 1.5 ? 2 : 0) : 0;
  return { key, q: t.q, goal, pct, status, t, fire };
}

/** Seçili güne kadar kesintisiz tam gün sayısı (o gün tam değilse 0) */
function chainAt(key) {
  let n = 0, d = dateOf(key);
  while (dayInfo(keyOf(d)).status === 'perfect' && n < 3650) { n++; d = addDays(d, -1); }
  return n;
}

/* ---------------- ay takvimi ---------------- */
function calendar() {
  const m = month || new Date(dateOf(selDay).getFullYear(), dateOf(selDay).getMonth(), 1);
  const y = m.getFullYear(), mo = m.getMonth();
  const daysIn = new Date(y, mo + 1, 0).getDate();
  const lead = (new Date(y, mo, 1).getDay() + 6) % 7;          // Pazartesi başlar
  const today = todayKey();
  const cells = Array.from({ length: daysIn }, (_, i) => dayInfo(keyOf(new Date(y, mo, i + 1))));
  const now = new Date();
  const isCurrent = y === now.getFullYear() && mo === now.getMonth();

  // ay özeti: tam gün, en uzun zincir, ortalama, girilen gün
  const past = cells.filter(c => c.key <= today);
  let best = 0, run = 0;
  for (const c of cells) { run = c.status === 'perfect' ? run + 1 : 0; best = Math.max(best, run); }
  const perfect = past.filter(c => c.status === 'perfect').length;
  const logged = past.filter(c => c.q > 0).length;
  const avg = past.length ? Math.round(past.reduce((a, c) => a + c.pct, 0) / past.length) : 0;

  const grid = cells.map((c, i) => {
    const col = (lead + i) % 7;
    const next = cells[i + 1];
    const chainR = c.status === 'perfect' && next?.status === 'perfect' && col !== 6;
    const d = dateOf(c.key).getDate();
    return `
    <button type="button" class="cal-d ${c.status} ${c.key === selDay ? 'sel' : ''} ${c.key === today ? 'is-today' : ''} ${c.status !== 'future' && !editable(c.key) ? 'old' : ''}"
            data-day="${c.key}" ${c.status === 'future' ? 'disabled' : ''} style="--i:${(Math.floor((lead + i) / 7) + col)}"
            title="${fmtLongDay(c.key)}${c.goal ? ` · ${c.q}/${c.goal} soru` : ''}">
      ${chainR ? '<span class="cal-chain r"></span>' : ''}
      ${c.fire ? `<span class="flame f${c.fire}" title="Hedefin ${c.fire === 3 ? '2 katı' : 'çok üstü'}!"><i></i><i></i><i></i><i></i><em></em><em></em>${c.fire === 3 ? '<em></em>' : ''}</span>` : ''}
      ${c.status === 'perfect' ? `<span class="cal-star" style="--sd:${(i % 5) * .45}s"><b>★</b><i>✦</i><i>★</i><i>✦</i></span>` : ''}
      <span class="cal-top"><em>${c.status === 'partial' ? '%' + c.pct : ''}</em></span>
      <b>${d}</b>
      <span class="cal-goal">${c.status === 'future' || !c.goal ? '' : `${c.q}<i>/${c.goal}</i>`}</span>
      <span class="cal-bar"><i style="width:${c.pct}%"></i></span>
    </button>`;
  }).join('');

  return `
  <div class="cal">
    <div class="cal-head">
      <button type="button" class="cal-nav" data-month="-1" aria-label="önceki ay">‹</button>
      <div class="cal-title"><small>Takvim</small><b>${MONTHS[mo]} ${y}</b></div>
      <button type="button" class="cal-nav" data-month="1" aria-label="sonraki ay" ${isCurrent ? 'disabled' : ''}>›</button>
    </div>
    <div class="cal-stats">
      <div><b>★ ${perfect}</b>tam gün</div>
      <div><b>🔗 ${best}</b>en uzun zincir</div>
      <div><b>%${avg}</b>ortalama</div>
      <div><b>${logged}/${past.length}</b>girilen gün</div>
    </div>
    <div class="cal-week">${DAY_SHORT.map(d => `<span>${d}</span>`).join('')}</div>
    <div class="cal-grid">${'<span></span>'.repeat(lead)}${grid}${'<span></span>'.repeat(42 - lead - daysIn)}</div>
    <div class="cal-legend">
      <span><i class="perfect"></i>Hedef tuttu</span><span><i class="partial"></i>Kısmen</span><span><i class="missed"></i>Boş geçti</span>
    </div>
  </div>`;
}

/* ---------------- seçili günün hedefleri ---------------- */
function subjectBox(s, key, ro = false) {
  const r = store.recOf(key, s.key);
  const own = r.d + r.y + r.b;
  const q = own + r.ct;
  const acc = own ? Math.round((r.d / own) * 100) : 0;
  const done = METRICS.filter(m => r[m.key] > 0);
  return `
  <button type="button" class="tbox ${q ? '' : 'empty'} ${ro ? 'ro' : ''}" ${ro ? 'disabled' : `data-subjbox="${s.key}"`} style="--c:${s.color};--i:${s.ink}">
    <span class="tbox-ico">${s.emoji}</span>
    <span class="tbox-main">
      <span class="tbox-name">${esc(shortName(s))}</span>
      ${q ? `
        <span class="tbox-q"><b>${q}</b> soru · <b>${fmtNet(netOf(r.d, r.y))}</b> net</span>
        <span class="tbox-tags">${done.map(m => `<i class="tg ${METRIC_TONE[m.key]}">${m.emoji} ${r[m.key]}</i>`).join('')}</span>`
      : '<span class="tbox-none">Girilmedi</span>'}
    </span>
    <span class="tbox-ring">${miniRing(acc, { size: 46, stroke: 5, color: s.ink, track: s.color + '55' })}<b>${own ? '%' + acc : '+'}</b></span>
  </button>`;
}

function dayPanel() {
  const info = dayInfo(selDay);
  const chain = chainAt(selDay);
  const isToday = selDay === todayKey();
  const canEdit = editable(selDay);
  return `
  <div class="dayp">
    <div class="dayp-head">
      <span class="dayp-ico">🎯</span>
      <div><b>${isToday ? 'Bugünün hedefleri' : 'Günün hedefleri'}</b><small>${fmtLongDay(selDay)}</small></div>
      ${isToday ? '' : '<button type="button" class="dayp-today" data-day-today>Bugüne dön</button>'}
    </div>
    <div class="dayp-sum">
      <span class="dayp-ring">${miniRing(info.pct, { size: 84, stroke: 9, color: '#C2427F', track: '#F6E4EE' })}<b>%${info.pct}</b></span>
      <div class="dayp-facts">
        <span class="dayp-q"><b>${info.q}</b> / ${info.goal || '–'} soru</span>
        ${info.status === 'perfect' ? '<span class="dayp-star">★ Tam gün</span>' : info.goal ? `<span class="dayp-left">Hedefe <b>${Math.max(0, info.goal - info.q)}</b> soru</span>` : ''}
        <span class="dayp-chain">🔗 Zincir: <b>${chain}</b> gün</span>
        <span class="dayp-net">${fmtNet(info.t.net)} net · ${info.t.d} doğru</span>
      </div>
    </div>
    <div class="dayp-boxes">${SUBJECTS.map(s => subjectBox(s, selDay, !canEdit)).join('')}</div>
    ${canEdit
      ? `<button type="button" class="btn-primary dayp-go" data-entry>✏️ ${isToday ? 'Bugünkü soruları gir' : 'Bu günün sorularını düzenle'}</button>`
      : '<div class="dayp-lock">🔒 1 haftadan eski günler düzenlenemez</div>'}
  </div>`;
}

/* ---------------- soru girişi drawer'ı (seçili gün) ---------------- */
function bigStepper(day, subject, metric, value) {
  return `
  <div class="bstep ${METRIC_TONE[metric.key]}">
    <span class="bstep-lbl">${metric.emoji} ${esc(metric.label)}</span>
    <div class="bstep-row">
      <button type="button" data-act="dec" data-k="${day}" data-s="${subject}" data-m="${metric.key}" aria-label="azalt">−</button>
      <input type="number" inputmode="numeric" min="0" max="9999" value="${value}"
             data-k="${day}" data-s="${subject}" data-m="${metric.key}" aria-label="${esc(metric.label)}">
      <button type="button" data-act="inc" data-k="${day}" data-s="${subject}" data-m="${metric.key}" aria-label="artır">+</button>
    </div>
    <div class="bstep-quick">
      <button type="button" data-act="add5" data-k="${day}" data-s="${subject}" data-m="${metric.key}">+5</button>
      <button type="button" data-act="add10" data-k="${day}" data-s="${subject}" data-m="${metric.key}">+10</button>
    </div>
  </div>`;
}

const subjQ = (day, key) => { const r = store.recOf(day, key); return r.d + r.y + r.b + r.ct; };

/** Ders seçim kutuları (iki satır): ad + o günkü soru */
const subjSwitch = (day, active) => SUBJECTS.map(x => {
  const q = subjQ(day, x.key);
  return `
  <button type="button" class="ssw-b ${x.key === active ? 'on' : ''} ${q ? 'has' : ''}" data-subjtab="${x.key}" style="--c:${x.color};--i:${x.ink}">
    <span class="ssw-e">${x.emoji}</span>
    <span class="ssw-n">${esc(shortName(x))}</span>
    <span class="ssw-q">${q ? q + ' soru' : '–'}</span>
  </button>`;
}).join('');

function drawerSummary(day, s) {
  const r = store.recOf(day, s.key);
  const own = r.d + r.y + r.b;
  return `
    <span><b>${own + r.ct}</b>soru</span>
    <span><b>${fmtNet(netOf(r.d, r.y))}</b>net</span>
    <span><b>${own ? '%' + Math.round((r.d / own) * 100) : '–'}</b>doğruluk</span>`;
}

function entryDrawer() {
  const day = drawer.day;
  const s = SUBJECTS.find(x => x.key === drawer.subj) || SUBJECTS[0];
  const r = store.recOf(day, s.key);
  const i = SUBJECTS.findIndex(x => x.key === s.key);
  const nx = SUBJECTS[i + 1];
  const isToday = day === todayKey();
  return `
  <div class="drawer-scrim" data-closedrawer></div>
  <aside class="drawer xdrawer sdrawer ${justOpened ? 'opening' : ''}" style="--c:${s.color};--i:${s.ink}"
         role="dialog" aria-modal="true" aria-label="Soru girişi">
    <div class="drawer-head">
      <span class="sdrawer-ico">✏️</span>
      <div class="drawer-title"><div class="book-name">${isToday ? 'Bugünkü soruların' : esc(fmtLongDay(day))}</div><div class="book-sub">Dersi seç, sayıları gir</div></div>
      <button type="button" class="drawer-x" data-closedrawer aria-label="kapat">✕</button>
    </div>
    <div class="drawer-body">
      <div class="ssw" data-ssw>${subjSwitch(day, s.key)}</div>
      <div class="sname"><span>${s.emoji}</span>${esc(s.name)}</div>
      <div class="bsteps">${METRICS.map(m => bigStepper(day, s.key, m, r[m.key])).join('')}</div>
      <p class="xt-hint">🧑‍🏫 Çözdürdüğün sorular da soru sayına eklenir ve iki kat puan kazandırır.</p>
    </div>
    <div class="xdrawer-foot">
      <div class="xprev" data-dsum>${drawerSummary(day, s)}</div>
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
  <div class="modal tmodal bmodal" role="dialog" aria-modal="true" aria-label="Rozetlerim">
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

/** Rütbeler penceresi: tüm rütbeler renkli zeminde, bulunduğun yer parlar */
function ranksModal() {
  const st = summarize(store.get());
  const lvl = levelInfo(st.xp);
  const cur = rankOf(lvl.level), nr = nextRank(lvl.level);
  const span = nr ? nr.min - cur.min : 1;
  const pct = nr ? Math.min(100, ((lvl.level - cur.min) / span) * 100) : 100;
  return `
  <div class="modal-scrim" data-closemodal></div>
  <div class="modal rmodal" role="dialog" aria-modal="true" aria-label="Rütbeler">
    <button type="button" class="drawer-x rmodal-x" data-closemodal aria-label="kapat">✕</button>
    <div class="rmodal-head">
      <div class="rmodal-cur">${rankEmblem(lvl.level, 120)}</div>
      <div>
        <small>Rütben</small>
        <b>${esc(cur.name)}</b>
        <span>Sv. ${lvl.level} · ${esc(lvl.title)}</span>
        ${nr ? `
          <div class="rmodal-bar"><i style="width:${pct}%"></i></div>
          <em>${esc(nr.name)} rütbesine <b>${nr.min - lvl.level}</b> seviye kaldı</em>` : '<em>En üst rütbedesin! 👑</em>'}
      </div>
    </div>
    <div class="rmodal-grid">${RANKS.map((r, i) => {
      const state = r === cur ? 'cur' : lvl.level >= r.min ? 'done' : 'locked';
      const to = RANKS[i + 1] ? `Sv. ${r.min}-${RANKS[i + 1].min - 1}` : `Sv. ${r.min}+`;
      return `
      <div class="rcell ${state}" style="--d:${i * 70}ms">
        ${state === 'cur' ? '<span class="rcell-here">Buradasın</span>' : ''}
        ${rankEmblem(r.min, 108)}
        <b>${esc(r.name)}</b>
        <span>${state === 'locked' ? `🔒 Sv. ${r.min}'de açılır` : state === 'done' ? `✓ ${to}` : to}</span>
      </div>`;
    }).join('')}</div>
  </div>`;
}

/* ---------------- öğrenci kutusu: profil + karolar + uyarı ---------------- */
function studentCard(state, st) {
  const lvl = levelInfo(st.xp);
  const kalan = daysBetween(new Date(), dateOf(state.examDate));
  const risk = streakRisk(state);
  const rk = rankOf(lvl.level), nr = nextRank(lvl.level);

  const states = allBadgeStates();
  const RANK = { diamond: 0, gold: 1, silver: 2, bronze: 3 };
  const earned = states.filter(x => x.has).sort((a, b) => RANK[a.b.rarity] - RANK[b.b.rarity]);
  const nextOne = states.filter(x => !x.has && x.isNext).sort((a, b) => b.ratio - a.ratio)[0];
  const giftList = state.gifts || [];
  const opened = store.openedMap(state);
  const won = unlockedGifts(giftList, st);
  const waiting = won.some(id => !opened[id]);

  const exams = state.exams || [];
  const ex = exams[exams.length - 1];
  const exNet = ex ? SUBJECTS.reduce((a, s) => a + netOf(ex.subjects[s.key]?.d, ex.subjects[s.key]?.y), 0) : 0;
  const prev = exams[exams.length - 2];
  const exDiff = ex && prev ? estimateScore(ex.subjects) - estimateScore(prev.subjects) : null;

  return `
  <div class="student">
    <div class="student-main">
      <div class="tprofile-cover" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <button type="button" class="tprofile-rank" data-modal="ranks" title="Rütbeleri gör">${rankEmblem(lvl.level, 150)}</button>
      <div class="tprofile-name">${esc(state.name || 'Öğrenci')}</div>
      <div class="tprofile-sub">Sv. ${lvl.level} · ${esc(lvl.title)}</div>
      <button type="button" class="tprofile-rankname" data-modal="ranks">${esc(rk.name)} rütbesi${nr ? ` · ${esc(nr.name)}'e ${nr.min - lvl.level} seviye` : ' · en üst rütbe'} ›</button>
      <div class="txp-line">
        <span class="txp-val"><span data-count="${st.xp}">${nf(st.xp)}</span> <small>XP</small></span>
        <span class="txp-lbl">Sv. ${lvl.level + 1}'e ${nf(lvl.need - lvl.into)}</span>
      </div>
      <span class="txp-bar"><i style="width:${lvl.pct}%"></i></span>
      <div class="tprofile-tiles">
        <div class="ttile ${risk.atRisk ? 'danger' : ''}" title="${risk.atRisk ? 'Serin tehlikede! Bugün en az 1 soru gir' : 'Üst üste çalıştığın gün'}"><span>🔥</span><b data-count="${st.streak}">${st.streak}</b>gün seri</div>
        <div class="ttile"><span>⏳</span><b ${kalan >= 0 ? `data-count="${kalan}"` : ''}>${kalan >= 0 ? kalan : '–'}</b>LGS'ye gün</div>
      </div>
    </div>
    <div class="student-side">
      <button type="button" class="stile tb" data-modal="badges">
        <span class="stile-ico">🏅</span>
        <span class="stile-main"><span class="stile-val"><b>${earned.length}</b>/${BADGES.length}</span><span class="stile-lbl">Rozetlerim</span>
          <span class="stile-sub">${nextOne ? `Sıradaki: ${esc(nextOne.b.name)}` : 'Hepsi toplandı!'}</span></span>
        <span class="stile-icos">${earned.slice(0, 3).map(x => `<i>${x.b.ico}</i>`).join('')}</span>
      </button>
      <button type="button" class="stile tg2 ${waiting ? 'waiting' : ''}" data-modal="gifts">
        <span class="stile-ico">🎁</span>
        <span class="stile-main"><span class="stile-val"><b>${won.length}</b>/${giftList.length}</span><span class="stile-lbl">Hediyelerim</span>
          <span class="stile-sub">${waiting ? '🎉 Açılmayı bekleyen var!' : giftList.length ? 'Kazanılacaklara bak' : 'Henüz hediye yok'}</span></span>
      </button>
      <button type="button" class="stile te" ${ex ? 'data-examdetail' : 'disabled'}>
        <span class="stile-ico">🏆</span>
        <span class="stile-main"><span class="stile-val"><b>${ex ? fmtNet(exNet) : '–'}</b>${ex ? ' net' : ''}</span><span class="stile-lbl">${ex ? esc(ex.name) : 'Son deneme'}</span>
          <span class="stile-sub">${ex ? `${estimateScore(ex.subjects)} puan${exDiff === null ? '' : ` · ${exDiff >= 0 ? '+' : ''}${exDiff}`}` : 'Henüz deneme yok'}</span></span>
      </button>
      <div id="warnSlot">${streakWarning(state, { compact: true })}</div>
    </div>
  </div>`;
}

/* ---------------- çalışma etkinliği ---------------- */
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
    ], labels, { height: 300, interactive: true })}
    <div class="tguide" hidden></div>
    <div class="ttip" hidden></div>
  </div>`;
}

/** Grafikte üzerine gelinen günün kutusu: toplamlar ve ders ders soru */
function dayTip(day) {
  const key = keyOf(day);
  const days = store.get().days;
  const t = dayTotals(days[key]);
  const goal = store.goalFor(key) || 0;
  const subj = SUBJECTS.map(s => {
    const r = days[key]?.[s.key];
    const q = r ? (r.d || 0) + (r.y || 0) + (r.b || 0) + (r.ct || 0) : 0;
    return { s, q, net: r ? netOf(r.d, r.y) : 0 };
  }).filter(x => x.q > 0);
  return `
    <div class="ttip-head"><b>${fmtShort(day)}</b> ${DAY_NAMES[day.getDay()]}${
      goal && t.q >= goal ? '<span class="ttip-goal">🎯 Hedef tuttu</span>' : ''}</div>
    ${t.q ? `
      <div class="ttip-big"><span><b>${t.q}</b>soru</span><span><b>${fmtNet(t.net)}</b>net</span>${
        goal ? `<span><b>%${Math.min(999, Math.round((t.q / goal) * 100))}</b>hedef</span>` : ''}</div>
      <div class="ttip-tags">
        <i class="tg ok">✅ ${t.d}</i><i class="tg bad">❌ ${t.y}</i>${t.b ? `<i class="tg mute">⚪ ${t.b}</i>` : ''}${t.ct ? `<i class="tg teach">🧑‍🏫 ${t.ct}</i>` : ''}
      </div>
      <ul class="ttip-subj">${subj.map(x => `
        <li style="--c:${x.s.color};--i:${x.s.ink}"><span>${x.s.emoji} ${esc(shortName(x.s))}</span><b>${x.q}</b><em>${fmtNet(x.net)} net</em></li>`).join('')}</ul>`
    : '<div class="ttip-none">Bu gün soru girilmemiş</div>'}`;
}

/* ---------------- ekran ---------------- */
export function render() {
  const state = store.get();
  const st = summarize(state);
  const anim = animateNext;
  animateNext = false;
  const html = `
  <div class="tdash2 ${anim ? 'anim' : ''}">
    <div class="trow">
      <div id="tActivity">${activity(state)}</div>
      <div id="tStudent">${studentCard(state, st)}</div>
    </div>
    <div class="trow trow-cal">
      <div id="tCal">${calendar()}</div>
      <div id="tDay">${dayPanel()}</div>
    </div>
  </div>
  <div id="tLayer" class="${modalFresh ? '' : 'calm'}">${drawer?.mode === 'entry' && editable(drawer.day) ? entryDrawer() : drawer?.mode === 'exam' ? examDrawer() : ''}${
    modal === 'badges' ? badgesModal() : modal === 'gifts' ? giftsModal() : modal === 'ranks' ? ranksModal() : ''}</div>`;
  justOpened = false;
  modalFresh = false;
  return html;
}

export function bind(root, ctx) {
  const $ = sel => root.querySelector(sel);

  const afterChange = () => {
    const key = todayKey();
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
  const softUpdate = (day, subject) => {
    const state = store.get();
    const st = summarize(state);
    const s = SUBJECTS.find(x => x.key === subject);
    if (s) {
      const ds = $('[data-dsum]');
      if (ds) ds.innerHTML = drawerSummary(day, s);
      const sw = $('[data-ssw]');
      if (sw) sw.innerHTML = subjSwitch(day, s.key);
    }
    $('#tStudent').innerHTML = studentCard(state, st);
    $('#tCal').innerHTML = calendar();
    $('#tDay').innerHTML = dayPanel();
    $('#tActivity').innerHTML = activity(state);
  };

  const open = next => { drawer = next; justOpened = true; ctx.rerender(); };

  root.addEventListener('click', e => {
    const t = e.target;
    // takvim: gün seç, ay değiştir
    const dayBtn = t.closest('[data-day]');
    if (dayBtn) { selDay = dayBtn.dataset.day; ctx.rerender(); return; }
    if (t.closest('[data-day-today]')) { selDay = todayKey(); month = null; ctx.rerender(); return; }
    const mb = t.closest('[data-month]');
    if (mb) {
      const base = month || new Date(dateOf(selDay).getFullYear(), dateOf(selDay).getMonth(), 1);
      month = new Date(base.getFullYear(), base.getMonth() + Number(mb.dataset.month), 1);
      const now = new Date();
      // ay değişince: bu aysa bugün, değilse ayın son günü seçili
      selDay = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth()
        ? todayKey() : keyOf(new Date(month.getFullYear(), month.getMonth() + 1, 0));
      ctx.rerender();
      return;
    }

    // seçili günün girişi
    const sb = t.closest('[data-subjbox]');
    if (sb && editable(selDay)) { open({ mode: 'entry', day: selDay, subj: sb.dataset.subjbox }); return; }
    if (t.closest('[data-entry]') && editable(selDay)) {
      const first = SUBJECTS.find(s => !subjQ(selDay, s.key)) || SUBJECTS[0];
      open({ mode: 'entry', day: selDay, subj: first.key });
      return;
    }
    if (t.closest('[data-examdetail]')) { open({ mode: 'exam' }); return; }
    const tabb = t.closest('[data-subjtab]');
    if (tabb) { drawer = { ...drawer, subj: tabb.dataset.subjtab }; ctx.rerender(); return; }
    if (t.closest('[data-closedrawer]')) { drawer = null; ctx.rerender(); return; }

    const md = t.closest('[data-modal]');
    if (md) {
      modal = md.dataset.modal;
      modalFresh = true;
      if (modal === 'gifts') gifts.resetMode();
      ctx.rerender();
      return;
    }
    if (t.closest('[data-closemodal]')) { modal = null; ctx.rerender(); return; }
    const bt = t.closest('[data-btab]');
    if (bt) { badgeTab = bt.dataset.btab; ctx.rerender(); return; }

    const btn = t.closest('button[data-act]');
    if (!btn) return;
    const { act, k, s, m } = btn.dataset;
    if (!editable(k)) { ctx.toast('🔒 1 haftadan eski günler düzenlenemez'); return; }
    const input = root.querySelector(`input[data-k="${k}"][data-s="${s}"][data-m="${m}"]`);
    const cur = clampInt(input.value);
    const step = { inc: 1, dec: -1, add5: 5, add10: 10 }[act] || 0;
    const next = Math.max(0, cur + step);
    input.value = next;
    store.setValue(k, s, m, next);
    softUpdate(k, s);
    afterChange();
  });

  // Çalışma etkinliği: üzerine gelinen günün kutusu (grafik yerinde tazelendiği için olaylar kökte)
  const showTip = (clientX, svg) => {
    const box = svg.closest('.tactivity');
    const tip = box.querySelector('.ttip'), guide = box.querySelector('.tguide');
    const rect = svg.getBoundingClientRect();
    const d = svg.dataset, W = +d.w, L = +d.l, R = +d.r, n = +d.n;
    const vx = ((clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((vx - L) / (W - L - R)) * (n - 1))));
    const day = addDays(new Date(), -(n - 1 - i));
    const px = ((L + (i / (n - 1)) * (W - L - R)) / W) * rect.width;
    const offX = rect.left - box.getBoundingClientRect().left;
    const offY = rect.top - box.getBoundingClientRect().top;
    guide.hidden = false;
    guide.style.left = `${offX + px}px`;
    guide.style.top = `${offY + (+d.t / +d.h) * rect.height}px`;
    guide.style.height = `${((+d.h - +d.t - +d.b) / +d.h) * rect.height}px`;
    if (tip.dataset.i !== String(i)) { tip.innerHTML = dayTip(day); tip.dataset.i = i; }
    tip.hidden = false;
    const tw = tip.offsetWidth, bw = box.clientWidth;
    let left = offX + px + 14;
    if (left + tw > bw - 8) left = offX + px - tw - 14;
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${offY + 8}px`;
  };
  const hideTip = () => {
    root.querySelectorAll('.tactivity .ttip, .tactivity .tguide').forEach(el => { el.hidden = true; });
  };
  root.addEventListener('mousemove', e => {
    const svg = e.target.closest?.('.tactivity svg.curves');
    if (svg) showTip(e.clientX, svg); else if (!e.target.closest?.('.tactivity .ttip')) hideTip();
  });
  root.addEventListener('mouseleave', hideTip);
  root.addEventListener('touchstart', e => {
    const svg = e.target.closest?.('.tactivity svg.curves');
    if (svg) showTip(e.touches[0].clientX, svg); else hideTip();
  }, { passive: true });

  // hediye penceresi açıkken sekme/kutu açma olayları hediye modülünde
  if (modal === 'gifts') gifts.bind(root, ctx);

  // animasyonlar bitince sınıf kalksın: yerinde tazelenen kutular yeniden zıplamasın
  const dash = root.querySelector('.tdash2.anim');
  if (dash) setTimeout(() => dash.classList.remove('anim'), 2600);

  // ilk girişte sayılar sıfırdan yukarı sayar
  if (dash && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.querySelectorAll('.tdash2 [data-count]').forEach((el, k) => {
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

  const writeInput = (input, final) => {
    const { k, s, m } = input.dataset;
    if (!editable(k)) return;
    if (final) input.value = clampInt(input.value);
    store.setValue(k, s, m, input.value);
    softUpdate(k, s);
    if (final) afterChange();
  };
  root.addEventListener('input', e => {
    const input = e.target.closest('input[data-k][data-s][data-m]');
    if (input) writeInput(input, false);
  });
  root.addEventListener('change', e => {
    const input = e.target.closest('input[data-k][data-s][data-m]');
    if (input) writeInput(input, true);
  });
  root.addEventListener('focusin', e => {
    if (e.target.matches('input[data-k][data-s][data-m]')) e.target.select();
  });
}
