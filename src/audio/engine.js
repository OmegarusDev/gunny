import { pageHidden } from '../engine/page.js';
import { clamp01 } from '../util/math.js';

let ctx = null;
let buses = null;
let mixer = { muted: false, gunshot: 0.8, footsteps: 0.8, ambient: 0.55 };
let portraitMute = false;
let soundscape = 'forest';
let banks = null;
let satCurve = null;
let fx = null;
let noiseCursor = 0;
let blastCursor = 0;

export const IR_SPEC = {
  forest: { dur: 0.32, decay: 5.4, treble: 9.5, damp: 0.14, shelf: -7, wetMul: 1, taps: [0.016, 0.029, 0.048, 0.074, 0.11] },
  fen: { dur: 0.46, decay: 3.6, treble: 11, damp: 0.1, shelf: -9, wetMul: 1.2, taps: [0.022, 0.041, 0.068, 0.11, 0.16] },
  transylvania: { dur: 0.5, decay: 3.1, treble: 8, damp: 0.09, shelf: -11, wetMul: 1.25, taps: [0.019, 0.038, 0.071, 0.094, 0.14] },
  desert: { dur: 0.18, decay: 8.8, treble: 6.2, damp: 0.2, shelf: -4, wetMul: 0.72, taps: [0.012, 0.027, 0.051] },
  quarry: { dur: 0.58, decay: 2.7, treble: 7, damp: 0.11, shelf: -6, wetMul: 1.35, taps: [0.018, 0.036, 0.054, 0.088, 0.13, 0.19] },
};

export function audioContext() {
  if (pageHidden()) return null;
  const Ctor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

export function currentSoundscape() {
  return soundscape;
}

export function irSpec(id = soundscape) {
  return IR_SPEC[id] || IR_SPEC.forest;
}

export function setSoundscape(id) {
  const next = IR_SPEC[id] ? id : 'forest';
  const changed = next !== soundscape;
  soundscape = next;
  if (changed && fx?.conv && ctx) {
    fx.conv.buffer = bakeIR(ctx, soundscape);
    const spec = irSpec();
    if (fx.air) fx.air.gain.value = spec.shelf;
  }
  return soundscape;
}

function ambientGain() {
  return portraitMute ? 0 : mixer.ambient;
}

function syncBuses() {
  if (!buses) return;
  buses.master.gain.value = mixer.muted ? 0 : 1;
  buses.gun.gain.value = mixer.gunshot;
  buses.foot.gain.value = mixer.footsteps;
  buses.amb.gain.value = ambientGain();
}

export function ensureGraph(audio) {
  if (buses && buses.master.context === audio) return buses;
  const master = audio.createGain();
  const gun = audio.createGain();
  const foot = audio.createGain();
  const amb = audio.createGain();
  gun.connect(master);
  foot.connect(master);
  amb.connect(master);
  master.connect(audio.destination);
  buses = { master, gun, foot, amb };
  syncBuses();
  return buses;
}

export function sink(audio, bus = 'gun') {
  const g = ensureGraph(audio);
  return g[bus] || g.gun;
}

export function applyMixer(settings = {}) {
  mixer = {
    muted: !!settings.muted,
    gunshot: clamp01(settings.gunshot, mixer.gunshot),
    footsteps: clamp01(settings.footsteps, mixer.footsteps),
    ambient: clamp01(settings.ambient, mixer.ambient),
  };
  syncBuses();
}

export function setPortraitMute(on) {
  portraitMute = !!on;
  syncBuses();
}

export function resumeEngine() {
  if (pageHidden()) return null;
  const Ctor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended' || ctx.state === 'interrupted') ctx.resume();
  ensureGraph(ctx);
  ensureBanks(ctx);
  ensureFx(ctx);
  syncBuses();
  return ctx;
}

export function suspendEngine() {
  if (ctx && ctx.state === 'running') ctx.suspend();
}

function watchPortrait() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  const mq = window.matchMedia('(orientation: portrait)');
  const sync = () => setPortraitMute(!!mq.matches);
  sync();
  if (mq.addEventListener) mq.addEventListener('change', sync);
  else mq.addListener(sync);
  window.addEventListener('orientationchange', sync);
}

