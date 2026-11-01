const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { createClient } = require('@libsql/client');
const { createTasksRouter } = require('../routes/tasks');

test('employee task isolation: visibility, sidebar counts, summary cards, and assignee locking', async () => {
    const client = createClient({ url: ':memory:' });
    await client.batch([
        `CREATE TABLE users(id INTEGER PRIMARY KEY, organization_id INTEGER, admin_name TEXT, email TEXT, role TEXT, is_blocked INTEGER DEFAULT 0, tokenVersion INTEGER DEFAULT 0)`,
        `CREATE TABLE invitations(id INTEGER PRIMARY KEY, organization_id INTEGER, email TEXT, status TEXT)`,
        `INSERT INTO users(id, organization_id, admin_name, email, role) VALUES
            (1, 1, 'Owner User', 'owner@example.test', 'org_owner'),
            (2, 1, 'Asha Employee', 'asha@example.test', 'employee'),
            (3, 1, 'Ravi Employee', 'ravi@example.test', 'employee'),
            (5, 1, 'Admin User', 'admin@example.test', 'admin'),
            (7, 1, 'Maya Employee', 'maya@example.test', 'employee'),
            (8, 1, 'Blank Email Employee', '   ', 'employee'),
            (9, 1, 'Null Email Employee', NULL, 'employee')`
    ], 'write');

    const secret = 'visibility-test-secret';
    const app = express();
    app.use(express.json());
    app.use('/api/tasks', createTasksRouter(client, secret));

    const server = app.listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
    const base = `http://127.0.0.1:${server.address().port}`;

    const token = id => jwt.sign({ id, tokenVersion: 0 }, secret, { expiresIn: '1h' });
    const call = async (id, path = '', method = 'GET', body) => {
        const response = await fetch(base + '/api/tasks' + path, {
            method,
            headers: {
                Authorization: `Bearer ${token(id)}`,
                'Content-Type': 'application/json'
            },
            ...(body ? { body: JSON.stringify(body) } : {})
        });
        return { status: response.status, data: await response.json() };
    };

    let browser;
    try {
        // 1. Owner creates tasks for Asha, Ravi, and Maya
        // Asha Task 1 (todo, future due date)
        const t1 = await call(1, '', 'POST', {
            title: "Asha's Task 1",
            description: "Prepare quarterly budget review",
            status: "todo",
            priority: "high",
            dueDate: "2026-11-20",
            assigneeId: "2",
            attachments: [{ name: "budget.pdf", data: Buffer.from("budget-review-bytes").toString("base64") }]
        });
        assert.equal(t1.status, 201);
        const t1Id = t1.data.task.id;
        const t1FileId = t1.data.task.attachments[0].id;

        // Asha Task 2 (progress, future due date)
        const t2 = await call(1, '', 'POST', {
            title: "Asha's Task 2",
            description: "Coordinate with client team",
            status: "progress",
            priority: "medium",
            dueDate: "2026-11-25",
            assigneeId: "2"
        });
        assert.equal(t2.status, 201);
        const t2Id = t2.data.task.id;

        // Ravi Task 3 (done)
        const t3 = await call(1, '', 'POST', {
            title: "Ravi's Task 3",
            description: "Update server configuration",
            status: "done",
            priority: "low",
            dueDate: "2026-11-15",
            assigneeId: "3"
        });
        assert.equal(t3.status, 201);
        const t3Id = t3.data.task.id;

        // Ravi Task 4 (todo, overdue)
        const t4 = await call(1, '', 'POST', {
            title: "Ravi's Task 4 Overdue",
            description: "Renew SSL certificate",
            status: "todo",
            priority: "high",
            dueDate: "2020-01-01",
            assigneeId: "3"
        });
        assert.equal(t4.status, 201);
        const t4Id = t4.data.task.id;

        // Maya Task 5 (todo)
        const t5 = await call(1, '', 'POST', {
            title: "Maya's Task 5",
            description: "Design UI banners",
            status: "todo",
            priority: "medium",
            dueDate: "2026-11-30",
            assigneeId: "7"
        });
        assert.equal(t5.status, 201);
        const t5Id = t5.data.task.id;

        // Asha creates Task 6 for herself
        const t6 = await call(2, '', 'POST', {
            title: "Asha's Self-Created Task 6",
            description: "Personal note and follow up",
            status: "progress",
            priority: "low",
            dueDate: "2026-11-28",
            assigneeId: "2"
        });
        assert.equal(t6.status, 201);
        const t6Id = t6.data.task.id;

        // 2. Strict API-level verification
        // Check Asha: receives strictly Task 1, Task 2, and Task 6
        const ashaTasksRes = await call(2);
        assert.equal(ashaTasksRes.status, 200);
        const ashaTaskIds = ashaTasksRes.data.tasks.map(t => t.id).sort();
        assert.deepEqual(ashaTaskIds, [t1Id, t2Id, t6Id].sort());
        assert.equal(ashaTasksRes.data.canAssign, false);
        assert.equal(ashaTasksRes.data.assignees.length, 1);
        assert.equal(String(ashaTasksRes.data.assignees[0].id), "2");

        // Check Ravi: receives strictly Task 3 and Task 4
        const raviTasksRes = await call(3);
        assert.equal(raviTasksRes.status, 200);
        const raviTaskIds = raviTasksRes.data.tasks.map(t => t.id).sort();
        assert.deepEqual(raviTaskIds, [t3Id, t4Id].sort());
        assert.equal(raviTasksRes.data.canAssign, false);

        // Check Maya: receives strictly Task 5
        const mayaTasksRes = await call(7);
        assert.equal(mayaTasksRes.status, 200);
        const mayaTaskIds = mayaTasksRes.data.tasks.map(t => t.id).sort();
        assert.deepEqual(mayaTaskIds, [t5Id]);

        // Check Owner: receives all 6 tasks
        const ownerTasksRes = await call(1);
        assert.equal(ownerTasksRes.status, 200);
        assert.equal(ownerTasksRes.data.tasks.length, 6);
        assert.equal(ownerTasksRes.data.canAssign, true);

        // Check Admin: receives all 6 tasks
        const adminTasksRes = await call(5);
        assert.equal(adminTasksRes.status, 200);
        assert.equal(adminTasksRes.data.tasks.length, 6);
        assert.equal(adminTasksRes.data.canAssign, true);

        // Security check: Asha cannot delete or update Ravi's task
        assert.equal((await call(2, '/' + t3Id, 'DELETE')).status, 404);
        assert.equal((await call(2, '/' + t3Id, 'PATCH', { status: 'progress' })).status, 404);

        // Security check: Attachment download authorization
        const ashaAttach = await fetch(base + '/api/tasks/' + t1Id + '/attachments/' + t1FileId, {
            headers: { Authorization: `Bearer ${token(2)}` }
        });
        assert.equal(ashaAttach.status, 200, 'Assigned employee can download task attachment');
        const raviAttach = await fetch(base + '/api/tasks/' + t1Id + '/attachments/' + t1FileId, {
            headers: { Authorization: `Bearer ${token(3)}` }
        });
        assert.equal(raviAttach.status, 404, 'Other employee cannot access or download task attachment');

        // Security check: Employees with whitespace or null emails do NOT leak workspace tasks
        const blankEmailRes = await call(8);
        assert.equal(blankEmailRes.status, 200);
        assert.equal(blankEmailRes.data.tasks.length, 0, 'Blank email employee must receive 0 tasks, not leak other users tasks');

        const nullEmailRes = await call(9);
        assert.equal(nullEmailRes.status, 200);
        assert.equal(nullEmailRes.data.tasks.length, 0, 'Null email employee must receive 0 tasks, not leak other users tasks');

        // Security check: Employee who created a task assigned to someone else CANNOT view, patch, or delete it
        await client.execute({
            sql: `INSERT INTO tasks (id, organization_id, creator_id, assignee_id, title, description, status, priority, due_date)
                  VALUES ('task_cross_creator', 1, 2, 3, 'Ravi Task Created By Asha', 'Cross assignment test', 'todo', 'low', '2026-12-01')`,
            args: []
        });
        const ashaCrossRes = await call(2);
        assert.ok(!ashaCrossRes.data.tasks.some(t => t.id === 'task_cross_creator'), 'Asha must NOT see task assigned to Ravi even if Asha created it');
        assert.equal((await call(2, '/task_cross_creator', 'PATCH', { status: 'progress' })).status, 404);
        assert.equal((await call(2, '/task_cross_creator', 'DELETE')).status, 404);

        const raviCrossRes = await call(3);
        assert.ok(raviCrossRes.data.tasks.some(t => t.id === 'task_cross_creator'), 'Ravi receives the assigned task');

        // Clean up cross task before Puppeteer suite runs
        await client.execute({ sql: `DELETE FROM tasks WHERE id='task_cross_creator'`, args: [] });

        // 3. Browser UI Testing with Puppeteer
        const puppeteer = require('puppeteer');
        browser = await puppeteer.launch({
            headless: true,
            executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 1000 });
        await page.setRequestInterception(true);
        page.on('request', async request => {
            if (request.url().includes('/api/tasks')) {
                try {
                    const response = await fetch(base + new URL(request.url()).pathname, {
                        method: request.method(),
                        headers: request.headers(),
                        ...(request.postData() ? { body: request.postData() } : {})
                    });
                    await request.respond({
                        status: response.status,
                        contentType: response.headers.get('content-type') || 'application/json',
                        body: Buffer.from(await response.arrayBuffer())
                    });
                } catch {
                    await request.abort();
                }
            } else if (request.url().includes('/api/')) {
                await request.respond({ status: 200, contentType: 'application/json', body: '{}' });
            } else {
                await request.continue();
            }
        });

        await page.goto('http://localhost:5173');

        // ─────────────────────────────────────────────────────────────
        // Test Case A: Asha (Employee) View
        // ─────────────────────────────────────────────────────────────
        await page.evaluate(tokenVal => {
            localStorage.setItem('token', tokenVal);
            localStorage.setItem('currentUser', JSON.stringify({
                id: 2,
                organization_id: 1,
                admin_name: 'Asha Employee',
                email: 'asha@example.test',
                role: 'employee'
            }));
        }, token(2));

        await page.goto('http://localhost:5173/dashboard/tasks');
        await page.waitForSelector('.task-row');

        // Check Left Sidebar header and counts for Asha (Total 3: 1 todo, 2 in progress, 0 overdue, 0 done)
        const sidebarTitleAsha = await page.$eval('.task-side h2', e => e.textContent.trim());
        assert.equal(sidebarTitleAsha, 'My tasks');

        const sidebarCountsAsha = await page.$$eval('.task-side-nav button b', elements => elements.map(e => e.textContent.trim()));
        // Items order: All tasks, To do, In progress, Overdue, Completed
        assert.deepEqual(sidebarCountsAsha, ['3', '1', '2', '0', '0']);

        // Check Top Summary Cards for Asha
        const statCardsAsha = await page.$$eval('.task-stat strong', elements => elements.map(e => e.textContent.trim()));
        // Cards order: Total tasks (3), In progress (2), Overdue (0), Completed (0)
        assert.deepEqual(statCardsAsha, ['3', '2', '0', '0']);

        // Check Overview Badge count
        const overviewBadgeAsha = await page.$eval('.task-board-heading h2 span', e => e.textContent.trim());
        assert.equal(overviewBadgeAsha, '3');

        // Check Assigned to Filter Dropdown for Employee: MUST BE DISABLED and NO "Everyone" option
        const isAssigneeSelectDisabledAsha = await page.$eval('select[aria-label="Filter by assignee"]', e => e.disabled);
        assert.equal(isAssigneeSelectDisabledAsha, true);

        const assigneeOptionsAsha = await page.$$eval('select[aria-label="Filter by assignee"] option', elements => elements.map(e => e.textContent.trim()));
        assert.ok(!assigneeOptionsAsha.includes('Everyone'), 'Employee view must NOT contain Everyone option');
        assert.ok(assigneeOptionsAsha.some(opt => opt.includes('Asha')), 'Employee dropdown must show employee name');

        // Verify that only Asha's tasks are in the rendered task list
        const renderedTaskTitlesAsha = await page.$$eval('.task-title', elements => elements.map(e => e.textContent.trim()));
        assert.equal(renderedTaskTitlesAsha.length, 3);
        assert.ok(renderedTaskTitlesAsha.includes("Asha's Task 1"));
        assert.ok(renderedTaskTitlesAsha.includes("Asha's Task 2"));
        assert.ok(renderedTaskTitlesAsha.includes("Asha's Self-Created Task 6"));
        assert.ok(!renderedTaskTitlesAsha.some(t => t.includes('Ravi') || t.includes('Maya')));

        // ─────────────────────────────────────────────────────────────
        // Test Case B: Ravi (Employee) View
        // ─────────────────────────────────────────────────────────────
        await page.evaluate(tokenVal => {
            localStorage.setItem('token', tokenVal);
            localStorage.setItem('currentUser', JSON.stringify({
                id: 3,
                organization_id: 1,
                admin_name: 'Ravi Employee',
                email: 'ravi@example.test',
                role: 'employee'
            }));
        }, token(3));

        await page.reload();
        await page.waitForSelector('.task-row');

        // Check Left Sidebar header and counts for Ravi (Total 2: 1 todo, 0 in progress, 1 overdue, 1 done)
        const sidebarTitleRavi = await page.$eval('.task-side h2', e => e.textContent.trim());
        assert.equal(sidebarTitleRavi, 'My tasks');

        const sidebarCountsRavi = await page.$$eval('.task-side-nav button b', elements => elements.map(e => e.textContent.trim()));
        assert.deepEqual(sidebarCountsRavi, ['2', '1', '0', '1', '1']);

        // Check Top Summary Cards for Ravi
        const statCardsRavi = await page.$$eval('.task-stat strong', elements => elements.map(e => e.textContent.trim()));
        assert.deepEqual(statCardsRavi, ['2', '0', '1', '1']);

        // Check Overview Badge count
        const overviewBadgeRavi = await page.$eval('.task-board-heading h2 span', e => e.textContent.trim());
        assert.equal(overviewBadgeRavi, '2');

        // Check Assigned to Filter Dropdown for Ravi: DISABLED and locked
        const isAssigneeSelectDisabledRavi = await page.$eval('select[aria-label="Filter by assignee"]', e => e.disabled);
        assert.equal(isAssigneeSelectDisabledRavi, true);

        // Verify only Ravi's tasks rendered
        const renderedTaskTitlesRavi = await page.$$eval('.task-title', elements => elements.map(e => e.textContent.trim()));
        assert.equal(renderedTaskTitlesRavi.length, 2);
        assert.ok(renderedTaskTitlesRavi.includes("Ravi's Task 3"));
        assert.ok(renderedTaskTitlesRavi.includes("Ravi's Task 4 Overdue"));
        assert.ok(!renderedTaskTitlesRavi.some(t => t.includes('Asha') || t.includes('Maya')));

        // ─────────────────────────────────────────────────────────────
        // Test Case C: Owner (Admin/Org Owner) View
        // ─────────────────────────────────────────────────────────────
        await page.evaluate(tokenVal => {
            localStorage.setItem('token', tokenVal);
            localStorage.setItem('currentUser', JSON.stringify({
                id: 1,
                organization_id: 1,
                admin_name: 'Owner User',
                email: 'owner@example.test',
                role: 'org_owner'
            }));
        }, token(1));

        await page.reload();
        await page.waitForSelector('.task-row');

        // Left sidebar for Owner
        const sidebarTitleOwner = await page.$eval('.task-side h2', e => e.textContent.trim());
        assert.equal(sidebarTitleOwner, 'Team tasks');

        const sidebarCountsOwner = await page.$$eval('.task-side-nav button b', elements => elements.map(e => e.textContent.trim()));
        // All tasks count should be 6
        assert.equal(sidebarCountsOwner[0], '6');

        // Top Summary Cards for Owner
        const totalCardsOwner = await page.$eval('.task-stat.all strong', e => e.textContent.trim());
        assert.equal(totalCardsOwner, '6');

        // Overview Badge
        const overviewBadgeOwner = await page.$eval('.task-board-heading h2 span', e => e.textContent.trim());
        assert.equal(overviewBadgeOwner, '6');

        // Assigned to Filter Dropdown for Owner: ENABLED and has "Everyone"
        const isAssigneeSelectDisabledOwner = await page.$eval('select[aria-label="Filter by assignee"]', e => e.disabled);
        assert.equal(isAssigneeSelectDisabledOwner, false);

        const assigneeOptionsOwner = await page.$$eval('select[aria-label="Filter by assignee"] option', elements => elements.map(e => e.textContent.trim()));
        assert.ok(assigneeOptionsOwner.includes('Everyone'), 'Owner view MUST contain Everyone option');

        // All 6 tasks are visible initially
        const renderedTaskTitlesOwner = await page.$$eval('.task-title', elements => elements.map(e => e.textContent.trim()));
        assert.equal(renderedTaskTitlesOwner.length, 6);

        // Filter by Asha (2)
        await page.select('select[aria-label="Filter by assignee"]', '2');
        await page.waitForFunction(() => document.querySelectorAll('.task-row').length === 3);
        const filteredToAsha = await page.$$eval('.task-title', elements => elements.map(e => e.textContent.trim()));
        assert.equal(filteredToAsha.length, 3);
        assert.ok(filteredToAsha.every(t => t.includes('Asha')));

        // Filter back to Everyone
        await page.select('select[aria-label="Filter by assignee"]', 'all');
        await page.waitForFunction(() => document.querySelectorAll('.task-row').length === 6);

        // ─────────────────────────────────────────────────────────────
        // Test Case D: Admin View
        // ─────────────────────────────────────────────────────────────
        await page.evaluate(tokenVal => {
            localStorage.setItem('token', tokenVal);
            localStorage.setItem('currentUser', JSON.stringify({
                id: 5,
                organization_id: 1,
                admin_name: 'Admin User',
                email: 'admin@example.test',
                role: 'admin'
            }));
        }, token(5));

        await page.reload();
        await page.waitForSelector('.task-row');

        // Admin should see Team tasks
        const sidebarTitleAdmin = await page.$eval('.task-side h2', e => e.textContent.trim());
        assert.equal(sidebarTitleAdmin, 'Team tasks');

        const sidebarCountsAdmin = await page.$$eval('.task-side-nav button b', elements => elements.map(e => e.textContent.trim()));
        assert.equal(sidebarCountsAdmin[0], '6');

        const isAssigneeSelectDisabledAdmin = await page.$eval('select[aria-label="Filter by assignee"]', e => e.disabled);
        assert.equal(isAssigneeSelectDisabledAdmin, false);

        const renderedTaskTitlesAdmin = await page.$$eval('.task-title', elements => elements.map(e => e.textContent.trim()));
        assert.equal(renderedTaskTitlesAdmin.length, 6);

    } finally {
        if (browser) await browser.close();
        await new Promise(r => server.close(r));
        client.close();
    }
});
