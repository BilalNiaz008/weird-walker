const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {pathToFileURL}=require('node:url');

async function canvasPoint(page,x,y){
  await page.locator('#ww-canvas').scrollIntoViewIfNeeded();
  return page.locator('#ww-canvas').evaluate((c,{x,y})=>{const r=c.getBoundingClientRect(),scale=Math.min((r.width-36)/640,(r.height-70)/360);return{x:r.x+r.width/2+(x-320)*scale,y:r.y+r.height/2+(y-170)*scale};},{x,y});
}
async function tapCanvas(page,x,y,touch=false){const p=await canvasPoint(page,x,y);touch?await page.touchscreen.tap(p.x,p.y):await page.mouse.click(p.x,p.y);}
async function dragTouch(page,a,b){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y,id:7}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x,y:b.y,id:7}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
async function placeExampleLegs(page,touch=false){await page.locator('#ww-feet').click();await tapCanvas(page,290,190,touch);await tapCanvas(page,350,190,touch);}

(async()=>{
  const browser=await chromium.launch({headless:true});
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'weird-walker-check-'));
  try {
    await seo(browser);
    await animationTiming(browser);
    for(const width of [1280,360,320]) {
      const context=await browser.newContext({offline:true,viewport:{width,height:1000},colorScheme:width===360?'dark':'light',hasTouch:width<400,reducedMotion:width===360?'reduce':'no-preference',acceptDownloads:true});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
      const canvas=page.locator('#ww-canvas'),play=page.locator('#ww-play');
      await page.waitForTimeout(100);
      await page.screenshot({path:path.join(output,`studio-${width}.png`),fullPage:true});
      await placeExampleLegs(page,width<400);
      await play.press('Enter');await page.waitForTimeout(100);
      const moving=await canvas.evaluate(c=>c.toDataURL());await page.waitForTimeout(100);
      assert.notEqual(await canvas.evaluate(c=>c.toDataURL()),moving);
      await play.click();const paused=await canvas.evaluate(c=>c.toDataURL());await page.waitForTimeout(100);
      assert.equal(await canvas.evaluate(c=>c.toDataURL()),paused);
      const downloading=page.waitForEvent('download');await page.locator('#ww-download').click();
      const download=await downloading;assert.equal(download.suggestedFilename(),'weird-walker.png');
      const bytes=fs.readFileSync(await download.path());assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.ok(bytes.length>1000);
      await page.locator('#ww-edit').click();await page.locator('#ww-clear').click();
      await play.click();assert.match(await page.locator('#ww-status').textContent(),/bigger body/);
      const b=await canvas.boundingBox();
      await page.mouse.move(b.x+b.width*.3,b.y+b.height*.35);await page.mouse.down();
      for(const [x,y] of [[.7,.35],[.7,.58],[.3,.58],[.3,.35]])await page.mouse.move(b.x+b.width*x,b.y+b.height*y,{steps:10});
      await page.mouse.up();
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('weird-walker-v1')));
      assert.equal(saved.strokes.length,1);assert.ok(saved.strokes[0].length>20);
      await page.locator('#ww-feet').click();
      const tap=async(x,y)=>{const r=await canvas.boundingBox();return width<400?page.touchscreen.tap(r.x+r.width*x,r.y+r.height*y):canvas.click({position:{x:r.width*x,y:r.height*y}});};
      await tap(.4,.5);await tap(.6,.5);
      assert.match(await page.locator('#ww-status').textContent(),/Two legs/);
      // Undo the second attachment, then complete that same pair again.
      await page.locator('#ww-undo').click();
      assert.equal(await page.locator('#ww-feet').getAttribute('aria-pressed'),'true');
      await tap(.62,.5);
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('weird-walker-v1')).feet.length),2);
      const creature=await page.evaluate(()=>localStorage.getItem('weird-walker-v1'));
      await page.reload();await page.waitForTimeout(100);
      assert.equal(await page.evaluate(()=>localStorage.getItem('weird-walker-v1')),creature);
      assert.match(await page.locator('#ww-status').textContent(),/Welcome back/);
      await page.locator('#ww-clear').click();await page.locator('#ww-undo').click();
      assert.equal(await page.evaluate(()=>localStorage.getItem('weird-walker-v1')),creature);
      await page.locator('#ww-example').click();await placeExampleLegs(page,width<400);await play.click();await page.waitForTimeout(150);
      await page.screenshot({path:path.join(output,`walking-${width}.png`),fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.evaluate(()=>localStorage.setItem('weird-walker-v1','{"strokes":[null],"feet":[]}'));
      await page.reload();await placeExampleLegs(page,width<400);await play.click();assert.equal(await play.textContent(),'Pause');
      assert.deepEqual(errors,[]);await context.close();
    }
    // Blocked analytics and missing storage must not prevent drawing and animation.
    const page=await browser.newPage({offline:true});
    await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new Error('Storage blocked');};});
    await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
    const tag=page.locator('head script[src="https://www.googletagmanager.com/gtag/js?id=G-HPRPYP1GHM"]');
    assert.equal(await tag.count(),1);assert.ok(await tag.evaluate(script=>script.async));
    const commands=await page.evaluate(()=>dataLayer.map(command=>Array.from(command)));
    assert.equal(commands.length,2);assert.equal(commands[0][0],'js');assert.ok(commands[0][1] instanceof Date);
    assert.deepEqual(commands[1],['config','G-HPRPYP1GHM']);
    await placeExampleLegs(page,false);await page.locator('#ww-play').click();assert.equal(await page.locator('#ww-play').textContent(),'Pause');
    await page.close();
    await personalityAndVideo(browser,output);
    await gifExport(browser,output);
    await facePlacement(browser,output);
    await explicitDrawing(browser,output);
    console.log('PASS: Analytics initialization with blocked network, static SEO metadata and content, sitemap, drawing, touch legs, leg undo, clear undo, validation, persistence, invalid/blocked storage, keyboard play, pause, PNG export, reduced motion, and 1280/360/320px layouts.');
    console.log('Screenshots: '+output);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

