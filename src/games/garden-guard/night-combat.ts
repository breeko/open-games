/** PC Ice-shroom: cold targets receive the shorter repeat-freeze window. */
export function iceFreezeMs(alreadyCold:boolean,random:()=>number):number {
 return (alreadyCold?300:400)*10+Math.floor(random()*(alreadyCold?101:201))*10;
}
/** Circle against the zombie collision rectangle, scaled uniformly from source pixels. */
export function scaredyThreat(plantX:number,plantY:number,row:number,zombie:{row:number;left:number;top:number;right:number;bottom:number}):boolean {
 if(Math.abs(zombie.row-row)>1)return false;
 // Original circle center: plant top-left X, Y+20; relative to cell center it is (-40,-30).
 const x=plantX-64,y=plantY-48;
 const dx=Math.max(zombie.left-x,0,x-zombie.right),dy=Math.max(zombie.top-y,0,y-zombie.bottom);
 return dx*dx+dy*dy<=192*192;
}
export const NIGHT_COMBAT={fuseMs:1000,iceChillMs:20000,iceDamage:20,doomDamage:1800,doomRadius:400,craterMs:180000} as const;
/** Source tests a radius against the entire zombie rectangle, not its anchor. */
export function inDoomBlast(x:number,y:number,row:number,target:{row:number;left:number;top:number;right:number;bottom:number}):boolean {
 if(Math.abs(target.row-row)>3)return false;
 const dx=Math.max(target.left-x,0,x-target.right),dy=Math.max(target.top-y,0,y-target.bottom);
 return dx*dx+dy*dy<=NIGHT_COMBAT.doomRadius**2;
}
export type DancePhase='entry'|'point'|'hold'|'dance';
export interface DanceState {phase:DancePhase;remainingMs:number;replacementMs:number;remainder:number}
/** Ten point frames at 24fps occupy 42 source ticks; entry/hold and the 23-frame global dance beat are retained. */
export class DanceRoutine {
 private state: DanceState;
 constructor(entryMs=3000){this.state={phase:'entry',remainingMs:entryMs,replacementMs:0,remainder:0};}
 get phase():DancePhase{return this.state.phase;}
 save():DanceState{return {...this.state};}
 restore(data:DanceState):void {this.state={...data};}
 canMove(tick:number):boolean {return this.state.phase==='entry'||this.state.phase==='dance'&&Math.floor(tick/20)%23<=11;}
 advance(delta:number,tick:number,needsMore:boolean,canSummon:boolean,canReplace=true):boolean {
  this.state.remainder+=delta;let summon=false;
  while(this.state.remainder>=10){
   this.state.remainder-=10;
   const stepTick=tick-Math.floor(this.state.remainder/10);
   if(this.state.phase==='entry'||this.state.phase==='point'||this.state.phase==='hold'){
    this.state.remainingMs=Math.max(0,this.state.remainingMs-10);
    if(this.state.remainingMs>0)continue;
    if(this.state.phase==='entry'){this.state.phase='point';this.state.remainingMs=420;}
    else if(this.state.phase==='point'){summon=canSummon;this.state.phase='hold';this.state.remainingMs=2000;}
    else this.state.phase='dance';
   }else if(needsMore&&canSummon&&canReplace){
    if(this.state.replacementMs===0)this.state.replacementMs=1000;
    else this.state.replacementMs=Math.max(1,this.state.replacementMs-10);
    if(this.state.replacementMs===1&&Math.floor(stepTick/20)%23===12){this.state.phase='point';this.state.remainingMs=420;this.state.replacementMs=0;}
   }else this.state.replacementMs=0;
  }
  return summon;
 }
}
export function backupPositions(x:number,row:number):{x:number;row:number;slot:number}[] {
 return [{x,row:row-1,slot:0},{x,row:row+1,slot:1},{x:x-160,row,slot:2},{x:x+160,row,slot:3}].filter(p=>p.row>=0&&p.row<5);
}
