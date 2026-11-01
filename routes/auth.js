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
        res.json({ user: {
            id: user.id, organization_id: user.organization_id, email: user.email,
            admin_name: user.admin_name, role: user.role, tokenVersion: user.tokenVersion,
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

