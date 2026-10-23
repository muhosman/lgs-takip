// Denemeler sayfasının analiz kartları. "Eksik" = yanlış + boş: ikisi de o konunun
// henüz oturmadığını gösterir. Son denemeler daha ağır basar (öncelik puanı).
import { SUBJECTS, SUBJ_MAP } from '../data.js';
import { netOf, fmtNet, fmtShort, dateOf, esc } from '../utils.js';
import { spark } from '../charts.js';

const DECAY = 0.7;   // bir önceki deneme, sonrakinin %70'i kadar sayılır
const topicKey = n => String(n).trim().toLocaleLowerCase('tr');
/** Konu kaydı { d, y, b }; eski kayıtlarda yalnız sayı vardı (= yanlış) */
export const rec = v => typeof v === 'number' ? { d: 0, y: v, b: 0 } : { d: v?.d || 0, y: v?.y || 0, b: v?.b || 0 };
const subj = (ex, key) => ({ d: 0, y: 0, b: 0, ...(ex.subjects?.[key] || {}) });
const inFilter = (filter, key) => filter === 'all' || filter === key;

/** Konu konu geçmiş: her konunun girildiği denemelerdeki d/y/b ve türetilen durum */
export function topicStats(exams, filter = 'all') {
  const n = exams.length, m = new Map();
  exams.forEach((ex, i) => {
    for (const [subject, list] of Object.entries(ex.topics || {})) {
      if (!SUBJ_MAP[subject] || !inFilter(filter, subject)) continue;
      for (const [name, v] of Object.entries(list)) {
        const k = subject + '|' + topicKey(name);
        const t = m.get(k) || { subject, name, pts: [] };
        t.pts.push({ i, date: ex.date, exam: ex.name, ...rec(v) });
        m.set(k, t);
      }
    }
  });
  return [...m.values()].map(t => {
    const y = t.pts.reduce((a, p) => a + p.y, 0);
    const b = t.pts.reduce((a, p) => a + p.b, 0);
    const d = t.pts.reduce((a, p) => a + p.d, 0);
    const eks = t.pts.map(p => p.y + p.b);
    const last = eks[eks.length - 1], prev = eks.length > 1 ? eks[eks.length - 2] : null;
    const score = t.pts.reduce((a, p) => a + (p.y + p.b) * DECAY ** (n - 1 - p.i), 0);
    const recent = eks.slice(-3);
    let status = 'yeni';
    if (prev !== null) status = last < prev ? 'better' : last > prev ? 'worse' : 'same';
    if (last === 0 && eks.some(e => e > 0)) status = 'fixed';
    else if (recent.length >= 3 && recent.every(e => e > 0) && status !== 'better') status = 'stuck';
    return { ...t, d, y, b, eks: y + b, last, prev, score, status, series: eks };
  }).filter(t => t.eks > 0);
}

const STATUS = {
  better: ['⬇ düzeliyor', 'good'],
  worse: ['⬆ artıyor', 'bad'],
  same: ['= aynı', ''],
  stuck: ['⚠ kalıcı eksik', 'bad'],
  fixed: ['✓ son denemede tam', 'good'],
  yeni: ['ilk kez', ''],
};
const tag = s => `<span class="xa-tag ${STATUS[s][1]}">${STATUS[s][0]}</span>`;
const dot = key => `<span class="wtop-dot" style="background:${SUBJ_MAP[key]?.color || '#ddd'}"></span>`;
const yb = (y, b) => `<span class="xa-yb"><b class="y">${y}</b> yanlış · <b class="b">${b}</b> boş</span>`;

/** Ders filtresi: tüm analiz kartları buna göre süzülür */
export function filterBar(filter) {
  const chip = (key, label) =>
    `<button type="button" class="xa-chip ${filter === key ? 'on' : ''}" data-xfilter="${key}">${label}</button>`;
  return `<div class="xa-filter" role="group" aria-label="Ders filtresi">
    ${chip('all', 'Tüm dersler')}${SUBJECTS.map(s => chip(s.key, `${s.emoji} ${esc(s.name)}`)).join('')}
  </div>`;
}

