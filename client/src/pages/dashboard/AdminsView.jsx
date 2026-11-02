import './AdminsLightPolish.css';
import React, { useState, useEffect, useRef } from 'react';
import { useAdmin } from '../../context/AdminContext';
import AssignEmployeesModal from '../../components/dashboard/AssignEmployeesModal';

export default function AdminsView() {
    const {
        admins,
        selectedAdmin,
        selectedAdminIndex,
        searchQuery,
        setSearchQuery,
        updateAdminField,
        updateAdminPermission,
        setAllAdminPermissions,
        saveAdminProfile,
        openAddAdminModal,
        refreshAdmins
    } = useAdmin();

    const [toastState, setToastState] = useState(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignedCount, setAssignedCount] = useState(0);
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const mainSearchInputRef = useRef(null);

    const showToast = (text, type = 'success') => {
        setToastState({ text, type });
        setTimeout(() => {
            setToastState(curr => (curr?.text === text ? null : curr));
        }, 2800);
    };

    // Fetch assigned employees count whenever selectedAdmin changes
    useEffect(() => {
        if (!selectedAdmin?.id) return;
        const fetchAssigned = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const token = localStorage.getItem('token');
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                if (user?.id) headers['x-user-id'] = String(user.id);
                if (user?.org_id || user?.organization_id) headers['x-org-id'] = String(user.org_id || user.organization_id);

                const res = await fetch(`/api/admins/${selectedAdmin.id}/assigned-employees`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    setAssignedCount((data.employeeIds || data.assignedEmployeeIds || []).length);
                }
            } catch (e) {
                console.error('Failed to fetch assigned count:', e);
            }
        };
        fetchAssigned();
    }, [selectedAdmin?.id]);

    const getInitials = (name) => {
        if (!name) return 'AD';
        const clean = name.trim().replace(/^\d+[.)]\s*/, '').trim();
        const parts = (clean || name.trim()).split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return (clean || name.trim()).slice(0, 2).toUpperCase();
    };

    if (!selectedAdmin || admins.length === 0) {
        const isEmpty = admins.length === 0;
        return (
            <div
                className="content-area admins-view-container flex-1 overflow-y-auto px-8 py-6 bg-slate-50/30 h-full font-inter"
                id="adminsView"
                style={{
                    height: '100%',
                    width: '100%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    justifyContent: 'flex-start'
                }}
            >
                <div className="admins-view-inner w-full max-w-[1440px] mx-auto">
                    {/* Top Header Row matching Clients page layout */}
                    <div className="admins-header-bar flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 w-full pb-4 border-b border-slate-200/80 dark:border-[#1e2636]">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2.5">
                                <h1 className="admins-page-title text-2xl font-bold text-slate-900 dark:text-slate-100 m-0 tracking-tight">
                                    All Admins
                                </h1>
                                <span
                                    id="adminsCountHeader"
                                    className="admins-count-pill px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-600 dark:bg-[#132842] dark:text-sky-400 border border-blue-200/60 dark:border-sky-500/30"
                                >
                                    {admins.length}
                                </span>
                            </div>
                            <p className="admins-page-subtitle text-sm text-slate-500 dark:text-slate-400 mt-1 m-0">
                                Manage administrator roles, system permissions, and team access controls
                            </p>
                        </div>

                        {/* Right Column (Search Input) */}
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div
                                className="admins-main-search-wrap relative w-full sm:w-80 flex items-center"
                                style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                            >
                                <button
                                    type="button"
                                    id="mainAdminsSearchBtn"
                                    aria-label="Search admins"
                                    title="Search admins"
                                    onClick={() => {
                                        if (mainSearchInputRef.current) {
                                            mainSearchInputRef.current.focus();
                                        } else {
                                            document.getElementById('mainAdminsSearchInput')?.focus();
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
                                        width={16}
                                        height={16}
                                        className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0"
                                        style={{ width: '16px', height: '16px' }}
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                </button>
                                <input
                                    ref={mainSearchInputRef}
                                    type="text"
                                    placeholder="Search admins by name, email, or role..."
                                    id="mainAdminsSearchInput"
                                    value={searchQuery || ''}
                                    onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') setSearchQuery('');
                                    }}
                                    className="admins-main-search-input w-full h-9 pl-10 pr-3 text-xs rounded-lg bg-white dark:bg-[#141821] border border-slate-200 dark:border-[#242c3d] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs focus:border-blue-500 focus:outline-none transition-all"
                                    style={{ paddingLeft: '40px', paddingRight: searchQuery ? '32px' : '14px', boxSizing: 'border-box' }}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        aria-label="Clear search"
                                        title="Clear search"
                                        className="admins-main-search-clear"
                                        style={{
                                            position: 'absolute',
                                            right: '8px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '9999px',
                                            border: 'none',
                                            background: 'rgba(148, 163, 184, 0.2)',
                                            color: '#94a3b8',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            padding: 0,
                                            zIndex: 2
                                        }}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Standardized Main Empty State Card */}
                    <div
                        id="adminDetailsEmptyState"
                        className="admins-empty-state w-full min-h-[380px] bg-white dark:bg-[#141821] border border-dashed border-slate-200 dark:border-[#242c3d] rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center shadow-xs"
                        style={{ boxSizing: 'border-box', borderStyle: 'dashed', minHeight: '380px', width: '100%' }}
                    >
                        {/* Visual / Icon Area: unified icon badge */}
                        <div
                            className="admins-empty-icon w-16 h-16 rounded-full bg-blue-50/80 dark:bg-[#132842] border border-blue-100 dark:border-sky-500/30 flex items-center justify-center text-blue-600 dark:text-sky-400 mb-5 shrink-0"
                            style={{
                                width: '64px',
                                height: '64px',
                                minWidth: '64px',
                                minHeight: '64px',
                                borderRadius: '9999px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '20px'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                                <path d="m9 12 2 2 4-4" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1.5 m-0" style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>
                            {isEmpty ? 'Build your admin team' : 'Select an admin'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed m-0" style={{ fontSize: '14px', maxWidth: '384px', marginBottom: '24px', lineHeight: 1.6 }}>
                            {isEmpty
                                ? 'Promote an employee to admin to help manage your team and share responsibilities.'
                                : 'Choose an admin from the directory to manage their permissions and assigned employees.'}
                        </p>
                        {openAddAdminModal && (
                            <button
                                type="button"
                                id="btnEmptyAddAdmin"
                                onClick={openAddAdminModal}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-xs transition-all cursor-pointer border-0"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>Add Admin</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const perms = selectedAdmin.permissions || {
        addEmployees: true,
        createProjects: true,
        manageProjects: true,
        makeAdmin: false,
        deleteProject: false
    };

    const enabledCount = [
        perms.addEmployees,
        perms.createProjects,
        perms.manageProjects,
        perms.makeAdmin,
        perms.deleteProject
    ].filter(Boolean).length;

    const allEnabled = enabledCount === 5;

    const handleSave = async () => {
        setIsSaving(true);
        await saveAdminProfile();
        setIsSaving(false);
        showToast('Admin profile and permissions saved successfully!', 'success');
    };

    const handleCancel = async () => {
        await refreshAdmins();
        showToast('Unsaved changes reverted to last saved state.', 'info');
    };

    const handleToggle = async (key, value) => {
        await updateAdminPermission(key, value);
        showToast('Admin details and permissions saved successfully!', 'success');
    };

    const handleToggleAllPrivileges = async () => {
        const nextState = !allEnabled;
        await setAllAdminPermissions({
            addEmployees: nextState,
            createProjects: nextState,
            manageProjects: nextState,
            makeAdmin: nextState,
            deleteProject: nextState
        });
        showToast(
            nextState
                ? 'All administrative privileges enabled!'
                : 'All administrative privileges disabled.',
            'success'
        );
    };

    const handleResetDefaultPrivileges = async () => {
        await setAllAdminPermissions({
            addEmployees: true,
            createProjects: true,
            manageProjects: true,
            makeAdmin: false,
            deleteProject: false
        });
        showToast('Privileges reset to recommended defaults.', 'success');
    };

    const handleCopyAdminEmail = () => {
        if (!selectedAdmin.email) return;
        navigator.clipboard?.writeText(selectedAdmin.email);
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 1800);
    };

    const initials = getInitials(selectedAdmin.name);

    return (
        <div
            className="flex-1 overflow-y-auto px-8 py-6 bg-slate-50/30 font-inter"
            id="adminsView"
            style={{ height: '100%', boxSizing: 'border-box' }}
        >
            <div
                id="adminDetailsContent"
                className="w-full max-w-5xl mx-auto"
            >
                {/* Toast Notification Banner */}
                {toastState && (
                    <div className="admin-toast-banner" role="status" aria-live="polite">
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                            <span>{toastState.text}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setToastState(null)}
                            aria-label="Dismiss notification"
                            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '2px 4px' }}
                        >
                            &times;
                        </button>
                    </div>
                )}

                {/* Elevated Hero Profile Header Card */}
                <div className="admin-header-card">
                    {/* Top Decorative Accent Gradient Bar */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '3px',
                            background: 'linear-gradient(90deg, #2563eb 0%, #6366f1 50%, #38bdf8 100%)'
                        }}
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                            {/* Avatar with Active Status Dot */}
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <div
                                    style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '14px',
                                        background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                                        color: '#ffffff',
                                        fontWeight: 700,
                                        fontSize: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                                    }}
                                >
                                    {initials}
                                </div>
                                <span
                                    title="Active Administrator"
                                    style={{
                                        position: 'absolute',
                                        bottom: '-2px',
                                        right: '-2px',
                                        width: '13px',
                                        height: '13px',
                                        borderRadius: '9999px',
                                        backgroundColor: '#10b981',
                                        border: '2.5px solid var(--card-bg, #141821)'
                                    }}
                                />
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="admin-header-title text-xl font-bold m-0 leading-tight truncate">
                                        {selectedAdmin.name || 'Admin Profile'}
                                    </h2>
                                    <span className="admin-stat-chip chip-blue">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                                        </svg>
                                        <span>Administrator</span>
                                    </span>
                                    <span className="admin-stat-chip chip-emerald">
                                        <span>{enabledCount}/5 Privileges Active</span>
                                    </span>
                                </div>
                                <p className="admin-header-subtitle text-xs mt-1 mb-0 leading-relaxed">
                                    Manage administrative privileges &amp; assigned employees ({assignedCount > 0 ? `${assignedCount} assigned` : 'none assigned'})
                                </p>
                            </div>
                        </div>

                        {/* Primary Action: Assign Employees */}
                        <div className="flex items-center gap-2.5 shrink-0">
                            <button
                                type="button"
                                id="btnAssignEmployees"
                                onClick={() => setIsAssignModalOpen(true)}
                                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2 cursor-pointer border-0 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                                <span>Assign Employees</span>
                                <span className="admin-assign-count-badge">
                                    {assignedCount}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Admin Identity & Contact Card (Admin Name & Admin Email ID) */}
                <div className="admin-identity-card">
                    <div className="admin-identity-card-header">
                        <div className="flex items-center gap-2">
                            <span
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '9999px',
                                    backgroundColor: '#38bdf8',
                                    display: 'inline-block'
                                }}
                            />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                Administrator Identity &amp; Contact
                            </span>
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            Admin #{selectedAdminIndex + 1}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Admin Name Input */}
                        <div>
                            <label htmlFor="adminNameInput" className="admin-field-label">
                                <span>Admin Name</span>
                            </label>
                            <div className="admin-input-wrap">
                                <span className="admin-input-icon" aria-hidden="true">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    id="adminNameInput"
                                    placeholder="Enter admin full name"
                                    value={selectedAdmin.name || ''}
                                    onChange={(e) => updateAdminField('name', e.target.value)}
                                    className="admin-input-field"
                                />
                            </div>
                        </div>

                        {/* Admin Email ID Input + Quick Copy Button */}
                        <div>
                            <label htmlFor="adminEmailInput" className="admin-field-label">
                                <span>Admin Email ID</span>
                            </label>
                            <div className="admin-input-wrap">
                                <span className="admin-input-icon" aria-hidden="true">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect width="20" height="16" x="2" y="4" rx="2" />
                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                    </svg>
                                </span>
                                <input
                                    type="email"
                                    id="adminEmailInput"
                                    placeholder="admin@organization.com"
                                    value={selectedAdmin.email || ''}
                                    onChange={(e) => updateAdminField('email', e.target.value)}
                                    className="admin-input-field"
                                    style={{ paddingRight: '78px' }}
                                />
                                {selectedAdmin.email && (
                                    <button
                                        type="button"
                                        onClick={handleCopyAdminEmail}
                                        className={`admin-copy-inline-btn ${copiedEmail ? 'copied' : ''}`}
                                        title="Copy admin email address"
                                    >
                                        {copiedEmail ? (
                                            <>
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                                <span>Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                                </svg>
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Administrative Privileges Grid */}
                <div>
                    <div className="admin-privileges-header">
                        <div>
                            <h3 className="admin-privileges-title">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-sky-400">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                                    <path d="m9 12 2 2 4-4" />
                                </svg>
                                <span>Administrative Privileges</span>
                            </h3>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleResetDefaultPrivileges}
                                className="admin-quick-perm-btn"
                                title="Reset privileges to recommended defaults"
                            >
                                <span>Reset Defaults</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleToggleAllPrivileges}
                                className="admin-quick-perm-btn"
                            >
                                <span>{allEnabled ? 'Disable All' : 'Enable All'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                        {/* 1. Add Employees */}
                        <div
                            className={`admin-privilege-card ${perms.addEmployees ? 'is-enabled' : ''}`}
                            id="adminCardAddEmployees"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="admin-perm-icon admin-perm-icon-blue">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <line x1="19" y1="8" x2="19" y2="14" />
                                        <line x1="22" y1="11" x2="16" y2="11" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="admin-perm-title">Add Employees</h4>
                                        <span className={`admin-perm-status-badge ${perms.addEmployees ? 'on' : ''}`}>
                                            {perms.addEmployees ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <p className="admin-perm-desc truncate">
                                        Allow admin to add and onboard employees
                                    </p>
                                </div>
                            </div>
                            <button
                                className={`toggle-switch shrink-0 ${perms.addEmployees ? 'is-on active' : ''}`}
                                type="button"
                                role="switch"
                                aria-checked={perms.addEmployees}
                                aria-label="Toggle Add Employees privilege"
                                id="switchAddEmployees"
                                onClick={() => handleToggle('addEmployees', !perms.addEmployees)}
                            ></button>
                        </div>

                        {/* 2. Create Projects */}
                        <div
                            className={`admin-privilege-card ${perms.createProjects ? 'is-enabled' : ''}`}
                            id="adminCardCreateProjects"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="admin-perm-icon admin-perm-icon-indigo">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                                        <line x1="12" y1="10" x2="12" y2="16" />
                                        <line x1="9" y1="13" x2="15" y2="13" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="admin-perm-title">Create Projects</h4>
                                        <span className={`admin-perm-status-badge ${perms.createProjects ? 'on' : ''}`}>
                                            {perms.createProjects ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <p className="admin-perm-desc truncate">
                                        Allow admin to create new projects
                                    </p>
                                </div>
                            </div>
                            <button
                                className={`toggle-switch shrink-0 ${perms.createProjects ? 'is-on active' : ''}`}
                                type="button"
                                role="switch"
                                aria-checked={perms.createProjects}
                                aria-label="Toggle Create Projects privilege"
                                id="switchCreateProjects"
                                onClick={() => handleToggle('createProjects', !perms.createProjects)}
                            ></button>
                        </div>

                        {/* 3. Manage Projects */}
                        <div
                            className={`admin-privilege-card ${perms.manageProjects ? 'is-enabled' : ''}`}
                            id="adminCardManageProjects"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="admin-perm-icon admin-perm-icon-purple">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
                                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="admin-perm-title">Manage Projects</h4>
                                        <span className={`admin-perm-status-badge ${perms.manageProjects ? 'on' : ''}`}>
                                            {perms.manageProjects ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <p className="admin-perm-desc truncate">
                                        Allow admin to edit and manage existing projects
                                    </p>
                                </div>
                            </div>
                            <button
                                className={`toggle-switch shrink-0 ${perms.manageProjects ? 'is-on active' : ''}`}
                                type="button"
                                role="switch"
                                aria-checked={perms.manageProjects}
                                aria-label="Toggle Manage Projects privilege"
                                id="switchManageProjects"
                                onClick={() => handleToggle('manageProjects', !perms.manageProjects)}
                            ></button>
                        </div>

                        {/* 4. Make an Admin */}
                        <div
                            className={`admin-privilege-card ${perms.makeAdmin ? 'is-enabled' : ''}`}
                            id="adminCardMakeAdmin"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="admin-perm-icon admin-perm-icon-emerald">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                                        <path d="m9 12 2 2 4-4" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="admin-perm-title">Make an Admin</h4>
                                        <span className={`admin-perm-status-badge ${perms.makeAdmin ? 'on' : ''}`}>
                                            {perms.makeAdmin ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <p className="admin-perm-desc truncate">
                                        Allow admin to promote and manage other admins
                                    </p>
                                </div>
                            </div>
                            <button
                                className={`toggle-switch shrink-0 ${perms.makeAdmin ? 'is-on active' : ''}`}
                                type="button"
                                role="switch"
                                aria-checked={perms.makeAdmin}
                                aria-label="Toggle Make an Admin privilege"
                                id="switchMakeAdmin"
                                onClick={() => handleToggle('makeAdmin', !perms.makeAdmin)}
                            ></button>
                        </div>

                        {/* 5. Delete Project */}
                        <div
                            className={`admin-privilege-card ${perms.deleteProject ? 'is-enabled' : ''}`}
                            id="adminCardDeleteProject"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="admin-perm-icon admin-perm-icon-rose">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18" />
                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                        <line x1="10" y1="11" x2="10" y2="17" />
                                        <line x1="14" y1="11" x2="14" y2="17" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="admin-perm-title">Delete Project</h4>
                                        <span className={`admin-perm-status-badge ${perms.deleteProject ? 'on' : ''}`}>
                                            {perms.deleteProject ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <p className="admin-perm-desc truncate">
                                        Allow admin to delete existing projects
                                    </p>
                                </div>
                            </div>
                            <button
                                className={`toggle-switch shrink-0 ${perms.deleteProject ? 'is-on active' : ''}`}
                                type="button"
                                role="switch"
                                aria-checked={perms.deleteProject}
                                aria-label="Toggle Delete Project privilege"
                                id="switchDeleteProject"
                                onClick={() => handleToggle('deleteProject', !perms.deleteProject)}
                            ></button>
                        </div>
                    </div>
                </div>

                {/* Billing Policy Note Callout Box */}
                <div className="admin-note-callout">
                    <div className="admin-note-icon" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                    </div>
                    <div>
                        <span className="admin-note-label">Note:</span>
                        <span>
                            If the user first purchases an employee account and then adds an account in the admin panel, the billing should not be charged starting from the next month.
                        </span>
                    </div>
                </div>

                {/* Action Footer */}
                <div className="admin-action-footer">
                    <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <span
                            style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '9999px',
                                backgroundColor: '#10b981',
                                display: 'inline-block'
                            }}
                        />
                        <span>Privilege toggles sync automatically with organization access policy</span>
                    </div>

                    <div className="flex items-center justify-end gap-3 ml-auto">
                        <button
                            id="btnAdminCancel"
                            type="button"
                            onClick={handleCancel}
                        >
                            Cancel
                        </button>
                        <button
                            id="btnAdminSave"
                            type="button"
                            disabled={isSaving}
                            onClick={handleSave}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                <polyline points="17 21 17 13 7 13 7 21" />
                                <polyline points="7 3 7 8 15 8" />
                            </svg>
                            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                    </div>
                </div>

                {/* Assign Employees Modal */}
                <AssignEmployeesModal
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    admin={selectedAdmin}
                    onAssignmentsUpdated={(newIds) => setAssignedCount(newIds.length)}
                />
            </div>
        </div>
    );
}
