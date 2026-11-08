import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,defaultSeedsForLevel,rewardForLevel} from '../../../src/games/garden-guard/levels';
import {terrainFor,poolLaneAllowed,canPlantTerrain,finalPoolCells} from '../../../src/games/garden-guard/terrain';
import {allowedZombies,randomSource} from '../../../src/games/garden-guard/reference/rules';
import {PLANT_DEFS} from '../../../src/games/garden-guard/constants';
import {gardenSessionSchema} from '../../../src/games/garden-guard/state/session-data';
import {freshSession,busyPoolSession} from './fixtures/session';
import {parseProgress,recordClear} from '../../../src/games/garden-guard/progress-data';

test('first pool boards retain original wave counts, sun economy, flags and enemy sets',()=>{
 assert.deepEqual(LEVELS.slice(20,22).map(l=>[l.name,l.environment,l.waves.length,l.startingSun,l.skySunIntervalMs,l.waves[0].delayMs]),[['3-1','pool',10,50,6500,18000],['3-2','pool',20,50,6500,18000]]);
 assert.deepEqual(allowedZombies(21),['basic','conehead']);
 assert.deepEqual(allowedZombies(22),['basic','conehead','buckethead','newspaper','football']);
 assert.deepEqual(LEVELS[20].waves.flatMap((w,i)=>w.flag?[i+1]:[]),[10]);
 assert.deepEqual(LEVELS[21].waves.flatMap((w,i)=>w.flag?[i+1]:[]),[10,20]);
 assert.equal(rewardForLevel(20),'lilypad');assert.equal(rewardForLevel(21),'squash');assert.equal(rewardForLevel(22),'threepeater');
 assert.deepEqual(terrainFor('pool'),{rows:6,tileHeight:136});assert.deepEqual(terrainFor('day'),{rows:5,tileHeight:160});
 for(const id of [21,22]){assert.ok(defaultSeedsForLevel(id).includes('lilypad'));assert.ok(defaultSeedsForLevel(id).includes('sunflower'));assert.ok(defaultSeedsForLevel(id).includes('peashooter'));}
 assert.equal(defaultSeedsForLevel(21).includes('squash'),false);assert.equal(defaultSeedsForLevel(22).includes('squash'),true);
 assert.deepEqual([PLANT_DEFS.lilypad.cost,PLANT_DEFS.lilypad.cooldownMs,PLANT_DEFS.squash.cost,PLANT_DEFS.squash.cooldownMs],[25,7500,50,30000]);
});
test('pool restricts first five waves and non-swimmers while preserving four land lanes',()=>{
 for(let wave=0;wave<5;wave++)for(const row of [2,3])assert.equal(poolLaneAllowed('basic',row,wave),false);
 for(const type of ['basic','flag','conehead','buckethead'] as const)for(const row of [2,3])assert.equal(poolLaneAllowed(type,row,5),true);
 for(const type of ['football','newspaper','polevaulter','screendoor','dancer'] as const)for(const row of [2,3])assert.equal(poolLaneAllowed(type,row,9),false);
 for(const row of [0,1,4,5])assert.equal(poolLaneAllowed('football',row,0),true);
 for(let seed=0;seed<100;seed++){
  const cells=finalPoolCells(randomSource(seed));assert.equal(cells.length,2);assert.equal(new Set(cells.map(c=>`${c.col},${c.row}`)).size,2);
  assert.ok(cells.every(c=>c.col>=5&&c.col<=8&&(c.row===2||c.row===3)));
 }
});
test('Lily Pads layer under one defender; land, bare water and mines retain original restrictions',()=>{
 assert.equal(canPlantTerrain('lilypad',false,false,false),false);
 assert.equal(canPlantTerrain('lilypad',true,false,false),true);
 assert.equal(canPlantTerrain('lilypad',true,true,false),false);
 assert.equal(canPlantTerrain('peashooter',true,false,false),false);
 assert.equal(canPlantTerrain('peashooter',true,true,false),true);
 assert.equal(canPlantTerrain('peashooter',true,true,true),false);
 assert.equal(canPlantTerrain('potatomine',true,true,false),false);
 assert.equal(canPlantTerrain('potatomine',false,false,false),true);
});
test('r1 sessions round-trip stacked pool layers, swimming and mid-jump Squash without losing earlier saves',()=>{
 const pool=busyPoolSession();assert.deepEqual(gardenSessionSchema.parse(JSON.parse(JSON.stringify(pool))),pool);
 const missing=structuredClone(pool);missing.plants=missing.plants.filter(p=>p.type!=='lilypad');assert.equal(gardenSessionSchema.safeParse(missing).success,false);
 const duplicate=structuredClone(pool);duplicate.plants.push({...duplicate.plants.find(p=>p.type==='lilypad')!});assert.equal(gardenSessionSchema.safeParse(duplicate).success,false);
 const land=structuredClone(pool);land.plants.push({type:'lilypad',col:0,row:0,hp:300,behavior:{kind:'idle'}});assert.equal(gardenSessionSchema.safeParse(land).success,false);
 const invalid=structuredClone(pool);invalid.plants[8].behavior={kind:'squash',phase:'fall',remainingMs:800,targetX:500};assert.equal(gardenSessionSchema.safeParse(invalid).success,false);
 for(let id=1;id<=20;id++)assert.equal(gardenSessionSchema.parse(JSON.parse(JSON.stringify(freshSession(id)))).levelId,id);
 const old=parseProgress({highestCompleted:20,games:33,bestWave:20});assert.equal(old.highestCompleted,20);recordClear(old,22,20);assert.equal(old.highestCompleted,20);recordClear(old,21,10);assert.equal(old.highestCompleted,22);assert.equal(old.games,35);
});


