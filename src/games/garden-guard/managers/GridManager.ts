import Phaser from 'phaser';
import {terrainFor,isWaterRow,type Environment} from '../terrain';
import { GRID } from '../constants';
import type { Plant } from '../entities/Plant';

/**
 * Owns the lawn grid: converts between grid cells and world coordinates and
 * tracks which plant (if any) occupies each cell.
 *
 * Keeping this separate from `GameScene` means placement rules, zombie target
 * lookup and rendering all share one source of truth.
 */
export class GridManager {
  private readonly cells: (Plant | null)[][];

  private readonly supports:(Plant|null)[][];
  constructor(readonly environment:Environment='day') {
    this.cells = Array.from({ length: this.rows }, () =>
      Array.from<Plant | null>({ length: GRID.cols }).fill(null),
    );
    this.supports=Array.from({length:this.rows},()=>Array<Plant|null>(GRID.cols).fill(null));
  }

  get rows(): number {
    return terrainFor(this.environment).rows;
  }

  get tileHeight():number {return terrainFor(this.environment).tileHeight;}
  isWaterRow(row:number):boolean {return isWaterRow(this.environment,row);}

  get cols(): number {
    return GRID.cols;
  }

  /** Centre of a cell in world coordinates. */
  cellToWorld(col: number, row: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      GRID.originX + col * GRID.tileWidth + GRID.tileWidth / 2,
      GRID.originY + row * this.tileHeight + this.tileHeight / 2,
    );
  }

  worldToCol(x: number): number {
    return Math.floor((x - GRID.originX) / GRID.tileWidth);
  }

  worldToRow(y: number): number {
    return Math.floor((y - GRID.originY) / this.tileHeight);
  }

  isInside(col: number, row: number): boolean {
    return col >= 0 && col < GRID.cols && row >= 0 && row < this.rows;
  }

  /** Row a given world y falls into, clamped to the lawn. */
  clampRow(row: number): number {
    return Phaser.Math.Clamp(row, 0, this.rows - 1);
  }

  getPlant(col: number, row: number): Plant | null {
    return this.isInside(col, row) ? this.cells[row][col]??this.supports[row][col] : null;
  }

  getMainPlant(col:number,row:number):Plant|null {return this.isInside(col,row)?this.cells[row][col]:null;}
  getSupport(col:number,row:number):Plant|null {return this.isInside(col,row)?this.supports[row][col]:null;}

  setPlant(col: number, row: number, plant: Plant | null): void {
    if (this.isInside(col, row)) {
      if(plant?.plantType==='lilypad')this.supports[row][col]=plant;else this.cells[row][col] = plant;
    }
  }

  /** Clears a cell, but only if it currently holds `plant` (or no owner given). */
  removePlant(col: number, row: number, plant?: Plant,cascade=true): void {
    if (!this.isInside(col, row)) return;
    if(plant&&this.supports[row][col]===plant){
      this.supports[row][col]=null;if(cascade)this.cells[row][col]?.remove();return;
    }
    if (plant && this.cells[row][col] !== plant) return;
    this.cells[row][col] = null;
  }

  clear(): void {
    for (const row of [...this.cells,...this.supports]) {
      row.fill(null);
    }
  }
}
