import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WhackDirector,whackBonk,whackLoot} from '../../../src/games/garden-guard/whack-director';
import {LEVELS,defaultSeedsForLevel} from '../../../src/games/garden-guard/levels';
import {initialGraves} from '../../../src/games/garden-guard/night';
import {allowedZombies,randomSource} from '../../../src/games/garden-guard/reference/rules';
import {ZOMBIE_DEFS,PLANT_DEFS} from '../../../src/games/garden-guard/constants';
import {GroundMotion} from '../../../src/games/garden-guard/reference/motion';
function run(chunk:number){
 let tick=0,graves=9,live=0,done=0;const starts:number[]=[],batches:{tick:number;count:number;wave:number;types:string[]}[]=[];
 const director=new WhackDirector({spawn(types,wave){const count=Math.min(types.length,graves);batches.push({tick,count,wave,types:types.slice(0,count)});live+=count;},liveCount:()=>live,graveCount:()=>graves,addGraves:n=>{graves+=n;},start:()=>starts.push(tick),complete:()=>done++},randomSource(12345));
 for(tick=0;tick<150000;tick+=chunk)director.update(Math.min(chunk,150000-tick));
 return {director,starts,batches,graves,get done(){return done;},clear(){live=0;director.update(10);}};
}
test('Adventure whack uses eight timed waves and a delayed final grave rush',()=>{
 const r=run(10);
 assert.deepEqual(r.director.events.filter(e=>e.kind==='wave start').map(e=>e.tick),[200,2200,4200,6200,8200,10200,12200,14200]);
 assert.equal(r.director.events.find(e=>e.kind==='spawn')!.tick,200);
 const final=r.director.events.filter(e=>e.kind==='spawn').at(-1)!;
 assert.equal(final.tick,14499);assert.equal(final.wave,8);assert.equal(final.count,16);
 assert.equal(r.graves,16);assert.equal(r.done,0);r.clear();assert.equal(r.done,1);r.clear();assert.equal(r.done,1);
 assert.ok(r.batches.at(-1)!.types.every(t=>t==='conehead'||t==='buckethead'));
});
test('whack clock and random schedule are independent of render frame duration',()=>{
 assert.deepEqual(run(37).director.events,run(10).director.events);
 assert.deepEqual(run(100).director.events,run(10).director.events);
});
test('whack has a quiet window, grave replenishment, and cancellation',()=>{
 const r=run(10),spawns=r.director.events.filter(e=>e.kind==='spawn');
 for(const event of spawns.filter(e=>e.wave<8))assert.ok((event.tick-200)%2000<=1700,'spawn entered the three-second quiet window');
 const before=r.director.events.length;r.director.stop();r.director.update(100000);assert.equal(r.director.events.length,before);
});
test('a bonk strips helmets without overflow, retaining two-hit cones and three-hit buckets',()=>{
 for(const [armor,taps] of [[0,1],[370,2],[1100,3]]){
  let state={hp:270,armor};for(let i=0;i<taps-1;i++){state=whackBonk(state.hp,state.armor);assert.equal(state.hp,270);}
  assert.equal(whackBonk(state.hp,state.armor).hp,0);
 }
});
test('whack sun drops match resource-dependent loot bands and original enemy factors',()=>{
 assert.equal(whackLoot(0,'basic',2500),true);assert.equal(whackLoot(0,'basic',5000),true);assert.equal(whackLoot(0,'basic',5001),false);
 assert.equal(whackLoot(501,'basic',2800),true);assert.equal(whackLoot(501,'basic',2801),false);
 assert.equal(whackLoot(0,'buckethead',10000),true);assert.equal(whackLoot(0,'buckethead',20000),true);
});
test('2-5 has the original emergency seeds, graves, zero sun and Hypno reward',()=>{
 assert.deepEqual(allowedZombies(15),['basic','conehead','buckethead']);
 const level=LEVELS[14];assert.equal(level.mode,'whack');assert.equal(level.waves.length,8);assert.equal(level.startingSun,0);
 assert.deepEqual(level.availablePlants,['potatomine','gravebuster','cherrybomb']);assert.equal(level.reward,'hypnoshroom');
 const graves=initialGraves(15);assert.equal(graves.length,9);assert.equal(new Set(graves.map(g=>`${g.col},${g.row}`)).size,9);assert.ok(graves.every(g=>g.col>=3&&g.col<=8));
});
test('2-6 introduces source football durability, eligibility and counterplant',()=>{
 assert.deepEqual(allowedZombies(16),['basic','conehead','football']);
 const l=LEVELS[15];assert.equal(l.waves.length,10);assert.equal(l.startingSun,50);assert.equal(l.reward,'scaredyshroom');
 assert.ok(l.waves[5].zombies.football);assert.ok(l.waves.at(-1)!.zombies.football);assert.ok(l.waves.slice(0,4).every(w=>!w.zombies.football));
 assert.deepEqual([ZOMBIE_DEFS.football.hp,ZOMBIE_DEFS.football.armorHp],[270,1400]);
 assert.deepEqual([PLANT_DEFS.hypnoshroom.cost,PLANT_DEFS.hypnoshroom.cooldownMs],[75,30000]);
 assert.ok(defaultSeedsForLevel(16).includes('hypnoshroom'));assert.equal(initialGraves(16).length,7);
 const motion=new GroundMotion('football',0.67);let distance=0;for(let i=0;i<10000;i++)distance+=motion.advance(10);
 assert.ok(Math.abs(distance/100-motion.meanPixelsPerSecond)<0.2);
});
