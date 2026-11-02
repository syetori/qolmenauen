/* Classic worker: MediaPipe's WASM loader requires importScripts(). */
let detector;
self.onmessage=async({data})=>{
 if(data.type==='init'){
  try{
   importScripts('./vendor/vision-classic.js');
   const {HandLandmarker,FilesetResolver}=self.vision;
   const confidence=data.profile==='drawing'?.5:.6;
   const files=await FilesetResolver.forVisionTasks(new URL('./vendor',self.location.href).href);
   detector=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./vendor/hand_landmarker.task',self.location.href).href,delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:confidence,minHandPresenceConfidence:confidence,minTrackingConfidence:confidence});
   postMessage({type:'ready'});
  }catch(e){postMessage({type:'error',message:e?.message||String(e)});}
 }else if(data.type==='frame'){
  try{const t=performance.now(),r=detector.detectForVideo(data.bitmap,data.time);postMessage({type:'result',landmarks:r.landmarks,handedness:r.handedness,elapsed:performance.now()-t,time:data.time});}
  catch(e){postMessage({type:'error',message:e?.message||String(e)});}
  finally{data.bitmap.close();}
 }
};
