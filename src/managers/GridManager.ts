import Phaser from 'phaser';
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

  constructor() {
    this.cells = Array.from({ length: GRID.rows }, () =>
      Array.from<Plant | null>({ length: GRID.cols }).fill(null),
    );
  }

  get rows(): number {
    return GRID.rows;
  }

  get cols(): number {
    return GRID.cols;
  }

  /** Centre of a cell in world coordinates. */
  cellToWorld(col: number, row: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      GRID.originX + col * GRID.tileWidth + GRID.tileWidth / 2,
      GRID.originY + row * GRID.tileHeight + GRID.tileHeight / 2,
    );
  }

  worldToCol(x: number): number {
    return Math.floor((x - GRID.originX) / GRID.tileWidth);
  }

  worldToRow(y: number): number {
    return Math.floor((y - GRID.originY) / GRID.tileHeight);
  }

  isInside(col: number, row: number): boolean {
    return col >= 0 && col < GRID.cols && row >= 0 && row < GRID.rows;
  }

  /** Row a given world y falls into, clamped to the lawn. */
  clampRow(row: number): number {
    return Phaser.Math.Clamp(row, 0, GRID.rows - 1);
  }

  getPlant(col: number, row: number): Plant | null {
    return this.isInside(col, row) ? this.cells[row][col] : null;
  }

  setPlant(col: number, row: number, plant: Plant | null): void {
    if (this.isInside(col, row)) {
      this.cells[row][col] = plant;
    }
  }

  /** Clears a cell, but only if it currently holds `plant` (or no owner given). */
  removePlant(col: number, row: number, plant?: Plant): void {
    if (!this.isInside(col, row)) return;
    if (plant && this.cells[row][col] !== plant) return;
    this.cells[row][col] = null;
  }

  clear(): void {
    for (const row of this.cells) {
      row.fill(null);
    }
  }
}
