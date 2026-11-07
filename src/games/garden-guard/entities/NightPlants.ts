import {Plant} from './Plant';
import {Shooter} from './Shooter';
import {Sun} from './Sun';
import {Zombie} from './Zombie';
import {NIGHT_RULES} from '../night';
import {DEPTH} from '../constants';
import type {PlantBehavior} from '../state/session-data';

export class PuffShroom extends Shooter {}
export class SunShroom extends Plant {
 private age=0;
 private timer=0;
 private next=3000+Math.floor(this.ctx.random()*951)*10;
 protected override saveBehavior():PlantBehavior {return {kind:'sunshroom',age:this.age,timer:this.timer,next:this.next};}
 protected override restoreBehavior(data:PlantBehavior):void {if(data.kind!=='sunshroom')throw new Error('Wrong Sun-shroom behavior');this.age=data.age;this.timer=data.timer;this.next=data.next;this.setTexture(this.age>=NIGHT_RULES.sunGrowthMs?'sunshroom-grown':'sunshroom');}
 protected onTick(delta:number):void {
  this.age+=delta;this.timer+=delta;
  if(this.age>=NIGHT_RULES.sunGrowthMs&&this.texture.key!=='sunshroom-grown')this.setTexture('sunshroom-grown');
  if(this.timer<this.next)return;
  this.timer-=this.next;this.next=23500+Math.floor(this.ctx.random()*151)*10;
  new Sun(this.scene,this.x,this.y-8,this.age<NIGHT_RULES.sunGrowthMs?15:25,value=>this.ctx.resources.add(value),undefined,this.ctx.sunBank);
 }
}
export class GraveBuster extends Plant {
 private elapsed=0;
 protected override saveBehavior():PlantBehavior {return {kind:'gravebuster',elapsed:this.elapsed};}
 protected override restoreBehavior(data:PlantBehavior):void {if(data.kind!=='gravebuster')throw new Error('Wrong Grave Buster behavior');this.elapsed=data.elapsed;}
 protected onTick(delta:number):void {
  this.elapsed+=delta;
  if(this.elapsed<NIGHT_RULES.graveEatingMs)return;
  this.ctx.clearGrave(this.col,this.row);this.remove();
 }
}
export class FumeShroom extends Plant {
 private ticks=50;
 private remainder=0;
 protected override saveBehavior():PlantBehavior {return {kind:'fume',ticks:this.ticks,remainder:this.remainder};}
 protected override restoreBehavior(data:PlantBehavior):void {if(data.kind!=='fume')throw new Error('Wrong Fume-shroom behavior');this.ticks=data.ticks;this.remainder=data.remainder;}
 protected onTick(delta:number):void {
  this.remainder+=delta;
  while(this.remainder>=10){
   this.remainder-=10;
   if(--this.ticks>0)continue;
   this.ticks=150-Math.floor(this.ctx.random()*15);
   const targets=this.ctx.zombies.getChildren().filter((z):z is Zombie=>z instanceof Zombie&&z.active&&z.isHostile&&!z.isHeadless&&z.row===this.row&&z.x>this.x&&z.x-this.x<=(this.def.range??576));
   if(!targets.length)continue;
   for(const zombie of targets)zombie.takeDamage(20,true);
   const cloud=this.scene.add.image(this.x+190,this.y-25,'puff').setDisplaySize(400,76).setAlpha(0.55).setDepth(DEPTH.peas);
   this.scene.tweens.add({targets:cloud,x:cloud.x+80,alpha:0,duration:300,onComplete:()=>cloud.destroy()});
  }
 }
}


export class HypnoShroom extends Plant {protected onTick(_delta:number):void {}}
export class ScaredyShroom extends Shooter {
 protected override onTick(delta:number):void {
  const danger=this.ctx.zombies.getChildren().some(z=>z instanceof Zombie&&z.active&&z.isHostile&&Math.abs(z.row-this.row)<=1&&Math.hypot(z.x-this.x,(z.row-this.row)*160)<192);
  this.setTexture(danger?'scaredyshroom-hidden':'scaredyshroom');
  if(!danger)super.onTick(delta);
 }
}
