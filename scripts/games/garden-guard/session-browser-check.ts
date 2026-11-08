/** Open session-browser-check.html through Vite. This developer page is not a production entry. */
import Phaser from 'phaser';
import {Zombie} from '../../../src/games/garden-guard/entities/Zombie';
import {settings} from '../../../src/games/garden-guard/state/settings';
import { PreloadScene } from '../../../src/games/garden-guard/scenes/PreloadScene';
import { MainMenuScene } from '../../../src/games/garden-guard/scenes/MainMenuScene';
import { GameScene } from '../../../src/games/garden-guard/scenes/GameScene';
import { gardenSessionSchema, type GardenSession } from '../../../src/games/garden-guard/state/session-data';
import { busyNightSession, freshSession, exampleZombie } from '../../../tests/games/garden-guard/fixtures/session';
import {nightDiagnostic} from '../../../src/games/garden-guard/diagnostics/night-scenarios';
import { GRID } from '../../../src/games/garden-guard/constants';
import { LEVELS } from '../../../src/games/garden-guard/levels';

const results = document.querySelector<HTMLPreElement>('#results')!;
const button = document.querySelector<HTMLButtonElement>('#run')!;
const game = new Phaser.Game({ type: Phaser.CANVAS, parent: 'game-root', width: 1280, height: 960,
  scale: { mode: Phaser.Scale.FIT }, audio: { noAudio: true },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } }, scene: [PreloadScene, MainMenuScene, GameScene] });
