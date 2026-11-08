import Phaser from 'phaser';
import {gamePerformance as perf, PERFORMANCE_SECTIONS} from './diagnostics/performance';
import './shell.css';
import { getDifficulty, setDifficulty, isDifficulty } from './difficulty';
import { settings } from './state/settings';
import { audio } from './audio/AudioManager';
import { LEVELS, TOTAL_LEVELS } from './levels';
import type {ZombieType} from './types';
import { GAME_HEIGHT, GAME_WIDTH, SEED_ORDER, PLANT_DEFS } from './constants';
import { CollectionScene } from './scenes/CollectionScene';
import { GameScene } from './scenes/GameScene';
import { HelpScene } from './scenes/HelpScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { PreloadScene } from './scenes/PreloadScene';
import { RewardScene } from './scenes/RewardScene';
import { SeedSelectScene } from './scenes/SeedSelectScene';
import { SettingsScene } from './scenes/SettingsScene';
import { createSessionStore } from './state/storage';
import type { GardenSession } from './state/session-data';
import { startAutosave } from '../../shared/persistence/autosave';

const sessionStore=createSessionStore(),initialSession=sessionStore.read();
let savingEnabled=initialSession.status==='valid'||initialSession.status==='missing';
let clearSessionPending=false,capturePending=false;
let lastSessionSaveAt=-Infinity;
const saveStatus=document.querySelector<HTMLElement>('#save-status')!;
function showSaveStatus(message:string):void {if(saveStatus.textContent!==message)saveStatus.textContent=message;}
if(initialSession.status==='invalid')showSaveStatus('Saved level could not resume and has been kept. Start a new level to replace it.');
else if(initialSession.status==='unavailable')showSaveStatus('Saving is unavailable. You can still play.');
function saveSession():void {
  if(game.scene.isActive('game')){const scene=game.scene.getScene('game');if(scene instanceof GameScene&&scene.isPlayground)return;}
  if(!savingEnabled)return;
  if(clearSessionPending){
    const result=sessionStore.clear();clearSessionPending=result.status!=='cleared';
    showSaveStatus(clearSessionPending?'Finished level could not be cleared.':'Level finished. Campaign progress stays saved.');return;
  }
  if(!game.scene.isActive('game'))return;
  const saveStart=performance.now();
  try {
    const scene=game.scene.getScene('game');if(!(scene instanceof GameScene))return;
    const saved=scene.captureSession();if(!saved)return;
    const result=sessionStore.write(saved);
    showSaveStatus(result.status==='saved'?'Level saved on this device.':result.status==='invalid'?'Level could not save. Previous save kept.':'Saving is unavailable. Your level continues in this tab.');
  }catch {showSaveStatus('Level could not save. Previous save kept.');}
  finally {lastSessionSaveAt=performance.now();perf.history.save(lastSessionSaveAt-saveStart);}
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  parent: 'game-root',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#101810',
  fps: { target: 60, min: 30 },
  render: {
    antialias: true,
    roundPixels: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [
    PreloadScene,
    MainMenuScene,
    LevelSelectScene,
    SeedSelectScene,
    CollectionScene,
    SettingsScene,
    HelpScene,
    GameScene,
    RewardScene,
  ],
};

const game = new Phaser.Game(config);
// Header wrapping and Safari's browser chrome can resize the available lawn
// without a window resize. Keep the canvas inside that actual rectangle.
const gameRoot=document.querySelector<HTMLElement>('#game-root')!;
new ResizeObserver(()=>{
  if(game.isBooted)game.scale.setParentSize(gameRoot.clientWidth,gameRoot.clientHeight);
}).observe(gameRoot);


// Dev-only handles so you can poke at the running game from the browser console
// (or a debugger). Stripped from production builds.
if (import.meta.env.DEV) {
  Object.assign(window, { game, audio });
}

// Touch controls live outside the scaled canvas so they stay comfortably large.
const pause = document.querySelector<HTMLButtonElement>('#pause')!;
const controls=document.querySelector<HTMLDialogElement>('#controls')!;
const controlsToggle=document.querySelector<HTMLButtonElement>('#controls-toggle')!;
let resumeAfterControls=false;
let paused = false;
function setPaused(value: boolean): void {
  const wasPaused=paused;
  paused = value;
  document.body.classList.toggle('game-paused',value);
  if (value) { game.pause(); audio.stopMusic(); }
  else {
    if(controls.open)controls.close();
    if(wasPaused)for(const scene of game.scene.getScenes(true))if(scene instanceof GameScene)scene.resumeTweenClock();
    game.resume(); if (settings.current.music) { audio.unlock(); audio.startMusic(); }
  }
  pause.textContent = value ? 'Resume' : 'Pause';
  pause.setAttribute('aria-pressed', String(value));
  document.querySelector('#pause-notice')!.classList.toggle('visible', value);
  if(value)saveSession();
}
pause.onclick = () => setPaused(!paused);
document.querySelector<HTMLButtonElement>('#resume-play')!.onclick=()=>setPaused(false);
function openControls():void {
  if(controls.open)return;
  resumeAfterControls=!paused;setPaused(true);
  document.body.classList.add('controls-open');controls.showModal();
}
function closeControls(resume=resumeAfterControls):void {
  controls.close();
  if(resume)setPaused(false);
}
controlsToggle.onclick=openControls;
document.querySelector<HTMLButtonElement>('#close-controls')!.onclick=()=>closeControls();
controls.addEventListener('close',()=>{if(!controls.open){document.body.classList.remove('controls-open');controlsToggle.focus({preventScroll:true});}});
controls.addEventListener('cancel',event=>{event.preventDefault();closeControls();});
controls.addEventListener('click',event=>{
  if(event.target!==controls)return;
  const bounds=controls.getBoundingClientRect();
  if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)closeControls();
});
game.events.on('request-pause',openControls);

