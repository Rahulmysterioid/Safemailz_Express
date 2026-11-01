const { db } = require('../db');

/**
 * Execute a generic SQL query against the database using db.run.
 */
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                resolve({ error: err });
            } else {
                resolve({ success: true, result: this });
            }
        });
    });
}

/**
 * Safely runs an ALTER TABLE migration statement, ignoring duplicate column errors.
 */
async function runSafeAlter(sql) {
    const res = await runQuery(sql);
    if (res.error) {
        const msg = res.error.message || '';
        if (
            msg.includes('duplicate column name') || 
            msg.includes('already exists') ||
            msg.includes('Duplicate column')
        ) {
            console.log(`[Migration] Column already exists (safe skip): ${sql}`);
            return { skipped: true };
        } else {
            console.warn(`[Migration Warning] Query: ${sql} | Error: ${msg}`);
            return { error: res.error };
        }
    }
    console.log(`[Migration] Applied successfully: ${sql}`);
    return { applied: true };
}

/**
 * Main migration executor
 */
async function up() {
    console.log('--- Starting Migration: init_security_audit_and_employee_columns ---');

    // 1. Create Employee table
    console.log('Creating table Employee (if not exists)...');
    await runQuery(`
        CREATE TABLE IF NOT EXISTS Employee (
            id TEXT PRIMARY KEY,
            ownerId TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            passwordHash TEXT NOT NULL,
            mustChangePassword BOOLEAN NOT NULL DEFAULT 0,
            passwordChangedAt DATETIME,
            tokenVersion INTEGER NOT NULL DEFAULT 0
        )
    `);

    // 2. Create SecurityAuditLog table
    console.log('Creating table SecurityAuditLog (if not exists)...');
    await runQuery(`
        CREATE TABLE IF NOT EXISTS SecurityAuditLog (
            id TEXT PRIMARY KEY,
            actorId TEXT NOT NULL,
            actorRole TEXT NOT NULL DEFAULT 'OWNER',
            targetEmployeeId TEXT NOT NULL,
            action TEXT NOT NULL,
            ipAddress TEXT,
            metadata TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 3. Create indices
    console.log('Creating indices for Employee and SecurityAuditLog...');
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_audit_target ON SecurityAuditLog (targetEmployeeId)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_audit_actor ON SecurityAuditLog (actorId)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_emp_email ON Employee (email)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_emp_owner ON Employee (ownerId)`);

    // 4. Safely add columns to existing users table
    console.log('Adding columns to users table (if missing)...');
    await runSafeAlter(`ALTER TABLE users ADD COLUMN ownerId TEXT`);
    await runSafeAlter(`ALTER TABLE users ADD COLUMN mustChangePassword BOOLEAN DEFAULT 0`);
    await runSafeAlter(`ALTER TABLE users ADD COLUMN passwordChangedAt DATETIME`);
    await runSafeAlter(`ALTER TABLE users ADD COLUMN tokenVersion INTEGER DEFAULT 0`);

    console.log('--- Migration init_security_audit_and_employee_columns completed successfully ---');
    return true;
}

if (require.main === module) {
    up().then(() => {
        console.log('Migration script finished.');
        process.exit(0);
    }).catch(err => {
        console.error('Migration script failed:', err);
        process.exit(1);
    });
}

module.exports = {
    up,
    runQuery,
    runSafeAlter
};
