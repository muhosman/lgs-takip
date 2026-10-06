// "İstatistik" ekranı — resimli KPI kartları, grafikler, ders analizi, haftanın günleri,
// deneme/kelime/kitap özeti ve oyun sahnesinde rozetler
import { SUBJECTS, BADGES } from '../data.js';
import * as store from '../store.js';
import { summarize, dayTotals, levelInfo } from '../gamify.js';
import { badgeCard, badgeSheetHtml, allBadgeStates } from './badges.js';
import { keyOf, addDays, netOf, fmtNet, DAY_SHORT, esc, dateOf, estimateScore, fmtShort, todayKey } from '../utils.js';
import { bars, donut, line } from '../charts.js';
import { icon } from '../icons.js';
import { streakRisk } from '../gamify.js';

const nf = n => Number(n).toLocaleString('tr-TR');

function last14(days) {
  const out = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    const t = dayTotals(days[keyOf(d)]);
    out.push({ label: DAY_SHORT[(d.getDay() + 6) % 7], value: t.q });
  }
  return out;
}

function subjectStats(days) {
  const acc = Object.fromEntries(SUBJECTS.map(s => [s.key, { d: 0, y: 0, b: 0, q: 0 }]));
  for (const k of Object.keys(days)) {
    for (const s of SUBJECTS) {
      const r = days[k][s.key];
      if (!r) continue;
      acc[s.key].d += r.d || 0; acc[s.key].y += r.y || 0; acc[s.key].b += r.b || 0;
      acc[s.key].q += (r.d || 0) + (r.y || 0) + (r.b || 0) + (r.ct || 0);
    }
  }
  return acc;
}

/** Haftanın günlerine göre ortalama soru (yalnız çalışılan günler) */
function weekdays(days) {
  const sum = Array(7).fill(0), cnt = Array(7).fill(0);
  for (const k of Object.keys(days)) {
    const q = dayTotals(days[k]).q;
    if (!q) continue;
    const wd = (dateOf(k).getDay() + 6) % 7;
    sum[wd] += q; cnt[wd]++;
  }
  return DAY_SHORT.map((label, i) => ({ label, value: cnt[i] ? Math.round(sum[i] / cnt[i]) : 0 }));
}

const kpi = (ic, val, lbl, tone, sub = '') => `
  <div class="sk ${tone}">
    <span class="sk-ic">${icon(ic, 46)}</span>
    <span class="sk-main"><b>${val}</b><span>${lbl}</span>${sub ? `<em>${sub}</em>` : ''}</span>
  </div>`;

const panel = (ic, title, body, cls = '') => `
  <section class="sp ${cls}">
    <div class="sp-head"><span class="sp-ic">${icon(ic, 30)}</span><h3>${title}</h3></div>
    ${body}
  </section>`;

/* ---------------- rozet sahnesi ---------------- */
function badgeStage() {
  const states = allBadgeStates();
  const risk = streakRisk(store.get());
  const RANK = { diamond: 0, gold: 1, silver: 2, bronze: 3 };
  const earned = states.filter(x => x.has).sort((a, b) => RANK[a.b.rarity] - RANK[b.b.rarity]);
  const next = states.filter(x => !x.has && x.isNext).sort((a, b) => b.ratio - a.ratio);
  const counts = { diamond: 0, gold: 0, silver: 0, bronze: 0 };
  earned.forEach(x => counts[x.b.rarity]++);
  return `
  <section class="bdark sbadges">
    <div class="sb-head">
      <span class="sb-ic">${icon('medal', 52)}</span>
      <div class="sb-title"><small>Rozetlerin</small><b>${earned.length}<i>/${BADGES.length}</i></b></div>
      <div class="sb-rar">
        <span class="r-diamond">💎 ${counts.diamond}<small>elmas</small></span>
        <span class="r-gold">🥇 ${counts.gold}<small>altın</small></span>
        <span class="r-silver">🥈 ${counts.silver}<small>gümüş</small></span>
        <span class="r-bronze">🥉 ${counts.bronze}<small>bronz</small></span>
      </div>
      <button type="button" class="sb-all" data-goto="badges">Tümü →</button>
    </div>
    <div class="sb-sec">🏆 En değerli kazandıkların</div>
    ${earned.length ? `<div class="bcards sb-row">${earned.slice(0, 6).map(x => badgeCard(x, risk)).join('')}</div>`
      : '<p class="sb-empty">İlk soruyu çöz, ilk rozet gelsin 🌱</p>'}
    <div class="sb-sec">🎯 Kazanmaya en yakın</div>
    <div class="bcards sb-row">${next.slice(0, 6).map(x => badgeCard(x, risk)).join('')}</div>
  </section>`;
}

