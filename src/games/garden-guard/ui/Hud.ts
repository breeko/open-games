import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../constants';
import type { LevelDefinition } from '../levels';
import type { ResourceManager } from '../managers/ResourceManager';

/**
 * Heads-up display: sun counter, level + wave indicator, a control hint and a
 * transient banner used for "a huge wave is approaching!".
 */
export class Hud {
  private readonly sunText: Phaser.GameObjects.Text;
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly waveText: Phaser.GameObjects.Text;
  private readonly banner: Phaser.GameObjects.Text;

  private progressFill: Phaser.GameObjects.Rectangle;

  private playground=false;
  setPlayground():void {this.playground=true;this.sunText.setText('∞');this.levelText.setText('Playground');this.waveText.setText('PLAYGROUND');}
  private bannerTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, resources: ResourceManager, level: LevelDefinition) {
    // The bank's sun compartment is overlaid separately so its circular artwork
    // stays round when the eight-slot wooden tray stretches horizontally.
    const roomy=level.id<=2?1.3:1;
    scene.add.image(8,8,'seed-bank').setOrigin(0).setDisplaySize(928,139*roomy).setDepth(DEPTH.ui);
    scene.add.image(8,8,'SunBank').setOrigin(0).setDisplaySize(125*roomy,139*roomy).setDepth(DEPTH.ui+1);
    this.sunText=scene.add.text(8+62*roomy,8+111*roomy,(level.mode==='standard'||level.mode==='whack')?String(resources.sun):'—',{
      resolution:2,fontFamily:'Arial, sans-serif',fontSize:`${31*roomy}px`,fontStyle:'bold',color:'#201c13',
    }).setOrigin(0.5).setDepth(DEPTH.ui+2);
    const menuX=1102,menuY=6,menuWidth=170,menuHeight=64;
    scene.add.image(menuX,menuY,'button_left').setOrigin(0).setDisplaySize(40,menuHeight).setDepth(DEPTH.ui);
    scene.add.image(menuX+40,menuY,'button_middle').setOrigin(0).setDisplaySize(menuWidth-80,menuHeight).setDepth(DEPTH.ui);
    scene.add.image(menuX+menuWidth-40,menuY,'button_right').setOrigin(0).setDisplaySize(40,menuHeight).setDepth(DEPTH.ui);
    scene.add.text(menuX+menuWidth/2,menuY+menuHeight/2,'Menu',{
      resolution:2,fontFamily:'Georgia, serif',fontSize:'37px',fontStyle:'bold',color:'#57c82b',stroke:'#234524',strokeThickness:2,
    }).setOrigin(0.5).setDepth(DEPTH.ui+1);
    scene.add.zone(menuX+menuWidth/2,menuY+menuHeight/2,menuWidth,menuHeight).setDepth(DEPTH.ui+3)
      .setInteractive({useHandCursor:true}).on('pointerdown',(_p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();scene.game.events.emit('request-game-menu');});
    if(level.id>=5){
      scene.add.image(948,8,'ShovelBank').setOrigin(0).setDisplaySize(112,115).setDepth(DEPTH.ui);
      scene.add.image(1004,62,'Shovel_hi_res').setDisplaySize(78,84).setDepth(DEPTH.ui+1);
      scene.add.zone(1004,64,112,116).setDepth(DEPTH.ui+3).setInteractive({useHandCursor:true})
        .on('pointerdown',(_p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();scene.events.emit('shovel-request');});
    }
    this.levelText=scene.add.text(GAME_WIDTH-288,GAME_HEIGHT-24,`Level ${level.name}`,{
      resolution:2,fontFamily:'Georgia, serif',fontSize:'30px',fontStyle:'bold',color:'#e6c47d',stroke:'#2e201b',strokeThickness:5,
    }).setOrigin(1,0.5).setDepth(DEPTH.ui);
    this.waveText=scene.add.text(GAME_WIDTH-22,GAME_HEIGHT-60,'',{
      resolution:2,fontFamily:'Arial, sans-serif',fontSize:'16px',color:'#ecedcc',stroke:'#253620',strokeThickness:3,
    }).setOrigin(1,0.5).setDepth(DEPTH.ui);
    this.banner = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '30px',
        resolution:2,
        wordWrap: { width: 940 },
        align: 'center',
        color: '#ff6b6b',
        stroke: '#2b0f0f',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.banner)
      .setAlpha(0);

    const barX=GAME_WIDTH-272,barY=GAME_HEIGHT-26;
    const meter=scene.textures.get('FlagMeter');
    if(!meter.has('empty')){meter.add('empty',0,0,0,158,27);meter.add('full',0,0,27,158,27);}
    const parts=scene.textures.get('FlagMeterParts');
    if(!parts.has('head')){parts.add('head',0,0,0,25,25);parts.add('flag',0,50,0,25,25);}
    scene.add.image(barX,barY,'FlagMeter','empty').setOrigin(0,0.5).setDisplaySize(253,43).setDepth(DEPTH.ui);
    this.progressFill=scene.add.rectangle(barX+8,barY,0,10,0x86be42).setOrigin(0,0.5).setDepth(DEPTH.ui+1);
    scene.add.image(barX+6,barY-8,'FlagMeterParts','head').setDisplaySize(40,40).setDepth(DEPTH.ui+2);
    level.waves.forEach((wave,index)=>{
      if(wave.flag)scene.add.image(barX+12+((index+1)/level.waves.length)*228,barY-20,'FlagMeterParts','flag').setDisplaySize(30,30).setDepth(DEPTH.ui+2);
    });
    resources.on('changed', (sun: number) => {
      if (!this.playground&&(level.mode === 'standard'||level.mode==='whack')) this.sunText.setText(String(sun));
    });

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.bannerTimer?.remove());
  }

  setProgress(fraction: number): void { this.progressFill.width = 235 * fraction; }

  setWave(wave: number, total: number): void {
    if(this.playground)return;
    this.waveText.setText(`Wave ${wave} / ${total}`);
  }

  /** Big transient message, e.g. for flag waves. */
  announce(text: string, color = '#ff6b6b', holdMs = 2200): void {
    this.bannerTimer?.remove();

    this.banner.setText(text).setColor(color);

    this.banner.scene.tweens.killTweensOf(this.banner);
    this.banner.scene.tweens.add({
      targets: this.banner,
      alpha: 1,
      scaleX: { from: 0.8, to: 1 },
      scaleY: { from: 0.8, to: 1 },
      duration: 260,
      ease: 'Back.easeOut',
    });

    this.bannerTimer = this.banner.scene.time.delayedCall(holdMs, () => {
      this.banner.scene.tweens.add({ targets: this.banner, alpha: 0, duration: 320 });
    });
  }
}
