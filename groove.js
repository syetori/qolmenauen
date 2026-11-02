export const DEFAULT_GROOVE={length:8,bpm:90,division:2,steps:['down','rest','down','up','rest','up','down','up','rest','rest']};
export function validateGroove(value={}){return{length:Math.max(1,Math.min(10,Math.round(Number(value.length)||8))),bpm:Math.max(40,Math.min(220,Math.round(Number(value.bpm)||90))),division:[1,2,4].includes(Number(value.division))?Number(value.division):2,steps:Array.from({length:10},(_,i)=>['down','up','rest'].includes(value.steps?.[i])?value.steps[i]:DEFAULT_GROOVE.steps[i])};}
// Audio-clock scheduling; a changing chord never resets position or tempo.
export class GrooveClock{
 constructor({now,hit,onStep=()=>{}}){this.now=now;this.hit=hit;this.onStep=onStep;this.running=false;this.chord=null;this.config=validateGroove();this.index=0;this.cycle=0;}
 configure(config){this.config=validateGroove(config);if(this.index>=this.config.length)this.index=0;}
 start(){if(this.running)return;this.running=true;this.index=0;this.cycle++;this.nextAt=this.now()+.03;}
 stop(){this.running=false;this.cycle++;}
 tick(){if(!this.running)return;const now=this.now();if(this.nextAt<now-.15)this.nextAt=now+.02;let count=0;while(this.nextAt<now+.035&&count++<4){const {bpm,division,length,steps}=this.config,interval=60/bpm/division,index=this.index,step=steps[index];if(this.chord&&step!=='rest')this.hit(this.chord,step,this.nextAt,interval*1.5);this.onStep(index,this.nextAt,this.cycle);this.index=(index+1)%length;this.nextAt+=interval;}}
}
// Both open palms must be seen together before a new fist can toggle transport.
export class PalmTransport{
 constructor(){this.reset();}
 reset(){this.armed=false;this.openAt=null;this.fistAt=null;this.lastAt=null;}
 update(hands,now){if(this.lastAt!==null&&now-this.lastAt>300)this.reset();this.lastAt=now;if(hands.length!==2){this.reset();return false;}const open=hands.every(h=>h.mask===31),pair=hands.some(h=>h.mask===0)&&hands.some(h=>h.mask===31);if(open){this.fistAt=null;this.openAt??=now;if(now-this.openAt>=220)this.armed=true;return false;}this.openAt=null;if(!this.armed||!pair){this.fistAt=null;return false;}this.fistAt??=now;if(now-this.fistAt<100)return false;this.reset();return true;}
}
