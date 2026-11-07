import { Plant } from './Plant';
import { Zombie } from './Zombie';
import type { GameContext, PlantDefinition } from '../types';
import Phaser from 'phaser';
import { DEPTH } from '../constants';
import { audio } from '../audio/AudioManager';

export class Chomper extends Plant {
  private digest = 0;
  private bar: Phaser.GameObjects.Rectangle;
  constructor(ctx: GameContext, def: PlantDefinition, col: number, row: number) {
    super(ctx,def,col,row);
    this.bar = ctx.scene.add.rectangle(this.x,this.y + 22,44,5,0xf5ca61).setDepth(DEPTH.effects).setVisible(false);
  }
  protected onTick(delta: number): void {
    this.digest = Math.max(0,this.digest - delta);
    this.bar.setVisible(this.digest > 0).setScale(this.digest / 42000,1);
    if (this.digest > 0) return;
    const prey = this.ctx.zombies.getChildren().find((child): child is Zombie => child instanceof Zombie && child.active && !child.isDead && child.row === this.row && child.x >= this.x - 20 && child.x < this.x + 115);
    if (!prey) return;
    prey.takeDamage(99999); this.digest = 42000; audio.sfx('plant');
    this.setTexture('chomper-digest');
    this.ctx.scene.time.delayedCall(42000,() => { if (this.active) this.setTexture('chomper'); });
  }
  override destroy(fromScene?: boolean): void { this.bar?.destroy(); super.destroy(fromScene); }
}
