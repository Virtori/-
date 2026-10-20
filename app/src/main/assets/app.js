/* BodyDream Elite 4.2 • Offline personal coach
   No remote requests; recommendations are transparent training rules, not medical/AI diagnoses. */
(function () {
'use strict';
const D = BD_DATA;
const STORAGE_KEY = 'bodydream_elite_v4';
const OLD_KEY = 'bodydream_personal_v3';
const ZONE = 'Asia/Novokuznetsk';
const $ = id => document.getElementById(id);
const esc = x => String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (n,lo,hi) => Math.max(lo,Math.min(hi,n));
const numeric = (x,def=0) => {const n=Number(String(x??'').replace(',','.'));return Number.isFinite(n)?n:def};
const fmt = n => Number.isFinite(n) ? (Math.round(n*10)/10).toLocaleString('ru-RU') : '—';
const formatDate = d => new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',timeZone:ZONE}).format(new Date(d+'T12:00:00Z'));
function dateKey(d=new Date()){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  let o={};parts.forEach(x=>o[x.type]=x.value);
  return `${o.year}-${o.month}-${o.day}`;
}
function dow(date=dateKey()){return new Date(date+'T12:00:00Z').getUTCDay()}
function plusDays(date,amount){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10)}
function weekStart(date=dateKey()){return plusDays(date,-((dow(date)+6)%7))}
function newState(){return {version:4,profile:{name:'',age:30,height:170,startWeight:70,targetWeight:65,calories:2100,protein:150},readiness:{},history:[],active:null,body:[],photos:[],mealChecks:{},groceryChecks:{},settings:{vibrate:true,voice:false,footballWednesday:false},lastPage:'home'}}
function migrateOld(source){
  try{
    const legacy=source||JSON.parse(localStorage.getItem(OLD_KEY)||'null');
    if(!legacy||typeof legacy!=='object')return null;
    const n=newState(),p=legacy.profile||{};
    n.profile.name=String(p.name||n.profile.name).slice(0,50);
    n.profile.age=numeric(p.age,30);n.profile.height=numeric(p.height,170);
    n.profile.startWeight=numeric(p.weight,70);n.profile.targetWeight=numeric(p.target,65);
    n.profile.calories=numeric(p.calories,2100);n.profile.protein=numeric(p.protein,150);
    if(Array.isArray(legacy.body))n.body=legacy.body.map(x=>({date:x.date,weight:numeric(x.weight),waist:numeric(x.waist)||null})).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&x.weight>0);
    if(legacy.readiness&&typeof legacy.readiness==='object')n.readiness=legacy.readiness;
    if(legacy.logs&&typeof legacy.logs==='object'){
      for(const [key,sets] of Object.entries(legacy.logs)){
        const parts=key.split('-'),pid=parts.slice(3).join('-'), date=parts.slice(0,3).join('-');
        const mapped={w1:'push',w2:'pull',w3:'legs',fb:'football'}[pid]||null;
        if(!mapped || !/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
        const prev=legacy.completed?.[date];
        if(prev)n.history.push({id:key,date,plan:mapped,mode:'normal',sets:sets||{},rating:3,pain:'none',note:'Перенесено из 3.0',startedAt:0,finishedAt:0});
      }
    }
    n.settings.vibrate=legacy.settings?.vibrate!==false;
    return n;
  }catch(e){return null}
}
// Keep untrusted JSON backups from injecting attributes, malformed dates or oversized data.
// Existing 4.1 storage uses version 4; keep that storage contract for seamless upgrades.
const isDate = v => {
  if(typeof v!=='string'||!/^20\d\d-\d\d-\d\d$/.test(v))return false;
  const d=new Date(v+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;
};
const bounded = (v,lo,hi,def) => clamp(numeric(v,def),lo,hi);
const safeText = (v,max=350) => String(typeof v==='string'?v:'').slice(0,max);
const safeRecord = v => v&&typeof v==='object'&&!Array.isArray(v)?v:{};
function cleanSets(raw,planId){
  const out={},source=safeRecord(raw),allowed=new Set(D.plans[planId]?.ids||[]);
  for(const [id,items] of Object.entries(source)){
    if(!allowed.has(id)||!Array.isArray(items))continue;
    out[id]=items.slice(0,8).map(row=>{
      const x=safeRecord(row);
      return {
        kg:x.kg===null||x.kg===''||x.kg===undefined?null:bounded(x.kg,0,500,0),
        reps:x.reps===null||x.reps===''||x.reps===undefined?null:Math.round(bounded(x.reps,0,200,0)),
        rir:x.rir===null||x.rir===''||x.rir===undefined?null:Math.round(bounded(x.rir,0,5,2)),
        done:x.done===true
      };
    });
  }
  return out;
}
function cleanSession(raw,active=false){
  const x=safeRecord(raw),p=D.plans[x.plan];
  if(!p||!isDate(x.date))return null;
  const s={
    id:safeText(x.id,80).replace(/[^a-zA-Z0-9_-]/g,'')||'session',
    date:x.date,plan:p.id,
    mode:['normal','light'].includes(x.mode)?x.mode:'normal',
    index:Math.round(bounded(x.index,0,p.ids.length-1,0)),
    startedAt:bounded(x.startedAt,0,4102444800000,0),
    sets:cleanSets(x.sets,p.id)
  };
  if(active){
    s.restUntil=x.restUntil===null||x.restUntil===undefined?null:bounded(x.restUntil,0,4102444800000,0);
  }else{
    s.rating=Math.round(bounded(x.rating,1,5,3));
    s.pain=['none','shoulder','back','knee','ankle','other'].includes(x.pain)?x.pain:'none';
    s.note=safeText(x.note,500);
    s.finishedAt=bounded(x.finishedAt,0,4102444800000,0);
  }
  return s;
}
function normalizeState(raw){
  const src=safeRecord(raw),out=newState(),p=safeRecord(src.profile),base=out.profile;
  out.profile={
    name:safeText(p.name||base.name,40)||base.name,
    age:Math.round(bounded(p.age,18,100,base.age)),
    height:Math.round(bounded(p.height,120,230,base.height)),
    startWeight:bounded(p.startWeight,35,250,base.startWeight),
    targetWeight:bounded(p.targetWeight,35,250,base.targetWeight),
    calories:Math.round(bounded(p.calories,1200,5000,base.calories)),
    protein:Math.round(bounded(p.protein,40,280,base.protein))
  };
  const setting=safeRecord(src.settings);
  for(const key of Object.keys(out.settings))if(typeof setting[key]==='boolean')out.settings[key]=setting[key];
  const painValues=new Set(['none','mild','sharp']);
  for(const [date,v] of Object.entries(safeRecord(src.readiness)).slice(-1100)){
    if(!isDate(date))continue;
    const x=safeRecord(v);
    out.readiness[date]={sleep:bounded(x.sleep,0,14,7),energy:Math.round(bounded(x.energy,1,5,3)),soreness:Math.round(bounded(x.soreness,1,5,2)),stress:Math.round(bounded(x.stress,1,5,2)),pain:painValues.has(x.pain)?x.pain:'none',note:safeText(x.note,350)};
  }
  if(Array.isArray(src.history))out.history=src.history.slice(-2500).map(x=>cleanSession(x,false)).filter(Boolean);
  if(src.active)out.active=cleanSession(src.active,true);
  if(Array.isArray(src.body)){
    const byDate=new Map();
    for(const rawItem of src.body.slice(-2500)){
      const x=safeRecord(rawItem),w=numeric(x.weight,-1),waist=x.waist==null?null:numeric(x.waist,-1);
      if(!isDate(x.date)||w<35||w>250)continue;
      byDate.set(x.date,{date:x.date,weight:Math.round(w*10)/10,waist:waist>=40&&waist<=200?Math.round(waist*10)/10:null});
    }
    out.body=Array.from(byDate.values()).sort((a,b)=>a.date.localeCompare(b.date));
  }
  if(Array.isArray(src.photos)){
    out.photos=src.photos.slice(-10).flatMap((rawPhoto,i)=>{
      const x=safeRecord(rawPhoto),data=x.data;
      if(!isDate(x.date)||typeof data!=='string'||data.length>900000||!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(data))return [];
      return [{id:safeText(x.id,50).replace(/[^a-zA-Z0-9_-]/g,'')||('photo'+i),date:x.date,data}];
    });
  }
  for(const [date,v] of Object.entries(safeRecord(src.mealChecks)).slice(-1000)){
    if(!isDate(date))continue;const meal=safeRecord(v),checks={};
    for(let i=0;i<4;i++)if(meal[i]===true)checks[i]=true;
    out.mealChecks[date]=checks;
  }
  const groceryIds=new Set(D.groceries.flatMap(cat=>cat.items.map(([name])=>`${cat.cat}:${name}`)));
  for(const [date,v] of Object.entries(safeRecord(src.groceryChecks)).slice(-150)){
    if(!isDate(date))continue;const input=safeRecord(v),checks={};
    for(const [key,value] of Object.entries(input))if(groceryIds.has(key)&&value===true)checks[key]=true;
    out.groceryChecks[date]=checks;
  }
  if(['home','plan','tech','exercise','checkin','progress','food','settings'].includes(src.lastPage))out.lastPage=src.lastPage;
  return out;
}

function load(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    if(saved&&saved.version===4&&Array.isArray(saved.history))return normalizeState(saved);
    return normalizeState(migrateOld()||newState());
  }catch(e){return newState()}
}
let state=load();
let page='home', detailId=null, techFilter='Все', techSearch='', foodDay=dow(), foodTab='meals', progressMetric='weight', toastTimer=0, timerHandle=0, pausedByApp=false, feedbackRating=3, videoURL=null;
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true}catch(e){toast('Хранилище заполнено. Экспортируй копию и удали старые фото.');return false}}
function toast(message){const el=$('toast');if(!el)return;el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3000)}
function vibrate(duration=45){if(!state.settings.vibrate)return;try{if(window.Android?.vibrate)Android.vibrate(duration);else navigator.vibrate?.(duration)}catch(e){}}
function speak(t){if(!state.settings.voice)return;try{if(window.Android?.speak){Android.speak(String(t));return}if('speechSynthesis'in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='ru-RU';u.rate=.94;speechSynthesis.speak(u)}}catch(e){}}
function todaysPlanId(){const d=dow();if(d===3&&state.settings.footballWednesday)return 'football';return D.schedule[d]}
function planOn(day){if(day===3&&state.settings.footballWednesday)return 'football';return D.schedule[day]}
function sessions(plan){return state.history.filter(s=>s.plan===plan).sort((a,b)=>(b.date||'').localeCompare(a.date||''))}
function completedThisWeek(){const m=weekStart();return state.history.filter(s=>s.date>=m&&s.date<=plusDays(m,6)).length}
function thisWeekTarget(){return state.settings.footballWednesday?6:5}
function currentWeight(){const last=state.body.slice().sort((a,b)=>a.date.localeCompare(b.date)).at(-1);return last?.weight||state.profile.startWeight}
function latestWaist(){return state.body.slice().sort((a,b)=>a.date.localeCompare(b.date)).filter(x=>x.waist>0).at(-1)?.waist||null}
function readinessFor(date=dateKey()){
  const r=state.readiness[date];if(!r)return null;
  const sleep=numeric(r.sleep,7),en=numeric(r.energy,3),sore=numeric(r.soreness,2),stress=numeric(r.stress,2);
  let score=Math.round(clamp(75+(sleep-7)*8+(en-3)*8-(sore-2)*7-(stress-2)*5-(r.pain==='mild'?18:0)-(r.pain==='sharp'?50:0),0,100));
  let mode=r.pain==='sharp'?'stop':score<65||r.pain==='mild'?'light':'normal';
  return {...r,score,mode};
}
function modeLabel(mode){return mode==='stop'?'Пауза и оценка боли':mode==='light'?'Облегчённая нагрузка':'Обычная нагрузка'}
function readinessText(r){
  if(!r)return 'Заполни чек готовности. Тогда тренер подскажет нагрузку перед залом или футболом.';
  if(r.mode==='stop')return 'Отмечена резкая/необычная боль. Не тренируй через неё; если она сильная или нарастает, обратись за медицинской помощью.';
  if(r.mode==='light')return 'Сегодня снизь рабочие веса на 5–10% или убери один подход. Оставляй 3 повтора в запасе.';
  return 'Восстановление позволяет выполнить план. Оставляй 2 повтора в запасе, вес повышай только при чистой технике.';
}
function effectiveSets(ex,mode){if(ex.group==='Футбол')return 1;return mode==='light'?Math.max(1,ex.sets-1):mode==='stop'?0:ex.sets}
function lastResults(exId){return state.history.slice().reverse().flatMap(s=>s.sets?.[exId]?.some(x=>x.done)?[{session:s,sets:s.sets[exId]}]:[])}
function suggestion(exId){
 const ex=D.exercises[exId],h=lastResults(exId),last=h[0];
 if(!last)return {kind:'neutral',label:'Первое занятие',text:'Начни с лёгкого веса, с которым останется примерно 2–3 повтора в запасе.',weight:''};
 const v=last.sets.filter(x=>x.done&&numeric(x.reps)>0);if(!v.length)return {kind:'neutral',label:'Подбери нагрузку',text:'Нужны завершённые подходы.',weight:''};
 const weights=v.map(x=>numeric(x.kg,0)),weight=weights[weights.length-1],pain=last.session.pain!=='none';
 if(ex.step===0)return {kind:'neutral',label:'Качество важнее времени',text:'Сначала закрепи технику и устойчивость, затем добавляй повторы или секунды.',weight:0};
 if(pain)return {kind:'warn',label:'Без увеличения веса',text:'В прошлый раз была отмечена боль. Не повышай вес в провоцирующем упражнении.',weight};
 if(v.some(x=>x.rir!==null&&x.rir!==undefined&&numeric(x.rir)<=0))return {kind:'warn',label:'Оставь вес',text:'Был подход до отказа. Сохрани вес, добавляй чистые повторения.',weight};
 const strong=sets=>sets.length>=Math.min(ex.sets,2)&&sets.every(x=>x.done&&numeric(x.reps)>=ex.hi&&numeric(x.rir,2)>=2);
 if(h.length>=2&&strong(v)&&strong(h[1].sets.filter(x=>x.done&&numeric(x.reps)>0))) {
    const prv=h[1].sets.find(x=>x.done);if(prv&&Math.abs(numeric(prv.kg)-weight)<=Math.max(1,ex.step*1.5))return {kind:'good',label:'Можно добавить вес',text:`Две тренировки подряд достигнут верх диапазона. Попробуй ${fmt(weight+ex.step)} кг (+${fmt(ex.step)}), сохраняя 2 повтора в запасе.`,weight:weight+ex.step};
 }
 if(v.some(x=>numeric(x.reps)<ex.lo-1))return {kind:'warn',label:'Вес может быть велик',text:'Некоторые подходы ниже рабочего диапазона. Уменьши вес или проверь отдых и технику.',weight};
 return {kind:'neutral',label:'Закрепляй нагрузку',text:'Оставь тот же вес и постепенно добирай повторения без рывков.',weight};
}
function makeIcon(id){return D.plans[id]?.icon||'⏱'}
function nav(pageId){document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.page===pageId));}
function go(which,arg){
  if(videoURL&&(which!=='exercise'||arg!==detailId)){URL.revokeObjectURL(videoURL);videoURL=null}
  page=which;detailId=arg||null;state.lastPage=which;save();nav(['home','plan','tech','progress','food','settings'].includes(which)?which:(which==='diagnostics'?'settings':'tech'));
  if(which==='home')renderHome();else if(which==='plan')renderPlan();else if(which==='tech')renderTech();else if(which==='exercise')renderExercise(arg);else if(which==='checkin')renderCheckin();else if(which==='progress')renderProgress();else if(which==='food')renderFood();else if(which==='settings')renderSettings();else if(which==='diagnostics')renderDiagnostics();else renderHome();
  window.scrollTo({top:0,behavior:'instant'});
}
function showRunner(){const el=$('runner');el.hidden=false;document.body.style.overflow='hidden';try{Android?.keepAwake?.(true)}catch(e){}renderRunner();}
function hideRunner(){const el=$('runner');el.hidden=true;document.body.style.overflow='';try{Android?.keepAwake?.(false)}catch(e){}clearInterval(timerHandle);timerHandle=0;renderHome()}
function appBack(){if(!$('runner').hidden){pauseWorkout();return true}if(page!=='home'){go('home');return true}return false}
window.BodyDreamBack=appBack;
function header(title,kicker='BODYDREAM ELITE'){return `<div style="margin-bottom:18px"><div class="overline">${kicker}</div><h1>${title}</h1></div>`}
function weekStrip(){let base=weekStart(),today=dateKey();return `<div class="weekline">${[0,1,2,3,4,5,6].map(i=>{let date=plusDays(base,i),d=dow(date),p=planOn(d),done=state.history.some(h=>h.date===date);return `<button class="wday ${date===today?'today':''} ${done?'done':''}" onclick="App.showDay(${d})"><strong>${D.days[d]}</strong><small>${p?D.plans[p].short:'Пауза'}</small></button>`}).join('')}</div>`}
function homeAdvice(){
 const ready=readinessFor(),meas=state.body.slice().sort((a,b)=>a.date.localeCompare(b.date));
 if(ready?.mode==='stop')return readinessText(ready);
 if(state.active)return 'Есть незавершённая тренировка: продолжи с того подхода, на котором остановился.';
 if(meas.length<3)return 'Взвешивайся утром 3–4 раза в неделю. Пресс проявится по мере снижения жировой массы; локально «сжечь жир на животе» упражнениями нельзя.';
 const span=meas.slice(-10),days=(new Date(span.at(-1).date)-new Date(span[0].date))/86400000;
 if(days<10)return 'Не меняй калории по одному измерению. Смотри на средний вес за 2–3 недели.';
 const delta=(span[0].weight-span.at(-1).weight)*7/days;
 if(delta>0.85)return `Вес снижается примерно на ${fmt(delta)} кг/нед. При упадке сил и плохом восстановлении стоит уменьшить дефицит.`;
 if(delta>0.25)return `Вес снижается примерно на ${fmt(delta)} кг/нед. Продолжай план без резких изменений калорий.`;
 return 'Снижение веса пока небольшое. Проверь 2–3 недели учёта питания и шагов, затем корректируй умеренно.';
}
function weeklyReview(){
 const start=weekStart(),end=plusDays(start,6),today=dateKey();
 const sessions=state.history.filter(s=>s.date>=start&&s.date<=end),strength=sessions.filter(s=>D.plans[s.plan]?.kind==='strength').length,football=sessions.filter(s=>s.plan==='football').length;
 const last=state.body.filter(v=>v.date>=plusDays(today,-6)&&v.date<=today);
 const previous=state.body.filter(v=>v.date>=plusDays(today,-13)&&v.date<=plusDays(today,-7));
 let note='Для сравнения веса взвешивайся утром несколько раз в неделю. Данные одной даты не считаем трендом.';
 if(last.length>=2&&previous.length>=2){
   const avg=items=>items.reduce((n,v)=>n+v.weight,0)/items.length;
   const delta=avg(previous)-avg(last);
   if(delta>0.85)note=`Средний вес снизился на ${fmt(delta)} кг за неделю. Если падают силы или ухудшается восстановление, пересмотри дефицит.`;
   else if(delta>=0.2)note=`Средний вес снизился примерно на ${fmt(delta)} кг. При нормальном самочувствии продолжай без резкой смены калорий.`;
   else if(delta< -0.2)note=`Средний вес вырос примерно на ${fmt(-delta)} кг. Это могут быть колебания жидкости; проверь тренд ещё 1–2 недели.`;
   else note='Средний вес почти не изменился. Для корректировки питания нужны ещё данные и стабильный учёт.';
 }
 const targetFootball=state.settings.footballWednesday?3:2;
 return `<div class="section-head"><h3>Итоги недели</h3><span class="muted small">${esc(start)} — ${esc(end)}</span></div><div class="card"><div class="grid2"><div class="metric"><small>Силовые</small><div class="num">${strength}<span class="unit">/3</span></div><b>Техника + прогресс</b></div><div class="metric"><small>Футбол</small><div class="num">${football}<span class="unit">/${targetFootball}</span></div><b>Игры и выносливость</b></div></div><div class="tip" style="margin-top:14px">${esc(note)}</div></div>`;
}

