import Phaser from 'phaser';
import type { GridManager } from '../managers/GridManager';
import type { ResourceManager } from '../managers/ResourceManager';

/** Every plant the player can place on the lawn. */
export type PlantType =
  | 'puffshroom' | 'sunshroom' | 'fumeshroom' | 'gravebuster'
  | 'sunflower'
  | 'peashooter'
  | 'wallnut'
  | 'potatomine'
  | 'snowpea'
  | 'repeater'
  | 'threepeater'
  | 'cherrybomb'
  | 'chomper';

/** Zombie variants. Later levels introduce the armoured ones. */
export type ZombieType = 'basic' | 'flag' | 'conehead' | 'buckethead' | 'polevaulter' | 'newspaper' | 'screendoor';

/** Static definition of a zombie variant. */
export interface ZombieDefinition {
  /** Texture key for the zombie *with* its headgear. */
  readonly texture: string;
  /** Body hit points. */
  readonly hp: number;
  /** Headgear hit points, absorbed before `hp`. 0 = no headgear. */
  readonly armorHp: number;
  readonly shieldHp?: number;
  /** Walk speed in px/second. */
  readonly speed: number;
}

/** A slowing effect applied by a projectile. */
export interface SlowEffect {
  /** Multiplier applied to the zombie's walk speed (0.5 = half speed). */
  readonly factor: number;
  /** How long the slow lasts. */
  readonly durationMs: number;
}

/** Area damage from a one-shot plant. */
export interface Blast {
  /** Radius in pixels. ~170 covers the 3x3 block around a cell. */
  readonly radius: number;
  readonly damage: number;
}

/**
 * Static, data-driven definition of a plant.
 *
 * Economy (cost/recharge) lives here for every plant. Combat behaviour is also
 * expressed here as optional fields, so the whole pea-shooting family needs a
 * single generic class: see `Shooter`.
 */
export interface PlantDefinition {
  /** Internal id (matches the key used in `PLANT_DEFS`). */
  readonly type: PlantType;
  /** Human readable name. */
  readonly label: string;
  /** Sun cost to place. */
  readonly cost: number;
  /** Recharge time before this seed can be planted again (ms). */
  readonly cooldownMs: number;
  /** Texture key generated in `PreloadScene`. */
  readonly texture: string;
  /** Starting hit points. */
  readonly maxHp: number;
  /** Longer flavour text, shown in the Collection (almanac) screen. */
  readonly description: string;

  /* --- shooter behaviour (see `Shooter`) --------------------------------- */

  /** Projectile texture key. Defaults to `'pea'`. */
  readonly projectile?: string;
  readonly range?: number;

  /** Rows this plant fires into, relative to its own row. Defaults to `[0]`. */
  readonly lanes?: readonly number[];
  /** Peas per volley, per lane. Defaults to 1. */
  readonly peasPerVolley?: number;
  /** Damage per pea. */
  readonly damage?: number;
  /** Time between volleys (ms). */
  readonly fireIntervalMs?: number;
  /** Slow applied by this plant's projectiles. */
  readonly slow?: SlowEffect;

  /* --- one-shot behaviour ------------------------------------------------- */

  /** Fuse (cherry bomb) or arming delay (potato mine) in ms. */
  readonly fuseMs?: number;
  /** Blast radius and damage. */
  readonly blast?: Blast;
}

/** A cell on the lawn grid. */
export interface GridPosition {
  col: number;
  row: number;
}

/**
 * Shared services every entity needs. Passed down instead of using globals so
 * that scenes can be restarted safely.
 */
export interface GameContext {
  readonly sunBank: Readonly<{x:number;y:number}>;
  scene: Phaser.Scene;
  grid: GridManager;
  resources: ResourceManager;
  /** Pool of in-flight projectiles. */
  peas: Phaser.Physics.Arcade.Group;
  /** Pool of live zombies. */
  zombies: Phaser.Physics.Arcade.Group;
  /** Spawns a collectible sun at the given world position. */
  graveAt: (col:number,row:number) => boolean;
  clearGrave: (col:number,row:number) => void;
  spawnSun: (x: number, y: number) => void;
}
