const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BODYDREAM_CHROME_PATH?{executablePath:process.env.BODYDREAM_CHROME_PATH}:{})});
 const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:8765');await page.evaluate(()=>App.go('load'));
 await page.getByRole('heading',{name:'Нагрузка и журнал',exact:true}).waitFor();
 assert.match(await page.locator('.load-hero').innerText(),/0/);
 await page.evaluate(()=>{
  const state=JSON.parse(localStorage.getItem('bodydream_elite_v4'));
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Novokuznetsk',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const date=n=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
  const row={kg:40,reps:10,rir:2,done:true};
  state.history=[-3,-1].map(n=>({id:'old'+n,date:date(n),plan:'push',mode:'normal',sets:{bench:[row,row,row]},pain:'none',rating:3}));
  state.active=null;state.readiness={[today]:{sleep:8,energy:4,soreness:1,stress:1,pain:'none'}};
  BodyDreamReceiveBackup(JSON.stringify(state));App.openPlan('push');
 });
 await page.getByRole('button',{name:'Короткая · 3 упражнения',exact:false}).click();
 assert.match(await page.locator('.runner-header').innerText(),/1\/3/);
 assert.match(await page.locator('.previous-card').innerText(),/40 кг × 10/);
 assert.match(await page.locator('#runnerContent').innerText(),/Возможен небольшой шаг/);
 await page.getByRole('button',{name:'Подставить прошлые веса и повторы',exact:true}).click();
 assert.equal(await page.getByRole('spinbutton',{name:'Вес подхода 1',exact:true}).inputValue(),'40');
 assert.equal(await page.getByRole('spinbutton',{name:'RIR подхода 1',exact:true}).inputValue(),'');
 await page.locator('.swap-panel summary').click();
 await page.getByRole('button',{name:'Жим в грудном тренажёре',exact:true}).click();
 assert.equal(await page.locator('#runnerContent h1').innerText(),'Жим в грудном тренажёре');
 assert.equal(await page.getByRole('spinbutton',{name:'Вес подхода 1',exact:true}).inputValue(),'');
 assert.match(await page.locator('.previous-card').innerText(),/пока нет записей/);
 for(let i=1;i<=3;i++){
  await page.getByRole('spinbutton',{name:'Вес подхода '+i,exact:true}).fill('15');
  await page.getByRole('spinbutton',{name:'Повторения подхода '+i,exact:true}).fill('12');
  await page.getByRole('spinbutton',{name:'RIR подхода '+i,exact:true}).fill('2');
  await page.getByRole('button',{name:'Завершить подход '+i,exact:true}).click();
 }
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('bodydream_elite_v4')).active.restUntil);
 await page.getByRole('button',{name:'+30 с',exact:true}).click();
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('bodydream_elite_v4')).active.restUntil);
 assert.equal(after-before,30000);
 await page.evaluate(()=>App.chooseAlternative('bench'));
 assert.equal(await page.locator('#runnerContent h1').innerText(),'Жим в грудном тренажёре','finished sets cannot disappear through a swap');
 await page.getByRole('button',{name:'← Пауза',exact:true}).click();await page.reload();
 await page.evaluate(()=>App.resumeWorkout());
 assert.equal(await page.locator('#runnerContent h1').innerText(),'Жим в грудном тренажёре');
 assert.match(await page.locator('.runner-header').innerText(),/1\/3/);
 assert.equal(await page.locator('.set-done.is-done').count(),3);
 await page.locator('.runner').evaluate(e=>e.scrollTop=0);
 await page.screenshot({path:'runner44.png',fullPage:false});
 assert.equal(await page.locator('.runner').evaluate(e=>e.scrollWidth>e.clientWidth),false);
 await page.evaluate(()=>{App.runnerNext();App.runnerNext();App.runnerNext()});
 await page.getByLabel('Что заметил? (необязательно)').fill('Тестовая запись занятия');
 await page.getByRole('button',{name:'✓ Сохранить тренировку',exact:true}).click();
 const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('bodydream_elite_v4')).history.at(-1));
 assert.equal(record.format,'express');assert.equal(record.swaps.bench,'chest_machine');assert.equal(record.sets.chest_machine.length,3);assert.equal(record.sets.bench,undefined);
 await page.evaluate(()=>App.go('load'));
 await page.locator('.history-detail summary').first().click();
 assert.match(await page.locator('.history-detail').first().innerText(),/Жим в грудном тренажёре/);
 assert.match(await page.locator('.history-detail').first().innerText(),/Тестовая запись занятия/);
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'load44.png',fullPage:false});
 // Reimport a current backup: exercise identity, format and rows must survive.
 await page.evaluate(()=>BodyDreamReceiveBackup(localStorage.getItem('bodydream_elite_v4')));
 await page.evaluate(()=>App.go('load'));
 assert.match(await page.locator('.history-detail').first().innerText(),/Короткая/);
 for(const width of [320,360,393,768]){
  await page.setViewportSize({width,height:852});
  for(const tab of ['load','plan','progress','tech']){
   await page.evaluate(tab=>App.go(tab),tab);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${tab} overflow ${width}`);
  }
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: legacy import, progression display, copy, independent variant weights, express plan, rest extension, locked completed sets, active restoration, detailed journal and 320–768px layouts.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
