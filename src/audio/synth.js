let ctx = null;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function resumeAudio() {
  ac();
}

function noiseBuffer(audio, duration) {
  const n = Math.floor(audio.sampleRate * duration);
  const buf = audio.createBuffer(1, n, audio.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export function playMuzzle() {
  const audio = ac();
  const t = audio.currentTime;
  const src = audio.createBufferSource();
  src.buffer = noiseBuffer(audio, 0.08);
  const hp = audio.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1200;
  const ng = audio.createGain();
  ng.gain.setValueAtTime(0.18, t);
  ng.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
  src.connect(hp);
  hp.connect(ng);
  ng.connect(audio.destination);
  src.start(t);
  src.stop(t + 0.08);

  const osc = audio.createOscillator();
  const og = audio.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 0.08);
  og.gain.setValueAtTime(0.16, t);
  og.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
  osc.connect(og);
  og.connect(audio.destination);
  osc.start(t);
  osc.stop(t + 0.09);
}

export function playReloadTone(norm) {
  const audio = ac();
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = 'sine';
  osc.frequency.value = 220 + norm * 980;
  g.gain.setValueAtTime(0.03, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  osc.connect(g);
  g.connect(audio.destination);
  osc.start(t);
  osc.stop(t + 0.05);
}

export function playPerfect() {
  const audio = ac();
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = 'square';
  osc.frequency.value = 2400;
  g.gain.setValueAtTime(0.07, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.connect(g);
  g.connect(audio.destination);
  osc.start(t);
  osc.stop(t + 0.08);
}

export function playFlesh(headshot) {
  const audio = ac();
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
  g.connect(audio.destination);
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
      og.connect(audio.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    }
  }
}

export function playJam() {
  const audio = ac();
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(90, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.16);
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  osc.connect(g);
  g.connect(audio.destination);
  osc.start(t);
  osc.stop(t + 0.16);
}
