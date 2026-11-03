import * as T from './sculpt-three.js';
import {HandCamera} from './hand-camera.js?v=11';
import {fingerMask} from './music.js?v=7';

const tools={add:'Глина',cut:'Резец',smooth:'Сгладить',pull:'Вытянуть',engrave:'Гравировка',paint:'Краска',flatten:'Ровнять',erase:'Убрать'};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const insideStage=(p,rect)=>p.x>=rect.left&&p.x<=rect.right&&p.y>=rect.top&&p.y<=rect.bottom;
const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const button=(action,label)=>'<button type="button" data-action="'+action+'">'+label+'</button>';
const range=(id,label,min,max,value)=>'<label>'+label+'<input id="'+id+'" type="range" min="'+min+'" max="'+max+'" value="'+value+'" step=".01"></label>';
function database(mode,value){
  return new Promise((resolve,reject)=>{
    const open=indexedDB.open('qolmen-musin',1);
    open.onupgradeneeded=()=>open.result.createObjectStore('project');
    open.onerror=()=>reject(open.error);
    open.onblocked=()=>reject(Error('Хранилище занято'));
    open.onsuccess=()=>{
      const db=open.result, tx=db.transaction('project',mode), store=tx.objectStore('project');
      const request=value?store.put(value,'current'):store.get('current');
      tx.oncomplete=()=>{db.close();resolve(request.result);};
      tx.onabort=()=>{db.close();reject(tx.error);};
    };
  });
}
function download(data,name,type){
  const url=URL.createObjectURL(data instanceof Blob?data:new Blob([data],{type}));
  const link=document.createElement('a');
  link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export function mountSculpt(section){
  section.innerHTML=`
    <div class="sculpt-head"><a href="#">← На главную</a><h1>Мүсін</h1>${button('camera','Включить камеру')}</div>
    <div class="sculpt-stage"><div class="sculpt-preview"><span>Камера</span><div class="sculpt-feed"><video class="sculpt-camera" muted playsinline hidden></video><canvas class="sculpt-bones" width="640" height="480" aria-hidden="true"></canvas></div>${button('bones','Скелет рук')}</div>
      <div class="sculpt-tools">${Object.entries(tools).map(([id,label])=>button(id,label)).join('')}
        ${button('undo','Отменить')}${button('redo','Повторить')}${button('show','Показ')}${button('frame','В центр')}
        <div class="sculpt-axes" aria-label="Вид вдоль оси">${button('axisX','X')}${button('axisY','Y')}${button('axisZ','Z')}</div>
        ${button('mirrorCamera','Зеркало камеры')}
        ${button('mirrorControls','Зеркало курсора')}
      </div>
      <div class="sculpt-cursor" hidden></div><div class="sculpt-wheel" hidden></div>
    </div>
    <p class="sculpt-status" role="status">Камера выключена</p>
    <div class="sculpt-settings">
      ${range('radius','Радиус',.06,.65,.18)}${range('strength','Сила',.05,1,.5)}
      ${range('opacity','Прозрачность краски',.05,1,.85)}${range('roughness','Матовость',.15,1,.65)}
      ${range('speed','Скорость показа',.05,2,.5)}
      <label>Краска<input id="color" type="color" value="#bb535b"></label><label>Фон<input id="background" type="color" value="#222a29"></label>
      <label>Свет<select id="light"><option value="studio">Студия</option><option value="warm">Тёплый</option><option value="cool">Холодный</option></select></label>
      ${button('symmetry','Симметрия X')}
    </div>
    <div class="sculpt-files">
      <label>Заготовка <select id="shape"><option value="head">Овал</option><option value="sphere">Шар</option><option value="block">Блок</option></select></label>
      ${button('reset','Заменить заготовку')}${button('save','Скачать проект')}
      <label>Открыть проект <input type="file" accept=".qolmen,application/json"></label>
      <label>Масштаб экспорта <input id="export-scale" type="number" min=".01" max="1000" value="1" step=".01"></label>
      ${button('glb','GLB')}${button('obj','OBJ + MTL')}${button('stl','STL')}${button('png','PNG')}${button('jpeg','JPEG')}
    </div>
    <details><summary>Настроить круг инструментов</summary><label>Секторов <select id="count"><option>6</option><option selected>8</option></select></label><div class="sculpt-layout"></div></details>
    <p>Кнопка срабатывает каждые 1,7 секунды, пока вы держите над ней щипок. Щипок и ладонь лепят. Два щипка приближают и сдвигают вид. Кулак вращает модель, два кулака обходят сцену. Кулак и щипок меняют размер. Два пальца вместе открывают круг.</p>
    <p>Мышь лепит левой кнопкой, вращает вид правой и приближает колесом.</p>`;
  const get=s=>section.querySelector(s), value=id=>get('#'+id).value;
  const stage=get('.sculpt-stage'), video=get('video'), cursor=get('.sculpt-cursor'), wheel=get('.sculpt-wheel');
  const status=text=>{get('[role=status]').textContent=text;};
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(38,1,.01,100);
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  const canvas=renderer.domElement;
  stage.prepend(canvas);
  const model=new T.Mesh(new T.BufferGeometry(),new T.MeshStandardMaterial({vertexColors:true}));
  const key=new T.DirectionalLight(0xffe6cf,3), rim=new T.DirectionalLight(0xaacfff,2.3);
  key.position.set(3,4,4);rim.position.set(-4,2,-3);
  const grid=new T.GridHelper(9,30,0x63706d,0x394544);
  grid.position.y=-1.08;
  scene.add(model,grid,key,rim,new T.HemisphereLight(0xffeee0,0x4b6265,2));
  const ray=new T.Raycaster(), target=new T.Vector3(), orbit=new T.Spherical(4.6,1.42,.24);
  const worker=new Worker(new URL('./sculpt-worker.js',import.meta.url));
  const send=(type,extra={})=>worker.postMessage({type,...extra});
  let active=false, raf, time=0, tool='add', symmetry=false, show=false, mouse=null;
  let stroke=false, previous=null, pending=[], outstanding=0, saveTimer, saveFile=false;
  let old=new Map(), pose=null, hold=null, radial=null, hover=null, slider=null, dwell=null;
  const mirrorSettings={
    mirrorCamera:localStorage.getItem('musin-mirrorCamera')!=='false',
    mirrorControls:localStorage.getItem('musin-mirrorControls')!=='false'
  };
  function mirrorView(){
    get('.sculpt-feed').style.transform=mirrorSettings.mirrorCamera?'scaleX(-1)':'none';
    for(const [action,enabled] of Object.entries(mirrorSettings)){
      get('[data-action='+action+']').setAttribute('aria-pressed',String(enabled));
    }
  }
  mirrorView();
  const bones=get('.sculpt-bones');
  const ink=bones.getContext('2d');
  const bonesButton=get('[data-action=bones]');
  let showBones=localStorage.getItem('musin-bones')!=='false';
  bonesButton.setAttribute('aria-pressed',String(showBones));
  const fingers=[[0,1,2,3,4],[0,5,6,7,8],[0,9,10,11,12],[0,13,14,15,16],[0,17,18,19,20],[5,9,13,17]];
  function drawBones(hands=[]){
    const width=video.videoWidth||640,height=video.videoHeight||480;
    if(bones.width!==width||bones.height!==height){bones.width=width;bones.height=height;}
    ink.clearRect(0,0,width,height);
    if(!showBones)return;
    const x=point=>point.x*width;
    ink.strokeStyle='#c7fc8a';ink.fillStyle='#f0ffda';ink.lineWidth=3;ink.lineCap='round';
    for(const hand of hands){
      for(const chain of fingers){
        ink.beginPath();
        chain.forEach((index,i)=>{
          const point=hand[index];
          if(i===0)ink.moveTo(x(point),point.y*height);
          else ink.lineTo(x(point),point.y*height);
        });
        ink.stroke();
      }
      for(const point of hand){
        ink.beginPath();ink.arc(x(point),point.y*height,3,0,2*Math.PI);ink.fill();
      }
    }
  }
  const blocked=new Set(), palmGuard=new Set();
  let layout=Object.keys(tools);
  try{
    const stored=JSON.parse(localStorage.getItem('musin-wheel'));
    if(stored?.layout?.length===8&&stored.layout.every(id=>Object.hasOwn(tools,id))){
      layout=stored.layout;get('#count').value=stored.count===6?'6':'8';
    }
  }catch{}
  function pick(id){
    tool=id;
    for(const b of section.querySelectorAll('.sculpt-tools button')){
      if(Object.hasOwn(tools,b.dataset.action))b.setAttribute('aria-pressed',String(b.dataset.action===id));
    }
  }
  function configureWheel(){
    const editor=get('.sculpt-layout');
    editor.replaceChildren();
    const persist=()=>{try{localStorage.setItem('musin-wheel',JSON.stringify({layout,count:Number(value('count'))}));}catch{}};
    for(let i=0;i<Number(value('count'));i++){
      const label=document.createElement('label'), select=document.createElement('select');
      label.textContent=String(i+1);label.draggable=true;
      for(const [id,name] of Object.entries(tools))select.add(new Option(name,id));
      select.value=layout[i];
      select.onchange=()=>{layout[i]=select.value;persist();};
      label.ondragstart=e=>e.dataTransfer.setData('application/x-musin-slot',String(i));
      label.ondragover=e=>e.preventDefault();
      label.ondrop=e=>{
        e.preventDefault();
        const slot=e.dataTransfer.getData('application/x-musin-slot'), j=Number(slot);
        if(slot&&Number.isInteger(j)&&j>=0&&j<layout.length){[layout[i],layout[j]]=[layout[j],layout[i]];persist();configureWheel();}
      };
      label.append(select);editor.append(label);
    }
    get('#count').onchange=()=>{persist();configureWheel();};
  }
  configureWheel();pick(tool);
  function settings(){
    scene.background=new T.Color(value('background'));
    model.material.roughness=Number(value('roughness'));
    key.color.set({studio:0xffe6cf,warm:0xffac71,cool:0x9ccfff}[value('light')]);
  }
  settings();
  section.addEventListener('input',e=>{
    if(e.target.matches('#background,#roughness,#light')){settings();autosave();}
  });
  function fitDistance(fraction){
    if(!model.geometry.getAttribute('position')?.count)return 6;
    const radius=model.geometry.boundingSphere.radius*model.scale.x;
    const slope=Math.tan(T.MathUtils.degToRad(camera.fov/2))*Math.min(1,camera.aspect)*fraction;
    return radius/Math.sin(Math.atan(slope));
  }
  function render(now){
    if(!active)return;
    if(show)model.rotateY(Math.min(.05,(now-time)/1000)*Number(value('speed')));
    time=now;
    const w=stage.clientWidth-get('.sculpt-tools').offsetWidth-get('.sculpt-preview').offsetWidth,h=stage.clientHeight;
    if(w&&h&&(canvas.style.width!==w+'px'||canvas.style.height!==h+'px')){
      renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
    }
    orbit.radius=Math.max(orbit.radius,fitDistance(.77));
    camera.position.setFromSpherical(orbit).add(target);camera.lookAt(target);camera.updateMatrixWorld();
    renderer.render(scene,camera);
    raf=requestAnimationFrame(render);
  }
  function remesh(type,extra){
    outstanding++;send(type,extra);
  }
  function flush(){
    if(pending.length){remesh('stamp',{samples:pending});pending=[];}
  }
  function end(){
    if(!stroke)return;
    flush();send('end');stroke=false;previous=null;autosave();
  }
  function dab(x,y){
    if(show)return;
    const b=canvas.getBoundingClientRect();
    ray.setFromCamera(new T.Vector2((x-b.left)/b.width*2-1,1-(y-b.top)/b.height*2),camera);
    model.updateMatrixWorld(true);
    const hit=ray.intersectObject(model)[0];
    if(!hit){end();return;}
    const point=model.worldToLocal(hit.point.clone());
    const radius=Number(value('radius'))/(tool==='engrave'?2:1);
    if(previous&&point.distanceTo(previous)>4*radius)end();
    if(!stroke){stroke=true;send('begin');}
    const distance=previous?.distanceTo(point)||0;
    if(previous&&distance<radius*.18)return;
    const n=Math.max(1,Math.ceil(distance/(radius*.27)));
    for(let i=1;i<=n;i++){
      const p=previous?previous.clone().lerp(point,i/n):point;
      const normal=hit.face.normal.toArray();
      const sample={point:p.toArray(),normal,radius,tool,strength:Number(value('strength')),
        opacity:Number(value('opacity')),color:parseInt(value('color').slice(1),16)};
      pending.push(sample);
      if(symmetry&&Math.abs(p.x)>radius*.18)pending.push({...sample,point:[-p.x,p.y,p.z],normal:[-normal[0],normal[1],normal[2]]});
    }
    previous=point;
    if(!outstanding)flush();
  }
  function autosave(){
    clearTimeout(saveTimer);saveTimer=setTimeout(()=>send('save'),450);
  }
  function load(record){
    const {field,paint,rotation,scale,appearance}=record||{};
    if(record?.version!==1||field?.length!==81**3||paint?.length!==81**3||
      !field.every(Number.isFinite)||!paint.every(x=>Number.isInteger(x)&&x>=0&&x<=0xffffff)||
      rotation?.length!==4||!rotation.every(Number.isFinite)||!Number.isFinite(scale))throw Error('Некорректный файл проекта');
    end();model.quaternion.fromArray(rotation).normalize();model.scale.setScalar(clamp(scale,.2,5));
    if(appearance?.length===3){
      ['background','roughness','light'].forEach((id,i)=>{get('#'+id).value=appearance[i];});
      settings();
    }
    remesh('load',{field:new Float32Array(field),paint:new Uint32Array(paint)});
  }
  worker.onmessage=({data})=>{
    if(data.type==='save'){
      const record={version:1,field:data.field,paint:data.paint,rotation:model.quaternion.toArray(),scale:model.scale.x,
        appearance:['background','roughness','light'].map(value)};
      if(saveFile){
        saveFile=false;
        download(JSON.stringify({...record,field:Array.from(record.field),paint:Array.from(record.paint)}),'musin.qolmen','application/json');
      }
      database('readwrite',record).catch(()=>status('Автосохранение недоступно. Скачайте файл проекта.'));
      return;
    }
    const mesh=new T.BufferGeometry(), [positions,normals,colors]=data.buffers;
    const color=new T.Color();
    for(let i=0;i<colors.length;i+=3){
      color.setRGB(colors[i],colors[i+1],colors[i+2],T.SRGBColorSpace);
      colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;
    }
    mesh.setAttribute('position',new T.BufferAttribute(positions,3));
    mesh.setAttribute('normal',new T.BufferAttribute(normals,3));
    mesh.setAttribute('color',new T.BufferAttribute(colors,3));
    mesh.computeBoundingSphere();
    const firstMesh=!model.geometry.getAttribute('position');
    model.geometry.dispose();model.geometry=mesh;
    if(firstMesh)orbit.radius=fitDistance(.52);
    outstanding--;
    if(!outstanding)flush();
  };
  worker.onerror=()=>status('Не удалось обновить поверхность. Перезагрузите мастерскую.');
  database('readonly').then(record=>{
    if(record)load(record);else remesh('reset',{shape:'head'});
  }).catch(()=>remesh('reset',{shape:'head'}));
  function clearDwell(){
    dwell?.control.style.removeProperty('--dwell');
    dwell=null;
  }
  function activate(control,hand){
    if(!hand.pinch){clearDwell();return false;}
    const now=performance.now();
    if(dwell?.control!==control||dwell.id!==hand.id){
      clearDwell();dwell={control,id:hand.id,start:now};
    }
    const progress=clamp((now-dwell.start)/1650,0,1);
    control.style.setProperty('--dwell',progress*100+'%');
    if(progress<1)return false;
    dwell.start=control.dataset.action==='bones'?Infinity:now;
    control.style.setProperty('--dwell','0%');
    if(!control.matches('input[type=range]'))control.click();
    return true;
  }
  function closeWheel(){
    radial=null;hold=null;wheel.hidden=true;clearDwell();
  }
  function openWheel(h,p){
    const b=stage.getBoundingClientRect();
    const x=clamp(p.x-b.left,113,Math.max(113,canvas.clientWidth-113)),y=clamp(p.y-b.top,113,b.height-113);
    radial={id:h.id,start:p,index:-1,count:Number(value('count'))};
    wheel.style.left=x+'px';wheel.style.top=y+'px';wheel.style.setProperty('--sector',360/radial.count+'deg');wheel.replaceChildren();
    for(let i=0;i<radial.count;i++){
      const angle=i*Math.PI*2/radial.count,b=document.createElement('button');
      b.textContent=tools[layout[i]];
      b.style.left=104+Math.sin(angle)*75+'px';b.style.top=104-Math.cos(angle)*75+'px';
      b.onclick=()=>{pick(layout[i]);closeWheel();};wheel.append(b);
    }
    wheel.hidden=false;
  }
  function resetGestures(){
    drawBones();
    end();closeWheel();old.clear();blocked.clear();palmGuard.clear();
    pose=null;slider=null;clearDwell();cursor.hidden=true;
    hover?.classList.remove('gesture-hover');hover=null;
  }
  function point(h){
    const b=section.getBoundingClientRect();
    const top=Math.max(0,b.top),bottom=Math.min(innerHeight,b.bottom);
    return {x:b.left+b.width*clamp((h.tip.x-.08)/.84,0,.999),y:top+(bottom-top)*clamp((h.tip.y-.08)/.84,0,.999)};
  }
  function handsFrame(data){
    if(!active)return;
    drawBones(data.landmarks);
    if(mouse)return;
    const hands=data.landmarks.map((p,i)=>{
      const id=data.handedness?.[i]?.[0]?.categoryName||String(i), prior=old.get(id);
      const mask=fingerMask(p,prior?.mask||0), span=Math.max(.03,gap(p[0],p[9]),gap(p[5],p[17]));
      const separation=Math.hypot(p[4].x-p[8].x,p[4].y-p[8].y,(p[4].z??0)-(p[8].z??0))/span;
      const pinch=separation<(prior?.pinch?.43:.29);
      const foldedIndex=gap(p[8],p[5])/span<.66;
      const fistPose=(mask&30)===0&&(!pinch||foldedIndex);
      const fistSince=fistPose?(prior?.fistSince??performance.now()):null;
      const fist=fistPose&&performance.now()-fistSince>=90;
      const x=v=>mirrorSettings.mirrorControls?1-v:v;
      const tip=pinch?mid(p[4],p[8]):p[8];
      return {id,mask,pinch:pinch&&!fist,fistSince,tip:{x:x(tip.x),y:tip.y},
        grip:{x:x(p[9].x),y:p[9].y}, palm:!pinch&&(mask&30)===30&&gap(p[5],p[17])/span>.43,
        fist,two:!pinch&&(mask&30)===6&&gap(p[8],p[12])/span<.55};
    });
    if(!hands.length){resetGestures();return;}
    const lost=[...old.keys()].some(id=>!hands.some(h=>h.id===id));
    if(lost){end();pose=null;slider=null;}
    for(const h of hands)if(h.pinch&&!old.has(h.id))blocked.add(h.id);
    old=new Map(hands.map(h=>[h.id,h]));
    for(const h of hands){
      if(!h.pinch)blocked.delete(h.id);
      if(!h.fist&&!h.palm)palmGuard.delete(h.id);
    }
    const pinches=hands.filter(h=>h.pinch);
    const hand=pinches.find(h=>h.id===pose?.brush)||pinches[0]||hands[0], p=point(hand), rect=stage.getBoundingClientRect();
    cursor.hidden=false;cursor.style.left=p.x-rect.left+'px';cursor.style.top=p.y-rect.top+'px';
    cursor.classList.remove('active');
    if(radial){
      for(const h of pinches)blocked.add(h.id);
      const owner=hands.find(h=>h.id===radial.id);
      if(!owner){closeWheel();return;}
      const second=hands.find(h=>h.id!==owner.id&&h.pinch);
      if(!second){clearDwell();}
      if(second){
        const at=point(second), target=document.elementFromPoint(at.x,at.y);
        if(target?.matches('button')&&wheel.contains(target)){
          if(activate(target,second)){blocked.add(second.id);return;}
        }else clearDwell();
      }
      if(!owner.two){
        if(radial.index>=0)pick(layout[radial.index]);
        closeWheel();return;
      }
      const at=point(owner), dx=at.x-radial.start.x,dy=at.y-radial.start.y;
      radial.index=Math.hypot(dx,dy)<25?-1:(Math.round(Math.atan2(dx,-dy)*radial.count/(2*Math.PI))+radial.count)%radial.count;
      [...wheel.children].forEach((b,i)=>b.classList.toggle('hot',i===radial.index));
      return;
    }
    const two=hands.find(h=>h.two);
    if(two&&!pinches.length){
      if(hold?.id!==two.id)hold={id:two.id,time:performance.now()};
      if(performance.now()-hold.time>=1500){end();pose=null;openWheel(two,point(two));return;}
    }else hold=null;
    const control=document.elementFromPoint(p.x,p.y)?.closest('button,input[type=range],a,summary');
    const ui=section.contains(control)?control:null;
    hover?.classList.remove('gesture-hover');hover=ui;hover?.classList.add('gesture-hover');
    if(slider?.id!==hand.id||!hand.pinch)slider=null;
    if(!hand.pinch){clearDwell();}
    if((ui||slider||!insideStage(p,rect))&&!(hand.fist&&!hand.pinch)){
      end();pose=null;
      if(hand.pinch)blocked.add(hand.id);
      if(!slider&&ui&&activate(ui,hand)&&ui.matches('input[type=range]'))slider={id:hand.id,control:ui};
      if(slider){
        const c=slider.control,b=c.getBoundingClientRect();
        c.value=Number(c.min)+clamp((p.x-b.left)/b.width,0,1)*(c.max-c.min);
        c.dispatchEvent(new Event('input',{bubbles:true}));
      }
      return;
    }
    clearDwell();
    const palm=hands.find(h=>h.id!==hand.id&&h.palm);
    if(palm&&hand.pinch)palmGuard.add(palm.id);
    const fists=hands.filter(h=>h.fist&&!palmGuard.has(h.id));
    if(lost&&hand.pinch)blocked.add(hand.id);
    const brush=hand.pinch&&palm&&!blocked.has(hand.id)&&!show;
    if(brush){
      cursor.classList.add('active');dab(p.x,p.y);pose={brush:hand.id};return;
    }
    end();
    const mode=pinches.length===2?'pan':fists.length===2?'orbit':fists.length===1?'grab':'';
    if(!mode){pose=null;return;}
    if(mode==='pan')for(const h of pinches)blocked.add(h.id);
    const pair=mode==='pan'?pinches:mode==='orbit'?fists:null;
    const at=pair?mid(pair[0].grip,pair[1].grip):fists[0].grip;
    const spread=pair?Math.max(.04,gap(pair[0].grip,pair[1].grip)):1;
    const sizing=mode==='grab'?pinches.find(h=>!blocked.has(h.id)):null;
    const signature=mode+(pair||fists).map(h=>h.id).sort().join('/');
    const last=pose;
    const stable=last?.signature===signature&&gap(at,last.at)<.18;
    const smooth=stable?{x:last.at.x+(at.x-last.at.x)*.42,y:last.at.y+(at.y-last.at.y)*.42}:at;
    const current={signature,at:smooth,spread,sizing:sizing?.id,x:sizing?.grip.x};
    pose=current;
    if(!stable)return;
    const dx=smooth.x-last.at.x,dy=smooth.y-last.at.y;
    if(mode==='grab'){
      model.rotateOnWorldAxis(new T.Vector3(0,1,0),dx*5);
      model.rotateOnWorldAxis(new T.Vector3(1,0,0),dy*5);
      if(sizing&&last.sizing===sizing.id&&Math.abs(current.x-last.x)<.18)
        model.scale.setScalar(clamp(model.scale.x*Math.exp((current.x-last.x)*2),.3,2.5));
      if(dx||dy||sizing)autosave();
    }else if(mode==='orbit'){
      orbit.theta-=dx*5;orbit.phi=clamp(orbit.phi-dy*4,.12,Math.PI-.12);
    }else{
      orbit.radius=clamp(orbit.radius*Math.pow(last.spread/spread,.48),2.4,15);
      target.add(new T.Vector3(-dx*orbit.radius,dy*orbit.radius,0).applyQuaternion(camera.quaternion));
    }
  }
  let cameraState='off';
  const tracking=new HandCamera(video,{onResults:handsFrame,onLost:resetGestures,onState:({type,message})=>{
    cameraState=type;video.hidden=!video.srcObject;status(message);
    get('[data-action=camera]').textContent=type==='off'?'Включить камеру':type==='error'?'Повторить камеру':'Выключить камеру';
  }});
  canvas.oncontextmenu=e=>e.preventDefault();
  canvas.onpointerdown=e=>{
    if(e.button!==0&&e.button!==2)return;
    resetGestures();mouse={id:e.pointerId,x:e.clientX,y:e.clientY,button:e.button};canvas.setPointerCapture(e.pointerId);
    if(!e.button)dab(e.clientX,e.clientY);
  };
  canvas.onpointermove=e=>{
    if(mouse?.id!==e.pointerId)return;
    if(mouse.button===2){
      orbit.theta-=(e.clientX-mouse.x)*.009;
      orbit.phi=clamp(orbit.phi-(e.clientY-mouse.y)*.009,.12,Math.PI-.12);
    }else dab(e.clientX,e.clientY);
    mouse.x=e.clientX;mouse.y=e.clientY;
  };
  canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=()=>{mouse=null;end();};
  canvas.addEventListener('wheel',e=>{e.preventDefault();orbit.radius=clamp(orbit.radius*Math.exp(e.deltaY*.0007),2.4,15);},{passive:false});
  async function exportModel(format){
    end();
    if(outstanding){status('Дождитесь обновления поверхности и повторите экспорт.');return;}
    if(!model.geometry.getAttribute('position')?.count){status('Добавьте материал перед экспортом.');return;}
    const exported=model.clone();
    exported.scale.multiplyScalar(clamp(Number(value('export-scale'))||1,.01,1000));
    exported.updateMatrixWorld(true);
    if(format==='glb'){
      const {GLTFExporter}=await import('./sculpt-GLTFExporter.js');
      download(await new GLTFExporter().parseAsync(exported,{binary:true}),'musin.glb','model/gltf-binary');
    }else if(format==='stl'){
      const {STLExporter}=await import('./sculpt-STLExporter.js');
      download(new STLExporter().parse(exported,{binary:true}),'musin.stl','model/stl');
    }else{
      const {OBJExporter}=await import('./sculpt-OBJExporter.js');
      model.material.name='Clay';
      download('mtllib musin.mtl\n'+new OBJExporter().parse(exported),'musin.obj','text/plain');
      download('newmtl Clay\nKd 1 1 1\nKa 0 0 0\n','musin.mtl','text/plain');
    }
  }
  section.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]'), action=b?.dataset.action;
    if(!action)return;
    if(Object.hasOwn(tools,action)){end();pick(action);return;}
    switch(action){
      case 'camera':
        if(cameraState==='off'||cameraState==='error')tracking.start();else tracking.stop();
        break;
      case 'undo':case 'redo':end();remesh(action);autosave();break;
      case 'symmetry':end();symmetry=!symmetry;b.setAttribute('aria-pressed',String(symmetry));break;
      case 'show':end();show=!show;grid.visible=!show;b.setAttribute('aria-pressed',String(show));break;
      case 'bones':
        showBones=!showBones;localStorage.setItem('musin-bones',String(showBones));
        b.setAttribute('aria-pressed',String(showBones));drawBones();break;
      case 'mirrorCamera':case 'mirrorControls':
        mirrorSettings[action]=!mirrorSettings[action];
        localStorage.setItem('musin-'+action,String(mirrorSettings[action]));
        mirrorView();resetGestures();break;
      case 'axisX':case 'axisY':case 'axisZ': {
        end();target.set(0,0,0);
        const axis=action.slice(-1);
        orbit.theta=axis==='X'?Math.PI/2:0;orbit.phi=axis==='Y'?.0001:Math.PI/2;
        break;
      }
      case 'frame':target.set(0,0,0);orbit.set(fitDistance(.52),1.42,.24);break;
      case 'save':end();saveFile=true;send('save');break;
      case 'reset':
        if(confirm('Заменить текущую модель выбранной заготовкой?')){
          end();model.quaternion.identity();model.scale.setScalar(1);remesh('reset',{shape:value('shape')});autosave();
        }
        break;
      case 'glb':case 'obj':case 'stl':
        exportModel(action).catch(error=>status('Экспорт не удался. '+error.message));
        break;
      case 'png':case 'jpeg':
        grid.visible=false;renderer.render(scene,camera);
        canvas.toBlob(blob=>{if(blob)download(blob,'musin.'+action,'image/'+action);},'image/'+action,.94);
        grid.visible=!show;
        break;
    }
  });
  get('input[type=file]').onchange=async e=>{
    const input=e.target,file=input.files[0];input.value='';
    if(!file)return;
    try{
      if(file.size>30_000_000)throw Error('Файл слишком большой');
      load(JSON.parse(await file.text()));autosave();status('Проект открыт');
    }catch(error){status(error.message);}
  };
  return {
    enter(){if(active)return;active=true;time=performance.now();raf=requestAnimationFrame(render);},
    stop(){active=false;cancelAnimationFrame(raf);tracking.stop();mouse=null;resetGestures();}
  };
}
