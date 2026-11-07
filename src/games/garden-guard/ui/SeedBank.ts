import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { DEPTH, PLANT_DEFS } from '../constants';
import type { ResourceManager } from '../managers/ResourceManager';
import type { PlantDefinition, PlantType } from '../types';

const CARD_WIDTH = 80;
const CARD_HEIGHT = 112;
const CARD_GAP_X = 8;
const CARD_GAP_Y = 6;
const BANK_X = 144;
const BANK_Y = 18;
/** Six seeds fit on one row, matching the original's Day levels. */
const CARDS_PER_ROW = 8;

/**
 * The seed bank: two rows of seed cards at the top-left.
 *
 * Three ways to plant:
 *  - **Drag & drop** — press a card, drag onto the lawn, release.
 *  - **Click** — click a card to arm it, then click a lawn cell.
 *  - **Hotkey** — press `1`..`8` to arm a seed without moving the mouse.
 *
 * Emits:
 *  - `select`    (PlantType | null)
 *  - `dragstart` (PlantType, Phaser.Input.Pointer)
 *  - `dragend`   (PlantType, Phaser.Input.Pointer)
 *
 * There is deliberately no `drag` event: the consumer positions its drag ghost
 * from the update loop using the live pointer, which is smoother (and one input
 * event fresher) than reacting to every pointermove.
 */
export class SeedBank extends Phaser.Events.EventEmitter {
  private readonly cards = new Map<PlantType, SeedCard>();
  private selected: PlantType | null = null;
  private readonly stock = new Map<PlantType, number>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly resources: ResourceManager,
    /** The seeds the player brought to this level, in bank order. */
    seeds: readonly PlantType[],
    private readonly supplied = false,
    private readonly expanded = false,
  ) {
    super();

    seeds.forEach((type, index) => {
      const def = PLANT_DEFS[type];
      const card = new SeedCard(
        scene,
        (expanded?176:BANK_X) + (index % CARDS_PER_ROW) * (CARD_WIDTH*(expanded?1.3:1) + CARD_GAP_X),
        (expanded?22:BANK_Y) + Math.floor(index / CARDS_PER_ROW) * (CARD_HEIGHT + CARD_GAP_Y),
        CARD_WIDTH,
        CARD_HEIGHT,
        def,
        index + 1,
      );

      card.setScale(expanded?1.3:1);
      card.on('click', () => this.onCardClicked(type));

      // Relay the card's drag lifecycle upward. `GameScene` owns the ghost
      // sprite and the drop rules, so it needs the raw pointer positions.
      // NOTE: the card re-emits these under `card-*` names — re-emitting
      // Phaser's own `dragstart`/`drag`/`dragend` on the same object would
      // recurse forever.
      card.on('card-dragstart', (pointer: Phaser.Input.Pointer) => {
        if (!this.isPlantable(type)) {
          this.shakeCard(type);
          return;
        }
        this.emit('dragstart', type, pointer);
      });
      card.on('card-dragend', (pointer: Phaser.Input.Pointer) => this.emit('dragend', type, pointer));

      this.cards.set(type, card);
      if (this.supplied) { this.stock.set(type,0); card.setQuantity(0); }
    });

    this.refreshAffordability();
    this.resources.on('changed', () => this.refreshAffordability());
  }

  /** True when the seed is off cooldown and the player can pay for it. */
  isPlantable(type: PlantType): boolean {
    const card = this.cards.get(type);
    if (!card) return false;
    return this.supplied ? (this.stock.get(type) ?? 0) > 0 : card.isReady() && this.resources.canAfford(PLANT_DEFS[type].cost);
  }

  /** Order of the seeds in the bank, so hotkeys can be mapped to them. */
  get seedOrder(): PlantType[] {
    return [...this.cards.keys()];
  }

  /**
   * Arms `type` (or clears the selection with `null`). Never toggles, so it is
   * safe to call to *restore* a selection after an aborted drag.
   */
  select(type: PlantType | null): void {
    this.selected = type;
    this.cards.forEach((card, cardType) => card.setSelected(cardType === type));
    this.emit('select', type);
  }

  /** Nudges a card to show the seed is not usable right now. */
  shakeCard(type: PlantType): void {
    const card = this.cards.get(type);
    if (!card) return;

    audio.sfx('error');
    card.shake();
  }

  /** Called every frame by `GameScene` to animate cooldown overlays. */
  update(time: number): void {
    this.cards.forEach((card) => card.update(time));
  }

  /** Begins the recharge timer for a seed after it has been planted. */
  grant(type: PlantType): void {
    if (!this.supplied) return;
    const quantity = Math.min(5,(this.stock.get(type) ?? 0) + 1);
    this.stock.set(type,quantity); this.cards.get(type)?.setQuantity(quantity); this.refreshAffordability();
  }
  startCooldown(type: PlantType): void {
    if (!this.supplied) { this.cards.get(type)?.startCooldown(); return; }
    const quantity = Math.max(0,(this.stock.get(type) ?? 0) - 1);
    this.stock.set(type,quantity); this.cards.get(type)?.setQuantity(quantity); this.refreshAffordability();
  }

  clearSelection(): void {
    this.select(null);
  }

  private onCardClicked(type: PlantType): void {
    if (!this.isPlantable(type)) {
      this.shakeCard(type);
      return;
    }

    // Clicking the armed card again puts the seed away.
    this.select(this.selected === type ? null : type);
  }

  private refreshAffordability(): void {
    this.cards.forEach((card, type) => {
      card.setAffordable(this.supplied ? (this.stock.get(type) ?? 0) > 0 : this.resources.canAfford(PLANT_DEFS[type].cost));
    });
  }
}

