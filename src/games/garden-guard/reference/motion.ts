import tracks from './ground-tracks.json';
import type { MotionSnapshot } from '../state/session-data';
export const SOURCE_X_SCALE=128/80;
export function sourceToWorldX(x:number):number{return 64+(x-40)*SOURCE_X_SCALE;}
export type Gait=keyof typeof tracks;
/** Original ground-track displacement at the original 100 Hz, independent of rendering FPS. */
export class GroundMotion {
  private phase=0;
  private remainder=0;
  constructor(public gait:Gait,public parameter:number){}
  save(): MotionSnapshot { return { gait: this.gait, parameter: this.parameter, phase: this.phase, remainder: this.remainder }; }
  restore(data: MotionSnapshot): void { this.gait=data.gait;this.parameter=data.parameter;this.phase=data.phase;this.remainder=data.remainder; }
  advance(delta:number,chilled=false):number {
    this.remainder+=delta;let distance=0;
    const track=tracks[this.gait];const xs=track.groundX;const n=track.frameCount;
    const rate=this.parameter*n/(xs[xs.length-1]-xs[0])*47*(chilled?0.5:1);
    while(this.remainder>=10){
      this.remainder-=10;this.phase=(this.phase+0.01*rate/n)%1;
      const frame=Math.min(n-2,Math.floor(this.phase*(n-1)));
      distance+=(xs[frame+1]-xs[frame])*0.01*rate*SOURCE_X_SCALE;
    }
    return distance;
  }
  get meanPixelsPerSecond():number {const n=tracks[this.gait].frameCount;return this.parameter*47*n/(n-1)*SOURCE_X_SCALE;}
}
