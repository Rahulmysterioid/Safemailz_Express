import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useEmployee } from '../../context/EmployeeContext';

export default function AssignEmployeesModal({ isOpen, onClose, admin, onAssignmentsUpdated }) {
    const { employees: contextEmployees } = useEmployee() || {};
    const [employees, setEmployees] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Initialize employees from context and backend
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        setIsLoading(true);
        setSearchQuery('');

        const filledFromContext = (contextEmployees || [])
            .filter(e => e && (e.status === 'filled' || e.email))
            .filter(e => e.id !== admin?.id)
            .map(e => ({
                id: e.id,
                name: e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.email,
                email: e.email,
                role: e.role || 'Employee'
            }));

        if (filledFromContext.length > 0) {
            setEmployees(filledFromContext);
        }

        const loadData = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const token = localStorage.getItem('token');
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                if (user?.id) headers['x-user-id'] = String(user.id);
                if (user?.org_id || user?.organization_id) headers['x-org-id'] = String(user.org_id || user.organization_id);

                // 1. Fetch all employees in organization (with scope=all)
                const empRes = await fetch('/api/settings/employees?scope=all', { headers });
                if (empRes.ok) {
                    const empData = await empRes.json();
                    if (Array.isArray(empData.employees) && empData.employees.length > 0) {
                        const valid = empData.employees
                            .filter(e => e && e.id !== admin?.id && e.email !== admin?.email)
                            .map(e => ({
                                id: e.id,
                                name: e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.email,
                                email: e.email,
                                role: e.role || (e.isPending ? 'Pending Invite' : 'Employee')
                            }));
                        if (isMounted && valid.length > 0) {
                            setEmployees(valid);
                        }
                    }
                }

                // 2. Fetch currently assigned employee IDs for this admin
                const adminId = admin?.id;
                if (adminId) {
                    const assignRes = await fetch(`/api/admins/${adminId}/assigned-employees`, { headers });
                    if (assignRes.ok) {
                        const assignData = await assignRes.json();
                        const currentAssigned = (assignData.employeeIds || assignData.assignedEmployeeIds || []).map(String);
                        if (isMounted) {
                            setSelectedIds(new Set(currentAssigned));
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load employee assignment data:', err);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, [isOpen, admin?.id, contextEmployees]);

    if (!isOpen || !admin) return null;

    // Filter employees based on search query
    const filteredEmployees = employees.filter(emp => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const name = (emp.name || '').toLowerCase();
        const email = (emp.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
    });

    const toggleEmployee = (empId) => {
        const idStr = String(empId);
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(idStr)) {
                next.delete(idStr);
            } else {
                next.add(idStr);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        const allFilteredIds = filteredEmployees.map(e => String(e.id));
        const allSelected = allFilteredIds.every(id => selectedIds.has(id));

        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allSelected) {
                allFilteredIds.forEach(id => next.delete(id));
            } else {
                allFilteredIds.forEach(id => next.add(id));
            }
            return next;
        });
    };

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);

        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const token = localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (user?.id) headers['x-user-id'] = String(user.id);
            if (user?.org_id || user?.organization_id) headers['x-org-id'] = String(user.org_id || user.organization_id);

            const payload = {
                employeeIds: Array.from(selectedIds)
            };

            const adminId = admin?.id;
            const res = await fetch(`/api/admins/${adminId}/assign-employees`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast('Employees assigned successfully!', 'success');
                if (onAssignmentsUpdated) {
                    onAssignmentsUpdated(Array.from(selectedIds));
                }
                setTimeout(() => {
                    onClose();
                }, 700);
            } else {
                const data = await res.json().catch(() => ({}));
                showToast(data.error || 'Failed to update assignments.', 'error');
            }
        } catch (err) {
            console.error('Failed to save assignments:', err);
            showToast('Network error while saving assignments.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const getInitials = (name, email) => {
        if (name && name.trim()) {
            return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
        }
        if (email) {
            return email.slice(0, 2).toUpperCase();
        }
        return 'EM';
    };

    const isAllFilteredSelected = filteredEmployees.length > 0 && filteredEmployees.every(e => selectedIds.has(String(e.id)));

    return ReactDOM.createPortal(
        <div
            className="modal-overlay active"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assignModalTitle"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
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
                zIndex: 999999,
                opacity: 1,
                visibility: 'visible',
                padding: '1rem',
                margin: 0,
                boxSizing: 'border-box'
            }}
        >
            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'absolute',
                    top: '24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: toast.type === 'success' ? '#10B981' : '#EF4444',
                    color: '#fff',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                    zIndex: 1000000,
                    fontWeight: 600,
                    fontSize: '0.875rem'
                }}>
                    {toast.message}
                </div>
            )}

            <div
                className="modal-card admin-modal-card font-inter"
                style={{
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '560px',
                    maxHeight: '88vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    margin: 'auto',
                    opacity: 1,
                    visibility: 'visible',
                    transform: 'none'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div
                    className="admin-modal-header"
                    style={{
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div className="admin-perm-icon admin-perm-icon-blue">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <div>
                            <h2 id="assignModalTitle" className="admin-modal-title" style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                                Assign Employees to Admin
                            </h2>
                            <p className="admin-modal-subtitle" style={{ fontSize: '0.78rem', margin: '3px 0 0 0' }}>
                                Select employees managed by <strong className="admin-modal-title">{admin.name || admin.email}</strong>
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="project-modal-close-btn"
                        aria-label="Close"
                    >
                        &times;
                    </button>
                </div>

                {/* Search Bar & Action Controls */}
                <div className="admin-modal-search-bar" style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                        <svg
                            style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: '16px',
                                height: '16px',
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
                            placeholder="Search employees by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="admin-modal-input"
                            style={{
                                width: '100%',
                                height: '38px',
                                padding: '0 0.75rem 0 2.25rem',
                                fontSize: '0.85rem',
                                borderRadius: '9px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span className="admin-modal-subtitle" style={{ fontWeight: 500 }}>
                            <strong style={{ color: '#38bdf8' }}>{selectedIds.size}</strong> of {employees.length} employees assigned
                        </span>
                        {filteredEmployees.length > 0 && (
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#38bdf8',
                                    fontWeight: 600,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                }}
                            >
                                {isAllFilteredSelected ? 'Deselect All' : 'Select All Filtered'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Employees List */}
                <div style={{
                    padding: '0.85rem 1.5rem',
                    overflowY: 'auto',
                    flex: 1,
                    minHeight: '220px',
                    maxHeight: '380px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                }}>
                    {isLoading && employees.length === 0 ? (
                        <div className="admin-modal-subtitle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', fontSize: '0.9rem' }}>
                            Loading employees...
                        </div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="admin-modal-subtitle" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', fontSize: '0.85rem', textAlign: 'center' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px', opacity: 0.6 }}>
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                            <span>No employees available to assign.</span>
                        </div>
                    ) : (
                        filteredEmployees.map(emp => {
                            const isSelected = selectedIds.has(String(emp.id));
                            const displayName = emp.name || emp.email;
                            const initials = getInitials(emp.name, emp.email);

                            return (
                                <div
                                    key={emp.id}
                                    onClick={() => toggleEmployee(emp.id)}
                                    className={`admin-modal-list-item ${isSelected ? 'is-selected' : ''}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        gap: '12px'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {}}
                                        style={{
                                            width: '17px',
                                            height: '17px',
                                            accentColor: '#2563EB',
                                            cursor: 'pointer'
                                        }}
                                    />

                                    {/* Avatar */}
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: isSelected
                                            ? 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)'
                                            : 'linear-gradient(135deg, #334155 0%, #475569 100%)',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        flexShrink: 0
                                    }}>
                                        {initials}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="admin-modal-title" style={{ fontSize: '0.86rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {displayName}
                                        </div>
                                        <div className="admin-modal-subtitle" style={{ fontSize: '0.76rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {emp.email}
                                        </div>
                                    </div>

                                    {/* Role Badge */}
                                    <span className="admin-stat-chip" style={{ textTransform: 'capitalize', flexShrink: 0 }}>
                                        {emp.role || 'Employee'}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Modal Footer */}
                <div
                    className="admin-modal-footer"
                    style={{
                        padding: '1rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '0.75rem'
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="client-modal-btn-cancel"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className="client-modal-btn-save"
                        style={{
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            opacity: isSaving ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {isSaving ? 'Saving...' : 'Save Assignments'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
