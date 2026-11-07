import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WaveDirector, type WavePort } from '../src/wave-director';
import { LEVELS } from '../src/levels';
import { ZOMBIE_DEFS } from '../src/constants';

function setup(level = 1) {
  const enemies: {wave:number; hp:number}[] = [];
  const starts: number[] = []; let completed = 0;
  const port: WavePort = {
    spawn(type,wave) { const def = ZOMBIE_DEFS[type]; const hp = def.hp + def.armorHp; enemies.push({wave,hp}); return hp; },
    health(wave) { return enemies.filter(e=>e.wave===wave).reduce((sum,e)=>sum+e.hp,0); },
    liveCount() { return enemies.filter(e=>e.hp>0).length; },
    start(wave) { starts.push(wave); }, complete() { completed++; },
  };
  const director = new WaveDirector(LEVELS[level-1].waves,port,()=>0.5);
  const run = (ms:number) => { for(let t=0;t<ms;t+=20) director.update(20); };
  return {director,enemies,starts,run,get completed(){return completed;}};
}
test('waves overlap after damage without requiring the whole lawn to clear',()=>{
  const game=setup();game.run(18100);
  assert.equal(game.starts.length,1); assert.equal(game.enemies.length,1);
  game.enemies[0].hp=80;game.run(6500);
  assert.equal(game.starts.length,2); assert.ok(game.enemies[0].hp>0);
});
test('timeouts advance even when the player does no damage',()=>{
  const game=setup();game.run(18100);game.run(28000);
  assert.ok(game.starts.length>=2);assert.equal(game.completed,0);
});
test('all ten levels finish exactly once only after the last enemy is defeated',()=>{
  for(const level of LEVELS){
    const game=setup(level.id);
    for(let t=0;t<20*60*1000;t+=20){
      game.director.update(20);
      if(game.starts.length===level.waves.length) break;
      for(const enemy of game.enemies) enemy.hp=0;
    }
    game.run(30000);
    assert.equal(game.starts.length,level.waves.length,level.name);
    assert.equal(game.completed,0,'must not win with final enemies alive');
    for(const enemy of game.enemies)enemy.hp=0;
    game.run(5000);assert.equal(game.completed,1);game.run(5000);assert.equal(game.completed,1);
  }
});
test('stopping a run prevents later wave callbacks',()=>{
  const game=setup();game.director.stop();game.run(100000);assert.equal(game.starts.length,0);
});
