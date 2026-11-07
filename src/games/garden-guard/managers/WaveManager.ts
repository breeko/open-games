import Phaser from 'phaser';
import { DIFFICULTIES, getDifficulty } from '../difficulty';
import { BALANCE, ZOMBIE_DEFS } from '../constants';
import { Zombie } from '../entities/Zombie';
import type { LevelDefinition } from '../levels';
import {FinalGraveRise} from '../night';
import {allowedZombies} from '../reference/rules';
import type { GridPosition, ZombieType } from '../types';
import type { GridManager } from './GridManager';
import { randomSource } from '../reference/rules';
import { sourceToWorldX } from '../reference/motion';
import {WhackDirector} from '../whack-director';
import { WaveDirector } from '../wave-director';
export interface WaveHooks {
  onWaveStart: (wave: number, total: number, isFlag: boolean) => void;
  onComplete: () => void;
  onWarning: () => void;
  graves:()=>readonly GridPosition[];
  addGraves:(count:number)=>void;
  onWhackKill:(zombie:Zombie)=>void;
}
export class WaveManager {
  private rise=new FinalGraveRise();
  private tickRemainder=0;
  private director: WaveDirector|WhackDirector;
  private laneHistory: number[] = [];
  private random=randomSource(12345);
  constructor(private readonly scene: Phaser.Scene, private readonly zombies: Phaser.Physics.Arcade.Group,
    private readonly grid: GridManager, private readonly level: LevelDefinition, private readonly hooks: WaveHooks) {
    if(level.mode==='whack'){
      this.director=new WhackDirector({
        spawn:(types,wave,maxSpeed)=>{
          const graves=[...hooks.graves()].filter(g=>this.grid.getPlant(g.col,g.row)?.plantType!=='gravebuster');
          for(const type of types){if(!graves.length)break;const grave=graves.splice(Math.floor(this.random()*graves.length),1)[0];this.spawnZombie(type,wave,grave,0.5+this.random()*(maxSpeed-0.5));}
        },graveCount:()=>hooks.graves().length,addGraves:hooks.addGraves,
        liveCount:()=>this.hostileCount(),start:hooks.onWaveStart,warning:hooks.onWarning,complete:hooks.onComplete,
      },this.random);return;
    }
    this.director = new WaveDirector(level.waves, {
      spawn: (type,wave) => this.spawnZombie(type,wave),
      health: wave => this.zombies.getChildren().reduce((sum,child) => child instanceof Zombie && child.active && child.isHostile && child.waveIndex === wave ? sum + child.waveHealth : sum,0),
      liveCount: () => this.hostileCount()+(this.rise.pending?1:0),
      start: (wave,total,flag)=>{if(this.level.environment==='night'&&wave===total)this.rise.schedule();hooks.onWaveStart(wave,total,flag);}, warning:hooks.onWarning, complete: hooks.onComplete,
    },this.random,level.mode==='bowling');
  }
  get diagnostics() { return { ...this.director.snapshot,events:this.director.events,plan:this.level.waves }; }
  get currentWave(): number { return this.director.currentWave; }
  get totalWaves(): number { return this.level.waves.length; }
  get progress(): number { return this.director.progress; }
  start(): void { /* New director is constructed for each run. */ }
  stop(): void { this.rise.cancel();this.director.stop(); }
  update(delta: number): void {
    this.tickRemainder+=delta;
    while(this.tickRemainder>=10){
    this.tickRemainder-=10;
    // A rise scheduled on the final-wave tick holds completion until every grave is checked.
    if(this.rise.step()){
      const cone=allowedZombies(this.level.id).includes('conehead');
      for(const grave of this.hooks.graves())this.spawnZombie(cone&&this.random()<0.5?'conehead':'basic',this.totalWaves-1,grave);
    }
    this.director.update(10);
    }
  }
  private hostileCount():number {return this.zombies.getChildren().filter(z=>z instanceof Zombie&&z.active&&z.isHostile).length;}
  private spawnZombie(type: ZombieType, wave: number,grave?:GridPosition,whackParameter?:number): number {
    const def = ZOMBIE_DEFS[type]; const difficulty = DIFFICULTIES[getDifficulty()];
    // Prefer lanes not used in the last two spawns, while keeping randomness.
    const candidates = this.level.activeRows.filter(row => !this.laneHistory.includes(row));
    const row = grave?.row ?? (candidates.length ? candidates : [...this.level.activeRows])[Math.floor(this.random()*(candidates.length || this.level.activeRows.length))];
    this.laneHistory.push(row); if (this.laneHistory.length > 2) this.laneHistory.shift();
    const parameter=whackParameter??(type==='polevaulter'||type==='football'?0.66+this.random()*0.02:type==='flag'?0.45:0.23+this.random()*0.14);
    const sourceX=type==='flag'?800:type==='polevaulter'?870+Math.floor(this.random()*10):780+Math.floor(this.random()*40)+(this.level.waves[wave].flag?40:0);
    const zombie = new Zombie(this.scene,grave?this.grid.cellToWorld(grave.col,row).x-12.8:sourceToWorldX(sourceX+57),row,this.grid, {
      parameter:parameter*difficulty.speed, speedMultiplier:difficulty.speed, shieldHp:(def.shieldHp??0)*difficulty.health, emergenceMs:grave?(this.level.mode==='whack'?500:1500):0, group:this.zombies, random:this.random,
      onDeath:this.level.mode==='whack'?z=>this.hooks.onWhackKill(z):undefined,
      hp: def.hp * difficulty.health, armorHp: def.armorHp * difficulty.health,
      speed: def.speed * difficulty.speed, dps: BALANCE.zombieEatDps, texture: def.texture, type, wave,
    });
    this.zombies.add(zombie); zombie.walk();
    return zombie.waveHealth;
  }
}
