import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SnorkelRoutine} from '../../../src/games/garden-guard/pool-combat';
test('snorkel enters, submerges, rises for 500ms before eating, then dives',()=>{
 const s=new SnorkelRoutine();s.advance(10,true,false,false,false);assert.equal(s.phase,'enter');assert.equal(s.offGround,true);
 s.advance(1180,false,false,false,false);assert.equal(s.phase,'enter');s.advance(10,false,false,false,false);assert.equal(s.phase,'swim');assert.equal(s.exposed,false);
 s.advance(10,false,false,true,false);assert.equal(s.phase,'rise');assert.equal(s.exposed,true);assert.equal(s.canEat,false);
 s.advance(490,false,false,true,true);assert.equal(s.phase,'rise');s.advance(10,false,false,true,false);assert.equal(s.phase,'eat');assert.equal(s.canEat,true);
 s.advance(10,false,false,false,false);assert.equal(s.phase,'dive');assert.equal(s.exposed,false);
 s.advance(500,false,false,false,false);assert.equal(s.phase,'swim');s.advance(10,false,true,false,false);assert.equal(s.phase,'exit');
});
test('snorkel transitions retain fractional ticks and interrupted surfacing across reloads',()=>{
 const s=new SnorkelRoutine();s.restore({phase:'rise',remainingMs:300,remainder:3});
 s.advance(27,false,false,false,false);assert.deepEqual(s.save(),{phase:'dive',remainingMs:180,remainder:0});
 const restored=new SnorkelRoutine();restored.restore(s.save());
 for(let i=0;i<100;i++){s.advance(16.67,false,false,false,false);restored.advance(16.67,false,false,false,false);assert.deepEqual(restored.save(),s.save());}
});
