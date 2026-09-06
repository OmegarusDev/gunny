import { TARGET_ASPECT } from '../config.js';

export function createCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const viewport = { w: 1280, h: 720, dpr: 1, cssW: 1280, cssH: 720 };

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    let cssW = w;
    let cssH = w / TARGET_ASPECT;
    if (cssH > h) {
      cssH = h;
      cssW = h * TARGET_ASPECT;
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    viewport.w = cssW;
    viewport.h = cssH;
    viewport.cssW = cssW;
    viewport.cssH = cssH;
    viewport.dpr = dpr;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  resize();

  return { canvas, ctx, viewport, resize };
}