function renderHome(){
 const p=state.profile,k=todaysPlanId(),w=currentWeight(),r=readinessFor(),already=state.history.some(s=>s.date===dateKey()&&s.plan===k),active=state.active;
 const message=k?D.plans[k].title:'Восстановление и сон';
 const action=active?`<button class="button primary" onclick="App.resumeWorkout()">▶ Продолжить тренировку</button>`:k?`<button class="button primary" onclick="App.startWorkout('${k}')">▶ Начать тренировку</button>`:`<button class="button primary" onclick="App.go('checkin')">Проверить готовность</button>`;
 $('main').innerHTML=`<div class="hero"><span class="pill">${esc(D.daysLong[dow()])} · ${esc(formatDate(dateKey()))} · Кузбасс</span><div class="overline">Всё начинается с системы</div><h1>${esc(message)}</h1><p>${k?`${D.plans[k].short} · ${D.plans[k].duration} минут · тренировка по шагам`:'Сегодня нет силовой нагрузки по плану. Восстановление — часть результата.'}</p><div class="actions">${action}<button class="button outline" onclick="App.go('plan')">План недели ↗</button></div>${already?`<div class="tag" style="margin-top:14px">✓ Тренировка уже сохранена сегодня</div>`:''}</div>
 <div class="grid2 grid4"><div class="metric"><small>Вес сейчас</small><div class="num">${fmt(w)}<span class="unit">кг</span></div><b>Старт ${fmt(p.startWeight)}</b></div><div class="metric"><small>Цель</small><div class="num">${fmt(p.targetWeight)}<span class="unit">кг</span></div><b>Без жёстких сроков</b></div><div class="metric"><small>Тренировки</small><div class="num">${completedThisWeek()}<span class="unit">/${thisWeekTarget()}</span></div><b>На этой неделе</b></div><div class="metric"><small>Питание</small><div class="num">${p.calories}<span class="unit">ккал</span></div><b>${p.protein} г белка — ориентир</b></div></div>
 <div class="section-head"><h3>Готовность к нагрузке</h3><button class="button icon" onclick="App.go('checkin')">${r?'Обновить':'Пройти чек'} ↗</button></div>
 <div class="card ${r?.mode==='stop'?'bad':r?.mode==='light'?'warn':'soft'}"><div class="readiness"><div class="readiness-score ${r?.mode==='normal'?'ok':r?.mode==='light'?'medium':r?.mode==='stop'?'stop':''}">${r?r.score:'?'}</div><div><b>${r?modeLabel(r.mode):'Как сегодня себя чувствуешь?'}</b><div class="sub">${esc(readinessText(r))}</div></div></div></div>
 <div class="section-head"><h3>Твоя неделя</h3><span class="muted small">3 зала + ${state.settings.footballWednesday?3:2} футбола</span></div>${weekStrip()}
 <div class="section-head"><h3>Совет тренера</h3><span class="kicker">по твоим данным</span></div><div class="card"><div class="row"><div class="workout-avatar">✦</div><div class="grow"><div class="small">${esc(homeAdvice())}</div></div></div></div>
 ${weeklyReview()}<div class="section-head"><h3>Следующий шаг</h3></div><div class="card"><div class="row"><div class="grow"><b>Техника + прогресс</b><div class="sub">Открывай упражнение, смотри схему и отмечай каждый рабочий подход. Тренер учтёт результат на следующем занятии.</div></div><button class="button icon" onclick="App.go('tech')">→</button></div></div>`;
}
function showDay(day){const id=planOn(day);if(id)openPlan(id);else toast('В этот день восстановление: прогулка и сон.')}
function openPlan(id){if(!D.plans[id])return;page='plan';detailId=id;nav('plan');renderPlan(id);window.scrollTo(0,0)}
function renderPlan(selected){
 const plans=selected?[D.plans[selected]]:Object.values(D.plans);
 $('main').innerHTML=`${header(selected?esc(D.plans[selected].title):'План тренировок', 'ТВОЯ НЕДЕЛЯ • АДАПТИВНАЯ НАГРУЗКА')}${selected?`<button class="button icon" onclick="App.go('plan')" style="margin-bottom:12px">← Все тренировки</button>`:''}<div class="card soft"><b>Тренируйся с запасом</b><div class="sub">Первый месяц — 2–3 повтора в запасе. Качество движения важнее количества дисков. Суббота — умеренная нагрузка на ноги перед воскресным футболом.</div></div>${weekStrip()}<div class="section-head"><h3>${selected?'Упражнения':'Тренировки по программе'}</h3></div>
 ${plans.map(plan=>`<div class="card"><div class="row"><div class="workout-avatar">${plan.icon}</div><div class="grow"><b>${esc(plan.title)}</b><div class="sub">${esc(plan.sub)} · ${plan.duration} мин · ${plan.ids.length} этапов</div><div class="meta"><span class="tag">${plan.short}</span><span class="tag blue">${plan.time}</span></div></div></div><div class="divider"></div>${plan.ids.map((id,i)=>{const e=D.exercises[id];return `<div class="row exercise-mini list-item" onclick="App.go('exercise','${id}')"><div class="sortnum">${i+1}</div><div class="grow"><div class="name">${esc(e.name)}</div><div class="meta-line">${e.sets} × ${e.reps} · ${esc(e.group)}</div></div><span class="muted">›</span></div>`}).join('')}<div class="actions" style="margin-top:14px"><button class="button primary" onclick="App.startWorkout('${plan.id}')">▶ Начать ${plan.short}</button>${selected?'':`<button class="button dark" onclick="App.openPlan('${plan.id}')">Подробнее →</button>`}</div></div>`).join('')}
 <div class="tip amber">График по Кемеровской области (UTC+7). В приложении он справочный; изменения в Google Календарь автоматически не отправляются.</div>`;
}
function renderCheckin(){
 const old=state.readiness[dateKey()]||{sleep:7,energy:3,soreness:2,stress:2,pain:'none',note:''},r=readinessFor();
 $('main').innerHTML=`${header('Тренер перед стартом','30 СЕКУНД НА ВОССТАНОВЛЕНИЕ')}<div class="card"><p class="muted small">Оценка по правилам приложения. Не заменяет медицинское обследование и не определяет травмы.</p><div class="form-grid"><div class="field-box"><label class="field" for="ciSleep">Сон, часов</label><input class="input" id="ciSleep" type="number" min="0" max="14" step="0.5" value="${numeric(old.sleep)}"></div><div class="field-box"><label class="field" for="ciPain">Боль сегодня</label><select id="ciPain"><option value="none" ${old.pain==='none'?'selected':''}>Нет</option><option value="mild" ${old.pain==='mild'?'selected':''}>Лёгкая</option><option value="sharp" ${old.pain==='sharp'?'selected':''}>Резкая / необычная</option></select></div></div>${[ ['ciEnergy','Энергия',old.energy],['ciSore','Болят мышцы',old.soreness],['ciStress','Стресс',old.stress] ].map(([id,name,val])=>`<div class="range-wrap"><label for="${id}">${name}</label><input id="${id}" type="range" min="1" max="5" value="${numeric(val,3)}" oninput="this.nextElementSibling.value=this.value"><output>${numeric(val,3)}</output></div>`).join('')}<div class="field-box"><label class="field" for="ciNotes">Комментарий (необязательно)</label><textarea id="ciNotes" placeholder="Например, тяжёлые ноги после футбола">${esc(old.note)}</textarea></div><button class="button primary wide" onclick="App.saveCheckin()">Сохранить самочувствие</button></div>${r?`<div class="card ${r.mode==='stop'?'bad':r.mode==='light'?'warn':'soft'}"><div class="readiness"><div class="readiness-score ${r.mode==='normal'?'ok':r.mode==='light'?'medium':'stop'}">${r.score}</div><div><b>${modeLabel(r.mode)}</b><div class="sub">${esc(readinessText(r))}</div></div></div></div>`:''}<div class="tip">Если чувствуешь боль в груди, предобморочное состояние или необычную сильную одышку — прекрати нагрузку и обратись за медицинской помощью.</div>`;
}
function saveCheckin(){
 const sl=numeric($('ciSleep').value,-1);if(sl<0||sl>14){toast('Укажи сон от 0 до 14 часов');return}
 const key=dateKey(),previous=state.readiness[key];state.readiness[key]={sleep:sl,energy:numeric($('ciEnergy').value,3),soreness:numeric($('ciSore').value,2),stress:numeric($('ciStress').value,2),pain:$('ciPain').value,note:String($('ciNotes').value).slice(0,350)};
 if(!save()){if(previous)state.readiness[key]=previous;else delete state.readiness[key];return}vibrate();toast('Самочувствие сохранено');go('home');
}
function renderTech(){
 $('main').innerHTML=`${header('Техника движений','ПОНЯТНО · НАГЛЯДНО · БЕЗ РЫВКОВ')}<div class="card soft"><b>Как пользоваться схемами</b><div class="sub">Каждая схема показывает старт и основную фазу упражнения. Это упрощённые рисунки, не точная траектория для любого тела. Читай инструкцию и настраивай тренажёр под себя.</div></div><input id="techSearch" class="input search" type="search" placeholder="Найти упражнение или мышцу…" value="${esc(techSearch)}" oninput="App.setTechSearch(this.value)" aria-label="Поиск упражнения"><div id="techFilters" class="filter-scroll"></div><div id="techList"></div>`;
 updateTechLists();
}
function updateTechLists(){
 const groups=['Все','Грудь','Спина','Плечи','Ноги','Руки','Пресс','Футбол'];
 const f=$('techFilters'),l=$('techList');if(!f||!l)return;
 f.innerHTML=groups.map(g=>`<button class="filter-chip ${techFilter===g?'active':''}" onclick="App.setTechFilter('${g}')">${g}</button>`).join('');
 const result=Object.entries(D.exercises).filter(([id,e])=>(techFilter==='Все'||e.group===techFilter)&&(`${e.name} ${e.muscles}`.toLowerCase().includes(techSearch.toLowerCase())));
 l.innerHTML=result.length?result.map(([id,e])=>`<div class="list-item exercise-mini row" onclick="App.go('exercise','${id}')"><div class="workout-avatar" style="width:44px;min-width:44px;height:44px;font-size:20px">${{Грудь:'◩',Плечи:'◍',Спина:'◫',Ноги:'◧',Руки:'◉',Пресс:'◇',Футбол:'⚽'}[e.group]}</div><div class="grow"><div class="name">${esc(e.name)}</div><div class="meta-line">${esc(e.muscles)}</div></div><span class="muted">›</span></div>`).join(''):`<div class="card muted small">Ничего не найдено. Попробуй другое название.</div>`;
}
function setTechSearch(v){techSearch=String(v).slice(0,100);updateTechLists()}
function setTechFilter(v){techFilter=v;updateTechLists()}
// Two deliberately simplified schematic poses. The information in cue cards takes priority over a diagram.
function poseSvg(pattern){
 const stroke='#b8fb68', muted='#6c8e9a';
 const L=(x1,y1,x2,y2,w=7,c=stroke)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
 const C=(cx,cy,r=15,c=stroke)=>`<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${c}" stroke-width="6" fill="none"/>`;
 const P=(pts,w=7,c=stroke)=>`<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
 function figure(type,end){
 let a='', b='';const f=end?1:0;
 switch(type){
 case 'bench':
   a=L(38,156,211,156,8,muted)+L(61,156,61,193,5,muted)+L(187,156,187,193,5,muted)+C(60,133,13)+L(76,144,172,144,9)+P('171,144 191,157 198,187',6)+P(`111,143 ${end?111:100},${end?61:107} ${end?111:100},${end?54:100}`,7)+L(77,end?54:100,149,end?54:100,7, '#ffcd79');
   break;
 case 'squat':
   a=C(f?118:126,f?76:46)+L(f?117:126,f?93:62,f?103:127,f?135:126,10)+P(f?'103,135 148,137 171,184':'127,126 132,166 139,190',9)+P(f?'103,135 79,144 67,188':'127,126 100,162 98,189',9)+L(f?101:126,f?103:87,f?144:92,f?128:142,7)+L(f?144:92,f?128:142,f?172:153,7);
   b=L(47,195,216,195,3,muted);break;
 case 'hinge':
   a=C(f?164:123,f?86:48,14)+L(f?150:125,f?95:65,f?101:126,f?132:130,10)+P(f?'101,132 108,171 113,194':'126,130 129,165 130,193',9)+P(f?'101,132 78,166 80,193':'126,130 102,166 104,193',9)+P(f?'140,105 151,133 153,152':'124,78 127,109 126,148',7)+L(f?117:99,f?154:148,f?175:141,f?154:148,7,'#ffcd79');break;
 case 'press':
   a=C(125,58)+L(125,76,125,159,9)+P('125,159 106,191',9)+P('125,159 146,191',9)+P(f?'121,95 96,70 99,36':'121,95 95,109 86,118',7)+P(f?'129,95 153,70 151,36':'129,95 157,109 165,118',7)+L(f?88:76,f?32:118,f?110:97,f?32:118,8,'#ffcd79')+L(f?140:153,f?32:118,f?163:174,f?32:118,8,'#ffcd79');break;
 case 'raise':
   a=C(125,50)+L(125,68,125,146,9)+P('125,146 105,194',9)+P('125,146 145,194',9)+P(f?'125,85 75,90 55,92':'125,85 111,130 104,168',7)+P(f?'125,85 177,90 196,92':'125,85 139,130 148,168',7);break;
 case 'pull':
   a=C(125,57)+L(125,75,125,151,9)+P('125,151 105,173 105,189',8)+P('125,151 146,173 146,189',8)+L(76,186,176,186,4,muted)+P(f?'124,93 87,92 73,104':'124,93 102,61 88,32',7)+P(f?'126,93 163,92 177,104':'126,93 148,61 162,32',7)+L(f?63:73,f?105:32,f?186:177,f?105:32,6,'#ffcd79');break;
 case 'row':
   a=C(105,64)+L(105,82,116,147,9)+P('116,147 164,147 177,190',8)+P('116,147 87,170 79,190',8)+L(78,192,194,192,4,muted)+P(f?'111,96 147,108 170,125':'111,96 157,119 196,119',7)+L(f?164:192,f?125:119,f?180:211,f?125:119,6,'#ffcd79');break;
 case 'curl':
   a=C(124,52)+L(124,70,124,149,9)+P('124,149 105,192',8)+P('124,149 144,192',8)+P(f?'124,89 96,112 113,85':'124,89 103,123 98,169',7)+P(f?'124,89 150,112 137,85':'124,89 149,123 154,169',7);break;
 case 'crunch':
   a=C(f?124:153,f?77:53)+P(f?'113,85 88,117 114,145':'143,62 152,121 115,150',10)+P('115,150 82,166 80,193',8)+P('115,150 145,166 150,193',8)+P(f?'112,90 110,121':'153,80 146,108',7);break;
 case 'plank':
   a=C(76,120)+L(91,125,193,146,10)+P('111,132 102,168 94,180',8)+L(193,146,221,179,8)+L(50,184,222,184,4,muted);break;
 case 'football':
   a=C(121,54)+L(121,72,123,131,10)+P(f?'123,131 159,158 185,177':'123,131 146,161 142,185',9)+P(f?'123,131 102,153 98,183':'123,131 96,150 90,183',9)+P('119,86 93,114',7)+P('121,86 152,102',7)+C(f?206:175,183,12,'#ffcd79');break;
 default:a=C(125,51)+L(125,69,125,147,9)+P('125,147 104,189',8)+P('125,147 146,189',8);break;
 }
 return `<g>${a}${b}</g>`;
 }
 return `<figure class="pose"><svg viewBox="0 0 520 232" role="img" aria-label="Упрощённая схема начальной и конечной фазы движения"><rect x="7" y="6" width="246" height="221" rx="16" fill="#132127" stroke="#324a4d"/><rect x="267" y="6" width="246" height="221" rx="16" fill="#132127" stroke="#324a4d"/><text x="20" y="26" fill="#c4dbd0" font-size="13" font-weight="700">СТАРТ</text><text x="280" y="26" fill="#c4dbd0" font-size="13" font-weight="700">ФАЗА УСИЛИЯ</text><g transform="translate(0 14)">${figure(pattern,false)}</g><g transform="translate(260 14)">${figure(pattern,true)}</g><path d="M247 121 l14 0 m-5 -5 l5 5 -5 5" stroke="#b8fb68" stroke-width="3" fill="none"/></svg><figcaption>Условная схема движения · не заменяет корректировку техники тренером</figcaption></figure>`;
}
function exerciseCues(e){return `<div class="cue-grid"><div class="cue"><strong>01 · Исходное положение</strong><p>${esc(e.setup)}</p></div><div class="cue"><strong>02 · Само движение</strong><p>${esc(e.motion)}</p></div><div class="cue"><strong>03 · Какие мышцы работают</strong><p>${esc(e.feel)}</p></div><div class="cue bad"><strong>04 · Главная ошибка</strong><p>${esc(e.avoid)}</p></div></div><div class="tip">Дыхание: ${esc(e.breath)}${e.safety?' '+esc(e.safety):''}</div>`}
function renderExercise(id){const e=D.exercises[id];if(!e){go('tech');return}
 const a=suggestion(id);
 $('main').innerHTML=`<button class="button icon" onclick="App.go('tech')" style="margin-bottom:14px">← Библиотека</button>${header(esc(e.name),esc(e.group).toUpperCase())}<div class="meta" style="margin-bottom:10px"><span class="tag">${esc(e.muscles)}</span><span class="tag blue">${e.sets} × ${esc(e.reps)}</span><span class="tag orange">${e.rest||'без'} сек отдыха</span></div>${poseSvg(e.pattern)}<div class="section-head"><h3>Разбор техники</h3></div>${exerciseCues(e)}<div class="card"><b>Альтернатива</b><div class="sub">${esc(e.alt)} — если основной вариант недоступен или вызывает дискомфорт.</div></div><div class="card soft"><b>Тренер по твоему журналу: ${esc(a.label)}</b><div class="sub">${esc(a.text)}</div></div><div class="section-head"><h3>Видеосамопроверка</h3></div><div class="card"><div class="sub">Запиши короткий подход на телефон и сравни себя с подсказками выше. Видео остаётся только на твоём устройстве; приложение <b>не распознаёт позу автоматически</b>.</div><div class="actions"><button class="button dark" onclick="document.getElementById('videoFile').click()">Открыть видео / камеру</button><input id="videoFile" type="file" accept="video/*" capture="environment" hidden onchange="App.loadSelfVideo(this.files)"></div><div id="selfVideo"></div></div>`;
}
function loadSelfVideo(files){if(!files?.length)return;const file=files[0];if(!file.type.startsWith('video/')){toast('Выбери видеофайл');return}if(videoURL){URL.revokeObjectURL(videoURL)}videoURL=URL.createObjectURL(file);let el=$('selfVideo');if(el)el.innerHTML=`<video src="${videoURL}" controls playsinline style="width:100%;max-height:340px;border-radius:12px;margin-top:12px" aria-label="Запись упражнения для самопроверки"></video><div class="tip amber">Смотри: положение суставов, плавность, контроль корпуса, отсутствие боли. Автоматического заключения приложение не делает.</div>`}
function startWorkout(planId){
 if(!D.plans[planId])return;
 if(state.active){
   if(state.active.plan===planId){showRunner();return}
   toast('У тебя есть незавершённая тренировка. Продолжи её или удали в настройках.');return;
 }
 const r=readinessFor();if(r?.mode==='stop'){toast('Ты отметил резкую боль. Сначала разберись с причиной и не тренируйся через боль.');return}
 if(!r){if(window.confirm('Перед тренировкой желательно оценить сон и самочувствие. Перейти к чеку готовности?')){go('checkin');return}}
 state.active={id:Date.now().toString(36),date:dateKey(),plan:planId,mode:r?.mode||'normal',index:0,startedAt:Date.now(),sets:{},restUntil:null};if(!save()){state.active=null;return}showRunner();speak('Тренировка началась. Качество движений важнее веса.');
}
function resumeWorkout(){if(!state.active){toast('Нет незавершённой тренировки');return}if(readinessFor()?.mode==='stop'){toast('Ты отметил резкую боль. Приоритет — безопасность, не продолжай нагрузку.');return}showRunner()}
function pauseWorkout(){if(!state.active){hideRunner();return}save();hideRunner();toast('Тренировка сохранена, можно продолжить позже')}
function discardWorkout(){if(!state.active)return;if(confirm('Удалить незавершённую тренировку? Записанные подходы этой сессии будут потеряны.')){state.active=null;save();hideRunner();toast('Черновик тренировки удалён')}}
function activeExercise(){if(!state.active)return null;const p=D.plans[state.active.plan];return p?D.exercises[p.ids[state.active.index]]:null}
function setRows(e,id){
 const s=state.active;const rows=s.sets[id]||[],n=effectiveSets(e,s.mode),last=suggestion(id);
 return `<div class="card"><div class="spaced"><h3>Рабочие подходы</h3><span class="tag blue">${n} × ${esc(e.reps)}</span></div><div class="sub" style="margin:7px 0 13px">RIR — сколько повторов осталось бы в запасе. Ориентир: 2, в облегчённый день — 3.</div><div class="set-grid"><div class="head">№</div><div class="head">Вес, кг</div><div class="head">Повторы*</div><div class="head">RIR</div><div class="head">✓</div>${Array.from({length:n},(_,i)=>{
    const x=rows[i]||{};return `<div class="setnum">${i+1}</div><input class="input" type="number" inputmode="decimal" min="0" max="500" step="0.5" value="${x.kg??(i===0?last.weight??'':rows[0]?.kg??last.weight??'')}" aria-label="Вес подхода ${i+1}" onchange="App.editSet('${id}',${i},'kg',this.value)"><input class="input" type="number" inputmode="numeric" min="1" max="200" step="1" value="${x.reps??''}" aria-label="Повторения подхода ${i+1}" onchange="App.editSet('${id}',${i},'reps',this.value)"><input class="input" type="number" inputmode="numeric" min="0" max="5" step="1" value="${x.rir??(s.mode==='light'?3:2)}" aria-label="RIR подхода ${i+1}" onchange="App.editSet('${id}',${i},'rir',this.value)"><button class="set-done ${x.done?'is-done':''}" aria-label="Завершить подход ${i+1}" onclick="App.markSet('${id}',${i})">${x.done?'✓':'○'}</button>`
 }).join('')}</div><div class="load-note" style="margin-top:10px">*Для упражнения на время вводи секунды. Для упражнений без отягощения можно поставить вес 0. Вес гантелей — одной гантели.</div></div>`;
}
function trainerHintFor(id){const a=suggestion(id);return `<div class="tip ${a.kind==='warn'?'amber':''}"><b>${esc(a.label)}.</b> ${esc(a.text)}</div>`}
function renderRunner(){
 const s=state.active;if(!s){hideRunner();return}const p=D.plans[s.plan],id=p.ids[s.index],e=D.exercises[id],fb=p.kind==='football';
 const n=effectiveSets(e,s.mode),done=Object.values(s.sets).flat().filter(x=>x.done).length;
 let desc=s.mode==='light'?'Сегодня облегчённый режим: меньше подходов, 2–3 повтора в запасе.':s.mode==='normal'?'Рабочий режим: оставляй примерно 2 чистых повтора в запасе.':'Пересмотри нагрузку.';
 $('runnerContent').innerHTML=`<div class="runner-header"><div class="spaced"><button class="button icon" onclick="App.pauseWorkout()">← Пауза</button><div class="stepdots">${p.ids.map((_,i)=>`<i class="${i<=s.index?'active':''}"></i>`).join('')}</div><span class="tag muted">${s.index+1}/${p.ids.length}</span></div></div><div class="runner-wrap"><div class="kicker">${esc(p.short)} · ${esc(p.title)}</div><h1 style="margin:9px 0 6px">${esc(e.name)}</h1><div class="meta"><span class="tag">${esc(e.group)}</span><span class="tag blue">${n} × ${esc(e.reps)}</span><span class="tag orange">${esc(modeLabel(s.mode))}</span></div><div id="timerSlot"></div>${poseSvg(e.pattern)}<div class="section-head"><h3>Как выполнять</h3></div>${exerciseCues(e)}${fb?`<div class="card"><b>Этап ${s.index+1} из ${p.ids.length}</b><div class="sub">${esc(e.reps)} · ${esc(e.muscles)}</div><button class="button primary wide" style="margin-top:14px" onclick="App.markStage('${id}')">✓ Этап выполнен</button></div>`:setRows(e,id)}${fb?'':trainerHintFor(id)}<div class="actions" style="margin-top:13px"><button class="button dark" onclick="App.runnerPrev()" ${s.index===0?'disabled':''}>← Назад</button><button class="button primary" onclick="App.runnerNext()">${s.index===p.ids.length-1?'К завершению →':'Следующее →'}</button></div><div class="tip amber" style="margin-top:15px">${esc(desc)} Если есть суставная боль, необычная одышка или головокружение — прекрати подход.</div></div>`;
 updateRestTimer();
}
function editSet(exId,i,field,value){if(!state.active)return;const ex=D.exercises[exId],sets=state.active.sets[exId]||(state.active.sets[exId]=[]);let x=sets[i]||(sets[i]={});if(field==='kg')x.kg=value===''?null:clamp(numeric(value),0,500);if(field==='reps')x.reps=value===''?null:clamp(numeric(value),0,200);if(field==='rir')x.rir=value===''?null:clamp(numeric(value),0,5);save()}
function markSet(exId,i){const s=state.active;if(!s)return;const ex=D.exercises[exId];
 // Capture on-screen edits before validating to handle mobile keyboard not yet blurred.
 const inputs=[...$('runnerContent').querySelectorAll('.set-grid .input')];
 const n=effectiveSets(ex,s.mode);if(inputs.length===n*3){for(let j=0;j<n;j++){editSet(exId,j,'kg',inputs[j*3].value);editSet(exId,j,'reps',inputs[j*3+1].value);editSet(exId,j,'rir',inputs[j*3+2].value)}}
 const row=s.sets[exId]?.[i]||{};
 const wasDone=!!row.done;
 if(!wasDone){if(!numeric(row.reps)||row.reps<1){toast('Укажи число повторов (или секунд)');return}if(row.kg===undefined||row.kg===null){toast('Укажи вес, для своего веса — 0');return}}
 row.done=!wasDone;s.sets[exId][i]=row;
 if(!save()){row.done=wasDone;renderRunner();return}
 if(!wasDone){vibrate(55);startRest(ex.rest);if(state.settings.voice)speak('Подход записан. Отдыхай.')}
 else vibrate(25);
 renderRunner();
}
function markStage(exId){if(!state.active)return;const old=state.active.sets[exId];state.active.sets[exId]=[{kg:0,reps:1,rir:null,done:true}];if(!save()){if(old===undefined)delete state.active.sets[exId];else state.active.sets[exId]=old;return}vibrate();runnerNext()}
function runnerPrev(){if(state.active&&state.active.index>0){state.active.index--;save();renderRunner()}}
function runnerNext(){if(!state.active)return;const s=state.active,p=D.plans[s.plan],id=p.ids[s.index],e=D.exercises[id];const n=s.sets[id]?.filter(x=>x.done).length||0;
 if(n===0&&!confirm(`Для «${e.name}» нет выполненных подходов. Пропустить этот этап?`))return;
 if(s.index<p.ids.length-1){s.index++;save();renderRunner();return}
 renderFinish();
}
function startRest(seconds){if(!state.active||!seconds)return;state.active.restUntil=Date.now()+seconds*1000;save();clearInterval(timerHandle);timerHandle=setInterval(updateRestTimer,250)}
function skipRest(){if(!state.active)return;state.active.restUntil=null;save();clearInterval(timerHandle);timerHandle=0;updateRestTimer()}
function updateRestTimer(){const t=$('timerSlot'),s=state.active;if(!t||!s)return;
 if(!s.restUntil){t.innerHTML='';if(timerHandle){clearInterval(timerHandle);timerHandle=0}return}
 const left=Math.max(0,Math.ceil((s.restUntil-Date.now())/1000));
 if(left===0){s.restUntil=null;save();clearInterval(timerHandle);timerHandle=0;t.innerHTML=`<div class="timer-strip"><strong class="lime">✓</strong><div class="grow"><b>Отдых окончен</b><div class="sub">Можно переходить к следующему подходу</div></div></div>`;vibrate(160);speak('Отдых окончен. Готов к следующему подходу.');return}
 const clock=`${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`;
 t.innerHTML=`<div class="timer-strip"><strong>${clock}</strong><div class="grow"><b>Отдых</b><div class="sub">Восстанови дыхание. Можно пропустить.</div></div><button class="button icon" onclick="App.skipRest()">Готов</button></div>`;
 if(!timerHandle)timerHandle=setInterval(updateRestTimer,250);
}
function renderFinish(){const s=state.active;if(!s)return;const p=D.plans[s.plan],num=Object.values(s.sets).flat().filter(x=>x.done).length;
 $('runnerContent').innerHTML=`<div class="runner-header"><div class="spaced"><button class="button icon" onclick="App.renderRunner()">← Упражнения</button><span class="tag">Финиш</span></div></div><div class="runner-wrap"><div class="hero"><span class="pill">ТРЕНИРОВКА ЗАВЕРШАЕТСЯ</span><h1>Хорошая работа.</h1><p>${esc(p.title)} · выполнено этапов/подходов: ${num}</p></div><div class="card"><h3>Насколько тяжёлой была тренировка?</h3><div class="filter-scroll">${[1,2,3,4,5].map(i=>`<button class="filter-chip ${feedbackRating===i?'active':''}" onclick="App.setRating(${i})">${i} ${['','Легко','Норм','Умеренно','Тяжело','Очень'][i]}</button>`).join('')}</div><div class="field-box"><label class="field" for="finishedPain">Боль во время/после</label><select id="finishedPain"><option value="none">Не было</option><option value="shoulder">Плечо</option><option value="back">Спина / поясница</option><option value="knee">Колено</option><option value="ankle">Голеностоп</option><option value="other">Другая</option></select></div><div class="field-box"><label class="field" for="finishedNote">Что заметил? (необязательно)</label><textarea id="finishedNote" placeholder="Например: жим комфортно, ноги тяжёлые, техника хорошая"></textarea></div><button class="button primary wide" onclick="App.finishWorkout()">✓ Сохранить тренировку</button></div><div class="tip">Рейтинг и отметки боли учитываются в будущих подсказках. При травме приложение не может заменить врача или очного тренера.</div></div>`;
}
function setRating(r){feedbackRating=r;const pain=$('finishedPain')?.value||'none',note=$('finishedNote')?.value||'';renderFinish();if($('finishedPain'))$('finishedPain').value=pain;if($('finishedNote'))$('finishedNote').value=note}
function finishWorkout(){const s=state.active;if(!s)return;const count=Object.values(s.sets).flat().filter(x=>x.done).length;
 if(!count&&!confirm('Не отмечено ни одного подхода. Сохранить тренировку без подходов?'))return;
 const record={...s,rating:feedbackRating,pain:$('finishedPain')?.value||'none',note:String($('finishedNote')?.value||'').slice(0,500),finishedAt:Date.now()};delete record.restUntil;
 state.history.push(record);state.active=null;if(!save()){state.history.pop();state.active=s;toast('Не удалось сохранить тренировку. Освободи место и повтори.');return}vibrate(180);speak('Тренировка завершена. Отличная работа.');hideRunner();toast('Тренировка сохранена в журнале');
}
function trendData(metric='weight'){return state.body.filter(x=>numeric(x[metric])>0).sort((a,b)=>a.date.localeCompare(b.date)).slice(-30)}
function graph(metric){const data=trendData(metric),label=metric==='weight'?'Вес, кг':'Талия, см';if(data.length<2)return `<div class="chart-empty">Добавь минимум два измерения, чтобы увидеть динамику.</div>`;
 const vals=data.map(x=>numeric(x[metric])),min=Math.min(...vals),max=Math.max(...vals),gap=Math.max(1,Math.ceil((max-min)*10)/10),lo=min-gap*.25,hi=max+gap*.25;
 const x=i=>Math.round(35+i*(560/(data.length-1))),y=v=>Math.round(176-(v-lo)/(hi-lo)*133);
 const poly=data.map((d,i)=>`${x(i)},${y(vals[i])}`).join(' '),fill=`35,190 ${poly} 595,190`;
 return `<svg viewBox="0 0 630 226" role="img" aria-label="${label}, изменение по датам" style="display:block;width:100%;height:auto"><defs><linearGradient id="gradGraph" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8fb68" stop-opacity=".23"/><stop offset="1" stop-color="#b8fb68" stop-opacity="0"/></linearGradient></defs><rect width="630" height="226" rx="17" fill="#111d25"/>${[45,90,135,180].map(yy=>`<line x1="35" x2="595" y1="${yy}" y2="${yy}" stroke="#2c4145" stroke-dasharray="3 6"/>`).join('')}<polygon points="${fill}" fill="url(#gradGraph)"/><polyline points="${poly}" fill="none" stroke="#b8fb68" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>${data.map((d,i)=>`<circle cx="${x(i)}" cy="${y(vals[i])}" r="3.3" fill="#e4ffcb"/>`).join('')}<text x="33" y="24" fill="#dae6df" font-size="13">${label}</text><text x="35" y="211" fill="#9ab2b2" font-size="12">${data[0].date.slice(5).replace('-','.')}</text><text x="595" y="211" text-anchor="end" fill="#9ab2b2" font-size="12">${data.at(-1).date.slice(5).replace('-','.')}</text><text x="595" y="24" text-anchor="end" fill="#b8fb68" font-size="19" font-weight="800">${fmt(vals.at(-1))}</text></svg>`;
}
function bodyAnalysis(){const dat=trendData();if(dat.length<2)return 'Набираем исходные измерения. Взвешивайся утром до завтрака в похожих условиях.';
 const a=dat.at(-1),b=dat[0],days=Math.max(1,(new Date(a.date)-new Date(b.date))/86400000),perWeek=(b.weight-a.weight)*7/days;
 if(days<14)return 'Пока данных меньше 14 дней. Не меняй питание по нескольким взвешиваниям.';
 if(perWeek>0.85)return `За период вес снижается примерно на ${fmt(perWeek)} кг/нед. Это может ухудшить восстановление. Обрати внимание на сон, голод и силу.`;
 if(perWeek>=0.3)return `Средний темп ~${fmt(perWeek)} кг/нед. При нормальной энергии оставь калорийность пока без изменений.`;
 if(perWeek<0.2)return `Темп ~${fmt(perWeek)} кг/нед. Проверь учёт питания и ходьбу; корректируй калории только после устойчивого плато.`;
 return `Темп ~${fmt(perWeek)} кг/нед. Оцени ещё несколько утренних измерений.`;
}
function renderProgress(){
 const weight=currentWeight(),waist=latestWaist(),done=state.history.length,diff=state.profile.startWeight-weight;
 $('main').innerHTML=`${header('Твоя форма','НЕ ДОГАДКИ · ИЗМЕРЕНИЯ · ДИНАМИКА')}<div class="grid2"><div class="metric"><small>Вес сейчас</small><div class="num">${fmt(weight)}<span class="unit">кг</span></div><b>${diff>=0?'−':''}${fmt(Math.abs(diff))} кг от старта</b></div><div class="metric"><small>Талия сейчас</small><div class="num">${waist?fmt(waist):'—'}<span class="unit">см</span></div><b>Замер в одинаковых условиях</b></div><div class="metric"><small>Тренировки</small><div class="num">${done}</div><b>Сохранено за всё время</b></div><div class="metric"><small>Средняя нагрузка</small><div class="num">${done?fmt(state.history.reduce((n,h)=>n+Object.values(h.sets||{}).flat().filter(x=>x.done).length,0)/done):'—'}</div><b>Подходов за тренировку</b></div></div><div class="section-head"><h3>Добавить измерение</h3><span class="muted small">лучше утром</span></div><div class="card"><div class="form-grid"><div class="field-box"><label class="field" for="bmDate">Дата</label><input class="input" id="bmDate" type="date" value="${dateKey()}"></div><div class="field-box"><label class="field" for="bmWeight">Вес, кг</label><input class="input" id="bmWeight" type="number" min="35" max="250" step="0.1" placeholder="${fmt(weight)}"></div><div class="field-box"><label class="field" for="bmWaist">Талия, см</label><input class="input" id="bmWaist" type="number" min="40" max="200" step="0.1" placeholder="например 92"></div></div><button class="button primary wide" style="margin-top:9px" onclick="App.addMeasurement()">Записать измерение</button></div><div class="section-head"><h3>График изменений</h3></div><div class="filter-scroll"><button class="filter-chip ${progressMetric==='weight'?'active':''}" onclick="App.switchMetric('weight')">Вес</button><button class="filter-chip ${progressMetric==='waist'?'active':''}" onclick="App.switchMetric('waist')">Талия</button></div><div class="card">${graph(progressMetric)}</div><div class="tip">${esc(bodyAnalysis())}</div><div class="section-head"><h3>Фото прогресса</h3><span class="muted small">только на устройстве</span></div><div class="card"><p class="muted small">Фото хранятся локально, не загружаются в облако. До 10 снимков. Снимай при одинаковом освещении и ракурсе.</p><input type="file" id="photoFile" accept="image/*" style="display:none" onchange="App.addPhoto(this.files)"><button class="button dark" onclick="document.getElementById('photoFile').click()">＋ Добавить фото</button>${state.photos.length?`<div class="photo-grid" style="margin-top:13px">${state.photos.slice().reverse().map(x=>`<div class="photo-item"><img src="${x.data}" alt="Фото прогресса ${esc(x.date)}"><b>${esc(x.date)}</b><button class="button icon" style="width:100%" onclick="App.deletePhoto('${x.id}')">Удалить</button></div>`).join('')}</div>`:''}</div><div class="section-head"><h3>Последние тренировки</h3></div>${state.history.length?state.history.slice().reverse().slice(0,8).map(h=>{const p=D.plans[h.plan],num=Object.values(h.sets||{}).flat().filter(x=>x.done).length;return `<div class="list-item"><div class="spaced"><div><b>${esc(p?.title||h.plan)}</b><div class="sub">${esc(h.date)} · ${num} подходов · сложность ${h.rating}/5</div></div><span class="tag ${h.pain==='none'?'':'orange'}">${h.pain==='none'?'✓ Без боли':'Боль'}</span></div></div>`}).join(''):`<div class="card muted small">После первой тренировки здесь появится журнал.</div>`}`;
}
function addMeasurement(){const date=$('bmDate')?.value||dateKey(),weight=numeric($('bmWeight')?.value),waist=numeric($('bmWaist')?.value),valid=/^\d{4}-\d{2}-\d{2}$/.test(date)&&date<='2100-01-01';
 if(!valid||weight<35||weight>250){toast('Укажи дату и реалистичный вес от 35 до 250 кг');return}if(waist&&(waist<40||waist>200)){toast('Проверь размер талии');return}
 const oldBody=state.body.slice(),old=state.body.findIndex(x=>x.date===date);const v={date,weight:Math.round(weight*10)/10,waist:waist?Math.round(waist*10)/10:null};if(old>=0)state.body[old]=v;else state.body.push(v);state.body.sort((a,b)=>a.date.localeCompare(b.date));if(!save()){state.body=oldBody;return}vibrate();renderProgress();toast('Измерение сохранено')}
function switchMetric(v){progressMetric=v;renderProgress()}
function addPhoto(files){const file=files?.[0];if(!file)return;if(!file.type.startsWith('image/')){toast('Выбери фотографию');return}if(file.size>15*1024*1024){toast('Фото больше 15 МБ. Выбери другое.');return}
 const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const max=580,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*scale);c.height=Math.round(img.naturalHeight*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);const data=c.toDataURL('image/jpeg',.65);
   const previous=state.photos.slice();state.photos.push({id:Date.now().toString(36),date:dateKey(),data});if(state.photos.length>10)state.photos.shift();if(save()){toast('Фото добавлено на устройство');renderProgress()}else state.photos=previous
 };img.onerror=()=>toast('Не удалось прочитать фото');img.src=reader.result};reader.onerror=()=>toast('Не удалось открыть фотографию');reader.readAsDataURL(file)}
