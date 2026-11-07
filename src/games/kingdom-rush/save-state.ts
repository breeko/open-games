import { z } from 'zod';
import { getLevel } from './content';

const tick = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const uint32 = z.number().int().min(0).max(0xffffffff);
const point = z.object({ x: z.number(), y: z.number() });
const id = tick;
const health = z.number().nonnegative();
// null explicitly represents "never"; JSON cannot represent Infinity.
const deadline = tick.nullable();
const enemyKind = z.enum(['goblin', 'orc', 'wolf', 'shaman', 'ogre']);
const animation = z.string().min(1).max(64);
const facing = z.number().int().refine((value): boolean => value === -1 || value === 1);
const deadAt = z.number().int().min(-1);
const enemySchema = point.extend({
  id: id.positive(), kind: enemyKind, route: z.number().int().min(0).max(1),
  lane: z.number().int().min(0).max(2), node: tick, hp: health, maxHp: health.positive(),
  deadAt, escaped: z.boolean(), nextAttack: tick, hitAt: tick, attackTarget: id,
  healAt: tick, healUntil: tick, nextHeal: tick, animation, animAt: tick, facing,
});
const soldierSchema = point.extend({
  id: id.positive(), kind: z.enum(['militia', 'footmen', 'farmer']), towerId: id,
  activeAt: tick, slot: z.number().int().min(0).max(2), rally: point, hp: health,
  deadAt, respawnAt: deadline, expires: deadline, target: id, nextAttack: tick,
  home: point, destination: point, meleeSlot: z.number().int().min(-1).max(2), arrived: z.boolean(), redeploying: z.boolean(),
  hitAt: tick, regenAt: tick, animation, animAt: tick, facing,
});
const towerSchema = point.extend({
  id: id.positive(),
  kind: z.enum(['archer', 'barrack', 'mage', 'engineer']), level: z.number().int().min(1).max(2),
  readyAt: tick, spent: tick, rally: point, targetId: id, nextAttack: tick,
  fireAt: tick, animAt: z.number().int(), target: point, shots: tick,
});
const projectileSchema = z.object({
  id: id.positive(), kind: z.enum(['physical', 'magic', 'explosion', 'true']),
  from: point, to: point, start: tick, impact: tick, target: id,
  damage: health, radius: health, minDamage: health.optional(),
});
const effectSchema = point.extend({
  type: z.enum(['hit', 'heal', 'fire', 'death']), start: tick, duration: tick, radius: health,
});
const spawnSchema = z.object({
  tick, kind: enemyKind, route: z.number().int().min(0).max(1),
  lane: z.number().int().min(-1).max(2),
});

/** Bump compatibility when changed rules cannot safely resume an older battle. */
export const battleSnapshotSchema = z.object({
  compatibility: z.literal('pagras-flash-v1.13-r2'), level: z.union([z.literal(1),z.literal(2),z.literal(3)]),
  tick, gold: tick, lives: tick.max(20), wave: tick.max(99),
  kills: tick, leaked: tick, phase: z.enum(['ready', 'running', 'won', 'lost']), paused: z.boolean(),
  seed: uint32, rng: uint32.positive(), nextId: id.positive(),
  groupEnd: tick, nextWaveTick: deadline, fireReady: tick, reinforcementsReady: tick,
  enemies: z.array(enemySchema).max(1024), soldiers: z.array(soldierSchema).max(10000),
  towers: z.array(towerSchema).max(99),
  projectiles: z.array(projectileSchema).max(10000), effects: z.array(effectSchema).max(10000),
  pending: z.array(spawnSchema).max(1024),
}).superRefine((battle, ctx) => {
  const level=getLevel(battle.level);
  if(battle.wave>level.groups.length||battle.towers.length>level.holders.length||battle.towers.some(tower=>tower.level>level.maxTowerLevel||!level.holders.some(holder=>holder.id===tower.id))||battle.pending.some(spawn=>!level.paths[spawn.route]))ctx.addIssue({code:'custom',message:'Invalid map wave, tower or pending route'});
  for(const enemy of battle.enemies){const route=level.paths[enemy.route];if(!route||enemy.node<route.start||enemy.node>route.end||enemy.hp>enemy.maxHp)ctx.addIssue({code:'custom',message:'Invalid enemy path position or health'});}
  const entityIds = [...battle.enemies, ...battle.soldiers, ...battle.projectiles].map(entity => entity.id);
  if (new Set(entityIds).size !== entityIds.length || entityIds.some(value => value >= battle.nextId)) {
    ctx.addIssue({ code: 'custom', message: 'Invalid entity IDs' });
  }
  if (new Set(battle.towers.map(tower => tower.id)).size !== battle.towers.length) {
    ctx.addIssue({ code: 'custom', message: 'Duplicate tower sites' });
  }
  if (battle.pending.some((spawn, index) => index > 0 && spawn.tick < battle.pending[index - 1].tick)) {
    ctx.addIssue({ code: 'custom', message: 'Spawn schedule must be ordered' });
  }
});

export type BattleSnapshot = z.infer<typeof battleSnapshotSchema>;
export const sessionSchema = z.object({
  version: z.literal(1), savedAt: tick, speed: z.union([z.literal(1), z.literal(2)]),
  battle: battleSnapshotSchema,
});
export type SessionSave = z.infer<typeof sessionSchema>;
