import Phaser from 'phaser';
import { ART_SCALE } from '../art';
import { audio } from '../audio/AudioManager';
import { DEPTH } from '../constants';
import { settings } from '../state/settings';
import { SunPickup } from '../sun-pickup';
import type { SunSnapshot } from '../state/session-data';
import { restoreTween } from '../state/restore-tween';

/** Suns remain visible while falling, then may be tapped or collected automatically. */
export class Sun extends Phaser.GameObjects.Image {
  private readonly pickup = new SunPickup();
  private expiry?: Phaser.Time.TimerEvent;
  private readonly fall:Phaser.Tweens.Tween;
  private readonly automaticFallScale:number;
  private readonly fromY:number;
  private flight?:{fromX:number;fromY:number;tween:Phaser.Tweens.Tween};

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly value: 15|25,
    private readonly onCollect: (value: number) => void,
    private readonly targetY?: number,
    private readonly bank: Readonly<{x:number; y:number}> = {x:70,y:60},
  ) {
    super(scene, x, y, 'sun');
    this.fromY=y;
    scene.add.existing(this);
    this.setScale(ART_SCALE*(value===15?0.5:1)).setDepth(DEPTH.sun);
    this.setInteractive(new Phaser.Geom.Circle(this.width / 2, this.height / 2, 112), Phaser.Geom.Circle.Contains);
    this.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (this.pickup.collect()) this.flyToBank();
    });
    this.automaticFallScale=targetY===undefined?1400/700:6500/1800;
    this.fall=scene.tweens.add({
      targets: this,
      y: {from:y,to:targetY ?? y + 26},
      duration: targetY === undefined ? 1400 : 6500,
      ease: 'Sine.easeOut',
      onComplete: () => this.pickup.land(),
    });
    this.fall.setTimeScale(settings.current.autoCollectSuns?this.automaticFallScale:1);
    scene.tweens.add({targets:this,angle:{from:-8,to:8},duration:900,yoyo:true,repeat:-1});
    this.expiry = scene.time.delayedCall(targetY === undefined ? 12000 : 18000, () => this.expire());
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
  save():SunSnapshot|null {
    const pickup=this.pickup.save();if(pickup.phase==='finished')return null;
    return {x:this.x,y:this.y,value:this.value,pickup,fromY:this.fromY,targetY:this.targetY??null,
      fallElapsed:pickup.phase==='falling'?Math.min(this.targetY===undefined?1400:6500,this.fall.elapsed):0,
      lifeMs:pickup.phase==='flying'?0:Math.max(0,this.expiry?.getRemaining()??0),
      flight:pickup.phase==='flying'&&this.flight?{fromX:this.flight.fromX,fromY:this.flight.fromY,elapsed:Math.min(300,this.flight.tween.elapsed)}:null};
  }
  static fromSave(scene:Phaser.Scene,data:SunSnapshot,onCollect:(value:number)=>void,bank:Readonly<{x:number;y:number}>):Sun {
    const sun=new Sun(scene,data.x,data.fromY,data.value,onCollect,data.targetY??undefined,bank);
    sun.expiry?.remove();
    if(data.pickup.phase==='flying'){
      sun.pickup.restore(data.pickup);
      if(data.flight)sun.flyToBank(data.flight.fromX,data.flight.fromY,data.flight.elapsed);
    }else{
      sun.fall.setTimeScale(1);
      if(data.pickup.phase==='falling')restoreTween(sun.fall,data.fallElapsed);
      else sun.fall.stop();
      sun.fall.setTimeScale(settings.current.autoCollectSuns?sun.automaticFallScale:1);
      sun.pickup.restore(data.pickup);
      sun.expiry=scene.time.delayedCall(data.lifeMs,()=>sun.expire());
    }
    sun.setPosition(data.x,data.y);return sun;
  }

  private updatePickup(_time:number,delta:number):void {
    this.fall.setTimeScale(settings.current.autoCollectSuns?this.automaticFallScale:1);
    if(this.pickup.advance(delta,settings.current.autoCollectSuns))this.flyToBank();
  }

  private expire():void {
    if(!this.pickup.expire())return;
    this.disableInteractive();this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({targets:this,alpha:0,duration:200,onComplete:()=>this.destroy()});
  }
  private flyToBank(fromX=this.x,fromY=this.y,elapsed=0):void {
    this.disableInteractive();
    this.expiry?.remove();
    this.scene.tweens.killTweensOf(this);
    this.setDepth(DEPTH.ui+4);
    this.setPosition(fromX,fromY);
    const tween=this.scene.tweens.add({
      targets:this,x:{from:fromX,to:this.bank.x},y:{from:fromY,to:this.bank.y},scale:ART_SCALE*0.45,angle:0,
      duration:300,ease:'Cubic.easeIn',
      onComplete:()=>{
        if(this.pickup.finish()) {audio.sfx('sun');this.onCollect(this.value);}
        this.destroy();
      },
    });
    this.flight={fromX,fromY,tween};
    if(elapsed>0)restoreTween(tween,elapsed);
  }
}