watchPortrait();

function fillWhite(data) {
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

function fillPink(data) {
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  let peak = 1e-6;
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const s = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    data[i] = s;
    peak = Math.max(peak, Math.abs(s));
  }
  const k = 0.9 / peak;
  for (let i = 0; i < data.length; i++) data[i] *= k;
}

function fillBrown(data) {
  let last = 0;
  let peak = 1e-6;
  for (let i = 0; i < data.length; i++) {
    last += (Math.random() * 2 - 1) * 0.08;
    last *= 0.97;
    data[i] = last;
    peak = Math.max(peak, Math.abs(last));
  }
  const k = 0.9 / peak;
  for (let i = 0; i < data.length; i++) data[i] *= k;
}

function fillFriedlander(data, sr, tau, b) {
  for (let i = 0; i < data.length; i++) {
    const t = i / sr;
    data[i] = (1 - t / tau) * Math.exp((-b * t) / tau);
  }
}

function makeBuffer(audio, seconds, fill) {
  const n = Math.max(1, Math.floor(audio.sampleRate * seconds));
  const buf = audio.createBuffer(1, n, audio.sampleRate);
  fill(buf.getChannelData(0));
  return buf;
}

function makeBlasts(audio) {
  const sr = audio.sampleRate;
  const shapes = [
    [0.0021, 0.92],
    [0.0027, 1.05],
    [0.0033, 1.12],
    [0.0039, 0.98],
  ];
  return shapes.map(([tau, b]) => {
    const n = Math.floor(sr * 0.012);
    const buf = audio.createBuffer(1, n, sr);
    fillFriedlander(buf.getChannelData(0), sr, tau, b);
    return buf;
  });
}

export function ensureBanks(audio) {
  if (banks && banks.sr === audio.sampleRate) return banks;
  banks = {
    sr: audio.sampleRate,
    white: makeBuffer(audio, 4, fillWhite),
    pink: makeBuffer(audio, 4, fillPink),
    brown: makeBuffer(audio, 4, fillBrown),
    blast: makeBlasts(audio),
  };
  noiseCursor = 0;
  blastCursor = 0;
  return banks;
}

export function bank(kind) {
  return banks?.[kind] || banks?.white;
}

export function pickBlast() {
  const list = banks?.blast;
  if (!list?.length) return null;
  const buf = list[blastCursor % list.length];
  blastCursor += 1;
  return buf;
}

function bakeIR(audio, id) {
  const spec = irSpec(id);
  const sr = audio.sampleRate;
  const n = Math.floor(sr * spec.dur);
  const buf = audio.createBuffer(2, n, sr);
  const L = buf.getChannelData(0);
  const R = buf.getChannelData(1);
  const pre = Math.floor(sr * 0.007);
  let aL = 0;
  let aR = 0;
  const damp = spec.damp;
  for (let i = 0; i < n; i++) {
    const t = Math.max(0, (i - pre) / sr);
    const late = Math.exp(-t * spec.decay);
    const air = Math.exp(-t * spec.treble);
    const env = i < pre ? 0 : late * (0.22 + 0.78 * air);
    aL += damp * ((Math.random() * 2 - 1) * env - aL);
    aR += damp * ((Math.random() * 2 - 1) * env - aR);
    L[i] = aL;
    R[i] = aR;
  }
  for (const tap of spec.taps) {
    const k0 = Math.floor((tap + 0.007) * sr);
    const width = Math.max(4, Math.floor(sr * 0.0018));
    const g = 0.55 * Math.exp(-tap * 6.4);
    for (let j = 0; j < width; j++) {
      const k = k0 + j;
      if (k >= n) break;
      const env = (1 - j / width) * g;
      L[k] += (Math.random() * 2 - 1) * env;
      R[k] += (Math.random() * 2 - 1) * env;
    }
  }
  let peak = 1e-6;
  for (let i = 0; i < n; i++) {
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const k = 0.82 / peak;
  for (let i = 0; i < n; i++) {
    L[i] *= k;
    R[i] *= k;
  }
  return buf;
}

export function ensureFx(audio) {
  if (fx && fx.ctx === audio) return fx;
  const spec = irSpec();
  const conv = audio.createConvolver();
  conv.normalize = false;
  conv.buffer = bakeIR(audio, soundscape);
  const wet = audio.createGain();
  wet.gain.value = 1;
  const air = audio.createBiquadFilter();
  air.type = 'highshelf';
  air.frequency.value = 2400;
  air.gain.value = spec.shelf;
  wet.connect(conv);
  conv.connect(air);
  air.connect(sink(audio));
  fx = { ctx: audio, conv, wet, air };
  return fx;
}

export function saturator(audio) {
  const sh = audio.createWaveShaper();
  if (!satCurve) {
    const n = 256;
    satCurve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      satCurve[i] = Math.tanh(x * 4.4);
    }
  }
  sh.curve = satCurve;
  sh.oversample = '2x';
  return sh;
}

