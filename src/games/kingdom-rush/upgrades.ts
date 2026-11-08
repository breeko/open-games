import {z} from 'zod';
import {POWERS,SOLDIERS,type EnemyKind,type SoldierKind,type TowerKind} from './content';

// Numeric facts: pinned Armor Games Flash v1.13, GameSettings / MenuUpgrades.
export const SKILL_IDS=['poison','thorns','deathRay','teleport'] as const;
export type SkillId=typeof SKILL_IDS[number];
export const SKILLS:Record<SkillId,{name:string;kind:TowerKind;costs:readonly number[];description:string}>={
  poison:{name:'Poison Arrows',kind:'archer',costs:[250,250,250],description:'Poison susceptible enemies for 3s: 5 / 10 / 15 true damage per pulse. Spiders, Golem Heads and the Juggernaut are immune.'},
  thorns:{name:'Wrath of the Forest',kind:'archer',costs:[300,150,150],description:'Roots up to 4 / 6 / 8 ground enemies for 1 / 2 / 3s, dealing 40 true damage each second. Needs two eligible enemies; 8s reload plus casting. No bosses or enemies already fighting. Each enemy can be rooted three times.'},
  deathRay:{name:'Death Ray',kind:'mage',costs:[350,200,200],description:'Disintegrates one non-boss on the next eligible beam. Reload 20 / 18 / 16s. Bosses receive the normal beam instead.'},
  teleport:{name:'Teleport',kind:'mage',costs:[300,100,100],description:'Sends nearby non-bosses back 25 / 30 / 35 path nodes, with a small random offset. 10s reload clock. Each enemy can be teleported three times. The original Flash portal caps are 4 / 10 / 18 enemies.'},
};
export const powerLoadoutSchema=z.object({fire:z.number().int().min(0).max(5),reinforcements:z.number().int().min(0).max(5)});
export type PowerLoadout=z.infer<typeof powerLoadoutSchema>;
export type PowerBranch=keyof PowerLoadout;
export const NO_POWER_UPGRADES:PowerLoadout={fire:0,reinforcements:0};
export const POWER_UPGRADES:Record<PowerBranch,readonly {name:string;cost:number;description:string}[]>={
  fire:[
    {name:'Blazing Skies',cost:1,description:'Five targeted fireballs instead of three; +20 damage per fireball.'},
    {name:'Scorched Earth',cost:1,description:'Each impact leaves a 5s patch, dealing 10–20 physical damage per pulse to ground enemies.'},
    {name:'Bigger and Meaner',cost:2,description:'+40 fireball damage, 25% larger impact radius and 70s cooldown. Wider scatter.'},
    {name:'Blazing Earth',cost:2,description:'Ground patches last 10s and deal 20–30 damage per pulse. Cooldown falls to 60s.'},
    {name:'Cataclysm',cost:3,description:'+60 fireball damage and five extra fireballs scattered across the roads.'},
  ],
  reinforcements:[
    {name:'Well Fed',cost:2,description:'50 HP, 1–3 melee damage, no armor, 6 HP idle regeneration.'},
    {name:'Conscripts',cost:3,description:'70 HP, 2–4 melee damage, 10% armor, 9 HP idle regeneration.'},
    {name:'Warriors',cost:3,description:'90 HP, 3–6 melee damage, 20% armor, 12 HP idle regeneration.'},
    {name:'Legionnaires',cost:3,description:'110 HP, 6–10 melee damage, 30% armor, 15 HP idle regeneration.'},
    {name:'Spear Throw',cost:4,description:'Legionnaires throw spears for 24–40 physical damage at distant ground or flying enemies. Range 166.4, minimum distance 51.2.'},
  ],
};
export function starsForLives(lives:number):number {return lives>=18?3:lives>5?2:lives>0?1:0;}
export function spentStars(loadout:PowerLoadout):number {return POWER_UPGRADES.fire.slice(0,loadout.fire).reduce((n,u)=>n+u.cost,0)+POWER_UPGRADES.reinforcements.slice(0,loadout.reinforcements).reduce((n,u)=>n+u.cost,0);}
export function purchasePower(loadout:PowerLoadout,branch:PowerBranch,earned:number):PowerLoadout|null {
  const next=POWER_UPGRADES[branch][loadout[branch]];
  return next&&spentStars(loadout)+next.cost<=earned?{...loadout,[branch]:loadout[branch]+1}:null;
}
export function fireStats(rank:number){return {...POWERS.fire,count:rank>0?5:3,minDamage:30+(rank>=1?20:0)+(rank>=3?40:0)+(rank>=5?60:0),maxDamage:60+(rank>=1?20:0)+(rank>=3?40:0)+(rank>=5?60:0),radius:rank>=3?80:64,cooldown:rank>=4?60:rank>=3?70:80,spread:rank>=3?32:19.2};}
export function soldierSpec(kind:SoldierKind,rank=0):typeof SOLDIERS[SoldierKind] {
  if(kind!=='farmer'||rank===0)return SOLDIERS[kind];
  const level=Math.min(4,rank),hp=[30,50,70,90,110][level],min=[1,1,2,3,6][level],max=[2,3,4,6,10][level];
  return {...SOLDIERS.farmer,template:SOLDIERS.militia.template,hp,armor:[0,0,.1,.2,.3][level],damage:[min,max],regen:[3,6,9,12,15][level]};
}
export function canPoison(kind:EnemyKind):boolean {return kind!=='spider'&&kind!=='matriarch'&&kind!=='spiderling'&&kind!=='golemHead'&&kind!=='juggernaut';}
