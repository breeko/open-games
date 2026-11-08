import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,type Enemy} from '../../../src/games/kingdom-rush/simulation';
import {SKILLS,SKILL_IDS,fireStats,soldierSpec,purchasePower,spentStars,starsForLives,powerLoadoutSchema,type PowerLoadout} from '../../../src/games/kingdom-rush/upgrades';
import {powerUpgradeStore,gameStores} from '../../../src/games/kingdom-rush/persistence';
import type {TowerKind} from '../../../src/games/kingdom-rush/content';

function steps(s:Simulation,n:number){for(let i=0;i<n;i++)s.step();}
function advanced(kind:TowerKind){const s=new Simulation(123,6);s.gold=10000;s.build(9,kind);for(let i=0;i<3;i++)s.upgrade(9);const t=s.towers[0];t.readyAt=0;t.nextAttack=100000;return {s,t};}
function place(s:Simulation,e:Enemy,x=405,y=330,node=80){e.node=node;e.x=x;e.y=y;return e;}

test('skills enforce advanced family, three ranks, original prices, affordability and sale refunds',()=>{
  for(const skill of SKILL_IDS){const {s,t}=advanced(SKILLS[skill].kind);const gold=s.gold,spent=t.spent;
    assert.ok(s.buySkill(9,skill));assert.ok(s.buySkill(9,skill));assert.ok(s.buySkill(9,skill));assert.equal(s.buySkill(9,skill),false);
    const total=SKILLS[skill].costs.reduce((a,b)=>a+b,0);assert.equal(s.gold,gold-total);assert.equal(t.spent,spent+total);
    const before=s.gold;s.sell(9);assert.equal(s.gold-before,Math.floor((spent+total)*.6));
  }
  const {s,t}=advanced('mage');assert.equal(s.buySkill(9,'poison'),false);s.gold=349;assert.equal(s.buySkill(9,'deathRay'),false);s.gold=350;s.setPaused(true);assert.equal(s.buySkill(9,'deathRay'),false);s.setPaused(false);t.level=3;assert.equal(s.buySkill(9,'deathRay'),false);
});

test('poison is attached only on an arrow hit, ignores armor, and follows the original 31-frame pulse clock',()=>{
  const s=new Simulation(1,6),e=place(s,s.spawn('orc'),200,200);e.hp=e.maxHp=200;
  const id=s.spawn('goblin').id;s.enemies.pop();s.projectiles.push({id,kind:'physical',from:{x:200,y:180},to:{x:200,y:180},start:0,impact:1,target:e.id,damage:0,radius:0,poison:3});
  s.step();assert.equal(e.poisonTicks,90);steps(s,30);assert.equal(e.hp,200);s.step();assert.equal(e.hp,185);
  const restored=Simulation.restore(s.snapshot(),{paused:false});steps(s,59);steps(restored,59);assert.deepEqual(restored.snapshot(),s.snapshot());assert.equal(e.hp,170);assert.equal(e.poisonTicks,0);
});

test('poison arrows cannot poison spiders, summoned Golem Heads or the boss',()=>{
  for(const kind of ['spider','matriarch','spiderling','golemHead','juggernaut'] as const){const s=new Simulation(1,6),e=place(s,s.spawn(kind),200,200);
    const id=s.spawn('goblin').id;s.enemies.pop();s.projectiles.push({id,kind:'physical',from:{x:200,y:180},to:{x:200,y:180},start:0,impact:1,target:e.id,damage:0,radius:0,poison:3});s.step();assert.equal(e.poisonTicks,0);
  }
});

test('a weaker poison cannot replace or refresh a stronger existing application',()=>{
  const s=new Simulation(1,6),e=place(s,s.spawn('ogre'),200,200);e.poisonRank=3;e.poisonTicks=70;e.poisonCounter=10;
  const id=s.spawn('goblin').id;s.enemies.pop();s.projectiles.push({id,kind:'physical',from:{x:200,y:180},to:{x:200,y:180},start:0,impact:1,target:e.id,damage:0,radius:0,poison:1});s.step();
  assert.equal(e.poisonRank,3);assert.equal(e.poisonTicks,69);assert.equal(e.poisonCounter,11);
});

test('root and teleport movement suspend poison duration and pulse clocks as in the original update order',()=>{
  const s=new Simulation(1,6),e=place(s,s.spawn('ogre'));e.poisonRank=3;e.poisonTicks=70;e.poisonCounter=10;e.rootTicks=20;
  steps(s,20);assert.deepEqual([e.poisonTicks,e.poisonCounter],[70,10]);e.teleportTicks=20;steps(s,20);assert.deepEqual([e.poisonTicks,e.poisonCounter],[70,10]);s.step();assert.deepEqual([e.poisonTicks,e.poisonCounter],[69,11]);
});

