const { db } = require('../db');

/**
 * Checks if the given role string qualifies as an organization owner.
 * Accepts case-insensitive 'OWNER' or 'ORG_OWNER'.
 * @param {string} role 
 * @returns {boolean}
 */
function isOwnerRole(role) {
    if (typeof role !== 'string') return false;
    const trimmed = role.trim();
    return trimmed.toUpperCase() === 'OWNER' || trimmed.toLowerCase() === 'org_owner';
}

/**
 * Middleware to enforce Owner role on protected routes.
 * 
 * Logic:
 * 1. Checks `req.user.role` (accepts 'OWNER' or 'org_owner').
 * 2. If not present or user not populated, inspects `x-user-id` header in `users` table via `db.js`.
 * 3. If not owner, returns 403 Forbidden: `{ success: false, error: "Forbidden: Owner access required" }`.
 * 4. On success, attaches/ensures `req.user` contains `{ id, role, organization_id }`.
 */
function requireOwnerRole(req, res, next) {
    // 1. If req.user is already populated with a role
    if (req.user && req.user.role) {
        if (!isOwnerRole(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: "Forbidden: Owner access required"
            });
        }

        const userId = req.user.id || req.user.userId || req.headers['x-user-id'];

        // If organization_id and id are present, proceed
        if (req.user.id && req.user.organization_id !== undefined && req.user.organization_id !== null) {
            req.user = {
                ...req.user,
                id: req.user.id,
                role: req.user.role,
                organization_id: req.user.organization_id
            };
            return next();
        }

        // If organization_id or id is missing, query database to enrich req.user
        if (userId) {
            return db.get(
                'SELECT id, role, organization_id FROM users WHERE id = ?',
                [userId],
                (err, user) => {
                    if (err) {
                        console.error('[requireOwnerRole] DB error:', err.message);
                        return res.status(500).json({ success: false, error: "Database error" });
                    }
                    if (!user || !isOwnerRole(user.role)) {
                        return res.status(403).json({
                            success: false,
                            error: "Forbidden: Owner access required"
                        });
                    }
                    req.user = {
                        ...req.user,
                        id: user.id,
                        role: user.role,
                        organization_id: user.organization_id
                    };
                    return next();
                }
            );
        }

        // Fallback organization_id from header or default 1
        req.user.organization_id = req.user.organization_id || (req.headers['x-org-id'] ? parseInt(req.headers['x-org-id'], 10) : 1);
        return next();
    }

    // 2. req.user.role is not present -> inspect x-user-id header
    const headerUserId = req.headers['x-user-id'] || (req.user && (req.user.id || req.user.userId));
    if (!headerUserId) {
        return res.status(403).json({
            success: false,
            error: "Forbidden: Owner access required"
        });
    }

    db.get(
        'SELECT id, role, organization_id FROM users WHERE id = ?',
        [headerUserId],
        (err, user) => {
            if (err) {
                console.error('[requireOwnerRole] DB error:', err.message);
                return res.status(500).json({ success: false, error: "Database error" });
            }

            if (!user || !isOwnerRole(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: "Forbidden: Owner access required"
                });
            }

            // Attach req.user with { id, role, organization_id }
            req.user = {
                ...(req.user || {}),
                id: user.id,
                role: user.role,
                organization_id: user.organization_id
            };

            return next();
        }
    );
}

module.exports = requireOwnerRole;
module.exports.requireOwnerRole = requireOwnerRole;
module.exports.isOwnerRole = isOwnerRole;
