const { db } = require('../db');
const crypto = require('crypto');

// Helper to execute db.run as promise
function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

// Helper to execute db.get as promise
function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Helper to execute db.all as promise
function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

/**
 * Normalizes an employee record from either `Employee` or `users` table.
 */
function normalizeEmployee(row, sourceTable) {
    if (!row) return null;

    if (sourceTable === 'Employee') {
        return {
            id: String(row.id),
            ownerId: row.ownerId ? String(row.ownerId) : null,
            email: row.email,
            passwordHash: row.passwordHash,
            mustChangePassword: Boolean(row.mustChangePassword),
            passwordChangedAt: row.passwordChangedAt || null,
            tokenVersion: Number(row.tokenVersion || 0),
            sourceTable: 'Employee'
        };
    }

    // Source is 'users'
    return {
        id: String(row.id),
        ownerId: row.ownerId ? String(row.ownerId) : (row.organization_id ? String(row.organization_id) : null),
        organization_id: row.organization_id,
        name: row.admin_name,
        admin_name: row.admin_name,
        email: row.email,
        passwordHash: row.password_hash || row.passwordHash,
        mustChangePassword: Boolean(row.mustChangePassword),
        passwordChangedAt: row.passwordChangedAt || null,
        tokenVersion: Number(row.tokenVersion || 0),
        role: row.role || 'user',
        sourceTable: 'users'
    };
}

/**
 * Finds an employee by ID across both `Employee` and `users` tables.
 * @param {string|number} id
 * @returns {Promise<Object|null>}
 */
async function findEmployeeById(id) {
    if (!id && id !== 0) return null;
    const idStr = String(id).trim();

    // 1. Check Employee table
    try {
        const empRow = await dbGet('SELECT * FROM Employee WHERE id = ?', [idStr]);
        if (empRow) {
            return normalizeEmployee(empRow, 'Employee');
        }
    } catch (e) {
        // Table might not exist yet if before migration, continue
    }

    // 2. Check users table
    try {
        const userRow = await dbGet('SELECT * FROM users WHERE id = ?', [idStr]);
        if (userRow) {
            return normalizeEmployee(userRow, 'users');
        }
    } catch (e) {
        console.error('Error fetching user by ID:', e.message);
    }

    return null;
}

/**
 * Finds an employee by email address across both `Employee` and `users` tables.
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
async function findEmployeeByEmail(email) {
    if (!email) return null;
    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Check Employee table
    try {
        const empRow = await dbGet('SELECT * FROM Employee WHERE LOWER(email) = ?', [cleanEmail]);
        if (empRow) {
            return normalizeEmployee(empRow, 'Employee');
        }
    } catch (e) {
        // Table might not exist yet if before migration, continue
    }

    // 2. Check users table
    try {
        const userRow = await dbGet('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
        if (userRow) {
            return normalizeEmployee(userRow, 'users');
        }
    } catch (e) {
        console.error('Error fetching user by email:', e.message);
    }

    return null;
}

/**
 * Updates employee password and security flags across Employee and/or users table.
 * @param {Object} params
 * @param {string|number} params.id - Target Employee/User ID
 * @param {string} params.passwordHash - The new bcrypt password hash
 * @param {boolean} [params.mustChangePassword=false] - Whether user must change password upon next login
 * @param {Date|string} [params.passwordChangedAt] - Timestamp when password was changed
 * @param {boolean|number} [params.incrementTokenVersion=true] - Whether to bump tokenVersion to invalidate sessions
 * @returns {Promise<Object>} Updated employee object
 */
async function updateEmployeePassword({
    id,
    passwordHash,
    mustChangePassword = false,
    passwordChangedAt = null,
    incrementTokenVersion = true
}) {
    if (!id && id !== 0) throw new Error('Employee id is required to update password');
    if (!passwordHash) throw new Error('passwordHash is required to update password');

    const idStr = String(id).trim();
    const changedAt = passwordChangedAt 
        ? (passwordChangedAt instanceof Date ? passwordChangedAt.toISOString() : String(passwordChangedAt))
        : new Date().toISOString();
    const mustChangeVal = mustChangePassword ? 1 : 0;
    const tokenInc = (incrementTokenVersion === false) ? 0 : (typeof incrementTokenVersion === 'number' ? incrementTokenVersion : 1);

    let updated = false;

    // 1. Attempt update on Employee table
    try {
        const emp = await dbGet('SELECT id FROM Employee WHERE id = ?', [idStr]);
        if (emp) {
            await dbRun(
                `UPDATE Employee 
                 SET passwordHash = ?, 
                     mustChangePassword = ?, 
                     passwordChangedAt = ?, 
                     tokenVersion = COALESCE(tokenVersion, 0) + ? 
                 WHERE id = ?`,
                [passwordHash, mustChangeVal, changedAt, tokenInc, idStr]
            );
            updated = true;
        }
    } catch (e) {
        // Ignore if Employee table is not yet created
    }

    // 2. Attempt update on users table
    try {
        const user = await dbGet('SELECT id FROM users WHERE id = ?', [idStr]);
        if (user) {
            await dbRun(
                `UPDATE users 
                 SET password_hash = ?, 
                     mustChangePassword = ?, 
                     passwordChangedAt = ?, 
                     tokenVersion = COALESCE(tokenVersion, 0) + ? 
                 WHERE id = ?`,
                [passwordHash, mustChangeVal, changedAt, tokenInc, idStr]
            );
            updated = true;
        }
    } catch (e) {
        console.error('Error updating users table:', e.message);
    }

    if (!updated) {
        throw new Error(`Employee with ID '${id}' not found in Employee or users tables.`);
    }

    return await findEmployeeById(idStr);
}

module.exports = {
    findEmployeeById,
    findEmployeeByEmail,
    updateEmployeePassword,
    normalizeEmployee,
    dbRun,
    dbGet,
    dbAll
};