function deletePhoto(id){if(!confirm('Удалить это фото из приложения?'))return;state.photos=state.photos.filter(x=>x.id!==id);save();renderProgress()}
function selectedFoodDate(day){return plusDays(weekStart(),(day+6)%7)}
function renderFood(){
 const today=dow(),day=foodDay,meal=D.meals.find(x=>x.day===day),date=selectedFoodDate(day),week=weekStart();
 let groceries=D.groceries.flatMap(g=>g.items.map(([name,amount])=>({cat:g.cat,name,amount,id:`${g.cat}:${name}`})));
 const checkedMeals=state.mealChecks[date]||{},gcheck=state.groceryChecks[week]||{};
 $('main').innerHTML=`${header('Рацион на неделю','ПИТАНИЕ БЕЗ СЛОЖНЫХ СХЕМ')}<div class="card soft"><div class="spaced"><div><b>${state.profile.calories} ккал</b><div class="sub">Стартовый ориентир · белок ~${state.profile.protein} г/сутки</div></div><span class="tag">Кузбасс</span></div><div class="sub" style="margin-top:9px">Ниже — список продуктов и порций, а не подтверждённый подсчёт калорий каждого дня. Способ приготовления, масло, марки продуктов и точный вес готового блюда меняют калорийность.</div></div><div class="filter-scroll"><button class="filter-chip ${foodTab==='meals'?'active':''}" onclick="App.foodTab('meals')">Меню по дням</button><button class="filter-chip ${foodTab==='groceries'?'active':''}" onclick="App.foodTab('groceries')">Закупка на неделю</button></div>${foodTab==='meals'?`<div class="weekline">${[1,2,3,4,5,6,0].map(d=>`<button class="wday ${foodDay===d?'today':''} ${d===today?'':' '}" onclick="App.foodDay(${d})"><strong>${D.days[d]}</strong><small>${selectedFoodDate(d).slice(8)}</small></button>`).join('')}</div><div class="section-head"><h3>${D.daysLong[day]} · ${date.slice(8)}.${date.slice(5,7)}</h3><span class="muted small">4 приёма пищи</span></div><div class="card">${meal.items.map((x,i)=>`<label class="row meal" style="cursor:pointer"><input type="checkbox" ${checkedMeals[i]?'checked':''} onchange="App.toggleMeal('${date}',${i},this.checked)" style="width:19px;height:19px;accent-color:var(--lime)"><div class="grow"><div class="meal-time">${['07:30 · ЗАВТРАК','12:30 · ОБЕД','16:30 · ПЕРЕКУС','20:15 · УЖИН'][i]}</div><div class="meal-text">${esc(x)}</div></div></label>`).join('')}</div><div class="tip">В дни тренировок перекус за 1,5–2 часа до занятия. При выраженном голоде скорректируй порции — не пытайся «наказывать» себя за лишнюю еду.</div>`:
 `<div class="section-head"><h3>Список на 7 дней</h3><span class="muted small">С ${esc(week)}</span></div><div class="card"><div class="spaced"><b>Проверяй покупки по отделам</b><span class="tag">${Object.values(gcheck).filter(Boolean).length}/${groceries.length}</span></div><div class="progressbar"><div style="width:${100*Object.values(gcheck).filter(Boolean).length/groceries.length}%"></div></div><button class="button icon" onclick="App.resetGroceries()" style="margin-top:6px">Сбросить галочки</button></div>${D.groceries.map(g=>`<div class="card"><b>${esc(g.cat)}</b><div class="checklist">${g.items.map(([name,amount])=>{const id=`${g.cat}:${name}`;return `<label class="${gcheck[id]?'done':''}"><input type="checkbox" ${gcheck[id]?'checked':''} onchange="App.toggleGrocery('${esc(id)}',this.checked)"><span class="grow">${esc(name)}</span><b>${esc(amount)}</b></label>`}).join('')}</div></div>`).join('')}<div class="tip amber">Вес овощей, салатов и ягод в исходном меню указан не полностью — здесь нет выдуманных граммовок. Проверь остатки дома перед покупкой.</div>`}`;
}
function foodDayPick(v){foodDay=v;renderFood()}
function foodTabPick(v){foodTab=v;renderFood()}
function toggleMeal(date,i,v){state.mealChecks[date]||={};state.mealChecks[date][i]=v;save()}
function toggleGrocery(id,v){const week=weekStart();state.groceryChecks[week]||={};state.groceryChecks[week][id]=v;save();renderFood()}
function resetGroceries(){if(confirm('Снять все отметки в текущем списке покупок?')){state.groceryChecks[weekStart()]={};save();renderFood()}}
function diagnosticText(){
 const key='bodydream_diagnostic_probe';let storage='ОК';
 try{localStorage.setItem(key,'1');if(localStorage.getItem(key)!=='1')throw Error('read error');localStorage.removeItem(key)}catch(e){storage='Недоступно: '+String(e.message||e).slice(0,100)}
 const bridge=!!window.Android?.exportData;
 const rows=[
  'BodyDream Coach 4.2 / Redmi Note 13 Pro',
  'Режим: '+(bridge?'Android APK / WebView':'браузерная демоверсия'),
  'Сохранение данных: '+storage,
  'Часовой пояс меню: '+ZONE,
  'Сегодня (Кузбасс): '+dateKey(),
  'Ширина экрана (CSS): '+window.innerWidth+' px',
  'Тренировок: '+state.history.length,
  'Измерений: '+state.body.length,
  'Фото: '+state.photos.length,
  'Черновик тренировки: '+(state.active?'есть':'нет'),
  'User-Agent: '+navigator.userAgent.slice(0,180),
  'Доступ в сеть приложению не требуется. Отправка данных не производится.'
 ];
 return rows.join('\n');
}
function renderDiagnostics(){
 const report=diagnosticText();
 $('main').innerHTML=`${header('Проверка телефона','ДИАГНОСТИКА · НИКУДА НЕ ОТПРАВЛЯЕТСЯ')}<div class="card"><p class="sub">Эта проверка помогает при проблемах с сохранением, интерфейсом и установкой. Здесь нет паролей и твоих фотографий. Отчёт можно выделить и скопировать вручную.</p><label class="field" for="diagnosticReport">Отчёт о работе приложения</label><textarea class="input" id="diagnosticReport" rows="12" readonly style="min-height:260px;user-select:text">${esc(report)}</textarea><div class="actions"><button class="button primary" onclick="App.go('diagnostics')">↻ Проверить ещё раз</button><button class="button dark" onclick="document.getElementById('diagnosticReport').select()">Выделить отчёт</button></div></div><div class="tip">Если будут ошибки на Redmi, сделай скриншот этого экрана и сообщи, при каком действии возникла проблема.</div>`;
}

