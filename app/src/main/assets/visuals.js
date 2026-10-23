/* BodyDream 4.5: exercise-specific vector teaching diagrams, rendered offline.
   Poses are schematic checkpoints, not motion capture or a universal joint-angle prescription. */
(function(){
'use strict';
const colors={skin:'#d5c2ac',ink:'#d8e7e3',muted:'#526c77',accent:'#b9ec92',weight:'#efc58b',back:'#121f2a'};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const line=(a,b,c=colors.muted,w=7)=>`<path d="M${a} L${b}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const path=(points,c=colors.muted,w=7)=>`<polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const rect=(x,y,w,h,r=5,c=colors.muted)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c}"/>`;
const circle=(x,y,r,c)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
function weight(x,y,angle=0){return `<g transform="translate(${x} ${y}) rotate(${angle})">${line([-15,0],[15,0],colors.weight,5)}${rect(-19,-9,7,18,2,colors.weight)}${rect(12,-9,7,18,2,colors.weight)}</g>`}
function bar(x,y){return line([x-56,y],[x+56,y],colors.weight,5)+rect(x-56,y-13,9,26,2,colors.weight)+rect(x+47,y-13,9,26,2,colors.weight)}
function cable(points){return path(points,'#8b9d9d',2)}
function support(points,w=8){return path(points,'#3c5663',w)}
function person(p,focus='upper'){
 const head=p.h,shoulder=p.s,hip=p.p;
 const torsoColor=focus==='core'?'#93baa2':'#728c9d';
 const armColor=focus==='upper'?colors.accent:'#8aa2ae',legColor=focus==='legs'?colors.accent:'#8aa2ae';
 let out='';
 for(const side of [1,0]){
  const e=p.e[side],w=p.w[side],k=p.k[side],a=p.a[side],fade=side?'.58':'1';
  out+=`<g opacity="${fade}">${path([hip,k,a],legColor,13)}${path([shoulder,e,w],armColor,10)}${circle(...k,4,'#d7e5dd')}${circle(...e,3,'#d7e5dd')}${circle(...w,5,colors.skin)}${line([a[0]-5,a[1]+2],p.toes?.[side]||[a[0]+12,a[1]+2],'#dbe4df',8)}</g>`;
 }
 out+=(p.spine?`<path d="M${hip} Q${p.spine} ${shoulder}" fill="none" stroke="${torsoColor}" stroke-width="24" stroke-linecap="round"/>`:line(hip,shoulder,torsoColor,24))+line(shoulder,[head[0],head[1]+13],colors.skin,8)+circle(...head,15,colors.skin);
 out+=`<path d="M${head[0]-14} ${head[1]-3} Q${head[0]-8} ${head[1]-22} ${head[0]+12} ${head[1]-12} L${head[0]+15} ${head[1]-3}" fill="#344952"/>`;
 out+=circle(head[0]+(p.facing===-1?-6:6),head[1]-1,1.6,'#344952');
 out+=circle(...shoulder,4,'#e5eee6')+circle(...hip,5,'#c7d8ce');
 return out;
}
const stand=(extra={})=>({h:[185,43],s:[185,73],p:[185,151],e:[[164,113],[205,113]],w:[[164,154],[207,154]],k:[[164,197],[207,197]],a:[[158,244],[213,244]],...extra});
const seat=(extra={})=>stand({h:[147,60],s:[149,89],p:[155,164],e:[[177,119],[170,117]],w:[[208,124],[202,120]],k:[[220,166],[211,169]],a:[[235,242],[220,242]],...extra});
const specs={
 bench:{variant:'Штанга · вид сбоку',phases:['Нижняя позиция','Жим вверх'],breath:['Вдох при опускании','Выдох на жиме'],tip:'Лопатки и таз на скамье, стопы устойчивы.',model:'bench',focus:'upper'},
 incline:{variant:'Гантели · наклонная скамья',phases:['Гантели у груди','Жим вверх'],breath:['Вдох вниз','Выдох вверх'],tip:'Спинка под небольшим наклоном, плечи не поднимай к ушам.',model:'incline',focus:'upper'},
 press:{variant:'Гантели · сидя со спинкой',phases:['Гантели у плеч','Жим над головой'],breath:['Вдох при возврате','Выдох на жиме'],tip:'Спина на опоре, поясница без избыточного прогиба.',model:'press',focus:'upper'},
 lateral:{variant:'Гантели · вид спереди',phases:['Руки возле бёдер','Подъём в стороны'],breath:['Вдох вниз','Выдох вверх'],tip:'Локти мягкие, движение примерно до уровня плеч.',model:'lateral',focus:'upper'},
 triceps:{variant:'Верхний блок · вид сбоку',phases:['Локти согнуты','Разгибание вниз'],breath:['Вдох при возврате','Выдох вниз'],tip:'Плечи остаются возле корпуса; двигаются предплечья.',model:'triceps',focus:'upper'},
 knee:{variant:'Упор на предплечья · вид сбоку',phases:['Ноги опущены','Подъём коленей'],breath:['Вдох вниз','Выдох с подъёмом'],tip:'Без раскачивания, вверху немного подкрути таз.',model:'knee',focus:'core'},
 pulldown:{variant:'Показана верхняя тяга сидя',phases:['Руки вверх','Тяга к верху груди'],breath:['Вдох при возврате','Выдох на тяге'],tip:'Рукоять перед лицом; за голову не тяни.',model:'pulldown',focus:'upper'},
 row:{variant:'Нижний блок · вид сбоку',phases:['Руки вытянуты','Рукоять к рёбрам'],breath:['Вдох вперёд','Выдох на тяге'],tip:'Корпус устойчив, тяни локти назад без раскачивания.',model:'row',focus:'upper'},
 chestrow:{variant:'Показана тяга гантелей на скамье',phases:['Руки опущены','Локти назад'],breath:['Вдох вниз','Выдох на тяге'],tip:'Грудь всё время касается наклонной опоры.',model:'chestrow',focus:'upper'},
 face:{variant:'Канат на уровне лица · условный ракурс',phases:['Руки вперёд','Канат к лицу'],breath:['Вдох при возврате','Выдох на тяге'],tip:'Кисти расходятся по сторонам лица, корпус не отклоняй.',model:'face',focus:'upper'},
 curl:{variant:'Гантели · вид спереди',phases:['Руки опущены','Сгибание локтей'],breath:['Вдох вниз','Выдох вверх'],tip:'Локти у корпуса, не помогай спиной.',model:'curl',focus:'upper'},
 crunch:{variant:'Верхний блок · на коленях',phases:['Корпус поднят','Скручивание вниз'],breath:['Вдох при возврате','Выдох вниз'],tip:'Сближай рёбра с тазом; руки держат канат, а не тянут его.',model:'crunch',focus:'core'},
 legpress:{variant:'Показан наклонный жим ногами',phases:['Колени согнуты','Жим платформы'],breath:['Вдох при сгибании','Выдох на жиме'],tip:'Таз на спинке. В конце колени не выпрямляй ударом.',model:'legpress',focus:'legs'},
 rdl:{variant:'Штанга · вид сбоку',phases:['Положение стоя','Наклон от таза'],breath:['Выдох при вставании','Вдох на опускании'],tip:'Таз назад, груз близко к ногам, спина нейтральна.',model:'rdl',focus:'legs'},
 split:{variant:'Показан сплит-присед · вид сбоку',phases:['Стойка в разножке','Опускание вниз'],breath:['Выдох при подъёме','Вдох вниз'],tip:'Передняя стопа целиком на полу, колено по линии носка.',model:'split',focus:'legs'},
 legcurl:{variant:'Показано сгибание ног сидя',phases:['Голени вперёд','Сгибание коленей'],breath:['Вдох при возврате','Выдох при сгибании'],tip:'Таз зафиксирован, валик над пятками, без рывков.',model:'legcurl',focus:'legs'},
 calf:{variant:'Стоя у опоры · вид сбоку',phases:['Пятки опущены','Подъём на носки'],breath:['Ровное дыхание','Дыхание без задержки'],tip:'Поднимай пятки плавно, не подпрыгивай.',model:'calf',focus:'legs'},
 plank:{variant:'Упор на предплечья · статическое удержание',phases:['Положение корпуса','Дыхание и удержание'],breath:['Спокойный вдох','Спокойный выдох'],tip:'Локти под плечами, голова–таз–пятки на одной линии.',model:'plank',focus:'core'},
 warmup:{variant:'Примеры этапов разминки',phases:['Лёгкий бег','Передачи мяча'],breath:['Ровно, спокойно','Без задержки'],tip:'Ускоряйся постепенно; вся разминка описана ниже.',model:'warmup',focus:'legs'},
 game:{variant:'Пример передачи · не схема всей игры',phases:['Подход к мячу','Передача мяча'],breath:['Контроль дыхания','Восстановление в паузах'],tip:'Интенсивность по самочувствию, не играй через резкую боль.',model:'game',focus:'legs'},
 cooldown:{variant:'Примеры заминки после игры',phases:['Спокойная ходьба','Мягкая растяжка икры'],breath:['Вдох без спешки','Ровный выдох'],tip:'Восстанови дыхание. Растяжка без боли.',model:'cooldown',focus:'legs'},
 chest_machine:{variant:'Условный грудной тренажёр · вид сбоку',phases:['Рукояти у груди','Жим перед собой'],breath:['Вдох при возврате','Выдох на жиме'],tip:'Подстрой сиденье: рукояти примерно на уровне груди.',model:'chest_machine',focus:'upper'},
 goblet:{variant:'Одна гантель у груди · вид сбоку',phases:['Положение стоя','Присед с гантелью'],breath:['Выдох при подъёме','Вдох вниз'],tip:'Гантель у груди, колени по носкам, стопы на полу.',model:'goblet',focus:'legs'},
 db_rdl:{variant:'Две гантели · вид сбоку',phases:['Гантели у бёдер','Наклон от таза'],breath:['Выдох при вставании','Вдох вниз'],tip:'Гантели идут близко к ногам. Таз отводи назад.',model:'db_rdl',focus:'legs'}
};
function draw(id,end){
 const spec=specs[id];let p=stand(),equipment='',load='',arrow=null;const f=end;
 switch(id){
 case 'bench':
  p={h:[74,159],s:[108,169],p:[220,169],e:[[f?133:135,f?111:185],[f?141:142,f?110:179]],w:[[f?142:154,f?65:142],[f?149:160,f?67:143]],k:[[276,190],[262,191]],a:[[285,244],[267,244]]};
  equipment=support([[59,188],[245,188]])+support([[85,188],[85,245]])+support([[230,188],[230,245]])+rect(58,179,191,9,4);load=bar(p.w[0][0],p.w[0][1]);arrow=[[178,132],[178,74]];break;
 case 'incline':
  p={h:[114,112],s:[140,130],p:[230,177],e:[[f?167:129,f?84:153],[f?180:166,f?86:158]],w:[[f?179:124,f?42:123],[f?192:176,f?43:120]],k:[[278,194],[263,198]],a:[[282,244],[263,244]]};
  equipment=support([[103,126],[222,182],[260,182]])+support([[186,183],[164,245]])+support([[244,183],[252,245]]);load=weight(...p.w[0])+weight(...p.w[1]);arrow=[[227,127],[236,66]];break;
 case 'press':
  p=seat({h:[183,75],s:[183,102],p:[183,178],e:[[f?142:128,f?73:118],[f?225:238,f?73:118]],w:[[f?142:128,f?33:75],[f?225:238,f?33:75]],k:[[145,201],[219,201]],a:[[139,244],[228,244]]});
  equipment=support([[165,104],[166,187],[214,187]])+support([[177,188],[163,245]])+support([[205,188],[220,245]]);load=weight(...p.w[0])+weight(...p.w[1]);arrow=[[278,101],[278,37]];break;
 case 'lateral':
  p=stand({e:[[f?138:164,f?83:113],[f?232:205,f?83:113]],w:[[f?91:157,f?93:156],[f?279:212,f?93:156]]});load=weight(...p.w[0])+weight(...p.w[1]);arrow=[[257,155],[301,111]];break;
 case 'curl':
  p=stand({e:[[155,116],[214,116]],w:[[f?158:155,f?77:161],[f?210:216,f?77:161]]});load=weight(...p.w[0])+weight(...p.w[1]);arrow=[[260,154],[260,88]];break;
 case 'triceps':
  p=stand({h:[168,44],s:[170,75],p:[165,153],e:[[194,119],[188,116]],w:[[f?206:235,f?164:113],[f?213:238,f?162:111]]});
  equipment=support([[299,33],[299,245],[332,245]])+circle(282,36,9,'#64828c')+cable([[282,36],p.w[0]]);load=line(p.w[0],p.w[1],colors.weight,9);arrow=[[248,122],[235,170]];break;
 case 'knee':
  p=stand({h:[158,34],s:[161,64],p:[160,139],e:[[190,86],[172,86]],w:[[216,86],[201,86]],k:[[f?228:168,f?139:189],[f?218:157,f?143:190]],a:[[f?231:169,f?194:239],[f?221:155,f?197:240]]});
  equipment=support([[126,75],[126,246]])+support([[126,92],[218,92]])+rect(128,73,12,67,4)+support([[108,246],[239,246]]);arrow=[[273,202],[273,139]];break;
 case 'pulldown':
  p=seat({h:[179,92],s:[181,119],p:[181,191],e:[[f?134:130,f?135:77],[f?231:231,f?135:77]],w:[[f?118:117,f?100:37],[f?248:248,f?100:37]],k:[[144,207],[219,207]],a:[[137,246],[229,246]]});
  equipment=support([[72,29],[72,249],[292,249]])+support([[72,29],[293,29]])+rect(145,195,83,12)+support([[184,207],[184,245]])+cable([[183,29],[183,f?100:37]]);load=line(p.w[0],p.w[1],colors.weight,6);arrow=[[318,56],[318,125]];break;
 case 'row':
  p=seat({h:[150,66],s:[153,95],p:[154,171],e:[[f?155:207,f?141:130],[f?163:209,f?139:127]],w:[[f?197:253,f?153:150],[f?203:257,f?150:145]],k:[[223,185],[214,188]],a:[[267,235],[250,239]]});
  equipment=rect(128,183,69,12)+support([[157,196],[157,247]])+support([[260,218],[280,184]])+support([[324,151],[324,243]])+cable([[324,151],p.w[0]]);load=line(p.w[0],p.w[1],colors.weight,9);arrow=[[271,109],[211,109]];break;
 case 'chestrow':
  p={h:[224,78],s:[204,103],p:[148,159],e:[[f?169:204,f?133:157],[f?173:214,f?132:158]],w:[[f?196:207,f?155:203],[f?208:221,f?153:202]],k:[[124,201],[111,199]],a:[[112,245],[91,245]]};
  equipment=support([[136,174],[220,91]],13)+support([[167,149],[175,246]])+support([[138,246],[229,246]]);load=weight(...p.w[0])+weight(...p.w[1]);arrow=[[282,197],[268,144]];break;
 case 'face':
  p=stand({h:[167,54],s:[169,84],p:[166,157],e:[[f?134:216,f?96:89],[f?209:224,f?97:83]],w:[[f?147:262,f?51:82],[f?193:263,f?52:78]]});
  equipment=support([[318,62],[318,246]])+circle(315,80,8,'#64828c')+cable([[315,80],[f?236:263,80],p.w[0]])+cable([[f?236:263,80],p.w[1]]);load=circle(...p.w[0],5,colors.weight)+circle(...p.w[1],5,colors.weight);arrow=[[271,122],[220,122]];break;
 case 'crunch':
  p={h:f?[209,121]:[177,56],s:f?[204,144]:[175,83],p:[161,175],spine:f?[176,116]:null,e:f?[[225,151],[218,154]]:[[202,94],[194,97]],w:f?[[213,119],[204,120]]:[[186,58],[178,61]],k:[[206,231],[194,233]],a:[[143,247],[127,247]]};
  equipment=rect(104,246,137,6,3)+support([[303,24],[303,250]])+circle(298,34,9,'#64828c')+cable([[298,34],p.w[0]]);arrow=[[256,89],[258,155]];break;
 case 'legpress':
  p={h:[93,137],s:[114,159],p:[155,204],e:[[116,193],[123,193]],w:[[142,216],[143,216]],k:[[f?221:211,f?139:205],[f?215:204,f?141:199]],a:[[f?279:233,f?91:146],[f?268:224,f?99:152]]};
  equipment=support([[88,147],[156,217],[187,217]],13)+support([[87,250],[310,51]],5)+support([[126,250],[342,49]],5)+line([f?258:213,f?66:119],[f?304:258,f?111:164],'#839ca1',14);arrow=[[270,180],[324,130]];break;
 case 'rdl':case 'db_rdl':
  p=stand(f?{h:[251,117],s:[229,129],p:[157,165],e:[[235,172],[224,171]],w:[[235,210],[224,210]],k:[[184,205],[164,207]],a:[[195,245],[163,245]]}:{h:[197,45],s:[195,74],p:[192,153],e:[[204,118],[187,118]],w:[[205,163],[188,163]],k:[[197,202],[175,202]],a:[[197,245],[171,245]]});
  load=id==='rdl'?bar(p.w[0][0],p.w[0][1]):weight(...p.w[0])+weight(...p.w[1]);arrow=[[123,134],[93,156]];break;
 case 'goblet':
  p=stand(f?{h:[206,99],s:[200,126],p:[153,174],e:[[219,151],[213,151]],w:[[221,116],[214,115]],k:[[221,178],[182,184]],a:[[236,245],[170,245]]}:{h:[199,43],s:[196,73],p:[184,153],e:[[221,103],[215,104]],w:[[217,67],[210,68]],k:[[203,198],[171,198]],a:[[210,245],[163,245]]});load=weight(p.w[0][0],p.w[0][1],90);arrow=[[93,94],[93,174]];break;
 case 'split':
  p=stand(f?{h:[179,85],s:[179,114],p:[177,183],e:[[162,149],[199,150]],w:[[161,188],[201,189]],k:[[241,185],[132,235]],a:[[249,245],[103,245]]}:{h:[181,43],s:[181,74],p:[181,152],e:[[164,114],[202,115]],w:[[164,154],[202,155]],k:[[223,194],[145,197]],a:[[249,245],[104,245]]});load=weight(...p.w[0])+weight(...p.w[1]);arrow=[[294,106],[294,183]];break;
 case 'legcurl':
  p=seat({h:[127,61],s:[131,89],p:[143,167],e:[[123,134],[144,134]],w:[[139,182],[153,182]],k:[[213,169],[205,166]],a:[[f?206:293,f?236:180],[f?197:282,f?233:175]]});
  equipment=support([[119,82],[126,184],[224,184]],12)+support([[153,185],[153,248]])+rect(166,145,51,13,6)+line([p.a[0][0]-10,p.a[0][1]-7],[p.a[0][0]+7,p.a[0][1]-7],'#efc58b',16);arrow=[[286,198],[248,234]];break;
 case 'calf':
  p=stand({h:[177,f?33:46],s:[177,f?62:75],p:[177,f?140:153],e:[[209,f?85:96],[197,f?89:99]],w:[[245,86],[244,99]],k:[[179,f?185:196],[165,f?185:196]],a:[[188,f?230:243],[172,f?230:243]],toes:[[204,246],[189,246]]});
  equipment=support([[249,49],[249,248]])+rect(151,248,63,7,3);load=f?line([183,247],[200,247],colors.weight,6):'';arrow=[[112,224],[112,190]];break;
 case 'plank':
  p={h:[94,169],s:[122,183],p:[218,205],e:[[125,238],[135,238]],w:[[83,242],[93,242]],k:[[276,222],[274,221]],a:[[330,240],[326,239]]};
  equipment=rect(51,251,306,5,2)+`<path d="M104 173 L337 242" stroke="#b9ec92" stroke-width="1.5" stroke-dasharray="4 5" opacity=".5"/>`;
  load=f?`<path d="M178 170 Q189 153 202 170 M178 165 Q189 148 202 165" fill="none" stroke="#8ccbd2" stroke-width="2"/>`:'';break;
 case 'warmup':case 'game':
  p=stand(f?{h:[178,56],s:[179,85],p:[177,155],e:[[147,120],[208,100]],w:[[125,103],[225,127]],k:[[213,191],[152,202]],a:[[254,204],[148,245]]}:{h:[184,47],s:[182,77],p:[178,149],e:[[154,94],[209,111]],w:[[130,115],[231,93]],k:[[216,184],[140,185]],a:[[202,235],[114,225]]});
  equipment=rect(54,248,300,3,1,'#39584d');load=(id==='game'||f)?circle(f?282:249,236,13,'#c5d6c2')+circle(f?282:249,236,5,'#355749'):'';arrow=f?[[300,218],[329,211]]:null;break;
 case 'cooldown':
  p=stand(f?{h:[219,58],s:[212,87],p:[178,153],e:[[239,107],[232,111]],w:[[268,113],[266,123]],k:[[222,195],[149,196]],a:[[241,244],[125,244]]}:{h:[182,44],s:[182,74],p:[184,152],e:[[169,114],[205,112]],w:[[157,150],[215,148]],k:[[212,199],[164,198]],a:[[229,244],[145,244]]});equipment=f?support([[272,47],[272,249]]):'';arrow=null;break;
 case 'chest_machine':
  p=seat({h:[139,57],s:[142,86],p:[143,169],e:[[f?200:157,f?98:126],[f?200:147,f?97:122]],w:[[f?251:198,f?100:101],[f?252:192,f?99:97]],k:[[213,177],[201,179]],a:[[231,244],[209,244]]});
  equipment=support([[123,65],[124,182],[194,182]],13)+support([[141,182],[141,247]])+support([[305,46],[305,247]])+support([[305,68],p.w[0]],5);load=line([p.w[0][0],p.w[0][1]-11],[p.w[0][0],p.w[0][1]+11],colors.weight,7);arrow=[[216,148],[270,148]];break;
 default:return '';
 }
 const arrowSvg=arrow?`<path d="M${arrow[0]} L${arrow[1]}" fill="none" stroke="#8ad1cc" stroke-width="2"/><path d="M-6 -4 L0 0 L-6 4" transform="translate(${arrow[1]}) rotate(${Math.atan2(arrow[1][1]-arrow[0][1],arrow[1][0]-arrow[0][0])*180/Math.PI})" fill="none" stroke="#8ad1cc" stroke-width="2"/>`:'';
 return `<svg viewBox="0 0 380 278" role="img" aria-label="${esc(BD_DATA.exercises[id].name)}: ${esc(spec.phases[end?1:0])}" data-model="${spec.model}"><ellipse cx="190" cy="253" rx="131" ry="11" fill="#050e13" opacity=".75"/><path d="M24 253 H356" stroke="#314851" stroke-width="1"/>${equipment}${person(p,spec.focus)}${load}${arrowSvg}</svg>`;
}
const active=new Map();
function stop(root){const timer=active.get(root);if(timer)clearInterval(timer);active.delete(root);root?.classList.remove('is-playing');const btn=root?.querySelector('.motion-play');if(btn){btn.textContent='▶ Медленный показ';btn.setAttribute('aria-pressed','false')}}
function select(root,index){
 const id=root.dataset.exercise,spec=specs[id];if(!spec)return;
 root.querySelectorAll('.motion-frame').forEach((f,i)=>{f.hidden=i!==index});
 root.querySelectorAll('.motion-step').forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-pressed',String(i===index))});
 root.querySelector('.motion-phase').textContent=spec.phases[index];root.querySelector('.motion-breath').textContent=spec.breath[index];root.dataset.phase=String(index);
}
function step(button,index){const root=button.closest('.motion-card');if(!root)return;stop(root);select(root,index)}
function play(button){
 const root=button.closest('.motion-card');if(!root)return;if(active.has(root)){stop(root);return}
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){root.querySelector('.motion-phase').textContent='Выбирай фазы кнопками ниже';return}
 root.classList.add('is-playing');button.textContent='Ⅱ Остановить';button.setAttribute('aria-pressed','true');
 active.set(root,setInterval(()=>{if(!root.isConnected||document.hidden||root.closest('details')?.open===false){stop(root);return}select(root,root.dataset.phase==='0'?1:0)},2200));
}
function render(id){
 const spec=specs[id],ex=BD_DATA.exercises[id];if(!spec||!ex)return '<div class="tip">Для этого упражнения схема пока не подготовлена. Используй текстовый разбор.</div>';
 return `<section class="motion-card" data-exercise="${id}" data-phase="0" aria-label="Наглядное выполнение: ${esc(ex.name)}"><div class="motion-top"><span class="motion-eyebrow">АТЛАС ДВИЖЕНИЯ</span><span class="motion-count">2 фазы</span></div><p class="motion-variant">${esc(spec.variant)}</p><div class="motion-canvas"><div class="motion-frame">${draw(id,false)}</div><div class="motion-frame" hidden>${draw(id,true)}</div><div class="motion-phase">${esc(spec.phases[0])}</div></div><div class="motion-switch"><button class="motion-step active" aria-pressed="true" onclick="BD_VISUALS.step(this,0)"><b>01</b> ${esc(spec.phases[0])}</button><button class="motion-step" aria-pressed="false" onclick="BD_VISUALS.step(this,1)"><b>02</b> ${esc(spec.phases[1])}</button></div><div class="motion-footer"><span class="motion-breath">${esc(spec.breath[0])}</span><button class="motion-play" aria-pressed="false" onclick="BD_VISUALS.play(this)">▶ Медленный показ</button></div><div class="motion-check"><span>✓</span><p>${esc(spec.tip)}</p></div><p class="motion-note">Учебная схема двух положений. Амплитуду и настройку опор подбирай под себя; это не видео и не проверка твоей техники.</p></section>`;
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const root of [...active.keys()])stop(root)});
function openTechnique(button){const wrap=button.closest('.runner-wrap'),detail=wrap?.querySelector('.runner-tech');if(detail){detail.open=true;detail.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})}}
window.BD_VISUALS={render,step,play,openTechnique,ids:Object.keys(specs)};
})();
