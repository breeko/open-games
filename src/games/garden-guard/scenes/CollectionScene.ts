import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, PLANT_DEFS, SEED_ORDER } from '../constants';
import { rewardForLevel } from '../levels';
import { progress } from '../state/progress';
import type { PlantType } from '../types';
import { Button } from '../ui/Button';

const CARD_W = 140;
const CARD_H = 120;
const CARD_GAP = 12;
const GRID_X = 60;
const GRID_Y = 190;
const CARDS_PER_ROW = 4;

const PANEL = { x: 700, y: 140, width: 520, height: 450 };

/**
 * The almanac: every plant with its stats and a description.
 *
 * Click a card or use the arrow keys to review a plant; `ESC` goes back.
 */
export class CollectionScene extends Phaser.Scene {
  private cards: Phaser.GameObjects.Container[] = [];
  private frames: Phaser.GameObjects.Rectangle[] = [];
  private detailIcon!: Phaser.GameObjects.Image;
  private detailTitle!: Phaser.GameObjects.Text;
  private detailStats!: Phaser.GameObjects.Text;
  private detailText!: Phaser.GameObjects.Text;
  private index = 0;

  constructor() {
    super('collection');
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      this.input.keyboard?.removeAllListeners();
    });
    this.cards = [];
    this.frames = [];
    this.index = 0;

    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x101c0d)
      .setOrigin(0, 0)
      .setDepth(DEPTH.lawn);

    this.add
      .text(GAME_WIDTH / 2, 62, 'PLANT COLLECTION', {
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
        106,
        'Every plant, its cost and what it does. Arrow keys or click to browse.',
        { fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#bfe0b0' },
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    this.buildCards();
    this.buildDetailPanel();
    this.buildBackButton();
    this.wireKeyboard();

    this.select(0);

    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  /* ------------------------------------------------------------------ */
  /*  Layout                                                             */
  /* ------------------------------------------------------------------ */

  private buildCards(): void {
    SEED_ORDER.forEach((type, i) => {
      const def = PLANT_DEFS[type];
      const col = i % CARDS_PER_ROW;
      const row = Math.floor(i / CARDS_PER_ROW);

      const x = GRID_X + col * (CARD_W + CARD_GAP) + CARD_W / 2;
      const y = GRID_Y + row * (CARD_H + CARD_GAP) + CARD_H / 2;

      const container = this.add.container(x, y).setDepth(DEPTH.ui);
      const unlocked = true;

      const frame = this.add
        .rectangle(0, 0, CARD_W, CARD_H, unlocked ? 0x1e3a1a : 0x141a12)
        .setStrokeStyle(2, unlocked ? 0x3f6b39 : 0x2a3a28);
      const icon = this.add.image(0, -18, def.texture).setScale(0.325).setAlpha(unlocked ? 1 : 0.3);
      const name = this.add
        .text(0, 26, unlocked ? def.label : '???', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '15px',
          color: unlocked ? '#e8f5e0' : '#68765f',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const cost = this.add
        .text(0, 46, unlocked ? `${def.cost} sun` : 'locked', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          color: unlocked ? '#ffe066' : '#8a9683',
        })
        .setOrigin(0.5);

      container.add([frame, icon, name, cost]);
      container.setSize(CARD_W, CARD_H);
      container.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, CARD_W, CARD_H),
        Phaser.Geom.Rectangle.Contains,
      );

      container.on('pointerover', () => frame.setFillStyle(0x275023));
      container.on('pointerout', () => {
        if (this.index !== i) frame.setFillStyle(0x1e3a1a);
      });
      container.on(
        'pointerdown',
        (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          audio.sfx('click');
          this.select(i);
        },
      );

      this.cards.push(container);
      this.frames.push(frame);
    });
  }

  private buildDetailPanel(): void {
    this.add
      .rectangle(PANEL.x, PANEL.y, PANEL.width, PANEL.height, 0x16290f)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x3f6b39)
      .setDepth(DEPTH.ui);

    this.detailIcon = this.add
      .image(PANEL.x + 70, PANEL.y + 72, 'sunflower')
      .setScale(0.5)
      .setDepth(DEPTH.ui);

    this.detailTitle = this.add
      .text(PANEL.x + 140, PANEL.y + 40, '', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '28px',
        color: '#ffe066',
      })
      .setDepth(DEPTH.ui);

    this.detailStats = this.add
      .text(PANEL.x + 140, PANEL.y + 82, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#bfe0b0',
        lineSpacing: 6,
      })
      .setDepth(DEPTH.ui);

    this.detailText = this.add
      .text(PANEL.x + 32, PANEL.y + 270, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#e8f5e0',
        wordWrap: { width: PANEL.width - 64 },
        lineSpacing: 8,
      })
      .setDepth(DEPTH.ui);
  }

  private buildBackButton(): void {
    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 56, {
      label: '\u25c0   Back to Menu',
      width: 300,
      height: 50,
      fontSize: 20,
      onClick: () => this.goBack(),
    });
  }

  private wireKeyboard(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    keyboard.on('keydown-ESC', () => this.goBack());
    keyboard.on('keydown-BACKSPACE', () => this.goBack());

    keyboard.on('keydown-LEFT', () => this.select(this.index - 1));
    keyboard.on('keydown-RIGHT', () => this.select(this.index + 1));
    keyboard.on('keydown-UP', () => this.select(this.index - CARDS_PER_ROW));
    keyboard.on('keydown-DOWN', () => this.select(this.index + CARDS_PER_ROW));
  }

  /* ------------------------------------------------------------------ */
  /*  Behaviour                                                          */
  /* ------------------------------------------------------------------ */

  private select(index: number): void {
    this.index = Phaser.Math.Wrap(index, 0, SEED_ORDER.length);

    const type: PlantType = SEED_ORDER[this.index];
    const def = PLANT_DEFS[type];
    const unlocked = true;

    this.frames.forEach((frame, i) => {
      const isLocked = false;
      const selected = i === this.index;

      frame.setFillStyle(selected ? 0x2f6b2f : 0x1e3a1a);
      frame.setStrokeStyle(
        selected ? 3 : 2,
        selected ? 0xffe066 : isLocked ? 0x2a3a28 : 0x3f6b39,
      );
    });

    this.detailIcon.setTexture(def.texture).setAlpha(unlocked ? 1 : 0.35);
    this.detailTitle.setText(unlocked ? def.label.toUpperCase() : '■  LOCKED');

    if (!unlocked) {
      const unlockLevel = SEED_ORDER.indexOf(type);
      this.detailStats.setText(
        [
          'Cost:       ??',
          'Recharge:   ??',
          'Hit points: ??',
          '',
          `Unlocked by clearing level 1-${unlockLevel}`,
        ].join('\n'),
      );
      this.detailText.setText('You have not found this plant yet. Keep pushing through the levels!');
      return;
    }

    const stats = [
      `Cost:       ${def.cost} sun`,
      `Recharge:   ${(def.cooldownMs / 1000).toFixed(0)}s`,
      `Hit points: ${def.maxHp}`,
    ];

    if (def.damage) stats.push(`Damage:     ${def.damage} per pea`);
    if (def.lanes && def.lanes.length > 1) stats.push('Lanes:      own row + above/below');
    else if (def.damage) stats.push('Lanes:      own row');
    if (def.peasPerVolley && def.peasPerVolley > 1) stats.push(`Volley:     ${def.peasPerVolley} peas`);
    if (def.slow) {
      stats.push(
        `Slow:       ${Math.round((1 - def.slow.factor) * 100)}% for ${def.slow.durationMs / 1000}s`,
      );
    }
    if (def.blast) stats.push(`Blast:      ${def.blast.damage} damage`);
    if (type === 'sunflower') stats.push('Produces:   25 sun every 24s');

    this.detailStats.setText(stats.join('\n'));
    this.detailText.setText(def.description);
  }

  private goBack(): void {
    audio.sfx('click');
    this.cameras.main.fadeOut(150, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('menu');
    });
  }
}
