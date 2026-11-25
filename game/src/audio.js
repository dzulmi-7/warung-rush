// Kitchen sound effects, all synthesised with WebAudio so no audio file ships: short blips for
// picking and plating, a chop thock, a sizzle loop while a wok cooks, a bell for a served order
// and a sour buzz for a burnt pan or a lost customer.

/** One lazy AudioContext; created on the first user gesture (the title screen's key press). */
let context = null;

function ctx() {
  if (!context) {
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (AudioContextClass) context = new AudioContextClass();
  }
  return context;
}

/** A short toned blip; freq sweeps from start to end over the duration. */
function blip(start, end, seconds, type = 'triangle', gainValue = 0.16) {
  const audio = ctx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(start, audio.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, end), audio.currentTime + seconds);
  gain.gain.setValueAtTime(gainValue, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + seconds);
  osc.connect(gain).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + seconds);
}

/** A filtered noise burst: the chop, the sizzle attack, the trash thump. */
function noise(seconds, frequency, gainValue = 0.2) {
  const audio = ctx();
  if (!audio) return;
  const length = Math.floor(audio.sampleRate * seconds);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  const gain = audio.createGain();
  gain.gain.value = gainValue;
  src.connect(filter).connect(gain).connect(audio.destination);
  src.start();
}

export const audio = {
  /** Unlock the context after a user gesture; safe to call every key press. */
  unlock() {
    const audio = ctx();
    if (audio && audio.state === 'suspended') audio.resume();
  },

  pick() {
    blip(520, 760, 0.07);
  },

  drop() {
    blip(360, 240, 0.09, 'triangle', 0.12);
  },

  chop() {
    noise(0.09, 900, 0.28);
    blip(200, 120, 0.06, 'square', 0.1);
  },

  sizzle() {
    noise(0.35, 2600, 0.14);
  },

  plate() {
    blip(660, 990, 0.12, 'sine', 0.18);
  },

  bell() {
    blip(880, 880, 0.35, 'sine', 0.22);
    blip(1320, 1318, 0.3, 'sine', 0.12);
  },

  money() {
    blip(980, 1480, 0.1, 'sine', 0.16);
    setTimeout(() => blip(1240, 1850, 0.14, 'sine', 0.14), 70);
  },

  burn() {
    noise(0.5, 300, 0.3);
    blip(180, 60, 0.5, 'sawtooth', 0.18);
  },

  miss() {
    blip(300, 90, 0.45, 'sawtooth', 0.2);
  },

  trash() {
    noise(0.12, 500, 0.2);
  },

  day() {
    blip(520, 1040, 0.3, 'sine', 0.2);
    setTimeout(() => blip(780, 1560, 0.4, 'sine', 0.18), 160);
  },
};
