const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getEmployeeEmailFilter } = require('../controllers/emailController');
const { getEmployeeFilter } = require('../controllers/employeeController');

test('getEmployeeEmailFilter properly handles null and empty employee inputs', () => {
    const nullFilter = getEmployeeEmailFilter(null);
    assert.equal(nullFilter.whereClause, '1=0', 'Null employee must evaluate to 1=0');
    assert.deepEqual(nullFilter.emailsToMatch, []);

    const emptyFilter = getEmployeeEmailFilter({ email: '' });
    assert.equal(emptyFilter.whereClause, '1=0', 'Empty email must evaluate to 1=0');
    assert.deepEqual(emptyFilter.emailsToMatch, []);

    // Empty email with seat ID must not match arbitrary users
    const emptyWithId = getEmployeeEmailFilter({ id: 10, email: '' });
    assert.equal(emptyWithId.whereClause, '1=0', 'Employee without email must evaluate to 1=0 even with id');
    assert.deepEqual(emptyWithId.emailsToMatch, []);

    const controllerFilter = getEmployeeFilter(null);
    assert.equal(controllerFilter.whereClause, '1=0', 'employeeController wrapper must evaluate to 1=0');
});

test('getEmployeeEmailFilter properly scopes to specific employee emails and ID', () => {
    const filter = getEmployeeEmailFilter({
        id: 42,
        email: 'rahul.indianshelf99@gmail.com'
    });
    assert.equal(filter.employeeId, 42);
    assert.deepEqual(filter.emailsToMatch, ['rahul.indianshelf99@gmail.com']);
    assert.ok(filter.whereClause.includes('er.user_id = ? OR e.sender_id = ?'));
    assert.ok(filter.whereClause.includes('to_address'));
    assert.ok(filter.whereClause.includes('external_sender_email'));
    assert.ok(filter.params.includes('rahul.indianshelf99@gmail.com'));
});

