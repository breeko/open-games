import { z } from 'zod';
import {canPlantTerrain,canSwim} from '../terrain';
import { LEVELS, TOTAL_LEVELS } from '../levels';
import { PLANT_DEFS } from '../constants';
import { arcadeRemainderSchema } from './arcade-clock';

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const ms = z.number().nonnegative();
const remainder = ms.lt(10);
const row = count.max(5), col = count.max(8);
const point = z.object({ x: z.number(), y: z.number() });
export const plantTypeSchema = z.enum(['jalapeno','tanglekelp','lilypad','squash','puffshroom', 'sunshroom', 'fumeshroom', 'gravebuster', 'hypnoshroom', 'scaredyshroom', 'iceshroom', 'doomshroom', 'sunflower', 'peashooter', 'wallnut', 'potatomine', 'snowpea', 'repeater', 'threepeater', 'cherrybomb', 'chomper']);
const zombieType = z.enum(['basic', 'flag', 'conehead', 'buckethead', 'polevaulter', 'newspaper', 'screendoor', 'football', 'dancer', 'backup','snorkel']);
export const plantBehaviorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('idle') }),
  z.object({kind:z.literal('kelp'),remainingMs:ms.max(1000),targetIndex:count.nullable()}),
  z.object({kind:z.literal('squash'),phase:z.enum(['idle','look','prepare','rise','fall','landed']),remainingMs:ms.max(1000),targetX:z.number().finite()}).refine(s=>s.remainingMs<=({idle:0,look:800,prepare:450,rise:500,fall:100,landed:1000}[s.phase]),'Invalid Squash countdown'),
  z.object({ kind: z.literal('shooter'), cooldown: z.number().int().min(-1).max(150), remainder,
    hidden:z.boolean().optional(),
    shots: z.array(z.object({ row, remainingMs: ms.max(350) })).max(15) }),
  z.object({ kind: z.literal('sunflower'), timer: ms, next: ms.positive() }),
  z.object({ kind: z.literal('sunshroom'), age: ms, timer: ms, next: ms.positive() }),
  z.object({ kind: z.literal('mine'), timer: ms, armed: z.boolean() }),
  z.object({ kind: z.literal('cherry'), fuse: ms }),
  z.object({kind:z.literal('ice'),fuse:ms.max(1000)}),
  z.object({kind:z.literal('doom'),fuse:ms.max(1000)}),
  z.object({ kind: z.literal('chomper'), digest: ms.max(42000) }),
  z.object({ kind: z.literal('gravebuster'), elapsed: ms }),
  z.object({ kind: z.literal('fume'), ticks: z.number().int().min(-1).max(150), remainder }),
]);
export type PlantBehavior = z.infer<typeof plantBehaviorSchema>;
const behaviorForPlant = {
  peashooter: 'shooter', snowpea: 'shooter', repeater: 'shooter', threepeater: 'shooter', puffshroom: 'shooter', scaredyshroom: 'shooter',
  lilypad:'idle',squash:'squash',tanglekelp:'kelp',jalapeno:'cherry',
  iceshroom:'ice',doomshroom:'doom',
  sunflower: 'sunflower', sunshroom: 'sunshroom', wallnut: 'idle', hypnoshroom: 'idle',
  potatomine: 'mine', cherrybomb: 'cherry', chomper: 'chomper', gravebuster: 'gravebuster', fumeshroom: 'fume',
} as const;
export const plantSnapshotSchema = z.object({ type: plantTypeSchema, col, row, hp: ms.positive(), behavior: plantBehaviorSchema })
  .refine(plant => plant.behavior.kind === behaviorForPlant[plant.type] && plant.hp <= PLANT_DEFS[plant.type].maxHp,
    'Plant behavior and health must match its type');
export type PlantSnapshot = z.infer<typeof plantSnapshotSchema>;

