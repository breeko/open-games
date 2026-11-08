import { ASPECT, blastDamage, damageAfterArmor, distance, ENEMIES, enemyKind, FPS, inRange, getLevel, LEVEL, rollDamage, SOLDIERS, STEP, TOWERS, type DamageKind, type EnemyKind, type Point, type Level, type LevelId, type SoldierKind, type TowerKind } from './content';
import { arrowHits, barracksFormation } from './collision';
import { battleSnapshotSchema, type BattleSnapshot } from './save-state';

export interface Event { tick:number; type:string; [key:string]:string|number|boolean }
export interface Enemy extends Point { id:number; kind:EnemyKind; route:number; lane:number; node:number; hp:number; maxHp:number; deadAt:number; escaped:boolean; nextAttack:number; hitAt:number; attackTarget:number; healAt:number; healUntil:number; nextHeal:number; animation:string; animAt:number; facing:number }
export interface Soldier extends Point { id:number; kind:SoldierKind; towerId:number; activeAt:number; slot:number; rally:Point; hp:number; deadAt:number; respawnAt:number; expires:number; target:number; home:Point; destination:Point; meleeSlot:number; arrived:boolean; redeploying:boolean; nextAttack:number; hitAt:number; regenAt:number; idleTicks:number; regenTicks:number; animation:string; animAt:number; facing:number }
export interface Tower extends Point { id:number; kind:TowerKind; level:number; readyAt:number; spent:number; rally:Point; targetId:number; nextAttack:number; fireAt:number; animAt:number; target:Point; shots:number }
export interface Projectile { id:number; kind:DamageKind; from:Point; to:Point; start:number; impact:number; target:number; damage:number; radius:number; minDamage?:number; position?:Point; speed?:number }
export interface Effect extends Point { type:'hit'|'heal'|'fire'|'death'; start:number; duration:number; radius:number }
export interface SpawnEvent { tick:number; kind:EnemyKind; route:number; lane:number }
export interface SpawnPlan { events:SpawnEvent[]; end:number }

