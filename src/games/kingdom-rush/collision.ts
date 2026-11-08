import source from './reference/flash-collision.json';
import { type EnemyKind, type Point } from './content';

export interface Bounds { left:number; top:number; right:number; bottom:number }
interface SymbolBounds { frames:number[][]; labels:Record<string,number> }
const symbols:Record<string,SymbolBounds>=source.symbols;
const SCALE=1.28;

/** Original symbol display-list bounds, including its separately attached health bar. */
export function enemyBounds(enemy:Point&{kind:EnemyKind;animation:string;animAt:number;facing:number},tick:number):Bounds {
  const symbol=symbols[enemy.kind];
  const action=enemy.animation==='attack'?'fighting':enemy.animation==='heal'?'healing':enemy.animation==='walkingRightLeft'?'walking':enemy.animation;
  const start=symbol.labels[action]??symbol.labels.idle;
  const end=symbol.labels[action+'End']??(action==='fighting'&&enemy.kind==='shaman'?82:start);
  const age=Math.max(0,tick-enemy.animAt);
  const frame=start+(action.startsWith('walking')?age%(end-start+1):Math.min(age,end-start));
  const b=symbol.frames[frame];
  const bar=symbols[enemy.kind==='ogre'?'barMedium':'barSmall'].frames[0];
  const barY={goblin:-20,orc:-23,wolf:-20,shaman:-25,ogre:-39}[enemy.kind];
  const left=Math.min(b[0],bar[0]),right=Math.max(b[2],bar[2]);
  return {left:enemy.x+(enemy.facing<0?-right:left)*SCALE,right:enemy.x+(enemy.facing<0?-left:right)*SCALE,
    top:enemy.y+Math.min(b[1],bar[1]+barY)*SCALE,bottom:enemy.y+Math.max(b[3],bar[3]+barY)*SCALE};
}

/** One ballistic equation supplies both drawing and hit testing. */
export function projectilePose(p:{from:Point;to:Point;start:number;impact:number;kind:string;position?:Point},tick:number):Point&{angle:number} {
  if(p.position)return {...p.position,angle:Math.atan2(p.to.y-p.position.y,p.to.x-p.position.x)};
  const duration=Math.max(1,p.impact-p.start),t=Math.max(0,Math.min(duration,tick-p.start));
  const vx=(p.to.x-p.from.x)/duration,vy=(p.to.y-p.from.y)/duration;
  const gravity=p.kind==='physical'||p.kind==='explosion'?SCALE:0;
  return {x:p.from.x+vx*t,y:p.from.y+vy*t+gravity*t*(t-duration)/2,
    angle:Math.atan2(vy+gravity*(t+.5-duration/2),vx)};
}

export function arrowHits(enemy:Parameters<typeof enemyBounds>[0],p:Parameters<typeof projectilePose>[0],tick:number):boolean {
  const pose=projectilePose(p,tick),b=symbols.arrow.frames[0],c=Math.cos(pose.angle),s=Math.sin(pose.angle);
  const corners=[[b[0],b[1]],[b[2],b[1]],[b[0],b[3]],[b[2],b[3]]].map(([x,y])=>({x:pose.x+SCALE*(c*x-s*y),y:pose.y+SCALE*(s*x+c*y)}));
  const target=enemyBounds(enemy,tick);
  return Math.max(...corners.map(p=>p.x))>=target.left&&Math.min(...corners.map(p=>p.x))<=target.right&&
    Math.max(...corners.map(p=>p.y))>=target.top&&Math.min(...corners.map(p=>p.y))<=target.bottom;
}

export function barracksFormation(p:Point,slot:number):Point {
  const angle=(90+slot*120)*Math.PI/180;
  return {x:p.x+Math.cos(angle)*25.6,y:p.y+12.8+Math.sin(angle)*17.92};
}
