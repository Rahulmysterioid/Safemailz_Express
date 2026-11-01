const { db } = require('../db');

/**
 * Helper to construct the exact same filter for both Employee Inbox & Admin View.
 * Matches all emails belonging to that employee across IDs and email addresses.
 *
 * @param {Object} employee - The employee object containing _id/id and email fields
 * @returns {Object} Unified filter with MongoDB-style filter and SQL builder helpers
 */
const getEmployeeEmailFilter = (employee) => {
    if (!employee) {
        return {
            emailsToMatch: [],
            conditions: ['1=0'],
            params: [],
            whereClause: '1=0',
            $or: []
        };
    }

    const rawEmails = [
        employee.email,
        employee.officialEmail,
        employee.personalEmail,
        employee.userEmail,
        employee.activeEmail
    ];

    const emailsToMatch = rawEmails
        .filter(Boolean)
        .map(e => String(e).trim().toLowerCase())
        .filter(e => e.length > 0);

    const uniqueEmails = [...new Set(emailsToMatch)];

    // An employee with no configured email address cannot have synced emails
    if (uniqueEmails.length === 0) {
        return {
            employeeId: null,
            emailsToMatch: [],
            conditions: ['1=0'],
            params: [],
            whereClause: '1=0',
            $or: []
        };
    }

    const conditions = [];
    const params = [];

    const empId = employee._id || employee.id || employee.userId;
    const numId = empId && !isNaN(parseInt(empId, 10)) ? parseInt(empId, 10) : null;

    // Match by DB user/assignment ID (assignedTo / user / recipient_id / sender_id)
    if (numId) {
        conditions.push(`(er.user_id = ? OR e.sender_id = ?)`);
        params.push(numId, numId);
    }

    // Match by any of the employee's email addresses
    for (const em of uniqueEmails) {
        conditions.push(`(
            LOWER(COALESCE(e.to_address, '')) LIKE '%' || ? || '%' OR
            LOWER(COALESCE(e.cc, '')) LIKE '%' || ? || '%' OR
            LOWER(COALESCE(e.bcc, '')) LIKE '%' || ? || '%' OR
            LOWER(COALESCE(e.external_sender_email, '')) = ? OR
            LOWER(COALESCE(u.email, '')) = ?
        )`);
        params.push(em, em, em, em, em);
    }

    const whereClause = conditions.length > 0 ? `(${conditions.join(' OR ')})` : '1=0';

    return {
        employeeId: numId,
        emailsToMatch: uniqueEmails,
        conditions,
        params,
        whereClause,
        $or: [
            ...(numId ? [{ assignedTo: numId }, { user: numId }] : []),
            ...(uniqueEmails.length > 0 ? [
                { recipientEmail: { $in: uniqueEmails } },
                { senderEmail: { $in: uniqueEmails } }
            ] : [])
        ]
    };
};

module.exports = {
    getEmployeeEmailFilter
};
