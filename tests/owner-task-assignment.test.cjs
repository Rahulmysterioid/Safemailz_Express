const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { createClient } = require('@libsql/client');
const { createTasksRouter } = require('../routes/tasks');

test('owner can assign tasks to employees and pending invitees across role variants', async () => {
    const client = createClient({ url: ':memory:' });
    await client.batch([
        `CREATE TABLE users(
            id INTEGER PRIMARY KEY,
            organization_id INTEGER,
            admin_name TEXT,
            email TEXT,
            role TEXT,
            perm_make_admin INTEGER DEFAULT 0,
            perm_add_employees INTEGER DEFAULT 0,
            perm_manage_projects INTEGER DEFAULT 0,
            is_blocked INTEGER DEFAULT 0,
            tokenVersion INTEGER DEFAULT 0
        )`,
        `CREATE TABLE invitations(
            id INTEGER PRIMARY KEY,
            organization_id INTEGER,
            email TEXT,
            status TEXT
        )`,
        `INSERT INTO users(id, organization_id, admin_name, email, role, perm_add_employees, perm_manage_projects, perm_make_admin) VALUES
            (1, 1, 'Rahul Singh OrgOwner', 'rahul.indianshelf99@gmail.com', 'org_owner', 1, 1, 1),
            (2, 1, 'Owner Alias User', 'owner-alias@example.test', 'owner', 1, 1, 1),
            (3, 1, 'Org Owner Spaced', 'spaced@example.test', 'org owner', 1, 1, 1),
            (4, 1, 'Permission Admin', 'perm@example.test', 'employee', 1, 0, 1),
            (5, 1, 'Org Owner Kebab', 'kebab@example.test', 'org-owner', 1, 1, 1),
            (6, 1, 'Super Admin User', 'super@example.test', 'super-admin', 1, 1, 1),
            (10, 1, 'Dev Employee', 'dev@example.test', 'employee', 0, 0, 0),
            (11, 1, 'Blocked Dev', 'blocked@example.test', 'employee', 0, 0, 0),
            (20, 2, 'Other Org Employee', 'other@example.test', 'employee', 0, 0, 0)`,
        `UPDATE users SET is_blocked = 1 WHERE id = 11`,
        `INSERT INTO invitations(id, organization_id, email, status) VALUES
            (101, 1, 'invitee@example.test', 'pending'),
            (102, 2, 'other-invitee@example.test', 'pending')`
    ], 'write');

    const secret = 'owner-task-assignment-secret';
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

    try {
        // 1. Rahul Singh (org_owner, id 1) checks /api/tasks
        const rahulRes = await call(1);
        assert.equal(rahulRes.status, 200);
        assert.equal(rahulRes.data.canAssign, true);
        assert.equal(rahulRes.data.currentUserId, '1');

        // Check assignees contains Rahul himself, dev employees, other owners/admins, and pending invitees from org 1
        const assigneeIds = rahulRes.data.assignees.map(a => String(a.id));
        assert.ok(assigneeIds.includes('1'), 'Rahul (Me) should be present');
        assert.ok(assigneeIds.includes('2'), 'Co-owner 2 should be present for org owner');
        assert.ok(assigneeIds.includes('3'), 'Co-owner 3 should be present for org owner');
        assert.ok(assigneeIds.includes('5'), 'Co-owner 5 (kebab) should be present for org owner');
        assert.ok(assigneeIds.includes('6'), 'Super admin 6 should be present for org owner');
        assert.ok(assigneeIds.includes('10'), 'Employee 10 should be present');
        assert.ok(assigneeIds.includes('11'), 'Blocked employee 11 should be present');
        assert.ok(assigneeIds.includes('invite_101'), 'Pending invitee 101 should be present');
        assert.ok(!assigneeIds.includes('20'), 'Other org employee should not be present');
        assert.ok(!assigneeIds.includes('invite_102'), 'Other org invitee should not be present');

        // 2. Owner Alias (role 'owner', id 2) has canAssign = true
        const aliasRes = await call(2);
        assert.equal(aliasRes.status, 200);
        assert.equal(aliasRes.data.canAssign, true);

        // 3. Spaced role ('org owner', id 3) has canAssign = true
        const spacedRes = await call(3);
        assert.equal(spacedRes.status, 200);
        assert.equal(spacedRes.data.canAssign, true);

        // 4. Kebab role ('org-owner', id 5) has canAssign = true
        const kebabRes = await call(5);
        assert.equal(kebabRes.status, 200);
        assert.equal(kebabRes.data.canAssign, true);

        // 5. Super admin ('super-admin', id 6) has canAssign = true
        const superRes = await call(6);
        assert.equal(superRes.status, 200);
        assert.equal(superRes.data.canAssign, true);

        // 6. Admin with perm_make_admin = 1 has canAssign = true, but cannot assign to org owners
        const permRes = await call(4);
        assert.equal(permRes.status, 200);
        assert.equal(permRes.data.canAssign, true);
        const adminAssigneeIds = permRes.data.assignees.map(a => String(a.id));
        assert.ok(!adminAssigneeIds.includes('1'), 'Admin cannot assign to Org Owner 1');
        assert.ok(!adminAssigneeIds.includes('2'), 'Admin cannot assign to Owner 2');
        assert.ok(adminAssigneeIds.includes('10'), 'Admin can assign to Employee 10');

        // 7. Standard employee (id 10) has canAssign = false
        const empRes = await call(10);
        assert.equal(empRes.status, 200);
        assert.equal(empRes.data.canAssign, false);
        assert.equal(empRes.data.assignees.length, 1);
        assert.equal(String(empRes.data.assignees[0].id), '10');

        // 6. Rahul assigns task to employee 10
        const taskForEmp = await call(1, '', 'POST', {
            title: 'Deploy production release',
            description: 'Execute deployment checklist',
            status: 'todo',
            priority: 'high',
            dueDate: '2026-11-10',
            assigneeId: '10'
        });
        assert.equal(taskForEmp.status, 201);
        assert.equal(taskForEmp.data.task.assigneeId, '10');
        assert.equal(taskForEmp.data.task.canManage, true);

        // 7. Rahul assigns task to co-owner 2
        const taskForCoOwner = await call(1, '', 'POST', {
            title: 'Executive alignment',
            description: 'Q4 strategic targets',
            status: 'todo',
            priority: 'high',
            dueDate: '2026-11-12',
            assigneeId: '2'
        });
        assert.equal(taskForCoOwner.status, 201);
        assert.equal(taskForCoOwner.data.task.assigneeId, '2');

        // 8. Rahul assigns task to pending invitee 101
        const taskForPending = await call(1, '', 'POST', {
            title: 'Onboarding walkthrough',
            description: 'Setup local workspace',
            status: 'todo',
            priority: 'medium',
            dueDate: '2026-11-15',
            assigneeId: 'invite_101'
        });
        assert.equal(taskForPending.status, 201);
        assert.equal(taskForPending.data.task.assigneeId, 'invite_101');
        assert.equal(taskForPending.data.task.assigneePending, true);

        // 8. Rahul cannot assign task to blocked employee 11
        const taskForBlocked = await call(1, '', 'POST', {
            title: 'Task for blocked account',
            description: 'Should fail',
            status: 'todo',
            priority: 'low',
            dueDate: '2026-11-20',
            assigneeId: '11'
        });
        assert.equal(taskForBlocked.status, 403);

        // 9. Employee 10 sees the assigned task and updates status
        const empTasks = await call(10);
        assert.equal(empTasks.status, 200);
        assert.equal(empTasks.data.tasks.length, 1);
        assert.equal(empTasks.data.tasks[0].id, taskForEmp.data.task.id);
        assert.equal(empTasks.data.tasks[0].canManage, false);

        const updateRes = await call(10, '/' + taskForEmp.data.task.id, 'PATCH', { status: 'progress' });
        assert.equal(updateRes.status, 200);
        assert.equal(updateRes.data.task.status, 'progress');

        // 10. Employee 10 cannot assign tasks to someone else
        const unauthorizedAssign = await call(10, '', 'POST', {
            title: 'Employee unauthorized assign',
            description: 'Should fail',
            status: 'todo',
            priority: 'low',
            dueDate: '2026-11-20',
            assigneeId: '1'
        });
        assert.equal(unauthorizedAssign.status, 403);

    } finally {
        await new Promise(r => server.close(r));
        client.close();
    }
});
