// Colour contrast helpers (WCAG 2), used to keep text readable whatever theme
// or custom colours are set in site.config.ts.

function parseHex(color: string): [number, number, number] | null {
  const hex = color.trim().replace(/^#/, "");
  const full = hex.length === 3 ? hex.replace(/./g, "$&$&") : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]) {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: [number, number, number], b: [number, number, number]) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function toHex(rgb: number[]) {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

function toHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === rn ? ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6 : max === gn ? ((bn - rn) / d + 2) / 6 : ((rn - gn) / d + 4) / 6;
  return [h, s, l];
}

function fromHsl([h, s, l]: [number, number, number]): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
}

// The same hue, made darker (or lighter on a dark background) just far enough
// to reach `min` contrast on `background`. Light accents such as mint or the
// pastels make good buttons but unreadable link text; this gives links a
// deeper shade of the same colour. Colours that are not hex are returned as is.
export function readableOn(color: string, background: string, min = 4.5) {
  const c = parseHex(color);
  const bg = parseHex(background);
  if (!c || !bg) return color;
  const [h, s, l] = toHsl(c);
  const step = luminance(bg) > 0.5 ? -0.01 : 0.01;
  for (let next = l; next >= 0 && next <= 1; next += step) {
    // Ease the saturation off as the shade deepens, so a pastel turns into a
    // muted darker tone of itself rather than a loud primary colour.
    const rgb = fromHsl([h, s * Math.sqrt(Math.min(next, l) / Math.max(l, 0.01)), next]);
    if (contrast(rgb, bg) >= min) return toHex(rgb);
  }
  return color;
}
