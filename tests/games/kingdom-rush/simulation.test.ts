import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { blastDamage, damageAfterArmor, ENEMIES, FPS, inRange, LEVEL, rollDamage, type TowerKind } from '../../../src/games/kingdom-rush/content';
import { planWave, Simulation } from '../../../src/games/kingdom-rush/simulation';
import source from '../../../src/games/kingdom-rush/reference/source-level03.json';
import flash from '../../../src/games/kingdom-rush/reference/flash-pagras.json';

describe('Pagras reference content',()=>{
  test('keeps the 300-gold economy and geometry with the original Flash campaign schedule',()=>{
    assert.equal(LEVEL.cash,300);assert.equal(LEVEL.lives,20);assert.equal(LEVEL.holders.length,12);
    assert.equal(LEVEL.paths.length,2);assert.equal(LEVEL.groups.length,11);
    assert.deepEqual(LEVEL.groups,flash.groups);
    assert.equal(LEVEL.paths[0].lanes.length,3);
    source.paths.paths.forEach((route,i)=>route.forEach((lane,j)=>lane.forEach((p,k)=>assert.deepEqual(LEVEL.paths[i].lanes[j][k],{x:p.x,y:768-p.y}))));
  });
  test('matches source-derived spawn fixtures, including waits before the first enemy and concurrent routes',()=>{
    const first=planWave(0,0);assert.equal(first.events.length,24);assert.equal(first.end,606);
    assert.deepEqual(first.events.slice(0,3).map(e=>e.tick),[20,40,60]);
    assert.equal(first.events[8].tick,287); // 8×20 + 100 wait + 2 transition frames + 25
    const third=planWave(2,100);assert.equal(third.events.length,12);assert.equal(third.end,312);
    assert.deepEqual(third.events.filter(e=>e.tick===135).map(e=>e.route),[1,0]);
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
  for(let i=0;i<655;i++)s.step();assert.equal(s.canCall,false);
  s.step();assert.equal(s.canCall,true);assert.equal(s.earlyReward,22); // round((700-50)/30)
  const before=s.gold;assert.equal(s.callWave(),true);assert.equal(s.gold,before+22);
  assert.equal(s.wave,2);assert.ok(s.enemies.some(e=>e.hp>0));
});

test('pause freezes enemies, spawns, spell cooldowns and economy commands',()=>{
  const s=new Simulation();s.callWave();s.cast('fire',{x:600,y:300});for(let i=0;i<35;i++)s.step();
  s.setPaused(true);const tick=s.tick,trace=s.export();for(let i=0;i<300;i++)s.step();
  assert.equal(s.tick,tick);assert.equal(s.export(),trace);assert.equal(s.build(1,'archer'),false);assert.equal(s.callWave(),false);
  assert.equal(s.cast('reinforcements',{x:329,y:474}),false);s.setPaused(false);s.step();assert.equal(s.tick,tick+1);
});

test('a primary blocker reserves an enemy during approach, then takes its attacks and respawns',()=>{
  const s=new Simulation();s.build(12,'barrack');for(let i=0;i<42;i++)s.step();
  const enemy=s.spawn('ogre');enemy.x=329;enemy.y=474;
  s.step();const primary=s.soldiers.find(o=>o.id===enemy.attackTarget)!;
  assert.ok(primary);assert.equal(primary.meleeSlot,2);assert.equal(enemy.x,329);
  assert.equal(primary.arrived,false);assert.equal(enemy.hitAt,0,'no enemy attack before its blocker arrives');
  for(let i=0;i<100&&!primary.arrived;i++)s.step();assert.equal(primary.arrived,true);
  primary.hp=1;for(let i=0;i<35&&primary.hp>0;i++)s.step();assert.equal(primary.hp,0);
  enemy.escaped=true;const respawn=primary.respawnAt;while(s.tick<respawn)s.step();
  assert.equal(primary.hp,50);assert.ok(s.events.some(e=>e.type==='soldier-respawn'));
  assert.equal(primary.x,410,'replacement waits at the barracks door');
});

test('a shaman heals wounded allies after its cast delay rather than making every enemy regenerate',()=>{
  const s=new Simulation();const shaman=s.spawn('shaman'),orc=s.spawn('orc');
  shaman.x=600;shaman.y=300;shaman.healCounter=240;orc.x=610;orc.y=300;orc.hp=10;
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
test('an aggressive early-call strategy has a deterministic battle outcome',()=>{
  const a=play(0xc0ffee),b=play(0xc0ffee);assert.ok(a.phase==='won'||a.phase==='lost');assert.ok(a.wave>=7);
  assert.ok(a.kills+a.leaked>200);assert.equal(a.export(),b.export());
});


test('early calls accelerate both spell cooldowns by the unrounded remaining countdown',()=>{
  const s=new Simulation();s.callWave();while(!s.canCall)s.step();
  s.cast('fire',{x:600,y:300});s.cast('reinforcements',LEVEL.holders[11].rally);
  const fire=s.fireReady,reinforcements=s.reinforcementsReady,advance=Math.round(s.nextIn*FPS);
  s.callWave();assert.equal(s.fireReady,fire-advance);assert.equal(s.reinforcementsReady,s.tick);
  assert.ok(reinforcements<s.tick+advance);
});

test('a cleared road retains the countdown instead of silently starting the next wave',()=>{
  const s=new Simulation();s.callWave();while(!s.canCall){s.enemies.forEach(e=>e.escaped=true);s.step();}
  s.enemies.forEach(e=>e.escaped=true);const wait=Math.floor(s.nextIn*FPS);
  for(let i=0;i<wait-1;i++)s.step();assert.equal(s.wave,1);s.step();assert.equal(s.wave,2);
});

test('artillery splash falls from maximum at the center to minimum at the ellipse boundary',()=>{
  assert.equal(blastDamage(15,30,{x:0,y:0},{x:0,y:0},60),30);
  assert.equal(blastDamage(15,30,{x:0,y:0},{x:60,y:0},60),15);
  assert.equal(blastDamage(15,30,{x:0,y:0},{x:0,y:40},60),15);
  assert.equal(blastDamage(15,30,{x:0,y:0},{x:30,y:0},60),22);
});

test('arrows can miss a target that moves away from the predicted impact point',()=>{
  const s=new Simulation();const e=s.spawn('orc');e.x=600;e.y=300;
  s.projectiles.push({id:900,kind:'physical',from:{x:100,y:100},to:{x:100,y:100},start:0,impact:1,target:e.id,damage:10,radius:0});
  s.step();assert.equal(e.hp,80);
});

test('a healing shaman can heal itself and remains stationary for the full cast',()=>{
  const s=new Simulation();const e=s.spawn('shaman');e.hp=40;e.healCounter=240;
  s.step();const x=e.x,y=e.y;while(s.tick<15)s.step();assert.equal(e.hp,90);
  while(s.tick<28)s.step();assert.equal(e.x,x);assert.equal(e.y,y);
  s.step();assert.ok(e.x!==x||e.y!==y);
});


test('a paced mixed defense can finish all eleven original-Flash waves',()=>{
  const s=new Simulation();s.build(12,'barrack');s.build(10,'engineer');s.build(11,'archer');s.callWave();
  const orders:[number,TowerKind][]=[[6,'mage'],[5,'archer'],[4,'mage'],[2,'archer'],[3,'mage'],[1,'archer'],[7,'barrack'],[8,'archer'],[9,'archer']];
  for(let i=0;i<30000&&s.phase==='running';i++){
    if(i%FPS===0){
      const next=orders[0];if(next&&s.build(...next))orders.shift();
      if(!orders.length)for(const t of s.towers)s.upgrade(t.id);
      const enemies=s.enemies.filter(e=>e.hp>0&&!e.escaped&&e.x>0&&e.x<1024).sort((a,b)=>s.remaining(a)-s.remaining(b));
      if(enemies[0]){
        s.cast('reinforcements',enemies[0]);
        if(enemies.length>10||enemies.some(e=>e.kind==='ogre'||e.kind==='shaman'))s.cast('fire',enemies[0]);
      }
    }
    s.step();
  }
  assert.equal(s.phase,'won');assert.equal(s.wave,11);assert.ok(s.lives>0);
  assert.equal(s.kills+s.leaked,329);
});

test('new towers take one second to construct; powers unlock at battle start',()=>{
  const s=new Simulation();s.build(12,'barrack');s.build(11,'archer');
  const enemy=s.spawn('orc');enemy.x=423;enemy.y=600;
  for(let i=0;i<FPS-1;i++)s.step();assert.equal(s.towers[1].shots,0);
  for(let i=0;i<8;i++)s.step();assert.equal(s.towers[1].shots,1);
  while(s.tick<41)s.step();assert.equal(s.soldiers[0].x,410);assert.equal(s.soldiers[0].y,437);
  s.step();assert.notEqual(s.soldiers[0].x,410);
  assert.equal(s.cast('fire',{x:400,y:300}),false);s.callWave();assert.equal(s.cast('fire',{x:400,y:300}),true);
});


test('Flash damage rolls preserve the stronger low-end behavior of militia and farmers',()=>{
  assert.equal(rollDamage([1,2],.01),2);assert.equal(rollDamage([1,2],.99),2);
  assert.equal(rollDamage([1,3],.25),2);assert.equal(rollDamage([1,3],.75),3);
  assert.equal(rollDamage([4,6],.01),5);assert.equal(rollDamage([4,6],.99),6);
  assert.equal(rollDamage([4,6],0),4);
});
