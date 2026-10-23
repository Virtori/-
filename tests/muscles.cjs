const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BODYDREAM_CHROME_PATH?{executablePath:process.env.BODYDREAM_CHROME_PATH}:{})});
 const page=await browser.newPage({viewport:{width:393,height:852}}),errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});
 page.on('dialog',d=>/чеку готовности/.test(d.message())?d.dismiss():d.accept());
 await page.goto('http://127.0.0.1:8765');
 const ids=await page.evaluate(()=>Object.keys(BD_DATA.exercises));
 assert.deepEqual(await page.evaluate(()=>BD_MUSCLES.ids.sort()),[...ids].sort());
 for(const id of ids){
  await page.evaluate(id=>App.go('exercise',id),id);const map=page.locator('#main .muscle-card');
  assert.equal(await map.getAttribute('data-exercise'),id);assert.ok(await map.locator('.muscle-region.primary').count()>0,id);
  for(const w of [320,393]){await page.setViewportSize({width:w,height:852});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,id+' overflow '+w)}
 }
 const highlighted=async(id,role='primary')=>page.locator(`#main .muscle-region[data-muscle="${id}"][data-role="${role}"]`).count();
 await page.evaluate(()=>App.go('exercise','bench'));assert.ok(await highlighted('chest'));assert.ok(await highlighted('triceps','secondary'));assert.equal(await highlighted('quads'),0);
 await page.evaluate(()=>App.go('exercise','legcurl'));assert.ok(await highlighted('hamstrings'));assert.equal(await highlighted('quads'),0);
 await page.evaluate(()=>App.go('exercise','rdl'));assert.ok(await highlighted('glutes'));assert.ok(await highlighted('erectors','secondary'));
 await page.evaluate(()=>App.go('exercise','cooldown'));assert.match(await page.locator('.muscle-card').innerText(),/Растягиваемые/);
 await page.evaluate(()=>App.startWorkout('push'));
 const map=page.locator('#runnerContent .muscle-card');
 assert.match(await map.locator('.muscle-heading').innerText(),/Подход 1 из 3/);
 await map.locator('.muscle-zoom').click();assert.equal(await map.locator('.muscle-zoom').getAttribute('aria-expanded'),'true');
 await map.screenshot({path:'muscles46-bench-expanded.png'});
 await map.locator('.muscle-zoom').click();assert.equal(await map.locator('.muscle-zoom').getAttribute('aria-expanded'),'false');
 await page.getByRole('spinbutton',{name:'Вес подхода 1',exact:true}).fill('30');await page.getByRole('spinbutton',{name:'Повторения подхода 1',exact:true}).fill('8');
 await page.getByRole('button',{name:'Завершить подход 1',exact:true}).click();
 assert.match(await map.locator('.muscle-heading').innerText(),/Подход 2 из 3/);
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('bodydream_elite_v4')));assert.equal(state.active.sets.bench[0].done,true);assert.equal(state.active.sets.bench[0].kg,30);
 await page.evaluate(()=>App.pauseWorkout());await page.reload();await page.evaluate(()=>App.resumeWorkout());
 assert.match(await map.locator('.muscle-heading').innerText(),/Подход 2 из 3/);
 await page.locator('#runnerContent .muscle-card').screenshot({path:'muscles46-bench-compact.png'});
 await page.evaluate(()=>{App.runnerNext();App.runnerNext()});
 assert.equal(await map.getAttribute('data-exercise'),'press');assert.ok(await map.locator('[data-muscle="front_delts"][data-role="primary"]').count());
 await page.evaluate(()=>App.discardWorkout());await page.evaluate(()=>App.startWorkout('legs'));
 assert.equal(await map.getAttribute('data-exercise'),'legpress');assert.ok(await map.locator('[data-muscle="quads"][data-role="primary"]').count());
 await page.evaluate(()=>App.chooseAlternative('goblet'));assert.equal(await map.getAttribute('data-exercise'),'goblet');
 await page.evaluate(()=>App.runnerNext());assert.equal(await map.getAttribute('data-exercise'),'rdl');assert.ok(await map.locator('[data-muscle="hamstrings"][data-role="primary"]').count());
 await map.screenshot({path:'muscles46-rdl.png'});
 for(const w of [320,360,393,768]){
  await page.setViewportSize({width:w,height:852});assert.equal(await page.locator('.runner').evaluate(e=>e.scrollWidth>e.clientWidth),false,'runner overflow '+w);
  await map.locator('.muscle-zoom').click();assert.equal(await page.locator('.runner').evaluate(e=>e.scrollWidth>e.clientWidth),false,'expanded overflow '+w);await map.locator('.muscle-zoom').click();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 console.log('PASS: 24 muscle mappings, primary/secondary and stretch roles, in-set counter, exercise changes, substitutes, persistence, zoom and 320–768px layouts.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
