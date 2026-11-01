import React, { useState, useEffect } from 'react';

/**
 * OwnerResetPasswordModal
 * Allows an Owner / Org Owner to reset an employee's password, force change on next login,
 * and revoke all active sessions.
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - employee: object { id, firstName, lastName, name, email, ... }
 * - currentUser: object { id, organization_id, role, ... }
 */
export default function OwnerResetPasswordModal({ isOpen, onClose, employee, currentUser }) {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [forceChangeOnNextLogin, setForceChangeOnNextLogin] = useState(true);
    const [revokeActiveSessions, setRevokeActiveSessions] = useState(true);
    const [copied, setCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [savedPassword, setSavedPassword] = useState('');

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Reset internal state when opened or when employee changes
    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setShowPassword(false);
            setForceChangeOnNextLogin(true);
            setRevokeActiveSessions(true);
            setCopied(false);
            setIsLoading(false);
            setErrorMessage('');
            setIsSuccess(false);
            setSavedPassword('');
        }
    }, [isOpen, employee]);

    if (!isOpen || !employee) return null;

    // Generate a strong, secure 12-character temporary password
    const handleGenerateStrongPassword = () => {
        const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const lowercase = 'abcdefghijkmnopqrstuvwxyz';
        const numbers = '23456789';
        const symbols = '!@#$%^&*()_+~=';

        const u = uppercase[Math.floor(Math.random() * uppercase.length)];
        const l = lowercase[Math.floor(Math.random() * lowercase.length)];
        const n = numbers[Math.floor(Math.random() * numbers.length)];
        const s = symbols[Math.floor(Math.random() * symbols.length)];

        const all = uppercase + lowercase + numbers + symbols;
        const remaining = [];
        for (let i = 0; i < 8; i++) {
            remaining.push(all[Math.floor(Math.random() * all.length)]);
        }

        const generated = [u, l, n, s, ...remaining].sort(() => 0.5 - Math.random()).join('');
        setPassword(generated);
        setShowPassword(true);
        setErrorMessage('');
    };

    // Copy password to clipboard with fallback
    const handleCopyPassword = async (textToCopy) => {
        const text = textToCopy || password;
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (e) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            } catch (err) {
                console.error('Failed to copy text', err);
            }
            document.body.removeChild(textArea);
        }
    };

    // Form submission
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!password || password.trim().length < 8) {
            setErrorMessage('Password must be at least 8 characters long.');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
            const token = localStorage.getItem('token');
            const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const resolvedUser = currentUser?.id ? currentUser : storedUser;
            const headers = {
                'Content-Type': 'application/json',
                'x-user-id': String(resolvedUser?.id || ''),
                'x-org-id': String(resolvedUser?.organization_id || resolvedUser?.org_id || '1')
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`/api/v1/owner/employees/${employee.id}/reset-password`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    newPassword: password.trim(),
                    forceChangeOnNextLogin,
                    revokeActiveSessions
                })
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                setSavedPassword(password.trim());
                setIsSuccess(true);
            } else {
                setErrorMessage(data.error || data.message || 'Failed to reset password. Please try again.');
            }
        } catch (err) {
            console.error('Reset password error:', err);
            setErrorMessage(err.message || 'Network error occurred. Please check connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const employeeFullName = employee.firstName
        ? `${employee.firstName} ${employee.lastName || ''}`.trim()
        : (employee.name || employee.email || 'Employee');

    const employeeInitial = employee.firstName
        ? employee.firstName.charAt(0).toUpperCase()
        : (employeeFullName ? employeeFullName.charAt(0).toUpperCase() : 'E');

    return (
        <div
            className="modal-overlay active owner-reset-password-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resetPasswordModalTitle"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isLoading) onClose();
            }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(3px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
                padding: '1rem',
                opacity: 1,
                visibility: 'visible',
                pointerEvents: 'auto',
                animation: 'fadeIn 0.2s ease-out'
            }}
        >
            <div
                className="modal-card owner-reset-card"
                style={{
                    width: '100%',
                    maxWidth: '520px',
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div
                    className="owner-reset-header"
                    style={{
                        padding: '1.25rem 1.5rem',
                        borderBottom: '1px solid #F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#ffffff'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                            className="owner-reset-header-icon"
                            style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '8px',
                                backgroundColor: '#EFF6FF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#2563EB'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="7.5" cy="15.5" r="5.5" />
                                <path d="m21 2-9.6 9.6" />
                                <path d="m15.5 7.5 3 3L22 7l-3-3" />
                            </svg>
                        </div>
                        <div>
                            <h2
                                id="resetPasswordModalTitle"
                                style={{
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    color: '#0F172A',
                                    margin: 0,
                                    lineHeight: 1.3
                                }}
                            >
                                Reset Employee Password
                            </h2>
                            <p className="owner-reset-header-sub" style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                                Set temporary credentials or custom password
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '1.4rem',
                            color: '#94A3B8',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            lineHeight: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        aria-label="Close modal"
                    >
                        &times;
                    </button>
                </div>

                {/* Target Employee Info Banner */}
                <div
                    className="owner-reset-banner"
                    style={{
                        padding: '0.85rem 1.5rem',
                        backgroundColor: '#F8FAFC',
                        borderBottom: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                            className="owner-reset-banner-avatar"
                            style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                backgroundColor: '#DBEAFE',
                                color: '#1E40AF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.875rem'
                            }}
                        >
                            {employeeInitial}
                        </div>
                        <div>
                            <div className="owner-reset-banner-name" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1E293B' }}>
                                {employeeFullName}
                            </div>
                            <div className="owner-reset-banner-email" style={{ fontSize: '0.775rem', color: '#64748B' }}>
                                {employee.email}
                            </div>
                        </div>
                    </div>
                    {employee.id && (
                        <span
                            className="owner-reset-banner-id"
                            style={{
                                fontSize: '0.725rem',
                                fontFamily: 'monospace',
                                color: '#64748B',
                                backgroundColor: '#E2E8F0',
                                padding: '2px 8px',
                                borderRadius: '4px'
                            }}
                        >
                            ID: {employee.id}
                        </span>
                    )}
                </div>

                {/* Modal Body */}
                <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                    {isSuccess ? (
                        /* SUCCESS VIEW */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div
                                className="owner-reset-success-banner"
                                style={{
                                    backgroundColor: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                    borderRadius: '8px',
                                    padding: '1rem',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.75rem'
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                                <div>
                                    <strong className="owner-reset-success-title" style={{ display: 'block', color: '#065F46', fontSize: '0.925rem' }}>
                                        Password Reset Successfully!
                                    </strong>
                                    <p className="owner-reset-success-desc" style={{ color: '#047857', fontSize: '0.825rem', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                                        The password for <strong>{employee.email}</strong> has been updated. Please share the temporary password with the employee securely.
                                    </p>
                                </div>
                            </div>

                            {/* Temporary Password Box with Copy Button */}
                            <div
                                className="owner-reset-temp-pw-box"
                                style={{
                                    border: '1.5px dashed #93C5FD',
                                    backgroundColor: '#EFF6FF',
                                    borderRadius: '8px',
                                    padding: '1rem 1.25rem'
                                }}
                            >
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                                    New Temporary Password
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                                    <span
                                        style={{
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                            fontSize: '1.15rem',
                                            fontWeight: 700,
                                            color: '#1E3A8A',
                                            letterSpacing: '0.05em',
                                            wordBreak: 'break-all'
                                        }}
                                    >
                                        {savedPassword}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyPassword(savedPassword)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            backgroundColor: copied ? '#10B981' : '#2563EB',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            padding: '0.5rem 0.9rem',
                                            fontSize: '0.825rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            transition: 'background-color 0.2s ease',
                                            flexShrink: 0
                                        }}
                                    >
                                        {copied ? (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                </svg>
                                                Copy Password
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Applied Security Settings summary */}
                            <div className="owner-reset-controls-summary" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem 1rem', fontSize: '0.825rem', color: '#475569' }}>
                                <div style={{ fontWeight: 600, color: '#1E293B', marginBottom: '0.35rem' }}>Applied Controls:</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <span style={{ color: forceChangeOnNextLogin ? '#10B981' : '#94A3B8' }}>{forceChangeOnNextLogin ? '✔' : '✖'}</span>
                                    <span>Require password change on next login: <strong>{forceChangeOnNextLogin ? 'Active' : 'No'}</strong></span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: revokeActiveSessions ? '#10B981' : '#94A3B8' }}>{revokeActiveSessions ? '✔' : '✖'}</span>
                                    <span>Revoke active sessions: <strong>{revokeActiveSessions ? 'Revoked' : 'No'}</strong></span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                <button
                                    className="owner-reset-btn-done"
                                    type="button"
                                    onClick={onClose}
                                    style={{
                                        backgroundColor: '#1E293B',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '0.6rem 1.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* RESET FORM VIEW */
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* Error Banner */}
                            {errorMessage && (
                                <div
                                    className="owner-reset-error-banner"
                                    style={{
                                        backgroundColor: '#FEF2F2',
                                        border: '1px solid #FECACA',
                                        borderRadius: '8px',
                                        padding: '0.75rem 1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.65rem',
                                        color: '#B91C1C',
                                        fontSize: '0.825rem'
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="8" x2="12" y2="12"></line>
                                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                    </svg>
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {/* Password input & generation section */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <label
                                        htmlFor="employeeNewPassword"
                                        style={{
                                            fontSize: '0.825rem',
                                            fontWeight: 600,
                                            color: '#1E293B'
                                        }}
                                    >
                                        New Password <span style={{ color: '#EF4444' }}>*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleGenerateStrongPassword}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.35rem',
                                            background: '#EFF6FF',
                                            color: '#2563EB',
                                            border: '1px solid #BFDBFE',
                                            borderRadius: '5px',
                                            padding: '3px 9px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                        title="Auto-generate a secure 12-character password"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                                        </svg>
                                        Generate Strong Password
                                    </button>
                                </div>

                                <div
                                    style={{
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="employeeNewPassword"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (errorMessage && e.target.value.length >= 8) {
                                                setErrorMessage('');
                                            }
                                        }}
                                        placeholder="Enter password (min 8 characters)"
                                        style={{
                                            width: '100%',
                                            height: '42px',
                                            padding: '0 5rem 0 0.85rem',
                                            border: '1.5px solid #CBD5E1',
                                            borderRadius: '6px',
                                            fontSize: '0.9rem',
                                            fontFamily: password ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : 'inherit',
                                            color: '#0F172A',
                                            backgroundColor: '#ffffff',
                                            boxSizing: 'border-box',
                                            outline: 'none'
                                        }}
                                        autoComplete="new-password"
                                    />

                                    {/* Action buttons inside input: Copy & Show/Hide Eye */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            right: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '2px'
                                        }}
                                    >
                                        {/* Copy button */}
                                        <button
                                            type="button"
                                            onClick={() => handleCopyPassword(password)}
                                            disabled={!password}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: copied ? '#10B981' : (password ? '#64748B' : '#CBD5E1'),
                                                cursor: password ? 'pointer' : 'not-allowed',
                                                padding: '6px 8px',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                lineHeight: 1
                                            }}
                                            title={copied ? 'Copied to clipboard!' : 'Copy to clipboard'}
                                            aria-label="Copy password"
                                        >
                                            {copied ? (
                                                <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                    Copied!
                                                </span>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                </svg>
                                            )}
                                        </button>

                                        {/* Eye toggle icon */}
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#64748B',
                                                cursor: 'pointer',
                                                padding: '6px 8px',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                lineHeight: 1
                                            }}
                                            title={showPassword ? 'Hide password' : 'Show password'}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="owner-reset-pw-hint" style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem' }}>
                                    Minimum 8 characters. You can type a custom password or auto-generate a strong one.
                                </div>
                            </div>

                            {/* Security Control Checkboxes */}
                            <div
                                className="owner-reset-controls-box"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.85rem',
                                    padding: '1rem',
                                    backgroundColor: '#F8FAFC',
                                    borderRadius: '8px',
                                    border: '1px solid #E2E8F0'
                                }}
                            >
                                {/* Checkbox 1: Force change on next login */}
                                <label
                                    htmlFor="chkForceChange"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '0.65rem',
                                        cursor: 'pointer',
                                        userSelect: 'none'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        id="chkForceChange"
                                        checked={forceChangeOnNextLogin}
                                        onChange={(e) => setForceChangeOnNextLogin(e.target.checked)}
                                        style={{
                                            marginTop: '3px',
                                            width: '16px',
                                            height: '16px',
                                            accentColor: '#2563EB',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <div>
                                        <div className="owner-reset-control-title" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }}>
                                            Require password change on next login
                                        </div>
                                        <div className="owner-reset-control-desc" style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.3 }}>
                                            The employee will be required to set a permanent password when they next log in.
                                        </div>
                                    </div>
                                </label>

                                {/* Checkbox 2: Revoke active sessions */}
                                <label
                                    htmlFor="chkRevokeSessions"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '0.65rem',
                                        cursor: 'pointer',
                                        userSelect: 'none'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        id="chkRevokeSessions"
                                        checked={revokeActiveSessions}
                                        onChange={(e) => setRevokeActiveSessions(e.target.checked)}
                                        style={{
                                            marginTop: '3px',
                                            width: '16px',
                                            height: '16px',
                                            accentColor: '#2563EB',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <div>
                                        <div className="owner-reset-control-title" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }}>
                                            Revoke all active sessions
                                        </div>
                                        <div className="owner-reset-control-desc" style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.3 }}>
                                            Immediately signs out the employee across all existing browsers and devices.
                                        </div>
                                    </div>
                                </label>
                            </div>

                            {/* Modal Actions Footer */}
                            <div
                                className="owner-reset-footer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: '0.75rem',
                                    paddingTop: '0.75rem',
                                    borderTop: '1px solid #F1F5F9'
                                }}
                            >
                                <button
                                    className="owner-reset-btn-cancel"
                                    type="button"
                                    onClick={onClose}
                                    disabled={isLoading}
                                    style={{
                                        padding: '0.6rem 1.15rem',
                                        backgroundColor: '#ffffff',
                                        color: '#475569',
                                        border: '1px solid #CBD5E1',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        cursor: isLoading ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.6rem 1.35rem',
                                        backgroundColor: '#2563EB',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        cursor: isLoading ? 'not-allowed' : 'pointer',
                                        opacity: isLoading ? 0.75 : 1,
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                    }}
                                >
                                    {isLoading ? (
                                        <>
                                            <svg
                                                style={{ animation: 'spin 1s linear infinite' }}
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2.5"
                                            >
                                                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12"></circle>
                                            </svg>
                                            Resetting...
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                            Reset Password
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
