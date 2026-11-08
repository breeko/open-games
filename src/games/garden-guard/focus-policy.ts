export function readAutoPause(value:unknown):boolean {return value!==false;}
export function shouldOpenMenuOnFocusLoss(state:{enabled:boolean;playing:boolean;menuOpen:boolean;paused:boolean}):boolean {
  return state.enabled&&state.playing&&!state.menuOpen&&!state.paused;
}
/** Best-effort hidden-tab progression. Bounded catch-up prevents a suspended
 * tab from replaying minutes/hours on return. Closed pages never advance. */
export class BackgroundClock {
  private previous:number|undefined;
  reset():void {this.previous=undefined;}
  advance(now:number,eligible:boolean,step:(delta:number)=>boolean):void {
    if(!eligible){this.reset();return;}
    const elapsed=this.previous===undefined?0:Math.min(1000,Math.max(0,now-this.previous));
    this.previous=now;
    for(let remaining=elapsed;remaining>0;){const dt=Math.min(20,remaining);remaining-=dt;if(!step(dt))break;}
  }
}