/* -------------------------------------------------------------------------- */

const CARD_FILL = 0xe2d8ae;
const CARD_STROKE = 0x5a4326;
const CARD_STROKE_SELECTED = 0xffe066;

class SeedCard extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly overlay: Phaser.GameObjects.Rectangle;
  private readonly unavailable:Phaser.GameObjects.Rectangle;

  private costLabel!: Phaser.GameObjects.Text;
  private cooldownEndsAt = 0;
  private cooldownTotal = 1;
  private affordable = true;
  private dragging = false;
  /** The card's resting x, so `shake()` can always return it to its slot. */
  private readonly restX: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly cardWidth: number,
    private readonly cardHeight: number,
    private readonly def: PlantDefinition,
    hotkey: number,
  ) {
    super(scene, x, y);

    this.restX = x;

    scene.add.existing(this);
    this.setDepth(DEPTH.ui+2);

    this.background = scene.add.rectangle(0, 0, cardWidth, cardHeight, CARD_FILL).setOrigin(0, 0);
    this.background.setStrokeStyle(2, CARD_STROKE);
    const packet = scene.add.image(0, 0, 'seed-packet').setOrigin(0).setDisplaySize(cardWidth, cardHeight);

    // Icon on top, sun cost underneath — like the real seed packets.
    const icon = scene.add.image(cardWidth / 2, 53, def.texture).setScale(Math.min(66 / scene.textures.get(def.texture).getSourceImage().width, 76 / scene.textures.get(def.texture).getSourceImage().height));

    const cost = scene.add
      .text(cardWidth / 2 - 5, 98, `${def.cost}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '21px',
        color: '#2b2016',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5);

    this.costLabel = cost;

    const hotkeyLabel = scene.add
      .text(4, 3, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: '#8a7a5a',
      })
      .setOrigin(0, 0);

    this.overlay = scene.add
      .rectangle(0, 0, cardWidth, cardHeight, 0x000000, 0.55)
      .setOrigin(0, 0)
      .setVisible(false);

    this.unavailable=scene.add.rectangle(0,0,cardWidth,cardHeight,0x151b10,0.38).setOrigin(0).setVisible(false);
    this.add([packet, this.background, icon, cost, hotkeyLabel, this.unavailable, this.overlay]);
    this.background.setFillStyle(CARD_FILL, 0);

    this.setSize(cardWidth, cardHeight);
    this.setInteractive(
      new Phaser.Geom.Rectangle(cardWidth / 2, cardHeight / 2, cardWidth, cardHeight),
      Phaser.Geom.Rectangle.Contains,
    );

    this.on(
      'pointerdown',
      (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        // Stop the scene-level pointerdown handler from also running, which
        // would immediately cancel the selection we are about to make.
        event.stopPropagation();
        this.emit('click');
      },
    );
    this.on('pointerover', () => this.background.setFillStyle(0xffe066, 0.15));
    this.on('pointerout', () => this.background.setFillStyle(CARD_FILL, 0));

    // Draggable so the seed can be dropped straight onto the lawn.
    // `GameScene` sets `input.dragDistanceThreshold` so a plain click is still
    // a click and only a real movement starts a drag.
    scene.input.setDraggable(this);
    this.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.refreshAlpha();
      this.emit('card-dragstart', pointer);
    });
    this.on('dragend', (pointer: Phaser.Input.Pointer) => {
      this.dragging = false;
      this.refreshAlpha();
      this.emit('card-dragend', pointer);
    });
  }

  /** Fades the card while it is being dragged, dims it when unaffordable. */
  private refreshAlpha(): void {
    this.setAlpha(this.dragging ? 0.6 : 1);
    this.unavailable?.setVisible(!this.affordable);
  }

  setQuantity(quantity: number): void { this.costLabel.setText('×' + quantity); }

  isReady(): boolean {
    return this.scene.time.now >= this.cooldownEndsAt;
  }

  startCooldown(): void {
    this.cooldownTotal = Math.max(1, this.def.cooldownMs);
    this.cooldownEndsAt = this.scene.time.now + this.cooldownTotal;
  }

  setSelected(selected: boolean): void {
    this.background.setStrokeStyle(selected ? 3 : 2, selected ? CARD_STROKE_SELECTED : CARD_STROKE);
  }

  setAffordable(affordable: boolean): void {
    this.affordable = affordable;
    this.refreshAlpha();
  }

  /** Shrinks the dark overlay from full height to zero as the seed recharges. */
  update(time: number): void {
    const remaining = this.cooldownEndsAt - time;

    if (remaining > 0) {
      this.overlay.setVisible(true);
      this.overlay.setScale(1, remaining / this.cooldownTotal);
    } else if (this.overlay.visible) {
      this.overlay.setVisible(false);
    }
  }

  shake(): void {
    // Always start from (and return to) the card's real slot. Tweening from
    // `this.x` would let repeated shakes walk the card across the screen.
    this.scene.tweens.killTweensOf(this);
    this.setX(this.restX);

    this.scene.tweens.add({
      targets: this,
      x: { from: this.restX - 4, to: this.restX + 4 },
      duration: 50,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.setX(this.restX),
    });
  }
}
