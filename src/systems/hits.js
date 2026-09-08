export function segmentHitsCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  if (a < 1e-8) {
    return fx * fx + fy * fy <= r * r ? { t: 0, x: x1, y: y1 } : null;
  }
  let disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  disc = Math.sqrt(disc);
  const t1 = (-b - disc) / (2 * a);
  const t2 = (-b + disc) / (2 * a);
  let t = Infinity;
  if (t1 >= 0 && t1 <= 1) t = t1;
  if (t2 >= 0 && t2 <= 1 && t2 < t) t = t2;
  if (t === Infinity) return null;
  return { t, x: x1 + dx * t, y: y1 + dy * t };
}

export function rectCircleOverlap(rx, ry, rw, rh, cx, cy, cr) {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= cr * cr;
}
