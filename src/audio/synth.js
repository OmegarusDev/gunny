let ctx = null;
let buses = null;
let mixer = { muted: false, gunshot: 0.8, footsteps: 0.8, ambient: 0.55 };
let ambNodes = null;
let portraitMute = false;

function ac() {
  const Ctor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function clamp01(n, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
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

function ensureGraph(audio) {
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

function sink(audio, bus = 'gun') {
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

export function setMasterVolume(value) {
  applyMixer({ ...mixer, muted: !(Number(value) > 0), gunshot: Number(value) || mixer.gunshot });
}

export function setPortraitMute(on) {
  portraitMute = !!on;
  syncBuses();
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

export function resumeAudio() {
  const audio = ac();
  if (!audio) return;
  if (!bangBuf || bangBuf.sampleRate !== audio.sampleRate) bangBuf = bakeBang(audio);
  startAmbient(audio);
  syncBuses();
}

const noiseCache = new Map();
let satCurve = null;
let bangBuf = null;

const BANG_REVERB_S = 1.32;
const BANG_RATES = [8.4, 9.2, 10.1];

function noiseBuffer(audio, duration) {
  const n = Math.floor(audio.sampleRate * duration);
  const key = `${audio.sampleRate}:${n}`;
  let buf = noiseCache.get(key);
  if (!buf) {
    buf = audio.createBuffer(1, n, audio.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    noiseCache.set(key, buf);
  }
  return buf;
}

function saturator(audio) {
  const sh = audio.createWaveShaper();
  if (!satCurve) {
    const n = 256;
    satCurve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      satCurve[i] = Math.tanh(x * 4.2);
    }
  }
  sh.curve = satCurve;
  sh.oversample = '2x';
  return sh;
}

function dryTak(sr) {
  const n = Math.floor(sr * 0.012);
  const tak = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    tak[i] = (Math.random() * 2 - 1) * Math.exp(-(i / sr) * 420);
  }
  return tak;
}

function reverbIR(sr) {
  const n = Math.floor(sr * BANG_REVERB_S);
  const ir = new Float32Array(n);
  const taps = [0.013, 0.021, 0.029, 0.044, 0.061, 0.083, 0.112, 0.148, 0.19, 0.24];
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const early = t < 0.12 ? Math.exp(-t * 11) * 0.7 : 0;
    const late = Math.exp(-t * 1.65) * 0.85;
    ir[i] = (Math.random() * 2 - 1) * (early + late);
  }
  for (const tap of taps) {
    const k = Math.floor(tap * sr);
    if (k < n) ir[k] += (Math.random() * 2 - 1) * 0.62 * Math.exp(-tap * 6);
  }
  return ir;
}

function convolve(tak, ir) {
  const out = new Float32Array(tak.length + ir.length - 1);
  for (let i = 0; i < tak.length; i += 2) {
    const a = tak[i];
    const last = Math.min(ir.length, out.length - i);
    for (let j = 0; j < last; j++) out[i + j] += a * ir[j];
  }
  return out;
}

function saturateSamples(samples, drive) {
  let peak = 1e-6;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  const k = drive / peak;
  for (let i = 0; i < samples.length; i++) samples[i] = Math.tanh(samples[i] * k);
  return samples;
}

/** Dry tak → hard sat → thick reverb (original pitch) → sat again. Speed/pitch-up only on playback. */
function bakeBang(audio) {
  const sr = audio.sampleRate;
  const tak = saturateSamples(dryTak(sr), 8.6);
  const wet = saturateSamples(convolve(tak, reverbIR(sr)), 5.2);
  const buf = audio.createBuffer(1, wet.length, sr);
  buf.getChannelData(0).set(wet);
  return buf;
}

function playBangLayer(audio, dest, t, { rate, delay, gain }) {
  const src = audio.createBufferSource();
  src.buffer = bangBuf;
  src.playbackRate.value = rate;
  const g = audio.createGain();
  g.gain.value = gain;
  src.connect(g);
  g.connect(dest);
  src.start(t + delay);
  src.stop(t + delay + bangBuf.duration / rate + 0.02);
}

export function playMuzzle(stats = {}) {
  const audio = ac();
  if (!audio) return;
  const t = audio.currentTime;
  const out = sink(audio);
  const speed = Math.max(280, Number(stats.bulletSpeed) || 1600);
  const heavy = Math.min(1, (speed - 280) / 760);
  const punch = Math.min(1, Math.max(0, ((Number(stats.damage) || 13) - 8) / 22));

  if (!bangBuf || bangBuf.sampleRate !== audio.sampleRate) bangBuf = bakeBang(audio);

  const crack = audio.createGain();
  crack.gain.value = 0.78 + heavy * 0.08;
  const grit = saturator(audio);
  crack.connect(grit);
  grit.connect(out);

  playBangLayer(audio, crack, t, { rate: BANG_RATES[0], delay: 0, gain: 0.74 });
  playBangLayer(audio, crack, t, { rate: BANG_RATES[1], delay: 0.005, gain: 0.5 });
  playBangLayer(audio, crack, t, { rate: BANG_RATES[2], delay: 0.011, gain: 0.32 });

  const thud = audio.createOscillator();
  const thudG = audio.createGain();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(68 + heavy * 14 + punch * 8, t);
  thud.frequency.exponentialRampToValueAtTime(28, t + 0.12);
  thudG.gain.setValueAtTime(0.36 + punch * 0.06, t);
  thudG.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
  thud.connect(thudG);
  thudG.connect(out);
  thud.start(t);
  thud.stop(t + 0.14);

  const chest = audio.createBufferSource();
  chest.buffer = noiseBuffer(audio, 0.1);
  const chestLp = audio.createBiquadFilter();
  chestLp.type = 'lowpass';
  chestLp.frequency.setValueAtTime(220 + heavy * 40, t);
  chestLp.frequency.exponentialRampToValueAtTime(70, t + 0.08);
  const chestG = audio.createGain();
  chestG.gain.setValueAtTime(0.12, t);
  chestG.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  chest.connect(chestLp);
  chestLp.connect(chestG);
  chestG.connect(out);
  chest.start(t);
  chest.stop(t + 0.1);
}

function metalClick(audio, dest, t, freq, gain, dur) {
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(420, freq * 0.62), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.008);
}

function playMech(audio, t0, { spikes = 4, span = 0.07, gain = 0.16, freq = 1900 } = {}) {
  const dest = sink(audio);
  for (let i = 0; i < spikes; i++) {
    const u = spikes === 1 ? 0 : i / (spikes - 1);
    const t = t0 + u * span + (Math.random() - 0.5) * 0.003;
    const f = freq * (0.78 + Math.random() * 0.55);
    metalClick(audio, dest, Math.max(t0, t), f, gain * (0.55 + Math.random() * 0.5), 0.009 + Math.random() * 0.007);
    if (Math.random() < 0.65) {
      metalClick(
        audio,
        dest,
        Math.max(t0, t) + 0.005 + Math.random() * 0.007,
        f * (1.25 + Math.random() * 0.35),
        gain * 0.32,
        0.007,
      );
    }
  }
}

export function playDry() {
  const audio = ac();
  if (!audio) return;
  const t = audio.currentTime;
  playMech(audio, t, { spikes: 3, span: 0.014, gain: 0.14, freq: 2400 });
  metalClick(audio, sink(audio), t, 2600, 0.08, 0.012);
}

export function playMagOut() {
  const audio = ac();
  if (!audio) return;
  const t = audio.currentTime + 0.18;
  const dest = sink(audio);
  playMech(audio, t, { spikes: 5, span: 0.05, gain: 0.15, freq: 2100 });
  metalClick(audio, dest, t + 0.012, 1650, 0.1, 0.014);
  playMech(audio, t + 0.04, { spikes: 3, span: 0.02, gain: 0.12, freq: 1400 });
}

export function playMagIn() {
  const audio = ac();
  if (!audio) return;
  const t = audio.currentTime;
  const dest = sink(audio);
  playMech(audio, t, { spikes: 6, span: 0.04, gain: 0.16, freq: 2300 });
  metalClick(audio, dest, t + 0.018, 1900, 0.11, 0.012);
  playMech(audio, t + 0.03, { spikes: 3, span: 0.016, gain: 0.13, freq: 1600 });
}

export function playCock(tight = false) {
  const audio = ac();
  if (!audio) return;
  const t = audio.currentTime;
  const dest = sink(audio);
  const span = tight ? 0.028 : 0.048;
  playMech(audio, t, { spikes: 5, span, gain: 0.16, freq: tight ? 2500 : 2100 });
  metalClick(audio, dest, t, 2200, 0.1, 0.012);
  playMech(audio, t + span * 0.62, { spikes: 4, span: 0.018, gain: 0.14, freq: 1700 });
  metalClick(audio, dest, t + span * 0.68, 1450, 0.09, 0.014);
}

export function playReloadTone() {
  /* Reload now uses mag/cock rattles instead of a rising beep. */
}

export function playPerfect() {
  playCock(true);
}

export function playFlesh(headshot) {
  const audio = ac();
  if (!audio) return;
  const t = audio.currentTime;
  const out = sink(audio);

  const slap = audio.createBufferSource();
  slap.buffer = noiseBuffer(audio, 0.12);
  const lp = audio.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = headshot ? 1100 : 420;
  const g = audio.createGain();
  g.gain.setValueAtTime(headshot ? 0.26 : 0.2, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + (headshot ? 0.1 : 0.14));
  slap.connect(lp);
  lp.connect(g);
  g.connect(out);
  slap.start(t);
  slap.stop(t + 0.14);

  const thud = audio.createOscillator();
  const tg = audio.createGain();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(headshot ? 110 : 68, t);
  thud.frequency.exponentialRampToValueAtTime(32, t + 0.12);
  tg.gain.setValueAtTime(headshot ? 0.14 : 0.18, t);
  tg.gain.exponentialRampToValueAtTime(0.01, t + 0.13);
  thud.connect(tg);
  tg.connect(out);
  thud.start(t);
  thud.stop(t + 0.14);

  if (headshot) {
    const crack = audio.createBufferSource();
    crack.buffer = noiseBuffer(audio, 0.06);
    const hp = audio.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2400;
    const cg = audio.createGain();
    cg.gain.setValueAtTime(0.22, t);
    cg.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
    crack.connect(hp);
    hp.connect(cg);
    cg.connect(out);
    crack.start(t);
    crack.stop(t + 0.05);
  }
}

export function playJam() {
  const audio = ac();
  if (!audio) return;
  const t = audio.currentTime;
  playMech(audio, t, { spikes: 7, span: 0.08, gain: 0.14, freq: 1500 });
  playMech(audio, t + 0.06, { spikes: 4, span: 0.03, gain: 0.12, freq: 1100 });
}

let footBusy = 0;
let brownBuf = null;

export function beginFootFrame() {
  footBusy = 0;
}

function panDest(audio, dest, pan) {
  if (typeof audio.createStereoPanner !== 'function') return dest;
  const node = audio.createStereoPanner();
  node.pan.value = Math.max(-0.85, Math.min(0.85, pan));
  node.connect(dest);
  return node;
}

function brownBuffer(audio) {
  if (brownBuf && brownBuf.sampleRate === audio.sampleRate) return brownBuf;
  const n = Math.floor(audio.sampleRate * 0.08);
  brownBuf = audio.createBuffer(1, n, audio.sampleRate);
  const data = brownBuf.getChannelData(0);
  let last = 0;
  let peak = 1e-6;
  for (let i = 0; i < n; i++) {
    last += (Math.random() * 2 - 1) * 0.09;
    last *= 0.97;
    data[i] = last;
    peak = Math.max(peak, Math.abs(last));
  }
  const k = 0.9 / peak;
  for (let i = 0; i < n; i++) data[i] *= k;
  return brownBuf;
}

function bakeGreen(audio) {
  const n = Math.floor(audio.sampleRate * 6);
  const buf = audio.createBuffer(1, n, audio.sampleRate);
  const data = buf.getChannelData(0);
  let lp = 0;
  let hp = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    lp += 0.09 * (w - lp);
    hp = w - lp;
    data[i] = lp * 0.82 + hp * 0.18;
  }
  const fade = Math.floor(audio.sampleRate * 0.08);
  for (let i = 0; i < fade; i++) {
    const e = i / fade;
    data[i] *= e;
    data[n - 1 - i] *= e;
  }
  return buf;
}

function startAmbient(audio) {
  if (ambNodes && ambNodes.context === audio) return;
  const graph = ensureGraph(audio);
  const src = audio.createBufferSource();
  src.buffer = bakeGreen(audio);
  src.loop = true;
  const bp = audio.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.65;
  bp.frequency.value = 780;
  const g = audio.createGain();
  g.gain.value = 0.048;
  src.connect(bp);
  bp.connect(g);
  g.connect(graph.amb);
  const lfo = audio.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08;
  const lfoG = audio.createGain();
  lfoG.gain.value = 420;
  lfo.connect(lfoG);
  lfoG.connect(bp.frequency);
  const trem = audio.createOscillator();
  trem.type = 'sine';
  trem.frequency.value = 0.13;
  const tremG = audio.createGain();
  tremG.gain.value = 0.018;
  trem.connect(tremG);
  tremG.connect(g.gain);
  src.start();
  lfo.start();
  trem.start();
  ambNodes = { context: audio, src };
}

export function playFoot({ voice = 'boot', crawl = false, dist = 0, pan = 0 } = {}) {
  const audio = ac();
  if (!audio) return false;
  const zombie = voice !== 'boot';
  if (zombie) {
    if (dist > 820) return false;
    if (footBusy >= 4) return false;
    footBusy += 1;
  }
  const t = audio.currentTime;
  const dest = panDest(audio, sink(audio, 'foot'), zombie ? pan : -0.22);
  const near = zombie ? Math.max(0.08, 1 / (1 + dist / 240)) : 1;
  const dur = crawl || voice === 'drag' ? 0.07 : 0.045;
  const src = audio.createBufferSource();
  src.buffer = brownBuffer(audio);
  src.playbackRate.value = (crawl || voice === 'drag' ? 0.72 : zombie ? 0.88 : 1) * (0.94 + Math.random() * 0.12);
  const g = audio.createGain();
  const peak = (crawl || voice === 'drag' ? 0.1 : zombie ? 0.16 : 0.2) * near;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(g);
  g.connect(dest);
  src.start(t);
  src.stop(t + dur + 0.01);
  return true;
}