const fullscreen=document.querySelector<HTMLButtonElement>('#fullscreen')!;
const fullscreenHint=document.querySelector<HTMLParagraphElement>('#fullscreen-hint')!;
const fullscreenAvailable=document.fullscreenEnabled&&typeof document.documentElement.requestFullscreen==='function';
fullscreen.hidden=!fullscreenAvailable;fullscreenHint.hidden=fullscreenAvailable;
function refreshFullscreen():void {fullscreen.textContent=document.fullscreenElement?'Exit fullscreen':'Enter fullscreen';}
document.addEventListener('fullscreenchange',refreshFullscreen);
fullscreen.onclick=async()=>{
  const resume=resumeAfterControls;
  // Browsers can reject fullscreen while a modal dialog is in the top layer.
  // Close it synchronously, retaining the fullscreen button's user activation.
  closeControls(false);
  try {
    if(document.fullscreenElement)await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
    refreshFullscreen();
    if(resume)setPaused(false);
  } catch(error) {
    if(import.meta.env.DEV)console.info('Fullscreen unavailable:',error instanceof Error?error.message:String(error));
    fullscreenHint.hidden=false;fullscreenHint.textContent='Fullscreen wasn’t available. You can keep playing here, or use Add to Home Screen.';
    openControls();resumeAfterControls=resume;
  }
};
game.events.on('session-started',()=>{savingEnabled=true;clearSessionPending=false;capturePending=true;lastSessionSaveAt=-Infinity;});
game.events.on('session-restored',()=>{
  setPaused(true);showSaveStatus('Level restored. Tap Resume when you’re ready.');
  // Pausing during scene creation can leave the old canvas frame on screen.
  // Redraw after creation finishes, without stepping physics, timers or gameplay.
  requestAnimationFrame(()=>{
    if(!paused||!game.scene.isActive('game'))return;
    game.renderer.preRender();game.scene.render(game.renderer);game.renderer.postRender();
  });
  const scene=game.scene.getScene('game');
  if(scene instanceof GameScene){lastStatus=scene.summary;document.querySelector('#play-status')!.textContent=lastStatus;}
});
game.events.on('session-finished',()=>{clearSessionPending=true;saveSession();});
game.events.on('session-dirty',()=>{capturePending=true;});
document.querySelector<HTMLButtonElement>('#retry')!.onclick = () => {
  setPaused(false);
  const scene = game.scene.getScene('game') as GameScene;
  if (game.scene.isActive('game')) scene.scene.restart({levelId:scene.levelId,playground:scene.isPlayground,playgroundMode:scene.isPlayground?scene.playgroundReport.mode:undefined});
};
function openMenu():void {
  saveSession();
  setPaused(false);
  for (const scene of game.scene.getScenes(true)) game.scene.stop(scene.scene.key);
  game.scene.start('menu');
}
document.querySelector<HTMLButtonElement>('#menu')!.onclick=openMenu;
game.events.on('request-menu',openMenu);
document.querySelector<HTMLButtonElement>('#shovel')!.onclick = () => {
  const scene = game.scene.getScene('game') as GameScene;
  if (game.scene.isActive('game')) scene.toggleShovel();
  closeControls(true);
};
document.querySelector<HTMLButtonElement>('#cancel')!.onclick = () => {
  const scene = game.scene.getScene('game') as GameScene;
  if (game.scene.isActive('game')) scene.cancelSelection();
  closeControls(true);
};
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
window.addEventListener('blur', () => setPaused(true));

