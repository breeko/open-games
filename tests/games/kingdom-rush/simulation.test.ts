import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { damageAfterArmor, ENEMIES, FPS, inRange, LEVEL, type TowerKind } from '../../../src/games/kingdom-rush/content';
import { planWave, Simulation } from '../../../src/games/kingdom-rush/simulation';
import source from '../../../src/games/kingdom-rush/reference/source-level03.json';

describe('Pagras reference content',()=>{
  test('keeps the older 300-gold economy, twelve foundations and complete source wave schedule',()=>{
    assert.equal(LEVEL.cash,300);assert.equal(LEVEL.lives,20);assert.equal(LEVEL.holders.length,12);
    assert.equal(LEVEL.paths.length,2);assert.equal(LEVEL.groups.length,11);
    assert.deepEqual(LEVEL.groups,source.waves.groups);
    assert.equal(LEVEL.paths[0].lanes.length,3);
    source.paths.paths.forEach((route,i)=>route.forEach((lane,j)=>lane.forEach((p,k)=>assert.deepEqual(LEVEL.paths[i].lanes[j][k],{x:p.x,y:768-p.y}))));
  });
  test('matches source-derived spawn fixtures, including waits before the first enemy and concurrent routes',()=>{
    const first=planWave(0,0);assert.equal(first.events.length,24);assert.equal(first.end,712);
    assert.deepEqual(first.events.slice(0,3).map(e=>e.tick),[26,52,78]);
    assert.equal(first.events[8].tick,340); // 8×26 + 100 inter-chunk wait + 32
    const third=planWave(2,100);assert.equal(third.events.length,12);assert.equal(third.end,370);
    assert.deepEqual(third.events.filter(e=>e.tick===145).map(e=>e.route),[1,0]);
    assert.deepEqual(LEVEL.groups.map((_,i)=>planWave(i,0).events.length),[24,10,12,40,35,10,31,39,63,23,42]);
    const final=planWave(10,0);assert.equal(final.events.filter(e=>e.kind==='ogre').length,2);
    assert.equal(final.events.filter(e=>e.kind==='shaman').length,4);
  });
});

test('physical, magical, explosion and soldier rounding retain their distinct armor rules',()=>{
  assert.equal(damageAfterArmor(10,'physical',.3,.85),7);
  assert.equal(damageAfterArmor(10,'magic',.3,.85),1);
  assert.equal(damageAfterArmor(10,'explosion',.3,.85),8);
  assert.equal(damageAfterArmor(10,'true',.3,.85),10);
  assert.equal(damageAfterArmor(3,'physical',.15,0,true),3);
  assert.equal(damageAfterArmor(3,'physical',.15,0),2);
  assert.equal(inRange({x:0,y:0},{x:0,y:80},100),false);
  assert.equal(inRange({x:0,y:0},{x:80,y:0},100),true);
});

test('construction and upgrades charge once, reject invalid purchases and use the original sell factor',()=>{
  const s=new Simulation();assert.equal(s.build(12,'barrack'),true);assert.equal(s.gold,230);assert.equal(s.soldiers.length,3);
  assert.equal(s.build(12,'mage'),false);assert.equal(s.build(99,'mage'),false);assert.equal(s.gold,230);
  assert.equal(s.upgrade(12),true);assert.equal(s.gold,120);assert.equal(s.soldiers[0].kind,'footmen');
  assert.equal(s.upgrade(12),false);assert.equal(s.build(4,'engineer'),false);
  assert.equal(s.sell(12),true);assert.equal(s.gold,228);assert.equal(s.sell(12),false);
});

test('wave pressure and the early-call reward start after the spawners finish, while enemies may remain',()=>{
  const s=new Simulation();s.callWave();
  for(let i=0;i<711;i++)s.step();assert.equal(s.canCall,false);
  s.step();assert.equal(s.canCall,true);assert.equal(s.earlyReward,23); // round(700/30)
  const before=s.gold;assert.equal(s.callWave(),true);assert.equal(s.gold,before+23);
  assert.equal(s.wave,2);assert.ok(s.enemies.some(e=>e.hp>0));
});

