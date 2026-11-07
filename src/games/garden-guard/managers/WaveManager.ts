import Phaser from 'phaser';
import { DIFFICULTIES, getDifficulty } from '../difficulty';
import { BALANCE, ZOMBIE_DEFS } from '../constants';
import { Zombie } from '../entities/Zombie';
import type { LevelDefinition } from '../levels';
import type { ZombieType } from '../types';
import type { GridManager } from './GridManager';
import { randomSource } from '../reference/rules';
import { sourceToWorldX } from '../reference/motion';
import { WaveDirector } from '../wave-director';
export interface WaveHooks {
  onWaveStart: (wave: number, total: number, isFlag: boolean) => void;
  onComplete: () => void;
  onWarning: () => void;
}
export class WaveManager {
  private director: WaveDirector;
  private laneHistory: number[] = [];
  private random=randomSource(12345);
  constructor(private readonly scene: Phaser.Scene, private readonly zombies: Phaser.Physics.Arcade.Group,
    private readonly grid: GridManager, private readonly level: LevelDefinition, hooks: WaveHooks) {
    this.director = new WaveDirector(level.waves, {
      spawn: (type,wave) => this.spawnZombie(type,wave),
      health: wave => this.zombies.getChildren().reduce((sum,child) => child instanceof Zombie && child.active && child.waveIndex === wave ? sum + child.remainingHealth : sum,0),
      liveCount: () => this.zombies.countActive(true),
      start: hooks.onWaveStart, warning:hooks.onWarning, complete: hooks.onComplete,
    },this.random,level.mode==='bowling');
  }
  get diagnostics() { return { ...this.director.snapshot,events:this.director.events,plan:this.level.waves }; }
  get currentWave(): number { return this.director.currentWave; }
  get totalWaves(): number { return this.level.waves.length; }
  get progress(): number { return this.director.progress; }
  start(): void { /* New director is constructed for each run. */ }
  stop(): void { this.director.stop(); }
  update(delta: number): void { this.director.update(delta); }
  private spawnZombie(type: ZombieType, wave: number): number {
    const def = ZOMBIE_DEFS[type]; const difficulty = DIFFICULTIES[getDifficulty()];
    // Prefer lanes not used in the last two spawns, while keeping randomness.
    const candidates = this.level.activeRows.filter(row => !this.laneHistory.includes(row));
    const row = (candidates.length ? candidates : [...this.level.activeRows])[Math.floor(this.random()*(candidates.length || this.level.activeRows.length))];
    this.laneHistory.push(row); if (this.laneHistory.length > 2) this.laneHistory.shift();
    const parameter=type==='polevaulter'?0.66+this.random()*0.02:type==='flag'?0.45:0.23+this.random()*0.14;
    const sourceX=type==='flag'?800:type==='polevaulter'?870+Math.floor(this.random()*10):780+Math.floor(this.random()*40)+(this.level.waves[wave].flag?40:0);
    const zombie = new Zombie(this.scene,sourceToWorldX(sourceX+57),row,this.grid, {
      parameter:parameter*difficulty.speed, random:this.random,
      hp: def.hp * difficulty.health, armorHp: def.armorHp * difficulty.health,
      speed: def.speed * difficulty.speed, dps: BALANCE.zombieEatDps, texture: def.texture, type, wave,
    });
    this.zombies.add(zombie); zombie.walk();
    return zombie.remainingHealth;
  }
}
