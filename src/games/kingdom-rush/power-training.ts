import {POWER_UPGRADES,purchasePower,spentStars,type PowerBranch,type PowerLoadout} from './upgrades';

function text(parent:HTMLElement,tag:'p'|'h3'|'strong',value:string):void {const node=document.createElement(tag);node.textContent=value;parent.append(node);}
export function renderPowerTraining(parent:HTMLElement,options:{profile:PowerLoadout;active:PowerLoadout;earned:number;available:boolean;canChange:boolean;buy:(branch:PowerBranch)=>void;reset:()=>void}):void {
  parent.replaceChildren();parent.dataset.topic='training';const summary=document.createElement('section');summary.className='training-balance';parent.append(summary);
  const spent=spentStars(options.profile);text(summary,'strong',`★ ${options.earned} earned · ${spent} spent · ${Math.max(0,options.earned-spent)} available`);
  text(summary,'p','Earn 3 stars with 18–20 lives, 2 with 6–17, or 1 with 1–5. Each map keeps its best result. Upgrades are bought in order and shared across maps. Reset refunds all spent stars.');
  text(summary,'p',`This battle: Rain of Fire ${options.active.fire}/5 · Reinforcements ${options.active.reinforcements}/5. ${options.canChange?'Changes apply to this preparation and future battles.':'Finish or restart this battle to change its upgrades.'}`);
  if(!options.available)text(summary,'p','Upgrade records or completed results could not be read. They have been kept; purchases are unavailable until storage is accessible.');
  const reset=document.createElement('button');reset.textContent='Reset power upgrades';reset.disabled=!options.canChange||(options.available&&spent===0);reset.onclick=options.reset;summary.append(reset);
  const branches:PowerBranch[]=['fire','reinforcements'];
  for(const branch of branches){const section=document.createElement('section');section.className='guide-card';text(section,'h3',branch==='fire'?'☄ Rain of Fire':'⚑ Reinforcements');
    POWER_UPGRADES[branch].forEach((upgrade,i)=>{const row=document.createElement('div');row.className='training-row';text(row,'strong',`${i+1}. ${upgrade.name} · ★ ${upgrade.cost}`);text(row,'p',upgrade.description);
      if(i<options.profile[branch])text(row,'p','Purchased');
      else {const button=document.createElement('button');button.textContent=`Buy ${upgrade.name} · ★ ${upgrade.cost}`;button.disabled=!options.available||!options.canChange||i!==options.profile[branch]||purchasePower(options.profile,branch,options.earned)===null;button.onclick=()=>options.buy(branch);row.append(button);}section.append(row);
    });parent.append(section);
  }
}
