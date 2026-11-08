import Phaser from 'phaser';
import {audio} from '../audio/AudioManager';
import {GAME_WIDTH} from '../constants';
import {TOTAL_LEVELS,getLevel} from '../levels';
import {progress} from '../state/progress';
import {settings} from '../state/settings';
import {MenuAction} from '../ui/MenuAction';

/** Static original selector composition, in its native 800 × 600 coordinates. */
export class MainMenuScene extends Phaser.Scene {
  private buttons:MenuAction[]=[];
  private focusIndex=-1;
  private musicButton!:MenuAction;
  private leaving=false;
  constructor(){super('menu');}
  create():void {
    this.buttons=[];this.focusIndex=-1;this.leaving=false;
    const root=this.add.container(0,0).setScale(GAME_WIDTH/800);
    const image=(key:string,x:number,y:number)=>{const im=this.add.image(x,y,'menu-'+key).setOrigin(0);root.add(im);return im;};
    image('sky',0,0).setDisplaySize(800,600);
    image('Cloud1',310,10).setScale(.6);
    image('Cloud2',660,26).setScale(.65);
    image('Cloud4',80,132).setScale(.65);
    image('BG_Center',80,250);
    image('BG_Left',0,-80);
    image('BG_Right',71,41);
    image('WoodSign1',23,-8);
    const text=(x:number,y:number,label:string,size:number,color:string,font='Georgia, serif')=>{
      const t=this.add.text(x,y,label,{fontFamily:font,fontSize:`${size}px`,fontStyle:'bold',color,resolution:2}).setOrigin(.5);root.add(t);return t;
    };
    text(168,103,'GARDEN GUARD',22,'#f0e4bd').setShadow(1,2,'#242418',2,true,true);
    text(164,165,`${progress.completedCount} OF ${TOTAL_LEVELS} LEVELS CLEARED`,13,'#d7e5b9','Arial, sans-serif');
    const add=(x:number,y:number,config:ConstructorParameters<typeof MenuAction>[3])=>{const button=new MenuAction(this,x,y,config);root.add(button);this.buttons.push(button);return button;};
    const go=(scene:string)=>()=>this.fadeTo(scene);
    add(570,125,{width:330,height:120,texture:'menu-Adventure_button',highlight:'menu-Adventure_highlight',onClick:()=>this.startAdventure()});
    root.add(this.add.rectangle(572,162,30,18,0x191a29));
    text(572,162,getLevel(progress.unlockedLevel).name,14,'#e6e5da','Arial, sans-serif');
    add(570,235,{width:280,height:64,label:'CHOOSE A LEVEL',detail:'Day lawns & night gardens',fontSize:25,onClick:go('levels')});
    add(565,315,{width:280,height:64,label:'ALMANAC',detail:'16 plants & their abilities',onClick:go('collection')});
    add(558,390,{width:265,height:64,label:'HOW TO PLAY',fontSize:25,onClick:go('help')});
    add(376,478,{width:106,height:108,texture:'menu-Almanac',highlight:'menu-AlmanacHighlight',onClick:go('collection')});
    // Original text assets line up with the three flowerpots in the background.
    add(606,491,{width:96,height:54,texture:'menu-Options1',highlight:'menu-Options2',onClick:go('settings')});
    add(671,510,{width:64,height:48,texture:'menu-Help1',highlight:'menu-Help2',onClick:go('help')});
    add(738,522,{width:62,height:48,texture:'menu-Quit1',highlight:'menu-Quit2',onClick:()=>window.location.assign('/')});
    this.musicButton=add(95,545,{width:132,height:36,label:'Music',fontSize:16,color:'#e0ddb4',shadow:'#23432c',onClick:()=>this.toggleMusic()});
    this.refreshMusic();
    add(220,545,{width:106,height:36,label:'‹ Game library',fontSize:14,color:'#e0ddb4',shadow:'#23432c',onClick:()=>window.location.assign('/')});
    text(170,582,'OPEN GAMES  ·  FREE TO PLAY  ·  NO ADS',10,'#bac9a7','Arial, sans-serif');
    this.input.keyboard?.on('keydown-UP',()=>this.moveFocus(-1));
    this.input.keyboard?.on('keydown-DOWN',()=>this.moveFocus(1));
    this.input.keyboard?.on('keydown-W',()=>this.moveFocus(-1));
    this.input.keyboard?.on('keydown-S',()=>this.moveFocus(1));
    this.input.keyboard?.on('keydown-ENTER',()=>this.buttons[Math.max(0,this.focusIndex)]?.trigger());
    this.input.keyboard?.on('keydown-SPACE',()=>this.buttons[Math.max(0,this.focusIndex)]?.trigger());
    this.input.keyboard?.on('keydown-M',()=>this.toggleMusic());
    this.input.on('pointerdown',()=>this.enableAudio());
    this.input.keyboard?.on('keydown',()=>this.enableAudio());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.input.removeAllListeners();this.input.keyboard?.removeAllListeners();});
    this.cameras.main.fadeIn(160);this.game.events.emit('assets-ready');
  }
  private enableAudio():void {audio.unlock();if(settings.current.music)audio.startMusic();}
  private toggleMusic():void {settings.toggle('music');if(settings.current.music)this.enableAudio();else audio.stopMusic();this.refreshMusic();}
  private refreshMusic():void {this.musicButton.setLabel(`Music: ${settings.current.music?'on':'off'}`);}
  private moveFocus(delta:number):void {
    this.buttons[this.focusIndex]?.setFocused(false);
    this.focusIndex=this.focusIndex<0?(delta>0?0:this.buttons.length-1):Phaser.Math.Wrap(this.focusIndex+delta,0,this.buttons.length);
    this.buttons[this.focusIndex]?.setFocused(true);
  }
  private startAdventure():void {this.fadeTo('seeds',{levelId:progress.unlockedLevel});}
  private fadeTo(key:string,data?:{levelId:number}):void {
    if(this.leaving)return;this.leaving=true;this.enableAudio();
    this.cameras.main.fadeOut(120);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,()=>this.scene.start(key,data));
  }
}
