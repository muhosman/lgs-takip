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
  days: {},      // 'YYYY-MM-DD' -> { turkce:{d,y,b,s,ct}, ... }
  exams: [],     // { id, name, date, subjects:{ key:{d,y} } }
  seenBadges: [],
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
  pruneDay(key);
  save();
  return v;
}

function pruneDay(key) {
  const day = state.days[key];
  if (!day) return;
  for (const sk of Object.keys(day)) {
    const r = day[sk];
    if (!r || Object.values(r).every(n => !n)) delete day[sk];
  }
  if (!Object.keys(day).length) delete state.days[key];
}

export function addExam(exam) {
  state.exams.push(exam);
  state.exams.sort((a, b) => a.date.localeCompare(b.date));
  save();
}

export function removeExam(id) {
  state.exams = state.exams.filter(e => e.id !== id);
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
