import { GRID } from './constants';
export interface Durability { hp: number; armor: number }
/** Damage overflows broken armor into the body on the same hit. */
export function damageAfterArmor(current: Durability, amount: number): Durability {
  const hit = Math.max(0,amount);
  const absorbed = Math.min(Math.max(0,current.armor),hit);
  return {armor:Math.max(0,current.armor-absorbed),hp:Math.max(0,current.hp-(hit-absorbed))};
}
/** Cherry blasts cover a 3×3 block; mines stay in their own lane. */
export function inBlast(dx: number, dy: number, radius: number,tileHeight:number=GRID.tileHeight): boolean {
  return radius > 120 ? Math.abs(dx) <= GRID.tileWidth*1.5 && Math.abs(dy) <= tileHeight*1.5 : Math.abs(dx) <= radius && Math.abs(dy) < tileHeight*0.6;
}

export interface ShieldDurability extends Durability {shield:number}
/** Fumes bypass carried shields, but helmets still absorb their damage. */
export function damageWithShield(current:ShieldDurability,amount:number,bypass=false):ShieldDurability {
 const absorbed=bypass?0:Math.min(Math.max(0,current.shield),Math.max(0,amount));
 return {...damageAfterArmor(current,Math.max(0,amount)-absorbed),shield:Math.max(0,current.shield-absorbed)};
}
export function waveHealth(current:ShieldDurability):number {return Math.max(0,current.hp)+Math.max(0,current.armor)+Math.max(0,current.shield)*0.2;}
