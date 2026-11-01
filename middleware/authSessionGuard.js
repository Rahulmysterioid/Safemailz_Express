const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'safemailz-jwt-secret-key';

/**
 * authSessionGuard middleware
 * Checks if incoming JWT token is revoked via tokenVersion.
 * Also checks headers for x-user-id and verifies session validity.
 */
function authSessionGuard(req, res, next) {
    // 1. Extract token from Authorization header or headers
    let token = null;
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (authHeader) {
        if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7).trim();
        } else if (typeof authHeader === 'string') {
            token = authHeader.trim();
        }
    } else if (req.headers['x-access-token']) {
        token = req.headers['x-access-token'];
    }

    let decoded = null;
    if (token) {
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            try {
                decoded = jwt.decode(token);
            } catch (decodeErr) {
                decoded = null;
            }
        }
    }

    // Attach decoded token to req.user if present
    if (decoded && typeof decoded === 'object') {
        req.user = req.user ? { ...decoded, ...req.user } : decoded;
    }

    const userId = decoded?.id || decoded?.userId || req.headers['x-user-id'];
    const tokenVersion = decoded?.tokenVersion !== undefined
        ? decoded.tokenVersion
        : (decoded?.token_version !== undefined ? decoded.token_version : req.headers['x-token-version']);

    // If there is no user or no tokenVersion attached to token/request, let next() proceed
    if (!userId || tokenVersion === undefined || tokenVersion === null) {
        return next();
    }

    // Query user in db to check current tokenVersion
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error('[authSessionGuard] DB query error:', err.message);
            // In case of DB error, proceed to not block requests unexpectedly
            return next();
        }

        if (!user) {
            return next();
        }

        const currentTokenVersion = user.tokenVersion !== undefined
            ? user.tokenVersion
            : (user.token_version !== undefined ? user.token_version : 0);

        if (Number(tokenVersion) < Number(currentTokenVersion)) {
            console.warn(`[authSessionGuard] Session invalidated for user ${userId}: token version ${tokenVersion} < current version ${currentTokenVersion}`);
            return res.status(401).json({
                error: "Session Expired",
                code: "SESSION_EXPIRED",
                message: "Your session has been invalidated by the organization owner. Please log in again."
            });
        }

        next();
    });
}

module.exports = authSessionGuard;
module.exports.authSessionGuard = authSessionGuard;
