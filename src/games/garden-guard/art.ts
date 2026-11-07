import type Phaser from 'phaser';
import manifest from './reference/art-manifest.json';
/** Exported at twice their display dimensions; art pixels never define gameplay sizes. */
export const ART_SCALE=0.5;
export function sizeArt<T extends Phaser.GameObjects.Image | Phaser.GameObjects.Sprite>(image:T,key:string):T {
  const dimensions:Record<string,{width:number;height:number}>=manifest.sprites;
  const size=dimensions[key];
  if(size)image.setDisplaySize(size.width,size.height);
  return image;
}