export const motionSchema = z.object({ gait: z.enum(['walk', 'walk2', 'poleRun', 'poleWalk', 'paperWalk', 'paperRun', 'football', 'dancer', 'backup', 'dancerEntry','swim','snorkelWalk']), parameter: ms, phase: ms.lt(1), remainder });
export type MotionSnapshot = z.infer<typeof motionSchema>;
export const danceSchema=z.object({phase:z.enum(['entry','point','hold','dance']),remainingMs:ms.max(3110),replacementMs:ms.max(1000),remainder});
export const snorkelSchema=z.object({phase:z.enum(['walk','enter','swim','rise','eat','dive','exit']),remainingMs:ms.max(1190),remainder});
export type SnorkelSnapshot=z.infer<typeof snorkelSchema>;
export const zombieSnapshotSchema = point.extend({
  type: zombieType, row, wave: count, hp: ms.positive(), maxHp: ms.positive(), armorHp: ms, shieldHp: ms,
  speed: ms, speedMultiplier: ms.positive(), dps: ms, allies: z.boolean(), hasPole: z.boolean(),
  emergenceTotal: ms, emergenceMs: ms, rageDelay: ms, headless: z.boolean(), bleedTicks: remainder,
  biteRemainder: ms.max(80), slowFactor: ms.max(1), slowRemainingMs: ms,
  frozenMs:ms.max(6000).default(0),dance:danceSchema.nullable().default(null),leaderIndex:count.nullable().default(null),danceSlot:count.max(3).nullable().default(null),
  snorkel:snorkelSchema.nullable().default(null),
  motion: motionSchema, vault: z.object({ startX: z.number(), groundY: z.number(), elapsed: ms.max(650) }).nullable(),
}).refine(zombie => zombie.hp <= zombie.maxHp && zombie.emergenceMs <= zombie.emergenceTotal, 'Invalid zombie health or emergence');
export type ZombieSnapshot = z.infer<typeof zombieSnapshotSchema>;

export const pickupSchema = z.object({ phase: z.enum(['falling', 'resting', 'flying', 'finished']), restingMs: ms });
export type PickupSnapshot = z.infer<typeof pickupSchema>;
export const sunSnapshotSchema = point.extend({
  value: z.union([z.literal(15), z.literal(25)]), pickup: pickupSchema,
  fromY: z.number(), targetY: z.number().nullable(), fallElapsed: ms.max(6500), lifeMs: ms.max(18000),
  flight: z.object({ fromX: z.number(), fromY: z.number(), elapsed: ms.max(300) }).nullable(),
}).refine(sun => sun.pickup.phase !== 'finished' && (sun.pickup.phase === 'flying') === (sun.flight !== null), 'Invalid sun flight');
export type SunSnapshot = z.infer<typeof sunSnapshotSchema>;

export const waveDirectorSchema = z.object({ kind: z.literal('standard'), index: z.number().int().min(-1), remainder,
  tick: count, countdown: z.number().int(), interval: count, warningTicks: count, initialHealth: ms, threshold: ms, done: z.boolean() });
export type WaveDirectorSnapshot = z.infer<typeof waveDirectorSchema>;
export const whackDirectorSchema = z.object({ kind: z.literal('whack'), tick: count, remainder, wave: count.max(8),
  countdown: z.number().int(), spawnCountdown: z.number().int(), done: z.boolean() });
export type WhackDirectorSnapshot = z.infer<typeof whackDirectorSchema>;
export const waveManagerSchema = z.object({ random: count.max(0xffffffff), tickRemainder: remainder, riseTicks: count.max(200),
  laneHistory: z.array(row).max(2), director: z.discriminatedUnion('kind', [waveDirectorSchema, whackDirectorSchema]) });
export type WaveManagerSnapshot = z.infer<typeof waveManagerSchema>;

export const seedBankSchema = z.array(z.object({ type: plantTypeSchema, stock: count.max(5), remainingMs: ms, totalMs: ms.positive() })).max(15);
export type SeedBankSnapshot = z.infer<typeof seedBankSchema>;
export const projectileSchema = point.extend({ texture: z.enum(['pea', 'icepea', 'puff']), velocityX: z.number(), velocityY: z.number(),
  row, damage: ms, slowFactor: ms.max(1).nullable(), slowMs: ms.nullable(), expiresMs: ms.nullable(), originX: z.number() });

