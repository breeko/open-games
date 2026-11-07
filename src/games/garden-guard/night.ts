import type {GridPosition} from './types';
import {randomSource} from './reference/rules';
/** Board::InitBoard: per-column grave counts in the first four night levels. */
export function initialGraves(level:number,seed=12345):GridPosition[] {
 if(level===15){const random=randomSource(seed),cells:GridPosition[]=[];for(let col=3;col<9;col++)for(let row=0;row<5;row++)cells.push({col,row});return Array.from({length:9},()=>cells.splice(Math.floor(random()*cells.length),1)[0]);}
 const counts=level>=11&&level<=13?[[6,1],[7,1],[8,2]]:level===14||level===16?[[5,1],[6,1],[7,2],[8,3]]:[];
 const random=randomSource(seed);const result:GridPosition[]=[];
 for(const [col,count] of counts){const rows=[0,1,2,3,4];for(let i=0;i<count;i++)result.push({col,row:rows.splice(Math.floor(random()*rows.length),1)[0]});}
 return result;
}
export const NIGHT_RULES={sunGrowthMs:120000,smallSun:15,largeSun:25,graveRiseDelayMs:2000,graveEmergenceMs:1500,graveEatingMs:5000} as const;

/** Source uses a 200-tick rise countdown after the final wave. */
export class FinalGraveRise {
 private ticks=0;
 get pending():boolean {return this.ticks>0;}
 schedule():void {this.ticks=NIGHT_RULES.graveRiseDelayMs/10;}
 cancel():void {this.ticks=0;}
 step():boolean {return this.ticks>0&&--this.ticks===0;}
}
