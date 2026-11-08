import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../../../src/games/kingdom-rush/simulation';

function idleBarracks(){
  const s=new Simulation();s.build(12,'barrack');
  for(let i=0;i<120;i++)s.step();
  const soldier=s.soldiers[0];soldier.hp=20;soldier.idleTicks=0;soldier.regenTicks=0;
  return {s,soldier};
}

test('wounded militia first heal after 89 idle frames, then every 30',()=>{
  const {s,soldier}=idleBarracks();
  for(let i=0;i<88;i++)s.step();assert.equal(soldier.hp,20);
  s.step();assert.equal(soldier.hp,25);
  for(let i=0;i<29;i++)s.step();assert.equal(soldier.hp,25);
  s.step();assert.equal(soldier.hp,30);
});

test('rally movement freezes partial recovery and save/restore preserves it',()=>{
  const {s,soldier}=idleBarracks();
  for(let i=0;i<79;i++)s.step();
  assert.equal(soldier.regenTicks,20);
  s.setRally(12,{x:355,y:480});s.step();
  assert.equal(soldier.idleTicks,60);assert.equal(soldier.regenTicks,20);
  const restored=Simulation.restore(s.snapshot(),{paused:false});
  for(let i=0;i<100;i++){s.step();restored.step();}
  assert.deepEqual(restored.snapshot(),s.snapshot());assert.ok(soldier.hp>20);
});

test('barracks upgrades preserve living idle delay but restart heal progress; old saves default clocks',()=>{
  const {s,soldier}=idleBarracks();
  for(let i=0;i<79;i++)s.step();
  assert.ok(s.upgrade(12));assert.equal(soldier.idleTicks,60);assert.equal(soldier.regenTicks,0);
  const old=JSON.parse(JSON.stringify(s.snapshot()));
  for(const unit of old.soldiers){delete unit.idleTicks;delete unit.regenTicks;}
  const restored=Simulation.restore(old);
  assert.equal(restored.soldiers[0].idleTicks,0);assert.equal(restored.soldiers[0].regenTicks,0);
});

test('taking a melee hit resets the idle delay without discarding partial heal progress',()=>{
  const {s,soldier}=idleBarracks();
  for(let i=0;i<79;i++)s.step();
  const enemy=s.spawn('ogre');enemy.x=329;enemy.y=474;s.step();
  const primary=s.soldiers.find(unit=>unit.id===enemy.attackTarget)!;
  primary.hp=50;primary.idleTicks=60;primary.regenTicks=20;
  for(let i=0;i<100&&primary.hp===50;i++)s.step();
  assert.ok(primary.hp<50);assert.equal(primary.idleTicks,0);assert.equal(primary.regenTicks,20);
  assert.ok(soldier.target,'the original soldier is still engaged');
});
