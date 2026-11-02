import {voicing} from './voicings.js?v=8';
// Reproducible small variations, so rendering and live playback use the same articulation.
const noise=(seed,salt)=>{let n=Math.imul((seed+1)^Math.imul(salt+17,374761393),668265263);n=(n^(n>>>13))>>>0;return n/4294967295;};
export function planStrum(chord,instrument,direction,interval=.333,{index=0,division=2,feel=.55,seed=0}={}){
 const pitches=voicing(chord,instrument),offset=instrument==='ukulele'?0:6-pitches.length;
 let strings=pitches.map((midi,i)=>({midi,stringIndex:i+offset}));
 // An upstroke usually brushes treble strings rather than replaying the whole bass chord.
 if(direction==='up')strings=strings.slice(-3).reverse();
 const amount=Math.max(0,Math.min(1,feel)),accent=index===0?1:index%division===0?.88:.72,span=Math.min(interval*.32,(direction==='up'?.027:.046)*(1+(noise(seed,1)-.5)*.2*amount));
 return strings.map((string,i)=>({...string,offset:strings.length<2?0:i*span/(strings.length-1)+(i?noise(seed,i+20)*.002*amount:0),level:(direction==='up'?.43:.61)*accent*(.92+noise(seed,i+2)*.16*amount)/Math.sqrt(pitches.length),attack:.006+amount*.004,cutoff:(instrument==='ukulele'?5900:instrument==='electric'?6200:7200)*(direction==='up'?.88:1),release:Math.min(.17,.09+amount*.08,Math.max(.055,interval*.7))}));
}
