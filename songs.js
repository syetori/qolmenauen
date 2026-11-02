// Hand-entered educational arrangements. No recordings are included.
const tune=(names,durations={})=>names.split(/\s+/).map((name,i)=>({name,beats:durations[i]||1}));
const PITCH={C:60,D:62,E:64,F:65,G:67,A:69,B:71};
export function midi(name){const m=/^([A-G])([#b]?)([0-8])$/.exec(name);if(!m)throw Error('Invalid pitch '+name);return PITCH[m[1]]+(Number(m[3])-4)*12+(m[2]==='#'?1:m[2]==='b'?-1:0);}
export const noteName=n=>['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][n%12]+(Math.floor(n/12)-1);
const ode='E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4 D4 D4 E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4 C4 C4';
export const songs=[
 {id:'ode',title:'Ода к радости',author:'Людвиг ван Бетховен',tag:'Первые шаги · 5 нот',bpm:76,kind:'melody',description:'Знакомая тема в до мажоре. 30 нот, только пять жестов. Начните в режиме «Ждёт жест».',source:'https://www.mutopiaproject.org/ftp/BeethovenLv/ode/ode-a4.pdf',scale:['C','D','E','F','G','A','B'],notes:tune(ode,{12:1.5,13:.5,14:2,27:1.5,28:.5,29:2})},
 {id:'star',title:'Маленькая звезда',author:'Французская народная мелодия',tag:'Легко · 6 нот',bpm:82,kind:'melody',description:'Twinkle, Twinkle, Little Star — простая учебная версия. Повторяющиеся ноты переигрываются автоматически, если удерживать правильный жест.',scale:['C','D','E','F','G','A','B'],notes:tune('C4 C4 G4 G4 A4 A4 G4 F4 F4 E4 E4 D4 D4 C4 G4 G4 F4 F4 E4 E4 D4 G4 G4 F4 F4 E4 E4 D4 C4 C4 G4 G4 A4 A4 G4 F4 F4 E4 E4 D4 D4 C4',Object.fromEntries([6,13,20,27,34,41].map(i=>[i,2])))},
 {id:'brother',title:'Братец Яков',author:'Французская народная мелодия',tag:'Легко · 6 нот',bpm:80,kind:'melody',description:'Frère Jacques. Короткая мелодия с повторяющимися фразами и небольшими ускорениями.',scale:['C','D','E','F','G','A','B'],notes:tune('C4 D4 E4 C4 C4 D4 E4 C4 E4 F4 G4 E4 F4 G4 G4 A4 G4 F4 E4 C4 G4 A4 G4 F4 E4 C4 C4 G3 C4 C4 G3 C4',{10:2,13:2,14:.5,15:.5,16:.5,17:.5,20:.5,21:.5,22:.5,23:.5,28:2,31:2})},
 {id:'four-chords',title:'Круг четырёх аккордов',author:'Учебный этюд · C → G → Am → F',tag:'Аккорды · гитара и укулеле',bpm:80,kind:'chords',description:'Оригинальное упражнение на популярную последовательность C–G–Am–F. Удерживайте жест до следующей карточки; выберите гитару или укулеле для другого тембра.',notes:Array.from({length:4},()=>['C','G','Am','F']).flat().map(name=>({name,beats:4})),chordLanes:{C:0,Am:1,F:3,G:4}}
];
const classes={C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};
export function laneLabels(song){if(song.kind==='chords')return Array.from({length:7},(_,i)=>Object.keys(song.chordLanes).find(k=>song.chordLanes[k]===i)||'—');const labels=Array.from({length:7},()=>[]);song.scale.forEach((n,i)=>labels[i%7].push(n.replace('#','♯')));return labels.map(a=>a.join('/')||'—');}
export function compileSong(song,speed=1){if(!Number.isFinite(speed)||speed<=0)throw Error('Invalid speed');if(song.events)return song.events.map((e,id)=>({...e,id,start:e.start/speed,duration:e.duration/speed,name:noteName(e.pitch),chord:null}));const seconds=60/(song.bpm*speed);let beat=0;return song.notes.map((n,index)=>{const pitch=song.kind==='melody'?midi(n.name):null,indexInScale=pitch===null?-1:song.scale.findIndex(k=>classes[k]===pitch%12),lane=song.kind==='chords'?song.chordLanes[n.name]:indexInScale<0?-1:indexInScale%7;if(lane<0||lane>6||!Number.isInteger(lane))throw Error('Unmapped note '+n.name);const event={id:index,lane,start:beat*seconds,duration:n.beats*seconds,name:pitch===null?n.name:noteName(pitch),pitch,chord:pitch===null?n.name:null};beat+=n.beats;return event;});}
const classNames=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function study(id,title,author,score,bpm=80,category='Народные мелодии'){
 const notes=score.trim().split(/\s+/).map(token=>{const [name,beats='1']=token.split(':');return{name,beats:Number(beats)};}),scale=[...new Set(notes.map(n=>midi(n.name)%12))].sort((a,b)=>a-b).map(n=>classNames[n]);
 return{id,title,author,category,tag:'Легко · учебный фрагмент',bpm,kind:'melody',scale,notes,description:`${author}. Короткая упрощённая тема для жестов, без сопровождения. Начните с 50–75% скорости.${scale.length>7?' У некоторых жестов две ноты: ориентируйтесь на подпись падающей карточки.':''}`};
}
// Independently entered short educational versions of traditional / historic melodies.
// These are excerpts, not recordings or modern commercial arrangements.
songs.push(
 study('mary','Mary Had a Little Lamb','Традиционная мелодия','E4 D4 C4 D4 E4 E4 E4:2 D4 D4 D4:2 E4 G4 G4:2 E4 D4 C4 D4 E4 E4 E4 E4 D4 D4 E4 D4 C4:2'),
 study('london','London Bridge','Английская народная мелодия','G4 A4 G4 F4 E4 F4 G4:2 D4 E4 F4:2 E4 F4 G4:2 G4 A4 G4 F4 E4 F4 G4:2 D4 G4 E4 C4:2'),
 study('row','Row, Row, Row Your Boat','Традиционная мелодия','C4 C4 C4:.75 D4:.25 E4:2 E4:.75 D4:.25 E4:.75 F4:.25 G4:3 C5:.5 C5:.5 C5:.5 G4:.5 G4:.5 G4:.5 E4:.5 E4:.5 E4:.5 C4:.5 C4:.5 C4:.5 G4:.75 F4:.25 E4:.75 D4:.25 C4:3',76),
 study('oldmac','Old MacDonald','Традиционная мелодия','C4 C4 C4 G3 A3 A3 G3:2 E4 E4 D4 D4 C4:2 G3 C4 C4 C4 G3 A3 A3 G3:2 E4 E4 D4 D4 C4:2',84),
 study('jingle','Jingle Bells','Джеймс Пирпонт · припев','E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4 D4 E4:4 F4 F4 F4 F4 F4 E4 E4 E4 E4 D4 D4 E4 D4:2 G4:2 E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4 D4 E4:4 F4 F4 F4 F4 F4 E4 E4 E4 G4 G4 F4 D4 C4:4',92,'Зимние мелодии'),
 study('silent','Тихая ночь / Silent Night','Франц Грубер','G4:1.5 A4:.5 G4 E4:3 G4:1.5 A4:.5 G4 E4:3 D5:2 D5 B4:3 C5:2 C5 G4:3 A4:2 A4 C5:1.5 B4:.5 A4 G4:1.5 A4:.5 G4 E4:3',66,'Зимние мелодии'),
 study('wish','We Wish You a Merry Christmas','Английская народная мелодия','G4 C5 C5 D5 C5 B4 A4 A4 A4 D5 D5 E5 D5 C5 B4 G4 G4 E5 E5 F5 E5 D5 C5 A4 G4 G4 A4 D5 B4 C5:3',86,'Зимние мелодии'),
 study('deck','Deck the Halls','Валлийская народная мелодия','G4:1.5 F4:.5 E4 D4 C4 D4 E4 C4 D4:.5 E4:.5 F4:.5 D4:.5 E4:1.5 D4:.5 C4 B3 C4:2 G4:1.5 F4:.5 E4 D4 C4 D4 E4 C4',90,'Зимние мелодии'),
 study('auld','Auld Lang Syne','Шотландская народная мелодия','G3 C4:1.5 C4:.5 C4 E4 D4:1.5 C4:.5 D4 E4 C4:1.5 C4:.5 E4 G4 A4:3 A4 G4:1.5 E4:.5 E4 C4 D4:1.5 C4:.5 D4 E4 C4:3',76),
 study('grace','Amazing Grace','Традиционная мелодия NEW BRITAIN','G4 C5:2 E5:.5 C5:.5 E5:2 D5 C5:2 A4 G4:2 G4 C5:2 E5:.5 C5:.5 D5:3 E5 G5:3 G5 E5:2 G5:.5 E5:.5 C5:2 G4 A4:2 C5 C5:2 A4 G4:2 G4 C5:2 E5:.5 C5:.5 E5:2 D5 C5:3',68),
 study('greensleeves','Greensleeves','Английская народная мелодия','A4 C5:2 D5 E5:1.5 F5:.5 E5 D5:2 B4 G4:1.5 A4:.5 B4 C5:2 A4 A4:1.5 G#4:.5 A4 B4:2 G#4 E4:2 A4 C5:2 D5 E5:1.5 F5:.5 E5 D5:2 B4 G4:1.5 A4:.5 B4 C5 B4 A4 G#4 F#4 G#4 A4:3',76),
 study('scarborough','Scarborough Fair','Традиционная английская тема','D4:2 D4 A4:2 A4 E4 F4 E4 D4:3 C4 A3:2 D4 F4:2 G4 A4:3 G4 E4:2 F4 D4 C4 A3 C4 D4:2 A3 C4 D4 C4 A3 G3 A3 D4:3',72),
 study('saints','When the Saints Go Marching In','Традиционная мелодия','C4 E4 F4 G4:4 C4 E4 F4 G4:4 C4 E4 F4 G4:2 E4:2 C4:2 E4:2 D4:4 E4 E4 D4 C4:2 C4 E4 G4 G4 G4 F4:4 E4 F4 G4:2 E4:2 D4:2 D4:2 C4:4',92),
 study('susanna','Oh! Susanna','Стивен Фостер · 1848','C4:.5 D4:.5 E4 G4 G4 A4 G4 E4 C4 D4 E4 E4 D4 C4 D4:2 C4:.5 D4:.5 E4 G4 G4 A4 G4 E4 C4 D4 E4 E4 D4 D4 C4:2',90),
 study('brahms','Колыбельная Брамса','Иоганнес Брамс · op. 49 № 4','E4:.5 E4:.5 G4:2 E4:.5 E4:.5 G4:2 E4 G4 C5:2 B4 A4 A4 G4:3 D4:.5 E4:.5 F4:2 D4:.5 D4:.5 E4 F4:2 D4 F4 B4 A4 G4 B4 C5:3',70,'Классика'),
 study('elise','К Элизе · главная тема','Людвиг ван Бетховен','E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:2 C4:.5 E4:.5 A4:.5 B4:2 E4:.5 G#4:.5 B4:.5 C5:2 E4:.5 E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:2 C4:.5 E4:.5 A4:.5 B4:2 E4:.5 C5:.5 B4:.5 A4:3',66,'Классика'),
 study('minuet','Менуэт соль мажор','Кристиан Петцольд · BWV Anh. 114','D5 G4:.5 A4:.5 B4:.5 C5:.5 D5 G4 G4 E5 C5:.5 D5:.5 E5:.5 F#5:.5 G5 G4 G4 C5 D5:.5 C5:.5 B4:.5 A4:.5 B4 C5:.5 B4:.5 A4:.5 G4:.5 F#4 G4:.5 A4:.5 B4:.5 G4:.5 B4 A4:2 D5 F#4 A4 G4:3',80,'Классика'),
 study('canon','Канон Пахельбеля · тема','Иоганн Пахельбель','F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 B4:2 C#5:2 D5:2 C#5:2 B4:2 A4:2 G4:2 F#4:2 G4:2 E4:2 D4 F#4 A4 G4 F#4 D4 F#4 E4 D4 B3 D4 A3 G3 B3 A3 G3 F#3 D3:3',76,'Классика'),
 study('largo','Из Нового Света · Largo','Антонин Дворжак · тема','E4:1.5 G4:.5 G4:2 E4 D4 C4:2 D4 E4 G4 E4 D4:3 E4:1.5 G4:.5 G4:2 E4 D4 C4:2 D4 E4 D4 C4:3 C4:3',66,'Классика'),
 study('swan','Лебединое озеро · тема','Пётр Чайковский','A4 D5:1.5 E5:.5 F5 G5 A5:2 F5:1.5 A5:.5 F5:1.5 A5:.5 F5 D5 F5 D5 Bb4 F5 E5 D5 E5:3 A4 D5:1.5 E5:.5 F5 G5 A5:2 F5:1.5 A5:.5 F5 D5 F5 D5:3',72,'Классика'),
 study('auclair','Au clair de la lune','Французская народная мелодия','C4 C4 C4 D4 E4:2 D4:2 C4 E4 D4 D4 C4:4 C4 C4 C4 D4 E4:2 D4:2 C4 E4 D4 D4 C4:4',78),
 study('yankee','Yankee Doodle','Традиционная мелодия','C4 C4 D4 E4 C4 E4 D4:2 C4 C4 D4 E4 C4 B3:2 G3:2 C4 C4 D4 E4 F4 E4 D4 C4 B3 G3 A3 B3 C4:2 C4:2',92),
 study('skip','Skip to My Lou','Традиционная мелодия','E4 E4 C4 C4 E4 E4 G4:2 D4 D4 B3 B3 D4 D4 F4:2 E4 E4 C4 C4 E4 E4 G4 E4 D4 D4 E4 D4 C4:4',88),
 study('muffin','The Muffin Man','Традиционная английская мелодия','C4 F4 F4 F4 G4 A4 F4 D4 G4 G4 E4 E4 C4 F4 F4 F4 G4 A4 F4 D4 G4 E4 C4 F4:3',88),
 study('camptown','Camptown Races','Стивен Фостер · 1850','G4 G4 E4 G4 A4 G4 E4:2 E4 D4:2 E4 D4:2 G4 G4 E4 G4 A4 G4 E4:2 D4 E4 D4 C4:3 C4 C4 E4 G4 C5:3 A4 A4 C5 A4 G4:3',92),
 study('tree','O Christmas Tree','Немецкая народная мелодия','G3 C4 C4 C4:2 D4 E4 E4 E4:2 E4 D4 E4 F4 B3 D4 C4:2 G3 C4 C4 C4:2 D4 E4 E4 E4:2 E4 D4 E4 F4 B3 D4 C4:2',78,'Зимние мелодии'),
 study('joy','Joy to the World','Лоуэлл Мейсон · 1848','C5:2 B4:1.5 A4:.5 G4:3 F4 E4:2 D4:2 C4:3 G4 A4:3 A4 B4:3 B4 C5:3 C5 C5 B4 A4 G4 G4 F4 E4 C5 C5 B4 A4 G4 G4 F4 E4 E4 E4 E4 F4 G4:3 F4 E4 D4 C4:4',84,'Зимние мелодии'),
 study('thisold','This Old Man','Традиционная английская мелодия','G4 E4 G4:2 G4 E4 G4:2 A4 G4 F4 E4 D4 E4 F4 E4 D4 C4 D4 E4 C4 E4 G4:2 G4 F4 E4 D4 C4:4',88)
);
