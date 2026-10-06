// Resimli simgeler: renkli, hacimli SVG çizimler (telifsiz, uygulamaya özel)
let n = 0;
const g = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const shine = '<ellipse cx="22" cy="16" rx="10" ry="5" fill="#fff" opacity=".35" transform="rotate(-20 22 16)"/>';

const ART = {
  // kitap yığını (toplam soru)
  books: i => `<defs>${g(i + 'a', '#FF8FB8', '#E0457F')}${g(i + 'b', '#7FD3FF', '#2E8FE0')}${g(i + 'c', '#FFD66B', '#F0A11F')}</defs>
    <rect x="10" y="40" width="44" height="11" rx="3" fill="url(#${i}a)"/><rect x="12" y="42" width="38" height="3" rx="1.5" fill="#fff" opacity=".5"/>
    <rect x="14" y="29" width="40" height="11" rx="3" fill="url(#${i}b)"/><rect x="16" y="31" width="34" height="3" rx="1.5" fill="#fff" opacity=".5"/>
    <rect x="8" y="18" width="42" height="11" rx="3" fill="url(#${i}c)" transform="rotate(-6 29 23)"/>
    <path d="M44 6 l3 6 6 1 -4.5 4 1.2 6 -5.7 -3 -5.7 3 1.2 -6 -4.5 -4 6 -1z" fill="#FFE36B" stroke="#E0A21C" stroke-width="1.2"/>`,
  // hedef tahtası (net)
  target: i => `<defs>${g(i + 'a', '#FF7A8A', '#D63A55')}</defs>
    <circle cx="30" cy="32" r="22" fill="url(#${i}a)"/><circle cx="30" cy="32" r="15" fill="#fff"/><circle cx="30" cy="32" r="9" fill="url(#${i}a)"/><circle cx="30" cy="32" r="3.5" fill="#fff"/>
    <path d="M30 32 L52 10" stroke="#5B3A1A" stroke-width="3" stroke-linecap="round"/><path d="M50 6 l8 2 -6 6 z M54 4 l6 4" fill="#4FC98E" stroke="#2A9A70" stroke-width="1.5"/>${shine}`,
  // onay rozeti (doğruluk)
  check: i => `<defs>${g(i + 'a', '#6BE3B5', '#22A57A')}</defs>
    <path d="M32 4 l6 5 8 -1 3 7 7 4 -2 8 4 7 -6 5 -1 8 -8 1 -5 6 -7 -3 -7 3 -5 -6 -8 -1 -1 -8 -6 -5 4 -7 -2 -8 7 -4 3 -7 8 1z" fill="url(#${i}a)"/>
    <path d="M20 32 l8 8 16 -16" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${shine}`,
  // alevli takvim (çalışılan gün)
  calendar: i => `<defs>${g(i + 'a', '#B79CFF', '#7A4FF0')}${g(i + 'f', '#FFD23F', '#FF5A00')}</defs>
    <rect x="8" y="12" width="44" height="42" rx="8" fill="#fff" stroke="#E6DDF7" stroke-width="2"/>
    <path d="M8 20 a8 8 0 0 1 8 -8 h28 a8 8 0 0 1 8 8 v6 h-44z" fill="url(#${i}a)"/>
    <rect x="18" y="6" width="5" height="12" rx="2.5" fill="#5B3FD6"/><rect x="37" y="6" width="5" height="12" rx="2.5" fill="#5B3FD6"/>
    <path d="M30 34 c6 6 9 9 6 15 c-2 4 -10 4 -12 0 c-2 -4 1 -6 2 -9 c1 3 3 3 4 1 c1 -3 -1 -5 0 -7z" fill="url(#${i}f)"/>`,
  // saat (günlük ortalama)
  clock: i => `<defs>${g(i + 'a', '#7FD3FF', '#2E8FE0')}</defs>
    <circle cx="30" cy="32" r="23" fill="url(#${i}a)"/><circle cx="30" cy="32" r="17" fill="#fff"/>
    <path d="M30 20 v12 l8 5" stroke="#2E5FA8" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="30" cy="32" r="2.5" fill="#FF6FA8"/><rect x="26" y="4" width="8" height="6" rx="2" fill="#2E8FE0"/>${shine}`,
  // alev (seri)
  fire: i => `<defs>${g(i + 'a', '#FFB13B', '#FF3D00')}${g(i + 'b', '#FFF3A0', '#FFC02E')}</defs>
    <path d="M32 4 c4 10 18 16 18 32 c0 12 -9 20 -20 20 c-11 0 -20 -8 -20 -19 c0 -9 6 -13 8 -20 c3 5 5 7 8 6 c4 -2 6 -10 6 -19z" fill="url(#${i}a)"/>
    <path d="M30 28 c3 6 10 9 10 17 c0 6 -5 10 -10 10 c-6 0 -10 -4 -10 -10 c0 -5 3 -7 5 -11 c1 3 3 4 4 3 c1 -2 1 -6 1 -9z" fill="url(#${i}b)"/>`,
  // kupa (deneme)
  trophy: i => `<defs>${g(i + 'a', '#FFE27A', '#E0A21C')}</defs>
    <path d="M16 8 h28 v14 a14 14 0 0 1 -28 0z" fill="url(#${i}a)"/><path d="M16 12 h-6 a7 7 0 0 0 8 12 M44 12 h6 a7 7 0 0 1 -8 12" stroke="#E0A21C" stroke-width="3.5" fill="none"/>
    <rect x="27" y="34" width="6" height="9" fill="#E0A21C"/><rect x="18" y="43" width="24" height="8" rx="3" fill="#8B5E3C"/><rect x="22" y="45" width="16" height="3" rx="1.5" fill="#FFE27A"/>
    <path d="M30 13 l2 4 4.5 .6 -3.3 3 .8 4.4 -4 -2.2 -4 2.2 .8 -4.4 -3.3 -3 4.5 -.6z" fill="#fff" opacity=".85"/>`,
  // yıldız (hedef)
  star: i => `<defs>${g(i + 'a', '#FFE36B', '#F7A11C')}</defs>
    <path d="M30 4 l7.6 15.4 17 2.5 -12.3 12 2.9 16.9 -15.2 -8 -15.2 8 2.9 -16.9 -12.3 -12 17 -2.5z" fill="url(#${i}a)" stroke="#E08A0C" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="24" cy="27" r="2.5" fill="#5B3A1A"/><circle cx="36" cy="27" r="2.5" fill="#5B3A1A"/><path d="M25 34 q5 5 10 0" stroke="#5B3A1A" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  // beyin (kelime)
  brain: i => `<defs>${g(i + 'a', '#FFB3D9', '#E86AAE')}</defs>
    <path d="M30 10 c-4 -6 -16 -4 -16 4 c-7 1 -9 10 -4 14 c-4 5 -1 13 6 13 c1 6 10 8 14 3 c4 5 13 3 14 -3 c7 0 10 -8 6 -13 c5 -4 3 -13 -4 -14 c0 -8 -12 -10 -16 -4z" fill="url(#${i}a)"/>
    <path d="M30 12 v30 M20 20 c4 2 4 6 0 8 M40 20 c-4 2 -4 6 0 8 M22 34 c3 -1 5 1 6 3 M38 34 c-3 -1 -5 1 -6 3" stroke="#C2427F" stroke-width="2" fill="none" stroke-linecap="round"/>${shine}`,
  // roket (tempo)
  rocket: i => `<defs>${g(i + 'a', '#F2F4FF', '#C9CFEA')}${g(i + 'f', '#FFD23F', '#FF5A00')}</defs>
    <path d="M30 4 c10 8 13 22 9 36 h-18 c-4 -14 -1 -28 9 -36z" fill="url(#${i}a)" stroke="#8C97C2" stroke-width="1.5"/>
    <circle cx="30" cy="20" r="5.5" fill="#5EC2FF" stroke="#2E8FE0" stroke-width="2"/>
    <path d="M21 32 l-8 10 9 -2z M39 32 l8 10 -9 -2z" fill="#FF6FA8"/><path d="M24 40 h12 l-6 16z" fill="url(#${i}f)"/>`,
  // madalya (rozet)
  medal: i => `<defs>${g(i + 'a', '#FFE27A', '#E0A21C')}</defs>
    <path d="M18 4 l8 18 h8 l8 -18 h-8 l-4 9 -4 -9z" fill="#8E7CFF"/><path d="M22 4 h6 l4 9" fill="#B9A9FF"/>
    <circle cx="30" cy="38" r="17" fill="url(#${i}a)" stroke="#E0A21C" stroke-width="2"/><circle cx="30" cy="38" r="11" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>
    <path d="M30 31 l2 4.4 4.8 .7 -3.5 3.4 .8 4.8 -4.1 -2.3 -4.1 2.3 .8 -4.8 -3.5 -3.4 4.8 -.7z" fill="#fff"/>`,
  // grafik (gelişim)
  chart: i => `<defs>${g(i + 'a', '#6BE3B5', '#22A57A')}${g(i + 'b', '#B79CFF', '#7A4FF0')}${g(i + 'c', '#FF8FB8', '#E0457F')}</defs>
    <rect x="8" y="34" width="11" height="18" rx="3" fill="url(#${i}c)"/><rect x="24" y="24" width="11" height="28" rx="3" fill="url(#${i}b)"/><rect x="40" y="12" width="11" height="40" rx="3" fill="url(#${i}a)"/>
    <path d="M10 26 l16 -10 10 5 16 -13" stroke="#FFB13B" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M47 6 l7 1 -1 7z" fill="#FFB13B"/>`,
};

/** Resimli simge; kind: books|target|check|calendar|clock|fire|trophy|star|brain|rocket|medal|chart */
export function icon(kind, size = 44) {
  const id = `ic${++n}`;
  const body = (ART[kind] || ART.star)(id);
  return `<svg class="pic pic-${kind}" width="${size}" height="${size}" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
}