const levelSelect = document.querySelector<HTMLSelectElement>('#level')!;
const difficultySelect = document.querySelector<HTMLSelectElement>('#difficulty')!;
difficultySelect.value = getDifficulty();
levelSelect.replaceChildren(...LEVELS.map(level => { const option = document.createElement('option'); option.value = String(level.id); option.textContent = level.name + ' · ' + level.title; return option; }));
let currentLevel = 1;
let assetsReady=false;
let queuedLevel:number|null=null;
game.events.once('assets-ready',()=>{
  assetsReady=true;
  if(queuedLevel!==null){const id=queuedLevel;queuedLevel=null;openLevel(id);}
  else if(new URLSearchParams(location.search).get('mode')==='playground')openPlayground();
  else if(initialSession.status==='valid')openSavedLevel(initialSession.value);
});
function openSavedLevel(saved:GardenSession):void {
  savingEnabled=true;clearSessionPending=false;
  currentLevel=saved.levelId;levelSelect.value=String(currentLevel);
  setDifficulty(saved.difficulty);difficultySelect.value=saved.difficulty;
  setPaused(false);
  for(const scene of game.scene.getScenes(true))game.scene.stop(scene.scene.key);
  game.scene.start('game',{resume:saved});
}
document.querySelector<HTMLButtonElement>('#resume-session')!.onclick=()=>{
  const saved=sessionStore.read();
  if(saved.status==='valid')openSavedLevel(saved.value);
  else showSaveStatus(saved.status==='missing'?'No unfinished level to resume.':'Saved level could not resume and has been kept.');
};
function openLevel(id: number): void {
  currentLevel = Math.max(1, Math.min(TOTAL_LEVELS, id));
  if(!assetsReady){queuedLevel=currentLevel;return;}
  levelSelect.value = String(currentLevel);
  setPaused(false);
  for (const scene of game.scene.getScenes(true)) game.scene.stop(scene.scene.key);
  game.scene.start('game', { levelId: currentLevel });
}
levelSelect.onchange = () => openLevel(Number(levelSelect.value));
document.querySelector<HTMLButtonElement>('#previous')!.onclick = () => openLevel(currentLevel - 1);
document.querySelector<HTMLButtonElement>('#next')!.onclick = () => openLevel(currentLevel + 1);
difficultySelect.onchange = () => {
  if (isDifficulty(difficultySelect.value)) setDifficulty(difficultySelect.value);
  if(playgroundScene())openPlayground();else openLevel(currentLevel);
};
let lastStatus = '';
let lastShellUpdate=0;
game.events.on(Phaser.Core.Events.POST_STEP, () => {
  const scene = game.scene.getScene('game') as GameScene;
  if (!game.scene.isActive('game')) { if (lastStatus) { document.querySelector('#play-status')!.textContent = ''; lastStatus = ''; } return; }
  const now=performance.now();
  // Auto-collected suns can emit many changes in a burst. Coalesce these
  // requests; periodic (2s), pause and lifecycle saves still flush directly.
  if(capturePending&&now-lastSessionSaveAt>=1000){capturePending=false;saveSession();}
  if(now-lastShellUpdate<250)return;lastShellUpdate=now;
  currentLevel = scene.levelId;
  levelSelect.value = String(currentLevel);
  document.querySelector('#shovel')!.setAttribute('aria-pressed',String(scene.isShoveling));
  const status = scene.summary;
  if (status !== lastStatus) { document.querySelector('#play-status')!.textContent = status; lastStatus = status; }
});
// Outer engine timings also include physics, tweens and shell work. Section
// timings in GameScene let us separate those from entity logic.
game.events.on(Phaser.Core.Events.PRE_STEP,()=>{
  const scene=game.scene.getScene('game');
  perf.begin(game.scene.isActive('game')&&scene instanceof GameScene&&scene.isPlaying&&!game.isPaused&&!document.hidden);
});
game.events.on(Phaser.Core.Events.POST_STEP,()=>perf.endUpdate());
game.events.on(Phaser.Core.Events.PRE_RENDER,()=>perf.beginRender());
game.events.on(Phaser.Core.Events.POST_RENDER,()=>perf.endRender());
game.events.on(Phaser.Core.Events.PAUSE,()=>perf.resetClock());
document.addEventListener('visibilitychange',()=>perf.resetClock());
const autosave=startAutosave(saveSession);
import.meta.hot?.dispose(()=>{autosave.flush();autosave.stop();});

