const express = require('express');
const { db } = require('../db');

const router = express.Router();

const getUserContext = (req) => {
    const userId = req.headers['x-user-id'] || req.headers['X-User-Id'] || req.user?.id;
    const orgId = req.headers['x-org-id'] || req.headers['X-Org-Id'] || req.user?.organization_id || req.user?.org_id || 1;
    if (!userId) return null;
    return { userId: parseInt(userId, 10), orgId: parseInt(orgId, 10) };
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const emailOk = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const sanitizeEmails = (input) => {
    let list = [];
    if (Array.isArray(input)) {
        list = input;
    } else if (typeof input === 'string') {
        try {
            const parsed = JSON.parse(input);
            if (Array.isArray(parsed)) list = parsed;
            else list = input.split(/[,;\s]+/);
        } catch (_) {
            list = input.split(/[,;\s]+/);
        }
    }
    const cleaned = list
        .map(normalizeEmail)
        .filter(Boolean);
    return [...new Set(cleaned)];
};

const parseCcList = (value) => {
    if (Array.isArray(value)) {
        return value.map(normalizeEmail).filter(Boolean);
    }
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.map(normalizeEmail).filter(Boolean);
            }
        } catch (_) {
            return value.split(/[,;]+/).map(normalizeEmail).filter(Boolean);
        }
    }
    return [];
};

