/* Exercise-level muscle-group reference; not an EMG or live activation measurement. */
(function(){
'use strict';
const names={chest:'Грудные',front_delts:'Передние дельты',side_delts:'Средние дельты',rear_delts:'Задние дельты',triceps:'Трицепс',biceps:'Бицепс',lats:'Широчайшие',midback:'Середина спины',traps:'Трапеции',abs:'Пресс',obliques:'Косые мышцы живота',hipflexors:'Сгибатели бедра',quads:'Квадрицепсы',glutes:'Ягодичные',hamstrings:'Задняя поверхность бедра',calves:'Икры',erectors:'Разгибатели спины'};
const groups={
 bench:{primary:['chest'],secondary:['triceps','front_delts']},
 incline:{primary:['chest'],secondary:['front_delts','triceps']},
 press:{primary:['front_delts','side_delts'],secondary:['triceps']},
 lateral:{primary:['side_delts'],secondary:['traps']},
 triceps:{primary:['triceps'],secondary:[]},
 knee:{primary:['abs'],secondary:['hipflexors']},
 pulldown:{primary:['lats'],secondary:['biceps','midback']},
 row:{primary:['midback','lats'],secondary:['biceps','rear_delts']},
 chestrow:{primary:['midback','lats'],secondary:['biceps','rear_delts']},
 face:{primary:['rear_delts','midback'],secondary:['biceps']},
 curl:{primary:['biceps'],secondary:[]},
 crunch:{primary:['abs'],secondary:['obliques']},
 legpress:{primary:['quads','glutes'],secondary:['hamstrings']},
 rdl:{primary:['hamstrings','glutes'],secondary:['erectors']},
 split:{primary:['quads','glutes'],secondary:['hamstrings','abs']},
 legcurl:{primary:['hamstrings'],secondary:['calves']},
 calf:{primary:['calves'],secondary:[]},
 plank:{primary:['abs','obliques'],secondary:['glutes','front_delts']},
 warmup:{primary:['quads','hamstrings','calves','glutes'],secondary:['abs'],mode:'warmup'},
 game:{primary:['quads','hamstrings','glutes','calves'],secondary:['abs'],mode:'game'},
 cooldown:{primary:['calves','quads','hamstrings'],secondary:[],mode:'stretch'},
 chest_machine:{primary:['chest'],secondary:['triceps','front_delts']},
 goblet:{primary:['quads','glutes'],secondary:['abs']},
 db_rdl:{primary:['hamstrings','glutes'],secondary:['erectors']}
};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Original vector outlines. Muscle shapes are approximate surface regions.
const outline='M54 48 Q46 47 38 55 L32 78 L25 111 L20 139 Q19 146 26 148 L34 120 L42 93 L46 77 L49 106 L45 126 L43 153 L45 185 L45 211 L43 245 L38 258 Q45 263 57 258 L60 218 L62 186 L65 159 L68 186 L70 218 L72 258 Q85 263 92 258 L87 245 L85 211 L85 185 L87 153 L85 126 L81 106 L84 77 L88 93 L96 120 L104 148 Q111 148 110 139 L105 111 L98 78 L92 55 Q83 47 76 48 Z';
const front={
 chest:['M50 59 Q57 53 64 58 L64 77 Q55 82 49 74 Z'],
 front_delts:['M46 53 L49 60 L45 72 L41 67 Z'],
 side_delts:['M40 54 Q35 59 35 68 L40 76 L44 66 Z'],
 biceps:['M42 77 L37 92 L34 106 L40 109 L46 88 Z'],
 abs:['M58 85 Q61 83 64 85 L64 93 L58 93 Z','M58 96 L64 96 L64 104 L58 104 Z','M58 107 L64 107 L64 117 L59 116 Z'],
 obliques:['M49 84 L55 89 L56 114 L51 119 L47 105 Z'],
 hipflexors:['M50 124 L61 130 L61 143 L54 139 Z'],
 quads:['M48 148 Q53 143 59 148 L59 171 L55 193 L48 193 L46 169 Z']
};
const back={
 rear_delts:['M45 53 Q39 53 36 65 L42 76 L50 62 Z'],
 side_delts:['M39 53 Q35 59 35 69 L39 75 L43 64 Z'],
 triceps:['M42 78 L36 94 L34 107 L40 110 L46 90 Z'],
 traps:['M57 47 L64 52 L64 69 L57 64 L50 56 Z'],
 midback:['M52 65 L63 72 L63 88 L55 83 L49 74 Z'],
 lats:['M49 82 L57 89 L62 109 L54 118 L48 101 Z'],
 erectors:['M60 91 L64 91 L64 121 L60 118 Z'],
 glutes:['M47 127 Q53 120 63 126 L64 143 Q55 150 47 141 Z'],
 hamstrings:['M48 152 L59 152 L59 177 L55 195 L48 195 L46 176 Z'],
 calves:['M48 205 Q53 200 58 207 L57 226 L52 240 L47 225 Z']
};
function region(id,paths,config){
 const role=config.primary.includes(id)?'primary':config.secondary.includes(id)?'secondary':'neutral';
 const color={primary:'#e8ad80',secondary:'#83d0c8',neutral:'#405563'}[role];
 return `<g class="muscle-region ${role}" data-muscle="${id}" data-role="${role}" fill="${color}" stroke="#172630" stroke-width=".8"><title>${esc(names[id])}: ${role==='primary'?'основная группа':role==='secondary'?'помогает или стабилизирует':'не выделена'}</title>${paths.map(d=>`<path d="${d}"/><path d="${d}" transform="translate(130 0) scale(-1 1)"/>`).join('')}</g>`;
}
function figure(side,config){
 let html=`<circle cx="65" cy="27" r="13" fill="#718591"/><path d="M59 40 H71 L76 50 H54 Z" fill="#627b87"/><path d="${outline}" fill="#566e7c" stroke="#83949b" stroke-width=".8"/>`;
 html+=Object.entries(side==='front'?front:back).map(([id,paths])=>region(id,paths,config)).join('');
 if(side==='front')html+='<circle cx="61" cy="26" r="1" fill="#30434d"/><circle cx="69" cy="26" r="1" fill="#30434d"/><path d="M62 33 Q65 35 68 33" stroke="#405763" fill="none"/>';
 else html+='<path d="M53 25 Q54 11 65 13 Q76 12 77 25" stroke="#526875" stroke-width="5" fill="none"/>';
 return html;
}
function render(id,options={}){
 const config=groups[id];if(!config)return '';
 const mode=config.mode||'strength',n=Math.max(0,Number(options.total)||0),done=Math.min(n,Math.max(0,Number(options.completed)||0));
 const status=n?(done<n?`Подход ${done+1} из ${n}`:'Все подходы отмечены'):mode==='stretch'?'Зоны растяжки':mode==='warmup'?'Зоны разминки':mode==='game'?'Участвуют в игре':'Мышцы упражнения';
 const firstLabel=mode==='stretch'?'Растягиваемые':mode==='warmup'?'Разминаем':mode==='game'?'Основные группы':'Основные';
 const primary=config.primary.map(x=>names[x]).join(', '),secondary=config.secondary.map(x=>names[x]).join(', ');
 const note=mode==='stretch'?'Показаны группы для мягкой растяжки из описания заминки.':mode==='warmup'||mode==='game'?'Участие групп меняется в разных движениях этого этапа.':'Условные зоны по выбранному упражнению, не измерение твоей активности.';
 return `<section class="muscle-card" data-exercise="${id}" data-completed="${done}" aria-label="Работающие мышцы: ${esc(BD_DATA.exercises[id].name)}"><div class="muscle-heading"><strong>${status}</strong><button class="muscle-zoom" onclick="BD_MUSCLES.toggle(this)" aria-expanded="false">Крупнее ↗</button></div><div class="muscle-layout"><div class="muscle-figures"><div class="muscle-view-labels"><span>Спереди</span><span>Сзади</span></div><svg viewBox="0 0 260 282" role="img" aria-label="Спереди и сзади. Основные: ${esc(primary)}${secondary?'. Помогают: '+esc(secondary):''}"><g transform="translate(0 12)">${figure('front',config)}</g><g transform="translate(130 12)">${figure('back',config)}</g></svg></div><div class="muscle-description"><div class="muscle-label main"><i></i><b>${firstLabel}</b></div><p class="muscle-primary-text">${esc(primary)}</p>${secondary?`<div class="muscle-label assist"><i></i><b>Помогают / стабилизируют</b></div><p class="muscle-secondary-text">${esc(secondary)}</p>`:''}</div></div><div class="muscle-caption">${note}${config.secondary.includes('hipflexors')?' Сгибатели бедра лежат глубоко: отмечена их область.':''}</div></section>`;
}
function toggle(button){const card=button.closest('.muscle-card');if(!card)return;const expanded=card.classList.toggle('expanded');button.textContent=expanded?'Компактнее ↙':'Крупнее ↗';button.setAttribute('aria-expanded',String(expanded))}
window.BD_MUSCLES={render,toggle,ids:Object.keys(groups)};
})();
