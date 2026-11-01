import React, { useState } from 'react';
import { useGeneralSettings } from '../../context/GeneralSettingsContext';
import TimezoneSelectorModal from './TimezoneSelectorModal';
import { findTimezoneByIana } from './timezonesData';

export default function LanguageTimeSection() {
    const {
        draftSettings,
        settings,
        updateGeneralSettings,
        saveGeneralSettings,
        discardGeneralSettings,
        isSliceDirty,
        isSaving
    } = useGeneralSettings();

    const [isTimezoneModalOpen, setIsTimezoneModalOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    const values = draftSettings?.languageTime || settings?.languageTime || {
        language: 'en-US',
        dateFormat: 'M/D/YYYY',
        timeFormat: '12h',
        timeZone: 'Asia/Kolkata'
    };

    const isDirty = isSliceDirty('languageTime');

    const handleLanguageChange = (e) => {
        updateGeneralSettings('languageTime', { language: e.target.value });
    };

    const handleDateFormatChange = (e) => {
        updateGeneralSettings('languageTime', { dateFormat: e.target.value });
    };

    const handleTimeFormatChange = (e) => {
        updateGeneralSettings('languageTime', { timeFormat: e.target.value });
    };

    const handleTimezoneSelect = (newIana) => {
        updateGeneralSettings('languageTime', { timeZone: newIana });
    };

    const handleSave = async () => {
        const res = await saveGeneralSettings('languageTime');
        if (res?.success) {
            setToastMessage('Language and time preferences saved.');
            setTimeout(() => setToastMessage(null), 3000);
        }
    };

    const handleDiscard = () => {
        discardGeneralSettings('languageTime');
    };

    // Find formatted display label for active timezone
    const tzEntry = findTimezoneByIana(values.timeZone);
    const tzDisplayLabel = tzEntry ? tzEntry.label : `(UTC) ${values.timeZone}`;

    // Live formatted sample date based on current draft selection
    const sampleDateFormatted = (() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const m = String(d.getMonth() + 1);
        const dd = String(d.getDate()).padStart(2, '0');
        const dNum = String(d.getDate());
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mmm = monthNames[d.getMonth()];

        switch (values.dateFormat) {
            case 'DD/MM/YYYY': return `${dd}/${mm}/${yyyy}`;
            case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`;
            case 'MMM D, YYYY': return `${mmm} ${dNum}, ${yyyy}`;
            case 'M/D/YYYY':
            default:
                return `${m}/${dNum}/${yyyy}`;
        }
    })();

    // Live formatted sample time
    const sampleTimeFormatted = (() => {
        const d = new Date();
        if (values.timeFormat === '24h') {
            const hh = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            return `${hh}:${min}`;
        } else {
            let h = d.getHours();
            const min = String(d.getMinutes()).padStart(2, '0');
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            return `${h}:${min} ${ampm}`;
        }
    })();

    // Current local time in chosen timezone
    const currentTimeInZone = (() => {
        try {
            return new Intl.DateTimeFormat('en-US', {
                timeZone: values.timeZone,
                hour: 'numeric',
                minute: '2-digit',
                hour12: values.timeFormat !== '24h'
            }).format(new Date());
        } catch {
            return sampleTimeFormatted;
        }
    })();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Header description */}
            <p className="settings-float-section-desc" style={{ margin: '0 0 4px', color: 'var(--text-secondary, #616161)', fontSize: '13.5px' }}>
                Choose the language, date and time formats, and time zone you want to use in Safemailz.
            </p>

            {/* Field 1: Language */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #242424)' }}>
                    Language (Country/Region)
                </label>
                <select
                    value={values.language || 'en-US'}
                    onChange={handleLanguageChange}
                    style={{
                        maxWidth: '440px',
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--border-subtle, #d1d1d1)',
                        borderRadius: '4px',
                        fontSize: '14px',
                        color: 'var(--text-primary, #242424)',
                        background: 'var(--surface-card, #ffffff)',
                        outline: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <option value="en-US">English (United States)</option>
                    <option value="en-IN">English (India)</option>
                    <option value="hi-IN">Hindi (India) - हिन्दी (भारत)</option>
                    <option value="en-GB">English (United Kingdom)</option>
                    <option value="en-CA">English (Canada)</option>
                    <option value="en-AU">English (Australia)</option>
                    <option value="es-ES">Spanish (Spain) - Español (España)</option>
                    <option value="es-MX">Spanish (Mexico) - Español (México)</option>
                    <option value="fr-FR">French (France) - Français (France)</option>
                    <option value="fr-CA">French (Canada) - Français (Canada)</option>
                    <option value="de-DE">German (Germany) - Deutsch (Deutschland)</option>
                    <option value="it-IT">Italian (Italy) - Italiano (Italia)</option>
                    <option value="pt-BR">Portuguese (Brazil) - Português (Brasil)</option>
                    <option value="pt-PT">Portuguese (Portugal) - Português (Portugal)</option>
                    <option value="ja-JP">Japanese (Japan) - 日本語 (日本)</option>
                    <option value="zh-CN">Chinese (Simplified, China) - 简体中文 (中国)</option>
                    <option value="zh-TW">Chinese (Traditional, Taiwan) - 繁體中文 (台灣)</option>
                    <option value="ar-SA">Arabic (Saudi Arabia) - العربية (المملكة العربية السعودية)</option>
                    <option value="ru-RU">Russian (Russia) - Русский (Россия)</option>
                    <option value="nl-NL">Dutch (Netherlands) - Nederlands (Nederland)</option>
                </select>
                <small style={{ color: 'var(--text-secondary, #616161)', fontSize: '12px' }}>
                    The display language used for menus, buttons, and system messages.
                </small>
            </div>

            {/* Field 2: Date Format */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #242424)' }}>
                    Date format
                </label>
                <select
                    value={values.dateFormat || 'M/D/YYYY'}
                    onChange={handleDateFormatChange}
                    style={{
                        maxWidth: '440px',
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--border-subtle, #d1d1d1)',
                        borderRadius: '4px',
                        fontSize: '14px',
                        color: 'var(--text-primary, #242424)',
                        background: 'var(--surface-card, #ffffff)',
                        outline: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <option value="M/D/YYYY">9/1/2027 (M/D/YYYY)</option>
                    <option value="DD/MM/YYYY">01/09/2027 (DD/MM/YYYY)</option>
                    <option value="YYYY-MM-DD">2027-09-01 (YYYY-MM-DD)</option>
                    <option value="MMM D, YYYY">Sep 1, 2027 (MMM D, YYYY)</option>
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary, #616161)' }}>
                    <span>Preview:</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-primary, #0078d4)', background: 'var(--accent-subtle, #eff6ff)', padding: '2px 8px', borderRadius: '4px' }}>
                        {sampleDateFormatted}
                    </span>
                </div>
            </div>

            {/* Field 3: Time Format */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #242424)' }}>
                    Time format
                </label>
                <select
                    value={values.timeFormat || '12h'}
                    onChange={handleTimeFormatChange}
                    style={{
                        maxWidth: '440px',
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--border-subtle, #d1d1d1)',
                        borderRadius: '4px',
                        fontSize: '14px',
                        color: 'var(--text-primary, #242424)',
                        background: 'var(--surface-card, #ffffff)',
                        outline: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <option value="12h">1:01 AM - 11:59 PM (12-hour)</option>
                    <option value="24h">01:01 - 23:59 (24-hour)</option>
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary, #616161)' }}>
                    <span>Preview:</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-primary, #0078d4)', background: 'var(--accent-subtle, #eff6ff)', padding: '2px 8px', borderRadius: '4px' }}>
                        {sampleTimeFormatted}
                    </span>
                </div>
            </div>

            {/* Field 4: Time Zone */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #242424)' }}>
                    Current time zone
                </label>
                <div 
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        border: '1px solid var(--border-subtle, #e2e8f0)',
                        borderRadius: '6px',
                        background: 'var(--surface-subtle, #f8fafc)',
                        maxWidth: '580px',
                        gap: '16px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary, #0078d4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="10" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #0f172a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {tzDisplayLabel}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', marginTop: '2px' }}>
                                Current time: <strong>{currentTimeInZone}</strong> · IANA: <code>{values.timeZone}</code>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsTimezoneModalOpen(true)}
                        style={{
                            padding: '6px 14px',
                            color: 'var(--accent-primary, #0078d4)',
                            background: 'transparent',
                            border: '1px solid var(--accent-primary, #0078d4)',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-subtle, rgba(0, 120, 212, 0.08))'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        Change
                    </button>
                </div>
            </div>

            {/* Toast Feedback */}
            {toastMessage && (
                <div style={{
                    padding: '8px 14px',
                    borderRadius: '4px',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#065f46',
                    fontSize: '13px',
                    fontWeight: 500,
                    maxWidth: '440px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <span>✓</span> {toastMessage}
                </div>
            )}

            {/* Sticky Action Bar */}
            {isDirty && (
                <div 
                    style={{
                        position: 'sticky',
                        bottom: 0,
                        background: 'var(--surface-card, #ffffff)',
                        borderTop: '1px solid var(--border-subtle, #e2e8f0)',
                        padding: '14px 0 8px',
                        marginTop: '16px',
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

            {/* Timezone Selector Modal */}
            <TimezoneSelectorModal
                isOpen={isTimezoneModalOpen}
                currentTimeZone={values.timeZone}
                onSelect={handleTimezoneSelect}
                onClose={() => setIsTimezoneModalOpen(false)}
            />
        </div>
    );
}
