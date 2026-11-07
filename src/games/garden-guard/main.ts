import Phaser from 'phaser';
import { getDifficulty, setDifficulty, isDifficulty } from './difficulty';
import { settings } from './state/settings';
import { audio } from './audio/AudioManager';
import { LEVELS, TOTAL_LEVELS } from './levels';
import { GAME_HEIGHT, GAME_WIDTH } from './constants';
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
const saveStatus=document.querySelector<HTMLElement>('#save-status')!;
function showSaveStatus(message:string):void {if(saveStatus.textContent!==message)saveStatus.textContent=message;}
if(initialSession.status==='invalid')showSaveStatus('Saved level could not resume and has been kept. Start a new level to replace it.');
else if(initialSession.status==='unavailable')showSaveStatus('Saving is unavailable. You can still play.');
function saveSession():void {
  if(!savingEnabled)return;
  if(clearSessionPending){
    const result=sessionStore.clear();clearSessionPending=result.status!=='cleared';
    showSaveStatus(clearSessionPending?'Finished level could not be cleared.':'Level finished. Campaign progress stays saved.');return;
  }
  if(!game.scene.isActive('game'))return;
  try {
    const scene=game.scene.getScene('game');if(!(scene instanceof GameScene))return;
    const saved=scene.captureSession();if(!saved)return;
    const result=sessionStore.write(saved);
    showSaveStatus(result.status==='saved'?'Level saved on this device.':result.status==='invalid'?'Level could not save. Previous save kept.':'Saving is unavailable. Your level continues in this tab.');
  }catch {showSaveStatus('Level could not save. Previous save kept.');}
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
let paused = false;
function setPaused(value: boolean): void {
  const wasPaused=paused;
  paused = value;
  if (value) { game.pause(); audio.stopMusic(); }
  else {
    if(wasPaused)for(const scene of game.scene.getScenes(true))if(scene instanceof GameScene)scene.resumeTweenClock();
    game.resume(); if (settings.current.music) { audio.unlock(); audio.startMusic(); }
  }
  pause.textContent = value ? 'Resume' : 'Pause';
  pause.setAttribute('aria-pressed', String(value));
  document.querySelector('#pause-notice')!.classList.toggle('visible', value);
  if(value)saveSession();
}
pause.onclick = () => setPaused(!paused);
game.events.on('request-pause',()=>setPaused(true));
game.events.on('session-started',()=>{savingEnabled=true;clearSessionPending=false;capturePending=true;});
game.events.on('session-restored',()=>{
  setPaused(true);showSaveStatus('Level restored. Tap Resume when you’re ready.');
  const scene=game.scene.getScene('game');
  if(scene instanceof GameScene){lastStatus=scene.summary;document.querySelector('#play-status')!.textContent=lastStatus;}
});
game.events.on('session-finished',()=>{clearSessionPending=true;saveSession();});
game.events.on('session-dirty',()=>{capturePending=true;});
document.querySelector<HTMLButtonElement>('#retry')!.onclick = () => {
  setPaused(false);
  const scene = game.scene.getScene('game') as GameScene;
  if (game.scene.isActive('game')) scene.scene.restart({levelId:scene.levelId});
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
};
document.querySelector<HTMLButtonElement>('#cancel')!.onclick = () => {
  const scene = game.scene.getScene('game') as GameScene;
  if (game.scene.isActive('game')) scene.cancelSelection();
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
  openLevel(currentLevel);
};
let lastStatus = '';
game.events.on(Phaser.Core.Events.POST_STEP, () => {
  const scene = game.scene.getScene('game') as GameScene;
  if (!game.scene.isActive('game')) { if (lastStatus) { document.querySelector('#play-status')!.textContent = ''; lastStatus = ''; } return; }
  currentLevel = scene.levelId;
  levelSelect.value = String(currentLevel);
  document.querySelector('#shovel')!.setAttribute('aria-pressed',String(scene.isShoveling));
  const status = scene.summary;
  if (status !== lastStatus) { document.querySelector('#play-status')!.textContent = status; lastStatus = status; }
  if(capturePending){capturePending=false;saveSession();}
});
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
};
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
    '\n\nLive enemies (mean speed; gait varies):\n'+d.zombies.map(z=>`W${z.wave} ${z.kind} ${z.team} row ${z.row+1}: (${z.x.toFixed(1)}, ${z.y.toFixed(1)}) ${z.speed.toFixed(2)}px/s HP${z.hp.toFixed(0)}`).join('\n')+
    '\n\nRemaining approximations: tutorial gates, lane picker, pole vault, bite/shot animations, special-level supply, flattened night animations and grave emergence. See docs/games/garden-guard/audit/accuracy.md.';
},250);
document.querySelector<HTMLButtonElement>('#trace-export')!.onclick=()=>{
  if(!game.scene.isActive('game'))return;
  const scene=game.scene.getScene('game') as GameScene;
  const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,sourcePins:{corrected:'325b2229a7225d73870bb69322eefcda3a45bf8d',comparison:'c4692036c5e11d227c8fb7c593b734dac96da028'},...scene.diagnostics},null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`garden-level-${scene.levelId}-trace.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};

document.querySelectorAll<HTMLButtonElement>('.more-controls button').forEach(button=>button.addEventListener('click',()=>{document.querySelector<HTMLDetailsElement>('.more-controls')!.open=false;}));

const autoSuns=document.querySelector<HTMLButtonElement>('#auto-suns')!;
function refreshAutoSuns():void {
  autoSuns.textContent=`Auto-collect suns: ${settings.current.autoCollectSuns?'On':'Off'}`;
  autoSuns.setAttribute('aria-pressed',String(settings.current.autoCollectSuns));
}
autoSuns.onclick=()=>settings.toggle('autoCollectSuns');
settings.on('changed',refreshAutoSuns);
refreshAutoSuns();
