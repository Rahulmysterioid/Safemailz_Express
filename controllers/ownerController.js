const crypto = require('crypto');
const { db } = require('../db');
const passwordService = require('../services/passwordService');

// Promisified DB helpers compatible with libsql/sqlite3 wrapper in db.js
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
    });
});

let schemaEnsured = false;

/**
 * Ensures required audit and employee schema exists in database.
 */
async function ensureSchema() {
    if (schemaEnsured) return;
    try {
        await dbRun(`
            CREATE TABLE IF NOT EXISTS SecurityAuditLog (
                id TEXT PRIMARY KEY,
                actorId TEXT NOT NULL,
                actorRole TEXT NOT NULL,
                targetEmployeeId TEXT NOT NULL,
                action TEXT NOT NULL,
                ipAddress TEXT,
                metadata TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).catch(() => {});

        await dbRun(`
            CREATE TABLE IF NOT EXISTS Employee (
                id TEXT PRIMARY KEY,
                ownerId TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                passwordHash TEXT NOT NULL,
                mustChangePassword BOOLEAN DEFAULT 0,
                passwordChangedAt DATETIME,
                tokenVersion INTEGER DEFAULT 0
            )
        `).catch(() => {});

        // Safely add any missing columns to users table
        await dbRun(`ALTER TABLE users ADD COLUMN mustChangePassword BOOLEAN DEFAULT 0`).catch(() => {});
        await dbRun(`ALTER TABLE users ADD COLUMN passwordChangedAt DATETIME`).catch(() => {});
        await dbRun(`ALTER TABLE users ADD COLUMN tokenVersion INTEGER DEFAULT 0`).catch(() => {});
        await dbRun(`ALTER TABLE users ADD COLUMN ownerId TEXT`).catch(() => {});

        schemaEnsured = true;
    } catch (e) {
        console.error('[ownerController] Schema initialization warning:', e.message);
    }
}

// Trigger initial check
ensureSchema().catch(() => {});

/**
 * Reset Employee Password Handler
 * Contract: POST /api/v1/owner/employees/:employeeId/reset-password
 */
async function resetEmployeePassword(req, res) {
    try {
        await ensureSchema();

        const employeeId = req.params.employeeId;
        if (!employeeId) {
            return res.status(400).json({
                success: false,
                error: "Employee ID parameter is required"
            });
        }

        const {
            newPassword,
            forceChangeOnNextLogin = true,
            revokeActiveSessions = true
        } = req.body || {};

        // 1. Password validation (min 8 chars)
        if (!passwordService.validatePassword(newPassword)) {
            return res.status(400).json({
                success: false,
                error: "Password must be at least 8 characters long"
            });
        }

        const callerOwnerId = String(req.user.id);
        const callerOrgId = req.user.organization_id;

        // 2. Tenant Isolation Check:
        // Employee must belong to the organization (or ownerId) of the caller
        let foundEmployee = null;
        let isUsersTable = false;
        let isEmployeeTable = false;

        // Check users table
        try {
            const userRow = await dbGet(
                `SELECT * FROM users 
                 WHERE (id = ? OR CAST(id AS TEXT) = ?) 
                   AND (organization_id = ? OR ownerId = ? OR CAST(organization_id AS TEXT) = ?)`,
                [employeeId, String(employeeId), callerOrgId, callerOwnerId, String(callerOrgId)]
            );
            if (userRow) {
                foundEmployee = userRow;
                isUsersTable = true;
            }
        } catch (dbErr) {
            console.error('[ownerController] Error querying users table:', dbErr.message);
        }

        // Check Employee table if not found in users table
        if (!foundEmployee) {
            try {
                const empRow = await dbGet(
                    `SELECT * FROM Employee 
                     WHERE id = ? 
                       AND (ownerId = ? OR ownerId = ?)`,
                    [String(employeeId), callerOwnerId, String(callerOrgId)]
                );
                if (empRow) {
                    foundEmployee = empRow;
                    isEmployeeTable = true;
                }
            } catch (dbErr) {
                console.error('[ownerController] Error querying Employee table:', dbErr.message);
            }
        }

        // If not found in organization, enforce strict 404
        if (!foundEmployee) {
            return res.status(404).json({
                success: false,
                error: "Employee not found in your organization"
            });
        }

        // 3. Hash new password with bcrypt (10 rounds)
        const hashedPassword = await passwordService.hashPassword(newPassword);
        const updatedAt = new Date().toISOString();
        const mustChange = Boolean(forceChangeOnNextLogin);
        const revokeSessions = Boolean(revokeActiveSessions);

        // 4. Update employee record in SQLite
        // Update users table
        if (isUsersTable || foundEmployee.email) {
            try {
                const userSql = revokeSessions
                    ? `UPDATE users 
                       SET password_hash = ?, 
                           mustChangePassword = ?, 
                           passwordChangedAt = ?, 
                           tokenVersion = COALESCE(tokenVersion, 0) + 1 
                       WHERE id = ? OR CAST(id AS TEXT) = ? OR email = ?`
                    : `UPDATE users 
                       SET password_hash = ?, 
                           mustChangePassword = ?, 
                           passwordChangedAt = ? 
                       WHERE id = ? OR CAST(id AS TEXT) = ? OR email = ?`;

                const userParams = [
                    hashedPassword,
                    mustChange ? 1 : 0,
                    updatedAt,
                    employeeId,
                    String(employeeId),
                    foundEmployee.email || ''
                ];

                await dbRun(userSql, userParams);
            } catch (updateErr) {
                console.error('[ownerController] Error updating users record:', updateErr.message);
            }
        }

        // Update Employee table (if present)
        try {
            const empSql = revokeSessions
                ? `UPDATE Employee 
                   SET passwordHash = ?, 
                       mustChangePassword = ?, 
                       passwordChangedAt = ?, 
                       tokenVersion = COALESCE(tokenVersion, 0) + 1 
                   WHERE id = ? OR email = ?`
                : `UPDATE Employee 
                   SET passwordHash = ?, 
                       mustChangePassword = ?, 
                       passwordChangedAt = ? 
                   WHERE id = ? OR email = ?`;

            await dbRun(empSql, [
                hashedPassword,
                mustChange ? 1 : 0,
                updatedAt,
                String(employeeId),
                foundEmployee.email || ''
            ]);
        } catch (empUpdateErr) {
            // Employee table may not exist or row may not exist, non-fatal
        }

        // 5. Insert audit log into SecurityAuditLog table
        // NEVER log plaintext passwords
        const auditId = crypto.randomUUID();
        const rawIp = req.ip ||
            (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) ||
            (req.socket && req.socket.remoteAddress) ||
            null;
        const ipAddress = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : null;

        const metadata = JSON.stringify({
            forceChangeOnLogin: mustChange,
            revokeSessions: revokeSessions
        });

        try {
            await dbRun(
                `INSERT INTO SecurityAuditLog (
                    id, 
                    actorId, 
                    actorRole, 
                    targetEmployeeId, 
                    action, 
                    ipAddress, 
                    metadata, 
                    createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    auditId,
                    callerOwnerId,
                    "OWNER",
                    String(employeeId),
                    "OWNER_RESET_EMPLOYEE_PASSWORD",
                    ipAddress,
                    metadata,
                    updatedAt
                ]
            );
        } catch (auditErr) {
            console.error('[ownerController] SecurityAuditLog record insertion warning:', auditErr.message);
        }

        // 6. Return response matching Shared Contract
        return res.status(200).json({
            success: true,
            message: "Employee password reset successfully",
            data: {
                employeeId: String(employeeId),
                mustChangePassword: mustChange,
                sessionsRevoked: revokeSessions,
                updatedAt: updatedAt
            }
        });

    } catch (error) {
        console.error('[ownerController] Unexpected resetEmployeePassword error:', error);
        return res.status(500).json({
            success: false,
            error: "An unexpected error occurred while resetting employee password"
        });
    }
}

module.exports = {
    resetEmployeePassword,
    ensureSchema
};
