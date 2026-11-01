const {normalizeAttachments, buildRawMessage} = require('../services/outgoingAttachments');
const express = require('express');
const { db } = require('../db');
const nodemailer = require('nodemailer');
const { getValidAccessToken } = require('../controllers/syncController');
const { getEmployeeEmailFilter } = require('../controllers/emailController');
const puppeteer = require('puppeteer');
const Tesseract = require('tesseract.js');
const { PDFDocument, rgb } = require('pdf-lib');

const router = express.Router();

const globalDownloadProgress = new Map();

// GET /api/emails/progress/:jobId
router.get('/progress/:jobId', (req, res) => {
    const progress = globalDownloadProgress.get(req.params.jobId) || 0;
    res.json({ progress });
});

// Helper to encode to base64url for Gmail API
function toBase64Url(str) {
    return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const toIST = (dateString) => {
    if (!dateString) return new Date();
    // SQLite CURRENT_TIMESTAMP is "YYYY-MM-DD HH:MM:SS" (UTC)
    const isoString = dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z';
    return new Date(isoString);
};

const formatToISTTime = (dateString) => {
    return toIST(dateString).toISOString();
};

const formatToISTDateTime = (dateString) => {
    return toIST(dateString).toISOString();
};

// Helper to get user context from headers
const getUserContext = (req) => {
    const userId = req.headers['x-user-id'];
    const orgId = req.headers['x-org-id'] || '1';
    const activeEmail = req.headers['x-active-email'];
    if (!userId) {
        return null;
    }
    return { userId: parseInt(userId, 10), orgId: parseInt(orgId, 10), activeEmail };
};

// Masking utility for hiding emails and phone numbers from employees
function maskContactDetails(text) {
    if (!text) return text;
    // Mask emails (e.g., raxxxx@xxxxx.com)
    let masked = text.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})/g, (match, local, domain, ext) => {
        const localMasked = local.length <= 2 ? local : local.substring(0, 2) + 'x'.repeat(local.length - 2);
        const domainMasked = 'x'.repeat(domain.length);
        return `${localMasked}@${domainMasked}.${ext}`;
    });
    // Mask phones (keep +countryCode and first few digits, mask the rest)
    masked = masked.replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, (match) => {
        let digitsCount = 0;
        let result = '';
        for (let i = 0; i < match.length; i++) {
            let char = match[i];
            if (/\d/.test(char)) {
                if (digitsCount < 4) {
                    result += char;
                } else {
                    result += 'x';
                }
                digitsCount++;
            } else if (char === '+') {
                result += char;
            } else {
                result += char;
            }
        }
        return result;
    });
    return masked;
}

