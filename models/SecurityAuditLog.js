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

// Helper to execute db.all as promise
function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
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

/**
 * Creates an audit log entry for security and administrative actions.
 * @param {Object} params
 * @param {string|number} params.actorId - ID of actor (e.g. Owner ID)
 * @param {string} [params.actorRole="OWNER"] - Role of the actor
 * @param {string|number} params.targetEmployeeId - ID of target employee
 * @param {string} params.action - Action identifier (e.g. "OWNER_RESET_EMPLOYEE_PASSWORD")
 * @param {string} [params.ipAddress] - Request IP address
 * @param {Object|string} [params.metadata] - Extra metadata object
 * @returns {Promise<Object>} Created audit log record
 */
async function createAuditLog({ actorId, actorRole = 'OWNER', targetEmployeeId, action, ipAddress = null, metadata = null }) {
    if (!actorId) throw new Error('actorId is required for audit log');
    if (!targetEmployeeId) throw new Error('targetEmployeeId is required for audit log');
    if (!action) throw new Error('action is required for audit log');

    const id = crypto.randomUUID();
    const metadataStr = metadata 
        ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata))
        : null;
    const createdAt = new Date().toISOString();

    const sql = `
        INSERT INTO SecurityAuditLog (id, actorId, actorRole, targetEmployeeId, action, ipAddress, metadata, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await dbRun(sql, [
        id,
        String(actorId),
        String(actorRole),
        String(targetEmployeeId),
        String(action),
        ipAddress || null,
        metadataStr,
        createdAt
    ]);

    return {
        id,
        actorId: String(actorId),
        actorRole: String(actorRole),
        targetEmployeeId: String(targetEmployeeId),
        action: String(action),
        ipAddress: ipAddress || null,
        metadata: metadataStr ? JSON.parse(metadataStr) : null,
        createdAt
    };
}

/**
 * Retrieves audit logs associated with a specific employee.
 * @param {string|number} employeeId
 * @returns {Promise<Array<Object>>}
 */
async function getAuditLogsForEmployee(employeeId) {
    if (!employeeId) return [];

    const sql = `
        SELECT id, actorId, actorRole, targetEmployeeId, action, ipAddress, metadata, createdAt
        FROM SecurityAuditLog
        WHERE targetEmployeeId = ?
        ORDER BY createdAt DESC
    `;

    const rows = await dbAll(sql, [String(employeeId)]);
    return rows.map(row => {
        let parsedMeta = null;
        if (row.metadata) {
            try {
                parsedMeta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
            } catch (e) {
                parsedMeta = row.metadata;
            }
        }
        return {
            ...row,
            metadata: parsedMeta
        };
    });
}

module.exports = {
    createAuditLog,
    getAuditLogsForEmployee,
    dbRun,
    dbAll,
    dbGet
};
