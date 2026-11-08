import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ENEMIES,TOWERS,getLevel,damageAfterArmor} from '../../../src/games/kingdom-rush/content';
import {Simulation,planWave} from '../../../src/games/kingdom-rush/simulation';

test('Silveroak retains three original entrances, its free existing tower and source enemy schedule',()=>{
  const level=getLevel(5),s=new Simulation(9,5);
  assert.deepEqual([level.cash,level.groups.length,level.holders.length],[700,15,13]);
  assert.deepEqual(level.paths.map(p=>p.lanes[0].length),[196,148,128]);
  assert.deepEqual(s.towers.map(t=>[t.id,t.kind,t.level]),[[4,'archer',3]]);assert.equal(s.gold,700);
  assert.ok(planWave(2,0,level).events.every(e=>e.route===2&&e.kind==='spider'));
  assert.ok(planWave(14,0,level).events.some(e=>e.kind==='marauder'));
  assert.equal(damageAfterArmor(100,'magic',0,ENEMIES.spider.magicArmor),35);
  assert.deepEqual([ENEMIES.matriarch.lives,ENEMIES.marauder.lives,ENEMIES.spiderling.gold],[2,3,0]);
});

test('original path tolerance advances a node without snapping or carrying leftover travel',()=>{
  const s=new Simulation(9,5),e=s.spawn('orc'),next=s.level.paths[0].lanes[0][1];
  e.x=next.x-1.8;e.y=next.y;s.step();
  assert.equal(e.node,1);assert.ok(Math.abs(e.x-(next.x-.776))<1e-8);assert.notEqual(e.x,next.x);
  assert.equal(TOWERS.archer.range[0],140.8);assert.equal(TOWERS.mage.range[0],140.8);assert.equal(TOWERS.barrack.range[0],147.2);
});

test('matriarch nests survive their mother, hatch across all lanes, and prevent premature victory',()=>{
  const s=new Simulation(9,5),mother=s.spawn('matriarch',2);mother.eggInterval=1;
  for(let i=0;i<6;i++)s.step();assert.equal(mother.eggsLaid,3);
  mother.hp=0;mother.deadAt=s.tick;s.wave=15;s.phase='running';
  const restored=Simulation.restore(s.snapshot(),{paused:false});
  for(let i=0;i<70;i++){s.step();restored.step();}
  assert.equal(s.phase,'running','unhatched nests remain part of the defense');
  for(let i=0;i<40;i++){s.step();restored.step();}
  assert.deepEqual(restored.snapshot(),s.snapshot());
  const children=s.enemies.filter(e=>e.kind==='spiderling');assert.equal(children.length,9);
  assert.deepEqual([0,1,2].map(lane=>children.filter(e=>e.lane===lane&&e.route===2).length),[3,3,3]);
});

test('elf camp repair and hires charge gold, cap at four living units and retain their state',()=>{
  const s=new Simulation(9,5);assert.equal(s.hireElf(),false);assert.ok(s.repairElves());assert.equal(s.repairElves(),false);
  for(let i=0;i<4;i++)assert.ok(s.hireElf());assert.equal(s.hireElf(),false);assert.equal(s.gold,200);
  assert.ok(s.soldiers.every(unit=>unit.kind==='elf'&&unit.hp===200&&unit.expires===Infinity));
  const restored=Simulation.restore(s.snapshot(),{paused:false});assert.equal(restored.towers.length,1,'restoration does not duplicate the existing archer tower');
  for(let i=0;i<120;i++){s.step();restored.step();}assert.deepEqual(restored.snapshot(),s.snapshot());
  const unit=s.soldiers[0];unit.hp=0;unit.respawnAt=Infinity;for(let i=0;i<400;i++)s.step();assert.equal(unit.hp,0);assert.ok(s.hireElf());assert.equal(s.gold,100);
});

