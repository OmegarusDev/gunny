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
  const out = sink(audio);
  const speed = Math.max(280, Number(stats.bulletSpeed) || 820);
  const heavy = Math.min(1, (speed - 280) / 760);

  const crack = audio.createBufferSource();
  crack.buffer = noiseBuffer(audio, 0.08);
  const crackHp = audio.createBiquadFilter();
  crackHp.type = 'highpass';
  crackHp.frequency.value = 2200 + heavy * 900;
  const crackG = audio.createGain();
  crackG.gain.setValueAtTime(0.42 + heavy * 0.08, t);
  crackG.gain.exponentialRampToValueAtTime(0.01, t + 0.018);
  crack.connect(crackHp);
  crackHp.connect(crackG);
  crackG.connect(out);
  crack.start(t);
  crack.stop(t + 0.03);

  const body = audio.createBufferSource();
  body.buffer = noiseBuffer(audio, 0.16);
  const bodyBp = audio.createBiquadFilter();
  bodyBp.type = 'bandpass';
  bodyBp.frequency.value = 380 + heavy * 80;
  bodyBp.Q.value = 0.85;
  const bodyG = audio.createGain();
  bodyG.gain.setValueAtTime(0.28 + heavy * 0.06, t);
  bodyG.gain.exponentialRampToValueAtTime(0.01, t + 0.11);
  body.connect(bodyBp);
  bodyBp.connect(bodyG);
  bodyG.connect(out);
  body.start(t);
  body.stop(t + 0.12);

  const thump = audio.createOscillator();
  const thumpG = audio.createGain();
  thump.type = 'triangle';
  thump.frequency.setValueAtTime(92 + heavy * 18, t);
  thump.frequency.exponentialRampToValueAtTime(38, t + 0.14);
  thumpG.gain.setValueAtTime(0.28, t);
  thumpG.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
  thump.connect(thumpG);
  thumpG.connect(out);
  thump.start(t);
  thump.stop(t + 0.16);

  const click = audio.createOscillator();
  const clickG = audio.createGain();
  click.type = 'square';
  click.frequency.value = 1900 + heavy * 400;
  clickG.gain.setValueAtTime(0.0001, t);
  clickG.gain.setValueAtTime(0.05, t + 0.012);
  clickG.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  click.connect(clickG);
  clickG.connect(out);
  click.start(t);
  click.stop(t + 0.045);
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
