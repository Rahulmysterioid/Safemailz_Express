const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { createClient } = require('@libsql/client');
const { createTasksRouter } = require('../routes/tasks');

test('employee role overrides stale manager permissions and excludes other assignees', async () => {
    const db = createClient({ url: ':memory:' });
    await db.batch([
        'CREATE TABLE users(id INTEGER PRIMARY KEY, organization_id INTEGER, admin_name TEXT, email TEXT, role TEXT, perm_make_admin INTEGER DEFAULT 0, is_blocked INTEGER DEFAULT 0)',
        'CREATE TABLE invitations(id INTEGER PRIMARY KEY, organization_id INTEGER, email TEXT, status TEXT)',
        "INSERT INTO users(id,organization_id,admin_name,email,role,perm_make_admin) VALUES (1,1,'Rahul Singh','owner@test.local','org_owner',1),(26,1,'Rahul Singh','employee@test.local','employee',1)",
        "INSERT INTO invitations VALUES (39,1,'tejasv@test.local','pending'),(40,1,'sahil@test.local','pending')"
    ], 'write');
    const app = express(); app.use(express.json()); app.use('/tasks', createTasksRouter(db, 'test-secret'));
    const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
    const call = async (id, path='', method='GET', body) => {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/tasks${path}`, {
            method, headers: { Authorization: `Bearer ${jwt.sign({id}, 'test-secret')}`, 'Content-Type':'application/json' },
            ...(body ? {body:JSON.stringify(body)} : {})
        });
        return {status:response.status, data:await response.json()};
    };
    try {
        const ids=[];
        for (const assigneeId of ['26','1','invite_39','invite_40']) {
            const result=await call(1,'','POST',{title:'Task '+assigneeId,description:'',status:'todo',priority:'medium',dueDate:'',assigneeId});
            assert.equal(result.status,201); ids.push(result.data.task.id);
        }
        const employee=await call(26);
        assert.deepEqual(employee.data.tasks.map(t=>t.id),[ids[0]]);
        assert.equal(employee.data.canAssign,false);
        assert.equal(employee.data.currentUserId,'26');
        assert.equal((await call(1)).data.tasks.length,4);
        for(const id of ids.slice(1)) {
            assert.equal((await call(26,'/'+id,'PATCH',{status:'done'})).status,404);
            assert.equal((await call(26,'/'+id,'DELETE')).status,404);
        }
    } finally { await new Promise(r=>server.close(r)); db.close(); }
});
