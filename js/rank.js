// Seviye rütbeleri: altıgen amblem + mücevher; seviye yükseldikçe süs artar (SVG)

export const RANKS = [
  { min: 1,  key: 'buz',     name: 'Buz',     c: ['#E6F3FF', '#A9CDEB', '#6E98C2'], gem: ['#FFFFFF', '#9AD6FF', '#3E8DD8'] },
  { min: 5,  key: 'yakut',   name: 'Yakut',   c: ['#FFB4A8', '#E2604F', '#9E2A22'], gem: ['#FFD2CC', '#F2776A', '#B3302A'], arrows: true },
  { min: 10, key: 'zumrut',  name: 'Zümrüt',  c: ['#B6F5B0', '#4CC75A', '#23863A'], gem: ['#F2FFD6', '#B5F04A', '#5DAE14'], topGem: '#C8F56A' },
  { min: 15, key: 'safir',   name: 'Safir',   c: ['#B9BDFF', '#5B63E8', '#2E2FA8'], gem: ['#E6F7FF', '#5EC2FF', '#1F6FE0'], topGem: '#C9B6FF', arrows: true },
  { min: 20, key: 'ametist', name: 'Ametist', c: ['#F5C2FF', '#C25BE6', '#7A1FA8'], gem: ['#FBE6FF', '#C66BF0', '#7B24C2'], topGem: '#F5A8FF', spikes: true },
  { min: 30, key: 'buyucu',  name: 'Büyücü',  c: ['#C6D8FF', '#6D8CF2', '#5A3CC8'], gem: ['#FFFFFF', '#E7A7FF', '#9C4FE0'], topGem: '#F5A8FF', wings: '#E9D2FF' },
  { min: 40, key: 'anka',    name: 'Anka',    c: ['#FFC0A0', '#F0613F', '#B2261F'], gem: ['#FFF4C2', '#FFC93C', '#D68A0C'], topGem: '#FFD86B', wings: '#FFC9B8', hexGem: true, arrows: true },
  { min: 50, key: 'tac',     name: 'Taç',     c: ['#D6FF9E', '#5FCB3C', '#2B8A22'], gem: ['#FFF6C9', '#FFC93C', '#D68A0C'], topGem: '#D6FF6A', wings: '#FFD66B', crown: true, spikes: true },
];

export const rankOf = level => [...RANKS].reverse().find(r => level >= r.min) || RANKS[0];
export const nextRank = level => RANKS.find(r => r.min > level) || null;

let uid = 0;
const hex = (cx, cy, r) => [-90, -30, 30, 90, 150, 210]
  .map(a => `${(cx + r * Math.cos(a * Math.PI / 180)).toFixed(1)},${(cy + r * Math.sin(a * Math.PI / 180)).toFixed(1)}`).join(' ');