async function seo(browser){
  const context=await browser.newContext({offline:true,javaScriptEnabled:false}),page=await context.newPage();
  await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
  const canonical=await page.locator('link[rel="canonical"]').getAttribute('href');
  assert.equal(canonical,'https://www.weirdwalker.online/');
  assert.equal(await page.locator('h1').count(),1);
  assert.match(await page.locator('h1').innerText(),/draw.*creature.*walk/i);
  assert.ok(await page.locator('h1').isVisible());
  assert.ok(await page.locator('.ww-guide').isVisible());
  assert.equal(await page.locator('.ww-guide ol li').count(),3);
  await page.locator('.ww-guide summary').first().press('Enter');
  assert.ok(await page.locator('.ww-guide details').first().getAttribute('open')!==null);
  assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'),canonical);
  for(const selector of ['meta[property="og:title"]','meta[name="twitter:title"]'])assert.equal(await page.locator(selector).getAttribute('content'),await page.title());
  assert.match(await page.locator('meta[name="description"]').getAttribute('content'),/creature.*walk/i);
  assert.equal(await page.locator('meta[name="robots"][content*="noindex"]').count(),0);
  const graph=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent())['@graph'];
  const site=graph.find(item=>item['@type']==='WebSite'),app=graph.find(item=>item['@type']==='WebApplication');
  assert.equal(site.url,canonical);assert.equal(app.url,canonical);assert.equal(app.isPartOf['@id'],site['@id']);
  assert.equal(app.isAccessibleForFree,true);assert.equal(Number(app.offers.price),0);
  for(const selector of ['meta[property="og:image"]','meta[name="twitter:image"]']){
    const image=new URL(await page.locator(selector).getAttribute('content'));
    assert.equal(image.origin,new URL(canonical).origin);
    assert.ok(fs.existsSync(path.join(__dirname,image.pathname)));
    assert.equal(image.href,app.image);
  }
  const robots=fs.readFileSync(path.join(__dirname,'robots.txt'),'utf8');
  assert.match(robots,/User-agent: \*\s+Allow: \/\s/);
  assert.ok(robots.includes(`Sitemap: ${canonical}sitemap.xml`));
  const sitemap=fs.readFileSync(path.join(__dirname,'sitemap.xml'),'utf8');
  const urls=await page.evaluate(xml=>{
    const doc=new DOMParser().parseFromString(xml,'application/xml');
    if(doc.querySelector('parsererror'))throw new Error('Invalid sitemap XML');
    return Array.from(doc.getElementsByTagNameNS('http://www.sitemaps.org/schemas/sitemap/0.9','loc'),node=>node.textContent);
  },sitemap);
  assert.deepEqual(urls,[canonical]);await context.close();
}

