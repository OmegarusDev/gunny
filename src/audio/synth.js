import {
  applyMixer as applyEngineMixer,
  audioContext,
  bank,
  currentSoundscape,
  ensureBanks,
  ensureFx,
  ensureGraph,
  hit,
  irSpec,
  noiseBurst,
  panDest,
  pickBlast,
  playBuffer,
  resumeEngine,
  saturator,
  setPortraitMute,
  setSoundscape as setEngineSoundscape,
  sink,
  suspendEngine,
  sweep,
} from './engine.js';
import { pageHidden } from '../engine/page.js';

export { setPortraitMute };

let scene = currentSoundscape();

export function applyMixer(settings) {
  applyEngineMixer(settings);
}

export function setSoundscape(id) {
  scene = setEngineSoundscape(id);
  if (ambNodes?.context && !pageHidden()) startAmbient(ambNodes.context);
  return scene;
}

export function resumeAudio() {
  const audio = resumeEngine();
  if (!audio) return;
  startAmbient(audio);
}

export function suspendAudio() {
  stopAmbient();
  suspendEngine();
}

export const RECEIVER_TONES = {
  t1_stock: {
    crackF: 1880,
    crackQ: 1.55,
    bodyFrom: 1320,
    bodyTo: 340,
    bodyDecay: 0.09,
    subF: 56,
    click: 0.62,
    wet: 0.34,
    drive: 1,
    tail: 0.38,
    mechDelay: 0.02,
    mechF: 1680,
    mech: 0.11,
  },
  t2_tactical: {
    crackF: 2280,
    crackQ: 1.9,
    bodyFrom: 1540,
    bodyTo: 410,
    bodyDecay: 0.078,
    subF: 62,
    click: 0.7,
    wet: 0.3,
    drive: 0.92,
    tail: 0.32,
    mechDelay: 0.016,
    mechF: 1980,
    mech: 0.1,
  },
  t3_ordnance: {
    crackF: 2620,
    crackQ: 2.25,
    bodyFrom: 1760,
    bodyTo: 470,
    bodyDecay: 0.068,
    subF: 68,
    click: 0.78,
    wet: 0.27,
    drive: 0.84,
    tail: 0.28,
    mechDelay: 0.013,
    mechF: 2280,
    mech: 0.09,
  },
  t4_duty: {
    crackF: 2960,
    crackQ: 2.6,
    bodyFrom: 1980,
    bodyTo: 530,
    bodyDecay: 0.058,
    subF: 74,
    click: 0.84,
    wet: 0.24,
    drive: 0.76,
    tail: 0.25,
    mechDelay: 0.011,
    mechF: 2520,
    mech: 0.085,
  },
  t5_advanced: {
    crackF: 3340,
    crackQ: 3.05,
    bodyFrom: 2180,
    bodyTo: 590,
    bodyDecay: 0.05,
    subF: 80,
    click: 0.9,
    wet: 0.21,
    drive: 0.68,
    tail: 0.22,
    mechDelay: 0.009,
    mechF: 2760,
    mech: 0.08,
  },
};

function jitter(n, amt = 0.05) {
  return n * (1 + (Math.random() * 2 - 1) * amt);
}

function toneFor(receiver, stats) {
  const base = RECEIVER_TONES[receiver] || RECEIVER_TONES.t1_stock;
  const speed = Math.max(280, Number(stats?.bulletSpeed) || 1600);
  const heavy = Math.min(1, (speed - 280) / 1400);
  const punch = Math.min(1, Math.max(0, ((Number(stats?.damage) || 15) - 12) / 40));
  return {
    ...base,
    crackF: base.crackF * (0.94 + heavy * 0.12),
    subF: base.subF + punch * 10,
    wet: base.wet * (1.05 - heavy * 0.08),
    click: base.click * (0.92 + heavy * 0.1),
  };
}

function sineHit(audio, dest, t, freq, peak, decay) {
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(Math.max(20, freq), t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * 0.62), t + decay);
  hit(g.gain, t, peak, decay, 0.0003);
  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(t + decay + 0.02);
}