// GET /api/emails/search - Search emails respecting scope, history logging, and pagination
router.get('/search', (req, res) => {
    const context = getUserContext(req);
    const userId = context ? context.userId : (req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'], 10) : 1);
    const orgId = context ? context.orgId : (req.headers['x-org-id'] ? parseInt(req.headers['x-org-id'], 10) : 1);

    const rawQ = req.query.q !== undefined ? req.query.q : (req.query.query !== undefined ? req.query.query : (req.query.search || ''));
    if (typeof rawQ === 'string' && rawQ.length > 5000) {
        return res.status(400).json({ success: false, error: 'Search query exceeds maximum allowed length' });
    }
    const q = (typeof rawQ === 'string' ? rawQ : '').trim();

    // Clamp pageSize to allowable limits: 25, 50, 100
    let requestedPageSize = parseInt(req.query.pageSize, 10);
    let pageSize = 25;
    if (!isNaN(requestedPageSize) && requestedPageSize > 0) {
        pageSize = Math.min(100, requestedPageSize);
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const offset = (page - 1) * pageSize;

    // Load general settings to determine default scope and whether history is enabled
    db.get('SELECT settings_json FROM user_general_settings WHERE user_id = ?', [userId], (err, settingsRow) => {
        let userSettings = {
            search: { scope: 'all', includeDeleted: false, pageSize: 25 },
            privacyData: { searchHistoryEnabled: true }
        };
        if (settingsRow && settingsRow.settings_json) {
            try {
                const parsed = JSON.parse(settingsRow.settings_json);
                if (parsed.search) userSettings.search = { ...userSettings.search, ...parsed.search };
                if (parsed.privacyData || parsed.privacy_data) {
                    userSettings.privacyData = { ...userSettings.privacyData, ...(parsed.privacyData || parsed.privacy_data) };
                }
            } catch {}
        }

        const scope = req.query.scope || userSettings.search.scope || 'all';
        const includeDeleted = req.query.includeDeleted !== undefined
            ? (req.query.includeDeleted === 'true' || req.query.includeDeleted === true)
            : !!userSettings.search.includeDeleted;

        const targetFolder = req.query.folder ? req.query.folder.toLowerCase().trim() : null;
        const validFolders = ['inbox', 'sent', 'drafts', 'archive', 'deleted', 'junk', 'outbox', 'spam'];

        if (scope === 'current' && targetFolder && !validFolders.includes(targetFolder)) {
            return res.json({
                success: true,
                emails: [],
                total: 0,
                page,
                pageSize,
                scope,
                folder: targetFolder
            });
        }

        // Log to search_history if enabled and query term is non-empty
        const historyEnabled = userSettings.privacyData.searchHistoryEnabled !== false;
        if (q && historyEnabled) {
            db.run(
                'INSERT INTO search_history (user_id, organization_id, query, created_at, searched_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
                [userId, orgId, q],
                () => {}
            );
        }

        let sql = `
            SELECT 
                e.id,
                e.id as email_id,
                e.email_no as emailNo,
                e.subject,
                e.preview,
                e.body,
                e.created_at,
                e.created_at as date,
                e.external_sender_name,
                e.external_sender_email,
                COALESCE(er.folder, 'inbox') as folder,
                u.admin_name as sender_name,
                COALESCE(e.external_sender_name, u.admin_name, 'Sender') as sender,
                COALESCE(e.external_sender_email, u.email, '') as senderEmail,
                u.email as sender_email
            FROM emails e
            LEFT JOIN email_recipients er ON e.id = er.email_id AND er.user_id = ?
            LEFT JOIN users u ON e.sender_id = u.id
            WHERE 1=1
        `;
        const params = [userId];

        if (scope === 'current' && targetFolder) {
            sql += ` AND LOWER(COALESCE(er.folder, 'inbox')) = ?`;
            params.push(targetFolder);
        } else if (scope === 'exclude_deleted_junk') {
            sql += ` AND LOWER(COALESCE(er.folder, 'inbox')) NOT IN ('deleted', 'junk')`;
        } else if (!includeDeleted) {
            sql += ` AND LOWER(COALESCE(er.folder, 'inbox')) NOT IN ('deleted', 'junk')`;
        }

        if (q) {
            sql += ` AND (e.subject LIKE ? OR e.preview LIKE ? OR e.body LIKE ? OR e.external_sender_name LIKE ? OR e.external_sender_email LIKE ? OR u.admin_name LIKE ? OR u.email LIKE ?)`;
            const searchPattern = `%${q}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }

        sql += ` ORDER BY e.created_at DESC LIMIT ? OFFSET ?`;
        params.push(pageSize, offset);

        db.all(sql, params, (queryErr, rows) => {
            if (queryErr) {
                console.error('[GET /api/emails/search] Database query error:', queryErr.message);
                return res.status(500).json({ success: false, error: 'Database search error', details: queryErr.message });
            }

            res.json({
                success: true,
                emails: rows || [],
                total: rows ? rows.length : 0,
                page,
                pageSize,
                scope,
                q
            });
        });
    });
});

// GET /api/emails
router.get('/', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const filter = req.query.filter || req.query.folder || 'all';
    const search = req.query.search || '';

    const runProjectListQuery = (targetUserId) => {
        let query = `
            SELECT 
                er.id as recipient_id, 
                er.user_id as recipient_user_id,
                COALESCE(er.folder, 'inbox') as folder, 
                COALESCE(er.is_read, 1) as read, 
                COALESCE(er.is_action, 0) as action, 
                COALESCE(er.is_replied, 0) as replied,
                COALESCE(er.is_pinned, e.is_pinned, 0) as is_pinned,
                COALESCE(er.is_flagged, e.is_flagged, 0) as is_flagged,
                COALESCE(er.categories, e.categories, '[]') as categories,
                COALESCE(er.is_ignored, e.is_ignored, 0) as is_ignored,
                e.id as email_id, 
                e.email_no as emailNo, 
                e.subject, 
                e.preview, 
                e.created_at,
                e.project_id as projectId,
                e.snoozed_until as snoozedUntil,
                e.delivery_status as deliveryStatus,
                e.is_visible_in_inbox as isVisibleInInbox,
                e.external_sender_name,
                e.external_sender_email,
                e.to_address,
                e.cc,
                e.bcc,
                u.admin_name as sender_name,
                u.email as sender_email,
                (SELECT u2.email FROM email_recipients er2 LEFT JOIN users u2 ON er2.user_id = u2.id WHERE er2.email_id = e.id AND er2.folder = 'inbox' LIMIT 1) as recipient_email,
                (SELECT u2.admin_name FROM email_recipients er2 LEFT JOIN users u2 ON er2.user_id = u2.id WHERE er2.email_id = e.id AND er2.folder = 'inbox' LIMIT 1) as recipient_name
            FROM emails e
            LEFT JOIN email_recipients er ON e.id = er.email_id AND er.user_id = ?
            LEFT JOIN users u ON e.sender_id = u.id
            WHERE 1=1
              AND (e.delivery_status = 'DELIVERED' OR e.delivery_status IS NULL)
        `;
        const params = [targetUserId];

        const pConds = [];
        if (req.projectId) {
            pConds.push(`e.project_id = ?`);
            params.push(req.projectId);
        }
        if (req.projectName) {
            pConds.push(`LOWER(e.subject) LIKE '%' || ? || '%'`);
            params.push(req.projectName.toLowerCase());
        }
        if (req.projectEmails && req.projectEmails.length > 0) {
            for (const em of req.projectEmails) {
                pConds.push(`(
                    LOWER(e.to_address) LIKE '%' || ? || '%' OR 
                    LOWER(e.cc) LIKE '%' || ? || '%' OR 
                    LOWER(e.bcc) LIKE '%' || ? || '%' OR 
                    LOWER(e.external_sender_email) = ? OR 
                    LOWER(u.email) = ?
                )`);
                params.push(em, em, em, em, em);
            }
        }
        if (pConds.length > 0) {
            query += ` AND (${pConds.join(' OR ')})`;
        } else if (filter.startsWith('project:')) {
            const projEmail = filter.split(':')[1].toLowerCase();
            query += ` AND (
                LOWER(e.to_address) LIKE '%' || ? || '%' OR 
                LOWER(e.cc) LIKE '%' || ? || '%' OR 
                LOWER(e.bcc) LIKE '%' || ? || '%' OR 
                LOWER(e.external_sender_email) = ? OR 
                LOWER(u.email) = ?
            )`;
            params.push(projEmail, projEmail, projEmail, projEmail, projEmail);
        }

        query += ' GROUP BY e.id ORDER BY COALESCE(er.is_pinned, e.is_pinned, 0) DESC, e.created_at DESC';

        db.get('SELECT role, canViewRealEmailsAndSignatures FROM users WHERE id = ?', [context.userId], (err, userRow) => {
            if (err || !userRow) return res.status(500).json({ error: 'Failed to authenticate user role' });
            const isEmployee = userRow.role === 'employee';
            const canViewRealEmails = !isEmployee || userRow.canViewRealEmailsAndSignatures === 1 || userRow.canViewRealEmailsAndSignatures === true;

            db.all(query, params, (err, rows) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Database error' });
                }

                db.all('SELECT LOWER(email) as email, client_id, id FROM clients WHERE organization_id = ?', [context.orgId], (errClients, clientList) => {
                    const clientMap = {};
                    (clientList || []).forEach(c => {
                        if (c.email) clientMap[c.email.trim()] = c.client_id || `CL-${c.id}`;
                    });

                    let emails = (rows || []).map(row => {
                        let sender = row.sender_name || row.external_sender_name || row.external_sender_email || 'Unknown Sender';
                        let senderEmail = row.sender_email || row.external_sender_email;
                        const realSenderEmail = senderEmail || '';
                        let cleanEmail = '';
                        if (realSenderEmail) {
                            const m = String(realSenderEmail).match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
                            cleanEmail = m ? m[1].toLowerCase().trim() : String(realSenderEmail).toLowerCase().trim();
                        }
                        const matchedClientId = clientMap[cleanEmail] || null;
                        const isClient = !!matchedClientId;

                        let subject = row.subject;
                        let preview = row.preview || row.subject;

                        if (isEmployee && !canViewRealEmails && isClient && row.external_sender_email) {
                            subject = maskContactDetails(subject);
                            preview = maskContactDetails(preview);
                            sender = maskContactDetails(sender);
                        }

                        return {
                            id: row.email_id,
                            recipient_id: row.recipient_id,
                            recipientUserId: row.recipient_user_id,
                            userId: row.recipient_user_id,
                            sender: sender,
                            senderEmail: realSenderEmail,
                            realSenderEmail: realSenderEmail,
                            senderClientId: matchedClientId,
                            clientId: matchedClientId,
                            isClient: isClient,
                            canViewRealEmailIds: canViewRealEmails,
                            to: row.to_address,
                            cc: row.cc,
                            bcc: row.bcc,
                            projectId: row.projectId,
                            snoozedUntil: row.snoozedUntil,
                            deliveryStatus: row.deliveryStatus || 'DELIVERED',
                            isHeld: row.deliveryStatus === 'HELD_BY_SNOOZE',
                            subject: subject,
                            preview: preview,
                            folder: row.folder || 'inbox',
                            read: !!row.read,
                            replied: !!row.replied,
                            action: !!row.action,
                            pinned: !!row.is_pinned,
                            isPinned: !!row.is_pinned,
                            flagged: !!row.is_flagged,
                            isFlagged: !!row.is_flagged,
                            categories: (() => {
                                try {
                                    const parsed = JSON.parse(row.categories || '[]');
                                    return Array.isArray(parsed) ? parsed : [parsed];
                                } catch {
                                    return row.categories ? [row.categories] : [];
                                }
                            })(),
                            isIgnored: !!row.is_ignored,
                            emailNo: row.emailNo,
                            date: formatToISTTime(row.created_at)
                        };
                    });


                if (search) {
                    const q = search.trim().toLowerCase();
                    emails = emails.filter(email => {
                        const haystack = `${email.sender} ${email.subject} ${email.preview} ${email.emailNo} ${email.folder}`.toLowerCase();
                        return haystack.includes(q);
                    });
                }

                res.json({
                    success: true,
                    filter,
                    search,
                    project: req.activeProject || null,
                    counts: { inbox: emails.length, sent: 0, drafts: 0, deleted: 0, junk: 0, archive: 0, notes: 0, conversation: 0, snooze: 0 },
                    emails
                });
            });
        });
    });
};


    const runUnifiedListQuery = (employee, callerRow) => {
        const isEmployee = callerRow.role === 'employee';
        const canViewRealEmails = callerRow.canViewRealEmailsAndSignatures === 1 || callerRow.canViewRealEmailsAndSignatures === true;

        const empFilter = getEmployeeEmailFilter(employee);
        const whereClause = empFilter.whereClause;
        const filterParams = [...empFilter.params];

        // SQL WHERE conditions for folder
        let folderCondition = '';
        const folderParams = [];

        const isSnoozeFilter = filter === 'snooze' || filter === 'snoozed' || filter === 'folder:snooze';
        const deliveryStatusCondition = isSnoozeFilter ? '' : " AND (e.delivery_status = 'DELIVERED' OR e.delivery_status IS NULL)";

        if (filter === 'read') { folderCondition = ' AND er.is_read = 1'; }
        else if (filter === 'unread') { folderCondition = ' AND (er.is_read IS NULL OR er.is_read = 0)'; }
        else if (filter === 'draft' || filter === 'drafts' || filter === 'folder:drafts') { folderCondition = " AND LOWER(COALESCE(er.folder, 'inbox')) = 'drafts'"; }
        else if (filter === 'action') { folderCondition = ' AND er.is_action = 1'; }
        else if (filter === 'reply') { folderCondition = ' AND er.is_replied = 1'; }
        else if (filter === 'inbox' || filter === 'folder:inbox') { folderCondition = " AND LOWER(COALESCE(er.folder, 'inbox')) = 'inbox'"; }
        else if (filter === 'sent' || filter === 'folder:sent') { folderCondition = " AND LOWER(COALESCE(er.folder, 'inbox')) = 'sent'"; }
        else if (filter === 'deleted' || filter === 'folder:deleted') { folderCondition = " AND LOWER(COALESCE(er.folder, 'inbox')) = 'deleted'"; }
        else if (filter === 'archive' || filter === 'folder:archive') { folderCondition = " AND LOWER(COALESCE(er.folder, 'inbox')) = 'archive'"; }
        else if (filter === 'junk' || filter === 'junk email' || filter === 'folder:junk') { folderCondition = " AND LOWER(COALESCE(er.folder, 'inbox')) = 'junk'"; }
        else if (filter === 'pinned' || filter === 'folder:pinned') { folderCondition = " AND COALESCE(er.is_pinned, e.is_pinned, 0) = 1"; }
        else if (filter === 'flagged' || filter === 'folder:flagged') { folderCondition = " AND COALESCE(er.is_flagged, e.is_flagged, 0) = 1"; }
        else if (isSnoozeFilter) { folderCondition = " AND (LOWER(COALESCE(er.folder, 'inbox')) = 'snooze' OR e.snoozed_until IS NOT NULL OR e.delivery_status = 'HELD_BY_SNOOZE')"; }
        else if (filter.startsWith('folder:')) {
            folderCondition = " AND LOWER(COALESCE(er.folder, 'inbox')) = LOWER(?)";
            folderParams.push(filter.split(':')[1]);
        }

        // Email recipients join: match employee's recipient record by ID or by email
        let erJoinSql = '';
        const erJoinParams = [];
        const empId = employee.id && !isNaN(parseInt(employee.id, 10)) ? parseInt(employee.id, 10) : null;

        if (empId) {
            erJoinSql = 'LEFT JOIN email_recipients er ON e.id = er.email_id AND er.user_id = ?';
            erJoinParams.push(empId);
        } else if (empFilter.emailsToMatch.length > 0) {
            const placeholders = empFilter.emailsToMatch.map(() => '?').join(',');
            erJoinSql = `LEFT JOIN email_recipients er ON e.id = er.email_id AND er.user_id IN (SELECT id FROM users WHERE LOWER(email) IN (${placeholders}))`;
            erJoinParams.push(...empFilter.emailsToMatch);
        } else {
            erJoinSql = 'LEFT JOIN email_recipients er ON e.id = er.email_id AND er.user_id = 0';
        }

        // 1. Query Counts (unified for both Admin view & Employee view)
        const countsQuery = `
            SELECT COALESCE(er.folder, 'inbox') as folder, COUNT(DISTINCT e.id) as count 
            FROM emails e
            ${erJoinSql}
            LEFT JOIN users u ON e.sender_id = u.id
            WHERE ${whereClause}
              AND (er.is_deleted IS NULL OR er.is_deleted = 0)
              AND (e.delivery_status = 'DELIVERED' OR e.delivery_status IS NULL)
            GROUP BY COALESCE(er.folder, 'inbox')
        `;

        db.all(countsQuery, [...erJoinParams, ...filterParams], (err, countRows) => {
            let counts = { inbox: 0, sent: 0, drafts: 0, deleted: 0, junk: 0, archive: 0, notes: 0, conversation: 0, snooze: 0 };
            if (!err && countRows) {
                countRows.forEach(r => {
                    const cleanFolder = (r.folder || '').toLowerCase().replace('folder:', '');
                    if (counts.hasOwnProperty(cleanFolder)) {
                        counts[cleanFolder] += r.count;
                    } else {
                        counts[cleanFolder] = r.count;
                    }
                });
            }

            // 2. Query Emails List
            const listQuery = `
                SELECT 
                    er.id as recipient_id, 
                    er.user_id as recipient_user_id,
                    COALESCE(er.folder, 'inbox') as folder, 
                    COALESCE(er.is_read, 0) as read, 
                    COALESCE(er.is_action, 0) as action, 
                    COALESCE(er.is_replied, 0) as replied,
                    COALESCE(er.is_pinned, e.is_pinned, 0) as is_pinned,
                    COALESCE(er.is_flagged, e.is_flagged, 0) as is_flagged,
                    COALESCE(er.categories, e.categories, '[]') as categories,
                    COALESCE(er.is_ignored, e.is_ignored, 0) as is_ignored,
                    e.id as email_id, 
                    e.email_no as emailNo, 
                    e.subject, 
                    e.preview, 
                    e.created_at,
                    e.project_id as projectId,
                    e.snoozed_until as snoozedUntil,
                    e.delivery_status as deliveryStatus,
                    e.is_visible_in_inbox as isVisibleInInbox,
                    e.external_sender_name,
                    e.external_sender_email,
                    e.to_address,
                    e.cc,
                    e.bcc,
                    u.admin_name as sender_name,
                    u.email as sender_email,
                    (SELECT u2.email FROM email_recipients er2 LEFT JOIN users u2 ON er2.user_id = u2.id WHERE er2.email_id = e.id AND er2.folder = 'inbox' LIMIT 1) as recipient_email,
                    (SELECT u2.admin_name FROM email_recipients er2 LEFT JOIN users u2 ON er2.user_id = u2.id WHERE er2.email_id = e.id AND er2.folder = 'inbox' LIMIT 1) as recipient_name
                FROM emails e
                ${erJoinSql}
                LEFT JOIN users u ON e.sender_id = u.id
                WHERE ${whereClause}
                  AND (er.is_deleted IS NULL OR er.is_deleted = 0)
                  ${folderCondition}
                  ${deliveryStatusCondition}
                GROUP BY e.id
                ORDER BY COALESCE(er.is_pinned, e.is_pinned, 0) DESC, e.created_at DESC
            `;

            db.all(listQuery, [...erJoinParams, ...filterParams, ...folderParams], (err, rows) => {
                if (err) {
                    console.error('[runUnifiedListQuery DB Error]:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                db.all('SELECT LOWER(email) as email, client_id, id FROM clients WHERE organization_id = ?', [context.orgId], (errClients, clientList) => {
                    const clientMap = {};
                    (clientList || []).forEach(c => {
                        if (c.email) clientMap[c.email.trim()] = c.client_id || `CL-${c.id}`;
                    });

                    let emails = (rows || []).map(row => {
                        let sender = '';
                        let senderEmail = '';

                        if (row.folder === 'sent') {
                            const displayName = row.recipient_name || row.to_address || row.recipient_email || 'Unknown';
                            sender = `To: ${displayName}`;
                            senderEmail = row.to_address || row.recipient_email;
                        } else {
                            const displayName = row.sender_name || row.external_sender_name || row.external_sender_email || 'Unknown Sender';
                            sender = displayName;
                            senderEmail = row.sender_email || row.external_sender_email;
                        }

                        const realSenderEmail = senderEmail || '';
                        let cleanEmail = '';
                        if (realSenderEmail) {
                            const m = String(realSenderEmail).match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
                            cleanEmail = m ? m[1].toLowerCase().trim() : String(realSenderEmail).toLowerCase().trim();
                        }
                        const matchedClientId = clientMap[cleanEmail] || null;
                        const isClient = !!matchedClientId;

                        let subject = row.subject;
                        let preview = row.preview || row.subject;
                        let emailNo = row.emailNo;

                        // Masking for employees ONLY when sender is a registered client and toggle is OFF
                        if (isEmployee && !canViewRealEmails && isClient && row.external_sender_email) {
                            subject = maskContactDetails(subject);
                            preview = maskContactDetails(preview);
                            sender = maskContactDetails(sender);
                        }

                        return {
                            id: row.email_id,
                            recipient_id: row.recipient_id,
                            recipientUserId: row.recipient_user_id,
                            userId: row.recipient_user_id,
                            sender: sender,
                            senderEmail: realSenderEmail,
                            realSenderEmail: realSenderEmail,
                            senderClientId: matchedClientId,
                            clientId: matchedClientId,
                            isClient: isClient,
                            canViewRealEmailIds: canViewRealEmails,
                            to: row.to_address,
                            cc: row.cc,
                            bcc: row.bcc,
                            projectId: row.projectId,
                            snoozedUntil: row.snoozedUntil,
                            deliveryStatus: row.deliveryStatus || 'DELIVERED',
                            isHeld: row.deliveryStatus === 'HELD_BY_SNOOZE',
                            subject: subject,
                            preview: preview,
                            folder: row.folder || 'inbox',
                            read: !!row.read,
                            replied: !!row.replied,
                            action: !!row.action,
                            pinned: !!row.is_pinned,
                            isPinned: !!row.is_pinned,
                            flagged: !!row.is_flagged,
                            isFlagged: !!row.is_flagged,
                            categories: (() => {
                                try {
                                    const parsed = JSON.parse(row.categories || '[]');
                                    return Array.isArray(parsed) ? parsed : [parsed];
                                } catch {
                                    return row.categories ? [row.categories] : [];
                                }
                            })(),
                            isIgnored: !!row.is_ignored,
                            emailNo: emailNo,
                            date: formatToISTTime(row.created_at)
                        };
                    });


                if (search) {
                    const q = search.trim().toLowerCase();
                    emails = emails.filter(email => {
                        const haystack = `${email.sender} ${email.subject} ${email.preview} ${email.emailNo} ${email.folder}`.toLowerCase();
                        return haystack.includes(q);
                    });
                }

                res.json({
                    success: true,
                    filter,
                    search,
                    counts,
                    emails
                });
            });
        });
    });
};


    const handleListQuery = () => {
        db.get('SELECT id, email, role, canViewRealEmailsAndSignatures FROM users WHERE id = ?', [context.userId], (err, callerRow) => {
            if (err || !callerRow) return res.status(500).json({ error: 'Failed to authenticate user' });

            const isEmployeeCaller = callerRow.role === 'employee';

            // Employee scoping identifiers passed in query or headers
            const rawEmpId = req.query.employeeId || req.headers['x-employee-id'];
            const targetEmpEmail = (req.query.employeeEmail || req.query.email || req.headers['x-employee-email'] || req.headers['x-email'] || '').trim();
            const officialEmail = (req.query.officialEmail || '').trim();
            const personalEmail = (req.query.personalEmail || '').trim();
            const userEmail = (req.query.userEmail || '').trim();

            // When caller is Admin, a client-side seat number (e.g. 1, 2) must NEVER be treated as Admin's user ID!
            let validEmpId = null;
            if (rawEmpId && !isNaN(parseInt(rawEmpId, 10))) {
                const parsed = parseInt(rawEmpId, 10);
                if (isEmployeeCaller || parsed !== callerRow.id) {
                    validEmpId = parsed;
                }
            }

            const hasExplicitEmployeeScope = req.query.employeeId !== undefined ||
                                             req.query.employeeEmail !== undefined ||
                                             req.headers['x-employee-id'] !== undefined ||
                                             req.headers['x-employee-email'] !== undefined;

            // Is this request scoped to an employee?
            const isScopedToEmployee = isEmployeeCaller || hasExplicitEmployeeScope || !!(validEmpId || targetEmpEmail || officialEmail || userEmail);

            if (!isScopedToEmployee) {
                // Regular admin viewing their own emails
                const adminEmp = {
                    _id: callerRow.id,
                    id: callerRow.id,
                    email: callerRow.email,
                    officialEmail: '',
                    personalEmail: '',
                    userEmail: callerRow.email,
                    activeEmail: context.activeEmail || callerRow.email
                };
                return runUnifiedListQuery(adminEmp, callerRow);
            }

            // Scoped to an employee:
            if (isEmployeeCaller) {
                const employee = {
                    _id: callerRow.id,
                    id: callerRow.id,
                    email: callerRow.email,
                    // DO NOT trust client-provided emails for employees to prevent cross-account leaks
                    officialEmail: '',
                    personalEmail: '',
                    userEmail: callerRow.email,
                    activeEmail: callerRow.email
                };
                return runUnifiedListQuery(employee, callerRow);
            }

            // Admin viewing an employee's inbox / dashboard:
            const searchEmail = targetEmpEmail || officialEmail || userEmail || '';
            let lookupSql = null;
            let lookupParams = [];

            if (searchEmail) {
                lookupSql = `SELECT id, email, admin_name FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`;
                lookupParams = [searchEmail];
            } else if (validEmpId) {
                lookupSql = `SELECT id, email, admin_name FROM users WHERE id = ? AND LOWER(role) = 'employee' LIMIT 1`;
                lookupParams = [validEmpId];
            }

            const dispatchQuery = (empUser) => {
                const resolvedId = empUser ? empUser.id : null;
                const resolvedEmail = (empUser && empUser.email) ? empUser.email : searchEmail;

                const employee = {
                    _id: resolvedId,
                    id: resolvedId,
                    email: resolvedEmail,
                    officialEmail: officialEmail,
                    personalEmail: personalEmail,
                    userEmail: userEmail || resolvedEmail,
                    activeEmail: searchEmail
                };

                runUnifiedListQuery(employee, callerRow);
            };

            if (lookupSql) {
                db.get(lookupSql, lookupParams, (err, empUser) => {
                    dispatchQuery(empUser);
                });
            } else {
                dispatchQuery(null);
            }
        });
    };

    const projectFilter = req.query.project || (filter.startsWith('project:') ? filter.split(':')[1] : null);

    if (projectFilter) {
        const pKey = projectFilter.trim().toLowerCase();
        db.get(
            `SELECT * FROM projects WHERE organization_id = ? AND (
                LOWER(project_id) = ? OR 
                LOWER(project_name) = ? OR 
                LOWER(project_email_id) = ? OR 
                id = ?
            ) LIMIT 1`,
            [context.orgId, pKey, pKey, pKey, parseInt(pKey, 10) || 0],
            (err, project) => {
                req.activeProject = project || null;
                if (!err && project) {
                    const emailsToMatch = [];
                    if (project.project_email_id) emailsToMatch.push(project.project_email_id.toLowerCase());
                    const extractEmails = str => {
                        if (!str) return [];
                        const matches = str.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi);
                        return matches ? matches.map(e => e.toLowerCase()) : [];
                    };
                    emailsToMatch.push(...extractEmails(project.leader));
                    emailsToMatch.push(...extractEmails(project.employee_name));
                    emailsToMatch.push(...extractEmails(project.client));
                    req.projectEmails = [...new Set(emailsToMatch.filter(Boolean))];
                    req.projectId = project.project_id;
                    req.projectName = project.project_name;
                }
                runProjectListQuery(context.userId);
            }
        );
    } else {
        handleListQuery();
    }
});

// POST /api/emails/:id/snooze
router.post('/:id/snooze', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const emailId = req.params.id;
    const { snoozeUntil } = req.body;
    const untilDate = snoozeUntil ? new Date(snoozeUntil).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    db.run(
        `UPDATE emails SET snoozed_until = ? WHERE id = ?`,
        [untilDate, emailId],
        (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            db.run(
                `UPDATE email_recipients SET folder = 'snooze' WHERE email_id = ? AND user_id = ?`,
                [emailId, context.userId],
                (err2) => {
                    res.json({ success: true, message: 'Email snoozed', snoozedUntil: untilDate });
                }
            );
        }
    );
});

// POST /api/emails/:id/unsnooze
router.post('/:id/unsnooze', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const emailId = req.params.id;
    db.run(
        `UPDATE emails SET snoozed_until = NULL WHERE id = ?`,
        [emailId],
        (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            db.run(
                `UPDATE email_recipients SET folder = 'inbox' WHERE email_id = ? AND user_id = ?`,
                [emailId, context.userId],
                (err2) => {
                    res.json({ success: true, message: 'Email restored to inbox' });
                }
            );
        }
    );
});

// GET /api/emails/:id
router.get('/:id', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const emailId = req.params.id;

    const runQuery = (targetUserId) => {
        const query = `
            SELECT 
                e.id, 
                e.email_no as emailNo, 
                e.subject, 
                e.body, 
                e.created_at,
                e.external_sender_name,
                e.external_sender_email,
                e.to_address,
                e.cc,
                e.bcc,
                u.admin_name as sender_name,
                u.email as sender_email,
                er.folder,
                er.is_read as read,
                (SELECT u2.email FROM email_recipients er2 LEFT JOIN users u2 ON er2.user_id = u2.id WHERE er2.email_id = e.id AND er2.folder = 'inbox' LIMIT 1) as recipient_email,
                (SELECT u2.admin_name FROM email_recipients er2 LEFT JOIN users u2 ON er2.user_id = u2.id WHERE er2.email_id = e.id AND er2.folder = 'inbox' LIMIT 1) as recipient_name
            FROM emails e
            LEFT JOIN email_recipients er ON e.id = er.email_id AND er.user_id = ?
            LEFT JOIN users u ON e.sender_id = u.id
            WHERE e.id = ?
        `;

        db.get(query, [targetUserId, emailId], (err, row) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!row) return res.status(404).json({ error: 'Email not found' });

            const finishRequest = () => {
                // Mark as read when opened
                if (!row.read && row.folder) {
                    db.run('UPDATE email_recipients SET is_read = 1 WHERE email_id = ? AND user_id = ?', [emailId, targetUserId]);
                }

                let sender = '';
                let senderEmail = '';
                if (row.folder === 'sent') {
                    const displayName = row.recipient_name || row.to_address || row.recipient_email || 'Unknown';
                    sender = `To: ${displayName}`;
                    senderEmail = row.to_address || row.recipient_email;
                } else {
                    const displayName = row.sender_name || row.external_sender_name || row.external_sender_email || 'Unknown Sender';
                    sender = displayName;
                    senderEmail = row.sender_email || row.external_sender_email;
                }

                const realSenderEmail = senderEmail || '';
                let cleanSenderEmail = '';
                if (realSenderEmail) {
                    const match = String(realSenderEmail).match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
                    cleanSenderEmail = match ? match[1].toLowerCase().trim() : String(realSenderEmail).toLowerCase().trim();
                }

                db.get('SELECT role, canViewRealEmailsAndSignatures FROM users WHERE id = ?', [context.userId], (err, userRow) => {
                    if (err || !userRow) return res.status(500).json({ error: 'Failed to authenticate user role' });
                    const isEmployee = userRow.role === 'employee';
                    const canViewRealEmails = !isEmployee || userRow.canViewRealEmailsAndSignatures === 1 || userRow.canViewRealEmailsAndSignatures === true;

                    // 1. Client Identification Check: check if sender is registered client
                    db.get(
                        'SELECT id, client_id, display_name, name, email FROM clients WHERE organization_id = ? AND LOWER(email) = ? LIMIT 1',
                        [context.orgId, cleanSenderEmail],
                        (clientCheckErr, senderClientRow) => {
                            const isClient = !!senderClientRow;
                            const senderClientId = senderClientRow ? (senderClientRow.client_id || `CL-${senderClientRow.id}`) : null;
                            const clientId = senderClientId;

                            let subject = row.subject;
                            let body = row.body;

                            // Apply masking for employees ONLY IF the sender is a registered client AND permission toggle is OFF
                            if (isEmployee && !canViewRealEmails && isClient) {
                                subject = maskContactDetails(subject);
                                body = maskContactDetails(body);
                                sender = maskContactDetails(sender);

                                // Redact signature block
                                if (body) {
                                    const sigIndex = body.indexOf('-- \n');
                                    if (sigIndex !== -1) body = body.substring(0, sigIndex) + '\n[Signature Redacted]';

                                    const htmlSigIndex = body.indexOf('<div class="gmail_signature"');
                                    if (htmlSigIndex !== -1) body = body.substring(0, htmlSigIndex) + '<br/><i>[Signature Redacted]</i>';
                                }
                            }

                            db.all('SELECT id, filename, content_type as contentType, size FROM email_attachments WHERE email_id = ?', [emailId], (err, attachments) => {
                                if (err) console.error("Error fetching attachments:", err);

                                const searchEmails = [
                                    row.sender_email, row.external_sender_email,
                                    ...(row.to_address || '').split(','),
                                    ...(row.cc || '').split(','),
                                    ...(row.bcc || '').split(',')
                                ].filter(Boolean).map(e => {
                                    const match = String(e).match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/i);
                                    return match ? match[1].toLowerCase() : null;
                                }).filter(Boolean);

                                const uniqueEmails = [...new Set(searchEmails)];
                                const placeholders = uniqueEmails.map(() => '?').join(',');

                                const finalize = (projectName, clientName) => {
                                    res.json({
                                        success: true,
                                        email: {
                                            id: row.id,
                                            emailNo: row.emailNo,
                                            subject: subject,
                                            body: body,
                                            sender: sender,
                                            senderEmail: realSenderEmail,
                                            realSenderEmail: realSenderEmail,
                                            senderClientId: senderClientId,
                                            clientId: clientId,
                                            isClient: isClient,
                                            canViewRealEmailIds: canViewRealEmails,
                                            to: row.to_address,
                                            cc: row.cc,
                                            bcc: row.bcc,
                                            folder: row.folder,
                                            date: formatToISTTime(row.created_at),
                                            attachments: attachments || [],
                                            projectName: projectName,
                                            clientName: clientName || (senderClientRow ? (senderClientRow.display_name || senderClientRow.name) : null)
                                        }
                                    });
                                };

                                if (uniqueEmails.length === 0) {
                                    return finalize(null, senderClientRow ? (senderClientRow.display_name || senderClientRow.name) : null);
                                }

                                db.get(`SELECT project_name FROM projects WHERE organization_id = ? AND LOWER(project_email_id) IN (${placeholders}) LIMIT 1`, [context.orgId, ...uniqueEmails], (err, projectRow) => {
                                    const projectName = projectRow ? projectRow.project_name : null;
                                    db.get(`SELECT display_name, name FROM clients WHERE organization_id = ? AND LOWER(email) IN (${placeholders}) LIMIT 1`, [context.orgId, ...uniqueEmails], (err, clientRow) => {
                                        const clientName = clientRow ? (clientRow.display_name || clientRow.name) : (senderClientRow ? (senderClientRow.display_name || senderClientRow.name) : null);
                                        finalize(projectName, clientName);
                                    });
                                });
                            });
                        }
                    );
                });

            };

            if (!row.folder) {
                const userEmail = context.activeEmail || '';
                if (!userEmail) return res.status(404).json({ error: 'Email not found' });

                db.get(`
                    SELECT 1 FROM projects 
                    WHERE (
                        LOWER(?) LIKE '%' || LOWER(project_email_id) || '%' OR 
                        LOWER(?) LIKE '%' || LOWER(project_email_id) || '%' OR 
                        LOWER(?) LIKE '%' || LOWER(project_email_id) || '%' OR 
                        LOWER(project_email_id) = LOWER(?)
                    )
                    AND (
                        LOWER(leader) LIKE '%' || ? || '%' OR 
                        LOWER(client) LIKE '%' || ? || '%' OR 
                        LOWER(employee_name) LIKE '%' || ? || '%'
                    )
                    LIMIT 1
                `, [row.to_address || '', row.cc || '', row.bcc || '', row.external_sender_email || row.sender_email || '', userEmail.toLowerCase(), userEmail.toLowerCase(), userEmail.toLowerCase()], (err, proj) => {
                    if (err || !proj) {
                        return res.status(403).json({ error: 'Access denied to this project email.' });
                    }
                    row.folder = 'inbox'; // Pretend it's in inbox
                    row.read = 1;
                    finishRequest();
                });
            } else {
                finishRequest();
            }
        });
    };

    const targetEmpId = req.query.employeeId || req.headers['x-employee-id'];
    const emailToCheck = req.query.employeeEmail || req.headers['x-employee-email'] || context.activeEmail;

    db.get('SELECT role FROM users WHERE id = ?', [context.userId], (err, caller) => {
        if (err || !caller) return res.status(500).json({ error: 'Failed to authenticate user' });

        const isEmployee = caller.role === 'employee';

        if (isEmployee) {
            // Employees can only fetch their own emails
            return runQuery(context.userId);
        }

        // Admins/Owners can impersonate to fetch employee emails
        if (targetEmpId && !isNaN(parseInt(targetEmpId, 10))) {
            runQuery(parseInt(targetEmpId, 10));
        } else if (emailToCheck) {
            db.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [emailToCheck.trim()], (err, row) => {
                if (!err && row) {
                    runQuery(row.id);
                } else {
                    runQuery(context.userId);
                }
            });
        } else {
            runQuery(context.userId);
        }
    });
});

// POST /api/emails/send
router.post('/send', async (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { body, projectId } = req.body;
    const subject = String(req.body.subject || '(No Subject)');
    const importance = ['high','low'].includes(req.body.importance) ? req.body.importance : 'normal';
    let attachments;
    try { attachments = normalizeAttachments(req.body.attachments); }
    catch (err) { return res.status(400).json({error:err.message}); }
    let { to } = req.body;
    let cc = req.body.cc || req.body.composeCc || '';
    let bcc = req.body.bcc || req.body.composeBcc || '';
    if (!to || !subject || !body) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Auto-CC fallback safety from user_email_settings
    try {
        const userEmailSettings = await new Promise((resolve) => {
            db.get(
                `SELECT is_auto_cc_enabled, auto_cc_emails FROM user_email_settings WHERE user_id = ? LIMIT 1`,
                [context.userId],
                (err, r) => resolve(r)
            );
        });
        if (userEmailSettings && (userEmailSettings.is_auto_cc_enabled === 1 || userEmailSettings.is_auto_cc_enabled === true)) {
            let autoCcList = [];
            try {
                autoCcList = JSON.parse(userEmailSettings.auto_cc_emails);
            } catch (_) {
                if (typeof userEmailSettings.auto_cc_emails === 'string') {
                    autoCcList = userEmailSettings.auto_cc_emails.split(/[,;\s]+/);
                }
            }
            if (Array.isArray(autoCcList) && autoCcList.length > 0) {
                const existingCcList = cc ? cc.split(/[,;\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean) : [];
                const mergedCc = [...existingCcList];
                for (const autoEmail of autoCcList) {
                    const cleanAutoEmail = String(autoEmail || '').trim().toLowerCase();
                    if (cleanAutoEmail && !mergedCc.includes(cleanAutoEmail)) {
                        mergedCc.push(cleanAutoEmail);
                    }
                }
                cc = mergedCc.join(', ');
            }
        }
    } catch (autoCcErr) {
        console.error('Error applying user_email_settings auto CC:', autoCcErr);
    }

    // Auto-CC rules lookup (per recipient rule)
    try {
        const toClean = String(to || '').toLowerCase().trim();
        const autoCcRule = await new Promise((resolve) => {
            db.get(
                `SELECT cc_emails FROM auto_cc_rules WHERE organization_id = ? AND user_id = ? AND enabled = 1 AND LOWER(to_email) = ? LIMIT 1`,
                [context.orgId, context.userId, toClean],
                (err, r) => resolve(r)
            );
        });
        if (autoCcRule && autoCcRule.cc_emails) {
            let extra = [];
            try { extra = JSON.parse(autoCcRule.cc_emails); } catch(_) { extra = autoCcRule.cc_emails.split(/[,;\s]+/); }
            if (Array.isArray(extra) && extra.length > 0) {
                const currentCc = cc ? cc.split(/[,;\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean) : [];
                for (const item of extra) {
                    const cleanItem = String(item || '').trim().toLowerCase();
                    if (cleanItem && !currentCc.includes(cleanItem)) {
                        currentCc.push(cleanItem);
                    }
                }
                cc = currentCc.join(', ');
            }
        }
    } catch (_) {}

    try {
        // --- EXPAND PROJECT EMAILS ---
        const extractEmails = str => {
            if (!str) return [];
            const matches = str.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
            return matches ? matches.map(e => e.toLowerCase()) : [];
        };

        let assignedProjectId = projectId || null;
        if (!assignedProjectId) {
            const prjMatch = await new Promise((resolve) => {
                db.get(
                    `SELECT project_id FROM projects WHERE organization_id = ? AND (
                        LOWER(?) LIKE '%' || LOWER(project_email_id) || '%' OR 
                        LOWER(?) LIKE '%' || LOWER(project_name) || '%'
                    ) LIMIT 1`,
                    [context.orgId, to, to],
                    (err, r) => resolve(r)
                );
            });
            if (prjMatch) assignedProjectId = prjMatch.project_id;
        }

        const expandRecipients = async (fieldStr) => {
            if (!fieldStr) return fieldStr;
            let fieldEmails = extractEmails(fieldStr);
            if (fieldEmails.length === 0) return fieldStr;

            const projects = await new Promise((resolve) => {
                db.all('SELECT project_email_id, leader, client, employee_name FROM projects WHERE organization_id = ?', [context.orgId], (err, rows) => {
                    resolve(err ? [] : rows);
                });
            });

            let expandedField = fieldStr;
            let expandedList = [];

            fieldEmails.forEach(email => {
                const project = projects.find(p => p.project_email_id && p.project_email_id.toLowerCase() === email);
                if (project) {
                    const memberEmails = [];
                    [project.leader, project.client, project.employee_name].forEach(group => {
                        if (group) memberEmails.push(...extractEmails(group));
                    });

                    if (memberEmails.length > 0) {
                        expandedList.push(...memberEmails);
                        const safeEmail = email.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
                        const regex1 = new RegExp(`[^,]*<${safeEmail}>`, 'gi');
                        expandedField = expandedField.replace(regex1, '');
                        const regex2 = new RegExp(safeEmail, 'gi');
                        expandedField = expandedField.replace(regex2, '');
                    }
                }
            });

            if (expandedList.length > 0) {
                // Deduplicate expanded list
                expandedList = [...new Set(expandedList)];
                const addStr = expandedList.join(', ');
                expandedField = expandedField.trim() ? `${expandedField}, ${addStr}` : addStr;
                // Cleanup commas
                expandedField = expandedField.replace(/^[,\s]+|[,\s]+$/g, '').replace(/,\s*,/g, ',');
            }
            return expandedField;
        };

        to = await expandRecipients(to);
        cc = await expandRecipients(cc);
        bcc = await expandRecipients(bcc);

        // If to becomes empty after removing virtual project emails but cc/bcc exist, handle it or just fail?
        if (!to && (cc || bcc)) {
            to = cc || bcc; // Fallback to send somewhere if 'to' was only virtual and had no members?
        }
        if (!to) {
            return res.status(400).json({ error: 'No valid recipients found after expanding projects.' });
        }
        // -----------------------------

        // Fetch sender details and sync provider
        const senderUser = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [context.userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!senderUser) {
            console.log("[DEBUG SEND EMAIL] Sender not found for context.userId:", context.userId, "context:", context);
            return res.status(404).json({ error: 'Sender not found' });
        }

        if (senderUser.role === 'employee') {
            const isReply = subject && subject.toLowerCase().startsWith('re:');
            if (isReply) {
                if (senderUser.canReplyToEmails === 0 || senderUser.canReplyToEmails === false) {
                    return res.status(403).json({ error: 'Action blocked: Your admin has disabled this feature.' });
                }
            } else {
                if (senderUser.canSendEmails === 0 || senderUser.canSendEmails === false) {
                    return res.status(403).json({ error: 'Action blocked: Your admin has disabled this feature.' });
                }
            }
        }

        const senderEmail = senderUser.email;
        const senderName = senderUser.admin_name || 'Safemailz User';

        if (senderUser.sync_provider === 'google') {
            const token = await getValidAccessToken(senderUser);
            if (!token) return res.status(401).json({ error: 'Google OAuth token expired or invalid' });

            const rawEmail = await buildRawMessage({from:{name:senderName,address:senderEmail},to,cc,bcc,subject,html:body,attachments,priority:importance});

            const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ raw: rawEmail })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Gmail send error:', errorData);
                if (response.status === 403 || response.status === 401) {
                    return res.status(403).json({ error: 'Permission denied. Please reconnect your Google account in Manage Apps to grant send permissions.' });
                }
                const errorMessage = errorData.error && errorData.error.message ? errorData.error.message : 'Failed to send via Gmail';
                return res.status(500).json({ error: `Gmail Error: ${errorMessage}` });
            }
        } else if (senderUser.sync_provider === 'microsoft') {
            const token = await getValidAccessToken(senderUser);
            if (!token) return res.status(401).json({ error: 'Microsoft OAuth token expired or invalid' });

            const graphMessage = {
                importance,
                attachments: attachments.map(a=>({'@odata.type':'#microsoft.graph.fileAttachment',name:a.filename,contentType:a.contentType,contentBytes:a.content.toString('base64')})),
                subject: subject,
                body: {
                    contentType: 'HTML',
                    content: body
                },
                toRecipients: to.split(',').map(email => ({ emailAddress: { address: email.trim() } }))
            };
            if (cc) graphMessage.ccRecipients = cc.split(',').map(email => ({ emailAddress: { address: email.trim() } }));
            if (bcc) graphMessage.bccRecipients = bcc.split(',').map(email => ({ emailAddress: { address: email.trim() } }));

            const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: graphMessage,
                    saveToSentItems: true
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('MS Graph send error:', errorData);
                if (response.status === 403) {
                    return res.status(403).json({ error: 'Permission denied. Please reconnect your Microsoft account in Manage Apps to grant send permissions.' });
                }
                return res.status(500).json({ error: 'Failed to send via Microsoft' });
            }
        } else {
            const smtpHost = process.env.SMTP_HOST;
            const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
            const smtpUser = process.env.SMTP_EMAIL || process.env.SMTP_USER;
            const smtpPass = process.env.SMTP_PASSWORD;

            if (!smtpUser || !smtpPass) {
                return res.status(500).json({ error: 'SMTP configuration is missing. Please configure SMTP_EMAIL and SMTP_PASSWORD in .env' });
            }

            const transporter = nodemailer.createTransport(
                smtpHost ? {
                    host: smtpHost,
                    port: smtpPort,
                    secure: process.env.SMTP_SECURE === 'true' || smtpPort === 465,
                    auth: {
                        user: smtpUser,
                        pass: smtpPass
                    }
                } : {
                    service: 'gmail',
                    auth: {
                        user: smtpUser,
                        pass: smtpPass
                    }
                }
            );

            await transporter.sendMail({
                from: `"${senderName} (via Safemailz)" <${smtpUser}>`,
                replyTo: senderEmail,
                to: to,
                cc: cc || undefined,
                bcc: bcc || undefined,
                subject: subject,
                html: body,
                attachments,
                priority: importance
            });
        }

        // External send successful. Now save locally.
        const allRecipientEmails = [...new Set([
            ...extractEmails(to),
            ...extractEmails(cc),
            ...extractEmails(bcc)
        ])];

        const internalRecipients = [];
        for (const rEmail of allRecipientEmails) {
            const rUser = await new Promise((resolve) => {
                db.get('SELECT id, organization_id FROM users WHERE LOWER(email) = ?', [rEmail.toLowerCase()], (err, row) => resolve(row));
            });
            if (rUser && !internalRecipients.some(u => u.id === rUser.id)) {
                internalRecipients.push(rUser);
            }
        }

        // If assignedProjectId exists, also add all internal project members (leader + employees)
        if (assignedProjectId) {
            const project = await new Promise((resolve) => {
                db.get('SELECT * FROM projects WHERE organization_id = ? AND (project_id = ? OR id = ?)', [context.orgId, assignedProjectId, assignedProjectId], (err, row) => resolve(row));
            });
            if (project) {
                const memberEmails = extractEmails(`${project.leader} ${project.employee_name}`);
                for (const mEmail of memberEmails) {
                    const mUser = await new Promise((resolve) => {
                        db.get('SELECT id, organization_id FROM users WHERE LOWER(email) = ?', [mEmail.toLowerCase()], (err, row) => resolve(row));
                    });
                    if (mUser && !internalRecipients.some(u => u.id === mUser.id)) {
                        internalRecipients.push(mUser);
                    }
                }
            }
        }

        const emailNo = Math.floor(10000 + Math.random() * 90000).toString(); // Simple random 5 digit No
        // Strip HTML tags for the preview text
        const plainTextBody = body.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
        const preview = plainTextBody.substring(0, 100);

        const dbRun = (query, params = []) => new Promise((resolve, reject) => {
            db.run(query, params, function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        try {
            await dbRun('BEGIN TRANSACTION');

            const emailInsertResult = await dbRun(
                `INSERT INTO emails (email_no, sender_id, sender_org_id, subject, body, preview, to_address, cc, bcc, project_id, delivery_status, is_visible_in_inbox) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DELIVERED', 1)`,
                [emailNo, context.userId, context.orgId, subject, body, preview, to, cc || null, bcc || null, assignedProjectId]
            );
            const emailId = emailInsertResult.lastID;
            for (const attachment of attachments) {
                await dbRun('INSERT INTO email_attachments (email_id, filename, content_type, size, data) VALUES (?, ?, ?, ?, ?)', [emailId, attachment.filename, attachment.contentType, attachment.content.length, attachment.content.toString('base64')]);
            }

            // Insert for recipient (Inbox) if they are internal
            for (const rUser of internalRecipients) {
                if (rUser.id !== context.userId) {
                    await dbRun(
                        `INSERT INTO email_recipients (email_id, user_id, organization_id, folder, is_read) VALUES (?, ?, ?, 'inbox', 0)`,
                        [emailId, rUser.id, rUser.organization_id]
                    );
                }
            }

            // Insert for sender (Sent)
            await dbRun(
                `INSERT INTO email_recipients (email_id, user_id, organization_id, folder, is_read) VALUES (?, ?, ?, 'sent', 1)`,
                [emailId, context.userId, context.orgId]
            );

            await dbRun('COMMIT');
            res.json({ success: true, message: 'Email sent' });
        } catch (dbErr) {
            console.error('Local DB save failed:', dbErr);
            await dbRun('ROLLBACK').catch(e => console.error('Rollback failed:', e));
            return res.json({ success: true, message: 'Email sent, but failed to save in local sent items' });
        }

    } catch (err) {
        console.error('Send mail error:', err);
        return res.status(500).json({ error: 'An unexpected error occurred while sending email' });
    }
});

// POST /api/emails/draft
router.post('/draft', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { id, to, subject, body } = req.body;
    const preview = body ? body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 100).trim() : '';

    const dbRun = (query, params = []) => new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });

    if (id) {
        // Updating an existing draft
        db.get('SELECT sender_id FROM emails WHERE id = ?', [id], async (err, emailRow) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!emailRow) return res.status(404).json({ error: 'Draft not found' });
            if (emailRow.sender_id !== context.userId) return res.status(403).json({ error: 'Access denied' });

            try {
                await dbRun('BEGIN TRANSACTION');
                await dbRun('UPDATE emails SET subject = ?, body = ?, preview = ? WHERE id = ?', [subject || '', body || '', preview, id]);
                await dbRun('COMMIT');
                res.json({ success: true, message: 'Draft updated', emailId: id });
            } catch (updateErr) {
                console.error('Draft update error:', updateErr);
                await dbRun('ROLLBACK').catch(() => { });
                return res.status(500).json({ error: 'Failed to update draft' });
            }
        });
    } else {
        // Creating a new draft
        const emailNo = Math.floor(10000 + Math.random() * 90000).toString(); // Simple random 5 digit No

        (async () => {
            try {
                await dbRun('BEGIN TRANSACTION');

                const insertResult = await dbRun(
                    `INSERT INTO emails (email_no, sender_id, sender_org_id, subject, body, preview) VALUES (?, ?, ?, ?, ?, ?)`,
                    [emailNo, context.userId, context.orgId, subject || '', body || '', preview]
                );
                const emailId = insertResult.lastID;

                await dbRun(
                    `INSERT INTO email_recipients (email_id, user_id, organization_id, folder, is_read) VALUES (?, ?, ?, 'drafts', 1)`,
                    [emailId, context.userId, context.orgId]
                );

                await dbRun('COMMIT');
                res.json({ success: true, message: 'Draft saved', emailId: emailId });
            } catch (draftErr) {
                console.error('Draft save error:', draftErr);
                await dbRun('ROLLBACK').catch(() => { });
                return res.status(500).json({ error: 'Failed to create draft' });
            }
        })();
    }
});

