import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GamePerformance,PerformanceHistory,type FrameCost} from '../../../src/games/garden-guard/diagnostics/performance';
const frame=(interval:number):FrameCost=>({interval,update:8,render:3,sections:{plants:1,zombies:2,projectiles:1,'waves/UI':1,'other gameplay':1}});
test('performance history bounds memory, reports tail latency, and retains earlier hitches',()=>{
 const h=new PerformanceHistory(3);h.add(frame(120));h.add(frame(16));h.add(frame(17));h.add(frame(18));
 const r=h.snapshot();assert.equal(r.frames,3);assert.equal(r.interval.max,18);assert.equal(r.interval.p95,18);assert.equal(r.worst[0].interval,120);assert.equal(r.engineOther.mean,2);
 for(let i=0;i<50;i++)h.save(i);assert.equal(h.snapshot().recentSaves.length,30);assert.equal(h.snapshot().saves.max,49);
 h.clear();assert.equal(h.snapshot().frames,0);assert.equal(h.snapshot().worst.length,0);assert.equal(h.snapshot().saves.max,0);
});
test('real frame interval is paired with the preceding work, while pause time is excluded',()=>{
 let now=0;const p=new GamePerformance(()=>now);
 p.begin(true);now=1;const section=p.mark();now=3;p.section('zombies',section);now=4;p.endUpdate();now=5;p.beginRender();now=8;p.endRender();
 now=40;p.begin(true);const r=p.history.snapshot();assert.equal(r.frames,1);assert.equal(r.worst[0].interval,40);assert.equal(r.worst[0].update,4);assert.equal(r.worst[0].render,3);assert.equal(r.worst[0].sections.zombies,2);
 p.resetClock();now=10000;p.begin(true);assert.equal(p.history.snapshot().frames,1);
 now=10005;p.endUpdate();p.beginRender();now=10008;p.endRender();now=10016;p.begin(true);assert.equal(p.history.snapshot().frames,2);assert.equal(p.history.snapshot().interval.max,40);
 p.begin(false);now=20000;p.begin(true);assert.equal(p.history.snapshot().frames,2);
});
