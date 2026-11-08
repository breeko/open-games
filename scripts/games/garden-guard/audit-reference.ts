import {writeFileSync} from 'node:fs';
import {referenceWaves} from '../../../src/games/garden-guard/reference/waves';
import {WaveDirector} from '../../../src/games/garden-guard/wave-director';
import {ZOMBIE_DEFS} from '../../../src/games/garden-guard/constants';
import {initialGraves,NIGHT_RULES} from '../../../src/games/garden-guard/night';
import {LEVELS} from '../../../src/games/garden-guard/levels';
import {WhackDirector,WHACK} from '../../../src/games/garden-guard/whack-director';
import {DanceRoutine,NIGHT_COMBAT,backupPositions} from '../../../src/games/garden-guard/night-combat';
import {NIGHT_CONVEYOR} from '../../../src/games/garden-guard/night-conveyor';
import {REFERENCE} from '../../../src/games/garden-guard/reference/rules';
function run(level:number,kill:boolean){
  const waves=referenceWaves(level);let hp=0;
  const director=new WaveDirector(waves,{spawn(type){const d=ZOMBIE_DEFS[type];const amount=d.hp+d.armorHp+(d.shieldHp??0)*0.2;hp+=amount;return amount;},health(){return kill?0:hp;},liveCount(){return 1;},start(){hp=0;},complete(){}},()=>0.5,level===5);
  for(let i=0;i<200000 && director.events.filter(e=>e.kind==='spawn').length<waves.length;i++)director.update(10);
  return director.events;
}
function whackRun(){
 let graves=9,done=false;
 const director=new WhackDirector({spawn(){},liveCount:()=>0,graveCount:()=>graves,addGraves:n=>{graves+=n;},start(){},complete(){done=true;}},()=>0.5);
 for(let i=0;i<200000&&!done;i++)director.update(10);
 return {rules:WHACK,gravesAtFinal:graves,events:director.events};
}
function danceAudit(){const dance=new DanceRoutine(3000),summonTicks:number[]=[];for(let tick=1;tick<=2000;tick++)if(dance.advance(10,tick,true,true))summonTicks.push(tick);return {summonTicks,centerSlots:backupPositions(800,2),edgeSlots:backupPositions(800,0),note:'Unblocked leader with missing followers; actual deaths, freezing and eating change timing.'};}
writeFileSync('docs/games/garden-guard/audit/reference-report.json',JSON.stringify({sourcePins:REFERENCE.sourcePins,seed:12345,edition:'PC first Adventure; tutorial gates skipped',lateNight:{rules:NIGHT_COMBAT,dancer:danceAudit(),freezeTicks:{first:[400,600],alreadyCold:[300,400]},sessionCompatibility:'garden-day-night-r1; additive field defaults preserve existing sessions'},levels:LEVELS.map((level,i)=>({level:i+1,environment:level.environment,startingSun:level.startingSun,skySun:level.environment==='day',graves:initialGraves(i+1),nightRules:level.environment==='night'?NIGHT_RULES:undefined,mode:level.mode,conveyor:level.id===20?{weights:NIGHT_CONVEYOR,initialSupplyMs:2000,intervalMs:[4000,4250,5000,10000],waveBudgetMultiplier:3,firstWaveMs:1000}:undefined,plan:level.mode==='whack'?undefined:referenceWaves(i+1),whack:level.mode==='whack'?whackRun():undefined,noDamage:level.mode==='whack'?undefined:run(i+1,false),immediateDamage:level.mode==='whack'?undefined:run(i+1,true)}))},null,2)+'\n');
console.log('Wrote source-rule audit for twenty levels to docs/games/garden-guard/audit/reference-report.json');
