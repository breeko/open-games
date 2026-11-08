import Phaser from 'phaser';
import {audio} from '../audio/AudioManager';
import {DEPTH,PLANT_DEFS} from '../constants';
import {LEVELS,TOTAL_LEVELS,rewardForLevel} from '../levels';
import {progress} from '../state/progress';
import {MenuButton,menuLawn,menuPanel,fitMenuArt} from '../ui/MenuPresentation';

const COLS=5,CARD_W=190,CARD_H=202,STEP_X=212,STEP_Y=234;
const WORLDS=['Day','Night','Pool'] as const;
interface LevelCard {container:Phaser.GameObjects.Container;outline:Phaser.GameObjects.Graphics;levelId:number;}

/** All levels stay open. Completion checks and keyboard focus are visual state only. */
export class LevelSelectScene extends Phaser.Scene {
 private cards:LevelCard[]=[];
 private panel?:Phaser.GameObjects.Graphics;
 private focusIndex=0;
 private page=0;
 private tabs:MenuButton[]=[];
 private lawn!:Phaser.GameObjects.Image;
 private leaving=false;
 constructor(){super('levels');}
 create():void {
  this.cards=[];this.panel=undefined;this.tabs=[];this.leaving=false;
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.input.removeAllListeners();this.input.keyboard?.removeAllListeners();});
  this.focusIndex=Math.min(progress.unlockedLevel-1,LEVELS.length-1);this.page=Math.floor(this.focusIndex/10);
  this.lawn=menuLawn(this,'day');
  this.add.text(640,70,'Adventure',{fontFamily:'Georgia, serif',fontStyle:'bold',fontSize:'46px',color:'#fff1ba',stroke:'#38291e',strokeThickness:5,resolution:2}).setOrigin(.5).setDepth(DEPTH.ui);
  this.add.text(640,115,`✓ ${progress.completedCount} / ${TOTAL_LEVELS}`,{fontFamily:'Arial, sans-serif',fontSize:'19px',color:'#d9e8c3',resolution:2}).setOrigin(.5).setDepth(DEPTH.ui);
  WORLDS.forEach((label,index)=>this.tabs.push(new MenuButton(this,390+index*250,180,label,()=>{
   if(this.leaving)return;this.page=index;this.focusIndex=index*10;this.buildCards();this.applyFocus();
  },false,200)));
  this.buildCards();this.applyFocus();
  new MenuButton(this,640,816,'‹ Menu',()=>this.goBack(),false,250);
  this.wireKeyboard();this.cameras.main.fadeIn(160);
 }
 private buildCards():void {
  for(const card of this.cards)card.container.destroy(true);this.cards=[];this.panel?.destroy();
  this.lawn.setTexture(this.page===2?'pool':this.page===1?'night':'lawn3');
  const levels=LEVELS.slice(this.page*10,this.page*10+10),rows=Math.ceil(levels.length/COLS),columns=Math.min(COLS,levels.length);
  this.panel=menuPanel(this,640,467,columns*STEP_X+36,rows*STEP_Y+12);
  levels.forEach((level,index)=>{
   const row=Math.floor(index/COLS),items=Math.min(COLS,levels.length-row*COLS);
   const x=640+(index%COLS-(items-1)/2)*STEP_X,y=467+(row-(rows-1)/2)*STEP_Y;
   const container=this.add.container(x,y).setDepth(DEPTH.ui);
   const paper=menuPanel(this,0,0,CARD_W,CARD_H,true);
   const number=this.add.text(0,-64,level.name,{fontFamily:'Georgia, serif',fontStyle:'bold',fontSize:'36px',color:'#3d4b2d',resolution:2}).setOrigin(.5);
   const plant=rewardForLevel(level.id)??level.availablePlants[level.availablePlants.length-1];
   const icon=fitMenuArt(this.add.image(0,23,PLANT_DEFS[plant].texture),108,104);
   const outline=this.add.graphics();container.add([paper,number,icon,outline]);
   if(progress.isCompleted(level.id)){
    const badge=this.add.circle(68,-70,16,0x4e6b35);
    const check=this.add.text(68,-71,'✓',{fontFamily:'Arial, sans-serif',fontStyle:'bold',fontSize:'23px',color:'#fff2ba',resolution:2}).setOrigin(.5);
    container.add([badge,check]);
   }
   container.setSize(CARD_W,CARD_H).setInteractive(new Phaser.Geom.Rectangle(0,0,CARD_W,CARD_H),Phaser.Geom.Rectangle.Contains);container.input!.cursor='pointer';
   container.on('pointerdown',(_p:Phaser.Input.Pointer,_x:number,_y:number,event:Phaser.Types.Input.EventData)=>{event.stopPropagation();this.play(level.id);});
   container.on('pointerover',()=>this.paintOutline(outline,true));
   container.on('pointerout',()=>this.paintOutline(outline,level.id-1===this.focusIndex));
   this.cards.push({container,outline,levelId:level.id});
  });
 }
 private paintOutline(outline:Phaser.GameObjects.Graphics,focused:boolean):void {
  outline.clear();if(focused)outline.lineStyle(5,0xffdb76).strokeRoundedRect(-CARD_W/2-3,-CARD_H/2-3,CARD_W+6,CARD_H+6,19);
 }
 private applyFocus():void {
  if(Math.floor(this.focusIndex/10)!==this.page){this.page=Math.floor(this.focusIndex/10);this.buildCards();}
  this.tabs.forEach((tab,index)=>tab.setSelected(index===this.page));
  this.cards.forEach(card=>this.paintOutline(card.outline,card.levelId-1===this.focusIndex));
 }
 private wireKeyboard():void {
  const keyboard=this.input.keyboard;if(!keyboard)return;
  keyboard.on('keydown-LEFT',()=>this.moveFocus(-1));keyboard.on('keydown-RIGHT',()=>this.moveFocus(1));
  keyboard.on('keydown-UP',()=>this.moveFocus(-COLS));keyboard.on('keydown-DOWN',()=>this.moveFocus(COLS));
  keyboard.on('keydown-ENTER',()=>this.play(LEVELS[this.focusIndex].id));keyboard.on('keydown-SPACE',()=>this.play(LEVELS[this.focusIndex].id));
  keyboard.on('keydown-ESC',()=>this.goBack());keyboard.on('keydown-BACKSPACE',()=>this.goBack());
 }
 private moveFocus(delta:number):void {if(this.leaving)return;this.focusIndex=Phaser.Math.Wrap(this.focusIndex+delta,0,LEVELS.length);this.applyFocus();}
 private play(levelId:number):void {audio.sfx('click');this.navigate('seeds',{levelId});}
 private goBack():void {this.navigate('menu');}
 private navigate(key:string,data?:{levelId:number}):void {
  if(this.leaving)return;this.leaving=true;
  this.cameras.main.fadeOut(120);this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,()=>this.scene.start(key,data));
 }
}
