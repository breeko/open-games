import { ASPECT, blastDamage, damageAfterArmor, distance, ENEMIES, enemyKind, FPS, inRange, LEVEL, rollDamage, SOLDIERS, STEP, TOWERS, type DamageKind, type EnemyKind, type Point, type SoldierKind, type TowerKind } from './content';

export interface Event { tick:number; type:string; [key:string]:string|number|boolean }
export interface Enemy extends Point { id:number; kind:EnemyKind; route:number; lane:number; node:number; hp:number; maxHp:number; deadAt:number; escaped:boolean; nextAttack:number; hitAt:number; attackTarget:number; healAt:number; healUntil:number; nextHeal:number; animation:string; animAt:number; facing:number }
export interface Soldier extends Point { id:number; kind:SoldierKind; towerId:number; activeAt:number; slot:number; rally:Point; hp:number; deadAt:number; respawnAt:number; expires:number; target:number; nextAttack:number; hitAt:number; regenAt:number; animation:string; animAt:number; facing:number }
export interface Tower extends Point { id:number; kind:TowerKind; level:number; readyAt:number; spent:number; rally:Point; targetId:number; nextAttack:number; fireAt:number; animAt:number; target:Point; shots:number }
export interface Projectile { id:number; kind:DamageKind; from:Point; to:Point; start:number; impact:number; target:number; damage:number; radius:number; minDamage?:number }
export interface Effect extends Point { type:'hit'|'heal'|'fire'|'death'; start:number; duration:number; radius:number }
export interface SpawnEvent { tick:number; kind:EnemyKind; route:number; lane:number }
export interface SpawnPlan { events:SpawnEvent[]; end:number }

/** Source delays are frame counts. Each chunk waits before its first spawn. */
export function planWave(groupIndex:number,startTick:number):SpawnPlan {
  const group=LEVEL.groups[groupIndex];
  const events:SpawnEvent[]=[]; let end=startTick;
  for(const route of group.waves) {
    let tick=startTick+route.delay;
    for(let i=0;i<route.spawns.length;i++) {
      const chunk=route.spawns[i]; let current=chunk.creep,count=0;
      for(let j=0;j<chunk.max;j++) {
        tick+=chunk.interval;
        if(chunk.creep_aux && chunk.max_same>0 && count>=chunk.max_same) {current=current===chunk.creep?chunk.creep_aux:chunk.creep;count=0;}
        events.push({tick,kind:enemyKind(current),route:route.path_index-1,lane:chunk.fixed_sub_path===1?chunk.path-1:-1});count++;
      }

      if(i<route.spawns.length-1)tick+=chunk.interval_next+2;
    }
    end=Math.max(end,tick+2);
  }
  return {events:events.sort((a,b)=>a.tick-b.tick),end};
}

