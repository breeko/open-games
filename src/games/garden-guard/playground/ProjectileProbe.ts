export interface ObservedProjectile {
 x:number;y:number;active:boolean;visible:boolean;alpha:number;renderFlags:number;texture:{key:string};
 once(event:'destroy',callback:()=>void):unknown;
}
type Pea=ObservedProjectile;
export type RemovalReason='hit'|'expired'|'offscreen'|'cleared'|'unexpected';
/** Opt-in playground instrumentation; no hooks or allocations for campaign peas. */
export class ProjectileProbe {
  private live=new Map<Pea,{born:number;drawn:boolean;reason?:RemovalReason}>();
  private renderingSuspended=false;private backgroundRemovals=0;
  setRenderingSuspended(value:boolean):void {this.renderingSuspended=value;}
  private spawned=0;private drawn=0;private missingDraws=0;private preDraw=0;
  private removed:Record<RemovalReason,number>={hit:0,expired:0,offscreen:0,cleared:0,unexpected:0};
  private events:object[]=[];
  constructor(private readonly clock:()=>number){}
  track(pea:Pea):void {
    const item:{born:number;drawn:boolean;reason?:RemovalReason}={born:this.clock(),drawn:false};this.live.set(pea,item);this.spawned++;
    pea.once('destroy',()=>{
      const reason=item.reason??'unexpected';this.removed[reason]++;
      if(!item.drawn&&reason!=='cleared'&&this.renderingSuspended)this.backgroundRemovals++;
      else if(!item.drawn&&reason!=='cleared'){this.preDraw++;this.event({kind:'removed before draw',reason,ageMs:this.clock()-item.born,x:pea.x,y:pea.y,texture:pea.texture.key});}
      this.live.delete(pea);
    });
  }
  removal(pea:Pea,reason:RemovalReason):void {const item=this.live.get(pea);if(item)item.reason=reason;}
  afterRender(renderList:readonly object[]):void {
    const rendered=new Set(renderList);
    for(const [pea,item] of this.live){
      if(rendered.has(pea)&&pea.visible&&pea.alpha>0){if(!item.drawn){item.drawn=true;this.drawn++;}}
      else if(pea.active&&pea.x>0&&pea.x<1280&&pea.y>0&&pea.y<960){
        this.missingDraws++;this.event({kind:'live pea absent from draw',x:pea.x,y:pea.y,ageMs:this.clock()-item.born,alpha:pea.alpha,visible:pea.visible,flags:pea.renderFlags});
      }
    }
  }
  private event(event:object):void {this.events.push(event);if(this.events.length>20)this.events.shift();}
  clear():void {for(const [pea] of this.live)this.removal(pea,'cleared');}
  snapshot(){return {spawned:this.spawned,drawnAtLeastOnce:this.drawn,live:this.live.size,missingDraws:this.missingDraws,removedBeforeFirstDraw:this.preDraw,removedWhileNotRendering:this.backgroundRemovals,removed:{...this.removed},recentEvents:[...this.events]};}
}
