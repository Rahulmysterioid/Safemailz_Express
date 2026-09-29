const express = require('express');
const bcrypt = require('bcrypt');
const { db } = require('../db');
const XLSX = require('xlsx');
const crypto = require('crypto');

const router = express.Router();

// Helper to get user context from headers
const getUserContext = (req) => {
    const userId = req.headers['x-user-id'];
    const orgId = req.headers['x-org-id'] || '1';
    if (!userId) {
        return null;
    }
    return { userId: parseInt(userId, 10), orgId: parseInt(orgId, 10) };
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
    db.get('SELECT role, email, perm_make_admin FROM users WHERE id = ?', [context.userId], (err, callerRow) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        // Use loose check for 1 or true
        if (!callerRow || (callerRow.role !== 'admin' && callerRow.role !== 'org_owner' && callerRow.perm_make_admin != 1 && callerRow.perm_make_admin !== true)) {
            return res.status(403).json({ error: 'You do not have permission to change roles' });
        }

        // Check if caller is trying to demote themselves
        if (callerRow.email === email && role === 'employee') {
            return res.status(400).json({ error: 'You cannot demote yourself' });
        }

        // Verify target user is not an org_owner
        db.get('SELECT role FROM users WHERE email = ? AND organization_id = ?', [email, context.orgId], (err, targetRow) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!targetRow) return res.status(404).json({ error: 'Employee not found in your organization' });
            if (targetRow.role === 'org_owner') {
                return res.status(403).json({ error: 'Cannot change the role of the Organization Owner' });
            }

            // Update role and set permissions based on role
            const perms = role === 'admin' ? 1 : 0;
            db.run(
                'UPDATE users SET role = ?, perm_add_employees = ?, perm_create_projects = ?, perm_manage_projects = ?, perm_make_admin = ?, perm_delete_project = ? WHERE email = ? AND organization_id = ?',
                [role, perms, perms, perms, perms, perms, email, context.orgId],
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
    db.get('SELECT role, email, perm_make_admin FROM users WHERE id = ?', [context.userId], (err, callerRow) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        if (!callerRow || (callerRow.role !== 'admin' && callerRow.role !== 'org_owner' && callerRow.perm_make_admin != 1 && callerRow.perm_make_admin !== true)) {
            return res.status(403).json({ error: 'You do not have permission to change roles' });
        }

        // Check if trying to promote self (already admin if they got here, but still)
        if (String(callerRow.id) === String(id)) {
            return res.status(400).json({ error: 'You cannot promote yourself' });
        }

        // Verify target user
        db.get('SELECT id, role, email FROM users WHERE id = ? AND organization_id = ?', [id, context.orgId], (err, targetRow) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!targetRow) return res.status(404).json({ error: 'Employee not found in your organization' });
            if (targetRow.role === 'org_owner') {
                return res.status(403).json({ error: 'Cannot change the role of the Organization Owner' });
            }

            // Update role and set permissions
            const perms = 1;
            db.run(
                'UPDATE users SET role = ?, perm_add_employees = ?, perm_create_projects = ?, perm_manage_projects = ?, perm_make_admin = ?, perm_delete_project = ? WHERE id = ? AND organization_id = ?',
                [newRole, perms, perms, perms, perms, perms, id, context.orgId],
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
    db.get('SELECT role, email, perm_make_admin, id FROM users WHERE id = ?', [context.userId], (err, callerRow) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        if (!callerRow || (callerRow.role !== 'admin' && callerRow.role !== 'org_owner' && callerRow.perm_make_admin != 1 && callerRow.perm_make_admin !== true)) {
            return res.status(403).json({ error: 'You do not have permission to change roles' });
        }

        // Check if trying to demote self
        if (String(callerRow.id) === String(id)) {
            return res.status(400).json({ error: 'You cannot revoke your own admin access' });
        }

        // Verify target user
        db.get('SELECT id, role, email FROM users WHERE id = ? AND organization_id = ?', [id, context.orgId], (err, targetRow) => {
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
                [newRole, perms, perms, perms, perms, perms, id, context.orgId],
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
        'SELECT id, admin_name as name, email, role, created_at, dob, is_blocked, subscription_status, subscription_end_date FROM users WHERE organization_id = ? AND role != \'org_owner\' ORDER BY created_at ASC',
        [context.orgId],
        (err, rows) => {
            if (err) {
                console.error('[DB Error fetching employees]:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            // Also fetch pending invitations so they don't disappear if localStorage is cleared
            db.all(
                'SELECT id, email, created_at FROM invitations WHERE organization_id = ? AND status = \'pending\' ORDER BY created_at ASC',
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
                        isPending: true
                    }));

                    // Combine and sort by creation date
                    const allEmployees = [...rows, ...pendingInvites].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                    res.json({ success: true, employees: allEmployees });
                }
            );
        }
    );
});

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
                function(updateErr) {
                    if (updateErr) return res.status(500).json({ error: 'Failed to update UI settings' });
                    res.json({ success: true, message: 'UI settings updated successfully' });
                }
            );
        } else {
            // Insert
            db.run(
                'INSERT INTO user_ui_settings (user_id, settings_json) VALUES (?, ?)',
                [context.userId, settingsJson],
                function(insertErr) {
                    if (insertErr) return res.status(500).json({ error: 'Failed to insert UI settings' });
                    res.json({ success: true, message: 'UI settings saved successfully' });
                }
            );
        }
    });
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

    db.get('SELECT id, email, admin_name, role, organization_id, subscription_status, subscription_end_date FROM users WHERE id = ?', [context.userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, user: row });
    });
});

module.exports = router;

