import type { ZombieType } from '../types';

/** Audited PC first-Adventure rules. See docs/games/garden-guard/audit/accuracy.md for pins and caveats. */
export const REFERENCE = {
  tickMs: 10,
  tileWidth: 80,
  initialCountdownTicks: 1800,
  levelTwoCountdownTicks: 5000,
  bowlingCountdownTicks: 200,
  miniBossCountdownTicks: 200,
  normalCountdownTicks: 2500,
  countdownRangeTicks: 600,
  beforeFlagTicks: 4500,
  healthMinimumElapsedTicks: 400,
  healthTriggeredCountdownTicks: 200,
  flagWarningAtTicks: 5,
  flagWarningDurationTicks: 750,
  healthThresholdMin: 0.5,
  healthThresholdMax: 0.65,
  waveCounts: [4,6,8,10,8,10,20,10,20,20,10,20,10,20,8,10,20,10,20,20,10,20],
  sourcePins: {
    corrected: '325b2229a7225d73870bb69322eefcda3a45bf8d',
    comparison: 'c4692036c5e11d227c8fb7c593b734dac96da028',
  },
} as const;
export const ZOMBIE_RULES: Record<ZombieType, {cost:number; weight:number; firstWave:number; startLevel:number; levels:readonly number[]}> = {
  dancer:{cost:5,weight:1000,firstWave:5,startLevel:18,levels:[18,19,20]},
  backup:{cost:1,weight:0,firstWave:1,startLevel:18,levels:[]},
  football:{cost:7,weight:2000,firstWave:5,startLevel:16,levels:[16,17,20,22]},
  newspaper: {cost:2,weight:1000,firstWave:1,startLevel:11,levels:[11,12,15,22]},
  screendoor: {cost:4,weight:3500,firstWave:5,startLevel:13,levels:[13,14,17,19,20]},
  basic: {cost:1,weight:4000,firstWave:1,startLevel:1,levels:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22]},
  flag: {cost:1,weight:0,firstWave:1,startLevel:1,levels:[]},
  conehead: {cost:2,weight:4000,firstWave:1,startLevel:3,levels:[3,4,5,6,7,8,9,10,12,13,14,15,16,17,18,19,20,21,22]},
  polevaulter: {cost:2,weight:2000,firstWave:5,startLevel:6,levels:[6,7,9,10,14]},
  buckethead: {cost:4,weight:3000,firstWave:1,startLevel:8,levels:[8,9,10,12,15,22]},
};
export const ZOMBIE_PICK_ORDER: readonly ZombieType[] = ['basic','flag','conehead','polevaulter','buckethead','newspaper','screendoor','football','dancer'];
export function referenceFlag(level:number,index:number):boolean {
  if(level===1||level===15)return false;
  const interval=Math.min(10,REFERENCE.waveCounts[level-1] ?? 10);
  return index%interval===interval-1;
}
export interface RandomSource { (): number; snapshot(): number; restore(state: number): void }
export function randomSource(seed:number):RandomSource {
  let state=seed>>>0;
  return Object.assign(()=> { state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296; }, {
    snapshot: () => state, restore: (value: number) => { state=value>>>0; },
  });
}
export function allowedZombies(level:number):ZombieType[] { if(level===15)return ['basic','conehead','buckethead'];return ZOMBIE_PICK_ORDER.filter(type=>ZOMBIE_RULES[type].levels.includes(level)); }
export function sourceFirstCountdown(level:number):number { return level===20?100:level===2?5000:level===5||level===10||level===15?200:1800; }
export function sampleSkySunTicks(fallen:number,random:()=>number):number { return Math.min(950,425+fallen*10)+Math.floor(random()*275); }
