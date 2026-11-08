import {GRID} from './constants';
import type {PlantType,ZombieType} from './types';
export type Environment='day'|'night'|'pool';
const LAND={rows:5,tileHeight:160} as const,POOL={rows:6,tileHeight:136} as const;
export function terrainFor(environment:Environment){return environment==='pool'?POOL:LAND;}
export function isWaterRow(environment:Environment,row:number):boolean {return environment==='pool'&&(row===2||row===3);}
export function canSwim(type:ZombieType):boolean {return type==='basic'||type==='conehead'||type==='buckethead'||type==='flag';}
export function poolLaneAllowed(type:ZombieType,row:number,wave:number):boolean {return row!==2&&row!==3||wave>=5&&canSwim(type);}
export function finalPoolCells(random:()=>number):{col:number;row:number}[]{
 const cells:{col:number;row:number}[]=[];for(let col=5;col<GRID.cols;col++)for(const row of [2,3])cells.push({col,row});
 return Array.from({length:2},()=>cells.splice(Math.floor(random()*cells.length),1)[0]);
}
export function canPlantTerrain(type:PlantType,water:boolean,pad:boolean,occupied:boolean):boolean {
 if(type==='lilypad')return water&&!pad&&!occupied;
 return !occupied&&(!water||pad&&type!=='potatomine');
}
