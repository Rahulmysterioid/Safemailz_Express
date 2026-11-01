import React, { useState, useEffect, useRef } from 'react';

export default function AutoCcModal({ isOpen, onClose, onSaved }) {
    const [isAutoCcEnabled, setIsAutoCcEnabled] = useState(false);
    const [autoCcEmails, setAutoCcEmails] = useState([]);
    const [emailInput, setEmailInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [inputError, setInputError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [projects, setProjects] = useState([]);

    const inputRef = useRef(null);

    const getHeaders = () => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (user?.id) headers['x-user-id'] = String(user.id);
        if (user?.org_id || user?.organization_id) {
            headers['x-org-id'] = String(user.org_id || user.organization_id);
        }
        return headers;
    };

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
    };

    // Load existing settings and project list
    useEffect(() => {
        if (!isOpen) return;

        setError('');
        setInputError('');
        setSuccessMsg('');
        setEmailInput('');

        const fetchSettings = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/email/settings/auto-cc', { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.success) {
                        setIsAutoCcEnabled(Boolean(data.isAutoCcEnabled));
                        setAutoCcEmails(Array.isArray(data.autoCcEmails) ? data.autoCcEmails : []);
                    }
                }
            } catch (err) {
                console.error('Failed to load auto-cc settings:', err);
                setError('Failed to load Auto CC settings. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        const fetchProjects = async () => {
            try {
                let res = await fetch('/api/projects/my-projects', { headers: getHeaders() });
                if (!res.ok) {
                    res = await fetch('/api/projects', { headers: getHeaders() });
                }
                if (res.ok) {
                    const data = await res.json();
                    const list = data.projects || (Array.isArray(data) ? data : []);
                    setProjects(list);
                }
            } catch (err) {
                console.error('Failed to load projects for auto-cc pills:', err);
            }
        };

        fetchSettings();
        fetchProjects();
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Add a single email or batch
    const addEmails = (candidates) => {
        setInputError('');
        setError('');
        const list = Array.isArray(candidates) ? candidates : [candidates];
        const toAdd = [];
        let hasInvalid = false;
        let hasDuplicate = false;

        list.forEach((raw) => {
            const clean = String(raw || '').trim().toLowerCase();
            if (!clean) return;
            if (!validateEmail(clean)) {
                hasInvalid = true;
                return;
            }
            if (autoCcEmails.includes(clean) || toAdd.includes(clean)) {
                hasDuplicate = true;
                return;
            }
            toAdd.push(clean);
        });

        if (toAdd.length > 0) {
            setAutoCcEmails((prev) => [...prev, ...toAdd]);
            setEmailInput('');
        }

        if (hasInvalid) {
            setInputError('Please enter valid email address(es).');
        } else if (hasDuplicate && toAdd.length === 0) {
            setInputError('This email is already in the Auto CC list.');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',' || e.key === ' ' || e.key === 'Tab') {
            e.preventDefault();
            if (emailInput.trim()) {
                addEmails(emailInput);
            }
        } else if (e.key === 'Backspace' && !emailInput && autoCcEmails.length > 0) {
            // Remove the last email tag on backspace if input is empty
            removeEmail(autoCcEmails.length - 1);
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text');
        if (pasteData) {
            const splitEmails = pasteData.split(/[,;\s\n\r]+/).filter(Boolean);
            addEmails(splitEmails);
        }
    };

    const removeEmail = (index) => {
        setAutoCcEmails((prev) => prev.filter((_, i) => i !== index));
        setInputError('');
    };

    const handleAddProjectEmail = (project) => {
        const pEmail =
            project.projectEmailId ||
            project.project_email_id ||
            `${String(project.projectName || project.project_name || 'project')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')}@safemailz.com`;

        addEmails(pEmail);
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccessMsg('');

        // If user typed an email but didn't press enter, add it automatically
        let finalEmails = [...autoCcEmails];
        if (emailInput.trim()) {
            const clean = emailInput.trim().toLowerCase();
            if (validateEmail(clean) && !finalEmails.includes(clean)) {
                finalEmails.push(clean);
                setAutoCcEmails(finalEmails);
                setEmailInput('');
            } else if (!validateEmail(clean)) {
                setError(`Cannot save: "${clean}" is not a valid email address.`);
                setSaving(false);
                return;
            }
        }

        try {
            const payload = {
                isAutoCcEnabled: Boolean(isAutoCcEnabled),
                autoCcEmails: finalEmails
            };

            const res = await fetch('/api/email/settings/auto-cc', {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setIsAutoCcEnabled(Boolean(data.isAutoCcEnabled));
                setAutoCcEmails(Array.isArray(data.autoCcEmails) ? data.autoCcEmails : finalEmails);
                setSuccessMsg('Auto CC configuration successfully saved!');

                // Dispatch global event so sidebar and composer react immediately
                window.dispatchEvent(
                    new CustomEvent('autocc-settings-updated', {
                        detail: {
                            isAutoCcEnabled: Boolean(data.isAutoCcEnabled),
                            autoCcEmails: Array.isArray(data.autoCcEmails) ? data.autoCcEmails : finalEmails
                        }
                    })
                );

                if (typeof onSaved === 'function') {
                    onSaved({
                        isAutoCcEnabled: Boolean(data.isAutoCcEnabled),
                        autoCcEmails: Array.isArray(data.autoCcEmails) ? data.autoCcEmails : finalEmails
                    });
                }

                setTimeout(() => {
                    setSuccessMsg('');
                }, 3500);
            } else {
                setError(data.error || 'Failed to save Auto CC settings.');
            }
        } catch (err) {
            console.error('Save Auto CC error:', err);
            setError('Network error while saving settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    // Pastel palette variations for chips
    const chipColors = [
        { bg: '#EFF6FF', text: '#1D4ED8', border: '#DBEAFE' }, // Royal Blue pastel
        { bg: '#F0FDF4', text: '#059669', border: '#BBF7D0' }, // Emerald pastel
        { bg: '#FAF5FF', text: '#7E22CE', border: '#E9D5FF' }, // Purple pastel
        { bg: '#FFF7ED', text: '#C2410C', border: '#FFEDD5' }, // Amber/Orange pastel
        { bg: '#ECFEFF', text: '#0E7490', border: '#CFFAFE' }  // Cyan pastel
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)'
            }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col"
                style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '580px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: '1px solid #E2E8F0'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with Safemailz Royal Blue Accent */}
                <div
                    className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between"
                    style={{
                        padding: '18px 24px',
                        borderBottom: '1px solid #F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#FAFAFA'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '12px',
                                backgroundColor: '#1D4ED8',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 10px rgba(29, 78, 216, 0.25)'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
                                Auto CC Configuration
                            </h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                                Automatically include designated CC recipients on all outgoing emails
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        title="Close"
                        style={{
                            border: 'none',
                            background: '#F1F5F9',
                            cursor: 'pointer',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748B',
                            fontSize: '14px',
                            fontWeight: 600,
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#E2E8F0';
                            e.currentTarget.style.color = '#0F172A';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#F1F5F9';
                            e.currentTarget.style.color = '#64748B';
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Body Content */}
                <div
                    className="p-6 overflow-y-auto"
                    style={{
                        padding: '24px',
                        overflowY: 'auto',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px'
                    }}
                >
                    {/* Alerts */}
                    {error && (
                        <div
                            style={{
                                padding: '12px 14px',
                                backgroundColor: '#FEF2F2',
                                border: '1px solid #FECACA',
                                color: '#991B1B',
                                fontSize: '12.5px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <span style={{ fontSize: '15px' }}>⚠</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {successMsg && (
                        <div
                            style={{
                                padding: '12px 14px',
                                backgroundColor: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                color: '#065F46',
                                fontSize: '12.5px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <span style={{ fontSize: '15px' }}>✓</span>
                            <span>{successMsg}</span>
                        </div>
                    )}

                    {/* Master ON/OFF Toggle Card */}
                    <div
                        style={{
                            padding: '16px 18px',
                            borderRadius: '12px',
                            backgroundColor: isAutoCcEnabled ? '#F0FDF4' : '#F8FAFC',
                            border: `1.5px solid ${isAutoCcEnabled ? '#86EFAC' : '#E2E8F0'}`,
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px'
                        }}
                    >
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                                    Enable Auto CC for all outgoing mails
                                </span>
                                {/* Vibrant Status Badge */}
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '2px 9px',
                                        borderRadius: '9999px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        backgroundColor: isAutoCcEnabled ? '#DCFCE7' : '#E2E8F0',
                                        color: isAutoCcEnabled ? '#15803D' : '#64748B',
                                        border: `1px solid ${isAutoCcEnabled ? '#86EFAC' : '#CBD5E1'}`
                                    }}
                                >
                                    <span
                                        style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            backgroundColor: isAutoCcEnabled ? '#16A34A' : '#94A3B8',
                                            boxShadow: isAutoCcEnabled ? '0 0 6px #22C55E' : 'none'
                                        }}
                                    ></span>
                                    {isAutoCcEnabled ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: '1.4' }}>
                                When enabled, Safemailz will automatically pre-fill and include your configured CC recipients on all outgoing messages.
                            </p>
                        </div>

                        {/* Emerald Toggle Switch */}
                        <button
                            type="button"
                            role="switch"
                            aria-checked={isAutoCcEnabled}
                            onClick={() => setIsAutoCcEnabled(!isAutoCcEnabled)}
                            style={{
                                width: '48px',
                                height: '26px',
                                borderRadius: '9999px',
                                backgroundColor: isAutoCcEnabled ? '#10B981' : '#CBD5E1',
                                border: 'none',
                                cursor: 'pointer',
                                position: 'relative',
                                padding: '2px',
                                transition: 'background-color 0.2s ease',
                                flexShrink: 0,
                                outline: 'none',
                                boxShadow: isAutoCcEnabled ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none'
                            }}
                        >
                            <span
                                style={{
                                    display: 'block',
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    backgroundColor: '#FFFFFF',
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                                    transform: isAutoCcEnabled ? 'translateX(22px)' : 'translateX(0px)',
                                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            ></span>
                        </button>
                    </div>

                    {/* Email Chip Input Field */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                                Auto CC Recipients
                            </label>
                            <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                                {autoCcEmails.length} recipient{autoCcEmails.length === 1 ? '' : 's'} added
                            </span>
                        </div>

                        {/* Interactive Chips Container */}
                        <div
                            onClick={() => inputRef.current?.focus()}
                            style={{
                                minHeight: '80px',
                                padding: '10px 12px',
                                borderRadius: '12px',
                                border: `1.5px solid ${inputError ? '#F87171' : '#CBD5E1'}`,
                                backgroundColor: '#FFFFFF',
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'text',
                                transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#1D4ED8';
                                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(29, 78, 216, 0.12)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = inputError ? '#F87171' : '#CBD5E1';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            {/* Colorful Pastel Email Chips */}
                            {autoCcEmails.map((email, idx) => {
                                const color = chipColors[idx % chipColors.length];
                                return (
                                    <div
                                        key={email}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            backgroundColor: color.bg,
                                            border: `1px solid ${color.border}`,
                                            color: color.text,
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            animation: 'fadeIn 0.15s ease-in'
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                            <polyline points="22,6 12,13 2,6"></polyline>
                                        </svg>
                                        <span>{email}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeEmail(idx);
                                            }}
                                            title="Remove recipient"
                                            style={{
                                                border: 'none',
                                                background: 'transparent',
                                                cursor: 'pointer',
                                                color: color.text,
                                                padding: '0 2px',
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                lineHeight: 1,
                                                opacity: 0.7,
                                                transition: 'opacity 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                );
                            })}

                            {/* Inline Input */}
                            <input
                                ref={inputRef}
                                type="text"
                                value={emailInput}
                                onChange={(e) => {
                                    setEmailInput(e.target.value);
                                    setInputError('');
                                }}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                placeholder={autoCcEmails.length === 0 ? "Type email address and press Enter or Comma..." : "Add another..."}
                                style={{
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '12.5px',
                                    color: '#0F172A',
                                    minWidth: '200px',
                                    flex: 1,
                                    padding: '4px 2px',
                                    backgroundColor: 'transparent'
                                }}
                            />
                        </div>

                        {/* Helper / Validation message */}
                        {inputError ? (
                            <span style={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 500 }}>
                                ⚠ {inputError}
                            </span>
                        ) : (
                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                                Press <kbd style={{ padding: '1px 4px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '10px' }}>Enter</kbd>, <kbd style={{ padding: '1px 4px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '10px' }}>Comma</kbd>, or <kbd style={{ padding: '1px 4px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '10px' }}>Space</kbd> to add. Paste comma-separated lists to add in bulk.
                            </span>
                        )}
                    </div>

                    {/* Project Quick-Pick Pills */}
                    {projects.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                                    📁 Quick pick from projects:
                                </span>
                                <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                                    Click to add project address
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                                {projects.map((p) => {
                                    const projName = p.projectName || p.project_name || 'Project';
                                    const projEmail =
                                        p.projectEmailId ||
                                        p.project_email_id ||
                                        `${projName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.team@safemailz.com`;

                                    const isAdded = autoCcEmails.includes(projEmail.toLowerCase());

                                    return (
                                        <button
                                            key={p.id || projName}
                                            type="button"
                                            onClick={() => handleAddProjectEmail(p)}
                                            disabled={isAdded}
                                            style={{
                                                border: `1px solid ${isAdded ? '#CBD5E1' : '#E2E8F0'}`,
                                                backgroundColor: isAdded ? '#F1F5F9' : '#FFFFFF',
                                                color: isAdded ? '#94A3B8' : '#334155',
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontSize: '11.5px',
                                                fontWeight: 500,
                                                cursor: isAdded ? 'default' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                transition: 'all 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isAdded) {
                                                    e.currentTarget.style.backgroundColor = '#EFF6FF';
                                                    e.currentTarget.style.borderColor = '#93C5FD';
                                                    e.currentTarget.style.color = '#1D4ED8';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isAdded) {
                                                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                                                    e.currentTarget.style.borderColor = '#E2E8F0';
                                                    e.currentTarget.style.color = '#334155';
                                                }
                                            }}
                                        >
                                            <span>{isAdded ? '✓' : '+'}</span>
                                            <span>{projName}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div
                    style={{
                        padding: '16px 24px',
                        backgroundColor: '#F8FAFC',
                        borderTop: '1px solid #F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                    }}
                >
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                        {isAutoCcEnabled ? (
                            <span style={{ color: '#059669', fontWeight: 600 }}>
                                ● Auto CC is active with {autoCcEmails.length} recipient{autoCcEmails.length === 1 ? '' : 's'}
                            </span>
                        ) : (
                            <span>Auto CC is currently disabled</span>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '10px',
                                border: '1px solid #CBD5E1',
                                backgroundColor: '#FFFFFF',
                                color: '#334155',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || loading}
                            style={{
                                padding: '8px 20px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: '#1D4ED8',
                                color: '#FFFFFF',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: (saving || loading) ? 'not-allowed' : 'pointer',
                                opacity: (saving || loading) ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(29, 78, 216, 0.3)',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (!saving && !loading) {
                                    e.currentTarget.style.backgroundColor = '#1E40AF';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!saving && !loading) {
                                    e.currentTarget.style.backgroundColor = '#1D4ED8';
                                }
                            }}
                        >
                            {saving ? (
                                <>
                                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #FFFFFF', borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }}></span>
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <span>Save Changes</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