async function animationTiming(browser){
  const page=await browser.newPage({offline:true});
  const instrumented=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace('  history=[];','  window.walkerTime=()=>time;\n  history=[];');
  await page.setContent(instrumented);
  await placeExampleLegs(page,false);
  await page.evaluate(()=>{
    let now=0,next=0;
    const pending=new Map();
    performance.now=()=>now;
    window.requestAnimationFrame=callback=>{const id=++next;pending.set(id,callback);return id;};
    window.cancelAnimationFrame=id=>pending.delete(id);
    window.advanceWalkerFrame=milliseconds=>{
      now+=milliseconds;
      const callbacks=Array.from(pending.values());pending.clear();
      callbacks.forEach(callback=>callback(now));
    };
  });
  const play=page.locator('#ww-play');
  for(const fps of [120,60,30,15,10]){
    await play.dispatchEvent('click');
    await page.evaluate(fps=>{for(let i=0;i<fps;i++)advanceWalkerFrame(1000/fps);},fps);
    assert.ok(Math.abs(await page.evaluate(()=>walkerTime())-1)<1e-9,`One second of walking at ${fps} fps`);
    await play.dispatchEvent('click');
    await page.evaluate(()=>advanceWalkerFrame(5000));
    assert.ok(Math.abs(await page.evaluate(()=>walkerTime())-1)<1e-9,'Pause freezes animation time');
    await play.dispatchEvent('click');
    await page.evaluate(()=>advanceWalkerFrame(100));
    assert.ok(Math.abs(await page.evaluate(()=>walkerTime())-1.1)<1e-9,'Resume excludes paused time');
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));advanceWalkerFrame(5000);delete document.hidden;});
    assert.ok(Math.abs(await page.evaluate(()=>walkerTime())-1.1)<1e-9,'Hidden tabs freeze animation time');
    await play.dispatchEvent('click');
    await page.evaluate(()=>advanceWalkerFrame(100));
    assert.ok(Math.abs(await page.evaluate(()=>walkerTime())-1.2)<1e-9,'Returning from a hidden tab excludes hidden time');
    await page.locator('#ww-edit').dispatchEvent('click');
  }
  await page.close();
  console.log('PASS: equal walking speed at 120/60/30/15/10 fps, pause/resume, and hidden-tab timing.');
}

