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
  books: [],          // { id, subject, name, units:[{id,name,done,doneAt}], _t }
  deletedBooks: [],
  seenBadges: [],
  updatedAt: 0,       // ayarların son değişme zamanı (birleştirmede kullanılır)
  resetAt: 0,         // "verileri sıfırla" anı; bundan eskisi birleştirmede düşer
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
  sweepTombstones();
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
  // Gün tamamen boşalsa bile kaydı SİLMİYORUZ; geriye zaman damgası kalıyor.
  // Silseydik diğer cihaz "bu günü hiç bilmiyor" sanıp kendi eski kaydını
  // korurdu ve sıfırlama hiçbir zaman yayılmazdı.
}

/** Uzun süredir boş duran gün kayıtlarını temizler (senkron penceresinin çok ötesi) */
function sweepTombstones() {
  const limit = Date.now() - 60 * 86400000;
  for (const k of Object.keys(state.days)) {
    const day = state.days[k];
    const empty = !Object.keys(day).some(x => x !== '_t');
    if (empty && (day._t || 0) < limit) delete state.days[k];
  }
}

export function addExam(exam) {
  state.exams.push({ ...exam, _t: Date.now() });
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

/* ---------------- kitaplar ---------------- */

const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const touchBook = book => {
  book._t = Date.now();
  state.updatedAt = Date.now();
};

export const findBook = id => state.books.find(b => b.id === id) || null;

export function addBook({ subject, name, unitNames = [] }) {
  const book = {
    id: uid('b'),
    subject,
    name: String(name || '').trim().slice(0, 80) || 'Adsız kitap',
    units: unitNames.map(n => ({ id: uid('u'), name: n, done: false, doneAt: null })),
    _t: Date.now(),
  };
  state.books.push(book);
  state.updatedAt = Date.now();
  save();
  return book;
}

export function removeBook(id) {
  state.books = state.books.filter(b => b.id !== id);
  if (!state.deletedBooks.includes(id)) state.deletedBooks.push(id);
  state.updatedAt = Date.now();
  save();
}

export function renameBook(id, name) {
  const b = findBook(id);
  if (!b) return;
  b.name = String(name || '').trim().slice(0, 80) || b.name;
  touchBook(b);
  save();
}

export function addUnits(bookId, names) {
  const b = findBook(bookId);
  if (!b) return 0;
  const clean = names.map(n => String(n).trim()).filter(Boolean).slice(0, 200);
  clean.forEach(n => b.units.push({ id: uid('u'), name: n.slice(0, 120), done: false, doneAt: null }));
  touchBook(b);
  save();
  return clean.length;
}

export function renameUnit(bookId, unitId, name) {
  const b = findBook(bookId);
  const u = b && b.units.find(x => x.id === unitId);
  if (!u) return;
  u.name = String(name || '').trim().slice(0, 120) || u.name;
  touchBook(b);
  save();
}

export function removeUnit(bookId, unitId) {
  const b = findBook(bookId);
  if (!b) return;
  b.units = b.units.filter(u => u.id !== unitId);
  touchBook(b);
  save();
}

/** Üniteyi işaretler/kaldırır ve kitabın yeni tamamlanma durumunu döner. */
export function toggleUnit(bookId, unitId) {
  const b = findBook(bookId);
  const u = b && b.units.find(x => x.id === unitId);
  if (!u) return null;
  u.done = !u.done;
  u.doneAt = u.done ? new Date().toISOString() : null;
  touchBook(b);
  save();
  const total = b.units.length;
  const done = b.units.filter(x => x.done).length;
  return { done, total, justFinished: total > 0 && done === total && u.done };
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
  const now = Date.now();

  // Sıfırlamanın diğer cihazlara da yayılması için: bilinen günlere mezar taşı,
  // deneme ve kitapların id'leri silinenler listesine, ayrıca bir sıfırlama anı.
  const days = {};
  for (const k of Object.keys(state.days)) days[k] = { _t: now };
  const deletedExams = [...new Set([...state.deletedExams, ...state.exams.map(e => e.id)])];
  const deletedBooks = [...new Set([...state.deletedBooks, ...state.books.map(b => b.id)])];

  state = { ...defaults(), ...keep, days, deletedExams, deletedBooks, resetAt: now, updatedAt: now };
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

  const deletedB = new Set([...(a.deletedBooks || []), ...(b.deletedBooks || [])]);
  const books = new Map();
  for (const bk of [...(a.books || []), ...(b.books || [])]) {
    const cur = books.get(bk.id);
    // aynı kitap iki cihazda da değişmişse daha yeni zaman damgası kazanır
    if (!cur || (bk._t || 0) >= (cur._t || 0)) books.set(bk.id, bk);
  }
  out.books = [...books.values()].filter(bk => !deletedB.has(bk.id));
  out.deletedBooks = [...deletedB];

  out.seenBadges = [...new Set([...(a.seenBadges || []), ...(b.seenBadges || [])])];
  out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);

  // Bir cihazda "verileri sıfırla" yapıldıysa, o andan ESKİ her kayıt düşer.
  const resetAt = Math.max(a.resetAt || 0, b.resetAt || 0);
  out.resetAt = resetAt;
  if (resetAt) {
    for (const k of Object.keys(out.days)) {
      if ((out.days[k]._t || 0) < resetAt) out.days[k] = { _t: resetAt };
    }
    out.exams = out.exams.filter(e => (e._t || 0) >= resetAt);
    out.books = out.books.filter(bk => (bk._t || 0) >= resetAt);
  }
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
