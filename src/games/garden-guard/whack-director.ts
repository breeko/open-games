import type {ZombieType} from './types';
import { whackDirectorSchema, type WhackDirectorSnapshot } from './state/session-data';
export const WHACK={waves:8,firstTicks:200,waveTicks:2000,quietTicks:300,finalDelayTicks:300,helmetHit:900} as const;
export function whackLoot(sun:number,type:ZombieType,roll:number):boolean {
 const factor=type==='buckethead'?4:type==='conehead'?2:1;
 const upper=sun>500?2800:sun>350?3100:sun>200?3700:5000;
 return roll>=2500*factor&&roll<=upper*factor;
}
export function whackBonk(hp:number,armor:number):{hp:number;armor:number} {
 return armor>0?{hp,armor:Math.max(0,armor-WHACK.helmetHit)}:{hp:0,armor:0};
}
export interface WhackPort {
 spawn(types:ZombieType[],wave:number,maxSpeed:number):void;
 liveCount():number;
 graveCount():number;
 addGraves(count:number):void;
 start(wave:number,total:number,flag:boolean):void;
 warning?():void;
 complete():void;
}
/** Challenge::WhackAZombieSpawning at 100Hz. Adventure overrides the table to EIGHT waves. */
export class WhackDirector {
 private tick=0;
 private remainder=0;
 private wave=0;
 private countdown:number=WHACK.firstTicks;
 private spawnCountdown=0;
 private done=false;
 readonly events:{tick:number;kind:string;wave:number;count?:number}[]=[];
 constructor(private readonly port:WhackPort,private readonly random:()=>number=Math.random){}
 get currentWave():number{return Math.max(1,this.wave);}
 get progress():number{return this.wave/WHACK.waves;}
 get snapshot(){return {tick:this.tick,wave:this.wave,countdownTicks:this.countdown,warningTicks:0,initialHealth:0,remainingHealth:0,healthThreshold:0};}
 stop():void {this.done=true;}
 save():WhackDirectorSnapshot {return {kind:'whack',tick:this.tick,remainder:this.remainder,wave:this.wave,countdown:this.countdown,spawnCountdown:this.spawnCountdown,done:this.done};}
 restore(input:WhackDirectorSnapshot):void {
  const data=whackDirectorSchema.parse(input);this.tick=data.tick;this.remainder=data.remainder;this.wave=data.wave;
  this.countdown=data.countdown;this.spawnCountdown=data.spawnCountdown;this.done=data.done;this.events.length=0;
 }
 update(delta:number):void {
  this.remainder+=delta;
  while(this.remainder>=10&&!this.done){this.remainder-=10;this.step();}
 }
 private step():void {
  this.tick++;
  if(this.wave===WHACK.waves&&this.countdown===0){
   if(this.port.liveCount()===0){this.done=true;this.port.complete();}return;
  }
  this.countdown--;
  if(this.countdown===100&&this.wave>0)this.port.addGraves(Math.max(1,5-this.port.graveCount()));
  if(this.countdown===5){this.events.push({tick:this.tick,kind:'next wave warning',wave:this.wave+1});this.port.warning?.();}
  if(this.countdown===0){
   this.countdown=WHACK.waveTicks;this.wave++;
   this.spawnCountdown=this.wave===WHACK.waves?WHACK.finalDelayTicks:1;
   this.port.start(this.wave,WHACK.waves,this.wave===WHACK.waves);
   this.events.push({tick:this.tick,kind:'wave start',wave:this.wave});
  }else if(this.countdown<WHACK.quietTicks)return;
  if(--this.spawnCountdown!==0)return;
  const phase=Math.max(0,Math.min(5,Math.trunc((this.wave-1)*6/12)));
  const double=[0,30,10,10,15,18][phase],triple=[0,0,0,0,10,13][phase];
  const bucket=[0,0,0,10,15,15][phase],cone=[0,0,30,30,30,30][phase];
  const countRoll=Math.floor(this.random()*100),typeRoll=Math.floor(this.random()*100);
  const final=this.wave===WHACK.waves;
  const count=final?20:countRoll<triple?3:countRoll<triple+double?2:1;
  const type:ZombieType=typeRoll<bucket&&count<3?'buckethead':typeRoll<bucket+cone?'conehead':'basic';
  const types=Array.from({length:count},()=>final?(this.random()<0.5?'conehead':'buckethead'):type);
  const fraction=Math.max(0,Math.min(1,(this.wave-1)/11));
  this.port.spawn(types,this.wave-1,final?2:1+2*fraction*fraction);
  this.events.push({tick:this.tick,kind:'spawn',wave:this.wave,count:Math.min(count,this.port.graveCount())});
  const low=Math.trunc(100-70*fraction),high=Math.trunc(200-140*fraction);
  this.spawnCountdown=low+Math.floor(this.random()*(high-low+1));
  if(final){this.countdown=0;this.spawnCountdown=0;}
 }
}
