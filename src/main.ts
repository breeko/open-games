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
  paused = value;
  if (value) { game.pause(); audio.stopMusic(); }
  else { game.resume(); if (settings.current.music) { audio.unlock(); audio.startMusic(); } }
  pause.textContent = value ? 'Resume' : 'Pause';
  pause.setAttribute('aria-pressed', String(value));
  document.querySelector('#pause-notice')!.classList.toggle('visible', value);
}
pause.onclick = () => setPaused(!paused);
game.events.on('request-pause',()=>setPaused(true));
document.querySelector<HTMLButtonElement>('#retry')!.onclick = () => {
  setPaused(false);
  const scene = game.scene.getScene('game') as GameScene;
  if (game.scene.isActive('game')) scene.scene.restart();
};
document.querySelector<HTMLButtonElement>('#menu')!.onclick = () => {
  setPaused(false);
  for (const scene of game.scene.getScenes(true)) game.scene.stop(scene.scene.key);
  game.scene.start('menu');
};
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
game.events.once('assets-ready',()=>{assetsReady=true;if(queuedLevel!==null){const id=queuedLevel;queuedLevel=null;openLevel(id);}});
function openLevel(id: number): void {
  if(!assetsReady){queuedLevel=id;return;}
  currentLevel = Math.max(1, Math.min(TOTAL_LEVELS, id));
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
});

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
Difficulty: ${d.difficulty}
Simulation: ${(d.tick/100).toFixed(2)}s · wave ${d.wave}/${d.plan.length}
Next countdown: ${(d.countdownTicks/100).toFixed(2)}s · warning: ${(d.warningTicks/100).toFixed(2)}s
Wave health: ${d.remainingHealth.toFixed(0)}/${d.initialHealth} · advance threshold: ${d.healthThreshold.toFixed(0)}

Plan (all enemies in a wave spawn together):
`+
    d.plan.map((w,i)=>`${i+1}${w.flag?' FLAG':''}: ${JSON.stringify(w.zombies)}`).join('\n')+
    '\n\nRecent events:\n'+d.events.slice(-10).map(e=>`${(e.tick/100).toFixed(2)}s ${e.kind} W${e.wave}${e.count?' ×'+e.count:''}`).join('\n')+
    '\n\nLive enemies (mean speed; gait varies):\n'+d.zombies.map(z=>`W${z.wave} row ${z.row+1}: (${z.x.toFixed(1)}, ${z.y.toFixed(1)}) ${z.speed.toFixed(2)}px/s HP${z.hp.toFixed(0)}`).join('\n')+
    '\n\nRemaining approximations: tutorial gates, lane picker, pole vault, bite/shot animations, special-level supply. See docs/audit/accuracy.md.';
},250);
document.querySelector<HTMLButtonElement>('#trace-export')!.onclick=()=>{
  if(!game.scene.isActive('game'))return;
  const scene=game.scene.getScene('game') as GameScene;
  const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,sourcePins:{corrected:'325b2229a7225d73870bb69322eefcda3a45bf8d',comparison:'c4692036c5e11d227c8fb7c593b734dac96da028'},...scene.diagnostics},null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`garden-level-${scene.levelId}-trace.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};

document.querySelectorAll<HTMLButtonElement>('.more-controls button').forEach(button=>button.addEventListener('click',()=>{document.querySelector<HTMLDetailsElement>('.more-controls')!.open=false;}));
