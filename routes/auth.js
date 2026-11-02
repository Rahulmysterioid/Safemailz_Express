const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Validate an already-authenticated saved account without creating a new session.
router.get('/account-session', (req, res) => {
    const jwt = require('jsonwebtoken');
    const { db } = require('../db');
    let claims;
    try {
        const token = /^Bearer (.+)$/i.exec(req.headers.authorization || '')?.[1];
        claims = jwt.verify(token || '', process.env.JWT_SECRET || 'safemailz-jwt-secret-key', { algorithms: ['HS256'] });
    } catch { return res.status(401).json({ error: 'Sign in again for this account.' }); }
    db.get('SELECT * FROM users WHERE id = ?', [claims.id], (err, user) => {
        if (err) return res.status(503).json({ error: 'Unable to validate session.' });
        if (!user || Number(claims.tokenVersion ?? 0) !== Number(user.tokenVersion ?? 0)) return res.status(401).json({ error: 'Sign in again for this account.' });
        if (user.is_blocked) return res.status(403).json({ error: 'Account unavailable.' });
        res.set('Cache-Control', 'no-store');
        const names = (user.admin_name || '').split(' ');
        let parsedWorkDays = ['M', 'T', 'W', 'T', 'F', 'S'];
        if (user.work_days) {
            try {
                parsedWorkDays = typeof user.work_days === 'string' ? JSON.parse(user.work_days) : user.work_days;
            } catch (e) {}
        }
        res.json({ user: {
            id: user.id, organization_id: user.organization_id, email: user.email,
            admin_name: user.admin_name,
            name: user.admin_name,
            first_name: user.first_name || names[0] || '',
            last_name: user.last_name || names.slice(1).join(' ') || '',
            firstName: user.first_name || names[0] || '',
            lastName: user.last_name || names.slice(1).join(' ') || '',
            role: user.role,
            dob: user.dob || null,
            workMode: user.work_mode || 'Remote',
            work_mode: user.work_mode || 'Remote',
            workLocation: user.work_location || 'Gilgit Baltistan, Pakistan',
            work_location: user.work_location || 'Gilgit Baltistan, Pakistan',
            bio: user.bio || '',
            workDays: parsedWorkDays,
            work_days: parsedWorkDays,
            tokenVersion: user.tokenVersion,
            mustChangePassword: Boolean(user.mustChangePassword),
            subscription_status: user.subscription_status,
            permissions: {
                addEmployees: user.perm_add_employees === 1, createProjects: user.perm_create_projects === 1,
                manageProjects: user.perm_manage_projects === 1, makeAdmin: user.perm_make_admin === 1,
                deleteProject: user.perm_delete_project === 1,
                canSendEmails: user.canSendEmails == null || user.canSendEmails === 1,
                canReplyToEmails: user.canReplyToEmails == null || user.canReplyToEmails === 1
            }
        } });
    });
});

router.post('/signup', authController.signup);
router.post('/signup/google', authController.signupGoogle);
router.post('/signup/microsoft', authController.signupMicrosoft);
router.post('/signin', authController.signin);
router.post('/signin/google', authController.signinGoogle);
router.post('/signin/microsoft', authController.signinMicrosoft);
router.post('/force-change-password', authController.forceChangePassword);
router.post('/auth/force-change-password', authController.forceChangePassword);

module.exports = router;

