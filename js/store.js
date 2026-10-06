// localStorage tabanlı tek kaynaklı veri deposu
import { SUBJECTS, WORD_TYPE_MAP } from './data.js';
import { clampInt, goalListOf, goalOf, todayKey } from './utils.js';

const KEY = 'lgs-takip-v1';

const emptyRec = () => ({ d:0, y:0, b:0, ct:0 });

const defaults = () => ({
  version: 1,
  pin: '050669',
  name: '',
  dailyGoal: 60,      // bugünün hedefi (goalHistory'den türetilir, hızlı okuma için saklanır)
  goalHistory: [],    // [{ from:'YYYY-MM-DD', goal, _t }] — hedefin o tarihten itibaren geçerli hâli
  examDate: '2027-06-06',
  days: {},           // 'YYYY-MM-DD' -> { _t: zaman damgası, turkce:{d,y,b,s,ct}, ... }
  exams: [],          // { id, name, date, subjects:{ key:{d,y} }, topics:{ key:{ 'konu adı': yanlış } }, _t }
  deletedExams: [],   // silinen denemeler senkronda geri gelmesin
  books: [],          // { id, subject, name, units:[{id,name,done,doneAt}], _t }
  deletedBooks: [],
  words: [],          // { id, en, tr, type, ticks, wrong, _t } — İngilizce kelimeler
  deletedWords: [],
  seenBadges: [],
  gifts: [],          // { id, name, kind, target, delivered, condAt, _t } — abla/abinin koyduğu hediyeler
  deletedGifts: [],
  openedGifts: {},    // id -> zaman: kutusu açılıp adı görülen hediyeler
  seenGifts: {},      // id -> zaman: "yeni hediye" bildirimi gösterilenler
  giftPin: '',        // hediye düzenleme şifresi (giriş şifresinden ayrı, sürpriz bozulmasın)
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
  dropRetiredFields();
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

/* ---------------- günlük hedef ---------------- */

/** Verilen günde yürürlükte olan hedef (geçmiş günler eski hedefiyle kalır) */
export const goalFor = key => goalOf(state, key);

/**
 * Hedefi BUGÜNDEN İTİBAREN değiştirir; geçmiş günler eski hedefini korur.
 * Aynı gün içinde tekrar değiştirilirse o günün kaydı güncellenir.
 */
export function setGoal(value) {
  const v = clampInt(value, 0, 999);
  const key = todayKey();
  // goalListOf değişiklikten ÖNCE çağrılmalı: geçmiş kayıt yoksa eski hedefi tabana yazar
  const hist = goalListOf(state).filter(e => e.from !== key);
  hist.push({ from: key, goal: v, _t: Date.now() });
  hist.sort((a, b) => a.from.localeCompare(b.from));
  state.goalHistory = hist;
  state.dailyGoal = v;
  state.updatedAt = Date.now();
  save();
  return v;
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

/** Kaldırılan "sorulacak" alanını eski kayıtlardan temizler */
function dropRetiredFields() {
  for (const k of Object.keys(state.days)) {
    const day = state.days[k];
    for (const sk of Object.keys(day)) {
      if (sk === '_t') continue;
      if (day[sk] && 's' in day[sk]) delete day[sk].s;
    }
  }
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

/** Kayıtlı denemeyi günceller (yeni zaman damgası: eşitlemede bu sürüm kazanır) */
export function updateExam(id, patch) {
  const ex = state.exams.find(e => e.id === id);
  if (!ex) return;
  Object.assign(ex, patch, { id, _t: Date.now() });
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

/* ---------------- İngilizce kelimeler ---------------- */

const cleanWord = s => String(s || '').trim().replace(/\s+/g, ' ').slice(0, 80);

/** Aynı kelimeyi iki kez eklemeyelim: İngilizcesi büyük/küçük harf duyarsız eşleşir */
const wordKey = en => cleanWord(en).toLocaleLowerCase('en');

export const findWord = id => state.words.find(w => w.id === id) || null;

/**
 * Kelimeleri toplu ekler. Zaten kayıtlı olan (aynı İngilizce) atlanır.
 * Dönen sayılar ekleme ekranındaki geri bildirim için.
 */
export function addWords(list) {
  const seen = new Set(state.words.map(w => wordKey(w.en)));
  let added = 0, skipped = 0;

  for (const item of list) {
    const en = cleanWord(item.en);
    const tr = cleanWord(item.tr);
    if (!en || !tr) { skipped++; continue; }
    const k = wordKey(en);
    if (seen.has(k)) { skipped++; continue; }
    seen.add(k);
    state.words.push({
      id: uid('w'), en, tr,
      type: WORD_TYPE_MAP[item.type] ? item.type : 'other',
      ticks: 0, wrong: 0, _t: Date.now(),
    });
    added++;
  }

  if (added) { state.updatedAt = Date.now(); save(); }
  return { added, skipped };
}

export function updateWord(id, patch) {
  const w = findWord(id);
  if (!w) return null;
  if (patch.en !== undefined) w.en = cleanWord(patch.en) || w.en;
  if (patch.tr !== undefined) w.tr = cleanWord(patch.tr) || w.tr;
  if (patch.type !== undefined && WORD_TYPE_MAP[patch.type]) w.type = patch.type;
  w._t = Date.now();
  state.updatedAt = Date.now();
  save();
  return w;
}

export function removeWord(id) {
  state.words = state.words.filter(w => w.id !== id);
  if (!state.deletedWords.includes(id)) state.deletedWords.push(id);
  state.updatedAt = Date.now();
  save();
}

/**
 * Oyun sonucunu kelimeye işler: doğru +1 tick, yanlış −1 (sıfırın altına inmez).
 * Öğrenilmiş bir kelime yanlış bilinirse kendiliğinden tekrar sıraya girer.
 */
export function scoreWord(id, correct) {
  const w = findWord(id);
  if (!w) return null;
  w.ticks = Math.max(0, (w.ticks || 0) + (correct ? 1 : -1));
  if (!correct) w.wrong = (w.wrong || 0) + 1;
  w._t = Date.now();
  state.updatedAt = Date.now();
  save();
  return w;
}

/* ---------------- hediyeler ---------------- */

export const findGift = id => state.gifts.find(g => g.id === id) || null;

export function addGift({ name, kind, target }) {
  const gift = {
    id: uid('g'),
    name: String(name || '').trim().slice(0, 80) || 'Sürpriz',
    kind,
    target: clampInt(target, 1, 999999),
    delivered: false,
    _t: Date.now(),
  };
  state.gifts.push(gift);
  state.updatedAt = Date.now();
  save();
  return gift;
}

/**
 * Hediyeyi düzenler. Koşul ya da hedef değişirse `condAt` güncellenir: ondan önceki
 * açılma/görülme kayıtları geçersiz sayılır, hediye baştan başlar. (Kayıtları silmek
 * yerine damga tutuyoruz; silinseydi eski bir cihazın kopyası eşitlemede geri getirirdi.)
 */
export function updateGift(id, { name, kind, target }) {
  const g = findGift(id);
  if (!g) return;
  const t = clampInt(target, 1, 999999);
  if (kind !== g.kind || t !== g.target) {
    g.kind = kind;
    g.target = t;
    g.condAt = Date.now();
  }
  g.name = String(name || '').trim().slice(0, 80) || g.name;
  g._t = Date.now();
  state.updatedAt = Date.now();
  save();
}

/** Geçerli açılma/görülme kayıtları: hediyenin koşulu son değiştiğinden sonrakiler */
const validMap = (doc, field) => {
  const m = doc[field] || {};
  return Object.fromEntries((doc.gifts || [])
    .filter(g => (m[g.id] || 0) >= (g.condAt || 0) && m[g.id])
    .map(g => [g.id, true]));
};
export const openedMap = doc => validMap(doc, 'openedGifts');
export const seenMap = doc => validMap(doc, 'seenGifts');

export function setGiftDelivered(id, delivered) {
  const g = findGift(id);
  if (!g) return;
  g.delivered = !!delivered;
  g._t = Date.now();
  state.updatedAt = Date.now();
  save();
}

export function removeGift(id) {
  state.gifts = state.gifts.filter(g => g.id !== id);
  if (!state.deletedGifts.includes(id)) state.deletedGifts.push(id);
  state.updatedAt = Date.now();
  save();
}

export function markGiftOpened(id) {
  state.openedGifts = { ...state.openedGifts, [id]: Date.now() };
  save();
}

export function markGiftsSeen(ids) {
  const now = Date.now();
  const seen = { ...state.seenGifts };
  ids.forEach(i => { seen[i] = now; });
  state.seenGifts = seen;
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
  const keep = {
    pin: state.pin, name: state.name, examDate: state.examDate,
    dailyGoal: state.dailyGoal, goalHistory: state.goalHistory,
    // hediyeler soru kaydı değil, abla/abinin ayarı: kalır; açılma durumu sıfırlanır
    gifts: state.gifts, deletedGifts: state.deletedGifts, giftPin: state.giftPin,
  };
  const now = Date.now();

  // Sıfırlamanın diğer cihazlara da yayılması için: bilinen günlere mezar taşı,
  // deneme ve kitapların id'leri silinenler listesine, ayrıca bir sıfırlama anı.
  const days = {};
  for (const k of Object.keys(state.days)) days[k] = { _t: now };
  const deletedExams = [...new Set([...state.deletedExams, ...state.exams.map(e => e.id)])];
  const deletedBooks = [...new Set([...state.deletedBooks, ...state.books.map(b => b.id)])];
  const deletedWords = [...new Set([...state.deletedWords, ...state.words.map(w => w.id)])];

  state = { ...defaults(), ...keep, days, deletedExams, deletedBooks, deletedWords, resetAt: now, updatedAt: now };
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
  for (const e of [...(a.exams || []), ...(b.exams || [])]) {
    // güncellenen deneme: daha yeni zaman damgası kazanır
    const cur = byId.get(e.id);
    if (!cur || (e._t || 0) >= (cur._t || 0)) byId.set(e.id, e);
  }
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

  // Kelimeler kitaplarla aynı kalıp: id'ye göre birleşir, daha yeni damga kazanır.
  // (Aynı kelime iki cihazda da oynanmışsa tick'lerden biri diğerini ezer.)
  const deletedW = new Set([...(a.deletedWords || []), ...(b.deletedWords || [])]);
  const words = new Map();
  for (const w of [...(a.words || []), ...(b.words || [])]) {
    const cur = words.get(w.id);
    if (!cur || (w._t || 0) >= (cur._t || 0)) words.set(w.id, w);
  }
  out.words = [...words.values()].filter(w => !deletedW.has(w.id));
  out.deletedWords = [...deletedW];

  // Hedef geçmişi tarihe göre birleşir; aynı günü iki cihaz da değiştirdiyse yenisi kazanır.
  // (Ayarlarla birlikte toptan alınsaydı eski cihazın belgesi tüm geçmişi silebilirdi.)
  const goals = new Map();
  for (const e of [...(a.goalHistory || []), ...(b.goalHistory || [])]) {
    if (!e || typeof e.from !== 'string') continue;
    const cur = goals.get(e.from);
    if (!cur || (e._t || 0) >= (cur._t || 0)) goals.set(e.from, e);
  }
  out.goalHistory = [...goals.values()].sort((x, y) => x.from.localeCompare(y.from));
  if (out.goalHistory.length) out.dailyGoal = goalOf(out, todayKey());

  // Hediyeler kitaplarla aynı kalıp; açılan/görülen haritaları birleşir
  const deletedG = new Set([...(a.deletedGifts || []), ...(b.deletedGifts || [])]);
  const gifts = new Map();
  for (const g of [...(a.gifts || []), ...(b.gifts || [])]) {
    const cur = gifts.get(g.id);
    if (!cur || (g._t || 0) >= (cur._t || 0)) gifts.set(g.id, g);
  }
  out.gifts = [...gifts.values()].filter(g => !deletedG.has(g.id));
  out.deletedGifts = [...deletedG];
  // en yeni zaman kalır: koşulu değişen hediye yeniden açıldığında damga ilerlemeli
  const unionTimes = (x, y) => {
    const m = { ...(y || {}) };
    for (const [k, t] of Object.entries(x || {})) m[k] = Math.max(m[k] || 0, t);
    return m;
  };
  out.openedGifts = unionTimes(a.openedGifts, b.openedGifts);
  out.seenGifts = unionTimes(a.seenGifts, b.seenGifts);

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
    out.words = out.words.filter(w => (w._t || 0) >= resetAt);
    // hediye listesi sıfırlamada korunur, yalnız açılma/görülme durumu düşer
    const fresh = m => Object.fromEntries(Object.entries(m).filter(([, t]) => t >= resetAt));
    out.openedGifts = fresh(out.openedGifts);
    out.seenGifts = fresh(out.seenGifts);
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
