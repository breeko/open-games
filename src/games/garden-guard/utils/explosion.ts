import Phaser from 'phaser';
import { inBlast } from '../combat';
import { audio } from '../audio/AudioManager';
import { DEPTH } from '../constants';
import type { Zombie } from '../entities/Zombie';
import type { GameContext } from '../types';

/**
 * Area damage with a short visual burst.
 *
 * Used by Cherry Bomb (`radius` ~170px, i.e. the 3x3 block around its cell) and
 * Potato Mine (`radius` ~90px, i.e. its own cell).
 */
export function explode(
  ctx: GameContext,
  x: number,
  y: number,
  radius: number,
  damage: number,
): void {
  const ring = ctx.scene.add
    .circle(x, y, radius * 0.4, 0xffb03a, 0.45)
    .setDepth(DEPTH.effects);

  const core = ctx.scene.add
    .circle(x, y, 14, 0xfff3c4, 0.95)
    .setDepth(DEPTH.effects + 1);

  ctx.scene.tweens.add({
    targets: ring,
    scale: 2.5,
    alpha: 0,
    duration: 380,
    ease: 'Quad.easeOut',
    onComplete: () => ring.destroy(),
  });

  ctx.scene.tweens.add({
    targets: core,
    scale: 3,
    alpha: 0,
    duration: 240,
    ease: 'Quad.easeOut',
    onComplete: () => core.destroy(),
  });

  ctx.scene.cameras.main.shake(150, 0.006);
  audio.sfx('explode');

  for (const child of ctx.zombies.getChildren()) {
    const zombie = child as Zombie;
    if (!zombie.active || !zombie.isHostile || (radius<=120&&!zombie.canBeShot)) continue;
    if (inBlast(zombie.x - x,zombie.y - y,radius,ctx.grid.tileHeight)) {
      zombie.takeDamage(damage);
    }
  }
}
