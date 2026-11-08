import Phaser from 'phaser';
import {DanceRoutine,iceFreezeMs,backupPositions} from '../night-combat';
import {ART_SCALE} from '../art';
import { GroundMotion } from '../reference/motion';
import {whackBonk} from '../whack-director';
import {damageWithShield,waveHealth} from '../combat';
import { audio } from '../audio/AudioManager';
import { DEPTH, ZOMBIE_BARE_TEXTURE, ZOMBIE_DEFS } from '../constants';
import type { ZombieSnapshot } from '../state/session-data';
import { restoreTween } from '../state/restore-tween';
import type { GridManager } from '../managers/GridManager';
import type { ZombieType } from '../types';
import type { Plant } from './Plant';

export interface ZombieOptions {
  onDeath?:(zombie:Zombie)=>void;
  danceClock?:()=>number;
  summonBackup?:(leader:Zombie,slot:number)=>Zombie|null;
  group?:Phaser.Physics.Arcade.Group;
  parameter?:number;
  speedMultiplier?:number;
  shieldHp?:number;
  emergenceMs?:number;
  random?:()=>number;
  hp: number;
  type?: ZombieType;
  wave?: number;
  speed: number;
  /** Damage per second dealt to the plant it is chewing. */
  dps: number;
  /** Headgear hit points, absorbed before `hp`. Defaults to 0. */
  armorHp?: number;
  /** Texture key for the armoured look. Defaults to the plain zombie. */
  texture?: string;
}

/**
 * A zombie walks left down a single lane. When it reaches an occupied cell it
 * stops and chews the plant in source-sized bite ticks.
 */
export class Zombie extends Phaser.Physics.Arcade.Sprite {
  readonly row: number;
  readonly waveIndex: number;
  private hasPole: boolean;
  private vaulting = false;
  private vaultState?: { startX:number; groundY:number; tween:Phaser.Tweens.Tween };
  readonly speed: number;

  private readonly onDeath?:(zombie:Zombie)=>void;
  private iceFront?:Phaser.GameObjects.Image;
  private iceBack?:Phaser.GameObjects.Image;
  private allyMarker?:Phaser.GameObjects.Text;
  private frozenMs=0;
  private dance?:DanceRoutine;
  private leader?:Zombie;
  private danceSlot:number|null=null;
  private readonly danceClock:()=>number;
  private readonly summonBackup?:(leader:Zombie,slot:number)=>Zombie|null;
  // Most boards have no hypnosis allies. Keep a conservative live set so
  // ordinary enemies can skip an otherwise quadratic opponent search. When
  // allies exist we retain the original group order and exact target rules.
  private static readonly alliesByGroup=new WeakMap<Phaser.Physics.Arcade.Group,Set<Zombie>>();
  private allies=false;
  private setAllegiance(allies:boolean):void {
    this.allies=allies;if(!this.group)return;
    let members=Zombie.alliesByGroup.get(this.group);
    if(allies){if(!members){members=new Set();Zombie.alliesByGroup.set(this.group,members);}members.add(this);}
    else members?.delete(this);
  }
  private readonly group?:Phaser.Physics.Arcade.Group;
  private readonly emergenceTotal:number;
  private shieldHp:number;
  private readonly zombieType:ZombieType;
  private rageDelay=0;
  private emergenceMs:number;
  private readonly speedMultiplier:number;
  private hp: number;
  private readonly maxHp: number;
  private readonly dps: number;

  /** Headgear hit points. Hits chip this before the body. */
  private armorHp: number;

  private dead = false;
  private motion:GroundMotion;
  private random:()=>number;
  private bleedTicks=0;
  private headless=false;
  private biteRemainder=0;
  private flagLabel?:Phaser.GameObjects.Text;
  private bobTween?: Phaser.Tweens.Tween;
  /** Hit-flash timer, so we don't schedule a delayed call per pea. */
  private flash = 0;

