import type { WaveDefinition } from '../levels';
import type { ZombieType } from '../types';
import { REFERENCE, ZOMBIE_RULES, allowedZombies, randomSource, referenceFlag, sourceFirstCountdown } from './rules';

/** Independent TypeScript implementation of the audited picker, not a fixed guessed enemy list.
 * Uses a portable seeded LCG; it does NOT reproduce the original game's PRNG stream. */
export function referenceWaves(level:number,seed=12345):WaveDefinition[] {
  const random=randomSource(seed);const count=REFERENCE.waveCounts[level-1];
  const allowed=allowedZombies(level);
  const intro=allowed.find(type=>type!=='basic' && ZOMBIE_RULES[type].startLevel===level);
  return Array.from({length:count},(_,index)=>{
    const flag=referenceFlag(level,index);const final=index===count-1;
    const baseBudget=Math.floor(index/3)+1;
    let budget=flag?Math.floor(baseBudget*2.5):baseBudget;
    const sequence:ZombieType[]=[];const zombies:Partial<Record<ZombieType,number>>={};
    const put=(type:ZombieType)=>{sequence.push(type);zombies[type]=(zombies[type]??0)+1;budget-=ZOMBIE_RULES[type].cost;};
    if(flag){for(let n=0;n<Math.min(baseBudget,8);n++)put('basic');put('flag');}
    // Source applies special-level multipliers AFTER the forced plain/flag entries.
    if(level===5)budget*=4;
    if(level===10)budget*=3;
    if(intro && (index===Math.floor(count/2)||final))put(intro);
    if(final)for(const type of allowed)if(!zombies[type])put(type);
    while(budget>0 && sequence.length<50){
      const choices=allowed.filter(type=>ZOMBIE_RULES[type].cost<=budget && ZOMBIE_RULES[type].firstWave<=index+1);
      const total=choices.reduce((sum,type)=>sum+ZOMBIE_RULES[type].weight,0);
      let roll=random()*total;let chosen:ZombieType='basic';
      for(const type of choices){roll-=ZOMBIE_RULES[type].weight;if(roll<0){chosen=type;break;}}
      put(chosen);
    }
    return {delayMs:sourceFirstCountdown(level)*10,gapMs:0,zombies,sequence,flag,final,baseBudget,pointsRemaining:budget};
  });
}