export const gardenSessionSchema = z.object({
  version: z.literal(1), compatibility: z.literal('garden-day-night-r1'), savedAt: count,
  levelId: count.min(1).max(TOTAL_LEVELS), difficulty: z.enum(['relaxed', 'baseline', 'hard']),
  seeds: z.array(plantTypeSchema).min(1).max(15), sun: count, random: count.max(0xffffffff), physicsRemainderMs:arcadeRemainderSchema,
  skySunTimer: ms, skyNext: ms.positive(), skyFallen: count, supplyTimer: ms, supplyIndex: count,
  plants: z.array(plantSnapshotSchema).max(72), zombies: z.array(zombieSnapshotSchema).max(1024),
  suns: z.array(sunSnapshotSchema).max(1024), projectiles: z.array(projectileSchema).max(4096),
  craters:z.array(z.object({col,row,remainingMs:ms.positive().max(180000)})).max(45).default([]),
  graves: z.array(z.object({ col, row })).max(45), waves: waveManagerSchema, seedBank: seedBankSchema,
  mowers: z.array(z.object({ row, x: z.number(), used: z.boolean(), moving: z.boolean(), visible: z.boolean() })).max(6),
  rolling: z.array(point.extend({ row, angle: z.number(), hits: z.array(count).max(1024),
    bounce: z.object({ fromY: z.number(), elapsed: ms.max(220) }).nullable() })).max(100),
}).superRefine((save, ctx) => {
  const level = LEVELS[save.levelId - 1];
  if (!level) return;
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  const unique = (values: readonly (string | number)[]) => new Set(values).size === values.length;
  if (!unique(save.seeds) || save.seeds.some(type => !level.availablePlants.includes(type))) issue('Invalid level loadout');
  if (!unique(save.plants.map(plant => `${plant.col},${plant.row},${plant.type==='lilypad'?'support':'main'}`))) issue('Duplicate plant cells');
  if(!unique(save.craters.map(crater=>`${crater.col},${crater.row}`)))issue('Duplicate craters');
  if(save.plants.some(p=>save.craters.some(c=>c.col===p.col&&c.row===p.row)))issue('Plant in active crater');
  const water=(row:number)=>level.environment==='pool'&&(row===2||row===3);
  for(const plant of save.plants){
    const pad=save.plants.some(p=>p.type==='lilypad'&&p.col===plant.col&&p.row===plant.row);
    if(!canPlantTerrain(plant.type,water(plant.row),plant.type==='lilypad'?false:pad,false))issue('Invalid plant terrain or missing Lily Pad');
  }
  if(save.graves.some(g=>!level.activeRows.includes(g.row))||save.craters.some(c=>!level.activeRows.includes(c.row)))issue('Invalid terrain lane');
  if(level.environment==='pool'&&save.graves.length)issue('Pool boards have no graves');
  if(save.zombies.some(z=>z.motion.gait==='swim'&&(!water(z.row)||!canSwim(z.type))))issue('Swimming requires a water lane');
  const kelpTargets=save.plants.flatMap(p=>p.behavior.kind==='kelp'&&p.behavior.targetIndex!==null?[p.behavior.targetIndex]:[]);
  if(!unique(kelpTargets))issue('Duplicate kelp targets');
  for(const plant of save.plants)if(plant.behavior.kind==='kelp'&&plant.behavior.targetIndex!==null){const target=save.zombies[plant.behavior.targetIndex];if(!target||target.row!==plant.row||target.allies||!water(target.row)||plant.behavior.remainingMs<=0)issue('Invalid kelp target');}
  for(const [index,zombie] of save.zombies.entries()){
    if((zombie.type==='snorkel')!==(zombie.snorkel!==null))issue('Wrong snorkel routine');
    if(zombie.type==='snorkel'&&!water(zombie.row))issue('Snorkel needs water lane');
    if(zombie.type==='dancer'&&!zombie.dance)issue('Dancing Zombie needs a routine');
    if(zombie.type!=='dancer'&&zombie.dance)issue('Wrong dancer routine type');
    if(zombie.leaderIndex!==null){const leader=save.zombies[zombie.leaderIndex];if(zombie.type!=='backup'||zombie.leaderIndex===index||!leader||leader.type!=='dancer'||leader.allies!==zombie.allies||zombie.danceSlot===null)issue('Invalid backup dancer link');}
  }
  const slots=save.zombies.filter(z=>z.leaderIndex!==null).map(z=>`${z.leaderIndex},${z.danceSlot}`);
  if(!unique(slots))issue('Duplicate backup slots');
  if (!unique(save.graves.map(grave => `${grave.col},${grave.row}`))) issue('Duplicate graves');
  if (save.plants.some(plant => !level.activeRows.includes(plant.row) || !save.seeds.includes(plant.type))) issue('Invalid planted seed');
  if (save.zombies.some(zombie => !level.activeRows.includes(zombie.row) || zombie.wave >= level.waves.length)) issue('Invalid zombie lane or wave');
  if (save.projectiles.some(pea => !level.activeRows.includes(pea.row))) issue('Invalid projectile lane');
  if (!unique(save.seedBank.map(card => card.type)) || save.seedBank.length !== save.seeds.length || save.seedBank.some((card, i) => card.type !== save.seeds[i])) issue('Seed bank must match loadout order');
  if (!unique(save.mowers.map(mower => mower.row)) || save.mowers.length !== level.activeRows.length || save.mowers.some(mower => !level.activeRows.includes(mower.row) || (mower.moving && !mower.used))) issue('Invalid mowers');
  if (save.rolling.some(nut => nut.hits.some(index => index >= save.zombies.length))) issue('Invalid rolling-nut hit references');
  const director = save.waves.director;
  if (level.mode === 'whack' ? director.kind !== 'whack' : director.kind !== 'standard') issue('Wrong wave director for level');
  if (director.kind === 'standard' && director.index >= level.waves.length) issue('Invalid wave index');
  if (director.done) issue('Completed sessions cannot be resumed');
  if (level.mode !== 'bowling' && save.rolling.length) issue('Rolling nuts require bowling mode');
});
export type GardenSession = z.infer<typeof gardenSessionSchema>;
