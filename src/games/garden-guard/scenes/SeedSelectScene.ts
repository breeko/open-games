import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, PLANT_DEFS, SEED_ORDER, SEED_SLOTS } from '../constants';
import { getLevel, plantsForLevel, defaultSeedsForLevel } from '../levels';
import { progress } from '../state/progress';
import type { PlantType } from '../types';
import { Button } from '../ui/Button';

const PICK_W = 170;
const PICK_H = 116;
const PICK_COLS = 6;
const PICK_GAP = 16;
const PICK_TOP = 148;

const SLOT_W = 108;
const SLOT_H = 82;
const SLOT_GAP = 10;
const SLOT_LABEL_Y = 580;
const SLOT_TOP = 608;

export interface SeedSelectData {
  levelId?: number;
}

/**
 * "Choose your seeds" — the original's pre-level loadout screen.
 *
 * Only plants you have unlocked can be picked, and only `SEED_SLOTS` fit in the
 * bank. The first few are pre-selected so you can always just hit **Let's Rock!**
 */
export class SeedSelectScene extends Phaser.Scene {
  private levelId = 1;
  private chosen: PlantType[] = [];

  private pickCards = new Map<PlantType, { frame: Phaser.GameObjects.Rectangle }>();
  private slotFrames: Phaser.GameObjects.Rectangle[] = [];
  private slotIcons: Phaser.GameObjects.Image[] = [];
  private startButton!: Button;
  private hintText!: Phaser.GameObjects.Text;

  constructor() {
    super('seeds');
  }

