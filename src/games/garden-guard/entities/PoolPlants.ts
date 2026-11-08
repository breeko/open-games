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
   if(!(child instanceof Zombie)||!child.active||!child.canBeShot||child.row!==this.row||!child.body)continue;
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
   if(!(child instanceof Zombie)||!child.active||!child.canBeCrushed||child.row!==this.row||!child.body)continue;
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