/** Rütbe amblemi; level: seviye sayısı, size: piksel */
export function rankEmblem(level, size = 96) {
  const r = rankOf(level);
  const id = `rk${++uid}`;
  const [c1, c2, c3] = r.c;
  const [g1, g2, g3] = r.gem;
  const cx = 60, cy = 56;

  const wings = r.wings ? `
    <g class="rk-wings" opacity=".95">
      <path class="rk-wl" d="M28 44 C8 34 -8 40 -10 52 C0 50 8 54 14 58 C2 58 -6 64 -6 74 C6 68 14 68 22 70 C14 74 10 80 12 88 C22 82 28 82 34 80 Z" fill="${r.wings}" stroke="${c3}" stroke-width="1.5" stroke-linejoin="round"/>
      <path class="rk-wr" d="M92 44 C112 34 128 40 130 52 C120 50 112 54 106 58 C118 58 126 64 126 74 C114 68 106 68 98 70 C106 74 110 80 108 88 C98 82 92 82 86 80 Z" fill="${r.wings}" stroke="${c3}" stroke-width="1.5" stroke-linejoin="round"/>
    </g>` : '';

  // altta katmanlı taban plakaları (görseldeki gibi)
  const plates = `
    <path d="M32 86 L44 92 L44 104 L32 98 Z" fill="${c3}" opacity=".85"/>
    <path d="M88 86 L76 92 L76 104 L88 98 Z" fill="${c3}" opacity=".85"/>
    <path d="M47 94 L60 100 L73 94 L73 106 L60 112 L47 106 Z" fill="${c3}"/>`;

  const arrows = r.arrows ? `
    <path class="rk-al" d="M3 56 L22 44 L22 68 Z" fill="${c2}" stroke="${c3}" stroke-width="1.2"/>
    <path class="rk-ar" d="M117 56 L98 44 L98 68 Z" fill="${c2}" stroke="${c3}" stroke-width="1.2"/>` : '';

  const spikes = r.spikes ? [[-150, 0], [-30, 0], [30, 0], [150, 0]].map(([a]) => {
    const x = cx + 46 * Math.cos(a * Math.PI / 180), y = cy + 46 * Math.sin(a * Math.PI / 180);
    return `<path class="rk-spike" d="M${x.toFixed(1)} ${(y - 6).toFixed(1)} L${(x + 6).toFixed(1)} ${y.toFixed(1)} L${x.toFixed(1)} ${(y + 6).toFixed(1)} L${(x - 6).toFixed(1)} ${y.toFixed(1)} Z" fill="${c1}" stroke="${c3}" stroke-width="1.2"/>`;
  }).join('') : '';
  const spikesG = spikes ? `<g class="rk-spikes">${spikes}</g>` : '';

  const topGem = r.topGem ? `<g class="rk-top">
    <path d="M60 6 L67 15 L60 24 L53 15 Z" fill="${r.topGem}" stroke="${c3}" stroke-width="1.5"/>
    <path d="M60 9 L63 15 L60 20 Z" fill="#fff" opacity=".7"/></g>` : '';

  // merkez: mücevher, altın altıgen ya da taç
  let center;
  if (r.crown) {
    center = `
      <path d="M42 66 L40 46 L50 54 L60 40 L70 54 L80 46 L78 66 Z" fill="url(#${id}g)" stroke="#B9770A" stroke-width="1.6" stroke-linejoin="round"/>
      <rect x="42" y="64" width="36" height="7" rx="2" fill="#FFC93C" stroke="#B9770A" stroke-width="1.4"/>
      <circle cx="60" cy="57" r="4" fill="#6FE04A" stroke="#2B8A22" stroke-width="1.2"/>
      <circle cx="40" cy="45" r="2.6" fill="#FFE27A"/><circle cx="60" cy="39" r="2.6" fill="#FFE27A"/><circle cx="80" cy="45" r="2.6" fill="#FFE27A"/>`;
  } else if (r.hexGem) {
    center = `
      <polygon points="${hex(cx, cy, 16)}" fill="url(#${id}g)" stroke="#B9770A" stroke-width="1.8"/>
      <polygon points="${hex(cx, cy, 9)}" fill="#FFE68A" opacity=".85"/>`;
  } else {
    center = `
      <path d="M45 50 L52 41 L68 41 L75 50 L60 72 Z" fill="url(#${id}g)" stroke="${g3}" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M45 50 L75 50 M52 41 L56 50 L60 72 M68 41 L64 50 L60 72" stroke="${g3}" stroke-width=".9" fill="none" opacity=".6"/>
      <path d="M52 41 L60 50 L68 41 Z" fill="#fff" opacity=".55"/>`;
  }

  const sparkle = (x, y, s) => `<path d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z" fill="#fff"/>`;

  return `
  <svg class="rank-emblem rk-${r.key}" width="${size}" height="${size}" viewBox="-12 0 144 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${r.name} rütbesi">
    <defs>
      <linearGradient id="${id}o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
      <linearGradient id="${id}i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c3}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
      <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${g1}"/><stop offset=".5" stop-color="${g2}"/><stop offset="1" stop-color="${g3}"/></linearGradient>
    </defs>
    ${wings}
    ${plates}
    ${arrows}
    <polygon points="${hex(cx, cy, 44)}" fill="url(#${id}o)" stroke="${c3}" stroke-width="2"/>
    <polygon points="${hex(cx, cy, 38)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>
    <polygon points="${hex(cx, cy, 30)}" fill="url(#${id}i)"/>
    ${spikesG}
    ${topGem}
    <g class="rk-center">${center}</g>
    <g class="rk-spark">${sparkle(46, 44, 4)}</g><g class="rk-spark s2">${sparkle(74, 66, 3)}</g>
  </svg>`;
}
