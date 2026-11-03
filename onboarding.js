const steps={
  sculpt:[
    ['Поверните модель','Сожмите один кулак и плавно переместите руку в сторону.','grab'],
    ['Обойдите сцену','Сожмите два кулака и переместите их вместе влево или вправо.','orbit'],
    ['Приблизьте модель','Сделайте два щипка и разведите руки. Сведите их, чтобы отдалить.','pan'],
    ['Попробуйте глину','Наведите щипок на модель и покажите открытую ладонь второй рукой.','sculpt-brush']
  ],
  draw:[
    ['Выберите кисть','Нажмите «Кисть».','#draw-brush'],
    ['Сделайте мазок','Сомкните большой и указательный пальцы и проведите рукой. Можно также провести мышью по холсту.','draw'],
    ['Выберите ластик','Подержите указательный и средний пальцы вместе или нажмите «Ластик».','tool','#draw-eraser'],
    ['Измените масштаб','Сделайте два щипка и разведите руки.','zoom'],
    ['Отмените мазок','Нажмите кнопку отмены.','#draw-undo']
  ],
  music:[
    ['Выберите инструмент','Откройте список инструментов и выберите тембр.','#instrument'],
    ['Сыграйте C','В режиме «Одна рука · 7 аккордов» покажите указательный палец. Без камеры нажмите 1 или первую карточку аккорда.','C'],
    ['Сыграйте G','Покажите открытую ладонь. Без камеры нажмите 5 или пятую карточку.','G'],
    ['Сыграйте Am','Покажите указательный и средний пальцы. Без камеры нажмите 2 или вторую карточку.','Am'],
    ['Выберите бой','Выберите гитару или укулеле, включите циклический бой и выберите готовый рисунок в списке. Например, «Восьмёрка», если она есть в списке.','#groove-preset'],
    ['Запустите бой','Нажмите «Запустить бой». Меняйте аккорды, пока бой идёт.','#groove-toggle']
  ],
  game:[
    ['Выберите мелодию','Откройте список мелодий и выберите песню.','#song-select'],
    ['Настройте скорость','Выберите удобный темп в списке «Скорость».','#lesson-speed'],
    ['Выберите правила','В тренировке игра ждёт жест. В режиме «Ритм» мелодия продолжается, даже если пропустить ноту.','#lesson-rule'],
    ['Начните игру','Выберите камеру или клавиши в поле «Управление» и нажмите «Играть».','#lesson-start']
  ]
};
const panel=document.createElement('aside');
panel.className='onboarding';
panel.hidden=true;
panel.innerHTML='<small></small><h2></h2><p></p><div><button type="button" data-guide="next" disabled>Дальше</button><button type="button" data-guide="skip">Пропустить обучение</button></div>';
document.body.append(panel);
const launch=document.createElement('button');
launch.type='button';
launch.textContent='Обучение';
launch.className='onboarding-launch';
launch.hidden=true;
document.querySelector('main > header').append(launch);
const next=panel.querySelector('[data-guide=next]');
let route,index=0;
const seen=new Set();
const key=()=> 'qolmen-onboarding-v1-'+route;
function seenBefore(){
  try{return seen.has(route)||localStorage.getItem(key())==='done';}catch{return seen.has(route);}
}
function render(){
  const [title,description]=steps[route][index];
  document.querySelector('.onboarding-target')?.classList.remove('onboarding-target');
  const selector=steps[route][index].slice(2).find(action=>action.startsWith('#'));
  if(selector)document.querySelector(selector)?.classList.add('onboarding-target');
  panel.querySelector('small').textContent='Обучение · '+(index+1)+' / '+steps[route].length;
  panel.querySelector('h2').textContent=title;
  panel.querySelector('p').textContent=description;
  next.textContent=index===steps[route].length-1?'Готово':'Дальше';
  next.disabled=true;
}
function open(){
  index=0;
  render();
  panel.hidden=false;
}
function close(){
  seen.add(route);
  try{localStorage.setItem(key(),'done');}catch{}
  panel.hidden=true;
  document.querySelector('.onboarding-target')?.classList.remove('onboarding-target');
}
launch.onclick=open;
panel.querySelector('[data-guide=skip]').onclick=close;
next.onclick=()=>{
  if(next.disabled)return;
  if(index+1===steps[route].length){close();return;}
  index++;
  render();
};
function mark(action){
  if(!panel.hidden&&steps[route][index].slice(2).includes(action))next.disabled=false;
}
window.addEventListener('qolmen-practice',event=>mark(event.detail));
for(const type of ['click','change']){
  document.addEventListener(type,event=>{
    if(panel.hidden)return;
    for(const target of steps[route][index].slice(2)){
      if(!target.startsWith('#'))continue;
      const control=document.querySelector(target);
      if(control?.contains(event.target)&&((control.tagName==='SELECT')===(type==='change')))mark(target);
    }
  },true);
}
function enter(workspace){
  if(route===workspace)return;
  route=workspace;
  panel.hidden=true;
  document.querySelector('.onboarding-target')?.classList.remove('onboarding-target');
  launch.hidden=!steps[route];
  if(steps[route]&&!seenBefore())open();
}
window.addEventListener('qolmen-route',event=>enter(event.detail.route));
enter(document.body.dataset.workspace||location.hash.slice(1));
