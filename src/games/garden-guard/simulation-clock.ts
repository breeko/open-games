export type GameSpeed=1|2;
export function readGameSpeed(value:unknown):GameSpeed {return value===2?2:1;}
/** Run ordinary simulation steps, then let Phaser render once. Two steps avoid
 * changing collision/timer ordering by feeding every system one giant delta. */
export class SimulationClock {
  private time=0;
  reset(time:number):void {this.time=time;}
  advance(delta:number,speed:GameSpeed,step:(time:number,delta:number)=>boolean):void {
    if(!Number.isFinite(delta)||delta<=0)return;
    const bounded=Math.min(delta,100);
    for(let i=0;i<speed;i++){
      this.time+=bounded;
      if(!step(this.time,bounded))break;
    }
  }
}
