const express = require('express');
const router = express.Router();
const requireOwnerRole = require('../middleware/requireOwnerRole');
const ownerController = require('../controllers/ownerController');

/**
 * Owner Management Routes
 * Base mount point: /api/v1/owner
 * Full URL: POST /api/v1/owner/employees/:employeeId/reset-password
 */
router.post(
    '/employees/:employeeId/reset-password',
    requireOwnerRole,
    ownerController.resetEmployeePassword
);

// Fallback route if mounted directly under /api/v1
router.post(
    '/owner/employees/:employeeId/reset-password',
    requireOwnerRole,
    ownerController.resetEmployeePassword
);

module.exports = router;
