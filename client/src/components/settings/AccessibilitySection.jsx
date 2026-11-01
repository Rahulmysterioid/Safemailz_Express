import React, { useState } from 'react';
import { useGeneralSettings } from '../../context/GeneralSettingsContext';

export default function AccessibilitySection() {
    const {
        draftSettings,
        settings,
        updateGeneralSettings,
        saveGeneralSettings,
        discardGeneralSettings,
        isSliceDirty,
        isSaving
    } = useGeneralSettings();

    const [toastMessage, setToastMessage] = useState(null);

    const values = draftSettings?.accessibility || settings?.accessibility || {
        shortcutProfile: 'outlook',
        keyboardShortcutMode: 'outlook',
        highContrast: false,
        fontScale: 'default',
        reduceMotion: false,
        askEmptySubject: true
    };

    const isDirty = isSliceDirty('accessibility');

    const handleShortcutProfileChange = (profile) => {
        updateGeneralSettings('accessibility', {
            shortcutProfile: profile,
            keyboardShortcutMode: profile
        });
    };

    const handleToggle = (key, value) => {
        updateGeneralSettings('accessibility', { [key]: value });
    };

    const handleFontScaleChange = (scale) => {
        updateGeneralSettings('accessibility', { fontScale: scale });
    };

    const handleSave = async () => {
        const res = await saveGeneralSettings('accessibility');
        if (res?.success) {
            setToastMessage('Accessibility preferences saved.');
            setTimeout(() => setToastMessage(null), 3000);
        }
    };

    const handleDiscard = () => {
        discardGeneralSettings('accessibility');
    };

    const activeProfile = values.shortcutProfile || values.keyboardShortcutMode || 'outlook';
    const activeFontScale = values.fontScale || 'default';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
            {/* Header description */}
            <p className="settings-float-section-desc" style={{ margin: '0', color: 'var(--text-secondary, #616161)', fontSize: '13.5px' }}>
                Configure keyboard shortcuts, screen contrast, text scaling, and animation ergonomics across Safemailz.
            </p>

            {/* Section 1: Keyboard Shortcuts Mode */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #242424)' }}>
                        Keyboard shortcuts
                    </label>
                    <p style={{ margin: '2px 0 0', color: 'var(--text-secondary, #616161)', fontSize: '12.5px' }}>
                        Choose your preferred single-key shortcut mappings for fast email navigation.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '520px' }}>
                    {[
                        { id: 'outlook', label: 'Outlook.com / Safemailz shortcuts', desc: 'Press N for new mail, / for global search, Esc to close dialogs.' },
                        { id: 'gmail', label: 'Gmail shortcuts', desc: 'Press C for compose, / for global search, Esc to close dialogs.' },
                        { id: 'off', label: 'Turn off keyboard shortcuts', desc: 'Disable single-letter shortcut triggers completely.' }
                    ].map(p => (
                        <label
                            key={p.id}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '10px 14px',
                                border: `1px solid ${activeProfile === p.id ? 'var(--accent-primary, #0078d4)' : 'var(--border-subtle, #e2e8f0)'}`,
                                borderRadius: '6px',
                                background: activeProfile === p.id ? 'var(--accent-subtle, #f0f9ff)' : 'var(--surface-card, #ffffff)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <input
                                type="radio"
                                name="shortcutProfile"
                                checked={activeProfile === p.id}
                                onChange={() => handleShortcutProfileChange(p.id)}
                                style={{ accentColor: 'var(--accent-primary, #0078d4)', marginTop: '3px', cursor: 'pointer' }}
                            />
                            <div>
                                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>
                                    {p.label}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                                    {p.desc}
                                </div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Section 2: Visual & Screen Ergonomics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '560px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #0f172a)', margin: 0, borderBottom: '1px solid var(--border-subtle, #e2e8f0)', paddingBottom: '6px' }}>
                    Visual & screen ergonomics
                </h4>

                {/* High contrast toggle */}
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div>
                        <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-primary, #334155)' }}>
                            High contrast mode
                        </span>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                            Sharpen borders, text contrast, and outline visibility for low-vision clarity.
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={!!values.highContrast}
                        onChange={(e) => handleToggle('highContrast', e.target.checked)}
                        style={{ accentColor: 'var(--accent-primary, #0078d4)', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                </label>

                {/* Font Scaling */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary, #334155)' }}>
                        Larger text / Increase font scale
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {[
                            { id: 'default', label: 'Default (100%)' },
                            { id: 'large', label: 'Large (110%)' },
                            { id: 'extralarge', label: 'Extra Large (125%)' }
                        ].map(s => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => handleFontScaleChange(s.id)}
                                style={{
                                    flex: 1,
                                    padding: '8px 10px',
                                    border: `1.5px solid ${activeFontScale === s.id ? 'var(--accent-primary, #0078d4)' : 'var(--border-subtle, #cbd5e1)'}`,
                                    background: activeFontScale === s.id ? 'var(--accent-subtle, #eff6ff)' : 'var(--surface-card, #ffffff)',
                                    color: activeFontScale === s.id ? 'var(--accent-primary, #0078d4)' : 'var(--text-primary, #334155)',
                                    fontWeight: activeFontScale === s.id ? 600 : 500,
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Reduce Motion */}
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', paddingTop: '4px' }}>
                    <div>
                        <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-primary, #334155)' }}>
                            Reduce motion and animations
                        </span>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                            Minimize transitions, page slides, and spinning animations.
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={!!values.reduceMotion}
                        onChange={(e) => handleToggle('reduceMotion', e.target.checked)}
                        style={{ accentColor: 'var(--accent-primary, #0078d4)', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                </label>

                {/* Empty Subject Confirmation */}
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', paddingTop: '4px' }}>
                    <div>
                        <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-primary, #334155)' }}>
                            Ask before sending emails with empty subject line
                        </span>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                            Alert me to avoid accidentally sending blank subjects.
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={!!values.askEmptySubject}
                        onChange={(e) => handleToggle('askEmptySubject', e.target.checked)}
                        style={{ accentColor: 'var(--accent-primary, #0078d4)', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                </label>
            </div>

            {/* Toast Feedback */}
            {toastMessage && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    background: '#10b981',
                    color: '#ffffff',
                    padding: '10px 18px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '13.5px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                    zIndex: 99999
                }}>
                    ✓ {toastMessage}
                </div>
            )}

            {/* Save / Discard Action Bar */}
            {isDirty && (
                <div
                    style={{
                        position: 'sticky',
                        bottom: 0,
                        background: 'var(--surface-card, #ffffff)',
                        borderTop: '1px solid var(--border-subtle, #e2e8f0)',
                        padding: '14px 0 4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        zIndex: 10,
                        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.04)'
                    }}
                >
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{
                            padding: '7px 22px',
                            background: 'var(--accent-primary, #0078d4)',
                            color: 'var(--accent-text, #ffffff)',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            opacity: isSaving ? 0.7 : 1,
                            transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => { if (!isSaving) e.currentTarget.style.background = 'var(--accent-hover, #0067b8)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent-primary, #0078d4)'; }}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        type="button"
                        onClick={handleDiscard}
                        disabled={isSaving}
                        style={{
                            padding: '7px 18px',
                            background: 'var(--surface-card, #ffffff)',
                            color: 'var(--text-primary, #334155)',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-subtle, #f8fafc)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-card, #ffffff)'; }}
                    >
                        Discard
                    </button>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                        Unsaved changes
                    </span>
                </div>
            )}
        </div>
    );
}
