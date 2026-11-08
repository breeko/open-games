import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SimulationClock,readGameSpeed} from '../../../src/games/garden-guard/simulation-clock';
test('2× delivers the same small simulation steps as twice as many 1× frames',()=>{
 const run=(speed:1|2,frames:number)=>{const c=new SimulationClock();c.reset(100);const out:number[][]=[];for(let i=0;i<frames;i++)c.advance(20,speed,(t,dt)=>{out.push([t,dt]);return true;});return out;};
 assert.deepEqual(run(2,50),run(1,100));
});
test('speed switches do not reset time; a paused or stopped first step cancels the second',()=>{
 const c=new SimulationClock(),out:number[]=[];c.reset(0);
 c.advance(10,1,t=>{out.push(t);return true;});c.advance(10,2,t=>{out.push(t);return false;});c.advance(10,1,t=>{out.push(t);return true;});assert.deepEqual(out,[10,20,30]);
 for(const d of [0,-1,NaN,Infinity])c.advance(d,2,()=>{throw new Error('Invalid frame advanced');});
 c.advance(999,1,(t,dt)=>{assert.equal(t,130);assert.equal(dt,100);return true;});
});
test('old and malformed preferences default safely to 1×',()=>{
 for(const value of [undefined,null,0,3,-2,'2',{},true])assert.equal(readGameSpeed(value),1);
 assert.equal(readGameSpeed(1),1);assert.equal(readGameSpeed(2),2);
});
