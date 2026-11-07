import {test} from 'node:test';
import assert from 'node:assert/strict';
import {referenceWaves} from '../../../src/games/garden-guard/reference/waves';
import {GroundMotion,sourceToWorldX} from '../../../src/games/garden-guard/reference/motion';
import {WaveDirector,type WavePort} from '../../../src/games/garden-guard/wave-director';
import {sampleSkySunTicks} from '../../../src/games/garden-guard/reference/rules';

test('flag positions match first Adventure including short levels and both late flags',()=>{
  assert.deepEqual(Array.from({length:10},(_,i)=>referenceWaves(i+1).flatMap((w,n)=>w.flag?[n+1]:[])),[[],[6],[8],[10],[8],[10],[10,20],[10],[10,20],[10,20]]);
});
test('manually calculated early wave budgets create the final rush',()=>{
  assert.deepEqual(referenceWaves(1).map(w=>w.sequence?.length),[1,1,1,2]);
  assert.deepEqual(referenceWaves(2).map(w=>w.sequence?.length),[1,1,1,2,2,5]);
  const final=referenceWaves(2)[5];assert.deepEqual(final.zombies,{basic:4,flag:1});
  for(let seed=0;seed<100;seed++){
    assert.ok(!referenceWaves(8,seed).some(w=>w.zombies.polevaulter));
    for(const level of [3,6,8]) {
      const type=level===3?'conehead':level===6?'polevaulter':'buckethead';const waves=referenceWaves(level,seed);
      assert.ok(waves[Math.floor(waves.length/2)].zombies[type]);assert.ok(waves.at(-1)!.zombies[type]);
    }
  }
});
function timeline(chunk:number,kill=false){
  let health=0;const spawns:number[]=[];let warnings=0;
  const port:WavePort={spawn(){health+=270;return 270;},health(){return kill?0:health;},liveCount(){return 1;},start(){health=0;},warning(){warnings++;},complete(){}};
  const director=new WaveDirector(referenceWaves(2),port,()=>0);
  for(let t=0;t<240000;t+=chunk)director.update(Math.min(chunk,240000-t));
  spawns.push(...director.events.filter(e=>e.kind==='spawn').map(e=>e.tick));
  return {spawns,warnings,director};
}
test('100Hz countdown is frame independent; no extra two-second timeout delay',()=>{
  const run=timeline(10);assert.deepEqual(run.spawns,[5000,7500,10000,12500,15000,20245]);assert.equal(run.warnings,1);
  assert.deepEqual(timeline(37).spawns,run.spawns);assert.deepEqual(timeline(100).spawns,run.spawns);
});
test('health acceleration waits 401 ticks then retains a 200-tick countdown',()=>{
  const run=timeline(10,true);assert.deepEqual(run.spawns.slice(0,2),[5000,5601]);
  const events=run.director.events;const warning=events.find(e=>e.kind==='huge-wave warning')!;
  const final=events.find(e=>e.kind==='spawn'&&e.wave===6)!;assert.equal(final.tick-warning.tick,750);
});
test('wave members spawn on one tick, not a per-enemy queue',()=>{
  const seen:number[]=[];let tick=0;
  const d=new WaveDirector([referenceWaves(2)[5]],{spawn(){seen.push(tick);return 270;},health(){return 270;},liveCount(){return 1;},start(){},complete(){}});
  for(tick=1;tick<=6000;tick++)d.update(10);
  assert.equal(seen.length,5);assert.equal(new Set(seen).size,1);
});
test('ground track motion is frame independent and scaled by lawn width',()=>{
  const distance=(chunk:number)=>{const m=new GroundMotion('walk',0.3);let x=0;for(let t=0;t<100000;t+=chunk)x+=m.advance(Math.min(chunk,100000-t));return x;};
  assert.ok(Math.abs(distance(10)-distance(37))<1e-7);
  const m=new GroundMotion('walk',0.3);assert.ok(Math.abs(distance(10)/100-m.meanPixelsPerSecond)<0.1);
  assert.equal(sourceToWorldX(40),64);assert.equal(sourceToWorldX(120),192);
  assert.equal(sampleSkySunTicks(0,()=>0),425);assert.equal(sampleSkySunTicks(100,()=>0.999),1224);
});