test('pause freezes enemies, spawns, spell cooldowns and economy commands',()=>{
  const s=new Simulation();s.callWave();s.cast('fire',{x:600,y:300});for(let i=0;i<35;i++)s.step();
  s.setPaused(true);const tick=s.tick,trace=s.export();for(let i=0;i<300;i++)s.step();
  assert.equal(s.tick,tick);assert.equal(s.export(),trace);assert.equal(s.build(1,'archer'),false);assert.equal(s.callWave(),false);
  assert.equal(s.cast('reinforcements',{x:329,y:474}),false);s.setPaused(false);s.step();assert.equal(s.tick,tick+1);
});

test('soldiers physically stop enemies, release them when rallied, and respawn after death',()=>{
  const s=new Simulation();s.build(12,'barrack');const soldier=s.soldiers[0],enemy=s.spawn('ogre');
  enemy.x=329;enemy.y=474;enemy.nextAttack=0;
  soldier.x=enemy.x-24;soldier.y=enemy.y;soldier.rally={x:enemy.x,y:enemy.y};soldier.target=enemy.id;
  s.soldiers.slice(1).forEach(o=>{o.rally={x:100,y:100};o.x=100;o.y=100;});
  const x=enemy.x;s.step();assert.equal(enemy.x,x);assert.equal(soldier.target,enemy.id);
  assert.equal(s.setRally(12,{x:329,y:474}),true);assert.equal(soldier.target,0);
  // An isolated ogre kills the blocking militia; the tower owns its replacement.
  soldier.rally={x:enemy.x,y:enemy.y};soldier.x=enemy.x-24;soldier.y=enemy.y;soldier.target=enemy.id;
  soldier.hp=1;enemy.nextAttack=s.tick;enemy.hitAt=0;
  for(let i=0;i<25;i++)s.step();assert.equal(soldier.hp,0);
  enemy.escaped=true;const respawn=soldier.respawnAt;while(s.tick<respawn)s.step();
  assert.equal(soldier.hp,50);assert.ok(s.events.some(e=>e.type==='soldier-respawn'));
});

test('a shaman heals wounded allies after its cast delay rather than making every enemy regenerate',()=>{
  const s=new Simulation();const shaman=s.spawn('shaman'),orc=s.spawn('orc');
  shaman.x=600;shaman.y=300;shaman.nextHeal=0;orc.x=610;orc.y=300;orc.hp=10;
  s.step();assert.equal(orc.hp,10);assert.equal(shaman.animation,'heal');
  // Keep the test focused on casting, independent of path travel.
  while(s.tick<15){orc.x=610;orc.y=300;s.step();}
  assert.equal(orc.hp,60);assert.equal(shaman.hp,ENEMIES.shaman.hp);
});

test('an undefended level loses and cannot keep spawning after defeat',()=>{
  const s=new Simulation();s.callWave();for(let i=0;i<10000&&s.phase==='running';i++)s.step();
  assert.equal(s.phase,'lost');assert.equal(s.lives,0);assert.equal(s.kills,0);const tick=s.tick;s.step();assert.equal(s.tick,tick);
});

function play(seed:number):Simulation {
  const s=new Simulation(seed);s.build(12,'barrack');s.build(10,'engineer');s.build(11,'archer');s.callWave();
  const purchases:{holder:number;kind:TowerKind}[]=[{holder:6,kind:'mage'},{holder:5,kind:'engineer'},{holder:4,kind:'mage'},{holder:2,kind:'archer'},{holder:3,kind:'archer'},{holder:1,kind:'archer'}];
  for(let i=0;i<40000&&s.phase==='running';i++){
    if(i%FPS===0){
      const next=purchases[0];if(next&&s.build(next.holder,next.kind))purchases.shift();
      if(!purchases.length)for(const t of s.towers)s.upgrade(t.id);
      if(s.canCall&&s.earlyReward>10)s.callWave();
      const enemies=s.enemies.filter(e=>e.hp>0&&!e.escaped).sort((a,b)=>s.remaining(a)-s.remaining(b));
      if(enemies.length>6){s.cast('reinforcements',enemies[0]);if(enemies.some(e=>e.kind==='ogre')||enemies.length>16)s.cast('fire',enemies[0]);}
    }
    s.step();
  }
  return s;
}
test('a mixed defense can finish all eleven waves; a seeded replay reproduces the battle',()=>{
  const a=play(0xc0ffee),b=play(0xc0ffee);assert.equal(a.phase,'won');assert.equal(a.wave,11);assert.ok(a.lives>0);
  assert.equal(a.kills+a.leaked,329);assert.equal(a.export(),b.export());
});
