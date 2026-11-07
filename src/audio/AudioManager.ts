import { settings } from '../state/settings';

export type SfxName =
  | 'click'
  | 'plant'
  | 'sun'
  | 'shoot'
  | 'error'
  | 'explode'
  | 'zombieDie'
  | 'win'
  | 'lose'
  | 'unlock';

/* -------------------------------------------------------------------------- */
/*  The background music pattern                                              */
/* -------------------------------------------------------------------------- */

const BPM = 104;
/** One step is an eighth note. */
const STEP_SECONDS = 60 / BPM / 2;

/** A minor pentatonic arpeggio — 16 steps, loops forever. */
const ARP = [69, 72, 76, 72, 74, 77, 81, 77, 69, 72, 76, 79, 77, 74, 72, 69];
/** Bass root of each half-bar. */
const BASS = [45, 45, 41, 41, 48, 48, 43, 43];

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Tiny Web Audio engine.
 *
 * Everything is synthesised at runtime — the project still ships with **zero
 * audio files**. Music is a two-voice loop (bass + arpeggio) scheduled with the
 * standard look-ahead pattern; sound effects are short oscillator blips plus a
 * noise burst for explosions.
 *
 * Browsers block audio until the player interacts, so `unlock()` must be called
 * from a real gesture (a menu button, a keypress).
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noiseBuffer: AudioBuffer | null = null;

  private timer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  /** The player asked for music (independent of whether it can play yet). */
  private musicWanted = false;
  private lastShootAt = 0;

  constructor() {
    settings.on('changed', () => this.applySettings());
  }

  /** Must be called from a user gesture. Safe to call repeatedly. */
  unlock(): void {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  get isRunning(): boolean {
    return this.ctx !== null && this.timer !== null;
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    const ctx = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);

    this.noiseBuffer = this.buildNoiseBuffer(ctx);
    this.applyGains();

    return ctx;
  }

  private buildNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 0.5);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /** Re-applies gains from settings, and starts/stops the loop to match. */
  applySettings(): void {
    this.applyGains();

    if (settings.current.music && this.musicWanted) this.resumeLoop();
    else this.stopLoop();
  }

  /** Gain-only update, safe to call while the context is being created. */
  private applyGains(): void {
    if (!this.ctx) return;

    const current = settings.current;
    this.musicBus.gain.value = current.music ? current.musicVolume * 0.3 : 0;
    this.sfxBus.gain.value = current.sfx ? current.sfxVolume : 0;
  }

  startMusic(): void {
    this.musicWanted = true;
    if (!settings.current.music) return;
    this.resumeLoop();
  }

  stopMusic(): void {
    this.musicWanted = false;
    this.stopLoop();
  }

  private resumeLoop(): void {
    if (this.timer !== null) return;

    const ctx = this.ensure();
    // `ensure()` can re-enter here, so re-check before installing the timer.
    if (!ctx || this.timer !== null) return;

    if (ctx.state === 'suspended') void ctx.resume();

    this.nextNoteTime = ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.scheduler(), 25);
  }

  private stopLoop(): void {
    if (this.timer === null) return;
    window.clearInterval(this.timer);
    this.timer = null;
  }

  private scheduler(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const horizon = ctx.currentTime + 0.15;

    while (this.nextNoteTime < horizon) {
      this.scheduleStep(this.step, this.nextNoteTime);
      this.nextNoteTime += STEP_SECONDS;
      this.step = (this.step + 1) % ARP.length;
    }
  }

  private scheduleStep(step: number, time: number): void {
    if (step % 2 === 0) {
      const root = BASS[(step / 2) % BASS.length];
      this.tone(this.musicBus, midiToFreq(root), time, STEP_SECONDS * 1.9, 'triangle', 0.5);
    }

    this.tone(this.musicBus, midiToFreq(ARP[step]), time, STEP_SECONDS * 0.85, 'square', 0.11);
  }

  /* ------------------------------------------------------------------ */
  /*  Sound effects                                                      */
  /* ------------------------------------------------------------------ */

  sfx(name: SfxName): void {
    const ctx = this.ensure();
    if (!ctx || ctx.state !== 'running') return;

    const t = ctx.currentTime;

    switch (name) {
      case 'click':
        this.tone(this.sfxBus, 640, t, 0.07, 'square', 0.22);
        break;

      case 'plant':
        this.tone(this.sfxBus, 320, t, 0.1, 'triangle', 0.3);
        this.tone(this.sfxBus, 480, t + 0.06, 0.12, 'triangle', 0.2);
        break;

      case 'sun':
        this.tone(this.sfxBus, 900, t, 0.08, 'sine', 0.28);
        this.tone(this.sfxBus, 1350, t + 0.06, 0.13, 'sine', 0.22);
        break;

      case 'shoot': {
        // Peas fire constantly, so keep it quiet and rate limited.
        if (t - this.lastShootAt < 0.09) return;
        this.lastShootAt = t;
        this.tone(this.sfxBus, 1050, t, 0.045, 'square', 0.06);
        break;
      }

      case 'error':
        this.tone(this.sfxBus, 150, t, 0.18, 'sawtooth', 0.2);
        break;

      case 'explode':
        this.noise(t, 0.5, 0.55);
        this.tone(this.sfxBus, 90, t, 0.3, 'sawtooth', 0.3, 40);
        break;

      case 'zombieDie':
        this.tone(this.sfxBus, 240, t, 0.32, 'sawtooth', 0.22, 90);
        break;

      case 'win':
        [69, 73, 76, 81].forEach((midi, i) => {
          this.tone(this.sfxBus, midiToFreq(midi), t + i * 0.12, 0.3, 'triangle', 0.26);
        });
        break;

      case 'lose':
        [65, 62, 58, 53].forEach((midi, i) => {
          this.tone(this.sfxBus, midiToFreq(midi), t + i * 0.16, 0.4, 'sawtooth', 0.2);
        });
        break;

      case 'unlock':
        this.tone(this.sfxBus, 880, t, 0.09, 'square', 0.2);
        this.tone(this.sfxBus, 1175, t + 0.08, 0.16, 'square', 0.18);
        break;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Primitives                                                         */
  /* ------------------------------------------------------------------ */

  private tone(
    bus: GainNode,
    frequency: number,
    time: number,
    duration: number,
    type: OscillatorType,
    peak: number,
    endFrequency?: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    if (endFrequency !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), time + duration);
    }

    // Fast attack, exponential release: reads as a pluck rather than a click.
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(bus);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  private noise(time: number, duration: number, peak: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuffer) return;

    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    source.start(time);
    source.stop(time + duration + 0.05);
  }
}

export const audio = new AudioManager();
