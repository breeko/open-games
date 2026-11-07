import Phaser from 'phaser';
import {ART_SCALE} from '../art';
import { audio } from '../audio/AudioManager';
import { DEPTH } from '../constants';

/**
 * A collectible sun. Click it to be awarded the sun value.
 * Sits on top of everything and disappears on its own after a while.
 */
export class Sun extends Phaser.GameObjects.Image {
  private collected = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly value: number,
    onCollect: (value: number) => void,
    targetY?: number,
  ) {
    super(scene, x, y, 'sun');

    scene.add.existing(this);
    this.setScale(ART_SCALE);
    this.setDepth(DEPTH.sun);
    this.setInteractive(new Phaser.Geom.Circle(this.width / 2, this.height / 2, 112), Phaser.Geom.Circle.Contains);

    this.once(
      'pointerdown',
      (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        // Don't let the lawn see this click, otherwise an armed seed would be
        // planted underneath the sun the player was trying to collect.
        event.stopPropagation();

        if (this.collected) return;
        this.collected = true;
        audio.sfx('sun');
        onCollect(this.value);
        this.fadeOut();
      },
    );

    // Gentle drift + idle pulse.
    scene.tweens.add({
      targets: this,
      y: targetY ?? y + 26,
      duration: targetY === undefined ? 1400 : 6500,
      ease: 'Sine.easeOut',
    });
    scene.tweens.add({
      targets: this,
      angle: { from: -8, to: 8 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    // Expire so the lawn doesn't fill up with suns.
    scene.time.delayedCall(targetY === undefined ? 12000 : 18000, () => this.fadeOut());
  }

  get sunValue(): number {
    return this.value;
  }

  private fadeOut(): void {
    if (!this.active || this.scene === undefined) return;

    this.disableInteractive();
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: ART_SCALE*1.35,
      scaleY: ART_SCALE*1.35,
      duration: 200,
      onComplete: () => this.destroy(),
    });
  }
}
