const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { createClient } = require('@libsql/client');
const { createTasksRouter } = require('../routes/tasks');

test('task assignment, authorization, persistence and UI', async () => {
    const client=createClient({url:':memory:'});
    await client.batch([
        `CREATE TABLE users(id INTEGER PRIMARY KEY,organization_id INTEGER,admin_name TEXT,email TEXT,role TEXT,is_blocked INTEGER DEFAULT 0,tokenVersion INTEGER DEFAULT 0)`,
        `CREATE TABLE invitations(id INTEGER PRIMARY KEY,organization_id INTEGER,email TEXT,status TEXT)`,
        `INSERT INTO invitations VALUES(10,1,'pending@example.test','pending'),(11,2,'external@example.test','pending')`,
        `CREATE TABLE admin_assigned_employees(admin_id INTEGER,employee_id INTEGER,organization_id INTEGER)`,
        `INSERT INTO users(id,organization_id,admin_name,email,role) VALUES (1,1,'Owner','owner@example.test','org_owner'),(2,1,'Asha','asha@example.test','employee'),(3,1,'Ravi','ravi@example.test','employee'),(4,2,'Other owner','other@example.test','org_owner'),(5,1,'Admin','admin@example.test','admin')`,
        `INSERT INTO admin_assigned_employees VALUES(5,2,1)`
    ],'write');
    const secret='isolated-task-test-secret';
    const app=express();app.use(express.json());app.use('/api/tasks',createTasksRouter(client,secret));
    const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
    const base=`http://127.0.0.1:${server.address().port}`;
    const token=id=>jwt.sign({id,tokenVersion:0},secret,{expiresIn:'1h'});
    const call=async(id,path='',method='GET',body)=>{
        const response=await fetch(base+'/api/tasks'+path,{method,headers:{Authorization:`Bearer ${token(id)}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};
    };
    let browser;
    try {
        const payload={title:'Review client handoff',description:'Confirm delivery',status:'todo',priority:'high',dueDate:'2026-11-06',assigneeId:'2'};
        const created=await call(1,'','POST',payload);assert.equal(created.status,201);const id=created.data.task.id;
        assert.equal((await call(2)).data.tasks[0].id,id);
        assert.ok(created.data.task.assignedAt);
        const encoded=Buffer.from('Task attachment content').toString('base64');
        const withFile=await call(1,'/'+id,'PATCH',{...payload,attachments:[{name:'brief.txt',data:encoded}]});
        assert.equal(withFile.status,200);assert.equal(withFile.data.task.attachments.length,1);
        const fileId=withFile.data.task.attachments[0].id;
        const download=await fetch(base+'/api/tasks/'+id+'/attachments/'+fileId,{headers:{Authorization:'Bearer '+token(2)}});
        assert.equal(download.status,200);assert.equal(await download.text(),'Task attachment content');
        assert.equal((await fetch(base+'/api/tasks/'+id+'/attachments/'+fileId,{headers:{Authorization:'Bearer '+token(4)}})).status,404);
        assert.equal((await call(1,'/'+id,'PATCH',{...payload,attachments:[{id:'foreign-file'}]})).status,400);
        assert.equal((await call(1,'/'+id,'PATCH',{...payload,attachments:[{name:'../bad.txt',data:encoded}]})).status,400);
        assert.equal((await call(1,'/'+id,'PATCH',{...payload,attachments:Array.from({length:6},()=>({name:'file.txt',data:encoded}))})).status,400);
        await client.execute({sql:"UPDATE tasks SET assigned_at='2026-01-01 00:00:00' WHERE id=?",args:[id]});
        assert.equal((await call(1,'/'+id,'PATCH',payload)).data.task.assignedAt,'2026-01-01 00:00:00');
        const reassigned=await call(1,'/'+id,'PATCH',{...payload,assigneeId:'3'});assert.notEqual(reassigned.data.task.assignedAt,'2026-01-01 00:00:00');
        await call(1,'/'+id,'PATCH',payload);

        assert.equal((await call(3)).data.tasks.length,0);
        assert.equal((await call(4)).data.tasks.length,0);
        assert.equal((await call(4,'/'+id,'PATCH',{status:'done'})).status,404);
        assert.equal((await call(2,'/'+id,'PATCH',{status:'progress'})).status,200);
        assert.equal((await call(1)).data.tasks[0].status,'progress');
        assert.equal((await call(2,'/'+id,'PATCH',{...payload,title:'Unauthorized edit'})).status,403);
        assert.equal((await call(2,'/'+id,'DELETE')).status,403);
        assert.equal((await call(2,'','POST',{...payload,assigneeId:'3'})).status,403);
        assert.equal((await call(1,'','POST',{...payload,assigneeId:'4'})).status,403);
        assert.deepEqual((await call(5)).data.assignees.map(a=>String(a.id)).sort(),['2','3','5','invite_10']);
        assert.equal((await call(5,'','POST',{...payload,assigneeId:'3'})).status,201);
        assert.equal((await call(1,'','POST',{...payload,assigneeId:'5'})).status,201);
        assert.equal((await call(1,'','POST',{...payload,assigneeId:'invite_11'})).status,403);
        const pendingTask=await call(1,'','POST',{...payload,assigneeId:'invite_10'});
        assert.equal(pendingTask.status,201);assert.equal(pendingTask.data.task.assigneePending,true);
        await client.execute("INSERT INTO users(id,organization_id,admin_name,email,role) VALUES(6,1,'New joiner','pending@example.test','employee')");
        const joined=(await call(6)).data.tasks;assert.equal(joined.length,1);assert.equal(joined[0].id,pendingTask.data.task.id);assert.equal(joined[0].assigneeId,'6');
        assert.equal((await call(6,'/'+joined[0].id,'PATCH',{status:'done'})).status,200);
        assert.ok(!(await call(1)).data.assignees.some(a=>a.id==='invite_10'));
        assert.equal((await call(5,'','POST',payload)).status,201);
        assert.equal((await call(1,'','POST',{...payload,dueDate:'2026-02-30'})).status,400);
        const before=(await call(1)).data.tasks.length;
        assert.equal((await call(1,'/import','POST',{tasks:[payload,{...payload,assigneeId:4}]})).status,403);
        assert.equal((await call(1)).data.tasks.length,before);
        const imported=await call(1,'/import','POST',{tasks:[{...payload,id:'legacy-1'}]});assert.equal(imported.data.imported,1);
        assert.equal((await call(1,'/import','POST',{tasks:[{...payload,id:'legacy-1'}]})).data.imported,0);
        const exported=(await call(1)).data.tasks;
        assert.equal((await call(1,'/import','POST',{tasks:exported})).data.imported,0);
        const forged=await fetch(base+'/api/tasks',{headers:{Authorization:'Bearer '+jwt.sign({id:1},'wrong'),'x-user-id':'1'}});assert.equal(forged.status,401);
        assert.equal((await fetch(base+'/api/tasks',{headers:{'x-user-id':'1'}})).status,401);
        await client.execute('UPDATE users SET is_blocked=1 WHERE id=3');assert.equal((await call(3)).status,401);
        await client.execute('UPDATE users SET tokenVersion=1 WHERE id=5');assert.equal((await call(5)).status,401);
        // The real React page talks to the isolated task API. Other app endpoints are stubbed.
        const puppeteer=require('puppeteer');browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
        const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
        await page.setRequestInterception(true);
        page.on('request',async request=>{
            if(request.url().includes('/api/tasks')) {
                try {const response=await fetch(base+new URL(request.url()).pathname,{method:request.method(),headers:request.headers(),...(request.postData()?{body:request.postData()}:{})});await request.respond({status:response.status,contentType:response.headers.get('content-type')||'application/json',body:Buffer.from(await response.arrayBuffer())});}catch {await request.abort();}
            } else if(request.url().includes('/api/')) await request.respond({status:200,contentType:'application/json',body:'{}'});
            else await request.continue();
        });
        await page.goto('http://localhost:5173');
        await page.evaluate(token=>{localStorage.setItem('token',token);localStorage.setItem('currentUser',JSON.stringify({id:1,organization_id:1,role:'org_owner'}));},token(1));
        await page.goto('http://localhost:5173/dashboard/tasks');await page.waitForSelector('.task-row');
        await page.click('.task-page-header .primary');await page.waitForSelector('dialog[open]');
        await page.type('input[name="title"]','Employee assignment from UI');
        await page.type('#task-description-input','Important');
        await page.$eval('#task-description-input',e=>{e.focus();const range=document.createRange();range.selectNodeContents(e);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);e.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));});
        await page.click('button[aria-label="Bold selected text"]');
        assert.equal(await page.$eval('#task-description-input b, #task-description-input strong',e=>e.textContent),'Important');
        assert.equal(await page.$eval('#task-description-input',e=>e.textContent),'Important');
        await page.$eval('#task-description-input',e=>{e.focus();const r=document.createRange();r.selectNodeContents(e);r.collapse(false);const s=window.getSelection();s.removeAllRanges();s.addRange(r);});
        await page.keyboard.press('End');await page.keyboard.press('Enter');
        await page.type('#task-description-input','Review the attachment');
        await page.select('select[aria-label="List formatting"]','insertUnorderedList');
        assert.ok(await page.$('#task-description-input ul li'));
        const fixture=require('path').resolve('scratch/task-attachment-fixture.txt');require('fs').writeFileSync(fixture,'UI attachment');
        await (await page.$('#task-files')).uploadFile(fixture);
        await page.waitForFunction(()=>document.querySelector('dialog .task-attachment-previews')?.textContent.includes('task-attachment-fixture.txt'));
        const imageFixture=require('path').resolve('scratch/task-preview-fixture.png');
        require('fs').writeFileSync(imageFixture,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
        await (await page.$('#task-files')).uploadFile(imageFixture);
        await page.waitForFunction(()=>document.querySelector('dialog .task-inline-image')?.naturalWidth>0);
        assert.ok(await page.$('dialog .task-rich-frame .task-attachment-previews'));

await page.select('select[name="assigneeId"]','2');
        await page.screenshot({path:'scratch/task-assignment-editor.png'});
        await page.select('select[name="assigneeId"]','2');await page.click('button[type="submit"]');await page.waitForSelector('dialog',{hidden:true});
        await page.select('select[aria-label="Filter by assignee"]','2');await page.waitForFunction(()=>document.querySelector('.task-list')?.textContent.includes('Employee assignment from UI'));
        assert.ok(await page.$('.task-description-details .task-file-link'));
        await page.screenshot({path:'scratch/task-assignment-team.png'});
        await page.click('button[aria-label="Edit Employee assignment from UI"]');
        await page.waitForSelector('dialog[open]');
        await page.waitForFunction(()=>document.querySelector('dialog .task-inline-image')?.naturalWidth>0);
        await page.click('button[aria-label="Close task editor"]');

        await page.evaluate(token=>{localStorage.setItem('token',token);localStorage.setItem('currentUser',JSON.stringify({id:2,organization_id:1,role:'employee'}));},token(2));await page.reload();await page.waitForSelector('.task-row');
        assert.equal(await page.$eval('.task-side h2',e=>e.textContent),'My tasks');
        await page.click('.task-title');await page.waitForSelector('dialog[open]');assert.equal(await page.$eval('input[name="title"]',e=>e.disabled),true);
        assert.ok(await page.$('#task-description-input'));

        await page.select('select[name="status"]','done');await page.click('button[type="submit"]');await page.waitForSelector('dialog',{hidden:true});
        await page.setViewport({width:390,height:844});await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.screenshot({path:'scratch/task-assignment-employee-mobile.png'});
        assert.ok((await call(1)).data.tasks.some(t=>t.status==='done'));
        assert.equal((await call(1,'/'+id,'PATCH',{...payload,assigneeId:'3'})).status,403); // blocked employee
        assert.equal((await call(1,'/'+id,'DELETE')).status,200);
        assert.equal((await client.execute({sql:'SELECT COUNT(*) AS n FROM task_attachments WHERE task_id=?',args:[id]})).rows[0].n,0);
    } finally {if(browser)await browser.close();await new Promise(r=>server.close(r));client.close();}
});

