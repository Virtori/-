const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BODYDREAM_CHROME_PATH?{executablePath:process.env.BODYDREAM_CHROME_PATH}:{})});
 const page=await browser.newPage({viewport:{width:393,height:852}});const errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});
 await page.goto('http://127.0.0.1:8765');
 const ids=await page.evaluate(()=>Object.keys(BD_DATA.exercises));assert.equal(ids.length,24);
 assert.deepEqual(await page.evaluate(()=>BD_VISUALS.ids.sort()),[...ids].sort());
 const images={};
 for(const id of ids){
  await page.evaluate(id=>App.go('exercise',id),id);
  const card=page.locator('.motion-card');assert.equal(await card.getAttribute('data-exercise'),id);
  assert.equal(await card.locator('.motion-frame:not([hidden])').count(),1);
  const first=await card.locator('.motion-phase').innerText();
  await card.locator('.motion-step').nth(1).click();
  assert.notEqual(await card.locator('.motion-phase').innerText(),first);
  assert.equal(await card.getAttribute('data-phase'),'1');
  assert.equal(await card.locator('.motion-step').nth(1).getAttribute('aria-pressed'),'true');
  images[id]=await card.locator('.motion-frame').nth(1).locator('svg').innerHTML();
  for(const w of [320,393]){await page.setViewportSize({width:w,height:852});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+id+' '+w)}
 }
 for(const pair of [['curl','triceps'],['curl','legcurl'],['legpress','goblet'],['face','pulldown'],['bench','incline'],['rdl','db_rdl']])assert.notEqual(images[pair[0]],images[pair[1]],'exercise-specific geometry '+pair.join('/'));
 await page.evaluate(()=>App.go('exercise','legpress'));
 const card=page.locator('.motion-card');
 await card.locator('.motion-play').click();await page.waitForFunction(()=>document.querySelector('.motion-card').dataset.phase==='1',{timeout:4000});
 await card.locator('.motion-play').click();const frozen=await card.getAttribute('data-phase');await page.waitForTimeout(2400);assert.equal(await card.getAttribute('data-phase'),frozen);
 await page.emulateMedia({reducedMotion:'reduce'});await card.locator('.motion-play').click();assert.equal(await card.locator('.motion-play').getAttribute('aria-pressed'),'false');
 await page.emulateMedia({reducedMotion:'no-preference'});
 for(const id of ['bench','legpress','legcurl','face','goblet','triceps']){
  await page.evaluate(id=>App.go('exercise',id),id);await page.setViewportSize({width:393,height:852});
  await page.locator('.motion-card').screenshot({path:`visual45-${id}-start.png`});
  await page.locator('.motion-card .motion-step').nth(1).click();await page.locator('.motion-card').screenshot({path:`visual45-${id}-end.png`});
 }
 // Verify the same graphics in the workout runner, including a selected replacement.
 page.on('dialog',d=>d.dismiss());await page.evaluate(()=>App.startWorkout('push'));
 await page.getByRole('button',{name:'◎ Посмотреть выполнение',exact:false}).click();
 assert.equal(await page.locator('#runnerContent .runner-tech').getAttribute('open'),'');
 assert.equal(await page.locator('#runnerContent .motion-card').getAttribute('data-exercise'),'bench');
 await page.evaluate(()=>App.chooseAlternative('chest_machine'));
 await page.getByRole('button',{name:'◎ Посмотреть выполнение',exact:false}).click();
 assert.equal(await page.locator('#runnerContent .motion-card').getAttribute('data-exercise'),'chest_machine');
 await page.evaluate(()=>App.pauseWorkout());
 // Review contact sheets for every start and end diagram, using synthetic data only.
 await page.setViewportSize({width:1580,height:1000});
 await page.evaluate(ids=>{
  document.querySelector('.appbar').style.display='none';document.querySelector('.bottom-nav').style.display='none';
  const main=document.getElementById('main');main.style.cssText='max-width:none;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:15px';
  main.innerHTML=ids.map(id=>`<div><h3 style="font-size:15px">${BD_DATA.exercises[id].name}</h3>${BD_VISUALS.render(id)}</div>`).join('');
 },ids);
 await page.screenshot({path:'atlas45-start.png',fullPage:true});
 await page.locator('.motion-card .motion-step:nth-child(2)').evaluateAll(buttons=>buttons.forEach(b=>BD_VISUALS.step(b,1)));
 await page.screenshot({path:'atlas45-end.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 console.log('PASS: 24 exercise-specific diagrams, phase controls, slow playback/pause, reduced motion, runner replacements, mobile layouts and offline asset loading; full atlas captured for visual review.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
