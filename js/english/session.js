// Üç kelime oyununun ortak motoru: kelime seçimi, tick yazımı, skor.
// Oyunlar yalnızca kendi ekranını çizer; sıralama ve puanlama buradan gelir.
import { LEARNED_AT } from '../data.js';
import * as store from '../store.js';

export const isLearned = w => (w.ticks || 0) >= LEARNED_AT;

/** Türlere göre süzülmüş kelime havuzu (tür listesi boşsa hepsi) */
export function pool(types = []) {
  const all = store.get().words || [];
  if (!types.length) return all.slice();
  const set = new Set(types);
  return all.filter(w => set.has(w.type));
}

/**
 * Bilinmeyen kelime daha sık çıksın: ağırlık = LEARNED_AT + 1 − tick.
 * Yeni kelime 6 puanla, öğrenilmiş kelime 1 puanla yarışır.
 */
const weightOf = w => Math.max(1, LEARNED_AT + 1 - Math.min(w.ticks || 0, LEARNED_AT));

/** Havuzdan ağırlıklı, tekrarsız n kelime seçer */
export function pick(list, n) {
  const rest = list.slice();
  const out = [];
  const count = Math.min(n, rest.length);

  for (let i = 0; i < count; i++) {
    const total = rest.reduce((a, w) => a + weightOf(w), 0);
    let r = Math.random() * total;
    let idx = rest.length - 1;
    for (let j = 0; j < rest.length; j++) {
      r -= weightOf(rest[j]);
      if (r <= 0) { idx = j; break; }
    }
    out.push(rest.splice(idx, 1)[0]);
  }
  return out;
}

/** Yerinde karıştırma (Fisher–Yates) */
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Bir oyun oturumu. Oyunlar `next()` ile ilerler, `answer()` ile sonucu bildirir;
 * tick yazımı ve skor burada tutulur.
 */
export function createSession({ types = [], count = 10, direction = 'mix', min = 1 } = {}) {
  const available = pool(types);
  const queue = pick(available, count);

  return {
    queue,
    index: 0,
    correct: 0,
    wrong: 0,
    /** Yeterli kelime var mı? */
    ready: queue.length >= min,
    available: available.length,
    get current() { return this.queue[this.index] || null; },
    get done() { return this.index >= this.queue.length; },
    get total() { return this.queue.length; },

    /** Bu soruda kelime İngilizce mi sorulsun? ('mix' ise kelime bazında rastgele) */
    asksEnglish(word) {
      if (direction === 'en') return true;
      if (direction === 'tr') return false;
      // karışık: aynı kelime için hep aynı yön çıksın diye id'den türetiyoruz
      return (word.id.charCodeAt(word.id.length - 1) % 2) === 0;
    },

    /** Sonucu kelimeye işler ve skoru günceller */
    answer(wordId, ok) {
      store.scoreWord(wordId, ok);
      if (ok) this.correct++; else this.wrong++;
      return store.findWord(wordId);
    },

    advance() { this.index++; },
  };
}
