import Phaser from 'phaser';
import {ART_SCALE} from '../art';
import { DEPTH } from '../constants';
import type { GameContext, PlantDefinition } from '../types';

/**
 * Base class for everything that can be planted on the lawn.
 *
 * Plants are plain `Sprite`s (no physics body) — zombies find their target by
 * asking the `GridManager` which cell they are standing in, which is cheaper
 * and far more predictable than overlap callbacks for a tile game.
 */
export abstract class Plant extends Phaser.GameObjects.Sprite {
  readonly col: number;
  readonly row: number;

  protected readonly ctx: GameContext;
  protected readonly def: PlantDefinition;
  protected hp: number;

  private shadow?:Phaser.GameObjects.Image;
  private dying = false;
  private hitFlash = 0;

  constructor(ctx: GameContext, def: PlantDefinition, col: number, row: number) {
    const { x, y } = ctx.grid.cellToWorld(col, row);

    super(ctx.scene, x, y + 30, def.texture);

    this.ctx = ctx;
    this.def = def;
    this.col = col;
    this.row = row;
    this.hp = def.maxHp;

    ctx.scene.add.existing(this);
    this.setDepth(DEPTH.plants);
    this.setOrigin(0.5, 0.72);
    // Keep feet on the same ground line even for small mushrooms and mines.
    this.y=y+66-this.height*ART_SCALE*(1-this.originY);
    const small=def.type==='puffshroom'||def.type==='sunshroom'||def.type==='potatomine';
    this.shadow=ctx.scene.add.image(x,y+62,'plant-shadow').setDisplaySize(small?65:104,small?20:28).setAlpha(0.35).setDepth(DEPTH.plants-1);

    // Small "pop" when planted.
    this.setScale(ART_SCALE*0.7);
    ctx.scene.tweens.add({
      targets: this,
      scaleX: ART_SCALE,
      scaleY: ART_SCALE,
      duration: 180,
      ease: 'Back.easeOut',
    });
  }

  /** Called every frame by `GameScene` while the plant is alive. */
  tick(delta: number): void {
    if (this.dying || !this.active) return;
    if (this.hitFlash > 0) { this.hitFlash -= delta; if (this.hitFlash <= 0) this.setAlpha(1); }
    this.onTick(delta);
  }

  /** Subclass behaviour. Called once per frame. */
  protected abstract onTick(delta: number): void;

  takeDamage(amount: number): void {
    if (this.dying || !this.active) return;

    this.hp -= amount;

    this.hitFlash = 80;
    this.setAlpha(0.7);

    if (this.hp <= 0) this.kill();
  }

  remove(): void { this.kill(); }

  get plantType(){return this.def.type;}

  get isDying(): boolean {
    return this.dying;
  }

  private kill(): void {
    if (this.dying) return;
    this.dying = true;

    this.ctx.grid.removePlant(this.col, this.row, this);

    this.ctx.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: ART_SCALE*0.6,
      scaleY: ART_SCALE*0.6,
      duration: 180,
      onComplete: () => this.destroy(),
    });
  }

  override destroy(fromScene?: boolean): void {
    this.shadow?.destroy();this.shadow=undefined;
    this.ctx.grid.removePlant(this.col, this.row, this);
    super.destroy(fromScene);
  }
}
