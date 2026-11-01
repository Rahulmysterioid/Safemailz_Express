const { db } = require('../db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

let transporter;

if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
    // Use real SMTP (e.g. Gmail)
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
        }
    });
    console.log("Email transporter configured with Gmail SMTP.");
} else {
    // Set up a mock ethereal email for local testing
    nodemailer.createTestAccount((err, account) => {
        if (err) {
            console.error('Failed to create a testing account. ' + err.message);
            return;
        }
        transporter = nodemailer.createTransport({
            host: account.smtp.host,
            port: account.smtp.port,
            secure: account.smtp.secure,
            auth: {
                user: account.user,
                pass: account.pass
            }
        });
        console.log("Email transporter configured with Ethereal (Mock).");
    });
}

const sendInvite = async (req, res) => {
    const { firstName, lastName, email } = req.body;
    
    // User must be logged in as admin
    const userId = req.headers['x-user-id'];

    if (!userId) {
        console.log('[sendInvite] Missing headers - userId:', userId);
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!firstName || !email) {
        return res.status(400).json({ error: 'First name and email are required.' });
    }

    db.get('SELECT organization_id FROM users WHERE id = ?', [userId], (err, adminUser) => {
        if (err || !adminUser) {
            console.error('[sendInvite] Failed to fetch admin user:', err);
            return res.status(401).json({ error: 'Admin user not found' });
        }

        const orgId = adminUser.organization_id;

        console.log(`[sendInvite] Sending invite to ${email} (firstName: ${firstName}) from user ${userId}, org ${orgId}`);

        // Check if the user is already registered AND has completed signup (has a password_hash)
        db.get('SELECT id, organization_id, password_hash FROM users WHERE email = ?', [email], (err, row) => {
            if (err) {
                console.error('[sendInvite] DB error checking user:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            // If user exists, has a password, and is in a DIFFERENT org — block
            if (row && row.password_hash && row.organization_id != orgId) {
                return res.status(400).json({ error: 'User is already registered with another organization.' });
            }

        // If user already exists with a password in the SAME org — they already signed up
        if (row && row.password_hash && row.organization_id == orgId) {
            return res.json({ success: true, message: 'This user has already completed signup.', alreadyExists: true });
        }

        // Otherwise, generate a new invite token and send the email
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

        db.run(
            `INSERT INTO invitations (organization_id, email, token, expires_at, status) VALUES (?, ?, ?, ?, 'pending')`,
            [orgId, email, token, expiresAt.toISOString()],
            async function (err) {
                if (err) {
                    console.error('[sendInvite] Invite insert error:', err);
                    return res.status(500).json({ error: 'Failed to create invite.' });
                }

                // Create the invite URL
                const protocol = req.protocol === 'file' ? 'http' : req.protocol;
                const host = req.get('host') || 'localhost:3000';
                const baseUrl = process.env.FRONTEND_URL || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http://localhost:3000' : `${protocol}://${host}`);
                const inviteUrl = `${baseUrl}/signup?token=${token}&email=${encodeURIComponent(email)}`;

                if (transporter) {
                    const mailOptions = {
                        from: process.env.SMTP_EMAIL ? `"Safemailz" <${process.env.SMTP_EMAIL}>` : '"Safemailz" <no-reply@safemailz.com>',
                        to: email,
                        subject: 'Invitation to join Safemailz',
                        text: `Hello ${firstName},\n\nYou have been invited to join Safemailz. Please use the following link to create your account:\n\n${inviteUrl}\n\nBest regards,\nThe Safemailz Team`,
                        html: `<p>Hello ${firstName},</p><p>You have been invited to join Safemailz. Please use the following link to create your account:</p><p><a href="${inviteUrl}">${inviteUrl}</a></p><p>Best regards,<br>The Safemailz Team</p>`
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('[sendInvite] Error sending invitation email:', error);
                        } else {
                            console.log('[sendInvite] Invitation email sent:', info.messageId || info.response);
                        }
                    });
                } else {
                    console.warn('[sendInvite] No email transporter configured. Email not sent.');
                }

                console.log('[sendInvite] Invite URL generated:', inviteUrl);

                res.json({ success: true, message: 'Invite sent successfully', token: token, inviteUrl: inviteUrl });
            }
        );
    });
    });
};

const verifyInvite = (req, res) => {
    const { token } = req.params;

    if (!token) return res.status(400).json({ error: 'Token is required' });

    db.get('SELECT * FROM invitations WHERE token = ?', [token], (err, invite) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!invite) return res.status(404).json({ error: 'Invalid or expired token.' });
        if (invite.status !== 'pending') return res.status(400).json({ error: 'This invitation has already been used.' });
        
        const expiresAt = new Date(invite.expires_at);
        if (expiresAt < new Date()) {
            return res.status(400).json({ error: 'This invitation has expired.' });
        }

        // Return invite info
        db.get('SELECT organization_name FROM organizations WHERE id = ?', [invite.organization_id], (err, org) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({
                success: true,
                email: invite.email,
                organization_name: org ? org.organization_name : 'the organization'
            });
        });
    });
};

