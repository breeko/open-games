import './style.css';
import { distance, FPS, LEVEL, TOWER_KINDS, TOWERS, type Point } from './content';
import { Renderer } from './render';
import { Simulation } from './simulation';
import { gameStores } from './persistence';
import { startAutosave } from '../../shared/persistence/autosave';

function element<T extends HTMLElement>(id:string,kind:{new():T}):T {const node=document.getElementById(id);if(!(node instanceof kind))throw new Error(`Missing ${id}`);return node;}
const canvas=element('battlefield',HTMLCanvasElement),context=element('context',HTMLDivElement);
const pause=element('pause',HTMLButtonElement),speed=element('speed',HTMLButtonElement),next=element('next-wave',HTMLButtonElement);
const fire=element('fire',HTMLButtonElement),reinforce=element('reinforcements',HTMLButtonElement);
const gold=element('gold',HTMLElement),lives=element('lives',HTMLElement),wave=element('wave',HTMLElement),phase=element('phase-label',HTMLElement);
const fireTime=element('fire-time',HTMLElement),reinforceTime=element('reinforce-time',HTMLElement),debug=element('debug',HTMLInputElement);
const seedInput=element('seed',HTMLInputElement),message=element('message',HTMLDivElement),loading=element('loading',HTMLDivElement);
let sim=new Simulation(),renderer:Renderer,selected:number|null=null,mode:'none'|'rally'|'fire'|'reinforcements'='none',pointer:Point|null=null,multiplier:1|2=1;
let contextKey='',messageUntil=0,recorded=false;
const stores=gameStores(),savedSession=stores.session.read();
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
function reset():void {const seed=Number(seedInput.value);sim=new Simulation(Number.isFinite(seed)?seed:0xc0ffee);selected=null;mode='none';pointer=null;contextKey='';recorded=false;accumulator=0;savingEnabled=true;finishedSessionCleared=false;terminalSaveAttempted=false;saveSession();}
function setMode(value:typeof mode):void {mode=mode===value?'none':value;contextKey='';if(mode==='rally')notify('Tap a nearby road to move your soldiers.');if(mode==='fire')notify('Tap the battlefield to call down fire.');if(mode==='reinforcements')notify('Tap a road to summon two reinforcements.');}
function renderContext():void {
  const tower=sim.towers.find(t=>t.id===selected),key=`${selected}/${tower?.kind}/${tower?.level}/${mode}/${sim.phase}/${sim.paused}`;
  if(key===contextKey){context.querySelectorAll<HTMLButtonElement>('button[data-price]').forEach(b=>b.disabled=Number(b.dataset.price)>sim.gold||sim.paused||sim.phase==='won'||sim.phase==='lost');return;}
  contextKey=key;context.replaceChildren();
  const button=(label:string,action:()=>void,price?:number):HTMLButtonElement=>{const b=document.createElement('button');b.textContent=label;b.disabled=sim.paused||sim.phase==='won'||sim.phase==='lost';b.onclick=()=>{action();contextKey='';};if(price!==undefined)b.dataset.price=String(price);context.append(b);return b;};
  if(mode!=='none') {const p=document.createElement('p');p.textContent=mode==='rally'?'Choose a rally point':mode==='fire'?'Choose where the fire falls':'Choose a road for your troops';context.append(p);button('Cancel',()=>{mode='none';});return;}
  if(selected!==null&&!tower){
    for(const kind of TOWER_KINDS){
      const b=button('',()=>{if(!sim.build(selected!,kind))notify('You need more gold.');},TOWERS[kind].price[0]);
      const icon=document.createElement('canvas');icon.width=140;icon.height=108;icon.setAttribute('aria-hidden','true');renderer.towerIcon(icon,kind);
      const name=document.createElement('span');name.textContent=TOWERS[kind].name;const cost=document.createElement('small');cost.textContent=`◆ ${TOWERS[kind].price[0]}`;b.append(icon,name,cost);b.setAttribute('aria-label',`Build ${TOWERS[kind].name}, ${TOWERS[kind].price[0]} gold`);
    }
  } else if(tower){
    const label=document.createElement('span');label.className='tower-label';label.textContent=`${TOWERS[tower.kind].name} · ${tower.level}`;context.append(label);
    if(tower.level<2)button(`Upgrade ◆ ${TOWERS[tower.kind].price[1]}`,()=>{if(!sim.upgrade(tower.id))notify('You need more gold.');},TOWERS[tower.kind].price[1]);
    if(tower.kind==='barrack')button('Rally ⚑',()=>setMode('rally'));
    button(`Sell ◆ ${Math.floor(tower.spent*.6)}`,()=>{sim.sell(tower.id);});button('Done',()=>{selected=null;});
  } else {
    const p=document.createElement('p');p.textContent=sim.phase==='won'?'Pagras is safe.':sim.phase==='lost'?'A different defense could hold the road.':'Tap a foundation to build.';
    const small=document.createElement('small');small.textContent=sim.phase==='won'||sim.phase==='lost'?'Restart to try another strategy.':'Hold both roads. Use barracks to stop enemies.';p.append(small);context.append(p);
  }
  context.querySelectorAll<HTMLButtonElement>('button[data-price]').forEach(b=>b.disabled=Number(b.dataset.price)>sim.gold||sim.paused||sim.phase==='won'||sim.phase==='lost');
}
function updateHud():void {
  setText(gold,String(sim.gold));setText(lives,String(sim.lives));setText(wave,`${sim.wave} / ${LEVEL.groups.length}`);
  setText(pause,sim.paused?'Resume':'Pause');pause.disabled=sim.phase==='won'||sim.phase==='lost';
  fire.setAttribute('aria-pressed',String(mode==='fire'));reinforce.setAttribute('aria-pressed',String(mode==='reinforcements'));
  const fireWait=Math.max(0,Math.ceil((sim.fireReady-sim.tick)/FPS)),reinforceWait=Math.max(0,Math.ceil((sim.reinforcementsReady-sim.tick)/FPS));
  setText(fireTime,sim.phase==='ready'?'Start battle':fireWait?`${fireWait}s`:'Ready');setText(reinforceTime,sim.phase==='ready'?'Start battle':reinforceWait?`${reinforceWait}s`:'Ready');
  const stopped=sim.paused||sim.phase!=='running';fire.disabled=fireWait>0||stopped;reinforce.disabled=reinforceWait>0||stopped;
  next.disabled=!sim.canCall||sim.paused;
  const label=sim.wave===0?'Start battle':sim.wave===LEVEL.groups.length?'Final wave':sim.canCall?'Call next wave':'Wave arriving';
  const detail=sim.wave===0?'Wave 1 →':sim.earlyReward>0?`+${sim.earlyReward} gold · ${Math.ceil(sim.nextIn)}s spell recharge`:sim.wave===LEVEL.groups.length?'Hold the road':`Wave ${sim.wave+1} →`;
  if(next.firstChild?.textContent!==label||next.lastChild?.textContent!==detail){next.replaceChildren(document.createTextNode(label));const sub=document.createElement('span');sub.textContent=detail;next.append(sub);}
  setText(phase,sim.paused?'Battle paused':sim.phase==='ready'?'Prepare your defenses':sim.phase==='won'?'Pagras defended':sim.phase==='lost'?'Defense broken':sim.canCall&&sim.nextIn>0?`Next wave in ${Math.ceil(sim.nextIn)}s`:'Hold the road');
  renderContext();
  if(performance.now()>messageUntil)message.classList.remove('visible');
  if(!recorded&&sim.phase==='won'){
    recorded=true;
    const prior=stores.results.read();
    if(prior.status==='valid'||prior.status==='missing')stores.results.write(Math.max(prior.status==='valid'?prior.value:0,sim.lives));
    showBest();
  }
}
function showBest():void {
  const result=stores.results.read();
  element('best',HTMLElement).textContent=result.status==='valid'&&result.value>0?`Best defense on this device: ${result.value} lives remaining.`:result.status==='invalid'?'Your previous completed record could not be read and has been kept.':result.status==='unavailable'?'Progress saving is unavailable in this browser.':'Progress stays on this device. Your best completed defense is saved separately from your current battle.';
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
  const holder=LEVEL.holders.filter(h=>Math.abs(h.pos.x-p.x)<45&&Math.abs(h.pos.y-10-p.y)<30).sort((a,b)=>distance(a.pos,p)-distance(b.pos,p))[0];
  selected=tower?.id??holder?.id??null;contextKey='';
});
pause.onclick=()=>{sim.setPaused(!sim.paused);accumulator=0;contextKey='';};
speed.onclick=()=>{multiplier=multiplier===1?2:1;speed.textContent=`${multiplier}×`;};
element('restart',HTMLButtonElement).onclick=reset;element('apply-seed',HTMLButtonElement).onclick=reset;
next.onclick=()=>{if(sim.callWave()){mode='none';contextKey='';}};
fire.onclick=()=>setMode('fire');reinforce.onclick=()=>setMode('reinforcements');
document.addEventListener('keydown',event=>{if(event.target instanceof HTMLInputElement)return;if(event.code==='Space'){event.preventDefault();if(sim.phase==='running'||sim.phase==='ready'){sim.setPaused(!sim.paused);saveSession();}}if(event.code==='Escape'){mode='none';selected=null;contextKey='';}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){sim.setPaused(true);accumulator=0;contextKey='';}});
// Runs after button actions, including dynamically created build/upgrade controls.
document.addEventListener('click',event=>{if(event.target instanceof Element&&event.target.closest('button'))saveSession();});
element('export',HTMLButtonElement).onclick=()=>{const url=URL.createObjectURL(new Blob([sim.export()],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`pagras-${sim.seed}-${sim.tick}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
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
Renderer.create(canvas).then(r=>{renderer=r;loading.hidden=true;showBest();last=performance.now();requestAnimationFrame(frame);}).catch(error=>{loading.textContent=`The battlefield could not load. ${error instanceof Error?error.message:'Try reloading.'}`;});
