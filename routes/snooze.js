const express = require('express');
const { db } = require('../db');

const router = express.Router();

// Helper to get user context
const getUserContext = (req) => {
    const userId = req.headers['x-user-id'] || req.body?.userId || req.query?.userId;
    const orgId = req.headers['x-org-id'] || req.body?.orgId || req.query?.orgId;
    if (!userId) return null;
    return {
        userId: parseInt(userId, 10),
        orgId: orgId ? parseInt(orgId, 10) : null
    };
};

/**
 * Release held emails for a user/org:
 * Changes delivery_status to 'DELIVERED' and is_visible_in_inbox to 1
 */
function releaseHeldEmails(userId, orgId) {
    return new Promise((resolve, reject) => {
        let condition = 'id IN (SELECT email_id FROM email_recipients WHERE user_id = ?)';
        const params = [userId];
        if (orgId) {
            condition += ' OR (sender_org_id = ? AND sender_org_id IS NOT NULL)';
            params.push(orgId);
        }
        const query = `
            UPDATE emails 
            SET delivery_status = 'DELIVERED', is_visible_in_inbox = 1 
            WHERE delivery_status = 'HELD_BY_SNOOZE' 
              AND (${condition})
        `;
        db.run(query, params, function (err) {
            if (err) return reject(err);
            resolve(this.changes || 0);
        });
    });
}

/**
 * Get count of emails currently held by snooze for a user/org
 */
function getHeldEmailsCount(userId, orgId) {
    return new Promise((resolve, reject) => {
        let condition = 'id IN (SELECT email_id FROM email_recipients WHERE user_id = ?)';
        const params = [userId];
        if (orgId) {
            condition += ' OR (sender_org_id = ? AND sender_org_id IS NOT NULL)';
            params.push(orgId);
        }
        const query = `
            SELECT COUNT(DISTINCT id) as count 
            FROM emails 
            WHERE delivery_status = 'HELD_BY_SNOOZE' 
              AND (${condition})
        `;
        db.get(query, params, (err, row) => {
            if (err) return reject(err);
            resolve(row?.count || 0);
        });
    });
}

/**
 * Get list of emails currently held by snooze for preview
 */
function getHeldEmailsList(userId, orgId) {
    return new Promise((resolve, reject) => {
        let condition = 'e.id IN (SELECT email_id FROM email_recipients WHERE user_id = ?)';
        const params = [userId];
        if (orgId) {
            condition += ' OR (e.sender_org_id = ? AND e.sender_org_id IS NOT NULL)';
            params.push(orgId);
        }
        const query = `
            SELECT e.id, e.email_no, e.subject, e.preview, e.created_at, 
                   e.external_sender_name, e.external_sender_email, e.to_address, e.delivery_status
            FROM emails e
            WHERE e.delivery_status = 'HELD_BY_SNOOZE' 
              AND (${condition})
            ORDER BY e.created_at DESC
        `;
        db.all(query, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows || []);
        });
    });
}

/**
 * Background auto-resume check scheduler
 * Runs every 10 seconds to detect expired snoozes and release emails
 */
async function autoResumeCheck() {
    try {
        db.all(
            "SELECT id, organization_id, snooze_until FROM users WHERE is_inbox_snoozed = 1 AND snooze_until IS NOT NULL",
            [],
            async (err, users) => {
                if (err || !users || users.length === 0) return;
                const now = new Date();
                for (const u of users) {
                    const snoozeUntil = new Date(u.snooze_until);
                    if (!isNaN(snoozeUntil.getTime()) && snoozeUntil <= now) {
                        console.log(`[Auto-Resume Scheduler] Snooze expired for user ${u.id}. Resuming inbox and releasing held emails...`);
                        db.run("UPDATE users SET is_inbox_snoozed = 0, snooze_until = NULL WHERE id = ?", [u.id], async (updErr) => {
                            if (updErr) {
                                console.error('[Auto-Resume Scheduler] Error resuming user:', updErr);
                            } else {
                                const released = await releaseHeldEmails(u.id, u.organization_id).catch(e => {
                                    console.error('[Auto-Resume Scheduler] Release error:', e);
                                    return 0;
                                });
                                console.log(`[Auto-Resume Scheduler] Released ${released} held emails for user ${u.id}.`);
                            }
                        });
                    }
                }
            }
        );
    } catch (e) {
        console.error('[Auto-Resume Scheduler] Interval error:', e);
    }
}

// Start 10-second scheduler
const schedulerInterval = setInterval(autoResumeCheck, 10000);
if (schedulerInterval.unref) schedulerInterval.unref();

