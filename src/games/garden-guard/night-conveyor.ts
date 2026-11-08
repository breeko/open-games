import type {PlantType} from './types';

/** Challenge::UpdateConveyorBelt, first Adventure level 20. */
export const NIGHT_CONVEYOR:readonly {type:PlantType;weight:number}[]=[
  {type:'gravebuster',weight:20},{type:'iceshroom',weight:15},{type:'doomshroom',weight:15},
  {type:'hypnoshroom',weight:10},{type:'scaredyshroom',weight:15},{type:'fumeshroom',weight:15},{type:'puffshroom',weight:10},
];
export function conveyorInterval(stock:number):number {return stock>8?10000:stock>6?5000:stock>4?4250:4000;}
export function nightConveyorWeights(stock:(type:PlantType)=>number,planted:(type:PlantType)=>number,graves:number,last:PlantType|undefined):number[] {
  return NIGHT_CONVEYOR.map(({type,weight})=>{
    const count=stock(type);
    if(type==='gravebuster'&&graves<=count+planted(type))return 0;
    return count>=4?1:count>=3?5:type===last?Math.floor(weight/2):weight;
  });
}
export function pickNightConveyor(weights:readonly number[],random:()=>number):number {
  let roll=random()*weights.reduce((sum,weight)=>sum+weight,0);
  for(let i=0;i<weights.length;i++){roll-=weights[i];if(roll<0)return i;}
  return NIGHT_CONVEYOR.length-1;
}
