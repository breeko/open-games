import {writeFileSync} from 'node:fs';
import {referenceWaves} from '../src/reference/waves';
import {WaveDirector} from '../src/wave-director';
import {ZOMBIE_DEFS} from '../src/constants';
import {REFERENCE} from '../src/reference/rules';
function run(level:number,kill:boolean){
  const waves=referenceWaves(level);let hp=0;
  const director=new WaveDirector(waves,{spawn(type){const d=ZOMBIE_DEFS[type];const amount=d.hp+d.armorHp;hp+=amount;return amount;},health(){return kill?0:hp;},liveCount(){return 1;},start(){hp=0;},complete(){}},()=>0.5,level===5);
  for(let i=0;i<200000 && director.events.filter(e=>e.kind==='spawn').length<waves.length;i++)director.update(10);
  return director.events;
}
writeFileSync('docs/audit/reference-report.json',JSON.stringify({sourcePins:REFERENCE.sourcePins,seed:12345,edition:'PC first Adventure; tutorial gates skipped',levels:Array.from({length:10},(_,i)=>({level:i+1,plan:referenceWaves(i+1),noDamage:run(i+1,false),immediateDamage:run(i+1,true)}))},null,2)+'\n');
console.log('Wrote source-rule audit for ten levels to docs/audit/reference-report.json');
