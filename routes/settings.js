const express = require('express');
const bcrypt = require('bcrypt');
const { db } = require('../db');
const XLSX = require('xlsx');
const crypto = require('crypto');

const router = express.Router();

// Helper to get user context from headers or decoded JWT session
const getUserContext = (req) => {
    const rawUserId = req.headers['x-user-id'] || req.user?.id || req.user?.userId;
    const rawOrgId = req.headers['x-org-id'] || req.user?.organization_id || req.user?.orgId || '1';

    if (!rawUserId) {
        return null;
    }

    const userId = parseInt(rawUserId, 10);
    const orgId = parseInt(rawOrgId, 10);

    if (isNaN(userId)) {
        return null;
    }

    const activeEmail = req.headers['x-active-email'] || req.user?.email || null;

    return {
        userId,
        orgId: isNaN(orgId) ? 1 : orgId,
        activeEmail
    };
};

// GET /api/settings/profile
router.get('/profile', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const query = `
        SELECT 
            u.id as user_id, 
            u.admin_name, 
            u.email, 
            u.role,
            u.marketing_opt_in,
            u.terms_accepted,
            u.created_at as user_joined,
            o.id as org_id,
            o.organization_name,
            o.organization_size,
            o.backup_email,
            o.created_at as org_joined
        FROM users u
        JOIN organizations o ON u.organization_id = o.id
        WHERE u.id = ? AND o.id = ?
    `;

    db.get(query, [context.userId, context.orgId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Profile not found' });

        res.json({
            success: true,
            profile: {
                user: {
                    id: row.user_id,
                    admin_name: row.admin_name,
                    email: row.email,
                    role: row.role === 'employee' ? 'Employee' : 'Admin',
                    status: 'Active',
                    marketing_opt_in: row.marketing_opt_in ? true : false,
                    terms_accepted: row.terms_accepted ? true : false,
                    joined_date: row.user_joined
                },
                organization: {
                    id: row.org_id,
                    organization_name: row.organization_name,
                    organization_size: row.organization_size,
                    backup_email: row.backup_email || '',
                    joined_date: row.org_joined
                }
            }
        });
    });
});

// GET /api/settings/employee/:email
router.get('/employee/:email', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { email } = req.params;

    const query = `
        SELECT 
            u.created_at,
            u.dob,
            u.role
        FROM users u
        WHERE u.email = ? AND u.organization_id = ?
    `;

    db.get(query, [email, context.orgId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Employee not found' });

        res.json({
            success: true,
            joined_date: row.created_at,
            dob: row.dob || 'Not provided',
            role: row.role || 'employee'
        });
    });
});

// POST /api/settings/password — uses bcrypt to match authController.js
router.post('/password', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required' });
    }

    db.get('SELECT password_hash FROM users WHERE id = ?', [context.userId], async (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'User not found' });

        try {
            // Verify current password using bcrypt (same as authController.js)
            const isMatch = await bcrypt.compare(currentPassword, row.password_hash);
            if (!isMatch) {
                return res.status(400).json({ error: 'Incorrect current password' });
            }

            // Hash the new password using bcrypt
            const saltRounds = 10;
            const newHash = await bcrypt.hash(newPassword, saltRounds);

            db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, context.userId], (updateErr) => {
                if (updateErr) return res.status(500).json({ error: 'Failed to update password' });
                res.json({ success: true, message: 'Password updated successfully' });
            });
        } catch (hashErr) {
            console.error(hashErr);
            return res.status(500).json({ error: 'Server error during password update' });
        }
    });
});

// DELETE /api/settings/account
router.delete('/account', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { userId } = context;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.run('DELETE FROM email_recipients WHERE user_id = ?', [userId], (err) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to delete recipient data' });
            }

            db.run('DELETE FROM email_comments WHERE user_id = ?', [userId], (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to delete comment data' });
                }

                db.run('UPDATE emails SET sender_id = NULL WHERE sender_id = ?', [userId], (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Failed to anonymize sent emails' });
                    }

                    db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: 'Failed to delete user account' });
                        }

                        db.run('COMMIT', (commitErr) => {
                            if (commitErr) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Transaction commit failed' });
                            }
                            res.json({ success: true, message: 'Account permanently deleted' });
                        });
                    });
                });
            });
        });
    });
});

// PUT /api/settings/employee/:email/role
router.put('/employee/:email/role', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { email } = req.params;
    const { role } = req.body;

    if (role !== 'admin' && role !== 'employee') {
        return res.status(400).json({ error: 'Invalid role' });
    }

    // Verify caller has make_admin permission or is an admin/org_owner
    db.get('SELECT role, email, perm_make_admin, organization_id FROM users WHERE id = ?', [context.userId], (err, callerRow) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        // Use loose check for 1 or true
        if (!callerRow || (callerRow.role !== 'admin' && callerRow.role !== 'org_owner' && callerRow.perm_make_admin != 1 && callerRow.perm_make_admin !== true)) {
            return res.status(403).json({ error: 'You do not have permission to change roles' });
        }

        const validOrgId = callerRow.organization_id;

        // Check if caller is trying to demote themselves
        if (callerRow.email === email && role === 'employee') {
            return res.status(400).json({ error: 'You cannot demote yourself' });
        }

        // Verify target user is not an org_owner
        db.get('SELECT role FROM users WHERE email = ? AND organization_id = ?', [email, validOrgId], (err, targetRow) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!targetRow) return res.status(404).json({ error: 'Employee not found in your organization' });
            if (targetRow.role === 'org_owner') {
                return res.status(403).json({ error: 'Cannot change the role of the Organization Owner' });
            }

            // Update role and set permissions based on role
            const perms = role === 'admin' ? 1 : 0;
            db.run(
                'UPDATE users SET role = ?, perm_add_employees = ?, perm_create_projects = ?, perm_manage_projects = ?, perm_make_admin = ?, perm_delete_project = ? WHERE email = ? AND organization_id = ?',
                [role, perms, perms, perms, perms, perms, email, validOrgId],
                function (updateErr) {
                    if (updateErr) return res.status(500).json({ error: 'Failed to update role' });
                    res.json({ success: true, message: `Role updated to ${role}` });
                }
            );
        });
    });
});

// PATCH /api/settings/employee/:id/promote
router.patch('/employee/:id/promote', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { role } = req.body;

    if (role !== 'Admin' && role !== 'admin') {
        return res.status(400).json({ error: 'Invalid role for promotion' });
    }

    const newRole = 'admin';

    // Verify caller has make_admin permission or is an admin/org_owner
    db.get('SELECT role, email, perm_make_admin, organization_id FROM users WHERE id = ?', [context.userId], (err, callerRow) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (!callerRow || (callerRow.role !== 'admin' && callerRow.role !== 'org_owner' && callerRow.perm_make_admin != 1 && callerRow.perm_make_admin !== true)) {
            return res.status(403).json({ error: 'You do not have permission to change roles' });
        }

        const validOrgId = callerRow.organization_id;

        // Check if trying to promote self (already admin if they got here, but still)
        if (String(callerRow.id) === String(id)) {
            return res.status(400).json({ error: 'You cannot promote yourself' });
        }

        // Verify target user
        db.get('SELECT id, role, email FROM users WHERE id = ? AND organization_id = ?', [id, validOrgId], (err, targetRow) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!targetRow) return res.status(404).json({ error: 'Employee not found in your organization' });
            if (targetRow.role === 'org_owner') {
                return res.status(403).json({ error: 'Cannot change the role of the Organization Owner' });
            }

            // Update role and set permissions
            const perms = 1;
            db.run(
                'UPDATE users SET role = ?, perm_add_employees = ?, perm_create_projects = ?, perm_manage_projects = ?, perm_make_admin = ?, perm_delete_project = ? WHERE id = ? AND organization_id = ?',
                [newRole, perms, perms, perms, perms, perms, id, validOrgId],
                function (updateErr) {
                    if (updateErr) return res.status(500).json({ error: 'Failed to update role' });
                    res.json({
                        success: true,
                        message: 'Employee successfully promoted to Admin',
                        user: { id: targetRow.id, role: 'Admin' }
                    });
                }
            );
        });
    });
});