// GET /api/email/snooze/status
router.get(['/status', '/'], async (req, res) => {
    const context = getUserContext(req);
    if (!context) {
        return res.status(401).json({ success: false, error: 'Unauthorized: missing user identifier' });
    }

    db.get(
        'SELECT id, organization_id, is_inbox_snoozed, snooze_until, snoozed_at FROM users WHERE id = ?',
        [context.userId],
        async (err, user) => {
            if (err) {
                console.error('[Snooze Status Error]:', err);
                return res.status(500).json({ success: false, error: 'Database error' });
            }
            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            const orgId = context.orgId || user.organization_id;
            const isSnoozed = user.is_inbox_snoozed === 1 || user.is_inbox_snoozed === true;
            const snoozeUntil = user.snooze_until;
            const snoozedAt = user.snoozed_at;

            // Check if snooze has expired
            if (isSnoozed && snoozeUntil) {
                const snoozeUntilDate = new Date(snoozeUntil);
                const now = new Date();
                if (!isNaN(snoozeUntilDate.getTime()) && snoozeUntilDate <= now) {
                    console.log(`[GET /status] Auto-resuming expired snooze for user ${user.id}`);
                    db.run('UPDATE users SET is_inbox_snoozed = 0, snooze_until = NULL WHERE id = ?', [user.id], async (updErr) => {
                        if (updErr) console.error('[GET /status] Update user error:', updErr);
                        const released = await releaseHeldEmails(user.id, orgId).catch(() => 0);
                        return res.json({
                            success: true,
                            isInboxSnoozed: false,
                            snoozeUntil: null,
                            snoozedAt: null,
                            remainingMs: 0,
                            heldEmailsCount: 0,
                            autoResumed: true,
                            releasedCount: released
                        });
                    });
                    return;
                }
            }

            if (isSnoozed && snoozeUntil) {
                const remainingMs = Math.max(0, new Date(snoozeUntil).getTime() - Date.now());
                const heldEmailsCount = await getHeldEmailsCount(user.id, orgId).catch(() => 0);
                return res.json({
                    success: true,
                    isInboxSnoozed: true,
                    snoozeUntil,
                    snoozedAt,
                    remainingMs,
                    heldEmailsCount
                });
            }

            return res.json({
                success: true,
                isInboxSnoozed: false,
                snoozeUntil: null,
                snoozedAt: null,
                remainingMs: 0,
                heldEmailsCount: 0
            });
        }
    );
});

// POST /api/email/snooze/activate
router.post('/activate', async (req, res) => {
    const context = getUserContext(req);
    if (!context) {
        return res.status(401).json({ success: false, error: 'Unauthorized: missing user identifier' });
    }

    const { snoozeUntil } = req.body;
    if (!snoozeUntil) {
        return res.status(400).json({ success: false, error: 'snoozeUntil is required' });
    }

    const dateObj = new Date(snoozeUntil);
    if (isNaN(dateObj.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid snoozeUntil date format' });
    }

    if (dateObj.getTime() <= Date.now()) {
        return res.status(400).json({ success: false, error: 'snoozeUntil must be a future date/time' });
    }

    const isoString = dateObj.toISOString();

    db.run(
        `UPDATE users 
         SET is_inbox_snoozed = 1, snooze_until = ?, snoozed_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [isoString, context.userId],
        function (err) {
            if (err) {
                console.error('[Snooze Activate Error]:', err);
                return res.status(500).json({ success: false, error: 'Database error' });
            }
            res.json({
                success: true,
                isInboxSnoozed: true,
                snoozeUntil: isoString
            });
        }
    );
});

// POST /api/email/snooze/resume
router.post('/resume', async (req, res) => {
    const context = getUserContext(req);
    if (!context) {
        return res.status(401).json({ success: false, error: 'Unauthorized: missing user identifier' });
    }

    db.get('SELECT organization_id FROM users WHERE id = ?', [context.userId], async (err, user) => {
        if (err) {
            console.error('[Snooze Resume Error]:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }

        const orgId = context.orgId || user?.organization_id;

        db.run(
            'UPDATE users SET is_inbox_snoozed = 0, snooze_until = NULL WHERE id = ?',
            [context.userId],
            async function (updErr) {
                if (updErr) {
                    console.error('[Snooze Resume User Update Error]:', updErr);
                    return res.status(500).json({ success: false, error: 'Database error' });
                }

                try {
                    const releasedCount = await releaseHeldEmails(context.userId, orgId);
                    console.log(`[Snooze Resume] Released ${releasedCount} held emails for user ${context.userId}`);
                    res.json({
                        success: true,
                        isInboxSnoozed: false,
                        releasedCount
                    });
                } catch (relErr) {
                    console.error('[Snooze Resume Release Error]:', relErr);
                    res.json({
                        success: true,
                        isInboxSnoozed: false,
                        releasedCount: 0,
                        warning: 'Snooze resumed but error releasing held emails'
                    });
                }
            }
        );
    });
});

// GET /api/email/snooze/held-emails
router.get('/held-emails', async (req, res) => {
    const context = getUserContext(req);
    if (!context) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    db.get('SELECT organization_id FROM users WHERE id = ?', [context.userId], async (err, user) => {
        if (err || !user) return res.status(500).json({ success: false, error: 'User lookup error' });
        const orgId = context.orgId || user.organization_id;
        const heldEmails = await getHeldEmailsList(context.userId, orgId).catch(() => []);
        res.json({ success: true, count: heldEmails.length, emails: heldEmails });
    });
});

router.releaseHeldEmails = releaseHeldEmails;
router.getHeldEmailsCount = getHeldEmailsCount;
router.autoResumeCheck = autoResumeCheck;

module.exports = router;
