/* Assets are prepared once, in parallel, before worker initialization. */
let detector;
self.onmessage=async({data})=>{
 if(data.type==='init'){
  try{
   importScripts('./vendor/vision-classic.js');
   if(!data.prepared)throw Error('Нет подготовленных файлов отслеживания');
   const confidence=data.profile==='drawing'?.5:.6;
   postMessage({type:'progress',message:'Файлы готовы. Запускаем распознавание…'});
   detector=await self.vision.HandLandmarker.createFromOptions(data.prepared.files,{baseOptions:{modelAssetBuffer:data.prepared.model,delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:confidence,minHandPresenceConfidence:confidence,minTrackingConfidence:confidence});
   postMessage({type:'ready'});
  }catch(e){postMessage({type:'error',message:e?.message||String(e)});}
 }else if(data.type==='frame'){
  try{const t=performance.now(),r=detector.detectForVideo(data.bitmap,data.time);postMessage({type:'result',landmarks:r.landmarks,handedness:r.handedness,elapsed:performance.now()-t,time:data.time});}
  catch(e){postMessage({type:'error',message:e?.message||String(e)});}
  finally{data.bitmap.close();}
 }
};