window.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat || (event.target instanceof HTMLElement && ['BUTTON','SELECT','INPUT'].includes(event.target.tagName))) return;
  if (game.scene.isActive('game')) { event.preventDefault(); setPaused(!paused); }
});

const diagnosticsPanel=document.querySelector<HTMLElement>('#diagnostics')!;
const diagnosticsToggle=document.querySelector<HTMLButtonElement>('#diagnostics-toggle')!;
diagnosticsToggle.onclick=()=>{
  diagnosticsPanel.hidden=!diagnosticsPanel.hidden;
  diagnosticsToggle.setAttribute('aria-expanded',String(!diagnosticsPanel.hidden));
  closeControls(true);
};
document.querySelector<HTMLButtonElement>('#diagnostics-close')!.onclick=()=>{diagnosticsPanel.hidden=true;diagnosticsToggle.setAttribute('aria-expanded','false');};
setInterval(()=>{
  const scene=game.scene.getScene('game') as GameScene;
  if(!game.scene.isActive('game'))return;
  scene.diagnosticsVisible=!diagnosticsPanel.hidden;
  if(diagnosticsPanel.hidden)return;
  const d=scene.diagnostics;
  document.querySelector('#diagnostics-readout')!.textContent=
    `PC Adventure rules · seed 12345 (portable PRNG)
Difficulty: ${d.difficulty} · ${d.environment} · ${d.graves.length} graves
Projectiles: ${d.projectiles.map(p=>`${p.texture} ${p.width.toFixed(1)}×${p.height.toFixed(1)} at ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('; ')}
Simulation: ${(d.tick/100).toFixed(2)}s · wave ${d.wave}/${d.plan.length}
Next countdown: ${(d.countdownTicks/100).toFixed(2)}s · warning: ${(d.warningTicks/100).toFixed(2)}s
${d.mode==='whack'?'Timed spawning · health does not accelerate these waves':`Wave health: ${d.remainingHealth.toFixed(0)}/${d.initialHealth} · advance threshold: ${d.healthThreshold.toFixed(0)}`}

${d.mode==='whack'?'Whack mode: timed grave volleys; tap enemies to bonk.':'Plan (all enemies in a wave spawn together):'}
`+
    (d.mode==='whack'?'':d.plan.map((w,i)=>`${i+1}${w.flag?' FLAG':''}: ${JSON.stringify(w.zombies)}`).join('\n'))+
    '\n\nRecent events:\n'+d.events.slice(-10).map(e=>`${(e.tick/100).toFixed(2)}s ${e.kind} W${e.wave}${e.count?' ×'+e.count:''}`).join('\n')+
    '\n\nLive enemies (mean speed; gait varies):\n'+d.zombies.map(z=>`W${z.wave} ${z.kind} ${z.team} row ${z.row+1}: (${z.x.toFixed(1)}, ${z.y.toFixed(1)}) ${z.speed.toFixed(2)}px/s HP${z.hp.toFixed(0)}${z.frozenMs>0?` FROZEN ${(z.frozenMs/1000).toFixed(1)}s`:""}`).join('\n')+
    '\n\nRemaining approximations: tutorial gates, lane picker, pole vault, bite/shot animations, special-level supply, flattened night animations and grave emergence. See docs/games/garden-guard/audit/accuracy.md.';
},250);
document.querySelector<HTMLButtonElement>('#trace-export')!.onclick=()=>{
  if(!game.scene.isActive('game'))return;
  const scene=game.scene.getScene('game') as GameScene;
  const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,sourcePins:{corrected:'325b2229a7225d73870bb69322eefcda3a45bf8d',comparison:'c4692036c5e11d227c8fb7c593b734dac96da028'},...scene.diagnostics},null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`garden-level-${scene.levelId}-trace.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};