test('elves fire physical arrows beyond their melee acquisition radius',()=>{
  const s=new Simulation(9,5);s.repairElves();s.hireElf();for(let i=0;i<150;i++)s.step();
  const unit=s.soldiers[0],e=s.spawn('brigand');e.node=10;e.x=unit.x+100;e.y=unit.y;
  for(let i=0;i<10;i++)s.step();
  assert.ok(s.projectiles.some(p=>p.kind==='physical'&&p.target===e.id&&Math.abs(p.from.x-unit.x)<5));
});

test('rangers unlock on Silveroak wave five, with the original base upgrade cost',()=>{
  const s=new Simulation(9,5);assert.equal(s.upgrade(4),false);s.wave=5;assert.ok(s.upgrade(4));
  assert.equal(s.towers[0].level,4);assert.equal(s.gold,470);assert.equal(s.upgrade(4),false);
  assert.equal(Simulation.restore(s.snapshot()).towers[0].level,4);
});

test('trace history survives reloads, while older saves explicitly export incomplete history',()=>{
  const s=new Simulation(9,5);s.repairElves();s.hireElf();s.build(1,'barrack');s.callWave();for(let i=0;i<100;i++)s.step();
  const restored=Simulation.restore(s.snapshot(),{paused:false});assert.deepEqual(JSON.parse(restored.export()).events,JSON.parse(s.export()).events);
  assert.equal(JSON.parse(restored.export()).completeHistory,true);
  const old=JSON.parse(JSON.stringify(s.snapshot()));delete old.events;
  assert.equal(JSON.parse(Simulation.restore(old).export()).completeHistory,false);
});

test('a complete Silveroak defense resolves all 15 waves and their hatched offspring',()=>{
  const s=new Simulation(0xc0ffee,5);s.build(12,'barrack');s.build(13,'engineer');s.build(6,'mage');s.build(3,'mage');s.repairElves();s.hireElf();s.hireElf();
  const upgrades=[6,13,3,12,4,6,3,13,12];let cursor=0;
  s.callWave();while(s.phase==='running'&&s.tick<40000){
    if(cursor<upgrades.length&&s.upgrade(upgrades[cursor]))cursor++;
    if(cursor>=upgrades.length&&s.soldiers.filter(s=>s.kind==='elf'&&s.hp>0).length<4)s.hireElf();
    if(s.tick%60===0){const enemy=s.enemies.filter(e=>e.hp>0&&!e.escaped).sort((a,b)=>s.remaining(a)-s.remaining(b))[0];if(enemy){s.cast('reinforcements',enemy);if(enemy.hp>70)s.cast('fire',enemy);}}
    s.step();
  }
  assert.equal(s.phase,'won');assert.equal(s.wave,15);assert.equal(s.lives,9);assert.equal(s.kills,330);
  assert.ok(s.enemies.length>235,'offspring are additional enemies, not replacements for scheduled waves');
});

test('the restored browser playtest exports a complete reproducible command history',async()=>{
  const trace=await Bun.file(new URL('../../../docs/games/kingdom-rush/playtests/2026-11-07-silveroak-browser.json',import.meta.url)).json();
  assert.equal(trace.completeHistory,true);const s=new Simulation(trace.seed,5);
  for(const event of trace.events){
    while(s.tick<event.tick&&s.phase!=='lost'&&s.phase!=='won')s.step();
    if(event.type==='build')assert.ok(s.build(event.holder,event.kind));
    else if(event.type==='upgrade')assert.ok(s.upgrade(event.holder));
    else if(event.type==='cast')assert.ok(s.cast(event.kind,{x:event.x,y:event.y}));
    else if(event.type==='elf-repair')assert.ok(s.repairElves());
    else if(event.type==='elf-hire')assert.ok(s.hireElf());
    else if(event.type==='rally')assert.ok(s.setRally(event.holder,{x:event.x,y:event.y}));
    else if(event.type==='wave'&&(event.wave===1||event.bonus>0))assert.ok(s.callWave());
  }
  assert.deepEqual([s.phase,s.tick,s.wave,s.gold,s.kills],[trace.phase,trace.tick,trace.wave,trace.gold,trace.kills]);
});
