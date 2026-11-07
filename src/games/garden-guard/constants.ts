import type { PlantDefinition, PlantType, ZombieDefinition, ZombieType } from './types';

/* -------------------------------------------------------------------------- */
/*  Rendering                                                                 */
/* -------------------------------------------------------------------------- */

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 960;

/* -------------------------------------------------------------------------- */
/*  Lawn grid                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The lawn is a 9x5 grid of tiles (like the original game).
 * `originX/originY` is the top-left corner of the grid in world space.
 */
export const GRID = {
  cols: 9,
  rows: 5,
  tileWidth: 128,
  tileHeight: 160,
  originX: 64,
  originY: 128,
} as const;

export const GRID_RIGHT = GRID.originX + GRID.cols * GRID.tileWidth; // 1216
export const GRID_BOTTOM = GRID.originY + GRID.rows * GRID.tileHeight; // 928

/* -------------------------------------------------------------------------- */
/*  Sun economy                                                               */
/* -------------------------------------------------------------------------- */

/** Value of a single sun (sky or sunflower). */
export const SKY_SUN_VALUE = 25;

/* -------------------------------------------------------------------------- */
/*  Balance                                                                   */
/* -------------------------------------------------------------------------- */

export const BALANCE = {
  /** Damage per second while a zombie chews a plant. */
  zombieEatDps: 100,

  peaDamage: 20,
  peaSpeed: 532.8,
  peashooterFireIntervalMs: 1400,

  sunflowerSunIntervalMs: 24000,
  sunflowerSunValue: 25,
} as const;

/* -------------------------------------------------------------------------- */
/*  Zombie catalogue                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Headgear absorbs damage before the body, and pops off when it breaks —
 * exactly like the original game's cone and bucket.
 */
export const ZOMBIE_DEFS: Record<ZombieType, ZombieDefinition> = {
  newspaper: {texture:'zombie-paper',hp:270,armorHp:0,shieldHp:150,speed:20},
  screendoor: {texture:'zombie-door',hp:270,armorHp:0,shieldHp:1100,speed:20},
  basic: { texture: 'zombie', hp: 270, armorHp: 0, speed: 20 },
  flag: { texture: 'zombie', hp: 270, armorHp: 0, speed: 30 },
  conehead: { texture: 'zombie-cone', hp: 270, armorHp: 370, speed: 20 },
  polevaulter: { texture: 'zombie-pole', hp: 500, armorHp: 0, speed: 44 },
  buckethead: { texture: 'zombie-bucket', hp: 270, armorHp: 1100, speed: 20 },
};

/** Texture a zombie drops back to once its headgear is gone. */
export const ZOMBIE_BARE_TEXTURE = 'zombie';

/* -------------------------------------------------------------------------- */
/*  Plant catalogue                                                           */
/* -------------------------------------------------------------------------- */