// PATCH /api/settings/employee/:id/revoke-admin
router.patch('/employee/:id/revoke-admin', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    // Verify caller has make_admin permission or is an admin/org_owner
    db.get('SELECT role, email, perm_make_admin, id, organization_id FROM users WHERE id = ?', [context.userId], (err, callerRow) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (!callerRow || (callerRow.role !== 'admin' && callerRow.role !== 'org_owner' && callerRow.perm_make_admin != 1 && callerRow.perm_make_admin !== true)) {
            return res.status(403).json({ error: 'You do not have permission to change roles' });
        }

        const validOrgId = callerRow.organization_id;

        // Check if trying to demote self
        if (String(callerRow.id) === String(id)) {
            return res.status(400).json({ error: 'You cannot revoke your own admin access' });
        }

        // Verify target user
        db.get('SELECT id, role, email FROM users WHERE id = ? AND organization_id = ?', [id, validOrgId], (err, targetRow) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!targetRow) return res.status(404).json({ error: 'Employee not found in your organization' });
            if (targetRow.role === 'org_owner') {
                return res.status(403).json({ error: 'Cannot revoke access of the Organization Owner' });
            }

            // Update role and revoke permissions
            const perms = 0;
            const newRole = 'employee';

            db.run(
                'UPDATE users SET role = ?, perm_add_employees = ?, perm_create_projects = ?, perm_manage_projects = ?, perm_make_admin = ?, perm_delete_project = ? WHERE id = ? AND organization_id = ?',
                [newRole, perms, perms, perms, perms, perms, id, validOrgId],
                function (updateErr) {
                    if (updateErr) return res.status(500).json({ error: 'Failed to update role' });
                    res.json({
                        success: true,
                        message: 'Admin access revoked successfully',
                        user: { id: targetRow.id, role: 'Employee', isAdmin: false }
                    });
                }
            );
        });
    });
});

// PATCH /api/settings/employee/:email/block - Toggle employee block status
router.patch('/employee/:email/block', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { email } = req.params;
    const { isBlocked } = req.body; // true or false

    db.get('SELECT role, perm_make_admin FROM users WHERE id = ?', [context.userId], (err, callerRow) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (!callerRow || (callerRow.role !== 'admin' && callerRow.role !== 'org_owner' && callerRow.perm_make_admin != 1 && callerRow.perm_make_admin !== true)) {
            return res.status(403).json({ error: 'You do not have permission to block users' });
        }

        db.get('SELECT id, role FROM users WHERE email = ? AND organization_id = ?', [email, context.orgId], (err, targetRow) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!targetRow) return res.status(404).json({ error: 'Employee not found' });
            if (targetRow.role === 'org_owner') {
                return res.status(403).json({ error: 'Cannot block the Organization Owner' });
            }

            db.run(
                'UPDATE users SET is_blocked = ? WHERE email = ? AND organization_id = ?',
                [isBlocked ? 1 : 0, email, context.orgId],
                function (updateErr) {
                    if (updateErr) return res.status(500).json({ error: 'Failed to update block status' });
                    res.json({ success: true, isBlocked: isBlocked, message: isBlocked ? 'User blocked successfully' : 'User unblocked successfully' });
                }
            );
        });
    });
});

