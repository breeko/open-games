import Phaser from 'phaser';
import {PreloadScene} from '../../../src/games/garden-guard/scenes/PreloadScene';
import {MainMenuScene} from '../../../src/games/garden-guard/scenes/MainMenuScene';
import {GameScene} from '../../../src/games/garden-guard/scenes/GameScene';
import {freshSession,exampleZombie} from '../../../tests/games/garden-guard/fixtures/session';
import {settings} from '../../../src/games/garden-guard/state/settings';
import type {GameSpeed} from '../../../src/games/garden-guard/simulation-clock';
const results=document.querySelector<HTMLPreElement>('#results')!,button=document.querySelector<HTMLButtonElement>('#run')!;
const game=new Phaser.Game({type:Phaser.CANVAS,parent:'game-root',width:1280,height:960,audio:{noAudio:true},scale:{mode:Phaser.Scale.FIT},physics:{default:'arcade',arcade:{gravity:{x:0,y:0}}},scene:[PreloadScene,MainMenuScene,GameScene]});
let now=0;
interface Trace {pea:Phaser.Physics.Arcade.Image;x:number;y:number;born:number;draws:number;dead?:{x:number;y:number;step:number};}
function runScenario(speed:GameSpeed,delta:number,synchronized:boolean,threepeater=false){
 settings.set('gameSpeed',speed);
 const s=freshSession(threepeater?23:10);s.graves=[];
 for(let row=0;row<5;row++)for(let col=0;col<7;col++){if(threepeater&&(row===2||row===3))s.plants.push({type:'lilypad',col,row,hp:300,behavior:{kind:'idle'}});s.plants.push({type:threepeater?'threepeater':col%2?'repeater':'snowpea',col,row,hp:300,behavior:{kind:'shooter',cooldown:synchronized?1:1+col*10+row*3,remainder:0,shots:[]}});}
 for(let row=0;row<5;row++)for(let n=0;n<16;n++)s.zombies.push({...exampleZombie('buckethead',row,threepeater?'pool':'day'),x:1190+n*10});
 game.scene.stop('menu');game.scene.stop('game');game.scene.start('game',{resume:s});
 const scene=game.scene.getScene('game');if(!(scene instanceof GameScene))throw new Error('No scene');
 let frame=0;const traces:Trace[]=[];
 const observe=(child:Phaser.GameObjects.GameObject)=>{
  if(!(child instanceof Phaser.Physics.Arcade.Image)||!['pea','icepea','puff'].includes(child.texture.key))return;
  const trace:Trace={pea:child,x:child.x,y:child.y,born:frame,draws:0};traces.push(trace);
  child.once(Phaser.GameObjects.Events.DESTROY,()=>{trace.dead={x:child.x,y:child.y,step:frame};});
 };scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE,observe);
 let missing=0,badPositions=0,peak=0;const samples:object[]=[];
 for(;frame<Math.ceil(6000/delta/speed);frame++){
  game.step(now+=delta,delta);
  const drawn=new Set(scene.cameras.main.renderList);let live=0;
  for(const t of traces){
   if(t.dead)continue;live++;
   const p=t.pea;
   if(drawn.has(p))t.draws++;
   if(p.x<0||p.y<0||p.y>960||!Number.isFinite(p.x)||!Number.isFinite(p.y)){badPositions++;if(samples.length<5)samples.push({kind:'position',from:[t.x,t.y],to:[p.x,p.y],born:t.born,frame});}
   if(p.x<1250&&p.active&&!drawn.has(p)){missing++;if(samples.length<5)samples.push({kind:'missing',from:[t.x,t.y],to:[p.x,p.y],alpha:p.alpha,visible:p.visible,flags:p.renderFlags,texture:p.texture.key,born:t.born,frame});}
  }
  peak=Math.max(peak,live);
 }
 scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE,observe);
 const unseen=traces.filter(t=>t.dead&&t.draws===0);
 return {speed,delta,synchronized,threepeater,spawned:traces.length,peak,missing,badPositions,unseen:unseen.length,samples,unseenSamples:unseen.slice(0,3).map(t=>({from:[t.x,t.y],dead:t.dead}))};
}
function longPlayground(speed:GameSpeed,mode:'day'|'night'|'pool'){
 settings.set('gameSpeed',speed);game.scene.stop('menu');game.scene.stop('game');game.scene.start('game',{playground:true,playgroundMode:mode});
 const scene=game.scene.getScene('game');if(!(scene instanceof GameScene))throw new Error('No playground');
 scene.fillPlayground();const delta=1000/30;let quietDying=0,maxQuietTargets=0,quietTargets=0;
 for(let i=0;i<Math.ceil(180000/delta/speed);i++){
  game.step(now+=delta,delta);
  if(i%15===0){const r=scene.playgroundReport;if(r.projectiles?.live===0&&r.targets===0&&r.dying>0)quietDying++;if(r.projectiles?.live===0&&r.targets>0)quietTargets++;else quietTargets=0;maxQuietTargets=Math.max(maxQuietTargets,quietTargets*15*delta*speed);}
 }
 const check=scene.playgroundReport;
 if(check.plants!==(mode==='pool'?42:28)||!check.projectiles||check.projectiles.spawned<1000||check.projectiles.missingDraws||check.projectiles.removed.unexpected)throw new Error('Playground endurance invariant failed: '+JSON.stringify(check));
 return {test:'three-minute public playground',speed,mode,quietSamplesWithOnlyDyingZombies:quietDying,longestQuietWithTargetsMs:maxQuietTargets,...scene.playgroundReport};
}
function run(){button.disabled=true;results.textContent='';const prior=settings.current.gameSpeed;
 try {for(const speed of [1,2] as const)for(const delta of [16.67,33.34,66.67])for(const sync of [false,true]){const r=runScenario(speed,delta,sync);if(r.missing||r.badPositions||r.unseen)throw new Error('Projectile stress check failed: '+JSON.stringify(r));results.textContent+=JSON.stringify(r)+'\n';}
 for(const speed of [1,2] as const){const r=runScenario(speed,33.34,true,true);if(r.missing||r.badPositions||r.unseen)throw new Error('Threepeater projectile stress failed: '+JSON.stringify(r));results.textContent+=JSON.stringify(r)+'\n';}
 for(const speed of [1,2] as const)for(const mode of ['day','night','pool'] as const)results.textContent+=JSON.stringify(longPlayground(speed,mode))+'\n';}
 catch(error){results.textContent+='ERROR '+(error instanceof Error?error.stack:String(error));}
 finally{settings.set('gameSpeed',prior);button.disabled=false;button.textContent='Run again';}
}
button.onclick=run;game.events.once('assets-ready',()=>setTimeout(()=>{game.loop.sleep();run();},0));
