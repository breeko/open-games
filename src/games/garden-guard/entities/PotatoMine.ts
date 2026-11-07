import {ART_SCALE} from '../art';
import { explode } from '../utils/explosion';
import type { GameContext, PlantDefinition } from '../types';
import { Plant } from './Plant';
import type { Zombie } from './Zombie';

const TEX_ARMING = 'potatomine';
const TEX_ARMED = 'potatomine-armed';

/**
 * Cheap, slow-fuse trap. It does nothing while it is buried; once armed it
 * detonates the moment a zombie steps into its cell.
 *
 * While unarmed it is harmless *and* fragile, so planting it early is a gamble.
 */
export class PotatoMine extends Plant {
  private armTimer = 0;
  private armed = false;
  private detonated = false;

  constructor(ctx: GameContext, def: PlantDefinition, col: number, row: number) {
    super(ctx, def, col, row);
    this.setTexture(TEX_ARMING);
  }

  get isArmed(): boolean {
    return this.armed;
  }

  protected onTick(delta: number): void {
    if (this.detonated) return;

    if (!this.armed) {
      this.armTimer += delta;

      if (this.armTimer >= (this.def.fuseMs ?? 14000)) {
        this.armed = true;
        this.setTexture(TEX_ARMED);
        this.ctx.scene.tweens.add({
          targets: this,
          scaleX: ART_SCALE*1.15,
          scaleY: ART_SCALE*1.15,
          duration: 120,
          yoyo: true,
        });
      }
      return;
    }

    if (this.zombieInCell()) this.detonate();
  }

  private zombieInCell(): boolean {
    return this.ctx.zombies.getChildren().some((child) => {
      const zombie = child as Zombie;
      return (
        zombie.active &&
        zombie.isHostile &&
        zombie.row === this.row &&
        this.ctx.grid.worldToCol(zombie.x) === this.col
      );
    });
  }

  private detonate(): void {
    this.detonated = true;

    const blast = this.def.blast ?? { radius: 90, damage: 1800 };
    explode(this.ctx, this.x, this.y, blast.radius, blast.damage);
    this.destroy();
  }
}
