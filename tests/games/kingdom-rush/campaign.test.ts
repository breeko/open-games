import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Simulation,planWave} from '../../../src/games/kingdom-rush/simulation';
import {getLevel,LEVELS,type TowerKind} from '../../../src/games/kingdom-rush/content';
import {gameStores} from '../../../src/games/kingdom-rush/persistence';

test('campaign maps retain original Flash economy, wave totals, and independent geometry',()=>{
  assert.deepEqual(LEVELS.map(l=>[l.level,l.cash,l.groups.length,l.holders.length]),[[1,265,7,8],[2,220,7,7],[3,300,11,12]]);
  assert.deepEqual(LEVELS.map(l=>l.groups.reduce((n,g)=>n+g.waves.reduce((n,w)=>n+w.spawns.reduce((n,c)=>n+c.max,0),0),0)),[56,154,329]);
  for(const level of LEVELS)for(let i=0;i<level.groups.length;i++)for(const event of planWave(i,0,level).events)assert.ok(level.paths[event.route]);
  assert.throws(()=>getLevel(4));
  const southport=new Simulation(1,1),pagras=new Simulation(1,3);assert.equal(southport.build(12,'mage'),false);assert.equal(pagras.build(12,'mage'),true);
});

test('Southport enforces its original tier-one cap and tutorial power unlock waves',()=>{
  const s=new Simulation(1,1);s.build(7,'barrack');assert.equal(s.upgrade(7),false);s.callWave();
  const p=s.level.holders.find(h=>h.id===7)!.rally;
  assert.equal(s.cast('reinforcements',p),false);assert.equal(s.cast('fire',p),false);
  while(s.wave<3&&s.phase==='running')s.step();assert.equal(s.cast('reinforcements',p),true);assert.equal(s.cast('fire',p),false);
});

test('each map owns its saves and best result while retaining the existing Pagras keys',()=>{
  const data=new Map<string,string>();const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};
  const maps=LEVELS.map(l=>gameStores(storage,l.level));
  for(const level of LEVELS){const s=new Simulation(77,level.level);s.build(level.holders[0].id,'archer');s.callWave();for(let i=0;i<300;i++)s.step();const stores=maps[level.level-1];assert.equal(stores.session.write({version:1,savedAt:1,speed:1,battle:s.snapshot()}).status,'saved');stores.results.write(level.level);const loaded=stores.session.read();assert.equal(loaded.status,'valid');if(loaded.status==='valid'){const restored=Simulation.restore(loaded.value.battle,{paused:false});for(let i=0;i<90;i++){s.step();restored.step();}assert.deepEqual(restored.snapshot(),s.snapshot());}}
  assert.equal(maps[0].session.write({version:1,savedAt:2,speed:1,battle:new Simulation().snapshot()}).status,'invalid');
  maps[0].session.clear();assert.equal(maps[1].session.read().status,'valid');assert.equal(maps[2].session.key,'open-games.kingdom-rush.session.v1');
  assert.deepEqual(maps.map(s=>s.results.read()),[{status:'valid',value:1},{status:'valid',value:2},{status:'valid',value:3}]);
});

for(const id of [1,2] as const)test(`map ${id} supports a full mixed-defense campaign and seeded replay`,()=>{
  function run(){
    const s=new Simulation(12648430,id);
    const plan:[number,TowerKind][] =id===1?[[7,'barrack'],[5,'engineer'],[2,'archer'],[4,'mage'],[3,'archer'],[8,'engineer'],[6,'archer'],[1,'mage']]:[[4,'barrack'],[7,'engineer'],[3,'archer'],[2,'mage'],[6,'archer'],[5,'mage'],[1,'archer']];
    let cursor=0;
    while(s.tick<30000&&s.phase!=='won'&&s.phase!=='lost'){
      if(cursor<plan.length&&s.build(...plan[cursor]))cursor++;
      if(cursor>=plan.length&&id===2)for(const tower of s.towers)s.upgrade(tower.id);
      if(s.phase==='ready')s.callWave();
      if(s.phase==='running'&&s.tick%30===0){const rally=s.level.holders.find(h=>h.id===(id===1?7:4))!.rally;s.cast('reinforcements',rally);const target=s.enemies.filter(e=>e.hp>0&&!e.escaped).sort((a,b)=>(b.hp-a.hp)||s.remaining(a)-s.remaining(b))[0];if(target)s.cast('fire',target);}
      s.step();
    }
    return s;
  }
  const a=run(),b=run();assert.equal(a.phase,'won');assert.equal(a.wave,7);assert.deepEqual(a.snapshot(),b.snapshot());assert.equal(a.lives,id===1?20:18);
});

for(const id of [1,2])test(`map ${id} includes its background, terrain and visible unit/tower animations`,()=>{
  const root=new URL(`../../../public/games/kingdom-rush/assets/level0${id}/`,import.meta.url);
  const metadata: {frames:Record<string,{page:number;region:number[]}>;lookup:Record<string,string>;animations:Record<string,{prefix:string;frames:number[]}>}=JSON.parse(readFileSync(new URL('sprites.json',root),'utf8'));
  const scene:{visuals:Record<string,{name:string;prefix?:string;hidden?:boolean}[]>}=JSON.parse(readFileSync(new URL('scene.json',root),'utf8'));
  const png=readFileSync(new URL('background.png',root));assert.equal(png.readUInt32BE(16),1024);assert.equal(png.readUInt32BE(20),768);
  for(const [name,sprites] of Object.entries(scene.visuals)){
    if(!/^(tower_(archer|barrack|mage|engineer)_[12]|tower_holder_grass|enemy_(goblin|fat_orc|wolf_small)|soldier_(militia|footmen)|re_farmer)$/.test(name))continue;
    for(const sprite of sprites){if(sprite.hidden)continue;const animation=metadata.animations[sprite.prefix?`${sprite.prefix}_${sprite.name}`:sprite.name];const names=animation?animation.frames.map(n=>`${animation.prefix}_${String(n).padStart(4,'0')}`):[sprite.name.replace('%04i','0001')];for(const frame of names)assert.ok(metadata.frames[metadata.lookup[frame]??frame],`${name}: ${frame}`);}
  }
});
