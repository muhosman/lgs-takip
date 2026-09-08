// Uygulama çekirdeği: kilit ekranı, sekme yönlendirme, üst bar
import * as store from './store.js';
import { BADGES } from './data.js';
import { summarize, levelInfo, earnedBadges } from './gamify.js';
import { fmtLong, fmtDay, dateOf, daysBetween } from './utils.js';
import { confetti } from './confetti.js';

import * as today from './views/today.js';
import * as week from './views/week.js';
import * as stats from './views/stats.js';
import * as exams from './views/exams.js';
import * as settings from './views/settings.js';

const VIEWS = { today, week, stats, exams, settings };
const SESSION_KEY = 'lgs-unlocked';

const WELCOME_QUOTES = [
  '"Dobby is a free elf"… ama LGS bitene kadar değil! 📚',
  'Sihir yok, sadece çözülen sorular var ✨ Hadi bakalım!',
  'Bugün de bir avuç soru, bir kucak başarı 🌸',
  'Sınav salonuna değil, hedefine odaklan 🎯',
  'Kulakları büyük olanın azmi de büyük olur 😄',
  'Bir asa değil, bir kalemin var — daha güçlü ⚡',
  'Hogwarts kabul mektubu gelmedi ama LGS var 🦉',
];

const $ = s => document.querySelector(s);
let currentTab = 'today';

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

/* ---------------- yönlendirme ---------------- */
const ctx = { toast, refreshHeader, checkBadges, rerender: () => renderTab(currentTab), lock };

function renderTab(tab) {
  currentTab = tab;
  const view = VIEWS[tab];
  const root = $('#view');
  root.innerHTML = view.render();
  root.scrollTop = 0;
  view.bind(root, ctx);
  document.querySelectorAll('#tabbar button').forEach(b =>
    b.classList.toggle('on', b.dataset.tab === tab));
}

function startApp() {
  $('#lock').classList.add('hidden');
  $('#onboard').classList.add('hidden');
  $('#welcome').classList.add('hidden');
  $('#app').classList.remove('hidden');
  refreshHeader();
  renderTab('today');
  checkBadges();
}

function afterUnlock() {
  sessionStorage.setItem(SESSION_KEY, '1');
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

function tryPin() {
  if (pin === store.get().pin) {
    $('#lockSub').textContent = 'Hoş geldin! 🌸';
    $('#lockSub').classList.remove('err');
    setTimeout(afterUnlock, 260);
  } else {
    const card = $('#lockCard');
    card.classList.add('shake');
    $('#lockSub').textContent = 'Şifre yanlış, tekrar dene 🙈';
    $('#lockSub').classList.add('err');
    if (navigator.vibrate) navigator.vibrate(120);
    setTimeout(() => { card.classList.remove('shake'); setPin(''); }, 430);
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
    if (store.get().name) startApp();
    else { $('#lock').classList.add('hidden'); $('#onboard').classList.remove('hidden'); }
  }
}

init();
