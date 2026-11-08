import Phaser from 'phaser';
import {audio} from '../audio/AudioManager';
import {DEPTH,GAME_WIDTH,GAME_HEIGHT} from '../constants';
import type {Environment} from '../terrain';

export function menuLawn(scene:Phaser.Scene,environment:Environment):void {
 scene.add.image(GAME_WIDTH/2,GAME_HEIGHT/2,environment==='pool'?'pool':environment==='night'?'night':'lawn3').setDisplaySize(GAME_WIDTH,GAME_HEIGHT).setDepth(0);
 scene.add.rectangle(0,0,GAME_WIDTH,GAME_HEIGHT,0x102315,.62).setOrigin(0).setDepth(1);
}
export function menuPanel(scene:Phaser.Scene,x:number,y:number,width:number,height:number,paper=false):Phaser.GameObjects.Graphics {
 const g=scene.add.graphics().setDepth(DEPTH.ui-1);
 g.fillStyle(0x000000,.25).fillRoundedRect(x-width/2+4,y-height/2+7,width,height,18);
 g.fillStyle(paper?0xefe8c9:0x65402a,1).fillRoundedRect(x-width/2,y-height/2,width,height,18);
 g.lineStyle(5,paper?0x80633b:0x39271e).strokeRoundedRect(x-width/2,y-height/2,width,height,18);
 g.lineStyle(2,paper?0xfff7dc:0xb08047,.65).strokeRoundedRect(x-width/2+7,y-height/2+7,width-14,height-14,12);
 return g;
}
export function fitMenuArt<T extends Phaser.GameObjects.Image>(image:T,width:number,height:number):T {
 return image.setScale(Math.min(width/image.width,height/image.height));
}
/** Original three-piece stone artwork, with a separate readable label. */
export class MenuButton extends Phaser.GameObjects.Container {
 private readonly stones:Phaser.GameObjects.Image[]=[];
 private readonly label:Phaser.GameObjects.Text;
 private enabled=true;
 constructor(scene:Phaser.Scene,x:number,y:number,text:string,action:()=>void,primary=false,width=250){
  super(scene,x,y);scene.add.existing(this);this.setDepth(DEPTH.ui+2);
  const height=64,cap=height*36/46;
  for(const [key,px,w] of [['button_left',-width/2+cap/2,cap],['button_middle',0,width-cap*2],['button_right',width/2-cap/2,cap]] as const){
   const part=scene.add.image(px,0,key).setDisplaySize(w,height);this.stones.push(part);this.add(part);
  }
  this.label=scene.add.text(0,-1,text,{fontFamily:'Georgia, serif',fontStyle:'bold',fontSize:'27px',color:primary?'#e6ff9d':'#f6efd6',stroke:'#30352d',strokeThickness:3,resolution:2}).setOrigin(.5);this.add(this.label);
  this.setSize(width,height).setInteractive(new Phaser.Geom.Rectangle(0,0,width,height),Phaser.Geom.Rectangle.Contains);
  this.input!.cursor='pointer';
  this.on('pointerover',()=>{if(this.enabled)this.stones.forEach(s=>s.setTint(0xdbeac9));});
  this.on('pointerout',()=>this.stones.forEach(s=>s.clearTint()));
  this.on('pointerdown',(_p:Phaser.Input.Pointer,_x:number,_y:number,event:Phaser.Types.Input.EventData)=>{
   event.stopPropagation();if(!this.enabled)return;audio.unlock();audio.sfx('click');action();
  });
 }
 setEnabled(enabled:boolean):void {this.enabled=enabled;this.setAlpha(enabled?1:.45);}
}