/* ---------------- ekran ---------------- */
export function render() {
  const state = store.get();
  const st = summarize(state);
  const acc = subjectStats(state.days);
  const trend = last14(state.days);
  const wd = weekdays(state.days);
  const bestWd = wd.reduce((a, b) => (b.value > a.value ? b : a), wd[0]);
  const hasData = st.totalQ > 0;
  const lvl = levelInfo(st.xp);

  // hedef tutma oranı: ilk kayıttan bugüne kadar geçen günlere göre
  const keys = Object.keys(state.days).filter(k => dayTotals(state.days[k]).q > 0).sort();
  const span = keys.length ? Math.round((dateOf(todayKey()) - dateOf(keys[0])) / 86400000) + 1 : 0;
  const hitRate = span ? Math.round((st.goalDays / span) * 100) : 0;

  const exams = state.exams || [];
  const examTrend = exams.map(e => ({ label: fmtShort(dateOf(e.date)), value: estimateScore(e.subjects) }));
  const words = state.words || [];

  const subjRows = SUBJECTS.map(s => {
    const a = acc[s.key];
    const own = a.d + a.y + a.b;
    const rate = own ? Math.round((a.d / own) * 100) : 0;
    return { s, a, rate, net: netOf(a.d, a.y) };
  });
  const maxQ = Math.max(1, ...subjRows.map(x => x.a.q));
  const weak = subjRows.filter(x => x.a.q >= 10).sort((a, b) => a.rate - b.rate)[0];

  if (!hasData) {
    return `<div class="spage">
      <div class="sp sp-empty">${icon('chart', 90)}<b>Henüz soru kaydın yok</b><span>Bugün birkaç soru çöz, grafikler burada canlansın! 🌸</span></div>
      ${badgeStage()}
      <div id="sSheet"></div></div>`;
  }

  return `
  <div class="spage">
    <div class="sks">
      ${kpi('books', nf(st.totalQ), 'toplam soru', 'pink', `${nf(st.totalOwn)} kendi · ${nf(st.totalTaught)} çözdürme`)}
      ${kpi('target', fmtNet(netOf(st.totalD, st.totalY)), 'toplam net', 'red')}
      ${kpi('check', '%' + Math.round(st.accuracy), 'doğruluk', 'green', `${nf(st.totalD)} doğru`)}
      ${kpi('calendar', st.activeDays, 'çalışılan gün', 'violet', `hedef tutma %${hitRate}`)}
      ${kpi('clock', Math.round(st.avgPerActiveDay), 'günlük ortalama', 'blue', `en yoğun ${st.bestDay}`)}
      ${kpi('fire', st.bestStreak, 'en uzun seri', 'orange', `şu an ${st.streak} gün`)}
    </div>

    ${weak ? `
    <div class="sfocus">
      <span>${icon('target', 40)}</span>
      <div><b>Odaklanman gereken ders: ${weak.s.emoji} ${esc(weak.s.name)}</b>
      <p>Bu derste doğruluk oranın <b>%${weak.rate}</b>. Biraz daha soru çözersen ortalaman ciddi şekilde yükselir 💪</p></div>
    </div>` : ''}

    <div class="sgrid">
      ${panel('chart', 'Son 14 gün', bars(trend, { height: 170, color: '#C2427F' }))}
      ${panel('star', 'Haftanın günleri', `
        ${bars(wd.map(x => ({ ...x, color: x === bestWd ? '#F7A11C' : '#B79CFF' })), { height: 150 })}
        <p class="sp-note">En verimli günün <b>${esc(bestWd.label)}</b> · ortalama ${bestWd.value} soru</p>`)}
    </div>

    <div class="sgrid s3">
      ${panel('books', 'Ders ders', `
        <ul class="ssub">${subjRows.map(x => `
          <li style="--c:${x.s.color};--i:${x.s.ink}">
            <span class="ssub-ico">${x.s.emoji}</span>
            <span class="ssub-main">
              <span class="ssub-name">${esc(x.s.name)}</span>
              <span class="ssub-bar"><i style="width:${(x.a.q / maxQ) * 100}%"></i></span>
            </span>
            <span class="ssub-num"><b>${nf(x.a.q)}</b>soru</span>
            <span class="ssub-num"><b>%${x.rate}</b>doğru</span>
          </li>`).join('')}</ul>`, 'span2')}
      ${panel('check', 'Doğru / Yanlış / Boş', `
        <div class="sdonut">${donut([
          { label: 'Doğru', value: st.totalD, color: '#3FBF8F' },
          { label: 'Yanlış', value: st.totalY, color: '#FF7A8A' },
          { label: 'Boş', value: st.totalB, color: '#CFC4DA' },
        ])}</div>
        <div class="legend">
          <span><i style="background:#3FBF8F"></i>Doğru ${nf(st.totalD)}</span>
          <span><i style="background:#FF7A8A"></i>Yanlış ${nf(st.totalY)}</span>
          <span><i style="background:#CFC4DA"></i>Boş ${nf(st.totalB)}</span>
        </div>`)}
    </div>

    <div class="sgrid s3">
      ${panel('trophy', 'Denemeler', exams.length ? `
        <div class="smini"><span><b>${exams.length}</b>deneme</span><span><b>${fmtNet(st.bestExamNet)}</b>en iyi net</span><span><b>${st.bestExamScore}</b>en iyi puan</span></div>
        ${examTrend.length > 1 ? line(examTrend, { min: 100, max: 500, height: 120 }) : ''}`
        : '<p class="sp-note">Henüz deneme yok.</p>')}
      ${panel('brain', 'İngilizce kelimeler', `
        <div class="smini"><span><b>${words.length}</b>kelime</span><span><b>${st.wordsLearned}</b>öğrenildi</span></div>
        <span class="sbar"><i style="width:${words.length ? (st.wordsLearned / words.length) * 100 : 0}%"></i></span>
        <p class="sp-note">Her kelime 5 kez doğru bilinince öğrenilmiş sayılır.</p>`)}
      ${panel('rocket', 'Seviye ve kitaplar', `
        <div class="smini"><span><b>Sv. ${lvl.level}</b>${esc(lvl.title)}</span><span><b>${nf(st.xp)}</b>XP</span></div>
        <span class="sbar"><i style="width:${lvl.pct}%"></i></span>
        <div class="smini"><span><b>${st.bookCount}</b>kitap</span><span><b>${st.unitsDone}/${st.unitsTotal}</b>ünite</span><span><b>${st.booksFinished}</b>biten</span></div>`)}
    </div>

    ${badgeStage()}
  </div>
  <div id="sSheet"></div>`;
}

export function bind(root, ctx) {
  const sheet = root.querySelector('#sSheet');
  const close = () => { sheet.innerHTML = ''; document.body.classList.remove('modal-open'); };
  root.addEventListener('click', e => {
    const g = e.target.closest('[data-goto]');
    if (g) { ctx.go(g.dataset.goto); return; }
    if (e.target.closest('[data-closesheet]')) { close(); return; }
    const b = e.target.closest('[data-badge]');
    if (!b) return;
    const html = badgeSheetHtml(b.dataset.badge);
    if (!html) return;
    sheet.innerHTML = html;
    document.body.classList.add('modal-open');
  });
  root.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}
