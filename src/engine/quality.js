/** Scene LOD. Full on capable desktops; cheap on phones / after frame hitches. */

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

function apply(q, cheap) {
  q.cheap = cheap;
  q.hillStep = cheap ? 12 : 6;
  q.groundStep = cheap ? 8 : 4;
  q.grassStep = cheap ? 14 : 7;
  q.rutStep = cheap ? 16 : 9;
  q.propMul = cheap ? 1.65 : 1;
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
    noteFrame(frameDt) {
      if (frameDt > 0.024) {
        q._slow = Math.min(30, q._slow + 2);
        q._hold = 45;
      } else {
        q._slow = Math.max(0, q._slow - 1);
        if (q._hold > 0) q._hold -= 1;
      }
      if (preferCheap()) {
        apply(q, true);
        return;
      }
      apply(q, q._slow > 10 || (q.cheap && q._hold > 0));
    },
  };
  apply(q, preferCheap());
  return q;
}
