/** Scene LOD stays locked. Hitching only drops FX so the road cannot swap maps. */

export function capDpr(raw, max) {
  const n = Number(raw) || 1;
  return Math.max(1, Math.min(n, max));
}

function preferCheap() {
  if (typeof navigator === 'undefined') return false;
  const cores = navigator.hardwareConcurrency || 8;
  if (cores <= 4) return true;
  if (typeof window !== 'undefined' && (window.devicePixelRatio || 1) >= 3) return true;
  return false;
}

function applyFx(q, cheap) {
  q.cheap = cheap;
  q.fx = !cheap;
  q.smoothing = cheap ? 'low' : 'medium';
}

export function createQuality() {
  const q = {
    cheap: false,
    hillStep: 6,
    groundStep: 4,
    grassStep: 7,
    rutStep: 9,
    propMul: 1,
    fx: true,
    smoothing: 'medium',
    _slow: 0,
    _hold: 0,
    _trips: 0,
    noteFrame(frameDt) {
      if (frameDt > 0.028) {
        q._slow = Math.min(30, q._slow + 2);
        q._hold = 180;
      } else if (frameDt < 0.018) {
        q._slow = Math.max(0, q._slow - 1);
        if (q._hold > 0) q._hold -= 1;
      }
      let nextCheap = preferCheap() || q._slow > 10 || q._hold > 0;
      if (!q.cheap && nextCheap) q._trips += 1;
      if (q._trips >= 2) nextCheap = true;
      applyFx(q, nextCheap);
    },
  };
  applyFx(q, preferCheap());
  return q;
}