const autoSuns=document.querySelector<HTMLButtonElement>('#auto-suns')!;
function refreshAutoSuns():void {
  autoSuns.textContent=`Auto-collect suns: ${settings.current.autoCollectSuns?'On':'Off'}`;
  autoSuns.setAttribute('aria-pressed',String(settings.current.autoCollectSuns));
}
autoSuns.onclick=()=>settings.toggle('autoCollectSuns');
settings.on('changed',refreshAutoSuns);
refreshAutoSuns();

if(import.meta.env.DEV){
 const note=document.createElement('p');note.textContent='Local test boards — replace the current level with a repeatable mid-battle scenario.';diagnosticsPanel.append(note);
 for(const [label,frozen] of [['Test dancer summons',false],['Test frozen group',true]] as const){
  const button=document.createElement('button');button.textContent=label;
  button.onclick=async()=>{const {nightDiagnostic}=await import('./diagnostics/night-scenarios');openSavedLevel(nightDiagnostic(frozen));};
  diagnosticsPanel.append(button);
 }
}

const performancePanel=document.querySelector<HTMLElement>('#performance-panel')!;
const performanceToggle=document.querySelector<HTMLButtonElement>('#performance-toggle')!;
performanceToggle.onclick=()=>{performancePanel.hidden=!performancePanel.hidden;performanceToggle.setAttribute('aria-expanded',String(!performancePanel.hidden));closeControls(true);};
document.querySelector<HTMLButtonElement>('#performance-close')!.onclick=()=>{performancePanel.hidden=true;performanceToggle.setAttribute('aria-expanded','false');};
document.querySelector<HTMLButtonElement>('#performance-reset')!.onclick=()=>{perf.history.clear();perf.resetClock();};
function performanceReport(){
 const scene=game.scene.getScene('game');
 return {version:1,createdAt:new Date().toISOString(),device:{userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],pixelRatio:devicePixelRatio,canvas:[game.canvas.width,game.canvas.height],renderer:'Canvas'},
   gameSpeed:settings.current.gameSpeed,board:game.scene.isActive('game')&&scene instanceof GameScene?scene.performanceCounts:null,measurements:perf.history.snapshot()};
}
setInterval(()=>{
 if(performancePanel.hidden)return;
 const report=performanceReport(),m=report.measurements,b=report.board;
 const ms=(n:number)=>n.toFixed(2)+' ms';
 document.querySelector('#performance-readout')!.textContent=
  `${m.fps.toFixed(0)} FPS · ${m.frames} recent frames
Frame interval: avg ${ms(m.interval.mean)} · 95% ≤ ${ms(m.interval.p95)}
Slow frames: ${m.over25ms} over 25 ms · ${m.over50ms} over 50 ms

CPU time per frame (average / 95th percentile)
Engine update: ${ms(m.update.mean)} / ${ms(m.update.p95)}
Canvas drawing: ${ms(m.render.mean)} / ${ms(m.render.p95)}
`+
  PERFORMANCE_SECTIONS.map(name=>`  ${name}: ${ms(m.sections[name].mean)} / ${ms(m.sections[name].p95)}`).join('\n')+
  `
Engine remainder (physics/tweens/input): ${ms(m.engineOther.mean)} / ${ms(m.engineOther.p95)}
Autosave: avg ${ms(m.saves.mean)} · max ${ms(m.saves.max)}
${b?`
${b.plants} plants · ${b.zombies} zombies · ${b.projectiles} projectiles
${b.displayObjects} scene objects · ${b.drawCalls} rendered objects
${b.physicsBodies} physics bodies · ${b.tweens} tweens`:''}

Worst observed frame: ${ms(Math.max(m.interval.max,m.worst[0]?.interval??0))}
Last 600 active frames; slowest frames retained until reset. Last 30 saves measured. Drawing time excludes browser/GPU compositing.`;
},1000);
document.querySelector<HTMLButtonElement>('#performance-export')!.onclick=()=>{
 const url=URL.createObjectURL(new Blob([JSON.stringify(performanceReport(),null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='garden-performance.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};

const speedToggle=document.querySelector<HTMLButtonElement>('#speed-toggle')!;
const speedMenu=document.querySelector<HTMLButtonElement>('#speed-menu')!;
function refreshSpeed():void {
 const speed=settings.current.gameSpeed;
 speedToggle.textContent=`${speed}×`;
 speedToggle.setAttribute('aria-label',`Game speed: ${speed}×. Switch to ${speed===1?2:1}×.`);
 speedMenu.textContent=`Game speed: ${speed}×`;
 for(const button of [speedToggle,speedMenu])button.setAttribute('aria-pressed',String(speed===2));
}
function toggleSpeed():void {settings.set('gameSpeed',settings.current.gameSpeed===1?2:1);}
speedToggle.onclick=toggleSpeed;speedMenu.onclick=toggleSpeed;
settings.on('changed',refreshSpeed);refreshSpeed();

const playgroundPanel=document.querySelector<HTMLElement>('#playground-panel')!;
const playgroundTools=document.querySelector<HTMLButtonElement>('#playground-tools')!;
let playgroundToolsVisible=true;
function playgroundScene():GameScene|null {const scene=game.scene.getScene('game');return game.scene.isActive('game')&&scene instanceof GameScene&&scene.isPlayground?scene:null;}
function openPlayground():void {
 saveSession();setPaused(false);
 for(const scene of game.scene.getScenes(true))game.scene.stop(scene.scene.key);
 playgroundToolsVisible=true;game.scene.start('game',{playground:true,playgroundMode:document.querySelector<HTMLSelectElement>('#playground-mode')!.value==='night'?'night':'day'});
 showSaveStatus('Playground is temporary. Your campaign save is kept.');
}
document.querySelector<HTMLButtonElement>('#playground-open')!.onclick=openPlayground;
game.events.on('request-playground',openPlayground);
playgroundTools.onclick=()=>{playgroundToolsVisible=!playgroundToolsVisible;refreshPlayground();};
document.querySelector<HTMLButtonElement>('#playground-hide')!.onclick=()=>{playgroundToolsVisible=false;refreshPlayground();};
document.querySelector<HTMLSelectElement>('#playground-mode')!.value=new URLSearchParams(location.search).get('lawn')==='night'?'night':'day';
const playgroundPlant=document.querySelector<HTMLSelectElement>('#playground-plant')!;
for(const type of SEED_ORDER)playgroundPlant.add(new Option(PLANT_DEFS[type].label,type));
const zombieTypes:readonly ZombieType[]=['basic','conehead','buckethead','polevaulter','newspaper','screendoor','football','dancer','backup','flag'];
const playgroundZombie=document.querySelector<HTMLSelectElement>('#playground-zombie')!;
for(const type of zombieTypes)playgroundZombie.add(new Option(type==='screendoor'?'Screen door':type[0].toUpperCase()+type.slice(1),type));
playgroundZombie.value='basic';
playgroundZombie.onchange=()=>{const scene=playgroundScene(),type=zombieTypes.find(t=>t===playgroundZombie.value);if(scene&&type)scene.playgroundZombie=type;};
document.querySelector<HTMLButtonElement>('#playground-arm')!.onclick=()=>{
 const scene=playgroundScene(),type=SEED_ORDER.find(t=>t===playgroundPlant.value);if(!scene||!type)return;
 scene.selectPlaygroundPlant(type);document.querySelector('#playground-selection')!.textContent=`${PLANT_DEFS[type].label} selected — tap any empty lawn squares.`;
};
document.querySelector<HTMLButtonElement>('#playground-spawn')!.onclick=()=>{
 const scene=playgroundScene(),type=zombieTypes.find(t=>t===playgroundZombie.value);if(!scene||!type)return;
 const lane=document.querySelector<HTMLSelectElement>('#playground-lane')!.value;
 scene.addPlaygroundZombies(type,lane==='all'?null:Number(lane),Number(document.querySelector<HTMLSelectElement>('#playground-count')!.value));
};
document.querySelector<HTMLButtonElement>('#playground-fill')!.onclick=()=>{playgroundScene()?.fillPlayground();refreshPlayground();};
document.querySelector<HTMLButtonElement>('#playground-clear')!.onclick=openPlayground;
document.querySelector<HTMLSelectElement>('#playground-mode')!.onchange=openPlayground;
document.querySelector<HTMLButtonElement>('#playground-clear-zombies')!.onclick=()=>playgroundScene()?.clearPlaygroundZombies();
document.querySelector<HTMLButtonElement>('#playground-graves')!.onclick=()=>playgroundScene()?.addPlaygroundGraves();
const continuous=document.querySelector<HTMLButtonElement>('#playground-continuous')!;
continuous.onclick=()=>{const scene=playgroundScene();if(scene)scene.playgroundContinuous=!scene.playgroundContinuous;refreshPlayground();};
function refreshPlayground():void {
 const scene=playgroundScene();playgroundTools.hidden=!scene;playgroundPanel.hidden=!scene||!playgroundToolsVisible;
 if(!scene)return;
 continuous.textContent=`Repeat waves: ${scene.playgroundContinuous?'On':'Off'}`;continuous.setAttribute('aria-pressed',String(scene.playgroundContinuous));
 if(playgroundPanel.hidden)return;
 const r=scene.playgroundReport,p=r.projectiles;
 document.querySelector('#playground-readout')!.textContent=`${(r.elapsedMs/1000).toFixed(1)}s · ${r.plants} plants · ${r.zombies} zombies
Shootable targets: ${r.targets} · dying: ${r.dying}
Peas alive: ${p?.live??0}
Spawned: ${p?.spawned??0} · drawn: ${p?.drawnAtLeastOnce??0}
Missing live draws: ${p?.missingDraws??0}
Removed before first draw: ${p?.removedBeforeFirstDraw??0}
Hit: ${p?.removed.hit??0} · expired: ${p?.removed.expired??0} · offscreen: ${p?.removed.offscreen??0}
Unexpected removals: ${p?.removed.unexpected??0}`;
}
game.events.on('playground-started',refreshPlayground);
game.events.on('session-started',refreshPlayground);
game.events.on('session-restored',refreshPlayground);
setInterval(refreshPlayground,500);
document.querySelector<HTMLButtonElement>('#playground-report')!.onclick=()=>{
 const scene=playgroundScene();if(!scene)return;
 const report={version:1,createdAt:new Date().toISOString(),userAgent:navigator.userAgent,speed:settings.current.gameSpeed,...scene.playgroundReport,performance:perf.history.snapshot()};
 const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='garden-projectile-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
