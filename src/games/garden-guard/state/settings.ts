import { readGameStorage,writeGameStorage } from './storage';
import Phaser from 'phaser';
import {readAutoPause} from '../focus-policy';
import {readGameSpeed,type GameSpeed} from '../simulation-clock';

/** User-configurable options, persisted to localStorage. */
export interface Settings {
  autoPauseOnBlur:boolean;
  spriteMotion:boolean;
  gameSpeed:GameSpeed;
  music: boolean;
  /** 0..1 */
  musicVolume: number;
  sfx: boolean;
  /** 0..1 */
  sfxVolume: number;
  /** Draw the lawn tile guides. */
  showGrid: boolean;
  /** Let suns land, then fly into the sun bank without tapping. */
  autoCollectSuns: boolean;
}


const DEFAULTS: Settings = {
  autoPauseOnBlur:true,
  spriteMotion:true,
  gameSpeed:1,
  music: true,
  musicVolume: 0.6,
  sfx: true,
  sfxVolume: 0.6,
  showGrid: true,
  autoCollectSuns: false,
};

function readStored(): Partial<Settings> {
  try {
    const raw = readGameStorage('settings');
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
    const stored=readStored() ?? {};
    this.values = { ...DEFAULTS, ...stored, autoCollectSuns:stored.autoCollectSuns===true,gameSpeed:readGameSpeed(stored.gameSpeed),autoPauseOnBlur:readAutoPause(stored.autoPauseOnBlur),spriteMotion:stored.spriteMotion!==false };
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

  toggle(key: 'music' | 'sfx' | 'showGrid' | 'autoCollectSuns' | 'autoPauseOnBlur' | 'spriteMotion'): void {
    this.set(key, !this.values[key]);
  }

  reset(): void {
    this.values = { ...DEFAULTS };
    this.persist();
    this.emit('changed');
  }

  private persist(): void {
    try {
      writeGameStorage('settings', JSON.stringify(this.values));
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