  /** Remaining gameplay time; browser pause and offline time must not consume it. */
  private slowFactor = 1;
  private slowRemainingMs = 0;
  /** Cached tint state: 0 = none, 1 = chilled, 2 = hit flash. */
  private tintState = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    row: number,
    private readonly grid: GridManager,
    options: ZombieOptions,
  ) {
    super(scene, x, grid.cellToWorld(0, row).y + 10, options.texture ?? ZOMBIE_BARE_TEXTURE);

    this.danceClock=options.danceClock??(()=>Math.floor(scene.time.now/10));this.summonBackup=options.summonBackup;
    this.onDeath=options.onDeath;this.group=options.group;this.emergenceTotal=options.emergenceMs??0;
    this.zombieType=options.type??'basic';this.shieldHp=options.shieldHp??0;
    this.emergenceMs=options.emergenceMs??0;this.speedMultiplier=options.speedMultiplier??1;
    this.row = row;
    this.waveIndex = options.wave ?? 0;
    this.hasPole = options.type === 'polevaulter';
    this.speed = options.speed;
    this.random=options.random??Math.random;
    this.motion=new GroundMotion(this.zombieType==='dancer'?'dancerEntry':this.zombieType==='backup'?'backup':this.zombieType==='football'?'football':this.zombieType==='newspaper'?'paperWalk':this.hasPole?'poleRun':this.random()<0.5?'walk':'walk2',options.parameter??0.3);
    if(this.zombieType==='dancer')this.dance=new DanceRoutine(3000+Math.floor(this.random()*12)*10);
    if(options.type==='flag')this.flagLabel=scene.add.text(x+20,this.y-55,'⚑',{fontSize:'44px',color:'#e34832'}).setDepth(21);
    this.hp = options.hp;
    this.maxHp = options.hp;
    this.dps = options.dps;
    this.armorHp = options.armorHp ?? 0;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(DEPTH.zombies+row*0.1);
    this.setScale(ART_SCALE);
    this.setOrigin(options.type === 'polevaulter' ? 0.78 : 0.5, 0.78);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const bodyWidth=(this.zombieType==='football'?57:42)*1.6/ART_SCALE;
    body.setSize(bodyWidth,115*1.6/ART_SCALE);
    body.setOffset(this.width*this.originX-bodyWidth/2,this.height*this.originY-144/ART_SCALE);
    body.setAllowGravity(false);
    body.setVelocity(0, 0);
  }

  get remainingHealth(): number { return this.dead ? 0 : Math.max(0,this.hp) + Math.max(0,this.armorHp)+Math.max(0,this.shieldHp); }

  get waveHealth():number {return this.dead?0:waveHealth({hp:this.hp,armor:this.armorHp,shield:this.shieldHp});}
  get isHostile():boolean{return !this.allies&&!this.dead;}
  get canBeShot():boolean{return this.isHostile&&!this.headless&&this.emergenceMs<=0&&!this.vaulting;}
  get variant():ZombieType{return this.zombieType;}
  save(references?:ReadonlyMap<Zombie,number>): ZombieSnapshot {
    return {type:this.zombieType,x:this.x,y:this.y,row:this.row,wave:this.waveIndex,hp:this.hp,maxHp:this.maxHp,
      armorHp:this.armorHp,shieldHp:this.shieldHp,speed:this.speed,speedMultiplier:this.speedMultiplier,dps:this.dps,
      allies:this.allies,hasPole:this.hasPole,emergenceTotal:this.emergenceTotal,emergenceMs:this.emergenceMs,
      rageDelay:this.rageDelay,headless:this.headless,bleedTicks:this.bleedTicks,biteRemainder:this.biteRemainder,
      frozenMs:this.frozenMs,dance:this.dance?.save()??null,leaderIndex:this.leader?references?.get(this.leader)??null:null,danceSlot:this.danceSlot,
      slowFactor:this.slowFactor,slowRemainingMs:this.slowRemainingMs,motion:this.motion.save(),
      vault:this.vaulting&&this.vaultState?{startX:this.vaultState.startX,groundY:this.vaultState.groundY,elapsed:Math.min(650,this.vaultState.tween.elapsed)}:null};
  }
  static fromSave(scene:Phaser.Scene,grid:GridManager,data:ZombieSnapshot,options:Pick<ZombieOptions,'group'|'random'|'onDeath'|'danceClock'|'summonBackup'>):Zombie {
    const zombie=new Zombie(scene,data.x,data.row,grid,{...options,type:data.type,wave:data.wave,hp:data.maxHp,
      armorHp:data.armorHp,shieldHp:data.shieldHp,speed:data.speed,speedMultiplier:data.speedMultiplier,dps:data.dps,
      emergenceMs:data.emergenceTotal,parameter:data.motion.parameter});
    zombie.hp=data.hp;zombie.setAllegiance(data.allies);zombie.hasPole=data.hasPole;zombie.emergenceMs=data.emergenceMs;
    zombie.rageDelay=data.rageDelay;zombie.headless=data.headless;zombie.bleedTicks=data.bleedTicks;
    zombie.biteRemainder=data.biteRemainder;zombie.slowFactor=data.slowFactor;zombie.slowRemainingMs=data.slowRemainingMs;
    zombie.motion.restore(data.motion);zombie.frozenMs=data.frozenMs;zombie.danceSlot=data.danceSlot;
    if(zombie.dance&&data.dance)zombie.dance.restore(data.dance);
    const texture=data.type==='polevaulter'&&!data.hasPole&&!data.vault?'zombie-pole-walk':
      data.type==='newspaper'&&data.shieldHp===0?'zombie-paper-angry':
      data.type==='football'&&data.armorHp===0?'zombie-football-bare':
      ((data.type==='conehead'||data.type==='buckethead')&&data.armorHp===0)||(data.type==='screendoor'&&data.shieldHp===0)?ZOMBIE_BARE_TEXTURE:ZOMBIE_DEFS[data.type].texture;
    zombie.setTexture(texture).setOrigin(data.type==='polevaulter'&&(data.hasPole||data.vault)?0.78:0.5,0.78).setFlipX(data.allies);
    const body=zombie.body as Phaser.Physics.Arcade.Body;
    body.setOffset(zombie.width*zombie.originX-body.width/2,zombie.height*zombie.originY-288);
    zombie.walk();
    if(data.vault)zombie.startVault(data.vault.startX,data.vault.groundY,data.vault.elapsed);
    zombie.setPosition(data.x,data.y);
    if(data.emergenceMs>0)zombie.setAlpha(1-data.emergenceMs/data.emergenceTotal);
    zombie.updateTint();return zombie;
  }
  restoreDanceLink(data:ZombieSnapshot,zombies:readonly Zombie[]):void {this.leader=data.leaderIndex===null?undefined:zombies[data.leaderIndex];}
  joinDance(leader:Zombie,slot:number):void {this.leader=leader;this.danceSlot=slot;this.setAllegiance(!leader.isHostile);this.setFlipX(this.allies);}
  get freezeRemainingMs():number{return this.frozenMs;}
  freeze():void {
    if(!this.active||!this.isHostile||this.headless||this.emergenceMs>0)return;
    const cold=this.isSlowed||this.frozenMs>0;
    this.applySlow(0.5,20000);
    if(this.vaulting)return;
    this.frozenMs=iceFreezeMs(cold,this.random);this.takeDamage(20);
  }
  get isHeadless():boolean {return this.headless;}

  get isDead(): boolean {
    return this.dead;
  }

  get healthRatio(): number {
    return Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
  }

  /** True while the zombie still has headgear on. */
  get hasArmor(): boolean {
    return this.armorHp > 0;
  }

  /** True while a Snow Pea's chill is still in effect. */
  get isSlowed(): boolean {
    return this.slowRemainingMs > 0;
  }

  /** Walk speed after any active chill is taken into account. */
  get currentSpeed(): number {
    if(this.frozenMs>0)return 0;
    return this.motion.meanPixelsPerSecond*(this.isSlowed?0.5:1);
  }

  /**
   * Chills this zombie. Repeated hits refresh the duration rather than stacking
   * the multiplier, so a lane of Snow Peas cannot freeze it solid.
   */
  applySlow(factor: number, durationMs: number): void {
    if (this.dead || !this.active) return;

    // Refresh the duration on every hit, and keep the strongest factor only
    // while a chill is already active (so it resets after it wears off).
    const alreadySlowed = this.isSlowed;

    this.slowFactor = alreadySlowed ? Math.min(this.slowFactor, factor) : factor;
    this.slowRemainingMs = durationMs;
  }

  /** Starts the idle shuffle animation. */
  walk(): void {
    this.bobTween?.stop();
    this.bobTween = this.scene.tweens.add({
      targets: this,
      angle: { from: -3, to: 3 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
  }

  /** Called every frame by `GameScene`. */
  tick(delta: number): void {
    if (this.dead || !this.active) return;
    this.slowRemainingMs=Math.max(0,this.slowRemainingMs-delta);
    if(this.vaulting)return;

    if (this.flash > 0) this.flash -= delta;
    if(this.emergenceMs>0){this.emergenceMs=Math.max(0,this.emergenceMs-delta);this.setAlpha(1-this.emergenceMs/this.emergenceTotal);return;}
    if(this.rageDelay>0){this.rageDelay=Math.max(0,this.rageDelay-delta);this.updateTint();return;}

    this.flagLabel?.setPosition(this.x+20,this.y-55);
    if(this.headless){this.bleedTicks+=delta;while(this.bleedTicks>=10){this.bleedTicks-=10;if(this.random()<0.2)this.hp-=this.maxHp>=500?3:1;}if(this.hp<=0){this.die();return;}}
    if(this.frozenMs>0){this.frozenMs=Math.max(0,this.frozenMs-delta);this.updateTint();return;}
    if(this.dance){
      const previousPhase=this.dance.phase;
      const members=this.danceMembers();
      const needs=backupPositions(this.x,this.row).some(p=>!members.some(z=>z.leader===this&&z.danceSlot===p.slot));
      if(this.dance.advance(delta,this.danceClock(),needs,!this.headless,this.x<1211.2)){
        for(const p of backupPositions(this.x,this.row))if(!members.some(z=>z.leader===this&&z.danceSlot===p.slot))this.summonBackup?.(this,p.slot);
      }
      if(previousPhase==='entry'&&this.dance.phase!=='entry')this.motion=new GroundMotion('dancer',0.45*this.speedMultiplier);
      if(!this.allies)this.motion.parameter=(this.dance.phase==='entry'?0.5:0.45)*this.speedMultiplier;
    }
    const hasOpponents=this.allies||Boolean(this.group&&Zombie.alliesByGroup.get(this.group)?.size);
    const opponent=hasOpponents?this.group?.getChildren().find((z):z is Zombie=>z instanceof Zombie&&z!==this&&z.active&&!z.dead&&!z.headless&&z.emergenceMs<=0&&!z.vaulting&&z.allies!==this.allies&&z.row===this.row&&Math.abs(z.x-this.x)<75&&(this.allies?z.x>=this.x-20:z.x<=this.x+20)):undefined;
    if(!this.headless&&opponent){
      this.biteRemainder+=delta;const interval=this.isSlowed?80:40;
      while(this.biteRemainder>=interval){this.biteRemainder-=interval;opponent.takeDamage(this.dps*0.04);}
      this.updateTint();return;
    }
    if(this.allies){if(this.danceCanMove())this.x+=this.motion.advance(delta,this.danceChilled());if(this.x>1400){this.destroy();return;}this.updateTint();return;}
    const col = this.grid.worldToCol(this.x - (this.hasPole?82:0));
    const plant = this.grid.getPlant(col, this.row);

    if (!this.headless && plant && plant.active && !plant.isDying) {
      if (this.hasPole) { this.vault(); return; }
      this.eat(plant, delta);
    } else {
      this.setVelocityX(0);
      if(this.danceCanMove())this.x-=this.motion.advance(delta,this.danceChilled());
    }

    this.updateTint();
  }

  private danceMembers():Zombie[] {
    const leader=this.dance?this:this.leader?.active?this.leader:undefined;
    if(!leader)return [];
    return this.group?.getChildren().filter((z):z is Zombie=>z instanceof Zombie&&z.active&&!z.isDead&&(z===leader||z.leader===leader))??[];
  }
  private isChewing():boolean {
    if(this.headless||this.frozenMs>0||this.emergenceMs>0)return false;
    const plant=this.grid.getPlant(this.grid.worldToCol(this.x),this.row);
    return !this.allies&&Boolean(plant?.active&&!plant.isDying);
  }
  private danceCanMove():boolean {
    const leader=this.dance?this:this.leader?.active?this.leader:undefined;
    if(!leader)return this.zombieType!=='backup'||Math.floor(this.danceClock()/20)%23<=11;
    return Boolean(leader.dance?.canMove(this.danceClock()))&&!this.group?.getChildren().some(z=>z instanceof Zombie&&z.active&&!z.isDead&&(z===leader||z.leader===leader)&&(z.frozenMs>0||z.isChewing()));
  }
  private danceChilled():boolean {
    if(this.isSlowed)return true;
    const leader=this.dance?this:this.leader?.active?this.leader:undefined;
    return Boolean(leader&&this.group?.getChildren().some(z=>z instanceof Zombie&&z.active&&!z.isDead&&(z===leader||z.leader===leader)&&z.isSlowed));
  }

  private vault(): void {
    this.hasPole = false; this.motion=new GroundMotion('poleWalk',(0.23+this.random()*0.14)*this.speedMultiplier); this.vaulting = true; this.setVelocityX(0);
    this.startVault(this.x,this.y);
  }
  private startVault(startX:number,groundY:number,elapsed=0):void {
    this.vaulting=true;this.setPosition(startX,groundY);
    const tween=this.scene.tweens.add({ targets: this, x: {from:startX,to:startX - 157}, duration: 650, ease: 'Sine.easeInOut',
      onUpdate: tween => { this.y = groundY - Math.sin(tween.progress * Math.PI) * 60; },
      onComplete: () => { this.y = groundY; this.vaulting = false; this.setTexture('zombie-pole-walk').setOrigin(0.5,0.78);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(42*1.6/ART_SCALE,115*1.6/ART_SCALE);body.setOffset(this.width/2-67.2,this.height*0.78-288); } });
    this.vaultState={startX,groundY,tween};
    if(elapsed>0)restoreTween(tween,elapsed);
  }

  /** Original ApplyBurn destroys current land enemies regardless of helmets or
   * carried doors. Future enemies with 1800+ body HP instead take blast damage. */
  burn():void {
    if(this.hp>=1800)this.takeDamage(1800,true);
    else this.takeDamage(this.remainingHealth);
  }

  takeDamage(amount: number,bypassShield=false): void {
    if (this.dead || !this.active) return;

    const hadArmor = this.armorHp > 0;
    const hadShield=this.shieldHp>0;
    const durability = damageWithShield({hp:this.hp,armor:this.armorHp,shield:this.shieldHp},amount,bypassShield);
    this.shieldHp=durability.shield;
    this.hp = durability.hp; this.armorHp = durability.armor;
    if(hadShield&&this.shieldHp===0){
      if(this.zombieType==='newspaper'){
        this.setTexture('zombie-paper-angry');this.rageDelay=1625;
        this.motion=new GroundMotion('paperRun',(0.89+this.random()*0.02)*this.speedMultiplier);
      }else {this.setTexture(ZOMBIE_BARE_TEXTURE);
        const body=this.body as Phaser.Physics.Arcade.Body;body.setOffset(this.width*this.originX-body.width/2,this.height*this.originY-288);
      }
    }
    if (hadArmor && this.armorHp === 0) this.shedArmor();

    this.flash = 60;

    if(this.hp<this.maxHp/3)this.headless=true;
    if (this.hp <= 0) this.die();
  }

  /** Drops the cone / bucket, leaving an ordinary zombie behind. */
  private shedArmor(): void {
    this.setTexture(this.zombieType==='football'?'zombie-football-bare':ZOMBIE_BARE_TEXTURE);
    const body=this.body as Phaser.Physics.Arcade.Body;body.setOffset(this.width*this.originX-body.width/2,this.height*this.originY-288);

    this.scene.tweens.add({
      targets: this,
      scaleX: ART_SCALE*1.15,
      scaleY: ART_SCALE*0.9,
      duration: 90,
      yoyo: true,
    });
  }

  /** Applies the highest-priority visual state, only touching the tint on change. */
  private updateTint(): void {
    // Canvas does not render WebGL tint effects; original ice artwork makes freezing visible.
    if(this.frozenMs>0&&this.active){
      this.iceBack??=this.scene.add.image(this.x,this.y+37,'ice-back').setScale(1.6).setDepth(this.depth-0.01);
      this.iceFront??=this.scene.add.image(this.x,this.y+37,'ice-front').setScale(1.6).setDepth(this.depth+0.01);
      this.iceBack.setPosition(this.x,this.y+37);this.iceFront.setPosition(this.x,this.y+37);
    }else{this.iceFront?.destroy();this.iceBack?.destroy();this.iceFront=undefined;this.iceBack=undefined;}
    if(this.allies&&this.active){
      this.allyMarker??=this.scene.add.text(this.x,this.y-155,'ALLY',{fontFamily:'Arial, sans-serif',fontSize:'14px',fontStyle:'bold',color:'#e4c0ff',stroke:'#332844',strokeThickness:3,resolution:2}).setOrigin(0.5).setDepth(this.depth+0.02);
      this.allyMarker.setPosition(this.x,this.y-155);
    }

    const next = this.flash > 0 ? 2 : this.frozenMs>0?4:this.isSlowed ? 1 : this.allies?3:0;
    if (next === this.tintState) return;

    this.tintState = next;

    if (next === 2) this.setTintFill(0xffffff);
    else if (next === 1) this.setTint(0x9fd8ff);
    else if(next===4)this.setTint(0x55cfff);
    else if(next===3)this.setTint(0xd3a4ff);
    else this.clearTint();
  }

  private eat(plant: Plant, delta: number): void {
    this.setVelocityX(0);
    if(plant.plantType==='hypnoshroom'){for(const z of this.danceMembers())if(z.leader===this)z.leader=undefined;this.leader=undefined;plant.remove();this.setAllegiance(true);this.setFlipX(true);this.motion.parameter=0.17*this.speedMultiplier;this.biteRemainder=0;return;}
    this.biteRemainder+=delta;
    const interval=this.isSlowed?80:40;
    while(this.biteRemainder>=interval){this.biteRemainder-=interval;plant.takeDamage(this.dps*0.04);}

    // Chewing wobble.
    this.setAngle(Math.sin(this.scene.time.now * 0.03) * 5);
  }

  bonk():boolean {
    if(!this.active||!this.isHostile)return false;
    const hadArmor=this.armorHp>0,result=whackBonk(this.hp,this.armorHp);
    this.hp=result.hp;this.armorHp=result.armor;this.flash=60;
    if(hadArmor&&this.armorHp===0)this.shedArmor();
    if(this.hp<=0){this.die();return true;}return false;
  }

  private die(): void {
    this.iceFront?.destroy();this.iceBack?.destroy();this.allyMarker?.destroy();this.iceFront=undefined;this.iceBack=undefined;this.allyMarker=undefined;
    this.dead = true;
    this.onDeath?.(this);
    this.flagLabel?.destroy();
    this.bobTween?.stop();
    this.scene.tweens.killTweensOf(this);
    this.setActive(false);
    audio.sfx('zombieDie');

    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.setVelocity(0, 0);
      body.enable = false;
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y + 20,
      angle: 85,
      duration: 450,
      onComplete: () => this.destroy(),
    });
  }

  override destroy(fromScene?: boolean): void {
    if(this.group)Zombie.alliesByGroup.get(this.group)?.delete(this);
    this.iceFront?.destroy();this.iceBack?.destroy();this.allyMarker?.destroy();this.iceFront=undefined;this.iceBack=undefined;this.allyMarker=undefined;
    this.bobTween?.stop();
    this.bobTween = undefined;
    this.flagLabel?.destroy();
    super.destroy(fromScene);
  }
}
