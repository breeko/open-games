import type { GameContext, PlantDefinition } from '../types';
import { Plant } from './Plant';

const TEX_HEALTHY = 'wallnut';
const TEX_CRACKED = 'wallnut-cracked';
const TEX_BROKEN = 'wallnut-broken';

/**
 * Pure blocker: no attack, but 2000 hp (four times a normal plant) so it buys
 * the shooters time. It also switches texture as it takes damage, which gives
 * the player readable feedback.
 */
export class WallNut extends Plant {
  constructor(ctx: GameContext, def: PlantDefinition, col: number, row: number) {
    super(ctx, def, col, row);
  }

  protected onTick(): void {
    const ratio = this.hp / this.def.maxHp;

    const texture =
      ratio > 0.6 ? TEX_HEALTHY : ratio > 0.3 ? TEX_CRACKED : TEX_BROKEN;

    if (this.texture.key !== texture) this.setTexture(texture);
  }
}