/** Instant attack, exponential decay. Web Audio forbids ramping to 0. */
export function hit(param, t0, peak, decay, attack = 0.0008) {
  const p = Math.max(0.0001, peak);
  const a = Math.max(0.0002, attack);
  param.cancelScheduledValues(t0);
  param.setValueAtTime(0.0001, t0);
  param.exponentialRampToValueAtTime(p, t0 + a);
  param.exponentialRampToValueAtTime(0.0001, t0 + Math.max(a + 0.002, decay));
}

export function sweep(param, t0, from, to, dur) {
  const a = Math.max(1, from);
  const b = Math.max(1, to);
  param.cancelScheduledValues(t0);
  param.setValueAtTime(a, t0);
  param.exponentialRampToValueAtTime(b, t0 + Math.max(0.004, dur));
}

export function panDest(audio, dest, pan) {
  if (typeof audio.createStereoPanner !== 'function') return dest;
  const node = audio.createStereoPanner();
  node.pan.value = Math.max(-0.85, Math.min(0.85, pan));
  node.connect(dest);
  return node;
}

function chainTo(src, filters, g) {
  let node = src;
  for (const f of filters) {
    node.connect(f);
    node = f;
  }
  node.connect(g);
}

function fanOut(g, dest) {
  const outs = Array.isArray(dest) ? dest : [dest];
  for (const d of outs) if (d) g.connect(d);
}

function sliceOffset(buf, hold) {
  const maxOff = Math.max(0, buf.duration - hold - 0.02);
  if (maxOff <= 0) return 0;
  const slots = 8;
  const span = maxOff / slots;
  const slot = noiseCursor % slots;
  noiseCursor += 1;
  return slot * span + Math.random() * span;
}

export function noiseBurst(audio, kind, t, { dur, peak, decay, dest, filters = [], attack } = {}) {
  const buf = bank(kind);
  if (!buf) return;
  const src = audio.createBufferSource();
  src.buffer = buf;
  const g = audio.createGain();
  hit(g.gain, t, peak, decay || dur, attack);
  chainTo(src, filters, g);
  fanOut(g, dest);
  const hold = Math.max(0.02, dur || decay || 0.08);
  src.start(t, sliceOffset(buf, hold), hold);
  src.stop(t + hold + 0.03);
}

export function playBuffer(audio, buf, t, { dest, peak, decay, rate = 1, filters = [], attack } = {}) {
  if (!buf) return;
  const src = audio.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = audio.createGain();
  const hold = buf.duration / Math.max(0.25, rate);
  hit(g.gain, t, peak, decay || hold, attack);
  chainTo(src, filters, g);
  fanOut(g, dest);
  src.start(t);
  src.stop(t + hold + 0.02);
}
