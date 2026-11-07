import type { WaveDefinition } from './levels';
import type { ZombieType } from './types';
import { REFERENCE as R } from './reference/rules';
import { waveDirectorSchema, type WaveDirectorSnapshot } from './state/session-data';
export interface WavePort {
  spawn(type: ZombieType, wave: number): number;
  health(wave: number): number;
  liveCount(): number;
  start(wave: number, total: number, flag: boolean): void;
  warning?(): void;
  complete(): void;
}
export class WaveDirector {
  private index = -1;
  private remainder = 0;
  private tick = 0;
  private countdown: number;
  private interval = 0;
  private warningTicks = 0;
  private initialHealth = 0;
  private threshold = 0;
  private done = false;
  readonly events: {tick:number; kind:string; wave:number; count?:number}[] = [];
  constructor(private readonly waves: readonly WaveDefinition[], private readonly port: WavePort,
    private readonly random: () => number = Math.random, private readonly bowling = false) {
    this.countdown = Math.round(waves[0].delayMs / R.tickMs);
  }
  get currentWave(): number { return Math.max(1,this.index + 1); }
  get progress(): number { return Math.max(0,(this.index+1)/this.waves.length); }
  get snapshot() { return {tick:this.tick, wave:this.index+1, countdownTicks:this.countdown, warningTicks:this.warningTicks,
    initialHealth:this.initialHealth, remainingHealth:this.index<0?0:this.port.health(this.index), healthThreshold:this.threshold}; }
  stop(): void { this.done = true; }
  save(): WaveDirectorSnapshot { return {kind:'standard',index:this.index,remainder:this.remainder,tick:this.tick,countdown:this.countdown,interval:this.interval,warningTicks:this.warningTicks,initialHealth:this.initialHealth,threshold:this.threshold,done:this.done}; }
  restore(input: WaveDirectorSnapshot): void {
    const data=waveDirectorSchema.parse(input);
    if(data.index>=this.waves.length)throw new Error('Invalid wave index');
    this.index=data.index;this.remainder=data.remainder;this.tick=data.tick;this.countdown=data.countdown;
    this.interval=data.interval;this.warningTicks=data.warningTicks;this.initialHealth=data.initialHealth;
    this.threshold=data.threshold;this.done=data.done;this.events.length=0;
  }
  update(delta: number): void {
    this.remainder += delta;
    while(this.remainder >= R.tickMs && !this.done) { this.remainder -= R.tickMs; this.step(); }
  }
  private step(): void {
    this.tick++;
    if(this.index===this.waves.length-1) {
      if(this.port.liveCount()===0) { this.done=true;this.port.complete(); }
      return;
    }
    if(this.warningTicks>0) {
      if(--this.warningTicks>0)return;
      this.countdown=1;
    }
    this.countdown--;
    if(this.index>=0 && this.countdown>R.healthTriggeredCountdownTicks && this.interval-this.countdown>R.healthMinimumElapsedTicks && this.port.health(this.index)<=this.threshold) {
      this.countdown=R.healthTriggeredCountdownTicks;
      this.events.push({tick:this.tick,kind:'health acceleration',wave:this.index+2});
    }
    if(this.countdown<=0) { this.begin();return; }
    if(this.countdown===R.flagWarningAtTicks && this.waves[this.index+1].flag) {
      this.warningTicks=R.flagWarningDurationTicks;
      this.events.push({tick:this.tick,kind:'huge-wave warning',wave:this.index+2});this.port.warning?.();
    }
  }
  private begin(): void {
    this.index++;
    const wave=this.waves[this.index];
    this.port.start(this.currentWave,this.waves.length,Boolean(wave.flag));
    this.initialHealth=0;
    const sequence=wave.sequence ?? (Object.keys(wave.zombies) as ZombieType[]).flatMap(type=>Array<ZombieType>(wave.zombies[type]??0).fill(type));
    for(const type of sequence)this.initialHealth+=this.port.spawn(type,this.index);
    this.events.push({tick:this.tick,kind:'spawn',wave:this.index+1,count:sequence.length});
    const beforeFlag=Boolean(this.waves[this.index+1]?.flag) && !this.bowling;
    this.threshold=beforeFlag?0:this.initialHealth*(R.healthThresholdMin+this.random()*(R.healthThresholdMax-R.healthThresholdMin));
    this.countdown=beforeFlag?R.beforeFlagTicks:R.normalCountdownTicks+Math.floor(this.random()*R.countdownRangeTicks);
    this.interval=this.countdown;
  }
}
