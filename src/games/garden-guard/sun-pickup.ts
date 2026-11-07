/** A pickup can be claimed by tapping or automation, but credited only once. */
export class SunPickup {
  private phase: 'falling' | 'resting' | 'flying' | 'finished' = 'falling';
  private restingMs = 0;

  land(): void {
    if (this.phase === 'falling') this.phase = 'resting';
  }

  advance(delta: number, automatic: boolean): boolean {
    if (this.phase !== 'resting') return false;
    this.restingMs += delta;
    return automatic && this.restingMs >= 100 && this.collect();
  }

  collect(): boolean {
    if (this.phase !== 'falling' && this.phase !== 'resting') return false;
    this.phase = 'flying';
    return true;
  }

  finish(): boolean {
    if (this.phase !== 'flying') return false;
    this.phase = 'finished';
    return true;
  }

  expire(): boolean {
    if (this.phase !== 'falling' && this.phase !== 'resting') return false;
    this.phase = 'finished';
    return true;
  }
}
