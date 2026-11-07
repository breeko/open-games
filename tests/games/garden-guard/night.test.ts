import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,defaultSeedsForLevel,rewardForLevel} from '../../../src/games/garden-guard/levels';
import {initialGraves,NIGHT_RULES,FinalGraveRise} from '../../../src/games/garden-guard/night';
import {allowedZombies,randomSource} from '../../../src/games/garden-guard/reference/rules';
import {referenceWaves} from '../../../src/games/garden-guard/reference/waves';
import {PLANT_DEFS,ZOMBIE_DEFS} from '../../../src/games/garden-guard/constants';
import {damageWithShield,waveHealth} from '../../../src/games/garden-guard/combat';
import {parseProgress} from '../../../src/games/garden-guard/progress-data';
import {GroundMotion} from '../../../src/games/garden-guard/reference/motion';
import {WaveDirector} from '../../../src/games/garden-guard/wave-director';

test('first four night levels preserve PC wave counts, flags and sunless economy',()=>{
 assert.deepEqual(LEVELS.slice(10,14).map(l=>[l.name,l.waves.length,l.startingSun,l.skySunIntervalMs]),[['2-1',10,50,0],['2-2',20,50,0],['2-3',10,50,0],['2-4',20,50,0]]);
 for(const l of LEVELS.slice(10,14)){
  assert.equal(l.environment,'night');assert.equal(l.waves[0].delayMs,18000);
  assert.deepEqual(l.waves.flatMap((w,i)=>w.flag?[i+1]:[]),l.waves.length===10?[10]:[10,20]);
  const seeds=defaultSeedsForLevel(l.id);assert.ok(seeds.includes('puffshroom'));assert.ok(seeds.includes('sunflower'));assert.ok(seeds.length<=8);
 }
 assert.equal(rewardForLevel(10),'puffshroom');assert.ok(defaultSeedsForLevel(14).includes('gravebuster'));
});
test('night zombie eligibility and forced introductions match the Adventure table',()=>{
 assert.deepEqual(allowedZombies(11),['basic','newspaper']);
 assert.deepEqual(allowedZombies(12),['basic','conehead','buckethead','newspaper']);
 assert.deepEqual(allowedZombies(13),['basic','conehead','screendoor']);
 assert.deepEqual(allowedZombies(14),['basic','conehead','polevaulter','screendoor']);
 for(let seed=0;seed<100;seed++)for(const [level,type] of [[11,'newspaper'],[13,'screendoor']] as const){
  const waves=referenceWaves(level,seed);assert.ok(waves[Math.floor(waves.length/2)].zombies[type]);assert.ok(waves.at(-1)!.zombies[type]);
  if(type==='screendoor')assert.ok(waves.slice(0,4).every(w=>!w.zombies.screendoor));
 }
});
test('grave distributions stay unique and in the source columns across seeds',()=>{
 for(let seed=0;seed<100;seed++)for(const level of [11,12,13,14]){
  const graves=initialGraves(level,seed);
  assert.equal(new Set(graves.map(g=>`${g.col},${g.row}`)).size,graves.length);
  assert.deepEqual(graves.reduce<Record<number,number>>((a,g)=>{a[g.col]=(a[g.col]??0)+1;assert.ok(g.row>=0&&g.row<5);return a;},{}),level===14?{5:1,6:1,7:2,8:3}:{6:1,7:1,8:2});
 }
 assert.deepEqual(initialGraves(10),[]);
});
test('night plant prices, recharge and growth are sourced values',()=>{
 assert.deepEqual(['puffshroom','sunshroom','fumeshroom','gravebuster'].map(p=>PLANT_DEFS[p as keyof typeof PLANT_DEFS].cost),[0,25,75,75]);
 for(const p of ['puffshroom','sunshroom','fumeshroom','gravebuster'] as const)assert.equal(PLANT_DEFS[p].cooldownMs,7500);
 assert.equal(NIGHT_RULES.sunGrowthMs,120000);assert.equal(NIGHT_RULES.smallSun,15);assert.equal(NIGHT_RULES.largeSun,25);
});
test('carried shields absorb peas, fumes bypass shields but helmets remain protective',()=>{
 assert.equal(ZOMBIE_DEFS.newspaper.shieldHp,150);assert.equal(ZOMBIE_DEFS.screendoor.shieldHp,1100);
 assert.deepEqual(damageWithShield({hp:270,armor:0,shield:1100},20),{hp:270,armor:0,shield:1080});
 assert.deepEqual(damageWithShield({hp:270,armor:0,shield:1100},20,true),{hp:250,armor:0,shield:1100});
 assert.deepEqual(damageWithShield({hp:270,armor:370,shield:0},20,true),{hp:270,armor:350,shield:0});
 assert.deepEqual(damageWithShield({hp:270,armor:0,shield:10},20),{hp:260,armor:0,shield:0});
 assert.equal(waveHealth({hp:270,armor:0,shield:1100}),490);
});
test('paper rage uses its original ground track and is about three times faster',()=>{
 const normal=new GroundMotion('paperWalk',0.3),angry=new GroundMotion('paperRun',0.9);
 assert.ok(Math.abs(angry.meanPixelsPerSecond/normal.meanPixelsPerSecond-3)<0.01);
 let a=0,n=0;for(let i=0;i<10000;i++){a+=angry.advance(10);n+=normal.advance(10);}
 assert.ok(a/n>2.9&&a/n<3.1);
});
test('new night clears coexist with existing saves and loadouts',()=>{
 const data=parseProgress({completedLevels:[1,3,10,11,14],loadouts:{1:['peashooter'],14:['puffshroom','gravebuster']}});
 assert.deepEqual(data.completedLevels,[1,3,10,11,14]);assert.deepEqual(data.loadouts['14'],['puffshroom','gravebuster']);assert.equal(data.highestCompleted,1);
});
test('all expanded wave plans can finish without an unfinished countdown',()=>{
 for(const l of LEVELS.filter(l=>l.mode!=='whack')){let completed=false;
  const director=new WaveDirector(l.waves,{spawn:()=>270,health:()=>0,liveCount:()=>0,start(){},complete(){completed=true;}},randomSource(123));
  for(let i=0;i<200000&&!completed;i++)director.update(10);
  assert.ok(completed,l.name+' cannot finish');
 }
});

test('final-wave completion waits for the grave rise, even if the lawn clears immediately',()=>{
 const rise=new FinalGraveRise();let complete=false,live=0,elapsed=0,riseAt=0;
 const wave=referenceWaves(11).at(-1)!;
 const director=new WaveDirector([{...wave,delayMs:10}],{spawn:()=>270,health:()=>0,liveCount:()=>live+(rise.pending?1:0),start:()=>rise.schedule(),complete:()=>{complete=true;}});
 for(elapsed=10;elapsed<=2010;elapsed+=10){
  if(rise.step()){riseAt=elapsed;live=4;}
  director.update(10);assert.equal(complete,false);
 }
 assert.equal(riseAt,2010);assert.equal(live,4);
 live=0;director.update(10);assert.equal(complete,true);
 rise.schedule();rise.cancel();for(let i=0;i<300;i++)assert.equal(rise.step(),false);
});
