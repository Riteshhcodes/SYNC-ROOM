let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function beep(frequency, duration, volume = 0.08) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    /* Web Audio unavailable */
  }
}

export function playMessageSound() {
  beep(660, 0.08);
}

export function playFileSound() {
  beep(440, 0.1);
  setTimeout(() => beep(550, 0.08), 80);
}

export function playJoinSound() {
  beep(523, 0.06);
  setTimeout(() => beep(784, 0.08), 60);
}
