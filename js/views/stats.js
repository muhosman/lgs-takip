// "İstatistik" ekranı — trend, ders dağılımı, doğruluk, rozetler
import { SUBJECTS, BADGES } from '../data.js';
import * as store from '../store.js';
import { summarize, dayTotals, earnedBadges } from '../gamify.js';
import { keyOf, addDays, netOf, fmtNet, DAY_SHORT, esc } from '../utils.js';
import { bars, donut } from '../charts.js';

function last14(days) {
  const out = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    const t = dayTotals(days[keyOf(d)]);
    out.push({ label: DAY_SHORT[(d.getDay() + 6) % 7], value: t.q });
  }
  return out;
}

function subjectNets(days) {
  const acc = Object.fromEntries(SUBJECTS.map(s => [s.key, { d: 0, y: 0, q: 0 }]));
  for (const k of Object.keys(days)) {
    for (const s of SUBJECTS) {
      const r = days[k][s.key];
      if (!r) continue;
      acc[s.key].d += r.d || 0;
      acc[s.key].y += r.y || 0;
      acc[s.key].q += (r.d || 0) + (r.y || 0) + (r.b || 0);
    }
  }
  return acc;
}

function weakest(acc) {
  const scored = SUBJECTS
    .map(s => ({ s, ...acc[s.key], rate: acc[s.key].q ? (acc[s.key].d / acc[s.key].q) * 100 : null }))
    .filter(x => x.q >= 10);
  if (!scored.length) return null;
  scored.sort((a, b) => a.rate - b.rate);
  return scored[0];
}

export function render() {
  const state = store.get();
  const st = summarize(state);
  const acc = subjectNets(state.days);
  const weak = weakest(acc);
  const trend = last14(state.days);
  const hasData = st.totalQ > 0;

  const earned = new Set(earnedBadges(st));

  // Rozetler soru verisi olmasa da görünmeli: kitap rozetleri buradan kazanılıyor.
  const badgeSection = `
  <div class="sec-title">Rozetlerin (${earned.size}/${BADGES.length})</div>
  <div class="badges">
    ${BADGES.map(b => `
      <div class="badge ${earned.has(b.id) ? '' : 'locked'}">
        <div class="badge-ico">${earned.has(b.id) ? b.ico : '🔒'}</div>
        <div class="badge-name">${esc(b.name)}</div>
        <div class="badge-desc">${esc(b.desc)}</div>
      </div>`).join('')}
  </div>`;

  if (!hasData) {
    return `<div class="card"><div class="empty"><div>📊</div>
      Henüz soru kaydın yok.<br>Bugün birkaç soru çöz, grafikler burada canlansın! 🌸</div></div>
      ${badgeSection}`;
  }

  return `
  <div class="stat-grid">
    <div class="stat-box"><div class="stat-val">${st.totalQ}</div><div class="stat-lbl">toplam soru</div></div>
    <div class="stat-box"><div class="stat-val">${fmtNet(netOf(st.totalD, st.totalY))}</div><div class="stat-lbl">toplam net</div></div>
    <div class="stat-box"><div class="stat-val">${Math.round(st.accuracy)}%</div><div class="stat-lbl">doğruluk</div></div>
    <div class="stat-box"><div class="stat-val">${st.activeDays}</div><div class="stat-lbl">çalışılan gün</div></div>
    <div class="stat-box"><div class="stat-val">${Math.round(st.avgPerActiveDay)}</div><div class="stat-lbl">günlük ortalama</div></div>
    <div class="stat-box"><div class="stat-val">${st.bestStreak}</div><div class="stat-lbl">en uzun seri</div></div>
  </div>

  ${weak ? `<div class="weak">
    <h4>🎯 Odaklanman gereken ders: ${esc(weak.s.name)}</h4>
    <p>Bu derste doğruluk oranın <b>%${Math.round(weak.rate)}</b>. Biraz daha soru çözersen ortalaman ciddi şekilde yükselir 💪</p>
  </div>` : ''}

  <div class="card">
    <div class="card-title">📈 Son 14 gün</div>
    ${bars(trend, { height: 155 })}
  </div>

  <div class="card">
    <div class="card-title">📚 Ders bazlı çözülen soru</div>
    ${bars(SUBJECTS.map(s => ({ label: s.name.split(' ')[0].slice(0, 6), value: acc[s.key].q, color: s.color })), { height: 165 })}
  </div>

  <div class="card" style="text-align:center">
    <div class="card-title" style="justify-content:center">🎯 Doğru / Yanlış / Boş</div>
    ${donut([
      { label: 'Doğru',  value: st.totalD, color: '#3FBF8F' },
      { label: 'Yanlış', value: st.totalY, color: '#FF7A8A' },
      { label: 'Boş',    value: st.totalB, color: '#CFC4DA' },
    ])}
    <div class="legend">
      <span><i style="background:#3FBF8F"></i>Doğru ${st.totalD}</span>
      <span><i style="background:#FF7A8A"></i>Yanlış ${st.totalY}</span>
      <span><i style="background:#CFC4DA"></i>Boş ${st.totalB}</span>
    </div>
  </div>

  ${st.bookCount ? `
  <div class="card">
    <div class="card-title">📚 Kitap ilerlemen</div>
    <div class="mini-stats" style="margin-top:0">
      <div class="mini-stat"><b>${st.bookCount}</b>kitap</div>
      <div class="mini-stat"><b>${st.unitsDone}/${st.unitsTotal}</b>ünite</div>
      <div class="mini-stat"><b>${st.booksFinished}</b>bitirilen</div>
    </div>
    <div class="pbar" style="margin-top:11px"><div class="pfill" style="width:${st.unitsTotal ? (st.unitsDone / st.unitsTotal) * 100 : 0}%"></div></div>
  </div>` : ''}

  <div class="card">
    <div class="card-title">🧑‍🏫 Ekstra</div>
    <div class="mini-stats">
      <div class="mini-stat"><b>${st.totalAsk}</b>sorulacak soru</div>
      <div class="mini-stat"><b>${st.totalTaught}</b>çözdürdüğüm soru</div>
      <div class="mini-stat"><b>${st.bestDay}</b>en yoğun gün</div>
      <div class="mini-stat"><b>${st.goalDays}</b>hedef tutturulan gün</div>
    </div>
  </div>

  ${badgeSection}`;
}

export function bind() { /* etkileşim yok */ }
