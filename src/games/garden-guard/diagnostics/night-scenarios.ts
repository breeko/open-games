import {gardenSessionSchema,type GardenSession} from '../state/session-data';
import {defaultSeedsForLevel} from '../levels';
import {GRID} from '../constants';
import {initialGraves} from '../night';
import {backupPositions} from '../night-combat';

/** Local manual-test boards; imported only by the development diagnostics controls. */
export function nightDiagnostic(frozen=false):GardenSession {
 const seeds=defaultSeedsForLevel(18);
 const leader={type:'dancer',row:2,wave:5,x:850,y:GRID.originY+2.5*GRID.tileHeight+10,hp:500,maxHp:500,
  armorHp:0,shieldHp:0,speed:35,speedMultiplier:1,dps:100,allies:false,hasPole:false,
  emergenceTotal:0,emergenceMs:0,rageDelay:0,headless:false,bleedTicks:0,biteRemainder:0,
  slowFactor:0.5,slowRemainingMs:frozen?19000:0,frozenMs:frozen?4800:0,
  dance:{phase:frozen?'dance':'entry',remainingMs:frozen?0:100,replacementMs:0,remainder:0},leaderIndex:null,danceSlot:null,
  motion:{gait:frozen?'dancer':'dancerEntry',parameter:frozen?0.45:0.5,phase:0,remainder:0},vault:null};
 const backups=frozen?backupPositions(850,2).map(p=>({...leader,type:'backup',row:p.row,x:p.x,y:GRID.originY+(p.row+0.5)*160+10,hp:270,maxHp:270,
  dance:null,leaderIndex:0,danceSlot:p.slot,motion:{...leader.motion,gait:'backup',parameter:0.45}})):[];
 return gardenSessionSchema.parse({version:1,compatibility:'garden-day-night-r1',savedAt:Date.now(),levelId:18,difficulty:'baseline',seeds,sun:300,random:67890,
  physicsRemainderMs:0,skySunTimer:0,skyNext:4250,skyFallen:0,supplyTimer:0,supplyIndex:0,
  plants:[{type:'scaredyshroom',col:0,row:2,hp:300,behavior:{kind:'shooter',cooldown:25,remainder:0,shots:[],hidden:false}},
    {type:'scaredyshroom',col:5,row:2,hp:300,behavior:{kind:'shooter',cooldown:25,remainder:0,shots:[],hidden:true}},
    {type:'sunshroom',col:0,row:0,hp:300,behavior:{kind:'sunshroom',age:60000,timer:0,next:24000}}],
  zombies:[leader,...backups],suns:[],projectiles:[],graves:initialGraves(18),craters:[],
  waves:{random:12345,tickRemainder:0,riseTicks:0,laneHistory:[1,2],director:{kind:'standard',index:5,remainder:0,tick:18000,countdown:2500,interval:2500,warningTicks:0,initialHealth:500,threshold:275,done:false}},
  seedBank:seeds.map(type=>({type,stock:0,remainingMs:0,totalMs:1})),mowers:[0,1,2,3,4].map(row=>({row,x:GRID.originX-42,used:false,moving:false,visible:true})),rolling:[],
 });
}
