import Phaser from 'phaser';
import {gamePerformance as perf} from './performance';

/** Install before scene plugins bind their update listeners. Wrapping an
 * already-bound instance method would miss the regular physics update.
 * Listener order and all method arguments/results remain unchanged. */
const worldUpdate=Phaser.Physics.Arcade.World.prototype.update;
Phaser.Physics.Arcade.World.prototype.update=function(time,delta){
 const start=perf.mark();try{return worldUpdate.call(this,time,delta);}finally{perf.section('physics',start);}
};
const tweenStep=Phaser.Tweens.TweenManager.prototype.step;
Phaser.Tweens.TweenManager.prototype.step=function(tick){
 const start=perf.mark();try{return tweenStep.call(this,tick);}finally{perf.section('tweens',start);}
};
