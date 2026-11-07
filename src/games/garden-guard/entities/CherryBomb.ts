import { explode } from '../utils/explosion';
import type { GameContext, PlantDefinition } from '../types';
import { Plant } from './Plant';

/**
 * One-shot bomb. On a short fuse it pulses, then blows up everything in a
 * radius and destroys itself.
 */
export class CherryBomb extends Plant {
  private fuse = 0;
  private detonated = false;

  constructor(ctx: GameContext, def: PlantDefinition, col: number, row: number) {
    super(ctx, def, col, row);
  }

  protected onTick(delta: number): void {
    if (this.detonated) return;

    const fuseMs = this.def.fuseMs ?? 1200;
    this.fuse += delta;
    const progress = Math.min(1, this.fuse / fuseMs);

    // Swell up as it gets closer to exploding. (The plant's own spawn tween
    // finishes in 180ms, so only start resizing after that.)
    if (this.fuse > 200) this.setScale(1 + progress * 0.35);

    // Blink faster right before the bang.
    if (progress > 0.55) {
      const on = Math.floor(this.fuse / 90) % 2 === 0;
      if (on) this.setTintFill(0xffd0d0);
      else this.clearTint();
    }

    if (this.fuse >= fuseMs) this.detonate();
  }

  private detonate(): void {
    this.detonated = true;

    const blast = this.def.blast ?? { radius: 170, damage: 1800 };
    explode(this.ctx, this.x, this.y, blast.radius, blast.damage);
    this.destroy();
  }
}
