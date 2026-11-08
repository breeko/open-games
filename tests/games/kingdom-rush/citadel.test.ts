import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,type Enemy} from '../../../src/games/kingdom-rush/simulation';
import {ENEMIES,getLevel,maxTowerTier,towerWindup} from '../../../src/games/kingdom-rush/content';

function activate(s:Simulation,e:Enemy,node=20){e.node=node;Object.assign(e,s.level.paths[e.route].lanes[e.lane][node]);return e;}
function steps(s:Simulation,n:number){for(let i=0;i<n;i++)s.step();}

test('Citadel retains five original routes, its boss finale and base advanced towers',()=>{
  const l=getLevel(6);assert.deepEqual(l.paths.map(p=>p.lanes[0].length),[157,157,168,169,283]);
  assert.equal(l.groups.length,17);assert.equal(l.cash,700);
  const s=new Simulation(1,6);assert.ok(s.preparePractice(17));s.callWave();steps(s,151);
  const boss=s.enemies.find(e=>e.kind==='juggernaut')!;assert.equal(boss.route,4);assert.equal(boss.maxHp,10000);
  assert.equal(maxTowerTier(l,'mage',0),4);assert.equal(maxTowerTier(l,'archer',0),4);assert.equal(towerWindup('mage',4),18);
});

test('practice supplies scheduled prior rewards, survives restore and cannot reset an ongoing battle',()=>{
  const s=new Simulation(1,6);assert.equal(s.preparePractice(18),false);assert.ok(s.preparePractice(17));
  assert.equal(s.gold,5958);assert.equal(s.wave,16);assert.equal(s.practice,true);assert.equal(s.preparePractice(1),false);
  s.callWave();assert.equal(s.wave,17);const restored=Simulation.restore(s.snapshot(),{paused:false});
  steps(s,300);steps(restored,300);assert.deepEqual(restored.snapshot(),s.snapshot());assert.equal(JSON.parse(s.export()).practice,true);
});

test('shaman cooldown freezes during entrance and melee charge, then counts eligible frames',()=>{
  const s=new Simulation(1,6),e=s.spawn('shaman');steps(s,20);assert.equal(e.healCounter,0);
  activate(s,e);e.hitAt=s.tick+20;s.step();assert.equal(e.healCounter,0);
  e.hitAt=0;s.step();assert.equal(e.healCounter,1);e.hp=50;e.healCounter=240;s.step();
  const restored=Simulation.restore(s.snapshot(),{paused:false});steps(s,28);steps(restored,28);
  assert.deepEqual(restored.snapshot(),s.snapshot());assert.equal(e.hp,100);assert.equal(e.healCounter,0);
});

test('gargoyles bypass soldier reservations and direct artillery selection',()=>{
  const s=new Simulation(1,6);s.build(5,'barrack');s.build(4,'engineer');steps(s,100);
  const e=activate(s,s.spawn('gargoyle'));Object.assign(e,s.towers[0].rally);
  steps(s,30);assert.equal(e.attackTarget,0);assert.ok(s.soldiers.every(unit=>unit.target===0));assert.equal(s.towers[1].shots,0);
  s.projectiles.push({id:999,kind:'explosion',from:{x:e.x,y:e.y},to:{x:e.x,y:e.y},start:s.tick,impact:s.tick+1,target:0,damage:10,radius:100});
  s.step();assert.equal(e.hp,80,'airborne enemies still take nearby artillery splash');
});

test('Arcane beam applies ten integer pulses and preserves partial damage on reload',()=>{
  const s=new Simulation(1,6),e=activate(s,s.spawn('juggernaut',4));
  const projectileId=s.spawn('goblin').id;s.enemies.pop();
  s.projectiles.push({id:projectileId,kind:'magic',from:{x:0,y:0},to:{x:e.x,y:e.y},start:0,impact:9,target:e.id,damage:107,radius:0,beam:0,beamExtra:0});
  const run=Simulation.restore(s.snapshot(),{paused:false});
  steps(run,4);const restored=Simulation.restore(run.snapshot(),{paused:false});steps(run,6);steps(restored,6);
  assert.deepEqual(restored.snapshot(),run.snapshot());assert.equal(run.enemies[0].hp,9900);assert.equal(run.projectiles.length,0);
});

test('Juggernaut summons seven lane-cycling golems and preserves the pending hatch schedule',()=>{
  const s=new Simulation(1,6),e=activate(s,s.spawn('juggernaut',4));e.powerCounter=179;s.step();assert.equal(e.special,'summon');
  steps(s,24);const pending=s.snapshot().pending;assert.equal(pending.length,7);assert.deepEqual(pending.map(p=>p.lane),[0,1,2,0,1,2,0]);
  assert.ok(pending.every(p=>p.owner===e.id&&p.kind==='golemHead'));assert.equal(pending[1].tick-pending[0].tick,7);
  const restored=Simulation.restore(s.snapshot(),{paused:false});steps(s,100);steps(restored,100);assert.deepEqual(restored.snapshot(),s.snapshot());
});

