import { referenceWaves } from './reference/waves';
import type { PlantType, ZombieType } from './types';

export interface WaveDefinition {
  readonly delayMs: number;
  readonly gapMs: number;
  readonly zombies: Partial<Record<ZombieType, number>>;
  readonly flag?: boolean;
  readonly final?: boolean;
  readonly sequence?: readonly ZombieType[];
  readonly baseBudget?: number;
  readonly pointsRemaining?: number;
}
interface LevelBase {
  readonly environment: 'day' | 'night';
  readonly id: number;
  readonly name: string;
  readonly title: string;
  readonly blurb: string;
  readonly startingSun: number;
  readonly skySunIntervalMs: number;
  readonly activeRows: readonly number[];
  readonly waves: readonly WaveDefinition[];
  readonly availablePlants: readonly PlantType[];
  readonly reward?: PlantType;
}
export type LevelDefinition = LevelBase & (
  | { readonly mode: 'standard' }
  | {readonly mode:'whack'}
  | { readonly mode: 'bowling'; readonly conveyorSeeds: readonly PlantType[] }
  | { readonly mode: 'conveyor'; readonly conveyorSeeds: readonly PlantType[] }
);
const ORDER: PlantType[] = ['peashooter','sunflower','cherrybomb','wallnut','potatomine','snowpea','chomper','repeater'];
const titles = ['First shoots','Room to grow','Unexpected guests','Hold the line','Wall-nut Bowling','Over the top','A cold welcome','Heavy metal','Double trouble','The final stand'];
const tips = [
  'Tap a seed, then a square. Collect golden suns.',
  'Build sunflowers in back. Protect all three lanes.',
  'Coneheads need more hits. A cherry clears a crowd.',
  'Place wall-nuts ahead of your shooters.',
  'No sun needed. Roll nuts from the first three columns!',
  'Pole vaulters jump the first plant. Mines need time to arm.',
  'Snow peas slow the advance. Watch all five lanes.',
  'Buckets are tough. Chompers swallow a whole zombie, then digest.',
  'Repeaters fire twice. Layer your defenses before the flags.',
  'Plants arrive on the conveyor. Use what you are given!',
];
const availableCounts = [1,2,3,4,4,5,6,7,8,8];
const rewards: (PlantType | undefined)[] = ['sunflower','cherrybomb','wallnut',undefined,'potatomine','snowpea','chomper','repeater',undefined,'puffshroom'];

/** Wave construction is audited separately from UI progression. */
export const LEVELS: readonly LevelDefinition[] = Array.from({length:16}, (_, index): LevelDefinition => {
  const id = index + 1;
  if(id===15)return {id,name:'2-5',title:'Whack-a-Zombie',blurb:'Tap zombies to bonk them. Cones take two hits, buckets three. Suns fund your three emergency seeds.',environment:'night',mode:'whack',startingSun:0,skySunIntervalMs:0,activeRows:[0,1,2,3,4],waves:referenceWaves(id),availablePlants:['potatomine','gravebuster','cherrybomb'],reward:'hypnoshroom'};
  if(id===16)return {id,name:'2-6',title:'Changing sides',blurb:'Football helmets take a beating. Feed one a Hypno-shroom to turn it against the others.',environment:'night',mode:'standard',startingSun:50,skySunIntervalMs:0,activeRows:[0,1,2,3,4],waves:referenceWaves(id),availablePlants:[...ORDER,'puffshroom','sunshroom','fumeshroom','gravebuster','hypnoshroom'],reward:'scaredyshroom'};
  if(id>10) return {id,name:`2-${id-10}`,title:['After dark','Small beginnings','Through the screen','Rest in pieces'][id-11],
    blurb:['No sky sun. Use free Puff-shrooms and build sunflowers.','Sun-shrooms start small and grow after two minutes.','Fumes pass through screen doors and hit a whole line.','Clear graves before the final wave rises from them.'][id-11],
    environment:'night',mode:'standard',startingSun:50,skySunIntervalMs:0,activeRows:[0,1,2,3,4],waves:referenceWaves(id),
    availablePlants:[...ORDER,...(['puffshroom','sunshroom','fumeshroom','gravebuster'] as const).slice(0,id-10)],
    reward: (['sunshroom','fumeshroom','gravebuster',undefined] as const)[id-11]};
  const base: LevelBase = { environment:'day', id, name: `1-${id}`, title: titles[index], blurb: tips[index], startingSun: id === 1 ? 150 : 50,
    skySunIntervalMs: 6500, activeRows: id === 1 ? [2] : id === 2 ? [1,2,3] : [0,1,2,3,4],
    waves: referenceWaves(id), availablePlants: ORDER.slice(0,availableCounts[index]), reward: rewards[index] };
  if (id === 5) return {...base, mode:'bowling', conveyorSeeds:['wallnut']};
  if (id === 10) return {...base, mode:'conveyor', conveyorSeeds:['peashooter','peashooter','wallnut','snowpea','cherrybomb','chomper','repeater']};
  return {...base, mode:'standard'};
});
export const TOTAL_LEVELS = LEVELS.length;
export function getLevel(id: number,seed=12345): LevelDefinition {
  const level=LEVELS[Math.max(0,Math.min(TOTAL_LEVELS - 1,Number.isFinite(id)?Math.trunc(id)-1:0))];
  return {...level,waves:referenceWaves(level.id,seed)};
}
export function plantsForLevel(id: number): PlantType[] { return [...getLevel(id).availablePlants]; }
export function rewardForLevel(id: number): PlantType | undefined { return getLevel(id).reward; }

/** Night defaults always include the new defenders and a source of sun. */
export function defaultSeedsForLevel(id:number):PlantType[] {
 const available=plantsForLevel(id);
 const order:PlantType[]=id>10?['hypnoshroom','puffshroom','sunshroom','fumeshroom','gravebuster','sunflower','wallnut','cherrybomb','snowpea','potatomine','repeater','peashooter','chomper']:available;
 return order.filter(p=>available.includes(p)).slice(0,8);
}
