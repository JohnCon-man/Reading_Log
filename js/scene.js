// The study: an SVG illustration that reflects your reading.
// - The bookshelf fills with the books you've finished.
// - The books on the nightstand are your current reads.
// - The fire burns brighter the longer your streak.
import { fireLevel } from './stats.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FILLER = ['#4f2424', '#283f33', '#26334b', '#5d4e33', '#3f2a3c', '#6a4f28', '#33302d', '#4f3322', '#234040', '#5f3426', '#3a4a35', '#71592f', '#2e2440'];

const DEFS = `
<defs>
  <pattern id="wp" width="28" height="40" patternUnits="userSpaceOnUse">
    <rect width="28" height="40" fill="#2b1e16"/>
    <rect width="1.2" height="40" fill="#382819"/>
    <path d="M14 7l4 6-4 6-4-6z" fill="#33251a"/>
    <circle cx="14" cy="30" r="1.4" fill="#3a2a1d"/>
  </pattern>
  <pattern id="tartan" width="16" height="16" patternUnits="userSpaceOnUse">
    <rect width="16" height="16" fill="#7a1f1f"/>
    <rect y="5" width="16" height="4" fill="#2c3b2a" opacity=".75"/>
    <rect x="5" width="4" height="16" fill="#2c3b2a" opacity=".6"/>
    <rect y="12" width="16" height="1" fill="#d9b25f" opacity=".5"/>
    <rect x="12" width="1" height="16" fill="#d9b25f" opacity=".4"/>
  </pattern>
  <linearGradient id="wallShade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000" stop-opacity=".55"/>
    <stop offset=".5" stop-color="#000" stop-opacity=".1"/>
    <stop offset="1" stop-color="#000" stop-opacity=".25"/>
  </linearGradient>
  <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2a180d"/>
    <stop offset="1" stop-color="#4a2c17"/>
  </linearGradient>
  <linearGradient id="woodV" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#3a2212"/>
    <stop offset=".5" stop-color="#5a3820"/>
    <stop offset="1" stop-color="#3f2514"/>
  </linearGradient>
  <linearGradient id="plank" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#7a5232"/>
    <stop offset=".3" stop-color="#5b3a22"/>
    <stop offset="1" stop-color="#3e2615"/>
  </linearGradient>
  <linearGradient id="shelfBack" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#140c07"/>
    <stop offset=".6" stop-color="#22150c"/>
    <stop offset="1" stop-color="#1a100a"/>
  </linearGradient>
  <linearGradient id="spineShade" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#000" stop-opacity=".45"/>
    <stop offset=".3" stop-color="#fff" stop-opacity=".14"/>
    <stop offset=".7" stop-color="#000" stop-opacity=".05"/>
    <stop offset="1" stop-color="#000" stop-opacity=".5"/>
  </linearGradient>
  <linearGradient id="bookTop" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".18"/>
    <stop offset="1" stop-color="#000" stop-opacity=".35"/>
  </linearGradient>
  <linearGradient id="stone" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#3a322e"/>
    <stop offset=".5" stop-color="#564a43"/>
    <stop offset="1" stop-color="#3d3430"/>
  </linearGradient>
  <linearGradient id="mantle" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#6b4427"/>
    <stop offset="1" stop-color="#2f1c0f"/>
  </linearGradient>
  <radialGradient id="firebox" cx=".5" cy=".85" r=".8">
    <stop offset="0" stop-color="#5a1e08"/>
    <stop offset=".45" stop-color="#1e0b05"/>
    <stop offset="1" stop-color="#080403"/>
  </radialGradient>
  <linearGradient id="flameOuter" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="#ff7a1a"/>
    <stop offset=".6" stop-color="#e2441b"/>
    <stop offset="1" stop-color="#a51f10" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="flameMid" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="#ffe08a"/>
    <stop offset=".5" stop-color="#ffab2e"/>
    <stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="flameCore" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="#fffbe6"/>
    <stop offset="1" stop-color="#ffd76a" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="leather" cx=".35" cy=".25" r=".9">
    <stop offset="0" stop-color="#3a3a3e"/>
    <stop offset=".45" stop-color="#18181a"/>
    <stop offset="1" stop-color="#070707"/>
  </radialGradient>
  <linearGradient id="leatherSide" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#0a0a0b"/>
    <stop offset=".55" stop-color="#2a2a2d"/>
    <stop offset="1" stop-color="#0c0c0d"/>
  </linearGradient>
  <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#f3d58a"/>
    <stop offset=".5" stop-color="#b8862f"/>
    <stop offset="1" stop-color="#6e4b17"/>
  </linearGradient>
  <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f7e2b0"/>
    <stop offset="1" stop-color="#e3a95a"/>
  </linearGradient>
  <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#121c33"/>
    <stop offset="1" stop-color="#3b4a63"/>
  </linearGradient>
  <linearGradient id="mug" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#8a8378"/>
    <stop offset=".4" stop-color="#efe8da"/>
    <stop offset="1" stop-color="#9c9486"/>
  </linearGradient>
  <radialGradient id="lampGlow" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#ffd38a" stop-opacity=".55"/>
    <stop offset=".4" stop-color="#ffb35a" stop-opacity=".18"/>
    <stop offset="1" stop-color="#ff9a3a" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="fireGlow" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#ff8a2a" stop-opacity=".5"/>
    <stop offset=".45" stop-color="#ff6a1a" stop-opacity=".16"/>
    <stop offset="1" stop-color="#ff5a10" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="shelfGlow" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#ffcf8a" stop-opacity=".16"/>
    <stop offset="1" stop-color="#ffcf8a" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="vignette" cx=".55" cy=".55" r=".75">
    <stop offset=".45" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity=".72"/>
  </radialGradient>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="blur6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
</defs>`;

