// Records actual UI/API interactions; separate synthetic identities use separate contexts.
import { chromium, request } from 'playwright';
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const base = process.env.DEMO_URL || 'http://localhost:3001';
const dir = resolve('.data/demo-recording'); mkdirSync(dir, { recursive:true, mode:0o700 });
const reset = await request.newContext({ baseURL:base, extraHTTPHeaders:{Origin:base} });
assert.equal((await reset.post('/api/demo/login',{data:{identity:'admin-c'}})).status(),200);
assert.equal((await reset.post('/api/demo/reset',{data:{}})).status(),200);await reset.dispose();
const browser = await chromium.launch({ executablePath:process.env.CHROME_PATH || (existsSync('/bin/google-chrome')?'/bin/google-chrome':undefined), headless:true, args:['--no-sandbox'] });
const contexts=[], clips=[], evidence=[];
async function pageFor(identity){
 const ctx=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,recordVideo:{dir,size:{width:1280,height:720}}});contexts.push(ctx);
 const epoch=Date.now();const p=await ctx.newPage();
 p.on('response',r=>{if(r.url().startsWith(base+'/api/demo/')&&r.request().method()==='POST')evidence.push({identity,action:new URL(r.url()).pathname.split('/').at(-1),status:r.status()})});
 await p.goto(base+'/demo');await p.getByRole('button',{name:/^Employee/}).waitFor();
 return {p,epoch,video:p.video()};
}
async function scene(page,name,duration,perform=async()=>{}){
 const start=(Date.now()-page.epoch)/1000, began=Date.now();
 await perform(page.p);const remain=duration*1000-(Date.now()-began);if(remain>0)await page.p.waitForTimeout(remain);
 clips.push({page,name,start,duration});console.log(name);
}
const e=await pageFor('Employee');
let a,b;
try{
 await scene(e,'01 Introduce CloudGuard',15);
 await scene(e,'02 Viewer rejected by backend',20,async p=>{
  await p.getByRole('button',{name:/^Employee/}).click();await p.getByTestId('roles').filter({hasText:/^viewer$/}).waitFor();
  await p.waitForTimeout(1500);await p.getByRole('button',{name:'Restart web-prod-01'}).click();
  await p.getByTestId('response').filter({hasText:'HTTP 403'}).waitFor();
 });
 await scene(e,'03 Request governed access',20,async p=>{
  await p.getByRole('button',{name:'Request infra-operator access'}).click();await p.getByTestId('request-status').filter({hasText:'PENDING'}).waitFor();
 });
 a=await pageFor('Admin A');
 await scene(a,'04 First distinct approval: still pending',15,async p=>{
  await p.getByRole('button',{name:/^Admin A/}).click();await p.getByRole('button',{name:'Approve request',exact:true}).waitFor();await p.waitForTimeout(1500);await p.getByRole('button',{name:'Approve request',exact:true}).click();
  await p.getByTestId('response').filter({hasText:'1 of 2 approvals'}).waitFor();
 });
 await scene(e,'05 One approval still returns403',6,async p=>{
  await p.getByRole('button',{name:'Refresh audit'}).click();await p.getByRole('button',{name:'Restart web-prod-01'}).click();await p.getByTestId('response').filter({hasText:'HTTP 403'}).waitFor();
 });
 await scene(a,'06 Duplicate approval rejected',4,async p=>{
  await p.getByRole('button',{name:'Approve request',exact:true}).click();await p.getByTestId('response').filter({hasText:'HTTP 409'}).waitFor();
 });
 b=await pageFor('Admin B');
 await scene(b,'07 Independent Admin B satisfies quorum',20,async p=>{
  await p.getByRole('button',{name:/^Admin B/}).click();await p.getByRole('button',{name:'Approve request',exact:true}).waitFor();await p.waitForTimeout(2200);await p.getByRole('button',{name:'Approve request',exact:true}).click();await p.getByTestId('request-status').filter({hasText:'AUTHORIZED'}).waitFor();
 });
 await scene(e,'08 Authorized restart and actual audit evidence',16,async p=>{
  await p.getByRole('button',{name:'Refresh audit'}).click();await p.getByTestId('roles').filter({hasText:'infra-operator'}).waitFor();await p.waitForTimeout(1500);await p.getByRole('button',{name:'Restart web-prod-01'}).click();await p.getByTestId('response').filter({hasText:'HTTP 200'}).waitFor();assert.equal(await p.getByTestId('restart-count').innerText(),'1');await p.waitForTimeout(3500);await p.getByTestId('audit').scrollIntoViewIfNeeded();
 });
}finally{await Promise.all(contexts.map(c=>c.close()));await browser.close();}
assert.deepEqual(evidence.filter(e=>e.action==='restart').map(e=>e.status),[403,403,200]);
assert.deepEqual(evidence.filter(e=>e.action==='approve').map(e=>e.status),[200,409,200]);
const pages=[e,a,b], paths=await Promise.all(pages.map(p=>p.video.path()));
const filters=clips.map((c,i)=>`[${pages.indexOf(c.page)}:v]trim=start=${c.start.toFixed(3)}:duration=${c.duration},setpts=PTS-STARTPTS,fps=30,scale=1280:720,setsar=1[v${i}]`);
filters.push(clips.map((_,i)=>`[v${i}]`).join('')+`concat=n=${clips.length}:v=1:a=0[base]`);
const captions=[['00:00:00,000','00:00:15,000','CloudGuard protects sensitive infrastructure through independent authorization.'],['00:00:15,000','00:00:35,000','Employee is a viewer. The backend rejects restart with HTTP 403.'],['00:00:35,000','00:00:55,000','Operating access requires two of three distinct administrators.'],['00:00:55,000','00:01:10,000','Admin A approves. One approval leaves the request pending.'],['00:01:10,000','00:01:16,000','The backend STILL denies restart: HTTP 403.'],['00:01:16,000','00:01:20,000','Duplicate Admin A approval: HTTP 409; the count stays one.'],['00:01:20,000','00:01:40,000','Admin B uses an isolated session. Two approvals authorize the grant.'],['00:01:40,000','00:01:49,000','Employee gains infra-operator. Restart returns HTTP 200.'],['00:01:49,000','00:01:56,000','Audit records the grant and restart. Protection is simulated.']];
const srt=dir+'/captions.srt';writeFileSync(srt,captions.map((c,i)=>`${i+1}\n${c[0]} --> ${c[1]}\n${c[2]}\n`).join('\n'));
filters.push(`[base]subtitles=filename=${srt}:force_style='FontName=DejaVu Sans,FontSize=12,Outline=1,Shadow=0,MarginV=8,BorderStyle=3,BackColour=&H90000000'[out]`);
const args=['-y',...paths.flatMap(p=>['-i',p]),'-filter_complex',filters.join(';'),'-map','[out]','-an','-c:v','libx264','-preset','veryfast','-crf','25','-pix_fmt','yuv420p','-r','30','-t','116','-movflags','+faststart','demo.mp4'];
const f=spawnSync('ffmpeg',args,{encoding:'utf8',maxBuffer:10_000_000});writeFileSync(dir+'/ffmpeg.log',f.stderr||'');assert.equal(f.status,0,'FFmpeg failed; inspect private log');
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration,size:stream=codec_name,width,height,pix_fmt,r_frame_rate','-of','json','demo.mp4'],{encoding:'utf8'});assert.equal(probe.status,0);const meta=JSON.parse(probe.stdout),v=meta.streams[0];
assert.equal(v.codec_name,'h264');assert.equal(v.pix_fmt,'yuv420p');assert.equal(v.width,1280);assert.equal(v.height,720);assert.equal(v.r_frame_rate,'30/1');assert.ok(+meta.format.duration>=110&&+meta.format.duration<=120);assert.ok(+meta.format.size<100_000_000);
writeFileSync(dir+'/workflow-evidence.json',JSON.stringify(evidence,null,2));writeFileSync('docs/demo-metadata.json',JSON.stringify({...meta,mode:'TideCloak Protection Simulation',recording:'Genuine browser interactions against running Next.js backend; three isolated synthetic sessions'},null,2)+'\n');
for(const path of paths)if(path.startsWith(dir+'/'))unlinkSync(path);
console.log(JSON.stringify({video:'demo.mp4',duration:+meta.format.duration,bytes:+meta.format.size,workflowVerified:true}));
