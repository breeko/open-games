import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, PLANT_DEFS } from '../constants';
import { LEVELS, TOTAL_LEVELS, rewardForLevel } from '../levels';
import { progress } from '../state/progress';
import { Button } from '../ui/Button';

const CARD_W = 214;
const CARD_H = 170;
const CARD_GAP = 20;
const COLS = 5;
const GRID_TOP = 150;

/**
 * Adventure level map — the original's world map, flattened into a grid.
 *
 * Cleared levels show a tick and the plant they awarded; the next level is
 * highlighted; everything beyond that is locked.
 *
 * Keyboard: arrows to move, Enter to play, `ESC`/Backspace to go back.
 */
export class LevelSelectScene extends Phaser.Scene {
  private cards: Phaser.GameObjects.Container[] = [];
  private frames: Phaser.GameObjects.Rectangle[] = [];
  private focusIndex = 0;

  constructor() {
    super('levels');
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      this.input.keyboard?.removeAllListeners();
    });
    this.cards = [];
    this.frames = [];

    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x101c0d)
      .setOrigin(0, 0)
      .setDepth(DEPTH.lawn);

    this.add
      .text(GAME_WIDTH / 2, 54, 'ADVENTURE  \u00b7  DAY & NIGHT', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '40px',
        color: '#ffe066',
        stroke: '#2b2016',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    this.add
      .text(
        GAME_WIDTH / 2,
        100,
        `Levels cleared ${progress.completedCount} / ${TOTAL_LEVELS}   \u00b7   All levels open · Tap any card to play`,
        { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#bfe0b0' },
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    this.buildCards();
    this.buildFooter();
    this.wireKeyboard();

    // Default the focus to the next level to play.
    this.focusIndex = Math.min(progress.unlockedLevel - 1, LEVELS.length - 1);
    this.applyFocus();

    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  /* ------------------------------------------------------------------ */
  /*  Layout                                                             */
  /* ------------------------------------------------------------------ */

  private buildCards(): void {
    const gridWidth = COLS * CARD_W + (COLS - 1) * CARD_GAP;
    const startX = (GAME_WIDTH - gridWidth) / 2 + CARD_W / 2;

    LEVELS.forEach((level, index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);

      const x = startX + col * (CARD_W + CARD_GAP);
      const y = GRID_TOP + row * (CARD_H + CARD_GAP) + CARD_H / 2;

      this.cards.push(this.buildCard(level.id, x, y));
    });
  }

  private buildCard(levelId: number, x: number, y: number): Phaser.GameObjects.Container {
    const level = LEVELS[levelId - 1];
    const completed = progress.isCompleted(levelId);
    const unlocked = true;
    const isNext = levelId === progress.unlockedLevel && !completed;

    const container = this.add.container(x, y).setDepth(DEPTH.ui);

    const frame = this.add
      .rectangle(0, 0, CARD_W, CARD_H, unlocked ? 0x1e3a1a : 0x141a12)
      .setStrokeStyle(isNext ? 3 : 2, isNext ? 0xffe066 : completed ? 0x6fbf5f : 0x3f6b39);

    const name = this.add
      .text(-CARD_W / 2 + 16, -CARD_H / 2 + 12, level.name, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '30px',
        color: unlocked ? '#ffe066' : '#5d6b57',
      });

    const title = this.add.text(-CARD_W / 2 + 16, -CARD_H / 2 + 50, level.title, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: unlocked ? '#e8f5e0' : '#68765f',
    });

    const blurb = this.add.text(-CARD_W / 2 + 16, -CARD_H / 2 + 72, level.blurb, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      color: '#9fb79a',
      wordWrap: { width: CARD_W - 32 },
    });

    const pieces: Phaser.GameObjects.GameObject[] = [frame, name, title, blurb];

    // Reward preview (the plant this level hands over).
    const reward = rewardForLevel(levelId);
    if (reward) {
      const def = PLANT_DEFS[reward];
      pieces.push(
        this.add
          .image(CARD_W / 2 - 34, CARD_H / 2 - 34, def.texture)
          .setScale(0.31)
          .setAlpha(unlocked ? 1 : 0.35),
        this.add
          .text(CARD_W / 2 - 34, CARD_H / 2 - 8, def.label, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            color: '#bfe0b0',
          })
          .setOrigin(0.5),
      );
    }

    // Status badge.
    if (!unlocked) {
      pieces.push(
        this.add.rectangle(0, 0, CARD_W, CARD_H, 0x050a05, 0.55),
        this.add
          .text(-CARD_W / 2 + 16, CARD_H / 2 - 38, '\u25a0  LOCKED', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '20px',
            color: '#8a9683',
          }),
      );
    } else if (completed) {
      pieces.push(
        this.add
          .text(-CARD_W / 2 + 16, CARD_H / 2 - 30, '\u2714  CLEARED', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '15px',
            color: '#9ff07a',
            fontStyle: 'bold',
          }),
      );
    } else {
      pieces.push(
        this.add
          .text(-CARD_W / 2 + 16, CARD_H / 2 - 30, isNext ? '\u25b6  PLAY' : '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '15px',
            color: '#ffe066',
            fontStyle: 'bold',
          }),
      );
    }

    container.add(pieces);
    container.setSize(CARD_W, CARD_H);
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, CARD_W, CARD_H),
      Phaser.Geom.Rectangle.Contains,
    );

    if (unlocked) {
      container.on('pointerdown', (
        _p: Phaser.Input.Pointer,
        _lx: number,
        _ly: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        audio.sfx('click');
        this.play(levelId);
      });
    }

    this.frames.push(frame);
    return container;
  }

  private buildFooter(): void {
    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 52, {
      label: '\u25c0   Back to Menu',
      width: 300,
      height: 50,
      fontSize: 20,
      onClick: () => this.goBack(),
    });

    this.add
      .text(
        24,
        GAME_HEIGHT - 44,
        'Arrows: move   \u00b7   Enter: play   \u00b7   Clear a level to unlock the next plant',
        { fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#7f9679' },
      )
      .setDepth(DEPTH.ui);
  }

  private wireKeyboard(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    keyboard.on('keydown-LEFT', () => this.moveFocus(-1));
    keyboard.on('keydown-RIGHT', () => this.moveFocus(1));
    keyboard.on('keydown-UP', () => this.moveFocus(-COLS));
    keyboard.on('keydown-DOWN', () => this.moveFocus(COLS));
    keyboard.on('keydown-ENTER', () => this.play(LEVELS[this.focusIndex].id));
    keyboard.on('keydown-SPACE', () => this.play(LEVELS[this.focusIndex].id));
    keyboard.on('keydown-ESC', () => this.goBack());
    keyboard.on('keydown-BACKSPACE', () => this.goBack());
  }

  /* ------------------------------------------------------------------ */
  /*  Behaviour                                                          */
  /* ------------------------------------------------------------------ */

  private moveFocus(delta: number): void {
    this.focusIndex = Phaser.Math.Wrap(this.focusIndex + delta, 0, LEVELS.length);
    this.applyFocus();
  }

  private applyFocus(): void {
    this.frames.forEach((frame, index) => {
      const level = LEVELS[index];
      const focused = index === this.focusIndex;
      const color = progress.isCompleted(level.id)
        ? 0x6fbf5f
        : level.id === progress.unlockedLevel
          ? 0xffe066
          : 0x3f6b39;

      frame.setStrokeStyle(focused ? 4 : 2, color);
    });
  }

  private play(levelId: number): void {

    this.cameras.main.fadeOut(150, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('seeds', { levelId });
    });
  }

  private goBack(): void {
    audio.sfx('click');
    this.cameras.main.fadeOut(150, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('menu');
    });
  }
}
