export async function createMainDetector(delegate='GPU',profile='default'){
 const confidence=profile==='drawing'?.5:.6;
 await import('./vendor/vision-classic.js');
 const {HandLandmarker,FilesetResolver}=globalThis.vision;
 const files=await FilesetResolver.forVisionTasks(new URL('./vendor',import.meta.url).href);
 return HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./vendor/hand_landmarker.task',import.meta.url).href,delegate},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:confidence,minHandPresenceConfidence:confidence,minTrackingConfidence:confidence});
}
