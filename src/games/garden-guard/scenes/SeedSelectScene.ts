import Phaser from 'phaser';
import {audio} from '../audio/AudioManager';
import {DEPTH,PLANT_DEFS,SEED_ORDER,SEED_SLOTS} from '../constants';
import {getLevel,plantsForLevel,defaultSeedsForLevel} from '../levels';
import {progress} from '../state/progress';
import type {PlantType} from '../types';
import {MenuButton,menuLawn,menuPanel,fitMenuArt} from '../ui/MenuPresentation';

const CARD_W=128,CARD_H=150,COLS=7,STEP_X=148,STEP_Y=172;
const BANK_Y=772,SLOT_W=104,SLOT_STEP=118;
export interface SeedSelectData {levelId?:number;}

export class SeedSelectScene extends Phaser.Scene {
 private levelId=1;
 private chosen:PlantType[]=[];
 private cards=new Map<PlantType,Phaser.GameObjects.Rectangle>();
 private slots:Phaser.GameObjects.Image[]=[];
 private counter!:Phaser.GameObjects.Text;
 private startButton!:MenuButton;
 private leaving=false;
 constructor(){super('seeds');}
 init(data:SeedSelectData):void {this.levelId=data.levelId??1;}
 create():void {
  this.cards.clear();this.slots=[];this.leaving=false;
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.input.removeAllListeners();this.input.keyboard?.removeAllListeners();});
  const level=getLevel(this.levelId),available=plantsForLevel(this.levelId);
  if(level.mode!=='standard'){this.scene.start('game',{levelId:this.levelId});return;}
  const stored=progress.getLoadout(this.levelId);
  this.chosen=stored?stored.filter(type=>available.includes(type)).slice(0,SEED_SLOTS):defaultSeedsForLevel(this.levelId);
  menuLawn(this,level.environment);
  this.add.text(640,66,'Choose seeds',{fontFamily:'Georgia, serif',fontStyle:'bold',fontSize:'44px',color:'#fff1ba',stroke:'#38291e',strokeThickness:5,resolution:2}).setOrigin(.5).setDepth(DEPTH.ui);
  this.add.text(640,108,level.name,{fontFamily:'Arial, sans-serif',fontSize:'20px',color:'#d9e8c3',resolution:2}).setOrigin(.5).setDepth(DEPTH.ui);
  this.buildPicker(SEED_ORDER.filter(type=>available.includes(type)));
  this.buildBank();
  new MenuButton(this,420,894,'‹ Map',()=>this.goBack(),false,200);
  this.startButton=new MenuButton(this,770,894,'Let’s rock!',()=>this.startLevel(),true,330);
  this.refresh();
  this.input.keyboard?.on('keydown-ESC',()=>this.goBack());
  this.input.keyboard?.on('keydown-BACKSPACE',()=>this.goBack());
  this.input.keyboard?.on('keydown-ENTER',()=>this.startLevel());
  this.cameras.main.fadeIn(160);
 }
 private buildPicker(types:PlantType[]):void {
  const rows=Math.ceil(types.length/COLS),columns=Math.min(types.length,COLS);
  menuPanel(this,640,402,columns*STEP_X+36,rows*STEP_Y+22);
  types.forEach((type,index)=>{
   const row=Math.floor(index/COLS),items=Math.min(COLS,types.length-row*COLS);
   const x=640+(index%COLS-(items-1)/2)*STEP_X,y=402+(row-(rows-1)/2)*STEP_Y;
   const def=PLANT_DEFS[type],card=this.add.container(x,y).setDepth(DEPTH.ui);
   const frame=this.add.rectangle(0,0,CARD_W+8,CARD_H+8,0xe4c17a).setStrokeStyle(3,0x39291e);
   const packet=this.add.image(0,0,'seed-packet').setDisplaySize(CARD_W,CARD_H);
   const cover=this.add.rectangle(0,-57,CARD_W-9,30,0xf0edcf);
   const name=this.add.text(0,-57,def.label,{fontFamily:'Arial, sans-serif',fontStyle:'bold',fontSize:'15px',color:'#2c432b',resolution:2,align:'center',wordWrap:{width:CARD_W-12}}).setOrigin(.5);
   const icon=fitMenuArt(this.add.image(0,0,def.texture),104,86);
   const price=this.add.text(-9,59,String(def.cost),{fontFamily:'Arial, sans-serif',fontStyle:'bold',fontSize:'23px',color:'#352b1c',resolution:2}).setOrigin(.5);
   const sun=fitMenuArt(this.add.image(39,59,'sun'),23,23);
   card.add([frame,packet,cover,name,icon,price,sun]);card.setSize(CARD_W+8,CARD_H+8).setInteractive(new Phaser.Geom.Rectangle(0,0,CARD_W+8,CARD_H+8),Phaser.Geom.Rectangle.Contains);card.input!.cursor='pointer';
   card.on('pointerdown',(_p:Phaser.Input.Pointer,_x:number,_y:number,event:Phaser.Types.Input.EventData)=>{event.stopPropagation();this.toggle(type);});
   this.cards.set(type,frame);
  });
 }
 private buildBank():void {
  menuPanel(this,640,BANK_Y,1080,132);
  this.counter=this.add.text(1168,688,'',{fontFamily:'Arial, sans-serif',fontSize:'18px',color:'#f1e3b6',resolution:2}).setOrigin(1,.5).setDepth(DEPTH.ui);
  for(let i=0;i<SEED_SLOTS;i++){
   const x=640+(i-(SEED_SLOTS-1)/2)*SLOT_STEP;
   const slot=this.add.rectangle(x,BANK_Y,SLOT_W,100,0x34281d,.8).setStrokeStyle(2,0xa57f4b).setDepth(DEPTH.ui);
   const icon=this.add.image(x,BANK_Y,'peashooter').setDepth(DEPTH.ui+1).setVisible(false);this.slots.push(icon);
   slot.setInteractive({useHandCursor:true}).on('pointerdown',()=>{const type=this.chosen[i];if(type)this.toggle(type);});
  }
 }
 private toggle(type:PlantType):void {
  if(this.leaving)return;
  const index=this.chosen.indexOf(type);
  if(index>=0)this.chosen.splice(index,1);
  else {if(this.chosen.length>=SEED_SLOTS)this.chosen.shift();this.chosen.push(type);}
  audio.sfx('click');this.refresh();
 }
 private refresh():void {
  this.cards.forEach((frame,type)=>{const selected=this.chosen.includes(type);frame.setStrokeStyle(selected?5:2,selected?0xffdc71:0x39291e);frame.setFillStyle(selected?0xffdc71:0x926a3c);});
  this.slots.forEach((icon,i)=>{const type=this.chosen[i];icon.setVisible(Boolean(type));if(type)fitMenuArt(icon.setTexture(PLANT_DEFS[type].texture),86,86);});
  this.counter.setText(`${this.chosen.length} / ${SEED_SLOTS}`);this.startButton.setEnabled(this.chosen.length>0);
 }
 private startLevel():void {
  if(this.leaving||!this.chosen.length)return;this.leaving=true;
  const seeds=SEED_ORDER.filter(type=>this.chosen.includes(type));progress.setLoadout(this.levelId,seeds);
  this.cameras.main.fadeOut(160);this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,()=>this.scene.start('game',{levelId:this.levelId,seeds}));
 }
 private goBack():void {
  if(this.leaving)return;this.leaving=true;
  this.cameras.main.fadeOut(120);this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,()=>this.scene.start('levels'));
 }
}
