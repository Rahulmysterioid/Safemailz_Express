const { db } = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'safemailz-jwt-secret-key';

const signup = async (req, res) => {
    const {
        organization_name,
        admin_name,
        email,
        password,
        organization_size,
        backup_email,
        terms_accepted,
        marketing_opt_in
    } = req.body;

    // 1. Basic validation
    if (!organization_name || !admin_name || !email || !password || !organization_size) {
        return res.status(400).json({ error: 'Please fill in all required fields.' });
    }

    if (!terms_accepted) {
        return res.status(400).json({ error: 'You must accept the Terms of Service and Privacy Policy.' });
    }

    // 2. Validate email format (simple regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (backup_email && !emailRegex.test(backup_email)) {
        return res.status(400).json({ error: 'Please enter a valid backup email address.' });
    }

    try {
        const util = require('util');
        const dbGet = util.promisify(db.get.bind(db));
        const dbRun = (query, params = []) => new Promise((resolve, reject) => {
            db.run(query, params, function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        // 3. Check if email already exists
        const row = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
        if (row) {
            return res.status(400).json({ error: 'An account with this email already exists.' });
        }

        // 4. Hash the password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // 5. Insert organization and user within a transaction-like approach
        try {
            await dbRun('BEGIN TRANSACTION');

            const orgResult = await dbRun(
                `INSERT INTO organizations (organization_name, organization_size, backup_email) VALUES (?, ?, ?)`,
                [organization_name, organization_size, backup_email || null]
            );
            const organization_id = orgResult.lastID;

            const syncController = require('./syncController');
            const pending = syncController.pendingAuth.get(email);

            let sync_provider = null;
            let sync_access_token = null;
            let sync_refresh_token = null;
            let sync_token_expires_at = null;

            if (pending) {
                sync_provider = pending.provider;
                sync_access_token = pending.access_token;
                sync_refresh_token = pending.refresh_token;
                sync_token_expires_at = pending.expires_at;
                syncController.pendingAuth.delete(email);
            }

            await dbRun(
                `INSERT INTO users (organization_id, admin_name, email, password_hash, marketing_opt_in, terms_accepted, role, perm_add_employees, perm_create_projects, perm_manage_projects, perm_make_admin, perm_delete_project, sync_provider, sync_access_token, sync_refresh_token, sync_token_expires_at) VALUES (?, ?, ?, ?, ?, ?, 'org_owner', 1, 1, 1, 1, 1, ?, ?, ?, ?)`,
                [organization_id, admin_name, email, password_hash, marketing_opt_in ? 1 : 0, terms_accepted ? 1 : 0, sync_provider, sync_access_token, sync_refresh_token, sync_token_expires_at]
            );

            await dbRun('COMMIT');

            return res.status(201).json({
                message: 'Account created successfully.',
                redirectUrl: 'success.html'
            });
        } catch (txnError) {
            console.error('Transaction error:', txnError);
            await dbRun('ROLLBACK').catch(e => console.error('Rollback failed:', e));
            if (txnError.message && txnError.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'An account with this email already exists.' });
            }
            return res.status(500).json({ error: 'Failed to create account.' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

const signin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const util = require('util');
        const dbGet = util.promisify(db.get.bind(db));

        const user = await dbGet('SELECT * FROM users WHERE email = ? OR admin_name = ?', [email, email]);

        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        if (user.is_blocked) {
            return res.status(403).json({ success: false, message: 'You are blocked. Please contact your admin.', error: 'You are blocked. Please contact your admin.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        const mustChangePassword = Boolean(user.mustChangePassword || user.must_change_password);
        const tokenVersion = user.tokenVersion !== undefined ? user.tokenVersion : (user.token_version !== undefined ? user.token_version : 0);

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                organization_id: user.organization_id,
                tokenVersion: tokenVersion
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const userPayload = {
            id: user.id,
            organization_id: user.organization_id,
            email: user.email,
            admin_name: user.admin_name,
            role: user.role,
            mustChangePassword: mustChangePassword,
            tokenVersion: tokenVersion,
            subscription_status: user.subscription_status || 'active',
            permissions: {
                addEmployees: user.perm_add_employees == 1 || user.perm_add_employees === true || String(user.perm_add_employees).toLowerCase() === 'true',
                createProjects: user.perm_create_projects == 1 || user.perm_create_projects === true || String(user.perm_create_projects).toLowerCase() === 'true',
                manageProjects: user.perm_manage_projects == 1 || user.perm_manage_projects === true || String(user.perm_manage_projects).toLowerCase() === 'true',
                makeAdmin: user.perm_make_admin == 1 || user.perm_make_admin === true || String(user.perm_make_admin).toLowerCase() === 'true',
                deleteProject: user.perm_delete_project == 1 || user.perm_delete_project === true || String(user.perm_delete_project).toLowerCase() === 'true',
                canSendEmails: user.canSendEmails === null ? true : (user.canSendEmails == 1 || user.canSendEmails === true || String(user.canSendEmails).toLowerCase() === 'true'),
                canReplyToEmails: user.canReplyToEmails === null ? true : (user.canReplyToEmails == 1 || user.canReplyToEmails === true || String(user.canReplyToEmails).toLowerCase() === 'true')
            }
        };

        if (mustChangePassword) {
            return res.status(200).json({
                message: 'Password change required',
                mustChangePassword: true,
                redirectUrl: '/force-change-password',
                token,
                user: userPayload
            });
        }

        return res.status(200).json({
            message: 'Login successful.',
            redirectUrl: 'dashboard.html',
            token,
            mustChangePassword: false,
            user: userPayload
        });
    } catch (error) {
        console.error('Signin error:', error);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }
};


const signinGoogle = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    try {
        const util = require('util');
        const dbGet = util.promisify(db.get.bind(db));

        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

        if (!user) {
            return res.status(404).json({ error: 'No account found with this Google email. Please sign up first.' });
        }

        if (user.is_blocked) {
            return res.status(403).json({ success: false, message: 'You are blocked. Please contact your admin.', error: 'You are blocked. Please contact your admin.' });
        }

        const syncController = require('./syncController');
        const pending = syncController.pendingAuth.get(email);

        if (pending) {
            const dbRun = util.promisify(db.run.bind(db));
            await dbRun(
                `UPDATE users SET sync_provider = ?, sync_access_token = ?, sync_refresh_token = ?, sync_token_expires_at = ? WHERE id = ?`,
                [pending.provider, pending.access_token, pending.refresh_token, pending.expires_at, user.id]
            );
            syncController.pendingAuth.delete(email);

            // Trigger a background sync now that we have tokens
            if (typeof syncController.performSync === 'function') {
                syncController.performSync(user.id).catch(err => console.error('Background sync failed:', err));
            }
        }

        const mustChangePassword = Boolean(user.mustChangePassword || user.must_change_password);
        const tokenVersion = user.tokenVersion !== undefined ? user.tokenVersion : (user.token_version !== undefined ? user.token_version : 0);

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                organization_id: user.organization_id,
                tokenVersion: tokenVersion
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const userPayload = {
            id: user.id,
            organization_id: user.organization_id,
            email: user.email,
            admin_name: user.admin_name,
            role: user.role,
            mustChangePassword: mustChangePassword,
            tokenVersion: tokenVersion,
            subscription_status: user.subscription_status || 'active',
            permissions: {
                addEmployees: user.perm_add_employees == 1 || user.perm_add_employees === true || String(user.perm_add_employees).toLowerCase() === 'true',
                createProjects: user.perm_create_projects == 1 || user.perm_create_projects === true || String(user.perm_create_projects).toLowerCase() === 'true',
                manageProjects: user.perm_manage_projects == 1 || user.perm_manage_projects === true || String(user.perm_manage_projects).toLowerCase() === 'true',
                makeAdmin: user.perm_make_admin == 1 || user.perm_make_admin === true || String(user.perm_make_admin).toLowerCase() === 'true',
                deleteProject: user.perm_delete_project == 1 || user.perm_delete_project === true || String(user.perm_delete_project).toLowerCase() === 'true',
                canSendEmails: user.canSendEmails === null ? true : (user.canSendEmails == 1 || user.canSendEmails === true || String(user.canSendEmails).toLowerCase() === 'true'),
                canReplyToEmails: user.canReplyToEmails === null ? true : (user.canReplyToEmails == 1 || user.canReplyToEmails === true || String(user.canReplyToEmails).toLowerCase() === 'true')
            }
        };

        if (mustChangePassword) {
            return res.status(200).json({
                message: 'Password change required',
                mustChangePassword: true,
                redirectUrl: '/force-change-password',
                token,
                user: userPayload
            });
        }

        return res.status(200).json({
            message: 'Login successful.',
            redirectUrl: 'dashboard.html',
            token,
            mustChangePassword: false,
            user: userPayload
        });
    } catch (error) {
        console.error('Google Signin error:', error);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }
};

const signinMicrosoft = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    try {
        const util = require('util');
        const dbGet = util.promisify(db.get.bind(db));

        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

        if (!user) {
            return res.status(404).json({ error: 'No account found with this Microsoft email. Please sign up first.' });
        }

        if (user.is_blocked) {
            return res.status(403).json({ success: false, message: 'You are blocked. Please contact your admin.', error: 'You are blocked. Please contact your admin.' });
        }

        const syncController = require('./syncController');
        const pending = syncController.pendingAuth.get(email);

        if (pending) {
            const dbRun = util.promisify(db.run.bind(db));
            await dbRun(
                `UPDATE users SET sync_provider = ?, sync_access_token = ?, sync_refresh_token = ?, sync_token_expires_at = ? WHERE id = ?`,
                [pending.provider, pending.access_token, pending.refresh_token, pending.expires_at, user.id]
            );
            syncController.pendingAuth.delete(email);

            // Trigger a background sync now that we have tokens
            if (typeof syncController.performSync === 'function') {
                syncController.performSync(user.id).catch(err => console.error('Background sync failed:', err));
            }
        }

        const mustChangePassword = Boolean(user.mustChangePassword || user.must_change_password);
        const tokenVersion = user.tokenVersion !== undefined ? user.tokenVersion : (user.token_version !== undefined ? user.token_version : 0);

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                organization_id: user.organization_id,
                tokenVersion: tokenVersion
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const userPayload = {
            id: user.id,
            organization_id: user.organization_id,
            email: user.email,
            admin_name: user.admin_name,
            role: user.role,
            mustChangePassword: mustChangePassword,
            tokenVersion: tokenVersion,
            subscription_status: user.subscription_status || 'active',
            permissions: {
                addEmployees: user.perm_add_employees == 1 || user.perm_add_employees === true || String(user.perm_add_employees).toLowerCase() === 'true',
                createProjects: user.perm_create_projects == 1 || user.perm_create_projects === true || String(user.perm_create_projects).toLowerCase() === 'true',
                manageProjects: user.perm_manage_projects == 1 || user.perm_manage_projects === true || String(user.perm_manage_projects).toLowerCase() === 'true',
                makeAdmin: user.perm_make_admin == 1 || user.perm_make_admin === true || String(user.perm_make_admin).toLowerCase() === 'true',
                deleteProject: user.perm_delete_project == 1 || user.perm_delete_project === true || String(user.perm_delete_project).toLowerCase() === 'true',
                canSendEmails: user.canSendEmails === null ? true : (user.canSendEmails == 1 || user.canSendEmails === true || String(user.canSendEmails).toLowerCase() === 'true'),
                canReplyToEmails: user.canReplyToEmails === null ? true : (user.canReplyToEmails == 1 || user.canReplyToEmails === true || String(user.canReplyToEmails).toLowerCase() === 'true')
            }
        };

        if (mustChangePassword) {
            return res.status(200).json({
                message: 'Password change required',
                mustChangePassword: true,
                redirectUrl: '/force-change-password',
                token,
                user: userPayload
            });
        }

        return res.status(200).json({
            message: 'Login successful.',
            redirectUrl: 'dashboard.html',
            token,
            mustChangePassword: false,
            user: userPayload
        });
    } catch (error) {
        console.error('Microsoft Signin error:', error);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }
};

const signupGoogle = async (req, res) => {
    const { email, orgName, adminName, orgSize } = req.body;
    if (!email || !orgName || !adminName || !orgSize) {
        return res.status(400).json({ error: 'Please fill in all required fields.' });
    }
    try {
        const util = require('util');
        const dbGet = util.promisify(db.get.bind(db));
        const dbRun = (query, params = []) => new Promise((resolve, reject) => {
            db.run(query, params, function (err) { if (err) reject(err); else resolve(this); });
        });
        const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) return res.status(400).json({ error: 'An account with this email already exists.' });

        const syncController = require('./syncController');
        const pending = syncController.pendingAuth.get(email);
        let sync_provider = 'google', sync_access_token = null, sync_refresh_token = null, sync_token_expires_at = null;
        if (pending) {
            sync_provider = pending.provider;
            sync_access_token = pending.access_token;
            sync_refresh_token = pending.refresh_token;
            sync_token_expires_at = pending.expires_at;
            syncController.pendingAuth.delete(email);
        }

        const orgResult = await dbRun('INSERT INTO organizations (organization_name, organization_size) VALUES (?, ?)', [orgName, orgSize]);
        const orgId = orgResult.lastID;
        const userResult = await dbRun(
            `INSERT INTO users (organization_id, admin_name, email, password_hash, marketing_opt_in, terms_accepted, role, perm_add_employees, perm_create_projects, perm_manage_projects, perm_make_admin, perm_delete_project, sync_provider, sync_access_token, sync_refresh_token, sync_token_expires_at) VALUES (?, ?, ?, '', 0, 1, 'org_owner', 1, 1, 1, 1, 1, ?, ?, ?, ?)`,
            [orgId, adminName, email, sync_provider, sync_access_token, sync_refresh_token, sync_token_expires_at]
        );
        return res.status(201).json({
            message: 'Account created successfully.',
            user: { id: userResult.lastID, organization_id: orgId, email, admin_name: adminName, role: 'org_owner', permissions: { addEmployees: true, createProjects: true, manageProjects: true, makeAdmin: true, deleteProject: true } }
        });
    } catch (error) {
        console.error('Google Signup error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

const signupMicrosoft = async (req, res) => {
    const { email, orgName, adminName, orgSize } = req.body;
    if (!email || !orgName || !adminName || !orgSize) {
        return res.status(400).json({ error: 'Please fill in all required fields.' });
    }
    try {
        const util = require('util');
        const dbGet = util.promisify(db.get.bind(db));
        const dbRun = (query, params = []) => new Promise((resolve, reject) => {
            db.run(query, params, function (err) { if (err) reject(err); else resolve(this); });
        });
        const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) return res.status(400).json({ error: 'An account with this email already exists.' });

        const syncController = require('./syncController');
        const pending = syncController.pendingAuth.get(email);
        let sync_provider = 'microsoft', sync_access_token = null, sync_refresh_token = null, sync_token_expires_at = null;
        if (pending) {
            sync_provider = pending.provider;
            sync_access_token = pending.access_token;
            sync_refresh_token = pending.refresh_token;
            sync_token_expires_at = pending.expires_at;
            syncController.pendingAuth.delete(email);
        }

        const orgResult = await dbRun('INSERT INTO organizations (organization_name, organization_size) VALUES (?, ?)', [orgName, orgSize]);
        const orgId = orgResult.lastID;
        const userResult = await dbRun(
            `INSERT INTO users (organization_id, admin_name, email, password_hash, marketing_opt_in, terms_accepted, role, perm_add_employees, perm_create_projects, perm_manage_projects, perm_make_admin, perm_delete_project, sync_provider, sync_access_token, sync_refresh_token, sync_token_expires_at) VALUES (?, ?, ?, '', 0, 1, 'org_owner', 1, 1, 1, 1, 1, ?, ?, ?, ?)`,
            [orgId, adminName, email, sync_provider, sync_access_token, sync_refresh_token, sync_token_expires_at]
        );
        return res.status(201).json({
            message: 'Account created successfully.',
            user: { id: userResult.lastID, organization_id: orgId, email, admin_name: adminName, role: 'org_owner', permissions: { addEmployees: true, createProjects: true, manageProjects: true, makeAdmin: true, deleteProject: true } }
        });
    } catch (error) {
        console.error('Microsoft Signup error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

const forceChangePassword = async (req, res) => {
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
        return res.status(400).json({ error: 'New password and confirm password are required.' });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // Verify user identity via JWT token in Authorization header or x-user-id
    let userId = null;
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (authHeader) {
        const tokenStr = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
            ? authHeader.slice(7).trim()
            : String(authHeader).trim();
        try {
            const decoded = jwt.verify(tokenStr, JWT_SECRET);
            userId = decoded.id || decoded.userId;
        } catch (e) {
            try {
                const decoded = jwt.decode(tokenStr);
                if (decoded && (decoded.id || decoded.userId)) {
                    userId = decoded.id || decoded.userId;
                }
            } catch (decodeErr) {}
        }
    }

    if (!userId && req.headers['x-user-id']) {
        userId = req.headers['x-user-id'];
    }

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: missing user credentials.' });
    }

    try {
        const util = require('util');
        const dbGet = util.promisify(db.get.bind(db));
        const dbAll = util.promisify(db.all.bind(db));
        const dbRun = (query, params = []) => new Promise((resolve, reject) => {
            db.run(query, params, function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const saltRounds = 10;
        const password_hash = await bcrypt.hash(newPassword, saltRounds);

        // Inspect existing columns in users table so UPDATE never fails regardless of schema migration status
        const tableInfo = await dbAll('PRAGMA table_info(users)');
        const existingCols = new Set(tableInfo.map(c => c.name));

        const setClauses = ['password_hash = ?'];
        const setParams = [password_hash];

        if (existingCols.has('must_change_password')) {
            setClauses.push('must_change_password = 0');
        }
        if (existingCols.has('mustChangePassword')) {
            setClauses.push('mustChangePassword = 0');
        }
        if (existingCols.has('password_changed_at')) {
            setClauses.push('password_changed_at = CURRENT_TIMESTAMP');
        }
        if (existingCols.has('passwordChangedAt')) {
            setClauses.push('passwordChangedAt = CURRENT_TIMESTAMP');
        }

        await dbRun(
            `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
            [...setParams, userId]
        );

        const tokenVersion = user.tokenVersion !== undefined ? user.tokenVersion : (user.token_version !== undefined ? user.token_version : 0);

        // Issue a fresh JWT token with current tokenVersion
        const freshToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                organization_id: user.organization_id,
                tokenVersion: tokenVersion
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const updatedUser = {
            id: user.id,
            organization_id: user.organization_id,
            email: user.email,
            admin_name: user.admin_name,
            role: user.role,
            mustChangePassword: false,
            tokenVersion: tokenVersion,
            subscription_status: user.subscription_status || 'active',
            permissions: {
                addEmployees: user.perm_add_employees == 1 || user.perm_add_employees === true || String(user.perm_add_employees).toLowerCase() === 'true',
                createProjects: user.perm_create_projects == 1 || user.perm_create_projects === true || String(user.perm_create_projects).toLowerCase() === 'true',
                manageProjects: user.perm_manage_projects == 1 || user.perm_manage_projects === true || String(user.perm_manage_projects).toLowerCase() === 'true',
                makeAdmin: user.perm_make_admin == 1 || user.perm_make_admin === true || String(user.perm_make_admin).toLowerCase() === 'true',
                deleteProject: user.perm_delete_project == 1 || user.perm_delete_project === true || String(user.perm_delete_project).toLowerCase() === 'true',
                canSendEmails: user.canSendEmails === null ? true : (user.canSendEmails == 1 || user.canSendEmails === true || String(user.canSendEmails).toLowerCase() === 'true'),
                canReplyToEmails: user.canReplyToEmails === null ? true : (user.canReplyToEmails == 1 || user.canReplyToEmails === true || String(user.canReplyToEmails).toLowerCase() === 'true')
            }
        };

        return res.status(200).json({
            success: true,
            message: 'Password updated successfully',
            token: freshToken,
            user: updatedUser
        });
    } catch (error) {
        console.error('forceChangePassword error:', error);
        return res.status(500).json({ error: 'Internal server error while updating password.' });
    }
};

module.exports = {
    signup,
    signin,
    signinGoogle,
    signinMicrosoft,
    signupGoogle,
    signupMicrosoft,
    forceChangePassword
};

