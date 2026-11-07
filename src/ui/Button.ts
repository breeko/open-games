import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { DEPTH } from '../constants';

export interface ButtonConfig {
  label: string;
  onClick: () => void;
  /** Called by ArrowLeft / ArrowRight when the button is focused. */
  onAdjust?: (delta: number) => void;
  width?: number;
  height?: number;
  fontSize?: number;
  fill?: number;
  stroke?: number;
}

const FILL = 0x2f6b2f;
const FILL_HOVER = 0x3f8a3c;
const STROKE = 0x8fe06a;

/**
 * Menu button with hover / press / keyboard-focus states.
 *
 * Stops propagation so a button click never leaks into the scene underneath,
 * and plays a click sound so the menu feels alive.
 */
export class Button extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly boxWidth: number;
  private readonly boxHeight: number;
  private readonly fill: number;
  private readonly stroke: number;
  private readonly adjustHandler?: (delta: number) => void;
  private readonly onClickHandler: () => void;

  private hovered = false;
  private focused = false;

  constructor(scene: Phaser.Scene, x: number, y: number, config: ButtonConfig) {
    super(scene, x, y);

    this.boxWidth = config.width ?? 300;
    this.boxHeight = config.height ?? 54;
    this.fill = config.fill ?? FILL;
    this.stroke = config.stroke ?? STROKE;
    this.adjustHandler = config.onAdjust;
    this.onClickHandler = config.onClick;

    this.background = scene.add
      .rectangle(0, 0, this.boxWidth, this.boxHeight, this.fill)
      .setStrokeStyle(3, this.stroke, 0.8);

    this.labelText = scene.add
      .text(0, 0, config.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${config.fontSize ?? 22}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add([this.background, this.labelText]);

    this.setSize(this.boxWidth, this.boxHeight);
    this.setDepth(DEPTH.ui);
    scene.add.existing(this);

    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, this.boxWidth, this.boxHeight),
      Phaser.Geom.Rectangle.Contains,
    );

    this.on('pointerover', () => {
      this.hovered = true;
      this.refresh();
    });
    this.on('pointerout', () => {
      this.hovered = false;
      this.refresh();
    });
    this.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        // Keep the click from reaching the scene-level handler underneath.
        event.stopPropagation();
        this.trigger();
      },
    );
  }

  /** Runs the button's action with feedback. Shared by mouse and keyboard. */
  trigger(): void {
    audio.unlock();
    audio.sfx('click');

    this.setScale(0.96);
    this.scene.time.delayedCall(70, () => {
      if (this.active) this.setScale(1);
    });

    this.onClickHandler();
  }

  setLabel(label: string): this {
    this.labelText.setText(label);
    return this;
  }

  /** Keyboard focus ring, driven by the owning scene. */
  setFocused(focused: boolean): this {
    this.focused = focused;
    this.refresh();
    return this;
  }

  /** True when ArrowLeft/ArrowRight can change this button's value. */
  get canAdjust(): boolean {
    return this.adjustHandler !== undefined;
  }

  /** Invoked by ArrowLeft/ArrowRight when focused. */
  adjust(delta: number): void {
    this.adjustHandler?.(delta);
  }

  private refresh(): void {
    const lit = this.hovered || this.focused;
    this.background.setFillStyle(lit ? FILL_HOVER : this.fill);
    this.background.setStrokeStyle(this.focused ? 4 : 3, this.stroke, lit ? 1 : 0.8);
    this.labelText.setScale(lit ? 1.04 : 1);
  }
}
