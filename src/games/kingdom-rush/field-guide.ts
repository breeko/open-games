import {barracksSoldier,maxTowerTier,POWERS,SOLDIERS,TOWERS,TOWER_KINDS,type Level,type TowerKind} from './content';

const number=(value:number):string=>Number(value.toFixed(2)).toString();
const damage=(range:readonly [number,number]):string=>`${range[0]}–${range[1]}`;
export function towerName(kind:TowerKind,tier:number):string {
  return tier===4?(kind==='mage'?'Arcane Wizard':'Rangers'):`${TOWERS[kind].name} · ${tier}`;
}
export function towerSummary(kind:TowerKind,tier:number):string {
  const spec=TOWERS[kind],i=tier-1;
  if(kind==='barrack'){const soldier=SOLDIERS[barracksSoldier(tier)];return `3 soldiers · ${soldier.hp} HP each · ${damage(soldier.damage)} damage every ${number(soldier.cooldown)}s · ${number(soldier.armor*100)}% armor · rally range ${spec.range[i]}`;}
  return `${damage(spec.damage[i])} ${kind==='engineer'?'splash':spec.damageKind} damage · range ${spec.range[i]} · every ${number(spec.cooldown[i])}s${kind==='engineer'?` · blast radius ${spec.radius[i]}`:''}`;
}

function node<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string):HTMLElementTagNameMap[K]{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;}
function paragraph(parent:HTMLElement,text:string):void {parent.append(node('p',text));}
function card(parent:HTMLElement,title:string):HTMLElement {const section=node('section');section.className='guide-card';section.append(node('h3',title));parent.append(section);return section;}
function table(parent:HTMLElement,headings:string[]):HTMLTableSectionElement {
  const wrapper=node('div');wrapper.className='guide-table';const table=node('table'),head=node('thead'),row=node('tr');
  for(const text of headings){const th=node('th',text);th.scope='col';row.append(th);}head.append(row);const body=node('tbody');table.append(head,body);wrapper.append(table);parent.append(wrapper);return body;
}

export type GuideTopic='all'|TowerKind|'powers';
export function renderFieldGuide(parent:HTMLElement,topic:GuideTopic,level:Level,wave:number,selected?:{kind:TowerKind;level:number}):void {
  parent.replaceChildren();parent.dataset.topic=topic;
  for(const kind of TOWER_KINDS){
    if(topic!=='all'&&topic!==kind)continue;
    const spec=TOWERS[kind],section=card(parent,spec.name),cap=maxTowerTier(level,kind,wave);
    const notes:Record<TowerKind,string>={
      archer:'Fast physical attacks. Targets ground and flying enemies; armor reduces damage. Arrows can miss moving targets.',
      mage:'Magic attacks. Ignores physical armor; magic resistance reduces damage. Arcane Wizards deliver their rolled damage in ten rounded beam pulses.',
      engineer:'Area explosions. Maximum damage at the blast center, minimum at the edge. Only half of physical armor applies. Aims at ground enemies; nearby flying enemies can take splash damage.',
      barrack:'Three soldiers hold enemies on the road. Range means rally placement, not a ranged attack. Replacement starts 10 seconds after a soldier dies; recruits then walk back to the rally point. Flying enemies pass over them.',
    };
    paragraph(section,notes[kind]);
    const body=table(section,kind==='barrack'?['Tier','HP each','Damage','Every','Armor','Cost / total']:['Tier','Damage','Range','Every','Blast','Cost / total']);
    let total=0;
    for(let i=0;i<spec.price.length;i++){
      const tier=i+1,available=tier<=cap,row=node('tr');total+=spec.price[i];
      const label=tier===4?(kind==='mage'?'Arcane':'Rangers'):String(tier);
      const heading=node('th',label);heading.scope='row';row.append(heading);
      const soldier=SOLDIERS[barracksSoldier(tier)];
      const values=kind==='barrack'?[String(soldier.hp),damage(soldier.damage),`${number(soldier.cooldown)}s`,`${number(soldier.armor*100)}%`]:[damage(spec.damage[i]),number(spec.range[i]),`${number(spec.cooldown[i])}s`,spec.radius[i]?number(spec.radius[i]):'—'];
      for(const value of [...values,`${spec.price[i]} / ${total}`])row.append(node('td',value));
      if(!available){row.className='guide-locked';const lock=node('small',level.level===5&&kind==='archer'&&tier===4?'Wave 5':'Other maps');heading.append(lock);}
      if(selected?.kind===kind&&selected.level===tier){row.classList.add('guide-current');heading.append(node('small','Selected'));}
      body.append(row);
    }
    paragraph(section,`Available here now: tiers 1–${cap}. Cost is the price of this purchase / total gold invested. Upgrades add the listed cost; selling returns 60% of gold invested.`);
    if(kind==='barrack')paragraph(section,`Rally radius: ${spec.range[0]}. Idle recovery: ${SOLDIERS.militia.regen} / ${SOLDIERS.footmen.regen} / ${SOLDIERS.knight.regen} HP per second at tiers 1 / 2 / 3, after the idle delay. Upgrading restores soldier health.`);
    if(kind==='engineer')paragraph(section,'Fires every 3 seconds. Shell release takes about 0.33s, then flight takes 0.9s. These delays are part of the attack sequence, not extra time added to the firing interval.');
  }
  if(topic==='all'||topic==='powers'){
    const troops=card(parent,'⚑ Reinforcements'),farmer=SOLDIERS.farmer;
    paragraph(troops,`Free · ${POWERS.reinforcements.cooldown}s cooldown · ${POWERS.reinforcements.count} soldiers · ${POWERS.reinforcements.lifetime}s lifetime, or until killed.`);
    paragraph(troops,`Each soldier: ${farmer.hp} HP, ${damage(farmer.damage)} physical damage every ${number(farmer.cooldown)}s, ${farmer.armor*100}% armor. Recovers ${farmer.regen} HP per second while idle after the recovery delay. Place on a road to block ground enemies; cannot attack flying enemies.`);
    const fire=card(parent,'☄ Rain of Fire');
    paragraph(fire,`Free · ${POWERS.fire.cooldown}s cooldown · ${POWERS.fire.count} fireballs · ${POWERS.fire.minDamage}–${POWERS.fire.maxDamage} damage per fireball to every enemy hit · blast radius ${POWERS.fire.radius}.`);
    paragraph(fire,`Ignores physical armor and magic resistance. Hits ground and flying enemies. A target hit by all three takes ${POWERS.fire.count*POWERS.fire.minDamage}–${POWERS.fire.count*POWERS.fire.maxDamage} damage; scattered impacts can miss. There is no burning ground upgrade in this version.`);
    paragraph(fire,'Calling a wave early advances both power cooldowns by the remaining countdown. Southport unlocks reinforcements in wave 3 and Rain of Fire in wave 7; other maps unlock both when battle starts.');
    if(level.elfCamp){const elf=card(parent,'Silveroak elves'),spec=SOLDIERS.elf;paragraph(elf,`Repair the camp: 100 gold. Hire: 100 per elf, up to four living elves. Each has ${spec.hp} HP and ${damage(spec.damage)} physical melee/bow damage; melee every ${number(spec.cooldown)}s, bow every 1.5s. Bow range 204.8. Elves are not automatically replaced when killed.`);}
  }
}
