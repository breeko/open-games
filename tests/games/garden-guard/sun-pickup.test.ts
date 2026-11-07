import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SunPickup } from '../../../src/games/garden-guard/sun-pickup';

test('automatic pickup waits for the full fall and a short rest',()=>{
  const sun=new SunPickup();
  assert.equal(sun.advance(6500,true),false,'falling suns must remain visible');
  assert.equal(sun.finish(),false,'falling suns cannot award resources');
  sun.land();
  assert.equal(sun.advance(99,true),false);
  assert.equal(sun.advance(1,true),true);
  assert.equal(sun.finish(),true);
});
test('manual taps and automatic pickup share one claim and one credit',()=>{
  for(const automaticFirst of [false,true]){
    const sun=new SunPickup();sun.land();let credits=0;
    assert.equal(automaticFirst?sun.advance(100,true):sun.collect(),true);
    assert.equal(sun.collect(),false);
    assert.equal(sun.advance(1000,true),false);
    assert.equal(sun.expire(),false,'expiry cannot cancel a claimed sun');
    for(let i=0;i<5;i++)if(sun.finish())credits+=25;
    assert.equal(credits,25);
  }
});
test('turning auto-collect on handles already-landed suns; off leaves them tappable',()=>{
  const sun=new SunPickup();sun.land();
  assert.equal(sun.advance(1000,false),false);
  assert.equal(sun.advance(0,true),true);
  const manual=new SunPickup();manual.land();manual.advance(1000,false);
  assert.equal(manual.collect(),true);
});
test('turning automation off during the rest prevents pickup until enabled again',()=>{
  const sun=new SunPickup();sun.land();
  assert.equal(sun.advance(60,true),false);
  assert.equal(sun.advance(500,false),false);
  assert.equal(sun.advance(0,true),true);
});
test('paused time cannot advance resting pickups and expired suns cannot credit',()=>{
  const sun=new SunPickup();sun.land();sun.advance(60,true);
  for(let i=0;i<100;i++)assert.equal(sun.advance(0,true),false);
  assert.equal(sun.expire(),true);
  assert.equal(sun.expire(),false);
  assert.equal(sun.collect(),false);
  assert.equal(sun.finish(),false);
});
