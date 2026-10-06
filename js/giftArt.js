// Hediye kutusu ve kutudan çıkan kedi (SVG) + tam ekran açılış sahnesi
import { esc } from './utils.js';

let uid = 0;

/**
 * Hediye kutusu. opts.cat: kutunun içinde kedi (açılışta yükselir),
 * opts.locked: soluk, kilitli kutu; opts.open: kapak yanda, kedi dışarıda (açılmış hediye).
 */
export function giftBox({ size = 160, cat = false, locked = false, open = false } = {}) {
  const id = `gb${++uid}`;
  const body = locked ? ['#B9AED6', '#8C7FB4'] : ['#B45CFF', '#7A1FE6'];
  const rib = locked ? ['#E6E0F2', '#B4A8D0'] : ['#FFE36B', '#F2A21C'];
  const edge = locked ? '#6D6196' : '#5A12B8';
  return `
  <svg class="giftsvg ${open ? 'is-open' : ''} ${locked ? 'is-locked' : ''}" width="${size}" height="${size}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${body[0]}"/><stop offset="1" stop-color="${body[1]}"/></linearGradient>
      <linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${rib[0]}"/><stop offset="1" stop-color="${rib[1]}"/></linearGradient>
    </defs>
    <ellipse cx="100" cy="186" rx="70" ry="7" fill="rgba(60,20,90,.18)"/>
    ${cat ? catArt(id) : ''}
    <g class="gb-body">
      <rect x="45" y="96" width="110" height="84" rx="9" fill="url(#${id}b)" stroke="${edge}" stroke-width="4"/>
      <rect x="49" y="100" width="102" height="10" rx="4" fill="#fff" opacity=".14"/>
      <rect x="89" y="96" width="22" height="84" fill="url(#${id}r)" stroke="${rib[1]}" stroke-width="2"/>
    </g>
    ${cat ? catPaw() : ''}
    <g class="gb-lid">
      <path class="gb-bow" d="M100 70 C82 46 60 52 66 66 C70 76 88 74 100 70 Z M100 70 C118 46 140 52 134 66 C130 76 112 74 100 70 Z"
            fill="url(#${id}r)" stroke="${rib[1]}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="100" cy="70" r="7" fill="${rib[0]}" stroke="${rib[1]}" stroke-width="3"/>
      <rect x="38" y="74" width="124" height="28" rx="9" fill="url(#${id}b)" stroke="${edge}" stroke-width="4"/>
      <rect x="44" y="78" width="112" height="7" rx="3" fill="#fff" opacity=".2"/>
      <rect x="88" y="74" width="24" height="28" fill="url(#${id}r)" stroke="${rib[1]}" stroke-width="2"/>
    </g>
    ${locked ? `<g class="gb-lock"><rect x="84" y="124" width="32" height="26" rx="6" fill="#fff" stroke="${edge}" stroke-width="3"/>
      <path d="M90 124 v-7 a10 10 0 0 1 20 0 v7" fill="none" stroke="${edge}" stroke-width="3"/><circle cx="100" cy="136" r="3.5" fill="${edge}"/></g>` : ''}
  </svg>`;
}

/** Kedi başı (kutunun gövdesinin arkasında; açılışta yukarı çıkar) */
function catArt(id) {
  const line = '#8B5E3C';
  return `
  <g class="gb-cat">
    <path d="M66 62 L70 26 L94 46 Z" fill="#FFF6E0" stroke="${line}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M134 62 L130 26 L106 46 Z" fill="#FFF6E0" stroke="${line}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M72 50 L73 34 L86 45 Z" fill="#F7A1B5"/><path d="M128 50 L127 34 L114 45 Z" fill="#F7A1B5"/>
    <ellipse cx="100" cy="76" rx="42" ry="35" fill="#FFF6E0" stroke="${line}" stroke-width="4"/>
    <path d="M92 44 q2 10 0 14 M100 42 q2 12 0 16 M108 44 q2 10 0 14" stroke="#EBC48F" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M76 70 l11 5 l-11 5" stroke="#2B1B14" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M124 70 l-11 5 l11 5" stroke="#2B1B14" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="78" cy="88" rx="9" ry="6" fill="#F59CB0" opacity=".75"/>
    <ellipse cx="122" cy="88" rx="9" ry="6" fill="#F59CB0" opacity=".75"/>
    <ellipse cx="100" cy="82" rx="3.5" ry="2.6" fill="#F07A95"/>
    <path d="M93 87 q3.5 5 7 0 q3.5 5 7 0" stroke="#2B1B14" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M96 89 q4 7 8 0 Z" fill="#F07A95"/>
  </g>`;
}

