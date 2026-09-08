// XP, seviye, seri ve rozet hesapları
import { SUBJECTS, LEVEL_TITLES, BADGES, xpForLevel } from './data.js';
import { keyOf, dateOf, addDays, todayKey, netOf } from './utils.js';

/** Bir günün toplamları */
export function dayTotals(day) {
  const t = { d:0, y:0, b:0, s:0, ct:0, q:0, net:0, subjects:0 };
  if (!day) return t;
  for (const s of SUBJECTS) {
    const r = day[s.key];
    if (!r) continue;
    const q = (r.d||0) + (r.y||0) + (r.b||0);
    if (q > 0 || r.s || r.ct) t.subjects++;
    t.d += r.d||0; t.y += r.y||0; t.b += r.b||0;
    t.s += r.s||0; t.ct += r.ct||0; t.q += q;
    t.net += netOf(r.d, r.y);
  }
  return t;
}

/** Gün "çalışılmış" mı? (en az 1 soru) */
const isActive = day => dayTotals(day).q > 0;

/** Bugüne kadar kesintisiz gün serisi. Bugün boşsa dünden itibaren sayar. */
export function currentStreak(days) {
  const today = new Date();
  let cursor = today;
  if (!isActive(days[keyOf(today)])) {
    cursor = addDays(today, -1);
    if (!isActive(days[keyOf(cursor)])) return 0;
  }
  let n = 0;
  while (isActive(days[keyOf(cursor)])) {
    n++;
    cursor = addDays(cursor, -1);
    if (n > 3650) break;
  }
  return n;
}

export function bestStreak(days) {
  const keys = Object.keys(days).filter(k => isActive(days[k])).sort();
  if (!keys.length) return 0;
  let best = 1, run = 1;
  for (let i = 1; i < keys.length; i++) {
    const diff = Math.round((dateOf(keys[i]) - dateOf(keys[i - 1])) / 86400000);
    run = diff === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/** Tüm zamanların özeti — rozet testleri ve istatistik ekranı bunu kullanır */
export function summarize(state) {
  const days = state.days;
  const per = {}; let totalQ = 0, totalD = 0, totalY = 0, totalB = 0, totalAsk = 0, totalTaught = 0;
  let bestDay = 0, bestAccuracy = 0, goalDays = 0, allSixDay = false, activeDays = 0;

  for (const key of Object.keys(days)) {
    const t = dayTotals(days[key]);
    if (t.q > 0) activeDays++;
    totalQ += t.q; totalD += t.d; totalY += t.y; totalB += t.b;
    totalAsk += t.s; totalTaught += t.ct;
    if (t.q > bestDay) bestDay = t.q;
    if (t.q >= 20) {
      const acc = (t.d / t.q) * 100;
      if (acc > bestAccuracy) bestAccuracy = acc;
    }
    if (t.q >= state.dailyGoal && state.dailyGoal > 0) goalDays++;
    if (t.subjects >= 6) allSixDay = true;
    for (const s of SUBJECTS) {
      const r = days[key][s.key];
      if (!r) continue;
      per[s.key] = (per[s.key] || 0) + (r.d||0) + (r.y||0) + (r.b||0);
    }
  }

  const books = state.books || [];
  let unitsTotal = 0, unitsDone = 0, booksFinished = 0;
  for (const b of books) {
    const done = (b.units || []).filter(u => u.done).length;
    unitsTotal += (b.units || []).length;
    unitsDone += done;
    if ((b.units || []).length > 0 && done === b.units.length) booksFinished++;
  }

  const stats = {
    totalQ, totalD, totalY, totalB, totalAsk, totalTaught,
    bookCount: books.length, unitsTotal, unitsDone, booksFinished,
    activeDays, bestDay, bestAccuracy, goalDays, allSixDay,
    perSubject: per,
    examCount: state.exams.length,
    streak: currentStreak(days),
    bestStreak: bestStreak(days),
    accuracy: totalD + totalY + totalB > 0 ? (totalD / (totalD + totalY + totalB)) * 100 : 0,
    avgPerActiveDay: activeDays ? totalQ / activeDays : 0,
  };
  return stats;
}

/** XP = toplam çözülen soru */
export function levelInfo(xp) {
  let lvl = 1;
  while (xp >= xpForLevel(lvl + 1) && lvl < 99) lvl++;
  const base = xpForLevel(lvl);
  const next = xpForLevel(lvl + 1);
  return {
    level: lvl,
    title: LEVEL_TITLES[Math.min(lvl - 1, LEVEL_TITLES.length - 1)],
    into: xp - base,
    need: next - base,
    pct: Math.min(100, ((xp - base) / (next - base)) * 100),
  };
}

export function earnedBadges(stats) {
  return BADGES.filter(b => {
    try { return b.test(stats); } catch { return false; }
  }).map(b => b.id);
}
