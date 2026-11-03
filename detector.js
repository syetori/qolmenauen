let preparation=null;const listeners=new Set();
export async function prepareTracking(onProgress){
 if(onProgress)listeners.add(onProgress);
 if(!preparation){let timer,rejectIdle;const stalled=new Promise((_,reject)=>{rejectIdle=reject;}),progress=message=>{clearTimeout(timer);timer=setTimeout(()=>rejectIdle(Error('Загрузка отслеживания перестала отвечать. Уже скачанные части сохранены; повторите запуск.')),60000);listeners.forEach(fn=>fn(message));};progress('Подключаем отслеживание…');
 const work=(async()=>{await Promise.all([import('./vendor/vision-classic.js'),import('./tracking-assets.js?v=11')]);const files=await globalThis.vision.FilesetResolver.forVisionTasks(new URL('./vendor',import.meta.url).href);return globalThis.QolmenTrackingAssets.prepare(files,new URL('./vendor/hand_landmarker.task',import.meta.url).href,progress);})();preparation=Promise.race([work,stalled]).finally(()=>clearTimeout(timer)).catch(error=>{preparation=null;throw error;});}
 try{return await preparation;}finally{if(onProgress)listeners.delete(onProgress);}
}
export async function createMainDetector(delegate='GPU',profile='default'){
 const prepared=await prepareTracking(),confidence=profile==='drawing'?.5:.6;
 return globalThis.vision.HandLandmarker.createFromOptions(prepared.files,{baseOptions:{modelAssetBuffer:prepared.model,delegate},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:confidence,minHandPresenceConfidence:confidence,minTrackingConfidence:confidence});
}