// DELETE /api/settings/employee/:email
router.delete('/employee/:email', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { email } = req.params;

    // Verify caller is admin
    db.get('SELECT role FROM users WHERE id = ?', [context.userId], (err, adminRow) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!adminRow || (adminRow.role !== 'admin' && adminRow.role !== 'org_owner')) {
            return res.status(403).json({ error: 'Only admins and organization owners can delete employees' });
        }

        // Find employee user ID
        db.get('SELECT id FROM users WHERE email = ? AND organization_id = ?', [email, context.orgId], (err, userRow) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                // If user doesn't exist yet, just delete any pending invitations
                if (!userRow) {
                    db.run('DELETE FROM invitations WHERE email = ? AND organization_id = ?', [email, context.orgId], (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: 'Failed to delete pending invitation' });
                        }
                        db.run('COMMIT', (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Commit failed' });
                            }
                            return res.json({ success: true, message: 'Pending invitation deleted' });
                        });
                    });
                    return;
                }

                // If user exists, hard delete their account
                const targetUserId = userRow.id;

                db.run('DELETE FROM email_recipients WHERE user_id = ?', [targetUserId], (err) => {
                    if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Database error' }); }

                    db.run('DELETE FROM email_comments WHERE user_id = ?', [targetUserId], (err) => {
                        if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Database error' }); }

                        db.run('UPDATE emails SET sender_id = NULL WHERE sender_id = ?', [targetUserId], (err) => {
                            if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Database error' }); }

                            db.run('DELETE FROM users WHERE id = ?', [targetUserId], (err) => {
                                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Database error' }); }

                                db.run('DELETE FROM invitations WHERE email = ? AND organization_id = ?', [email, context.orgId], (err) => {
                                    if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Database error' }); }

                                    db.run('UPDATE projects SET employee_name = NULL WHERE employee_name LIKE ? AND organization_id = ?', [`%${email}%`, context.orgId], (err) => {
                                        if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Database error' }); }

                                        db.run('UPDATE projects SET leader = NULL WHERE leader LIKE ? AND organization_id = ?', [`%${email}%`, context.orgId], (err) => {
                                            if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Database error' }); }

                                            db.run('COMMIT', (err) => {
                                                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Database error' }); }
                                                res.json({ success: true, message: 'Employee permanently deleted' });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// GET /api/settings/admins
router.get('/admins', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    db.all(
        'SELECT id, admin_name as name, email, perm_add_employees, perm_create_projects, perm_manage_projects, perm_make_admin, perm_delete_project FROM users WHERE organization_id = ? AND role = ? ORDER BY admin_name ASC',
        [context.orgId, 'admin'],
        (err, rows) => {
            if (err) {
                console.error('[DB Error fetching admins]:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            const mappedRows = rows.map(r => ({
                id: r.id,
                name: r.name,
                email: r.email,
                expiry: 'Expire in 10 days',
                storageUsed: '1.18 GB',
                storageTotal: '50 GB',
                permissions: {
                    addEmployees: r.perm_add_employees === 1,
                    createProjects: r.perm_create_projects === 1,
                    manageProjects: r.perm_manage_projects === 1,
                    makeAdmin: r.perm_make_admin === 1,
                    deleteProject: r.perm_delete_project === 1
                }
            }));
            res.json({ success: true, admins: mappedRows });
        }
    );
});

// GET /api/settings/employees - Fetch all users in the organization
router.get('/employees', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    db.all(
        'SELECT id, admin_name as name, email, role, created_at, dob, is_blocked, subscription_status, subscription_end_date, canViewRealEmailsAndSignatures, canSendEmails, canReplyToEmails, cover_image FROM users WHERE organization_id = ? AND role != \'org_owner\' ORDER BY created_at ASC',
        [context.orgId],
        (err, rows) => {
            if (err) {
                console.error('[DB Error fetching employees]:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            // Also fetch pending invitations so they don't disappear if localStorage is cleared
            db.all(
                'SELECT id, email, created_at, cover_image FROM invitations WHERE organization_id = ? AND status = \'pending\' ORDER BY created_at ASC',
                [context.orgId],
                (err, invites) => {
                    if (err) {
                        console.error('[DB Error fetching invites]:', err);
                        return res.json({ success: true, employees: rows }); // Return just users if invites fail
                    }

                    const pendingInvites = invites.map(inv => ({
                        id: 'invite_' + inv.id,
                        name: inv.email.split('@')[0], // Fallback name for pending invites
                        email: inv.email,
                        role: 'employee (pending)',
                        created_at: inv.created_at,
                        isPending: true,
                        coverImage: inv.cover_image || null
                    }));

                    const mappedRows = rows.map(r => ({
                        ...r,
                        coverImage: r.cover_image || null,
                        permissions: {
                            viewRealEmailIds: r.canViewRealEmailsAndSignatures === 1 || r.canViewRealEmailsAndSignatures === true,
                            sendEmails: r.canSendEmails === null ? true : (r.canSendEmails === 1 || r.canSendEmails === true),
                            replyEmails: r.canReplyToEmails === null ? true : (r.canReplyToEmails === 1 || r.canReplyToEmails === true)
                        }
                    }));

                    // Combine and sort by creation date
                    const allEmployees = [...mappedRows, ...pendingInvites].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                    // If scope=all is requested (e.g., from Assign Employees modal), return all
                    if (req.query.scope === 'all') {
                        return res.json({ success: true, employees: allEmployees });
                    }

                    // Check if requesting user is an admin with assigned employees
                    db.get('SELECT id, role FROM users WHERE id = ?', [context.userId], (userErr, caller) => {
                        if (userErr || !caller || caller.role !== 'admin') {
                            return res.json({ success: true, employees: allEmployees });
                        }

                        // Caller is admin: check if admin has assigned employees in admin_assigned_employees
                        db.all('SELECT employee_id FROM admin_assigned_employees WHERE admin_id = ?', [context.userId], (assignErr, assignedRows) => {
                            if (assignErr || !assignedRows || assignedRows.length === 0) {
                                return res.json({ success: true, employees: allEmployees });
                            }

                            const assignedSet = new Set(assignedRows.map(r => String(r.employee_id).toLowerCase().trim()));
                            const filteredEmployees = allEmployees.filter(emp => {
                                const idStr = String(emp.id).toLowerCase().trim();
                                const emailStr = String(emp.email || '').toLowerCase().trim();
                                return assignedSet.has(idStr) ||
                                       assignedSet.has(emailStr) ||
                                       (emp.isPending && assignedSet.has(('invite_' + emp.id).toLowerCase())) ||
                                       (idStr.startsWith('invite_') && assignedSet.has(idStr.replace('invite_', '')));
                            });

                            return res.json({ success: true, employees: filteredEmployees });
                        });
                    });
                }
            );
        }
    );
});

// PUT / PATCH /api/settings/employee/:identifier/permissions or /api/employees/:identifier/permissions
const handleUpdatePermissions = (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const identifier = req.params.identifier || req.params.email || req.params.id;
    const permissions = req.body || {};

    db.get('SELECT role, perm_make_admin FROM users WHERE id = ?', [context.userId], (err, caller) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!caller || (caller.role !== 'admin' && caller.role !== 'org_owner' && caller.perm_make_admin != 1 && caller.perm_make_admin !== true)) {
            return res.status(403).json({ error: 'You do not have permission to change permissions' });
        }

        const viewReal = permissions.viewRealEmailIds !== undefined ? permissions.viewRealEmailIds : permissions.canViewRealEmailsAndSignatures;
        const sendEm = permissions.sendEmails !== undefined ? permissions.sendEmails : permissions.canSendEmails;
        const replyEm = permissions.replyEmails !== undefined ? permissions.replyEmails : permissions.canReplyToEmails;

        const parsedId = identifier && !isNaN(parseInt(identifier, 10)) ? parseInt(identifier, 10) : null;

        const query = `
            UPDATE users 
            SET canViewRealEmailsAndSignatures = COALESCE(?, canViewRealEmailsAndSignatures),
                canSendEmails = COALESCE(?, canSendEmails),
                canReplyToEmails = COALESCE(?, canReplyToEmails)
            WHERE (LOWER(email) = LOWER(?) OR (id = ? AND ? IS NOT NULL)) AND organization_id = ?
        `;

        db.run(query, [
            viewReal !== undefined ? (viewReal ? 1 : 0) : null,
            sendEm !== undefined ? (sendEm ? 1 : 0) : null,
            replyEm !== undefined ? (replyEm ? 1 : 0) : null,
            identifier,
            parsedId,
            parsedId,
            context.orgId
        ], function (updateErr) {
            if (updateErr) return res.status(500).json({ error: 'Failed to update employee permissions' });
            if (this.changes === 0) return res.status(404).json({ error: 'Employee not found' });
            res.json({
                success: true,
                message: 'Employee permissions updated successfully',
                permissions: {
                    canSendEmails: sendEm !== undefined ? !!sendEm : undefined,
                    canReplyToEmails: replyEm !== undefined ? !!replyEm : undefined,
                    canViewRealEmailsAndSignatures: viewReal !== undefined ? !!viewReal : undefined
                }
            });
        });
    });
};

router.put('/employee/:identifier/permissions', handleUpdatePermissions);
router.patch('/employee/:identifier/permissions', handleUpdatePermissions);
router.put('/employees/:identifier/permissions', handleUpdatePermissions);
router.patch('/employees/:identifier/permissions', handleUpdatePermissions);
router.put('/:identifier/permissions', handleUpdatePermissions);
router.patch('/:identifier/permissions', handleUpdatePermissions);

// PATCH / POST / PUT /api/employees/:identifier/cover or /api/settings/employee/:identifier/cover
const handleUpdateCover = (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const identifier = req.params.identifier || req.params.email || req.params.id;
    const coverImage = req.body.coverImage !== undefined ? req.body.coverImage : (req.body.cover_image !== undefined ? req.body.cover_image : null);

    const parsedId = identifier && !isNaN(parseInt(identifier, 10)) ? parseInt(identifier, 10) : null;
    const isInvite = typeof identifier === 'string' && identifier.startsWith('invite_');
    const inviteId = isInvite ? parseInt(identifier.replace('invite_', ''), 10) : null;

    if (isInvite && inviteId) {
        db.run('UPDATE invitations SET cover_image = ? WHERE id = ? AND organization_id = ?', [coverImage, inviteId, context.orgId], function(err) {
            if (err) return res.status(500).json({ error: 'Database error updating invitation cover' });
            return res.json({ success: true, message: 'Cover updated successfully', coverImage });
        });
        return;
    }

    const userSql = `
        UPDATE users 
        SET cover_image = ?
        WHERE (LOWER(email) = LOWER(?) OR (id = ? AND ? IS NOT NULL)) AND organization_id = ?
    `;
    db.run(userSql, [coverImage, identifier, parsedId, parsedId, context.orgId], function(userErr) {
        if (userErr) {
            console.error('[DB Error updating cover]:', userErr);
            return res.status(500).json({ error: 'Database error updating cover' });
        }

        if (this.changes === 0) {
            db.run('UPDATE invitations SET cover_image = ? WHERE LOWER(email) = LOWER(?) AND organization_id = ?', [coverImage, identifier, context.orgId], function(invErr) {
                return res.json({ success: true, message: 'Cover updated successfully', coverImage });
            });
            return;
        }

        return res.json({ success: true, message: 'Cover updated successfully', coverImage });
    });
};

router.patch('/employee/:identifier/cover', handleUpdateCover);
router.post('/employee/:identifier/cover', handleUpdateCover);
router.put('/employee/:identifier/cover', handleUpdateCover);
router.patch('/employees/:identifier/cover', handleUpdateCover);
router.post('/employees/:identifier/cover', handleUpdateCover);
router.put('/employees/:identifier/cover', handleUpdateCover);
router.patch('/:identifier/cover', handleUpdateCover);
router.post('/:identifier/cover', handleUpdateCover);
router.put('/:identifier/cover', handleUpdateCover);


// GET /api/settings/employees/export
// Export all employees to Excel
router.get('/employees/export', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    db.all(
        'SELECT id, admin_name as name, email FROM users WHERE organization_id = ? AND role != \'org_owner\' ORDER BY created_at ASC',
        [context.orgId],
        (err, rows) => {
            if (err) {
                console.error('[DB Error fetching employees for export]:', err);
                return res.status(500).json({ error: 'Failed to fetch employees for export' });
            }

            db.all(
                'SELECT email FROM invitations WHERE organization_id = ? AND status = \'pending\' ORDER BY created_at ASC',
                [context.orgId],
                (err, invites) => {
                    if (err) {
                        console.error('[DB Error fetching invites for export]:', err);
                    }

                    const allEmployees = [...rows, ...(invites || []).map(inv => ({
                        name: inv.email.split('@')[0],
                        email: inv.email
                    }))];

                    const exportData = allEmployees.map(r => {
                        const parts = (r.name || '').trim().split(' ');
                        const firstName = parts[0] || '';
                        const lastName = parts.slice(1).join(' ') || '';
                        return {
                            'First Name': firstName,
                            'Last Name': lastName,
                            'Email': r.email || ''
                        };
                    });

                    let worksheet;
                    if (exportData.length === 0) {
                        worksheet = XLSX.utils.aoa_to_sheet([["First Name", "Last Name", "Email"]]);
                    } else {
                        worksheet = XLSX.utils.json_to_sheet(exportData, { header: ["First Name", "Last Name", "Email"] });
                    }
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");

                    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

                    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                    res.setHeader('Content-Disposition', 'attachment; filename="Employees_Export.xlsx"');
                    res.send(buffer);
                }
            );
        }
    );
});

// POST /api/settings/employees/import
// Bulk import employees (create invites) from JSON array
router.post('/employees/import', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const employees = req.body.employees;
    if (!Array.isArray(employees)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    if (employees.length === 0) {
        return res.json({ success: true, message: 'No employees to import' });
    }

    let imported = 0;
    let errors = 0;
    let skipped = 0;

    const processNext = (index) => {
        if (index >= employees.length) {
            return res.json({ success: true, imported, skipped, errors, message: `Import complete. Imported: ${imported}, Skipped: ${skipped}, Errors: ${errors}` });
        }

        const row = employees[index];
        const firstName = row['First Name'] || '';
        const lastName = row['Last Name'] || '';
        const email = row['Email'] || '';

        if (!email || !firstName) {
            errors++;
            return processNext(index + 1);
        }

        // Check if user already exists
        db.get('SELECT id FROM users WHERE email = ? AND organization_id = ?', [email, context.orgId], (err, userRow) => {
            if (err) {
                errors++;
                return processNext(index + 1);
            }

            if (userRow) {
                skipped++;
                return processNext(index + 1);
            }

            // Check if invite already exists
            db.get('SELECT id FROM invitations WHERE email = ? AND organization_id = ? AND status = \'pending\'', [email, context.orgId], (err, inviteRow) => {
                if (err) {
                    errors++;
                    return processNext(index + 1);
                }

                if (inviteRow) {
                    skipped++;
                    return processNext(index + 1);
                }

                const token = crypto.randomBytes(32).toString('hex');
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

                db.run(
                    'INSERT INTO invitations (organization_id, email, token, expires_at) VALUES (?, ?, ?, ?)',
                    [context.orgId, email, token, expiresAt.toISOString()],
                    (insertErr) => {
                        if (insertErr) errors++;
                        else imported++;
                        processNext(index + 1);
                    }
                );
            });
        });
    };

    processNext(0);
});

// PUT /api/settings/admins/:adminId/permissions
router.put('/admins/:adminId/permissions', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { adminId } = req.params;
    const permissions = req.body;

    // Verify caller is admin or has make_admin permission
    db.get('SELECT role, perm_make_admin FROM users WHERE id = ?', [context.userId], (err, caller) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!caller || (caller.role !== 'admin' && caller.role !== 'org_owner' && caller.perm_make_admin != 1 && caller.perm_make_admin !== true)) {
            return res.status(403).json({ error: 'You do not have permission to change permissions' });
        }

        const query = `
            UPDATE users 
            SET 
                perm_add_employees = ?,
                perm_create_projects = ?,
                perm_manage_projects = ?,
                perm_make_admin = ?,
                perm_delete_project = ?
            WHERE id = ? AND organization_id = ? AND role = 'admin'
        `;

        db.run(query, [
            permissions.addEmployees ? 1 : 0,
            permissions.createProjects ? 1 : 0,
            permissions.manageProjects ? 1 : 0,
            permissions.makeAdmin ? 1 : 0,
            permissions.deleteProject ? 1 : 0,
            adminId,
            context.orgId
        ], function (updateErr) {
            if (updateErr) return res.status(500).json({ error: 'Failed to update permissions' });
            if (this.changes === 0) return res.status(404).json({ error: 'Admin not found' });
            res.json({ success: true, message: 'Permissions updated successfully' });
        });
    });
});

// PUT /api/settings/admins/:adminId/profile
router.put('/admins/:adminId/profile', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { adminId } = req.params;
    const { name, email, permissions } = req.body || {};

    db.get('SELECT role, perm_make_admin FROM users WHERE id = ?', [context.userId], (err, caller) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!caller || (caller.role !== 'admin' && caller.role !== 'org_owner' && caller.perm_make_admin != 1 && caller.perm_make_admin !== true)) {
            return res.status(403).json({ error: 'You do not have permission to update admin details' });
        }

        const fields = [];
        const params = [];

        if (typeof name === 'string' && name.trim()) {
            fields.push('admin_name = ?');
            params.push(name.trim());
        }
        if (typeof email === 'string' && email.trim()) {
            fields.push('email = ?');
            params.push(email.trim());
        }
        if (permissions && typeof permissions === 'object') {
            fields.push('perm_add_employees = ?');
            params.push(permissions.addEmployees ? 1 : 0);
            fields.push('perm_create_projects = ?');
            params.push(permissions.createProjects ? 1 : 0);
            fields.push('perm_manage_projects = ?');
            params.push(permissions.manageProjects ? 1 : 0);
            fields.push('perm_make_admin = ?');
            params.push(permissions.makeAdmin ? 1 : 0);
            fields.push('perm_delete_project = ?');
            params.push(permissions.deleteProject ? 1 : 0);
        }

        if (fields.length === 0) {
            return res.json({ success: true, message: 'No changes to save' });
        }

        params.push(adminId, context.orgId);
        const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND organization_id = ? AND role = 'admin'`;

        db.run(query, params, function (updateErr) {
            if (updateErr) return res.status(500).json({ error: 'Failed to update admin profile' });
            res.json({ success: true, message: 'Admin profile updated successfully' });
        });
    });
});

// ─── ADMIN EMPLOYEE ASSIGNMENTS ─────────────────────────────────────────────
// Ensure table exists
db.run(`
    CREATE TABLE IF NOT EXISTS admin_assigned_employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER NOT NULL,
        employee_id INTEGER NOT NULL,
        organization_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(admin_id, employee_id),
        FOREIGN KEY (admin_id) REFERENCES users(id),
        FOREIGN KEY (employee_id) REFERENCES users(id)
    )
`);

const handleGetAdminAssignedEmployees = (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const adminId = parseInt(req.params.adminId, 10);
    if (isNaN(adminId)) return res.status(400).json({ error: 'Invalid admin ID' });

    const query = `
        SELECT 
            aae.employee_id,
            u.admin_name as name,
            u.email,
            u.role
        FROM admin_assigned_employees aae
        LEFT JOIN users u ON aae.employee_id = u.id
        WHERE aae.admin_id = ?
        ORDER BY u.admin_name ASC
    `;

    db.all(query, [adminId], (err, rows) => {
        if (err) {
            console.error('[DB Error fetching admin assigned employees]:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        const employeeIds = (rows || []).map(r => String(r.employee_id));
        res.json({
            success: true,
            adminId,
            employeeIds,
            assignedEmployeeIds: employeeIds,
            employees: (rows || []).map(r => ({
                id: r.employee_id,
                name: r.name,
                email: r.email,
                role: r.role
            }))
        });
    });
};

const handleAssignEmployeesToAdmin = (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const adminId = parseInt(req.params.adminId, 10);
    if (isNaN(adminId)) return res.status(400).json({ error: 'Invalid admin ID' });

    const { employeeIds } = req.body;
    if (!Array.isArray(employeeIds)) {
        return res.status(400).json({ error: 'employeeIds must be an array' });
    }

    // Verify caller has permissions (admin or org_owner)
    db.get('SELECT role, perm_make_admin FROM users WHERE id = ?', [context.userId], (userErr, caller) => {
        if (userErr) return res.status(500).json({ error: 'Database error' });
        if (!caller || (caller.role !== 'admin' && caller.role !== 'org_owner' && caller.perm_make_admin != 1)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }

        const validIds = employeeIds
            .map(id => String(id).trim())
            .filter(id => id.length > 0);

        // Delete previous assignments for this admin
        db.run('DELETE FROM admin_assigned_employees WHERE admin_id = ?', [adminId], (delErr) => {
            if (delErr) {
                console.error('[DB Error clearing admin assignments]:', delErr);
                return res.status(500).json({ error: 'Failed to update assignments' });
            }

            if (validIds.length === 0) {
                return res.json({
                    success: true,
                    adminId,
                    employeeIds: [],
                    assignedEmployeeIds: [],
                    message: 'Assignments updated successfully'
                });
            }

            let inserted = 0;
            let hasError = false;

            validIds.forEach((empId) => {
                db.run(
                    'INSERT OR IGNORE INTO admin_assigned_employees (admin_id, employee_id, organization_id) VALUES (?, ?, ?)',
                    [adminId, empId, context.orgId],
                    (insErr) => {
                        if (insErr && !hasError) {
                            hasError = true;
                            console.error('[DB Error inserting assignment]:', insErr);
                            return res.status(500).json({ error: 'Failed to assign employees' });
                        }
                        inserted++;
                        if (inserted === validIds.length && !hasError) {
                            const stringIds = validIds.map(String);
                            res.json({
                                success: true,
                                adminId,
                                employeeIds: stringIds,
                                assignedEmployeeIds: stringIds,
                                message: 'Employees assigned successfully'
                            });
                        }
                    }
                );
            });
        });
    });
};

// GET /api/admins/:adminId/assigned-employees & /api/settings/admins/:adminId/assigned-employees
router.get('/admins/:adminId/assigned-employees', handleGetAdminAssignedEmployees);
router.get('/:adminId/assigned-employees', handleGetAdminAssignedEmployees);

// POST /api/admins/:adminId/assign-employees & /api/settings/admins/:adminId/assign-employees
router.post('/admins/:adminId/assign-employees', handleAssignEmployeesToAdmin);
router.post('/:adminId/assign-employees', handleAssignEmployeesToAdmin);


// PUT /api/settings/employee/:email/block
router.put('/employee/:email/block', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { email } = req.params;
    const { isBlocked } = req.body;

    // Verify caller is admin or org_owner
    db.get('SELECT role FROM users WHERE id = ?', [context.userId], (err, caller) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!caller || (caller.role !== 'admin' && caller.role !== 'org_owner')) {
            return res.status(403).json({ error: 'You do not have permission to block users' });
        }

        // Prevent self-blocking or blocking org_owner
        db.get('SELECT id, role FROM users WHERE email = ? AND organization_id = ?', [email, context.orgId], (err, targetUser) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!targetUser) return res.status(404).json({ error: 'Employee not found' });

            if (targetUser.id === context.userId) {
                return res.status(400).json({ error: 'You cannot block yourself' });
            }
            if (targetUser.role === 'org_owner') {
                return res.status(403).json({ error: 'You cannot block the organization owner' });
            }

            db.run(
                'UPDATE users SET is_blocked = ? WHERE email = ? AND organization_id = ?',
                [isBlocked ? 1 : 0, email, context.orgId],
                function (updateErr) {
                    if (updateErr) return res.status(500).json({ error: 'Failed to update block status' });
                    res.json({ success: true, message: isBlocked ? 'User blocked' : 'User unblocked' });
                }
            );
        });
    });
});

// GET /api/settings/ui
router.get('/ui', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    db.get('SELECT settings_json FROM user_ui_settings WHERE user_id = ?', [context.userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        let settings = {};
        if (row && row.settings_json) {
            try {
                settings = JSON.parse(row.settings_json);
            } catch (e) {
                console.error('Error parsing UI settings JSON:', e);
            }
        }
        res.json({ success: true, settings });
    });
});

// PUT /api/settings/ui
router.put('/ui', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const settings = req.body;
    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Invalid settings object' });
    }

    const settingsJson = JSON.stringify(settings);

    db.get('SELECT id FROM user_ui_settings WHERE user_id = ?', [context.userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (row) {
            // Update
            db.run(
                'UPDATE user_ui_settings SET settings_json = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                [settingsJson, context.userId],
                function (updateErr) {
                    if (updateErr) return res.status(500).json({ error: 'Failed to update UI settings' });
                    res.json({ success: true, message: 'UI settings updated successfully' });
                }
            );
        } else {
            // Insert
            db.run(
                'INSERT INTO user_ui_settings (user_id, settings_json) VALUES (?, ?)',
                [context.userId, settingsJson],
                function (insertErr) {
                    if (insertErr) return res.status(500).json({ error: 'Failed to insert UI settings' });
                    res.json({ success: true, message: 'UI settings saved successfully' });
                }
            );
        }
    });
});

// ==========================================
// GENERAL SETTINGS (Outlook-Style 6 Slices)
// ==========================================

function deepMergeSettings(base, patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return base;
    const result = { ...base };

    for (const key of Object.keys(patch)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;

        const patchVal = patch[key];
        const baseVal = base[key];

        if (
            patchVal !== null &&
            typeof patchVal === 'object' &&
            !Array.isArray(patchVal) &&
            baseVal !== null &&
            typeof baseVal === 'object' &&
            !Array.isArray(baseVal)
        ) {
            result[key] = deepMergeSettings(baseVal, patchVal);
        } else if (patchVal !== undefined) {
            result[key] = patchVal;
        }
    }

    return result;
}

function validateAndSanitizeGeneralSettings(settings) {
    const raw = settings || {};

    // 1. Language and time
    const lt = raw.language_time || raw.languageTime || {};
    const validTimeFormats = ['12h', '24h'];
    const sanitizedLt = {
        language: typeof lt.language === 'string' && lt.language.trim() ? lt.language.trim() : 'en-US',
        dateFormat: typeof lt.dateFormat === 'string' && lt.dateFormat.trim() ? lt.dateFormat.trim() : 'M/D/YYYY',
        timeFormat: validTimeFormats.includes(lt.timeFormat) ? lt.timeFormat : '12h',
        timeZone: typeof lt.timeZone === 'string' && lt.timeZone.trim() ? lt.timeZone.trim() : 'Asia/Kolkata'
    };

    // 2. Appearance
    const app = raw.appearance || {};
    const themeRaw = app.theme || app.mode || 'light';
    const theme = ['light', 'dark', 'system'].includes(themeRaw) ? themeRaw : 'light';
    const validAccents = ['Classic Blue', 'Emerald Green', 'Purple', 'Slate', 'Crimson', 'Teal'];
    const accentHexMap = {
        'Classic Blue': '#0078d4',
        'Emerald Green': '#059669',
        'Purple': '#7c3aed',
        'Slate': '#475569',
        'Crimson': '#dc2626',
        'Teal': '#0d9488'
    };
    const accentColorRaw = typeof app.accentColor === 'string' && app.accentColor.trim() ? app.accentColor.trim() : 'Classic Blue';
    const accentColor = validAccents.includes(accentColorRaw) ? accentColorRaw : 'Classic Blue';
    const accentHex = accentHexMap[accentColor] || (typeof app.accentHex === 'string' && app.accentHex.trim() ? app.accentHex.trim() : '#0078d4');
    const themeColor = accentColor.toLowerCase().replace(/\s+/g, '-');
    let density = app.density || 'cozy';
    if (density === 'medium') density = 'cozy';
    if (density === 'full') density = 'roomy';
    if (!['roomy', 'cozy', 'compact'].includes(density)) density = 'cozy';

    const sanitizedApp = {
        theme,
        mode: theme,
        accentColor,
        accentHex,
        themeColor,
        density
    };

    // 3. Notifications
    const notif = raw.notifications || {};
    const enabled = typeof notif.enabled === 'boolean'
        ? notif.enabled
        : (typeof notif.allowNotifications === 'boolean' ? notif.allowNotifications : true);
    const notifyNewMail = typeof notif.notifyNewMail === 'boolean' ? notif.notifyNewMail : true;
    let desktopStyle = notif.desktopStyle || notif.notificationStyle || 'browser';
    if (desktopStyle === 'alert') desktopStyle = 'browser';
    if (!['browser', 'toast', 'none'].includes(desktopStyle)) desktopStyle = 'browser';
    const playSound = typeof notif.playSound === 'boolean'
        ? notif.playSound
        : (typeof notif.playNotificationSound === 'boolean' ? notif.playNotificationSound : true);
    const soundTone = typeof notif.soundTone === 'string' && notif.soundTone.trim()
        ? notif.soundTone.trim()
        : (typeof notif.notificationSound === 'string' && notif.notificationSound.trim() ? notif.notificationSound.trim() : 'chime');
    const notifyMentions = typeof notif.notifyMentions === 'boolean'
        ? notif.notifyMentions
        : (typeof notif.notifyProjectTaskMentions === 'boolean' ? notif.notifyProjectTaskMentions : true);

    const sanitizedNotif = {
        enabled,
        allowNotifications: enabled,
        notifyNewMail,
        desktopStyle,
        notificationStyle: desktopStyle,
        playSound,
        playNotificationSound: playSound,
        soundTone,
        notificationSound: soundTone,
        notifyMentions,
        notifyProjectTaskMentions: notifyMentions
    };

    // 4. Accessibility
    const acc = raw.accessibility || {};
    const shortcutProfile = ['outlook', 'gmail', 'off'].includes(acc.shortcutProfile)
        ? acc.shortcutProfile
        : (['outlook', 'gmail', 'off'].includes(acc.keyboardShortcutMode) ? acc.keyboardShortcutMode : 'outlook');
    const highContrast = typeof acc.highContrast === 'boolean' ? acc.highContrast : false;
    let fontScale = acc.fontScale || 'default';
    if (fontScale === 'extra-large') fontScale = 'extralarge';
    if (!['default', 'large', 'extralarge'].includes(fontScale)) fontScale = 'default';
    const reduceMotion = typeof acc.reduceMotion === 'boolean' ? acc.reduceMotion : false;
    const askEmptySubject = typeof acc.askEmptySubject === 'boolean' ? acc.askEmptySubject : true;

    const sanitizedAcc = {
        shortcutProfile,
        keyboardShortcutMode: shortcutProfile,
        highContrast,
        fontScale,
        reduceMotion,
        askEmptySubject
    };

    // 5. Privacy and data
    const pd = raw.privacy_data || raw.privacyData || {};
    const externalImages = ['proxy', 'ask'].includes(pd.externalImages) ? pd.externalImages : 'proxy';
    const readReceipts = typeof pd.readReceipts === 'boolean'
        ? pd.readReceipts
        : (typeof pd.allowReadReceipts === 'boolean' ? pd.allowReadReceipts : true);
    const searchHistoryEnabled = typeof pd.searchHistoryEnabled === 'boolean' ? pd.searchHistoryEnabled : true;

    const sanitizedPd = {
        externalImages,
        readReceipts,
        allowReadReceipts: readReceipts,
        searchHistoryEnabled
    };

    // 6. Search
    const sr = raw.search || {};
    let scope = sr.scope || sr.searchScope || 'all';
    if (scope === 'all_folders') scope = 'all';
    if (scope === 'current_folder') scope = 'current';
    if (!['all', 'current', 'exclude_deleted_junk'].includes(scope)) scope = 'all';
    const searchScope = scope === 'all' ? 'all_folders' : (scope === 'current' ? 'current_folder' : 'exclude_deleted_junk');
    const includeDeleted = typeof sr.includeDeleted === 'boolean' ? sr.includeDeleted : false;
    const suggestions = typeof sr.suggestions === 'boolean'
        ? sr.suggestions
        : (typeof sr.showSuggestions === 'boolean' ? sr.showSuggestions : true);
    const validPageSizes = [25, 50, 100];
    const parsedPageSize = parseInt(sr.pageSize, 10);
    const pageSize = validPageSizes.includes(parsedPageSize) ? parsedPageSize : 25;

    const sanitizedSr = {
        scope,
        searchScope,
        includeDeleted,
        suggestions,
        showSuggestions: suggestions,
        pageSize
    };

    return {
        language_time: sanitizedLt,
        appearance: sanitizedApp,
        notifications: sanitizedNotif,
        accessibility: sanitizedAcc,
        privacy_data: sanitizedPd,
        search: sanitizedSr
    };
}

const DEFAULT_GENERAL_SETTINGS = validateAndSanitizeGeneralSettings({});

function formatSettingsResponse(sanitized) {
    return {
        language_time: sanitized.language_time,
        languageTime: sanitized.language_time,
        appearance: sanitized.appearance,
        notifications: sanitized.notifications,
        accessibility: sanitized.accessibility,
        privacy_data: sanitized.privacy_data,
        privacyData: sanitized.privacy_data,
        search: sanitized.search
    };
}

// GET /api/settings/general
router.get('/general', (req, res) => {
    const context = getUserContext(req);
    if (!context) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid user identification' });
    }

    db.get('SELECT settings_json FROM user_general_settings WHERE user_id = ?', [context.userId], (err, row) => {
        if (err) {
            console.error('[GET /api/settings/general] Database error:', err.message);
            return res.status(500).json({ success: false, error: 'Failed to retrieve general settings', details: err.message });
        }

        let stored = {};
        if (row && row.settings_json) {
            try {
                stored = JSON.parse(row.settings_json);
            } catch (parseErr) {
                console.error('[GET /api/settings/general] Corrupted JSON in DB, falling back to defaults:', parseErr.message);
            }
        }

        const merged = deepMergeSettings(DEFAULT_GENERAL_SETTINGS, stored);
        const sanitized = validateAndSanitizeGeneralSettings(merged);
        const settings = formatSettingsResponse(sanitized);

        res.json({
            success: true,
            settings
        });
    });
});

// PUT /api/settings/general
router.put('/general', (req, res) => {
    const context = getUserContext(req);
    if (!context) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid user identification' });
    }

    const patchPayload = req.body;
    if (!patchPayload || typeof patchPayload !== 'object' || Array.isArray(patchPayload)) {
        return res.status(400).json({ success: false, error: 'Invalid settings payload. Expected a JSON object.' });
    }

    // 1. Fetch current settings from database
    db.get('SELECT id, settings_json FROM user_general_settings WHERE user_id = ?', [context.userId], (err, row) => {
        if (err) {
            console.error('[PUT /api/settings/general] Database read error:', err.message);
            return res.status(500).json({ success: false, error: 'Failed to read current settings', details: err.message });
        }

        let existing = {};
        if (row && row.settings_json) {
            try {
                existing = JSON.parse(row.settings_json);
            } catch (e) {
                console.error('[PUT /api/settings/general] JSON parse error, reinitializing:', e.message);
            }
        }

        // Normalize incoming aliases (e.g. languageTime -> language_time)
        const normalizedPatch = { ...patchPayload };
        if (normalizedPatch.languageTime && !normalizedPatch.language_time) {
            normalizedPatch.language_time = normalizedPatch.languageTime;
        }
        if (normalizedPatch.privacyData && !normalizedPatch.privacy_data) {
            normalizedPatch.privacy_data = normalizedPatch.privacyData;
        }

        // 2. Deep-merge: defaults -> existing -> incoming patch
        const base = deepMergeSettings(DEFAULT_GENERAL_SETTINGS, existing);
        const merged = deepMergeSettings(base, normalizedPatch);

        // 3. Sanitize and validate
        const sanitized = validateAndSanitizeGeneralSettings(merged);
        const storageJson = JSON.stringify({
            language_time: sanitized.language_time,
            appearance: sanitized.appearance,
            notifications: sanitized.notifications,
            accessibility: sanitized.accessibility,
            privacy_data: sanitized.privacy_data,
            search: sanitized.search
        });

        // 4. Upsert into database
        if (row) {
            db.run(
                'UPDATE user_general_settings SET settings_json = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                [storageJson, context.userId],
                function (updateErr) {
                    if (updateErr) {
                        console.error('[PUT /api/settings/general] Update error:', updateErr.message);
                        return res.status(500).json({ success: false, error: 'Failed to update general settings', details: updateErr.message });
                    }
                    res.json({
                        success: true,
                        message: 'General settings updated successfully',
                        settings: formatSettingsResponse(sanitized)
                    });
                }
            );
        } else {
            db.run(
                'INSERT INTO user_general_settings (user_id, organization_id, settings_json, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
                [context.userId, context.orgId || 1, storageJson],
                function (insertErr) {
                    if (insertErr) {
                        console.error('[PUT /api/settings/general] Insert error:', insertErr.message);
                        return res.status(500).json({ success: false, error: 'Failed to insert general settings', details: insertErr.message });
                    }
                    res.json({
                        success: true,
                        message: 'General settings saved successfully',
                        settings: formatSettingsResponse(sanitized)
                    });
                }
            );
        }
    });
});

// DELETE /api/settings/search-history
router.delete('/search-history', (req, res) => {
    const context = getUserContext(req);
    if (!context) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid user identification' });
    }

    db.run('DELETE FROM search_history WHERE user_id = ?', [context.userId], function (err) {
        if (err) {
            console.error('[DELETE /api/settings/search-history] Error:', err.message);
            return res.status(500).json({ success: false, error: 'Database error', details: err.message });
        }
        res.json({
            success: true,
            message: 'Search history cleared successfully',
            deletedCount: this.changes || 0
        });
    });
});

// GET /api/settings/search-history
router.get('/search-history', (req, res) => {
    const context = getUserContext(req);
    if (!context) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid user identification' });
    }

    const format = req.query.format || (req.query.download === 'true' ? 'json' : null);

    db.all(
        'SELECT id, query, result_count, created_at FROM search_history WHERE user_id = ? ORDER BY id DESC LIMIT 500',
        [context.userId],
        (err, rows) => {
            if (err) {
                console.error('[GET /api/settings/search-history] Error:', err.message);
                return res.status(500).json({ success: false, error: 'Database error' });
            }

            if (format === 'csv') {
                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="safemailz_search_history_${Date.now()}.csv"`);
                const header = 'id,query,result_count,created_at\n';
                const body = (rows || []).map(r => `${r.id},"${String(r.query || '').replace(/"/g, '""')}",${r.result_count || 0},"${r.created_at || ''}"`).join('\n');
                return res.send(header + body);
            }

            if (format === 'json' && req.query.download === 'true') {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="safemailz_search_history_${Date.now()}.json"`);
                return res.send(JSON.stringify({ success: true, history: rows || [] }, null, 2));
            }

            res.json({
                success: true,
                history: rows || []
            });
        }
    );
});

// GET /api/settings/export-data
router.get('/export-data', (req, res) => {
    const context = getUserContext(req);
    if (!context) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid user identification' });
    }

    db.get(
        'SELECT id, admin_name, email, role, marketing_opt_in, terms_accepted, created_at FROM users WHERE id = ?',
        [context.userId],
        (userErr, userRow) => {
            if (userErr) {
                return res.status(500).json({ success: false, error: 'Database error reading user' });
            }

            const userProfile = userRow ? {
                id: userRow.id,
                name: userRow.admin_name,
                email: userRow.email,
                role: userRow.role,
                marketingOptIn: !!userRow.marketing_opt_in,
                termsAccepted: !!userRow.terms_accepted,
                createdAt: userRow.created_at
            } : {
                id: context.userId,
                name: 'User ' + context.userId,
                email: context.activeEmail || `user${context.userId}@safemailz.com`,
                role: 'User',
                createdAt: new Date().toISOString()
            };

            db.get(
                'SELECT settings_json FROM user_general_settings WHERE user_id = ?',
                [context.userId],
                (settingsErr, settingsRow) => {
                    let generalSettings = DEFAULT_GENERAL_SETTINGS;
                    if (settingsRow && settingsRow.settings_json) {
                        try {
                            generalSettings = JSON.parse(settingsRow.settings_json);
                        } catch {}
                    }

                    db.all(
                        'SELECT id, email_no, subject, preview, created_at FROM emails WHERE sender_id = ? LIMIT 100',
                        [context.userId],
                        (emailsErr, emailRows) => {
                            db.all(
                                'SELECT id, query, created_at FROM search_history WHERE user_id = ? ORDER BY id DESC LIMIT 100',
                                [context.userId],
                                (histErr, historyRows) => {
                                    const exportPayload = {
                                        exportedAt: new Date().toISOString(),
                                        user: userProfile,
                                        generalSettings,
                                        emails: emailRows || [],
                                        searchHistory: historyRows || []
                                    };

                                    const filename = `safemailz_export_user_${context.userId}_${Date.now()}.json`;
                                    res.setHeader('Content-Type', 'application/json');
                                    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                                    return res.status(200).send(JSON.stringify(exportPayload, null, 2));
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// PATCH /api/settings/employee/:email/subscription/expire - Expire subscription immediately
router.patch('/employee/:email/subscription/expire', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { email } = req.params;

    db.get('SELECT role, perm_make_admin FROM users WHERE id = ?', [context.userId], (err, callerRow) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (callerRow.role !== 'org_owner' && callerRow.perm_make_admin !== 1 && callerRow.perm_make_admin !== true) {
            return res.status(403).json({ error: 'Only Organization Owners or Admins can expire subscriptions' });
        }

        db.get('SELECT id, role FROM users WHERE email = ? AND organization_id = ?', [email, context.orgId], (err, targetRow) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!targetRow) return res.status(404).json({ error: 'Employee not found' });
            if (targetRow.role === 'org_owner') return res.status(403).json({ error: 'Cannot expire the Organization Owner' });

            db.run(
                'UPDATE users SET subscription_status = ? WHERE email = ? AND organization_id = ?',
                ['expired', email, context.orgId],
                function (updateErr) {
                    if (updateErr) return res.status(500).json({ error: 'Failed to expire subscription' });
                    res.json({ success: true, message: 'Subscription expired immediately', subscriptionStatus: 'expired' });
                }
            );
        });
    });
});

// PATCH /api/settings/employee/:email/subscription/renew - Renew subscription for 30 days
router.patch('/employee/:email/subscription/renew', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { email } = req.params;

    db.get('SELECT role, perm_make_admin FROM users WHERE id = ?', [context.userId], (err, callerRow) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (callerRow.role !== 'org_owner' && callerRow.perm_make_admin !== 1 && callerRow.perm_make_admin !== true) {
            return res.status(403).json({ error: 'Only Organization Owners or Admins can renew subscriptions' });
        }

        db.get('SELECT id, role FROM users WHERE email = ? AND organization_id = ?', [email, context.orgId], (err, targetRow) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!targetRow) return res.status(404).json({ error: 'Employee not found' });
            if (targetRow.role === 'org_owner') return res.status(403).json({ error: 'Cannot modify the Organization Owner subscription' });

            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 30);

            db.run(
                'UPDATE users SET subscription_status = ?, subscription_start_date = ?, subscription_end_date = ? WHERE email = ? AND organization_id = ?',
                ['active', startDate.toISOString(), endDate.toISOString(), email, context.orgId],
                function (updateErr) {
                    if (updateErr) return res.status(500).json({ error: 'Failed to renew subscription' });
                    res.json({ success: true, message: 'Subscription renewed successfully', subscriptionStatus: 'active', subscriptionEndDate: endDate.toISOString() });
                }
            );
        });
    });
});

// GET /api/settings/me - Fetch current user's own details
router.get('/me', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    db.get('SELECT id, email, admin_name, role, organization_id, subscription_status, subscription_end_date, canViewRealEmailsAndSignatures FROM users WHERE id = ?', [context.userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, user: row });
    });
});

// GET /api/settings/automatic-replies
router.get('/automatic-replies', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    db.get('SELECT settings_json FROM user_ui_settings WHERE user_id = ?', [context.userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        let automaticReplies = null;
        if (row && row.settings_json) {
            try {
                const parsed = JSON.parse(row.settings_json);
                automaticReplies = parsed.automaticReplies || null;
            } catch (e) {}
        }
        res.json({ success: true, automaticReplies });
    });
});

// POST /api/settings/automatic-replies
router.post('/automatic-replies', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const automaticReplies = req.body;
    db.get('SELECT id, settings_json FROM user_ui_settings WHERE user_id = ?', [context.userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        let currentSettings = {};
        if (row && row.settings_json) {
            try { currentSettings = JSON.parse(row.settings_json); } catch (e) {}
        }
        currentSettings.automaticReplies = automaticReplies;
        const jsonStr = JSON.stringify(currentSettings);

        if (row) {
            db.run('UPDATE user_ui_settings SET settings_json = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [jsonStr, context.userId], (uErr) => {
                if (uErr) return res.status(500).json({ error: 'Database error' });
                res.json({ success: true, message: 'Automatic replies updated successfully', automaticReplies });
            });
        } else {
            db.run('INSERT INTO user_ui_settings (user_id, settings_json) VALUES (?, ?)', [context.userId, jsonStr], (iErr) => {
                if (iErr) return res.status(500).json({ error: 'Database error' });
                res.json({ success: true, message: 'Automatic replies saved successfully', automaticReplies });
            });
        }
    });
});

// GET /api/settings/categories
router.get('/categories', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    db.get('SELECT settings_json FROM user_ui_settings WHERE user_id = ?', [context.userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        let categories = null;
        if (row && row.settings_json) {
            try {
                const parsed = JSON.parse(row.settings_json);
                categories = parsed.userCategories || null;
            } catch (e) {}
        }
        res.json({ success: true, categories });
    });
});

// POST /api/settings/categories
router.post('/categories', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const categories = req.body.categories || req.body;
    db.get('SELECT id, settings_json FROM user_ui_settings WHERE user_id = ?', [context.userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        let currentSettings = {};
        if (row && row.settings_json) {
            try { currentSettings = JSON.parse(row.settings_json); } catch (e) {}
        }
        currentSettings.userCategories = categories;
        const jsonStr = JSON.stringify(currentSettings);

        if (row) {
            db.run('UPDATE user_ui_settings SET settings_json = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [jsonStr, context.userId], (uErr) => {
                if (uErr) return res.status(500).json({ error: 'Database error' });
                res.json({ success: true, message: 'Categories saved successfully', categories });
            });
        } else {
            db.run('INSERT INTO user_ui_settings (user_id, settings_json) VALUES (?, ?)', [context.userId, jsonStr], (iErr) => {
                if (iErr) return res.status(500).json({ error: 'Database error' });
                res.json({ success: true, message: 'Categories saved successfully', categories });
            });
        }
    });
});

// GET /api/settings/storage
router.get('/storage', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const totalQuotaBytes = 15 * 1024 * 1024 * 1024; // 15 GB quota

    const folderQuery = `
        SELECT 
            CASE 
                WHEN LOWER(er.folder) IN ('junk', 'junk email') THEN 'junk'
                WHEN LOWER(er.folder) IN ('deleted', 'deleted items', 'trash') THEN 'deleted'
                WHEN LOWER(er.folder) IN ('sent', 'sent items') THEN 'sent'
                WHEN LOWER(er.folder) IN ('drafts', 'draft') THEN 'drafts'
                WHEN LOWER(er.folder) IN ('archive', 'archives') THEN 'archive'
                ELSE 'inbox'
            END as normalized_folder,
            COUNT(DISTINCT e.id) as item_count,
            COALESCE(SUM(LENGTH(COALESCE(e.body, '')) + LENGTH(COALESCE(e.preview, '')) + LENGTH(COALESCE(e.subject, '')) + 2048), 0) as text_bytes
        FROM email_recipients er
        JOIN emails e ON er.email_id = e.id
        WHERE er.user_id = ? AND (er.is_deleted IS NULL OR er.is_deleted = 0)
        GROUP BY normalized_folder
    `;

    db.all(folderQuery, [context.userId], (err, folderRows) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        const attachQuery = `
            SELECT 
                COUNT(*) as attach_count,
                COALESCE(SUM(COALESCE(ea.size, LENGTH(COALESCE(ea.data, '')))), 0) as total_attach_bytes
            FROM email_attachments ea
            JOIN email_recipients er ON ea.email_id = er.email_id
            WHERE er.user_id = ? AND (er.is_deleted IS NULL OR er.is_deleted = 0)
        `;

        db.get(attachQuery, [context.userId], (attachErr, attachRow) => {
            const rawAttachBytes = attachRow ? attachRow.total_attach_bytes || 0 : 0;
            const attachCount = attachRow ? attachRow.attach_count || 0 : 0;

            const folderMap = {};
            (folderRows || []).forEach(r => {
                const f = (r.normalized_folder || 'inbox').toLowerCase();
                folderMap[f] = { count: r.item_count || 0, bytes: r.text_bytes || 0 };
            });

            const folderKeys = [
                { id: 'inbox', name: 'Inbox' },
                { id: 'sent', name: 'Sent Items' },
                { id: 'drafts', name: 'Drafts' },
                { id: 'deleted', name: 'Deleted Items' },
                { id: 'junk', name: 'Junk Email' },
                { id: 'archive', name: 'Archive' }
            ];

            const folders = folderKeys.map(k => {
                const data = folderMap[k.id] || { count: 0, bytes: 0 };
                // If folder is empty, strictly return 0 items and 0 bytes
                if (data.count === 0) {
                    return {
                        id: k.id,
                        name: k.name,
                        itemCount: 0,
                        sizeBytes: 0
                    };
                }
                const finalBytes = Math.max(data.bytes, data.count * 350 * 1024);
                return {
                    id: k.id,
                    name: k.name,
                    itemCount: data.count,
                    sizeBytes: finalBytes
                };
            });

            const attachmentsSize = attachCount > 0 ? Math.max(rawAttachBytes, attachCount * 1.5 * 1024 * 1024) : 0;
            const foldersTotalBytes = folders.reduce((acc, f) => acc + f.sizeBytes, 0);
            const usedBytes = foldersTotalBytes + attachmentsSize;
            const freeBytes = Math.max(0, totalQuotaBytes - usedBytes);

            res.json({
                success: true,
                totalQuotaBytes,
                usedBytes,
                freeBytes,
                attachmentsSize,
                folders
            });
        });
    });
});

// POST /api/settings/storage/empty-folder
router.post('/storage/empty-folder', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { folder, olderThanMonths } = req.body;
    if (!folder) return res.status(400).json({ error: 'Folder name is required' });

    const cleanFolder = folder.toLowerCase();

    // Map folder identifier to possible folder names in email_recipients
    let folderNames = [cleanFolder];
    if (cleanFolder === 'junk' || cleanFolder === 'junk email') {
        folderNames = ['junk', 'junk email'];
    } else if (cleanFolder === 'deleted' || cleanFolder === 'deleted items' || cleanFolder === 'trash') {
        folderNames = ['deleted', 'deleted items', 'trash'];
    } else if (cleanFolder === 'sent' || cleanFolder === 'sent items') {
        folderNames = ['sent', 'sent items'];
    } else if (cleanFolder === 'archive' || cleanFolder === 'archives') {
        folderNames = ['archive', 'archives'];
    } else if (cleanFolder === 'drafts' || cleanFolder === 'draft') {
        folderNames = ['drafts', 'draft'];
    }

    const folderPlaceholders = folderNames.map(() => '?').join(',');

    if (olderThanMonths && Number(olderThanMonths) > 0) {
        const query = `
            UPDATE email_recipients 
            SET is_deleted = 1 
            WHERE user_id = ? AND LOWER(folder) IN (${folderPlaceholders}) AND email_id IN (
                SELECT id FROM emails WHERE created_at < datetime('now', '-' || ? || ' month')
            )
        `;
        db.run(query, [context.userId, ...folderNames, Number(olderThanMonths)], function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true, message: `Items older than ${olderThanMonths} months removed from ${folder}`, changes: this.changes });
        });
    } else {
        const query = `
            UPDATE email_recipients 
            SET is_deleted = 1 
            WHERE user_id = ? AND LOWER(folder) IN (${folderPlaceholders})
        `;
        db.run(query, [context.userId, ...folderNames], function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true, message: `${folder} emptied successfully`, changes: this.changes });
        });
    }
});

module.exports = router;


