// WebAudio synth sounds for Velvet Vault. No audio files, no network:
// every effect is an oscillator (or a short noise burst) shaped by a
// gain envelope, built fresh on each call so overlapping sounds stay clean.

let audioContext = null;
let alarmNodes = null;

export function ensureAudio() {
  try {
    if (!audioContext) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      audioContext = new Ctor();
    }
    if (audioContext.state === 'suspended') void audioContext.resume();
    return audioContext;
  } catch {
    return null;
  }
}

function tone(freq, duration, type, volume, slideTo = null, delay = 0) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function noiseBurst(duration, volume, lowpass = 1200, delay = 0) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(start);
}

export function playPickup() {
  tone(880, 0.09, 'sine', 0.16);
  tone(1318, 0.14, 'sine', 0.14, null, 0.07);
}

export function playGoldPickup() {
  tone(659, 0.08, 'triangle', 0.16);
  tone(988, 0.08, 'triangle', 0.16, null, 0.06);
  tone(1318, 0.16, 'triangle', 0.14, null, 0.12);
}

export function playSafeClick() {
  tone(2400, 0.03, 'square', 0.05);
}

export function playSafeCracked() {
  tone(523, 0.1, 'triangle', 0.18);
  tone(659, 0.1, 'triangle', 0.18, null, 0.09);
  tone(784, 0.2, 'triangle', 0.18, null, 0.18);
  noiseBurst(0.25, 0.08, 900, 0.05);
}

export function playPebble() {
  tone(1400, 0.05, 'sine', 0.1, 700);
  noiseBurst(0.06, 0.1, 2500, 0.12);
}

export function playJammer() {
  tone(300, 0.3, 'sawtooth', 0.08, 90);
  tone(1200, 0.12, 'square', 0.04, null, 0.28);
}

export function playSpotted() {
  tone(220, 0.22, 'sawtooth', 0.16, 440);
}

// A camera just gained sight of the thief: a short two-note warning
// so the player learns the camera saw them before the meter shows it.
export function playCameraSpot() {
  tone(1568, 0.07, 'square', 0.07);
  tone(1175, 0.1, 'square', 0.07, null, 0.07);
}

export function playCaught() {
  tone(180, 0.5, 'sawtooth', 0.2, 60);
  tone(90, 0.6, 'square', 0.14, 45, 0.1);
  noiseBurst(0.4, 0.12, 700, 0.05);
}

export function playWin() {
  const notes = [523, 659, 784, 1046, 1318];
  notes.forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.16, null, i * 0.11));
}

export function playLose() {
  const notes = [392, 330, 262, 196];
  notes.forEach((freq, i) => tone(freq, 0.3, 'triangle', 0.14, null, i * 0.16));
}

export function playStep() {
  noiseBurst(0.04, 0.03, 500);
}

export function playTick() {
  tone(1500, 0.04, 'square', 0.06);
}

// A looping two-tone alarm siren while the alarm state is active.
// startAlarm is idempotent; stopAlarm tears the loop down.
export function startAlarm() {
  const ctx = ensureAudio();
  if (!ctx || alarmNodes) return;
  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 620;
  lfo.type = 'square';
  lfo.frequency.value = 0.9;
  lfoGain.gain.value = 180;
  gain.gain.value = 0.045;
  lfo.connect(lfoGain).connect(osc.frequency);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  lfo.start();
  alarmNodes = { osc, lfo, gain };
}

export function stopAlarm() {
  if (!alarmNodes) return;
  try {
    alarmNodes.gain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.05);
    const nodes = alarmNodes;
    window.setTimeout(() => {
      try { nodes.osc.stop(); nodes.lfo.stop(); } catch { /* already stopped */ }
    }, 300);
  } catch { /* audio torn down already */ }
  alarmNodes = null;
}
