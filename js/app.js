// Uygulama çekirdeği: kilit ekranı, sekme yönlendirme, üst bar
import * as store from './store.js';
import * as sync from './sync.js';
import { BADGES } from './data.js';
import { summarize, levelInfo, earnedBadges } from './gamify.js';
import { fmtLong, fmtDay, dateOf, daysBetween } from './utils.js';
import { confetti } from './confetti.js';

import * as today from './views/today.js';
import * as week from './views/week.js';
import * as books from './views/books.js';
import * as stats from './views/stats.js';
import * as exams from './views/exams.js';
import * as settings from './views/settings.js';

const VIEWS = { today, week, books, stats, exams, settings };
const SESSION_KEY = 'lgs-unlocked';

const WELCOME_QUOTES = [
  '"Dobby is a free elf"… ama LGS bitene kadar değil! 📚',
  'Sihir yok, sadece çözülen sorular var ✨ Hadi bakalım!',
  'Bu sınava yalnız girmiyorsun — arkanda destekçin var 💛',
  'Bugün de bir avuç soru, bir kucak başarı 🌸',
  'Sınav salonuna değil, hedefine odaklan 🎯',
  'Kulakları büyük olanın azmi de büyük olur 😄',
  'Bir asa değil, bir kalemin var — daha güçlü ⚡',
  'Hogwarts kabul mektubu gelmedi ama LGS var 🦉',
  'Omzundaki el diyor ki: sen yaparsın! 💪',
];

const $ = s => document.querySelector(s);
let currentTab = 'today';
let activePin = '';       // doğrulanmış şifre — senkron çağrılarında kullanılır
let pushTimer = null;

/* ---------------- sakura ---------------- */
function petals() {
  const host = $('#petals');
  const chars = ['🌸', '🌷', '✿', '❀', '🌼'];
  for (let i = 0; i < 12; i++) {
    const el = document.createElement('div');
    el.className = 'petal';
    el.textContent = chars[(Math.random() * chars.length) | 0];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.fontSize = 12 + Math.random() * 14 + 'px';
    el.style.animationDuration = 11 + Math.random() * 14 + 's';
    el.style.animationDelay = -Math.random() * 20 + 's';
    host.appendChild(el);
  }
}

/* ---------------- toast ---------------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2600);
}

/* ---------------- üst bar ---------------- */
function greetingText(name) {
  const h = new Date().getHours();
  const part = h < 6 ? 'İyi geceler' : h < 12 ? 'Günaydın' : h < 18 ? 'Merhaba' : 'İyi akşamlar';
  return name ? `${part}, ${name}!` : `${part}!`;
}

function refreshHeader() {
  const state = store.get();
  const st = summarize(state);
  const lvl = levelInfo(st.totalQ);
  const now = new Date();

  $('#greeting').textContent = greetingText(state.name);
  $('#todayLabel').textContent = `${fmtDay(now)} · ${fmtLong(now)}`;
  $('#streakChip').innerHTML = `🔥 <b>${st.streak}</b>`;

  const kalan = daysBetween(now, dateOf(state.examDate));
  $('#countdownChip').innerHTML = kalan >= 0 ? `⏳ <b>${kalan}</b> gün` : `🎓 <b>LGS</b>`;

  $('#levelName').textContent = `Sv. ${lvl.level} · ${lvl.title}`;
  $('#levelXp').textContent = `${lvl.into} / ${lvl.need} XP`;
  $('#levelFill').style.width = lvl.pct + '%';
}

/* ---------------- rozetler ---------------- */
function checkBadges() {
  const state = store.get();
  const st = summarize(state);
  const have = earnedBadges(st);
  const seen = new Set(state.seenBadges);
  const fresh = have.filter(id => !seen.has(id));
  if (!fresh.length) return;

  store.markBadgesSeen(have);
  const b = BADGES.find(x => x.id === fresh[0]);
  if (b) {
    confetti(2000);
    setTimeout(() => toast(`${b.ico} Yeni rozet: ${b.name}!`), 300);
  }
}

/* ---------------- senkron ---------------- */
const SYNC_ICONS = {
  idle:    ['☁️', 'Buluta bağlanılıyor…'],
  syncing: ['🔄', 'Eşitleniyor…'],
  synced:  ['☁️', 'Eşitlendi'],
  live:    ['🟢', 'Canlı — değişiklikler anında yansıyor'],
  offline: ['📴', 'Çevrimdışı — bağlanınca eşitlenecek'],
  error:   ['⚠️', 'Eşitleme sorunu'],
};

