require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb, db } = require('./db');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database
initDb();

// Middleware
app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => {
        // Keep raw body available for debugging malformed JSON if needed
        req.rawBody = buf;
    }
})); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// Return JSON (not HTML) for body-parser / other middleware errors on API routes
app.use((err, req, res, next) => {
    if (!err) return next();
    if (req.path && req.path.startsWith('/api')) {
        const status = err.status || err.statusCode || 400;
        return res.status(status).json({
            error: err.type === 'entity.parse.failed' ? 'Invalid JSON body' : (err.message || 'Bad request')
        });
    }
    return next(err);
});

// ─── Block-check middleware (MUST be BEFORE route handlers) ────────────────
// Checks every protected API request. If the user is blocked, returns 403.
app.use('/api', (req, res, next) => {
    // Let public endpoints pass through without a DB lookup
    const PUBLIC_PATHS = ['/signin', '/signup', '/status'];
    if (PUBLIC_PATHS.some(p => req.path === p || req.path.startsWith(p + '?'))) {
        return next();
    }
    const userId = req.headers['x-user-id'];
    if (!userId) return next();

    db.get('SELECT is_blocked FROM users WHERE id = ?', [parseInt(userId, 10)], (err, row) => {
        if (err) {
            console.error('[block-check] DB error:', err.message);
            return next(); // fail open so admins aren't locked out by a DB hiccup
        }
        if (row && (row.is_blocked === 1 || row.is_blocked === true)) {
            console.log(`[block-check] Blocked user ${userId} rejected.`);
            return res.status(403).json({ error: 'You are blocked. Please contact your admin.', is_blocked: true, success: false, message: 'You are blocked. Please contact your admin.' });
        }
        next();
    });
});

// ─── API Routes (before static so /api/* never falls through to HTML) ────────
app.use('/api', authRoutes);
const paymentRoutes = require('./routes/payment');
app.use('/api/payment', paymentRoutes);
const emailRoutes = require('./routes/emails');
app.use('/api/emails', emailRoutes);
const settingsRoutes = require('./routes/settings');
app.use('/api/settings', settingsRoutes);
const syncRoutes = require('./routes/sync');
app.use('/api/sync', syncRoutes);
const inviteRoutes = require('./routes/invite');
app.use('/api/invite', inviteRoutes);
const clientsRoutes = require('./routes/clients');
app.use('/api/clients', clientsRoutes);
const projectsRoutes = require('./routes/projects');
app.use('/api/projects', projectsRoutes);
const autoCcRoutes = require('./routes/autoCc');
app.use('/api/auto-cc', autoCcRoutes);

// Serve static files from the React app (Frontend)
app.use(express.static(path.join(__dirname, 'client/dist')));

// Lightweight ping endpoint (excluded from block-check above)
app.get('/api/status', (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.json({ status: 'active' });
    db.get('SELECT is_blocked FROM users WHERE id = ?', [parseInt(userId, 10)], (err, row) => {
        if (row && (row.is_blocked === 1 || row.is_blocked === true)) {
            return res.status(403).json({ error: 'You are blocked. Please contact your admin.', is_blocked: true, success: false, message: 'You are blocked. Please contact your admin.' });
        }
        res.json({ status: 'active' });
    });
});

// The "catchall" handler: for any request that doesn't match API routes, send back React's index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