function room() {
  // Floor boards converge toward a vanishing point behind the wall.
  let boards = '';
  for (let x = -60; x <= 460; x += 24) {
    const x2 = 200 + (x - 200) * 1.92;
    boards += `<line x1="${x}" y1="560" x2="${x2.toFixed(1)}" y2="800"/>`;
  }
  let seams = '';
  const r = rng(3);
  [590, 630, 680, 740].forEach((y) => {
    for (let i = 0; i < 6; i++) {
      const x = r() * 400;
      seams += `<line x1="${x.toFixed(1)}" y1="${y}" x2="${(x + 6).toFixed(1)}" y2="${y}"/>`;
    }
  });
  return `
  <rect width="400" height="560" fill="url(#wp)"/>
  <rect width="400" height="560" fill="url(#wallShade)"/>
  <rect y="0" width="400" height="14" fill="#170e08"/>
  <rect y="14" width="400" height="4" fill="#3a2414"/>
  <rect y="446" width="400" height="104" fill="#26180e"/>
  <rect y="444" width="400" height="7" fill="#4a2e1a"/>
  <rect y="451" width="400" height="2" fill="#140c07"/>
  ${[0, 1, 2, 3, 4].map((i) => `<rect x="${8 + i * 80}" y="462" width="64" height="72" fill="none" stroke="#170e08" stroke-width="2"/><rect x="${9 + i * 80}" y="463" width="64" height="72" fill="none" stroke="#3a2617" stroke-width=".8"/>`).join('')}
  <rect y="546" width="400" height="16" fill="#1a110a"/>
  <rect y="546" width="400" height="2" fill="#3a2414"/>
  <rect y="560" width="400" height="240" fill="url(#floor)"/>
  <g stroke="#1c1009" stroke-width="1.2" opacity=".8">${boards}${seams}</g>
  <ellipse class="fire-floor" cx="292" cy="610" rx="170" ry="50" fill="url(#fireGlow)"/>
  <ellipse cx="215" cy="738" rx="182" ry="50" fill="#3d1414"/>
  <ellipse cx="215" cy="735" rx="176" ry="46" fill="#5a1d1d"/>
  <ellipse cx="215" cy="735" rx="162" ry="39" fill="none" stroke="#b07c3a" stroke-width="1.5" stroke-dasharray="6 4" opacity=".7"/>
  <ellipse cx="215" cy="735" rx="140" ry="31" fill="#4a1616"/>
  <ellipse cx="215" cy="735" rx="110" ry="22" fill="none" stroke="#8e5a2a" stroke-width="1" opacity=".6"/>`;
}

