// Synthesised audio only: rain noise, engine hum, sirens and three radio stations,
// all generated with the Web Audio API. No audio files, no network. Audio starts
// lazily on the first user gesture so headless screenshots stay silent.

import { RADIO } from './config.js';

const MINOR = [0, 3, 5, 7, 10, 12, 15];
const CHORDS = [
  [0, 3, 7, 10], [8, 12, 15, 19], [5, 8, 12, 15], [10, 14, 17, 22],
];

function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

export function createAudio() {
  let ctx = null;
  let master = null;
  let rainGain = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let radioTimer = null;
  let station = 0;
  let muted = false;
  let step = 0;
  let started = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);

      // Rain: looped white noise through a lowpass, always on once audio starts.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      const rain = ctx.createBufferSource();
      rain.buffer = buf; rain.loop = true;
      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'lowpass'; rainFilter.frequency.value = 1400;
      rainGain = ctx.createGain(); rainGain.gain.value = 0.05;
      rain.connect(rainFilter); rainFilter.connect(rainGain); rainGain.connect(master);
      rain.start();

      // Engine: sawtooth whose pitch follows speed, plus a sub sine.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass'; engineFilter.frequency.value = 420;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(master);
      engineOsc.start();

      // Siren: triangle wailing between two tones when police are close.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle'; sirenOsc.frequency.value = 750;
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain); sirenGain.connect(master);
      sirenOsc.start();

      started = true;
      startRadio();
      return true;
    } catch {
      return false;
    }
  }

  function note(freq, when, dur, type, vol, dest) {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(dest || master);
    o.start(when); o.stop(when + dur + 0.05);
  }

  function startRadio() {
    if (radioTimer) return;
    const beat = () => 60 / RADIO[station].bpm;
    radioTimer = window.setInterval(() => {
      if (!ctx || muted) { step += 1; return; }
      const t = ctx.currentTime + 0.05;
      const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
      const root = 45 + chord[0];
      if (station === 0) {
        // RAIN FM: slow minor arpeggio, soft triangle.
        const n = MINOR[step % MINOR.length];
        note(midiToFreq(root + 12 + n), t, beat() * 1.8, 'triangle', 0.05);
        if (step % 8 === 0) note(midiToFreq(root - 12), t, beat() * 4, 'sine', 0.05);
      } else if (station === 1) {
        // NEON 99: driving bass pulse + bright lead every other beat.
        note(midiToFreq(root - 12), t, beat() * 0.9, 'square', 0.045);
        if (step % 2 === 0) note(midiToFreq(root + 12 + MINOR[(step / 2) % MINOR.length]), t, beat() * 0.7, 'sawtooth', 0.025);
        if (step % 4 === 0) note(midiToFreq(root + 24), t, beat() * 0.5, 'sine', 0.04);
      } else {
        // STATIC: slow drone, one long note per bar.
        if (step % 8 === 0) {
          note(midiToFreq(root - 12), t, beat() * 7, 'sine', 0.06);
          note(midiToFreq(root - 5), t, beat() * 7, 'sine', 0.03);
        }
      }
      step += 1;
    }, 1000 * 60 / RADIO[station].bpm / 2);
  }

  return {
    get started() { return started; },
    get station() { return station; },
    get muted() { return muted; },
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    setStation(i) {
      station = ((i % RADIO.length) + RADIO.length) % RADIO.length;
      step = 0;
    },
    cycleStation() { this.setStation(station + 1); },
    setEngine(speed01, on) {
      if (!ctx) return;
      engineGain.gain.setTargetAtTime(on ? 0.03 + speed01 * 0.05 : 0, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(50 + speed01 * 130, ctx.currentTime, 0.08);
    },
    setSiren(on, near) {
      if (!ctx) return;
      sirenGain.gain.setTargetAtTime(on ? 0.02 + near * 0.02 : 0, ctx.currentTime, 0.2);
      const t = ctx.currentTime;
      sirenOsc.frequency.setTargetAtTime(720 + 260 * (0.5 + 0.5 * Math.sin(t * 2.4)), t, 0.05);
    },
    setRain(intensity) {
      if (!ctx) return;
      rainGain.gain.setTargetAtTime(0.02 + intensity * 0.05, ctx.currentTime, 0.3);
    },
    shot() {
      if (!ctx) return;
      note(180 + Math.random() * 60, ctx.currentTime, 0.12, 'square', 0.09);
      note(90, ctx.currentTime, 0.18, 'sawtooth', 0.06);
    },
    chime() {
      if (!ctx) return;
      const t = ctx.currentTime;
      note(880, t, 0.5, 'sine', 0.06);
      note(1318, t + 0.12, 0.6, 'sine', 0.05);
    },
    thud() {
      if (!ctx) return;
      note(55, ctx.currentTime, 0.3, 'sine', 0.12);
    },
  };
}
