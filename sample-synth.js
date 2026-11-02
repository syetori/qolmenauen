import {planStrum} from './strum.js?v=10';
import {voicing} from './voicings.js?v=8';
export class SampleSynth{
 constructor(){this.ctx=null;this.voices=[];this.chord=null;this.instrument='piano';this.volume=.35;this.banks=new Map();this.loading=new Map();this.strumCount=0;this.strumChord=null;}
 async init(instrument=this.instrument){if(!this.ctx){this.ctx=new AudioContext({latencyHint:'interactive'});this.master=this.ctx.createGain();this.master.gain.value=this.volume*.7;this.limiter=this.ctx.createDynamicsCompressor();this.master.connect(this.limiter);this.limiter.connect(this.ctx.destination);}await this.ctx.resume();await this.load(instrument);}
 async load(instrument){if(this.banks.has(instrument))return;if(!this.loading.has(instrument)){const job=(async()=>{const response=await fetch(new URL(`./bank-${instrument}.json`,import.meta.url));if(!response.ok)throw Error('Не удалось загрузить инструмент. Проверьте сеть и повторите.');const data=await response.json(),bank=new Map();await Promise.all(Object.entries(data).map(async([pitch,url])=>{const bytes=Uint8Array.from(atob(url.split(',')[1]),c=>c.charCodeAt(0));bank.set(Number(pitch),await this.ctx.decodeAudioData(bytes.buffer));}));if(!bank.size)throw Error('Пустая библиотека инструмента');this.banks.set(instrument,bank);})();this.loading.set(instrument,job);job.catch(()=>this.loading.delete(instrument));}return this.loading.get(instrument);}
 setVolume(v){this.volume=v;if(this.ctx)this.master.gain.setTargetAtTime(v*.7,this.ctx.currentTime,.015);}
 note(midi,instrument,when,level=.2,group='held',duration=null,articulation=null){const bank=this.banks.get(instrument);if(!bank)return;level*=({piano:3.2,guitar:3,electric:3.4,ukulele:1}[instrument]||1);const nearest=[...bank.keys()].reduce((a,b)=>Math.abs(b-midi)<Math.abs(a-midi)?b:a),buffer=bank.get(nearest),source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;source.playbackRate.value=2**((midi-nearest)/12);let filter=null;if(articulation&&this.ctx.createBiquadFilter){filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=articulation.cutoff;filter.Q.value=.5;source.connect(filter);filter.connect(gain);}else source.connect(gain);gain.connect(this.master);gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(level,when+(articulation?.attack??.004));const voice={source,gain,filter,group,when,midi,instrument,stringIndex:articulation?.stringIndex,stopped:false};this.voices.push(voice);source.onended=()=>{source.disconnect();filter?.disconnect();gain.disconnect();this.voices=this.voices.filter(v=>v!==voice);};source.start(when);if(duration!==null)this.stopVoice(voice,when+duration,.035);if(this.voices.length>96){const oldest=this.voices.find(v=>v.when<=this.ctx.currentTime&&(v.stopAt===undefined||v.stopAt>this.ctx.currentTime));if(oldest)this.stopVoice(oldest,this.ctx.currentTime,.03);}return voice;}
 stopVoice(v,when,fade=.02){const at=Math.max(when,this.ctx.currentTime);if(v.stopAt!==undefined&&v.stopAt<=at+fade)return;v.stopAt=at+fade;v.gain.gain.cancelScheduledValues(at);v.gain.gain.setTargetAtTime(0,at,fade/(v.group==='strum'?8:4));try{v.source.stop(at+fade);}catch{}}
 play(chord,instrument=this.instrument){this.playNotes(chord?voicing(chord,instrument):[],instrument,chord);}
 playNotes(notes,instrument=this.instrument,key=notes.join(','),force=false){if(!force&&key===this.chord&&instrument===this.instrument)return;this.release();this.chord=key;this.instrument=instrument;if(!notes.length||!this.ctx)return;const at=this.ctx.currentTime+.004;notes.forEach((n,i)=>this.note(n,instrument,at+(instrument==='piano'?0:i*.008),.8/Math.sqrt(notes.length),'held'));}
 strum(chord,instrument,direction,when,interval=.333,options={}){
  const plan=planStrum(chord,instrument,direction,interval,{...options,seed:this.strumCount++}),chordPitches=new Set(voicing(chord,instrument));this.instrument=instrument;
  if(this.strumChord!==chord)this.voices.filter(v=>v.group==='strum'&&!chordPitches.has(v.midi)).forEach(v=>this.stopVoice(v,when,.1));
  this.strumChord=chord;
  for(const stroke of plan){const at=when+stroke.offset;
   // Only the struck string is damped. Bass and unstruck treble keep their natural tails.
   this.voices.filter(v=>v.group==='strum'&&v.instrument===instrument&&v.stringIndex===stroke.stringIndex).forEach(v=>this.stopVoice(v,at,stroke.release));
   this.note(stroke.midi,instrument,at,stroke.level,'strum',null,stroke);
  }
 }

 release(){if(this.ctx)this.voices.forEach(v=>this.stopVoice(v,this.ctx.currentTime,v.group==='strum'?.045:.025));this.chord=null;this.strumChord=null;}
}
