import './style.css';
import {renderCampaignMap} from './campaign-map';
import { maxTowerTier, distance, FPS, getLevel, LEVELS, TOWER_KINDS, TOWERS, type Point, type LevelId } from './content';
import { Renderer } from './render';
import {renderFieldGuide,towerName,towerSummary,type GuideTopic} from './field-guide';
import { Simulation } from './simulation';
import { gameStores,powerUpgradeStore } from './persistence';
import {SKILLS,SKILL_IDS,NO_POWER_UPGRADES,starsForLives,spentStars,purchasePower,powerLoadoutSchema,type PowerLoadout,type PowerBranch} from './upgrades';
import {preparePractice,type PracticePowers} from './practice';
import {renderPowerTraining} from './power-training';
import { startAutosave } from '../../shared/persistence/autosave';

function element<T extends HTMLElement>(id:string,kind:{new():T}):T {const node=document.getElementById(id);if(!(node instanceof kind))throw new Error(`Missing ${id}`);return node;}
const canvas=element('battlefield',HTMLCanvasElement),context=element('context',HTMLDivElement);
const pause=element('pause',HTMLButtonElement),speed=element('speed',HTMLButtonElement),next=element('next-wave',HTMLButtonElement);
const fire=element('fire',HTMLButtonElement),reinforce=element('reinforcements',HTMLButtonElement);
const gold=element('gold',HTMLElement),lives=element('lives',HTMLElement),wave=element('wave',HTMLElement),phase=element('phase-label',HTMLElement);
const fireTime=element('fire-time',HTMLElement),reinforceTime=element('reinforce-time',HTMLElement),debug=element('debug',HTMLInputElement);
const seedInput=element('seed',HTMLInputElement),message=element('message',HTMLDivElement),loading=element('loading',HTMLDivElement);
const requestedLevel=Number(new URL(location.href).searchParams.get('level')??3);
const currentLevel=getLevel(LEVELS.some(level=>level.level===requestedLevel)?requestedLevel:3);
document.title=`Kingdom Rush · ${currentLevel.title} — Open Games`;
element('level-title',HTMLElement).textContent=currentLevel.title;
element('game',HTMLElement).querySelector('.battle')?.setAttribute('aria-label',`${currentLevel.title} battlefield`);
const trainingStore=powerUpgradeStore(),savedTraining=trainingStore.read();
let trainingReadable=savedTraining.status==='valid'||savedTraining.status==='missing';
let powerProfile:PowerLoadout=savedTraining.status==='valid'?savedTraining.value:{...NO_POWER_UPGRADES};
let sim=new Simulation(undefined,currentLevel.level,powerProfile),renderer:Renderer,selected:number|null=null,mode:'none'|'rally'|'fire'|'reinforcements'='none',pointer:Point|null=null,multiplier:1|2=1;
let contextKey='',messageUntil=0,recorded=false;
const stores=gameStores(undefined,currentLevel.level),savedSession=stores.session.read();
const saveStatus=element('save-status',HTMLParagraphElement);
let savingEnabled=savedSession.status==='valid'||savedSession.status==='missing';
let finishedSessionCleared=false;
let terminalSaveAttempted=false;
if(savedSession.status==='valid') {
  sim=Simulation.restore(savedSession.value.battle);
  multiplier=savedSession.value.speed;seedInput.value=String(sim.seed);speed.textContent=`${multiplier}×`;
  saveStatus.textContent='Battle restored on this device. Resume when you’re ready.';
} else if(savedSession.status==='invalid') {
  saveStatus.textContent='Your saved battle could not be resumed. It has been kept. Choose Restart to replace it.';
} else if(savedSession.status==='unavailable') {
  saveStatus.textContent='Saving is unavailable. You can keep playing; choose Restart to try saving again.';
} else saveStatus.textContent='Your battle saves automatically on this device.';
function saveSession():void {
  if(sim.practice){setText(saveStatus,'Practice — completed records and your saved campaign battle are preserved.');return;}
  if(!savingEnabled||finishedSessionCleared)return;
  if(sim.phase==='won'||sim.phase==='lost') {
    const result=stores.session.clear();
    finishedSessionCleared=result.status==='cleared';
    setText(saveStatus,finishedSessionCleared?'Battle finished. Your completed record stays on this device.':'The finished battle could not be cleared from this device.');
    return;
  }
  try {
    const result=stores.session.write({version:1,savedAt:Date.now(),speed:multiplier,battle:sim.snapshot()});
    setText(saveStatus,result.status==='saved'?'Battle saved on this device.':result.status==='invalid'?'This battle could not be saved. Your previous save has been kept.':'Saving is unavailable. Your battle continues in this tab.');
  } catch {
    setText(saveStatus,'This battle could not be saved. Your previous save has been kept.');
  }
}
function setText(node:HTMLElement,text:string):void {if(node.textContent!==text)node.textContent=text;}
function notify(text:string):void {message.textContent=text;messageUntil=performance.now()+3000;message.classList.add('visible');}
function reset():void {if(sim.practice){startPractice();return;}const seed=Number(seedInput.value);sim=new Simulation(Number.isFinite(seed)?seed:0xc0ffee,currentLevel.level,powerProfile);selected=null;mode='none';pointer=null;contextKey='';recorded=false;accumulator=0;savingEnabled=true;finishedSessionCleared=false;terminalSaveAttempted=false;saveSession();}
function setMode(value:typeof mode):void {mode=mode===value?'none':value;contextKey='';if(mode==='rally')notify('Tap a nearby road to move your soldiers.');if(mode==='fire')notify('Tap the battlefield to call down fire.');if(mode==='reinforcements')notify('Tap a road to summon two reinforcements.');}
function renderContext():void {
  const tower=sim.towers.find(t=>t.id===selected),key=`${selected}/${tower?.kind}/${tower?.level}/${tower?.poison}/${tower?.thorns}/${tower?.deathRay}/${tower?.teleport}/${mode}/${sim.phase}/${sim.paused}/${sim.wave}/${sim.elfCampRepaired}/${sim.soldiers.filter(s=>s.kind==='elf'&&s.hp>0).length}`;
  if(key===contextKey){context.querySelectorAll<HTMLButtonElement>('button[data-price]').forEach(b=>b.disabled=b.dataset.unavailable==='true'||Number(b.dataset.price)>sim.gold||sim.paused||sim.phase==='won'||sim.phase==='lost');return;}
  contextKey=key;context.dataset.active=String(selected!==null||mode!=='none'||sim.phase==='won'||sim.phase==='lost');context.replaceChildren();
  const button=(label:string,action:()=>void,price?:number):HTMLButtonElement=>{const b=document.createElement('button');b.textContent=label;b.disabled=sim.paused||sim.phase==='won'||sim.phase==='lost';b.onclick=()=>{action();contextKey='';};if(price!==undefined)b.dataset.price=String(price);context.append(b);return b;};
  if(sim.phase==='won'||sim.phase==='lost') {const p=document.createElement('p');p.textContent=sim.phase==='won'?(sim.practice?`Practice cleared — ${sim.lives} lives saved. No stars awarded.`:`${currentLevel.title} defended! ★ ${starsForLives(sim.lives)}/3`):'Try another defense.';context.append(p);const b=document.createElement('button');b.textContent=sim.practice?'Return to campaign':sim.phase==='won'&&currentLevel.level<LEVELS.length?'Next map →':'Choose map';b.onclick=()=>{if(sim.practice){location.reload();return;}const nextLevel=LEVELS.find(level=>level.level===currentLevel.level+1);if(sim.phase==='won'&&nextLevel)goToMap(nextLevel.level);else openMaps();};context.append(b);return;}
  if(mode!=='none') {const p=document.createElement('p');p.textContent=mode==='rally'?'Choose a rally point':mode==='fire'?'Choose where the fire falls':'Choose a road for your troops';context.append(p);if(mode==='fire'||mode==='reinforcements'){const info=button('ⓘ Stats',()=>openGuide('powers'));info.disabled=false;}button('Cancel',()=>{mode='none';});return;}
  if(selected===currentLevel.elfCamp?.id){
    const label=document.createElement('span');label.className='tower-label';label.textContent='Sylvan elves';context.append(label);
    if(!sim.elfCampRepaired)button('Repair ◆ 100',()=>{sim.repairElves();},100);
    else {const live=sim.soldiers.filter(s=>s.kind==='elf'&&s.hp>0).length;const hire=button(`Hire elf ◆ 100 (${live}/4)`,()=>{sim.hireElf();},100);if(live>=4){hire.disabled=true;hire.dataset.unavailable='true';}button('Rally ⚑',()=>setMode('rally'));}
    button('Done',()=>{selected=null;});return;
  }
  if(selected!==null&&!tower){
    for(const kind of TOWER_KINDS){
      const b=button('',()=>{if(!sim.build(selected!,kind))notify('You need more gold.');},TOWERS[kind].price[0]);
      const icon=document.createElement('canvas');icon.width=140;icon.height=108;icon.setAttribute('aria-hidden','true');renderer.towerIcon(icon,kind);
      const name=document.createElement('span');name.textContent=TOWERS[kind].name;const cost=document.createElement('small');cost.textContent=`◆ ${TOWERS[kind].price[0]}`;b.append(icon,name,cost);b.setAttribute('aria-label',`Build ${TOWERS[kind].name}, ${TOWERS[kind].price[0]} gold`);b.title=towerSummary(kind,1);b.setAttribute('aria-description',towerSummary(kind,1));
    }
  } else if(tower){
    const label=document.createElement('span');label.className='tower-label';label.textContent=towerName(tower.kind,tower.level);context.append(label);
    const info=button('ⓘ Stats',()=>openGuide(tower.kind));info.disabled=false;info.title=towerSummary(tower.kind,tower.level);
    if(tower.level<maxTowerTier(currentLevel,tower.kind,sim.wave)){const upgrade=button(`Upgrade ◆ ${TOWERS[tower.kind].price[tower.level]}`,()=>{if(!sim.upgrade(tower.id))notify('You need more gold.');},TOWERS[tower.kind].price[tower.level]);upgrade.title=`Next: ${towerName(tower.kind,tower.level+1)} — ${towerSummary(tower.kind,tower.level+1)}`;upgrade.setAttribute('aria-description',upgrade.title);}
    if(tower.level===4)for(const skill of SKILL_IDS){const spec=SKILLS[skill];if(tower.kind!==spec.kind)continue;
      const rank=tower[skill],cost=spec.costs[rank],name=skill==='poison'?'Poison':skill==='thorns'?'Thorns':spec.name;
      const purchase=button(`${name} ${rank}/3${rank<3?` ◆ ${cost}`:''}`,()=>{if(!sim.buySkill(tower.id,skill))notify('You need more gold.');},rank<3?cost:undefined);
      purchase.title=spec.description;purchase.setAttribute('aria-label',rank<3?`Buy ${spec.name} rank ${rank+1}, ${cost} gold`:`${spec.name} fully upgraded`);purchase.className='skill-purchase';if(rank===3)purchase.disabled=true;
    }
    if(tower.kind==='barrack')button('Rally ⚑',()=>setMode('rally'));
    button(`Sell ◆ ${Math.floor(tower.spent*.6)}`,()=>{sim.sell(tower.id);});button('Done',()=>{selected=null;});
  } else {
    const p=document.createElement('p');p.textContent='Tap a foundation to build.';
    const small=document.createElement('small');small.textContent='Use barracks to stop enemies.';p.append(small);context.append(p);
  }
  context.querySelectorAll<HTMLButtonElement>('button[data-price]').forEach(b=>b.disabled=b.dataset.unavailable==='true'||Number(b.dataset.price)>sim.gold||sim.paused||sim.phase==='won'||sim.phase==='lost');
}
function updateHud():void {
  practiceReturn.hidden=!sim.practice;
  setText(gold,String(sim.gold));setText(lives,String(sim.lives));setText(wave,`${sim.practice?`Practice ★${spentStars(sim.powerUpgrades)} · `:''}${sim.wave} / ${currentLevel.groups.length}`);
  setText(pause,sim.paused?'Resume':'Pause');pause.dataset.icon=sim.paused?'▶':'Ⅱ';pause.setAttribute('aria-label',sim.paused?'Resume':'Pause');pause.disabled=sim.phase==='won'||sim.phase==='lost';
  fire.setAttribute('aria-pressed',String(mode==='fire'));reinforce.setAttribute('aria-pressed',String(mode==='reinforcements'));
  const fireWait=Math.max(0,Math.ceil((sim.fireReady-sim.tick)/FPS)),reinforceWait=Math.max(0,Math.ceil((sim.reinforcementsReady-sim.tick)/FPS));
  setText(fireTime,sim.phase==='ready'?'Start battle':fireWait?`${fireWait}s`:'Ready');setText(reinforceTime,sim.phase==='ready'?'Start battle':reinforceWait?`${reinforceWait}s`:'Ready');
  fireTime.dataset.short=sim.phase==='ready'?'—':fireTime.textContent??'';reinforceTime.dataset.short=sim.phase==='ready'?'—':reinforceTime.textContent??'';
  const stopped=sim.paused||sim.phase!=='running';const fireLocked=currentLevel.level===1&&sim.wave<7,reinforceLocked=currentLevel.level===1&&sim.wave<3;fire.disabled=fireWait>0||stopped||fireLocked;reinforce.disabled=reinforceWait>0||stopped||reinforceLocked;if(fireLocked){setText(fireTime,'Wave 7');fireTime.dataset.short='Wave 7';}if(reinforceLocked){setText(reinforceTime,'Wave 3');reinforceTime.dataset.short='Wave 3';}
  next.disabled=!sim.canCall||sim.paused;
  const label=sim.wave===0?'Start battle':sim.wave===currentLevel.groups.length?'Final wave':sim.canCall?'Call next wave':'Wave arriving';
  const detail=sim.wave===0?'Wave 1 →':sim.earlyReward>0?`+${sim.earlyReward} gold · ${Math.ceil(sim.nextIn)}s spell recharge`:sim.wave===currentLevel.groups.length?'Hold the road':`Wave ${sim.wave+1} →`;
  next.dataset.short=sim.wave===0?'▶':sim.wave===currentLevel.groups.length?'✓':sim.canCall?'▶':'⌛';next.setAttribute('aria-label',`${label}. ${detail}`);
  if(next.firstChild?.textContent!==label||next.lastChild?.textContent!==detail){next.replaceChildren(document.createTextNode(label));const sub=document.createElement('span');sub.textContent=detail;next.append(sub);}
  setText(phase,(sim.practice?'Practice · ':'')+(sim.paused?'Battle paused':sim.phase==='ready'?'Prepare your defenses':sim.phase==='won'?`${currentLevel.title} defended`:sim.phase==='lost'?'Defense broken':sim.canCall&&sim.nextIn>0?`Next wave in ${Math.ceil(sim.nextIn)}s`:'Hold the road'));
  renderContext();
  if(performance.now()>messageUntil)message.classList.remove('visible');
  if(!recorded&&sim.phase==='won'&&!sim.practice){
    recorded=true;
    const prior=stores.results.read();
    if(prior.status==='valid'||prior.status==='missing')stores.results.write(Math.max(prior.status==='valid'?prior.value:0,sim.lives));
    showBest();
  }
}
const guideDialog=element('guide-dialog',HTMLDialogElement),guideTopic=element('guide-topic',HTMLSelectElement),guideContent=element('guide-content',HTMLDivElement);
let resumeAfterGuide=false;
function refreshGuide():void {
  const value=guideTopic.value,kind=TOWER_KINDS.find(kind=>kind===value),topic:GuideTopic=kind??(value==='powers'?'powers':value==='training'?'training':'all');
  guideDialog.dataset.focused=String(topic!=='all'&&topic!=='powers'&&topic!=='training');
  if(topic==='training'){
    const results=LEVELS.map(level=>gameStores(undefined,level.level).results.read()),available=trainingReadable&&results.every(r=>r.status==='valid'||r.status==='missing');
    const earned=results.reduce((n,r)=>n+(r.status==='valid'?starsForLives(r.value):0),0);
    renderPowerTraining(guideContent,{profile:powerProfile,active:sim.powerUpgrades,earned,available,canChange:!sim.practice&&sim.phase==='ready'&&sim.wave===0,buy:branch=>changePowerProfile(branch,earned),reset:()=>savePowerProfile({...NO_POWER_UPGRADES})});
  }else renderFieldGuide(guideContent,topic,currentLevel,sim.wave,sim.towers.find(t=>t.id===selected),sim.powerUpgrades);
}
function savePowerProfile(profile:PowerLoadout):void {
  if(sim.practice||sim.phase!=='ready'||sim.wave!==0)return;
  const result=trainingStore.write(profile);if(result.status!=='saved'){notify('Power upgrades could not be saved. Your previous upgrades have been kept.');return;}
  trainingReadable=true;powerProfile=profile;sim.configurePowers(profile);saveSession();refreshGuide();updatePracticeBudget();
}
function changePowerProfile(branch:PowerBranch,earned:number):void {const next=purchasePower(powerProfile,branch,earned);if(next)savePowerProfile(next);}
function openGuide(topic:GuideTopic='all'):void {
  resumeAfterGuide=!sim.paused&&(sim.phase==='ready'||sim.phase==='running');
  if(resumeAfterGuide)sim.setPaused(true);accumulator=0;saveSession();guideTopic.value=topic;refreshGuide();guideDialog.showModal();guideDialog.scrollTop=0;
}
element('guide',HTMLButtonElement).onclick=()=>openGuide();
element('close-guide',HTMLButtonElement).onclick=()=>guideDialog.close();
guideTopic.onchange=refreshGuide;
guideDialog.addEventListener('close',()=>{if(resumeAfterGuide)sim.setPaused(false);resumeAfterGuide=false;accumulator=0;contextKey='';saveSession();});
const mapDialog=element('map-dialog',HTMLDialogElement);
let resumeAfterMaps=false;
mapDialog.addEventListener('close',()=>{if(resumeAfterMaps)sim.setPaused(false);resumeAfterMaps=false;accumulator=0;contextKey='';saveSession();});
function goToMap(level:LevelId):void {saveSession();const url=new URL(location.href);url.searchParams.set('level',String(level));location.assign(url);}
function openMaps():void {
  resumeAfterMaps=!sim.paused&&(sim.phase==='running'||sim.phase==='ready');
  if(resumeAfterMaps)sim.setPaused(true);accumulator=0;saveSession();
  renderCampaignMap(element('map-list',HTMLDivElement),{
    current:currentLevel.level,practice:sim.practice,
    bestLives:level=>{const result=gameStores(undefined,level).results.read();return result.status==='valid'?result.value:0;},
    hasBattle:level=>{const result=gameStores(undefined,level).session.read();return result.status==='valid'&&(result.value.battle.phase==='ready'||result.value.battle.phase==='running');},
    play:level=>{if(level===currentLevel.level&&!sim.practice){mapDialog.close();return;}goToMap(level);},
  });
  mapDialog.showModal();
}
element('campaign',HTMLButtonElement).onclick=openMaps;
element('close-maps',HTMLButtonElement).onclick=()=>mapDialog.close();
function showBest():void {
  const result=stores.results.read();
  element('best',HTMLElement).textContent=result.status==='valid'&&result.value>0?`Best defense on this device: ${result.value} lives remaining · ★ ${starsForLives(result.value)}/3.`:result.status==='invalid'?'Your previous completed record could not be read and has been kept.':result.status==='unavailable'?'Progress saving is unavailable in this browser.':'Progress stays on this device. Your best completed defense is saved separately from your current battle.';
}
function point(event:PointerEvent):Point {const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*1024/rect.width,y:(event.clientY-rect.top)*768/rect.height};}
canvas.addEventListener('pointermove',event=>{pointer=point(event);});
canvas.addEventListener('pointerleave',()=>{pointer=null;});
canvas.addEventListener('pointercancel',()=>{pointer=null;mode='none';contextKey='';});
canvas.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0)return;event.preventDefault();canvas.focus({preventScroll:true});const p=point(event);pointer=p;
  if(sim.paused||sim.phase==='won'||sim.phase==='lost')return;
  if(mode==='fire'||mode==='reinforcements'){if(sim.cast(mode,p)){mode='none';contextKey='';saveSession();}else notify(mode==='reinforcements'?'Choose a road for your reinforcements.':'That power is not ready.');return;}
  if(mode==='rally'){if(selected!==null&&sim.setRally(selected,p)){mode='none';contextKey='';saveSession();}else notify('Choose a road within the barracks’ range.');return;}
  const tower=sim.towers.filter(t=>Math.abs(t.x-p.x)<43&&p.y>=t.y-90&&p.y<t.y+18).sort((a,b)=>distance(a,p)-distance(b,p))[0];
  const sites=currentLevel.elfCamp?[...currentLevel.holders,currentLevel.elfCamp]:currentLevel.holders;
  const holder=sites.filter(h=>Math.abs(h.pos.x-p.x)<45&&Math.abs(h.pos.y-10-p.y)<30).sort((a,b)=>distance(a.pos,p)-distance(b.pos,p))[0];
  // Dense maps can put a foundation inside a neighboring tower's tall hit box.
  selected=holder&&(!tower||distance(holder.pos,p)<distance(tower,p))?holder.id:tower?.id??holder?.id??null;contextKey='';
});
pause.onclick=()=>{sim.setPaused(!sim.paused);accumulator=0;contextKey='';};
speed.onclick=()=>{multiplier=multiplier===1?2:1;speed.textContent=`${multiplier}×`;};
element('restart',HTMLButtonElement).onclick=reset;element('apply-seed',HTMLButtonElement).onclick=reset;
next.onclick=()=>{if(sim.callWave()){mode='none';contextKey='';}};
fire.onclick=()=>setMode('fire');reinforce.onclick=()=>setMode('reinforcements');
document.addEventListener('keydown',event=>{if(guideDialog.open||mapDialog.open||event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement)return;if(event.code==='Space'){event.preventDefault();if(sim.phase==='running'||sim.phase==='ready'){sim.setPaused(!sim.paused);saveSession();}}if(event.code==='Escape'){mode='none';selected=null;contextKey='';}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resumeAfterGuide=false;resumeAfterMaps=false;sim.setPaused(true);accumulator=0;contextKey='';}});
// Runs after button actions, including dynamically created build/upgrade controls.
document.addEventListener('click',event=>{if(event.target instanceof Element&&event.target.closest('button'))saveSession();});
element('export',HTMLButtonElement).onclick=()=>{const url=URL.createObjectURL(new Blob([sim.export()],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`level${currentLevel.level}-${sim.seed}-${sim.tick}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
let last=performance.now(),accumulator=0;
function frame(now:number):void {
  const elapsed=Math.min(.1,(now-last)/1000);last=now;
  if(!sim.paused&&sim.phase!=='won'&&sim.phase!=='lost'){
    accumulator+=elapsed*multiplier;
    while(accumulator>=1/FPS){sim.step();accumulator-=1/FPS;}
  } else accumulator=0;
  renderer.draw(sim,selected,mode,pointer,debug.checked);updateHud();
  if((sim.phase==='won'||sim.phase==='lost')&&!terminalSaveAttempted){terminalSaveAttempted=true;saveSession();}
  requestAnimationFrame(frame);
}
const autosave=startAutosave(saveSession);
import.meta.hot?.dispose(()=>{autosave.flush();autosave.stop();});
Renderer.create(canvas,currentLevel.level).then(r=>{renderer=r;loading.hidden=true;showBest();if(!new URL(location.href).searchParams.has('level'))openMaps();last=performance.now();requestAnimationFrame(frame);}).catch(error=>{loading.textContent=`The battlefield could not load. ${error instanceof Error?error.message:'Try reloading.'}`;});

const practiceWave=element('practice-wave',HTMLSelectElement);
for(let i=1;i<=currentLevel.groups.length;i++){const option=document.createElement('option');option.value=String(i);option.textContent=`Wave ${i}`;practiceWave.append(option);}
const customPractice=element('practice-custom',HTMLInputElement),practiceFire=element('practice-fire',HTMLSelectElement),practiceReinforcements=element('practice-reinforcements',HTMLSelectElement),practiceBudget=element('practice-budget',HTMLParagraphElement),practiceReturn=element('practice-return',HTMLButtonElement);
practiceReturn.onclick=()=>{if(sim.practice)location.reload();};
for(const select of [practiceFire,practiceReinforcements])for(let rank=0;rank<=5;rank++){const option=document.createElement('option');option.value=String(rank);option.textContent=`${rank}/5`;select.append(option);}
function practicePowers():PracticePowers {
  const parsed=powerLoadoutSchema.safeParse({fire:Number(practiceFire.value),reinforcements:Number(practiceReinforcements.value)});
  return customPractice.checked&&parsed.success?{kind:'custom',loadout:parsed.data}:{kind:'campaign'};
}
function updatePracticeBudget():void {
  practiceFire.disabled=practiceReinforcements.disabled=!customPractice.checked;
  const selected=practicePowers(),loadout=selected.kind==='custom'?selected.loadout:powerProfile;
  const spent=spentStars(loadout),priorMaximum=(currentLevel.level-1)*3;
  practiceBudget.textContent=`Practice powers: Fire ${loadout.fire}/5 · Reinforcements ${loadout.reinforcements}/5 · ★ ${spent} spent. First visit: up to ${priorMaximum} stars from earlier maps.${spent>priorMaximum?' This loadout exceeds that first-visit budget.':''} Practice awards no records or stars and preserves your campaign battle and upgrades.`;
}
customPractice.onchange=practiceFire.onchange=practiceReinforcements.onchange=updatePracticeBudget;
updatePracticeBudget();
function startPractice():void {
  const seed=Number(seedInput.value),practice=preparePractice(Number.isFinite(seed)?seed:0xc0ffee,currentLevel.level,Number(practiceWave.value),practicePowers(),powerProfile);
  if(!practice){notify('Choose a valid practice wave.');return;}
  saveSession();
  sim=practice;
  selected=null;mode='none';pointer=null;contextKey='';recorded=false;accumulator=0;savingEnabled=true;finishedSessionCleared=false;terminalSaveAttempted=false;saveSession();
}
element('practice-start',HTMLButtonElement).onclick=startPractice;
