/** More canvas pixels when the visible board exceeds its logical size.
 * Do not multiply by devicePixelRatio: that would quadruple drawing work on
 * the target iPad. Original sprites already have 2× artwork available. */
export function boardRenderScale(width:number,height:number):number {
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return 1;
 const visibleWidth=Math.min(width,height*4/3);
 return Math.max(1,Math.min(2,Math.ceil(visibleWidth/1280*2)/2));
}