// GET Settings Handler
const getSettingsHandler = (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    db.get(
        `SELECT is_auto_cc_enabled, auto_cc_emails FROM user_email_settings WHERE user_id = ?`,
        [context.userId],
        (err, row) => {
            if (err) {
                console.error('[AutoCC Settings GET Error]:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (!row) {
                return res.json({
                    success: true,
                    isAutoCcEnabled: false,
                    autoCcEmails: []
                });
            }

            let emails = [];
            try {
                emails = JSON.parse(row.auto_cc_emails);
                if (!Array.isArray(emails)) emails = [];
            } catch (_) {
                emails = sanitizeEmails(row.auto_cc_emails);
            }

            return res.json({
                success: true,
                isAutoCcEnabled: row.is_auto_cc_enabled === 1 || row.is_auto_cc_enabled === true,
                autoCcEmails: emails
            });
        }
    );
};

// PUT Settings Handler
const putSettingsHandler = (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const isAutoCcEnabled = req.body?.isAutoCcEnabled === true || req.body?.isAutoCcEnabled === 1 || req.body?.isAutoCcEnabled === 'true';
    const rawEmails = req.body?.autoCcEmails !== undefined ? req.body.autoCcEmails : [];

    // Validate email syntax
    if (Array.isArray(rawEmails)) {
        for (const item of rawEmails) {
            const trimmed = normalizeEmail(item);
            if (trimmed && !emailOk(trimmed)) {
                return res.status(400).json({ error: `Invalid email address: "${trimmed}"` });
            }
        }
    } else if (typeof rawEmails === 'string' && rawEmails.trim().length > 0) {
        const parts = rawEmails.split(/[,;\s]+/).map(normalizeEmail).filter(Boolean);
        for (const part of parts) {
            if (!emailOk(part)) {
                return res.status(400).json({ error: `Invalid email address: "${part}"` });
            }
        }
    }

    const cleanEmails = sanitizeEmails(rawEmails);
    const emailsJson = JSON.stringify(cleanEmails);
    const enabledNum = isAutoCcEnabled ? 1 : 0;

    db.get('SELECT organization_id FROM users WHERE id = ?', [context.userId], (uErr, userRow) => {
        if (uErr) {
            console.error('[AutoCC Settings User Lookup Error]:', uErr);
            return res.status(500).json({ error: 'Database error' });
        }
        const effectiveOrgId = (userRow && userRow.organization_id) ? userRow.organization_id : (context.orgId || null);

        db.get(
            `SELECT id FROM user_email_settings WHERE user_id = ?`,
            [context.userId],
            (selErr, row) => {
                if (selErr) {
                    console.error('[AutoCC Settings PUT Check Error]:', selErr);
                    return res.status(500).json({ error: 'Database error' });
                }

                if (row) {
                    db.run(
                        `UPDATE user_email_settings 
                         SET is_auto_cc_enabled = ?, auto_cc_emails = ?, organization_id = ?, updated_at = CURRENT_TIMESTAMP
                         WHERE user_id = ?`,
                        [enabledNum, emailsJson, effectiveOrgId, context.userId],
                        (updErr) => {
                            if (updErr) {
                                console.error('[AutoCC Settings Update Error]:', updErr);
                                return res.status(500).json({ error: 'Failed to update email settings' });
                            }
                            res.json({
                                success: true,
                                isAutoCcEnabled: isAutoCcEnabled,
                                autoCcEmails: cleanEmails
                            });
                        }
                    );
                } else {
                    db.run(
                        `INSERT INTO user_email_settings (user_id, organization_id, is_auto_cc_enabled, auto_cc_emails, created_at, updated_at)
                         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                        [context.userId, effectiveOrgId, enabledNum, emailsJson],
                        (insErr) => {
                            if (insErr) {
                                console.error('[AutoCC Settings Insert Error]:', insErr);
                                return res.status(500).json({ error: 'Failed to save email settings' });
                            }
                            res.json({
                                success: true,
                                isAutoCcEnabled: isAutoCcEnabled,
                                autoCcEmails: cleanEmails
                            });
                        }
                    );
                }
            }
        );
    });
};

// Aliases for /settings
router.get('/settings', getSettingsHandler);
router.put('/settings', putSettingsHandler);
router.post('/settings', putSettingsHandler);

// Root routes
router.get('/', (req, res) => {
    // If mounted on a settings path (e.g. /api/email/settings/auto-cc or /api/emails/settings/auto-cc)
    if (req.baseUrl.includes('settings') || req.query.type === 'settings') {
        return getSettingsHandler(req, res);
    }

    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    // When called as GET /api/auto-cc, return settings AND legacy rules for full compatibility
    db.get(
        `SELECT is_auto_cc_enabled, auto_cc_emails FROM user_email_settings WHERE user_id = ?`,
        [context.userId],
        (err, sRow) => {
            const isAutoCcEnabled = sRow ? (sRow.is_auto_cc_enabled === 1 || sRow.is_auto_cc_enabled === true) : false;
            let autoCcEmails = [];
            if (sRow) {
                try {
                    autoCcEmails = JSON.parse(sRow.auto_cc_emails);
                    if (!Array.isArray(autoCcEmails)) autoCcEmails = [];
                } catch (_) {
                    autoCcEmails = sanitizeEmails(sRow.auto_cc_emails);
                }
            }

            db.all(
                `SELECT id, serial_no, to_email, cc_emails, enabled, created_at
                 FROM auto_cc_rules
                 WHERE organization_id = ? AND user_id = ?
                 ORDER BY serial_no ASC, id ASC`,
                [context.orgId, context.userId],
                (rErr, rows) => {
                    const rules = (rows || []).map((row) => ({
                        id: row.id,
                        serialNo: row.serial_no,
                        toEmail: row.to_email,
                        ccEmails: parseCcList(row.cc_emails),
                        enabled: row.enabled === 1 || row.enabled === true,
                        createdAt: row.created_at
                    }));
                    res.json({
                        success: true,
                        isAutoCcEnabled,
                        autoCcEmails,
                        rules
                    });
                }
            );
        }
    );
});

router.put('/', putSettingsHandler);

// POST / handles either settings upsert or legacy rules update
router.post('/', (req, res) => {
    if (req.body?.isAutoCcEnabled !== undefined || req.body?.autoCcEmails !== undefined) {
        return putSettingsHandler(req, res);
    }

    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const incoming = Array.isArray(req.body?.rules) ? req.body.rules : null;
    if (!incoming) return res.status(400).json({ error: 'rules array or auto-cc settings required' });

    const cleaned = [];
    for (let i = 0; i < incoming.length; i++) {
        const rule = incoming[i] || {};
        const toEmail = normalizeEmail(rule.toEmail);
        const ccEmails = parseCcList(rule.ccEmails);
        if (!toEmail || !emailOk(toEmail)) {
            return res.status(400).json({ error: `Rule #${i + 1}: valid To email is required` });
        }
        if (!ccEmails.length) {
            return res.status(400).json({ error: `Rule #${i + 1}: add at least one CC email` });
        }
        for (const cc of ccEmails) {
            if (!emailOk(cc)) {
                return res.status(400).json({ error: `Rule #${i + 1}: invalid CC email "${cc}"` });
            }
        }
        cleaned.push({
            serialNo: i + 1,
            toEmail,
            ccEmails: [...new Set(ccEmails)],
            enabled: rule.enabled !== false
        });
    }

    db.run(
        `DELETE FROM auto_cc_rules WHERE organization_id = ? AND user_id = ?`,
        [context.orgId, context.userId],
        (delErr) => {
            if (delErr) {
                console.error('auto-cc delete error:', delErr);
                return res.status(500).json({ error: 'Failed to update rules' });
            }

            if (!cleaned.length) {
                return res.json({ success: true, rules: [] });
            }

            let remaining = cleaned.length;
            let failed = false;
            const saved = [];

            cleaned.forEach((rule) => {
                db.run(
                    `INSERT INTO auto_cc_rules (organization_id, user_id, serial_no, to_email, cc_emails, enabled)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        context.orgId,
                        context.userId,
                        rule.serialNo,
                        rule.toEmail,
                        JSON.stringify(rule.ccEmails),
                        rule.enabled ? 1 : 0
                    ],
                    function (insErr) {
                        if (failed) return;
                        if (insErr) {
                            failed = true;
                            console.error('auto-cc insert error:', insErr);
                            return res.status(500).json({ error: 'Failed to save rules' });
                        }
                        saved.push({
                            id: this.lastID,
                            serialNo: rule.serialNo,
                            toEmail: rule.toEmail,
                            ccEmails: rule.ccEmails,
                            enabled: rule.enabled
                        });
                        remaining -= 1;
                        if (remaining === 0) {
                            saved.sort((a, b) => a.serialNo - b.serialNo);
                            res.json({ success: true, rules: saved });
                        }
                    }
                );
            });
        }
    );
});

// GET /match?to=email@x.com
router.get('/match', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const toEmail = normalizeEmail(req.query.to);
    if (!toEmail) return res.json({ success: true, ccEmails: [] });

    db.get(
        `SELECT cc_emails FROM auto_cc_rules
         WHERE organization_id = ? AND user_id = ? AND enabled = 1 AND LOWER(to_email) = ?
         ORDER BY serial_no ASC LIMIT 1`,
        [context.orgId, context.userId, toEmail],
        (err, row) => {
            if (err) {
                console.error('auto-cc match error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, ccEmails: row ? parseCcList(row.cc_emails) : [] });
        }
    );
});

module.exports = router;
