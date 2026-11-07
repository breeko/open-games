import Phaser from 'phaser';

/**
 * Tracks the player's sun balance and emits `changed` whenever it moves, so
 * the HUD and seed bank can stay in sync without polling.
 *
 * The starting amount comes from the level definition.
 */
export class ResourceManager extends Phaser.Events.EventEmitter {
  private current: number;

  constructor(initial: number) {
    super();
    this.current = initial;
  }

  get sun(): number {
    return this.current;
  }

  add(amount: number): void {
    if (amount === 0) return;
    this.current += amount;
    this.emit('changed', this.current);
  }

  canAfford(amount: number): boolean {
    return this.current >= amount;
  }

  /** Spends sun if affordable. Returns `true` on success. */
  spend(amount: number): boolean {
    if (!this.canAfford(amount)) return false;
    this.current -= amount;
    this.emit('changed', this.current);
    return true;
  }
}
