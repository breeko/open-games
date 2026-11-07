import { GRID, PLANT_DEFS, ZOMBIE_DEFS } from '../../../../src/games/garden-guard/constants';
import { getLevel, defaultSeedsForLevel } from '../../../../src/games/garden-guard/levels';
import { initialGraves } from '../../../../src/games/garden-guard/night';
import { randomSource, sampleSkySunTicks } from '../../../../src/games/garden-guard/reference/rules';
import { WaveDirector } from '../../../../src/games/garden-guard/wave-director';
import { WhackDirector } from '../../../../src/games/garden-guard/whack-director';
import { gardenSessionSchema, type GardenSession, type PlantSnapshot, type ZombieSnapshot } from '../../../../src/games/garden-guard/state/session-data';

export function freshSession(levelId: number): GardenSession {
  const level = getLevel(levelId), random = randomSource(67890);
  const skyNext = sampleSkySunTicks(0, random) * 10;
  const seeds = level.mode === 'standard' ? defaultSeedsForLevel(levelId) : level.mode === 'whack' ? [...level.availablePlants] : [...new Set(level.conveyorSeeds)];
  const director = level.mode === 'whack' ? new WhackDirector({ spawn() {}, liveCount: () => 1, graveCount: () => 9, addGraves() {}, start() {}, complete() {} }) :
    new WaveDirector(level.waves, { spawn: () => 270, health: () => 270, liveCount: () => 1, start() {}, complete() {} });
  return gardenSessionSchema.parse({
    version: 1, compatibility: 'garden-day-night-r1', savedAt: 1, levelId, difficulty: 'baseline', seeds,
    sun: level.startingSun, random: random.snapshot(), physicsRemainderMs:0, skySunTimer: 0, skyNext, skyFallen: 0, supplyTimer: 0, supplyIndex: 0,
    plants: [], zombies: [], suns: [], projectiles: [], graves: initialGraves(levelId),
    waves: { random: 12345, tickRemainder: 0, riseTicks: 0, laneHistory: [], director: director.save() },
    seedBank: seeds.map(type => ({ type, stock: 0, remainingMs: 0, totalMs: 1 })),
    mowers: level.activeRows.map(row => ({ row, x: GRID.originX - 42, used: false, moving: false, visible: true })), rolling: [],
  });
}

export function exampleZombie(type: ZombieSnapshot['type'], row = 0): ZombieSnapshot {
  const def = ZOMBIE_DEFS[type];
  return { type, row, wave: 0, x: 1000, y: GRID.originY + (row + .5) * GRID.tileHeight + 10,
    hp: def.hp, maxHp: def.hp, armorHp: def.armorHp, shieldHp: def.shieldHp ?? 0, speed: def.speed, speedMultiplier: 1, dps: 100,
    allies: false, hasPole: type === 'polevaulter', emergenceTotal: 0, emergenceMs: 0, rageDelay: 0, headless: false,
    bleedTicks: 0, biteRemainder: 0, slowFactor: 1, slowRemainingMs: 0,
    motion: { gait: type === 'polevaulter' ? 'poleRun' : 'walk', parameter: .3, phase: .25, remainder: 0 }, vault: null };
}

/** Timers and transient gameplay states that board-position-only saves would lose. */
export function busyNightSession(): GardenSession {
  const data = freshSession(16);
  data.seeds = [...getLevel(16).availablePlants];data.sun = 750;
  data.seedBank = data.seeds.map(type => ({ type, stock: 0, remainingMs: 3700, totalMs: PLANT_DEFS[type].cooldownMs }));
  const plant = (type: PlantSnapshot['type'], col: number, row: number, behavior: PlantSnapshot['behavior']): PlantSnapshot => ({ type, col, row, hp: PLANT_DEFS[type].maxHp, behavior });
  const shooter = { kind: 'shooter', cooldown: 45, remainder: 3, shots: [{ row: 0, remainingMs: 5 }] } as const;
  data.plants = [
    plant('peashooter', 0, 0, { ...shooter, shots: [...shooter.shots] }),
    plant('sunflower', 0, 1, { kind: 'sunflower', timer: 440, next: 500 }),
    plant('wallnut', 1, 2, { kind: 'idle' }), plant('potatomine', 3, 0, { kind: 'mine', timer: 13900, armed: false }),
    plant('snowpea', 0, 2, { ...shooter, shots: [] }), plant('chomper', 1, 3, { kind: 'chomper', digest: 440 }),
    plant('repeater', 0, 3, { ...shooter, shots: [] }), plant('cherrybomb', 4, 4, { kind: 'cherry', fuse: 500 }),
    plant('sunshroom', 0, 4, { kind: 'sunshroom', age: 119900, timer: 300, next: 700 }),
    plant('puffshroom', 2, 1, { ...shooter, shots: [] }), plant('fumeshroom', 2, 2, { kind: 'fume', ticks: 50, remainder: 4 }),
    plant('gravebuster', 5, 0, { kind: 'gravebuster', elapsed: 4900 }), plant('hypnoshroom', 2, 4, { kind: 'idle' }),
  ];
  data.plants[2].hp = 800;
  data.graves = [{ col: 5, row: 0 }, { col: 6, row: 1 }];
  const pole = exampleZombie('polevaulter', 1);
  pole.hasPole = false;pole.motion.gait = 'poleWalk';pole.vault = { startX: 1000, groundY: pole.y, elapsed: 200 };
  const paper = exampleZombie('newspaper', 2);paper.shieldHp = 0;paper.rageDelay = 900;paper.motion.gait = 'paperRun';
  const ally = exampleZombie('football', 3);ally.allies = true;ally.armorHp = 700;
  const slow = exampleZombie('buckethead', 4);slow.slowFactor = .5;slow.slowRemainingMs = 600;
  const emerging = exampleZombie('conehead', 0);emerging.emergenceTotal = 1500;emerging.emergenceMs = 800;
  data.zombies = [pole, paper, ally, slow, emerging];
  data.projectiles = [{ x: 500, y: 600, texture: 'puff', velocityX: 532.8, velocityY: 0, row: 2, damage: 20, slowFactor: null, slowMs: null, expiresMs: 300, originX: 400 }];
  data.suns = [
    { x: 600, y: 200, value: 25, pickup: { phase: 'falling', restingMs: 0 }, fromY: 100, targetY: 500, fallElapsed: 1300, lifeMs: 12000, flight: null },
    { x: 500, y: 426, value: 15, pickup: { phase: 'resting', restingMs: 70 }, fromY: 400, targetY: null, fallElapsed: 0, lifeMs: 2000, flight: null },
    { x: 570, y: 280, value: 25, pickup: { phase: 'flying', restingMs: 200 }, fromY: 300, targetY: null, fallElapsed: 0, lifeMs: 0, flight: { fromX: 600, fromY: 300, elapsed: 120 } },
  ];
  return gardenSessionSchema.parse(data);
}
