let ctx = null;
let master = null;
let masterVol = 0.8;

function ac() {
  const Ctor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function sink(audio) {
  if (!master || master.context !== audio) {
    master = audio.createGain();
    master.gain.value = masterVol;
    master.connect(audio.destination);
  }
  return master;
}

export function setMasterVolume(value) {
  masterVol = Math.max(0, Math.min(1, Number(value) || 0));
  if (master) master.gain.value = masterVol;
}

export function resumeAudio() {
  ac();
}

const noiseCache = new Map();

function noiseBuffer(audio, duration) {
  const n = Math.floor(audio.sampleRate * duration);
  const key = `${audio.sampleRate}:${n}`;
  let buf = noiseCache.get(key);
  if (buf) return buf;
  buf = audio.createBuffer(1, n, audio.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  noiseCache.set(key, buf);
  return buf;
}

export function playMuzzle(stats = {}) {
  const audio = ac();
  if (!audio) return;
  const t = audio.currentTime;
  const speed = Math.max(280, Number(stats.bulletSpeed) || 820);
  const crack = 0.055 + Math.min(0.05, (speed - 280) * 0.00007);
  const src = audio.createBufferSource();
  src.buffer = noiseBuffer(audio, 0.1);
  const hp = audio.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 980 + Math.min(1500, (speed - 280) * 1.15);
  const ng = audio.createGain();
  ng.gain.setValueAtTime(0.16 + Math.min(0.06, (speed - 280) * 0.00008), t);
  ng.gain.exponentialRampToValueAtTime(0.01, t + crack);
  src.connect(hp);
  hp.connect(ng);
  ng.connect(sink(audio));
  src.start(t);
  src.stop(t + crack);

  const osc = audio.createOscillator();
  const og = audio.createGain();
  osc.type = 'sine';
  const boom = 118 + (speed - 280) * 0.055;
  osc.frequency.setValueAtTime(boom, t);
  osc.frequency.exponentialRampToValueAtTime(28, t + crack + 0.01);
  og.gain.setValueAtTime(0.15, t);
  og.gain.exponentialRampToValueAtTime(0.01, t + crack + 0.02);
  osc.connect(og);
  og.connect(sink(audio));
  osc.start(t);
  osc.stop(t + crack + 0.02);
}

export function playReloadTone(norm) {
  const audio = ac();
  if (!audio) return;
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = 'sine';
  osc.frequency.value = 220 + norm * 980;
  g.gain.setValueAtTime(0.03, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  osc.connect(g);
  g.connect(sink(audio));
  osc.start(t);
  osc.stop(t + 0.05);
}

export function playPerfect() {
  const audio = ac();
  if (!audio) return;
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = 'square';
  osc.frequency.value = 2400;
  g.gain.setValueAtTime(0.07, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.connect(g);
  g.connect(sink(audio));
  osc.start(t);
  osc.stop(t + 0.08);
}

export function playFlesh(headshot) {
  const audio = ac();
  if (!audio) return;
  const t = audio.currentTime;
  const src = audio.createBufferSource();
  src.buffer = noiseBuffer(audio, 0.07);
  const lp = audio.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 800;
  const g = audio.createGain();
  g.gain.setValueAtTime(0.14, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + 0.07);
  src.connect(lp);
  lp.connect(g);
  g.connect(sink(audio));
  src.start(t);
  src.stop(t + 0.07);

  if (headshot) {
    for (const freq of [1200, 1800]) {
      const osc = audio.createOscillator();
      const og = audio.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      og.gain.setValueAtTime(0.05, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(og);
      og.connect(sink(audio));
      osc.start(t);
      osc.stop(t + 0.09);
    }
  }
}

export function playJam() {
  const audio = ac();
  if (!audio) return;
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(90, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.16);
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  osc.connect(g);
  g.connect(sink(audio));
  osc.start(t);
  osc.stop(t + 0.16);
}