function bookshelf(state) {
  const r = rng(11);
  const finished = state.books
    .filter((b) => b.status === 'finished')
    .sort((a, b) => (a.finishedAt || '').localeCompare(b.finishedAt || ''));
  const comps = [
    [72, 148],
    [157, 236],
    [245, 324],
    [333, 412],
    [421, 500],
  ];
  let books = '';
  let real = 0;
  comps.forEach(([top, bottom], ci) => {
    const h = bottom - top;
    let x = 30;
    let limit = 152;
    if (ci === 1) {
      // a little brass globe at the end of the second shelf
      limit = 128;
      books += `<g transform="translate(140 ${bottom})">
        <rect x="-7" y="-4" width="14" height="4" fill="url(#brass)"/>
        <rect x="-1" y="-10" width="2" height="7" fill="#8a6326"/>
        <circle cx="0" cy="-21" r="11" fill="#27506a"/>
        <path d="M-9 -26q5 3 3 8t4 6M2 -31q5 4 2 9" stroke="#6f8f4a" stroke-width="3" fill="none" opacity=".8"/>
        <circle cx="0" cy="-21" r="12.5" fill="none" stroke="url(#brass)" stroke-width="1.5"/>
      </g>`;
    }
    if (ci === 3) {
      // a horizontal stack lying flat
      for (let i = 0; i < 3; i++) {
        const w = 30 - i * 3;
        books += `<rect x="${31 + i}" y="${bottom - 7 * (i + 1)}" width="${w}" height="6.4" fill="${FILLER[(i * 5) % FILLER.length]}"/>
          <rect x="${31 + i}" y="${bottom - 7 * (i + 1)}" width="${w}" height="6.4" fill="url(#bookTop)"/>`;
      }
      x = 64;
    }
    while (x < limit - 6) {
      const book = finished[real];
      let w;
      let bh;
      let color;
      if (book) {
        const pages = Number(book.totalPages) || 250;
        w = 7 + Math.min(pages, 900) / 900 * 7;
        bh = h * (0.74 + ((pages * 7) % 19) / 100);
        color = book.color;
      } else {
        w = 6 + r() * 7;
        bh = h * (0.7 + r() * 0.24);
        color = FILLER[Math.floor(r() * FILLER.length)];
      }
      if (x + w > limit) break;
      const y = bottom - bh;
      books += `<g${book ? ` class="real-book"` : ''}>
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${bh.toFixed(1)}" fill="${esc(color)}"${book ? '' : ' opacity=".82"'}/>
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${bh.toFixed(1)}" fill="url(#spineShade)"/>
        <rect x="${x.toFixed(1)}" y="${(y + bh * 0.1).toFixed(1)}" width="${w.toFixed(1)}" height="1.1" fill="#d9b25f" opacity="${book ? '.85' : '.35'}"/>
        <rect x="${x.toFixed(1)}" y="${(y + bh * 0.84).toFixed(1)}" width="${w.toFixed(1)}" height="1.1" fill="#d9b25f" opacity="${book ? '.85' : '.35'}"/>
        ${book ? `<rect x="${(x + w * 0.2).toFixed(1)}" y="${(y + bh * 0.3).toFixed(1)}" width="${(w * 0.6).toFixed(1)}" height="${(bh * 0.32).toFixed(1)}" fill="#f1e2bd" opacity=".55"/>` : ''}
      </g>`;
      if (book) real++;
      x += w + 0.6;
    }
    // a leaning book to close out some shelves
    if (ci === 0 || ci === 2 || ci === 4) {
      const lean = `<rect x="0" y="${-h * 0.82}" width="8" height="${h * 0.82}" fill="${FILLER[(ci * 3 + 2) % FILLER.length]}"/>
        <rect x="0" y="${-h * 0.82}" width="8" height="${h * 0.82}" fill="url(#spineShade)"/>`;
      books += `<g transform="translate(${Math.min(x + 1, 142).toFixed(1)} ${bottom}) rotate(12)">${lean}</g>`;
    }
  });

  const planks = comps
    .map(([, b]) => `<rect x="26" y="${b}" width="130" height="9" fill="url(#plank)"/><rect x="26" y="${b + 9}" width="130" height="5" fill="#000" opacity=".35"/>`)
    .join('');
  const shadows = comps.map(([t]) => `<rect x="28" y="${t}" width="126" height="10" fill="#000" opacity=".35"/>`).join('');

  return `
  <g class="hot" data-go="shelf" role="button" tabindex="0" aria-label="Open your bookshelf">
    <rect x="12" y="50" width="158" height="540" fill="transparent"/>
    <rect x="18" y="58" width="146" height="528" fill="url(#woodV)" rx="2"/>
    <rect x="12" y="50" width="158" height="12" fill="#4a2c18"/>
    <rect x="14" y="62" width="154" height="5" fill="#2a190d"/>
    <rect x="28" y="70" width="126" height="440" fill="url(#shelfBack)"/>
    ${shadows}
    ${books}
    ${planks}
    <rect x="28" y="514" width="126" height="64" fill="#44291a"/>
    <rect x="32" y="518" width="56" height="56" fill="none" stroke="#2a190e" stroke-width="2"/>
    <rect x="94" y="518" width="56" height="56" fill="none" stroke="#2a190e" stroke-width="2"/>
    <circle cx="84" cy="546" r="2" fill="url(#brass)"/><circle cx="98" cy="546" r="2" fill="url(#brass)"/>
    <rect x="14" y="580" width="154" height="8" fill="#2a190d"/>
    <ellipse cx="91" cy="240" rx="110" ry="230" fill="url(#shelfGlow)" pointer-events="none"/>
  </g>`;
}

