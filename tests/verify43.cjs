const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BODYDREAM_CHROME_PATH?{executablePath:process.env.BODYDREAM_CHROME_PATH}:{})});
 const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:8765');
 await page.evaluate(()=>App.go('journey'));
 await page.getByRole('heading',{name:'Твой маршрут',exact:true}).waitFor();
 assert.match(await page.locator('.journey-hero').innerText(),/0 XP/);
 assert.equal(await page.locator('.badge-card.unlocked').count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'journey43-empty.png',fullPage:true});
 const dates=await page.evaluate(()=>{
  const t=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Novokuznetsk',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const plus=n=>{const d=new Date(t+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
  const state=JSON.parse(localStorage.getItem('bodydream_elite_v4'));
  const session=(plan,n)=>({id:plan+n,date:plus(n),plan,mode:'normal',sets:{[plan==='push'?'bench':plan==='pull'?'row':'legpress']:[{kg:30,reps:10,done:true},{kg:30,reps:10,done:true},{kg:30,reps:10,done:true}]},rating:3,pain:'none'});
  state.profile.name='Тестовый профиль';
  state.history=[session('push',-2),session('pull',-1),session('legs',0),session('legs',0),session('push',1)];
  state.body=[{date:plus(0),weight:84,waist:90},{date:plus(1),weight:83}];
  state.readiness={[t]:{sleep:8,energy:4,soreness:1,stress:1,pain:'none'}};
  BodyDreamReceiveBackup(JSON.stringify(state));return {today:t,tomorrow:plus(1)};
 });
 await page.reload();await page.evaluate(()=>App.go('journey'));
 assert.match(await page.locator('.journey-hero').innerText(),/165 XP/,'duplicates and future dates must not earn XP');
 assert.equal(await page.locator('.activity-day.trained').count(),3);
 assert.equal(await page.locator('.badge-card.unlocked').count(),2);
 assert.equal(await page.locator('.record-row').count(),3);
 await page.screenshot({path:'journey43-filled.png',fullPage:true});
 await page.evaluate(()=>App.go('home'));await page.screenshot({path:'home43.png',fullPage:true});
 for(const tab of ['plan','tech','progress','food','settings','diagnostics','journey']){
  await page.evaluate(tab=>App.go(tab),tab);
  assert.equal(await page.locator('#main').innerText().then(t=>t.length>50),true,tab);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+tab);
 }
 // Restoring a version-4 backup must retain profile and history with derived badges.
 const backup=await page.evaluate(()=>localStorage.getItem('bodydream_elite_v4'));
 await page.evaluate(data=>BodyDreamReceiveBackup(data),backup);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('bodydream_elite_v4')).profile.name),'Тестовый профиль');
 await page.evaluate(()=>App.go('journey'));
 assert.match(await page.locator('.journey-hero').innerText(),/165 XP/);
 // Finish a real session through the public app controls and reload it.
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('bodydream_elite_v4'));s.history=[];s.body=[];BodyDreamReceiveBackup(JSON.stringify(s))});
 await page.reload();await page.evaluate(()=>App.startWorkout('push'));
 for(let i=0;i<3;i++){
  await page.getByRole('spinbutton',{name:'Вес подхода '+(i+1),exact:true}).fill('20');
  await page.getByRole('spinbutton',{name:'Повторения подхода '+(i+1),exact:true}).fill('8');
  await page.getByRole('button',{name:'Завершить подход '+(i+1),exact:true}).click();
 }
 await page.evaluate(()=>App.finishWorkout());
 assert.match(await page.locator('.finish-card').innerText(),/\+50 XP/);
 assert.match(await page.locator('.finish-card').innerText(),/Первый шаг/);
 assert.match(await page.locator('.journey-hero').innerText(),/55 XP/);
 await page.screenshot({path:'finish43.png',fullPage:true});
 await page.reload();await page.evaluate(()=>App.go('journey'));
 assert.match(await page.locator('.journey-hero').innerText(),/55 XP/);
 for(const width of [320,360,768]){
  await page.setViewportSize({width,height:852});await page.evaluate(()=>App.go('journey'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: empty and seeded journey, deduplicated XP, future exclusion, badges, records, tabs, backup restoration, workout completion, persistence and 320–768px layouts; no JS errors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

