import { GRID } from './constants';
export interface Durability { hp: number; armor: number }
/** Damage overflows broken armor into the body on the same hit. */
export function damageAfterArmor(current: Durability, amount: number): Durability {
  const hit = Math.max(0,amount);
  const absorbed = Math.min(Math.max(0,current.armor),hit);
  return {armor:Math.max(0,current.armor-absorbed),hp:Math.max(0,current.hp-(hit-absorbed))};
}
/** Cherry blasts cover a 3×3 block; mines stay in their own lane. */
export function inBlast(dx: number, dy: number, radius: number): boolean {
  return radius > 120 ? Math.abs(dx) <= GRID.tileWidth*1.5 && Math.abs(dy) <= GRID.tileHeight*1.5 : Math.abs(dx) <= radius && Math.abs(dy) < GRID.tileHeight*0.6;
}
