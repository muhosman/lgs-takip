// Tarih, net ve puan yardımcıları
import { SUBJECTS, SUBJ_MAP } from './data.js';

export const DAY_NAMES  = ['PAZARTESİ','SALI','ÇARŞAMBA','PERŞEMBE','CUMA','CUMARTESİ','PAZAR'];
export const DAY_EMOJI  = ['🌙','🐢','🍀','⭐','🎀','🍓','🌻'];
export const DAY_SHORT  = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
export const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

export const pad = n => String(n).padStart(2, '0');

/** Date -> 'YYYY-MM-DD' (yerel saat, UTC kayması yok) */
export const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 'YYYY-MM-DD' -> Date (yerel gece yarısı) */
export function dateOf(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayKey = () => keyOf(new Date());

export function addDays(date, n) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

/** Haftanın pazartesisi */
export function weekStart(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const wd = (d.getDay() + 6) % 7; // Pzt = 0
  return addDays(d, -wd);
}

export const fmtLong  = d => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
export const fmtShort = d => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
export const fmtDay   = d => DAY_NAMES[(d.getDay() + 6) % 7];

export const daysBetween = (a, b) =>
  Math.round((dateOf(keyOf(b)) - dateOf(keyOf(a))) / 86400000);

/** LGS neti: her 3 yanlış 1 doğruyu götürür */
export const netOf = (d, y) => Math.max(0, (d || 0) - (y || 0) / 3);
export const fmtNet = n => (Math.round(n * 100) / 100).toFixed(2).replace(/\.?0+$/, '') || '0';

/** Ağırlıklı LGS puanı tahmini (100–500) */
export function estimateScore(perSubject) {
  let weighted = 0, max = 0;
  for (const s of SUBJECTS) {
    const r = perSubject[s.key] || { d: 0, y: 0 };
    weighted += netOf(r.d, r.y) * s.w;
    max += s.q * s.w;
  }
  return Math.round(100 + (weighted / max) * 400);
}

export const clampInt = (v, min = 0, max = 9999) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

export const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

export const subjColor = key => (SUBJ_MAP[key] ? SUBJ_MAP[key].color : '#EEE');
