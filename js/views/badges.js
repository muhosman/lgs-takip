// "Rozetler" ekranı — özet, sıradakiler, filtreler, grup merdivenleri ve rozet detayı
import { BADGES, BADGE_GROUPS, RARITY } from '../data.js';
import * as store from '../store.js';
import { summarize, earnedBadges, streakRisk } from '../gamify.js';
import { esc } from '../utils.js';
import { ring } from '../charts.js';

// Ekran durumu: sekme değişse de son seçilen filtre ve grup kalsın
let filter = 'all';      // 'all' | 'earned' | 'next'
let group = 'all';       // 'all' | BADGE_GROUPS[].key

const nf = n => Number(n).toLocaleString('tr-TR');

/** Rozet durumu: kazanıldı mı, ilerleme, ve izindeki sıradaki rozet mi */
function badgeStates(st) {
  const earned = new Set(earnedBadges(st));
  const nextOfTrack = new Set();
  const seenTrack = new Set();
  for (const b of BADGES) {                       // veri kolaydan zora sıralı
    if (!b.track || earned.has(b.id) || seenTrack.has(b.track)) continue;
    seenTrack.add(b.track);
    nextOfTrack.add(b.id);
  }
  // basamak: rozetin kendi dizisindeki sırası (ör. soru sayısı 3/22)
  const tracks = new Map();
  for (const b of BADGES) if (b.track) tracks.set(b.track, [...(tracks.get(b.track) || []), b.target]);
  return BADGES.map(b => {
    const has = earned.has(b.id);
    const [cur, target] = typeof b.progress === 'function' ? b.progress(st) : [has ? 1 : 0, 1];
    const list = b.track ? [...tracks.get(b.track)].sort((x, y) => x - y) : [1];
    const step = b.track ? list.indexOf(b.target) + 1 : 1;
    return {
      b, has, cur, target, ratio: target ? cur / target : 0,
      isNext: !b.track ? !has : nextOfTrack.has(b.id),
      step, steps: list.length, top: step === list.length,
    };
  });
}

/* ---------------- seri uyarısı ---------------- */
export function streakWarning(state, { compact = false } = {}) {
  const r = streakRisk(state);
  if (!r.atRisk && !r.goalAtRisk) return '';
  const late = new Date().getHours() >= 20;
  const lines = [];
  if (r.atRisk) {
    lines.push(`🔥 <b>${r.streak} günlük serin</b> tehlikede! Bugün en az 1 soru gir, seri bozulmasın.`);
  }
  if (r.goalAtRisk) {
    lines.push(`🎯 <b>${r.goalStreak} gündür</b> hedefini tutturuyorsun. Seri sürsün diye bugün <b>${r.goalLeft}</b> soru daha.`);
  }
  // sıradaki seri rozeti: kazanmak için bu seriyi sürdürmesi gerek
  if (!compact) {
    const st = summarize(state);
    const nextBadge = BADGES.find(b => b.live === 'streak' && !b.test(st));
    if (r.atRisk && nextBadge) {
      lines.push(`<span class="warn-sub">${nextBadge.ico} ${esc(nextBadge.name)} rozetine ${nextBadge.target - r.streak} gün kaldı</span>`);
    }
  }
  return `
  <div class="streak-warn ${late ? 'late' : ''}" role="status">
    <div class="streak-warn-ico">${late ? '⏰' : '⚠️'}</div>
    <div class="streak-warn-txt">${lines.join('<br>')}</div>
  </div>`;
}

/* ---------------- parçalar ---------------- */
/**
 * Rozet kartı (oyun rozeti görünümü): altıgen amblem, basamak numarası, ad, zorluk,
 * ilerleme, açıklama ve altta basamak şeridi. Rozetler sayfası ve Bugün penceresi kullanır.
 */
export function badgeCard(x, risk = {}) {
  const { b, has, cur, target, isNext, step, steps, top } = x;
  const state = has ? 'earned' : isNext ? 'next' : 'far';
  const pct = has ? 100 : Math.min(100, x.ratio * 100);
  const danger = !has && (b.live === 'streak' && risk.atRisk || b.live === 'curGoalStreak' && risk.goalAtRisk);
  const ribbon = has
    ? (top ? '<span class="bc-ribbon done">TAMAM</span>' : `<span class="bc-ribbon">BASAMAK ${step}/${steps}</span>`)
    : `<span class="bc-ribbon ${isNext ? '' : 'muted'}">BASAMAK ${step}/${steps}</span>`;
  return `
  <button type="button" class="bc ${state} r-${b.rarity} ${has && top ? 'crown' : ''} ${danger ? 'danger' : ''}" data-badge="${b.id}">
    <span class="bc-emblem">
      ${has && top ? '<span class="bc-crown" aria-hidden="true">👑</span>' : ''}
      <span class="bc-hex"><span class="bc-hex-in"><span class="bc-ico ${has ? 'ba-' + b.anim.name : ''}" style="--bd:${b.anim.dur};--bdl:${b.anim.delay}">${b.ico}</span></span></span>
      ${steps > 1 ? `<span class="bc-step">${step}</span>` : ''}
    </span>
    <span class="bc-name">${esc(b.name)}</span>
    <span class="bc-sub">${esc(RARITY[b.rarity] || '')}</span>
    ${has && top
      ? '<span class="bc-congrats">Tebrikler!<br>En üst basamağa ulaştın.</span>'
      : `<span class="bc-prog"><span class="bc-bar"><i style="width:${pct}%"></i></span><span class="bc-num">${has ? '✓' : nf(cur)}</span></span>
         <span class="bc-desc">${esc(b.desc)}${danger ? '<br><b>⚠️ Bugün çalışmazsan sıfırlanır</b>' : ''}</span>`}
    ${ribbon}
  </button>`;
}

