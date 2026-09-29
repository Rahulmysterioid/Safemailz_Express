const express = require('express');
const { db } = require('../db');

const router = express.Router();

const getUserContext = (req) => {
    const userId = req.headers['x-user-id'];
    const orgId = req.headers['x-org-id'];
    if (!userId || !orgId) return null;
    return { userId: parseInt(userId, 10), orgId: parseInt(orgId, 10) };
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

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
            // comma-separated fallback
            return value.split(/[,;]+/).map(normalizeEmail).filter(Boolean);
        }
    }
    return [];
};

const emailOk = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// GET /api/auto-cc
router.get('/', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    db.all(
        `SELECT id, serial_no, to_email, cc_emails, enabled, created_at
         FROM auto_cc_rules
         WHERE organization_id = ? AND user_id = ?
         ORDER BY serial_no ASC, id ASC`,
        [context.orgId, context.userId],
        (err, rows) => {
            if (err) {
                console.error('auto-cc list error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            const rules = (rows || []).map((row) => ({
                id: row.id,
                serialNo: row.serial_no,
                toEmail: row.to_email,
                ccEmails: parseCcList(row.cc_emails),
                enabled: row.enabled === 1 || row.enabled === true,
                createdAt: row.created_at
            }));
            res.json({ success: true, rules });
        }
    );
});

// POST /api/auto-cc  — replace all rules for this user (ordered list)
router.post('/', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const incoming = Array.isArray(req.body?.rules) ? req.body.rules : null;
    if (!incoming) return res.status(400).json({ error: 'rules array is required' });

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

    // Delete existing then insert new set
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

// GET /api/auto-cc/match?to=email@x.com  — used by composer
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
