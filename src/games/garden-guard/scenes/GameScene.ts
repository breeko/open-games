import Phaser from 'phaser';
import {sizeArt} from '../art';
import { sampleSkySunTicks } from '../reference/rules';
import { DIFFICULTIES, getDifficulty } from '../difficulty';
import { audio } from '../audio/AudioManager';
import {
  BALANCE,
  DEPTH,
  GAME_HEIGHT,
  GAME_WIDTH,
  GRID,
  GRID_RIGHT,
  PLANT_DEFS,
  SKY_SUN_VALUE,
} from '../constants';
import { createPlant } from '../entities/createPlant';
import type { Plant } from '../entities/Plant';
import { Sun } from '../entities/Sun';
import { Zombie } from '../entities/Zombie';
import {whackLoot} from '../whack-director';
import {initialGraves} from '../night';
import { getLevel, defaultSeedsForLevel, type LevelDefinition } from '../levels';
import { GridManager } from '../managers/GridManager';
import { ResourceManager } from '../managers/ResourceManager';
import { WaveManager } from '../managers/WaveManager';
import { progress } from '../state/progress';
import { settings } from '../state/settings';
import type { GameContext, PlantType } from '../types';
import { Hud } from '../ui/Hud';
import { Button } from '../ui/Button';
import { SeedBank } from '../ui/SeedBank';

export interface GameSceneData {
  levelId?: number;
  seeds?: PlantType[];
}

/**
 * The lawn. Owns the world, listens for player input and pumps every manager
 * and entity each frame.
 *
 * Everything level-specific (starting sun, sky-sun rate, wave table, seeds)
 * comes from the `LevelDefinition` passed in by the seed-select screen.
 */
export class GameScene extends Phaser.Scene {
  private grid!: GridManager;
  private resources!: ResourceManager;
  private waves!: WaveManager;
  private graves=new Map<string,Phaser.GameObjects.Image>();
  private peas!: Phaser.Physics.Arcade.Group;
  private zombies!: Phaser.Physics.Arcade.Group;
  private seedBank!: SeedBank;
  private hud!: Hud;

  private ctx!: GameContext;
  private plants: Plant[] = [];

  private level!: LevelDefinition;
  get levelId(): number { return this.level.id; }
  get summary(): string { return `Level ${this.level.name} · Wave ${this.waves.currentWave}/${this.waves.totalWaves} · ${this.level.mode === 'standard'||this.level.mode==='whack' ? this.resources.sun + ' sun' : 'Conveyor supply'} · ${this.plants.filter(p => p.active).length} plants`; }
  private seeds: PlantType[] = [];

  private selected: PlantType | null = null;
  private draggingType: PlantType | null = null;
  private dragPointer?: Phaser.Input.Pointer;
  private dragGhost!: Phaser.GameObjects.Image;
  private dropHighlight!: Phaser.GameObjects.Rectangle;
  private skySunTimer = 0;
  private skyNext=0;
  private skyFallen=0;
  private diagnosticGraphics?:Phaser.GameObjects.Graphics;
  diagnosticsVisible=false;
  get diagnostics(){return {mode:this.level.mode,graves:[...this.graves.keys()],environment:this.level.environment,projectiles:this.peas.getChildren().filter((p):p is Phaser.Physics.Arcade.Image=>p instanceof Phaser.Physics.Arcade.Image).map(p=>({x:p.x,y:p.y,width:p.displayWidth,height:p.displayHeight,texture:p.texture.key})),level:this.level.id,difficulty:getDifficulty(),...this.waves.diagnostics,zombies:this.zombies.getChildren().filter((z):z is Zombie=>z instanceof Zombie && z.active).map(z=>({kind:z.variant,team:z.isHostile?'enemy':'ally',x:z.x,y:z.y,row:z.row,wave:z.waveIndex+1,hp:z.remainingHealth,speed:z.currentSpeed,body:z.body?{x:z.body.x,y:z.body.y,width:z.body.width,height:z.body.height}:null}))};}
  private finished = false;
  private shoveling = false;
  private supplyTimer = 0;
  private supplyIndex = 0;
  private rolling: { image: Phaser.GameObjects.Image; row: number; hits: Set<Zombie> }[] = [];
  get isShoveling(): boolean { return this.shoveling; }
  toggleShovel(): void { this.deselect(); this.shoveling = !this.shoveling; }