async function personalityAndVideo(browser,output){
  const url=pathToFileURL(path.join(__dirname,'index.html')).href;
  const page=await browser.newPage({offline:true,acceptDownloads:true,viewport:{width:1100,height:1050}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
  const shape=(w,h)=>({strokes:[[{x:200,y:40},{x:200+w,y:40},{x:200+w,y:40+h},{x:200,y:40+h},{x:200,y:40}]],feet:[]});
  for(const [w,h,gait] of [[100,200,'Wobble'],[250,100,'Shuffle'],[100,100,'Bounce'],[100,135,'Bounce'],[100,75,'Bounce'],[100,136,'Wobble'],[100,74,'Shuffle']]){
    await page.evaluate(data=>localStorage.setItem('weird-walker-v1',JSON.stringify(data)),shape(w,h));await page.reload();
    assert.equal(await page.locator('#ww-gait').textContent(),`Automatic: ${gait}`);
  }
  await page.locator('#ww-name').fill('<b>Noodle</b>');await page.locator('#ww-walk').selectOption('wobble');
  await page.locator('#ww-clear').click();await page.locator('#ww-undo').click();
  assert.equal(await page.locator('#ww-name').inputValue(),'<b>Noodle</b>');assert.equal(await page.locator('#ww-gait').textContent(),'Wobble');
  await page.reload();assert.equal(await page.locator('#ww-name').inputValue(),'<b>Noodle</b>');
  await page.locator('#ww-walk').selectOption('auto');await page.locator('#ww-example').click();
  assert.equal(await page.locator('#ww-gait').textContent(),'Automatic: Shuffle');
  await page.locator('#ww-undo').click();assert.equal(await page.locator('#ww-gait').textContent(),'Automatic: Shuffle');
  await page.locator('#ww-example').click();await page.locator('#ww-name').fill('Noodle');await placeExampleLegs(page,false);
  await page.locator('#ww-face').click();await page.locator('#ww-face-centre').click();
  await page.locator('#ww-fill').click();await tapCanvas(page,320,147,false);
  await page.locator('#ww-play').click();await page.locator('#ww-hello').press('Enter');
  assert.match(await page.locator('#ww-status').textContent(),/Noodle says hello/);
  await page.locator('#ww-play').click();const paused=await page.locator('#ww-canvas').evaluate(c=>c.toDataURL());
  await page.locator('#ww-canvas').click({position:{x:25,y:40}});assert.equal(await page.locator('#ww-canvas').evaluate(c=>c.toDataURL()),paused);
  await page.locator('#ww-video').click();assert.equal(await page.locator('#ww-name').isDisabled(),true);
  await page.locator('#ww-cancel').click();assert.equal(await page.locator('#ww-name').isDisabled(),false);
  assert.equal(await page.locator('#ww-play').textContent(),'Keep walking');
  assert.equal(await page.locator('#ww-canvas').evaluate(c=>c.toDataURL()),paused);
  await page.locator('#ww-video').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await page.locator('#ww-export').isVisible(),false);assert.match(await page.locator('#ww-status').textContent(),/hidden/);
  await page.evaluate(()=>{delete document.hidden;});
  for(const format of ['mp4','webm']){
    if(format==='webm')await page.evaluate(()=>{const Original=MediaRecorder;window.MediaRecorder=class extends Original {constructor(stream,options){if(options.mimeType.startsWith('video/mp4'))throw new Error('MP4 unavailable');super(stream,options);}};});
    await page.setViewportSize({width:format==='mp4'?900:360,height:1050});
    const saved=await page.evaluate(()=>localStorage.getItem('weird-walker-v1'));
    const downloadPromise=page.waitForEvent('download',{timeout:15000});await page.locator('#ww-video').click();
    const download=await downloadPromise;assert.equal(download.suggestedFilename(),`weird-walker.${format}`);
    const file=path.join(output,`walk.${format}`);await download.saveAs(file);
    assert.equal(await page.evaluate(()=>localStorage.getItem('weird-walker-v1')),saved);
    assert.equal(await page.locator('#ww-play').textContent(),'Keep walking');
    const data=fs.readFileSync(file).toString('base64');
    const info=await page.evaluate(async({data,format})=>{
      const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0)),src=URL.createObjectURL(new Blob([bytes],{type:`video/${format}`}));
      const video=document.createElement('video');video.muted=true;video.src=src;
      await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(new Error('Video does not decode'));});
      const c=document.createElement('canvas');c.width=720;c.height=720;const ctx=c.getContext('2d');
      const seek=async t=>{await new Promise(resolve=>{video.onseeked=resolve;video.currentTime=t;});ctx.drawImage(video,0,0);return c.toDataURL();};
      const first=await seek(.25),second=await seek(2.5);let duration=video.duration;
      if(!Number.isFinite(duration)){await seek(10000);duration=video.currentTime;}
      const result={width:video.videoWidth,height:video.videoHeight,duration,changes:first!==second};URL.revokeObjectURL(src);return result;
    },{data,format});
    assert.equal(info.width,720);assert.equal(info.height,720);assert.ok(info.changes);assert.ok(info.duration>5.7&&info.duration<6.5,JSON.stringify(info));
  }
  assert.deepEqual(errors,[]);await page.close();
  // Exercise the shared renderer at exact animation times without a production test API.
  const rendered=await browser.newPage({offline:true});
  const instrumented=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace('  history=[];', '  window.walkerCheck={renderScene,snapshot};\n  history=[];');
  await rendered.setContent(instrumented);
  const features=await rendered.evaluate(()=>{
    const c=document.createElement('canvas');c.width=720;c.height=720;const ctx=c.getContext('2d');
    const eyes=[],titles=[],originalEllipse=ctx.ellipse.bind(ctx),originalText=ctx.fillText.bind(ctx);
    ctx.ellipse=(...args)=>{eyes.push(args);originalEllipse(...args);};ctx.fillText=(...args)=>{titles.push(args[0]);originalText(...args);};
    const creature=walkerCheck.snapshot(),options={walking:true,reduced:false,ink:'#34304e',title:true};
    creature.name='<b>Video name</b>';creature.face={x:320,y:147};
    walkerCheck.renderScene(ctx,720,720,3.9,creature,options);const blink=eyes[0][3];
    eyes.length=0;walkerCheck.renderScene(ctx,720,720,4.1,creature,options);const open=eyes[0][3];
    eyes.length=0;walkerCheck.renderScene(ctx,720,720,1,creature,{...options,reactionAt:.8});const surprise=eyes[0][3];
    const regular=walkerCheck.renderScene(ctx,720,720,1,creature,{...options,reduced:true});
    const reacting=walkerCheck.renderScene(ctx,720,720,1,creature,{...options,reduced:true,reactionAt:.8});
    const images=['wobble','shuffle','bounce'].map(walk=>{walkerCheck.renderScene(ctx,720,720,1,{...creature,walk},options);return c.toDataURL();});
    return {blink,open,surprise,title:titles.includes(creature.name),noHop:regular.inverse.e===reacting.inverse.e&&regular.inverse.f===reacting.inverse.f,distinct:new Set(images).size};
  });
  assert.equal(features.blink,1);assert.equal(features.open,6);assert.equal(features.surprise,8);assert.ok(features.title);assert.ok(features.noHop);assert.equal(features.distinct,3);
  // Tap the actual filled body, then an empty region, with animation held at zero.
  await rendered.evaluate(()=>{window.requestAnimationFrame=()=>0;});
  await placeExampleLegs(rendered,false);await rendered.locator('#ww-face').click();await rendered.locator('#ww-face-centre').click();await rendered.locator('#ww-fill').click();await tapCanvas(rendered,320,147,false);
  await rendered.locator('#ww-play').click();await rendered.locator('#ww-walk').selectOption('bounce');
  const body=await rendered.locator('#ww-canvas').evaluate(c=>{
    const rect=c.getBoundingClientRect(),ctx=c.getContext('2d'),pixels=ctx.getImageData(0,0,c.width,c.height).data;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(pixels[i]===201&&pixels[i+1]===179&&pixels[i+2]===239)return{x:rect.x+x/c.width*rect.width,y:rect.y+(y+8)/c.height*rect.height};}
  });
  assert.ok(body);await rendered.mouse.click(body.x,body.y);assert.match(await rendered.locator('#ww-status').textContent(),/says hello/);
  await rendered.locator('#ww-status').evaluate(e=>e.textContent='Untouched');await rendered.locator('#ww-canvas').click({position:{x:25,y:40}});
  assert.equal(await rendered.locator('#ww-status').textContent(),'Untouched');await rendered.close();
  for(const failure of ['unsupported','error','start']){
    const p=await browser.newPage({offline:true});await p.addInitScript(failure=>{
      if(failure==='unsupported'){window.MediaRecorder=undefined;return;}
      const Original=MediaRecorder;
      window.MediaRecorder=class extends Original {
        start(){if(failure==='start')throw new Error('Cannot initialise');super.start();setTimeout(()=>this.dispatchEvent(new Event('error')),100);}
      };
    },failure);
    await p.goto(url);
    await placeExampleLegs(p,false);
    if(failure==='unsupported'){assert.equal(await p.locator('#ww-video').isDisabled(),true);assert.match(await p.locator('#ww-video-note').textContent(),/unavailable/);}
    else{await p.locator('#ww-video').click();await p.waitForTimeout(200);assert.equal(await p.locator('#ww-export').isVisible(),false);assert.equal(await p.locator('#ww-name').isDisabled(),false);assert.match(await p.locator('#ww-status').textContent(),/failed|could not start/);}
    await p.close();
  }
  console.log('PASS: shape thresholds, manual walks, names, migration, distinct gaits, timed blinking, body-only tap reactions, reduced-motion hop suppression, video title, recording cancellation, hidden-tab interruption, decoded six-second MP4/WebM, resize, unsupported/failed recorders.');
}