export function playMuzzle(stats = {}, place = {}) {
  const audio = audioContext();
  if (!audio) return;
  ensureGraph(audio);
  ensureBanks(audio);
  if (place.biome) setSoundscape(place.biome);
  const fx = ensureFx(audio);
  const t = audio.currentTime;
  const out = sink(audio);
  const p = toneFor(place.receiver, stats);
  const j = jitter(1, 0.045);
  const room = irSpec();

  const dry = audio.createGain();
  const drive = audio.createGain();
  const grit = saturator(audio);
  drive.gain.value = 0.72 + p.drive * 0.38;
  dry.connect(drive);
  drive.connect(grit);
  grit.connect(out);

  const wet = audio.createGain();
  wet.gain.value = p.wet * room.wetMul * j;
  wet.connect(fx.wet);

  const blastLp = audio.createBiquadFilter();
  blastLp.type = 'lowpass';
  blastLp.frequency.value = 640 + p.bodyFrom * 0.18;
  blastLp.Q.value = 0.8;
  playBuffer(audio, pickBlast(), t, {
    dest: dry,
    peak: 0.42 * p.drive,
    decay: 0.0075,
    rate: jitter(1, 0.05),
    filters: [blastLp],
    attack: 0.0002,
  });

  const hp = audio.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2700 * j;
  hp.Q.value = 0.7;
  noiseBurst(audio, 'white', t, {
    dur: 0.014,
    peak: 0.48 * p.click,
    decay: 0.009,
    dest: dry,
    filters: [hp],
    attack: 0.0003,
  });

  sineHit(audio, dry, t, p.crackF * 1.42 * j, 0.2 * p.click, 0.0042);

  const bp = audio.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = p.crackF * j;
  bp.Q.value = p.crackQ * jitter(1, 0.06);
  const air = audio.createBiquadFilter();
  air.type = 'peaking';
  air.frequency.value = p.crackF * 2.45;
  air.gain.value = 6.2;
  air.Q.value = 0.75;
  noiseBurst(audio, 'white', t, {
    dur: 0.05,
    peak: 0.72 * p.drive,
    decay: 0.03,
    dest: dry,
    filters: [bp, air],
    attack: 0.0005,
  });

  const bodyLp = audio.createBiquadFilter();
  bodyLp.type = 'lowpass';
  bodyLp.Q.value = 1.7;
  sweep(bodyLp.frequency, t, p.bodyFrom * j, p.bodyTo, p.bodyDecay);
  noiseBurst(audio, 'pink', t, {
    dur: p.bodyDecay + 0.04,
    peak: 0.55 * p.drive,
    decay: p.bodyDecay,
    dest: [dry, wet],
    filters: [bodyLp],
    attack: 0.0012,
  });

  sineHit(audio, dry, t, p.subF * j, 0.28 + (p.subF - 56) * 0.002, 0.11);
  const chestLp = audio.createBiquadFilter();
  chestLp.type = 'lowpass';
  chestLp.frequency.value = 140;
  chestLp.Q.value = 0.9;
  noiseBurst(audio, 'brown', t, {
    dur: 0.12,
    peak: 0.16,
    decay: 0.1,
    dest: dry,
    filters: [chestLp],
    attack: 0.002,
  });

  const tailLp = audio.createBiquadFilter();
  tailLp.type = 'lowpass';
  tailLp.Q.value = 0.85;
  sweep(tailLp.frequency, t, 1600, 380, p.tail);
  noiseBurst(audio, 'pink', t, {
    dur: p.tail + 0.08,
    peak: 0.22,
    decay: p.tail,
    dest: wet,
    filters: [tailLp],
    attack: 0.004,
  });

  playMech(audio, t + p.mechDelay, {
    spikes: 2,
    span: 0.011,
    gain: p.mech,
    freq: p.mechF,
  });
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

function magBody(audio, dest, t, peak) {
  const lp = audio.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 320;
  lp.Q.value = 0.7;
  noiseBurst(audio, 'brown', t, {
    dur: 0.09,
    peak,
    decay: 0.075,
    dest,
    filters: [lp],
    attack: 0.002,
  });
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
  const audio = audioContext();
  if (!audio) return;
  ensureBanks(audio);
  const t = audio.currentTime;
  const dest = sink(audio);
  playMech(audio, t, { spikes: 3, span: 0.014, gain: 0.14, freq: 2400 });
  metalClick(audio, dest, t, 2600, 0.08, 0.012);
  const hp = audio.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 3200;
  noiseBurst(audio, 'white', t, {
    dur: 0.02,
    peak: 0.12,
    decay: 0.012,
    dest,
    filters: [hp],
    attack: 0.0003,
  });
}

export function playMagOut() {
  const audio = audioContext();
  if (!audio) return;
  ensureBanks(audio);
  const t = audio.currentTime + 0.18;
  const dest = sink(audio);
  magBody(audio, dest, t, 0.14);
  playMech(audio, t, { spikes: 5, span: 0.05, gain: 0.15, freq: 2100 });
  metalClick(audio, dest, t + 0.012, 1650, 0.1, 0.014);
  playMech(audio, t + 0.04, { spikes: 3, span: 0.02, gain: 0.12, freq: 1400 });
}

export function playMagIn() {
  const audio = audioContext();
  if (!audio) return;
  ensureBanks(audio);
  const t = audio.currentTime;
  const dest = sink(audio);
  magBody(audio, dest, t, 0.16);
  playMech(audio, t, { spikes: 6, span: 0.04, gain: 0.16, freq: 2300 });
  metalClick(audio, dest, t + 0.018, 1900, 0.11, 0.012);
  playMech(audio, t + 0.03, { spikes: 3, span: 0.016, gain: 0.13, freq: 1600 });
}

export function playCock(tight = false) {
  const audio = audioContext();
  if (!audio) return;
  const t = audio.currentTime;
  const dest = sink(audio);
  const span = tight ? 0.028 : 0.048;
  playMech(audio, t, { spikes: 5, span, gain: 0.16, freq: tight ? 2500 : 2100 });
  metalClick(audio, dest, t, 2200, 0.1, 0.012);
  playMech(audio, t + span * 0.62, { spikes: 4, span: 0.018, gain: 0.14, freq: 1700 });
  metalClick(audio, dest, t + span * 0.68, 1450, 0.09, 0.014);
}

export function playPerfect() {
  playCock(true);
}

export function playFlesh(headshot) {
  const audio = audioContext();
  if (!audio) return;
  ensureBanks(audio);
  const t = audio.currentTime;
  const out = sink(audio);

  const lp = audio.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = headshot ? 1100 : 380;
  noiseBurst(audio, headshot ? 'pink' : 'brown', t, {
    dur: 0.14,
    peak: headshot ? 0.24 : 0.2,
    decay: headshot ? 0.09 : 0.13,
    dest: out,
    filters: [lp],
    attack: 0.001,
  });

  sineHit(audio, out, t, headshot ? 108 : 64, headshot ? 0.13 : 0.17, 0.12);

  if (headshot) {
    const hp = audio.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2400;
    noiseBurst(audio, 'white', t, {
      dur: 0.05,
      peak: 0.2,
      decay: 0.035,
      dest: out,
      filters: [hp],
      attack: 0.0003,
    });
  }
}

export function playJam() {
  const audio = audioContext();
  if (!audio) return;
  const t = audio.currentTime;
  playMech(audio, t, { spikes: 7, span: 0.08, gain: 0.14, freq: 1500 });
  playMech(audio, t + 0.06, { spikes: 4, span: 0.03, gain: 0.12, freq: 1100 });
}

let footBusy = 0;

export function beginFootFrame() {
  footBusy = 0;
}

export function playFoot({ voice = 'boot', crawl = false, dist = 0, pan = 0 } = {}) {
  const audio = audioContext();
  if (!audio) return false;
  ensureBanks(audio);
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
  src.buffer = bank('brown');
  src.playbackRate.value = (crawl || voice === 'drag' ? 0.72 : zombie ? 0.88 : 1) * (0.94 + Math.random() * 0.12);
  const g = audio.createGain();
  const peak = (crawl || voice === 'drag' ? 0.1 : zombie ? 0.16 : 0.2) * near;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(g);
  g.connect(dest);
  const off = Math.random() * Math.max(0, src.buffer.duration - dur - 0.02);
  src.start(t, off, dur + 0.01);
  src.stop(t + dur + 0.01);
  if (!zombie) {
    const tick = audio.createBiquadFilter();
    tick.type = 'highpass';
    tick.frequency.value = 1800;
    noiseBurst(audio, 'white', t, {
      dur: 0.018,
      peak: 0.045,
      decay: 0.012,
      dest,
      filters: [tick],
      attack: 0.0004,
    });
  }
  return true;
}

const AMBIENT = {
  forest: { freq: 780, gain: 0.048, lfo: 420 },
  fen: { freq: 430, gain: 0.055, lfo: 260 },
  transylvania: { freq: 240, gain: 0.042, lfo: 140 },
  desert: { freq: 1180, gain: 0.034, lfo: 380 },
  quarry: { freq: 640, gain: 0.05, lfo: 220 },
};

let ambNodes = null;

function startAmbient(audio) {
  if (pageHidden() || !audio) return;
  const graph = ensureGraph(audio);
  const place = AMBIENT[scene] || AMBIENT.forest;
  if (ambNodes && ambNodes.context === audio) {
    ambNodes.bp.frequency.value = place.freq;
    ambNodes.g.gain.value = place.gain;
    ambNodes.lfoG.gain.value = place.lfo;
    return;
  }
  ensureBanks(audio);
  const src = audio.createBufferSource();
  src.buffer = bank('pink');
  src.loop = true;
  const bp = audio.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.65;
  bp.frequency.value = place.freq;
  const g = audio.createGain();
  g.gain.value = place.gain;
  const hp = audio.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 70;
  src.connect(hp);
  hp.connect(bp);
  bp.connect(g);
  g.connect(graph.amb);
  const lfo = audio.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08;
  const lfoG = audio.createGain();
  lfoG.gain.value = place.lfo;
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
  ambNodes = { context: audio, src, bp, g, lfo, trem, lfoG };
}

function stopAmbient() {
  if (!ambNodes) return;
  for (const node of [ambNodes.src, ambNodes.lfo, ambNodes.trem]) {
    try {
      node?.stop();
    } catch {
      /* already stopped */
    }
    try {
      node?.disconnect();
    } catch {
      /* already disconnected */
    }
  }
  ambNodes = null;
}