  init(data: SeedSelectData): void {
    this.levelId = data.levelId ?? 1;
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      this.input.keyboard?.removeAllListeners();
    });
    // A scene instance is reused every time it is started, and everything from
    // the previous run has been destroyed — so these must be rebuilt from
    // scratch or we would be holding dead GameObjects.
    this.pickCards = new Map();
    this.slotFrames = [];
    this.slotIcons = [];

    const level = getLevel(this.levelId);
    const available = plantsForLevel(this.levelId);
    if (level.mode !== 'standard') { this.scene.start('game',{levelId:this.levelId}); return; }
    const stored = progress.getLoadout(this.levelId);

    // Restore the saved loadout if it is still valid, otherwise pre-fill.
    this.chosen = stored
      ? stored.filter((type) => available.includes(type)).slice(0, SEED_SLOTS)
      : defaultSeedsForLevel(this.levelId);

    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x101c0d)
      .setOrigin(0, 0)
      .setDepth(DEPTH.lawn);

    this.add
      .text(GAME_WIDTH / 2, 58, 'CHOOSE YOUR SEEDS', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '38px',
        color: '#ffe066',
        stroke: '#2b2016',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    this.add
      .text(
        GAME_WIDTH / 2,
        102,
        `${level.name}  \u00b7  ${level.title}   \u2014   ${level.waves.length} waves, ${level.startingSun} starting sun`,
        { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#bfe0b0' },
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    this.buildPicker(available);
    this.buildSlots();
    this.buildButtons();

    this.refresh();

    this.input.keyboard?.on('keydown-ESC', () => this.goBack());
    this.input.keyboard?.on('keydown-BACKSPACE', () => this.goBack());
    this.input.keyboard?.on('keydown-ENTER', () => this.startLevel());

    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  /* ------------------------------------------------------------------ */
  /*  Layout                                                             */
  /* ------------------------------------------------------------------ */

  private buildPicker(available: PlantType[]): void {
    const width = PICK_COLS * PICK_W + (PICK_COLS - 1) * PICK_GAP;
    const startX = (GAME_WIDTH - width) / 2 + PICK_W / 2;

    SEED_ORDER.forEach((type, index) => {
      const unlocked = available.includes(type);
      const col = index % PICK_COLS;
      const row = Math.floor(index / PICK_COLS);

      const x = startX + col * (PICK_W + PICK_GAP);
      const y = PICK_TOP + row * (PICK_H + PICK_GAP) + PICK_H / 2;

      const container = this.add.container(x, y).setDepth(DEPTH.ui);
      const def = PLANT_DEFS[type];

      const frame = this.add
        .rectangle(0, 0, PICK_W, PICK_H, unlocked ? 0x1e3a1a : 0x141a12)
        .setStrokeStyle(2, 0x3f6b39);

      const icon = this.add
        .image(0, -22, def.texture)
        .setScale(0.275)
        .setAlpha(unlocked ? 1 : 0.3);

      const name = this.add
        .text(0, 16, def.label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          color: unlocked ? '#e8f5e0' : '#68765f',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      const cost = this.add
        .text(0, 36, unlocked ? `${def.cost} sun` : 'LOCKED', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '13px',
          color: unlocked ? '#ffe066' : '#8a9683',
        })
        .setOrigin(0.5);

      container.add([frame, icon, name, cost]);
      container.setSize(PICK_W, PICK_H);
      container.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, PICK_W, PICK_H),
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
          this.toggle(type);
        });
      }

      this.pickCards.set(type, { frame });
    });
  }

  private buildSlots(): void {
    const width = SEED_SLOTS * SLOT_W + (SEED_SLOTS - 1) * SLOT_GAP;
    const startX = (GAME_WIDTH - width) / 2 + SLOT_W / 2;

    this.add
      .text(GAME_WIDTH / 2, SLOT_LABEL_Y, 'YOUR SEED BANK', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#bfe0b0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    for (let i = 0; i < SEED_SLOTS; i += 1) {
      const x = startX + i * (SLOT_W + SLOT_GAP);
      const y = SLOT_TOP + SLOT_H / 2;

      const frame = this.add
        .rectangle(x, y, SLOT_W, SLOT_H, 0x16290f)
        .setStrokeStyle(2, 0x3f6b39)
        .setDepth(DEPTH.ui);

      const icon = this.add
        .image(x, y, 'peashooter')
        .setScale(0.275)
        .setDepth(DEPTH.ui)
        .setVisible(false);

      this.slotFrames.push(frame);
      this.slotIcons.push(icon);
    }
  }

  private buildButtons(): void {
    this.startButton = new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 130, {
      label: "\u25b6   Let's Rock!",
      width: 360,
      height: 58,
      fontSize: 24,
      onClick: () => this.startLevel(),
    });

    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 62, {
      label: '\u25c0   Level Map',
      width: 300,
      height: 46,
      fontSize: 18,
      onClick: () => this.goBack(),
    });

    this.hintText = this.add
      .text(24, 24, '', { fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#9fb79a' })
      .setDepth(DEPTH.ui);
  }

  /* ------------------------------------------------------------------ */
  /*  Behaviour                                                          */
  /* ------------------------------------------------------------------ */

  private toggle(type: PlantType): void {
    const index = this.chosen.indexOf(type);

    if (index >= 0) {
      this.chosen.splice(index, 1);
      audio.sfx('click');
    } else if (this.chosen.length >= SEED_SLOTS) {
      // Bank is full — replace the oldest pick so the click always does something.
      this.chosen.shift();
      this.chosen.push(type);
      audio.sfx('error');
    } else {
      this.chosen.push(type);
      audio.sfx('click');
    }

    this.refresh();
  }

  private refresh(): void {
    this.pickCards.forEach(({ frame }, type) => {
      const selected = this.chosen.includes(type);
      frame.setFillStyle(selected ? 0x2f6b2f : 0x1e3a1a);
      frame.setStrokeStyle(selected ? 3 : 2, selected ? 0xffe066 : 0x3f6b39);
    });

    for (let i = 0; i < SEED_SLOTS; i += 1) {
      const type = this.chosen[i];
      const icon = this.slotIcons[i];

      if (type) {
        icon.setTexture(PLANT_DEFS[type].texture).setVisible(true);
        this.slotFrames[i].setStrokeStyle(2, 0x6fbf5f);
      } else {
        icon.setVisible(false);
        this.slotFrames[i].setStrokeStyle(2, 0x3f6b39);
      }
    }

    const ready = this.chosen.length > 0;
    this.startButton.setLabel(
      ready ? `\u25b6   Let's Rock!   (${this.chosen.length}/${SEED_SLOTS})` : '\u25b6   Pick at least one seed',
    );
    this.hintText.setText(
      `Click a plant to add or remove it  \u00b7  up to ${SEED_SLOTS} seeds fit in the bank`,
    );
  }

  private startLevel(): void {
    if (this.chosen.length === 0) {
      audio.sfx('error');
      return;
    }

    // Bank order follows the canonical plant order, not click order.
    const ordered = SEED_ORDER.filter((type) => this.chosen.includes(type));
    progress.setLoadout(this.levelId, ordered);

    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('game', { levelId: this.levelId, seeds: ordered });
    });
  }

  private goBack(): void {
    audio.sfx('click');
    this.cameras.main.fadeOut(150, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('levels');
    });
  }
}
