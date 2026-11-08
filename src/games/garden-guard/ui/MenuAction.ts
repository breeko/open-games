import Phaser from 'phaser';
import {audio} from '../audio/AudioManager';
interface MenuActionConfig {
  width:number;height:number;label?:string;detail?:string;
  texture?:string;highlight?:string;onClick:()=>void;fontSize?:number;color?:string;shadow?:string;
}
/** Selector-only control. Original artwork, crisp labels and full touch targets. */
export class MenuAction extends Phaser.GameObjects.Container {
  private readonly image?:Phaser.GameObjects.Image;
  private readonly label?:Phaser.GameObjects.Text;
  private readonly focus:Phaser.GameObjects.Rectangle;
  private focused=false;
  private hovered=false;
  constructor(scene:Phaser.Scene,x:number,y:number,private readonly config:MenuActionConfig){
    super(scene,x,y);scene.add.existing(this);
    if(config.texture){this.image=scene.add.image(0,0,config.texture);this.add(this.image);}
    this.focus=scene.add.rectangle(0,0,config.width,config.height,0xd5ed9b,0).setStrokeStyle(2,0xc9e777,0);this.add(this.focus);
    if(config.label){
      this.label=scene.add.text(0,config.detail?-9:0,config.label,{fontFamily:'Georgia, serif',fontSize:`${config.fontSize??27}px`,fontStyle:'bold',color:config.color??'#202134',resolution:2,shadow:{offsetX:0,offsetY:1,color:config.shadow??'#a2a3b2',fill:true,blur:0}}).setOrigin(.5);
      this.add(this.label);
    }
    if(config.detail)this.add(scene.add.text(0,24,config.detail,{fontFamily:'Arial, sans-serif',fontSize:'13px',color:'#303244',resolution:2}).setOrigin(.5));
    this.setSize(config.width,config.height).setInteractive({useHandCursor:true});
    this.on('pointerover',()=>{this.hovered=true;this.refresh();});
    this.on('pointerout',()=>{this.hovered=false;this.refresh();});
    this.on('pointerdown',(_p:Phaser.Input.Pointer,_x:number,_y:number,event:Phaser.Types.Input.EventData)=>{event.stopPropagation();this.trigger();});
  }
  trigger():void {audio.unlock();audio.sfx('click');this.config.onClick();}
  setFocused(value:boolean):void {this.focused=value;this.refresh();}
  setLabel(value:string):void {this.label?.setText(value);}
  private refresh():void {
    const lit=this.focused||this.hovered;
    if(this.image&&this.config.texture)this.image.setTexture(lit&&this.config.highlight?this.config.highlight:this.config.texture);
    this.label?.setColor(lit?'#c3ed70':this.config.color??'#202134').setShadow(0,1,lit?'#252b21':this.config.shadow??'#a2a3b2',0,false,true);
    // Pointer hover uses the art/lettering; the outline is reserved for keyboard.
    this.focus.setStrokeStyle(2,0xd7ef9e,this.focused ? 0.9 : 0);
  }
}
