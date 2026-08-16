let ctx = null;

function ac() {
  if (ctx) return ctx;
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  ctx = new C();
  return ctx;
}

export function unlockAudio() {
  const a = ac();
  if (a?.state === "suspended") a.resume();
}

function tone(freq, dur, type, gain = 0.16, to) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(8e-4, t + dur);
  o.connect(g);
  g.connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur = 0.14, gain = 0.16) {
  const a = ac();
  if (!a) return;
  const n = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = a.createBufferSource();
  src.buffer = buf;
  const hp = a.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 900;
  const g = a.createGain();
  const t = a.currentTime;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(8e-4, t + dur);
  src.connect(hp);
  hp.connect(g);
  g.connect(a.destination);
  src.start(t);
  src.stop(t + dur + 0.02);
}

export const sfx = {
  shoot(w) {
    tone(180 + w * 12, 0.05, "triangle", 0.12);
    tone(520 + w * 20, 0.035, "sine", 0.08);
  },
  rail() {
    tone(70, 0.18, "sawtooth", 0.16, 40);
    tone(880, 0.07, "square", 0.1);
  },
  dash() {
    tone(180, 0.12, "sine", 0.18, 620);
    tone(90, 0.1, "triangle", 0.1);
  },
  galactic() {
    noise(0.22, 0.18);
    tone(70, 0.28, "sawtooth", 0.2, 420);
    tone(220, 0.16, "sine", 0.14, 980);
    setTimeout(() => tone(140, 0.12, "triangle", 0.1, 60), 40);
  },
  collect() {
    tone(700, 0.07, "sine", 0.18);
    setTimeout(() => tone(1040, 0.1, "triangle", 0.14), 35);
  },
  oneUp() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => {
        tone(f, 0.13, "sine", 0.17);
        tone(f * 2, 0.09, "triangle", 0.055);
      }, i * 72);
    });
  },
  zap() {
    noise(0.16, 0.2);
    tone(90, 0.22, "sawtooth", 0.18, 36);
    tone(320, 0.07, "square", 0.12, 90);
    setTimeout(() => noise(0.08, 0.1), 40);
  },
  power() {
    tone(196, 0.12, "sawtooth", 0.14, 392);
    tone(392, 0.18, "triangle", 0.12);
    setTimeout(() => tone(523, 0.14, "sine", 0.16), 70);
    setTimeout(() => tone(784, 0.2, "triangle", 0.14), 140);
    setTimeout(() => tone(1046, 0.24, "sine", 0.12), 210);
  },
  nova() {
    noise(0.28, 0.24);
    tone(56, 0.4, "sawtooth", 0.24, 32);
    tone(160, 0.22, "triangle", 0.16, 70);
    setTimeout(() => {
      tone(480, 0.18, "sine", 0.18);
      noise(0.12, 0.14);
    }, 70);
  },
  titan() {
    tone(48, 0.36, "sine", 0.22);
    tone(72, 0.28, "sawtooth", 0.16, 40);
    setTimeout(() => tone(110, 0.2, "triangle", 0.14), 50);
    setTimeout(() => tone(165, 0.24, "sine", 0.12), 120);
  },
  kill() {
    tone(210, 0.05, "square", 0.1);
    tone(560, 0.08, "sine", 0.18);
    setTimeout(() => tone(840, 0.1, "triangle", 0.14), 28);
  },
  hurt() {
    tone(140, 0.2, "sawtooth", 0.2, 55);
    tone(90, 0.16, "triangle", 0.12);
  },
  level() {
    tone(440, 0.1, "sine", 0.16);
    setTimeout(() => tone(660, 0.12, "sine", 0.14), 50);
    setTimeout(() => tone(880, 0.16, "triangle", 0.12), 110);
  },
  boss() {
    tone(80, 0.45, "sine", 0.2, 46);
    tone(120, 0.3, "triangle", 0.12);
  },
  win() {
    tone(523, 0.14, "sine", 0.18);
    setTimeout(() => tone(659, 0.16, "sine", 0.16), 90);
    setTimeout(() => tone(784, 0.26, "triangle", 0.14), 180);
  },
  dead() {
    tone(200, 0.34, "sine", 0.18, 60);
  },
};