function initSyncIndicator() {
  const chip = $('#syncChip');
  if (!sync.enabled()) return;
  chip.classList.remove('hidden');
  sync.onStatus((s, peers) => {
    const [ico, label] = SYNC_ICONS[s] || SYNC_ICONS.idle;
    // birden fazla cihaz bağlıysa sayısını göster
    chip.innerHTML = s === 'live' && peers > 1 ? `${ico}<b>${peers}</b>` : ico;
    chip.title = s === 'live' && peers > 1
      ? `Canlı · ${peers} cihaz bağlı — değişiklikler anında yansıyor`
      : label;
    chip.classList.toggle('spin', s === 'syncing');
    chip.classList.toggle('is-live', s === 'live');
  });
}

let applyingRemote = false;

/** Uzaktan gelen belgeyi birleştirip ekranı tazeler. */
function applyRemoteDoc(doc) {
  if (!doc) return false;
  applyingRemote = true;                 // birleştirme sonucu tekrar yayına dönmesin
  let changed = false;
  try {
    changed = store.mergeRemote(doc);
  } finally {
    applyingRemote = false;
  }
  if (changed) {
    refreshHeader();
    renderTab(currentTab);
    checkBadges();
  }
  return changed;
}

/** Sunucudaki veriyi çekip yerelle birleştirir. */
async function pullAndMerge() {
  if (!sync.enabled() || !activePin) return false;
  const remote = await sync.pull(activePin);
  if (!remote) return false;
  return applyRemoteDoc(remote);
}

/** Giriş sonrası ilk eşitleme: önce çek-birleştir, sonra yereli buluta yaz. */
async function syncBoot() {
  if (!sync.enabled() || !activePin) return;
  await pullAndMerge();
  await sync.push(activePin, store.get());
  // anlık kanal: diğer cihazlardaki değişiklikler saniyesinde düşsün
  sync.connectLive(activePin, applyRemoteDoc);
}

function initSyncWatchers() {
  if (!sync.enabled()) return;

  // Değişiklikleri anlık kanaldan yolla. Kısa bir bekleme, art arda basılan
  // +/- tuşlarını tek bir gönderimde toplamak için.
  store.subscribe(() => {
    if (!activePin || applyingRemote) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      const doc = store.get();
      if (!sync.sendLive(doc)) sync.push(activePin, doc);   // canlı kanal yoksa HTTP
    }, 400);
  });

  // Canlı bağlantı kopmuş olabilir diye yedek kontroller
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pullAndMerge(); });
  window.addEventListener('online', () => syncBoot());
  setInterval(() => { if (!document.hidden && !sync.live()) pullAndMerge(); }, 60000);
}

/* ---------------- yönlendirme ---------------- */
const ctx = {
  toast, refreshHeader, checkBadges, lock,
  rerender: () => renderTab(currentTab),
  syncNow: async () => {
    if (!sync.enabled()) { toast('Bulut eşitleme kapalı'); return; }
    toast('Eşitleniyor…');
    await pullAndMerge();
    const ok = await sync.push(activePin, store.get());
    toast(ok ? 'Eşitlendi ☁️' : 'Eşitlenemedi, bağlantını kontrol et');
  },
};

function renderTab(tab) {
  currentTab = tab;
  const view = VIEWS[tab];

  // Görünümler dinleyicilerini kapsayıcının KENDİSİNE bağlıyor (olay delegasyonu).
  // Sadece innerHTML değiştirilseydi eski dinleyiciler elemanda kalır ve her
  // render'da bir yenisi eklenirdi: tek tık birden çok kez işlenirdi.
  // Bu yüzden kapsayıcıyı her seferinde sıfırdan oluşturup yerine koyuyoruz.
  const old = $('#view');
  const root = document.createElement('main');
  root.id = 'view';
  root.className = 'view';
  root.innerHTML = view.render();
  old.replaceWith(root);

  view.bind(root, ctx);
  window.scrollTo(0, 0);
  document.querySelectorAll('#tabbar button').forEach(b =>
    b.classList.toggle('on', b.dataset.tab === tab));
  // Ayarlar alt menüde değil, üstteki dişli düğmesinde
  $('#gearBtn').classList.toggle('on', tab === 'settings');
}

function startApp() {
  $('#lock').classList.add('hidden');
  $('#onboard').classList.add('hidden');
  $('#welcome').classList.add('hidden');
  $('#app').classList.remove('hidden');
  refreshHeader();
  renderTab('today');
  checkBadges();
  syncBoot();
}

async function afterUnlock() {
  sessionStorage.setItem(SESSION_KEY, '1');

  // Buluttaki veriyi kilidi açar açmaz indir: yeni bir cihazda isim, hedef ve
  // kayıtlar zaten sunucuda olduğu halde "adın ne?" diye sormamak için.
  if (sync.enabled()) {
    $('#lockSub').textContent = 'Verilerin alınıyor… ☁️';
    await pullAndMerge();
  }

  if (!store.get().name) {
    $('#lock').classList.add('hidden');
    $('#onboard').classList.remove('hidden');
    setTimeout(() => $('#onboardName').focus(), 250);
  } else {
    showWelcome();
  }
}

