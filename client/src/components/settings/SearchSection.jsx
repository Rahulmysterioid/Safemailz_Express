import React, { useState } from 'react';
import { useGeneralSettings } from '../../context/GeneralSettingsContext';

export default function SearchSection() {
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

    const values = draftSettings?.search || settings?.search || {
        scope: 'all',
        searchScope: 'all_folders',
        includeDeleted: false,
        suggestions: true,
        showSuggestions: true,
        pageSize: 25
    };

    const isDirty = isSliceDirty('search');

    const handleScopeChange = (scopeValue) => {
        const searchScopeAlias = scopeValue === 'all' ? 'all_folders' : (scopeValue === 'current' ? 'current_folder' : 'exclude_deleted_junk');
        updateGeneralSettings('search', {
            scope: scopeValue,
            searchScope: searchScopeAlias
        });
    };

    const handleToggle = (key, value) => {
        const patch = { [key]: value };
        if (key === 'suggestions') patch.showSuggestions = value;
        updateGeneralSettings('search', patch);
    };

    const handlePageSizeChange = (e) => {
        const size = parseInt(e.target.value, 10) || 25;
        updateGeneralSettings('search', { pageSize: size });
    };

    const handleSave = async () => {
        const res = await saveGeneralSettings('search');
        if (res?.success) {
            setToastMessage('Search preferences saved.');
            setTimeout(() => setToastMessage(null), 3000);
        }
    };

    const handleDiscard = () => {
        discardGeneralSettings('search');
    };

    const currentScope = values.scope || (values.searchScope === 'current_folder' ? 'current' : 'all');
    const currentPageSize = values.pageSize || 25;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
            {/* Header description */}
            <p className="settings-float-section-desc" style={{ margin: '0', color: 'var(--text-secondary, #616161)', fontSize: '13.5px' }}>
                Configure default search folder scope, deleted items exclusions, and query suggestion behaviors in Safemailz.
            </p>

            {/* Section 1: Search Scope */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #242424)' }}>
                        When searching, include results from:
                    </label>
                    <p style={{ margin: '2px 0 0', color: 'var(--text-secondary, #616161)', fontSize: '12.5px' }}>
                        Choose which folders are queried by default when you use the search bar.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '520px' }}>
                    {[
                        {
                            id: 'all',
                            label: 'All folders',
                            desc: 'Search across your entire mailbox including Inbox, Sent, Archive, and custom folders.'
                        },
                        {
                            id: 'current',
                            label: 'Current folder',
                            desc: 'Only look for emails inside the folder you are currently viewing.'
                        },
                        {
                            id: 'exclude_deleted_junk',
                            label: 'All folders except Deleted Items and Junk Email',
                            desc: 'Recommended. Focus search on active mail and ignore trash and spam folders.'
                        }
                    ].map(s => (
                        <label
                            key={s.id}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '10px 14px',
                                border: `1px solid ${currentScope === s.id ? 'var(--accent-primary, #0078d4)' : 'var(--border-subtle, #e2e8f0)'}`,
                                borderRadius: '6px',
                                background: currentScope === s.id ? 'var(--accent-subtle, #f0f9ff)' : 'var(--surface-card, #ffffff)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <input
                                type="radio"
                                name="searchScope"
                                checked={currentScope === s.id}
                                onChange={() => handleScopeChange(s.id)}
                                style={{ accentColor: 'var(--accent-primary, #0078d4)', marginTop: '3px', cursor: 'pointer' }}
                            />
                            <div>
                                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>
                                    {s.label}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                                    {s.desc}
                                </div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Section 2: Deleted Items Toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '560px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #0f172a)', margin: 0, borderBottom: '1px solid var(--border-subtle, #e2e8f0)', paddingBottom: '6px' }}>
                    Deleted items
                </h4>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div>
                        <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-primary, #334155)' }}>
                            Include Deleted Items in search results
                        </span>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                            When enabled, emails located in the trash folder will be returned alongside active results.
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={!!values.includeDeleted}
                        onChange={(e) => handleToggle('includeDeleted', e.target.checked)}
                        style={{ accentColor: 'var(--accent-primary, #0078d4)', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                </label>
            </div>

            {/* Section 3: Search Suggestions & Results Pagination */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '560px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #0f172a)', margin: 0, borderBottom: '1px solid var(--border-subtle, #e2e8f0)', paddingBottom: '6px' }}>
                    Suggestions & page size
                </h4>

                {/* Suggestions toggle */}
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div>
                        <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-primary, #334155)' }}>
                            Show recent searches and top suggestions as I type
                        </span>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                            Display auto-complete dropdown with frequent senders and recent query keywords.
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={values.suggestions !== false}
                        onChange={(e) => handleToggle('suggestions', e.target.checked)}
                        style={{ accentColor: 'var(--accent-primary, #0078d4)', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                </label>

                {/* Max Results Per Page Dropdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary, #334155)' }}>
                        Maximum results per page
                    </label>
                    <select
                        value={currentPageSize}
                        onChange={handlePageSizeChange}
                        style={{
                            maxWidth: '320px',
                            padding: '8px 12px',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            borderRadius: '4px',
                            fontSize: '13.5px',
                            color: 'var(--text-primary, #1e293b)',
                            background: 'var(--surface-card, #ffffff)',
                            cursor: 'pointer'
                        }}
                    >
                        <option value={25}>25 results per page</option>
                        <option value={50}>50 results per page</option>
                        <option value={100}>100 results per page</option>
                    </select>
                    <small style={{ color: 'var(--text-secondary, #64748b)', fontSize: '12px' }}>
                        Controls how many matching emails are displayed per search results page.
                    </small>
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
