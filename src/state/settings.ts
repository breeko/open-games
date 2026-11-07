import Phaser from 'phaser';

/** User-configurable options, persisted to localStorage. */
export interface Settings {
  music: boolean;
  /** 0..1 */
  musicVolume: number;
  sfx: boolean;
  /** 0..1 */
  sfxVolume: number;
  /** Draw the lawn tile guides. */
  showGrid: boolean;
}

const STORAGE_KEY = 'pvz.settings.v1';

const DEFAULTS: Settings = {
  music: true,
  musicVolume: 0.6,
  sfx: true,
  sfxVolume: 0.6,
  showGrid: true,
};

function readStored(): Partial<Settings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Settings>) : {};
  } catch {
    // Private mode / storage disabled: fall back to defaults.
    return {};
  }
}

/**
 * Settings singleton. Emits `changed` whenever a value moves so the audio
 * engine and any open settings UI can react.
 */
class SettingsStore extends Phaser.Events.EventEmitter {
  private values: Settings;

  constructor() {
    super();
    this.values = { ...DEFAULTS, ...readStored() };
  }

  get current(): Readonly<Settings> {
    return this.values;
  }

  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    if (this.values[key] === value) return;
    this.values[key] = value;
    this.persist();
    this.emit('changed', key);
  }

  toggle(key: 'music' | 'sfx' | 'showGrid'): void {
    this.set(key, !this.values[key]);
  }

  reset(): void {
    this.values = { ...DEFAULTS };
    this.persist();
    this.emit('changed');
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
    } catch {
      /* keep the values in memory only */
    }
  }
}

export const settings = new SettingsStore();

/* -------------------------------------------------------------------------- */
/*  Volume helpers                                                            */
/* -------------------------------------------------------------------------- */

/** Volume is chosen in five steps so it can be driven by plain buttons. */
export const VOLUME_STEPS = 5;

export function volumeToStep(volume: number): number {
  return Math.round(volume * VOLUME_STEPS);
}

export function stepToVolume(step: number): number {
  const clamped = Phaser.Math.Clamp(step, 0, VOLUME_STEPS);
  return clamped / VOLUME_STEPS;
}

export function formatVolume(volume: number): string {
  return `${Math.round(volume * 100)}%`;
}