const tile = (x, risk) => badgeCard(x, risk);

function groupCard(g, items, risk) {
  const got = items.filter(x => x.has).length;
  const all = BADGES.filter(b => b.group === g.key).length;
  return `
  <section class="bgroup">
    <div class="bgroup-head">
      <span class="bgroup-title">${g.emoji} ${esc(g.label)}</span>
      <span class="bgroup-count">${got}/${all}</span>
    </div>
    <span class="bgroup-bar"><i style="width:${all ? (got / all) * 100 : 0}%"></i></span>
    <div class="bcards">${items.map(x => tile(x, risk)).join('')}</div>
  </section>`;
}

function listHtml(states, risk) {
  let pool = states;
  if (group !== 'all') pool = pool.filter(x => x.b.group === group);

  if (filter === 'next') {
    // kazanmaya en yakınlar tek listede, oran sırasıyla
    const list = pool.filter(x => !x.has && x.isNext).sort((a, b) => b.ratio - a.ratio);
    return list.length
      ? `<div class="bgroup"><div class="bcards">${list.map(x => tile(x, risk)).join('')}</div></div>`
      : `<div class="card"><div class="empty"><div>🏆</div>Bu grupta kazanılacak rozet kalmadı!</div></div>`;
  }
  if (filter === 'earned') pool = pool.filter(x => x.has);

  const html = BADGE_GROUPS.map(g => {
    const items = pool.filter(x => x.b.group === g.key);
    return items.length ? groupCard(g, items, risk) : '';
  }).join('');
  return html || `<div class="card"><div class="empty"><div>🌱</div>Burada henüz rozet yok.<br>İlk soruyu çöz, ilk rozet gelsin!</div></div>`;
}

function chipsHtml(states) {
  const count = key => {
    const list = states.filter(x => key === 'all' || x.b.group === key);
    return `${list.filter(x => x.has).length}/${list.length}`;
  };
  return `
  <div class="bfilters" role="tablist">
    ${[['all', 'Tümü'], ['earned', 'Kazandıklarım'], ['next', 'Sıradakiler']].map(([k, l]) =>
      `<button type="button" class="seg ${filter === k ? 'on' : ''}" data-filter="${k}">${l}</button>`).join('')}
  </div>
  <div class="bchips">
    <button type="button" class="bchip ${group === 'all' ? 'on' : ''}" data-group="all">Hepsi <i>${count('all')}</i></button>
    ${BADGE_GROUPS.map(g => `
      <button type="button" class="bchip ${group === g.key ? 'on' : ''}" data-group="${g.key}">${g.emoji} ${esc(g.label)} <i>${count(g.key)}</i></button>`).join('')}
  </div>`;
}

function sheetHtml(x, risk) {
  const { b, has, cur, target } = x;
  const pct = Math.min(100, x.ratio * 100);
  const left = Math.max(0, target - cur);
  const danger = !has && (b.live === 'streak' && risk.atRisk || b.live === 'curGoalStreak' && risk.goalAtRisk);
  return `
  <div class="modal-scrim" data-closesheet></div>
  <div class="modal bsheet r-${b.rarity}" role="dialog" aria-modal="true" aria-label="${esc(b.name)}">
    <div class="modal-head">
      <span class="bsheet-rarity">${RARITY[b.rarity]}</span>
      <button type="button" class="drawer-x" data-closesheet aria-label="kapat">✕</button>
    </div>
    <div class="modal-body bsheet-body">
      <div class="bsheet-ico ${has ? '' : 'locked'}">${b.ico}</div>
      <div class="bsheet-name">${esc(b.name)}</div>
      <div class="bsheet-desc">${esc(b.desc)}</div>
      ${has
        ? '<div class="bsheet-state done">Kazandın ✓</div>'
        : typeof b.progress === 'function' ? `
          <span class="bsheet-bar"><i style="width:${pct}%"></i></span>
          <div class="bsheet-state">${nf(cur)}/${nf(target)} · <b>${nf(left)}</b> kaldı</div>
          ${b.live ? `<div class="bsheet-note">${b.live === 'streak' ? 'Şu an süren serin sayılır.' : 'Şu an süren hedef serin sayılır.'}</div>` : ''}
          ${danger ? '<div class="bsheet-warn">⚠️ Bugün çalışmazsan seri sıfırlanır!</div>' : ''}`
        : '<div class="bsheet-state">Henüz kazanılmadı</div>'}
    </div>
  </div>`;
}

