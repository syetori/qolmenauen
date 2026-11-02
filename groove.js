export const GROOVE_PRESETS=[
 {id:'six',name:'Шестёрка · ↓ — ↓ ↑ — ↑ ↓ ↑',description:'Шесть ударов за четыре доли. Вверх — легче, басовые струны продолжают звучать.',length:8,bpm:90,division:2,feel:.65,steps:['down','rest','down','up','rest','up','down','up']},
 {id:'four',name:'Четверти · ↓ ↓ ↓ ↓',description:'Четыре ровных удара вниз. Подходит для спокойного сопровождения.',length:4,bpm:80,division:1,feel:.5,steps:['down','down','down','down']},
 {id:'alternate',name:'Вниз-вверх · ровные восьмые',description:'Чередование сильных долей вниз и лёгких движений вверх.',length:8,bpm:96,division:2,feel:.5,steps:['down','up','down','up','down','up','down','up']},
 {id:'ballad',name:'Баллада · мягкий рисунок',description:'Больше пространства между ударами; паузы не обрывают звон струн.',length:8,bpm:72,division:2,feel:.9,steps:['down','rest','rest','up','rest','up','down','up']},
 {id:'waltz',name:'Вальс · 3/4',description:'Три доли в цикле. Первая доля подчёркнута, движения вверх мягче.',length:6,bpm:84,division:2,feel:.65,steps:['down','rest','down','up','down','up']},
 {id:'offbeat',name:'На слабую долю · — ↑ — ↑',description:'Лёгкие верхние струны между долями. Открытый звон, без глушёной регги-артикуляции.',length:8,bpm:90,division:2,feel:.55,steps:['rest','up','rest','up','rest','up','rest','up']},
 {id:'pop',name:'Поп · ↓ ↑ — ↑ ↓ — ↓ ↑',description:'Синкопированный рисунок с пропусками и акцентом в начале цикла.',length:8,bpm:102,division:2,feel:.6,steps:['down','up','rest','up','down','rest','down','up']}
];
export const DEFAULT_GROOVE={...GROOVE_PRESETS[0],preset:'six',steps:[...GROOVE_PRESETS[0].steps,'rest','rest']};
export function validateGroove(value={}){return{preset:GROOVE_PRESETS.some(p=>p.id===value.preset)?value.preset:'custom',length:Math.max(1,Math.min(10,Math.round(Number(value.length)||8))),bpm:Math.max(40,Math.min(220,Math.round(Number(value.bpm)||90))),division:[1,2,4].includes(Number(value.division))?Number(value.division):2,feel:Number.isFinite(Number(value.feel))?Math.max(0,Math.min(1,Number(value.feel))):.65,steps:Array.from({length:10},(_,i)=>['down','up','rest'].includes(value.steps?.[i])?value.steps[i]:DEFAULT_GROOVE.steps[i])};}
// Audio-clock scheduling; a changing chord never resets position or tempo.
export class GrooveClock{
 constructor({now,hit,onStep=()=>{}}){this.now=now;this.hit=hit;this.onStep=onStep;this.running=false;this.chord=null;this.config=validateGroove();this.index=0;this.cycle=0;}
 configure(config){this.config=validateGroove(config);if(this.index>=this.config.length)this.index=0;}
 start(){if(this.running)return;this.running=true;this.index=0;this.cycle++;this.nextAt=this.now()+.03;}
 stop(){this.running=false;this.cycle++;}
 tick(){if(!this.running)return;const now=this.now();if(this.nextAt<now-.15)this.nextAt=now+.02;let count=0;while(this.nextAt<now+.035&&count++<4){const {bpm,division,length,steps}=this.config,interval=60/bpm/division,index=this.index,step=steps[index];if(this.chord&&step!=='rest')this.hit(this.chord,step,this.nextAt,interval,{index,division,feel:this.config.feel});this.onStep(index,this.nextAt,this.cycle);this.index=(index+1)%length;this.nextAt+=interval;}}
}
// Both open palms must be seen together before a new fist can toggle transport.
export class PalmTransport{
 constructor(){this.reset();}
 reset(){this.armed=false;this.openAt=null;this.fistAt=null;this.lastAt=null;}
 update(hands,now){if(this.lastAt!==null&&now-this.lastAt>300)this.reset();this.lastAt=now;if(hands.length!==2){this.reset();return false;}const open=hands.every(h=>h.mask===31),pair=hands.some(h=>h.mask===0)&&hands.some(h=>h.mask===31);if(open){this.fistAt=null;this.openAt??=now;if(now-this.openAt>=220)this.armed=true;return false;}this.openAt=null;if(!this.armed||!pair){this.fistAt=null;return false;}this.fistAt??=now;if(now-this.fistAt<100)return false;this.reset();return true;}
}
