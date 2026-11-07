import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,defaultSeedsForLevel} from '../../../src/games/garden-guard/levels';
import {PLANT_DEFS,ZOMBIE_DEFS} from '../../../src/games/garden-guard/constants';
import {allowedZombies} from '../../../src/games/garden-guard/reference/rules';
import {referenceWaves} from '../../../src/games/garden-guard/reference/waves';
import {initialGraves} from '../../../src/games/garden-guard/night';
import {iceFreezeMs,scaredyThreat,DanceRoutine,backupPositions,NIGHT_COMBAT} from '../../../src/games/garden-guard/night-combat';
import {gardenSessionSchema} from '../../../src/games/garden-guard/state/session-data';
import {nightDiagnostic} from '../../../src/games/garden-guard/diagnostics/night-scenarios';
import {freshSession,busyNightSession,exampleZombie} from './fixtures/session';

test('2-7 and 2-8 use the source waves, eligible enemies, rewards and grave distribution',()=>{
 assert.deepEqual(LEVELS.slice(16).map(l=>[l.name,l.waves.length,l.startingSun,l.reward]),[['2-7',20,50,'iceshroom'],['2-8',10,50,'doomshroom']]);
 assert.deepEqual(allowedZombies(17),['basic','conehead','screendoor','football']);
 assert.deepEqual(allowedZombies(18),['basic','conehead','dancer']);
 for(const id of [17,18]){
  const graves=initialGraves(id);assert.equal(graves.length,11);
  assert.deepEqual(graves.reduce<Record<number,number>>((a,g)=>{a[g.col]=(a[g.col]??0)+1;return a;},{}),{4:1,5:2,6:2,7:3,8:3});
  assert.ok(defaultSeedsForLevel(id).includes('scaredyshroom'));assert.ok(defaultSeedsForLevel(id).includes('sunshroom'));assert.ok(defaultSeedsForLevel(id).includes('puffshroom'));
 }
 assert.ok(defaultSeedsForLevel(18).includes('iceshroom'));
 for(let seed=0;seed<100;seed++){
  const waves=referenceWaves(18,seed);assert.ok(waves[5].zombies.dancer);assert.ok(waves[9].zombies.dancer);
  assert.ok(waves.slice(0,4).every(w=>!w.zombies.dancer));assert.ok(waves.every(w=>!w.zombies.backup));
 }
 assert.deepEqual(referenceWaves(17).flatMap((w,i)=>w.flag?[i+1]:[]),[10,20]);
});
test('new seed prices and dancer health match source definitions',()=>{
 assert.deepEqual([PLANT_DEFS.scaredyshroom.cost,PLANT_DEFS.iceshroom.cost,PLANT_DEFS.doomshroom.cost],[25,75,125]);
 assert.equal(PLANT_DEFS.iceshroom.cooldownMs,50000);assert.equal(PLANT_DEFS.doomshroom.cooldownMs,50000);
 assert.equal(ZOMBIE_DEFS.dancer.hp,500);assert.equal(ZOMBIE_DEFS.backup.hp,270);assert.equal(NIGHT_COMBAT.craterMs,180000);
});
test('Ice-shroom samples inclusive 4–6 second freezes and shorter 3–4 second repeat freezes',()=>{
 assert.equal(iceFreezeMs(false,()=>0),4000);assert.equal(iceFreezeMs(false,()=>0.999999),6000);
 assert.equal(iceFreezeMs(true,()=>0),3000);assert.equal(iceFreezeMs(true,()=>0.999999),4000);
 assert.equal(NIGHT_COMBAT.iceChillMs,20000);assert.equal(NIGHT_COMBAT.iceDamage,20);
});
test('Scaredy-shroom checks a circle against body bounds and includes neighboring lanes',()=>{
 const body={row:2,left:800,top:400,right:850,bottom:550};
 assert.equal(scaredyThreat(640,528,2,body),false);
 assert.equal(scaredyThreat(640,528,2,{...body,left:700,right:750}),true);
 assert.equal(scaredyThreat(640,528,2,{row:1,left:600,right:650,top:300,bottom:420}),true);
 assert.equal(scaredyThreat(640,528,2,{...body,row:0,left:600,right:650}),false);
});
test('dancers summon four backups with source offsets and respect lawn edges',()=>{
 assert.deepEqual(backupPositions(800,2),[{x:800,row:1,slot:0},{x:800,row:3,slot:1},{x:640,row:2,slot:2},{x:960,row:2,slot:3}]);
 assert.equal(backupPositions(800,0).length,3);assert.equal(backupPositions(800,4).length,3);
 const dance=new DanceRoutine(3000);let summons=0;
 for(let tick=1;tick<=600;tick++)if(dance.advance(10,tick,false,true))summons++;
 assert.equal(summons,1);assert.equal(dance.phase,'dance');
 assert.equal(dance.canMove(0),true);assert.equal(dance.canMove(239),true);assert.equal(dance.canMove(240),false);assert.equal(dance.canMove(459),false);assert.equal(dance.canMove(460),true);
});
function timeline(chunk:number){
 const routine=new DanceRoutine(3000);const result:number[]=[];
 for(let ms=0;ms<20000;ms+=chunk){const delta=Math.min(chunk,20000-ms);if(routine.advance(delta,Math.floor((ms+delta)/10),true,true))result.push(Math.floor((ms+delta)/10));}
 return {routine,result};
}
test('dancer counters restore without rerunning the first summon or losing replacement timing',()=>{
 const original=new DanceRoutine(3010),restored=new DanceRoutine(3000);
 for(let tick=1;tick<500;tick++)original.advance(10,tick,false,true);
 restored.restore(JSON.parse(JSON.stringify(original.save())));
 let replacement=0;
 for(let tick=500;tick<2000;tick++){
  const a=original.advance(10,tick,true,true),b=restored.advance(10,tick,true,true);
  assert.equal(a,b);assert.deepEqual(original.save(),restored.save());if(a)replacement++;
 }
 assert.ok(replacement>0);
 assert.deepEqual(timeline(37).routine.save(),timeline(10).routine.save());
});
test('headless dancers cannot summon and an intact group does not request more dancers',()=>{
 const headless=new DanceRoutine(3000);for(let t=1;t<3000;t++)assert.equal(headless.advance(10,t,true,false),false);
 const intact=new DanceRoutine(3000);let count=0;for(let t=1;t<3000;t++)if(intact.advance(10,t,false,true))count++;
 assert.equal(count,1);
});
test('existing r1 sessions load with additive defaults and retain existing progress fields',()=>{
 const legacy=JSON.parse(JSON.stringify(busyNightSession()));delete legacy.craters;
 for(const zombie of legacy.zombies)for(const key of ['frozenMs','dance','leaderIndex','danceSlot'])delete zombie[key];
 const save=gardenSessionSchema.parse(legacy);assert.equal(save.compatibility,'garden-day-night-r1');assert.deepEqual(save.craters,[]);
 assert.ok(save.zombies.every(z=>z.frozenMs===0&&z.dance===null&&z.leaderIndex===null));assert.equal(save.sun,legacy.sun);
});
test('new saves retain an Ice-shroom fuse, frozen enemies, dancer links, fear pose and crater timers',()=>{
 const save=freshSession(18);
 save.plants=[{type:'iceshroom',col:0,row:0,hp:300,behavior:{kind:'ice',fuse:730}},{type:'scaredyshroom',col:0,row:1,hp:300,behavior:{kind:'shooter',cooldown:25,remainder:3,shots:[],hidden:true}}];
 const leader=exampleZombie('dancer',2);leader.dance=new DanceRoutine(3010).save();leader.frozenMs=4290;leader.slowRemainingMs=19000;leader.motion.gait='dancerEntry';
 const backup=exampleZombie('backup',1);backup.leaderIndex=0;backup.danceSlot=0;backup.emergenceTotal=1500;backup.emergenceMs=620;
 save.zombies=[leader,backup];save.craters=[{col:3,row:4,remainingMs:75000}];
 assert.deepEqual(gardenSessionSchema.parse(JSON.parse(JSON.stringify(save))),save);
 const bad={...save,zombies:[leader,{...backup,leaderIndex:99}]};assert.equal(gardenSessionSchema.safeParse(bad).success,false);
 assert.equal(gardenSessionSchema.safeParse({...save,craters:[{col:0,row:0,remainingMs:7000}]}).success,false);
 assert.equal(gardenSessionSchema.safeParse({...save,zombies:[leader,backup,backup]}).success,false);
});

test('development scenarios are valid resumable boards for isolated summon and freeze checks',()=>{
 for(const frozen of [false,true]){
  const save=nightDiagnostic(frozen);assert.equal(save.levelId,18);assert.equal(save.waves.director.kind,'standard');
  assert.equal(save.zombies.length,frozen?5:1);assert.equal(gardenSessionSchema.safeParse(save).success,true);
  assert.ok(save.seeds.includes('iceshroom'));assert.ok(save.seeds.includes('scaredyshroom'));
 }
});