/** Önce çalışılacak konular: son denemelere ağırlık veren eksik puanı */
export function focusCard(topics) {
  const top = [...topics].filter(t => t.status !== 'fixed').sort((a, b) => b.score - a.score).slice(0, 6);
  return `<div class="card xa-card">
    <div class="card-title">🎯 Önce bunlara çalış</div>
    ${top.length ? `<ol class="xa-focus">${top.map(t => `
      <li>
        <div class="xa-focus-name">${dot(t.subject)}<span>${esc(t.name)}</span></div>
        <div class="xa-focus-meta">son: ${yb(t.pts.at(-1).y, t.pts.at(-1).b)} ${tag(t.status)}</div>
      </li>`).join('')}</ol>
      <p class="xa-note">Yanlış ve boş birlikte sayılır; son denemeler daha ağır basar.</p>`
    : '<p class="xa-empty">Denemeye konu konu yanlış ve boş girersen hangi konuya öncelik vermen gerektiği burada çıkar.</p>'}
  </div>`;
}

/** Ders ders son durum: net, değişim, eksik ve net gelişim çizgisi */
export function subjectCard(exams, filter) {
  const rows = SUBJECTS.filter(s => inFilter(filter, s.key)).map(s => {
    const all = exams.map(ex => subj(ex, s.key));
    const nets = all.map(r => netOf(r.d, r.y));
    const last = all.at(-1), net = nets.at(-1), prev = nets.length > 1 ? nets.at(-2) : null;
    const delta = prev === null ? null : net - prev;
    return `<tr>
      <td class="xa-sname">${s.emoji} ${esc(s.name)}</td>
      <td><b>${fmtNet(net)}</b><small>/${s.q}</small></td>
      <td class="${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}">${delta === null ? '–' : (delta > 0 ? '+' : delta < 0 ? '-' : '') + fmtNet(Math.abs(delta))}</td>
      <td>${last.d}</td><td class="y">${last.y}</td><td class="b">${last.b}</td>
      <td class="xa-spark">${spark(nets, { color: s.ink, min: 0, max: s.q })}</td>
    </tr>`;
  }).join('');
  return `<div class="card xa-card">
    <div class="card-title">📊 Ders ders son deneme</div>
    <div class="xa-scroll"><table class="xa-table">
      <thead><tr><th>Ders</th><th>Net</th><th>Değişim</th><th>D</th><th>Y</th><th>B</th><th>Net gelişimi</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>`;
}

/** Deneme deneme yanlış + boş sütunları (son 12 deneme) */
export function eksikCard(exams, filter) {
  const keys = SUBJECTS.filter(s => inFilter(filter, s.key)).map(s => s.key);
  const cols = exams.slice(-12).map(ex => {
    const y = keys.reduce((a, k) => a + subj(ex, k).y, 0);
    const b = keys.reduce((a, k) => a + subj(ex, k).b, 0);
    return { label: fmtShort(dateOf(ex.date)), name: ex.name, y, b };
  });
  const max = Math.max(1, ...cols.map(c => c.y + c.b));
  const first = cols[0], last = cols.at(-1);
  const change = cols.length > 1 ? (last.y + last.b) - (first.y + first.b) : null;
  return `<div class="card xa-card">
    <div class="card-title">📉 Deneme deneme eksik</div>
    <div class="xa-cols">${cols.map(c => `
      <div class="xa-col" title="${esc(c.name)}: ${c.y} yanlış, ${c.b} boş">
        <span class="xa-col-v">${c.y + c.b}</span>
        <span class="xa-col-bar">
          <i class="b" style="height:${(c.b / max) * 100}%"></i>
          <i class="y" style="height:${(c.y / max) * 100}%"></i>
        </span>
        <span class="xa-col-l">${esc(c.label)}</span>
      </div>`).join('')}
    </div>
    <div class="xa-legend"><span><i class="y"></i>yanlış</span><span><i class="b"></i>boş</span>
      ${change === null ? '' : `<em class="${change < 0 ? 'good' : change > 0 ? 'bad' : ''}">
        ${change < 0 ? `ilk denemeden bu yana ${-change} eksik azaldı` : change > 0 ? `ilk denemeden bu yana ${change} eksik arttı` : 'eksik sayısı aynı'}</em>`}
    </div>
  </div>`;
}