const signupInvited = async (req, res) => {
    const { token, firstName, password, dob, workMode, workLocation, bio, isGoogleAuth } = req.body;

    if (!token || !firstName || (!password && !isGoogleAuth)) {
        return res.status(400).json({ error: 'Please fill in all required fields.' });
    }

    // 1. Verify token
    db.get('SELECT * FROM invitations WHERE token = ?', [token], async (err, invite) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!invite) return res.status(404).json({ error: 'Invalid token.' });
        if (invite.status !== 'pending') return res.status(400).json({ error: 'This invitation has already been used.' });
        
        const expiresAt = new Date(invite.expires_at);
        if (expiresAt < new Date()) {
            return res.status(400).json({ error: 'This invitation has expired.' });
        }

        // Check if user already exists
        db.get('SELECT id, organization_id FROM users WHERE email = ?', [invite.email], async (err, existingUser) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            try {
                // Hash password if provided
                let password_hash = '';
                if (password) {
                    const saltRounds = 10;
                    password_hash = await bcrypt.hash(password, saltRounds);
                }

                // Check for Google OAuth tokens if Google Auth was performed
                const syncController = require('./syncController');
                const pending = syncController.pendingAuth ? syncController.pendingAuth.get(invite.email) : null;
                let sync_provider = isGoogleAuth ? 'google' : null;
                let sync_access_token = pending ? pending.access_token : null;
                let sync_refresh_token = pending ? pending.refresh_token : null;
                let sync_token_expires_at = pending ? pending.expires_at : null;
                if (pending && syncController.pendingAuth) {
                    syncController.pendingAuth.delete(invite.email);
                }

                const completeSignup = (userId) => {
                    db.run(`UPDATE invitations SET status = 'used' WHERE id = ?`, [invite.id], (err) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ error: 'Failed to update invite status.' });
                        }

                        const userObj = {
                            id: userId,
                            organization_id: invite.organization_id,
                            email: invite.email,
                            admin_name: firstName,
                            role: 'employee',
                            dob: dob || null,
                            workMode: workMode || 'Remote',
                            workLocation: workLocation || 'Gilgit Baltistan, Pakistan',
                            bio: bio || '',
                            subscription_status: 'active',
                            permissions: {
                                addEmployees: false,
                                createProjects: false,
                                manageProjects: false,
                                makeAdmin: false,
                                deleteProject: false
                            }
                        };

                        return res.status(201).json({
                            success: true,
                            message: 'Account created successfully.',
                            user: userObj,
                            redirectUrl: '/dashboard'
                        });
                    });
                };

                if (existingUser) {
                    // Update existing record
                    db.run(
                        `UPDATE users SET 
                            organization_id = ?, admin_name = ?, password_hash = COALESCE(NULLIF(?, ''), password_hash), 
                            terms_accepted = 1, role = 'employee', dob = ?,
                            sync_provider = COALESCE(?, sync_provider),
                            sync_access_token = COALESCE(?, sync_access_token),
                            sync_refresh_token = COALESCE(?, sync_refresh_token),
                            sync_token_expires_at = COALESCE(?, sync_token_expires_at)
                         WHERE id = ?`,
                        [
                            invite.organization_id, firstName, password_hash, dob || null,
                            sync_provider, sync_access_token, sync_refresh_token, sync_token_expires_at,
                            existingUser.id
                        ],
                        function (err) {
                            if (err) {
                                console.error(err);
                                return res.status(500).json({ error: 'Failed to update user account.' });
                            }
                            completeSignup(existingUser.id);
                        }
                    );
                } else {
                    // Insert new user
                    db.run(
                        `INSERT INTO users (
                            organization_id, admin_name, email, password_hash, 
                            marketing_opt_in, terms_accepted, role, dob,
                            sync_provider, sync_access_token, sync_refresh_token, sync_token_expires_at
                        ) VALUES (?, ?, ?, ?, 0, 1, 'employee', ?, ?, ?, ?, ?)`,
                        [
                            invite.organization_id, firstName, invite.email, password_hash,
                            dob || null, sync_provider, sync_access_token, sync_refresh_token, sync_token_expires_at
                        ],
                        function (err) {
                            if (err) {
                                console.error(err);
                                return res.status(500).json({ error: 'Failed to create user account.' });
                            }
                            completeSignup(this.lastID);
                        }
                    );
                }
            } catch (error) {
                console.error(error);
                return res.status(500).json({ error: 'Internal server error.' });
            }
        });
    });
};

module.exports = {
    sendInvite,
    verifyInvite,
    signupInvited
};
