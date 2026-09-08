// localStorage tabanlı tek kaynaklı veri deposu
import { SUBJECTS } from './data.js';
import { clampInt } from './utils.js';

const KEY = 'lgs-takip-v1';

const emptyRec = () => ({ d:0, y:0, b:0, s:0, ct:0 });

const defaults = () => ({
  version: 1,
  pin: '050669',
  name: '',
  dailyGoal: 60,
  examDate: '2027-06-06',
  days: {},           // 'YYYY-MM-DD' -> { _t: zaman damgası, turkce:{d,y,b,s,ct}, ... }
  exams: [],          // { id, name, date, subjects:{ key:{d,y} } }
  deletedExams: [],   // silinen denemeler senkronda geri gelmesin
  seenBadges: [],
  updatedAt: 0,       // ayarların son değişme zamanı (birleştirmede kullanılır)
  createdAt: new Date().toISOString(),
});

let state = defaults();
const listeners = new Set();

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...defaults(), ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Kayıt okunamadı, sıfırdan başlanıyor', e);
    state = defaults();
  }
  return state;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Kayıt yazılamadı', e);
  }
  listeners.forEach(fn => fn(state));
}

export const get = () => state;
export const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };

export function setMeta(patch) {
  Object.assign(state, patch);
  state.updatedAt = Date.now();
  save();
}

/** Bir günün tüm ders kayıtlarını döndürür (kopya değil, okuma amaçlı) */
export function dayData(key) {
  const day = state.days[key];
  if (!day) return null;
  return day;
}

export function recOf(key, subject) {
  const day = state.days[key];
  if (!day || !day[subject]) return emptyRec();
  return { ...emptyRec(), ...day[subject] };
}

/** Tek bir metriği yazar; sıfırlanan günler otomatik temizlenir */
export function setValue(key, subject, metric, value) {
  const v = clampInt(value, 0, 9999);
  if (!state.days[key]) state.days[key] = {};
  if (!state.days[key][subject]) state.days[key][subject] = emptyRec();
  state.days[key][subject][metric] = v;
  state.days[key]._t = Date.now();
  pruneDay(key);
  save();
  return v;
}

function pruneDay(key) {
  const day = state.days[key];
  if (!day) return;
  for (const sk of Object.keys(day)) {
    if (sk === '_t') continue;                       // zaman damgası bir ders kaydı değil
    const r = day[sk];
    if (!r || Object.values(r).every(n => !n)) delete day[sk];
  }
  // sadece zaman damgası kaldıysa gün de boştur
  if (!Object.keys(day).some(k => k !== '_t')) delete state.days[key];
}

export function addExam(exam) {
  state.exams.push(exam);
  state.exams.sort((a, b) => a.date.localeCompare(b.date));
  state.updatedAt = Date.now();
  save();
}

export function removeExam(id) {
  state.exams = state.exams.filter(e => e.id !== id);
  if (!state.deletedExams.includes(id)) state.deletedExams.push(id);
  state.updatedAt = Date.now();
  save();
}

export function markBadgesSeen(ids) {
  const set = new Set(state.seenBadges);
  ids.forEach(i => set.add(i));
  state.seenBadges = [...set];
  save();
}

export function replaceAll(obj) {
  if (!obj || typeof obj !== 'object' || typeof obj.days !== 'object') {
    throw new Error('Geçersiz yedek dosyası');
  }
  state = { ...defaults(), ...obj };
  save();
}

export function resetAll() {
  const keep = { pin: state.pin, name: state.name, dailyGoal: state.dailyGoal, examDate: state.examDate };
  state = { ...defaults(), ...keep };
  save();
}

export const SUBJECT_KEYS = SUBJECTS.map(s => s.key);

/**
 * Yerel ve uzak belgeyi birleştirir.
 * - Günler: gün bazında daha yeni zaman damgası kazanır (cihazlar farklı günleri
 *   doldurmuşsa ikisi de korunur).
 * - Denemeler: id'ye göre birleşir, silinenler geri gelmez.
 * - Ayarlar: `updatedAt` daha yeni olan belgeden alınır.
 */
export function mergeDocs(a, b) {
  const newer = (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a;
  const older = newer === a ? b : a;
  const out = { ...defaults(), ...older, ...newer };

  const days = {};
  for (const k of new Set([...Object.keys(a.days || {}), ...Object.keys(b.days || {})])) {
    const da = (a.days || {})[k];
    const db = (b.days || {})[k];
    if (!da) { days[k] = db; continue; }
    if (!db) { days[k] = da; continue; }
    days[k] = (db._t || 0) >= (da._t || 0) ? db : da;
  }
  out.days = days;

  const deleted = new Set([...(a.deletedExams || []), ...(b.deletedExams || [])]);
  const byId = new Map();
  for (const e of [...(a.exams || []), ...(b.exams || [])]) byId.set(e.id, e);
  out.exams = [...byId.values()]
    .filter(e => !deleted.has(e.id))
    .sort((x, y) => x.date.localeCompare(y.date));
  out.deletedExams = [...deleted];

  out.seenBadges = [...new Set([...(a.seenBadges || []), ...(b.seenBadges || [])])];
  out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
  return out;
}

/** Uzak belgeyi yerelle birleştirip yerine koyar. Değişiklik olduysa true döner. */
export function mergeRemote(remote) {
  if (!remote || typeof remote !== 'object') return false;
  const before = JSON.stringify(state);
  state = mergeDocs(state, remote);
  const changed = JSON.stringify(state) !== before;
  save();
  return changed;
}
