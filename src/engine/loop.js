export function createLoop(fixedDt, maxFrameDt) {
  let last = performance.now();
  let acc = 0;
  return {
    tick(now) {
      let frame = Math.min((now - last) / 1000, maxFrameDt);
      last = now;
      acc += frame;
      let steps = 0;
      while (acc >= fixedDt) {
        acc -= fixedDt;
        steps += 1;
        if (steps > 8) {
          acc = 0;
          break;
        }
      }
      return { steps, dt: fixedDt, alpha: acc / fixedDt, frame };
    },
    reset() {
      last = performance.now();
      acc = 0;
    },
  };
}
