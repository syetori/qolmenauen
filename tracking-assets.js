/* Shared classic-script asset loader: no video is sent to any download source. */
(()=>{
 const CACHE='qolmen-hand-assets-0.10.21-v1';
 function timeout(p,ms){return Promise.race([p,new Promise((_,reject)=>setTimeout(()=>reject(Error('Cache timeout')),ms))]);}
 async function download(name,urls,onProgress){
  const key=new URL('./vendor/'+name,location.href).href;
  let cache;try{cache=await timeout(caches.open(CACHE),600);const hit=await timeout(cache.match(key),600);if(hit){const bytes=new Uint8Array(await timeout(hit.arrayBuffer(),1000));onProgress?.(bytes.length,bytes.length,true);return bytes;}}catch{}
  const controllers=urls.map(()=>new AbortController()),deadline=setTimeout(()=>controllers.forEach(c=>c.abort()),20000);let timers=[];
  const attempts=urls.map((entry,index)=>new Promise((resolve,reject)=>{const run=async()=>{try{const url=typeof entry==='string'?entry:entry.url;const response=await fetch(url,{signal:controllers[index].signal});if(!response.ok)throw Error('HTTP '+response.status);const total=Number(response.headers.get('content-length'))||0,reader=response.body?.getReader();let bytes;if(reader){const chunks=[];let size=0,last=0;while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);size+=value.length;if(performance.now()-last>180){onProgress?.(size,total,false);last=performance.now();}}bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}}else bytes=new Uint8Array(await response.arrayBuffer());if(typeof entry==='object'&&entry.gzip){bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());}if(bytes.length<1000)throw Error('Incomplete asset');onProgress?.(bytes.length,bytes.length,false);resolve({bytes,index});}catch(e){reject(e);}};if(index===0)run();else timers.push(setTimeout(run,800));}));
  try{const {bytes,index}=await Promise.any(attempts);controllers.forEach((c,i)=>{if(i!==index)c.abort();});if(cache)cache.put(key,new Response(bytes,{headers:{'Content-Type':name.endsWith('.wasm')?'application/wasm':'application/octet-stream'}})).catch(()=>{});return bytes;}catch{throw Error('Не удалось загрузить отслеживание за 20 секунд. Проверьте соединение и нажмите «Повторить распознавание».');}finally{clearTimeout(deadline);timers.forEach(clearTimeout);controllers.forEach(c=>c.abort());}
 }
 async function prepare(files,modelURL,onProgress){
  const wasmName=files.wasmBinaryPath.split('/').pop(),loaderName=files.wasmLoaderPath.split('/').pop(),progress={};let last=0;
  const notify=(name)=>(loaded,total,cached)=>{progress[name]={loaded,total,cached};const now=performance.now();if(now-last<180&&!cached&&loaded!==total)return;last=now;const entries=Object.values(progress),mb=entries.reduce((n,x)=>n+x.loaded,0)/1048576;onProgress?.(`Модель и движок: ${mb.toFixed(1)} МБ${entries.length===3&&entries.every(x=>x.cached)?' · из кэша':''}`);};
  const [model,wasm,loader]=await Promise.all([
   download('hand_landmarker.task',[modelURL,'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'],notify('model')),
   download(wasmName,[typeof DecompressionStream==='function'?{url:new URL('./tracking-'+wasmName+'.gz',location.href).href,gzip:true}:files.wasmBinaryPath,`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm/${wasmName}`],notify('wasm')),
   download(loaderName,[files.wasmLoaderPath,`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm/${loaderName}`],notify('loader'))
  ]);
  if(wasm[0]!==0||wasm[1]!==97||wasm[2]!==115||wasm[3]!==109)throw Error('Повреждён движок отслеживания');
  return{model,files:{...files,wasmBinaryPath:URL.createObjectURL(new Blob([wasm],{type:'application/wasm'})),wasmLoaderPath:URL.createObjectURL(new Blob([loader],{type:'text/javascript'}))}};
 }
 globalThis.QolmenTrackingAssets={prepare};
})();