function flame(cx, w, h, fill, cls, delay) {
  const d = `M0 0C${-w} ${-h * 0.18} ${-w * 0.95} ${-h * 0.58} 0 ${-h}C${w * 0.25} ${-h * 0.66} ${w * 1.05} ${-h * 0.45} ${w * 0.8} ${-h * 0.14}C${w * 0.6} ${-h * 0.02} ${w * 0.3} 0 0 0Z`;
  return `<path class="${cls}" style="animation-delay:${delay}s" transform="translate(${cx} 0)" d="${d}" fill="${fill}"/>`;
}

function fireplace(stats) {
  const s = fireLevel(stats.currentStreak);
  const streak = stats.currentStreak;
  const flames = [
    flame(-26, 14, 46, 'url(#flameOuter)', 'fl a', 0),
    flame(24, 15, 52, 'url(#flameOuter)', 'fl b', 0.3),
    flame(-4, 20, 74, 'url(#flameOuter)', 'fl c', 0.15),
    flame(-14, 12, 50, 'url(#flameMid)', 'fl b', 0.5),
    flame(12, 13, 56, 'url(#flameMid)', 'fl a', 0.2),
    flame(-1, 9, 40, 'url(#flameCore)', 'fl c', 0.4),
  ].join('');
  const embers = [-24, -10, 4, 16, 28, -4]
    .map((x, i) => `<circle class="ember" style="animation-delay:${(i * 0.55).toFixed(2)}s" cx="${x}" cy="-10" r="1.3" fill="#ffb347"/>`)
    .join('');
  return `
  <g class="hot" data-go="stats" role="button" tabindex="0" aria-label="Open your reading stats">
    <rect x="183" y="300" width="214" height="300" fill="transparent"/>
    <rect x="196" y="376" width="188" height="202" fill="url(#stone)"/>
    <rect x="196" y="376" width="188" height="202" fill="#000" opacity=".12"/>
    <path d="M196 420h188M196 470h188M196 520h188" stroke="#2a2420" stroke-width="1" opacity=".55"/>
    <path d="M230 376v44M300 420v50M262 470v50M340 470v50M222 520v58M318 376v44" stroke="#2a2420" stroke-width="1" opacity=".45"/>
    <path d="M234 578V470a56 50 0 0 1 112 0V578z" fill="#2a2320"/>
    <path d="M240 578V472a50 45 0 0 1 100 0V578z" fill="url(#firebox)"/>
    <path d="M244 470h92M244 500h92M244 530h92" stroke="#3a1a0e" stroke-width="1" opacity=".5"/>
    <ellipse class="fire-inner" cx="290" cy="560" rx="52" ry="34" fill="url(#fireGlow)"/>
    <g transform="translate(290 566) scale(${s})">
      ${flames}
      ${streak > 0 ? embers : ''}
    </g>
    <g transform="translate(290 568)">
      <rect x="-34" y="-6" width="62" height="11" rx="5" fill="#4a2a17" transform="rotate(-8)"/>
      <rect x="-26" y="-5" width="60" height="11" rx="5" fill="#3b2213" transform="rotate(9)"/>
      <ellipse cx="-33" cy="-1" rx="3" ry="5" fill="#ff8a3a" opacity=".85"/>
      <ellipse cx="33" cy="4" rx="3" ry="5" fill="#ff7a2a" opacity=".7"/>
      <rect x="-42" y="6" width="84" height="3" fill="#111"/>
      <rect x="-38" y="2" width="2" height="8" fill="#111"/><rect x="36" y="2" width="2" height="8" fill="#111"/>
    </g>
    <rect x="182" y="576" width="216" height="16" fill="#5a4e46"/>
    <rect x="182" y="576" width="216" height="3" fill="#7a6c62"/>
    <rect x="186" y="360" width="208" height="18" fill="url(#mantle)"/>
    <rect x="182" y="356" width="216" height="7" rx="1" fill="#7a4e2c"/>
    <rect x="190" y="378" width="200" height="4" fill="#000" opacity=".35"/>

    <g class="candle">
      <rect x="203" y="326" width="9" height="30" fill="#efe3c6"/>
      <rect x="199" y="353" width="17" height="4" rx="2" fill="url(#brass)"/>
      <path class="candle-flame" d="M207.5 314c-3 5-3 9 0 11 3-2 3-6 0-11z" fill="#ffd36a"/>
      <circle class="candle-halo" cx="207.5" cy="320" r="14" fill="url(#lampGlow)"/>
    </g>
    <g class="candle">
      <rect x="370" y="332" width="9" height="24" fill="#efe3c6"/>
      <rect x="366" y="353" width="17" height="4" rx="2" fill="url(#brass)"/>
      <path class="candle-flame" style="animation-delay:.4s" d="M374.5 320c-3 5-3 9 0 11 3-2 3-6 0-11z" fill="#ffd36a"/>
      <circle class="candle-halo" cx="374.5" cy="326" r="14" fill="url(#lampGlow)"/>
    </g>
    <g transform="translate(244 322)">
      <rect width="50" height="34" rx="2" fill="#3b2414" stroke="url(#brass)" stroke-width="1.5"/>
      <path d="M14 22c-4-4-2-9 2-12 0 4 3 4 3 7 1-2 1-4 0-6 4 3 5 7 3 11z" fill="#ff8a2a" transform="translate(-6 -2)"/>
      <text x="31" y="21" text-anchor="middle" class="plaque-num">${streak}</text>
      <text x="25" y="30" text-anchor="middle" class="plaque-label">DAY STREAK</text>
    </g>
    <g transform="translate(330 356)">
      <rect x="-9" y="-4" width="18" height="4" fill="#2a190d"/>
      <rect x="-6" y="-9" width="12" height="5" fill="url(#brass)"/>
      <rect x="-1.5" y="-16" width="3" height="7" fill="url(#brass)"/>
      <path d="M-10 -34h20c0 10-4 17-10 18-6-1-10-8-10-18z" fill="url(#brass)"/>
      <path d="M-10 -31c-6 0-6 8 1 9M10 -31c6 0 6 8-1 9" stroke="#b8862f" stroke-width="1.6" fill="none"/>
    </g>
  </g>`;
}

