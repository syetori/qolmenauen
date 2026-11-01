export class LessonEngine{
 constructor(events,{mode='practice',leadIn=3,window=.28}={}){this.events=events;this.mode=mode;this.window=window;this.time=-leadIn;this.index=0;this.results=Array(events.length).fill(null);this.hits=0;this.misses=0;this.combo=0;this.bestCombo=0;this.score=0;this.activeId=null;this.waiting=false;this.finished=false;this.justHit=null;this.feedback='Готовимся';}
 tick(dt,input){this.justHit=null;if(this.finished)return;const next=this.events[this.index];this.time+=Math.max(0,dt);this.waiting=false;
  // Practice freezes exactly at the next note until the correct gesture is present.
  while(this.index<this.events.length){const e=this.events[this.index];if(this.time<e.start)break;
   if(this.mode==='rhythm'&&this.time>e.start+Math.min(this.window,e.duration*.7)){this.results[this.index]='miss';this.misses++;this.combo=0;this.feedback='Пропуск';this.index++;continue;}
   if(input===e.lane){const error=Math.abs(this.time-e.start);this.results[this.index]='hit';this.hits++;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);this.score+=this.mode==='practice'?100:error<.12?100:70;this.feedback=this.mode==='practice'?'Верно!':error<.12?'Точно!':'Хорошо';this.activeId=e.id;this.justHit=e.id;this.index++;break;}
   if(this.mode==='practice'){this.time=e.start;this.waiting=true;this.feedback='Повторите жест';break;}
   if(this.time>e.start+Math.min(this.window,e.duration*.7)){this.results[this.index]='miss';this.misses++;this.combo=0;this.feedback='Пропуск';this.index++;continue;}
   break;
  }
  const last=this.events.at(-1);if(last&&this.index===this.events.length&&this.time>=last.start+last.duration){this.finished=true;this.feedback='Пьеса завершена';this.activeId=null;}
 }
 sounding(input){if(this.finished||this.activeId===null)return null;const e=this.events[this.activeId];return input===e.lane&&this.time<e.start+e.duration?e:null;}
 get progress(){return this.events.length?this.index/this.events.length:0;}
 get accuracy(){return this.hits+this.misses?Math.round(this.hits/(this.hits+this.misses)*100):0;}
}
