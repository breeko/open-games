import Phaser from 'phaser';
import {ART_SCALE} from '../art';
import { GroundMotion } from '../reference/motion';
import { damageAfterArmor } from '../combat';
import { audio } from '../audio/AudioManager';
import { DEPTH, ZOMBIE_BARE_TEXTURE } from '../constants';
import type { GridManager } from '../managers/GridManager';
import type { ZombieType } from '../types';
import type { Plant } from './Plant';

export interface ZombieOptions {
  parameter?:number;
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
  readonly speed: number;

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

  /** Applied by Snow Pea. `slowUntil` is a scene timestamp. */
  private slowFactor = 1;
  private slowUntil = 0;
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

    this.row = row;
    this.waveIndex = options.wave ?? 0;
    this.hasPole = options.type === 'polevaulter';
    this.speed = options.speed;
    this.random=options.random??Math.random;
    this.motion=new GroundMotion(this.hasPole?'poleRun':this.random()<0.5?'walk':'walk2',options.parameter??0.3);
    if(options.type==='flag')this.flagLabel=scene.add.text(x+20,this.y-55,'⚑',{fontSize:'44px',color:'#e34832'}).setDepth(21);
    this.hp = options.hp;
    this.maxHp = options.hp;
    this.dps = options.dps;
    this.armorHp = options.armorHp ?? 0;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(DEPTH.zombies);
    this.setScale(ART_SCALE);
    this.setOrigin(options.type === 'polevaulter' ? 0.78 : 0.5, 0.78);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(42*1.6/ART_SCALE,115*1.6/ART_SCALE);
    body.setOffset(this.width*this.originX-42*1.6/ART_SCALE/2,this.height*this.originY-144/ART_SCALE);
    body.setAllowGravity(false);
    body.setVelocity(0, 0);
  }

  get remainingHealth(): number { return this.dead ? 0 : Math.max(0,this.hp) + Math.max(0,this.armorHp); }

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
    return this.scene.time.now < this.slowUntil;
  }

  /** Walk speed after any active chill is taken into account. */
  get currentSpeed(): number {
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
    this.slowUntil = this.scene.time.now + durationMs;
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
    if (this.dead || !this.active || this.vaulting) return;

    if (this.flash > 0) this.flash -= delta;

    this.flagLabel?.setPosition(this.x+20,this.y-55);
    if(this.headless){this.bleedTicks+=delta;while(this.bleedTicks>=10){this.bleedTicks-=10;if(this.random()<0.2)this.hp-=this.maxHp>=500?3:1;}if(this.hp<=0){this.die();return;}}
    const col = this.grid.worldToCol(this.x - (this.hasPole?82:0));
    const plant = this.grid.getPlant(col, this.row);

    if (!this.headless && plant && plant.active && !plant.isDying) {
      if (this.hasPole) { this.vault(); return; }
      this.eat(plant, delta);
    } else {
      this.setVelocityX(0);
      this.x-=this.motion.advance(delta,this.isSlowed);
    }

    this.updateTint();
  }

  private vault(): void {
    this.hasPole = false; this.motion=new GroundMotion('poleWalk',0.23+this.random()*0.14); this.vaulting = true; this.setVelocityX(0);
    const groundY = this.y;
    this.scene.tweens.add({ targets: this, x: this.x - 157, duration: 650, ease: 'Sine.easeInOut',
      onUpdate: tween => { this.y = groundY - Math.sin(tween.progress * Math.PI) * 60; },
      onComplete: () => { this.y = groundY; this.vaulting = false; this.setTexture('zombie-pole-walk').setOrigin(0.5,0.78);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(42*1.6/ART_SCALE,115*1.6/ART_SCALE);body.setOffset(this.width/2-67.2,this.height*0.78-288); } });
  }

  takeDamage(amount: number): void {
    if (this.dead || !this.active) return;

    const hadArmor = this.armorHp > 0;
    const durability = damageAfterArmor({hp:this.hp,armor:this.armorHp},amount);
    this.hp = durability.hp; this.armorHp = durability.armor;
    if (hadArmor && this.armorHp === 0) this.shedArmor();

    this.flash = 60;

    if(this.hp<this.maxHp/3)this.headless=true;
    if (this.hp <= 0) this.die();
  }

  /** Drops the cone / bucket, leaving an ordinary zombie behind. */
  private shedArmor(): void {
    this.setTexture(ZOMBIE_BARE_TEXTURE);

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
    const next = this.flash > 0 ? 2 : this.isSlowed ? 1 : 0;
    if (next === this.tintState) return;

    this.tintState = next;

    if (next === 2) this.setTintFill(0xffffff);
    else if (next === 1) this.setTint(0x9fd8ff);
    else this.clearTint();
  }

  private eat(plant: Plant, delta: number): void {
    this.setVelocityX(0);
    this.biteRemainder+=delta;
    const interval=this.isSlowed?80:40;
    while(this.biteRemainder>=interval){this.biteRemainder-=interval;plant.takeDamage(this.dps*0.04);}

    // Chewing wobble.
    this.setAngle(Math.sin(this.scene.time.now * 0.03) * 5);
  }

  private die(): void {
    this.dead = true;
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
    this.bobTween?.stop();
    this.bobTween = undefined;
    this.flagLabel?.destroy();
    super.destroy(fromScene);
  }
}
