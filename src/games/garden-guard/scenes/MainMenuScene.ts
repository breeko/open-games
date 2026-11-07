import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { TOTAL_LEVELS, getLevel } from '../levels';
import { progress } from '../state/progress';
import { settings } from '../state/settings';
import { Button } from '../ui/Button';

interface MenuItem {
  label: string;
  scene?: string;
  action?: () => void;
}

/**
 * Title screen: Start Game, Collection (almanac), Settings and How to Play,
 * plus a music toggle and lifetime stats.
 *
 * Keyboard: Up/Down to move, Enter to activate, Left/Right to adjust,
 * `M` toggles the music.
 */
export class MainMenuScene extends Phaser.Scene {
  private buttons: Button[] = [];
  private focusIndex = 0;
  private musicButton!: Button;

  constructor() {
    super('menu');
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      this.input.keyboard?.removeAllListeners();
    });
    this.buttons = [];
    this.focusIndex = 0;

    this.drawBackground();
    this.drawTitle();
    this.buildMusicToggle();
    this.buildMenu();
    this.drawFooter();

    this.wireKeyboard();

    // Browsers only allow audio after a gesture, so unlock on the first one.
    this.input.on('pointerdown', () => this.enableAudio());
    this.input.keyboard?.on('keydown', () => this.enableAudio());

    this.cameras.main.fadeIn(220, 0, 0, 0);
    this.game.events.emit('assets-ready');
  }

  /* ------------------------------------------------------------------ */
  /*  Layout                                                             */
  /* ------------------------------------------------------------------ */

  private drawBackground(): void {
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x14260f)
      .setOrigin(0, 0)
      .setDepth(DEPTH.lawn);

    // Decorative lawn strips along the bottom.
    for (let row = 0; row < 6; row += 1) {
      this.add
        .rectangle(
          GAME_WIDTH / 2,
          GAME_HEIGHT - 130 + row * 30,
          GAME_WIDTH,
          30,
          row % 2 === 0 ? 0x3f8f3a : 0x367f31,
        )
        .setDepth(DEPTH.lawn);
    }

    this.add.image(140, 260, 'peashooter').setDisplaySize(216,256).setDepth(DEPTH.plants);

    const zombie = this.add
      .image(GAME_WIDTH - 140, 260, 'zombie')
      .setDisplaySize(200,364)
      .setDepth(DEPTH.plants);

    this.tweens.add({
      targets: zombie,
      angle: { from: -3, to: 3 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });
  }

  private drawTitle(): void {
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 104, 'GARDEN GUARD', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '60px',
        color: '#ffe066',
        stroke: '#2b2016',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    this.add
      .text(cx, 156, 'A small garden. A growing challenge.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#bfe0b0',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);
  }

  private buildMusicToggle(): void {
    this.musicButton = new Button(this, GAME_WIDTH - 128, 40, {
      label: '',
      width: 216,
      height: 44,
      fontSize: 18,
      onClick: () => this.toggleMusic(),
    });

    this.refreshMusicButton();
  }

  private buildMenu(): void {
    const cx = GAME_WIDTH / 2;

    const items: MenuItem[] = [
      { label: '\u25b6   Adventure', scene: 'levels' },
      { label: '\u2740   Collection', scene: 'collection' },
      { label: '\u2699   Settings', scene: 'settings' },
      { label: '\u2753   How to Play', scene: 'help' },
      { label: '\u2716   Quit', action: () => this.quit() },
    ];

    items.forEach((item, index) => {
      const button = new Button(this, cx, 244 + index * 64, {
        label: item.label,
        width: 340,
        onClick: () => {
          this.enableAudio();

          if (item.scene) {
            this.fadeToScene(item.scene);
          } else {
            item.action?.();
          }
        },
      });

      this.buttons.push(button);
    });

    this.buttons[0].setFocused(true);
  }

  private drawFooter(): void {
    this.add
      .text(
        24,
        GAME_HEIGHT - 92,
        `Levels cleared: ${progress.completedCount} / ${TOTAL_LEVELS}      Plants: 16      Next up: ${getLevel(progress.unlockedLevel).name}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: '#d3e7cb',
          fontStyle: 'bold',
        },
      )
      .setDepth(DEPTH.ui);

    this.add
      .text(
        24,
        GAME_HEIGHT - 62,
        'Up/Down: move   \u00b7   Enter: select   \u00b7   Left/Right: adjust   \u00b7   M: music',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '15px',
          color: '#aec5a4',
        },
      )
      .setDepth(DEPTH.ui);

    this.add
      .text(GAME_WIDTH - 18, GAME_HEIGHT - 24, 'Open Games · 0.2', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#5d7157',
      })
      .setOrigin(1, 1)
      .setDepth(DEPTH.ui);
  }

  /* ------------------------------------------------------------------ */
  /*  Behaviour                                                         */
  /* ------------------------------------------------------------------ */

  private enableAudio(): void {
    audio.unlock();
    if (settings.current.music) audio.startMusic();
  }

  private toggleMusic(): void {
    settings.toggle('music');

    if (settings.current.music) {
      audio.unlock();
      audio.startMusic();
    } else {
      audio.stopMusic();
    }

    this.refreshMusicButton();
  }

  private refreshMusicButton(): void {
    this.musicButton.setLabel(
      settings.current.music ? '\u266b   Music: ON' : '\u266b   Music: OFF',
    );
  }

  private fadeToScene(key: string): void {
    this.cameras.main.fadeOut(160, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(key);
    });
  }

  private wireKeyboard(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    keyboard.on('keydown-UP', () => this.moveFocus(-1));
    keyboard.on('keydown-DOWN', () => this.moveFocus(1));
    keyboard.on('keydown-W', () => this.moveFocus(-1));
    keyboard.on('keydown-S', () => this.moveFocus(1));
    keyboard.on('keydown-ENTER', () => this.activateFocus());
    keyboard.on('keydown-SPACE', () => this.activateFocus());
    keyboard.on('keydown-LEFT', () => this.buttons[this.focusIndex]?.adjust(-1));
    keyboard.on('keydown-RIGHT', () => this.buttons[this.focusIndex]?.adjust(1));
    keyboard.on('keydown-M', () => this.toggleMusic());
  }

  private moveFocus(delta: number): void {
    this.enableAudio();

    this.buttons[this.focusIndex]?.setFocused(false);
    this.focusIndex = Phaser.Math.Wrap(this.focusIndex + delta, 0, this.buttons.length);
    this.buttons[this.focusIndex]?.setFocused(true);
  }

  private activateFocus(): void {
    this.enableAudio();
    this.buttons[this.focusIndex]?.trigger();
  }

  private quit(): void {
    this.enableAudio();
    audio.stopMusic();

    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT / 2,
          'Thanks for playing!  You can close this tab.',
          {
            fontFamily: 'Arial, sans-serif',
            fontSize: '26px',
            color: '#ffe066',
          },
        )
        .setOrigin(0.5)
        .setDepth(DEPTH.banner);

      this.cameras.main.fadeIn(220, 0, 0, 0);
    this.game.events.emit('assets-ready');
    });
  }
}
