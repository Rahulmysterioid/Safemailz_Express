const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { initDb, db, client } = require('../db');
const authRoutes = require('../routes/auth');
const inviteRoutes = require('../routes/invite');
const settingsRoutes = require('../routes/settings');

test('Invite, signup onboarding, signin, and profile persistence flow', async () => {
    initDb();

    // Ensure users table and invitations table are initialized
    await new Promise(resolve => setTimeout(resolve, 500));

    const app = express();
    app.use(express.json());

    // Setup routes
    app.use('/api', authRoutes);
    app.use('/api/invite', inviteRoutes);
    app.use('/api/settings', settingsRoutes);
    app.use('/api/employees', settingsRoutes);

    const server = app.listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();
    const testEmail = `invited.emp.${timestamp}@safemailz-test.com`;
    let authToken = '';
    let userId = null;
    let inviteToken = '';

    try {
        // Step 1: Create an invitation with first_name and last_name (simulating admin invite)
        const sendInviteRes = await fetch(`${base}/api/invite/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': '1',
                'x-org-id': '1'
            },
            body: JSON.stringify({
                email: testEmail,
                firstName: 'Alice',
                lastName: 'Wonderland',
                role: 'employee',
                organizationId: 1
            })
        });
        const sendInviteData = await sendInviteRes.json();
        assert.equal(sendInviteRes.status, 200);
        assert.equal(sendInviteData.success, true);

        // Fetch token from DB
        const inviteRow = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM invitations WHERE email = ? ORDER BY id DESC LIMIT 1', [testEmail], (err, row) => {
                if (err) reject(err); else resolve(row);
            });
        });
        assert.ok(inviteRow, 'Invitation row must exist');
        assert.equal(inviteRow.first_name, 'Alice');
        assert.equal(inviteRow.last_name, 'Wonderland');
        inviteToken = inviteRow.token;

        // Step 2: Verify invite token returns firstName and lastName
        const verifyRes = await fetch(`${base}/api/invite/verify/${inviteToken}`);
        const verifyData = await verifyRes.json();
        assert.equal(verifyRes.status, 200);
        assert.equal(verifyData.email, testEmail);
        assert.equal(verifyData.firstName, 'Alice');
        assert.equal(verifyData.lastName, 'Wonderland');

        // Step 3: Complete onboarding signup
        const signupRes = await fetch(`${base}/api/invite/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: inviteToken,
                fullName: 'Alice Wonderland',
                password: 'TestPassword123!',
                dob: '1996-08-20',
                workMode: 'Hybrid',
                workLocation: 'Seattle, WA',
                bio: 'Backend & Cloud Engineer',
                workDays: ['M', 'T', 'W', 'T', 'F']
            })
        });
        const signupData = await signupRes.json();
        assert.equal(signupRes.status, 201);
        assert.ok(signupData.token, 'Signup must return JWT token');
        assert.ok(signupData.user, 'Signup must return user object');
        assert.equal(signupData.user.first_name, 'Alice');
        assert.equal(signupData.user.last_name, 'Wonderland');
        assert.equal(signupData.user.dob, '1996-08-20');
        assert.equal(signupData.user.workMode, 'Hybrid');
        assert.equal(signupData.user.workLocation, 'Seattle, WA');
        assert.equal(signupData.user.bio, 'Backend & Cloud Engineer');
        assert.deepEqual(signupData.user.workDays, ['M', 'T', 'W', 'T', 'F']);
        userId = signupData.user.id;

        // Step 4: Sign in with the newly registered user
        const signinRes = await fetch(`${base}/api/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                password: 'TestPassword123!'
            })
        });
        const signinData = await signinRes.json();
        assert.equal(signinRes.status, 200);
        assert.ok(signinData.token, 'Signin must return token');
        authToken = signinData.token;

        const loggedInUser = signinData.user;
        assert.equal(loggedInUser.email, testEmail);
        assert.equal(loggedInUser.first_name, 'Alice');
        assert.equal(loggedInUser.last_name, 'Wonderland');
        assert.equal(loggedInUser.dob, '1996-08-20');
        assert.equal(loggedInUser.workMode, 'Hybrid');
        assert.equal(loggedInUser.workLocation, 'Seattle, WA');
        assert.equal(loggedInUser.bio, 'Backend & Cloud Engineer');
        assert.deepEqual(loggedInUser.workDays, ['M', 'T', 'W', 'T', 'F']);

        // Step 5: Check account-session endpoint
        const sessionRes = await fetch(`${base}/api/account-session`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const sessionData = await sessionRes.json();
        assert.equal(sessionRes.status, 200);
        assert.equal(sessionData.user.first_name, 'Alice');
        assert.equal(sessionData.user.last_name, 'Wonderland');
        assert.equal(sessionData.user.dob, '1996-08-20');
        assert.equal(sessionData.user.workMode, 'Hybrid');
        assert.equal(sessionData.user.workLocation, 'Seattle, WA');
        assert.equal(sessionData.user.bio, 'Backend & Cloud Engineer');
        assert.deepEqual(sessionData.user.workDays, ['M', 'T', 'W', 'T', 'F']);

        // Step 6: Check GET /api/settings/profile
        const profileRes = await fetch(`${base}/api/settings/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'x-user-id': String(userId)
            }
        });
        const profileData = await profileRes.json();
        assert.equal(profileRes.status, 200);
        assert.equal(profileData.profile.user.first_name, 'Alice');
        assert.equal(profileData.profile.user.last_name, 'Wonderland');
        assert.equal(profileData.profile.user.dob, '1996-08-20');
        assert.equal(profileData.profile.user.work_mode, 'Hybrid');
        assert.equal(profileData.profile.user.work_location, 'Seattle, WA');
        assert.equal(profileData.profile.user.bio, 'Backend & Cloud Engineer');
        assert.deepEqual(profileData.profile.user.work_days, ['M', 'T', 'W', 'T', 'F']);

        // Step 7: Check GET /api/settings/employees
        const employeesRes = await fetch(`${base}/api/settings/employees`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'x-user-id': String(userId),
                'x-org-id': '1'
            }
        });
        const employeesData = await employeesRes.json();
        assert.equal(employeesRes.status, 200);
        const emp = employeesData.employees.find(e => e.email === testEmail);
        assert.ok(emp, 'Employee must be present in employees list');
        assert.equal(emp.firstName, 'Alice');
        assert.equal(emp.lastName, 'Wonderland');
        assert.equal(emp.dob, '1996-08-20');
        assert.equal(emp.workMode, 'Hybrid');
        assert.equal(emp.workLocation, 'Seattle, WA');
        assert.equal(emp.bio, 'Backend & Cloud Engineer');
        assert.deepEqual(emp.workDays, ['M', 'T', 'W', 'T', 'F']);

        // Step 8: Update employee profile via API
        const updateRes = await fetch(`${base}/api/settings/employee/${userId}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'x-user-id': String(userId)
            },
            body: JSON.stringify({
                workMode: 'Remote',
                workLocation: 'Vancouver, Canada',
                bio: 'Lead Distributed Systems Architect',
                dob: '1996-08-20',
                workDays: ['M', 'W', 'F']
            })
        });
        const updateData = await updateRes.json();
        assert.equal(updateRes.status, 200);
        assert.equal(updateData.success, true);
        assert.equal(updateData.profile.workMode, 'Remote');
        assert.equal(updateData.profile.workLocation, 'Vancouver, Canada');
        assert.equal(updateData.profile.bio, 'Lead Distributed Systems Architect');

        // Verify update persisted in DB
        const verifyDbRow = await new Promise((resolve, reject) => {
            db.get('SELECT work_mode, work_location, bio FROM users WHERE id = ?', [userId], (err, row) => {
                if (err) reject(err); else resolve(row);
            });
        });
        assert.equal(verifyDbRow.work_mode, 'Remote');
        assert.equal(verifyDbRow.work_location, 'Vancouver, Canada');
        assert.equal(verifyDbRow.bio, 'Lead Distributed Systems Architect');

    } finally {
        // Cleanup test data
        if (userId) {
            await new Promise(r => db.run('DELETE FROM users WHERE id = ?', [userId], r));
        }
        await new Promise(r => db.run('DELETE FROM invitations WHERE email = ?', [testEmail], r));
        await new Promise(r => server.close(r));
    }
});
