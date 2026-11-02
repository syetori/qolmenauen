export const ART_WIDTH=1600,ART_HEIGHT=1000;
export const PALETTE=['#22352e','#ee665c','#edaa3a','#78a557','#35a7a0','#527add','#a979ce','#f5f2e9'];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function analyzeHand(hand,wasPinching=false){const p=hand.p,scale=Math.max(.025,distance(p[5],p[17])),pinchRatio=distance(p[4],p[8])/scale,extension=distance(p[8],p[0])/Math.max(.01,distance(p[5],p[0]));const pinch=pinchRatio<(wasPinching ? .43 : .29)&&extension>1.06;const pair=distance(p[8],p[12])/scale,two=(hand.mask&6)===6&&(hand.mask&24)===0;const fist=hand.mask===0&&extension<1.04&&[12,16,20].every(i=>distance(p[i],p[0])<distance(p[i-2],p[0])*1.2);return{side:hand.side,pinch,erase:!pinch&&two&&pair<.3,vSign:!pinch&&two&&pair>.55,fist,adjust:hand.mask===1&&!pinch,point:{x:1-(p[4].x+p[8].x)/2,y:(p[4].y+p[8].y)/2},eraserPoint:{x:1-(p[8].x+p[12].x)/2,y:(p[8].y+p[12].y)/2},center:{x:1-(p[0].x+p[9].x)/2,y:(p[0].y+p[9].y)/2}};}
export function brushFromMotion(base,point){return{width:clamp(base.width*2**((point.x-base.point.x)*5),1,72),alpha:clamp(base.alpha+(point.y-base.point.y)*1.6,.05,1)};}
export class SmoothPoint{constructor(){this.reset();}reset(){this.last=null;this.filtered=null;this.velocity={x:0,y:0};this.time=0;}update(p,t){if(!this.last||t-this.time>250){this.last={...p};this.filtered={...p};this.time=t;return{...p};}const dt=clamp((t-this.time)/1000,.008,.12);for(const axis of ['x','y']){const v=(p[axis]-this.last[axis])/dt;this.velocity[axis]+=.35*(v-this.velocity[axis]);const cutoff=3+12*Math.abs(this.velocity[axis]),a=1/(1+1/(2*Math.PI*cutoff*dt));this.filtered[axis]+=a*(p[axis]-this.filtered[axis]);}this.last={...p};this.time=t;return{...this.filtered};}}
export class GestureState{
 constructor(){this.reset();}
 reset(){this.pinchState={};this.pose=null;this.poseAt=0;this.fired=false;this.zoomLock=false;this.releaseAt=null;this.preferred=null;this.lastTime=null;}
 update(hands,now,preferred='auto'){
  if(this.lastTime!==null&&now-this.lastTime>350)this.reset();this.lastTime=now;
  const features=hands.map(h=>analyzeHand(h,this.pinchState[h.side]));this.pinchState=Object.fromEntries(features.map(h=>[h.side,h.pinch]));
  const pinched=features.filter(h=>h.pinch);
  if(pinched.length===2){this.zoomLock=true;this.pose=null;this.fired=false;this.releaseAt=null;return{type:'zoom',points:pinched.map(h=>h.point)};}
  if(this.zoomLock){if(!pinched.length)this.zoomLock=false;this.pose=null;return{type:'hover',hint:'Разожмите оба щипка после масштаба'};}
  let hand=preferred==='auto'?features.find(h=>h.side===this.preferred):features.find(h=>h.side===preferred);
  if(!hand&&preferred==='auto')hand=features[0];
  if(!hand){this.pose=null;this.fired=false;this.releaseAt=null;this.preferred=null;return{type:'idle'};}
  if(this.preferred!==hand.side){this.pose=null;this.fired=false;this.preferred=hand.side;}
  let pose=hand.fist?'color':hand.pinch?'draw':hand.erase?'erase':hand.adjust?'adjust':hand.vSign?'layer':'hover';
  if(this.fired&&this.pose&&pose!==this.pose){if(this.releaseAt===null)this.releaseAt=now;if(now-this.releaseAt<180)return{type:'hover',point:hand.point};}
  if(pose!==this.pose){this.pose=pose;this.poseAt=now;this.fired=false;this.releaseAt=null;}else this.releaseAt=null;
  const held=now-this.poseAt;
  if(pose==='color'||pose==='layer'){const progress=Math.min(1,held/550);if(progress===1&&!this.fired){this.fired=true;return{type:pose,point:hand.center,once:true,progress};}return{type:'hover',point:hand.center,progress,hint:this.fired?'Жест принят — раскройте ладонь':pose==='color'?'Держите кулак: следующий цвет':'Держите V: следующий слой'};}
  if(pose==='adjust')return{type:held>=300?'adjust':'hover',point:hand.center,progress:Math.min(1,held/300),hint:'Большой вверх: настройка кисти'};
  if(pose==='draw'||pose==='erase')return{type:held>=35?pose:'hover',point:pose==='erase'?hand.eraserPoint:hand.point};
  return{type:'hover',point:hand.point,hint:'Щипок — рисовать · два пальца вместе — ластик'};
 }
}
export function screenToWorld(p,view){return{x:(p.x-view.x)/view.scale,y:(p.y-view.y)/view.scale};}
export function zoomAround(view,anchor,nextScale){const w=screenToWorld(anchor,view);return{...view,scale:nextScale,x:anchor.x-w.x*nextScale,y:anchor.y-w.y*nextScale};}
export function twoHandView(base,points,limits){const mid={x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2},d=Math.max(1,distance(points[0],points[1])),scale=clamp(base.view.scale*d/base.distance,limits.min,limits.max);return{...base.view,scale,x:mid.x-base.anchor.x*scale,y:mid.y-base.anchor.y*scale};}
let sequence=0;const newLayer=()=>({id:'layer-'+Date.now()+'-'+(++sequence),name:'Слой '+sequence,visible:true,opacity:1,strokes:[]});
export class DrawingDocument{
 constructor(){this.layers=[newLayer(),newLayer(),newLayer()];this.activeId=this.layers.at(-1).id;this.undoStack=[];this.redoStack=[];}
 get active(){return this.layers.find(l=>l.id===this.activeId);}
 snapshot(){return{layers:this.layers.map(l=>({...l,strokes:l.strokes.slice()})),activeId:this.activeId};}
 remember(){this.undoStack.push(this.snapshot());if(this.undoStack.length>30)this.undoStack.shift();this.redoStack=[];}
 commit(stroke){if(!this.active?.visible||!stroke.points.length)return false;if(this.layers.reduce((s,l)=>s+l.strokes.reduce((n,s)=>n+s.points.length,0),0)+stroke.points.length>300000)throw Error('Рисунок достиг лимита точек. Сохраните проект перед новым рисунком.');if(this.layers.reduce((s,l)=>s+l.strokes.length,0)>=2000)throw Error('Достигнут предел 2000 штрихов. Сохраните PNG и начните новый рисунок.');this.remember();this.active.strokes=[...this.active.strokes,stroke];return true;}
 addLayer(){if(this.layers.length>=6)return false;this.remember();const layer=newLayer();layer.name='Слой '+(this.layers.length+1);this.layers.push(layer);this.activeId=layer.id;return true;}
 selectNext(){const i=this.layers.findIndex(l=>l.id===this.activeId);this.activeId=this.layers[(i+1)%this.layers.length].id;return this.active;}
 setLayer(id,key,value){const layer=this.layers.find(l=>l.id===id);if(!layer)return;this.remember();layer[key]=value;}
 moveLayer(id,delta){const i=this.layers.findIndex(l=>l.id===id),j=i+delta;if(i<0||j<0||j>=this.layers.length)return;this.remember();[this.layers[i],this.layers[j]]=[this.layers[j],this.layers[i]];}
 clearLayer(){if(!this.active?.strokes.length)return;this.remember();this.active.strokes=[];}
 undo(){if(!this.undoStack.length)return false;this.redoStack.push(this.snapshot());const s=this.undoStack.pop();this.layers=s.layers;this.activeId=s.activeId;return true;}
 redo(){if(!this.redoStack.length)return false;this.undoStack.push(this.snapshot());const s=this.redoStack.pop();this.layers=s.layers;this.activeId=s.activeId;return true;}
 serialize(){return{version:1,width:ART_WIDTH,height:ART_HEIGHT,layers:this.layers,activeId:this.activeId};}
 restore(data){if(data?.version!==1||!Array.isArray(data.layers)||!data.layers.length||data.layers.length>6)throw Error('Неверный формат рисунка');let count=0,totalPoints=0;for(const l of data.layers){if(typeof l.id!=='string'||typeof l.name!=='string'||!Array.isArray(l.strokes)||typeof l.visible!=='boolean'||!Number.isFinite(l.opacity)||l.opacity<0||l.opacity>1)throw Error('Повреждён слой');for(const s of l.strokes){count++;if(!Array.isArray(s.points)||s.points.length>4096||!['brush','erase'].includes(s.tool)||!/^#[0-9a-f]{6}$/i.test(s.color)||!Number.isFinite(s.width)||s.width<1||s.width>200||!Number.isFinite(s.alpha)||s.alpha<0||s.alpha>1)throw Error('Повреждён штрих');totalPoints+=s.points.length;for(const p of s.points)if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>ART_WIDTH||p.y<0||p.y>ART_HEIGHT)throw Error('Повреждена точка');}}if(count>2000||totalPoints>300000||new Set(data.layers.map(l=>l.id)).size!==data.layers.length)throw Error('Рисунок слишком большой');this.layers=data.layers;this.activeId=this.layers.some(l=>l.id===data.activeId)?data.activeId:this.layers.at(-1).id;this.undoStack=[];this.redoStack=[];}
}
