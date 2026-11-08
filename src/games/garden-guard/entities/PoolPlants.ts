import {Plant} from './Plant';
import {Zombie} from './Zombie';
import type {PlantBehavior} from '../state/session-data';
import {DEPTH} from '../constants';

export class LilyPad extends Plant {protected onTick(_delta:number):void {}}
/** Original 80/45/50/10-tick look, preparation, rise and fall counters.
 * Release offsets/target prediction use our existing collision rectangles. */
export class Squash extends Plant {
 private phase:'idle'|'look'|'prepare'|'rise'|'fall'|'landed'='idle';
 private remaining=0;
 private targetX=0;
 protected override saveBehavior():PlantBehavior {return {kind:'squash',phase:this.phase,remainingMs:this.remaining,targetX:this.targetX};}
 protected override restoreBehavior(data:PlantBehavior):void {
  if(data.kind!=='squash')throw new Error('Wrong Squash behavior');
  this.phase=data.phase;this.remaining=data.remainingMs;this.targetX=data.targetX;this.updatePosition();
 }
 override get canBeEaten():boolean {return this.phase==='idle'&&!this.isDying;}
 private target():Zombie|undefined {
  const point=this.ctx.grid.cellToWorld(this.col,this.row),left=point.x-32,right=point.x+72;
  let best:Zombie|undefined,range=Infinity;
  for(const child of this.ctx.zombies.getChildren()){
   if(!(child instanceof Zombie)||!child.active||!child.canBeCrushed||child.isHeadless||child.row!==this.row||!child.body)continue;
   const body=child.body,gap=Math.max(left,body.x)-Math.min(right,body.x+body.width);
   if(body.x+body.width<left-(child.variant==='football'?96:0)||gap>(child.isEating?176:112))continue;
   if(gap<range){best=child;range=gap;}
  }
  return best;
 }
 private updatePosition():void {
  const p=this.ctx.grid.cellToWorld(this.col,this.row),baseY=p.y+66-this.height*.5*(1-this.originY);
  if(this.phase==='rise'){
   const t=Math.min(1,(500-this.remaining)/300),ease=t*t*(3-2*t);
   this.x=p.x+(this.targetX-p.x)*ease;this.y=baseY-192*ease;
  }else if(this.phase==='fall'){this.x=this.targetX;this.y=baseY-192*this.remaining/100;}
  else if(this.phase==='landed'){this.x=this.targetX;this.y=baseY;this.setAlpha(.65);}
  else {this.x=p.x;this.y=baseY;}
  this.shadow?.setPosition(this.x,p.y+62);
  if(this.phase==='rise'||this.phase==='fall')this.setDepth(DEPTH.effects+1);
 }
 private crush():void {
  for(const child of [...this.ctx.zombies.getChildren()]){
   if(!(child instanceof Zombie)||!child.active||!child.canBeCrushed||child.isHeadless||child.row!==this.row||!child.body)continue;
   const overlap=Math.min(this.x+72,child.body.x+child.body.width)-Math.max(this.x-32,child.body.x);
   if(overlap>(child.variant==='football'?-32:0))child.takeDamage(1800,true);
  }
 }
 protected onTick(delta:number):void {
  if(this.phase==='idle'){
   const target=this.target();if(!target)return;
   this.targetX=target.x;this.phase='look';this.remaining=800;return;
  }
  let left=delta;
  while(left>0&&this.active&&!this.isDying){
   const used=Math.min(left,this.remaining),before=this.remaining;this.remaining-=used;left-=used;
   if(this.phase==='fall'&&before>50&&this.remaining<=50){this.updatePosition();this.crush();}
   if(this.remaining>0)break;
   if(this.phase==='look'){this.phase='prepare';this.remaining=450;}
   else if(this.phase==='prepare'){const target=this.target();if(target)this.targetX=target.x-target.currentSpeed*.3;this.phase='rise';this.remaining=500;}
   else if(this.phase==='rise'){this.phase='fall';this.remaining=100;}
   else if(this.phase==='fall'){
    if(this.ctx.grid.isWaterRow(this.row)){this.remove();break;}
    this.phase='landed';this.remaining=1000;
   }else {this.remove();break;}
  }
  this.updatePosition();
 }
}

/** Captures one live target by reference; snapshots use its array index. */
export class TangleKelp extends Plant {
 private remaining=0;
 private target?:Zombie;
 private restoreIndex:number|null=null;
 override get canBeEaten():boolean {return false;}
 protected override saveBehavior(references?:ReadonlyMap<Zombie,number>):PlantBehavior {
  return {kind:'kelp',remainingMs:this.remaining,targetIndex:this.target?references?.get(this.target)??null:null};
 }
 protected override restoreBehavior(data:PlantBehavior):void {
  if(data.kind!=='kelp')throw new Error('Wrong kelp behavior');
  this.remaining=data.remainingMs;this.restoreIndex=data.targetIndex;
 }
 override restoreZombieLinks(zombies:readonly Zombie[]):void {
  if(this.restoreIndex!==null){this.target=zombies[this.restoreIndex];this.target?.holdByKelp(true,this.remaining<=500);}
 }
 protected onTick(delta:number):void {
  if(this.remaining>0){
   const before=this.remaining;this.remaining=Math.max(0,this.remaining-delta);
   if(before>500&&this.remaining<=500)this.target?.holdByKelp(true,true);
   if(this.remaining===0){if(this.target?.active)this.target.takeDamage(99999,true);this.remove();}
   return;
  }
  const left=this.ctx.grid.cellToWorld(this.col,this.row).x-64,right=left+128;
  const target=this.ctx.zombies.getChildren().find((z):z is Zombie=>z instanceof Zombie&&z.canBeKelpTarget&&z.row===this.row&&Boolean(z.body&&z.body.x<right&&z.body.x+z.body.width>left));
  if(target){this.target=target;this.remaining=1000;target.holdByKelp(true,false);}
 }
 override remove():void {if(this.target?.active)this.target.holdByKelp(false,false);super.remove();}
 override destroy(fromScene?:boolean):void {if(this.target?.active)this.target.holdByKelp(false,false);super.destroy(fromScene);}
}

/** Prepared reward for 3-4; selectable in the Playground before 3-5 exists. */
export class Jalapeno extends Plant {
 private fuse=0;
 protected override saveBehavior():PlantBehavior {return {kind:'cherry',fuse:this.fuse};}
 protected override restoreBehavior(data:PlantBehavior):void {if(data.kind!=='cherry')throw new Error('Wrong Jalapeno behavior');this.fuse=data.fuse;}
 protected onTick(delta:number):void {
  this.fuse+=delta;if(this.fuse<1000)return;
  for(const child of [...this.ctx.zombies.getChildren()])if(child instanceof Zombie&&child.active&&child.isHostile&&child.row===this.row)child.burn();
  const center=this.ctx.grid.cellToWorld(4,this.row),flame=this.scene.add.rectangle(center.x,center.y,1152,90,0xff991b,.65).setDepth(DEPTH.effects);
  this.scene.tweens.add({targets:flame,alpha:0,duration:450,onComplete:()=>flame.destroy()});this.destroy();
 }
}
