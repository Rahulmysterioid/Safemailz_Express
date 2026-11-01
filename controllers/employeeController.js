const { db } = require('../db');
const { getEmployeeEmailFilter } = require('./emailController');

/**
 * Controller for employee dashboard and stats operations.
 * Unifies email query logic with emailController.
 */

// Helper to construct exact same filter for both Employee Inbox & Admin View
const getEmployeeFilter = (employee) => {
    return getEmployeeEmailFilter(employee);
};

module.exports = {
    getEmployeeEmailFilter,
    getEmployeeFilter
};
