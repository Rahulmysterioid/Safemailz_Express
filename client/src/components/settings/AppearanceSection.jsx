import React, { useState } from 'react';
import { useGeneralSettings, ACCENT_COLORS } from '../../context/GeneralSettingsContext';

export default function AppearanceSection() {
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

    const values = draftSettings?.appearance || settings?.appearance || {
        theme: 'light',
        mode: 'light',
        accentColor: 'Classic Blue',
        accentHex: '#0078d4',
        themeColor: 'classic-blue',
        density: 'cozy'
    };

    const isDirty = isSliceDirty('appearance');

    const handleThemeSelect = (themeMode) => {
        updateGeneralSettings('appearance', {
            theme: themeMode,
            mode: themeMode
        });
    };

    const handleAccentSelect = (swatch) => {
        updateGeneralSettings('appearance', {
            accentColor: swatch.name,
            accentHex: swatch.hex,
            themeColor: swatch.name.toLowerCase().replace(/\s+/g, '-')
        });
    };

    const handleDensitySelect = (densityValue) => {
        updateGeneralSettings('appearance', {
            density: densityValue
        });
    };

    const handleSave = async () => {
        const res = await saveGeneralSettings('appearance');
        if (res?.success) {
            setToastMessage('Appearance preferences saved.');
            setTimeout(() => setToastMessage(null), 3000);
        }
    };

    const handleDiscard = () => {
        discardGeneralSettings('appearance');
    };

    const currentTheme = values.theme || values.mode || 'light';
    const currentAccent = values.accentColor || 'Classic Blue';
    const currentDensity = values.density || 'cozy';

    return (
        <div className="flex flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
            {/* Header description */}
            <p className="settings-float-section-desc text-slate-500 dark:text-slate-400 text-xs m-0">
                Customize your theme mode, modern accent color palette, and display density across Safemailz.
            </p>

            {/* Section 1: Dark Mode / Theme Mode */}
            <div className="flex flex-col gap-2.5" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label className="text-sm font-semibold text-slate-900 dark:text-white">
                    Dark mode
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px', maxWidth: '520px' }}>
                    {/* Light Option */}
                    <div
                        onClick={() => handleThemeSelect('light')}
                        className={`rounded-lg p-3 cursor-pointer flex flex-col items-center gap-2 transition-all ${
                            currentTheme === 'light'
                                ? 'border-2 border-[var(--accent-primary,#0078d4)] shadow-xs'
                                : 'border border-slate-200 dark:border-[#3d3d3d] hover:border-slate-300 dark:hover:border-[#525252]'
                        } bg-white dark:bg-[#292929]`}
                        style={{
                            borderColor: currentTheme === 'light' ? 'var(--accent-primary, #0078d4)' : undefined,
                            borderWidth: '2px'
                        }}
                    >
                        {/* Mini preview illustration */}
                        <div style={{
                            width: '100%',
                            height: '56px',
                            borderRadius: '5px',
                            border: '1px solid #d1d5db',
                            background: '#f8fafc',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{ height: '14px', background: 'var(--accent-primary, #0078d4)' }} />
                            <div style={{ display: 'flex', flex: 1 }}>
                                <div style={{ width: '22%', background: '#e2e8f0', borderRight: '1px solid #cbd5e1' }} />
                                <div style={{ flex: 1, background: '#ffffff', padding: '4px' }}>
                                    <div style={{ width: '60%', height: '4px', background: '#e2e8f0', borderRadius: '2px', marginBottom: '3px' }} />
                                    <div style={{ width: '40%', height: '4px', background: '#f1f5f9', borderRadius: '2px' }} />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-100">
                            <input
                                type="radio"
                                name="themeMode"
                                checked={currentTheme === 'light'}
                                onChange={() => handleThemeSelect('light')}
                                style={{ accentColor: 'var(--accent-primary, #0078d4)', cursor: 'pointer' }}
                            />
                            <span>Light</span>
                        </div>
                    </div>

                    {/* Dark Option */}
                    <div
                        onClick={() => handleThemeSelect('dark')}
                        className={`rounded-lg p-3 cursor-pointer flex flex-col items-center gap-2 transition-all ${
                            currentTheme === 'dark'
                                ? 'border-2 border-[var(--accent-primary,#0078d4)] shadow-xs'
                                : 'border border-slate-200 dark:border-[#3d3d3d] hover:border-slate-300 dark:hover:border-[#525252]'
                        } bg-white dark:bg-[#292929]`}
                        style={{
                            borderColor: currentTheme === 'dark' ? 'var(--accent-primary, #0078d4)' : undefined,
                            borderWidth: '2px'
                        }}
                    >
                        {/* Mini preview illustration */}
                        <div style={{
                            width: '100%',
                            height: '56px',
                            borderRadius: '5px',
                            border: '1px solid #334155',
                            background: '#0f172a',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{ height: '14px', background: '#1e293b' }} />
                            <div style={{ display: 'flex', flex: 1 }}>
                                <div style={{ width: '22%', background: '#1e293b', borderRight: '1px solid #334155' }} />
                                <div style={{ flex: 1, background: '#0f172a', padding: '4px' }}>
                                    <div style={{ width: '60%', height: '4px', background: '#334155', borderRadius: '2px', marginBottom: '3px' }} />
                                    <div style={{ width: '40%', height: '4px', background: '#1e293b', borderRadius: '2px' }} />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-100">
                            <input
                                type="radio"
                                name="themeMode"
                                checked={currentTheme === 'dark'}
                                onChange={() => handleThemeSelect('dark')}
                                style={{ accentColor: 'var(--accent-primary, #0078d4)', cursor: 'pointer' }}
                            />
                            <span>Dark</span>
                        </div>
                    </div>

                    {/* System Setting Option */}
                    <div
                        onClick={() => handleThemeSelect('system')}
                        className={`rounded-lg p-3 cursor-pointer flex flex-col items-center gap-2 transition-all ${
                            currentTheme === 'system'
                                ? 'border-2 border-[var(--accent-primary,#0078d4)] shadow-xs'
                                : 'border border-slate-200 dark:border-[#3d3d3d] hover:border-slate-300 dark:hover:border-[#525252]'
                        } bg-white dark:bg-[#292929]`}
                        style={{
                            borderColor: currentTheme === 'system' ? 'var(--accent-primary, #0078d4)' : undefined,
                            borderWidth: '2px'
                        }}
                    >
                        {/* Mini preview illustration (split) */}
                        <div style={{
                            width: '100%',
                            height: '56px',
                            borderRadius: '5px',
                            border: '1px solid #94a3b8',
                            overflow: 'hidden',
                            display: 'flex'
                        }}>
                            <div style={{ flex: 1, background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ height: '14px', background: 'var(--accent-primary, #0078d4)' }} />
                                <div style={{ flex: 1, background: '#ffffff', padding: '4px' }}>
                                    <div style={{ width: '70%', height: '4px', background: '#e2e8f0', borderRadius: '2px' }} />
                                </div>
                            </div>
                            <div style={{ flex: 1, background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ height: '14px', background: '#1e293b' }} />
                                <div style={{ flex: 1, background: '#0f172a', padding: '4px' }}>
                                    <div style={{ width: '70%', height: '4px', background: '#334155', borderRadius: '2px' }} />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-100">
                            <input
                                type="radio"
                                name="themeMode"
                                checked={currentTheme === 'system'}
                                onChange={() => handleThemeSelect('system')}
                                style={{ accentColor: 'var(--accent-primary, #0078d4)', cursor: 'pointer' }}
                            />
                            <span>Use system setting</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 2: Modern Themes / Accent Colors */}
            <div className="flex flex-col gap-2.5" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                    <label className="text-sm font-semibold text-slate-900 dark:text-white">
                        Modern themes & accent colors
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-0">
                        Select an accent color for active items, indicators, and buttons.
                    </p>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', maxWidth: '520px' }}>
                    {ACCENT_COLORS.map(swatch => {
                        const isSelected = currentAccent.toLowerCase() === swatch.name.toLowerCase();
                        return (
                            <button
                                key={swatch.name}
                                type="button"
                                onClick={() => handleAccentSelect(swatch)}
                                title={swatch.name}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                                    isSelected
                                        ? 'shadow-xs font-semibold'
                                        : 'border border-slate-200 dark:border-[#3d3d3d] hover:border-slate-300 dark:hover:border-[#525252] bg-white dark:bg-[#292929]'
                                }`}
                                style={{
                                    border: `1.5px solid ${isSelected ? swatch.hex : undefined}`,
                                    background: isSelected ? swatch.lightRgba || 'rgba(0,120,212,0.12)' : undefined
                                }}
                            >
                                <span
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        background: swatch.hex,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                                    }}
                                >
                                    {isSelected && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </span>
                                <span className={`text-xs ${isSelected ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-700 dark:text-slate-300 font-medium'}`}>
                                    {swatch.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Section 3: Display Density */}
            <div className="flex flex-col gap-2.5" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                    <label className="text-sm font-semibold text-slate-900 dark:text-white">
                        Display density
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-0">
                        Adjust row padding and spacing in email lists and folder views.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '480px' }}>
                    {[
                        { id: 'roomy', label: 'Full (Roomy)', desc: 'Generous padding between messages for relaxed viewing.' },
                        { id: 'cozy', label: 'Medium (Cozy)', desc: 'Balanced spacing, standard Outlook layout.' },
                        { id: 'compact', label: 'Compact', desc: 'Tight spacing to view maximum messages on screen.' }
                    ].map(d => {
                        const isSelected = currentDensity === d.id;
                        return (
                            <label
                                key={d.id}
                                className={`flex items-start gap-2.5 p-3 rounded-md cursor-pointer transition-all ${
                                    isSelected
                                        ? 'border-2 shadow-xs'
                                        : 'border border-slate-200 dark:border-[#3d3d3d] hover:border-slate-300 dark:hover:border-[#525252] bg-white dark:bg-[#292929]'
                                }`}
                                style={{
                                    borderColor: isSelected ? 'var(--accent-primary, #0078d4)' : undefined,
                                    borderWidth: isSelected ? '1.5px' : '1px',
                                    background: isSelected ? 'var(--accent-soft-bg, rgba(0, 120, 212, 0.12))' : undefined
                                }}
                            >
                                <input
                                    type="radio"
                                    name="densityMode"
                                    checked={isSelected}
                                    onChange={() => handleDensitySelect(d.id)}
                                    style={{ accentColor: 'var(--accent-primary, #0078d4)', marginTop: '3px', cursor: 'pointer' }}
                                />
                                <div>
                                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                        {d.label}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {d.desc}
                                    </div>
                                </div>
                            </label>
                        );
                    })}
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
                    className="sticky bottom-0 bg-white dark:bg-[#1f1f1f] border-t border-slate-200 dark:border-[#333333] pt-3.5 pb-1 flex items-center gap-3 z-10"
                    style={{
                        position: 'sticky',
                        bottom: 0,
                        padding: '14px 0 4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        zIndex: 10
                    }}
                >
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-5 py-1.5 text-white text-xs font-semibold rounded cursor-pointer border-0 transition-opacity hover:opacity-90"
                        style={{
                            background: 'var(--accent-primary, #0078d4)',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            opacity: isSaving ? 0.7 : 1
                        }}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        type="button"
                        onClick={handleDiscard}
                        disabled={isSaving}
                        className="px-4 py-1.5 bg-white dark:bg-[#292929] border border-slate-300 dark:border-[#3d3d3d] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#333333] rounded text-xs font-medium cursor-pointer transition-colors"
                        style={{
                            cursor: isSaving ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Discard
                    </button>
                    <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                        Unsaved changes
                    </span>
                </div>
            )}
        </div>
    );
}
