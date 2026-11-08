import { projectilePose } from './collision';
import rawVisuals from './reference/visuals.json';
import rawDecorations from './reference/decorations.json';
import { ASPECT, ENEMIES, SOLDIERS, TOWERS, type Point, type TowerKind } from './content';
import { Simulation, type Enemy, type Soldier, type Tower } from './simulation';

interface Frame { page:number; region:number[]; original:number[]; trim:number[] }
interface Animation { prefix:string; frames:number[]; fps?:number }
interface SpritePack { pages:number; frames:Record<string,Frame>; lookup:Record<string,string>; animations:Record<string,Animation> }
interface Sprite { name:string; prefix?:string; animated:boolean; anchor:Point; offset:Point; hidden?:boolean; alpha:number; loop:boolean; scale?:Point }
interface Decoration { template:string; pos:Point; 'render.sprites[1].name'?:string }
const VISUALS:Record<string,Sprite[]>=rawVisuals;
const DECORATIONS:Decoration[]=rawDecorations;
const ROOT='/games/kingdom-rush/assets/';
const loadImage=(url:string):Promise<HTMLImageElement>=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error(`Could not load ${url}`));i.src=url;});

export class Renderer {
  private spriteAspect=1;
  private visuals:Record<string,Sprite[]>=VISUALS;
  private decorations:Decoration[]=DECORATIONS;
  private constructor(readonly canvas:HTMLCanvasElement,readonly ctx:CanvasRenderingContext2D,private pack:SpritePack,private sheets:HTMLImageElement[],private background:HTMLImageElement) {}
  static async create(canvas:HTMLCanvasElement,level=3):Promise<Renderer> {
    const root=level===3?ROOT:ROOT+`level${String(level).padStart(2,'0')}/`;
    const response=await fetch(root+'sprites.json');if(!response.ok)throw new Error('Could not load sprite metadata');
    const pack:SpritePack=await response.json();
    const [background,...sheets]=await Promise.all([loadImage(root+(level===3?'pagras.png':'background.png')),...Array.from({length:pack.pages},(_,i)=>loadImage(root+`sprites-${i}.png`))]);
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas is unavailable');
    const renderer=new Renderer(canvas,ctx,pack,sheets,background);
    if(level!==3){const response=await fetch(root+'scene.json');if(!response.ok)throw new Error('Could not load map scenery');const scene:{visuals:Record<string,Sprite[]>;decorations:Decoration[]}=await response.json();renderer.visuals=scene.visuals;renderer.decorations=scene.decorations;}
    return renderer;
  }
  private frame(name:string):Frame|undefined {return this.pack.frames[this.pack.lookup[name]??name];}
  private frameName(prefix:string,name:string,ticks:number,loop=true):string {
    const animation=this.pack.animations[prefix?`${prefix}_${name}`:name];
    if(!animation)return name.replace('%04i','0001');
    const index=Math.max(0,Math.floor(ticks*(animation.fps??30)/30));
    const number=animation.frames[loop?index%animation.frames.length:Math.min(index,animation.frames.length-1)];
    return `${animation.prefix}_${String(number).padStart(4,'0')}`;
  }
  private sprite(name:string,p:Point,anchor:Point={x:.5,y:.5},flip=false,alpha=1,scale=1):void {
    const f=this.frame(name);if(!f)return;
    const [x,y,w,h]=f.region;const ctx=this.ctx;
    ctx.save();ctx.translate(p.x,p.y);ctx.scale((flip?-scale:scale)*this.spriteAspect,scale);ctx.globalAlpha=alpha;
    ctx.drawImage(this.sheets[f.page],x,y,w,h,-anchor.x*f.original[0]+f.trim[0],-(1-anchor.y)*f.original[1]+f.trim[1],w,h);ctx.restore();
  }
  private template(name:string,p:Point,age:number,animation?:string,flip=false,alpha=1,override?:string,attackAge=Infinity,up=false,shots=0):void {
    const sprites=this.visuals[name]??[];
    sprites.forEach((s,i)=>{
      if(s.hidden)return;
      const shooter=s.prefix?.startsWith('shooter')||s.prefix==='tower_ranger_shooter'||s.prefix==='tower_arcane_wizard_shooter';
      let action=animation??s.name;
      let ticks=age;
      if(attackAge<(name==='tower_arcane_wizard'?38:24)&&s.prefix&&(shooter||s.prefix.startsWith('towerengineer')||s.prefix.startsWith('towermage'))){
        action=shooter?(up?'shootingUp':'shootingDown'):'shoot';ticks=attackAge;
        if((name.startsWith('tower_archer')||name==='tower_ranger')&&i>=2&&i!==(shots%2===0?2:3)){action=up?'idleUp':'idleDown';ticks=age;}
      } else if(shooter)action=up?'idleUp':'idleDown';
      const frame=override??(s.animated?this.frameName(s.prefix??'',action,ticks,s.loop&&animation!=='death'&&animation!=='attack'):s.name.replace('%04i','0001'));
      this.sprite(frame,{x:p.x+s.offset.x,y:p.y-s.offset.y},s.anchor,flip,alpha*(s.alpha/255));
    });
  }
  towerIcon(canvas:HTMLCanvasElement,kind:TowerKind):void {
    const ctx=canvas.getContext('2d');if(!ctx)return;
    // Draw using the same renderer without constructing a second game/engine.
    const icon=new Renderer(canvas,ctx,this.pack,this.sheets,this.background);icon.visuals=this.visuals;
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(canvas.width/2,canvas.height-12);ctx.scale(.65,.65);
    icon.template(`tower_${kind}_1`,{x:0,y:0},0);ctx.restore();
  }
  private health(p:Point,hp:number,max:number,offset:number):void {
    if(hp>=max)return;const c=this.ctx,w=max>=500?38:25;
    c.fillStyle='#16211a';c.fillRect(p.x-w/2-1,p.y-offset-1,w+2,5);c.fillStyle=hp/max>.35?'#78cf46':'#ef6b44';c.fillRect(p.x-w/2,p.y-offset,w*hp/max,3);
  }
  private enemy(e:Enemy,sim:Simulation):void {
    if(e.escaped||e.deadAt>=0&&sim.tick-e.deadAt>60)return;
    const spec=ENEMIES[e.kind],dead=e.hp===0;
    this.template(spec.template,e,sim.tick-e.animAt,e.animation,e.facing<0,dead?Math.min(1,(60-(sim.tick-e.deadAt))/20):1);
    if(!dead)this.health(e,e.hp,e.maxHp,e.kind==='juggernaut'?120:e.kind==='gargoyle'?78:e.kind==='ogre'||e.kind==='marauder'?55:34);
  }
  private soldier(s:Soldier,sim:Simulation):void {
    if(s.hp===0&&sim.tick-s.deadAt>45)return;
    const bowAge=sim.tick-(s.nextShot-45),bow=s.kind==='elf'&&bowAge>=0&&bowAge<15;
    this.template(SOLDIERS[s.kind].template,s,bow?bowAge:sim.tick-s.animAt,bow?'shoot':s.animation,s.facing<0,s.hp===0?Math.min(1,(45-(sim.tick-s.deadAt))/15):1);
    if(s.hp>0)this.health(s,s.hp,SOLDIERS[s.kind].hp,30);
  }
  draw(sim:Simulation,selected:number|null,mode:'none'|'rally'|'fire'|'reinforcements',pointer:Point|null,debug=false):void {
    const c=this.ctx,dpr=Math.min(1.5,window.devicePixelRatio||1);
    const width=Math.max(1,Math.round(this.canvas.clientWidth*dpr)),height=Math.max(1,Math.round(this.canvas.clientHeight*dpr));
    if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
    this.spriteAspect=Math.min(1,(height/768)/(width/1024));
    c.setTransform(width/1024,0,0,height/768,0,0);c.clearRect(0,0,1024,768);c.drawImage(this.background,0,0,1024,768);
    for(const d of this.decorations)this.template(d.template,{x:d.pos.x,y:768-d.pos.y},sim.tick,undefined,false,1,d['render.sprites[1].name']?this.frameName('',d['render.sprites[1].name'],sim.tick):undefined);
    if(debug){c.lineWidth=2;sim.level.paths.forEach((route,i)=>{c.strokeStyle=i===0?'#ffd158':'#b2eaff';c.beginPath();route.lanes[0].forEach((p,j)=>j===0?c.moveTo(p.x,p.y):c.lineTo(p.x,p.y));c.stroke();});}
    const camp=sim.level.elfCamp;if(camp)this.template(sim.elfCampRepaired?'tower_elf':'tower_elf_holder',camp.pos,sim.tick);
    const t=sim.towers.find(t=>t.id===selected);
    if(t){c.fillStyle='rgba(205,241,130,.12)';c.strokeStyle='#f9e4a0';c.lineWidth=2;c.setLineDash([6,4]);c.beginPath();c.ellipse(t.x,t.y-12,TOWERS[t.kind].range[t.level-1],TOWERS[t.kind].range[t.level-1]*ASPECT,0,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);}
    for(const h of sim.level.holders){
      if(!sim.towers.some(t=>t.id===h.id))this.template('tower_holder_grass',h.pos,0);
      if(h.id===selected){c.strokeStyle='#ffe6a0';c.lineWidth=3;c.beginPath();c.ellipse(h.pos.x,h.pos.y-8,42,24,0,0,Math.PI*2);c.stroke();}
      if(debug){c.fillStyle='#fff';c.font='bold 13px sans-serif';c.fillText(String(h.id),h.pos.x-4,h.pos.y+16);}
    }
    const objects:({kind:'tower';value:Tower}|{kind:'enemy';value:Enemy}|{kind:'soldier';value:Soldier})[]=[...sim.towers.map(value=>({kind:'tower' as const,value})),...sim.enemies.map(value=>({kind:'enemy' as const,value})),...sim.soldiers.filter(s=>sim.tick>=s.activeAt).map(value=>({kind:'soldier' as const,value}))];
    objects.sort((a,b)=>a.value.y-b.value.y);
    for(const object of objects){
      switch(object.kind){
        case 'tower':{const tower=object.value;this.template(tower.kind==='mage'&&tower.level===4?'tower_arcane_wizard':tower.kind==='archer'&&tower.level===4?'tower_ranger':`tower_${tower.kind}_${tower.level}`,tower,sim.tick,undefined,false,1,undefined,sim.tick-tower.animAt,tower.target.y<tower.y,tower.shots);break;}
        case 'enemy':this.enemy(object.value,sim);break;
        case 'soldier':this.soldier(object.value,sim);break;
      }
    }
    const rally=t?.kind==='barrack'?t.rally:camp?.id===selected&&sim.elfCampRepaired?(sim.elfRally??camp.rally):null;
    if(rally){
      c.strokeStyle='#f4e39a';c.lineWidth=2;c.beginPath();c.moveTo(rally.x,rally.y);c.lineTo(rally.x,rally.y-28);c.stroke();c.fillStyle='#6da9d7';c.beginPath();c.moveTo(rally.x,rally.y-28);c.lineTo(rally.x+20,rally.y-23);c.lineTo(rally.x,rally.y-16);c.fill();
    }
    for(const p of sim.projectiles){
      if(sim.tick<p.start)continue;
      if(p.beam!==undefined){c.strokeStyle='#df95ff';c.lineWidth=5;c.beginPath();c.moveTo(p.from.x,p.from.y);c.lineTo(p.to.x,p.to.y);c.stroke();continue;}
      const {x,y,angle}=projectilePose(p,sim.tick);
      c.save();c.translate(x,y);
      if(p.kind==='physical'){c.rotate(angle);c.strokeStyle='#3b281a';c.lineWidth=2;c.beginPath();c.moveTo(-7,0);c.lineTo(7,0);c.stroke();}
      else {c.shadowColor=p.kind==='magic'?'#71d7ff':'#ff8b3f';c.shadowBlur=10;c.fillStyle=p.kind==='magic'?'#aff6ff':p.kind==='true'?'#ffb54e':'#333535';c.beginPath();c.arc(0,0,p.kind==='true'?10:5,0,Math.PI*2);c.fill();}
      c.restore();
    }
    for(const shot of sim.hostileProjectiles){c.fillStyle=shot.kind==='arrow'?'#d2a173':shot.kind==='missile'?'#ef804a':'#8d9c82';c.beginPath();c.arc(shot.position.x,shot.position.y,shot.kind==='arrow'?3:8,0,Math.PI*2);c.fill();}
    for(const effect of sim.effects){if(effect.type==='egg'){this.template('enemy_spider_egg',effect,sim.tick-effect.start);continue;}const fraction=(sim.tick-effect.start)/effect.duration;c.globalAlpha=1-fraction;c.strokeStyle=effect.type==='heal'?'#95f979':effect.type==='fire'?'#ffc36a':'#e7d5ac';c.lineWidth=effect.type==='fire'?7:3;c.beginPath();c.ellipse(effect.x,effect.y,effect.radius*(.3+fraction*.7),effect.radius*ASPECT*(.3+fraction*.7),0,0,Math.PI*2);c.stroke();c.globalAlpha=1;}
    if(pointer&&mode!=='none'){c.fillStyle=mode==='fire'?'rgba(255,111,53,.2)':'rgba(149,217,237,.25)';c.strokeStyle=mode==='fire'?'#ffd09d':'#cbf4ff';c.lineWidth=2;c.beginPath();c.ellipse(pointer.x,pointer.y,mode==='fire'?60:35,(mode==='fire'?60:35)*ASPECT,0,0,Math.PI*2);c.fill();c.stroke();}
    if(sim.paused||sim.phase==='won'||sim.phase==='lost'){
      c.fillStyle='rgba(20,30,22,.68)';c.fillRect(0,0,1024,768);c.save();c.translate(512,0);c.scale(this.spriteAspect,1);c.textAlign='center';c.fillStyle='#fff1c8';c.font='bold 56px Georgia';c.fillText(sim.paused?'Paused':sim.phase==='won'?'Victory!':'The road has fallen',0,350);c.font='23px Georgia';c.fillText(sim.paused?'Resume when you’re ready.':sim.phase==='won'?`${sim.lives} lives saved · ${sim.kills} enemies defeated`:'Try a different defense. Barracks buy your towers time.',0,398);c.restore();
    }
  }
}