test('Shadow Archers release ranged arrows and the boss prioritizes a missile against distant soldiers',()=>{
  for(const kind of ['shadowArcher','juggernaut'] as const){
    const s=new Simulation(1,6);s.build(14,'barrack');steps(s,100);const unit=s.soldiers[0];
    const e=activate(s,s.spawn(kind,kind==='juggernaut'?4:0));e.x=unit.x+140;e.y=unit.y;e.missileCounter=kind==='juggernaut'?269:30;e.powerCounter=179;
    s.step();assert.equal(e.special,kind==='juggernaut'?'missile':'arrow');steps(s,kind==='juggernaut'?24:7);
    assert.ok(s.events.some(event=>event.type==='enemy-shot'&&event.kind===(kind==='juggernaut'?'missile':'arrow')));
    const restored=Simulation.restore(s.snapshot(),{paused:false});steps(s,30);steps(restored,30);assert.deepEqual(restored.snapshot(),s.snapshot());
  }
});

test('Shadow Archers walk during the initial reload, then hold their firing stance through reload',()=>{
  const s=new Simulation(1,6);s.build(14,'barrack');steps(s,100);const unit=s.soldiers[0],e=activate(s,s.spawn('shadowArcher'));
  e.x=unit.x+140;e.y=unit.y;const x=e.x,y=e.y;s.step();assert.ok(e.x!==x||e.y!==y);assert.equal(e.rangedEngaged,false);
  e.missileCounter=30;s.step();assert.equal(e.rangedEngaged,true);assert.equal(e.rangedTarget,unit.id);
  steps(s,12);for(const soldier of s.soldiers){soldier.hp=0;soldier.respawnAt=Infinity;}const held={x:e.x,y:e.y};steps(s,20);
  assert.deepEqual({x:e.x,y:e.y},held,'the original retains its firing stance until the reload completes');
  const restored=Simulation.restore(s.snapshot(),{paused:false});steps(s,15);steps(restored,15);assert.deepEqual(restored.snapshot(),s.snapshot());assert.equal(e.rangedEngaged,false);
});

test('defeating the boss clears its army and owned spawns; escaping costs all twenty lives',()=>{
  const s=new Simulation(1,6),boss=activate(s,s.spawn('juggernaut',4));boss.powerCounter=179;s.step();steps(s,24);
  const other=activate(s,s.spawn('golemHead'));boss.hp=1;
  const projectileId=s.spawn('goblin').id;s.enemies.pop();
  s.projectiles.push({id:projectileId,kind:'magic',from:{x:0,y:0},to:{...boss},start:s.tick,impact:s.tick+9,target:boss.id,damage:10,radius:0,beam:0});s.step();
  assert.equal(boss.hp,0);assert.equal(other.hp,0);assert.equal(s.snapshot().pending.length,0);assert.equal(s.hostileProjectiles.length,0);assert.equal(s.kills,2);
  const leak=new Simulation(1,6),e=leak.spawn('juggernaut',4),p=leak.level.paths[4];e.node=p.end-1;Object.assign(e,p.lanes[e.lane][p.end]);leak.step();
  assert.equal(leak.lives,0);assert.equal(ENEMIES.juggernaut.lives,20);
});

test('the complete Citadel browser boss-practice commands reproduce the recorded defeat',async()=>{
  const trace=await Bun.file(new URL('../../../docs/games/kingdom-rush/playtests/2026-11-08-citadel-boss-browser.json',import.meta.url)).json();
  assert.equal(trace.practice,true);assert.equal(trace.completeHistory,true);const s=new Simulation(trace.seed,6);
  for(const event of trace.events){
    while(s.tick<event.tick&&s.phase!=='won'&&s.phase!=='lost')s.step();
    if(s.phase==='won'||s.phase==='lost')break;
    if(event.type==='practice')assert.ok(s.preparePractice(event.wave));
    else if(event.type==='build')assert.ok(s.build(event.holder,event.kind));
    else if(event.type==='upgrade')assert.ok(s.upgrade(event.holder));
    else if(event.type==='cast')assert.ok(s.cast(event.kind,{x:event.x,y:event.y}));
    else if(event.type==='wave'&&(s.phase==='ready'||event.bonus>0))assert.ok(s.callWave());
  }
  assert.deepEqual([s.phase,s.tick,s.gold,s.kills,s.lives],['lost',5522,538,131,0]);
  assert.equal(s.enemies.find(e=>e.kind==='juggernaut')?.hp,1858);
});

test('the passive three-tower Citadel opening control reproduces the actual browser loss',async()=>{
  const trace=await Bun.file(new URL('../../../docs/games/kingdom-rush/playtests/2026-11-08-citadel-opening-browser.json',import.meta.url)).json();
  assert.equal(trace.practice,false);assert.equal(trace.completeHistory,true);const s=new Simulation(trace.seed,6);
  for(const event of trace.events){
    while(s.tick<event.tick&&s.phase!=='won'&&s.phase!=='lost')s.step();
    if(s.phase==='won'||s.phase==='lost')break;
    if(event.type==='build')assert.ok(s.build(event.holder,event.kind));
    else if(event.type==='upgrade')assert.ok(s.upgrade(event.holder));
    else if(event.type==='rally')assert.ok(s.setRally(event.holder,{x:event.x,y:event.y}));
    else if(event.type==='wave'&&(s.phase==='ready'||event.bonus>0))assert.ok(s.callWave());
  }
  assert.deepEqual([s.phase,s.tick,s.wave,s.gold,s.kills],['lost',32738,4,372,26]);
});
