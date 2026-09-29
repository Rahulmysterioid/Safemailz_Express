import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useEmployee } from '../../context/EmployeeContext';

export default function AddAdminModal() {
    const { isAddAdminModalOpen, closeAddAdminModal, refreshAdmins } = useAdmin();
    const { employees } = useEmployee();
    const [search, setSearch] = useState('');
    const [promoting, setPromoting] = useState(null); // track which employee is being promoted
    const [toastMsg, setToastMsg] = useState(null); // for custom toast notifications

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

    const handlePromoteEmployee = async (emp) => {
        if (promoting) return; // prevent double clicks
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
                // Refresh admin list from backend
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
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
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
                    backgroundColor: toastMsg.type === 'success' ? '#4caf50' : '#f44336',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    zIndex: 10000,
                    fontWeight: 500,
                    fontSize: '14px',
                    transition: 'opacity 0.3s'
                }}>
                    {toastMsg.msg}
                </div>
            )}

            <div
                className="modal-card"
                style={{
                    textAlign: 'left',
                    maxWidth: '500px',
                    padding: '1.75rem 2rem',
                    borderRadius: '12px',
                    background: '#fff',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
                    border: '1px solid #E2E8F0',
                    width: '100%'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h2 id="addAdminTitle" style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#111827', fontFamily: "'Inter', sans-serif" }}>
                        Select Employee to Promote
                    </h2>
                    <button
                        onClick={closeAddAdminModal}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '1.35rem',
                            cursor: 'pointer',
                            color: '#6B7280',
                            lineHeight: 1,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        aria-label="Close modal"
                    >
                        &times;
                    </button>
                </div>

                {/* Search Input */}
                <div style={{ marginBottom: '1rem' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search employees by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            height: '40px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '8px',
                            background: '#fff',
                            color: '#0F172A',
                            fontSize: '0.875rem',
                            padding: '0 0.85rem',
                            fontFamily: "'Inter', sans-serif",
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
                    maxHeight: '320px',
                    overflowY: 'auto',
                    marginBottom: '1.5rem',
                    paddingRight: '0.25rem'
                }}>
                    {filteredEmployees.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#6B7280', fontSize: '0.85rem' }}>
                            No employees found matching your search.
                        </div>
                    ) : (
                        filteredEmployees.map((emp) => {
                            const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee';
                            const isPromoting = promoting === emp.id;
                            return (
                                <div
                                    key={emp.id}
                                    onClick={() => !isPromoting && handlePromoteEmployee(emp)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '0.75rem 0.85rem',
                                        background: '#fff',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '8px',
                                        cursor: isPromoting ? 'wait' : 'pointer',
                                        transition: 'border-color 0.15s ease',
                                        opacity: isPromoting ? 0.6 : 1
                                    }}
                                    onMouseOver={(e) => { if (!isPromoting) e.currentTarget.style.borderColor = '#2563EB'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
                                >
                                    <div>
                                        <strong style={{ display: 'block', fontSize: '0.875rem', color: '#1E293B', fontFamily: "'Inter', sans-serif" }}>
                                            {fullName}
                                        </strong>
                                        <span style={{ fontSize: '0.78rem', color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>
                                            {emp.email}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); if (!isPromoting) handlePromoteEmployee(emp); }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: isPromoting ? 'wait' : 'pointer',
                                            color: '#2563EB',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '6px',
                                            transition: 'background-color 0.15s ease'
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#EFF6FF'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                        aria-label={`Promote ${fullName} to admin`}
                                    >
                                        {/* Right arrow / chevron icon */}
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6"></polyline>
                                        </svg>
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={closeAddAdminModal}
                        style={{
                            height: '38px',
                            padding: '0 1.5rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: "'Inter', sans-serif",
                            background: '#fff',
                            color: '#2563EB',
                            border: '1.5px solid #2563EB',
                            transition: 'background-color 0.15s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#EFF6FF'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
