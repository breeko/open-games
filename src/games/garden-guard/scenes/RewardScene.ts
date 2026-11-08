import Phaser from 'phaser';
import {DEPTH,PLANT_DEFS} from '../constants';
import {TOTAL_LEVELS,getLevel,rewardForLevel} from '../levels';
import type {PlantType} from '../types';
import {MenuButton,menuLawn,menuPanel,fitMenuArt} from '../ui/MenuPresentation';

export interface RewardSceneData {levelId?:number;firstClear?:boolean;}
export class RewardScene extends Phaser.Scene {
 private levelId=1;
 private firstClear=false;
 private leaving=false;
 constructor(){super('reward');}
 init(data:RewardSceneData):void {this.levelId=data.levelId??1;this.firstClear=data.firstClear??false;}
 create():void {
  this.leaving=false;
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.input.removeAllListeners();this.input.keyboard?.removeAllListeners();});
  const level=getLevel(this.levelId),reward=this.firstClear?rewardForLevel(this.levelId):undefined,hasNext=this.levelId<TOTAL_LEVELS;
  menuLawn(this,level.environment);
  this.add.text(640,136,`${level.name} complete!`,{fontFamily:'Georgia, serif',fontStyle:'bold',fontSize:'48px',color:'#fff1ba',stroke:'#38291e',strokeThickness:5,resolution:2}).setOrigin(.5).setDepth(DEPTH.ui);
  if(reward)this.showReward(reward);
  else {
   menuPanel(this,640,440,440,390,true);
   fitMenuArt(this.add.image(640,405,'sun').setDepth(DEPTH.ui),170,170);
   this.add.text(640,558,hasNext?'Well played!':'All caught up!',{fontFamily:'Georgia, serif',fontStyle:'bold',fontSize:'32px',color:'#3b4c28',resolution:2}).setOrigin(.5).setDepth(DEPTH.ui);
  }
  if(hasNext){
   new MenuButton(this,435,798,'‹ Map',()=>this.navigate('levels'),false,190);
   new MenuButton(this,765,798,'Next ›',()=>this.continueTo(),true,290);
  }else new MenuButton(this,640,798,'Level map',()=>this.navigate('levels'),true,310);
  this.input.keyboard?.on('keydown-ENTER',()=>this.continueTo());
  this.input.keyboard?.on('keydown-SPACE',()=>this.continueTo());
  this.input.keyboard?.on('keydown-ESC',()=>this.navigate('levels'));
  this.cameras.main.fadeIn(160);
 }
 private showReward(type:PlantType):void {
  const def=PLANT_DEFS[type];
  menuPanel(this,640,440,400,470,true);
  this.add.text(640,245,'NEW PLANT',{fontFamily:'Arial, sans-serif',fontSize:'17px',fontStyle:'bold',letterSpacing:3,color:'#827447',resolution:2}).setOrigin(.5).setDepth(DEPTH.ui);
  fitMenuArt(this.add.image(640,405,def.texture).setDepth(DEPTH.ui),244,240);
  this.add.text(640,574,def.label,{fontFamily:'Georgia, serif',fontStyle:'bold',fontSize:'38px',color:'#354629',resolution:2}).setOrigin(.5).setDepth(DEPTH.ui);
  this.add.text(633,626,String(def.cost),{fontFamily:'Arial, sans-serif',fontStyle:'bold',fontSize:'25px',color:'#6c5a30',resolution:2}).setOrigin(.5).setDepth(DEPTH.ui);
  fitMenuArt(this.add.image(678,626,'sun').setDepth(DEPTH.ui),28,28);
 }
 private continueTo():void {if(this.levelId<TOTAL_LEVELS)this.navigate('seeds',{levelId:this.levelId+1});else this.navigate('levels');}
 private navigate(key:string,data?:{levelId:number}):void {
  if(this.leaving)return;this.leaving=true;
  this.cameras.main.fadeOut(120);this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,()=>this.scene.start(key,data));
 }
}
