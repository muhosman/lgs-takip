// XP, seviye, seri ve rozet hesapları
import { SUBJECTS, LEVEL_TITLES, BADGES, xpForLevel, XP_PER_OWN, XP_PER_TAUGHT, LEARNED_AT } from './data.js';
import { keyOf, dateOf, addDays, todayKey, netOf, goalOf, weekStart, estimateScore } from './utils.js';

/**
 * Bir günün toplamları.
 *  own = kendi çözdüğü (doğru + yanlış + boş)
 *  ct  = çözdürdüğü
 *  q   = toplam soru (own + ct)
 *  xp  = kazanılan puan (çözdürdüğü ekstra puan getirir)
 */
export function dayTotals(day) {
  const t = { d:0, y:0, b:0, ct:0, own:0, q:0, xp:0, net:0, subjects:0 };
  if (!day) return t;
  for (const s of SUBJECTS) {
    const r = day[s.key];
    if (!r) continue;
    const own = (r.d||0) + (r.y||0) + (r.b||0);
    const ct = r.ct||0;
    if (own > 0 || ct > 0) t.subjects++;
    t.d += r.d||0; t.y += r.y||0; t.b += r.b||0;
    t.ct += ct; t.own += own; t.q += own + ct;
    t.xp += own * XP_PER_OWN + ct * XP_PER_TAUGHT;
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

/** O gün yürürlükteki hedef tutturuldu mu? */
const hitGoal = (state, key) => {
  const goal = goalOf(state, key);
  return goal > 0 && dayTotals(state.days[key]).q >= goal;
};

/** Bugüne kadar kesintisiz hedef serisi. Bugün henüz tutmadıysa dünden itibaren sayar. */
export function currentGoalStreak(state) {
  let cursor = new Date();
  if (!hitGoal(state, keyOf(cursor))) cursor = addDays(cursor, -1);
  let n = 0;
  while (hitGoal(state, keyOf(cursor))) {
    n++;
    cursor = addDays(cursor, -1);
    if (n > 3650) break;
  }
  return n;
}

/**
 * Seri uyarısı: bugün çalışılmadıysa süren seri gece yarısı bozulur;
 * bugün hedef tutmadıysa süren hedef serisi bozulur.
 */
export function streakRisk(state) {
  const key = todayKey();
  const t = dayTotals(state.days[key]);
  const goal = goalOf(state, key);
  const streak = currentStreak(state.days);
  const goalStreak = currentGoalStreak(state);
  return {
    streak, goalStreak, todayQ: t.q, goal,
    atRisk: streak > 0 && t.q === 0,
    goalAtRisk: goalStreak > 0 && goal > 0 && t.q < goal,
    goalLeft: Math.max(0, goal - t.q),
  };
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

/**
 * Hafta / ay toplamları ve hedef serisi — sıralı bir geçiş ister, bu yüzden
 * ana döngüden ayrı. Sene boyu kazanılan rozetlerin dayandığı ölçütler.
 */
function periodStats(state, days) {
  const keys = Object.keys(days).sort();
  const byWeek = new Map(), byMonth = new Map();
  let bestGoalStreak = 0, run = 0, prevKey = null;

  for (const key of keys) {
    const t = dayTotals(days[key]);
    const d = dateOf(key);

    if (t.q > 0) {
      const wk = keyOf(weekStart(d));
      const mo = key.slice(0, 7);
      byWeek.set(wk, (byWeek.get(wk) || 0) + t.q);
      byMonth.set(mo, (byMonth.get(mo) || 0) + t.q);
    }

    // Üst üste hedef tutturulan gün sayısı (arada boş gün kalırsa seri kopar)
    const goal = goalOf(state, key);
    const hit = goal > 0 && t.q >= goal;
    const consecutive = prevKey !== null && Math.round((d - dateOf(prevKey)) / 86400000) === 1;
    run = hit ? (consecutive ? run + 1 : 1) : 0;
    if (run > bestGoalStreak) bestGoalStreak = run;
    prevKey = key;
  }

  const weeks = [...byWeek.values()], months = [...byMonth.values()];
  return {
    bestWeek: weeks.length ? Math.max(...weeks) : 0,
    bestMonth: months.length ? Math.max(...months) : 0,
    activeWeeks: weeks.length,
    activeMonths: months.length,
    goalStreak: bestGoalStreak,
  };
}

/** Deneme rekorları — puan ve net */
function examStats(exams) {
  let bestScore = 0, bestNet = 0;
  for (const e of exams) {
    const per = e.subjects || {};
    let net = 0;
    for (const s of SUBJECTS) {
      const r = per[s.key];
      if (r) net += netOf(r.d, r.y);
    }
    if (net > bestNet) bestNet = net;
    const score = estimateScore(per);
    if (score > bestScore) bestScore = score;
  }
  return { bestScore, bestNet };
}

/** Tüm zamanların özeti — rozet testleri ve istatistik ekranı bunu kullanır */
export function summarize(state) {
  const days = state.days;
  const per = {};
  let totalQ = 0, totalOwn = 0, totalD = 0, totalY = 0, totalB = 0, totalTaught = 0, totalXp = 0;
  let bestDay = 0, bestAccuracy = 0, goalDays = 0, allSixDay = false, activeDays = 0;
  let bestWeekendDay = 0, sixSubjectDays = 0;

  for (const key of Object.keys(days)) {
    const t = dayTotals(days[key]);
    if (t.q > 0) activeDays++;
    if (t.q > bestWeekendDay && [0, 6].includes(dateOf(key).getDay())) bestWeekendDay = t.q;
    totalQ += t.q; totalOwn += t.own; totalD += t.d; totalY += t.y; totalB += t.b;
    totalTaught += t.ct; totalXp += t.xp;
    if (t.q > bestDay) bestDay = t.q;
    if (t.own >= 20) {
      const acc = (t.d / t.own) * 100;
      if (acc > bestAccuracy) bestAccuracy = acc;
    }
    const goal = goalOf(state, key);   // o gün yürürlükte olan hedef
    if (goal > 0 && t.q >= goal) goalDays++;
    if (t.subjects >= 6) { allSixDay = true; sixSubjectDays++; }
    for (const s of SUBJECTS) {
      const r = days[key][s.key];
      if (!r) continue;
      per[s.key] = (per[s.key] || 0) + (r.d||0) + (r.y||0) + (r.b||0) + (r.ct||0);
    }
  }

  const period = periodStats(state, days);
  const exam = examStats(state.exams || []);

  const books = state.books || [];
  let unitsTotal = 0, unitsDone = 0, booksFinished = 0;
  for (const b of books) {
    const done = (b.units || []).filter(u => u.done).length;
    unitsTotal += (b.units || []).length;
    unitsDone += done;
    if ((b.units || []).length > 0 && done === b.units.length) booksFinished++;
  }

  const stats = {
    totalQ, totalOwn, totalD, totalY, totalB, totalTaught, xp: totalXp,
    bookCount: books.length, unitsTotal, unitsDone, booksFinished,
    activeDays, bestDay, bestAccuracy, goalDays, allSixDay,
    bestWeekendDay, sixSubjectDays,
    ...period,                          // bestWeek, bestMonth, activeWeeks, activeMonths, goalStreak
    bestExamScore: exam.bestScore,
    bestExamNet: exam.bestNet,
    perSubject: per,
    examCount: state.exams.length,
    streak: currentStreak(days),
    bestStreak: bestStreak(days),
    curGoalStreak: currentGoalStreak(state),
    level: levelInfo(totalXp).level,
    wordsAdded: (state.words || []).length,
    wordsLearned: (state.words || []).filter(w => (w.ticks || 0) >= LEARNED_AT).length,
    accuracy: totalOwn > 0 ? (totalD / totalOwn) * 100 : 0,
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

/* ---------------- hediyeler ---------------- */

const GIFT_VALUE = {
  net:       st => st.bestExamNet,
  score:     st => st.bestExamScore,
  level:     st => levelInfo(st.xp).level,
  questions: st => st.totalQ,
  streak:    st => st.bestStreak,
  badges:    st => earnedBadges(st).length,
  // elmas: her rozet dizisinin en zoru (data.js'te rarity)
  diamond:   st => { const won = new Set(earnedBadges(st)); return BADGES.filter(b => b.rarity === 'diamond' && won.has(b.id)).length; },
};

/** Hediyenin ilerlemesi: { cur, target, unlocked }. Net kesirli, küçük pay bırakılır. */
export function giftProgress(gift, stats) {
  const fn = GIFT_VALUE[gift.kind];
  const cur = fn ? fn(stats) || 0 : 0;
  const target = gift.target || 0;
  return { cur, target, unlocked: target > 0 && cur + 1e-9 >= target };
}

export const unlockedGifts = (gifts, stats) =>
  (gifts || []).filter(g => giftProgress(g, stats).unlocked).map(g => g.id);

export function earnedBadges(stats) {
  return BADGES.filter(b => {
    try { return b.test(stats); } catch { return false; }
  }).map(b => b.id);
}