// PUT /api/emails/:id/status
router.put('/:id/status', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const emailId = req.params.id;
    const { folder, is_read, is_deleted } = req.body;

    let updates = [];
    let params = [];
    if (folder !== undefined) { updates.push('folder = ?'); params.push(folder); }
    if (is_read !== undefined) { updates.push('is_read = ?'); params.push(is_read ? 1 : 0); }
    if (is_deleted !== undefined) { updates.push('is_deleted = ?'); params.push(is_deleted ? 1 : 0); }

    if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });

    params.push(emailId, context.userId);
    const query = `UPDATE email_recipients SET ${updates.join(', ')} WHERE email_id = ? AND user_id = ?`;

    db.run(query, params, function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
});

// GET /api/emails/:id/comments
router.get('/:id/comments', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const emailId = req.params.id;

    // Ensure user has access to this email
    db.get('SELECT 1 FROM email_recipients WHERE email_id = ? AND user_id = ?', [emailId, context.userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(403).json({ error: 'Access denied' });

        const query = `
            SELECT c.id, c.comment, c.created_at, u.admin_name as user_name
            FROM email_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.email_id = ?
            ORDER BY c.created_at DESC
        `;
        db.all(query, [emailId], (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({
                success: true,
                comments: rows.map(r => ({
                    id: r.id,
                    comment: r.comment,
                    user_name: r.user_name,
                    date: formatToISTDateTime(r.created_at)
                }))
            });
        });
    });
});