test('Client-side email filtering isolates employee emails and prevents substring/recipient_id collisions', () => {
    const extractEmailsFromText = (text) => {
        if (!text) return [];
        const matches = String(text).toLowerCase().match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        return matches || [];
    };

    const filterEmailsForEmployee = (emailsList, targetEmployee) => {
        if (!targetEmployee || !targetEmployee.email) return [];
        const empEmail = String(targetEmployee.email).toLowerCase().trim();
        if (!empEmail) return [];
        const empId = targetEmployee.id != null ? String(targetEmployee.id) : null;
        const empDbId = targetEmployee._id != null ? String(targetEmployee._id) : null;

        return (emailsList || []).filter(mail => {
            if (!mail) return false;

            const ownerEmail = (mail.ownerEmail || mail.owner_email || '').toLowerCase().trim();
            if (ownerEmail && ownerEmail === empEmail) return true;

            const fromCandidates = [
                mail.from,
                mail.senderEmail,
                mail.realSenderEmail,
                mail.sender_email,
                mail.external_sender_email,
                (mail.sender && mail.sender.includes('@')) ? mail.sender : ''
            ].filter(Boolean);

            for (const f of fromCandidates) {
                if (f.toLowerCase().trim() === empEmail) return true;
                const extracted = extractEmailsFromText(f);
                if (extracted.includes(empEmail)) return true;
            }

            const toCandidates = [
                mail.to,
                mail.to_address,
                mail.recipient_email,
                mail.recipientEmail
            ].filter(Boolean);

            for (const t of toCandidates) {
                if (t.toLowerCase().trim() === empEmail) return true;
                const extracted = extractEmailsFromText(t);
                if (extracted.includes(empEmail)) return true;
            }

            if (extractEmailsFromText(mail.cc).includes(empEmail)) return true;
            if (extractEmailsFromText(mail.bcc).includes(empEmail)) return true;

            // Strict user/employee ID matching (do NOT match mail.recipient_id as it refers to email_recipients row ID)
            const mailEmpId = (
                mail.employeeId ||
                mail.employee_id ||
                mail.userId ||
                mail.user_id ||
                mail.recipientUserId ||
                mail.recipient_user_id
            ) != null ? String(mail.employeeId || mail.employee_id || mail.userId || mail.user_id || mail.recipientUserId || mail.recipient_user_id) : null;

            if (empDbId && mailEmpId && empDbId === mailEmpId) return true;
            if (empId && mailEmpId && empId === mailEmpId) return true;

            return false;
        });
    };

    const mockPool = [
        { id: 1, recipient_id: 2, sender: 'Rahul Singh', sender_email: 'rahul.indianshelf99@gmail.com', subject: 'Rahul Email 1', read: true, folder: 'inbox' },
        { id: 2, recipient_id: 1, sender: 'Client Corp', to: 'Rahul Singh <rahul.indianshelf99@gmail.com>', subject: 'Rahul Email 2', read: false, folder: 'inbox' },
        { id: 3, recipient_id: 3, sender: 'Tejasv Kumar', sender_email: 'tejasv.kumar@gmail.com', subject: 'Tejasv Email', read: true, folder: 'inbox' },
        { id: 4, recipient_id: 4, sender: 'Sahil Singh', sender_email: 'sahil.singh@gmail.com', subject: 'Sahil Email', read: false, folder: 'inbox' },
        // Substring collision traps:
        { id: 5, recipient_id: 5, sender: 'Bart', sender_email: 'bart@safemailz.com', to: 'trahul.indianshelf99@gmail.com', subject: 'Collision 1', read: true, folder: 'inbox' },
        { id: 6, recipient_id: 6, sender: 'Other', sender_email: 'other@example.com', to: 'rahul.indianshelf99@gmail.com.au', subject: 'Collision 2', read: true, folder: 'inbox' },
        // Pivot ID trap: recipient_id is 2, but belongs to someone else
        { id: 7, recipient_id: 2, sender: 'Stranger', sender_email: 'stranger@domain.com', to: 'stranger@domain.com', subject: 'Pivot Trap', read: true, folder: 'inbox' }
    ];

    const rahulEmp = { id: 1, email: 'rahul.indianshelf99@gmail.com' };
    const tejasvEmp = { id: 2, email: 'tejasv.kumar@gmail.com' };
    const sahilEmp = { id: 3, email: 'sahil.singh@gmail.com' };
    const pendingEmp = { id: 4, email: 'new.pending@safemailz.com' };

    const rahulEmails = filterEmailsForEmployee(mockPool, rahulEmp);
    assert.equal(rahulEmails.length, 2, 'Rahul must only match his 2 genuine emails and NOT collision traps or pivot ID traps');
    assert.ok(rahulEmails.every(m => m.subject.includes('Rahul')));

    // Ensure Tejasv (id: 2) does NOT match item 1 (which had recipient_id: 2) or item 7 (recipient_id: 2)
    const tejasvEmails = filterEmailsForEmployee(mockPool, tejasvEmp);
    assert.equal(tejasvEmails.length, 1, 'Tejasv must only match his 1 genuine email and not recipient_id: 2 rows');
    assert.equal(tejasvEmails[0].subject, 'Tejasv Email');

    const sahilEmails = filterEmailsForEmployee(mockPool, sahilEmp);
    assert.equal(sahilEmails.length, 1);
    assert.equal(sahilEmails[0].subject, 'Sahil Email');

    const pendingEmails = filterEmailsForEmployee(mockPool, pendingEmp);
    assert.equal(pendingEmails.length, 0, 'Pending employee with no synced emails should have 0 emails');

    // Verify dynamic metrics calculation for pending employee
    const totalCount = pendingEmails.length;
    const readCount = pendingEmails.filter(m => m.read).length;
    const readPercent = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;
    assert.equal(totalCount, 0);
    assert.equal(readCount, 0);
    assert.equal(readPercent, 0);
});
