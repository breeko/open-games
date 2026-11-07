import type Phaser from 'phaser';
import { z } from 'zod';

export const arcadeRemainderSchema=z.number().nonnegative().lt(1000/60);
/** Phaser 3.90 has no public accessor for its fixed-step remainder. Keep this
 * pinned-engine bridge here, rather than losing a projectile physics tick on reload.
 * Browser continuation checks cover it when upgrading Phaser.
 */
export function saveArcadeClock(world:Phaser.Physics.Arcade.World):number {
  return arcadeRemainderSchema.parse(Reflect.get(world,'_elapsed'));
}
export function restoreArcadeClock(world:Phaser.Physics.Arcade.World,value:number):void {
  Reflect.set(world,'_elapsed',arcadeRemainderSchema.parse(value));
}
