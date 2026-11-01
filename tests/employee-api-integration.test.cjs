const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { db } = require('../db');
const emailRoutes = require('../routes/emails');
const syncRoutes = require('../routes/sync');

test('GET /api/emails scopes data strictly to the specified employee email or ID', async () => {
    const app = express();
    app.use(express.json());
    // Attach dummy user context for tests
    app.use((req, res, next) => {
        req.user = { id: 1, email: 'singhrahuldrill@gmail.com', organization_id: 1, role: 'org_owner' };
        req.headers['x-user-id'] = '1';
        req.headers['x-org-id'] = '1';
        next();
    });
    app.use('/api/emails', emailRoutes);
    app.use('/api/sync', syncRoutes);

    const server = app.listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;

    try {
        // 1. Query with an employee email that has no emails (e.g. newly added employee)
        const resEmpty = await fetch(`${base}/api/emails?employeeEmail=unregistered.emp@safemailz.com`, {
            headers: { 'x-user-id': '1', 'x-org-id': '1' }
        });
        assert.equal(resEmpty.status, 200);
        const dataEmpty = await resEmpty.json();
        assert.equal(dataEmpty.success, true);
        assert.equal(dataEmpty.emails.length, 0, 'Must return 0 emails for employee with no emails');
        assert.equal(dataEmpty.counts.inbox, 0, 'Inbox count must be 0');

        // 2. Query with ?email= parameter format
        const resEmailParam = await fetch(`${base}/api/emails?email=unregistered.emp@safemailz.com`, {
            headers: { 'x-user-id': '1', 'x-org-id': '1' }
        });
        assert.equal(resEmailParam.status, 200);
        const dataEmailParam = await resEmailParam.json();
        assert.equal(dataEmailParam.success, true);
        assert.equal(dataEmailParam.emails.length, 0);

        // 3. Query with ?employeeEmail= empty string (must NOT leak admin emails)
        const resBlankEmail = await fetch(`${base}/api/emails?employeeEmail=`, {
            headers: { 'x-user-id': '1', 'x-org-id': '1' }
        });
        assert.equal(resBlankEmail.status, 200);
        const dataBlankEmail = await resBlankEmail.json();
        assert.equal(dataBlankEmail.success, true);
        assert.equal(dataBlankEmail.emails.length, 0, 'Empty employee email parameter must return 0 emails');

        // 4. Query with ?employeeId=1 when admin caller has ID 1 (must treat as seat 1 and NOT leak admin emails)
        const resSeat1 = await fetch(`${base}/api/emails?employeeId=1&employeeEmail=unregistered.emp@safemailz.com`, {
            headers: { 'x-user-id': '1', 'x-org-id': '1' }
        });
        assert.equal(resSeat1.status, 200);
        const dataSeat1 = await resSeat1.json();
        assert.equal(dataSeat1.success, true);
        assert.equal(dataSeat1.emails.length, 0);

        // 5. Query with folder parameter (?folder=drafts)
        const resFolder = await fetch(`${base}/api/emails?folder=drafts&employeeEmail=unregistered.emp@safemailz.com`, {
            headers: { 'x-user-id': '1', 'x-org-id': '1' }
        });
        assert.equal(resFolder.status, 200);
        const dataFolder = await resFolder.json();
        assert.equal(dataFolder.success, true);
        assert.equal(dataFolder.filter, 'drafts');

        // 6. Test sync endpoint with unregistered employee (must not sync admin account)
        const resSync = await fetch(`${base}/api/sync/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': '1', 'x-org-id': '1' },
            body: JSON.stringify({ email: 'unregistered.emp@safemailz.com', employeeId: 9999 })
        });
        assert.equal(resSync.status, 200);
        const dataSync = await resSync.json();
        assert.equal(dataSync.isSynced, false);

        // 7. Ensure that querying without employee scoping still works for the admin
        const resAdmin = await fetch(`${base}/api/emails`, {
            headers: { 'x-user-id': '1', 'x-org-id': '1' }
        });
        assert.equal(resAdmin.status, 200);
        const dataAdmin = await resAdmin.json();
        assert.equal(dataAdmin.success, true);
    } finally {
        server.close();
    }
});
