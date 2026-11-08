/** Development-only visual inspection of real scenes; not a production entry. */
import Phaser from 'phaser';
import {PreloadScene} from '../../../src/games/garden-guard/scenes/PreloadScene';
import {MainMenuScene} from '../../../src/games/garden-guard/scenes/MainMenuScene';
import {SeedSelectScene} from '../../../src/games/garden-guard/scenes/SeedSelectScene';
import {RewardScene} from '../../../src/games/garden-guard/scenes/RewardScene';
import {LevelSelectScene} from '../../../src/games/garden-guard/scenes/LevelSelectScene';
import {GameScene} from '../../../src/games/garden-guard/scenes/GameScene';
const screen=document.querySelector<HTMLSelectElement>('#screen')!,level=document.querySelector<HTMLSelectElement>('#level')!,size=document.querySelector<HTMLSelectElement>('#size')!;
const game=new Phaser.Game({type:Phaser.CANVAS,parent:'game-root',width:1280,height:960,audio:{noAudio:true},scale:{mode:Phaser.Scale.FIT},physics:{default:'arcade',arcade:{gravity:{x:0,y:0}}},scene:[PreloadScene,MainMenuScene,SeedSelectScene,RewardScene,LevelSelectScene,GameScene]});
function show(){
 for(const scene of game.scene.getScenes(true))game.scene.stop(scene.scene.key);
 game.scene.start(screen.value==='seeds'?'seeds':'reward',{levelId:Number(level.value),firstClear:screen.value==='reward'});
 document.querySelector('#status')!.textContent='Preview · gameplay and saves use the existing rules';
}
screen.onchange=show;level.onchange=show;
size.onchange=()=>{const root=document.querySelector<HTMLDivElement>('#game-root')!;root.style.width=size.value+'px';root.style.height=Number(size.value)*.75+'px';game.scale.setParentSize(Number(size.value),Number(size.value)*.75);};
game.events.once('assets-ready',show);
