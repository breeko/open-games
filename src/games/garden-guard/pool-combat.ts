import type {SnorkelSnapshot} from './state/session-data';
/** Original clips: 19 frames / 16fps entry, 12 / 24fps surfacing.
 * Source locomotion is direct 0.2px/tick after entry, then 0.3 after diving. */
export class SnorkelRoutine {
 phase:SnorkelSnapshot['phase']='walk';
 remainingMs=0;
 private remainder=0;
 save():SnorkelSnapshot {return {phase:this.phase,remainingMs:this.remainingMs,remainder:this.remainder};}
 restore(data:SnorkelSnapshot):void {this.phase=data.phase;this.remainingMs=data.remainingMs;this.remainder=data.remainder;}
 get inWater():boolean {return this.phase==='swim'||this.phase==='rise'||this.phase==='eat'||this.phase==='dive';}
 get exposed():boolean {return this.phase!=='swim'&&this.phase!=='dive'&&this.phase!=='enter';}
 get offGround():boolean {return this.phase==='enter';}
 get canEat():boolean {return this.phase==='eat'||this.phase==='walk'||this.phase==='exit';}
 advance(delta:number,enter:boolean,exit:boolean,target:boolean,_chilled:boolean):void {
  this.remainder+=delta;
  while(this.remainder>=10){
   this.remainder-=10;
   if(this.phase==='walk'&&enter){this.phase='enter';this.remainingMs=1190;}
   else if(this.phase==='enter'){this.remainingMs=Math.max(0,this.remainingMs-10);if(!this.remainingMs)this.phase='swim';}
   else if(this.phase==='swim'){
    if(exit){this.phase='exit';}
    else if(target){this.phase='rise';this.remainingMs=500;}
   }else if(this.phase==='rise'){
    if(!target){this.phase='dive';this.remainingMs=500-this.remainingMs;}
    else {this.remainingMs=Math.max(0,this.remainingMs-10);if(!this.remainingMs)this.phase='eat';}
   }else if(this.phase==='eat'&&!target){this.phase='dive';this.remainingMs=500;}
   else if(this.phase==='dive'){this.remainingMs=Math.max(0,this.remainingMs-10);if(!this.remainingMs)this.phase='swim';}
  }
 }
}
