import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,type Projectile} from '../../../src/games/kingdom-rush/simulation';
import {blastDamage} from '../../../src/games/kingdom-rush/content';
import {projectilePose} from '../../../src/games/kingdom-rush/collision';

test('Flash splash samples the directional ellipse boundary for diagonal falloff',()=>{
  assert.equal(blastDamage(15,30,{x:0,y:0},{x:30,y:20},60),20);
});

test('a charged artillery bomb retains its destination even after its target dies',()=>{
  const s=new Simulation();s.build(10,'engineer');const t=s.towers[0],route=s.level.paths[0];t.readyAt=0;t.nextAttack=0;
  const e=s.spawn('ogre');e.node=route.lanes[0].slice(route.start,route.end).reduce((best,p,i,points)=>(p.x-t.x)**2+(p.y-t.y)**2<(points[best].x-t.x)**2+(points[best].y-t.y)**2?i:best,0)+route.start;Object.assign(e,route.lanes[0][e.node]);s.step();assert.ok(t.fireAt>0);const aim={...t.target};e.hp=0;
  while(s.tick<t.fireAt)s.step();assert.equal(t.shots,1);assert.deepEqual(s.projectiles[0].to,aim);assert.equal(s.projectiles[0].target,0);
});

test('magic bolts accelerate, follow moving targets and share their rendered flight position',()=>{
  const s=new Simulation(),e=s.spawn('ogre');e.x=900;e.y=200;
  const p:Projectile={id:100,kind:'magic',from:{x:0,y:200},to:{x:900,y:180},position:{x:0,y:200},speed:1,start:1,impact:301,target:e.id,damage:10,radius:0};
  s.projectiles.push(p);
  s.step();const bolt=s.projectiles[0];assert.equal(bolt.speed,2);assert.ok(bolt.position!.y<200);assert.equal(bolt.to.x,e.x+3.84);assert.equal(projectilePose(bolt,s.tick).x,bolt.position!.x);
  e.x=850;e.y=210;s.step();assert.equal(bolt.speed,3);assert.equal(bolt.to.x, e.x+3.84);
  for(let i=0;i<15;i++)s.step();assert.equal(bolt.speed,10);
});

test('the exact failed Farmlands browser commands now complete under the source projectile corrections',async()=>{
  const trace=await Bun.file(new URL('../../../docs/games/kingdom-rush/playtests/2026-11-07-farmlands-before-projectile-fix.json',import.meta.url)).json();const s=new Simulation(trace.seed,2);
  for(const event of trace.events){while(s.tick<event.tick&&s.phase!=='won'&&s.phase!=='lost')s.step();if(s.phase==='won'||s.phase==='lost')break;
    if(event.type==='build')assert.ok(s.build(event.holder,event.kind));else if(event.type==='upgrade')assert.ok(s.upgrade(event.holder));else if(event.type==='cast')assert.ok(s.cast(event.kind,{x:event.x,y:event.y}));else if(event.type==='wave'&&(event.wave===1||event.bonus>0))assert.ok(s.callWave());
  }
  while(s.phase==='running'&&s.tick<30000)s.step();assert.deepEqual([s.phase,s.lives,s.gold,s.kills,s.tick],['won',5,297,139,8921]);
});


test('an accelerating bolt resumes from its saved position and speed without changing the outcome',()=>{
  const s=new Simulation();s.build(10,'mage');const t=s.towers[0],r=s.level.paths[0];t.readyAt=0;t.nextAttack=0;
  const e=s.spawn('ogre');e.node=r.lanes[0].slice(r.start,r.end).reduce((best,p,i,points)=>(p.x-t.x)**2+(p.y-t.y)**2<(points[best].x-t.x)**2+(points[best].y-t.y)**2?i:best,0)+r.start;Object.assign(e,r.lanes[0][e.node]);
  for(let i=0;i<12;i++)s.step();assert.ok(s.projectiles.some(p=>p.position&&p.speed));const restored=Simulation.restore(s.snapshot(),{paused:false});
  for(let i=0;i<120;i++){s.step();restored.step();}assert.deepEqual(restored.snapshot(),s.snapshot());
});