test('reappearing from teleport clears an old root while preserving its application count and poison clock',()=>{
  const s=new Simulation(1,6),e=place(s,s.spawn('ogre'));e.rootTicks=80;e.rootCounter=12;e.rootCount=2;e.teleportTicks=1;e.poisonTicks=70;e.poisonCounter=10;e.poisonRank=3;
  const restored=Simulation.restore(s.snapshot(),{paused:false});s.step();restored.step();assert.deepEqual(restored.snapshot(),s.snapshot());
  assert.deepEqual([e.rootTicks,e.rootCounter,e.rootCount,e.teleportTicks,e.poisonTicks,e.poisonCounter],[0,0,2,0,70,10]);s.step();assert.deepEqual([e.poisonTicks,e.poisonCounter],[69,11]);
});

test('ranger thorns independently root eight targets at rank three and deal true damage while holding position',()=>{
  const {s,t}=advanced('archer');for(let i=0;i<3;i++)s.buySkill(9,'thorns');t.thornCounter=240;
  const enemies=Array.from({length:9},()=>{const e=place(s,s.spawn('orc'));e.hp=e.maxHp=200;return e;});s.step();assert.ok(t.thornCast);
  steps(s,18);assert.equal(enemies.filter(e=>e.rootTicks>0).length,8);const e=enemies[0],position={x:e.x,y:e.y};
  const restored=Simulation.restore(s.snapshot(),{paused:false});steps(s,90);steps(restored,90);assert.deepEqual(restored.snapshot(),s.snapshot());assert.equal(e.hp,80);assert.deepEqual({x:e.x,y:e.y},position);assert.equal(e.rootCount,1);
});

test('thorns require two eligible non-fighting ground enemies and never select the boss or a fourth root',()=>{
  const {s,t}=advanced('archer');s.buySkill(9,'thorns');t.thornCounter=240;
  place(s,s.spawn('gargoyle'));place(s,s.spawn('juggernaut',4));const spent=place(s,s.spawn('orc'));spent.rootCount=3;s.step();assert.equal(t.thornCast,0);
  place(s,s.spawn('orc'));s.step();assert.equal(t.thornCast,0);place(s,s.spawn('orc'));s.step();assert.ok(t.thornCast);
});

test('death ray disintegrates a non-boss at the final beam pulse and awards its normal reward',()=>{
  const {s,t}=advanced('mage');s.buySkill(9,'deathRay');t.deathCounter=600;t.nextAttack=0;const e=place(s,s.spawn('ogre'));e.hp=e.maxHp=2000;const gold=s.gold;
  steps(s,27);assert.ok(e.hp>0);s.step();assert.equal(e.hp,0);assert.equal(s.gold,gold+50);assert.ok(s.events.some(e=>e.type==='death-ray'));
});

test('a ready death ray fires an ordinary beam at the Juggernaut and retains its instant-kill charge',()=>{
  const {s,t}=advanced('mage');s.buySkill(9,'deathRay');t.deathCounter=600;t.nextAttack=0;const e=place(s,s.spawn('juggernaut',4));steps(s,28);
  assert.ok(e.hp>9800&&e.hp<10000);assert.equal(s.events.some(e=>e.type==='death-ray'),false);assert.ok(t.deathCounter>600);
});

test('teleport retains the Flash portal cap, delayed relocation, backward nodes and saved transit',()=>{
  const {s,t}=advanced('mage');for(let i=0;i<3;i++)s.buySkill(9,'teleport');t.teleportCounter=300;
  const e=place(s,s.spawn('ogre')),boss=place(s,s.spawn('juggernaut',4));s.step();steps(s,5);assert.equal(s.portals[0].left,18);assert.equal(s.portals[0].nodes,35);
  steps(s,6);assert.equal(e.teleports,1);assert.ok(e.node>=39&&e.node<=48);assert.equal(boss.teleports,0);assert.equal(e.teleportTicks,19);
  const old={x:e.x,y:e.y},restored=Simulation.restore(s.snapshot(),{paused:false});steps(s,10);steps(restored,10);assert.notDeepEqual({x:e.x,y:e.y},old);steps(s,10);steps(restored,10);assert.equal(e.teleportTicks,0);assert.deepEqual(restored.snapshot(),s.snapshot());
});

test('portals clamp retreat at node ten and cannot teleport an enemy more than three times',()=>{
  const s=new Simulation(1,6),e=place(s,s.spawn('gargoyle'),500,300,15),immune=place(s,s.spawn('ogre'),500,300,80);immune.teleports=3;s.tick=6;s.portals.push({x:500,y:300,start:0,nodes:35,left:18});s.step();
  assert.equal(e.node,10);assert.equal(e.teleports,1);assert.equal(immune.teleports,3);assert.equal(immune.teleportTicks,0);
});

