import Phaser from 'phaser';
import { ART_SCALE } from '../art';
import { audio } from '../audio/AudioManager';
import { DEPTH } from '../constants';
import { settings } from '../state/settings';
import { SunPickup } from '../sun-pickup';

/** Suns remain visible while falling, then may be tapped or collected automatically. */
export class Sun extends Phaser.GameObjects.Image {
  private readonly pickup = new SunPickup();
  private expiry?: Phaser.Time.TimerEvent;
  private readonly fall:Phaser.Tweens.Tween;
  private readonly automaticFallScale:number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly value: number,
    private readonly onCollect: (value: number) => void,
    targetY?: number,
    private readonly bank: Readonly<{x:number; y:number}> = {x:70,y:60},
  ) {
    super(scene, x, y, 'sun');
    scene.add.existing(this);
    this.setScale(ART_SCALE).setDepth(DEPTH.sun);
    this.setInteractive(new Phaser.Geom.Circle(this.width / 2, this.height / 2, 112), Phaser.Geom.Circle.Contains);
    this.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (this.pickup.collect()) this.flyToBank();
    });
    this.automaticFallScale=targetY===undefined?1400/700:6500/1800;
    this.fall=scene.tweens.add({
      targets: this,
      y: targetY ?? y + 26,
      duration: targetY === undefined ? 1400 : 6500,
      ease: 'Sine.easeOut',
      onComplete: () => this.pickup.land(),
    });
    this.fall.setTimeScale(settings.current.autoCollectSuns?this.automaticFallScale:1);
    scene.tweens.add({targets:this,angle:{from:-8,to:8},duration:900,yoyo:true,repeat:-1});
    this.expiry = scene.time.delayedCall(targetY === undefined ? 12000 : 18000, () => {
      if (!this.pickup.expire()) return;
      this.disableInteractive();
      scene.tweens.killTweensOf(this);
      scene.tweens.add({targets:this,alpha:0,duration:200,onComplete:()=>this.destroy()});
    });
    // Scene updates and tweens both stop during pause. Existing suns respond to
    // preference changes without recreating a level or restarting their fall.
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.updatePickup, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.updatePickup, this);
      this.expiry?.remove();
      scene.tweens.killTweensOf(this);
    });
  }

  get sunValue(): number { return this.value; }

  private updatePickup(_time:number,delta:number):void {
    this.fall.setTimeScale(settings.current.autoCollectSuns?this.automaticFallScale:1);
    if(this.pickup.advance(delta,settings.current.autoCollectSuns))this.flyToBank();
  }

  private flyToBank():void {
    this.disableInteractive();
    this.expiry?.remove();
    this.scene.tweens.killTweensOf(this);
    this.setDepth(DEPTH.ui+4);
    this.scene.tweens.add({
      targets:this,x:this.bank.x,y:this.bank.y,scale:ART_SCALE*0.45,angle:0,
      duration:300,ease:'Cubic.easeIn',
      onComplete:()=>{
        if(this.pickup.finish()) {audio.sfx('sun');this.onCollect(this.value);}
        this.destroy();
      },
    });
  }
}
