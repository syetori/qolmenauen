let drawing=null,loading=null,current=null,routeToken=0;
const route=()=>location.hash==='#sculpt'?'sculpt':location.hash==='#music'?'music':location.hash==='#game'?'game':location.hash==='#draw'?'draw':'home';
async function navigate(){const next=route(),token=++routeToken,previous=current;current=next;if(previous==='draw'&&next!=='draw')drawing?.stop();document.getElementById('home-screen').hidden=next!=='home';document.getElementById('music-app').hidden=!['music','game'].includes(next);document.getElementById('drawing-app').hidden=next!=='draw';document.body.dataset.workspace=next;document.body.classList.toggle('drawing-view',next==='draw');if(!['music','game'].includes(next))document.body.classList.remove('lesson-view');document.title=next==='draw'?'Сурет — рисуйте руками · Qolmen':next==='music'?'Әуен — свободная студия · Qolmen':next==='game'?'Ойын — музыкальная игра · Qolmen':'Qolmen — создавайте руками';window.dispatchEvent(new CustomEvent('qolmen-route',{detail:{route:next,previous}}));window.scrollTo({top:0,behavior:'instant'});if(next==='draw'){try{if(!loading)loading=import('./drawing.js?v=11').then(m=>m.mountDrawing());drawing=await loading;if(token!==routeToken||current!=='draw'){drawing.stop();return;}drawing.enter();}catch(e){loading=null;document.getElementById('draw-action').textContent='Не удалось открыть холст: '+e.message;}}}
let sculpt, sculptLoading;
window.addEventListener('qolmen-route', async ({detail:{route}})=>{
  const section=document.getElementById('sculpt-app');
  section.hidden=route!=='sculpt';
  if(route!=='sculpt'){sculpt?.stop();return;}
  document.title='Мүсін · Qolmen';
  try {
    sculptLoading ||= import('./sculpt.js?v=17').then(module=>module.mountSculpt(section));
    sculpt=await sculptLoading;
    if(location.hash==='#sculpt')sculpt.enter();
  } catch(error) {
    sculptLoading=null;
    section.textContent='Не удалось открыть мастерскую. '+error.message;
  }
});
window.addEventListener('hashchange',navigate);
navigate();
