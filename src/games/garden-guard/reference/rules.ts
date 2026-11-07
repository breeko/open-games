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
  waveCounts: [4,6,8,10,8,10,20,10,20,20],
  sourcePins: {
    corrected: '325b2229a7225d73870bb69322eefcda3a45bf8d',
    comparison: 'c4692036c5e11d227c8fb7c593b734dac96da028',
  },
} as const;
export const ZOMBIE_RULES: Record<ZombieType, {cost:number; weight:number; firstWave:number; startLevel:number; levels:readonly number[]}> = {
  basic: {cost:1,weight:4000,firstWave:1,startLevel:1,levels:[1,2,3,4,5,6,7,8,9,10]},
  flag: {cost:1,weight:0,firstWave:1,startLevel:1,levels:[]},
  conehead: {cost:2,weight:4000,firstWave:1,startLevel:3,levels:[3,4,5,6,7,8,9,10]},
  polevaulter: {cost:2,weight:2000,firstWave:5,startLevel:6,levels:[6,7,9,10]},
  buckethead: {cost:4,weight:3000,firstWave:1,startLevel:8,levels:[8,9,10]},
};
export const ZOMBIE_PICK_ORDER: readonly ZombieType[] = ['basic','flag','conehead','polevaulter','buckethead'];
export function referenceFlag(level:number,index:number):boolean {
  if(level===1)return false;
  const interval=Math.min(10,REFERENCE.waveCounts[level-1] ?? 10);
  return index%interval===interval-1;
}
export function randomSource(seed:number):()=>number {
  let state=seed>>>0;
  return ()=> { state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296; };
}
export function allowedZombies(level:number):ZombieType[] { return ZOMBIE_PICK_ORDER.filter(type=>ZOMBIE_RULES[type].levels.includes(level)); }
export function sourceFirstCountdown(level:number):number { return level===2?5000:level===5||level===10?200:1800; }
export function sampleSkySunTicks(fallen:number,random:()=>number):number { return Math.min(950,425+fallen*10)+Math.floor(random()*275); }