function renderSettings(){const p=state.profile,s=state.settings;
 $('main').innerHTML=`${header('Настройки и данные','ПОД ТЕБЯ · ТОЛЬКО НА ТЕЛЕФОНЕ')}<div class="card"><h3>Твой профиль</h3><div class="form-grid" style="margin-top:14px"><div class="field-box"><label class="field" for="pfName">Имя</label><input id="pfName" class="input" value="${esc(p.name)}" maxlength="40"></div><div class="field-box"><label class="field" for="pfAge">Возраст</label><input id="pfAge" class="input" type="number" min="18" max="100" value="${p.age}"></div><div class="field-box"><label class="field" for="pfHeight">Рост, см</label><input id="pfHeight" class="input" type="number" min="120" max="230" value="${p.height}"></div><div class="field-box"><label class="field" for="pfStart">Старт, кг</label><input id="pfStart" class="input" type="number" min="35" max="250" step=".1" value="${p.startWeight}"></div><div class="field-box"><label class="field" for="pfTarget">Цель, кг</label><input id="pfTarget" class="input" type="number" min="35" max="250" step=".1" value="${p.targetWeight}"></div><div class="field-box"><label class="field" for="pfCals">Ккал/сутки</label><input id="pfCals" class="input" type="number" min="1200" max="5000" value="${p.calories}"></div><div class="field-box"><label class="field" for="pfProtein">Белок, г</label><input id="pfProtein" class="input" type="number" min="40" max="280" value="${p.protein}"></div></div><button class="button primary wide" onclick="App.saveProfile()">Сохранить профиль</button></div><div class="card"><h3>Тренировка и удобство</h3><div class="row" style="margin:15px 0"><div class="grow"><b>Вибрация</b><div class="sub">Подход завершён, отдых окончен</div></div><input type="checkbox" ${s.vibrate?'checked':''} onchange="App.toggleSetting('vibrate',this.checked)" style="width:22px;height:22px;accent-color:var(--lime)"></div><div class="divider"></div><div class="row" style="margin:15px 0"><div class="grow"><b>Голосовые подсказки</b><div class="sub">Если на телефоне есть русский голос TTS</div></div><input type="checkbox" ${s.voice?'checked':''} onchange="App.toggleSetting('voice',this.checked)" style="width:22px;height:22px;accent-color:var(--lime)"></div><div class="divider"></div><div class="row" style="margin:15px 0"><div class="grow"><b>Футбол по средам</b><div class="sub">Необязательно. Получится 3 футбольных дня (вт/ср/вс) и 3 зала. Повышенная нагрузка — следи за восстановлением.</div></div><input type="checkbox" ${s.footballWednesday?'checked':''} onchange="App.toggleSetting('footballWednesday',this.checked)" style="width:22px;height:22px;accent-color:var(--lime)"></div></div><div class="card soft"><h3>Резервная копия</h3><div class="sub" style="margin:7px 0 12px">Вес, тренировки, фото, питание и настройки сохраняются локально. Чтобы не потерять их при переустановке, скачай JSON-файл. Отправка в облако не происходит.</div><div class="actions"><button class="button primary" onclick="App.exportBackup()">↓ Сохранить JSON</button><button class="button dark" onclick="App.importBackup()">↑ Восстановить</button></div></div>${state.active?`<div class="card warn"><b>Незавершённая тренировка</b><div class="sub">${esc(D.plans[state.active.plan]?.title)}. Черновик хранится до завершения или удаления.</div><div class="actions"><button class="button primary" onclick="App.resumeWorkout()">Продолжить</button><button class="button danger" onclick="App.discardWorkout()">Удалить черновик</button></div></div>`:''}<div class="card"><h3>Проверка на Redmi</h3><div class="sub">При проблемах с установкой, сохранением или отображением можно посмотреть локальный отчёт без отправки данных.</div><button class="button dark wide" style="margin-top:12px" onclick="App.go('diagnostics')">Проверить приложение →</button></div><div class="card"><h3>Как работает персональный тренер</h3><div class="sub" style="margin-top:8px">Это автономные рекомендации по правилам (сон, боль, количество подходов, повторения и RIR). Никакой облачной нейросети и автоматического распознавания техники камерой здесь нет. Форма и питание оцениваются по твоим записям. При медицинских ограничениях проконсультируйся с профильным специалистом.</div><div class="divider"></div><div class="small muted">BodyDream Coach 4.2 • Redmi Note 13 Pro 4G/5G • HyperOS/MIUI • Кузбасс UTC+7 • Офлайн</div></div>`;
}
function saveProfile(){const fields={name:String($('pfName').value).trim().slice(0,40),age:numeric($('pfAge').value),height:numeric($('pfHeight').value),startWeight:numeric($('pfStart').value),targetWeight:numeric($('pfTarget').value),calories:numeric($('pfCals').value),protein:numeric($('pfProtein').value)};
 if(!fields.name||fields.age<18||fields.age>100||fields.height<120||fields.height>230||fields.startWeight<35||fields.startWeight>250||fields.targetWeight<35||fields.targetWeight>250||fields.calories<1200||fields.calories>5000||fields.protein<40||fields.protein>280){toast('Проверь значения профиля');return}
 const oldProfile={...state.profile};Object.assign(state.profile,fields);if(!save()){state.profile=oldProfile;return}renderSettings();toast('Профиль сохранён')}
