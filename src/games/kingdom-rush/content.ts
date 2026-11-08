import source from './reference/level03.json';
import southport from './reference/level01.json';
import farmlands from './reference/level02.json';
import flash from './reference/flash-pagras.json';
import openingPaths from './reference/flash-opening-paths.json';

export interface Point { x: number; y: number }
export type TowerKind = 'archer' | 'barrack' | 'mage' | 'engineer';
export type EnemyKind = 'goblin' | 'orc' | 'wolf' | 'shaman' | 'ogre';
export type SoldierKind = 'militia' | 'footmen' | 'farmer';
export type DamageKind = 'physical' | 'magic' | 'explosion' | 'true';
export interface SpawnChunk { interval: number; max_same: number; fixed_sub_path: number; creep: string; creep_aux?: string; path: number; interval_next: number; max: number }
export interface WaveRoute { delay: number; path_index: number; spawns: SpawnChunk[] }
export interface WaveGroup { interval: number; waves: WaveRoute[] }
export interface Route { lanes: Point[][]; start: number; end: number; activeStart?:number; activeEnd?:number }
export interface Holder { id: number; pos: Point; rally: Point }
export type LevelId = 1 | 2 | 3;
export interface Level { title: string; level: LevelId; maxTowerLevel:number; cash: number; lives: number; holders: Holder[]; paths: Route[]; groups: WaveGroup[] }
// Flash v1.13 campaign timing on the existing desktop-scaled board.
export const LEVEL: Level = {...source, level:3, maxTowerLevel:2, groups: flash.groups};
export const LEVELS:readonly Level[]=[{...southport,...openingPaths.levels['1'],level:1},{...farmlands,...openingPaths.levels['2'],level:2},LEVEL];
export function getLevel(id:number):Level {const level=LEVELS.find(level=>level.level===id);if(!level)throw new Error(`Unknown Kingdom Rush map: ${id}`);return level;}
export const FPS = 30;
export const STEP = 1 / FPS;
export const ASPECT = 0.7;
export const TOWER_KINDS: readonly TowerKind[] = ['archer', 'barrack', 'mage', 'engineer'];
export const TOWERS: Readonly<Record<TowerKind, { name: string; price: readonly number[]; range: readonly number[]; cooldown: number[]; windup: number; damage: readonly (readonly [number, number])[]; damageKind: DamageKind; flight: number; radius: number }>> = {
  archer: { name: 'Archers', price: [70, 110], range: [140, 160], cooldown: [0.8, 0.6], windup: 7/30, damage: [[4,6],[7,11]], damageKind: 'physical', flight: 17/30, radius: 0 },
  barrack: { name: 'Barracks', price: [70,110], range: [145,145], cooldown: [0,0], windup: 0, damage: [[0,0],[0,0]], damageKind: 'physical', flight: 0, radius: 0 },
  mage: { name: 'Mages', price: [100,160], range: [140,160], cooldown: [1.5,1.5], windup: 10/30, damage: [[9,17],[23,43]], damageKind: 'magic', flight: 0.45, radius: 0 },
  engineer: { name: 'Artillery', price: [125,220], range: [160,160], cooldown: [3,3], windup: 10/30, damage: [[8,15],[15,30]], damageKind: 'explosion', flight: 27/30, radius: 62.4 },
};
export interface EnemySpec { template: string; name: string; hp: number; armor: number; magicArmor: number; speed: number; gold: number; lives: number; damage: readonly [number,number]; cooldown: number; hitTime: number; dodge: number; slot: number }
export const ENEMIES: Readonly<Record<EnemyKind, EnemySpec>> = {
  goblin: { template:'enemy_goblin',name:'Goblin',hp:20,armor:0,magicArmor:0,speed:36,gold:3,lives:1,damage:[1,4],cooldown:1,hitTime:14/30,dodge:0,slot:19.2 },
  orc: { template:'enemy_fat_orc',name:'Orc',hp:80,armor:0.3,magicArmor:0,speed:24,gold:9,lives:1,damage:[4,8],cooldown:1,hitTime:10/30,dodge:0,slot:19.2 },
  wolf: { template:'enemy_wolf_small',name:'Wulf',hp:35,armor:0,magicArmor:0,speed:75,gold:5,lives:1,damage:[1,3],cooldown:38/30,hitTime:8/30,dodge:0.3,slot:19.2 },
  shaman: { template:'enemy_shaman',name:'Shaman',hp:100,armor:0,magicArmor:0.85,speed:30,gold:10,lives:1,damage:[3,5],cooldown:1,hitTime:17/30,dodge:0,slot:19.2 },
  ogre: { template:'enemy_ogre',name:'Ogre',hp:800,armor:0,magicArmor:0,speed:21,gold:50,lives:3,damage:[40,60],cooldown:1,hitTime:27/30,dodge:0,slot:32 },
};
export const SOLDIERS: Readonly<Record<SoldierKind,{template:string;hp:number;armor:number;damage:readonly [number,number];cooldown:number;speed:number;regen:number}>> = {
  militia:{template:'soldier_militia',hp:50,armor:0,damage:[1,3],cooldown:1,speed:76.8,regen:5},
  footmen:{template:'soldier_footmen',hp:100,armor:0.15,damage:[3,4],cooldown:50/30,speed:76.8,regen:7},
  farmer:{template:'re_farmer',hp:30,armor:0,damage:[1,2],cooldown:1,speed:76.8,regen:3},
};
export function enemyKind(template: string): EnemyKind {
  switch(template) {
    case 'enemy_goblin': return 'goblin'; case 'enemy_fat_orc': return 'orc';
    case 'enemy_wolf_small': return 'wolf'; case 'enemy_shaman': return 'shaman';
    case 'enemy_ogre': return 'ogre'; default: throw new Error(`Unsupported enemy: ${template}`);
  }
}
export const distance = (a:Point,b:Point):number => Math.hypot(a.x-b.x,a.y-b.y);
export const inRange = (a:Point,b:Point,radius:number):boolean => (a.x-b.x)**2+((a.y-b.y)/ASPECT)**2<=radius**2;
export function damageAfterArmor(value:number,kind:DamageKind,armor:number,magicArmor:number,soldier=false):number {
  const protection=Math.max(0,Math.min(1,kind==='true'?0:kind==='magic'?magicArmor:kind==='explosion'?armor/2:armor));
  return soldier ? Math.round(value-Math.floor(value*protection)) : Math.floor(value*(1-protection));
}

/** Flash artillery deals maximum damage at the center, minimum at the edge. */
export function blastDamage(min:number,max:number,center:Point,target:Point,radius:number):number {
  const dx=target.x-center.x,dy=target.y-center.y;
  // Flash samples its ellipse at a truncated angle before measuring radial falloff.
  const angle=(Math.trunc(Math.atan2(dx,dy)*180/Math.PI)-90)*Math.PI/180;
  const boundary=Math.hypot(radius*Math.cos(angle),radius*2/3*Math.sin(angle));
  const fraction=Math.min(1,Math.hypot(dx,dy)/boundary);
  return Math.floor(max-(max-min)*fraction);
}

/** Flash uses ceil over the damage span; its displayed minimum occurs only at RNG zero. */
export function rollDamage(range:readonly [number,number],random:number):number {
  return range[0]+Math.ceil(random*(range[1]-range[0]));
}
