import type Phaser from 'phaser';

/** Measured lower-silhouette anchors in the existing original-art exports.
 * Use feet / stems rather than the bounds of noses, shields or long poles.
 * These offsets are drawing-only; entity coordinates and bodies stay fixed. */
export const GROUND_X:Readonly<Record<string,number>>={
 peashooter:.477,repeater:.477,snowpea:.469,sunflower:.408,
 wallnut:.517,'wallnut-cracked':.517,'wallnut-broken':.517,cherrybomb:.427,
 chomper:.443,'chomper-digest':.423,potatomine:.521,'potatomine-armed':.526,
 puffshroom:.502,fumeshroom:.452,gravebuster:.502,sunshroom:.474,'sunshroom-grown':.483,
 hypnoshroom:.479,scaredyshroom:.632,'scaredyshroom-hidden':.564,iceshroom:.519,doomshroom:.48,
 zombie:.61,'zombie-cone':.61,'zombie-bucket':.61,'zombie-pole':.776,'zombie-pole-walk':.729,
 'zombie-paper':.739,'zombie-paper-angry':.739,'zombie-door':.495,
 'zombie-football':.74,'zombie-football-bare':.74,'zombie-dancer':.423,'zombie-backup':.388,
};
export function groundX(key:string):number {return GROUND_X[key]??.5;}
export const PLANT_GROUND_OFFSET=66;
export const ZOMBIE_GROUND_OFFSET=52.8;
export function plantMuzzleX(key:string):number {return .88+.5-groundX(key);}

/** Render around a grounded pivot, then restore every gameplay transform.
 * Idle motion requires no extra objects, tweens, physics or saved state. */
export function renderGroundedArt(renderer:Phaser.Renderer.Canvas.CanvasRenderer,src:Phaser.GameObjects.Sprite,camera:Phaser.Cameras.Scene2D.Camera,parent:Phaser.GameObjects.Components.TransformMatrix|undefined,groundOffset:number,sway:number,breath=1,kick=0):void {
 const x=src.x,y=src.y,ox=src.originX,oy=src.originY,sx=src.scaleX,sy=src.scaleY,rotation=src.rotation;
 camera.addToRenderList(src);
 try {
  src.setOrigin(src.flipX?1-groundX(src.texture.key):groundX(src.texture.key),1);
  src.x=x+kick;src.y=y+groundOffset;src.rotation=rotation+sway;src.scaleY=sy*breath;
  renderer.batchSprite(src,src.frame,camera,parent);
 }finally{src.setOrigin(ox,oy);src.x=x;src.y=y;src.scaleX=sx;src.scaleY=sy;src.rotation=rotation;}
}
