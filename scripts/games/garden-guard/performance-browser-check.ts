import Phaser from 'phaser';
import {PreloadScene} from '../../../src/games/garden-guard/scenes/PreloadScene';
import {MainMenuScene} from '../../../src/games/garden-guard/scenes/MainMenuScene';
import {GameScene} from '../../../src/games/garden-guard/scenes/GameScene';
import {gamePerformance as perf} from '../../../src/games/garden-guard/diagnostics/performance';
import {freshSession,exampleZombie} from '../../../tests/games/garden-guard/fixtures/session';
import {gardenSessionSchema,type GardenSession} from '../../../src/games/garden-guard/state/session-data';
import {createSessionStore} from '../../../src/games/garden-guard/state/storage';
import {GRID} from '../../../src/games/garden-guard/constants';
const results=document.querySelector<HTMLPreElement>('#results')!,button=document.querySelector<HTMLButtonElement>('#run')!;
const game=new Phaser.Game({type:Phaser.CANVAS,parent:'game-root',width:1280,height:960,audio:{noAudio:true},scale:{mode:Phaser.Scale.FIT},physics:{default:'arcade',arcade:{gravity:{x:0,y:0}}},scene:[PreloadScene,MainMenuScene,GameScene]});
let start=0,update=0,render=0;
const costs:{update:number;render:number;save:number}[]=[];
let remaining=0,frames=0,saveCost=0;
// Exercise the real validation / JSON / synchronous storage path, in memory.
// The real-device performance panel measures actual localStorage separately.
const store=createSessionStore({getItem:()=>null,setItem:()=>{},removeItem:()=>{}});
function busy():GardenSession {
 const s=freshSession(10);s.graves=[];s.sun=999;
 for(let row=0;row<5;row++)for(let col=0;col<7;col++)s.plants.push({type:col%2?'repeater':'snowpea',col,row,hp:300,behavior:{kind:'shooter',cooldown:25+col*10,remainder:0,shots:[]}});
 for(let row=0;row<5;row++)for(let n=0;n<16;n++)s.zombies.push({...exampleZombie('buckethead',row),x:1000+n*12});
 for(let row=0;row<5;row++)for(let n=0;n<25;n++)s.projectiles.push({x:220+n*29,y:GRID.originY+(row+.5)*160-35,texture:'pea',velocityX:532.8,velocityY:0,row,damage:20,slowFactor:null,slowMs:null,expiresMs:null,originX:200});
 return gardenSessionSchema.parse(s);
}
function run():void {
 game.scene.stop('menu');game.scene.stop('game');game.scene.start('game',{resume:busy()});
 costs.length=0;perf.history.clear();perf.resetClock();frames=0;remaining=420;button.disabled=true;results.textContent='Measuring 35 shooters, 80 armored zombies, and 125 initial projectiles…';
}
game.events.on(Phaser.Core.Events.PRE_STEP,()=>{start=performance.now();perf.begin(remaining>0);});
game.events.on(Phaser.Core.Events.POST_STEP,()=>{
 if(!remaining)return;
 saveCost=0;
 if(frames%120===0){const t=performance.now();const scene=game.scene.getScene('game');if(scene instanceof GameScene){const s=scene.captureSession();if(s)store.write(s);}saveCost=performance.now()-t;}
 update=performance.now()-start;perf.endUpdate();
});
game.events.on(Phaser.Core.Events.PRE_RENDER,()=>{render=performance.now();perf.beginRender();});
game.events.on(Phaser.Core.Events.POST_RENDER,()=>{
 perf.endRender();if(!remaining)return;
 if(frames++>=60)costs.push({update,render:performance.now()-render,save:saveCost});
 if(--remaining===0){
  const stats=(key:'update'|'render'|'save')=>{const a=costs.map(c=>c[key]).filter(n=>key!=='save'||n>0).sort((a,b)=>a-b);return {mean:a.reduce((s,n)=>s+n,0)/a.length,p95:a[Math.ceil(a.length*.95)-1],max:a[a.length-1]};};
  const scene=game.scene.getScene('game');
  results.textContent=JSON.stringify({board:scene instanceof GameScene?scene.performanceCounts:null,frames:costs.length,update:stats('update'),render:stats('render'),save:stats('save'),detailed:perf.history.snapshot()},null,2);button.disabled=false;button.textContent='Run again';
 }
});
game.events.once('assets-ready',()=>{button.disabled=false;button.textContent='Run benchmark';button.onclick=run;run();});