/* ---------------- özet kartları (İstatistik de kullanır) ---------------- */
/** [halka + sıradaki rozetler] ve [kazandıkların] kartları */
export function summaryCards(states) {
  const got = states.filter(x => x.has).length;
  const next = states.filter(x => !x.has && x.isNext && typeof x.b.progress === 'function')
    .sort((a, b) => b.ratio - a.ratio).slice(0, 3);
  // kazanılanlar karışık: en değerli üstte, aynı zorlukta grup sırası
  const RANK = { diamond: 0, gold: 1, silver: 2, bronze: 3 };
  const won = states.filter(x => x.has).sort((a, b) => RANK[a.b.rarity] - RANK[b.b.rarity]);

  return `
  <div class="card bhero">
    <div class="ring bhero-ring">
      ${ring((got / BADGES.length) * 100)}
      <div class="ring-txt">
        <div class="ring-num">${got}</div>
        <div class="ring-lbl">/ ${BADGES.length}</div>
      </div>
    </div>
    <div class="bhero-next">
      <div class="bhero-title">Sıradaki rozetler</div>
      ${next.length ? next.map(x => `
        <button type="button" class="bnext" data-badge="${x.b.id}">
          <span class="bnext-ico">${x.b.ico}</span>
          <span class="bnext-main">
            <span class="bnext-name">${esc(x.b.name)}</span>
            <span class="bt-bar"><i style="width:${Math.min(100, x.ratio * 100)}%"></i></span>
          </span>
          <span class="bnext-num">${nf(x.cur)}/${nf(x.target)}</span>
        </button>`).join('') : '<div class="hint" style="text-align:left">Hepsini topladın, efsanesin! 🦄</div>'}
    </div>
  </div>
    <div class="card bhero-won">
      <div class="bhero-title">Kazandıkların <i>${won.length}</i></div>
      ${won.length ? `
        <div class="bwon-list">${won.map(x => `
          <button type="button" class="bwon r-${x.b.rarity}" data-badge="${x.b.id}" title="${esc(x.b.desc)}">
            <span class="bwon-ico">${x.b.ico}</span>
            <span class="bwon-name">${esc(x.b.name)}</span>
          </button>`).join('')}
        </div>` : '<div class="hint" style="text-align:left">İlk soruyu çöz, ilk rozet gelsin 🌱</div>'}
    </div>
`;
}

/** Tek rozetin detay penceresi (İstatistik'ten de açılır) */
export function badgeSheetHtml(id) {
  const state = store.get();
  const x = badgeStates(summarize(state)).find(s => s.b.id === id);
  return x ? sheetHtml(x, streakRisk(state)) : '';
}

export const allBadgeStates = () => badgeStates(summarize(store.get()));

/* ---------------- ekran ---------------- */
export function render() {
  const state = store.get();
  const st = summarize(state);
  const states = badgeStates(st);
  const risk = streakRisk(state);
  const warn = streakWarning(state);

  return `
  <div class="btop ${warn ? 'has-warn' : ''}">
  ${summaryCards(states)}
    ${warn}
  </div>
  <div id="bControls">${chipsHtml(states)}</div>
  <div id="bList">${listHtml(states, risk)}</div>
  <div id="bSheet"></div>
  <p class="hint">Rozetin çerçevesi zorluğunu gösterir: bronz, gümüş, altın, elmas 💎</p>`;
}

export function bind(root) {
  const refresh = () => {
    const state = store.get();
    const states = badgeStates(summarize(state));
    root.querySelector('#bControls').innerHTML = chipsHtml(states);
    root.querySelector('#bList').innerHTML = listHtml(states, streakRisk(state));
  };

  const closeSheet = () => {
    root.querySelector('#bSheet').innerHTML = '';
    document.body.classList.remove('modal-open');
  };

  root.addEventListener('click', e => {
    const f = e.target.closest('[data-filter]');
    if (f) { filter = f.dataset.filter; refresh(); return; }

    const g = e.target.closest('[data-group]');
    if (g) {
      group = g.dataset.group;
      refresh();
      root.querySelector(`[data-group="${group}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      return;
    }

    if (e.target.closest('[data-closesheet]')) { closeSheet(); return; }

    const bt = e.target.closest('[data-badge]');
    if (bt) {
      const html = badgeSheetHtml(bt.dataset.badge);
      if (!html) return;
      root.querySelector('#bSheet').innerHTML = html;
      document.body.classList.add('modal-open');
    }
  });

  root.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
}