function painting() {
  return `
  <g transform="translate(236 186)">
    <rect x="-8" y="-8" width="124" height="124" fill="#000" opacity=".35" filter="url(#soft)"/>
    <rect x="-7" y="-7" width="122" height="122" fill="url(#brass)"/>
    <rect x="-2" y="-2" width="112" height="112" fill="#5c3f16"/>
    <rect width="108" height="108" fill="url(#night)"/>
    <circle cx="80" cy="26" r="9" fill="#f4ecd0"/>
    <circle cx="80" cy="26" r="18" fill="#f4ecd0" opacity=".12"/>
    <circle cx="20" cy="18" r=".9" fill="#fff"/><circle cx="44" cy="12" r=".7" fill="#fff"/><circle cx="58" cy="34" r=".8" fill="#fff"/><circle cx="12" cy="40" r=".6" fill="#fff"/>
    <path d="M0 76q22-24 46-8t62-12v52H0z" fill="#1f2c2a"/>
    <path d="M0 88q30-14 56-2t52-6v28H0z" fill="#14201d"/>
    <path d="M70 70l8-7 8 7v10H70z" fill="#2a1d14"/>
    <rect x="75" y="72" width="4" height="4" fill="#ffcf6a"/>
  </g>`;
}

function chair() {
  const buttons = [];
  [[548, [118, 155, 192]], [572, [136, 174]], [596, [118, 155, 192]], [620, [136, 174]]].forEach(([y, xs]) =>
    xs.forEach((x) => buttons.push([x, y]))
  );
  const tufts = buttons
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#050505"/><circle cx="${x - 0.6}" cy="${y - 0.6}" r=".8" fill="#5a5a5e"/>`)
    .join('');
  const creases = buttons
    .flatMap(([x, y]) => [
      `M${x} ${y}l18 24`,
      `M${x} ${y}l-18 24`,
    ])
    .join('');
  const studs = (x0) =>
    Array.from({ length: 7 }, (_, i) => `<circle cx="${x0}" cy="${676 + i * 10}" r="1.3" fill="url(#brass)"/>`).join('');
  return `
  <g class="chair">
    <ellipse cx="155" cy="772" rx="108" ry="13" fill="#000" opacity=".55"/>
    <path d="M86 748l3 22h8l2-22zM211 748l2 22h8l3-22z" fill="#2a170b"/>
    <path d="M92 668V564c0-30 20-46 63-46s63 16 63 46v104z" fill="url(#leather)"/>
    <path d="M100 562c4-24 22-36 55-36" stroke="#55555a" stroke-width="2" fill="none" opacity=".45"/>
    <path d="${creases}" stroke="#000" stroke-width="1" opacity=".55"/>
    ${tufts}
    <path d="M70 690h170v50c0 8-6 12-14 12H84c-8 0-14-4-14-12z" fill="url(#leatherSide)"/>
    <path d="M72 702h166" stroke="#000" stroke-width="1" opacity=".5"/>
    <path d="M100 662c0-10 8-16 18-16h74c10 0 18 6 18 16v24c0 5-4 8-8 8H108c-4 0-8-3-8-8z" fill="url(#leather)"/>
    <path d="M110 655h90" stroke="#6a6a70" stroke-width="1.5" opacity=".4" stroke-linecap="round"/>
    <path d="M58 650c0-18 14-26 30-26s28 8 28 24v98H62c-2 0-4-2-4-4z" fill="url(#leather)"/>
    <path d="M60 646c4-12 16-18 30-18 13 0 24 6 26 16" stroke="#7a7a80" stroke-width="1.5" fill="none" opacity=".35"/>
    <ellipse cx="66" cy="660" rx="9" ry="13" fill="#141416"/>
    <path d="M60 656c2-6 10-8 13-2" stroke="#6a6a70" stroke-width="1" fill="none" opacity=".5"/>
    ${studs(68)}
    <path d="M194 648c0-16 12-24 28-24s30 8 30 26v94c0 2-2 4-4 4h-54z" fill="url(#leather)"/>
    <path d="M194 644c2-10 13-16 26-16 14 0 26 6 30 18" stroke="#7a7a80" stroke-width="1.5" fill="none" opacity=".3"/>
    <ellipse cx="244" cy="660" rx="9" ry="13" fill="#141416"/>
    ${studs(242)}
    <path d="M56 646c8-18 44-22 62-6l-2 70c-6 8-16 10-30 10s-24-4-30-10z" fill="url(#tartan)"/>
    <path d="M56 646c8-18 44-22 62-6" stroke="#000" stroke-opacity=".35" fill="none" stroke-width="1.5"/>
    <path d="M56 710c6 6 16 10 30 10s24-2 30-10" stroke="#3a0e0e" stroke-opacity=".5" fill="none" stroke-width="2"/>
    <path d="M60 714v8M66 717v8M72 719v8M78 720v8M84 720v8M90 720v8M96 719v8M102 717v8M108 715v8M114 712v8" stroke="#d9b25f" stroke-width="1.6" opacity=".75" stroke-linecap="round"/>
  </g>`;
}

