export const ART_WIDTH=1600,ART_HEIGHT=1000;
export const PALETTE=['#22352e','#ee665c','#edaa3a','#78a557','#35a7a0','#527add','#a979ce','#f5f2e9'];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function analyzeHand(hand,wasPinching=false,mode='relaxed'){
 const p=hand.p,scale=Math.max(.025,distance(p[5],p[17])),pinchRatio=distance(p[4],p[8])/scale,extension=distance(p[8],p[0])/Math.max(.01,distance(p[5],p[0]));
 const fist=hand.mask===0&&extension<.93&&[12,16,20].every(i=>distance(p[i],p[0])<distance(p[i-2],p[0])*1.22),openPalm=(hand.mask&30)===30&&pinchRatio>.9;
 const on=mode==='precise'?.4:.62,off=mode==='precise'?.72:1.0;
 const pinch=!fist&&!openPalm&&pinchRatio<(wasPinching?off:on)&&(extension>.84||(hand.mask&2)!==0);
 const pair=distance(p[8],p[12])/scale,two=(hand.mask&6)===6&&(hand.mask&24)===0;
 return{side:hand.side,pinch,pinchRatio,release:pinchRatio>off,openPalm,fist,tool:!pinch&&two&&pair<.65,vSign:!pinch&&two&&pair>.7,adjust:hand.mask===1&&!pinch,point:{x:1-(p[4].x+p[8].x)/2,y:(p[4].y+p[8].y)/2},center:{x:1-(p[0].x+p[9].x)/2,y:(p[0].y+p[9].y)/2}};
}
export function brushFromMotion(base,point){return{width:clamp(base.width*2**((point.x-base.point.x)*5),1,72),alpha:clamp(base.alpha+(point.y-base.point.y)*1.6,.05,1)};}
export class SmoothPoint{constructor(){this.reset();}reset(){this.last=null;this.filtered=null;this.velocity={x:0,y:0};this.time=0;}update(p,t){if(!this.last||t-this.time>250){this.last={...p};this.filtered={...p};this.time=t;return{...p};}const dt=clamp((t-this.time)/1000,.008,.12);for(const axis of ['x','y']){const v=(p[axis]-this.last[axis])/dt;this.velocity[axis]+=.35*(v-this.velocity[axis]);const cutoff=3+12*Math.abs(this.velocity[axis]),a=1/(1+1/(2*Math.PI*cutoff*dt));this.filtered[axis]+=a*(p[axis]-this.filtered[axis]);}this.last={...p};this.time=t;return{...this.filtered};}}
export class GestureState{
 constructor(){this.reset();}
 reset(){this.pinchState={};this.pose=null;this.poseAt=0;this.fired=false;this.zoomLock=false;this.releaseAt=null;this.lastTime=null;this.lastSeen=null;this.drawing=false;this.lastDrawAt=0;this.lastPoint=null;this.swipe=null;this.penReleaseAt=null;}
 update(hands,now,preferred='auto',mode='relaxed',historyEnabled=true){
  if(this.lastTime!==null&&now-this.lastTime>400)this.reset();this.lastTime=now;
  const features=hands.map(h=>analyzeHand(h,this.pinchState[h.side]||this.drawing&&hands.length===1,mode));this.pinchState=Object.fromEntries(features.map(h=>[h.side,h.pinch]));
  // A second hand is a navigation clutch immediately, even before either pinch is exact.
  if(features.length>=2){this.drawing=false;this.zoomLock=true;this.pose=null;this.fired=false;this.swipe=null;const pinched=features.filter(h=>h.pinch);return pinched.length>=2?{type:'zoom',points:pinched.slice(0,2).map(h=>h.point)}:{type:'prepareZoom',hint:'Рисование приостановлено: сведите пальцы обеих рук для масштаба'};}
  const hand=preferred==='auto'?features[0]:features.find(h=>h.side===preferred);
  if(!hand){if(this.drawing&&this.lastSeen!==null&&now-this.lastSeen<=180)return{type:'suspend',hint:'Сохраняем штрих: ждём руку'};this.drawing=false;this.pose=null;this.fired=false;this.swipe=null;if(!features.length)this.zoomLock=false;return{type:'idle'};}
  this.lastSeen=now;
  if(this.zoomLock){this.drawing=false;this.pose=null;if(!hand.pinch)this.zoomLock=false;return{type:'hover',point:hand.point,hint:'После двух рук разожмите щипок, чтобы снова рисовать'};}
  // Brief classification glitches do not lift the pen. A clearly opened pinch does.
  if(hand.pinch)this.penReleaseAt=null;
  if(this.drawing&&!hand.pinch&&hand.release&&!hand.openPalm&&!hand.fist){if(this.penReleaseAt===null)this.penReleaseAt=now;if(now-this.penReleaseAt<75)return{type:'suspend',hint:'Поднимаем кисть после раскрытия щипка'};}

  if(this.drawing&&!hand.pinch&&!hand.release&&!hand.openPalm&&!hand.fist&&now-this.lastDrawAt<=180)return{type:'suspend',point:hand.point,hint:'Щипок удерживается'};
  const pose=hand.fist?'color':hand.openPalm?(historyEnabled?'history':'hover'):hand.pinch?'draw':hand.tool?'tool':hand.adjust?'adjust':hand.vSign?'layer':'hover';
  if(this.fired&&this.pose&&pose!==this.pose&&pose!=='draw'){if(this.releaseAt===null)this.releaseAt=now;if(now-this.releaseAt<180)return{type:'hover',point:hand.point};}
  if(pose!==this.pose){this.pose=pose;this.poseAt=now;this.fired=false;this.releaseAt=null;this.swipe=null;}else this.releaseAt=null;
  const held=now-this.poseAt;
  if(pose==='draw'){
   if(held<35&&!this.drawing)return{type:'hover',point:hand.point};
   const breakStroke=this.drawing&&this.lastPoint&&distance(this.lastPoint,hand.point)>.18;this.drawing=true;this.lastDrawAt=now;this.lastPoint=hand.point;return{type:'draw',point:hand.point,breakStroke:!!breakStroke};
  }
  this.drawing=false;
  if(pose==='history'){
   if(this.fired)return{type:'hover',point:hand.center,hint:'Смахивание принято. Согните пальцы перед повтором'};
   if(!this.swipe)this.swipe={anchor:hand.center,at:now,armed:false};const sw=this.swipe;
   if(!sw.armed){if(distance(sw.anchor,hand.center)>.045){sw.anchor=hand.center;sw.at=now;}if(now-sw.at>=280){sw.armed=true;sw.anchor=hand.center;sw.at=now;}return{type:'hover',point:hand.center,progress:Math.min(1,(now-sw.at)/280),hint:'Открытая ладонь: задержите, затем смахните вправо — отмена, влево — повтор'};}
   const dx=hand.center.x-sw.anchor.x,dy=hand.center.y-sw.anchor.y,elapsed=now-sw.at;
   if(elapsed>750||Math.abs(dy)>.13){this.swipe=null;return{type:'hover',point:hand.center,hint:'Ладонь готовится к новому смахиванию'};}
   if(Math.abs(dx)>=.16&&Math.abs(dx)/Math.max(.04,elapsed/1000)>=.4){this.fired=true;return{type:dx>0?'undo':'redo',point:hand.center,once:true};}
   return{type:'hover',point:hand.center,progress:1,hint:'Ладонь готова: вправо — отмена · влево — повтор'};
  }
  if(pose==='color'||pose==='layer'||pose==='tool'){const duration=pose==='tool'?950:550,progress=Math.min(1,held/duration);if(progress===1&&!this.fired){this.fired=true;return{type:pose,point:hand.center,once:true,progress};}return{type:'hover',point:hand.center,progress,hint:this.fired?'Жест принят — раскройте ладонь':pose==='color'?'Держите кулак: следующий цвет':pose==='tool'?'Два пальца: держите секунду для смены кисти и ластика':'Держите V: следующий слой'};}
  if(pose==='adjust')return{type:held>=300?'adjust':'hover',point:hand.center,progress:Math.min(1,held/300),hint:'Большой вверх: настройка кисти'};
  return{type:'hover',point:hand.point,hint:'Мягкий щипок — выбранная кисть или ластик'};
 }
}
export function finishStroke(live,now,trimTail=0){return{...live,points:live.points.filter(p=>!trimTail||(p.t??0)<now-trimTail).map(({x,y})=>({x,y}))};}
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
