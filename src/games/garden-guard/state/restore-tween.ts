import type Phaser from 'phaser';

/** Restore a one-shot gameplay tween. Its config must specify explicit from/to values.
 * Phaser 3.90 seek consumes its first step initializing, so seek(elapsed) alone
 * loses 16.6ms on every reload. Use two seek steps: initialization consumes
 * the first, and the second advances by exactly the saved elapsed time.
 */
export function restoreTween(tween:Phaser.Tweens.Tween,elapsed:number):void {
  const step=elapsed>0?elapsed:1;
  tween.seek(elapsed+step,step);
}