function nightstand(state) {
  const reading = state.books.filter((b) => b.status === 'reading');
  const stack = reading.slice(0, 4);
  let books = '';
  if (stack.length) {
    stack.forEach((b, i) => {
      const y = 637 - i * 12;
      const w = 56 - (i % 2) * 6 + (i === 2 ? 3 : 0);
      const x = 290 + (i % 2 ? 4 : 0) - (i === 3 ? 3 : 0);
      books += `<g class="table-book">
        <rect x="${x}" y="${y}" width="${w}" height="11" rx="1.5" fill="${esc(b.color)}"/>
        <rect x="${x + w - 5}" y="${y + 1.5}" width="4" height="8" fill="#efe3c6"/>
        <path d="M${x + w - 5} ${y + 3.5}h4M${x + w - 5} ${y + 5.5}h4M${x + w - 5} ${y + 7.5}h4" stroke="#b9a782" stroke-width=".5"/>
        <rect x="${x}" y="${y}" width="${w}" height="11" rx="1.5" fill="url(#bookTop)"/>
        <rect x="${x + 6}" y="${y + 4}" width="${w * 0.45}" height="1.2" fill="#d9b25f" opacity=".8"/>
      </g>`;
    });
    // a ribbon bookmark dangling from the top book
    const top = stack.length - 1;
    const ty = 637 - top * 12;
    books += `<path d="M${312} ${ty + 11}v10l2-2 2 2v-10z" fill="#a3262a"/>`;
  } else {
    books = `<g class="ghost-book">
      <rect x="290" y="626" width="54" height="22" rx="2" fill="none" stroke="#e8c77a" stroke-width="1.4" stroke-dasharray="4 3"/>
      <path d="M317 631v12M311 637h12" stroke="#e8c77a" stroke-width="1.6"/>
    </g>`;
  }
  const steam = [0, 1, 2]
    .map((i) => `<path class="steam" style="animation-delay:${i * 1.1}s" d="M${266 + i * 5} 620c-6-8 6-14 0-22s6-14 0-22" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" filter="url(#soft)"/>`)
    .join('');
  return `
  <g class="hot" data-go="current" role="button" tabindex="0" aria-label="Open your current reads">
    <rect x="244" y="540" width="156" height="255" fill="transparent"/>
    <ellipse cx="320" cy="790" rx="78" ry="9" fill="#000" opacity=".5"/>
    <path d="M262 730l-4 58h6l6-58zM378 730l4 58h-6l-6-58z" fill="#3a2212"/>
    <rect x="258" y="656" width="124" height="76" fill="url(#woodV)"/>
    <rect x="266" y="670" width="108" height="46" fill="none" stroke="#2a190d" stroke-width="2"/>
    <circle cx="320" cy="693" r="3" fill="url(#brass)"/>
    <rect x="250" y="648" width="140" height="9" rx="2" fill="#6a4427"/>
    <rect x="250" y="648" width="140" height="2" fill="#8a5d38"/>
    <ellipse cx="352" cy="646" rx="18" ry="4" fill="url(#brass)"/>
    <rect x="349" y="588" width="6" height="58" fill="url(#brass)"/>
    <circle class="lamp-halo" cx="352" cy="570" r="34" fill="#ffd38a" opacity=".35" filter="url(#blur6)"/>
    <path d="M333 546h38l16 46h-70z" fill="url(#shade)"/>
    <path d="M317 592h70" stroke="#c48a3c" stroke-width="2"/>
    <path d="M333 546h38" stroke="#d8a85a" stroke-width="1.5"/>
    <ellipse cx="352" cy="594" rx="30" ry="4" fill="#fff4cf" opacity=".8"/>
    ${books}
    <g>
      <ellipse cx="270" cy="648" rx="14" ry="2.5" fill="#000" opacity=".35"/>
      <path d="M258 622h24v20c0 4-3 6-6 6h-12c-3 0-6-2-6-6z" fill="url(#mug)"/>
      <path d="M282 627c8 0 8 13 0 13" stroke="#c9c1b2" stroke-width="3" fill="none"/>
      <ellipse cx="270" cy="622" rx="12" ry="2.6" fill="#3a2010"/>
      <ellipse cx="270" cy="622" rx="9" ry="1.6" fill="#5a3418"/>
      ${steam}
    </g>
  </g>`;
}

