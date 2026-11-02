import {chordNotes} from './music.js?v=8';
export const isStrummed=i=>['guitar','ukulele','electric'].includes(i);
const guitar={C:[-1,3,2,0,1,0],Am:[-1,0,2,2,1,0],Em:[0,2,2,0,0,0],F:[1,3,3,2,1,1],G:[3,2,0,0,0,3],Dm:[-1,-1,0,2,3,1],E7:[0,2,0,1,0,0],D:[-1,-1,0,2,3,2]};
const uke={C:[0,0,0,3],Am:[2,0,0,0],Em:[0,4,3,2],F:[2,0,1,0],G:[0,2,3,2],Dm:[2,2,1,0],E7:[1,2,0,2],D:[2,2,2,0]};
const cache=new Map();
export function voicing(chord,instrument='piano'){
 if(!isStrummed(instrument))return chordNotes(chord,instrument);
 const tuning=instrument==='ukulele'?[67,60,64,69]:[40,45,50,55,59,64],frets=(instrument==='ukulele'?uke:guitar)[chord];
 if(frets)return frets.flatMap((f,i)=>f<0?[]:[tuning[i]+f]);
 const cacheKey=instrument+':'+chord;if(cache.has(cacheKey))return [...cache.get(cacheKey)];const notes=chordNotes(chord,'piano');if(!notes.length)return[];
 const pcs=new Set(notes.map(n=>n%12));
 // Find a playable compact fingering which contains every chord tone.
 const choices=tuning.map(open=>Array.from({length:13},(_,f)=>f).filter(f=>pcs.has((open+f)%12)));let best=null,bestCost=Infinity;
 function search(index,frets){if(index===tuning.length){const pitches=frets.map((f,i)=>tuning[i]+f);if([...pcs].some(pc=>!pitches.some(n=>n%12===pc)))return;const positive=frets.filter(f=>f>0),span=positive.length?Math.max(...positive)-Math.min(...positive):0,cost=Math.max(...frets)*2+span*3+frets.reduce((a,b)=>a+b,0);if(cost<bestCost){bestCost=cost;best=pitches;}return;}for(const f of choices[index])search(index+1,[...frets,f]);}
 search(0,[]);cache.set(cacheKey,best||notes);return [...(best||notes)];
}
