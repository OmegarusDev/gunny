/** Shared color math for scenery FX and cut-paper figures. */

export function hexRgb(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  if (Number.isNaN(n)) return { r: 0, g: 0, b: 0 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbStr(r, g, b, a = 1) {
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

function mixChannels(a, b, t) {
  const A = hexRgb(a);
  const B = hexRgb(b);
  const u = Math.max(0, Math.min(1, t));
  return {
    r: A.r + (B.r - A.r) * u,
    g: A.g + (B.g - A.g) * u,
    b: A.b + (B.b - A.b) * u,
  };
}

/** Canvas-friendly rgba mix. */
export function mixHex(a, b, t) {
  const c = mixChannels(a, b, t);
  return rgbStr(c.r, c.g, c.b);
}

/** Opaque #rrggbb mix (cut-paper fills). */
export function mixTone(a, b, t) {
  const c = mixChannels(a, b, t);
  const r = Math.round(c.r);
  const g = Math.round(c.g);
  const bl = Math.round(c.b);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

export function shadeHex(hex, t) {
  return mixHex(hex, t < 0 ? '#000000' : '#fff6e8', Math.min(1, Math.abs(t)));
}

export function fillRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

export function strokeRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.stroke();
}
