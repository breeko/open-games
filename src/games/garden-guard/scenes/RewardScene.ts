import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, PLANT_DEFS } from '../constants';
import { TOTAL_LEVELS, getLevel, rewardForLevel } from '../levels';
import { progress } from '../state/progress';
import { Button } from '../ui/Button';

export interface RewardSceneData {
  levelId?: number;
  /** True when this clear was the player's first (so a plant is awarded). */
  firstClear?: boolean;
}

/**
 * Post-level screen. On a first clear this is the "you got a new plant!"
 * moment from the original; on a replay it is a simple summary.
 */
export class RewardScene extends Phaser.Scene {
  private levelId = 1;
  private firstClear = false;

  constructor() {
    super('reward');
  }

  init(data: RewardSceneData): void {
    this.levelId = data.levelId ?? 1;
    this.firstClear = data.firstClear ?? false;
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      this.input.keyboard?.removeAllListeners();
    });
    const level = getLevel(this.levelId);
    const reward = this.firstClear ? rewardForLevel(this.levelId) : undefined;
    const hasNext = this.levelId < TOTAL_LEVELS;

    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0d1a0b)
      .setOrigin(0, 0)
      .setDepth(DEPTH.lawn);

    this.add
      .text(GAME_WIDTH / 2, 74, `${level.name} COMPLETE!`, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '46px',
        color: '#9ff07a',
        stroke: '#1c3d16',
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    if (reward) {
      this.showReward(reward);
    } else if (!hasNext) {
      this.showDayComplete();
    } else {
      this.showReplay();
    }

    this.buildButtons(hasNext);

    this.input.keyboard?.on('keydown-ENTER', () => this.continueTo(hasNext));
    this.input.keyboard?.on('keydown-SPACE', () => this.continueTo(hasNext));

    this.cameras.main.fadeIn(240, 0, 0, 0);
  }

  /* ------------------------------------------------------------------ */
  /*  Content                                                            */
  /* ------------------------------------------------------------------ */

  private showReward(reward: (typeof PLANT_DEFS)[keyof typeof PLANT_DEFS]['type']): void {
    const def = PLANT_DEFS[reward];
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 150, 'YOU GOT A NEW PLANT!', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '32px',
        color: '#ffe066',
        stroke: '#2b2016',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    const halo = this.add.circle(cx, 290, 92, 0x2f6b2f, 0.35).setDepth(DEPTH.ui);
    this.tweens.add({
      targets: halo,
      scale: 1.12,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const icon = this.add.image(cx, 290, def.texture).setDisplaySize(216,256).setDepth(DEPTH.plants);
    this.tweens.add({
      targets: icon,
      y: 282,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(cx, 392, def.label.toUpperCase(), {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '34px',
        color: '#ffe066',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    this.add
      .text(cx, 432, `${def.cost} sun  \u00b7  ${def.maxHp} HP  \u00b7  ${(def.cooldownMs / 1000).toFixed(0)}s recharge`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#bfe0b0',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    this.add
      .text(cx, 470, def.description, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#e8f5e0',
        wordWrap: { width: 720 },
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.ui);

    this.add
      .text(cx, 548, 'Added to your Collection  \u00b7  New level unlocked!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#9ff07a',
        fontStyle: 'italic',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);
  }

  private showDayComplete(): void {
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 250, 'DAYTIME ADVENTURE COMPLETE!', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '40px',
        color: '#ffe066',
        stroke: '#2b2016',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    this.add
      .text(cx, 320, 'Your garden is safe. Thanks for trying this early version!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        color: '#bfe0b0',
        wordWrap: { width: 760 },
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.ui);

    this.add
      .text(cx, 400, 'Replay any level from the level map to try new seed loadouts.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#9fb79a',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);
  }

  private showReplay(): void {
    this.add
      .text(GAME_WIDTH / 2, 300, 'Already cleared \u2014 no new plant this time.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#bfe0b0',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    this.add
      .text(GAME_WIDTH / 2, 344, 'On to the next one!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#9ff07a',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);
  }

  private buildButtons(hasNext: boolean): void {
    if (hasNext) {
      new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 130, {
        label: `\u25b6   Next Level (${getLevel(this.levelId + 1).name})`,
        width: 380,
        height: 56,
        fontSize: 22,
        onClick: () => this.continueTo(true),
      });
    }

    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 62, {
      label: '\u25c0   Level Map',
      width: 300,
      height: 46,
      fontSize: 18,
      onClick: () => this.goToMap(),
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Navigation                                                         */
  /* ------------------------------------------------------------------ */

  private continueTo(hasNext: boolean): void {
    if (!hasNext) {
      this.goToMap();
      return;
    }

    audio.sfx('click');
    const nextId = this.levelId + 1;

    if (!progress.isUnlocked(nextId)) {
      this.goToMap();
      return;
    }

    this.cameras.main.fadeOut(160, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('seeds', { levelId: nextId });
    });
  }

  private goToMap(): void {
    audio.sfx('click');
    this.cameras.main.fadeOut(160, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('levels');
    });
  }
}
