import React, { useState } from 'react';
import { useGeneralSettings } from '../../context/GeneralSettingsContext';

export default function PrivacyDataSection() {
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
    const [isClearing, setIsClearing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isExportingHistory, setIsExportingHistory] = useState(false);

    const values = draftSettings?.privacyData || settings?.privacyData || {
        externalImages: 'proxy',
        readReceipts: true,
        allowReadReceipts: true,
        searchHistoryEnabled: true
    };

    const isDirty = isSliceDirty('privacyData');

    const handleExternalImagesChange = (mode) => {
        updateGeneralSettings('privacyData', { externalImages: mode });
    };

    const handleToggle = (key, value) => {
        const patch = { [key]: value };
        if (key === 'readReceipts') patch.allowReadReceipts = value;
        updateGeneralSettings('privacyData', patch);
    };

    const handleClearSearchHistory = async () => {
        if (!window.confirm('Are you sure you want to clear your saved search history? This cannot be undone.')) {
            return;
        }
        try {
            setIsClearing(true);
            const userStr = localStorage.getItem('currentUser');
            const token = localStorage.getItem('token');
            const headers = { 'Accept': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (userStr) {
                try {
                    const u = JSON.parse(userStr);
                    if (u.id) headers['x-user-id'] = String(u.id);
                } catch {}
            }

            const res = await fetch('/api/settings/search-history', {
                method: 'DELETE',
                headers
            });

            if (res.ok) {
                setToastMessage('Search history cleared successfully.');
                setTimeout(() => setToastMessage(null), 3500);
            } else {
                setToastMessage('Failed to clear search history.');
                setTimeout(() => setToastMessage(null), 3500);
            }
        } catch (err) {
            console.error('Failed to clear search history:', err);
            setToastMessage('Error connecting to server.');
            setTimeout(() => setToastMessage(null), 3500);
        } finally {
            setIsClearing(false);
        }
    };

    const handleExportSearchHistory = async () => {
        try {
            setIsExportingHistory(true);
            const userStr = localStorage.getItem('currentUser');
            const token = localStorage.getItem('token');
            const headers = { 'Accept': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (userStr) {
                try {
                    const u = JSON.parse(userStr);
                    if (u.id) headers['x-user-id'] = String(u.id);
                } catch {}
            }

            const res = await fetch('/api/settings/search-history?format=csv', { headers });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `safemailz_search_history_${Date.now()}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                setToastMessage('Search history exported successfully.');
                setTimeout(() => setToastMessage(null), 3500);
            } else {
                setToastMessage('Failed to export search history.');
                setTimeout(() => setToastMessage(null), 3500);
            }
        } catch (err) {
            console.error('Failed to export search history:', err);
            setToastMessage('Error exporting search history.');
            setTimeout(() => setToastMessage(null), 3500);
        } finally {
            setIsExportingHistory(false);
        }
    };

    const handleDownloadAccountData = async () => {
        try {
            setIsExporting(true);
            const userStr = localStorage.getItem('currentUser');
            const token = localStorage.getItem('token');
            const headers = { 'Accept': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (userStr) {
                try {
                    const u = JSON.parse(userStr);
                    if (u.id) headers['x-user-id'] = String(u.id);
                } catch {}
            }

            const res = await fetch('/api/settings/export-data', { headers });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `safemailz_export_${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                setToastMessage('Account data export downloaded.');
                setTimeout(() => setToastMessage(null), 3500);
            } else {
                setToastMessage('Export failed. Please try again.');
                setTimeout(() => setToastMessage(null), 3500);
            }
        } catch (err) {
            console.error('Failed to export account data:', err);
            setToastMessage('Error downloading account data.');
            setTimeout(() => setToastMessage(null), 3500);
        } finally {
            setIsExporting(false);
        }
    };

    const handleSave = async () => {
        const res = await saveGeneralSettings('privacyData');
        if (res?.success) {
            setToastMessage('Privacy settings saved.');
            setTimeout(() => setToastMessage(null), 3000);
        }
    };

    const handleDiscard = () => {
        discardGeneralSettings('privacyData');
    };

    const currentExternalImages = values.externalImages || 'proxy';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
            {/* Header description */}
            <p className="settings-float-section-desc" style={{ margin: '0', color: 'var(--text-secondary, #616161)', fontSize: '13.5px' }}>
                Manage search history storage, external image proxy tracking protections, read receipts, and export your personal account data.
            </p>

            {/* Section 1: Search History */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '580px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #0f172a)', margin: 0, borderBottom: '1px solid var(--border-subtle, #e2e8f0)', paddingBottom: '6px' }}>
                    Search history
                </h4>
                <p style={{ margin: '0', color: 'var(--text-secondary, #64748b)', fontSize: '12.5px' }}>
                    Manage your search history stored in Safemailz. Safemailz stores your recent search queries locally in your account database to accelerate query suggestions and recent search lookups.
                </p>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', paddingTop: '4px' }}>
                    <div>
                        <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-primary, #334155)' }}>
                            Log search query history
                        </span>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                            Save queries as you search for quick re-access and smart suggestions.
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={values.searchHistoryEnabled !== false}
                        onChange={(e) => handleToggle('searchHistoryEnabled', e.target.checked)}
                        style={{ accentColor: 'var(--accent-primary, #0078d4)', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                </label>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                        type="button"
                        onClick={handleClearSearchHistory}
                        disabled={isClearing}
                        style={{
                            padding: '7px 16px',
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fecaca',
                            borderRadius: '4px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: isClearing ? 'not-allowed' : 'pointer',
                            opacity: isClearing ? 0.6 : 1,
                            transition: 'all 0.15s ease'
                        }}
                    >
                        {isClearing ? 'Clearing...' : 'Clear search history'}
                    </button>
                    <button
                        type="button"
                        onClick={handleExportSearchHistory}
                        disabled={isExportingHistory}
                        style={{
                            padding: '7px 16px',
                            background: 'var(--surface-card, #ffffff)',
                            color: 'var(--text-primary, #0f172a)',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            borderRadius: '4px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: isExportingHistory ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: isExportingHistory ? 0.6 : 1,
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <span>📥</span> {isExportingHistory ? 'Exporting...' : 'Export search history'}
                    </button>
                </div>
            </div>

            {/* Section 2: External Images */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '580px' }}>
                <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #0f172a)', margin: 0, borderBottom: '1px solid var(--border-subtle, #e2e8f0)', paddingBottom: '6px' }}>
                        External images in emails
                    </h4>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #64748b)', fontSize: '12.5px' }}>
                        Choose how Safemailz renders remote images linked inside email bodies to prevent marketing tracker pixels.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                        {
                            id: 'proxy',
                            title: 'Always use the Safemailz proxy to load external images',
                            desc: 'Recommended. Masks your IP address and geographic location from email trackers.'
                        },
                        {
                            id: 'ask',
                            title: 'Ask before showing external images',
                            desc: 'Protects privacy by blocking all remote images until you approve each sender individually.'
                        }
                    ].map(opt => (
                        <label
                            key={opt.id}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '10px 14px',
                                border: `1px solid ${currentExternalImages === opt.id ? 'var(--accent-primary, #0078d4)' : 'var(--border-subtle, #e2e8f0)'}`,
                                borderRadius: '6px',
                                background: currentExternalImages === opt.id ? 'var(--accent-subtle, #f0f9ff)' : 'var(--surface-card, #ffffff)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <input
                                type="radio"
                                name="externalImages"
                                checked={currentExternalImages === opt.id}
                                onChange={() => handleExternalImagesChange(opt.id)}
                                style={{ accentColor: 'var(--accent-primary, #0078d4)', marginTop: '3px', cursor: 'pointer' }}
                            />
                            <div>
                                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>
                                    {opt.title}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                                    {opt.desc}
                                </div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Section 3: Read Receipts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '580px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #0f172a)', margin: 0, borderBottom: '1px solid var(--border-subtle, #e2e8f0)', paddingBottom: '6px' }}>
                    Read receipts & confirmations
                </h4>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div>
                        <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-primary, #334155)' }}>
                            Allow read receipts to be sent
                        </span>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                            Respond to senders who request read notifications when you open their messages.
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={values.readReceipts !== false}
                        onChange={(e) => handleToggle('readReceipts', e.target.checked)}
                        style={{ accentColor: 'var(--accent-primary, #0078d4)', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                </label>
            </div>

            {/* Section 4: Export Data */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '580px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #0f172a)', margin: 0, borderBottom: '1px solid var(--border-subtle, #e2e8f0)', paddingBottom: '6px' }}>
                    Account data & portability
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary, #64748b)', fontSize: '12.5px' }}>
                    Download a complete copy of your personal settings, profile metadata, search history, and email records in JSON format (GDPR compliant).
                </p>

                <div>
                    <button
                        type="button"
                        onClick={handleDownloadAccountData}
                        disabled={isExporting}
                        style={{
                            padding: '8px 18px',
                            background: 'var(--surface-card, #ffffff)',
                            color: 'var(--text-primary, #0f172a)',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            borderRadius: '4px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: isExporting ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        <span>📥</span> {isExporting ? 'Generating JSON export...' : 'Download my account data'}
                    </button>
                </div>
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
