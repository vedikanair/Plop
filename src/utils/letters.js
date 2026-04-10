/**
 * Letter groups are the source of truth for supported letters.
 * Keep these data-driven so analytics/adaptation scale automatically.
 */
export const LETTER_GROUPS = {
  bd_pq: ['b', 'd', 'p', 'q'],
  ij: ['i', 'j'],
  wm: ['w', 'm'],
  uv: ['u', 'v'],
  hn: ['h', 'n'],
  co: ['c', 'o'],
  ft: ['f', 't'],
};

export const ALL_LETTERS = Array.from(
  new Set(Object.values(LETTER_GROUPS).flat())
).sort();

// Back-compat: legacy code imports LETTERS.
export const LETTERS = ALL_LETTERS;

export const GAME_DURATIONS = [30, 60];
export const DEFAULT_GAME_DURATION = 60;
// Back-compat: legacy code imports GAME_DURATION.
export const GAME_DURATION = DEFAULT_GAME_DURATION;

export const STORAGE_KEY = 'plop_high_score';
export const ML_LOG_KEY = 'plop_ml_sessions';

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function hslToHex(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp01(s);
  const ll = clamp01(l);
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function makeFallbackColors(letter) {
  // Deterministic per-letter colors (stable across sessions).
  const code = String(letter).toLowerCase().charCodeAt(0) || 97;
  const hue = (code - 97) * 28; // spreads letters around hue wheel
  const fg = hslToHex(hue, 0.55, 0.35);
  const bg = hslToHex(hue, 0.55, 0.88);
  return { fg, bg };
}

const BASE_COLORS = {
  b: { fg: '#1A4FA0', bg: '#D6E4FF' },
  d: { fg: '#1A6B3A', bg: '#D6F0E0' },
  p: { fg: '#5C1F8A', bg: '#EDD6FF' },
  q: { fg: '#A02020', bg: '#FFD6D6' },
};

export const LETTER_COLORS = Object.fromEntries(
  ALL_LETTERS.map((l) => {
    const c = BASE_COLORS[l] ?? makeFallbackColors(l);
    return [l, c.fg];
  })
);

export const LETTER_BG_COLORS = Object.fromEntries(
  ALL_LETTERS.map((l) => {
    const c = BASE_COLORS[l] ?? makeFallbackColors(l);
    return [l, c.bg];
  })
);