// POST /api/emails/:id/comments
router.post('/:id/comments', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const emailId = req.params.id;
    const { comment } = req.body;

    if (!comment) return res.status(400).json({ error: 'Comment required' });

    db.get('SELECT 1 FROM email_recipients WHERE email_id = ? AND user_id = ?', [emailId, context.userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(403).json({ error: 'Access denied' });

        db.run('INSERT INTO email_comments (email_id, user_id, comment) VALUES (?, ?, ?)', [emailId, context.userId, comment], function (err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true, commentId: this.lastID });
        });
    });
});

// GET /api/emails/:id/attachments/:attachmentId
router.get('/:id/attachments/:attachmentId', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const emailId = req.params.id;
    const attachmentId = req.params.attachmentId;
    const jobId = req.query.jobId;

    // Enhanced masking logic for attachments
    function maskAttachmentText(text) {
        if (!text) return text;
        // Mask emails (e.g., raxxxx@xxxxx.com)
        let masked = text.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})/g, (match, local, domain, ext) => {
            const localMasked = local.length <= 2 ? local : local.substring(0, 2) + 'x'.repeat(local.length - 2);
            const domainMasked = 'x'.repeat(domain.length);
            return `${localMasked}@${domainMasked}.${ext}`;
        });
        // Mask phones (keep +countryCode and first few digits, mask the rest)
        masked = masked.replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, (match) => {
            let digitsCount = 0;
            let result = '';
            for (let i = 0; i < match.length; i++) {
                let char = match[i];
                if (/\d/.test(char)) {
                    if (digitsCount < 4) {
                        result += char;
                    } else {
                        result += 'x';
                    }
                    digitsCount++;
                } else if (char === '+') {
                    result += char;
                } else {
                    result += char;
                }
            }
            return result;
        });
        return masked;
    }

    // Function to process attachment data
    async function processAttachmentData(buffer, filename, mimeType, isRecipient, jobId, attachmentId, cachedRedactedData) {
        if (!isRecipient) return { buffer, mimeType, filename };

        // Process based on mimeType
        if (mimeType.includes('text/') || mimeType === 'text/csv' || mimeType.includes('xml') || mimeType === 'application/json') {
            let text = buffer.toString('utf8');
            text = maskAttachmentText(text);
            return { buffer: Buffer.from(text, 'utf8'), mimeType, filename };
        }

        if (mimeType === 'application/pdf') {
            if (cachedRedactedData) {
                console.log('Serving cached redacted PDF...');
                return { buffer: Buffer.from(cachedRedactedData, 'base64'), mimeType, filename };
            }

            try {
                console.log('Starting OCR Redaction for PDF...');
                const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
                const pdfDoc = await PDFDocument.load(buffer);
                const pages = pdfDoc.getPages();

                const base64Pdf = buffer.toString('base64');
                const page = await browser.newPage();
                await page.setContent(`
                <!DOCTYPE html>
                <html>
                <head>
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
                </head>
                <body>
                    <canvas id="pdf-canvas"></canvas>
                    <script>
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
                        window.renderPage = async (base64, pageNum) => {
                            const pdfData = atob(base64);
                            const array = new Uint8Array(pdfData.length);
                            for (let i = 0; i < pdfData.length; i++) {
                                array[i] = pdfData.charCodeAt(i);
                            }
                            const pdf = await window.pdfjsLib.getDocument({data: array}).promise;
                            const page = await pdf.getPage(pageNum);
                            
                            const scale = 2.0; 
                            const viewport = page.getViewport({scale: scale});
                            
                            const canvas = document.getElementById('pdf-canvas');
                            const context = canvas.getContext('2d');
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            
                            await page.render({ canvasContext: context, viewport: viewport }).promise;
                            
                            return {
                                dataUrl: canvas.toDataURL('image/png'),
                                scale: scale,
                                pdfWidth: viewport.width / scale,
                                pdfHeight: viewport.height / scale
                            };
                        };
                    </script>
                </body>
                </html>
            `);

                const worker = await Tesseract.createWorker('eng');

                const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;

                for (let i = 0; i < pages.length; i++) {
                    if (jobId) globalDownloadProgress.set(jobId, Math.round((i / pages.length) * 100));

                    const pageNum = i + 1;
                    const pdfPage = pages[i];

                    const renderData = await page.evaluate(async (b64, num) => {
                        return await window.renderPage(b64, num);
                    }, base64Pdf, pageNum);

                    const imgBuffer = Buffer.from(renderData.dataUrl.split(',')[1], 'base64');
                    const { data } = await worker.recognize(imgBuffer, {}, { blocks: true });

                    if (!data.blocks) continue;

                    let words = [];
                    data.blocks.forEach(b => b.paragraphs.forEach(p => p.lines.forEach(l => l.words.forEach(w => words.push(w)))));

                    words.forEach(word => {
                        let text = word.text.trim();
                        if (emailRegex.test(text) || phoneRegex.test(text)) {
                            if (text.replace(/\\D/g, '').length < 8 && !text.includes('@')) return;

                            const scale = renderData.scale;
                            const boxX = word.bbox.x0 / scale;
                            const boxY = renderData.pdfHeight - (word.bbox.y1 / scale);
                            const boxWidth = (word.bbox.x1 - word.bbox.x0) / scale;
                            const boxHeight = (word.bbox.y1 - word.bbox.y0) / scale;

                            pdfPage.drawRectangle({
                                x: boxX - 2,
                                y: boxY - 2,
                                width: boxWidth + 4,
                                height: boxHeight + 4,
                                color: rgb(0, 0, 0),
                            });
                        }
                    });
                }

                await worker.terminate();
                await browser.close();

                if (jobId) {
                    globalDownloadProgress.set(jobId, 100);
                    setTimeout(() => globalDownloadProgress.delete(jobId), 10000);
                }

                const pdfBytes = await pdfDoc.save();
                const processedBuffer = Buffer.from(pdfBytes);

                // Cache the redacted PDF in the database
                if (attachmentId) {
                    db.run('UPDATE email_attachments SET redacted_data = ? WHERE id = ?', [processedBuffer.toString('base64'), attachmentId], (err) => {
                        if (err) console.error('Failed to cache redacted PDF:', err.message);
                    });
                }

                return { buffer: processedBuffer, mimeType, filename };
            } catch (e) {
                console.error('OCR Redaction error', e);
                // Fallback to original buffer if OCR crashes
                return { buffer, mimeType, filename };
            }
        }

        return { buffer, mimeType, filename };
    }

    const runDownload = (targetUserId) => {
        db.get('SELECT sender_id FROM emails WHERE id = ?', [emailId], (err, emailRow) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!emailRow) return res.status(404).json({ error: 'Email not found' });

            const isSender = emailRow.sender_id === targetUserId;

            db.get('SELECT 1 FROM email_recipients WHERE email_id = ? AND user_id = ?', [emailId, targetUserId], (err, recipientRow) => {
                if (err) return res.status(500).json({ error: 'Database error' });

                const isRecipient = !!recipientRow;

                if (!isSender && !isRecipient) {
                    return res.status(403).json({ error: 'Access denied' });
                }

                db.get('SELECT filename, content_type, data, redacted_data FROM email_attachments WHERE id = ? AND email_id = ?', [attachmentId, emailId], async (err, att) => {
                    if (err) return res.status(500).json({ error: 'Database error' });
                    if (!att) return res.status(404).json({ error: 'Attachment not found' });

                    try {
                        const originalBuffer = Buffer.from(att.data, 'base64');
                        const processed = await processAttachmentData(
                            originalBuffer,
                            att.filename,
                            att.content_type || 'application/octet-stream',
                            isRecipient && !isSender,
                            jobId,
                            attachmentId,
                            att.redacted_data
                        );

                        res.setHeader('Content-Type', processed.mimeType);
                        res.setHeader('Content-Disposition', `attachment; filename="${processed.filename}"`);
                        res.send(processed.buffer);
                    } catch (e) {
                        res.status(500).json({ error: 'Failed to process attachment data' });
                    }
                });
            });
        });
    };

    if (context.activeEmail) {
        db.get('SELECT id FROM users WHERE email = ?', [context.activeEmail], (err, row) => {
            if (!err && row) {
                runDownload(row.id);
            } else {
                runDownload(context.userId);
            }
        });
    } else {
        runDownload(context.userId);
    }
});

