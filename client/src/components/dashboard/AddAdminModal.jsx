import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useEmployee } from '../../context/EmployeeContext';

export default function AddAdminModal() {
    const { isAddAdminModalOpen, closeAddAdminModal, refreshAdmins } = useAdmin();
    const { employees } = useEmployee();
    const [search, setSearch] = useState('');
    const [promoting, setPromoting] = useState(null);
    const [toastMsg, setToastMsg] = useState(null);

    const showToast = (msg, type = 'error') => {
        setToastMsg({ msg, type });
        setTimeout(() => setToastMsg(null), 3000);
    };

    // Close on Esc key
    useEffect(() => {
        if (!isAddAdminModalOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') closeAddAdminModal();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isAddAdminModalOpen, closeAddAdminModal]);

    // Reset search when modal opens
    useEffect(() => {
        if (isAddAdminModalOpen) {
            setSearch('');
            setPromoting(null);
        }
    }, [isAddAdminModalOpen]);

    if (!isAddAdminModalOpen) return null;

    // Filter only filled employees (not admins already)
    const filteredEmployees = employees
        .filter(emp => emp && emp.status === 'filled')
        .filter(emp => {
            if (!search.trim()) return true;
            const q = search.toLowerCase().trim();
            const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
            return fullName.includes(q) || (emp.email || '').toLowerCase().includes(q);
        });

    const getInitials = (name, email) => {
        if (name && name.trim()) {
            const parts = name.trim().split(/\s+/);
            if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
            return parts[0].slice(0, 2).toUpperCase();
        }
        if (email) return email.slice(0, 2).toUpperCase();
        return 'EM';
    };

    const handlePromoteEmployee = async (emp) => {
        if (promoting) return;
        setPromoting(emp.id);

        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const token = localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (user?.id) headers['x-user-id'] = String(user.id);
            if (user?.org_id || user?.organization_id) headers['x-org-id'] = String(user.org_id || user.organization_id);

            const res = await fetch(`/api/settings/employee/${emp.id}/promote`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ role: 'Admin' })
            });

            if (res.ok) {
                await refreshAdmins();
                showToast('Employee promoted to Admin successfully', 'success');
                setTimeout(() => closeAddAdminModal(), 1000);
            } else {
                let errorMsg = 'Failed to promote employee. Please try again.';
                try {
                    const data = await res.json();
                    errorMsg = data.error || data.message || errorMsg;
                } catch (e) {
                    errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
                }
                showToast(errorMsg, 'error');
                console.error('Promotion failed:', errorMsg);
            }
        } catch (err) {
            console.error('Promote error:', err);
            showToast(err.message || 'Failed to promote employee. Please check your connection and try again.', 'error');
        } finally {
            setPromoting(null);
        }
    };

    return (
        <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="addAdminTitle"
            onClick={(e) => { if (e.target === e.currentTarget) closeAddAdminModal(); }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.55)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '1rem',
                opacity: 1,
                visibility: 'visible'
            }}
        >
            {/* Custom Toast Notification */}
            {toastMsg && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: toastMsg.type === 'success' ? '#10b981' : '#ef4444',
                    color: '#fff',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                    zIndex: 10000,
                    fontWeight: 600,
                    fontSize: '13px',
                    transition: 'opacity 0.3s'
                }}>
                    {toastMsg.msg}
                </div>
            )}

            <div
                className="modal-card admin-modal-card font-inter"
                style={{
                    textAlign: 'left',
                    maxWidth: '520px',
                    width: '100%',
                    borderRadius: '16px',
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="admin-modal-header"
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1.25rem 1.5rem'
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div className="admin-perm-icon admin-perm-icon-blue">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                                <path d="m9 12 2 2 4-4" />
                            </svg>
                        </div>
                        <div>
                            <h2 id="addAdminTitle" className="admin-modal-title" style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                                Select Employee to Promote
                            </h2>
                            <p className="admin-modal-subtitle" style={{ fontSize: '0.76rem', margin: '2px 0 0' }}>
                                Grant organization-level administrative access to an employee
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={closeAddAdminModal}
                        className="project-modal-close-btn"
                        aria-label="Close modal"
                    >
                        &times;
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '1.25rem 1.5rem' }}>
                    {/* Search Input */}
                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                        <svg
                            style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: '15px',
                                height: '15px',
                                color: '#94A3B8',
                                pointerEvents: 'none'
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
                        <input
                            type="text"
                            className="form-input admin-modal-input"
                            placeholder="Search employees by name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                width: '100%',
                                height: '40px',
                                borderRadius: '10px',
                                fontSize: '0.85rem',
                                padding: '0 0.85rem 0 2.35rem',
                                boxSizing: 'border-box',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Scrollable Employee List */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        paddingRight: '0.25rem'
                    }}>
                        {filteredEmployees.length === 0 ? (
                            <div className="admin-modal-subtitle" style={{ textAlign: 'center', padding: '2.25rem 1rem', fontSize: '0.85rem' }}>
                                No employees found matching your search.
                            </div>
                        ) : (
                            filteredEmployees.map((emp) => {
                                const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || 'Employee';
                                const isPromoting = promoting === emp.id;
                                const initials = getInitials(fullName, emp.email);
                                return (
                                    <div
                                        key={emp.id}
                                        onClick={() => !isPromoting && handlePromoteEmployee(emp)}
                                        className="admin-modal-list-item"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.7rem 0.85rem',
                                            borderRadius: '10px',
                                            cursor: isPromoting ? 'wait' : 'pointer',
                                            opacity: isPromoting ? 0.6 : 1,
                                            gap: '12px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                            <div style={{
                                                width: '34px',
                                                height: '34px',
                                                borderRadius: '9999px',
                                                background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                                                color: '#ffffff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 700,
                                                fontSize: '0.75rem',
                                                flexShrink: 0
                                            }}>
                                                {initials}
                                            </div>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <strong className="admin-modal-title" style={{ display: 'block', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {fullName}
                                                </strong>
                                                <span className="admin-modal-subtitle" style={{ display: 'block', fontSize: '0.76rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {emp.email}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); if (!isPromoting) handlePromoteEmployee(emp); }}
                                            className="admin-quick-perm-btn"
                                            style={{
                                                cursor: isPromoting ? 'wait' : 'pointer',
                                                flexShrink: 0
                                            }}
                                            aria-label={`Promote ${fullName} to admin`}
                                        >
                                            <span>{isPromoting ? 'Promoting...' : 'Promote'}</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="9 18 15 12 9 6"></polyline>
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="admin-modal-footer"
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        padding: '1rem 1.5rem'
                    }}
                >
                    <button
                        type="button"
                        onClick={closeAddAdminModal}
                        className="client-modal-btn-cancel"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
