import { DESIGN_H } from '../config.js';

export function createCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const viewport = {
    w: DESIGN_H * (16 / 9),
    h: DESIGN_H,
    dpr: 1,
    cssW: DESIGN_H * (16 / 9),
    cssH: DESIGN_H,
    scale: 1,
  };

  function resize() {
    const cssW = Math.max(1, window.innerWidth);
    const cssH = Math.max(1, window.innerHeight);
    const dpr = window.devicePixelRatio || 1;
    const scale = cssH / DESIGN_H;
    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    viewport.w = cssW / scale;
    viewport.h = DESIGN_H;
    viewport.cssW = cssW;
    viewport.cssH = cssH;
    viewport.scale = scale;
    viewport.dpr = dpr;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  window.visualViewport?.addEventListener('resize', resize);
  resize();

  return { canvas, ctx, viewport, resize };
}