/** Son iki girişe göre düzelen ve artan konular */
export function changeCard(topics) {
  const moved = topics.filter(t => t.prev !== null && t.last !== t.prev);
  const better = moved.filter(t => t.last < t.prev).sort((a, b) => (b.prev - b.last) - (a.prev - a.last)).slice(0, 5);
  const worse = moved.filter(t => t.last > t.prev).sort((a, b) => (b.last - b.prev) - (a.last - a.prev)).slice(0, 5);
  const list = (arr, cls) => arr.length ? `<ul class="xa-move">${arr.map(t => `
    <li>${dot(t.subject)}<span class="xa-move-n">${esc(t.name)}</span><b class="${cls}">${t.prev} → ${t.last}</b></li>`).join('')}</ul>`
    : '<p class="xa-empty">Yok</p>';
  return `<div class="card xa-card">
    <div class="card-title">🔄 Son denemede değişenler</div>
    ${moved.length ? `<div class="xa-two">
      <div><div class="xa-sub good">✅ Düzelen</div>${list(better, 'good')}</div>
      <div><div class="xa-sub bad">⚠️ Artan</div>${list(worse, 'bad')}</div>
    </div>` : '<p class="xa-empty">Bir konu en az iki denemede girilince eksiklerinin artıp azaldığı burada görünür.</p>'}
  </div>`;
}

/** Tüm konular: toplam yanlış/boş, oran çubuğu, gelişim çizgisi ve durum */
export function topicTable(topics) {
  const rows = [...topics].sort((a, b) => b.score - a.score);
  const max = Math.max(1, ...rows.map(t => t.eks));
  return `<div class="card xa-card xa-wide">
    <div class="card-title">📚 Konu konu eksikler <small class="xa-count">${rows.length} konu</small></div>
    ${rows.length ? `<div class="xa-scroll"><table class="xa-table xa-topics">
      <thead><tr><th>Konu</th><th>Yanlış</th><th>Boş</th><th class="xa-barh">Toplam eksik</th><th>Gelişim</th><th>Durum</th></tr></thead>
      <tbody>${rows.map(t => `<tr>
        <td><div class="xa-tname">${dot(t.subject)}<span title="${esc(SUBJ_MAP[t.subject].name)}">${esc(t.name)}</span></div></td>
        <td class="y">${t.y}</td><td class="b">${t.b}</td>
        <td class="xa-barc"><span class="xa-split" title="${t.eks} eksik, ${t.pts.length} denemede">
          <i class="y" style="width:${(t.y / max) * 100}%"></i><i class="b" style="width:${(t.b / max) * 100}%"></i>
        </span><small>${t.pts.length} deneme</small></td>
        <td class="xa-spark">${t.series.length > 1 ? spark(t.series, { color: '#D64257', min: 0 }) : '<small>tek giriş</small>'}</td>
        <td>${tag(t.status)}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <p class="xa-note">Gelişim çizgisi konunun girildiği her denemedeki yanlış + boş sayısıdır; aşağı inmesi iyiye işaret.</p>`
    : '<p class="xa-empty">Bu derste henüz konu konu yanlış ya da boş girilmedi. Deneme girerken "Konulara göre gir" kısmını doldur.</p>'}
  </div>`;
}
