import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,defaultSeedsForLevel,plantsForLevel} from '../../../src/games/garden-guard/levels';
import {allowedZombies,randomSource,ZOMBIE_RULES} from '../../../src/games/garden-guard/reference/rules';
import {referenceWaves} from '../../../src/games/garden-guard/reference/waves';
import {initialGraves} from '../../../src/games/garden-guard/night';
import {NIGHT_CONVEYOR,conveyorInterval,nightConveyorWeights,pickNightConveyor} from '../../../src/games/garden-guard/night-conveyor';
import {inDoomBlast} from '../../../src/games/garden-guard/night-combat';
import {parseProgress,recordClear} from '../../../src/games/garden-guard/progress-data';

test('night finale transcribes 20-wave enemy tables, economy, flags, and denser grave layout',()=>{
  assert.deepEqual(LEVELS.slice(18,20).map(l=>[l.name,l.mode,l.waves.length,l.startingSun,l.skySunIntervalMs]),[['2-9','standard',20,50,0],['2-10','conveyor',20,50,0]]);
  assert.deepEqual(allowedZombies(19),['basic','conehead','screendoor','dancer']);
  assert.deepEqual(allowedZombies(20),['basic','conehead','screendoor','football','dancer']);
  for(const id of [19,20]){
    assert.deepEqual(referenceWaves(id).flatMap((w,i)=>w.flag?[i+1]:[]),[10,20]);
    const expected=id===19?{4:1,5:2,6:2,7:3,8:3}:{3:1,4:2,5:2,6:2,7:3,8:3};
    for(let seed=0;seed<100;seed++){
      const graves=initialGraves(id,seed);
      assert.equal(new Set(graves.map(g=>`${g.col},${g.row}`)).size,graves.length);
      assert.deepEqual(graves.reduce<Record<number,number>>((a,g)=>{a[g.col]=(a[g.col]??0)+1;return a;},{}),expected);
    }
  }
  assert.ok(defaultSeedsForLevel(19).includes('doomshroom'));assert.ok(defaultSeedsForLevel(19).includes('sunshroom'));
  assert.equal(plantsForLevel(18).includes('doomshroom'),false);
  assert.deepEqual(plantsForLevel(20),NIGHT_CONVEYOR.map(s=>s.type));
});
test('night finale uses miniboss wave multiplier after flag entries and 100-tick opening',()=>{
  const waves=referenceWaves(20);
  assert.equal(waves[0].delayMs,1000);assert.equal(waves[0].sequence?.length,3);
  for(let index=0;index<20;index++){
    const wave=waves[index],base=Math.floor(index/3)+1;
    const forced=wave.flag?Math.min(base,8)+1:0;
    const budget=wave.flag?forced+(Math.floor(base*2.5)-forced)*3:base*3;
    const spent=wave.sequence!.reduce((sum,type)=>sum+ZOMBIE_RULES[type].cost,0);
    assert.equal(spent+wave.pointsRemaining!,budget);
    assert.ok(wave.sequence!.every(type=>type==='flag'||allowedZombies(20).includes(type)));
  }
  assert.ok(waves[19].sequence!.length>waves[0].sequence!.length);
});
test('mushroom conveyor respects source weights, duplicate pressure and exhausted graves',()=>{
  const empty=()=>0;
  assert.deepEqual(nightConveyorWeights(empty,empty,13,undefined),[20,15,15,10,15,15,10]);
  assert.deepEqual(nightConveyorWeights(empty,empty,0,'doomshroom'),[0,15,7,10,15,15,10]);
  assert.equal(nightConveyorWeights(t=>t==='gravebuster'?2:0,t=>t==='gravebuster'?1:0,3,undefined)[0],0);
  assert.equal(nightConveyorWeights(t=>t==='iceshroom'?3:4,empty,13,undefined)[1],5);
  assert.equal(nightConveyorWeights(()=>4,empty,13,undefined)[2],1);
  assert.deepEqual([0,4,5,6,7,8,9].map(conveyorInterval),[4000,4000,4250,4250,5000,5000,10000]);
  const weights=nightConveyorWeights(empty,empty,0,undefined),random=randomSource(12345),counts=Array(7).fill(0);
  for(let i=0;i<10000;i++)counts[pickNightConveyor(weights,random)]++;
  assert.equal(counts[0],0);assert.ok(counts.slice(1).every(n=>n>1000));
});
test('Doom blast includes edge-overlapping bodies, excludes far corners and respects row cap',()=>{
  assert.equal(inDoomBlast(640,528,2,{row:2,left:1030,top:500,right:1100,bottom:650}),true);
  assert.equal(inDoomBlast(640,528,2,{row:2,left:1041,top:500,right:1120,bottom:650}),false);
  assert.equal(inDoomBlast(640,528,2,{row:4,left:970,top:850,right:1050,bottom:960}),false);
  assert.equal(inDoomBlast(640,528,0,{row:4,left:640,top:528,right:700,bottom:600}),false);
});
test('expanding beyond 2-8 preserves old progress and records new clears separately',()=>{
  const old=parseProgress({highestCompleted:18,games:32,bestWave:20,loadouts:{18:['iceshroom','puffshroom']}});
  assert.equal(old.highestCompleted,18);assert.equal(old.games,32);assert.deepEqual(old.loadouts['18'],['iceshroom','puffshroom']);
  recordClear(old,20,20);assert.equal(old.highestCompleted,18);
  recordClear(old,19,20);assert.equal(old.highestCompleted,20);
});
