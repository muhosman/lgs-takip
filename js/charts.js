// Kütüphanesiz SVG grafikler
import { esc } from './utils.js';

const NS = 'http://www.w3.org/2000/svg';
const svgOpen = (w, h) =>
  `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" xmlns="${NS}">`;

/** İlerleme halkası */
export function ring(pct, size = 104, stroke = 12) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, pct / 100)));
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="${NS}">
    <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF9CC5"/><stop offset="55%" stop-color="#F0679B"/><stop offset="100%" stop-color="#A38CF0"/>
    </linearGradient></defs>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#FFE2EC" stroke-width="${stroke}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="url(#ringGrad)" stroke-width="${stroke}"
            stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
            style="transition:stroke-dashoffset .7s cubic-bezier(.2,1,.3,1)"/>
  </svg>`;
}

/**
 * Çubuk grafik. data: [{label, value, color?}]
 * Yatay eksen etiketleri altta, değerler üstte.
 */
export function bars(data, { height = 150, showValues = true, color = '#F0679B' } = {}) {
  const n = Math.max(1, data.length);
  const W = 320, H = height, padB = 22, padT = 16;
  const max = Math.max(1, ...data.map(d => d.value));
  const slot = W / n;
  const bw = Math.min(30, slot * 0.62);

  let out = `<svg class="chart" viewBox="0 0 ${W} ${H}" xmlns="${NS}" preserveAspectRatio="xMidYMid meet">`;
  out += `<line x1="0" y1="${H - padB}" x2="${W}" y2="${H - padB}" stroke="#FADDE8" stroke-width="1.5"/>`;
  data.forEach((d, i) => {
    const h = max ? ((H - padB - padT) * d.value) / max : 0;
    const x = slot * i + (slot - bw) / 2;
    const y = H - padB - h;
    out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h,0).toFixed(1)}"
             rx="6" fill="${d.color || color}"><title>${esc(d.label)}: ${d.value}</title></rect>`;
    if (showValues && d.value > 0) {
      out += `<text x="${(x + bw/2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle"
               font-size="10" font-weight="700" fill="#957085">${d.value}</text>`;
    }
    out += `<text x="${(x + bw/2).toFixed(1)}" y="${H - 7}" text-anchor="middle"
             font-size="9.5" fill="#957085">${esc(d.label)}</text>`;
  });
  return out + '</svg>';
}

/** Çizgi grafik (deneme puanı trendi vb.) */
export function line(points, { height = 160, min = null, max = null, color = '#A38CF0', fmt = v => v } = {}) {
  const W = 320, H = height, padL = 30, padR = 8, padB = 22, padT = 14;
  if (!points.length) return '';
  const vals = points.map(p => p.value);
  const lo = min !== null ? min : Math.min(...vals) * 0.95;
  const hi = max !== null ? max : Math.max(...vals) * 1.05;
  const span = hi - lo || 1;
  const iw = W - padL - padR, ih = H - padT - padB;
  const xy = i => [
    padL + (points.length === 1 ? iw / 2 : (iw * i) / (points.length - 1)),
    padT + ih - ((points[i].value - lo) / span) * ih,
  ];

  let path = '', area = '';
  points.forEach((p, i) => {
    const [x, y] = xy(i);
    path += (i ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
  });
  const [x0] = xy(0), [xn] = xy(points.length - 1);
  area = path + ` L${xn.toFixed(1)} ${(padT + ih).toFixed(1)} L${x0.toFixed(1)} ${(padT + ih).toFixed(1)} Z`;

  let out = `<svg class="chart" viewBox="0 0 ${W} ${H}" xmlns="${NS}" preserveAspectRatio="xMidYMid meet">`;
  out += `<defs><linearGradient id="lnGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${color}" stop-opacity=".32"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/>
  </linearGradient></defs>`;
  for (let g = 0; g <= 2; g++) {
    const y = padT + (ih * g) / 2;
    const v = hi - (span * g) / 2;
    out += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#FADDE8" stroke-width="1"/>`;
    out += `<text x="${padL - 5}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#957085">${fmt(Math.round(v))}</text>`;
  }
  out += `<path d="${area}" fill="url(#lnGrad)"/>`;
  out += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`;
  points.forEach((p, i) => {
    const [x, y] = xy(i);
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="#fff" stroke="${color}" stroke-width="2.4">
             <title>${esc(p.label)}: ${fmt(p.value)}</title></circle>`;
    if (points.length <= 8 || i % Math.ceil(points.length / 6) === 0) {
      out += `<text x="${x.toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="9" fill="#957085">${esc(p.label)}</text>`;
    }
  });
  return out + '</svg>';
}

/** Doğru / yanlış / boş donut */
export function donut(parts, size = 128) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  const r = size / 2 - 13, c = 2 * Math.PI * r;
  let acc = 0;
  let out = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="${NS}">
    <g transform="rotate(-90 ${size/2} ${size/2})">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#FFF0F5" stroke-width="18"/>`;
  if (total > 0) {
    for (const p of parts) {
      if (!p.value) continue;
      const len = (p.value / total) * c;
      out += `<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${p.color}" stroke-width="18"
               stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}">
               <title>${esc(p.label)}: ${p.value}</title></circle>`;
      acc += len;
    }
  }
  out += '</g>';
  const pct = total ? Math.round((parts[0].value / total) * 100) : 0;
  out += `<text x="${size/2}" y="${size/2 - 2}" text-anchor="middle" font-size="24" font-weight="800"
           font-family="Baloo 2, sans-serif" fill="#D94E85">%${pct}</text>`;
  out += `<text x="${size/2}" y="${size/2 + 14}" text-anchor="middle" font-size="10" fill="#957085">doğruluk</text>`;
  return out + '</svg>';
}
