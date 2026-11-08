import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ENEMIES,SOLDIERS,TOWERS,enemyKind,getLevel,type TowerKind} from '../../../src/games/kingdom-rush/content';
import {Simulation,planWave} from '../../../src/games/kingdom-rush/simulation';
import {enemyBounds} from '../../../src/games/kingdom-rush/collision';

test('Twin Rivers retains both original paths and concurrent original waves',()=>{
  const level=getLevel(4);assert.equal(level.maxTowerLevel,3);
  assert.deepEqual(level.paths.map(p=>[p.lanes[0].length,p.activeStart,p.activeEnd,p.end]),[[174,10,163,167],[185,10,174,178]]);
  assert.deepEqual(level.groups.map(g=>g.waves.length),Array(13).fill(2));
  assert.deepEqual(planWave(5,0,level).events.reduce((counts,e)=>(counts[e.route]++,counts),[0,0]),[3,6]);
  assert.ok(planWave(5,0,level).events.every(e=>e.kind==='bandit'));
  assert.ok(planWave(10,0,level).events.every(e=>e.kind==='brigand'));
  assert.deepEqual(planWave(0,0,level).events.slice(0,2).map(e=>[e.tick,e.route,e.kind]),[[20,0,'goblin'],[30,1,'goblin']]);
});

test('new enemies retain Flash Normal health, armor, dodge and melee timing with extracted bounds',()=>{
  assert.equal(enemyKind('enemy_bandit'),'bandit');assert.equal(enemyKind('enemy_brigand'),'brigand');
  assert.deepEqual([ENEMIES.bandit.hp,ENEMIES.bandit.dodge,ENEMIES.bandit.damage,ENEMIES.bandit.hitTime],[70,.5,[20,30],8/30]);
  assert.deepEqual([ENEMIES.brigand.hp,ENEMIES.brigand.armor,ENEMIES.brigand.damage,ENEMIES.brigand.hitTime],[160,.5,[6,10],13/30]);
  const s=new Simulation(1,4);
  for(const kind of ['bandit','brigand'] as const){const e=s.spawn(kind);const b=enemyBounds(e,0);assert.ok(b.right>b.left&&b.bottom>b.top);e.facing=-1;assert.ok(enemyBounds(e,0).right>e.x);}
});

test('tier-three purchases charge original costs, promote knights and survive restore on both routes',()=>{
  for(const kind of ['archer','barrack','mage','engineer'] as const){
    const s=new Simulation(7,4);assert.ok(s.build(9,kind));assert.ok(s.upgrade(9));assert.ok(s.upgrade(9));assert.equal(s.upgrade(9),false);
    assert.equal(s.gold,680-TOWERS[kind].price.slice(0,3).reduce((a,b)=>a+b,0));
    if(kind==='barrack'){assert.ok(s.soldiers.every(unit=>unit.kind==='knight'&&unit.hp===150));assert.equal(SOLDIERS.knight.armor,.3);}
    s.spawn('bandit',0);s.spawn('brigand',1);s.callWave();for(let i=0;i<80;i++)s.step();
    const restored=Simulation.restore(s.snapshot(),{paused:false});for(let i=0;i<120;i++){s.step();restored.step();}assert.deepEqual(restored.snapshot(),s.snapshot());
  }
  const old=new Simulation(7,3);old.build(9,'archer');old.upgrade(9);assert.equal(old.upgrade(9),false);
});

test('a seeded mixed defense can finish all 13 waves without changing original balance values',()=>{
  const s=new Simulation(1,4);
  const initial:[number,TowerKind][]=[[13,'barrack'],[5,'barrack'],[14,'engineer'],[6,'engineer'],[12,'mage'],[4,'mage'],[9,'archer']];
  for(const p of initial)assert.ok(s.build(...p));
  const upgrades=[12,4,14,6,13,5,9,11,3,11,3,12,4,14,6];let cursor=0;
  s.callWave();while(s.phase==='running'&&s.tick<40000){
    if(cursor<upgrades.length){const id=upgrades[cursor],ok=s.towers.some(t=>t.id===id)?s.upgrade(id):s.build(id,'archer');if(ok)cursor++;}
    if(s.tick%60===0){const e=s.enemies.filter(e=>e.hp>0&&!e.escaped).sort((a,b)=>s.remaining(a)-s.remaining(b))[0];if(e){s.cast('reinforcements',e);if(e.hp>70)s.cast('fire',e);}}
    s.step();
  }
  assert.equal(s.phase,'won');assert.equal(s.wave,13);assert.equal(s.kills,318);assert.equal(s.lives,7);
});

test('the historical fixed-defense commands replay under corrected shaman cooldowns',async()=>{
  const trace=await Bun.file(new URL('../../../docs/games/kingdom-rush/playtests/2026-11-07-twin-rivers-path-browser.json',import.meta.url)).json();
  assert.equal(trace.completeHistory,true);const s=new Simulation(trace.seed,4);
  for(const event of trace.events){
    while(s.tick<event.tick&&s.phase!=='lost'&&s.phase!=='won')s.step();
    if(event.type==='build')assert.ok(s.build(event.holder,event.kind));
    else if(event.type==='wave'&&(event.wave===1||event.bonus>0))assert.ok(s.callWave());
  }
  assert.deepEqual([s.phase,s.tick,s.wave,s.gold,s.kills],['lost',8891,6,734,146]);
});
