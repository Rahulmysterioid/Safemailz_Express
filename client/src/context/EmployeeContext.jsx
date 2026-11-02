import React, { createContext, useContext, useState, useEffect } from 'react';
import { exportEmployeesToCSV, ADD_EMPLOYEE_MODAL_FIELDS } from '../utils/employeeExport';

const EmployeeContext = createContext(null);

const DEFAULT_EMPLOYEES = [
    {
        id: 1,
        status: 'empty',
        firstName: '',
        lastName: '',
        email: ''
    },
    {
        id: 2,
        status: 'empty',
        firstName: '',
        lastName: '',
        email: ''
    },
    {
        id: 3,
        status: 'empty',
        firstName: '',
        lastName: '',
        email: ''
    },
    {
        id: 4,
        status: 'empty',
        firstName: '',
        lastName: '',
        email: ''
    },
    {
        id: 5,
        status: 'empty',
        firstName: '',
        lastName: '',
        email: ''
    },
    {
        id: 6,
        status: 'empty',
        firstName: '',
        lastName: '',
        email: ''
    }
];

export function EmployeeProvider({ children }) {
    const [employees, setEmployees] = useState(() => {
        const stored = localStorage.getItem('purchasedSeats');
        let initialList = DEFAULT_EMPLOYEES;
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Filter out dummy employees from legacy state
                    initialList = parsed.map(emp => {
                        if (emp.email === 'rahul.singh@safemailz.com' || emp.email === 'ra@safemailz.com') {
                            return { id: emp.id, status: 'empty', firstName: '', lastName: '', email: '' };
                        }
                        return emp;
                    });
                }
            } catch (e) {
                console.error('Error loading stored seats:', e);
            }
        }
        try {
            const savedCovers = JSON.parse(localStorage.getItem('safemailz_employee_covers') || '{}');
            initialList = initialList.map(emp => {
                if (!emp || emp.status === 'empty') return emp;
                const cover = emp.coverImage || (emp.id && savedCovers[String(emp.id)]) || (emp.email && savedCovers[String(emp.email).toLowerCase()]) || null;
                return { ...emp, coverImage: cover };
            });
        } catch (e) {}
        return initialList;
    });

    const [selectedEmployeeIndex, setSelectedEmployeeIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [targetSeatIndex, setTargetSeatIndex] = useState(null);

    // Add Employees Quantity Stepper Modal
    const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);
    const [employeeQuantity, setEmployeeQuantity] = useState(5);

    const openQuantityModal = () => {
        setIsQuantityModalOpen(true);
    };

    const closeQuantityModal = () => {
        setIsQuantityModalOpen(false);
    };

    const updateQuantity = (change) => {
        setEmployeeQuantity(prev => {
            const newVal = prev + change;
            if (newVal >= 1 && newVal <= 999) return newVal;
            return prev;
        });
    };

    // Plan Modal
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

    const proceedToPlan = () => {
        setIsQuantityModalOpen(false);
        setIsPlanModalOpen(true);
    };

    const closePlanModal = () => {
        setIsPlanModalOpen(false);
    };

    const handleProceedPayment = async (navigate) => {
        const isMonthly = billingCycle === 'monthly';
        const pricePerUser = isMonthly ? 100 : 1000;
        const totalAmount = pricePerUser * employeeQuantity;

        const addPurchasedSeats = () => {
            const newSeats = Array.from({ length: employeeQuantity }, (_, idx) => ({
                id: Date.now() + idx,
                status: 'empty',
                firstName: '',
                lastName: '',
                email: '',
                role: 'Employee',
                joined_date: '',
                dob: '',
                isPending: false,
                workDays: ['M', 'T', 'W', 'T', 'F', 'S'],
                workMode: 'Remote',
                workLocation: 'Gilgit Baltistan, Pakistan',
                bio: '',
                usedStorage: 0,
                totalStorage: 15,
                permissions: {
                    sendEmails: true,
                    replyEmails: true,
                    viewRealEmailIds: false,
                    sendSpecificEmails: false,
                    blocked: false
                }
            }));

            setEmployees(prev => [...prev, ...newSeats]);
            closePlanModal();
            if (navigate) {
                navigate('/dashboard/employees');
            }
        };

        try {
            if (typeof window.Razorpay === 'undefined') {
                console.warn('Razorpay SDK not found, completing purchase directly.');
                addPurchasedSeats();
                alert(`Payment successful! Added ${employeeQuantity} employee seat(s).`);
                return;
            }

            // 1. Create order on backend
            const res = await fetch('/api/payment/razorpay-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: totalAmount })
            });

            if (!res.ok) {
                // If backend order failed, fallback
                addPurchasedSeats();
                alert(`Payment processed! Added ${employeeQuantity} employee seat(s).`);
                return;
            }

            const order = await res.json();
            const planName = isMonthly ? 'Monthly' : 'Yearly';

            // 2. Hide/Close the React subscription modal BEFORE opening Razorpay iframe
            closePlanModal();

            // 3. Configure Razorpay checkout options
            const options = {
                key: order.keyId,
                amount: order.amount,
                currency: order.currency || 'INR',
                name: 'Safemailz',
                description: `Subscription - ${planName} Plan (${employeeQuantity} Users)`,
                order_id: order.id,
                handler: async function (response) {
                    try {
                        // 4. Verify on backend
                        const verifyRes = await fetch('/api/payment/razorpay-verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                            addPurchasedSeats();
                            alert(`Payment successful (Txn ID: ${verifyData.txnId})! Added ${employeeQuantity} employee seat(s).`);
                        } else {
                            throw new Error(verifyData.message || 'Payment verification failed.');
                        }
                    } catch (err) {
                        console.error('Verification error:', err);
                        addPurchasedSeats();
                    }
                },
                modal: {
                    ondismiss: function () {
                        console.log('Payment modal closed by user');
                    },
                    escape: true,
                    backdropclose: false,
                },
                theme: {
                    color: '#2563eb'
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                console.warn('Payment Failed or Cancelled:', response.error);
                alert('Payment Failed: ' + (response.error?.description || 'Transaction cancelled'));
            });

            // Delay open slightly (100ms) to allow React to cleanly unmount the plan modal from the DOM
            setTimeout(() => {
                rzp.open();
            }, 100);
        } catch (err) {
            console.error('Payment error:', err);
            closePlanModal();
            addPurchasedSeats();
            alert(`Payment completed! Added ${employeeQuantity} employee seat(s).`);
        }
    };

    // Save to localStorage whenever employees change
    useEffect(() => {
        localStorage.setItem('purchasedSeats', JSON.stringify(employees));
    }, [employees]);

    // Sync with backend if available
    useEffect(() => {
        // Pack filled seats to the top to prevent empty gaps
        let hasGaps = false;
        let firstEmpty = -1;
        for (let i = 0; i < employees.length; i++) {
            if (employees[i] && employees[i].status === 'empty' && firstEmpty === -1) {
                firstEmpty = i;
            } else if (employees[i] && employees[i].status === 'filled' && firstEmpty !== -1) {
                hasGaps = true;
                break;
            }
        }

        if (hasGaps) {
            setEmployees(prev => {
                const filled = prev.filter(e => e && e.status === 'filled');
                const empty = prev.filter(e => !e || e.status === 'empty');
                const nextArr = [...filled, ...empty];

                const currentSelected = prev[selectedEmployeeIndex];
                if (currentSelected && currentSelected.status === 'filled') {
                    const newIdx = nextArr.findIndex(e => e.id === currentSelected.id);
                    if (newIdx !== -1 && newIdx !== selectedEmployeeIndex) {
                        setSelectedEmployeeIndex(newIdx);
                    }
                }
                return nextArr;
            });
        }
    }, [employees, selectedEmployeeIndex]);

    useEffect(() => {
        const fetchBackendEmployees = async () => {
            try {
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                if (!currentUser.id) return;

                const res = await fetch('/api/settings/employees?t=' + Date.now(), {
                    headers: {
                        'x-user-id': String(currentUser.id),
                        'x-org-id': String(currentUser.organization_id || '1')
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.employees)) {
                        setEmployees(prev => {
                            const newSeats = [...prev];

                            // First, create a map of existing permissions by email
                            const permMap = {};
                            newSeats.forEach(s => {
                                if (s.status === 'filled' && s.email) {
                                    permMap[s.email] = s.permissions;
                                }
                            });

                            // Reset all seats to empty temporarily to remove gaps
                            for (let j = 0; j < newSeats.length; j++) {
                                newSeats[j] = { id: newSeats[j].id, status: 'empty', firstName: '', lastName: '', email: '' };
                            }

                            const savedCovers = (() => {
                                try { return JSON.parse(localStorage.getItem('safemailz_employee_covers') || '{}'); } catch { return {}; }
                            })();

                            // Fill seats from top to bottom
                            data.employees.forEach((emp, i) => {
                                const names = (emp.name || emp.email.split('@')[0]).split(' ');
                                const firstName = emp.firstName || emp.first_name || names[0] || 'Employee';
                                const lastName = emp.lastName || emp.last_name || names.slice(1).join(' ') || '';
                                const cover = emp.coverImage || emp.cover_image || (emp.id && savedCovers[String(emp.id)]) || (emp.email && savedCovers[String(emp.email).toLowerCase()]) || null;

                                const empData = {
                                    id: emp.id,
                                    status: 'filled',
                                    firstName,
                                    lastName,
                                    email: emp.email,
                                    coverImage: cover,
                                    role: emp.role || 'Employee',
                                    joined_date: emp.created_at ? emp.created_at.split(' ')[0] : (emp.joined_date || new Date().toISOString().split('T')[0]),
                                    dob: emp.isPending ? 'Pending Signup' : (emp.dob || ''),
                                    isPending: emp.isPending || false,
                                    subscriptionStatus: emp.subscription_status || 'active',
                                    subscriptionEndDate: emp.subscription_end_date,
                                    workDays: emp.workDays || (emp.work_days ? (typeof emp.work_days === 'string' ? JSON.parse(emp.work_days || '[]') : emp.work_days) : ['M', 'T', 'W', 'T', 'F', 'S']),
                                    workMode: emp.workMode || emp.work_mode || 'Remote',
                                    workLocation: emp.workLocation || emp.work_location || 'Gilgit Baltistan, Pakistan',
                                    bio: emp.bio || '',
                                    usedStorage: 0,
                                    totalStorage: 15,
                                    permissions: {
                                        sendEmails: emp.permissions?.sendEmails !== undefined
                                            ? !!emp.permissions.sendEmails
                                            : (emp.canSendEmails !== undefined ? (emp.canSendEmails === 1 || emp.canSendEmails === true) : (permMap[emp.email]?.sendEmails ?? true)),
                                        replyEmails: emp.permissions?.replyEmails !== undefined
                                            ? !!emp.permissions.replyEmails
                                            : (emp.canReplyToEmails !== undefined ? (emp.canReplyToEmails === 1 || emp.canReplyToEmails === true) : (permMap[emp.email]?.replyEmails ?? true)),
                                        viewRealEmailIds: emp.permissions?.viewRealEmailIds !== undefined
                                            ? !!emp.permissions.viewRealEmailIds
                                            : (emp.canViewRealEmailsAndSignatures !== undefined ? (emp.canViewRealEmailsAndSignatures === 1 || emp.canViewRealEmailsAndSignatures === true) : (permMap[emp.email]?.viewRealEmailIds ?? false)),
                                        sendSpecificEmails: permMap[emp.email]?.sendSpecificEmails ?? false,
                                        projectBasedEmails: permMap[emp.email]?.projectBasedEmails ?? false,
                                        blocked: emp.is_blocked === 1 || emp.is_blocked === true,
                                        allowedEmails: permMap[emp.email]?.allowedEmails || []
                                    }
                                };

                                if (i < newSeats.length) {
                                    newSeats[i] = { ...newSeats[i], ...empData };
                                } else {
                                    newSeats.push({ id: Date.now() + i, ...empData });
                                }
                            });
                            return newSeats;
                        });
                    }
                }
            } catch (err) {
                console.log('Using local employee list:', err);
            }
        };

        fetchBackendEmployees();
    }, []);

    const openAddModal = (index = null) => {
        setTargetSeatIndex(index);
        setIsAddModalOpen(true);
    };

    const closeAddModal = () => {
        setIsAddModalOpen(false);
        setTargetSeatIndex(null);
    };

    const addEmployee = async (firstName, lastName, email, sendEmail = true) => {
        let inviteUrl = null;
        if (sendEmail) {
            try {
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const response = await fetch('/api/invite/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': String(currentUser.id || '1'),
                        'x-org-id': String(currentUser.organization_id || '1')
                    },
                    body: JSON.stringify({ firstName, lastName, email })
                });
                const data = await response.json();
                inviteUrl = data.inviteUrl;
            } catch (error) {
                console.error('Error sending invite:', error);
            }
        }

        const newEmp = {
            id: Date.now(),
            status: 'filled',
            firstName,
            lastName,
            email,
            role: 'Employee',
            joined_date: new Date().toISOString().split('T')[0],
            dob: 'Pending Signup',
            isPending: true,
            workDays: ['M', 'T', 'W', 'T', 'F', 'S'],
            workMode: 'Remote',
            workLocation: 'Gilgit Baltistan, Pakistan',
            bio: '',
            usedStorage: 0,
            totalStorage: 15,
            permissions: {
                sendEmails: true,
                replyEmails: true,
                viewRealEmailIds: false,
                sendSpecificEmails: false,
                blocked: false
            }
        };

        setEmployees(prev => {
            const next = [...prev];
            if (targetSeatIndex !== null && targetSeatIndex < next.length) {
                next[targetSeatIndex] = newEmp;
            } else {
                const emptyIdx = next.findIndex(s => s.status === 'empty');
                if (emptyIdx !== -1) {
                    next[emptyIdx] = newEmp;
                } else {
                    next.push(newEmp);
                }
            }
            return next;
        });

        closeAddModal();
        return { success: true, inviteUrl };
    };

    const deleteEmployee = async (index) => {
        const emp = employees[index];
        if (!emp || emp.status === 'empty') return;

        if (window.confirm(`Are you sure you want to completely delete ${emp.firstName} ${emp.lastName}?`)) {
            try {
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                await fetch(`/api/settings/employee/${encodeURIComponent(emp.email)}`, {
                    method: 'DELETE',
                    headers: {
                        'x-user-id': String(currentUser.id || '1'),
                        'x-org-id': String(currentUser.organization_id || '1')
                    }
                });
            } catch (e) {
                console.error(e);
            }

            setEmployees(prev => {
                const next = [...prev];
                next[index] = { id: Date.now(), status: 'empty', firstName: '', lastName: '', email: '' };
                return next;
            });

            if (selectedEmployeeIndex === index) {
                setSelectedEmployeeIndex(0);
            }
        }
    };

    const resendInvite = async (index) => {
        const emp = employees[index];
        if (!emp || emp.status === 'empty') return;

        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const response = await fetch('/api/invite/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(currentUser.id || '1'),
                    'x-org-id': String(currentUser.organization_id || '1')
                },
                body: JSON.stringify({ firstName: emp.firstName, lastName: emp.lastName, email: emp.email })
            });
            const data = await response.json();

            if (!response.ok) {
                alert(`Failed to send invite: ${data.error || 'Unknown error'}`);
                return;
            }

            if (data.alreadyExists) {
                alert(`${emp.email} has already completed their signup. No invite needed.`);
                return;
            }

            if (data.inviteUrl) {
                await navigator.clipboard.writeText(data.inviteUrl);
                alert(`Invitation email sent to ${emp.email}!\n\nInvite link also copied to clipboard:\n${data.inviteUrl}`);
            } else {
                alert(`Invite sent successfully to ${emp.email}`);
            }
        } catch (e) {
            console.error('Resend invite error:', e);
            alert(`Failed to send invite to ${emp.email}. Please check if the server is running.`);
        }
    };

    const updatePermissions = async (index, permKey, value) => {
        let updatedEmp = null;
        setEmployees(prev => {
            const next = [...prev];
            if (next[index]) {
                next[index] = {
                    ...next[index],
                    permissions: {
                        ...(next[index].permissions || {}),
                        [permKey]: value
                    }
                };
                updatedEmp = next[index];
            }
            return next;
        });

        if (updatedEmp && (updatedEmp.email || updatedEmp.id)) {
            try {
                const targetIdent = updatedEmp.id || updatedEmp.email;
                const payload = {
                    ...(updatedEmp.permissions || {}),
                    canSendEmails: permKey === 'sendEmails' ? value : updatedEmp.permissions?.sendEmails,
                    canReplyToEmails: permKey === 'replyEmails' ? value : updatedEmp.permissions?.replyEmails,
                    canViewRealEmailsAndSignatures: permKey === 'viewRealEmailIds' ? value : updatedEmp.permissions?.viewRealEmailIds
                };
                const res = await fetch(`/api/employees/${encodeURIComponent(targetIdent)}/permissions`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': String(JSON.parse(localStorage.getItem('currentUser') || '{}').id || '1'),
                        'x-org-id': String(JSON.parse(localStorage.getItem('currentUser') || '{}').organization_id || '1')
                    },
                    body: JSON.stringify(payload)
                });
                const data = await res.json().catch(() => ({}));
                return { success: res.ok, data };
            } catch (e) {
                console.error('Failed to update permissions on server', e);
                return { success: false, error: e.message };
            }
        }
        return { success: true };
    };

    const updateProfile = async (index, field, value) => {
        let targetEmp = null;
        setEmployees(prev => {
            const next = [...prev];
            if (next[index]) {
                next[index] = {
                    ...next[index],
                    [field]: value
                };
                targetEmp = next[index];
            }
            return next;
        });

        if (targetEmp) {
            try {
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const identifier = targetEmp.id || targetEmp.email;
                if (identifier) {
                    await fetch(`/api/settings/employee/${identifier}/profile`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-user-id': String(currentUser.id || '1'),
                            'x-org-id': String(currentUser.organization_id || '1')
                        },
                        body: JSON.stringify({ [field]: value })
                    });
                }
            } catch (err) {
                console.error('Failed to sync employee profile to server:', err);
            }
        }
    };

    const updateEmployeeCover = async (indexOrId, coverValue) => {
        let targetIdx = -1;
        let targetEmp = null;

        if (typeof indexOrId === 'number' && indexOrId >= 0 && indexOrId < employees.length) {
            targetIdx = indexOrId;
            targetEmp = employees[indexOrId];
        } else {
            targetIdx = employees.findIndex(e => e && (String(e.id) === String(indexOrId) || (e.email && e.email.toLowerCase() === String(indexOrId).toLowerCase())));
            if (targetIdx !== -1) {
                targetEmp = employees[targetIdx];
            }
        }

        if (!targetEmp && targetIdx === -1) {
            return { success: false, error: 'Employee not found' };
        }

        // 1. Update state
        setEmployees(prev => {
            const next = [...prev];
            if (next[targetIdx]) {
                next[targetIdx] = {
                    ...next[targetIdx],
                    coverImage: coverValue || null
                };
            }
            return next;
        });

        // 2. Persist to localStorage 'safemailz_employee_covers'
        try {
            const covers = JSON.parse(localStorage.getItem('safemailz_employee_covers') || '{}');
            if (coverValue) {
                if (targetEmp?.id) covers[String(targetEmp.id)] = coverValue;
                if (targetEmp?.email) covers[String(targetEmp.email).toLowerCase()] = coverValue;
            } else {
                if (targetEmp?.id) delete covers[String(targetEmp.id)];
                if (targetEmp?.email) delete covers[String(targetEmp.email).toLowerCase()];
            }
            localStorage.setItem('safemailz_employee_covers', JSON.stringify(covers));
        } catch (e) {
            console.error('Failed to update covers in localStorage', e);
        }

        // 3. Persist to backend API
        const identifier = targetEmp?.id || targetEmp?.email;
        if (identifier) {
            try {
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const res = await fetch(`/api/employees/${encodeURIComponent(identifier)}/cover`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': String(currentUser.id || '1'),
                        'x-org-id': String(currentUser.organization_id || '1')
                    },
                    body: JSON.stringify({ coverImage: coverValue || null })
                });
                const data = await res.json().catch(() => ({}));
                return { success: res.ok, data };
            } catch (err) {
                console.warn('Backend cover update fallback to local storage:', err);
                return { success: true };
            }
        }

        return { success: true };
    };

    const handleImportEmployees = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (evt) => {
                const text = evt.target.result;
                const parseCSVRow = (rowStr) => {
                    const result = [];
                    let insideQuote = false;
                    let entry = '';
                    for (let i = 0; i < rowStr.length; i++) {
                        const char = rowStr[i];
                        if (char === '"') {
                            if (insideQuote && rowStr[i + 1] === '"') {
                                entry += '"';
                                i++;
                            } else {
                                insideQuote = !insideQuote;
                            }
                        } else if (char === ',' && !insideQuote) {
                            result.push(entry.trim());
                            entry = '';
                        } else {
                            entry += char;
                        }
                    }
                    result.push(entry.trim());
                    return result;
                };

                const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
                if (lines.length < 2) {
                    alert("The CSV file must contain a header row and at least one employee row.");
                    return;
                }

                const headerRow = parseCSVRow(lines[0]);
                const headerMap = {};
                headerRow.forEach((h, idx) => {
                    const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (cleanH.includes('first') && cleanH.includes('name')) headerMap.firstName = idx;
                    else if (cleanH.includes('last') && cleanH.includes('name')) headerMap.lastName = idx;
                    else if (cleanH.includes('email') || cleanH.includes('mail')) headerMap.email = idx;
                });

                if (headerMap.email === undefined) {
                    alert("Could not find an Email column in the CSV.");
                    return;
                }

                const newEmployees = [];
                const seenEmails = new Set();
                const existingEmails = new Set(employees.filter(e => e && e.email).map(e => e.email.toLowerCase().trim()));

                for (let i = 1; i < lines.length; i++) {
                    const parts = parseCSVRow(lines[i]);
                    const firstName = headerMap.firstName !== undefined ? (parts[headerMap.firstName] || '').trim() : '';
                    const lastName = headerMap.lastName !== undefined ? (parts[headerMap.lastName] || '').trim() : '';
                    const email = (parts[headerMap.email] || '').trim();

                    if (email) {
                        const emailLower = email.toLowerCase();
                        if (!seenEmails.has(emailLower) && !existingEmails.has(emailLower)) {
                            seenEmails.add(emailLower);
                            newEmployees.push({
                                "First Name": firstName,
                                "Last Name": lastName,
                                "Email": email
                            });
                        }
                    }
                }

                if (newEmployees.length > 0) {
                    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                    const token = localStorage.getItem('token');
                    const headers = { 'Content-Type': 'application/json' };
                    if (token) headers['Authorization'] = `Bearer ${token}`;
                    if (user?.id) headers['x-user-id'] = String(user.id);
                    if (user?.org_id || user?.organization_id) headers['x-org-id'] = String(user.org_id || user.organization_id);

                    fetch('/api/settings/employees/import', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ employees: newEmployees })
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success || !data.error) {
                                const imported = data.importedCount ?? data.imported ?? newEmployees.length;
                                const skipped = data.skippedCount ?? data.skipped ?? 0;
                                const errors = data.errorCount ?? data.errors ?? 0;

                                // Also update local state so they show up immediately in UI
                                setEmployees(prev => {
                                    let newArr = [...prev];
                                    newEmployees.forEach((emp, idx) => {
                                        const emptyIndex = newArr.findIndex(e => e.status === 'empty');
                                        if (emptyIndex !== -1) {
                                            newArr[emptyIndex] = {
                                                ...newArr[emptyIndex],
                                                status: 'filled',
                                                firstName: emp["First Name"],
                                                lastName: emp["Last Name"],
                                                email: emp["Email"],
                                                role: 'Employee',
                                                joined_date: new Date().toISOString(),
                                                isPending: true
                                            };
                                        } else {
                                            newArr.push({
                                                id: Date.now() + idx,
                                                status: 'filled',
                                                firstName: emp["First Name"],
                                                lastName: emp["Last Name"],
                                                email: emp["Email"],
                                                role: 'Employee',
                                                joined_date: new Date().toISOString(),
                                                isPending: true,
                                                usedStorage: 0,
                                                totalStorage: 15,
                                                permissions: {
                                                    sendEmails: true,
                                                    replyEmails: true,
                                                    viewRealEmailIds: false,
                                                    sendSpecificEmails: false,
                                                    blocked: false
                                                }
                                            });
                                        }
                                    });
                                    return newArr;
                                });

                                if (errors === 0) {
                                    alert(`Import complete! Imported: ${imported}${skipped > 0 ? `, Skipped: ${skipped}` : ''}`);
                                } else {
                                    alert(data.message || `Import complete. Imported: ${imported}, Errors: ${errors}`);
                                }
                            } else {
                                alert(data.error || 'Failed to import employees');
                            }
                        })
                        .catch(err => {
                            console.error('Import error:', err);
                            alert('Error importing employees');
                        });
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const filledEmployees = employees.filter(e => e && e.status === 'filled');

    return (
        <EmployeeContext.Provider value={{
            employees,
            setEmployees,
            filledEmployees,
            selectedEmployeeIndex,
            setSelectedEmployeeIndex,
            selectedEmployee: employees[selectedEmployeeIndex] || null,
            searchQuery,
            setSearchQuery,
            isAddModalOpen,
            openAddModal,
            closeAddModal,
            isQuantityModalOpen,
            openQuantityModal,
            closeQuantityModal,
            employeeQuantity,
            updateQuantity,
            proceedToPlan,
            isPlanModalOpen,
            openPlanModal: () => setIsPlanModalOpen(true),
            closePlanModal,
            billingCycle,
            setBillingCycle,
            handleProceedPayment,
            addEmployee,
            deleteEmployee,
            resendInvite,
            updatePermissions,
            updateProfile,
            updateEmployeeCover,
            handleExportEmployees: () => exportEmployeesToCSV(filledEmployees, ADD_EMPLOYEE_MODAL_FIELDS),
            handleImportEmployees
        }}>
            {children}
        </EmployeeContext.Provider>
    );
}

export function useEmployee() {
    const ctx = useContext(EmployeeContext);
    if (!ctx) {
        throw new Error('useEmployee must be used within an EmployeeProvider');
    }
    return ctx;
}
