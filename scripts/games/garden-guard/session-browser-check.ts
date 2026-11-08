/** Open session-browser-check.html through Vite. This developer page is not a production entry. */
import Phaser from 'phaser';
import {Plant} from '../../../src/games/garden-guard/entities/Plant';
import {Zombie} from '../../../src/games/garden-guard/entities/Zombie';
import {settings} from '../../../src/games/garden-guard/state/settings';
import { PreloadScene } from '../../../src/games/garden-guard/scenes/PreloadScene';
import { MainMenuScene } from '../../../src/games/garden-guard/scenes/MainMenuScene';
import { GameScene } from '../../../src/games/garden-guard/scenes/GameScene';
import { gardenSessionSchema, type GardenSession } from '../../../src/games/garden-guard/state/session-data';
import { busyPoolSession,busyNightSession, freshSession, exampleZombie } from '../../../tests/games/garden-guard/fixtures/session';
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
  check('pool: stacked Lily Pads, six lanes, swim gait and Squash mid-jump continue identically',()=>roundTrip(busyPoolSession(),300));
  check('pool: bare water rejects plants without spending sun; Lily Pad supports one defender',()=>{
    const data=freshSession(21);data.sun=300;const scene=open(data);
    equal(scene.plantAt('peashooter',0,2),false,'bare water rejection');equal(capture(scene).sun,300,'rejection costs nothing');
    equal(scene.plantAt('lilypad',0,0),false,'land rejects Lily Pad');
    equal(scene.plantAt('lilypad',0,2),true,'pad placement');equal(capture(scene).sun,275,'pad cost');
    equal(scene.plantAt('peashooter',0,2),true,'defender on pad');equal(capture(scene).sun,175,'defender cost');
    equal(scene.plantAt('wallnut',0,2),false,'one main defender per pad');
    const defender=scene.children.list.find((p):p is Plant=>p instanceof Plant&&p.plantType==='peashooter');defender?.remove();
    equal(capture(scene).plants.map(p=>p.type),['lilypad'],'removing top leaves pad');
  });
  check('pool: zombies eat the defender first, then the Lily Pad',()=>{
    const data=freshSession(21);if(data.waves.director.kind!=='standard')throw new Error('Wrong director');data.waves.director.countdown=100000;
    data.plants=[{type:'lilypad',col:1,row:2,hp:4,behavior:{kind:'idle'}},{type:'wallnut',col:1,row:2,hp:4,behavior:{kind:'idle'}}];
    data.zombies=[{...exampleZombie('basic',2,'pool'),x:256}];const scene=open(data);step(2);
    equal(capture(scene).plants.map(p=>p.type),['lilypad'],'defender consumed first');step(2);equal(capture(scene).plants.length,0,'pad consumed second');
  });
  check('pool: destroying a support removes its defender and cannot leave a floating plant',()=>{
    const scene=open(busyPoolSession());const pad=scene.children.list.find((p):p is Plant=>p instanceof Plant&&p.plantType==='lilypad'&&p.col===0&&p.row===2);pad?.takeDamage(9999);
    if(capture(scene).plants.some(p=>p.col===0&&p.row===2))throw new Error('Unsupported defender survived');
  });
  check('pool: Squash waits for its jump, crushes nearby armor once, and leaves the Lily Pad',()=>{
    const data=freshSession(22);if(data.waves.director.kind!=='standard')throw new Error('Wrong director');data.waves.director.countdown=100000;
    data.plants=[{type:'lilypad',col:3,row:2,hp:300,behavior:{kind:'idle'}},{type:'squash',col:3,row:2,hp:300,behavior:{kind:'squash',phase:'idle',remainingMs:0,targetX:0}}];
    data.zombies=[{...exampleZombie('buckethead',2,'pool'),x:600},{...exampleZombie('basic',2,'pool'),x:600}];
    const scene=open(data);step(80);equal(capture(scene).zombies.length,2,'jump preparation does no premature damage');
    step(14);equal(capture(scene).zombies.length,0,'one area crush');equal(capture(scene).plants.map(p=>p.type),['lilypad'],'Squash consumed, support retained');
    roundTrip(capture(scene),100);
  });
  check('pool: no water spawns in the first five waves, and water eligibility survives save/restore',()=>{
    let data=freshSession(22);let scene:GameScene|undefined;
    for(let wave=0;wave<6;wave++){
      if(data.waves.director.kind!=='standard')throw new Error('Wrong director');data.waves.director.countdown=1;
      scene=open(data);step(1);data=capture(scene);
      if(data.zombies.some(z=>(z.row===2||z.row===3)&&z.wave<5))throw new Error('Early swimmer');
    }
    roundTrip(data,100);
  });
  check('pool: water freezing lasts three seconds and water mowers sink near the edge',()=>{
    const data=freshSession(21);data.zombies=[exampleZombie('basic',2,'pool')];
    data.mowers[2]={row:2,x:120,used:true,moving:true,visible:true};const scene=open(data);
    const z=scene.children.list.find((p):p is Zombie=>p instanceof Zombie);if(!z)throw new Error('No swimmer');z.freeze();
    equal(z.freezeRemainingMs,3000,'source pool freeze');step(1);equal(capture(scene).mowers[2].visible,false,'unupgraded water mower sinks');
    roundTrip(capture(scene),160);
  });
  check('pool: pending final emergence creates exactly two eligible swimmers after two seconds',()=>{
    const data=freshSession(22);if(data.waves.director.kind!=='standard')throw new Error('Wrong director');data.waves.director.index=19;data.waves.riseTicks=200;
    const scene=open(data);step(99);equal(capture(scene).zombies.length,0,'emergence waits');step(1);
    const after=capture(scene);equal(after.zombies.length,2,'two swimmers');equal(after.zombies.map(z=>z.emergenceTotal),[500,500],'pool emergence is 50 ticks');
    if(after.zombies.some(z=>z.row!==2&&z.row!==3||!['basic','conehead','buckethead'].includes(z.type)||z.x<704||z.x>1216))throw new Error('Wrong pool emergence');
    roundTrip(after,150);
  });
  check('pool: daytime mushrooms remain asleep while sky sun and supported defenders continue',()=>{
    const data=freshSession(21);data.seeds=['lilypad','puffshroom','sunshroom','peashooter'];data.seedBank=data.seeds.map(type=>({type,stock:0,remainingMs:0,totalMs:7500}));
    data.plants=[{type:'puffshroom',col:0,row:0,hp:300,behavior:{kind:'shooter',cooldown:1,remainder:0,shots:[]}},{type:'sunshroom',col:0,row:1,hp:300,behavior:{kind:'sunshroom',age:0,timer:0,next:500}}];
    data.zombies=[exampleZombie('basic',0)];const scene=open(data);step(100);
    equal(capture(scene).plants,data.plants,'sleeping mushroom timers');equal(capture(scene).projectiles.length,0,'no sleeping shots');
  });
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
  check('Doom-shroom mid-fuse restores blast, crater and surviving defenses identically',()=>{
    const data=freshSession(19);data.plants=[{type:'doomshroom',col:3,row:2,hp:300,behavior:{kind:'doom',fuse:730}}];
    data.zombies=[{...exampleZombie('screendoor',2),x:650},{...exampleZombie('basic',4),x:1200}];
    roundTrip(data,150);
  });
  check('Doom burns armored and rising hostiles once, spares allies and leaves a blocked crater',()=>{
    const data=freshSession(19);if(data.waves.director.kind!=='standard')throw new Error('Wrong director');data.waves.director.countdown=100000;
    data.plants=[{type:'doomshroom',col:3,row:2,hp:300,behavior:{kind:'doom',fuse:0}},
      {type:'puffshroom',col:2,row:1,hp:300,behavior:{kind:'shooter',cooldown:100,remainder:0,shots:[]}}];
    data.zombies=[{...exampleZombie('screendoor',2),x:650},
      {...exampleZombie('basic',2),x:700,allies:true},
      {...exampleZombie('basic',1),x:650,emergenceTotal:1500,emergenceMs:1400},
      {...exampleZombie('basic',4),x:1250}];
    const scene=open(data);step(49);equal(capture(scene).craters.length,0,'no early explosion');
    step(1);const after=capture(scene);
    equal(after.plants.map(p=>p.type),['puffshroom'],'one shot without destroying nearby plants');
    equal(after.zombies.length,2,'armored and emerging enemies removed');
    if(!after.zombies.some(z=>z.allies)||!after.zombies.some(z=>!z.allies&&z.row===4))throw new Error('Wrong blast targets');
    equal(after.craters.map(c=>[c.col,c.row,c.remainingMs]),[[3,2,180000]],'three-minute crater');
    if(gardenSessionSchema.safeParse({...after,plants:[...after.plants,{type:'puffshroom',col:3,row:2,hp:300,behavior:{kind:'shooter',cooldown:100,remainder:0,shots:[]}}]}).success)throw new Error('Save accepted planting in crater');
    roundTrip(after,200);
  });
  check('night conveyor restores its next supply, weighted random stream and inventory',()=>{
    const data=freshSession(20);if(data.waves.director.kind!=='standard')throw new Error('Wrong director');data.waves.director.countdown=100000;
    data.supplyTimer=30;data.supplyIndex=3;data.seedBank[2].stock=3;
    roundTrip(data,600);
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
  for(const [name,data] of [['day',freshSession(4)],['bowling',freshSession(5)],['conveyor',freshSession(10)],['night finale',freshSession(20)],['pool',busyPoolSession()],['whack',freshSession(15)],['busy night',busyNightSession()],['frozen dancers',nightDiagnostic(true)]] as const){
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
  check('manual zombie bodies preserve collision outcomes without velocity integration',()=>{
    for(const data of [busyNightSession(),nightDiagnostic(true),busyPoolSession()]){
      const reference=open(data);
      for(const z of reference.children.list)if(z instanceof Zombie&&z.body instanceof Phaser.Physics.Arcade.Body)z.body.moves=true;
      const expected:GardenSession[]=[];for(let frame=0;frame<200;frame++){step(1);expected.push(capture(reference));}
      const optimized=open(data);for(let frame=0;frame<200;frame++){step(1);equal(capture(optimized),expected[frame],'body integration parity frame '+frame);}
    }
  });
  check('drawing grounded sprites and toggling motion never mutates gameplay or collision bodies',()=>{
    const scene=open(busyNightSession());step(1);game.pause();
    const checkpoint=capture(scene),bodies=projectileBodies(scene);
    const transforms=()=>scene.children.list.filter((child):child is Plant|Zombie=>child instanceof Plant||child instanceof Zombie).map(p=>[p.x,p.y,p.originX,p.originY,p.scaleX,p.scaleY,p.rotation]);
    const before=transforms(),prior=settings.current.spriteMotion;
    try{
      for(const enabled of [true,false,true]){
        settings.set('spriteMotion',enabled);game.renderer.preRender();game.scene.render(game.renderer);game.renderer.postRender();
        equal(capture(scene),checkpoint,'render keeps full saved state');equal(projectileBodies(scene),bodies,'render keeps physics');equal(transforms(),before,'render restores every transform');
      }
    }finally{settings.set('spriteMotion',prior);game.resume();}
  });
  check('Cherry Bomb swelling respects the half-scale original-art export',()=>{
    const data=freshSession(3);data.plants=[{type:'cherrybomb',col:1,row:2,hp:300,behavior:{kind:'cherry',fuse:1000}}];
    const scene=open(data);step(1);const cherry=scene.children.list.find((p):p is Plant=>p instanceof Plant&&p.plantType==='cherrybomb');
    if(!cherry||cherry.displayWidth>173||cherry.displayWidth<128)throw new Error('Cherry Bomb swelling uses the wrong art scale');
    roundTrip(capture(scene),5);
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
  for(const speed of [1,2] as const)check(`${speed}× background steps match foreground play without rendering or double stepping`,()=>{
    const prior=settings.current.gameSpeed;
    try {
      settings.set('gameSpeed',speed);const data=busyNightSession(),normal=open(data);step(100);const expected=capture(normal);
      const background=open(data);background.backgroundDriven=true;const before=capture(background);
      step(10);equal(capture(background),before,'RAF does not duplicate background progression');
      let renders=0;const rendered=()=>renders++;game.events.on(Phaser.Core.Events.POST_RENDER,rendered);
      try{for(let i=0;i<100;i++)background.stepInBackground(20);}finally{game.events.off(Phaser.Core.Events.POST_RENDER,rendered);}
      equal(renders,0,'No Canvas render in background');equal(capture(background),expected,'Same complete gameplay state');
      game.pause();background.stepInBackground(100);equal(capture(background),expected,'Open menu blocks background simulation');game.resume();background.backgroundDriven=false;
    }finally{settings.set('gameSpeed',prior);if(game.isPaused)game.resume();}
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