function toggleSetting(k,v){if(!(k in state.settings))return;state.settings[k]=!!v;save();renderSettings();if(k==='footballWednesday'&&v)toast('Добавлен футбол в среду. Восстановление важнее графика.')}
function exportBackup(){const payload=JSON.stringify({...state,exportedAt:new Date().toISOString()});try{if(window.Android?.exportData){Android.exportData(payload);return}}
 catch(e){}try{const blob=new Blob([payload],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`BodyDream-backup-${dateKey()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),6000);toast('Резервная копия сохранена')}catch(e){toast('Не удалось выгрузить файл. Попробуй в Android-приложении.')}
}
function importBackup(){try{if(window.Android?.importData){Android.importData();return}}catch(e){}$('backupImport').click()}
function readBackupFile(files){if(!files?.length)return;const file=files[0];if(file.size>5e6){toast('Файл больше 5 МБ. Удалите лишние фотографии из резервной копии.');return}
 const reader=new FileReader();reader.onload=()=>receiveNativeBackup(reader.result);reader.onerror=()=>toast('Ошибка чтения файла');reader.readAsText(file,'utf-8')}
function receiveNativeBackup(json){try{if(String(json).length>5e6)throw Error('too large');let n=JSON.parse(json);if(n&&n.version!==4&&n.profile&&n.logs)n=migrateOld(n);if(!n||n.version!==4||!n.profile||!Array.isArray(n.history)||!Array.isArray(n.body)||!Array.isArray(n.photos))throw Error('bad format');if(!confirm('Восстановление заменит все текущие данные. Продолжить?'))return;
 const old=state;state=normalizeState(n);
 if(!save()){state=old;throw Error('storage full')}toast('Данные восстановлены');go('home');
 }catch(e){toast('Не удалось восстановить: проверь резервную копию BodyDream 3.0/4.0.')}}
window.BodyDreamReceiveBackup=receiveNativeBackup;
function init(){
  // Persist migrated data once, without deleting the source 3.0 key.
  save();
  window.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.active&&$('runner')&&!$('runner').hidden)updateRestTimer()});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();appBack()}});
  window.addEventListener('beforeunload',save);
  go('home');
  if(state.active&&state.active.restUntil&&state.active.restUntil<Date.now()){state.active.restUntil=null;save()}
}
window.App={go,openPlan,showDay,saveCheckin,startWorkout,resumeWorkout,pauseWorkout,discardWorkout,renderRunner,editSet,markSet,markStage,runnerPrev,runnerNext,skipRest,setRating,finishWorkout,setTechSearch,setTechFilter,loadSelfVideo,addMeasurement,switchMetric,addPhoto,deletePhoto,foodDay:foodDayPick,foodTab:foodTabPick,toggleMeal,toggleGrocery,resetGroceries,saveProfile,toggleSetting,exportBackup,importBackup,readBackupFile};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