// POST /api/emails/inbound
// Webhook for receiving inbound emails (e.g., from clients to project emails)
router.post('/inbound', async (req, res) => {
    const { sender, recipient, subject, bodyText, bodyHtml } = req.body;

    if (!sender || !recipient) {
        return res.status(400).json({ error: 'Sender and recipient are required.' });
    }

    const emailNo = Math.floor(10000 + Math.random() * 90000).toString();
    const externalId = `inbound-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const body = bodyHtml || bodyText || '';
    const plainTextBody = body.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    const preview = plainTextBody.substring(0, 100);

    const dbRun = (query, params = []) => new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });

    const dbGet = (query, params = []) => new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });

    const dbAll = (query, params = []) => new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    try {
        await dbRun('BEGIN TRANSACTION');

        // 1. Find if recipient is a project email
        let orgId = null;
        let projectMembers = [];
        const project = await dbGet('SELECT * FROM projects WHERE LOWER(project_email_id) = ?', [recipient.toLowerCase()]);

        if (project) {
            orgId = project.organization_id;

            // Extract all emails associated with this project (leader, employee)
            const extractEmails = (str) => {
                if (!str) return [];
                const regex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
                return str.match(regex) || [];
            };

            const memberEmails = [
                ...extractEmails(project.leader),
                ...extractEmails(project.employee_name)
            ];

            // Find internal users for these emails
            for (const mEmail of memberEmails) {
                const user = await dbGet('SELECT id, organization_id, is_inbox_snoozed, snooze_until FROM users WHERE email = ? AND organization_id = ?', [mEmail, orgId]);
                if (user) {
                    projectMembers.push(user);
                }
            }
        } else {
            // If not a project email, see if it's a direct user email
            const user = await dbGet('SELECT id, organization_id, is_inbox_snoozed, snooze_until FROM users WHERE LOWER(email) = ?', [recipient.toLowerCase()]);
            if (user) {
                orgId = user.organization_id;
                projectMembers.push(user);
            }
        }

        if (!orgId) {
            await dbRun('ROLLBACK');
            return res.status(404).json({ error: 'Recipient not found in any project or user account.' });
        }

        const now = new Date();
        const anySnoozed = projectMembers.some(u =>
            (u.is_inbox_snoozed === 1 || u.is_inbox_snoozed === true) &&
            u.snooze_until &&
            now < new Date(u.snooze_until)
        );
        const deliveryStatus = anySnoozed ? 'HELD_BY_SNOOZE' : 'DELIVERED';
        const isVisibleInInbox = anySnoozed ? 0 : 1;

        // 2. Insert into emails table
        const insertRes = await dbRun(
            `INSERT INTO emails (email_no, sender_org_id, external_sender_name, external_sender_email, external_id, subject, body, preview, to_address, delivery_status, is_visible_in_inbox) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [emailNo, orgId, sender, sender, externalId, subject || 'No Subject', body, preview, recipient, deliveryStatus, isVisibleInInbox]
        );
        const emailId = insertRes.lastID;

        // 3. Insert into email_recipients for all members
        const uniqueMemberIds = [...new Set(projectMembers.map(u => u.id))];
        for (const userId of uniqueMemberIds) {
            await dbRun(
                `INSERT INTO email_recipients (email_id, user_id, organization_id, folder, is_read) VALUES (?, ?, ?, 'inbox', 0)`,
                [emailId, userId, orgId]
            );
        }

        await dbRun('COMMIT');
        return res.json({ success: true, message: 'Inbound email received and saved.', emailId, recipientsCount: uniqueMemberIds.length });
    } catch (err) {
        console.error('Inbound webhook error:', err);
        await dbRun('ROLLBACK').catch(e => console.error('Rollback failed:', e));
        return res.status(500).json({ error: 'Failed to process inbound email' });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// OUTLOOK CONTEXT MENU & BULK EMAIL ACTIONS
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/email/bulk-action & /api/emails/bulk-action
router.post('/bulk-action', async (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    let { emailIds, action, payload } = req.body;
    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
        return res.status(400).json({ error: 'emailIds must be a non-empty array' });
    }
    if (!action) {
        return res.status(400).json({ error: 'action is required' });
    }

    action = String(action).toUpperCase();
    const userId = context.userId;
    const orgId = context.orgId || 1;

    // Helper to ensure recipient record exists for every selected email
    const ensureRecipients = () => new Promise((resolve) => {
        let done = 0;
        emailIds.forEach(eid => {
            db.get('SELECT id FROM email_recipients WHERE email_id = ? AND user_id = ?', [eid, userId], (err, row) => {
                if (!row) {
                    db.run("INSERT INTO email_recipients (email_id, user_id, organization_id, folder, is_read) VALUES (?, ?, ?, 'inbox', 0)", [eid, userId, orgId], () => {
                        done++;
                        if (done === emailIds.length) resolve();
                    });
                } else {
                    done++;
                    if (done === emailIds.length) resolve();
                }
            });
        });
    });

    try {
        await ensureRecipients();
        const placeholders = emailIds.map(() => '?').join(',');

        if (action === 'DELETE') {
            db.all(`SELECT email_id, folder FROM email_recipients WHERE user_id = ? AND email_id IN (${placeholders})`, [userId, ...emailIds], (err, rows) => {
                if (err) return res.status(500).json({ error: 'Database error' });

                const toPermanentlyDelete = [];
                const toMoveToTrash = [];

                (rows || []).forEach(r => {
                    const f = String(r.folder || '').toLowerCase();
                    if (f === 'deleted' || f === 'trash') {
                        toPermanentlyDelete.push(r.email_id);
                    } else {
                        toMoveToTrash.push(r.email_id);
                    }
                });

                emailIds.forEach(id => {
                    if (!toPermanentlyDelete.includes(id) && !toMoveToTrash.includes(id)) {
                        toMoveToTrash.push(id);
                    }
                });

                if (toPermanentlyDelete.length > 0) {
                    const permPl = toPermanentlyDelete.map(() => '?').join(',');
                    db.run(`UPDATE email_recipients SET is_deleted = 1 WHERE user_id = ? AND email_id IN (${permPl})`, [userId, ...toPermanentlyDelete]);
                }

                if (toMoveToTrash.length > 0) {
                    const trashPl = toMoveToTrash.map(() => '?').join(',');
                    db.run(`UPDATE email_recipients SET folder = 'deleted' WHERE user_id = ? AND email_id IN (${trashPl})`, [userId, ...toMoveToTrash]);
                }

                return res.json({ success: true, action, emailIds, affectedCount: emailIds.length, message: 'Emails deleted successfully' });
            });
            return;
        }

        if (action === 'RESTORE') {
            db.run(`UPDATE email_recipients SET folder = 'inbox', is_deleted = 0 WHERE user_id = ? AND email_id IN (${placeholders})`, [userId, ...emailIds], (err) => {
                if (err) return res.status(500).json({ error: 'Database error' });
                return res.json({ success: true, action, emailIds, affectedCount: emailIds.length, message: 'Emails restored to Inbox' });
            });
            return;
        }

        if (action === 'ARCHIVE') {
            db.run(`UPDATE email_recipients SET folder = 'archive' WHERE user_id = ? AND email_id IN (${placeholders})`, [userId, ...emailIds], (err) => {
                if (err) return res.status(500).json({ error: 'Database error' });
                return res.json({ success: true, action, emailIds, affectedCount: emailIds.length, message: 'Emails moved to Archive' });
            });
            return;
        }

        if (action === 'MOVE') {
            const target = payload?.targetFolderId || 'inbox';
            db.get('SELECT project_id FROM projects WHERE project_id = ? OR id = ?', [target, target], (errProj, projRow) => {
                if (projRow) {
                    db.run(`UPDATE emails SET project_id = ? WHERE id IN (${placeholders})`, [projRow.project_id, ...emailIds]);
                    db.run(`UPDATE email_recipients SET folder = 'inbox' WHERE user_id = ? AND email_id IN (${placeholders})`, [userId, ...emailIds]);
                    return res.json({ success: true, action, emailIds, targetFolder: projRow.project_id, affectedCount: emailIds.length, message: `Moved to project ${projRow.project_id}` });
                } else {
                    const cleanFolder = target.toLowerCase();
                    db.run(`UPDATE email_recipients SET folder = ? WHERE user_id = ? AND email_id IN (${placeholders})`, [cleanFolder, userId, ...emailIds], (err) => {
                        if (err) return res.status(500).json({ error: 'Database error' });
                        return res.json({ success: true, action, emailIds, targetFolder: cleanFolder, affectedCount: emailIds.length, message: `Moved to ${cleanFolder}` });
                    });
                }
            });
            return;
        }

        if (action === 'COPY') {
            const target = (payload?.targetFolderId || 'inbox').toLowerCase();
            db.all(`SELECT * FROM emails WHERE id IN (${placeholders})`, emailIds, async (err, originalEmails) => {
                if (err || !originalEmails) return res.status(500).json({ error: 'Failed to fetch emails for copy' });

                let copiedCount = 0;
                for (const em of originalEmails) {
                    const newEmailNo = `${em.email_no || 'EML'}-COPY-${Date.now().toString().slice(-4)}`;
                    await new Promise(r => {
                        db.run(
                            `INSERT INTO emails (email_no, sender_id, sender_org_id, external_sender_name, external_sender_email, external_id, subject, body, preview, to_address, cc, bcc, project_id, delivery_status, is_visible_in_inbox, is_pinned, is_flagged, categories, is_ignored)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, ?, 0)`,
                            [
                                newEmailNo, em.sender_id, em.sender_org_id, em.external_sender_name, em.external_sender_email,
                                `copy_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                                `[Copy] ${em.subject || ''}`, em.body, em.preview, em.to_address, em.cc, em.bcc, em.project_id,
                                em.delivery_status || 'DELIVERED', em.categories || '[]'
                            ],
                            function (insErr) {
                                if (!insErr && this.lastID) {
                                    db.run(
                                        `INSERT INTO email_recipients (email_id, user_id, organization_id, folder, is_read) VALUES (?, ?, ?, ?, 1)`,
                                        [this.lastID, userId, orgId, target],
                                        () => { copiedCount++; r(); }
                                    );
                                } else {
                                    r();
                                }
                            }
                        );
                    });
                }
                return res.json({ success: true, action, emailIds, affectedCount: copiedCount, message: `Copied ${copiedCount} email(s) to ${target}` });
            });
            return;
        }

        if (action === 'MARK_UNREAD') {
            db.run(`UPDATE email_recipients SET is_read = 0 WHERE user_id = ? AND email_id IN (${placeholders})`, [userId, ...emailIds], (err) => {
                if (err) return res.status(500).json({ error: 'Database error' });
                return res.json({ success: true, action, emailIds, affectedCount: emailIds.length, message: 'Marked as unread' });
            });
            return;
        }

        if (action === 'MARK_READ') {
            db.run(`UPDATE email_recipients SET is_read = 1 WHERE user_id = ? AND email_id IN (${placeholders})`, [userId, ...emailIds], (err) => {
                if (err) return res.status(500).json({ error: 'Database error' });
                return res.json({ success: true, action, emailIds, affectedCount: emailIds.length, message: 'Marked as read' });
            });
            return;
        }

        if (action === 'PIN') {
            db.run(`UPDATE email_recipients SET is_pinned = 1 WHERE user_id = ? AND email_id IN (${placeholders})`, [userId, ...emailIds], () => {
                db.run(`UPDATE emails SET is_pinned = 1 WHERE id IN (${placeholders})`, emailIds, () => {
                    return res.json({ success: true, action, emailIds, affectedCount: emailIds.length, message: 'Pinned to top' });
                });
            });
            return;
        }

        if (action === 'UNPIN') {
            db.run(`UPDATE email_recipients SET is_pinned = 0 WHERE user_id = ? AND email_id IN (${placeholders})`, [userId, ...emailIds], () => {
                db.run(`UPDATE emails SET is_pinned = 0 WHERE id IN (${placeholders})`, emailIds, () => {
                    return res.json({ success: true, action, emailIds, affectedCount: emailIds.length, message: 'Unpinned' });
                });
            });
            return;
        }

        if (action === 'FLAG') {
            db.run(`UPDATE email_recipients SET is_flagged = 1 WHERE user_id = ? AND email_id IN (${placeholders})`, [userId, ...emailIds], () => {
                db.run(`UPDATE emails SET is_flagged = 1 WHERE id IN (${placeholders})`, emailIds, () => {
                    return res.json({ success: true, action, emailIds, affectedCount: emailIds.length, message: 'Flagged for follow up' });
                });
            });
            return;
        }

        if (action === 'UNFLAG') {
            db.run(`UPDATE email_recipients SET is_flagged = 0 WHERE user_id = ? AND email_id IN (${placeholders})`, [userId, ...emailIds], () => {
                db.run(`UPDATE emails SET is_flagged = 0 WHERE id IN (${placeholders})`, emailIds, () => {
                    return res.json({ success: true, action, emailIds, affectedCount: emailIds.length, message: 'Flag removed' });
                });
            });
            return;
        }

        if (action === 'CATEGORIZE') {
            const color = payload?.categoryColor;
            const catJson = (!color || color === 'clear' || color === 'none') ? '[]' : JSON.stringify([color]);
            db.run(`UPDATE email_recipients SET categories = ? WHERE user_id = ? AND email_id IN (${placeholders})`, [catJson, userId, ...emailIds], () => {
                db.run(`UPDATE emails SET categories = ? WHERE id IN (${placeholders})`, [catJson, ...emailIds], () => {
                    return res.json({ success: true, action, emailIds, category: color, affectedCount: emailIds.length, message: color === 'clear' ? 'Categories cleared' : `Categorized as ${color}` });
                });
            });
            return;
        }

        if (action === 'SNOOZE') {
            const until = payload?.snoozeUntil || new Date(Date.now() + 24 * 3600 * 1000).toISOString();
            db.run(`UPDATE email_recipients SET folder = 'snooze' WHERE user_id = ? AND email_id IN (${placeholders})`, [userId, ...emailIds], () => {
                db.run(`UPDATE emails SET snoozed_until = ? WHERE id IN (${placeholders})`, [until, ...emailIds], () => {
                    return res.json({ success: true, action, emailIds, snoozeUntil: until, affectedCount: emailIds.length, message: `Snoozed until ${new Date(until).toLocaleString()}` });
                });
            });
            return;
        }

        if (action === 'UNSNOOZE') {
            db.run(`UPDATE email_recipients SET folder = 'inbox' WHERE user_id = ? AND email_id IN (${placeholders})`, [userId, ...emailIds], () => {
                db.run(`UPDATE emails SET snoozed_until = NULL WHERE id IN (${placeholders})`, emailIds, () => {
                    return res.json({ success: true, action, emailIds, affectedCount: emailIds.length, message: 'Restored to Inbox' });
                });
            });
            return;
        }

        if (action === 'IGNORE') {
            db.run(`UPDATE email_recipients SET is_ignored = 1, folder = 'deleted' WHERE user_id = ? AND email_id IN (${placeholders})`, [userId, ...emailIds], () => {
                db.run(`UPDATE emails SET is_ignored = 1 WHERE id IN (${placeholders})`, emailIds, () => {
                    return res.json({ success: true, action, emailIds, affectedCount: emailIds.length, message: 'Conversation ignored and moved to Deleted Items' });
                });
            });
            return;
        }

        if (action === 'REPORT') {
            const rType = payload?.reportType === 'phishing' ? 'phishing' : 'junk';
            db.run(`UPDATE email_recipients SET folder = 'junk' WHERE user_id = ? AND email_id IN (${placeholders})`, [userId, ...emailIds]);
            emailIds.forEach(eid => {
                db.run('INSERT INTO email_security_reports (user_id, email_id, report_type, details) VALUES (?, ?, ?, ?)', [userId, eid, rType, 'Reported via Outlook Context Menu']);
            });
            return res.json({ success: true, action, emailIds, reportType: rType, affectedCount: emailIds.length, message: `Reported as ${rType} and moved to Junk Email` });
        }

        if (action === 'BLOCK') {
            db.all(`SELECT DISTINCT COALESCE(external_sender_email, (SELECT email FROM users WHERE id = emails.sender_id)) as sender_email, external_sender_name FROM emails WHERE id IN (${placeholders})`, emailIds, (err, senders) => {
                (senders || []).forEach(s => {
                    if (s.sender_email) {
                        db.run(
                            `INSERT OR IGNORE INTO blocked_senders (user_id, organization_id, sender_email, sender_name, reason) VALUES (?, ?, ?, ?, 'blocked by user')`,
                            [userId, orgId, s.sender_email.toLowerCase().trim(), s.external_sender_name || '']
                        );
                    }
                });
                db.run(`UPDATE email_recipients SET folder = 'junk' WHERE user_id = ? AND email_id IN (${placeholders})`, [userId, ...emailIds], () => {
                    return res.json({ success: true, action, emailIds, affectedCount: emailIds.length, message: 'Blocked sender(s) and moved emails to Junk Email' });
                });
            });
            return;
        }

        return res.status(400).json({ error: `Unknown action: ${action}` });
    } catch (e) {
        console.error('Bulk action error:', e);
        return res.status(500).json({ error: 'Server error processing bulk action' });
    }
});

// Dedicated security endpoints
router.post('/security/report', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });
    const { emailIds, reportType } = req.body;
    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
        return res.status(400).json({ error: 'emailIds required' });
    }
    const rType = reportType === 'phishing' ? 'phishing' : 'junk';
    const placeholders = emailIds.map(() => '?').join(',');
    db.run(`UPDATE email_recipients SET folder = 'junk' WHERE user_id = ? AND email_id IN (${placeholders})`, [context.userId, ...emailIds]);
    emailIds.forEach(eid => {
        db.run('INSERT INTO email_security_reports (user_id, email_id, report_type, details) VALUES (?, ?, ?, ?)', [context.userId, eid, rType, 'Reported via security endpoint']);
    });
    res.json({ success: true, reportType: rType, affectedCount: emailIds.length, message: `Reported as ${rType}` });
});

router.post('/security/block-sender', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });
    const { emailIds } = req.body;
    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
        return res.status(400).json({ error: 'emailIds required' });
    }
    const placeholders = emailIds.map(() => '?').join(',');
    db.all(`SELECT DISTINCT COALESCE(external_sender_email, (SELECT email FROM users WHERE id = emails.sender_id)) as sender_email, external_sender_name FROM emails WHERE id IN (${placeholders})`, emailIds, (err, senders) => {
        (senders || []).forEach(s => {
            if (s.sender_email) {
                db.run(
                    `INSERT OR IGNORE INTO blocked_senders (user_id, organization_id, sender_email, sender_name, reason) VALUES (?, ?, ?, ?, 'blocked by user')`,
                    [context.userId, context.orgId || 1, s.sender_email.toLowerCase().trim(), s.external_sender_name || '']
                );
            }
        });
        db.run(`UPDATE email_recipients SET folder = 'junk' WHERE user_id = ? AND email_id IN (${placeholders})`, [context.userId, ...emailIds], () => {
            res.json({ success: true, affectedCount: emailIds.length, message: 'Senders blocked and emails moved to Junk' });
        });
    });
});

router.post('/thread/ignore', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });
    const { emailIds } = req.body;
    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
        return res.status(400).json({ error: 'emailIds required' });
    }
    const placeholders = emailIds.map(() => '?').join(',');
    db.run(`UPDATE email_recipients SET is_ignored = 1, folder = 'deleted' WHERE user_id = ? AND email_id IN (${placeholders})`, [context.userId, ...emailIds]);
    db.run(`UPDATE emails SET is_ignored = 1 WHERE id IN (${placeholders})`, emailIds, () => {
        res.json({ success: true, affectedCount: emailIds.length, message: 'Thread ignored and moved to Deleted Items' });
    });
});

router.get('/settings/quick-actions', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });
    db.get('SELECT settings_json FROM user_ui_settings WHERE user_id = ?', [context.userId], (err, row) => {
        let actions = ['read', 'delete', 'snooze', 'pin'];
        if (row && row.settings_json) {
            try {
                const parsed = JSON.parse(row.settings_json);
                if (Array.isArray(parsed.quickActions) && parsed.quickActions.length === 4) {
                    actions = parsed.quickActions;
                }
            } catch (e) {}
        }
        res.json({ success: true, quickActions: actions });
    });
});

router.put('/settings/quick-actions', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });
    const { actions } = req.body;
    if (!Array.isArray(actions) || actions.length !== 4) {
        return res.status(400).json({ error: 'actions must be an array of exactly 4 items' });
    }
    db.get('SELECT settings_json FROM user_ui_settings WHERE user_id = ?', [context.userId], (err, row) => {
        let currentSettings = {};
        if (row && row.settings_json) {
            try { currentSettings = JSON.parse(row.settings_json); } catch (e) {}
        }
        currentSettings.quickActions = actions;
        const newJson = JSON.stringify(currentSettings);
        if (row) {
            db.run('UPDATE user_ui_settings SET settings_json = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [newJson, context.userId], (uErr) => {
                if (uErr) return res.status(500).json({ error: 'Database error' });
                res.json({ success: true, quickActions: actions });
            });
        } else {
            db.run('INSERT INTO user_ui_settings (user_id, settings_json) VALUES (?, ?)', [context.userId, newJson], (iErr) => {
                if (iErr) return res.status(500).json({ error: 'Database error' });
                res.json({ success: true, quickActions: actions });
            });
        }
    });
});

module.exports = router;
