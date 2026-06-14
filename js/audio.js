// ===== Procedural sound effects (WebAudio, no asset files) =====
let ctx = null, master = null;
let enabled = true;

export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.25;
    master.connect(ctx.destination);
  } catch (e) { ctx = null; }
}
export function resumeAudio() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
export function toggleAudio() { enabled = !enabled; return enabled; }

function tone(freq, dur, type = 'sine', vol = 0.5, slideTo = null) {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise(dur, vol = 0.4, freq = 1400, q = 0.7) {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0);
}

export function sfx(name) {
  if (!ctx || !enabled) return;
  switch (name) {
    case 'attack': noise(0.12, 0.3, 1800, 1.2); tone(220, 0.1, 'square', 0.18, 140); break;
    case 'hit': noise(0.18, 0.45, 700, 0.8); tone(120, 0.16, 'sawtooth', 0.25, 70); break;
    case 'crit': noise(0.2, 0.5, 2600, 1.5); tone(520, 0.18, 'square', 0.3, 200); break;
    case 'cast': tone(440, 0.22, 'triangle', 0.35, 880); break;
    case 'ult': tone(160, 0.5, 'sawtooth', 0.4, 640); tone(320, 0.5, 'triangle', 0.25, 1200); break;
    case 'level': tone(523, 0.14, 'triangle', 0.4); setTimeout(() => tone(659, 0.14, 'triangle', 0.4), 120); setTimeout(() => tone(784, 0.22, 'triangle', 0.45), 240); break;
    case 'pickup': tone(660, 0.1, 'sine', 0.35, 990); break;
    case 'death': noise(0.3, 0.4, 500, 0.6); tone(180, 0.3, 'sawtooth', 0.25, 50); break;
    case 'boss': tone(70, 0.7, 'sawtooth', 0.5, 45); tone(110, 0.7, 'square', 0.25, 60); break;
    case 'portal': tone(330, 0.4, 'sine', 0.35, 880); setTimeout(() => tone(550, 0.3, 'sine', 0.3, 1100), 130); break;
    case 'quest': tone(440, 0.12, 'triangle', 0.4); setTimeout(() => tone(660, 0.12, 'triangle', 0.4), 110); setTimeout(() => tone(880, 0.2, 'triangle', 0.45), 220); break;
  }
}