  private mowers = new Map<number, { image: Phaser.GameObjects.Image; used: boolean; moving: boolean }>();
  private gridY(row: number): number { return GRID.originY + (row + 0.5) * GRID.tileHeight; }

  constructor() {
    super('game');
  }

  init(data: GameSceneData): void {
    this.level = getLevel(data.levelId ?? this.level?.id ?? 1);
    this.seeds = this.level.mode==='whack'?[...this.level.availablePlants]:this.level.mode === 'standard' ? data.seeds && data.seeds.length > 0 ? [...data.seeds] : defaultSeedsForLevel(this.level.id) : [...new Set(this.level.conveyorSeeds)];
  }

  create(): void {
    this.plants = [];
    this.rolling = []; this.shoveling = false; this.supplyTimer = 0; this.supplyIndex = 0;
    this.selected = null;
    this.draggingType = null;
    this.dragPointer = undefined;
    this.skySunTimer = 0; this.skyFallen=0;this.skyNext=sampleSkySunTicks(0,Math.random)*10;
    this.finished = false;

    this.diagnosticGraphics=this.add.graphics().setDepth(290);
    this.physics.resume();
    this.mowers = new Map();
    this.grid = new GridManager();
    this.drawBackground();
    this.graves=new Map();
    for(const {col,row} of initialGraves(this.level.id)){
      const cell=this.grid.cellToWorld(col,row);
      this.graves.set(`${col},${row}`,this.add.image(cell.x,cell.y+25,'grave').setScale(1.6).setOrigin(0.5,0.72).setDepth(9));
    }
    for (const row of this.level.activeRows) {
      const image = this.add.image(GRID.originX - 42, this.gridY(row) + 30, 'mower').setScale(0.5).setDepth(DEPTH.plants);
      this.mowers.set(row, { image, used: false, moving: false });
    }

    this.resources = new ResourceManager(this.level.startingSun + DIFFICULTIES[getDifficulty()].sunBonus);

    this.peas = this.physics.add.group({ allowGravity: false });
    this.zombies = this.physics.add.group();

    this.ctx = {
      graveAt:(col,row)=>this.graves.has(`${col},${row}`),
      clearGrave:(col,row)=>{this.graves.get(`${col},${row}`)?.destroy();this.graves.delete(`${col},${row}`);},
      sunBank:this.level.id<=2?{x:89,y:76}:{x:70,y:60},
      scene: this,
      grid: this.grid,
      resources: this.resources,
      peas: this.peas,
      zombies: this.zombies,
      spawnSun: (x, y) => this.spawnSun(x, y),
    };

    this.physics.add.overlap(this.peas, this.zombies, (peaObj, zombieObj) => {
      const pea = peaObj as unknown as Phaser.Physics.Arcade.Image;
      const zombie = zombieObj as unknown as Zombie;

      if (!pea.active || !zombie.active || !zombie.isHostile || pea.getData('row') !== zombie.row) return;

      zombie.takeDamage((pea.getData('damage') as number | undefined) ?? BALANCE.peaDamage);

      const slowMs = pea.getData('slowMs') as number | undefined;
      if (slowMs) {
        zombie.applySlow((pea.getData('slowFactor') as number | undefined) ?? 0.5, slowMs);
      }

      pea.destroy();
    });

    this.seedBank = new SeedBank(this, this.resources, this.seeds, this.level.mode==='bowling'||this.level.mode==='conveyor',this.level.id<=2);
    this.seedBank.on('select', (type: PlantType | null) => {
      this.selected = type;
      if (type) this.shoveling = false;
    });
    this.seedBank.on('dragstart', (type: PlantType, pointer: Phaser.Input.Pointer) => {
      this.beginDrag(type, pointer);
    });
    this.seedBank.on('dragend', (_type: PlantType, pointer: Phaser.Input.Pointer) => {
      this.endDrag(pointer);
    });

    // A small movement threshold keeps a plain click a click, while a
    // deliberate drag starts the moment the pointer really moves. 12px is
    // comfortably above hand jitter so clicking a seed never turns into a drag.
    this.input.dragDistanceThreshold = 12;

    this.hud = new Hud(this, this.resources, this.level);
    this.events.on('shovel-request',this.toggleShovel,this);

    // Drag feedback: a translucent copy of the plant under the pointer, plus a
    // coloured outline on the cell it would land in.
    this.dragGhost = this.add
      .image(0, 0, PLANT_DEFS.sunflower.texture)
      .setDepth(DEPTH.dragGhost)
      .setAlpha(0.75)
      .setVisible(false);

    sizeArt(this.dragGhost,'sunflower');
    this.dropHighlight = this.add
      .rectangle(0, 0, GRID.tileWidth - 10, GRID.tileHeight - 10, 0xffffff, 0.16)
      .setStrokeStyle(3, 0xffffff, 0.9)
      .setDepth(DEPTH.dropHighlight)
      .setVisible(false);

    this.waves = new WaveManager(this, this.zombies, this.grid, this.level, {
      onWhackKill:z=>{if(whackLoot(this.resources.sun,z.variant,Phaser.Math.Between(0,29999)))for(let i=0;i<3;i++)this.spawnSun(z.x-i*30,z.y-40);},
      addGraves:count=>this.addWhackGraves(count),
      graves:()=>[...this.graves.keys()].map(key=>{const [col,row]=key.split(',').map(Number);return {col,row};}),
      onWaveStart: (wave, total, isFlag) => {
        this.hud.setWave(wave, total);
        if (isFlag) this.hud.announce(wave===total?'FINAL WAVE!':'HUGE WAVE!');
      },
      onWarning:()=>this.hud.announce(this.level.mode==='whack'?'NEXT WAVE!':'A HUGE WAVE IS APPROACHING!','#ff6464',this.level.mode==='whack'?1000:7500),
      onComplete: () => this.win(),
    });

    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.keyboard?.on('keydown-ESC', () => this.cancelSelection());
    this.input.keyboard?.on('keydown-S', () => this.toggleShovel());
    this.input.on('gameout', () => this.cancelSelection());
    this.input.keyboard?.on('keydown-R', () => {
      if (this.finished) this.scene.restart({ levelId: this.level.id, seeds: this.seeds });
    });
    this.input.keyboard?.on('keydown-M', () => this.scene.start('menu'));

    // Number keys arm a seed without moving the mouse. Press again to cancel.
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const index = Number(event.key) - 1;
      const order = this.seedBank.seedOrder;
      if (!Number.isInteger(index) || index < 0 || index >= order.length) return;

      const type = order[index];
      if (!this.seedBank.isPlantable(type)) {
        this.seedBank.shakeCard(type);
        return;
      }

      this.seedBank.select(this.selected === type ? null : type);
    });

    this.hud.setWave(0,this.level.waves.length);
    if (this.level.mode==='bowling'||this.level.mode==='conveyor') {
      for (let i=0;i<3;i++) this.seedBank.grant(this.level.conveyorSeeds[i % this.level.conveyorSeeds.length]);
    }
    this.waves.start();
    this.hud.announce(this.level.blurb, '#ffe066', 4500);

    // Clean up listeners when the scene restarts so nothing accumulates.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.draggingType = null;
      this.dragPointer = undefined;
      this.resources.removeAllListeners();
      this.seedBank.removeAllListeners();
      this.input.removeAllListeners();
      this.input.keyboard?.removeAllListeners();
      this.events.off('shovel-request',this.toggleShovel,this);
      this.waves.stop();
    });
  }

  override update(time: number, delta: number): void {
    if (this.finished) return;
    delta = Math.min(delta,100);

    // Move the drag feedback with the live pointer rather than reacting to
    // every pointermove, so the ghost never trails behind the cursor.
    if (this.draggingType && this.dragPointer) {
      const { worldX, worldY } = this.dragPointer;
      this.dragGhost.setPosition(worldX, worldY);
      this.updateDropHighlight(worldX, worldY);
    } else if (this.selected) {
      // Seed armed by click or hotkey: show where it would land.
      const pointer = this.input.activePointer;
      this.updateDropHighlight(pointer.worldX, pointer.worldY);
    } else {
      this.dropHighlight.setVisible(false);
    }

    // Plants
    for (const plant of this.plants) {
      if (plant.active) plant.tick(delta);
    }
    if (this.plants.some((p) => !p.active)) {
      this.plants = this.plants.filter((p) => p.active);
    }

    // Zombies
    this.zombies.getChildren().forEach((child) => {
      const zombie = child as Zombie;
      if (zombie.active) zombie.tick(delta);
    });

    // Projectiles that left the screen
    this.peas.getChildren().forEach((child) => {
      const pea = child as Phaser.Physics.Arcade.Image;
      if (pea.active && (pea.x > GAME_WIDTH + 60 || (pea.getData('expiresAt')&&this.time.now>=pea.getData('expiresAt')))) pea.destroy();
    });

    if (this.level.mode==='bowling'||this.level.mode==='conveyor') {
      this.supplyTimer += delta;
      if (this.supplyTimer >= (this.level.mode === 'bowling' ? 3500 : 5000)) {
        this.supplyTimer = 0;
        this.seedBank.grant(this.level.conveyorSeeds[this.supplyIndex++ % this.level.conveyorSeeds.length]);
      }
    }
    this.updateRolling(delta);
    // Falling sun
    if (this.level.mode === 'standard'&&this.level.environment==='day') this.skySunTimer += delta;
    if (this.skySunTimer >= this.skyNext) {
      this.skySunTimer -= this.skyNext;this.skyNext=sampleSkySunTicks(++this.skyFallen,Math.random)*10;
      const col = Phaser.Math.Between(0, GRID.cols - 1);
      this.spawnSun(
        GRID.originX + col * GRID.tileWidth + GRID.tileWidth / 2,
        GRID.originY - 40,
      );
    }

    this.waves.update(delta);
    this.seedBank.update(time);
    this.hud.setProgress(this.waves.progress);

    for (const [row, mower] of this.mowers) {
      if (!mower.moving) continue;
      mower.image.x += delta * 0.6;
      for (const child of this.zombies.getChildren()) {
        const enemy = child as Zombie;
        if (enemy.active && enemy.row === row && Math.abs(enemy.x - mower.image.x) < 60) enemy.takeDamage(99999);
      }
      if (mower.image.x > GAME_WIDTH + 80) { mower.moving = false; mower.image.setVisible(false); }
    }
    this.diagnosticGraphics?.clear();
    if(this.diagnosticsVisible){
      const g=this.diagnosticGraphics!;g.lineStyle(1,0xffff00,0.8);
      for(let row=0;row<5;row++)for(let col=0;col<9;col++)g.strokeRect(GRID.originX+col*GRID.tileWidth,GRID.originY+row*GRID.tileHeight,GRID.tileWidth,GRID.tileHeight);
      for(const z of this.diagnostics.zombies){g.lineStyle(2,0xff4050,1);if(z.body)g.strokeRect(z.body.x,z.body.y,z.body.width,z.body.height);g.lineBetween(z.x-6,z.y,z.x+6,z.y);g.lineBetween(z.x,z.y-6,z.x,z.y+6);}
      for(const p of this.plants){g.lineStyle(2,0x00ffff,1);const b=p.getBounds();g.strokeRect(b.x,b.y,b.width,b.height);}
      for(const child of this.peas.getChildren())if(child instanceof Phaser.Physics.Arcade.Image){g.lineStyle(2,0xff99ff,1);g.strokeCircle(child.x,child.y,child.displayWidth*12/28);}
    }
    this.checkForLoss();
  }

  /* ------------------------------------------------------------------ */
  /*  Input                                                              */
  /* ------------------------------------------------------------------ */

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.finished) return;

    if (pointer.rightButtonDown()) {
      this.deselect();
      return;
    }

    // Don't plant when the player is really clicking a sun.
    const hits = this.input.hitTestPointer(pointer);
    if (hits.some((obj) => obj instanceof Sun)) return;

    if (this.shoveling) {
      const col = this.grid.worldToCol(pointer.worldX); const row = this.grid.worldToRow(pointer.worldY);
      this.grid.getPlant(col,row)?.remove(); this.shoveling = false; return;
    }
    if (!this.selected){if(this.level.mode==='whack')this.bonkAt(pointer.worldX,pointer.worldY);return;}

    const col = this.grid.worldToCol(pointer.worldX);
    const row = this.grid.worldToRow(pointer.worldY);

    if (!this.grid.isInside(col, row) || !this.level.activeRows.includes(row)) {
      this.deselect();
      return;
    }

    if (this.tryPlant(this.selected, col, row)) {
      this.deselect();
    }
  }

  cancelSelection(): void { this.deselect(); this.shoveling = false; this.draggingType = null; this.dragGhost.setVisible(false); }

  private deselect(): void {
    this.seedBank.clearSelection();
  }

  /* ------------------------------------------------------------------ */
  /*  Drag & drop planting                                               */
  /* ------------------------------------------------------------------ */

  private beginDrag(type: PlantType, pointer: Phaser.Input.Pointer): void {
    if (this.finished) return;

    this.draggingType = type;
    this.dragPointer = pointer;
    sizeArt(this.dragGhost.setTexture(PLANT_DEFS[type].texture),PLANT_DEFS[type].texture).setVisible(true);
  }

  private endDrag(pointer: Phaser.Input.Pointer): void {
    const type = this.draggingType;

    this.draggingType = null;
    this.dragPointer = undefined;
    this.dragGhost.setVisible(false);

    if (!type || this.finished) return;

    const planted = this.tryPlant(
      type,
      this.grid.worldToCol(pointer.worldX),
      this.grid.worldToRow(pointer.worldY),
    );

    if (planted) {
      this.deselect();
    } else {
      // The drag did not land. Keep the seed armed so a click that drifted a
      // few pixels (and so became a drag) still behaves like the click the
      // player intended, and so a mis-drop does not leave them with nothing.
      this.seedBank.select(type);
    }
  }

  /** Outlines the cell under the pointer: green when plantable, red when not. */
  private updateDropHighlight(x: number, y: number): void {
    const col = this.grid.worldToCol(x);
    const row = this.grid.worldToRow(y);

    if (!this.grid.isInside(col, row) || !this.level.activeRows.includes(row)) {
      this.dropHighlight.setVisible(false);
      return;
    }

    const blocked = this.level.mode === 'bowling' ? col > 2 : Boolean(this.grid.getPlant(col,row)) || (this.selected==='gravebuster'?!this.ctx.graveAt(col,row):this.ctx.graveAt(col,row));
    const color = blocked ? 0xff6b6b : 0x7cff6b;
    const centre = this.grid.cellToWorld(col, row);

    this.dropHighlight
      .setPosition(centre.x, centre.y)
      .setFillStyle(color, 0.16)
      .setStrokeStyle(3, color, 0.9)
      .setVisible(true);
  }

  /* ------------------------------------------------------------------ */
  /*  World helpers                                                      */
  /* ------------------------------------------------------------------ */

  /** Builds a plant via the registry and registers it on the lawn. */
  private spawnPlant(type: PlantType, col: number, row: number): Plant {
    const plant = createPlant(this.ctx, type, col, row);

    this.grid.setPlant(col, row, plant);
    this.plants.push(plant);

    return plant;
  }

  /**
   * Plants `type` at `col`/`row` when the cell is free and the seed is
   * affordable. Returns `true` only when a plant was actually placed, so
   * callers can decide whether to clear the current selection.
   */
  private tryPlant(type: PlantType, col: number, row: number): boolean {
    if (!this.grid.isInside(col, row) || !this.level.activeRows.includes(row)) return false;
    if (!this.seedBank.isPlantable(type)) return false;
    if (this.level.mode === 'bowling') {
      if (col > 2) return false;
      const point = this.grid.cellToWorld(col,row);
      const image = this.add.image(point.x,point.y + 14,'wallnut').setDisplaySize(94,118).setDepth(DEPTH.plants);
      this.rolling.push({image,row,hits:new Set()}); this.seedBank.startCooldown(type); audio.sfx('plant'); return true;
    }
    if (this.grid.getPlant(col, row)) return false;
    if(type==='gravebuster'?!this.ctx.graveAt(col,row):this.ctx.graveAt(col,row))return false;
    if ((this.level.mode === 'standard'||this.level.mode==='whack') && !this.resources.spend(PLANT_DEFS[type].cost)) return false;

    this.spawnPlant(type, col, row);
    this.seedBank.startCooldown(type);
    audio.sfx('plant');

    return true;
  }

  private addWhackGraves(count:number):void {
    const cells:{col:number;row:number}[]=[];
    for(let col=3;col<9;col++)for(let row=0;row<5;row++)if(!this.ctx.graveAt(col,row))cells.push({col,row});
    for(let i=0;i<count&&cells.length;i++){
      const free=cells.filter(c=>!this.grid.getPlant(c.col,c.row));
      const pool=free.length?free:cells,cell=pool[Phaser.Math.Between(0,pool.length-1)];
      cells.splice(cells.indexOf(cell),1);this.grid.getPlant(cell.col,cell.row)?.remove();
      const point=this.grid.cellToWorld(cell.col,cell.row);
      this.graves.set(`${cell.col},${cell.row}`,this.add.image(point.x,point.y+25,'grave').setScale(1.6).setOrigin(0.5,0.72).setDepth(9));
    }
  }

  private bonkAt(x:number,y:number):void {
    if(y<GRID.originY)return;
    const targets=this.zombies.getChildren().filter((z):z is Zombie=>z instanceof Zombie&&z.active&&z.isHostile&&z.getBounds().contains(x,y));
    const zombie=targets.sort((a,b)=>b.row-a.row||b.x-a.x)[0];
    const effect=this.add.text(x,y-25,zombie?'BONK!':'✦',{fontFamily:'Arial, sans-serif',fontSize:'28px',fontStyle:'bold',color:'#ffed88',stroke:'#563d1d',strokeThickness:4}).setOrigin(0.5).setDepth(DEPTH.effects);
    this.tweens.add({targets:effect,y:y-70,alpha:0,duration:300,onComplete:()=>effect.destroy()});
    if(!zombie)return;
    audio.sfx('plant');
    zombie.bonk();
  }

  private updateRolling(delta: number): void {
    for (const nut of this.rolling) {
      nut.image.x += delta * 0.44; nut.image.angle += delta * 0.55;
      for (const enemy of this.zombies.getChildren()) {
        if (!(enemy instanceof Zombie) || !enemy.active || !enemy.isHostile || enemy.row !== nut.row || nut.hits.has(enemy) || Math.abs(enemy.x - nut.image.x) > 45) continue;
        nut.hits.add(enemy); enemy.takeDamage(enemy.hasArmor ? 500 : 1800); audio.sfx('plant');
        const direction = nut.row === 0 ? 1 : nut.row === 4 ? -1 : Phaser.Math.Between(0,1) ? 1 : -1;
        nut.row += direction;
        this.tweens.add({targets:nut.image,y:this.gridY(nut.row) + 14,duration:220});
        break;
      }
    }
    this.rolling = this.rolling.filter(nut => { if (nut.image.x <= GAME_WIDTH + 100) return true; nut.image.destroy(); return false; });
  }

  private spawnSun(x: number, y: number): void {
    // eslint-disable-next-line no-new
    new Sun(this, x, y, SKY_SUN_VALUE, (value) => this.resources.add(value), y < GRID.originY ? Phaser.Math.Between(GRID.originY + 40, GRID.originY + GRID.tileHeight*4.4) : undefined,this.ctx.sunBank);
  }

  private drawBackground(): void {
    const g = this.add.graphics().setDepth(DEPTH.lawn);

    g.fillStyle(0x263a23, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.add.image(0, 0, this.level.environment==='night'?'night':'lawn' + Math.min(3, this.level.id)).setOrigin(0).setDisplaySize(GAME_WIDTH,GAME_HEIGHT).setDepth(DEPTH.lawn);
    if (this.level.mode === 'bowling') {
      const boundary = GRID.originX + GRID.tileWidth * 3;
      const stripe = this.add.graphics().setDepth(DEPTH.lawn + 1);
      stripe.lineStyle(5,0xdad4b6,0.8); stripe.lineBetween(boundary,GRID.originY,boundary,GRID.originY + GRID.rows*GRID.tileHeight);
    }
    if (settings.current.showGrid) {
      const guides = this.add.graphics().setDepth(DEPTH.lawn + 1);
      guides.lineStyle(1, 0x244e20, 0.18);
      for (const row of this.level.activeRows) for (let col = 0; col < GRID.cols; col++)
        guides.strokeRect(GRID.originX + col * GRID.tileWidth, GRID.originY + row * GRID.tileHeight, GRID.tileWidth, GRID.tileHeight);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  End conditions                                                     */
  /* ------------------------------------------------------------------ */

  private checkForLoss(): void {
    for (const child of this.zombies.getChildren()) {
      const zombie = child as Zombie;
      if (zombie.active && zombie.isHostile && zombie.x < GRID.originX - 40) {
        const mower = this.mowers.get(zombie.row);
        if (mower && !mower.used) {
          mower.used = true; mower.moving = true; zombie.takeDamage(99999);
        } else { this.lose(); return; }
      }
    }
  }

  private lose(): void {
    if (this.finished) return;
    this.finished = true;
    this.waves.stop();

    progress.recordAttempt(this.waves.currentWave);
    audio.sfx('lose');

    this.physics.pause();
    this.showBanner(
      'GAME OVER',
      '#ff6b6b',
      this.level.mode==='whack'?'Keep bonking! Cones need two taps and buckets need three.':'The garden was overrun. Try a different planting strategy.',
    );
    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, { label: 'Try again', width: 260, height: 64, onClick: () => this.scene.restart({ levelId: this.level.id, seeds: this.seeds }) }).setDepth(DEPTH.banner + 1);
  }

  private win(): void {
    if (this.finished) return;
    this.finished = true;

    const firstClear = progress.completeLevel(this.level.id, this.waves.totalWaves);
    audio.sfx('win');

    // Let the victory sound land before handing over to the reward screen.
    this.time.delayedCall(900, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('reward', { levelId: this.level.id, firstClear });
      });
    });

    this.physics.pause();
    this.showBanner(
      'LEVEL COMPLETE!',
      '#9ff07a',
      `${this.level.name} cleared \u2014 all ${this.waves.totalWaves} waves survived.`,
    );
  }

  private showBanner(title: string, color: string, subtitle: string): void {
    this.add
      .rectangle(0, GAME_HEIGHT / 2 - 90, GAME_WIDTH, 180, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setDepth(DEPTH.banner);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, title, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '58px',
        color,
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.banner);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, subtitle, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.banner);
  }
}
