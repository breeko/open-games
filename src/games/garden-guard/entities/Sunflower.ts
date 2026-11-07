import {ART_SCALE} from '../art';
import Phaser from 'phaser';
import { BALANCE, DEPTH } from '../constants';
import type { GameContext, PlantDefinition } from '../types';
import { Plant } from './Plant';
import { Sun } from './Sun';
import type { PlantBehavior } from '../state/session-data';

/**
 * Produces a sun every few seconds. Suns can be tapped or
 * automatically collected after landing when that preference is enabled.
 */
export class Sunflower extends Plant {
  private timer = 0;
  private next=3000+Math.floor(this.ctx.random()*951)*10;
  protected override saveBehavior(): PlantBehavior { return {kind:'sunflower',timer:this.timer,next:this.next}; }
  protected override restoreBehavior(data: PlantBehavior): void {if(data.kind!=='sunflower')throw new Error('Wrong sunflower behavior');this.timer=data.timer;this.next=data.next;}

  constructor(ctx: GameContext, def: PlantDefinition, col: number, row: number) {
    super(ctx, def, col, row);
    // First sun a little sooner so a fresh sunflower feels useful.
    this.timer = 0;
  }

  protected onTick(delta: number): void {
    this.timer += delta;
    if (this.timer < this.next) return;

    this.timer -= this.next;this.next=23500+Math.floor(this.ctx.random()*151)*10;
    this.produce();

    // Head bob.
    this.ctx.scene.tweens.add({
      targets: this,
      scaleX: ART_SCALE*1.12,
      scaleY: ART_SCALE*1.12,
      duration: 120,
      yoyo: true,
    });
  }

  private produce(): void {
    const x = this.x - 10 + Math.floor(this.ctx.random()*21);
    const y = this.y - 8;

    // eslint-disable-next-line no-new
    new Sun(this.ctx.scene, x, y, BALANCE.sunflowerSunValue, (value) => {
      this.ctx.resources.add(value);
    },undefined,this.ctx.sunBank);
  }
}