/* ---------------- hoş geldin ---------------- */
function showWelcome() {
  const state = store.get();
  const kalan = daysBetween(new Date(), dateOf(state.examDate));

  $('#welcomeTitle').textContent = greetingText(state.name);
  $('#welcomeQuote').textContent = WELCOME_QUOTES[(Math.random() * WELCOME_QUOTES.length) | 0];
  $('#welcomeCount').innerHTML = kalan >= 0
    ? `LGS'ye <b>${kalan}</b> gün kaldı ⏳`
    : 'Bugün senin günün 🎓';

  $('#lock').classList.add('hidden');
  $('#onboard').classList.add('hidden');
  $('#app').classList.add('hidden');
  $('#welcome').classList.remove('hidden');
}

function lock() {
  activePin = '';
  clearTimeout(pushTimer);
  sync.disconnectLive();
  sessionStorage.removeItem(SESSION_KEY);
  $('#app').classList.add('hidden');
  $('#onboard').classList.add('hidden');
  $('#welcome').classList.add('hidden');
  $('#lock').classList.remove('hidden');
  setPin('');
  $('#lockSub').textContent = 'Şifreni gir de başlayalım ✨';
  $('#lockSub').classList.remove('err');
}

/* ---------------- kilit ekranı ---------------- */
let pin = '';

function setPin(v) {
  pin = v;
  document.querySelectorAll('#pinDots span').forEach((el, i) =>
    el.classList.toggle('on', i < pin.length));
}

function pushDigit(d) {
  if (pin.length >= 6) return;
  setPin(pin + d);
  if (pin.length === 6) setTimeout(tryPin, 140);
}

async function tryPin() {
  let ok;
  if (sync.enabled()) {
    $('#lockSub').textContent = 'Kontrol ediliyor… ⏳';
    $('#lockSub').classList.remove('err');
    const remote = await sync.login(pin);
    // sunucuya ulaşılamadıysa (remote === null) çevrimdışı olarak yerel şifreye bak
    ok = remote === null ? pin === store.get().pin : remote;
  } else {
    ok = pin === store.get().pin;
  }

  if (ok) {
    activePin = pin;
    $('#lockSub').textContent = 'Hoş geldin! 🌸';
    $('#lockSub').classList.remove('err');
    setTimeout(afterUnlock, 260);
  } else {
    const card = $('#lockCard');
    card.classList.add('shake');
    $('#lockSub').textContent = 'Şifre yanlış, tekrar dene 🙈';
    $('#lockSub').classList.add('err');
    if (navigator.vibrate) navigator.vibrate(120);
    // Haneleri hemen sıfırla: gecikmeli sıfırlama, hızlı tekrar yazan
    // kullanıcının ilk hanelerini siliyordu.
    setPin('');
    setTimeout(() => card.classList.remove('shake'), 430);
  }
}

function initLock() {
  $('#keypad').addEventListener('click', e => {
    const b = e.target.closest('button[data-k]');
    if (!b) return;
    const k = b.dataset.k;
    if (k === 'clear') setPin('');
    else if (k === 'del') setPin(pin.slice(0, -1));
    else pushDigit(k);
  });

  document.addEventListener('keydown', e => {
    if ($('#lock').classList.contains('hidden')) return;
    if (/^[0-9]$/.test(e.key)) pushDigit(e.key);
    else if (e.key === 'Backspace') setPin(pin.slice(0, -1));
    else if (e.key === 'Enter' && pin.length === 6) tryPin();
  });
}

/* ---------------- onboarding ---------------- */
function initOnboard() {
  const go = () => {
    const v = $('#onboardName').value.trim().slice(0, 18);
    store.setMeta({ name: v });
    showWelcome();
  };
  $('#onboardGo').addEventListener('click', go);
  $('#onboardName').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  $('#welcomeGo').addEventListener('click', startApp);
}

/* ---------------- başlangıç ---------------- */
function init() {
  store.load();
  petals();
  initLock();
  initOnboard();
  initSyncIndicator();
  initSyncWatchers();

  $('#gearBtn').addEventListener('click', () => renderTab('settings'));

  $('#tabbar').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    renderTab(b.dataset.tab);
  });

  // Gün değişirse "Bugün" ekranı tazelensin
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !$('#app').classList.contains('hidden')) {
      refreshHeader();
      if (currentTab === 'today') renderTab('today');
    }
  });

  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    activePin = store.get().pin;
    if (store.get().name) startApp();
    else { $('#lock').classList.add('hidden'); $('#onboard').classList.remove('hidden'); }
  }
}

init();