async function gifExport(browser,output){
  const url=pathToFileURL(path.join(__dirname,'index.html')).href;
  for(const width of [1100,360]){
    const phone=width===360,context=await browser.newContext({offline:true,acceptDownloads:true,viewport:{width,height:1100},colorScheme:phone?'dark':'light',reducedMotion:phone?'reduce':'no-preference'});
    const page=await context.newPage(),errors=[],downloads=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('download',d=>downloads.push(d));
    if(phone)await page.addInitScript(()=>{window.MediaRecorder=undefined;});
    await page.goto(url);await page.locator('#ww-gif').click();assert.match(await page.locator('#ww-status').textContent(),/Place two legs/);
    await tapCanvas(page,290,190);await page.locator('#ww-gif').click();assert.match(await page.locator('#ww-status').textContent(),/Place two legs/);
    await tapCanvas(page,350,190);await page.locator('#ww-name').fill('GIF Noodle');await page.locator('#ww-walk').selectOption('bounce');
    if(phone){await page.locator('#ww-fill').click();await tapCanvas(page,320,147);await page.locator('#ww-face').click();await page.locator('#ww-face-centre').click();assert.ok(await page.locator('#ww-video').isDisabled());}
    await page.locator('#ww-play').click();await page.locator('#ww-play').click();
    const saved=await page.evaluate(()=>localStorage.getItem('weird-walker-v1')),paused=await page.locator('#ww-canvas').evaluate(c=>c.toDataURL());
    await page.locator('#ww-gif').click();assert.ok(await page.locator('#ww-name').isDisabled());assert.ok(await page.locator('#ww-video').isDisabled());
    await page.locator('#ww-cancel').click();assert.ok(await page.locator('#ww-export').isHidden());assert.ok(await page.locator('#ww-name').isEnabled());
    assert.equal(await page.locator('#ww-canvas').evaluate(c=>c.toDataURL()),paused);assert.equal(await page.locator('#ww-play').textContent(),'Keep walking');
    await page.locator('#ww-play').click();await page.locator('#ww-gif').click();await page.locator('#ww-cancel').click();assert.equal(await page.locator('#ww-play').textContent(),'Pause');
    await page.locator('#ww-gif').click();
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});
    assert.ok(await page.locator('#ww-export').isHidden());assert.match(await page.locator('#ww-status').textContent(),/hidden/);assert.equal(await page.locator('#ww-play').textContent(),'Keep walking');
    const downloading=page.waitForEvent('download',{timeout:30000});await page.locator('#ww-gif').press('Enter');
    const download=await downloading;assert.equal(download.suggestedFilename(),'weird-walker.gif');
    const file=path.join(output,`walk-${width}.gif`);await download.saveAs(file);
    const bytes=fs.readFileSync(file);assert.equal(bytes.subarray(0,6).toString(),'GIF89a');
    const info=await page.evaluate(async data=>{
      const decoder=new ImageDecoder({data:Uint8Array.from(atob(data),c=>c.charCodeAt(0)),type:'image/gif'});
      await decoder.tracks.ready;const track=decoder.tracks.selectedTrack,frames=[],durations=[],sizes=new Set();
      const c=document.createElement('canvas');c.width=480;c.height=480;const ctx=c.getContext('2d');
      for(let i=0;i<track.frameCount;i++){
        const {image}=await decoder.decode({frameIndex:i});durations.push(image.duration);sizes.add(`${image.displayWidth}x${image.displayHeight}`);
        if([0,35,119].includes(i)){ctx.drawImage(image,0,0);frames.push(c.toDataURL());}image.close();
      }
      const result={sizes:Array.from(sizes),count:track.frameCount,loops:track.repetitionCount===Infinity,duration:durations.reduce((a,b)=>a+b,0),changes:new Set(frames).size,first:frames[0]};decoder.close();return result;
    },bytes.toString('base64'));
    assert.deepEqual(info.sizes,['480x480']);assert.equal(info.count,120);assert.ok(info.loops);assert.equal(info.duration,6000000);assert.equal(info.changes,3);
    fs.writeFileSync(path.join(output,`gif-frame-${width}.png`),Buffer.from(info.first.split(',')[1],'base64'));
    assert.equal(await page.evaluate(()=>localStorage.getItem('weird-walker-v1')),saved);assert.equal(await page.locator('#ww-play').textContent(),'Keep walking');
    assert.ok(await page.locator('#ww-name').isEnabled());assert.equal(await page.locator('#ww-video').isDisabled(),phone);assert.equal(downloads.length,1);
    assert.deepEqual(errors,[]);await context.close();
  }
  const page=await browser.newPage({offline:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await placeExampleLegs(page);
  await page.evaluate(()=>{window.gifenc={...window.gifenc,quantize(){throw new Error('Encoder failed');}};});
  await page.locator('#ww-gif').click();await page.waitForFunction(()=>document.getElementById('ww-export').hidden);
  assert.match(await page.locator('#ww-status').textContent(),/GIF export failed/);assert.ok(await page.locator('#ww-name').isEnabled());
  await page.evaluate(()=>{window.gifenc=undefined;});await page.locator('#ww-gif').click();assert.match(await page.locator('#ww-status').textContent(),/could not load/);
  await page.locator('#ww-play').click();assert.equal(await page.locator('#ww-play').textContent(),'Pause');assert.deepEqual(errors,[]);await page.close();
  console.log('PASS: decoded looping six-second GIFs, 120 changing frames, desktop/mobile, light/dark, reduced motion, faceless/filled creatures, no MediaRecorder, leg gates, cancellation, playback restore, hidden tabs, and encoder failures.');
}

async function facePlacement(browser,output){
  const url=pathToFileURL(path.join(__dirname,'index.html')).href;
  for(const width of [1100,360]){
    const context=await browser.newContext({offline:true,viewport:{width,height:1100},hasTouch:width===360,colorScheme:width===360?'dark':'light'});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
    const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('weird-walker-v1')));
    const tap=async(x,y)=>{
      await page.locator('#ww-canvas').scrollIntoViewIfNeeded();
      const p=await page.locator('#ww-canvas').evaluate((c,{x,y})=>{const r=c.getBoundingClientRect(),scale=Math.min((r.width-36)/640,(r.height-70)/360);return {x:r.x+r.width/2+(x-320)*scale,y:r.y+r.height/2+(y-170)*scale};},{x,y});
      if(width===360)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
    };
    assert.equal((await state()).face,null);
    await page.locator('#ww-face').click();assert.equal(await page.locator('#ww-caption').textContent(),'Tap where you want the face.');
    await tap(350,145);const first=(await state()).face;assert.ok(Math.abs(first.x-350)<3);assert.ok(Math.abs(first.y-145)<3);
    const gait=await page.locator('#ww-gait').textContent();
    await tap(290,155);const second=(await state()).face;assert.ok(Math.abs(second.x-290)<3);
    await tap(70,80);assert.deepEqual((await state()).face,second);assert.match(await page.locator('#ww-status').textContent(),/bounding rectangle/);
    await page.locator('#ww-undo').click();assert.deepEqual((await state()).face,first);
    await page.locator('#ww-face-remove').click();assert.equal((await state()).face,null);
    await page.locator('#ww-undo').click();assert.deepEqual((await state()).face,first);
    await page.locator('#ww-face-centre').press('Enter');const centred=(await state()).face;assert.notDeepEqual(centred,first);
    assert.equal(await page.locator('#ww-gait').textContent(),gait);
    await page.locator('#ww-draw').click();await tap(440,130);assert.deepEqual((await state()).face,centred);
    await page.locator('#ww-clear').click();assert.equal((await state()).face,null);
    await page.locator('#ww-face').click();await page.locator('#ww-face-centre').click();assert.match(await page.locator('#ww-status').textContent(),/Draw a body first/);
    await page.locator('#ww-undo').click();assert.deepEqual((await state()).face,centred);
    await page.locator('#ww-example').click();assert.equal((await state()).face,null);
    await page.locator('#ww-undo').click();assert.deepEqual((await state()).face,centred);
    const saved=await state();await page.reload();assert.deepEqual((await state()).face,centred);
    // Verify legacy conversion, explicit null, and invalid stored points separately.
    const legacy={...saved};delete legacy.face;
    await page.evaluate(d=>localStorage.setItem('weird-walker-v1',JSON.stringify(d)),legacy);await page.reload();assert.ok((await state()).face);
    const migrated=(await state()).face;await page.reload();assert.deepEqual((await state()).face,migrated);
    for(const face of [null,{x:'300',y:150},{x:9999,y:150},{x:300},false]){
      await page.evaluate(d=>localStorage.setItem('weird-walker-v1',JSON.stringify(d)),{...saved,face});await page.reload();
      await page.locator('#ww-name').fill('Test');assert.equal((await state()).face,null);
    }
    await page.evaluate(d=>localStorage.setItem('weird-walker-v1',JSON.stringify(d)),saved);await page.reload();
    await page.locator('#ww-face').click();await tap(345,160);
    await page.screenshot({path:path.join(output,`face-placement-${width}.png`),fullPage:true});
    const anchor=(await state()).face;
    for(const walk of ['wobble','shuffle','bounce']){
      if((await state()).feet.length!==2)await placeExampleLegs(page,width===360);
      await page.locator('#ww-walk').selectOption(walk);await page.locator('#ww-play').click();assert.equal(await page.locator('#ww-face').isVisible(),false);
      await page.locator('#ww-hello').click();await page.locator('#ww-play').click();assert.deepEqual((await state()).face,anchor);
      const downloading=page.waitForEvent('download');await page.locator('#ww-download').click();assert.equal((await downloading).suggestedFilename(),'weird-walker.png');
      await page.locator('#ww-edit').click();
    }
    await page.locator('#ww-video').click();assert.ok(await page.locator('#ww-face-centre').isDisabled());await page.locator('#ww-cancel').click();
    assert.deepEqual((await state()).face,anchor);assert.equal(await page.locator('#ww-face-centre').isDisabled(),false);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await context.close();
  }
  // Verify that all face features use the selected drawing-space anchor and stay in frame.
  const page=await browser.newPage({offline:true});
  await page.setContent(fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace('  history=[];','  window.walkerCheck={renderScene,snapshot};\n  history=[];'));
  const result=await page.evaluate(()=>{
    const c=document.createElement('canvas'),ctx=c.getContext('2d'),ellipses=[],original=ctx.ellipse.bind(ctx);
    ctx.ellipse=(...a)=>{ellipses.push(a);original(...a);};
    const shape={strokes:[[{x:220,y:30},{x:340,y:30},{x:340,y:260},{x:220,y:260},{x:220,y:30}]],fills:[null],feet:[{x:245,y:250},{x:315,y:250}],name:'Face test',walk:'auto',face:null};
    const options={walking:true,ink:'#34304e',title:true,reduced:false};
    c.width=720;c.height=720;walkerCheck.renderScene(ctx,720,720,1,shape,options);const faceless=ellipses.length===0;
    let fits=true,attached=true;
    for(const [w,h] of [[720,720],[288,360],[1000,440]])for(const face of [{x:220,y:30},{x:340,y:30},{x:340,y:260},{x:220,y:260}])for(const walk of ['wobble','shuffle','bounce'])for(let t=0;t<=6;t+=.25){
      c.width=w;c.height=h;ellipses.length=0;
      const hit=walkerCheck.renderScene(ctx,w,h,t,{...shape,face,walk},{...options,reactionAt:t-.4});
      attached=attached&&ellipses[0][0]===face.x-15.6&&ellipses[0][1]===face.y-8;
      const transform=hit.inverse.inverse();
      for(const dx of [-23,23])for(const dy of [-18,21]){const p=new DOMPoint(face.x+dx,face.y+dy).matrixTransform(transform);fits=fits&&p.x>=0&&p.x<=w&&p.y>=0&&p.y<=h;}
    }
    return {faceless,fits,attached};
  });
  assert.deepEqual(result,{faceless:true,fits:true,attached:true});await page.close();
  console.log('PASS: face placement/reposition/remove/undo, fixed anchors, touch and keyboard, legacy migration, invalid data, faceless creatures, PNG export, recording lock, and face extents across walks and screen sizes.');
}

