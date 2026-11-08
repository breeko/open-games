import { POWERS, towerWindup, maxTowerTier, barracksSoldier, battleCompatibility, ASPECT, blastDamage, damageAfterArmor, distance, ENEMIES, enemyKind, FPS, inRange, getLevel, LEVEL, rollDamage, SOLDIERS, STEP, TOWERS, type DamageKind, type EnemyKind, type Point, type Level, type LevelId, type SoldierKind, type TowerKind } from './content';
import { projectilePose, arrowHits, barracksFormation } from './collision';
import {SKILLS,canPoison,fireStats,soldierSpec,powerLoadoutSchema,NO_POWER_UPGRADES,type SkillId,type PowerLoadout} from './upgrades';
import { battleSnapshotSchema, type BattleSnapshot } from './save-state';

export interface Event { tick:number; type:string; [key:string]:string|number|boolean }
export interface Enemy extends Point { poisonRank:number;poisonTicks:number;poisonCounter:number;rootTicks:number;rootCounter:number;rootCount:number;teleports:number;teleportTicks:number; id:number; kind:EnemyKind; route:number; lane:number; node:number; hp:number; maxHp:number; deadAt:number; escaped:boolean; nextAttack:number; hitAt:number; attackTarget:number; healAt:number; healUntil:number; nextHeal:number; healCounter:number;rangedEngaged:boolean;rangedTarget:number;powerCounter:number;missileCounter:number;special:'none'|'arrow'|'missile'|'summon';specialAt:number; eggAt:number;eggsLaid:number;eggInterval:number; animation:string; animAt:number; facing:number }
export interface Soldier extends Point {reinforcementRank:number;spearCounter:number;spearCast:number;spearTarget:number; id:number; kind:SoldierKind; towerId:number; activeAt:number; slot:number; rally:Point; hp:number; deadAt:number; respawnAt:number; expires:number; target:number; home:Point; destination:Point; meleeSlot:number; arrived:boolean; redeploying:boolean; nextAttack:number; shotAt:number;nextShot:number; hitAt:number; regenAt:number; idleTicks:number; regenTicks:number; animation:string; animAt:number; facing:number }
export interface Tower extends Point {poison:number;thorns:number;deathRay:number;teleport:number;poisonCounter:number;thornCounter:number;thornCast:number;deathCounter:number;teleportCounter:number;teleportCast:number;portalTarget:Point; id:number; kind:TowerKind; level:number; readyAt:number; spent:number; rally:Point; targetId:number; nextAttack:number; fireAt:number; animAt:number; target:Point; shots:number }
export interface Projectile {poison?:number;disintegrate?:boolean;spear?:boolean;burnRank?:number; id:number; kind:DamageKind; from:Point; to:Point; start:number; impact:number; target:number; damage:number; radius:number; minDamage?:number; beam?:number;beamExtra?:number; position?:Point; speed?:number }
export interface HostileProjectile {id:number;kind:'arrow'|'missile'|'summon';from:Point;to:Point;position:Point;start:number;impact:number;target:number;owner:number;speed:number;stage:number}
export interface Effect extends Point { type:'hit'|'heal'|'fire'|'death'|'egg'; start:number; duration:number; radius:number }
export interface SpawnEvent { tick:number; kind:EnemyKind; route:number; lane:number;node?:number;position?:Point;owner?:number }
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

const towerSkills=()=>({poison:0,thorns:0,deathRay:0,teleport:0,poisonCounter:0,thornCounter:0,thornCast:0,deathCounter:0,teleportCounter:0,teleportCast:0,portalTarget:{x:0,y:0}});
export class Simulation {
  powerUpgrades:PowerLoadout;
  storms:(Point&{start:number;rank:number})[]=[];burns:(Point&{start:number;rank:number;damage:number})[]=[];portals:(Point&{start:number;nodes:number;left:number})[]=[];
  tick=0; gold:number; lives:number; wave=0; kills=0; leaked=0;
  phase:'ready'|'running'|'won'|'lost'='ready'; paused=false;
  readonly enemies:Enemy[]=[]; readonly soldiers:Soldier[]=[]; readonly towers:Tower[]=[];
  hostileProjectiles:HostileProjectile[]=[];projectiles:Projectile[]=[]; effects:Effect[]=[]; readonly events:Event[]=[];
  readonly level:Level; readonly seed:number; private rng:number; private nextId=1; private pending:SpawnEvent[]=[];
  private groupEnd=0; private nextWaveTick=Infinity;
  practice=false;elfCampRepaired=false;elfRally:Point|null=null;
  fireReady=0; reinforcementsReady=0;
  constructor(seed=0xc0ffee,levelId:LevelId=3,powerUpgrades:PowerLoadout=NO_POWER_UPGRADES) {this.powerUpgrades=powerLoadoutSchema.parse(powerUpgrades);this.level=getLevel(levelId);this.gold=this.level.cash;this.lives=this.level.lives;this.seed=seed>>>0;this.rng=this.seed || 1;this.log('start',{seed:this.seed});
    for(const initial of this.level.initialTowers??[]){
      if(initial.kind!=='archer')throw new Error('Unsupported prebuilt tower');
      const holder=this.level.holders.find(h=>h.id===initial.id);if(!holder)throw new Error('Missing prebuilt site');
      this.towers.push({...towerSkills(),id:holder.id,kind:'archer',level:initial.level,readyAt:0,spent:TOWERS.archer.price.slice(0,initial.level).reduce((a,b)=>a+b,0),...holder.pos,rally:{...holder.rally},targetId:0,nextAttack:0,fireAt:0,animAt:-100,target:{...holder.rally},shots:0});
    }
  }
  /** Capture gameplay data only, detached from the live simulation and renderer. */
  snapshot(): BattleSnapshot {
    const data: BattleSnapshot = {
      powerUpgrades:this.powerUpgrades,storms:this.storms,burns:this.burns,portals:this.portals,
      compatibility: battleCompatibility(this.level.level), level: this.level.level,
      practice:this.practice,elfCampRepaired:this.elfCampRepaired,elfRally:this.elfRally,events:this.events,
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
      hostileProjectiles:this.hostileProjectiles,towers: this.towers, projectiles: this.projectiles, effects: this.effects, pending: this.pending,
    };
    // Parsing detaches nested objects and drops incidental fields copied into effects.
    return battleSnapshotSchema.parse(data);
  }