export const PLANT_DEFS: Record<PlantType, PlantDefinition> = {
  puffshroom: {type:'puffshroom',label:'Puff-shroom',cost:0,cooldownMs:7500,texture:'puffshroom',maxHp:300,damage:20,range:400,projectile:'puff',description:'Free short-range night defender. Shoots spores about three squares ahead.'},
  sunshroom: {type:'sunshroom',label:'Sun-shroom',cost:25,cooldownMs:7500,texture:'sunshroom',maxHp:300,description:'Produces 15 sun, then 25 after growing for two minutes. No sky sun falls at night.'},
  fumeshroom: {type:'fumeshroom',label:'Fume-shroom',cost:75,cooldownMs:7500,texture:'fumeshroom',maxHp:300,damage:20,range:576,description:'Piercing fumes hit every zombie ahead within range, passing through doors and newspapers.'},
  gravebuster: {type:'gravebuster',label:'Grave Buster',cost:75,cooldownMs:7500,texture:'gravebuster',maxHp:300,description:'Plant directly on a grave. Removes it after eating, preventing its final-wave zombie.'},
  chomper: {
    type: 'chomper', label: 'Chomper', cost: 150, cooldownMs: 7500, texture: 'chomper', maxHp: 300,
    description: 'Swallows one nearby zombie whole, including its armor. Needs 42 seconds to digest.',
  },
  sunflower: {
    type: 'sunflower',
    label: 'Sunflower',
    cost: 50,
    cooldownMs: 7500,
    texture: 'sunflower',
    maxHp: 300,
    description:
      'Generates extra sun. Plant these first — every other plant depends on them.',
  },

  peashooter: {
    type: 'peashooter',
    label: 'Peashooter',
    cost: 100,
    cooldownMs: 7500,
    texture: 'peashooter',
    maxHp: 300,
    description: 'Your basic attacker. Fires a single pea down its own lane.',
    lanes: [0],
    peasPerVolley: 1,
    damage: 20,
    fireIntervalMs: 1400,
  },

  wallnut: {
    type: 'wallnut',
    label: 'Wall-nut',
    cost: 50,
    cooldownMs: 30000,
    texture: 'wallnut',
    maxHp: 4000,
    description:
      'A tough shell with 4000 HP. No attack, but it buys your shooters time.',
  },

  potatomine: {
    type: 'potatomine',
    label: 'Potato Mine',
    cost: 25,
    cooldownMs: 30000,
    texture: 'potatomine',
    maxHp: 300,
    description:
      'Cheap and patient. Arms in 15 seconds, then destroys the first zombie to step on it.',
    // Arms after fourteen seconds, then blows up the first zombie to step on it.
    fuseMs: 15000,
    blast: { radius: 90, damage: 1800 },
  },

  snowpea: {
    type: 'snowpea',
    label: 'Snow Pea',
    cost: 175,
    cooldownMs: 7500,
    texture: 'snowpea',
    maxHp: 300,
    description:
      'Fires frozen peas that halve a zombie\u2019s walking speed for 10 seconds.',
    projectile: 'icepea',
    lanes: [0],
    peasPerVolley: 1,
    damage: 20,
    fireIntervalMs: 1400,
    slow: { factor: 0.5, durationMs: 10000 },
  },

  repeater: {
    type: 'repeater',
    label: 'Repeater',
    cost: 200,
    cooldownMs: 7500,
    texture: 'repeater',
    maxHp: 300,
    description: 'Fires two peas per volley, doubling the damage of a Peashooter.',
    lanes: [0],
    peasPerVolley: 2,
    damage: 20,
    fireIntervalMs: 1400,
  },

  threepeater: {
    type: 'threepeater',
    label: 'Threepeater',
    cost: 325,
    cooldownMs: 8000,
    texture: 'threepeater',
    maxHp: 300,
    description:
      'Fires into its own row and the rows above and below. Best planted in the middle lane.',
    lanes: [-1, 0, 1],
    peasPerVolley: 1,
    damage: 20,
    fireIntervalMs: 1600,
  },

  cherrybomb: {
    type: 'cherrybomb',
    label: 'Cherry Bomb',
    cost: 150,
    cooldownMs: 50000,
    texture: 'cherrybomb',
    maxHp: 300,
    description:
      'Explodes shortly after planting, destroying every zombie in the surrounding 3x3 tiles.',
    fuseMs: 1200,
    blast: { radius: 170, damage: 1800 },
  },
};

/**
 * The canonical plant order: **both** the order plants are unlocked and the
 * order they appear in the almanac. Mirrors the original Day levels — you start
 * with a Peashooter and earn one new plant per level.
 */
export const SEED_ORDER: PlantType[] = [
  'peashooter',
  'sunflower',
  'cherrybomb',
  'wallnut',
  'potatomine',
  'snowpea',
  'chomper',
  'repeater',
  'puffshroom','sunshroom','fumeshroom','gravebuster',
];

/** How many seeds fit in the seed bank (the original's Day levels allow six). */
export const SEED_SLOTS = 8;

/* -------------------------------------------------------------------------- */
/*  Depth ordering                                                            */
/* -------------------------------------------------------------------------- */

export const DEPTH = {
  lawn: 0,
  /** Cell preview drawn while a seed is being dragged or armed. */
  dropHighlight: 5,
  plants: 10,
  peas: 15,
  zombies: 20,
  /** Explosion rings and bursts. */
  effects: 30,
  sun: 40,
  ui: 100,
  banner: 200,
  /** Ghost sprite that follows the pointer while dragging a seed. */
  dragGhost: 300,
} as const;