test('power star purchases retain original thresholds, costs, order, affordability, cap and independent storage',()=>{
  assert.deepEqual([0,1,5,6,17,18,20].map(starsForLives),[0,1,1,2,2,3,3]);
  let profile:PowerLoadout={fire:0,reinforcements:0};assert.equal(purchasePower(profile,'reinforcements',1),null);
  for(let i=0;i<5;i++)profile=purchasePower(profile,'reinforcements',15)!;assert.equal(profile.reinforcements,5);assert.equal(spentStars(profile),15);assert.equal(purchasePower(profile,'reinforcements',18),null);
  assert.equal(purchasePower(profile,'fire',15),null);for(let i=0;i<5;i++)profile=purchasePower(profile,'fire',24)!;assert.equal(spentStars(profile),24);
  const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
  const store=powerUpgradeStore(storage);assert.equal(store.write(profile).status,'saved');assert.deepEqual(store.read(),{status:'valid',value:profile});gameStores(storage,6).results.write(20);assert.equal(store.write({fire:0,reinforcements:0}).status,'saved');assert.deepEqual(gameStores(storage,6).results.read(),{status:'valid',value:20});
});

test('all five Rain of Fire upgrades use source damage, radius, cooldown and timed five/ten-ball storms',()=>{
  assert.deepEqual([0,1,2,3,4,5].map(rank=>{const s=fireStats(rank);return [s.count,s.minDamage,s.maxDamage,s.radius,s.cooldown];}),[[3,30,60,64,80],[5,50,80,64,80],[5,50,80,64,80],[5,90,120,80,70],[5,90,120,80,60],[5,150,180,80,60]]);
  for(const rank of [1,2,3,4,5]){const s=new Simulation(1,6,{fire:rank,reinforcements:0});s.callWave();s.cast('fire',{x:500,y:600});assert.equal(s.fireReady,s.tick+fireStats(rank).cooldown*30);steps(s,25);const restored=Simulation.restore(s.snapshot(),{paused:false});steps(s,60);steps(restored,60);assert.deepEqual(restored.snapshot(),s.snapshot());assert.equal(s.events.filter(e=>e.type==='fireball').length,rank===5?10:5);assert.equal(s.storms.length,0);assert.equal(s.burns.length,rank>=2?(rank===5?10:5):0);}
});

test('burning ground damages only ground enemies, uses physical armor, and excludes the expiration pulse',()=>{
  const s=new Simulation(1,6),ground=place(s,s.spawn('orc'),500,300),air=place(s,s.spawn('gargoyle'),500,300);ground.hp=ground.maxHp=1000;
  s.burns.push({x:500,y:300,start:0,rank:4,damage:30});
  for(let i=0;i<300;i++){ground.x=air.x=500;ground.y=air.y=300;s.step();}
  assert.equal(ground.hp,811);assert.equal(air.hp,90);assert.equal(s.burns.length,0);
});

test('reinforcement training gives the original health, melee, armor and regeneration at every rank',()=>{
  assert.deepEqual([0,1,2,3,4,5].map(rank=>{const s=soldierSpec('farmer',rank);return [s.hp,s.damage,s.armor,s.regen];}),[[30,[1,2],0,3],[50,[1,3],0,6],[70,[2,4],.1,9],[90,[3,6],.2,12],[110,[6,10],.3,15],[110,[6,10],.3,15]]);
  for(let rank=0;rank<=5;rank++){const s=new Simulation(1,6,{fire:0,reinforcements:rank});s.callWave();assert.ok(s.cast('reinforcements',s.level.paths[0].lanes[0][60]));assert.equal(s.soldiers.length,2);assert.equal(s.soldiers[0].hp,soldierSpec('farmer',rank).hp);assert.equal(s.soldiers[0].reinforcementRank,rank);assert.equal(s.reinforcementsReady,300);const restored=Simulation.restore(s.snapshot(),{paused:false});steps(s,80);steps(restored,80);assert.deepEqual(restored.snapshot(),s.snapshot());}
});

test('spear-trained reinforcements can launch physical spears at flyers beyond melee range',()=>{
  const s=new Simulation(1,6,{fire:0,reinforcements:5});s.callWave();const road=s.level.paths[0].lanes[0][60];s.cast('reinforcements',road);steps(s,20);const unit=s.soldiers[0],e=place(s,s.spawn('gargoyle'),unit.x+120,unit.y);
  for(let i=0;i<50&&!s.events.some(e=>e.type==='spear');i++){e.x=unit.x+120;e.y=unit.y;s.step();}
  assert.ok(s.events.some(e=>e.type==='spear'));const spear=s.projectiles.find(p=>p.spear)!;assert.ok(spear.damage>=24&&spear.damage<=40);assert.equal(spear.impact-spear.start,12);
});

