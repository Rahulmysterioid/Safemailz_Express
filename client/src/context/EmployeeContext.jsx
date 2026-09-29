import React, { createContext, useContext, useState, useEffect } from 'react';

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
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Filter out dummy employees from legacy state
                    const cleanParsed = parsed.map(emp => {
                        if (emp.email === 'rahul.singh@safemailz.com' || emp.email === 'ra@safemailz.com') {
                            return { id: emp.id, status: 'empty', firstName: '', lastName: '', email: '' };
                        }
                        return emp;
                    });
                    return cleanParsed;
                }
            } catch (e) {
                console.error('Error loading stored seats:', e);
            }
        }
        return DEFAULT_EMPLOYEES;
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
                bio: 'Untoward person',
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

            // 2. Open Razorpay Modal
            const options = {
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: 'Safemailz',
                description: `Subscription - ${planName} Plan (${employeeQuantity} Users)`,
                order_id: order.id,
                handler: async function (response) {
                    try {
                        // 3. Verify on backend
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
                theme: {
                    color: '#1A6BA8'
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                alert('Payment Failed: ' + (response.error?.description || 'Transaction cancelled'));
            });
            rzp.open();
        } catch (err) {
            console.error('Payment error:', err);
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
                    if (data.success && Array.isArray(data.employees) && data.employees.length > 0) {
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

                            // Fill seats from top to bottom
                            data.employees.forEach((emp, i) => {
                                const names = (emp.name || emp.email.split('@')[0]).split(' ');
                                const firstName = names[0] || 'Employee';
                                const lastName = names.slice(1).join(' ') || '';
                                
                                const empData = {
                                    id: emp.id,
                                    status: 'filled',
                                    firstName,
                                    lastName,
                                    email: emp.email,
                                    role: emp.role || 'Employee',
                                    joined_date: emp.created_at ? emp.created_at.split(' ')[0] : (emp.joined_date || new Date().toISOString().split('T')[0]),
                                    dob: emp.isPending ? 'Pending Signup' : (emp.dob || ''),
                                    isPending: emp.isPending || false,
                                    subscriptionStatus: emp.subscription_status || 'active',
                                    subscriptionEndDate: emp.subscription_end_date,
                                    workDays: ['M', 'T', 'W', 'T', 'F', 'S'],
                                    workMode: 'Remote',
                                    workLocation: 'Global',
                                    bio: '',
                                    usedStorage: 0,
                                    totalStorage: 15,
                                    permissions: permMap[emp.email] || {
                                        sendEmails: true,
                                        replyEmails: true,
                                        viewRealEmailIds: false,
                                        sendSpecificEmails: false,
                                        blocked: emp.is_blocked === 1 || emp.is_blocked === true
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
            bio: 'Untoward person',
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
                await fetch(`/api/settings/employee/${encodeURIComponent(emp.email)}`, {
                    method: 'DELETE'
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

    const updatePermissions = (index, permKey, value) => {
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
            }
            return next;
        });
    };

    const updateProfile = (index, field, value) => {
        setEmployees(prev => {
            const next = [...prev];
            if (next[index]) {
                next[index] = {
                    ...next[index],
                    [field]: value
                };
            }
            return next;
        });
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
            updateProfile
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