export class Simulation {
  tick=0; gold=LEVEL.cash; lives=LEVEL.lives; wave=0; kills=0; leaked=0;
  phase:'ready'|'running'|'won'|'lost'='ready'; paused=false;
  readonly enemies:Enemy[]=[]; readonly soldiers:Soldier[]=[]; readonly towers:Tower[]=[];
  projectiles:Projectile[]=[]; effects:Effect[]=[]; readonly events:Event[]=[];
  readonly seed:number; private rng:number; private nextId=1; private pending:SpawnEvent[]=[];
  private groupEnd=0; private nextWaveTick=Infinity;
  fireReady=0; reinforcementsReady=0;
  constructor(seed=0xc0ffee) {this.seed=seed>>>0;this.rng=this.seed || 1;this.log('start',{seed:this.seed});}
  get time():number {return this.tick/FPS;}
  get nextIn():number {return Number.isFinite(this.nextWaveTick)?Math.max(0,(this.nextWaveTick-this.tick)/FPS):0;}
  get canCall():boolean {return this.wave<LEVEL.groups.length && (this.phase==='ready'||this.phase==='running') && (this.wave===0||this.tick>=this.groupEnd+50);}
  get earlyReward():number {return this.wave>0 && this.canCall?Math.max(0,Math.round(this.nextIn)):0;}
  private log(type:string,values:{[key:string]:string|number|boolean}={}):void {this.events.push({tick:this.tick,type,...values});}
  random():number {let x=this.rng;x^=x<<13;x^=x>>>17;x^=x<<5;this.rng=x>>>0;return this.rng/4294967296;}
  private roll(range:readonly [number,number]):number {return rollDamage(range,this.random());}
  setPaused(value:boolean):void {if(this.paused!==value){this.paused=value;this.log(value?'pause':'resume');}}
  build(holderId:number,kind:TowerKind):boolean {
    const h=LEVEL.holders.find(h=>h.id===holderId), cost=TOWERS[kind].price[0];
    if(!h||this.towers.some(t=>t.id===holderId)||this.gold<cost||this.phase==='won'||this.phase==='lost'||this.paused)return false;
    this.gold-=cost;
    const t:Tower={id:h.id,kind,level:1,readyAt:this.tick+FPS,spent:cost,...h.pos,rally:{...h.rally},targetId:0,nextAttack:this.tick+Math.round(TOWERS[kind].cooldown[0]*FPS),fireAt:0,animAt:-100,target:{...h.rally},shots:0};
    this.towers.push(t);if(kind==='barrack')for(let i=0;i<3;i++)this.createSoldier(t,i);
    this.log('build',{holder:holderId,kind,gold:this.gold});return true;
  }
  upgrade(id:number):boolean {
    const t=this.towers.find(t=>t.id===id);if(!t||t.level>=2||this.paused||this.phase==='won'||this.phase==='lost')return false;
    const cost=TOWERS[t.kind].price[t.level];if(this.gold<cost)return false;
    this.gold-=cost;t.spent+=cost;t.level++;
    if(t.kind==='barrack')for(const s of this.soldiers.filter(s=>s.towerId===t.id)){s.kind='footmen';s.hp=SOLDIERS.footmen.hp;s.deadAt=-1;s.respawnAt=0;}
    this.log('upgrade',{holder:id,level:t.level,gold:this.gold});return true;
  }
  sell(id:number):boolean {
    const i=this.towers.findIndex(t=>t.id===id);if(i<0||this.paused||this.phase==='won'||this.phase==='lost')return false;
    const [t]=this.towers.splice(i,1);const refund=Math.floor(t.spent*0.6);this.gold+=refund;
    for(const s of this.soldiers.filter(s=>s.towerId===id)){s.hp=0;s.expires=this.tick;s.respawnAt=Infinity;s.target=0;s.deadAt=this.tick;}
    this.log('sell',{holder:id,refund,gold:this.gold});return true;
  }
  setRally(id:number,p:Point):boolean {
    const t=this.towers.find(t=>t.id===id);if(!t||t.kind!=='barrack'||!inRange(t,p,145)||this.paused||this.phase==='won'||this.phase==='lost')return false;
    const road=this.nearestRoad(p);if(distance(road,p)>30)return false;
    t.rally={...road};for(const s of this.soldiers.filter(s=>s.towerId===id)){s.rally=this.formation(t.rally,s.slot);s.target=0;s.hitAt=0;}
    this.log('rally',{holder:id,x:road.x,y:road.y});return true;
  }
  nearestRoad(p:Point):Point {
    let best=LEVEL.paths[0].lanes[0][0],d=Infinity;
    for(const route of LEVEL.paths)for(const n of route.lanes[0]){const nd=distance(n,p);if(nd<d){d=nd;best=n;}}
    return {...best};
  }
  callWave(early=true):boolean {
    if(!this.canCall||this.paused)return false;
    const bonus=early?this.earlyReward:0;this.gold+=bonus;
    if(early&&this.wave>0){const advance=Math.round(this.nextIn*FPS);this.fireReady=Math.max(this.tick,this.fireReady-advance);this.reinforcementsReady=Math.max(this.tick,this.reinforcementsReady-advance);this.log('early-recharge',{ticks:advance});}
    const plan=planWave(this.wave,this.tick);this.pending.push(...plan.events);this.groupEnd=plan.end;
    this.wave++;this.phase='running';
    this.nextWaveTick=this.wave<LEVEL.groups.length?this.groupEnd+LEVEL.groups[this.wave].interval:Infinity;
    this.log('wave',{wave:this.wave,bonus,gold:this.gold,spawnEnd:this.groupEnd});return true;
  }
  cast(kind:'fire'|'reinforcements',p:Point):boolean {
    if(this.paused||this.phase!=='running'||p.x<0||p.x>1024||p.y<0||p.y>768)return false;
    if(kind==='fire') {
      if(this.tick<this.fireReady)return false;
      this.fireReady=this.tick+80*FPS;
      for(let i=0;i<3;i++) {
        const to={x:p.x+(this.random()*2-1)*19.2,y:p.y+(this.random()*2-1)*19.2};
        this.projectiles.push({id:this.nextId++,kind:'true',from:{x:to.x,y:0},to,start:this.tick+10+i*10,impact:this.tick+10+i*10+this.fireFlightTicks(to),target:0,damage:this.roll([30,60]),radius:64});
      }
    } else {
      if(this.tick<this.reinforcementsReady)return false;
      const road=this.nearestRoad(p);if(distance(road,p)>35)return false;
      this.reinforcementsReady=this.tick+10*FPS;
      for(let i=0;i<2;i++)this.createSoldier(undefined,i,road);
    }
    this.log('cast',{kind,x:p.x,y:p.y});return true;
  }
  private fireFlightTicks(to:Point):number {
    let remaining=Math.max(0,to.y),speed=10,ticks=0;
    while(remaining>speed*1.28&&ticks<100){speed=Math.min(15,speed+Math.ceil(speed*.05));remaining-=speed*1.28;ticks++;}
    return Math.max(1,ticks+1);
  }
  private formation(p:Point,slot:number):Point {return {x:p.x+(slot-1)*15,y:p.y+(slot===1?-8:5)};}
  private createSoldier(t:Tower|undefined,slot:number,p?:Point):void {
    const rally=this.formation(t?.rally??p??{x:0,y:0},slot);
    const kind:SoldierKind=t?(t.level===1?'militia':'footmen'):'farmer';
    this.soldiers.push({id:this.nextId++,kind,towerId:t?.id??0,activeAt:t?this.tick+FPS+12:this.tick,slot,rally,hp:SOLDIERS[kind].hp,...(t?{x:t.x,y:t.y}:rally),deadAt:-1,respawnAt:0,expires:t?Infinity:this.tick+20*FPS,target:0,nextAttack:this.tick+FPS,hitAt:0,regenAt:this.tick+FPS,animation:'running',animAt:this.tick,facing:1});
  }
  spawn(kind:EnemyKind,route=0,lane=0):Enemy {
    const path=LEVEL.paths[route];const start=path.lanes[lane][path.start],spec=ENEMIES[kind];
    const e:Enemy={id:this.nextId++,kind,route,lane,node:path.start,hp:spec.hp,maxHp:spec.hp,...start,deadAt:-1,escaped:false,nextAttack:this.tick,hitAt:0,attackTarget:0,healAt:0,healUntil:0,nextHeal:this.tick+8*FPS,animation:'walkingRightLeft',animAt:this.tick,facing:-1};
    this.enemies.push(e);this.log('spawn',{enemy:e.id,kind,route:route+1,lane:lane+1});return e;
  }
  remaining(e:Enemy):number {return LEVEL.paths[e.route].end-e.node;}
  private living():Enemy[] {return this.enemies.filter(e=>e.hp>0&&!e.escaped);}
  private animate(unit:Enemy|Soldier,animation:string):void {if(unit.animation!==animation){unit.animation=animation;unit.animAt=this.tick;}}
  private move(p:Point,to:Point,speed:number):boolean {
    const d=distance(p,to),step=speed*STEP;if(d<=step){p.x=to.x;p.y=to.y;return true;}
    p.x+=(to.x-p.x)*step/d;p.y+=(to.y-p.y)*step/d;return false;
  }
  private hurtEnemy(e:Enemy,value:number,kind:DamageKind,melee=false):void {
    if(e.hp<=0||e.escaped)return;
    const spec=ENEMIES[e.kind];if(melee&&this.random()<spec.dodge){this.effects.push({...e,type:'hit',start:this.tick,duration:8,radius:12});return;}
    const damage=damageAfterArmor(value,kind,spec.armor,spec.magicArmor);e.hp=Math.max(0,e.hp-damage);
    if(e.hp===0){e.deadAt=this.tick;e.animation='death';e.animAt=this.tick;this.kills++;this.gold+=spec.gold;this.log('kill',{enemy:e.id,gold:this.gold});}
  }
  private hurtSoldier(s:Soldier,value:number):void {
    if(s.hp<=0)return;const spec=SOLDIERS[s.kind];s.hp=Math.max(0,s.hp-damageAfterArmor(value,'physical',spec.armor,0,true));
    if(s.hp===0){s.deadAt=this.tick;s.respawnAt=s.towerId?this.tick+10*FPS:Infinity;s.target=0;s.animation='death';s.animAt=this.tick;this.log('soldier-death',{soldier:s.id});}
  }
  private stepSoldier(s:Soldier):void {
    if(this.tick<s.activeAt)return;
    if(this.tick>=s.expires){if(s.hp>0){s.hp=0;s.target=0;s.deadAt=this.tick;s.animation='death';s.animAt=this.tick;}return;}
    if(s.hp<=0){
      if(this.tick>=s.respawnAt){const t=this.towers.find(t=>t.id===s.towerId);if(!t)return; s.hp=SOLDIERS[s.kind].hp;s.activeAt=this.tick+12;s.x=t.x;s.y=t.y;s.rally=this.formation(t.rally,s.slot);s.deadAt=-1;s.target=0;s.hitAt=0;s.nextAttack=this.tick+FPS;this.log('soldier-respawn',{soldier:s.id});}
      else return;
    }
    const spec=SOLDIERS[s.kind];
    let target=this.enemies.find(e=>e.id===s.target&&e.hp>0&&!e.escaped);
    if(target&&!inRange(s.rally,target,85)){target=undefined;s.target=0;s.hitAt=0;}
    if(!target){
      const candidates=this.living().filter(e=>inRange(s.rally,e,60));
      candidates.sort((a,b)=>{
        const ab=this.soldiers.filter(o=>o.hp>0&&o.target===a.id).length,bb=this.soldiers.filter(o=>o.hp>0&&o.target===b.id).length;
        return (ab>0?1:0)-(bb>0?1:0)||this.remaining(a)-this.remaining(b);
      });
      target=candidates[0];s.target=target?.id??0;
    }
    if(target){
      s.facing=target.x>=s.x?1:-1;
      const companions=this.soldiers.filter(o=>o.hp>0&&o.target===target!.id),rank=companions.findIndex(o=>o.id===s.id);
      const to={x:target.x+(rank%2===0?-1:1)*ENEMIES[target.kind].slot,y:target.y+(rank>1?10:0)};
      if(distance(s,to)>5){this.animate(s,'running');this.move(s,to,spec.speed);s.hitAt=0;}
      else {
        if(s.hitAt>0&&this.tick>=s.hitAt){this.hurtEnemy(target,this.roll(spec.damage),'physical',true);s.hitAt=0;}
        if(this.tick>=s.nextAttack&&target.hp>0){s.animation='attack';s.animAt=this.tick;s.hitAt=this.tick+5;s.nextAttack=this.tick+Math.round(spec.cooldown*FPS);}
        else if(this.tick-s.animAt>20)this.animate(s,'idle');
      }
      s.regenAt=this.tick+3*FPS;
    } else {
      s.hitAt=0;
      if(distance(s,s.rally)>2){s.facing=s.rally.x>=s.x?1:-1;this.animate(s,'running');this.move(s,s.rally,spec.speed);s.regenAt=this.tick+3*FPS;}
      else {this.animate(s,'idle');if(this.tick>=s.regenAt){s.hp=Math.min(spec.hp,s.hp+spec.regen);s.regenAt=this.tick+FPS;}}
    }
  }
  private stepEnemy(e:Enemy):void {
    if(e.hp<=0||e.escaped)return;const spec=ENEMIES[e.kind];
    if(e.kind==='shaman'){
      if(e.healAt>0&&this.tick>=e.healAt){
        const wounded=this.living().filter(o=>o.hp<o.maxHp&&inRange(e,o,96)).slice(0,3);
        for(const o of wounded){o.hp=Math.min(o.maxHp,o.hp+50);this.effects.push({...o,type:'heal',start:this.tick,duration:24,radius:22});}
        e.healAt=0;
      }
      if(this.tick>=e.nextHeal&&this.tick>=e.healUntil&&this.living().some(o=>o.hp<o.maxHp&&inRange(e,o,96))){e.healAt=this.tick+14;e.healUntil=this.tick+28;e.nextHeal=e.healUntil+8*FPS;e.animation='heal';e.animAt=this.tick;}
      if(this.tick<e.healUntil)return;
    }
    const blocker=this.soldiers.find(s=>s.hp>0&&this.tick>=s.activeAt&&s.target===e.id&&distance(s,e)<spec.slot+12);
    if(blocker){
      e.facing=blocker.x>=e.x?1:-1;
      if(e.hitAt>0&&this.tick>=e.hitAt){const victim=this.soldiers.find(s=>s.id===e.attackTarget&&s.hp>0);if(victim&&distance(e,victim)<55)this.hurtSoldier(victim,this.roll(spec.damage));e.hitAt=0;}
      if(this.tick>=e.nextAttack){e.attackTarget=blocker.id;e.animation='attack';e.animAt=this.tick;e.hitAt=this.tick+Math.round(spec.hitTime*FPS);e.nextAttack=this.tick+Math.round(spec.cooldown*FPS);}
      return;
    }
    e.hitAt=0;
    const route=LEVEL.paths[e.route],lane=route.lanes[e.lane];
    let travel=spec.speed*1.28*STEP;
    while(travel>0&&e.node<route.end){
      const next=lane[Math.min(e.node+1,lane.length-1)],d=distance(e,next),oldX=e.x,oldY=e.y;
      if(d<=travel){e.x=next.x;e.y=next.y;e.node++;travel-=d;}
      else {e.x+=(next.x-e.x)*travel/d;e.y+=(next.y-e.y)*travel/d;travel=0;}
      const dx=e.x-oldX,dy=e.y-oldY;e.facing=dx>=0?1:-1;
      this.animate(e,Math.abs(dy)>Math.abs(dx)*1.4?(dy>0?'walkingDown':'walkingUp'):'walkingRightLeft');
    }
    if(e.node>=route.end){e.escaped=true;this.lives=Math.max(0,this.lives-spec.lives);this.leaked++;this.log('leak',{enemy:e.id,lives:this.lives});}
  }
  private target(t:Tower):Enemy|undefined {return this.living().filter(e=>inRange({x:t.x,y:t.y-12},t.kind==='engineer'?this.bombAim(e):e,TOWERS[t.kind].range[t.level-1])&&e.x>=0&&e.x<=1024).sort((a,b)=>this.remaining(a)-this.remaining(b))[0];}
  private blocked(e:Enemy):boolean {return this.soldiers.some(s=>s.hp>0&&this.tick>=s.activeAt&&s.target===e.id&&distance(s,e)<ENEMIES[e.kind].slot+12);}
  private bombAim(e:Enemy):Point {
    if(this.blocked(e)||this.tick<e.healUntil)return {x:e.x,y:e.y};
    const route=LEVEL.paths[e.route],lead=Math.ceil(5.5*ENEMIES[e.kind].speed/FPS);
    return {...route.lanes[e.lane][Math.min(route.end,e.node+lead)]};
  }
  private arrowAim(e:Enemy,ticks:number):Point {
    const p={x:e.x,y:e.y-10.24};
    if(!this.blocked(e)&&this.tick>=e.healUntil){
      const lane=LEVEL.paths[e.route].lanes[e.lane],next=lane[Math.min(e.node+1,lane.length-1)],d=distance(e,next);
      if(d>0){const travel=ENEMIES[e.kind].speed*1.28*ticks/FPS;p.x+=(next.x-e.x)*travel/d;p.y+=(next.y-e.y)*travel/d;}
      p.x+=this.random()*12.8;p.y+=this.random()*12.8-12.8;
    }
    return p;
  }
  private stepTower(t:Tower):void {
    if(t.kind==='barrack'||this.tick<t.readyAt)return;const spec=TOWERS[t.kind],idx=t.level-1;
    if(t.fireAt>0&&this.tick>=t.fireAt){
      const target=this.enemies.find(e=>e.id===t.targetId&&e.hp>0&&!e.escaped)??this.target(t);t.fireAt=0;
      if(target){
        if(t.kind!=='engineer'||this.blocked(target))t.target={x:target.x,y:target.y};
        else if(t.targetId!==target.id)t.target=this.bombAim(target);
        const from={x:t.x+(t.kind==='archer'?(t.shots%2===0?-10:10):0),y:t.y-(t.kind==='mage'?60:50)};
        const flight=t.kind==='mage'?Math.max(.15,distance(from,target)/300):spec.flight;
        const to=t.kind==='engineer'?{...t.target}:t.kind==='archer'?this.arrowAim(target,Math.round(flight*FPS)):{x:target.x,y:target.y-10.24};
        this.projectiles.push({id:this.nextId++,kind:spec.damageKind,from,to,start:this.tick,impact:this.tick+Math.round(flight*FPS),target:target.id,damage:t.kind==='engineer'?spec.damage[idx][1]:this.roll(spec.damage[idx]),radius:spec.radius,...(t.kind==='engineer'?{minDamage:spec.damage[idx][0]}:{})});t.shots++;
      }
    }
    if(this.tick>=t.nextAttack&&t.fireAt===0){const target=this.target(t);if(target){t.targetId=target.id;t.target=t.kind==='engineer'?this.bombAim(target):{x:target.x,y:target.y};t.animAt=this.tick;t.fireAt=this.tick+Math.round(spec.windup*FPS);t.nextAttack=this.tick+Math.round(spec.cooldown[idx]*FPS);}}
  }
  step():void {
    if(this.paused||this.phase==='won'||this.phase==='lost')return;
    this.tick++;
    while(this.pending.length&&this.pending[0].tick<=this.tick){const s=this.pending.shift()!;this.spawn(s.kind,s.route,s.lane<0?Math.floor(this.random()*3):s.lane);}
    for(const s of this.soldiers)this.stepSoldier(s);
    for(const e of this.enemies)this.stepEnemy(e);
    for(const t of this.towers)this.stepTower(t);
    const arrived=this.projectiles.filter(p=>p.impact<=this.tick);this.projectiles=this.projectiles.filter(p=>p.impact>this.tick);
    for(const p of arrived){
      if(p.radius>0){for(const e of this.living())if((e.x-p.to.x)**2+((e.y-p.to.y)/(p.kind==='explosion'?2/3:ASPECT))**2<=p.radius**2)this.hurtEnemy(e,p.minDamage===undefined?p.damage:blastDamage(p.minDamage,p.damage,p.to,e,p.radius),p.kind);this.effects.push({...p.to,type:p.kind==='true'?'fire':'hit',start:this.tick,duration:18,radius:p.radius});}
      else {const e=this.enemies.find(e=>e.id===p.target);if(e&&e.hp>0&&!e.escaped&&(p.kind!=='physical'||(Math.abs(e.x-p.to.x)<=24&&Math.abs(e.y-10.24-p.to.y)<=26))){this.hurtEnemy(e,p.damage,p.kind);this.effects.push({x:e.x,y:e.y-8,type:'hit',start:this.tick,duration:7,radius:10});}}
    }
    this.effects=this.effects.filter(e=>this.tick<e.start+e.duration);
    if(this.lives===0){this.phase='lost';this.log('defeat');return;}
    if(this.phase==='running'&&this.tick>=this.groupEnd&&this.pending.length===0){
      if(this.wave===LEVEL.groups.length&&this.living().length===0&&this.projectiles.length===0){this.phase='won';this.log('victory',{lives:this.lives});}
      else if(this.wave<LEVEL.groups.length&&this.tick>=this.nextWaveTick)this.callWave(false);
    }
  }
  export():string {return JSON.stringify({format:'open-games.kingdom-rush.trace.v1',seed:this.seed,reference:'Armor Games Flash v1.13 / geometry fa84f20 / visual 3e4eac4',tick:this.tick,phase:this.phase,gold:this.gold,lives:this.lives,wave:this.wave,kills:this.kills,events:this.events},null,2);}
}