test('power loadouts are frozen after battle starts; old saves default to zero and invalid skills are rejected',()=>{
  const {s,t}=advanced('mage');s.buySkill(9,'teleport');assert.ok(s.configurePowers({fire:5,reinforcements:5}));s.callWave();assert.equal(s.configurePowers({fire:0,reinforcements:0}),false);
  const restored=Simulation.restore(s.snapshot(),{paused:false});assert.deepEqual(restored.powerUpgrades,{fire:5,reinforcements:5});assert.equal(restored.towers[0].teleport,1);
  assert.throws(()=>Simulation.restore({...s.snapshot(),powerUpgrades:{fire:6,reinforcements:0}}));
  assert.throws(()=>Simulation.restore({...s.snapshot(),towers:[{...t,poison:1}]}));
  const legacy=Simulation.restore({...s.snapshot(),powerUpgrades:undefined,storms:undefined,burns:undefined,portals:undefined,towers:[{...t,teleport:undefined}]});assert.deepEqual(legacy.powerUpgrades,{fire:0,reinforcements:0});assert.equal(legacy.towers[0].teleport,0);
});

for(const [file,tick,label] of [['2026-11-08-skills-browser.json',8914,'historical browser skill commands replay under the corrected root/poison update order'],['2026-11-08-skills-final-browser.json',8267,'later browser skill commands replay under final teleport/root cleanup']] as const)test(label,async()=>{
  const trace=await Bun.file(new URL(`../../../docs/games/kingdom-rush/playtests/${file}`,import.meta.url)).json();
  assert.equal(trace.completeHistory,true);assert.equal(trace.practice,true);const s=new Simulation(trace.seed,6,powerLoadoutSchema.parse(trace.powerUpgrades));
  for(const event of trace.events){while(s.tick<event.tick&&s.phase!=='won'&&s.phase!=='lost')s.step();if(s.phase==='won'||s.phase==='lost')break;
    if(event.type==='practice')assert.ok(s.preparePractice(event.wave));
    else if(event.type==='build')assert.ok(s.build(event.holder,event.kind));
    else if(event.type==='upgrade')assert.ok(s.upgrade(event.holder));
    else if(event.type==='skill'){const skill=SKILL_IDS.find(skill=>skill===event.skill);assert.ok(skill);assert.ok(s.buySkill(event.holder,skill));}
    else if(event.type==='cast')assert.ok(s.cast(event.kind,{x:event.x,y:event.y}));
    else if(event.type==='wave'&&(s.phase==='ready'||event.bonus>0))assert.ok(s.callWave());
  }
  assert.deepEqual([s.phase,s.tick,s.wave,s.gold,s.kills,s.lives],['lost',tick,17,1898,141,0]);
  for(const [type,count] of [['poison',114],['root',95],['teleport',59],['death-ray',12]] as const)assert.equal(s.events.filter(e=>e.type===type).length,count);
});

for(const [file,tick,gold,kills,lives] of [['2026-11-08-upgraded-powers-browser.json',1141,1472,0,14],['2026-11-08-burning-ground-browser.json',493,254,24,20]] as const)test(`actual browser power commands replay through ${file}`,async()=>{
  const trace=await Bun.file(new URL(`../../../docs/games/kingdom-rush/playtests/${file}`,import.meta.url)).json();const s=new Simulation(trace.seed,6,powerLoadoutSchema.parse(trace.powerUpgrades));
  for(const event of trace.events){while(s.tick<event.tick)s.step();
    if(event.type==='practice')assert.ok(s.preparePractice(event.wave));
    else if(event.type==='build')assert.ok(s.build(event.holder,event.kind));
    else if(event.type==='upgrade')assert.ok(s.upgrade(event.holder));
    else if(event.type==='cast')assert.ok(s.cast(event.kind,{x:event.x,y:event.y}));
    else if(event.type==='wave'&&(s.phase==='ready'||event.bonus>0))assert.ok(s.callWave());
  }
  assert.deepEqual([s.phase,s.tick,s.gold,s.kills,s.lives],['running',tick,gold,kills,lives]);assert.equal(s.events.filter(e=>e.type==='fireball').length,5);
  if(trace.powerUpgrades.reinforcements>0)assert.equal(s.soldiers[0].reinforcementRank,1);
});
