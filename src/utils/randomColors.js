function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function hslToRgb(h, s, l) {
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
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function rgbToHex({ r, g, b }) {
  const to = (v) => v.toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function relativeLuminance({ r, g, b }) {
  const srgb = [r, g, b].map((v) => v / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/**
 * Random, per-bubble palette with readable contrast.
 * - Background: pastel-ish
 * - Foreground/border: dark enough for readability
 */
export function randomBubbleColors(rng = Math.random) {
  const hue = Math.floor(rng() * 360);
  const bgRgb = hslToRgb(hue, 0.65, 0.88);
  const bg = rgbToHex(bgRgb);

  // Choose a dark-ish fg; adjust if background is unexpectedly dark.
  const bgLum = relativeLuminance(bgRgb);
  const fgL = bgLum < 0.6 ? 0.18 : 0.30;
  const fgRgb = hslToRgb(hue, 0.55, fgL);
  const fg = rgbToHex(fgRgb);

  return { bg, fg, border: fg };
}

