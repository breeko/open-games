import {writeFileSync} from 'node:fs';
import {referenceWaves} from '../../../src/games/garden-guard/reference/waves';
import {WaveDirector} from '../../../src/games/garden-guard/wave-director';
import {ZOMBIE_DEFS} from '../../../src/games/garden-guard/constants';
import {initialGraves,NIGHT_RULES} from '../../../src/games/garden-guard/night';
import {LEVELS} from '../../../src/games/garden-guard/levels';
import {WhackDirector,WHACK} from '../../../src/games/garden-guard/whack-director';
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
writeFileSync('docs/games/garden-guard/audit/reference-report.json',JSON.stringify({sourcePins:REFERENCE.sourcePins,seed:12345,edition:'PC first Adventure; tutorial gates skipped',levels:LEVELS.map((level,i)=>({level:i+1,environment:level.environment,startingSun:level.startingSun,skySun:level.environment==='day',graves:initialGraves(i+1),nightRules:level.environment==='night'?NIGHT_RULES:undefined,mode:level.mode,plan:level.mode==='whack'?undefined:referenceWaves(i+1),whack:level.mode==='whack'?whackRun():undefined,noDamage:level.mode==='whack'?undefined:run(i+1,false),immediateDamage:level.mode==='whack'?undefined:run(i+1,true)}))},null,2)+'\n');
console.log('Wrote source-rule audit for sixteen levels to docs/games/garden-guard/audit/reference-report.json');
