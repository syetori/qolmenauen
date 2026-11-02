let preparation=null;const listeners=new Set();
export async function prepareTracking(onProgress){
 if(onProgress)listeners.add(onProgress);
 if(!preparation){let timer;const work=(async()=>{await Promise.all([import('./vendor/vision-classic.js'),import('./tracking-assets.js?v=9')]);const files=await globalThis.vision.FilesetResolver.forVisionTasks(new URL('./vendor',import.meta.url).href);return globalThis.QolmenTrackingAssets.prepare(files,new URL('./vendor/hand_landmarker.task',import.meta.url).href,message=>listeners.forEach(fn=>fn(message)));})();preparation=Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Подготовка отслеживания не завершилась за 25 секунд. Нажмите «Повторить распознавание».')),25000);})]).finally(()=>clearTimeout(timer)).catch(error=>{preparation=null;throw error;});}
 try{return await preparation;}finally{if(onProgress)listeners.delete(onProgress);}
}
export async function createMainDetector(delegate='GPU',profile='default'){
 const prepared=await prepareTracking(),confidence=profile==='drawing'?.5:.6;
 return globalThis.vision.HandLandmarker.createFromOptions(prepared.files,{baseOptions:{modelAssetBuffer:prepared.model,delegate},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:confidence,minHandPresenceConfidence:confidence,minTrackingConfidence:confidence});
}
