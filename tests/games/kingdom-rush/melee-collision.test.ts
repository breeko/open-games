import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../../../src/games/kingdom-rush/simulation';
import {arrowHits,barracksFormation,enemyBounds,projectilePose} from '../../../src/games/kingdom-rush/collision';

function setup(){const s=new Simulation();s.build(12,'barrack');for(let i=0;i<100;i++)s.step();return s;}
function ogre(s:Simulation,x=329,y=474){const e=s.spawn('ogre');e.x=x;e.y=y;return e;}

test('barracks use the original triangular ellipse and a shared rally-centered acquisition area',()=>{
  const home={x:329,y:474};const p=barracksFormation(home,0);
  assert.ok(Math.abs(p.x-329)<1e-8);assert.ok(Math.abs(p.y-504.72)<1e-8);
  assert.ok(barracksFormation(home,1).x<home.x);assert.ok(barracksFormation(home,2).x>home.x);
  const s=setup(),e=ogre(s,385,486.8);s.step();assert.ok(e.attackTarget,'within the shared 64px horizontal radius');
});

test('one primary owns blocking; supporters take the two offset positions on the same facing side',()=>{
  const s=setup(),e=ogre(s);e.facing=-1;s.step();
  const soldiers=s.soldiers.filter(o=>o.target===e.id);
  assert.deepEqual(soldiers.map(o=>o.meleeSlot).sort(),[0,1,2]);
  assert.ok(soldiers.every(o=>o.destination.x<e.x));
  soldiers.map(o=>o.destination.y-e.y).sort((a,b)=>a-b).forEach((y,i)=>assert.ok(Math.abs(y-[-7.68,0,7.68][i])<1e-8));
  const primary=soldiers.find(o=>o.id===e.attackTarget)!;
  while(!primary.arrived)s.step();
  const support=soldiers.filter(o=>o!==primary);const health=support.map(o=>o.hp);
  for(let i=0;i<28;i++)s.step();assert.ok(primary.hp<50);assert.deepEqual(support.map(o=>o.hp),health);
});

test('idle soldiers choose lower path nodes and helpers switch to an unblocked enemy',()=>{
  const s=setup(),front=ogre(s),rear=ogre(s,335,477);front.node=200;rear.node=190;
  s.step();assert.equal(s.soldiers[0].target,rear.id);
  assert.ok(front.attackTarget&&rear.attackTarget);
  const helper=s.soldiers.find(o=>o.meleeSlot!==2)!;
  const next=ogre(s,332,475);s.step();assert.equal(helper.target,next.id);assert.equal(next.attackTarget,helper.id);
});

test('rally releases reservations and prevents reacquisition until redeployment finishes',()=>{
  const s=setup(),e=ogre(s);s.step();assert.ok(e.attackTarget);
  assert.equal(s.setRally(12,{x:355,y:480}),true);assert.equal(e.attackTarget,0);
  const x=e.x;s.step();assert.notEqual(e.x,x);assert.ok(s.soldiers.every(o=>o.target===0));
  assert.equal(s.towers[0].rally.x,355,'valid points are not snapped onto the center lane');
});

test('death, expiry and sale release the primary without attacking a replacement through an old wind-up',()=>{
  const s=setup(),e=ogre(s);s.step();const primary=s.soldiers.find(o=>o.id===e.attackTarget)!;
  while(!primary.arrived)s.step();s.step();assert.ok(e.hitAt>0);
  primary.expires=s.tick+1;s.step();assert.notEqual(e.attackTarget,primary.id);assert.equal(primary.hp,0);
  s.sell(12);assert.equal(e.attackTarget,0);assert.ok(s.soldiers.every(o=>o.target===0));
});

test('collision bounds distinguish a wulf from an ogre and mirror the asymmetric symbol',()=>{
  const s=new Simulation(),wolf=s.spawn('wolf'),ogre=s.spawn('ogre');wolf.x=ogre.x=200;wolf.y=ogre.y=200;
  const w=enemyBounds(wolf,0),o=enemyBounds(ogre,0);assert.ok(o.top<w.top&&o.right-o.left>w.right-w.left);
  ogre.facing=1;const right=enemyBounds(ogre,0);ogre.facing=-1;const left=enemyBounds(ogre,0);
  assert.equal(right.right-ogre.x,ogre.x-left.left);
  const p={from:{x:200,y:145},to:{x:200,y:145},start:0,impact:17,kind:'physical'};
  assert.equal(arrowHits(ogre,p,17),true);assert.equal(arrowHits(wolf,p,17),false);
});

test('arrow overlap is checked during the final approach and uses the same ballistic pose as drawing',()=>{
  const s=new Simulation(),e=s.spawn('ogre');e.x=200;e.y=200;
  const p={id:900,kind:'physical' as const,from:{x:0,y:180},to:{x:240,y:180},start:0,impact:17,target:e.id,damage:10,radius:0};
  const midpoint=projectilePose(p,8);assert.ok(midpoint.y<180);assert.equal(projectilePose(p,17).x,240);
  s.projectiles.push(p);while(s.tick<15){e.x=200;e.y=200;s.step();}
  assert.equal(e.hp,790,'overlap two frames before destination applies the hit');assert.equal(s.projectiles.length,0);
});

test('melee ownership and support destinations survive save/restore during approach',()=>{
  const s=setup(),e=ogre(s);s.step();const restored=Simulation.restore(s.snapshot(),{paused:false});
  for(let i=0;i<120;i++){s.step();restored.step();}assert.deepEqual(restored.snapshot(),s.snapshot());
});

// Commands exported through the UI after a complete browser playthrough.
test('the recorded browser defense reproduces its complete eleven-wave result',async()=>{
  const trace=await Bun.file(new URL('../../../docs/games/kingdom-rush/playtests/2026-11-07-melee-browser-win.json',import.meta.url)).json();
  const s=new Simulation(trace.seed);
  for(const event of trace.events){
    while(s.tick<event.tick){const before=s.tick;s.step();assert.ok(s.tick>before,'replay reaches every recorded command');}
    if(event.type==='build')assert.ok(s.build(event.holder,event.kind));
    else if(event.type==='upgrade')assert.ok(s.upgrade(event.holder));
    else if(event.type==='cast')assert.ok(s.cast(event.kind,{x:event.x,y:event.y}));
    else if(event.type==='wave'&&(event.wave===1||event.bonus>0))assert.ok(s.callWave());
  }
  assert.deepEqual({tick:s.tick,phase:s.phase,lives:s.lives,gold:s.gold,kills:s.kills,wave:s.wave},
    {tick:trace.tick,phase:trace.phase,lives:trace.lives,gold:trace.gold,kills:trace.kills,wave:trace.wave});
});