test('3-3 and 3-4 use original 20/30 waves, snorkel eligibility and three final ambushers',()=>{
 assert.deepEqual(LEVELS.slice(22).map(l=>[l.name,l.waves.length,l.startingSun]),[['3-3',20,50],['3-4',30,50]]);
 assert.deepEqual(allowedZombies(23),['basic','conehead','snorkel']);
 assert.deepEqual(allowedZombies(24),['basic','conehead','polevaulter','buckethead','newspaper','snorkel']);
 for(const id of [23,24]){
  const level=LEVELS[id-1];assert.deepEqual(level.waves.flatMap((w,i)=>w.flag?[i+1]:[]),id===23?[10,20]:[10,20,30]);
  assert.ok(level.waves.slice(0,9).every(w=>!w.zombies.snorkel));
  assert.ok(defaultSeedsForLevel(id).includes('threepeater'));
  assert.equal(finalPoolCells(randomSource(12345),id).length,3);
 }
 assert.equal(rewardForLevel(23),'tanglekelp');assert.equal(rewardForLevel(24),'jalapeno');
 assert.equal(defaultSeedsForLevel(23).includes('tanglekelp'),false);assert.equal(defaultSeedsForLevel(24).includes('tanglekelp'),true);
 assert.deepEqual([PLANT_DEFS.threepeater.cost,PLANT_DEFS.threepeater.cooldownMs,PLANT_DEFS.tanglekelp.cost,PLANT_DEFS.tanglekelp.cooldownMs],[325,7500,25,30000]);
 for(const lane of [0,1,4,5])assert.equal(poolLaneAllowed('snorkel',lane,20),false);
 assert.equal(poolLaneAllowed('snorkel',2,9),true);
});
test('Tangle Kelp needs empty bare water, and saved target links validate instead of silently retargeting',()=>{
 assert.equal(canPlantTerrain('tanglekelp',true,false,false),true);
 for(const [water,pad,occupied] of [[false,false,false],[true,true,false],[true,false,true]])assert.equal(canPlantTerrain('tanglekelp',water,pad,occupied),false);
 const data=freshSession(24);data.plants=[{type:'tanglekelp',col:4,row:2,hp:300,behavior:{kind:'kelp',remainingMs:600,targetIndex:0}}];
 data.zombies=[{...busyPoolSession().zombies[0],row:2}];
 assert.equal(gardenSessionSchema.safeParse(data).success,true);
 const bad=structuredClone(data);if(bad.plants[0].behavior.kind==='kelp')bad.plants[0].behavior.targetIndex=2;assert.equal(gardenSessionSchema.safeParse(bad).success,false);
 data.plants.push({...data.plants[0],col:5});assert.equal(gardenSessionSchema.safeParse(data).success,false);
});
