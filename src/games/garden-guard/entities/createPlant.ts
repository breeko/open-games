import { PLANT_DEFS } from '../constants';
import type { GameContext, PlantDefinition, PlantType } from '../types';
import { Chomper } from './Chomper';
import { CherryBomb } from './CherryBomb';
import type { Plant } from './Plant';
import { Peashooter } from './Peashooter';
import { PotatoMine } from './PotatoMine';
import { Repeater } from './Repeater';
import { SnowPea } from './SnowPea';
import { Sunflower } from './Sunflower';
import { Threepeater } from './Threepeater';
import { WallNut } from './WallNut';

type PlantConstructor = new (
  ctx: GameContext,
  def: PlantDefinition,
  col: number,
  row: number,
) => Plant;

/**
 * The single place that maps a `PlantType` to a class.
 *
 * **To add a plant:** add the type to `PlantType`, add its entry to
 * `PLANT_DEFS` + `SEED_ORDER`, draw its texture in `PreloadScene`, then
 * register it here. A pea-shooting plant needs no new class at all — just
 * `lanes` / `peasPerVolley` / `damage` / `slow` in its definition.
 */
const REGISTRY: Record<PlantType, PlantConstructor> = {
  chomper: Chomper,
  sunflower: Sunflower,
  peashooter: Peashooter,
  wallnut: WallNut,
  potatomine: PotatoMine,
  snowpea: SnowPea,
  repeater: Repeater,
  threepeater: Threepeater,
  cherrybomb: CherryBomb,
};

export function createPlant(
  ctx: GameContext,
  type: PlantType,
  col: number,
  row: number,
): Plant {
  const Constructor = REGISTRY[type];
  return new Constructor(ctx, PLANT_DEFS[type], col, row);
}