let now = 0;
function open(data: GardenSession): GameScene {
  game.scene.stop('menu');game.scene.stop('game');game.scene.start('game', { resume: JSON.parse(JSON.stringify(data)) });
  const scene = game.scene.getScene('game');
  if (!(scene instanceof GameScene)) throw new Error('Game scene missing');
  // Phaser normally uses Date.now for tweens. Drive the real tween manager with
  // the same fixed delta as the rest of the engine for reproducible checks.
  scene.tweens.getDelta = () => 20;
  return scene;
}
function step(frames: number): void { for (let i = 0; i < frames; i++) game.step(now += 20, 20); }
function capture(scene: GameScene): GardenSession {
  const value = scene.captureSession();if (!value) throw new Error('Unexpected finished session');
  return { ...value, savedAt: 0 };
}
function projectileBodies(scene:GameScene) {
  return scene.children.list.filter((child):child is Phaser.Physics.Arcade.Image=>child instanceof Phaser.Physics.Arcade.Image).map(pea=>{
    const body=pea.body as Phaser.Physics.Arcade.Body;
    return {x:pea.x,y:pea.y,bodyX:body.x,bodyY:body.y,width:body.width,height:body.height,radius:body.radius,circle:body.isCircle,enable:body.enable};
  });
}
function equal(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) {
    let index = 0;while (index < a.length && a[index] === b[index]) index++;
    throw new Error(`${label}: first difference at ${index}\nactual: ${a.slice(Math.max(0,index-90),index+160)}\nexpected: ${b.slice(Math.max(0,index-90),index+160)}`);
  }
}
function roundTrip(data: GardenSession, frames: number): void {
  const before = open(data);step(1);const checkpoint = capture(before);
  const expected:GardenSession[]=[];
  const bodies:unknown[]=[];
  const peas:unknown[]=[];
  for(let frame=0;frame<frames;frame++){step(1);expected.push(capture(before));bodies.push(before.diagnostics.zombies.filter(z=>z.row===0));peas.push(projectileBodies(before));}
  const restored = open(checkpoint);
  equal(capture(restored), checkpoint, 'immediate round trip');
  for(let frame=0;frame<frames;frame++){
    const priorPeas=projectileBodies(restored);
    step(1);
    try {equal(capture(restored), expected[frame], `continued gameplay frame ${frame+1}`);}
    catch(error){throw new Error(`${error instanceof Error?error.message:String(error)}\nactual body: ${JSON.stringify(restored.diagnostics.zombies.filter(z=>z.row===0))}\nexpected body: ${JSON.stringify(bodies[frame])}\nprior actual peas: ${JSON.stringify(priorPeas)}\nprior expected peas: ${JSON.stringify(peas[frame-1])}`);}
  }
}
function run(): void {
  button.disabled = true;results.textContent = '';
  let passed = 0, failed = 0;
  const check = (name: string, action: () => void) => {
    try { action();results.textContent += `PASS ${name}\n`;passed++; }
    catch (error) { results.textContent += `FAIL ${name}\n${error instanceof Error ? error.stack : String(error)}\n`;failed++; }
  };
  for (const level of LEVELS) check(`level ${level.name}: ${level.mode} round trip and 2s continuation`, () => roundTrip(freshSession(level.id), 100));
  check('busy night: plant timers, vault, hypnosis allies, slowing, sun flight, projectiles and cooldowns', () => roundTrip(busyNightSession(), 80));
  check('bowling: rolling hit history and partial lane bounce', () => {
    const data = freshSession(5);data.zombies = [exampleZombie('buckethead', 1)];
    data.rolling = [{ x: 800, y: 400, row: 2, angle: 90, hits: [0], bounce: { fromY: 380, elapsed: 80 } }];
    roundTrip(gardenSessionSchema.parse(data), 30);
  });
  check('night: pending final grave rise survives restoration', () => {
    const data = freshSession(14);
    if (data.waves.director.kind !== 'standard') throw new Error('Wrong director');
    data.waves.director.index = LEVELS[13].waves.length - 1;data.waves.riseTicks = 80;
    roundTrip(data, 70);
  });
  check('dancer entry, four linked backups and continued summoning',()=>roundTrip(nightDiagnostic(),300));
  check('frozen dancer group thaws identically after restoration',()=>roundTrip(nightDiagnostic(true),350));
  check('a dying backup is replaced without breaking restored dancer links',()=>{
    const data=nightDiagnostic(true);data.zombies[3].hp=1;data.zombies[3].headless=true;data.zombies[3].frozenMs=0;roundTrip(data,500);
  });
  check('Ice-shroom mid-fuse restores and freezes the same enemies',()=>{
    const data=nightDiagnostic();data.plants.push({type:'iceshroom',col:1,row:4,hp:300,behavior:{kind:'ice',fuse:730}});roundTrip(data,150);
  });
  check('crater countdown and removal continue after restoration',()=>{
    const data=nightDiagnostic();data.craters=[{col:2,row:4,remainingMs:30}];roundTrip(data,10);
  });
  check('rising backup dancers do not absorb normal projectiles',()=>{
    const data=nightDiagnostic(true);data.zombies[1].frozenMs=0;data.zombies[1].emergenceTotal=1500;data.zombies[1].emergenceMs=1000;
    data.projectiles=[{texture:'pea',x:800,y:350,row:1,velocityX:532.8,velocityY:0,damage:20,slowFactor:null,slowMs:null,expiresMs:null,originX:800}];
    const scene=open(data);step(5);equal(capture(scene).zombies.find(z=>z.type==='backup'&&z.row===1)?.hp,270,'rising backup health');
  });
  check('Cherry Bombs spare hypnosis allies',()=>{
    const data=nightDiagnostic();data.zombies[0].allies=true;
    data.plants.push({type:'cherrybomb',col:6,row:2,hp:300,behavior:{kind:'cherry',fuse:1190}});
    const scene=open(data);step(2);equal(capture(scene).zombies.find(z=>z.type==='dancer'&&z.allies)?.hp,500,'allied bomb survival');
  });
  check('moving mowers spare hypnosis allies and their allied backups',()=>{
    const data=nightDiagnostic();data.zombies[0].allies=true;data.mowers[2]={row:2,x:850,used:true,moving:true,visible:true};
    const scene=open(data);step(50);const survivors=capture(scene).zombies;
    equal(survivors.find(z=>z.type==='dancer'&&z.allies)?.hp,500,'allied mower survival');
    if(survivors.some(z=>!z.allies))throw new Error('Summoned followers lost allegiance');
  });
  check('opponent shortcut immediately registers a newly hypnotized zombie',()=>{
    const data=freshSession(16),x=GRID.originX+4.5*GRID.tileWidth;
    data.plants=[{type:'hypnoshroom',col:4,row:2,hp:300,behavior:{kind:'idle'}}];
    data.zombies=[{...exampleZombie('basic',2),x},{...exampleZombie('basic',2),x:x+50}];
    const scene=open(data);step(6);const zombies=capture(scene).zombies;
    const ally=zombies.find(z=>z.allies),enemy=zombies.find(z=>!z.allies);
    if(!ally||!enemy||ally.hp>=270||enemy.hp>=270)throw new Error('New hypnosis ally was not found by combat targeting');
    roundTrip(capture(scene),30);
  });
  check('opponent shortcut retains restored target ordering with multiple allies',()=>{
    const data=freshSession(16);
    data.zombies=[{...exampleZombie('basic',2),x:800},
      {...exampleZombie('basic',2),x:750,allies:true},{...exampleZombie('basic',2),x:755,allies:true}];
    const scene=open(data);step(2);const zombies=capture(scene).zombies;
    if(zombies[1].hp>=270||zombies[2].hp!==270)throw new Error('Enemy selected the wrong ally');
    roundTrip(capture(scene),40);
  });
  for(const [name,data] of [['day',freshSession(4)],['bowling',freshSession(5)],['conveyor',freshSession(10)],['whack',freshSession(15)],['busy night',busyNightSession()],['frozen dancers',nightDiagnostic(true)]] as const){
    check(`2× ${name}: half as many rendered frames produces identical gameplay`,()=>{
      const prior=settings.current.gameSpeed;
      try {
        settings.set('gameSpeed',1);const normal=open(data);step(200);const expected=capture(normal);
        settings.set('gameSpeed',2);const fast=open(data);step(100);equal(capture(fast),expected,'1× versus 2× full state');
      }finally{settings.set('gameSpeed',prior);}
    });
  }
  check('2× frozen-group resume and switching back to 1× preserve progress',()=>{
    const prior=settings.current.gameSpeed;
    try{
      settings.set('gameSpeed',2);roundTrip(nightDiagnostic(true),200);
      const paused=open(busyNightSession());step(1);const beforePause=capture(paused);
      game.pause();step(100);equal(capture(paused),beforePause,'2× pause freezes every system');game.resume();
      const scene=open(busyNightSession());step(30);const checkpoint=capture(scene);
      settings.set('gameSpeed',1);step(50);const expected=capture(scene);
      const restored=open(checkpoint);step(50);equal(capture(restored),expected,'speed switch and restore');
    }finally{settings.set('gameSpeed',prior);}
  });
  check('Wall-nut takes 40 seconds of a lone normal zombie eating before disappearing',()=>{
    const data=freshSession(6);if(data.waves.director.kind!=='standard')throw new Error('Wrong director');data.waves.director.countdown=100000;
    data.plants=[{type:'wallnut',col:3,row:2,hp:4000,behavior:{kind:'idle'}}];
    data.zombies=[{...exampleZombie('basic',2),x:GRID.originX+3.5*GRID.tileWidth}];
    const scene=open(data);step(500);equal(capture(scene).plants[0]?.hp,3000,'10 seconds of chewing');
    step(1500);equal(capture(scene).plants.length,0,'Wall-nut consumed after 40 seconds');
  });
  check('Potato Mine waits 15 seconds, explodes once, and removes itself',()=>{
    const data=freshSession(6);if(data.waves.director.kind!=='standard')throw new Error('Wrong director');data.waves.director.countdown=100000;
    data.plants=[{type:'potatomine',col:3,row:2,hp:300,behavior:{kind:'mine',timer:0,armed:false}}];data.zombies=[{...exampleZombie('buckethead',2),x:1250}];
    const scene=open(data);step(749);const before=capture(scene).plants[0];
    if(before?.behavior.kind!=='mine'||before.behavior.armed)throw new Error('Mine armed too early');
    step(1);const armed=capture(scene).plants[0];if(armed?.behavior.kind!=='mine'||!armed.behavior.armed)throw new Error('Mine failed to arm at 15 seconds');
    const zombie=scene.children.list.find((z):z is Zombie=>z instanceof Zombie);if(!zombie)throw new Error('Target missing');zombie.x=GRID.originX+3.5*GRID.tileWidth;
    step(1);const after=capture(scene);equal(after.plants.length,0,'Mine consumed');equal(after.zombies.length,0,'Armored target destroyed');
    step(50);equal(capture(scene).plants.length,0,'Mine did not regenerate');
  });
  check('unarmed Potato Mine can be eaten before it activates',()=>{
    const data=freshSession(6);if(data.waves.director.kind!=='standard')throw new Error('Wrong director');data.waves.director.countdown=100000;
    data.plants=[{type:'potatomine',col:3,row:2,hp:300,behavior:{kind:'mine',timer:0,armed:false}}];data.zombies=[{...exampleZombie('basic',2),x:GRID.originX+3.5*GRID.tileWidth}];
    const scene=open(data);step(50);equal(capture(scene).plants[0]?.hp,200,'Unarmed mine takes bite damage');
    step(110);const after=capture(scene);equal(after.plants.length,0,'Unarmed mine eaten');equal(after.zombies[0]?.hp,270,'No premature explosion');
  });
  check('paused restored level consumes no plant, wave, pickup or projectile time',()=>{
    const scene=open(busyNightSession());step(1);const before=capture(scene);
    game.pause();step(1000);equal(capture(scene),before,'pause freeze');
    scene.resumeTweenClock();game.resume();step(1);
  });
  results.textContent += `\n${passed} passed; ${failed} failed.\n`;
  button.textContent = 'Run checks again';button.disabled = false;
  game.scene.stop('game');
}
button.onclick = run;
game.events.once('assets-ready', () => setTimeout(() => { game.loop.sleep();run(); }, 0));