/** Source delays are frame counts. Each chunk waits before its first spawn. */
export function planWave(groupIndex:number,startTick:number,level:Level=LEVEL):SpawnPlan {
  const group=level.groups[groupIndex];
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
  tick=0; gold:number; lives:number; wave=0; kills=0; leaked=0;
  phase:'ready'|'running'|'won'|'lost'='ready'; paused=false;
  readonly enemies:Enemy[]=[]; readonly soldiers:Soldier[]=[]; readonly towers:Tower[]=[];
  projectiles:Projectile[]=[]; effects:Effect[]=[]; readonly events:Event[]=[];
  readonly level:Level; readonly seed:number; private rng:number; private nextId=1; private pending:SpawnEvent[]=[];
  private groupEnd=0; private nextWaveTick=Infinity;
  fireReady=0; reinforcementsReady=0;
  constructor(seed=0xc0ffee,levelId:LevelId=3) {this.level=getLevel(levelId);this.gold=this.level.cash;this.lives=this.level.lives;this.seed=seed>>>0;this.rng=this.seed || 1;this.log('start',{seed:this.seed});}
  /** Capture gameplay data only, detached from the live simulation and renderer. */
  snapshot(): BattleSnapshot {
    const data: BattleSnapshot = {
      compatibility: this.level.level===3?'pagras-flash-v1.13-r2':'opening-flash-v1.13-r1', level: this.level.level,
      tick: this.tick, gold: this.gold, lives: this.lives, wave: this.wave,
      kills: this.kills, leaked: this.leaked, phase: this.phase, paused: this.paused,
      seed: this.seed, rng: this.rng, nextId: this.nextId, groupEnd: this.groupEnd,
      nextWaveTick: this.nextWaveTick === Infinity ? null : this.nextWaveTick,
      fireReady: this.fireReady, reinforcementsReady: this.reinforcementsReady,
      enemies: this.enemies,
      soldiers: this.soldiers.map(soldier => ({
        ...soldier, respawnAt: soldier.respawnAt === Infinity ? null : soldier.respawnAt,
        expires: soldier.expires === Infinity ? null : soldier.expires,
      })),
      towers: this.towers, projectiles: this.projectiles, effects: this.effects, pending: this.pending,
    };
    // Parsing detaches nested objects and drops incidental fields copied into effects.
    return battleSnapshotSchema.parse(data);
  }

  /** Validation also protects callers that restore imported or development snapshots. */
  static restore(input: unknown, options: { paused?: boolean } = {}): Simulation {
    const data = battleSnapshotSchema.parse(input);
    const sim = new Simulation(data.seed,data.level);
    sim.tick = data.tick; sim.gold = data.gold; sim.lives = data.lives; sim.wave = data.wave;
    sim.kills = data.kills; sim.leaked = data.leaked; sim.phase = data.phase;
    sim.paused = options.paused ?? true;
    sim.rng = data.rng; sim.nextId = data.nextId; sim.groupEnd = data.groupEnd;
    sim.nextWaveTick = data.nextWaveTick ?? Infinity;
    sim.fireReady = data.fireReady; sim.reinforcementsReady = data.reinforcementsReady;
    sim.enemies.push(...data.enemies);
    sim.soldiers.push(...data.soldiers.map(soldier => ({
      ...soldier, respawnAt: soldier.respawnAt ?? Infinity, expires: soldier.expires ?? Infinity,
    })));
    sim.towers.push(...data.towers); sim.projectiles = data.projectiles;
    sim.effects = data.effects; sim.pending = data.pending;
    // Historical diagnostic events are not needed to resume gameplay.
    sim.events.length = 0;
    sim.log('restore');
    return sim;
  }
  get time():number {return this.tick/FPS;}
  get nextIn():number {return Number.isFinite(this.nextWaveTick)?Math.max(0,(this.nextWaveTick-this.tick)/FPS):0;}
  get canCall():boolean {return this.wave<this.level.groups.length && (this.phase==='ready'||this.phase==='running') && (this.wave===0||this.tick>=this.groupEnd+50);}
  get earlyReward():number {return this.wave>0 && this.canCall?Math.max(0,Math.round(this.nextIn)):0;}
  private log(type:string,values:{[key:string]:string|number|boolean}={}):void {this.events.push({tick:this.tick,type,...values});}
  random():number {let x=this.rng;x^=x<<13;x^=x>>>17;x^=x<<5;this.rng=x>>>0;return this.rng/4294967296;}
  private roll(range:readonly [number,number]):number {return rollDamage(range,this.random());}
  setPaused(value:boolean):void {if(this.paused!==value){this.paused=value;this.log(value?'pause':'resume');}}
  build(holderId:number,kind:TowerKind):boolean {
    const h=this.level.holders.find(h=>h.id===holderId), cost=TOWERS[kind].price[0];
    if(!h||this.towers.some(t=>t.id===holderId)||this.gold<cost||this.phase==='won'||this.phase==='lost'||this.paused)return false;
    this.gold-=cost;
    const t:Tower={id:h.id,kind,level:1,readyAt:this.tick+FPS,spent:cost,...h.pos,rally:{...h.rally},targetId:0,nextAttack:this.tick+Math.round(TOWERS[kind].cooldown[0]*FPS),fireAt:0,animAt:-100,target:{...h.rally},shots:0};
    this.towers.push(t);if(kind==='barrack')for(let i=0;i<3;i++)this.createSoldier(t,i);
    this.log('build',{holder:holderId,kind,gold:this.gold});return true;
  }
  upgrade(id:number):boolean {
    const t=this.towers.find(t=>t.id===id);if(!t||t.level>=this.level.maxTowerLevel||this.paused||this.phase==='won'||this.phase==='lost')return false;
    const cost=TOWERS[t.kind].price[t.level];if(this.gold<cost)return false;
    this.gold-=cost;t.spent+=cost;t.level++;
    if(t.kind==='barrack')for(const s of this.soldiers.filter(s=>s.towerId===t.id)){
      if(s.hp<=0){this.release(s);s.x=t.x;s.y=t.y;s.activeAt=this.tick+12;}
      s.regenTicks=0;if(s.hp<=0)s.idleTicks=0;s.kind='footmen';s.hp=SOLDIERS.footmen.hp;s.deadAt=-1;s.respawnAt=0;s.hitAt=0;s.nextAttack=this.tick+30;
    }
    this.log('upgrade',{holder:id,level:t.level,gold:this.gold});return true;
  }
  sell(id:number):boolean {
    const i=this.towers.findIndex(t=>t.id===id);if(i<0||this.paused||this.phase==='won'||this.phase==='lost')return false;
    const [t]=this.towers.splice(i,1);const refund=Math.floor(t.spent*0.6);this.gold+=refund;
    for(const s of this.soldiers.filter(s=>s.towerId===id)){this.release(s);s.hp=0;s.expires=this.tick;s.respawnAt=Infinity;s.target=0;s.deadAt=this.tick;}
    this.log('sell',{holder:id,refund,gold:this.gold});return true;
  }
  setRally(id:number,p:Point):boolean {
    const t=this.towers.find(t=>t.id===id);if(!t||t.kind!=='barrack'||!inRange({x:t.x,y:t.y-12.8},p,147.2)||this.paused||this.phase==='won'||this.phase==='lost')return false;
    const road=this.nearestRoad(p);if(distance(road,p)>38.4)return false;
    t.rally={...p};for(const s of this.soldiers.filter(s=>s.towerId===id)){this.release(s);s.rally=barracksFormation(t.rally,s.slot);s.redeploying=true;}
    this.log('rally',{holder:id,x:p.x,y:p.y});return true;
  }
  nearestRoad(p:Point):Point {
    let best=this.level.paths[0].lanes[0][0],d=Infinity;
    for(const route of this.level.paths)for(const n of route.lanes[0]){const nd=distance(n,p);if(nd<d){d=nd;best=n;}}
    return {...best};
  }
  callWave(early=true):boolean {
    if(!this.canCall||this.paused)return false;
    const bonus=early?this.earlyReward:0;this.gold+=bonus;
    if(early&&this.wave>0){const advance=Math.round(this.nextIn*FPS);this.fireReady=Math.max(this.tick,this.fireReady-advance);this.reinforcementsReady=Math.max(this.tick,this.reinforcementsReady-advance);this.log('early-recharge',{ticks:advance});}
    const plan=planWave(this.wave,this.tick,this.level);this.pending.push(...plan.events);this.groupEnd=plan.end;
    this.wave++;this.phase='running';
    this.nextWaveTick=this.wave<this.level.groups.length?this.groupEnd+this.level.groups[this.wave].interval:Infinity;
    this.log('wave',{wave:this.wave,bonus,gold:this.gold,spawnEnd:this.groupEnd});return true;
  }
  cast(kind:'fire'|'reinforcements',p:Point):boolean {
    if(this.level.level===1&&this.wave<(kind==='fire'?7:3))return false;
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
      const road=this.nearestRoad(p);if(distance(road,p)>38.4)return false;
      this.reinforcementsReady=this.tick+10*FPS;
      for(let i=0;i<2;i++)this.createSoldier(undefined,i,p);
    }
    this.log('cast',{kind,x:p.x,y:p.y});return true;
  }
  private fireFlightTicks(to:Point):number {
    let remaining=Math.max(0,to.y),speed=10,ticks=0;
    while(remaining>speed*1.28&&ticks<100){speed=Math.min(15,speed+Math.ceil(speed*.05));remaining-=speed*1.28;ticks++;}
    return Math.max(1,ticks+1);
  }
  private createSoldier(t:Tower|undefined,slot:number,p?:Point):void {
    const home={...(t?.rally??p??{x:0,y:0})};
    const rally=t?barracksFormation(home,slot):{x:home.x+(slot===0?8.96:-8.96),y:home.y+(slot===0?8.96:-8.96)};
    const kind:SoldierKind=t?(t.level===1?'militia':'footmen'):'farmer';
    this.soldiers.push({id:this.nextId++,kind,towerId:t?.id??0,activeAt:t?this.tick+FPS+12:this.tick+7,slot,rally,hp:SOLDIERS[kind].hp,...(t?{x:t.x,y:t.y}:rally),deadAt:-1,respawnAt:0,expires:t?Infinity:this.tick+7+20*FPS,target:0,home,destination:{...rally},meleeSlot:-1,arrived:false,redeploying:false,nextAttack:this.tick+FPS,hitAt:0,regenAt:this.tick+FPS,idleTicks:0,regenTicks:0,animation:'running',animAt:this.tick,facing:1});
  }
  spawn(kind:EnemyKind,route=0,lane=0):Enemy {
    const path=this.level.paths[route];const start=path.lanes[lane][path.start],spec=ENEMIES[kind];
    const e:Enemy={id:this.nextId++,kind,route,lane,node:path.start,hp:spec.hp,maxHp:spec.hp,...start,deadAt:-1,escaped:false,nextAttack:this.tick,hitAt:0,attackTarget:0,healAt:0,healUntil:0,nextHeal:this.tick+8*FPS,animation:'walkingRightLeft',animAt:this.tick,facing:-1};
    this.enemies.push(e);this.log('spawn',{enemy:e.id,kind,route:route+1,lane:lane+1});return e;
  }
  remaining(e:Enemy):number {return this.level.paths[e.route].end-e.node;}
  private living():Enemy[] {return this.enemies.filter(e=>e.hp>0&&!e.escaped);}
  private active(e:Enemy):boolean {const route=this.level.paths[e.route];return e.hp>0&&!e.escaped&&e.node>=(route.activeStart??route.start)&&e.node<(route.activeEnd??route.end+1);}
  private targets():Enemy[] {return this.living().filter(e=>this.active(e));}
  private animate(unit:Enemy|Soldier,animation:string):void {if(unit.animation!==animation){unit.animation=animation;unit.animAt=this.tick;}}
  private move(p:Point,to:Point,speed:number):boolean {
    const d=distance(p,to),step=speed*STEP;if(d<=step){p.x=to.x;p.y=to.y;return true;}
    p.x+=(to.x-p.x)*step/d;p.y+=(to.y-p.y)*step/d;return false;
  }
  private hurtEnemy(e:Enemy,value:number,kind:DamageKind,melee=false):void {
    if(!this.active(e))return;
    const spec=ENEMIES[e.kind];if(melee&&this.random()<spec.dodge){this.effects.push({...e,type:'hit',start:this.tick,duration:8,radius:12});return;}
    const damage=damageAfterArmor(value,kind,spec.armor,spec.magicArmor);e.hp=Math.max(0,e.hp-damage);
    if(e.hp===0){for(const s of this.soldiers.filter(s=>s.target===e.id))this.release(s);e.deadAt=this.tick;e.animation='death';e.animAt=this.tick;this.kills++;this.gold+=spec.gold;this.log('kill',{enemy:e.id,gold:this.gold});}
  }
  private hurtSoldier(s:Soldier,value:number):void {
    if(s.hp<=0)return;const spec=SOLDIERS[s.kind];s.idleTicks=0;s.hp=Math.max(0,s.hp-damageAfterArmor(value,'physical',spec.armor,0,true));
    if(s.hp===0){this.release(s);s.deadAt=this.tick;s.respawnAt=s.towerId?this.tick+10*FPS:Infinity;s.target=0;s.animation='death';s.animAt=this.tick;this.log('soldier-death',{soldier:s.id});}
  }
  private release(s:Soldier):void {
    const enemy=this.enemies.find(e=>e.id===s.target);
    if(enemy?.attackTarget===s.id){enemy.attackTarget=0;enemy.hitAt=0;enemy.nextAttack=this.tick;}
    s.target=0;s.meleeSlot=-1;s.arrived=false;s.hitAt=0;
  }
  private blocker(e:Enemy):Soldier|undefined {
    return this.soldiers.find(s=>s.id===e.attackTarget&&s.hp>0&&this.tick>=s.activeAt&&this.tick<s.expires&&s.target===e.id&&s.meleeSlot===2);
  }
  private claim(s:Soldier,e:Enemy,primary:boolean):void {
    this.release(s);s.target=e.id;s.arrived=false;s.nextAttack=this.tick;
    if(primary){s.meleeSlot=2;e.attackTarget=s.id;e.hitAt=0;e.nextAttack=this.tick;}
    else {
      const occupied=this.soldiers.filter(o=>o.hp>0&&o.target===e.id&&o.meleeSlot!==2).map(o=>o.meleeSlot);
      s.meleeSlot=!occupied.includes(0)?0:!occupied.includes(1)?1:this.random()>=.5?0:1;
    }
    const side=s.meleeSlot===2?0:s.meleeSlot===0?1:-1;
    const gap=ENEMIES[e.kind].slot+(s.kind==='farmer'?6.4:0)-(side===0?0:3.84);
    s.destination={x:e.x+e.facing*gap,y:e.y+side*7.68};
  }
  private stepSoldier(s:Soldier):void {
    if(this.tick<s.activeAt)return;
    if(this.tick>=s.expires){if(s.hp>0){this.release(s);s.hp=0;s.deadAt=this.tick;s.animation='death';s.animAt=this.tick;}return;}
    if(s.hp<=0){
      if(this.tick<s.respawnAt)return;
      const t=this.towers.find(t=>t.id===s.towerId);if(!t)return;
      s.hp=SOLDIERS[s.kind].hp;s.activeAt=this.tick+12;s.x=t.x;s.y=t.y;s.rally=barracksFormation(t.rally,s.slot);
      s.deadAt=-1;s.idleTicks=0;s.regenTicks=0;this.release(s);s.nextAttack=this.tick;this.log('soldier-respawn',{soldier:s.id});return;
    }
    const spec=SOLDIERS[s.kind];
    if(s.redeploying){this.animate(s,'running');s.facing=s.rally.x>=s.x?1:-1;s.redeploying=!this.move(s,s.rally,spec.speed);s.regenAt=this.tick+3*FPS;return;}
    let target=this.enemies.find(e=>e.id===s.target&&this.active(e));
    if(target&&!this.blocker(target)){this.release(s);target=undefined;}
    // A primary blocker stays committed. Helpers prefer a new unblocked enemy.
    if(!target||s.meleeSlot!==2){
      const tower=this.towers.find(t=>t.id===s.towerId);
      const center=tower?{x:tower.rally.x,y:tower.rally.y+12.8}:s.home;
      const candidates=this.targets().filter(e=>inRange(center,e,64)).sort((a,b)=>a.node-b.node||a.id-b.id);
      const unblocked=candidates.find(e=>!this.blocker(e));
      const next=unblocked??(!target?candidates.find(e=>this.blocker(e)):undefined);
      if(next){this.claim(s,next,!!unblocked);target=next;}
    }
    if(target){
      if(!s.arrived){
        s.facing=s.destination.x>=s.x?1:-1;this.animate(s,'running');
        if(this.move(s,s.destination,spec.speed)){s.arrived=true;s.facing=-target.facing;s.nextAttack=this.tick;}
        s.regenAt=this.tick+3*FPS;return;
      }
      if(s.hitAt>0&&this.tick>=s.hitAt){this.hurtEnemy(target,this.roll(spec.damage),'physical',true);s.hitAt=0;}
      if(s.target&&target.hp>0&&this.tick>=s.nextAttack){s.animation='attack';s.animAt=this.tick;s.hitAt=this.tick+5;s.nextAttack=this.tick+Math.round(spec.cooldown*FPS);}
      else if(this.tick-s.animAt>=(s.kind==='footmen'?20:11))this.animate(s,'idle');
      s.regenAt=this.tick+3*FPS;
    } else {
      s.hitAt=0;
      if(distance(s,s.rally)>0){s.facing=s.rally.x>=s.x?1:-1;this.animate(s,'running');this.move(s,s.rally,spec.speed);s.regenAt=this.tick+3*FPS;}
      else {
        this.animate(s,'idle');
        // Flash freezes these clocks while moving/fighting; only taking damage resets the idle delay.
        s.idleTicks=Math.min(60,s.idleTicks+1);
        if(s.idleTicks>=60&&++s.regenTicks>=FPS){s.hp=Math.min(spec.hp,s.hp+spec.regen);s.regenTicks=0;}
      }
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
      if(e.hitAt===0&&this.tick>=e.nextHeal&&this.tick>=e.healUntil&&this.living().some(o=>o.hp<o.maxHp&&inRange(e,o,96))){e.healAt=this.tick+14;e.healUntil=this.tick+28;e.nextHeal=e.healUntil+8*FPS;e.animation='heal';e.animAt=this.tick;}
      if(this.tick<e.healUntil)return;
    }
    const blocker=this.blocker(e);
    if(blocker){
      if(!blocker.arrived)return;
      if(e.hitAt>0&&this.tick>=e.hitAt){this.hurtSoldier(blocker,this.roll(spec.damage));e.hitAt=0;if(blocker.hp<=0)return;}
      if(this.tick>=e.nextAttack){e.animation='attack';e.animAt=this.tick;e.hitAt=this.tick+Math.round(spec.hitTime*FPS);e.nextAttack=this.tick+Math.round(spec.cooldown*FPS);}
      else if(e.hitAt===0)this.animate(e,'idle');
      return;
    }
    e.attackTarget=0;e.hitAt=0;

    const route=this.level.paths[e.route],lane=route.lanes[e.lane];
    let travel=spec.speed*1.28*STEP;
    while(travel>0&&e.node<route.end){
      const next=lane[Math.min(e.node+1,lane.length-1)],d=distance(e,next),oldX=e.x,oldY=e.y;
      if(d<=travel){e.x=next.x;e.y=next.y;e.node++;travel-=d;}
      else {e.x+=(next.x-e.x)*travel/d;e.y+=(next.y-e.y)*travel/d;travel=0;}
      const dx=e.x-oldX,dy=e.y-oldY;e.facing=dx>=0?1:-1;
      this.animate(e,Math.abs(dy)>Math.abs(dx)*1.4?(dy>0?'walkingDown':'walkingUp'):'walkingRightLeft');
    }
    if(e.node>=route.end){e.escaped=true;this.lives=Math.max(0,this.lives-spec.lives);this.leaked++;this.gold+=spec.gold;this.log('leak',{enemy:e.id,lives:this.lives,gold:this.gold});}
  }
  private target(t:Tower):Enemy|undefined {return this.targets().filter(e=>inRange({x:t.x,y:t.y-12},t.kind==='engineer'?this.bombAim(e):e,TOWERS[t.kind].range[t.level-1])&&e.x>=0&&e.x<=1024).sort((a,b)=>this.remaining(a)-this.remaining(b))[0];}
  private blocked(e:Enemy):boolean {return !!this.blocker(e);}
  private bombAim(e:Enemy):Point {
    if(this.blocked(e)||this.tick<e.healUntil)return {x:e.x,y:e.y};
    const route=this.level.paths[e.route],lead=Math.ceil(5.5*ENEMIES[e.kind].speed/FPS);
    return {...route.lanes[e.lane][Math.min(route.end,e.node+lead)]};
  }
  private arrowAim(e:Enemy,ticks:number):Point {
    const p={x:e.x+(e.kind==='ogre'?3.84:0),y:e.y-(e.kind==='ogre'?23.04:10.24)};
    if(!this.blocked(e)&&this.tick>=e.healUntil){
      const lane=this.level.paths[e.route].lanes[e.lane],next=lane[Math.min(e.node+1,lane.length-1)],d=distance(e,next);
      if(d>0){const travel=ENEMIES[e.kind].speed*1.28*ticks/FPS;p.x+=(next.x-e.x)*travel/d;p.y+=(next.y-e.y)*travel/d;}
      p.x+=this.random()*12.8;p.y+=this.random()*12.8-12.8;
    }
    return p;
  }
  private stepTower(t:Tower):void {
    if(t.kind==='barrack'||this.tick<t.readyAt)return;const spec=TOWERS[t.kind],idx=t.level-1;
    if(t.fireAt>0&&this.tick>=t.fireAt){
      const target=this.enemies.find(e=>e.id===t.targetId&&this.active(e))??this.target(t);t.fireAt=0;
      if(target||t.kind==='engineer'){
        if(target){if(t.kind!=='engineer'||this.blocked(target))t.target={x:target.x,y:target.y};else if(t.targetId!==target.id)t.target=this.bombAim(target);}
        const aim=target??t.target;
        const up=aim.y<t.y;
        const from=t.kind==='mage'?{x:t.x+(up?7.68:-7.68),y:t.y-61.44}:{x:t.x+(t.kind==='archer'?(t.shots%2===0?6.4:-11.52):0),y:t.y-57.6};
        const flight=t.kind==='mage'?Math.max(.15,distance(from,aim)/300):spec.flight;
        const to=t.kind==='engineer'?{...t.target}:t.kind==='archer'&&target?this.arrowAim(target,Math.round(flight*FPS)):{x:aim.x,y:aim.y-10.24};
        this.projectiles.push({id:this.nextId++,kind:spec.damageKind,from,to,start:this.tick,impact:this.tick+(t.kind==='mage'?300:Math.round(flight*FPS)),target:target?.id??0,...(t.kind==='mage'?{position:{...from},speed:1}:{}),damage:t.kind==='engineer'?spec.damage[idx][1]:this.roll(spec.damage[idx]),radius:spec.radius,...(t.kind==='engineer'?{minDamage:spec.damage[idx][0]}:{})});t.shots++;
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
    const arrowsHit=new Set<number>();
    for(const p of this.projectiles){
      if(p.kind==='magic'&&p.position){
        const target=this.enemies.find(e=>e.id===p.target&&this.active(e));
        if(target)p.to={x:target.x+(target.kind==='ogre'?3.84:0),y:target.y-(target.kind==='ogre'?23.04:10.24)};
        else p.target=0;
        const dx=p.to.x-p.position.x,dy=p.to.y-p.position.y,angle=Math.atan2(dy,dx);
        p.speed=Math.min(10,(p.speed??1)+Math.ceil((p.speed??1)*.05));
        if(this.tick===p.start&&dy<=0)p.position.y-=14.08;
        p.position.x+=Math.cos(angle)*p.speed*1.28;p.position.y+=Math.sin(angle)*p.speed*1.28;
        if(distance(p.position,p.to)<p.speed*1.28){if(target)this.hurtEnemy(target,p.damage,'magic');this.effects.push({...p.to,type:'hit',start:this.tick,duration:7,radius:10});arrowsHit.add(p.id);}
        continue;
      }
      if(p.kind!=='physical' ||this.tick<p.impact-2||this.tick>p.impact)continue;
      const e=this.enemies.find(e=>e.id===p.target&&e.hp>0&&!e.escaped);
      if(e&&arrowHits(e,p,this.tick)){this.hurtEnemy(e,p.damage,p.kind);arrowsHit.add(p.id);}
    }
    this.projectiles=this.projectiles.filter(p=>!arrowsHit.has(p.id));
    const arrived=this.projectiles.filter(p=>p.impact<=this.tick);this.projectiles=this.projectiles.filter(p=>p.impact>this.tick);
    for(const p of arrived){
      if(p.radius>0){for(const e of this.living())if((e.x-p.to.x)**2+((e.y-p.to.y)/(p.kind==='explosion'?2/3:ASPECT))**2<=p.radius**2)this.hurtEnemy(e,p.minDamage===undefined?p.damage:blastDamage(p.minDamage,p.damage,p.to,e,p.radius),p.kind);this.effects.push({...p.to,type:p.kind==='true'?'fire':'hit',start:this.tick,duration:18,radius:p.radius});}
      else {const e=this.enemies.find(e=>e.id===p.target);if(e&&e.hp>0&&!e.escaped&&p.kind!=='physical'){this.hurtEnemy(e,p.damage,p.kind);this.effects.push({x:e.x,y:e.y-8,type:'hit',start:this.tick,duration:7,radius:10});}}
    }
    this.effects=this.effects.filter(e=>this.tick<e.start+e.duration);
    if(this.lives===0){this.phase='lost';this.log('defeat');return;}
    if(this.phase==='running'&&this.tick>=this.groupEnd&&this.pending.length===0){
      if(this.wave===this.level.groups.length&&this.living().length===0&&this.projectiles.length===0){this.phase='won';this.log('victory',{lives:this.lives});}
      else if(this.wave<this.level.groups.length&&this.tick>=this.nextWaveTick)this.callWave(false);
    }
  }
  export():string {return JSON.stringify({format:'open-games.kingdom-rush.trace.v1',seed:this.seed,level:this.level.level,reference:'Armor Games Flash v1.13 / geometry fa84f20 / visual 3e4eac4',tick:this.tick,phase:this.phase,gold:this.gold,lives:this.lives,wave:this.wave,kills:this.kills,events:this.events},null,2);}
}
