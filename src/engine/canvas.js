import { DESIGN_H, MAX_DPR } from '../config.js';
import { capDpr, createQuality } from './quality.js';

export function createCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const quality = createQuality();
  const viewport = {
    w: DESIGN_H * (16 / 9),
    h: DESIGN_H,
    dpr: 1,
    cssW: DESIGN_H * (16 / 9),
    cssH: DESIGN_H,
    scale: 1,
    quality,
  };

  function resize() {
    const host = canvas.parentElement || canvas;
    const cssW = Math.max(1, host.clientWidth || window.innerWidth);
    const cssH = Math.max(1, host.clientHeight || window.innerHeight);
    const dpr = capDpr(window.devicePixelRatio, MAX_DPR);
    const scale = cssH / DESIGN_H;
    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = quality.smoothing;
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
  document.addEventListener('fullscreenchange', resize);
  document.addEventListener('webkitfullscreenchange', resize);
  resize();

  return { canvas, ctx, viewport, resize };
}
