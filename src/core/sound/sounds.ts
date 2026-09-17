/**
 * System sounds, synthesised in the browser.
 *
 * No audio file is downloaded and no Microsoft sound is used: every blip is
 * produced with the Web Audio API from a couple of oscillators. Sounds are off
 * by default and remembered with the rest of the preferences.
 */
let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  return context;
}

export type SoundName = 'startup' | 'click' | 'open' | 'close' | 'error' | 'ding';

interface Tone {
  frequency: number;
  duration: number;
  type: OscillatorType;
  delay?: number;
  gain?: number;
}

const TONES: Record<SoundName, Tone[]> = {
  startup: [
    { frequency: 392, duration: 0.16, type: 'triangle', gain: 0.18 },
    { frequency: 587, duration: 0.22, type: 'triangle', delay: 0.14, gain: 0.18 },
    { frequency: 784, duration: 0.34, type: 'triangle', delay: 0.3, gain: 0.16 },
  ],
  click: [{ frequency: 880, duration: 0.03, type: 'square', gain: 0.05 }],
  open: [{ frequency: 523, duration: 0.06, type: 'triangle', gain: 0.1 }],
  close: [{ frequency: 330, duration: 0.08, type: 'triangle', gain: 0.1 }],
  error: [
    { frequency: 220, duration: 0.12, type: 'square', gain: 0.08 },
    { frequency: 175, duration: 0.18, type: 'square', delay: 0.1, gain: 0.08 },
  ],
  ding: [{ frequency: 1046, duration: 0.12, type: 'sine', gain: 0.12 }],
};

export interface SoundOptions {
  enabled: boolean;
  /** 0..100 */
  volume: number;
}

export function playSound(name: SoundName, options: SoundOptions): void {
  if (!options.enabled || options.volume <= 0) return;
  const audio = audioContext();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();
  const master = audio.createGain();
  master.gain.value = Math.min(1, options.volume / 100) * 0.5;
  master.connect(audio.destination);

  for (const tone of TONES[name]) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime + (tone.delay ?? 0);
    oscillator.type = tone.type;
    oscillator.frequency.value = tone.frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(tone.gain ?? 0.1, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + tone.duration + 0.02);
  }
}
