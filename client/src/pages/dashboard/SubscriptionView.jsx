import './SubscriptionLightPolish.css';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useEmployee } from '../../context/EmployeeContext';
import { useAdmin } from '../../context/AdminContext';

const DEFAULT_SEARCH_POS = {
    verticalPlacement: 'top-inline', // 'top-inline', 'above-renew', 'below-renew'
    alignment: 'full', // 'full', 'left', 'center', 'right'
    offsetX: 0,
    offsetY: 0,
    showControls: true
};

const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
    'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)'
];

const STORAGE_ADDONS = [
    { gb: 5, price: 199, label: 'Starter Boost', desc: 'Ideal for light email attachments' },
    { gb: 15, price: 499, label: 'Pro Expansion', desc: 'Doubles standard seat capacity', popular: true },
    { gb: 50, price: 1299, label: 'Business Vault', desc: 'For heavy project archives & media' },
    { gb: 100, price: 2199, label: 'Enterprise Scale', desc: 'Maximum high-volume seat storage' }
];

function getInitials(name) {
    if (!name) return 'EM';
    const clean = name.trim().replace(/^\d+[.)]\s*/, '').trim();
    const parts = (clean || name.trim()).split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (clean || 'EM').slice(0, 2).toUpperCase();
}

function computeSeatSubMeta(emp) {
    const role = (emp.role || 'employee').toLowerCase();
    const isAdminOrOwner = role === 'admin' || role === 'org owner' || role === 'org_owner';
    let isCurrentlyExpired = emp.subscriptionStatus === 'expired' || emp.isExpired === true;
    let daysLeft = 30;
    let daysLeftText = 'Ending in 30 days';
    let nextBillingDateStr = '';

    if (isCurrentlyExpired) {
        daysLeft = 0;
        daysLeftText = 'Expired';
    } else if (emp.subscriptionEndDate) {
        const now = new Date();
        const endDate = new Date(emp.subscriptionEndDate);
        if (!isNaN(endDate.getTime())) {
            const diffTime = endDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            nextBillingDateStr = endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            if (diffDays <= 0) {
                isCurrentlyExpired = true;
                daysLeft = 0;
                daysLeftText = 'Expired';
            } else {
                daysLeft = diffDays;
                daysLeftText = `Ending in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
            }
        }
    } else if (emp.joined_date) {
        const joined = new Date(emp.joined_date);
        if (!isNaN(joined.getTime())) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const nextBilling = new Date(joined);
            nextBilling.setHours(0, 0, 0, 0);
            while (nextBilling <= today) {
                nextBilling.setMonth(nextBilling.getMonth() + 1);
            }
            const diffTime = nextBilling - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            daysLeft = diffDays;
            daysLeftText = `Ending in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
            nextBillingDateStr = nextBilling.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }
    }

    const isExpiringSoon = !isAdminOrOwner && !isCurrentlyExpired && daysLeft <= 7;

    return {
        role,
        isAdminOrOwner,
        isCurrentlyExpired,
        isExpiringSoon,
        daysLeft,
        daysLeftText,
        nextBillingDateStr
    };
}

export default function SubscriptionView() {
    const { filledEmployees, setEmployees } = useEmployee();
    const { admins } = useAdmin();
    const [searchQuery, setSearchQuery] = useState('');
    const subSearchInputRef = useRef(null);
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'attention' | 'free'
    const [targetRenewEmails, setTargetRenewEmails] = useState([]);
    const [viewState, setViewState] = useState(1); // 1: List, 2: Plan, 3: Success
    const [planCycle, setPlanCycle] = useState('monthly'); // 'monthly' | 'yearly'
    const [lastTxnDetails, setLastTxnDetails] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);

    // Buy Storage Modal state
    const [storageModalEmp, setStorageModalEmp] = useState(null);
    const [selectedStorageAddon, setSelectedStorageAddon] = useState(STORAGE_ADDONS[1]);
    const [isBuyingStorage, setIsBuyingStorage] = useState(false);

    const showToast = (text, type = 'success') => {
        setToastMessage({ text, type });
        setTimeout(() => {
            setToastMessage(prev => (prev?.text === text ? null : prev));
        }, 3200);
    };

    // Read saved search bar layout from localStorage (preserving saved UI format)
    const searchPos = useMemo(() => {
        try {
            const saved = localStorage.getItem('safemailz_sub_search_pos_v4') || localStorage.getItem('safemailz_sub_search_pos_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    ...DEFAULT_SEARCH_POS,
                    ...parsed,
                    offsetY: Math.max(-80, Math.min(80, Number(parsed.offsetY) || 0)),
                    offsetX: Math.max(-150, Math.min(150, Number(parsed.offsetX) || 0))
                };
            }
        } catch (e) {
            console.error('Failed to load search position settings', e);
        }
        return DEFAULT_SEARCH_POS;
    }, []);

    // Ensure state transitions always scroll the view to the top so headers/steppers are never clipped
    useEffect(() => {
        const container = document.getElementById('subscriptionView');
        if (container) {
            container.scrollTo({ top: 0, behavior: 'instant' });
        }
    }, [viewState]);

    // All provisioned subscription seats: employees + administrative privilege accounts
    const allSeats = useMemo(() => {
        const seats = [...filledEmployees];
        const existingEmails = new Set(seats.map(s => (s.email || '').toLowerCase()));

        // Add org owner / current admin if not in seat list
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (currentUser && currentUser.email && !existingEmails.has(currentUser.email.toLowerCase())) {
                const roleLower = (currentUser.role || '').toLowerCase();
                const isOwnerOrAdmin = roleLower === 'org_owner' || roleLower === 'admin' || roleLower === 'org owner';
                if (isOwnerOrAdmin) {
                    const fullName = (currentUser.admin_name || currentUser.name || 'Admin Owner').trim();
                    const names = fullName.split(/\s+/);
                    seats.unshift({
                        id: currentUser.id || 'owner-seat',
                        status: 'filled',
                        firstName: names[0] || 'Admin',
                        lastName: names.slice(1).join(' ') || 'Owner',
                        email: currentUser.email,
                        role: currentUser.role || 'Admin',
                        usedStorage: 1.2,
                        totalStorage: 50,
                        subscriptionStatus: 'active',
                        isExpired: false
                    });
                    existingEmails.add(currentUser.email.toLowerCase());
                }
            }
        } catch (e) {}

        // Add admins from AdminContext if not in seat list
        if (Array.isArray(admins)) {
            admins.forEach((adm, i) => {
                if (adm.email && !existingEmails.has(adm.email.toLowerCase())) {
                    const fullName = (adm.name || 'Administrator').trim();
                    const names = fullName.split(/\s+/);
                    seats.push({
                        id: adm.id || `admin-${i}`,
                        status: 'filled',
                        firstName: names[0] || 'Admin',
                        lastName: names.slice(1).join(' ') || '',
                        email: adm.email,
                        role: 'Admin',
                        usedStorage: parseFloat(adm.storageUsed) || 1.18,
                        totalStorage: parseFloat(adm.storageTotal || adm.storageLimit) || 50,
                        subscriptionStatus: 'active',
                        isExpired: false
                    });
                    existingEmails.add(adm.email.toLowerCase());
                }
            });
        }

        return seats;
    }, [filledEmployees, admins]);

    // Compute KPI statistics across all subscription seats
    const subStats = useMemo(() => {
        let activeCount = 0;
        let attentionCount = 0; // expiring <= 7 days or expired
        let expiredCount = 0;
        let freeCount = 0;
        let totalUsedGb = 0;
        let totalCapacityGb = 0;

        allSeats.forEach(emp => {
            const meta = computeSeatSubMeta(emp);
            const used = Number(emp.usedStorage) || 0;
            const cap = Number(emp.totalStorage) || 15;
            totalUsedGb += used;
            totalCapacityGb += cap;

            if (meta.isAdminOrOwner) {
                freeCount += 1;
                activeCount += 1;
            } else if (meta.isCurrentlyExpired) {
                expiredCount += 1;
                attentionCount += 1;
            } else if (meta.isExpiringSoon) {
                attentionCount += 1;
                activeCount += 1;
            } else {
                activeCount += 1;
            }
        });

        return {
            total: allSeats.length,
            activeCount,
            attentionCount,
            expiredCount,
            freeCount,
            totalUsedGb: Math.round(totalUsedGb * 10) / 10,
            totalCapacityGb
        };
    }, [allSeats]);

    const filteredEmployees = useMemo(() => {
        return allSeats.filter(emp => {
            const meta = computeSeatSubMeta(emp);
            if (statusFilter === 'active' && meta.isCurrentlyExpired) return false;
            if (statusFilter === 'attention' && !meta.isCurrentlyExpired && !meta.isExpiringSoon) return false;
            if (statusFilter === 'free' && !meta.isAdminOrOwner) return false;

            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
            const email = (emp.email || '').toLowerCase();
            const role = (emp.role || '').toLowerCase();
            const isAdmin = meta.isAdminOrOwner || role.includes('admin') || role.includes('owner');
            const matchesAdminQuery = (q === 'admin' || q === 'admins' || q === 'administrator' || q === 'owner' || q === 'org owner' || q === 'free') && isAdmin;
            return fullName.includes(q) || email.includes(q) || role.includes(q) || matchesAdminQuery;
        });
    }, [allSeats, searchQuery, statusFilter]);

    const handleRenewAll = () => {
        const targetList = (filteredEmployees.length > 0 ? filteredEmployees : allSeats).filter(e => !computeSeatSubMeta(e).isAdminOrOwner);
        if (targetList.length === 0) {
            showToast('All selected seats are admin privileges (free tier) and do not require renewal.', 'info');
            return;
        }
        setTargetRenewEmails(targetList.map(emp => emp.email));
        setViewState(2);
    };

    const handleRenewSingle = (emp) => {
        setTargetRenewEmails([emp.email]);
        setViewState(2);
    };

    const handleExpireSingle = async (emp) => {
        const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email;
        if (!confirm(`Are you sure you want to instantly expire ${fullName}'s subscription?`)) return;
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const res = await fetch(`/api/settings/employee/${encodeURIComponent(emp.email)}/subscription/expire`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(currentUser.id || '1'),
                    'x-org-id': String(currentUser.organization_id || '1')
                }
            });
            if (res.ok) {
                setEmployees(prev => {
                    const newSeats = [...prev];
                    const idx = newSeats.findIndex(e => e.email === emp.email);
                    if (idx !== -1) {
                        newSeats[idx] = { ...newSeats[idx], subscriptionStatus: 'expired' };
                    }
                    return newSeats;
                });
                showToast(`Subscription expired for ${fullName}.`, 'info');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to expire subscription');
            }
        } catch (error) {
            console.error('Failed to expire subscription', error);
            alert('Network error');
        }
    };

    const handleBuyStorageConfirm = async () => {
        if (!storageModalEmp || !selectedStorageAddon) return;
        setIsBuyingStorage(true);
        await new Promise(r => setTimeout(r, 450));

        const addedGb = selectedStorageAddon.gb;
        setEmployees(prev => prev.map(seat => {
            if (seat && seat.email === storageModalEmp.email) {
                const currentTotal = Number(seat.totalStorage) || 15;
                return { ...seat, totalStorage: currentTotal + addedGb };
            }
            return seat;
        }));

        const empName = `${storageModalEmp.firstName || ''} ${storageModalEmp.lastName || ''}`.trim() || storageModalEmp.email;
        setIsBuyingStorage(false);
        setStorageModalEmp(null);
        showToast(`Added +${addedGb} GB storage to ${empName}'s seat!`, 'success');
    };

    const handleExportSubscriptionsCsv = () => {
        if (!filteredEmployees.length) return;
        const headers = ['Seat #', 'Employee Name', 'Email', 'Role', 'Status', 'Work Mode', 'Work Location', 'Work Days', 'DOB', 'Bio', 'Used Storage (GB)', 'Total Storage (GB)'];
        const rows = [
            headers.join(','),
            ...filteredEmployees.map((emp, i) => {
                const fullName = emp.name || `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.trim() || emp.admin_name || 'Employee';
                const meta = computeSeatSubMeta(emp);
                const statusLabel = meta.isAdminOrOwner ? 'Free (Admin)' : meta.daysLeftText;
                const used = emp.usedStorage || 0;
                const total = emp.totalStorage || 15;
                const mode = emp.workMode || emp.work_mode || 'Remote';
                const loc = emp.workLocation || emp.work_location || 'Gilgit Baltistan, Pakistan';
                const daysVal = Array.isArray(emp.workDays) ? emp.workDays.join(' ') : (Array.isArray(emp.work_days) ? emp.work_days.join(' ') : (emp.workDays || emp.work_days || 'M T W T F S'));
                const dob = emp.dob || '';
                const bio = emp.bio || '';
                return [i + 1, fullName, emp.email || '', emp.role || 'Employee', statusLabel, mode, loc, daysVal, dob, bio, used, total]
                    .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
                    .join(',');
            })
        ];
        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', 'safemailz-subscriptions.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Exported subscription report to CSV.', 'success');
    };

    // Plan pricing calculations for State 2 & State 3
    const seatCountToRenew = Math.max(1, targetRenewEmails.length);
    const unitPrice = planCycle === 'monthly' ? 500 : 5000;
    const totalPlanAmount = unitPrice * seatCountToRenew;

    const handleProceedPayment = async () => {
        const btn = document.querySelector('.btn-proceed-payment');
        if (btn) {
            btn.textContent = 'Processing...';
            btn.disabled = true;
        }

        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            await new Promise(r => setTimeout(r, 900));

            for (const email of targetRenewEmails) {
                await fetch(`/api/settings/employee/${encodeURIComponent(email)}/subscription/renew`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': String(currentUser.id || '1'),
                        'x-org-id': String(currentUser.organization_id || '1')
                    }
                });
            }

            // Update local employee state immediately so expired tags clear right away
            const nextEnd = new Date();
            if (planCycle === 'yearly') {
                nextEnd.setFullYear(nextEnd.getFullYear() + 1);
            } else {
                nextEnd.setMonth(nextEnd.getMonth() + 1);
            }

            setEmployees(prev => prev.map(emp => {
                if (emp && targetRenewEmails.includes(emp.email)) {
                    return {
                        ...emp,
                        subscriptionStatus: 'active',
                        isExpired: false,
                        subscriptionEndDate: nextEnd.toISOString()
                    };
                }
                return emp;
            }));

            const event = new Event('employeeStateUpdate');
            window.dispatchEvent(event);

            if (currentUser.id) {
                const meRes = await fetch('/api/settings/me?t=' + Date.now(), {
                    headers: {
                        'x-user-id': String(currentUser.id),
                        'x-org-id': String(currentUser.organization_id)
                    }
                });
                if (meRes.ok) {
                    const data = await meRes.json();
                    if (data.success && data.user) {
                        const updatedUser = {
                            ...currentUser,
                            subscription_status: data.user.subscription_status,
                            subscription_end_date: data.user.subscription_end_date
                        };
                        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                    }
                }
            }

            const now = new Date();
            const txnId = 'TXN-' + Math.floor(100000000 + Math.random() * 900000000);
            setLastTxnDetails({
                txnId,
                planLabel: `${planCycle === 'monthly' ? 'Monthly' : 'Yearly'} Plan (${seatCountToRenew} User${seatCountToRenew > 1 ? 's' : ''})`,
                amountFormatted: `Rs ${totalPlanAmount.toLocaleString('en-IN')}`,
                paymentDate: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
                nextBillingDate: nextEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            });

            setViewState(3);
        } catch (error) {
            console.error('Payment flow error', error);
            alert('Payment flow failed. Please try again.');
            if (btn) {
                btn.textContent = 'Proceed Payment';
                btn.disabled = false;
            }
        }
    };

    const handleDownloadInvoice = () => {
        const txn = lastTxnDetails || {
            txnId: 'TXN-789456123',
            planLabel: `${planCycle === 'monthly' ? 'Monthly' : 'Yearly'} Plan (${seatCountToRenew} Users)`,
            amountFormatted: `Rs ${totalPlanAmount}`,
            paymentDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            nextBillingDate: 'Next Billing Cycle'
        };
        const receiptContent = [
            '====================================================',
            '               SAFEMAILZ TAX INVOICE                ',
            '====================================================',
            `Transaction ID    : ${txn.txnId}`,
            `Plan              : ${txn.planLabel}`,
            `Amount Paid       : ${txn.amountFormatted}`,
            `Payment Method    : Credit Card (Visa)`,
            `Payment Date      : ${txn.paymentDate}`,
            `Next Billing Date : ${txn.nextBillingDate}`,
            `Renewed Seats     : ${targetRenewEmails.join(', ') || 'All Active Seats'}`,
            '====================================================',
            'Thank you for choosing Safemailz Enterprise Security.'
        ].join('\n');

        const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Safemailz-Invoice-${txn.txnId}.txt`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast(`Downloaded invoice ${txn.txnId}`, 'success');
    };

    return (
        <div
            className="subscription-view font-inter"
            id="subscriptionView"
            style={{
                display: 'flex',
                width: '100%',
                flex: '1',
                minHeight: '0',
                overflowY: 'auto',
                boxSizing: 'border-box',
                padding: '1.75rem 2.25rem 5rem 2.25rem',
                flexDirection: 'column'
            }}
        >
            {/* Toast Banner */}
            {toastMessage && (
                <div className="sub-toast-banner" role="status" aria-live="polite">
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <span>{toastMessage.text}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setToastMessage(null)}
                        className="sub-toast-close"
                        aria-label="Close notification"
                    >
                        &times;
                    </button>
                </div>
            )}

            {/* STATE 1: Subscription List / Renew Screen */}
            {viewState === 1 && (() => {
                const renderRenewAllButton = () => (
                    <button
                        onClick={handleRenewAll}
                        className="btn-sub-renew-all"
                        id="btnSubRenewAll"
                        type="button"
                        title="Renew all displayed employee subscriptions"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                            <path d="M3 3v5h5"></path>
                            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                            <path d="M16 16h5v5"></path>
                        </svg>
                        <span>Renew all</span>
                        <span className="btn-sub-renew-all-count">{filteredEmployees.length}</span>
                    </button>
                );

                const renderSearchBar = (customStyle = {}) => {
                    let alignStyle = { margin: '0 auto', width: '100%' };
                    if (searchPos.alignment === 'left') {
                        alignStyle = { margin: '0 auto 0 0', width: '100%', maxWidth: '520px' };
                    } else if (searchPos.alignment === 'right') {
                        alignStyle = { margin: '0 0 0 auto', width: '100%', maxWidth: '520px' };
                    } else if (searchPos.alignment === 'center') {
                        alignStyle = { margin: '0 auto', width: '100%', maxWidth: '620px' };
                    }

                    const isSearchingAdmin = searchQuery.toLowerCase().trim() === 'admin' || statusFilter === 'free';
                    return (
                        <div
                            id="subSearchContainer"
                            className="sub-search-container"
                            style={{
                                position: 'relative',
                                maxWidth: '1000px',
                                transform: `translate(${searchPos.offsetX}px, ${searchPos.offsetY}px)`,
                                transition: 'transform 0.1s ease-out',
                                zIndex: 5,
                                display: 'flex',
                                alignItems: 'center',
                                ...alignStyle,
                                ...customStyle
                            }}
                        >
                            <button
                                type="button"
                                id="subSearchBtn"
                                aria-label="Search subscriptions"
                                title="Search subscriptions (Click to focus)"
                                onClick={() => {
                                    if (subSearchInputRef.current) {
                                        subSearchInputRef.current.focus();
                                    } else {
                                        document.getElementById('subSearchBoxInput')?.focus();
                                    }
                                }}
                                style={{
                                    position: 'absolute',
                                    left: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '9999px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: 0,
                                    zIndex: 2
                                }}
                            >
                                <svg
                                    className="sub-search-icon"
                                    style={{
                                        width: '16px',
                                        height: '16px'
                                    }}
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                            </button>
                            <input
                                ref={subSearchInputRef}
                                type="text"
                                placeholder="Search employee or admin subscription by name, email, or role..."
                                id="subSearchBoxInput"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') setSearchQuery('');
                                    if (e.key === 'Enter') subSearchInputRef.current?.blur();
                                }}
                                style={{
                                    width: '100%',
                                    height: '42px',
                                    padding: '0 5rem 0 2.5rem',
                                    borderRadius: '10px',
                                    fontSize: '0.85rem',
                                    outline: 'none',
                                    fontFamily: "'Inter', sans-serif",
                                    boxSizing: 'border-box'
                                }}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    zIndex: 2
                                }}
                            >
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="sub-search-clear-btn"
                                        aria-label="Clear search query"
                                        title="Clear search query"
                                        style={{ position: 'static', transform: 'none' }}
                                    >
                                        &times;
                                    </button>
                                )}
                                <button
                                    type="button"
                                    id="subSearchAdminBtn"
                                    className={`sub-search-admin-circle-btn ${isSearchingAdmin ? 'active' : ''}`}
                                    aria-label="Filter or search admin accounts"
                                    title={isSearchingAdmin ? 'Reset Admin filter' : 'Filter / Search Admins'}
                                    onClick={() => {
                                        if (isSearchingAdmin) {
                                            setSearchQuery('');
                                            setStatusFilter('all');
                                        } else {
                                            setSearchQuery('admin');
                                            subSearchInputRef.current?.focus();
                                        }
                                    }}
                                    style={{
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '9999px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: isSearchingAdmin ? '1.5px solid #0875d1' : '1px solid #d4dfec',
                                        background: isSearchingAdmin ? 'rgba(8,117,209,0.12)' : 'transparent',
                                        color: isSearchingAdmin ? '#0875d1' : '#64748b',
                                        cursor: 'pointer',
                                        padding: 0,
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    );
                };

                return (
                    <div id="subStateList" className="sub-state-list-wrap">
                        {/* 1. Enterprise Page Header */}
                        <div className="sub-page-header">
                            <div className="sub-page-header-left">
                                <div className="sub-page-title-row">
                                    <h2 className="sub-page-title">Subscription &amp; Seat Billing</h2>
                                    <span className="sub-page-count-pill">
                                        {searchQuery || statusFilter !== 'all'
                                            ? `${filteredEmployees.length} of ${allSeats.length} Seats`
                                            : `${allSeats.length} Active Seats`}
                                    </span>
                                    {statusFilter !== 'all' && (
                                        <span className="sub-active-filter-chip">
                                            <span>Filter: {statusFilter === 'attention' ? 'Expiring / Expired' : statusFilter === 'free' ? 'Admin / Free' : 'Active'}</span>
                                            <button type="button" onClick={() => setStatusFilter('all')} aria-label="Reset filter">&times;</button>
                                        </span>
                                    )}
                                </div>
                                <p className="sub-page-subtitle">
                                    Manage employee seat renewals, cloud storage allocations, and organization billing cycles
                                </p>
                            </div>

                            <div className="sub-page-header-actions">
                                <button
                                    type="button"
                                    onClick={handleExportSubscriptionsCsv}
                                    disabled={filteredEmployees.length === 0}
                                    className="btn-sub-export-csv"
                                    title="Export subscription status to CSV"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                    <span>Export CSV</span>
                                </button>
                            </div>
                        </div>

                        {/* 2. Interactive KPI Summary Strip */}
                        <div className="sub-kpi-grid" id="subKpiGrid">
                            <div
                                className={`sub-kpi-card kpi-blue ${statusFilter === 'all' ? 'kpi-selected' : ''}`}
                                onClick={() => setStatusFilter('all')}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && setStatusFilter('all')}
                            >
                                <div className="sub-kpi-left">
                                    <div className="sub-kpi-icon icon-blue">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="9" cy="7" r="4"></circle>
                                            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                        </svg>
                                    </div>
                                    <div className="sub-kpi-metrics">
                                        <span className="sub-kpi-value">{subStats.total}</span>
                                        <span className="sub-kpi-label">Total Provisioned Seats</span>
                                    </div>
                                </div>
                                <span className="sub-kpi-badge badge-blue">All Seats</span>
                            </div>

                            <div
                                className={`sub-kpi-card kpi-emerald ${statusFilter === 'active' ? 'kpi-selected' : ''}`}
                                onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
                            >
                                <div className="sub-kpi-left">
                                    <div className="sub-kpi-icon icon-emerald">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                        </svg>
                                    </div>
                                    <div className="sub-kpi-metrics">
                                        <span className="sub-kpi-value">{subStats.activeCount}</span>
                                        <span className="sub-kpi-label">Active Subscriptions</span>
                                    </div>
                                </div>
                                <span className="sub-kpi-badge badge-emerald">Healthy</span>
                            </div>

                            <div
                                className={`sub-kpi-card kpi-rose ${statusFilter === 'attention' ? 'kpi-selected' : ''}`}
                                onClick={() => setStatusFilter(statusFilter === 'attention' ? 'all' : 'attention')}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && setStatusFilter(statusFilter === 'attention' ? 'all' : 'attention')}
                            >
                                <div className="sub-kpi-left">
                                    <div className="sub-kpi-icon icon-rose">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12 6 12 12 16 14"></polyline>
                                        </svg>
                                    </div>
                                    <div className="sub-kpi-metrics">
                                        <span className="sub-kpi-value">{subStats.attentionCount}</span>
                                        <span className="sub-kpi-label">Expiring / Expired</span>
                                    </div>
                                </div>
                                <span className="sub-kpi-badge badge-rose">
                                    {subStats.expiredCount > 0 ? `${subStats.expiredCount} Expired` : 'Next 7d'}
                                </span>
                            </div>

                            <div
                                className={`sub-kpi-card kpi-purple ${statusFilter === 'free' ? 'kpi-selected' : ''}`}
                                onClick={() => setStatusFilter(statusFilter === 'free' ? 'all' : 'free')}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && setStatusFilter(statusFilter === 'free' ? 'all' : 'free')}
                            >
                                <div className="sub-kpi-left">
                                    <div className="sub-kpi-icon icon-purple">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                                            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                                        </svg>
                                    </div>
                                    <div className="sub-kpi-metrics">
                                        <span className="sub-kpi-value">{subStats.totalUsedGb} <small className="sub-kpi-unit">/ {subStats.totalCapacityGb} GB</small></span>
                                        <span className="sub-kpi-label">Total Cloud Storage</span>
                                    </div>
                                </div>
                                <span className="sub-kpi-badge badge-purple">{subStats.freeCount} Admin Free</span>
                            </div>
                        </div>

                        {/* 3. Search Bar & Filter Pills Toolbar */}
                        <div className="sub-toolbar-card">
                            {searchPos.verticalPlacement === 'top-inline' && (
                                <div className="sub-toolbar-row">
                                    <div
                                        style={{
                                            flex: searchPos.alignment === 'full' ? 1 : 'none',
                                            minWidth: '260px',
                                            width: searchPos.alignment === 'full' ? 'auto' : searchPos.alignment === 'center' ? '65%' : '520px'
                                        }}
                                    >
                                        {renderSearchBar({ margin: 0 })}
                                    </div>
                                    <div className="sub-toolbar-actions">
                                        <div className="sub-filter-pills" role="group" aria-label="Filter subscriptions">
                                            {[
                                                { id: 'all', label: 'All' },
                                                { id: 'active', label: 'Active' },
                                                { id: 'attention', label: 'Expiring / Expired' },
                                                { id: 'free', label: 'Admin (Free)' }
                                            ].map(tab => (
                                                <button
                                                    key={tab.id}
                                                    type="button"
                                                    onClick={() => setStatusFilter(tab.id)}
                                                    className={`sub-filter-pill ${statusFilter === tab.id ? 'active' : ''}`}
                                                >
                                                    {tab.label}
                                                </button>
                                            ))}
                                        </div>
                                        {renderRenewAllButton()}
                                    </div>
                                </div>
                            )}

                            {searchPos.verticalPlacement === 'above-renew' && (
                                <div style={{ width: '100%' }}>
                                    {renderSearchBar({ margin: '0 auto 0.75rem' })}
                                    <div className="sub-toolbar-actions" style={{ justifyContent: 'space-between', width: '100%' }}>
                                        <div className="sub-filter-pills">
                                            {['all', 'active', 'attention', 'free'].map(id => (
                                                <button
                                                    key={id}
                                                    type="button"
                                                    onClick={() => setStatusFilter(id)}
                                                    className={`sub-filter-pill ${statusFilter === id ? 'active' : ''}`}
                                                >
                                                    {id === 'all' ? 'All' : id === 'active' ? 'Active' : id === 'attention' ? 'Expiring' : 'Admin (Free)'}
                                                </button>
                                            ))}
                                        </div>
                                        {renderRenewAllButton()}
                                    </div>
                                </div>
                            )}

                            {searchPos.verticalPlacement === 'below-renew' && (
                                <div style={{ width: '100%' }}>
                                    <div className="sub-toolbar-actions" style={{ justifyContent: 'flex-end', width: '100%', marginBottom: '0.75rem' }}>
                                        {renderRenewAllButton()}
                                    </div>
                                    {renderSearchBar({ margin: '0 auto' })}
                                </div>
                            )}
                        </div>

                        {/* 4. Employees List Cards Container */}
                        <div id="subEmployeesCardsContainer" className="sub-cards-list">
                            {filteredEmployees.length === 0 ? (
                                <div className="sub-empty-state">
                                    <div className="sub-empty-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                                            <line x1="2" y1="10" x2="22" y2="10"></line>
                                        </svg>
                                    </div>
                                    <h4 className="sub-empty-title">No matching employee subscriptions</h4>
                                    <p className="sub-empty-desc">
                                        No active employee seats matched your current search or filter criteria.
                                    </p>
                                    {(searchQuery || statusFilter !== 'all') && (
                                        <button
                                            type="button"
                                            className="sub-empty-reset-btn"
                                            onClick={() => {
                                                setSearchQuery('');
                                                setStatusFilter('all');
                                            }}
                                        >
                                            Reset Filters
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredEmployees.map((emp, index) => {
                                    const fullName = emp.name || `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.trim() || emp.admin_name || 'Employee';
                                    const initials = getInitials(fullName);
                                    const avatarBg = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
                                    const meta = computeSeatSubMeta(emp);

                                    let tagsHtml;
                                    if (meta.isAdminOrOwner) {
                                        tagsHtml = (
                                            <>
                                                <span className="sub-tag-blue">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                                    </svg>
                                                    <span>{meta.role === 'admin' ? 'Admin' : 'ORG Owner'}</span>
                                                </span>
                                                <span className="sub-tag-pink sub-tag-free">
                                                    <span className="sub-status-dot dot-emerald"></span>
                                                    <span>Free</span>
                                                </span>
                                            </>
                                        );
                                    } else if (meta.isCurrentlyExpired) {
                                        tagsHtml = (
                                            <span className="sub-tag-purple sub-tag-expired">
                                                <span className="sub-status-dot dot-rose"></span>
                                                <span>Expired</span>
                                            </span>
                                        );
                                    } else {
                                        tagsHtml = (
                                            <span className={`sub-tag-purple ${meta.isExpiringSoon ? 'sub-tag-warning' : 'sub-tag-active-days'}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <polyline points="12 6 12 12 16 14"></polyline>
                                                </svg>
                                                <span>{meta.daysLeftText}</span>
                                            </span>
                                        );
                                    }

                                    const usedStorage = Number(emp.usedStorage) || 0;
                                    const totalStorage = Number(emp.totalStorage) || 15;
                                    const storagePct = Math.min(100, Math.round((usedStorage / totalStorage) * 100));
                                    const availableStorage = Math.max(0, Math.round((totalStorage - usedStorage) * 10) / 10);

                                    return (
                                        <div
                                            key={emp.id || index}
                                            className={`sub-employee-card ${meta.isCurrentlyExpired ? 'is-expired-card' : meta.isExpiringSoon ? 'is-expiring-card' : ''}`}
                                            data-emp-name={fullName}
                                        >
                                            {/* Top Identity & Status Row */}
                                            <div className="sub-card-header">
                                                <div className="sub-card-identity">
                                                    <div className="sub-card-avatar" style={{ background: avatarBg }}>
                                                        {initials}
                                                        <span
                                                            className={`sub-card-avatar-dot ${meta.isCurrentlyExpired ? 'is-expired' : meta.isExpiringSoon ? 'is-warning' : 'is-active'}`}
                                                            title={meta.isCurrentlyExpired ? 'Expired' : 'Active Seat'}
                                                        />
                                                    </div>
                                                    <div className="sub-card-title-group">
                                                        <div className="sub-card-name-row">
                                                            <h3 className="sub-card-name">
                                                                <span className="sub-card-index">{index + 1}.</span> {fullName}
                                                            </h3>
                                                            <span className="sub-seat-id-chip">Seat #{index + 1}</span>
                                                        </div>
                                                        <div className="sub-card-meta-row">
                                                            {emp.email && (
                                                                <span className="sub-card-email">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                                                                    </svg>
                                                                    <span>{emp.email}</span>
                                                                </span>
                                                            )}
                                                            {meta.nextBillingDateStr && !meta.isAdminOrOwner && (
                                                                <span className="sub-card-cycle-meta">
                                                                    • Renews {meta.nextBillingDateStr}
                                                                </span>
                                                            )}
                                                            {meta.isAdminOrOwner && (
                                                                <span className="sub-card-cycle-meta">
                                                                    • Organization Privilege Seat
                                                                </span>
                                                            )}
                                                        </div>
                                                        {/* Onboarding Profile Attributes (Work Mode, Location, DOB, Bio) */}
                                                        <div className="sub-card-onboarding-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', fontSize: '0.76rem' }}>
                                                            {(emp.workMode || emp.work_mode) && (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#F1F5F9', color: '#1E293B', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                                                                    {emp.workMode || emp.work_mode}
                                                                </span>
                                                            )}
                                                            {(emp.workLocation || emp.work_location) && (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#F1F5F9', color: '#475569', padding: '2px 7px', borderRadius: '4px' }}>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                                                    {emp.workLocation || emp.work_location}
                                                                </span>
                                                            )}
                                                            {emp.dob && emp.dob !== 'Pending Signup' && (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#F8FAFC', color: '#64748B', padding: '2px 7px', borderRadius: '4px' }}>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                                                    DOB: {emp.dob}
                                                                </span>
                                                            )}
                                                            {(emp.workDays || emp.work_days) && (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#F8FAFC', color: '#64748B', padding: '2px 7px', borderRadius: '4px' }}>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                                    Days: {Array.isArray(emp.workDays) ? emp.workDays.join(' ') : (Array.isArray(emp.work_days) ? emp.work_days.join(' ') : emp.workDays || emp.work_days)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {emp.bio ? (
                                                            <div style={{ marginTop: '5px', fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '420px' }} title={emp.bio}>
                                                                "{emp.bio}"
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <div className="sub-card-tags">
                                                    {tagsHtml}
                                                </div>
                                            </div>

                                            {/* Storage Allocation Sub-Panel */}
                                            <div className="sub-card-storage-box">
                                                <div className="sub-card-storage-top">
                                                    <div className="sub-card-storage-label">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sub-storage-icon">
                                                            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                                                            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                                                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                                                        </svg>
                                                        <span>Storage</span>
                                                    </div>
                                                    <div className="sub-card-storage-stats">
                                                        <span className="sub-card-storage-text">
                                                            <strong>{usedStorage} GB</strong> of {totalStorage} GB Used
                                                        </span>
                                                        <span className="sub-storage-pct-badge">
                                                            {storagePct}% • {availableStorage} GB Free
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="sub-card-progress">
                                                    <div
                                                        className={`sub-card-progress-bar ${storagePct > 85 ? 'bar-danger' : storagePct > 65 ? 'bar-warning' : ''}`}
                                                        style={{ width: `${Math.max(storagePct, 2)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Card Footer Actions */}
                                            <div className="sub-card-actions">
                                                <div className="sub-card-actions-left">
                                                    <button
                                                        type="button"
                                                        className="btn-sub-buy"
                                                        onClick={() => {
                                                            setSelectedStorageAddon(STORAGE_ADDONS[1]);
                                                            setStorageModalEmp(emp);
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                                                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                                                            <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path>
                                                        </svg>
                                                        <span>Buy storage</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-sub-renew"
                                                        onClick={() => handleRenewSingle(emp)}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                                                            <line x1="2" y1="10" x2="22" y2="10"></line>
                                                        </svg>
                                                        <span>Renew</span>
                                                    </button>
                                                </div>

                                                {emp.subscriptionStatus !== 'expired' && !meta.isCurrentlyExpired && (
                                                    <button
                                                        type="button"
                                                        className="btn-sub-expire"
                                                        onClick={() => handleExpireSingle(emp)}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="12" cy="12" r="10"></circle>
                                                            <line x1="15" y1="9" x2="9" y2="15"></line>
                                                            <line x1="9" y1="9" x2="15" y2="15"></line>
                                                        </svg>
                                                        <span>Expire Now</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div style={{ height: '40px', flexShrink: 0 }} aria-hidden="true"></div>
                    </div>
                );
            })()}

            {/* STATE 2: Choose Your Plan Screen */}
            {viewState === 2 && (
                <div id="subStatePlan" className="sub-flow-container">
                    {/* Header with back arrow */}
                    <div className="sub-flow-top-nav">
                        <button
                            type="button"
                            onClick={() => setViewState(1)}
                            className="sub-btn-back"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                            <span>Back to Subscriptions</span>
                        </button>
                        <span className="sub-flow-step-indicator">Step 2 of 3 • Billing Plan</span>
                    </div>

                    <div className="sub-flow-card">
                        <h2 className="sub-title">Choose Your Plan</h2>
                        <p className="sub-subtitle">
                            Select the billing cycle that works best for your organization
                        </p>

                        {/* Monthly/Yearly Toggle */}
                        <div className="plan-cycle-toggle-wrapper" role="tablist" aria-label="Billing cycle">
                            <button
                                type="button"
                                id="btnSubCycleMonthly"
                                className={`btn-sub-cycle ${planCycle === 'monthly' ? 'active' : ''}`}
                                onClick={() => setPlanCycle('monthly')}
                            >
                                Monthly
                            </button>
                            <button
                                type="button"
                                id="btnSubCycleYearly"
                                className={`btn-sub-cycle ${planCycle === 'yearly' ? 'active' : ''}`}
                                onClick={() => setPlanCycle('yearly')}
                            >
                                <span>Yearly</span>
                                <span className="sub-cycle-save-pill">Save 17%</span>
                            </button>
                        </div>

                        {/* Selected Plan Card */}
                        <div className="plan-preview-card">
                            <div className="plan-card-badge">ENTERPRISE SEAT LICENSE</div>
                            <div className="plan-card-title" id="subPlanCardTitle">
                                {planCycle === 'monthly' ? 'Monthly Plan' : 'Annual Plan'}
                            </div>
                            <div className="plan-card-price" id="subPlanCardPrice">
                                Rs {unitPrice.toLocaleString('en-IN')}
                            </div>
                            <div className="plan-card-period" id="subPlanCardPeriod">
                                {planCycle === 'monthly' ? 'Per seat / month' : 'Per seat / year (2 months free)'}
                            </div>
                        </div>

                        {/* Info banner */}
                        <div className="plan-info-banner">
                            <div className="plan-info-icon-box">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                <span className="banner-title" id="subBannerEmployees">
                                    For {seatCountToRenew} Employee{seatCountToRenew > 1 ? 's' : ''}
                                </span>
                                <span className="banner-subtitle truncate">
                                    {targetRenewEmails.length > 0
                                        ? `Renewing: ${targetRenewEmails.join(', ')}`
                                        : 'Includes 15 GB cloud storage & Identity Shield per seat'}
                                </span>
                            </div>
                        </div>

                        {/* Summary box */}
                        <div className="plan-summary-box">
                            <div className="summary-row">
                                <span>Plan:</span>
                                <strong id="subSummaryPlan">{planCycle === 'monthly' ? 'Monthly' : 'Yearly'}</strong>
                            </div>
                            <div className="summary-row">
                                <span>Employees:</span>
                                <strong id="subSummaryEmployees">{seatCountToRenew} User{seatCountToRenew > 1 ? 's' : ''}</strong>
                            </div>
                            <div className="summary-row">
                                <span>Price per Seat:</span>
                                <strong id="subSummaryAmount">Rs {unitPrice.toLocaleString('en-IN')}</strong>
                            </div>
                            <div className="summary-row total-row">
                                <span>Total Payable:</span>
                                <strong id="subSummaryTotal">Rs {totalPlanAmount.toLocaleString('en-IN')}</strong>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="btn-proceed-payment"
                            onClick={handleProceedPayment}
                        >
                            Proceed Payment • Rs {totalPlanAmount.toLocaleString('en-IN')}
                        </button>
                    </div>
                </div>
            )}

            {/* STATE 3: Success Screen */}
            {viewState === 3 && (
                <div id="subStateSuccess" className="sub-flow-container">
                    {/* Header with back arrow */}
                    <div className="sub-flow-top-nav">
                        <button
                            type="button"
                            onClick={() => setViewState(1)}
                            className="sub-btn-back"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                            <span>Back to Subscriptions</span>
                        </button>
                        <span className="sub-flow-step-indicator">Step 3 of 3 • Completed</span>
                    </div>

                    <div className="sub-flow-card">
                        <h2 className="sub-title" style={{ marginBottom: '1.5rem' }}>Order Summary</h2>

                        {/* Stepper */}
                        <div className="sub-stepper">
                            <div className="sub-step active">
                                <span className="circle">1</span>
                            </div>
                            <div className="sub-step-line active"></div>
                            <div className="sub-step active">
                                <span className="circle">2</span>
                            </div>
                            <div className="sub-step-line active"></div>
                            <div className="sub-step active">
                                <span className="circle">3</span>
                            </div>
                        </div>

                        {/* Success Check Circle */}
                        <div className="sub-success-check">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>

                        <h3 className="sub-title" style={{ fontSize: '1.35rem', marginBottom: '0.4rem' }}>
                            Payment Successful!
                        </h3>
                        <p className="sub-subtitle" style={{ maxWidth: '440px', lineHeight: 1.5 }}>
                            Thank you for your payment. Your employee seat subscription has been activated immediately.
                        </p>

                        {/* Transaction details box */}
                        <div className="transaction-details-card">
                            <div className="details-row">
                                <span>Transaction ID:</span>
                                <strong id="subSuccessTxnId">{lastTxnDetails?.txnId || 'TXN-789456123'}</strong>
                            </div>
                            <div className="details-row">
                                <span>Plan:</span>
                                <strong id="subSuccessPlan">
                                    {lastTxnDetails?.planLabel || `Monthly Plan (${seatCountToRenew} Users)`}
                                </strong>
                            </div>
                            <div className="details-row">
                                <span>Amount Paid:</span>
                                <strong className="amount-paid" id="subSuccessAmount">
                                    {lastTxnDetails?.amountFormatted || `Rs ${totalPlanAmount}`}
                                </strong>
                            </div>
                            <div className="details-row">
                                <span>Payment Method:</span>
                                <strong id="subSuccessMethod">Credit Card (Visa)</strong>
                            </div>
                            <div className="details-row">
                                <span>Payment Date:</span>
                                <strong id="subSuccessDate">{lastTxnDetails?.paymentDate || '30 October 2026'}</strong>
                            </div>
                            <div className="details-row">
                                <span>Next Billing Date:</span>
                                <strong id="subSuccessNextDate">{lastTxnDetails?.nextBillingDate || '30 November 2026'}</strong>
                            </div>
                        </div>

                        {/* Receipt link */}
                        <div className="sub-receipt-row">
                            <svg className="sub-receipt-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            <span>
                                Transaction Receipt: <strong id="subSuccessReceiptId">{lastTxnDetails?.txnId || 'TXN-789456123'}</strong>
                            </span>
                        </div>

                        {/* Action buttons */}
                        <div className="sub-success-actions">
                            <button type="button" className="btn-sub-invoice" onClick={handleDownloadInvoice}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                <span>Download invoice</span>
                            </button>
                            <button type="button" className="btn-sub-home" onClick={() => setViewState(1)}>
                                Back to Subscriptions
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Buy Storage Modal */}
            {storageModalEmp && (
                <div className="sub-storage-modal-backdrop" onClick={() => setStorageModalEmp(null)}>
                    <div
                        className="sub-storage-modal-card"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="subBuyStorageModalTitle"
                    >
                        <div className="sub-storage-modal-header">
                            <div className="flex items-center gap-3">
                                <div className="sub-storage-modal-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                                        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h3 id="subBuyStorageModalTitle" className="sub-storage-modal-title">
                                        Expand Seat Cloud Storage
                                    </h3>
                                    <p className="sub-storage-modal-sub">
                                        {`${storageModalEmp.firstName || ''} ${storageModalEmp.lastName || ''}`.trim() || storageModalEmp.email} • Current: {storageModalEmp.totalStorage || 15} GB
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="sub-storage-modal-close"
                                onClick={() => setStorageModalEmp(null)}
                                aria-label="Close storage modal"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="sub-storage-options-grid">
                            {STORAGE_ADDONS.map((addon) => {
                                const isSelected = selectedStorageAddon?.gb === addon.gb;
                                return (
                                    <div
                                        key={addon.gb}
                                        className={`sub-storage-option-card ${isSelected ? 'selected' : ''}`}
                                        onClick={() => setSelectedStorageAddon(addon)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => e.key === 'Enter' && setSelectedStorageAddon(addon)}
                                    >
                                        <div className="sub-storage-option-top">
                                            <span className="sub-storage-option-gb">+{addon.gb} GB</span>
                                            {addon.popular && <span className="sub-storage-popular-tag">POPULAR</span>}
                                        </div>
                                        <div className="sub-storage-option-label">{addon.label}</div>
                                        <div className="sub-storage-option-desc">{addon.desc}</div>
                                        <div className="sub-storage-option-price">
                                            Rs {addon.price} <small>/ month</small>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="sub-storage-modal-summary">
                            <span>New Seat Storage Limit:</span>
                            <strong>{(Number(storageModalEmp.totalStorage) || 15) + (selectedStorageAddon?.gb || 0)} GB Total</strong>
                        </div>

                        <div className="sub-storage-modal-footer">
                            <button
                                type="button"
                                className="sub-storage-btn-cancel"
                                onClick={() => setStorageModalEmp(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="sub-storage-btn-confirm"
                                onClick={handleBuyStorageConfirm}
                                disabled={isBuyingStorage}
                            >
                                {isBuyingStorage
                                    ? 'Upgrading Storage...'
                                    : `Add +${selectedStorageAddon?.gb} GB (Rs ${selectedStorageAddon?.price})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