function label(x, y, text, go) {
  const w = text.length * 6.4 + 30;
  return `<g class="hot room-label" data-go="${go}" transform="translate(${x} ${y})" aria-hidden="true">
    <rect x="${-w / 2}" y="-11" width="${w}" height="22" rx="11" fill="rgba(18,10,6,.72)" stroke="rgba(232,199,122,.55)" stroke-width="1"/>
    <circle class="pulse" cx="${-w / 2 + 12}" cy="0" r="3" fill="#e8c77a"/>
    <text x="${-w / 2 + 21}" y="4" class="label-text">${text}</text>
  </g>`;
}

export function renderScene(state, stats) {
  const fire = fireLevel(stats.currentStreak);
  return `<svg class="scene-svg" viewBox="0 0 400 800" xmlns="http://www.w3.org/2000/svg" style="--fire:${fire}">
    ${DEFS}
    ${room()}
    ${painting()}
    ${fireplace(stats)}
    ${bookshelf(state)}
    ${chair()}
    ${nightstand(state)}
    <g pointer-events="none">
      <circle cx="352" cy="580" r="190" fill="url(#lampGlow)"/>
      <circle class="fire-glow" cx="290" cy="520" r="240" fill="url(#fireGlow)"/>
      <rect width="400" height="800" fill="url(#vignette)"/>
    </g>
    ${label(91, 300, 'Bookshelf', 'shelf')}
    ${label(290, 410, 'Stats & goals', 'stats')}
    ${label(320, 705, stats.reading.length ? 'Current reads' : 'Start a book', 'current')}
  </svg>`;
}

// Fill the screen on phones (slight side crop), letterbox on wide screens.
export function fitScene(svg) {
  if (!svg) return;
  const ratio = window.innerWidth / window.innerHeight;
  svg.setAttribute('preserveAspectRatio', ratio < 0.62 ? 'xMidYMid slice' : 'xMidYMid meet');
}
