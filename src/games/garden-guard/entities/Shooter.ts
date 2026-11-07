import {sizeArt} from '../art';
import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { BALANCE, DEPTH } from '../constants';
import type { GameContext, PlantDefinition } from '../types';
import { Plant } from './Plant';
import type { Zombie } from './Zombie';
import type { PlantBehavior } from '../state/session-data';

/**
 * Base class for every pea-shooting plant.
 *
 * Behaviour is entirely data-driven from the plant's definition:
 *
 * | field            | meaning                                    |
 * | ---------------- | ------------------------------------------ |
 * | `lanes`          | rows it can hit, relative to its own row    |
 * | `peasPerVolley`  | peas fired per lane, per volley             |
 * | `fireIntervalMs` | delay between volleys                       |
 * | `damage`         | damage per pea                              |
 * | `slow`           | optional slow applied by the pea            |
 *
 * So Peashooter is `[0] x1`, Repeater is `[0] x2`, Snow Pea is `[0] x1 + slow`
 * and Threepeater is `[-1,0,1] x1` — all from `PLANT_DEFS` with no new code.
 */
export abstract class Shooter extends Plant {
  /** Time remaining until the next volley may fire. */
  private cooldown = Math.floor(this.ctx.random()*151);
  private tickRemainder=0;
  private pendingShots=new Set<{row:number;timer:Phaser.Time.TimerEvent}>();
  protected override saveBehavior(): PlantBehavior { return {kind:'shooter',cooldown:this.cooldown,remainder:this.tickRemainder,shots:[...this.pendingShots].map(shot=>({row:shot.row,remainingMs:Math.max(0,shot.timer.getRemaining())}))}; }
  protected override restoreBehavior(data: PlantBehavior): void {
    if(data.kind!=='shooter')throw new Error('Wrong shooter behavior');
    this.cooldown=data.cooldown;this.tickRemainder=data.remainder;
    for(const shot of this.pendingShots)shot.timer.remove();this.pendingShots.clear();
    for(const shot of data.shots)this.schedulePea(shot.row,shot.remainingMs);
  }

  constructor(ctx: GameContext, def: PlantDefinition, col: number, row: number) {
    super(ctx, def, col, row);
  }

  /** Absolute rows this shooter can hit. */
  protected get targetRows(): number[] {
    return this.def.lanes
      ? this.def.lanes.map((offset) => this.row + offset)
      : [this.row];
  }

  protected onTick(delta: number): void {
    this.tickRemainder+=delta;
    while(this.tickRemainder>=10){
      this.tickRemainder-=10;this.cooldown--;
      if(this.cooldown<=0){
        this.cooldown=150-Math.floor(this.ctx.random()*15);
        if(this.hasTargetAhead())this.fireVolley();
      }else if(this.cooldown===25 && this.def.type==='repeater' && this.hasTargetAhead())this.fireVolley();
    }
  }

  private hasTargetAhead(): boolean {
    const rows = this.targetRows;

    return this.ctx.zombies.getChildren().some((child) => {
      const zombie = child as Zombie;
      return (
        zombie.active &&
        zombie.isHostile && !zombie.isHeadless &&
        rows.includes(zombie.row) &&
        zombie.x > this.x - 10 && (!this.def.range || zombie.x-this.x<=this.def.range)
      );
    });
  }

  private fireVolley(): void {
    const peasPerLane = 1;

    for (const laneRow of this.targetRows) {
      if (!this.ctx.grid.isInside(0, laneRow)) continue;

      for (let i = 0; i < peasPerLane; i += 1) {
        // Repeater-style bursts are spaced slightly apart.
        this.schedulePea(laneRow,i*140);
      }
    }

    this.recoil();
  }

  private schedulePea(row:number,delay:number):void {
    const shot={row,timer:this.scene.time.delayedCall(delay,()=>{this.pendingShots.delete(shot);this.spawnPea(row);})};
    this.pendingShots.add(shot);
  }

  private spawnPea(laneRow: number): void {
    if (!this.active) return;
    if (!this.ctx.grid.isInside(0, laneRow)) return;

    // Muzzle measured in the flattened texture; transform follows recoil and planting scale.
    const muzzleY=this.def.type==='puffshroom'?0.75:0.35;
    const point=this.getWorldTransformMatrix().transformPoint((0.88-this.originX)*this.width,(muzzleY-this.originY)*this.height);
    const y=point.y+(laneRow-this.row)*160;
    const texture = this.def.projectile ?? 'pea';

    const pea = this.ctx.peas.create(point.x, y, texture) as Phaser.Physics.Arcade.Image;

    sizeArt(pea,texture);
    const body=pea.body as Phaser.Physics.Arcade.Body;
    body.setCircle(pea.width*12/28);
    body.setOffset(pea.width/2-body.radius,pea.height/2-body.radius);
    pea.setData('originX',pea.x);
    if(this.def.type==='puffshroom')pea.setData('expiresMs',750);
    pea.setData('row', laneRow);
    pea.setDepth(DEPTH.peas);
    pea.setVelocityX(BALANCE.peaSpeed);
    pea.setData('damage', this.def.damage ?? BALANCE.peaDamage);

    if (this.def.slow) {
      pea.setData('slowFactor', this.def.slow.factor);
      pea.setData('slowMs', this.def.slow.durationMs);
    }

    audio.sfx('shoot');
  }

  private recoil(): void {
    this.ctx.scene.tweens.add({
      targets: this,
      x: this.x - 4,
      duration: 60,
      yoyo: true,
    });
  }
}
