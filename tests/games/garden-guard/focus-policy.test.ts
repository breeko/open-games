import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BackgroundClock,readAutoPause,shouldOpenMenuOnFocusLoss} from '../../../src/games/garden-guard/focus-policy';
test('focus loss opens the menu only for a running battle with auto-pause on',()=>{
 for(const playing of [true,false])for(const enabled of [true,false])for(const menuOpen of [true,false])for(const paused of [true,false])assert.equal(shouldOpenMenuOnFocusLoss({playing,enabled,menuOpen,paused}),playing&&enabled&&!menuOpen&&!paused);
 assert.equal(readAutoPause(undefined),true);assert.equal(readAutoPause('false'),true);assert.equal(readAutoPause(false),false);
});
test('background progression uses small steps, excludes menu time, and bounds suspended-tab catch-up',()=>{
 const c=new BackgroundClock(),steps:number[]=[];const step=(dt:number)=>{steps.push(dt);return true;};
 c.advance(100,true,step);c.advance(200,true,step);assert.equal(steps.reduce((s,n)=>s+n,0),100);assert.ok(steps.every(n=>n<=20));
 c.advance(10000,false,step);c.advance(20000,true,step);assert.equal(steps.length,5);
 c.advance(21000,true,step);assert.equal(steps.reduce((s,n)=>s+n,0),1100);
 c.advance(999999,true,step);assert.equal(steps.reduce((s,n)=>s+n,0),2100);
 let calls=0;c.advance(1000099,true,()=>{calls++;return false;});assert.equal(calls,1);
});
