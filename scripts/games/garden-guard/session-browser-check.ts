/** Open session-browser-check.html through Vite. This developer page is not a production entry. */
import Phaser from 'phaser';
import { PreloadScene } from '../../../src/games/garden-guard/scenes/PreloadScene';
import { MainMenuScene } from '../../../src/games/garden-guard/scenes/MainMenuScene';
import { GameScene } from '../../../src/games/garden-guard/scenes/GameScene';
import { gardenSessionSchema, type GardenSession } from '../../../src/games/garden-guard/state/session-data';
import { busyNightSession, freshSession, exampleZombie } from '../../../tests/games/garden-guard/fixtures/session';
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
