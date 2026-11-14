import {LEVELS,type LevelId} from './content';
import {starsForLives} from './upgrades';

// Early-campaign area of the 1920 × 1080 reference map. Nearby flags are
// slightly separated so their touch targets stay distinct on narrow screens.
const LOCATIONS:Readonly<Record<LevelId,{x:number;y:number;description:string}>>={
  1:{x:290,y:880,description:'Hold the harbor road. A first stand against the invasion.'},
  2:{x:335,y:660,description:'Defend the farms and keep the road to Southport open.'},
  3:{x:500,y:800,description:'Two roads converge. Build a defense that can hold them both.'},
  4:{x:600,y:560,description:'Guard both river crossings against healers and armored raiders.'},
  5:{x:230,y:430,description:'Stand with the woodland elves against the forest invasion.'},
  6:{x:360,y:210,description:'Defend the capital. The Juggernaut is marching on its gates.'},
};
interface CampaignMapOptions {
  current:LevelId;
  practice:boolean;
  bestLives:(level:LevelId)=>number;
  hasBattle:(level:LevelId)=>boolean;
  play:(level:LevelId)=>void;
}
export function renderCampaignMap(root:HTMLElement,options:CampaignMapOptions):void {
  root.replaceChildren();
  const world=document.createElement('div');world.className='campaign-world';
  const realm=document.createElement('div');realm.className='campaign-realm';
  const image=document.createElement('img');image.src='/games/kingdom-rush/assets/campaign/realm.webp';image.alt='';image.className='campaign-art';realm.append(image);
  const route=document.createElementNS('http://www.w3.org/2000/svg','svg');route.setAttribute('viewBox','0 0 800 960');route.classList.add('campaign-route');route.setAttribute('aria-hidden','true');
  const trail=document.createElementNS('http://www.w3.org/2000/svg','path');trail.setAttribute('d','M 290 880 Q 285 760 335 660 Q 435 680 500 800 Q 610 730 600 560 Q 470 450 230 430 Q 225 300 360 210');route.append(trail);realm.append(route);
  const legend=document.createElement('div');legend.className='campaign-legend';legend.innerHTML='<span>LINIREA</span><small>The southern campaign</small>';realm.append(legend);
  const preview=document.createElement('section');preview.className='campaign-preview';preview.setAttribute('aria-label','Selected battlefield');
  const markers:HTMLButtonElement[]=[];
  function select(id:LevelId):void {
    const level=LEVELS.find(level=>level.level===id);if(!level)return;
    const lives=options.bestLives(id),stars=starsForLives(lives),current=id===options.current;
    markers.forEach(marker=>marker.setAttribute('aria-pressed',String(marker.dataset.level===String(id))));
    preview.replaceChildren();
    const picture=document.createElement('img');picture.src=id===3?'/games/kingdom-rush/assets/pagras.png':`/games/kingdom-rush/assets/level${String(id).padStart(2,'0')}/background.png`;picture.alt='';
    const body=document.createElement('div');body.className='campaign-briefing';
    const chapter=document.createElement('p');chapter.className='campaign-chapter';chapter.textContent=`Battle ${id} · ${level.groups.length} waves`;
    const title=document.createElement('h3');title.textContent=level.title;
    const description=document.createElement('p');description.className='campaign-description';description.textContent=LOCATIONS[id].description;
    const record=document.createElement('p');record.className='campaign-record';record.textContent=lives>0?`${'★'.repeat(stars)}${'☆'.repeat(3-stars)}  Best defense: ${lives} lives`:'☆☆☆  A battlefield awaits';
    const play=document.createElement('button');play.className='campaign-play';play.textContent=current&&options.practice?'Return to campaign':options.hasBattle(id)?'Continue defense →':current?'Return to battlefield →':'To battle →';play.onclick=()=>options.play(id);
    body.append(chapter,title,description,record,play);preview.append(picture,body);
  }
  for(const level of LEVELS){
    const id=level.level,location=LOCATIONS[id],lives=options.bestLives(id),stars=starsForLives(lives);
    const marker=document.createElement('button');marker.className='campaign-marker';marker.dataset.level=String(id);marker.style.left=`${location.x/8}%`;marker.style.top=`${location.y/9.6}%`;
    marker.setAttribute('aria-label',`${level.title}, ${stars} of 3 stars`);if(id===options.current)marker.setAttribute('aria-current','location');
    const flag=document.createElement('img');flag.src='/games/kingdom-rush/assets/campaign/flag.png';flag.alt='';
    const number=document.createElement('span');number.className='campaign-number';number.textContent=String(id);
    const label=document.createElement('span');label.className='campaign-location';label.textContent=level.title;
    const score=document.createElement('span');score.className='campaign-stars';score.textContent='★'.repeat(stars)+'☆'.repeat(3-stars);score.setAttribute('aria-hidden','true');
    marker.append(flag,number,label,score);marker.onclick=()=>select(id);realm.append(marker);markers.push(marker);
  }
  world.append(realm);root.append(world,preview);select(options.current);
}
