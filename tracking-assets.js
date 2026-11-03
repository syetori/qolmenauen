/* Immutable, verified, resumable model downloads. Only static files are transferred. */
(()=>{
 const CACHE='qolmen-tracking-parts-v1';
 const bounded=(p,ms=1000)=>{let t;return Promise.race([p,new Promise((_,reject)=>{t=setTimeout(()=>reject(Error('Cache unavailable')),ms);})]).finally(()=>clearTimeout(t));};
 const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
 async function fetchBytes(url,onBytes=()=>{}){
  const controller=new AbortController();let timer,loaded=0;const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(),18000);};arm();
  try{const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('HTTP '+response.status);const chunks=[],reader=response.body?.getReader();if(!reader){const b=new Uint8Array(await response.arrayBuffer());onBytes(b.length);return b;}while(true){const {done,value}=await reader.read();if(done)break;arm();chunks.push(value);loaded+=value.length;onBytes(loaded);}const bytes=new Uint8Array(loaded);let at=0;for(const b of chunks){bytes.set(b,at);at+=b.length;}return bytes;}finally{clearTimeout(timer);}
 }
 async function prepare(files,modelURL,onProgress){
  const base=new URL('./',modelURL),root=new URL('../',base),key=url=>new URL(url,root).href;let cache;try{cache=await bounded(caches.open(CACHE));}catch{}
  async function cached(url){if(!cache)return null;try{const response=await bounded(cache.match(key(url)));return response?new Uint8Array(await bounded(response.arrayBuffer())):null;}catch{return null;}}
  const save=(url,bytes)=>{if(cache)cache.put(key(url),new Response(bytes)).catch(()=>{});};
  if(typeof DecompressionStream!=='function'){
   onProgress?.('Совместимая загрузка модели и движка…');
   const urls=[modelURL,files.wasmBinaryPath,files.wasmLoaderPath],buffers=await Promise.all(urls.map(async(url,i)=>{const stored=await cached(url);if(stored)return stored;let result;try{result=await fetchBytes(url,n=>onProgress?.(`Загрузка ${i+1}/3: ${(n/1048576).toFixed(1)} МБ`));}catch{result=await fetchBytes(url,n=>onProgress?.(`Повтор загрузки ${i+1}/3: ${(n/1048576).toFixed(1)} МБ`));}save(url,result);return result;}));
   return result(buffers,files);
  }
  let manifestBytes=await cached('tracking-parts-v1.json');if(!manifestBytes){try{manifestBytes=await fetchBytes(key('tracking-parts-v1.json'));}catch{throw Error('Не удалось получить список файлов отслеживания. Нажмите «Повторить распознавание».');}save('tracking-parts-v1.json',manifestBytes);}
  const manifest=JSON.parse(new TextDecoder().decode(manifestBytes));if(manifest.version!=='mediapipe-0.10.21-hand1')throw Error('Неподдерживаемая версия файлов отслеживания');
  const simd=!files.wasmBinaryPath.includes('nosimd'),assets=[manifest.assets.model,manifest.assets[simd?'simd':'nosimd'],manifest.assets[simd?'loader-simd':'loader-nosimd']],expanded=[],parts=assets.map(a=>Array(a.parts.length)),progress=new Map(),jobs=[];let last=0;
  const total=assets.reduce((n,a)=>n+a.compressedBytes,0),notify=()=>{const now=performance.now();if(now-last<150)return;last=now;const bytes=[...progress.values()].reduce((a,b)=>a+b,0);onProgress?.(`Загрузка отслеживания: ${Math.min(100,Math.round(bytes/total*100))}% · ${(bytes/1048576).toFixed(1)} / ${(total/1048576).toFixed(1)} МБ. Скачанные части сохраняются.`);};
  for(let a=0;a<assets.length;a++){const asset=assets[a],stored=await cached('expanded-'+asset.name);if(stored&&stored.length===asset.bytes&&await digest(stored)===asset.sha256){expanded[a]=stored;progress.set('expanded-'+a,asset.compressedBytes);continue;}for(let i=0;i<asset.parts.length;i++)jobs.push({a,i,part:asset.parts[i]});}
  // Interleave model and engine chunks; at most six small requests are in flight.
  jobs.sort((a,b)=>a.i-b.i||a.a-b.a);let cursor=0;
  async function worker(){while(cursor<jobs.length){const {a,i,part}=jobs[cursor++],id=a+':'+i;let bytes=await cached(part.file);if(bytes&&(bytes.length!==part.bytes||await digest(bytes)!==part.sha256))bytes=null;
   for(let attempt=0;!bytes&&attempt<3;attempt++){try{bytes=await fetchBytes(key(part.file),n=>{progress.set(id,n);notify();});if(bytes.length!==part.bytes||await digest(bytes)!==part.sha256)throw Error('Неполный файл');save(part.file,bytes);}catch{bytes=null;progress.set(id,0);onProgress?.(`Повторяем часть ${i+1}/${assets[a].parts.length}. Уже скачанное сохранено.`);}}
   if(!bytes)throw Error(`Не удалось загрузить часть ${i+1}/${assets[a].parts.length}. Уже скачанное сохранено — нажмите «Повторить распознавание».`);parts[a][i]=bytes;progress.set(id,part.bytes);notify();
  }}
  await Promise.all(Array.from({length:Math.min(6,jobs.length)},worker));
  for(let a=0;a<assets.length;a++){if(expanded[a])continue;const asset=assets[a],compressed=new Uint8Array(asset.compressedBytes);let at=0;for(const part of parts[a]){compressed.set(part,at);at+=part.length;}const bytes=new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());if(bytes.length!==asset.bytes||await digest(bytes)!==asset.sha256)throw Error('Файлы отслеживания не прошли проверку целостности');expanded[a]=bytes;save('expanded-'+asset.name,bytes);}
  onProgress?.('Файлы готовы · запускаем распознавание…');return result(expanded,files);
 }
 function result([model,wasm,loader],files){if(wasm[0]!==0||wasm[1]!==97||wasm[2]!==115||wasm[3]!==109)throw Error('Повреждён движок отслеживания');return{model,files:{...files,wasmBinaryPath:URL.createObjectURL(new Blob([wasm],{type:'application/wasm'})),wasmLoaderPath:URL.createObjectURL(new Blob([loader],{type:'text/javascript'}))}};}
 globalThis.QolmenTrackingAssets={prepare};
})();
