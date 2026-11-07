/** Bounded, device-local measurements. No network reporting or gameplay changes. */
export const PERFORMANCE_SECTIONS = ['plants','zombies','projectiles','waves/UI','other gameplay'] as const;
export type PerformanceSection = typeof PERFORMANCE_SECTIONS[number];
export interface FrameCost {
  interval: number; update: number; render: number;
  sections: Record<PerformanceSection,number>;
}
function emptySections():Record<PerformanceSection,number> {
  return {plants:0,zombies:0,projectiles:0,'waves/UI':0,'other gameplay':0};
}
function stats(values:number[]) {
  if(!values.length)return {mean:0,p95:0,max:0};
  values.sort((a,b)=>a-b);
  return {mean:values.reduce((sum,n)=>sum+n,0)/values.length,p95:values[Math.ceil(values.length*.95)-1],max:values[values.length-1]};
}
export class PerformanceHistory {
  private frames:FrameCost[]=[];
  private cursor=0;
  private worst:FrameCost[]=[];
  private saves:{durationMs:number;at:string}[]=[];
  constructor(private readonly capacity=600){}
  add(frame:FrameCost):void {
    this.frames[this.cursor]=frame;this.cursor=(this.cursor+1)%this.capacity;
    // Keep slowest frames even after they leave the recent ten-second window.
    if(frame.interval>25){this.worst.push(frame);this.worst.sort((a,b)=>b.interval-a.interval);this.worst.length=Math.min(10,this.worst.length);}
  }
  save(durationMs:number):void {this.saves.push({durationMs,at:new Date().toISOString()});if(this.saves.length>30)this.saves.shift();}
  clear():void {this.frames=[];this.cursor=0;this.worst=[];this.saves=[];}
  snapshot(){
    const interval=stats(this.frames.map(f=>f.interval));
    return {frames:this.frames.length,fps:interval.mean?1000/interval.mean:0,interval,
      engineOther:stats(this.frames.map(f=>Math.max(0,f.update-Object.values(f.sections).reduce((s,n)=>s+n,0)))),
      update:stats(this.frames.map(f=>f.update)),render:stats(this.frames.map(f=>f.render)),
      sections:Object.fromEntries(PERFORMANCE_SECTIONS.map(name=>[name,stats(this.frames.map(f=>f.sections[name]))])),
      over25ms:this.frames.filter(f=>f.interval>25).length,over50ms:this.frames.filter(f=>f.interval>50).length,
      saves:stats(this.saves.map(s=>s.durationMs)),recentSaves:[...this.saves],worst:[...this.worst]};
  }
}
export class GamePerformance {
  readonly history=new PerformanceHistory();
  constructor(private readonly clock:()=>number=()=>performance.now()){}
  private previousStart:number|undefined;
  private currentStart=0;
  private updateEnd=0;
  private renderStart=0;
  private sections=emptySections();
  private pending?:Omit<FrameCost,'interval'>;
  active=false;
  resetClock():void {this.previousStart=undefined;this.currentStart=0;this.pending=undefined;this.active=false;}
  begin(active:boolean,now=this.clock()):void {
    if(!active){this.resetClock();return;}
    // The interval ending now belongs to the preceding frame's work. Use real
    // elapsed time, not Phaser's smoothed/capped simulation delta.
    if(this.previousStart!==undefined&&this.pending)this.history.add({interval:now-this.previousStart,...this.pending});
    this.active=true;this.previousStart=now;this.currentStart=now;this.sections=emptySections();
  }
  mark():number {return this.active?this.clock():0;}
  section(name:PerformanceSection,start:number):void {if(this.active)this.sections[name]+=this.clock()-start;}
  endUpdate():void {if(this.active)this.updateEnd=this.clock();}
  beginRender():void {if(this.active)this.renderStart=this.clock();}
  endRender():void {if(this.active)this.pending={update:this.updateEnd-this.currentStart,render:this.clock()-this.renderStart,sections:this.sections};}
}
export const gamePerformance=new GamePerformance();
