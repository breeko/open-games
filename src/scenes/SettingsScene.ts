import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { progress } from '../state/progress';
import {
  VOLUME_STEPS,
  formatVolume,
  settings,
  stepToVolume,
  volumeToStep,
} from '../state/settings';
import { Button } from '../ui/Button';

const CONFIRM_WINDOW_MS = 3000;

/**
 * Settings screen.
 *
 * Music / SFX toggles, stepper volumes, the lawn grid guide, and a
 * two-step "press again to confirm" progress wipe.
 *
 * Keyboard: Up/Down to move, Enter to activate, Left/Right to adjust a value.
 */
export class SettingsScene extends Phaser.Scene {
  private buttons: Button[] = [];
  private focusIndex = 0;

  private musicButton!: Button;
  private musicVolumeButton!: Button;
  private sfxButton!: Button;
  private sfxVolumeButton!: Button;
  private gridButton!: Button;
  private autoSunButton!:Button;
  private resetButton!: Button;

  private resetArmed = false;
  private resetTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('settings');
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      settings.off('changed',this.refresh,this);
      this.input.removeAllListeners();
      this.input.keyboard?.removeAllListeners();
    });
    this.buttons = [];
    this.focusIndex = 0;
    this.resetArmed = false;

    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x101c0d)
      .setOrigin(0, 0)
      .setDepth(DEPTH.lawn);

    this.add
      .text(GAME_WIDTH / 2, 70, 'SETTINGS', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '44px',
        color: '#ffe066',
        stroke: '#2b2016',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    this.buildControls();
    settings.on('changed',this.refresh,this);
    this.refresh();
    this.wireKeyboard();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.resetTimer?.remove();
    });

    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  /* ------------------------------------------------------------------ */
  /*  Layout                                                             */
  /* ------------------------------------------------------------------ */

  private buildControls(): void {
    const cx = GAME_WIDTH / 2;

    this.musicButton = new Button(this, cx, 176, {
      label: '',
      onClick: () => {
        settings.toggle('music');
        if (settings.current.music) {
          audio.unlock();
          audio.startMusic();
        } else {
          audio.stopMusic();
        }
        this.refresh();
      },
    });

    this.musicVolumeButton = new Button(this, cx, 240, {
      label: '',
      onAdjust: (delta) => this.stepVolume('musicVolume', delta),
      onClick: () => this.stepVolume('musicVolume', 1),
    });

    this.sfxButton = new Button(this, cx, 304, {
      label: '',
      onClick: () => {
        settings.toggle('sfx');
        this.refresh();
        audio.sfx('unlock');
      },
    });

    this.sfxVolumeButton = new Button(this, cx, 368, {
      label: '',
      onAdjust: (delta) => this.stepVolume('sfxVolume', delta),
      onClick: () => {
        this.stepVolume('sfxVolume', 1);
        audio.sfx('unlock');
      },
    });

    this.gridButton = new Button(this, cx, 432, {
      label: '',
      onClick: () => {
        settings.toggle('showGrid');
        this.refresh();
      },
    });

    this.autoSunButton=new Button(this,cx,496,{
      label:'',width:360,
      onClick:()=>{settings.toggle('autoCollectSuns');this.refresh();},
    });
    this.add.text(cx,548,'Suns still fall, then fly into your sun bank.',{
      fontFamily:'Arial, sans-serif',fontSize:'18px',color:'#bfe0b0',
    }).setOrigin(0.5).setDepth(DEPTH.ui);

    this.resetButton = new Button(this, cx, 616, {
      label: '',
      fill: 0x6b2f2f,
      stroke: 0xff8a8a,
      onClick: () => this.resetProgress(),
    });

    const back = new Button(this, cx, 700, {
      label: '\u25c0   Back to Menu',
      width: 300,
      height: 50,
      fontSize: 20,
      onClick: () => this.goBack(),
    });

    this.buttons = [
      this.musicButton,
      this.musicVolumeButton,
      this.sfxButton,
      this.sfxVolumeButton,
      this.gridButton,
      this.autoSunButton,
      this.resetButton,
      back,
    ];

    this.buttons[0].setFocused(true);
  }

  private wireKeyboard(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    keyboard.on('keydown-ESC', () => this.goBack());
    keyboard.on('keydown-UP', () => this.moveFocus(-1));
    keyboard.on('keydown-DOWN', () => this.moveFocus(1));
    keyboard.on('keydown-W', () => this.moveFocus(-1));
    keyboard.on('keydown-S', () => this.moveFocus(1));
    keyboard.on('keydown-ENTER', () => this.activateFocus());
    keyboard.on('keydown-SPACE', () => this.activateFocus());
    keyboard.on('keydown-LEFT', () => this.buttons[this.focusIndex]?.adjust(-1));
    keyboard.on('keydown-RIGHT', () => this.buttons[this.focusIndex]?.adjust(1));
  }

  /* ------------------------------------------------------------------ */
  /*  Behaviour                                                          */
  /* ------------------------------------------------------------------ */

  private refresh(): void {
    const current = settings.current;

    this.musicButton.setLabel(`Music:  ${current.music ? 'ON' : 'OFF'}`);
    this.musicVolumeButton.setLabel(`Music Volume:  ${formatVolume(current.musicVolume)}`);
    this.sfxButton.setLabel(`Sound Effects:  ${current.sfx ? 'ON' : 'OFF'}`);
    this.sfxVolumeButton.setLabel(`SFX Volume:  ${formatVolume(current.sfxVolume)}`);
    this.gridButton.setLabel(`Lawn Grid Lines:  ${current.showGrid ? 'ON' : 'OFF'}`);

    this.autoSunButton.setLabel(`Auto-collect Suns:  ${current.autoCollectSuns?'ON':'OFF'}`);

    if (!this.resetArmed) this.resetButton.setLabel('Reset Progress');
  }

  private stepVolume(key: 'musicVolume' | 'sfxVolume', delta: number): void {
    const step = volumeToStep(settings.current[key]);
    const next = Phaser.Math.Wrap(step + delta, 0, VOLUME_STEPS + 1);

    settings.set(key, stepToVolume(next));
    this.refresh();
  }

  private resetProgress(): void {
    if (!this.resetArmed) {
      this.resetArmed = true;
      this.resetButton.setLabel('Press again to confirm');
      audio.sfx('error');

      this.resetTimer?.remove();
      this.resetTimer = this.time.delayedCall(CONFIRM_WINDOW_MS, () => {
        this.resetArmed = false;
        this.refresh();
      });
      return;
    }

    this.resetArmed = false;
    this.resetTimer?.remove();
    progress.reset();
    settings.reset();
    audio.sfx('unlock');
    this.refresh();
  }

  private moveFocus(delta: number): void {
    this.buttons[this.focusIndex]?.setFocused(false);
    this.focusIndex = Phaser.Math.Wrap(this.focusIndex + delta, 0, this.buttons.length);
    this.buttons[this.focusIndex]?.setFocused(true);
  }

  private activateFocus(): void {
    this.buttons[this.focusIndex]?.trigger();
  }

  private goBack(): void {
    audio.sfx('click');
    this.cameras.main.fadeOut(150, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('menu');
    });
  }
}