  /** Validation also protects callers that restore imported or development snapshots. */
  static restore(input: unknown, options: { paused?: boolean } = {}): Simulation {
    const data = battleSnapshotSchema.parse(input);
    const sim = new Simulation(data.seed,data.level,data.powerUpgrades);
    sim.storms=data.storms;sim.burns=data.burns;sim.portals=data.portals;
    sim.practice=data.practice;sim.elfCampRepaired=data.elfCampRepaired;sim.elfRally=data.elfRally;
    sim.towers.length=0;
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
    sim.hostileProjectiles=data.hostileProjectiles;sim.effects = data.effects; sim.pending = data.pending;
    sim.events.length=0;sim.events.push(...data.events);
    return sim;
  }
  get time():number {return this.tick/FPS;}
  get nextIn():number {return Number.isFinite(this.nextWaveTick)?Math.max(0,(this.nextWaveTick-this.tick)/FPS):0;}
  get canCall():boolean {return this.wave<this.level.groups.length && (this.phase==='ready'||this.phase==='running') && (this.phase==='ready'||this.tick>=this.groupEnd+50);}
  preparePractice(wave:number):boolean {
    if(this.phase!=='ready'||this.practice||this.tick!==0||this.wave!==0||!Number.isInteger(wave)||wave<1||wave>this.level.groups.length)return false;
    this.practice=true;this.wave=wave-1;this.gold=this.level.cash;
    for(let i=0;i<wave-1;i++)for(const event of planWave(i,0,this.level).events)this.gold+=ENEMIES[event.kind].gold;
    this.log('practice',{wave,gold:this.gold});return true;
  }
  get earlyReward():number {return this.wave>0 && this.canCall?Math.max(0,Math.round(this.nextIn)):0;}
  private log(type:string,values:{[key:string]:string|number|boolean}={}):void {this.events.push({tick:this.tick,type,...values});}
  random():number {let x=this.rng;x^=x<<13;x^=x>>>17;x^=x<<5;this.rng=x>>>0;return this.rng/4294967296;}
  private roll(range:readonly [number,number]):number {return rollDamage(range,this.random());}
  setPaused(value:boolean):void {if(this.paused!==value){this.paused=value;this.log(value?'pause':'resume');}}
  configurePowers(loadout:PowerLoadout):boolean {
    if(this.phase!=='ready'||this.wave!==0)return false;
    const parsed=powerLoadoutSchema.safeParse(loadout);if(!parsed.success)return false;
    if(this.powerUpgrades.fire===parsed.data.fire&&this.powerUpgrades.reinforcements===parsed.data.reinforcements)return true;
    this.powerUpgrades=parsed.data;this.log('power-upgrades',{...this.powerUpgrades});return true;
  }
  buySkill(id:number,skill:SkillId):boolean {
    const tower=this.towers.find(t=>t.id===id),spec=SKILLS[skill];
    if(!tower||tower.kind!==spec.kind||tower.level!==4||tower[skill]>=3||this.paused||this.phase==='won'||this.phase==='lost')return false;
    const cost=spec.costs[tower[skill]];if(this.gold<cost)return false;
    this.gold-=cost;tower.spent+=cost;tower[skill]++;
    if(skill==='thorns'){tower.thornCounter=0;tower.thornCast=0;}
    if(skill==='deathRay')tower.deathCounter=0;
    if(skill==='teleport'){tower.teleportCounter=0;tower.teleportCast=0;}
    this.log('skill',{holder:id,skill,rank:tower[skill],gold:this.gold});return true;
  }
  build(holderId:number,kind:TowerKind):boolean {
    const h=this.level.holders.find(h=>h.id===holderId), cost=TOWERS[kind].price[0];
    if(!h||this.towers.some(t=>t.id===holderId)||this.gold<cost||this.phase==='won'||this.phase==='lost'||this.paused)return false;
    this.gold-=cost;
    const t:Tower={...towerSkills(),id:h.id,kind,level:1,readyAt:this.tick+FPS,spent:cost,...h.pos,rally:{...h.rally},targetId:0,nextAttack:this.tick+Math.round(TOWERS[kind].cooldown[0]*FPS),fireAt:0,animAt:-100,target:{...h.rally},shots:0};
    this.towers.push(t);if(kind==='barrack')for(let i=0;i<3;i++)this.createSoldier(t,i);
    this.log('build',{holder:holderId,kind,gold:this.gold});return true;
  }
  upgrade(id:number):boolean {
    const t=this.towers.find(t=>t.id===id);if(!t||t.level>=maxTowerTier(this.level,t.kind,this.wave)||this.paused||this.phase==='won'||this.phase==='lost')return false;
    const cost=TOWERS[t.kind].price[t.level];if(this.gold<cost)return false;
    this.gold-=cost;t.spent+=cost;t.level++;
    if(t.kind==='barrack')for(const s of this.soldiers.filter(s=>s.towerId===t.id)){
      if(s.hp<=0){this.release(s);s.x=t.x;s.y=t.y;s.activeAt=this.tick+12;}
      s.regenTicks=0;if(s.hp<=0)s.idleTicks=0;s.kind=barracksSoldier(t.level);s.hp=SOLDIERS[s.kind].hp;s.deadAt=-1;s.respawnAt=0;s.hitAt=0;s.nextAttack=this.tick+30;
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
    const camp=this.level.elfCamp;
    if(camp?.id===id&&this.elfCampRepaired){
      if(this.paused||this.phase==='won'||this.phase==='lost'||!inRange({x:camp.pos.x,y:camp.pos.y-12.8},p,147.2)||distance(this.nearestRoad(p),p)>38.4)return false;
      this.elfRally={...p};for(const unit of this.soldiers.filter(s=>s.kind==='elf'&&s.hp>0)){this.release(unit);unit.home={...p};unit.rally=this.elfFormation(p,unit.slot);unit.redeploying=true;}
      this.log('rally',{holder:id,x:p.x,y:p.y});return true;
    }
    const t=this.towers.find(t=>t.id===id);if(!t||t.kind!=='barrack'||!inRange({x:t.x,y:t.y-12.8},p,147.2)||this.paused||this.phase==='won'||this.phase==='lost')return false;
    const road=this.nearestRoad(p);if(distance(road,p)>38.4)return false;
    t.rally={...p};for(const s of this.soldiers.filter(s=>s.towerId===id)){this.release(s);s.rally=barracksFormation(t.rally,s.slot);s.redeploying=true;}
    this.log('rally',{holder:id,x:p.x,y:p.y});return true;
  }
  repairElves():boolean {
    if(!this.level.elfCamp||this.elfCampRepaired||this.gold<100||this.paused||this.phase==='won'||this.phase==='lost')return false;
    this.gold-=100;this.elfCampRepaired=true;this.elfRally={...this.level.elfCamp.rally};this.log('elf-repair',{gold:this.gold});return true;
  }
  private elfFormation(p:Point,slot:number):Point {return {x:p.x+(slot%2===0?-8.96:8.96),y:p.y+(slot<2?-8.96:8.96)};}
  hireElf():boolean {
    const camp=this.level.elfCamp,live=this.soldiers.filter(s=>s.kind==='elf'&&s.hp>0);
    if(!camp||!this.elfCampRepaired||live.length>=4||this.gold<100||this.paused||this.phase==='won'||this.phase==='lost')return false;
    const slot=[0,1,2,3].find(slot=>!live.some(s=>s.slot===slot))!;
    const home=this.elfRally??camp.rally;this.createSoldier(undefined,slot,home);const unit=this.soldiers[this.soldiers.length-1];
    unit.kind='elf';unit.hp=SOLDIERS.elf.hp;unit.expires=Infinity;unit.activeAt=this.tick+12;unit.rally=this.elfFormation(home,slot);unit.destination={...unit.rally};unit.x=camp.pos.x;unit.y=camp.pos.y;
    this.gold-=100;this.log('elf-hire',{soldier:unit.id,gold:this.gold});return true;
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
    const plan=planWave(this.wave,this.tick,this.level);this.pending.push(...plan.events);this.pending.sort((a,b)=>a.tick-b.tick);this.groupEnd=plan.end;
    this.wave++;this.phase='running';
    this.nextWaveTick=this.wave<this.level.groups.length?this.groupEnd+this.level.groups[this.wave].interval:Infinity;
    this.log('wave',{wave:this.wave,bonus,gold:this.gold,spawnEnd:this.groupEnd});return true;
  }
  cast(kind:'fire'|'reinforcements',p:Point):boolean {
    if(this.level.level===1&&this.wave<(kind==='fire'?7:3))return false;
    if(this.paused||this.phase!=='running'||p.x<0||p.x>1024||p.y<0||p.y>768)return false;
    if(kind==='fire') {
      if(this.tick<this.fireReady)return false;
      const rank=this.powerUpgrades.fire;this.fireReady=this.tick+fireStats(rank).cooldown*FPS;
      if(rank>0)this.storms.push({...p,start:this.tick,rank});
      else for(let i=0;i<POWERS.fire.count;i++) {
        const to={x:p.x+(this.random()*2-1)*POWERS.fire.spread,y:p.y+(this.random()*2-1)*POWERS.fire.spread};
        this.projectiles.push({id:this.nextId++,kind:'true',from:{x:to.x,y:0},to,start:this.tick+10+i*10,impact:this.tick+10+i*10+this.fireFlightTicks(to),target:0,damage:this.roll([POWERS.fire.minDamage,POWERS.fire.maxDamage]),radius:POWERS.fire.radius});
      }
    } else {
      if(this.tick<this.reinforcementsReady)return false;
      const road=this.nearestRoad(p);if(distance(road,p)>38.4)return false;
      this.reinforcementsReady=this.tick+POWERS.reinforcements.cooldown*FPS;
      for(let i=0;i<POWERS.reinforcements.count;i++)this.createSoldier(undefined,i,p);
    }
    this.log('cast',{kind,x:p.x,y:p.y});return true;
  }
  private fireFlightTicks(to:Point):number {
    let remaining=Math.max(0,to.y),speed=10,ticks=0;
    while(remaining>speed*1.28&&ticks<100){speed=Math.min(15,speed+Math.ceil(speed*.05));remaining-=speed*1.28;ticks++;}
    return Math.max(1,ticks+1);
  }
  private stepPowerEffects():void {
    for(const storm of this.storms){
      const age=this.tick-storm.start;if(age<=0||age>50||age%10!==0)continue;
      const spec=fireStats(storm.rank),sx=this.random()>=.5?1:-1,sy=this.random()>=.5?1:-1;
      const from={x:storm.x+sx*Math.round(this.random()*spec.spread/1.28)*1.28,y:0};
      const to={x:storm.x+sx*Math.round(this.random()*spec.spread/1.28)*1.28,y:storm.y+sy*Math.round(this.random()*spec.spread/1.28)*1.28};
      const launch=(from:Point,to:Point)=>{this.projectiles.push({id:this.nextId++,kind:'true',from,to,start:this.tick,impact:this.tick+this.fireFlightTicks(to),target:0,damage:this.roll([spec.minDamage,spec.maxDamage]),radius:spec.radius,burnRank:storm.rank});this.log('fireball',{rank:storm.rank,x:to.x,y:to.y});};
      launch(from,to);
      if(storm.rank===5){const route=this.level.paths[Math.round(this.random()*(this.level.paths.length-1))],road=route.lanes[0],point=road[Math.round(this.random()*(road.length-1))];launch({x:point.x,y:0},{...point});}
    }
    this.storms=this.storms.filter(s=>this.tick-s.start<50);
    for(const burn of this.burns){const age=this.tick-burn.start,duration=burn.rank>=4?300:150;
      if(age>0&&age<duration&&age%30===0)for(const e of this.targets())if(!ENEMIES[e.kind].flying&&inRange(burn,e,64))this.hurtEnemy(e,burn.damage,'physical');
    }
    this.burns=this.burns.filter(b=>this.tick-b.start<(b.rank>=4?300:150));
    for(const portal of this.portals){const age=this.tick-portal.start;if(age<6||age>15||portal.left===0)continue;
      for(const e of this.targets())if(e.kind!=='juggernaut'&&e.teleports<3&&inRange(portal,e,32)){
        for(const unit of this.soldiers.filter(s=>s.target===e.id))this.release(unit);
        e.node=Math.max(10,e.node-portal.nodes-(Math.round(this.random()*9)-3));e.teleportTicks=20;e.teleports++;e.hitAt=0;e.attackTarget=0;e.healAt=0;e.healUntil=0;e.special='none';e.rangedEngaged=false;e.animation='teleport';e.animAt=this.tick;
        this.log('teleport',{enemy:e.id,node:e.node});if(--portal.left===0)break;
      }
    }
    this.portals=this.portals.filter(p=>this.tick-p.start<40);
  }
  private createSoldier(t:Tower|undefined,slot:number,p?:Point):void {
    const home={...(t?.rally??p??{x:0,y:0})};
    const rally=t?barracksFormation(home,slot):{x:home.x+(slot===0?8.96:-8.96),y:home.y+(slot===0?8.96:-8.96)};
    const kind:SoldierKind=t?barracksSoldier(t.level):'farmer';
    this.soldiers.push({reinforcementRank:t?0:this.powerUpgrades.reinforcements,spearCounter:0,spearCast:0,spearTarget:0,id:this.nextId++,kind,towerId:t?.id??0,activeAt:t?this.tick+FPS+12:this.tick+POWERS.reinforcements.spawnTicks,slot,rally,shotAt:0,nextShot:0,hp:soldierSpec(kind,t?0:this.powerUpgrades.reinforcements).hp,...(t?{x:t.x,y:t.y}:rally),deadAt:-1,respawnAt:0,expires:t?Infinity:this.tick+POWERS.reinforcements.spawnTicks+POWERS.reinforcements.lifetime*FPS,target:0,home,destination:{...rally},meleeSlot:-1,arrived:false,redeploying:false,nextAttack:this.tick+FPS,hitAt:0,regenAt:this.tick+FPS,idleTicks:0,regenTicks:0,animation:'running',animAt:this.tick,facing:1});
  }
  spawn(kind:EnemyKind,route=0,lane=0):Enemy {
    const path=this.level.paths[route];const start=path.lanes[lane][path.start],spec=ENEMIES[kind];
    const e:Enemy={poisonRank:0,poisonTicks:0,poisonCounter:0,rootTicks:0,rootCounter:0,rootCount:0,teleports:0,teleportTicks:0,id:this.nextId++,kind,route,lane,node:path.start,hp:spec.hp,maxHp:spec.hp,...start,deadAt:-1,escaped:false,nextAttack:this.tick,hitAt:0,attackTarget:0,healAt:0,healUntil:0,nextHeal:this.tick+8*FPS,healCounter:0,rangedEngaged:false,rangedTarget:0,powerCounter:0,missileCounter:0,special:'none',specialAt:0,eggInterval:kind==='matriarch'?120+Math.round(this.random()*120):0,eggAt:0,eggsLaid:0,animation:'walkingRightLeft',animAt:this.tick,facing:-1};
    this.enemies.push(e);this.log('spawn',{enemy:e.id,kind,route:route+1,lane:lane+1});return e;
  }
  remaining(e:Enemy):number {return this.level.paths[e.route].end-e.node;}
  private living():Enemy[] {return this.enemies.filter(e=>e.hp>0&&!e.escaped);}
  private active(e:Enemy):boolean {const route=this.level.paths[e.route];return e.hp>0&&!e.escaped&&e.teleportTicks===0&&e.node>=(e.kind==='juggernaut'?5:route.activeStart??route.start)&&e.node<(route.activeEnd??route.end+1);}
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
    if(e.hp===0){
      this.killEnemy(e);
      if(e.kind==='juggernaut'){
        this.pending=this.pending.filter(p=>p.owner!==e.id);this.hostileProjectiles=this.hostileProjectiles.filter(p=>p.owner!==e.id);
        for(const other of this.living()){other.hp=0;this.killEnemy(other);}
      }
    }
  }
  private killEnemy(e:Enemy):void {
    for(const soldier of this.soldiers.filter(s=>s.target===e.id))this.release(soldier);
    e.deadAt=this.tick;e.animation='death';e.animAt=this.tick;this.kills++;this.gold+=ENEMIES[e.kind].gold;this.log('kill',{enemy:e.id,gold:this.gold});
  }
  private hurtSoldier(s:Soldier,value:number):void {
    if(s.hp<=0)return;const spec=soldierSpec(s.kind,s.reinforcementRank);s.idleTicks=0;s.hp=Math.max(0,s.hp-damageAfterArmor(value,'physical',spec.armor,0,true));
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
    const spec=soldierSpec(s.kind,s.reinforcementRank);
    if(s.kind==='elf')this.stepElfBow(s);
    if(s.kind==='farmer'&&s.reinforcementRank===5&&this.stepSpear(s))return;
    if(s.redeploying){this.animate(s,'running');s.facing=s.rally.x>=s.x?1:-1;s.redeploying=!this.move(s,s.rally,spec.speed);s.regenAt=this.tick+3*FPS;return;}
    let target=this.enemies.find(e=>e.id===s.target&&this.active(e));
    if(target&&!this.blocker(target)){this.release(s);target=undefined;}
    // A primary blocker stays committed. Helpers prefer a new unblocked enemy.
    if(!target||s.meleeSlot!==2){
      const tower=this.towers.find(t=>t.id===s.towerId);
      const center=tower?{x:tower.rally.x,y:tower.rally.y+12.8}:s.home;
      const candidates=this.targets().filter(e=>!ENEMIES[e.kind].flying&&inRange(center,e,s.kind==='elf'?51.2:64)).sort((a,b)=>a.node-b.node||a.id-b.id);
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
      if(s.target&&target.hp>0&&this.tick>=s.nextAttack){s.animation='attack';s.animAt=this.tick;s.hitAt=this.tick+(spec.hitTime??5);s.nextAttack=this.tick+Math.round(spec.cooldown*FPS);}
      else if(this.tick-s.animAt>=(s.kind==='footmen'||s.kind==='knight'?20:11))this.animate(s,'idle');
      s.regenAt=this.tick+3*FPS;
    } else {
      s.hitAt=0;
      if(distance(s,s.rally)>0){s.facing=s.rally.x>=s.x?1:-1;this.animate(s,'running');this.move(s,s.rally,spec.speed);s.regenAt=this.tick+3*FPS;}
      else {
        this.animate(s,'idle');
        // Flash freezes these clocks while moving/fighting; only taking damage resets the idle delay.
        s.idleTicks=Math.min(60,s.idleTicks+1);
        if(s.idleTicks>=60&&++s.regenTicks>=(spec.regenInterval??FPS)){s.hp=Math.min(spec.hp,s.hp+spec.regen);s.regenTicks=0;}
      }
    }
  }
  private stepElfBow(s:Soldier):void {
    if(s.target||s.redeploying){s.shotAt=0;return;}
    const target=this.targets().filter(e=>inRange(s,e,204.8)&&!inRange(s,e,25.6)).sort((a,b)=>this.remaining(a)-this.remaining(b))[0];
    if(s.shotAt&&this.tick>=s.shotAt){
      if(target){const from={x:s.x,y:s.y-12.8},to=this.arrowAim(target,17);this.projectiles.push({id:this.nextId++,kind:'physical',from,to,start:this.tick,impact:this.tick+17,target:target.id,damage:this.roll([25,50]),radius:0});}
      s.shotAt=0;
    }
    if(target&&this.tick>=s.nextShot){s.shotAt=this.tick+7;s.nextShot=this.tick+45;s.animation='shoot';s.animAt=this.tick;}
  }
  private stepSpear(s:Soldier):boolean {
    if(s.spearCast>0){const age=this.tick-s.spearCast;
      if(age===5){const target=this.enemies.find(e=>e.id===s.spearTarget&&this.active(e));if(target){const from={x:s.x+7.68,y:s.y-12.8};this.projectiles.push({id:this.nextId++,kind:'physical',spear:true,from,to:this.arrowAim(target,12),start:this.tick,impact:this.tick+12,target:target.id,damage:this.roll([24,40]),radius:0});this.log('spear',{soldier:s.id,enemy:target.id});}}
      if(age<=10)return true;s.spearCast=0;s.spearCounter=0;return false;
    }
    if(s.spearCounter<30){s.spearCounter++;return false;}
    if(s.target||s.redeploying||distance(s,s.rally)>0)return false;
    const target=this.targets().find(e=>inRange(s,e,166.4)&&distance(s,e)>51.2);
    if(!target)return false;s.spearTarget=target.id;s.spearCast=this.tick;s.animation='shoot';s.animAt=this.tick;s.facing=target.x>=s.x?1:-1;return true;
  }
  private stepRangedEnemy(e:Enemy):boolean {
    const units=()=>this.soldiers.filter(s=>s.hp>0&&this.tick>=s.activeAt&&this.tick<s.expires);
    if(e.kind==='shadowArcher'){
      if(this.blocked(e)&&e.special==='none'){e.rangedEngaged=false;return false;}
      if(e.special==='arrow'){
        const age=this.tick-e.specialAt;
        if(age===7){const target=units().find(s=>s.id===e.rangedTarget)??units().find(s=>inRange(e,s,147.2)&&distance(e,s)>51.2);if(target)this.launchHostile('arrow',e,target);}
        if(age<12)return true;e.special='none';e.missileCounter=0;return true;
      }
      if(e.missileCounter<30){e.missileCounter++;return e.rangedEngaged;}
      const target=units().find(s=>inRange(e,s,147.2)&&distance(e,s)>51.2);if(!target){e.rangedEngaged=false;return false;}
      e.rangedEngaged=true;e.rangedTarget=target.id;e.special='arrow';e.specialAt=this.tick;e.facing=target.x>=e.x?1:-1;e.animation='shoot';e.animAt=this.tick;return true;
    }
    if(e.kind!=='juggernaut')return false;
    e.powerCounter++;e.missileCounter++;
    if(e.special==='none'){
      const target=units().find(s=>distance(e,s)>128);
      if(e.missileCounter>=270&&target)e.special='missile';
      else if(e.powerCounter>=180)e.special='summon';
      else return false;
      e.specialAt=this.tick;e.animation='missile';e.animAt=this.tick;return true;
    }
    const age=this.tick-e.specialAt;
    if(age===24){
      if(e.special==='missile'){const target=units().find(s=>distance(e,s)>128);if(target)this.launchHostile('missile',e,target);}
      else {
        const route=Math.round(this.random()*(this.level.paths.length-1)),lane=Math.round(this.random()*2),road=this.level.paths[route].lanes[lane];
        const node=Math.round(this.random()*(road.length-50)),position={...road[node]},from={x:e.x-e.facing*32,y:e.y-80.64};
        const flight=20+Math.floor(distance(from,position)/1.28/14);
        for(let i=0;i<7;i++)this.pending.push({tick:this.tick+flight+3+i*7,kind:'golemHead',route,lane:i%3,node,position,owner:e.id});
        this.pending.sort((a,b)=>a.tick-b.tick);
        this.hostileProjectiles.push({id:this.nextId++,kind:'summon',from,to:position,position:{...from},start:this.tick,impact:this.tick+flight,target:0,owner:e.id,speed:0,stage:0});
        this.log('golem-launch',{enemy:e.id,route,node});
      }
    }
    if(age<49)return true;
    if(e.special==='missile')e.missileCounter=0;else e.powerCounter=0;e.special='none';return false;
  }
  private launchHostile(kind:'arrow'|'missile',e:Enemy,target:Soldier):void {
    const from=kind==='arrow'?{x:e.x+5.12,y:e.y-16}:{x:e.x-e.facing*32,y:e.y-80.64};
    this.hostileProjectiles.push({id:this.nextId++,kind,from,to:{x:target.x,y:target.y-8.96},position:{...from},start:this.tick,impact:this.tick+(kind==='arrow'?17:300),target:target.id,owner:e.id,speed:8,stage:0});
    this.log('enemy-shot',{enemy:e.id,kind,soldier:target.id});
  }
  private stepHostileProjectiles():void {
    const done=new Set<number>();
    for(const p of this.hostileProjectiles){
      let target=this.soldiers.find(s=>s.id===p.target&&s.hp>0&&this.tick>=s.activeAt&&this.tick<s.expires);
      if(p.kind==='arrow'||p.kind==='summon'){
        p.position=projectilePose({...p,kind:p.kind==='arrow'?'physical':'explosion'},this.tick);
        if(p.kind==='arrow'&&target&&this.tick>=p.impact-2&&Math.abs(p.position.x-target.x)<18&&p.position.y>=target.y-36&&p.position.y<=target.y+6){this.hurtSoldier(target,this.roll([20,30]));done.add(p.id);}
        if(this.tick>=p.impact)done.add(p.id);continue;
      }
      if(!target){target=this.soldiers.find(s=>s.hp>0&&this.tick>=s.activeAt&&this.tick<s.expires);if(target)p.target=target.id;}
      if(target)p.to={x:target.x,y:target.y-12.8};
      const aim=p.stage===0?{x:p.from.x+12.8,y:p.from.y-179.2}:p.to;
      p.speed=Math.min(13,p.speed+Math.ceil(p.speed*.05));const d=distance(p.position,aim);
      if(d<=p.speed*1.28){p.position={...aim};if(p.stage===0){p.stage=1;continue;}
        for(const unit of this.soldiers.filter(s=>s.hp>0&&this.tick>=s.activeAt&&inRange(p.position,s,38.4)))this.hurtSoldier(unit,blastDamage(100,140,p.position,unit,38.4));
        this.effects.push({...p.position,type:'fire',start:this.tick,duration:18,radius:38.4});done.add(p.id);
      }else{p.position.x+=(aim.x-p.position.x)/d*p.speed*1.28;p.position.y+=(aim.y-p.position.y)/d*p.speed*1.28;}
      if(this.tick>=p.impact)done.add(p.id);
    }
    this.hostileProjectiles=this.hostileProjectiles.filter(p=>!done.has(p.id));
  }
  private stepEnemy(e:Enemy):void {
    if(e.hp<=0||e.escaped)return;const spec=ENEMIES[e.kind];
    // Teleport has two ten-update phases; affected enemies cannot be acquired.
    if(e.teleportTicks>0){e.teleportTicks--;if(e.teleportTicks===10)Object.assign(e,this.level.paths[e.route].lanes[e.lane][e.node]);if(e.teleportTicks===0){e.animation='walkingRightLeft';e.animAt=this.tick;}return;}
    if(e.rootTicks>0){e.rootTicks--;if(++e.rootCounter===30){this.hurtEnemy(e,40,'true');e.rootCounter=0;}if(e.rootTicks===0){e.animation='walkingRightLeft';e.animAt=this.tick;}return;}
    if(e.poisonTicks>0){e.poisonTicks--;if(e.poisonCounter<30)e.poisonCounter++;else{this.hurtEnemy(e,5*e.poisonRank,'true');e.poisonCounter=0;}if(e.hp<=0)return;}
    if(e.kind==='matriarch'&&e.eggsLaid<3){
      if(e.eggAt<e.eggInterval)e.eggAt++;
      else if(!this.blocked(e)){
        for(let lane=0;lane<3;lane++)this.pending.push({tick:this.tick+86+lane*7,kind:'spiderling',route:e.route,lane,node:e.node,position:{x:e.x,y:e.y}});
        this.pending.sort((a,b)=>a.tick-b.tick);e.eggsLaid++;e.eggAt=0;
        this.effects.push({type:'egg',x:e.x,y:e.y,start:this.tick,duration:101,radius:12});this.log('egg',{enemy:e.id,route:e.route,node:e.node});
      }
    }
    // Flash calls specialPower only while active and outside a melee charge.
    // Its heal cooldown counts eligible updates rather than elapsed world time.
    if(e.kind==='shaman'&&this.active(e)&&e.hitAt===0){
      if(e.healAt>0&&this.tick>=e.healAt){
        const wounded=this.targets().filter(o=>o.hp<o.maxHp&&inRange(e,o,96)).slice(0,3);
        for(const o of wounded){o.hp=Math.min(o.maxHp,o.hp+50);this.effects.push({...o,type:'heal',start:this.tick,duration:24,radius:22});}
        e.healAt=0;
      }
      if(this.tick<e.healUntil)return;
      if(e.healUntil>0){e.healUntil=0;e.healCounter=0;}
      else if(e.healCounter<8*FPS)e.healCounter++;
      else if(this.targets().some(o=>o.hp<o.maxHp&&inRange(e,o,96))){e.healAt=this.tick+14;e.healUntil=this.tick+28;e.nextHeal=e.healUntil+8*FPS;e.animation='heal';e.animAt=this.tick;return;}
    }
    if(this.active(e)&&e.hitAt===0&&this.stepRangedEnemy(e))return;
    const blocker=this.blocker(e);
    if(blocker){
      if(!blocker.arrived)return;
      if(e.hitAt>0&&this.tick>=e.hitAt){if(e.kind==='juggernaut'){const center={x:e.x+e.facing*57.6,y:e.y};for(const unit of this.soldiers.filter(s=>s.hp>0&&this.tick>=s.activeAt&&inRange(center,s,57.6)).slice(0,10))this.hurtSoldier(unit,this.roll(spec.damage));}else this.hurtSoldier(blocker,this.roll(spec.damage));e.hitAt=0;if(blocker.hp<=0)return;}
      if(this.tick>=e.nextAttack){e.animation='attack';e.animAt=this.tick;e.hitAt=this.tick+Math.round(spec.hitTime*FPS);e.nextAttack=this.tick+Math.round(spec.cooldown*FPS);}
      else if(e.hitAt===0)this.animate(e,'idle');
      return;
    }
    e.attackTarget=0;e.hitAt=0;

    const route=this.level.paths[e.route],lane=route.lanes[e.lane];
    // Flash moves a full step, then advances within speed + 0.1 source pixels.
    // It does not snap to nodes or spend leftover distance along the next segment.
    const next=lane[Math.min(e.node+1,lane.length-1)],dx=next.x-e.x,dy=next.y-e.y;
    const angle=Math.atan2(dy,dx),speed=spec.speed*1.28*STEP;
    e.x+=Math.cos(angle)*speed;e.y+=Math.sin(angle)*speed;
    if(distance(e,next)<speed+.128)e.node++;
    e.facing=dx>=0?1:-1;
    this.animate(e,Math.abs(dy)>Math.abs(dx)*1.4?(dy>0?'walkingDown':'walkingUp'):'walkingRightLeft');
    if(e.node>=route.end){e.escaped=true;this.lives=Math.max(0,this.lives-spec.lives);this.leaked++;this.gold+=spec.gold;this.log('leak',{enemy:e.id,lives:this.lives,gold:this.gold});}
  }
  private target(t:Tower):Enemy|undefined {return this.targets().filter(e=>(t.kind!=='engineer'||!ENEMIES[e.kind].flying)&&inRange({x:t.x,y:t.y-12},t.kind==='engineer'?this.bombAim(e):e,TOWERS[t.kind].range[t.level-1])&&e.x>=0&&e.x<=1024).sort((a,b)=>this.remaining(a)-this.remaining(b))[0];}
  private blocked(e:Enemy):boolean {return !!this.blocker(e);}
  private bombAim(e:Enemy):Point {
    if(this.blocked(e)||this.tick<e.healUntil)return {x:e.x,y:e.y};
    const route=this.level.paths[e.route],lead=Math.ceil(5.5*ENEMIES[e.kind].speed/FPS);
    return {...route.lanes[e.lane][Math.min(route.end,e.node+lead)]};
  }
  private enemyAim(e:Enemy):Point {return {x:e.x+(e.kind==='ogre'||e.kind==='gargoyle'?3.84:e.kind==='shadowArcher'||e.kind==='golemHead'||e.kind==='spider'||e.kind==='matriarch'||e.kind==='spiderling'?1.28:0),y:e.y-(e.kind==='gargoyle'?57.6:e.kind==='juggernaut'?38.4:e.kind==='ogre'||e.kind==='marauder'?23.04:e.kind==='darkKnight'?12.8:e.kind==='spiderling'?5.12:10.24)};}
  private arrowAim(e:Enemy,ticks:number):Point {
    const p=this.enemyAim(e);
    if(!this.blocked(e)&&e.rootTicks===0&&this.tick>=e.healUntil){
      const lane=this.level.paths[e.route].lanes[e.lane],next=lane[Math.min(e.node+1,lane.length-1)],d=distance(e,next);
      if(d>0){const travel=ENEMIES[e.kind].speed*1.28*ticks/FPS;p.x+=(next.x-e.x)*travel/d;p.y+=(next.y-e.y)*travel/d;}
      p.x+=this.random()*12.8;p.y+=this.random()*12.8-12.8;
    }
    return p;
  }
  private stepTower(t:Tower):void {
    if(t.kind==='barrack'||this.tick<t.readyAt)return;const spec=TOWERS[t.kind],idx=t.level-1;
    if(t.level===4){
      if(t.kind==='archer'){t.poisonCounter++;this.stepThorns(t);}
      if(t.kind==='mage'){
        if(t.deathRay>0)t.deathCounter++;
        if(t.teleport>0)t.teleportCounter++;
        if(this.stepTeleport(t))return;
      }
    }
    if(t.fireAt>0&&this.tick>=t.fireAt){
      const target=this.enemies.find(e=>e.id===t.targetId&&this.active(e))??this.target(t);t.fireAt=0;
      if(target||t.kind==='engineer'){
        if(target){if(t.kind!=='engineer'||this.blocked(target))t.target={x:target.x,y:target.y};else if(t.targetId!==target.id)t.target=this.bombAim(target);}
        const aim=target??t.target;
        const up=aim.y<t.y;
        if(t.kind==='mage'&&t.level===4&&target){const rolled=this.roll(spec.damage[idx]),damage=Math.min(rolled,target.hp),ready=t.deathRay>0&&t.deathCounter>=(22-2*t.deathRay)*FPS;
          if(t.deathRay>0&&!ready)t.deathCounter++;
          const disintegrate=ready&&target.kind!=='juggernaut';if(disintegrate){t.deathCounter=0;this.log('death-ray',{holder:t.id,enemy:target.id});}
          this.projectiles.push({id:this.nextId++,kind:'magic',from:{x:t.x+1.28,y:t.y-75.52},to:this.enemyAim(target),start:this.tick,impact:this.tick+9,target:target.id,damage,radius:0,beam:0,beamExtra:rolled-damage,...(disintegrate?{disintegrate:true}:{})});t.shots++;return;}
        let poison=0;
        if(t.kind==='archer'&&t.level===4&&t.poison>0){
          if(t.poisonCounter>=12){t.poisonCounter=0;const eligible=this.targets().filter(e=>canPoison(e.kind)&&inRange({x:t.x,y:t.y-12.8},e,spec.range[idx])).sort((a,b)=>this.remaining(a)-this.remaining(b));
            const next=eligible.find(e=>e.poisonTicks===0)??eligible[0];if(next){t.targetId=next.id;t.target={x:next.x,y:next.y};return this.firePoisonArrow(t,next);}
            if(target&&canPoison(target.kind))poison=t.poison;
          }else t.poisonCounter++;
        }
        const from=t.kind==='mage'?{x:t.x+(t.level===3?(up?7.68:-8.96):(up?7.68:-7.68)),y:t.y-(t.level===3?(up?65.28:67.84):61.44)}:{x:t.x+(t.kind==='archer'?(t.level===3?(t.shots%2===0?10.24:-8.96):(t.shots%2===0?6.4:-11.52)):0),y:t.y-(t.kind==='archer'?(t.level===4?67.84:t.level===3?64:57.6):57.6)};
        const flight=t.kind==='mage'?Math.max(.15,distance(from,aim)/300):spec.flight;
        const to=t.kind==='engineer'?{...t.target}:t.kind==='archer'&&target?this.arrowAim(target,Math.round(flight*FPS)):{x:aim.x,y:aim.y-10.24};
        this.projectiles.push({id:this.nextId++,kind:spec.damageKind,from,to,start:this.tick,impact:this.tick+(t.kind==='mage'?300:Math.round(flight*FPS)),target:target?.id??0,...(poison?{poison}:{}),...(t.kind==='mage'?{position:{...from},speed:1}:{}),damage:t.kind==='engineer'?spec.damage[idx][1]:this.roll(spec.damage[idx]),radius:spec.radius[idx],...(t.kind==='engineer'?{minDamage:spec.damage[idx][0]}:{})});t.shots++;
      }
    }
    if(this.tick>=t.nextAttack&&t.fireAt===0){const target=this.target(t);if(target){t.targetId=target.id;t.target=t.kind==='engineer'?this.bombAim(target):{x:target.x,y:target.y};t.animAt=this.tick;t.fireAt=this.tick+Math.round(towerWindup(t.kind,t.level));t.nextAttack=this.tick+Math.round(spec.cooldown[idx]*FPS);}}
  }
  private firePoisonArrow(t:Tower,target:Enemy):void {
    const from={x:t.x+(t.shots%2===0?6.4:-11.52),y:t.y-67.84};
    this.projectiles.push({id:this.nextId++,kind:'physical',from,to:this.arrowAim(target,17),start:this.tick,impact:this.tick+17,target:target.id,damage:this.roll(TOWERS.archer.damage[3]),radius:0,poison:t.poison});t.shots++;
  }
  private stepThorns(t:Tower):void {
    if(t.thorns===0)return;
    if(t.thornCast>0){const age=this.tick-t.thornCast;
      if(age===18){let count=0;for(const e of this.thornTargets(t)){
        if(ENEMIES[e.kind].dodge>0&&this.random()<ENEMIES[e.kind].dodge)continue;
        e.rootTicks=30*t.thorns;e.rootCounter=0;e.rootCount++;e.hitAt=0;e.healAt=0;e.healUntil=0;e.special='none';e.rangedEngaged=false;e.animation='thorn';e.animAt=this.tick;this.log('root',{holder:t.id,enemy:e.id});if(++count===2+2*t.thorns)break;
      }}
      if(age>=35){t.thornCast=0;t.thornCounter=0;}return;
    }
    if(t.thornCounter<240){t.thornCounter++;return;}
    if(this.thornTargets(t).length>=2)t.thornCast=this.tick;
  }
  private thornTargets(t:Tower):Enemy[] {return this.targets().filter(e=>e.kind!=='juggernaut'&&!ENEMIES[e.kind].flying&&e.rootCount<3&&!this.blocker(e)?.arrived&&inRange({x:t.x,y:t.y-12.8},e,TOWERS.archer.range[3]));}
  private stepTeleport(t:Tower):boolean {
    if(t.teleport===0)return false;
    if(t.teleportCast>0){const age=this.tick-t.teleportCast;
      if(age===5){this.portals.push({...t.portalTarget,start:this.tick,nodes:20+5*t.teleport,left:(3+t.teleport)*t.teleport});this.log('portal',{holder:t.id});}
      if(age<=20)return true;t.teleportCast=0;t.teleportCounter=0;t.nextAttack=this.tick+22;return false;
    }
    if(t.fireAt>0||this.tick<t.animAt+38)return false;
    if(t.teleportCounter<300){t.teleportCounter++;return false;}
    const target=this.targets().filter(e=>e.kind!=='juggernaut'&&e.teleports<3&&inRange({x:t.x,y:t.y-12.8},e,TOWERS.mage.range[3])).sort((a,b)=>this.remaining(a)-this.remaining(b))[0];
    if(!target)return false;t.portalTarget={x:target.x,y:target.y};t.teleportCast=this.tick;t.fireAt=0;t.animAt=this.tick;return true;
  }
  step():void {
    if(this.paused||this.phase==='won'||this.phase==='lost')return;
    this.tick++;this.stepPowerEffects();
    while(this.pending.length&&this.pending[0].tick<=this.tick){const s=this.pending.shift()!;if(s.owner&&!this.enemies.some(e=>e.id===s.owner&&this.active(e)))continue;const e=this.spawn(s.kind,s.route,s.lane<0?Math.floor(this.random()*3):s.lane);if(s.node!==undefined)e.node=s.node;if(s.position){e.x=s.position.x;e.y=s.position.y;}}
    for(const s of this.soldiers)this.stepSoldier(s);
    for(const e of this.enemies)this.stepEnemy(e);
    for(const t of this.towers)this.stepTower(t);
    const arrowsHit=new Set<number>();
    for(const p of this.projectiles){
      if(p.beam!==undefined){const target=this.enemies.find(e=>e.id===p.target&&this.active(e));if(!target){arrowsHit.add(p.id);continue;}p.to=this.enemyAim(target);if(p.disintegrate){if(p.beam===9)this.hurtEnemy(target,target.hp,'true');}else this.hurtEnemy(target,Math.floor(p.damage/10)+(p.beam===9?(p.beamExtra??0):0),'magic');if(p.beam===9)arrowsHit.add(p.id);else p.beam++;continue;}
      if(p.kind==='magic'&&p.position){
        const target=this.enemies.find(e=>e.id===p.target&&this.active(e));
        if(target)p.to=this.enemyAim(target);
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
      if(e&&this.active(e)&&arrowHits(e,p,this.tick)){this.hurtEnemy(e,p.damage,p.kind);if(p.poison&&e.hp>0&&canPoison(e.kind)&&(e.poisonTicks===0||p.poison>=e.poisonRank)){e.poisonRank=p.poison;e.poisonTicks=90;e.poisonCounter=0;this.log('poison',{enemy:e.id,rank:p.poison});}arrowsHit.add(p.id);}
    }
    this.projectiles=this.projectiles.filter(p=>!arrowsHit.has(p.id));
    const arrived=this.projectiles.filter(p=>p.beam===undefined&&p.impact<=this.tick);this.projectiles=this.projectiles.filter(p=>p.beam!==undefined||p.impact>this.tick);
    for(const p of arrived){
      if(p.burnRank&&p.burnRank>=2)this.burns.push({...p.to,start:this.tick,rank:p.burnRank,damage:this.roll(p.burnRank>=4?[20,30]:[10,20])});
      if(p.radius>0){for(const e of this.living())if((e.x-p.to.x)**2+((e.y-p.to.y)/(p.kind==='explosion'?2/3:ASPECT))**2<=p.radius**2)this.hurtEnemy(e,p.minDamage===undefined?p.damage:blastDamage(p.minDamage,p.damage,p.to,e,p.radius),p.kind);this.effects.push({...p.to,type:p.kind==='true'?'fire':'hit',start:this.tick,duration:18,radius:p.radius});}
      else {const e=this.enemies.find(e=>e.id===p.target);if(e&&e.hp>0&&!e.escaped&&p.kind!=='physical'){this.hurtEnemy(e,p.damage,p.kind);this.effects.push({x:e.x,y:e.y-8,type:'hit',start:this.tick,duration:7,radius:10});}}
    }
    this.stepHostileProjectiles();
    this.effects=this.effects.filter(e=>this.tick<e.start+e.duration);
    if(this.lives===0){this.phase='lost';this.log('defeat');return;}
    if(this.phase==='running'&&this.tick>=this.groupEnd&&this.pending.length===0){
      if(this.wave===this.level.groups.length&&this.living().length===0&&this.projectiles.length===0&&this.pending.length===0&&this.storms.length===0){this.phase='won';this.log('victory',{lives:this.lives});}
      else if(this.wave<this.level.groups.length&&this.tick>=this.nextWaveTick)this.callWave(false);
    }
  }
  export():string {return JSON.stringify({format:'open-games.kingdom-rush.trace.v1',seed:this.seed,level:this.level.level,practice:this.practice,reference:'Armor Games Flash v1.13 / geometry fa84f20 / visual 3e4eac4',completeHistory:this.events[0]?.type==='start',tick:this.tick,phase:this.phase,powerUpgrades:this.powerUpgrades,gold:this.gold,lives:this.lives,wave:this.wave,kills:this.kills,events:this.events},null,2);}
}