/** Patiler: biri kutu kenarında, biri sallanan (gövdenin önünde) */
function catPaw() {
  const line = '#8B5E3C';
  return `
  <g class="gb-paws">
    <ellipse cx="62" cy="100" rx="12" ry="10" fill="#FFF6E0" stroke="${line}" stroke-width="4"/>
    <g class="gb-wave">
      <path d="M134 98 C140 84 146 70 150 58" stroke="${line}" stroke-width="18" stroke-linecap="round" fill="none"/>
      <path d="M134 98 C140 84 146 70 150 58" stroke="#FFF6E0" stroke-width="11" stroke-linecap="round" fill="none"/>
      <circle cx="150" cy="56" r="11" fill="#FFF6E0" stroke="${line}" stroke-width="4"/>
      <circle cx="150" cy="58" r="3.4" fill="#F59CB0"/><circle cx="144" cy="51" r="2" fill="#F59CB0"/><circle cx="150" cy="48" r="2" fill="#F59CB0"/><circle cx="156" cy="51" r="2" fill="#F59CB0"/>
    </g>
    <g class="gb-coin"><circle cx="172" cy="40" r="13" fill="#FFC93C" stroke="#E08A0C" stroke-width="3"/><text x="172" y="45" text-anchor="middle" font-size="15" font-weight="800" fill="#E08A0C">★</text></g>
  </g>`;
}

/**
 * Tam ekran açılış sahnesi. Kutu titrer → yıldız patlaması, kapak fırlar →
 * kedi çıkar, pati sallar → konuşma balonunda hediye. onClose: kapatınca.
 */
export function playReveal(name, { onBurst, onClose } = {}) {
  const stars = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * 360 + (i % 2 ? 8 : -6);
    const dist = 130 + (i % 3) * 45;
    return `<span class="gx-star" style="--a:${a}deg;--d:${dist}px;--s:${0.7 + (i % 4) * 0.25};--dl:${(i % 5) * 30}ms">${i % 3 ? '★' : '✦'}</span>`;
  }).join('');
  const el = document.createElement('div');
  el.className = 'gx';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Hediye açılıyor');
  el.innerHTML = `
    <div class="gx-rays" aria-hidden="true"></div>
    <div class="gx-stage">
      <div class="gx-bubble"><small>Miyav! 🐾</small>Hediyen<b>${esc(name)}</b>🎉</div>
      <div class="gx-flash" aria-hidden="true"></div>
      <div class="gx-stars" aria-hidden="true">${stars}</div>
      <div class="gx-box">${giftBox({ size: 300, cat: true })}</div>
      <button type="button" class="gx-close">Yaşasın! 💗</button>
    </div>`;
  document.body.appendChild(el);
  document.body.classList.add('modal-open');
  const burst = setTimeout(() => onBurst && onBurst(), 1000);
  const close = () => {
    clearTimeout(burst);
    el.classList.add('out');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => { el.remove(); document.body.classList.remove('modal-open'); onClose && onClose(); }, 260);
  };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  el.querySelector('.gx-close').addEventListener('click', close);
  setTimeout(() => el.querySelector('.gx-close')?.focus({ preventScroll: true }), 2300);
  return close;
}
