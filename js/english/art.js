// Kelime oyunlarının çizimleri: maskot kedi (ruh hâline göre yüz) ve balonlar (SVG)

const LINE = '#8B5E3C';

/** Maskot kedi başı. mood: 'idle' | 'happy' | 'sad' | 'think' */
export function mascot(mood = 'idle', size = 88) {
  const eyes = {
    happy: `<path d="M34 50 l9 4 l-9 4" stroke="#2B1B14" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M86 50 l-9 4 l9 4" stroke="#2B1B14" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    sad: `<path d="M34 50 q6 -5 12 0" stroke="#2B1B14" stroke-width="3.4" fill="none" stroke-linecap="round"/>
          <path d="M74 50 q6 -5 12 0" stroke="#2B1B14" stroke-width="3.4" fill="none" stroke-linecap="round"/>
          <path d="M40 56 q-2 6 1 9" stroke="#7CC7FF" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    think: `<circle cx="40" cy="52" r="5" fill="#2B1B14"/><circle cx="80" cy="50" r="5" fill="#2B1B14"/>
            <circle cx="41.5" cy="50.5" r="1.6" fill="#fff"/><circle cx="81.5" cy="48.5" r="1.6" fill="#fff"/>`,
    idle: `<circle cx="40" cy="52" r="5.4" fill="#2B1B14"/><circle cx="80" cy="52" r="5.4" fill="#2B1B14"/>
           <circle cx="41.8" cy="50.2" r="1.8" fill="#fff"/><circle cx="81.8" cy="50.2" r="1.8" fill="#fff"/>`,
  }[mood] || '';
  const mouth = mood === 'sad'
    ? '<path d="M53 72 q7 -6 14 0" stroke="#2B1B14" stroke-width="2.8" fill="none" stroke-linecap="round"/>'
    : mood === 'think'
      ? '<path d="M55 71 h10" stroke="#2B1B14" stroke-width="2.8" stroke-linecap="round"/>'
      : '<path d="M53 68 q3.5 5 7 0 q3.5 5 7 0" stroke="#2B1B14" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M56 70 q4 8 8 0 Z" fill="#F07A95"/>';
  return `
  <svg class="mascot m-${mood}" width="${size}" height="${size}" viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M22 40 L24 6 L50 26 Z" fill="#FFF6E0" stroke="${LINE}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M98 40 L96 6 L70 26 Z" fill="#FFF6E0" stroke="${LINE}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M28 32 L29 16 L42 27 Z" fill="#F7A1B5"/><path d="M92 32 L91 16 L78 27 Z" fill="#F7A1B5"/>
    <ellipse cx="60" cy="58" rx="46" ry="40" fill="#FFF6E0" stroke="${LINE}" stroke-width="4"/>
    <path d="M52 22 q2 10 0 14 M60 20 q2 12 0 16 M68 22 q2 10 0 14" stroke="#EBC48F" stroke-width="5" stroke-linecap="round" fill="none"/>
    ${eyes}
    <ellipse cx="32" cy="66" rx="9" ry="6" fill="#F59CB0" opacity=".75"/>
    <ellipse cx="88" cy="66" rx="9" ry="6" fill="#F59CB0" opacity=".75"/>
    <ellipse cx="60" cy="62" rx="3.6" ry="2.7" fill="#F07A95"/>
    ${mouth}
  </svg>`;
}

const BALLOON_COLORS = ['#FF6FA8', '#FFB13B', '#4FD1A5', '#5EC2FF', '#B45CFF', '#FF8A5B'];

/**
 * Kelime bulma: kediyi taşıyan balonlar. lives kadar balon durur,
 * patlayan son balon (justPopped) kısa bir patlama efekti gösterir.
 */
export function balloons(lives, total = 6, { justPopped = -1, mood = 'idle' } = {}) {
  const xs = [26, 50, 74, 98, 122, 146];
  const ys = [34, 18, 10, 10, 18, 34];
  const items = xs.slice(0, total).map((x, i) => {
    const alive = i < lives;
    const c = BALLOON_COLORS[i % BALLOON_COLORS.length];
    if (!alive) {
      return i === justPopped
        ? `<g class="bl-pop" transform="translate(${x} ${ys[i]})"><path d="M0 -16 L4 -4 L16 0 L4 4 L0 16 L-4 4 L-16 0 L-4 -4 Z" fill="${c}"/></g>`
        : '';
    }
    return `
    <g class="bl" style="--bi:${i}">
      <path d="M${x} ${ys[i] + 18} Q${x + (86 - x) * .4} ${ys[i] + 50} 86 96" stroke="#fff" stroke-opacity=".7" stroke-width="1.5" fill="none"/>
      <ellipse cx="${x}" cy="${ys[i]}" rx="13" ry="16" fill="${c}"/>
      <ellipse cx="${x - 4}" cy="${ys[i] - 6}" rx="3.5" ry="5" fill="#fff" opacity=".5"/>
      <path d="M${x - 3} ${ys[i] + 16} l3 4 l3 -4 Z" fill="${c}"/>
    </g>`;
  }).join('');
  return `
  <div class="hm-sky ${lives <= 1 ? 'low' : ''}">
    <svg class="hm-balloons" viewBox="0 0 172 104" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${items}</svg>
    <div class="hm-cat ${lives === 0 ? 'fell' : ''}">${mascot(mood, 70)}</div>
  </div>`;
}
