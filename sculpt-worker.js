const size = 81, step = .04, origin = -1.6;
const index = (x,y,z) => x+size*(y+size*z);
const corners = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
const tetrahedra = [[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6],[0,5,1,6]];
let field, paint, before;
const undo=[], redo=[];
function reset(shape) {
  field=new Float32Array(size**3); paint=new Uint32Array(field.length);
  for(let z=0;z<size;z++) for(let y=0;y<size;y++) for(let x=0;x<size;x++){
    const a=origin+x*step,b=origin+y*step,c=origin+z*step;
    field[index(x,y,z)]=shape==='block' ? Math.max(Math.abs(a),Math.abs(b),Math.abs(c))-.65 :
      Math.hypot(a,b*(shape==='head'?.76:1),c)-.76;
  }
}
function stamp({point,radius,strength,tool,color,opacity,normal}) {
  const center=point.map(v=>(v-origin)/step), r=radius/step;
  const lo=center.map(v=>Math.max(1,Math.floor(v-r))), hi=center.map(v=>Math.min(size-2,Math.ceil(v+r)));
  const source=['smooth','flatten','inflate'].includes(tool)?field.slice():field;
  for(let z=lo[2];z<=hi[2];z++) for(let y=lo[1];y<=hi[1];y++) for(let x=lo[0];x<=hi[0];x++){
    const d=Math.hypot(x-center[0],y-center[1],z-center[2])/r;
    if(d>=1) continue;
    const i=index(x,y,z), weight=(1-d*d)**2*strength;
    if(!before.has(i)) before.set(i,[field[i],paint[i]]);
    if(tool==='paint'){
      const old=paint[i]||0xc99479;
      const mix=Math.min(1,opacity*weight);
      paint[i]=[16,8,0].reduce((n,s)=>n+(Math.round(((old>>s)&255)*(1-mix)+((color>>s)&255)*mix)<<s),0);
    } else if(tool==='smooth'){
      const mean=[1,-1,size,-size,size*size,-size*size].reduce((sum,j)=>sum+source[i+j],0)/6;
      field[i]+=(mean-source[i])*weight;
    } else if(tool==='flatten') {
      const plane=(origin+x*step-point[0])*normal[0]+(origin+y*step-point[1])*normal[1]+(origin+z*step-point[2])*normal[2];
      field[i]+=(plane-source[i])*weight*.35;
    } else {
      const direction=['cut','erase','engrave'].includes(tool)?1:-1;
      field[i]+=direction*weight*radius*(tool==='pull'?.48:tool==='engrave'?.12:.27);
    }
  }
}
function mesh(){
  const positions=[], colors=[], normals=[];
  const rgb=n=>[16,8,0].map(s=>((n>>s)&255)/255);
  for(let z=0;z<size-1;z++) for(let y=0;y<size-1;y++) for(let x=0;x<size-1;x++){
    const base=index(x,y,z);
    const sign=field[base]<0, layer=size*size;
    if((field[base+1]<0)===sign&&(field[base+size]<0)===sign&&(field[base+size+1]<0)===sign&&
      (field[base+layer]<0)===sign&&(field[base+layer+1]<0)===sign&&(field[base+layer+size]<0)===sign&&
      (field[base+layer+size+1]<0)===sign)continue;
    const ids=[base,base+1,base+1+size,base+size,base+size*size,base+size*size+1,base+size*size+size+1,base+size*size+size];
    const values=ids.map(i=>field[i]);
    const at=i=>corners[i].map((v,k)=>origin+([x,y,z][k]+v)*step);
    const grad=i=>{const j=ids[i];return [1,size,size*size].map(k=>(field[j+k]??field[j])-(field[j-k]??field[j]));};
    const edge=(a,b)=>{
      const t=values[a]/(values[a]-values[b]), p=at(a), q=at(b), g=grad(a), h=grad(b);
      return [p.map((v,k)=>v+(q[k]-v)*t),g.map((v,k)=>v+(h[k]-v)*t),rgb(paint[ids[a]]||paint[ids[b]]||0xc99479)];
    };
    const emit=(a,b,c)=>{
      const u=b[0].map((v,i)=>v-a[0][i]),v=c[0].map((w,i)=>w-a[0][i]);
      const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      if(cross.reduce((sum,w,i)=>sum+w*(a[1][i]+b[1][i]+c[1][i]),0)<0) [b,c]=[c,b];
      for(const [p,n,color] of [a,b,c]){
        positions.push(...p); colors.push(...color); const length=Math.hypot(...n)||1;
        normals.push(...n.map(v=>v/length));
      }
    };
    for(const t of tetrahedra){
      const inside=t.filter(i=>values[i]<0), outside=t.filter(i=>values[i]>=0);
      if(!inside.length||!outside.length) continue;
      if(inside.length===2){
        const [a,b]=inside,[c,d]=outside;
        const ac=edge(a,c),ad=edge(a,d),bc=edge(b,c),bd=edge(b,d);
        emit(ac,ad,bc); emit(bc,ad,bd);
      }else{
        const [one,many]=inside.length===1?[inside,outside]:[outside,inside];
        emit(...many.map(i=>edge(one[0],i)));
      }
    }
  }
  const buffers=[positions,normals,colors].map(a=>Float32Array.from(a));
  postMessage({type:'mesh',buffers},buffers.map(a=>a.buffer));
}
function restore(source,destination){
  const changes=source.pop();
  if(!changes) return;
  const previous=new Map();
  for(const [i,[value,color]] of changes){previous.set(i,[field[i],paint[i]]);field[i]=value;paint[i]=color;}
  destination.push(previous);
}
onmessage=({data})=>{
  switch(data.type){
    case 'reset': reset(data.shape); undo.length=redo.length=0; before=null; break;
    case 'load': field=data.field; paint=data.paint; undo.length=redo.length=0; before=null; break;
    case 'begin': before=new Map(); return;
    case 'stamp': if(!before)return; for(const sample of data.samples)stamp(sample); break;
    case 'end': if(before?.size){undo.push(before);if(undo.length>24)undo.shift();redo.length=0;}before=null;return;
    case 'undo': restore(undo,redo);break;
    case 'redo': restore(redo,undo);break;
    case 'save': if(field)postMessage({type:'save',field,paint});return;
  }
  mesh();
};