async function explicitDrawing(browser,output){
  const url=pathToFileURL(path.join(__dirname,'index.html')).href;
  for(const width of [1100,360]){
    const touch=width===360,context=await browser.newContext({offline:true,viewport:{width,height:1100},hasTouch:touch,colorScheme:touch?'dark':'light',acceptDownloads:true});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
    const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('weird-walker-v1')));
    let data=await state();assert.deepEqual(data.feet,[]);assert.deepEqual(data.fills,[null]);
    await page.locator('#ww-play').click();assert.match(await page.locator('#ww-status').textContent(),/Place two legs/);assert.equal(await page.locator('#ww-feet').getAttribute('aria-pressed'),'true');
    await tapCanvas(page,300,180,touch);await page.locator('#ww-play').click();assert.match(await page.locator('#ww-status').textContent(),/Place two legs/);
    await tapCanvas(page,340,180,touch);await page.locator('#ww-play').click();assert.equal(await page.locator('#ww-play').textContent(),'Pause');await page.locator('#ww-play').click();await page.locator('#ww-edit').click();
    await page.locator('#ww-clear').click();await page.locator('#ww-circle').click();
    const a=await canvasPoint(page,220,80),b=await canvasPoint(page,420,220);
    if(touch){await page.touchscreen.tap(a.x,a.y);await page.touchscreen.tap(b.x,b.y);}else{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:12});await page.mouse.up();}
    if(touch){
      // Touchscreen tap cannot synthesize a drag in Playwright; exercise the pointer path directly.
      await page.locator('#ww-clear').click();await page.locator('#ww-circle').click();
      await dragTouch(page,a,b);
    }
    data=await state();assert.equal(data.strokes.length,1);assert.equal(data.strokes[0].length,65);assert.deepEqual(data.fills,[null]);assert.deepEqual(data.feet,[]);
    const before=data.strokes.length;const tiny=await canvasPoint(page,300,130);
    await page.mouse.move(tiny.x,tiny.y);await page.mouse.down();await page.mouse.move(tiny.x+2,tiny.y+2);await page.mouse.up();assert.equal((await state()).strokes.length,before);assert.match(await page.locator('#ww-status').textContent(),/Drag farther/);
    const colors=[['Purple','#c9b3ef'],['Pink','#f4afc5'],['Yellow','#f3d777'],['Mint','#9fdbc7'],['Blue','#91c5e8'],['Orange','#efb37a']];
    for(const [name,color] of colors){await page.locator('#ww-fill').click();await page.getByRole('button',{name}).click();await tapCanvas(page,320,150,touch);assert.equal((await state()).fills[0],color);}
    await page.locator('#ww-unfill').click();await tapCanvas(page,320,150,touch);assert.equal((await state()).fills[0],null);
    await page.locator('#ww-undo').click();assert.equal((await state()).fills[0],'#efb37a');
    await page.locator('#ww-fill').click();await page.getByRole('button',{name:'Blue'}).click();await tapCanvas(page,320,150,touch);assert.equal((await state()).fills[0],'#91c5e8');
    await tapCanvas(page,100,40,touch);assert.match(await page.locator('#ww-status').textContent(),/closed shape/);
    await page.locator('#ww-circle').click();const c=await canvasPoint(page,285,115),d=await canvasPoint(page,375,185);await page.mouse.move(c.x,c.y);await page.mouse.down();await page.mouse.move(d.x,d.y);await page.mouse.up();
    await page.locator('#ww-fill').click();await page.getByRole('button',{name:'Pink'}).click();await tapCanvas(page,320,150,touch);
    assert.deepEqual((await state()).fills,['#91c5e8','#f4afc5']);
    await page.locator('#ww-draw').click();const e=await canvasPoint(page,100,240),f=await canvasPoint(page,180,240);await page.mouse.move(e.x,e.y);await page.mouse.down();await page.mouse.move(f.x,f.y,{steps:10});await page.mouse.up();
    data=await state();assert.equal(data.fills.at(-1),null);assert.deepEqual(data.feet,[]);
    const png=page.waitForEvent('download');await page.locator('#ww-download').click();assert.equal((await png).suggestedFilename(),'weird-walker.png');
    await page.locator('#ww-video').click();assert.match(await page.locator('#ww-status').textContent(),/Place two legs/);
    await placeExampleLegs(page,touch);const cancelStart=page.locator('#ww-video').click();await cancelStart;assert.equal(await page.locator('#ww-export').isVisible(),true);await page.locator('#ww-cancel').click();
    await page.screenshot({path:path.join(output,`explicit-tools-${width}.png`),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await context.close();
  }
  const page=await browser.newPage({offline:true});await page.goto(url);
  const closedStroke=[{x:200,y:80},{x:400,y:80},{x:400,y:220},{x:200,y:220},{x:200,y:80}],openStroke=[{x:50,y:50},{x:100,y:100}];
  const legacy={strokes:[closedStroke,openStroke],feet:[{x:250,y:210},{x:350,y:210}],face:null,name:'Old',walk:'auto'};
  await page.evaluate(d=>localStorage.setItem('weird-walker-v1',JSON.stringify(d)),legacy);await page.reload();assert.deepEqual((await page.evaluate(()=>JSON.parse(localStorage.getItem('weird-walker-v1')).fills)),['#c9b3ef',null]);
  for(const fills of [[null],["bad","#f4afc5","#91c5e8"],{},["#efb37a",null]]){
    await page.evaluate(({legacy,fills})=>localStorage.setItem('weird-walker-v1',JSON.stringify({...legacy,version:2,fills})),{legacy,fills});await page.reload();
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('weird-walker-v1')));assert.equal(saved.fills.length,2);assert.ok(saved.fills.every(v=>v===null||['#c9b3ef','#f4afc5','#f3d777','#9fdbc7','#91c5e8','#efb37a'].includes(v)));
  }
  await page.close();console.log('PASS: outline-only drawing, explicit legs, circle/oval drag, tiny-drag rejection, palette fills, remove/replace fill, topmost overlaps, open-line rejection, fill migration, malformed fills, PNG and video gates.');
}
