import React, { useState } from 'react';
import { useGeneralSettings } from '../../context/GeneralSettingsContext';

// Synthetic sound generator matching e2e test specifications
function playSyntheticTone(tone = 'chime') {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        const frequencies = {
            chime: [523.25, 783.99],
            bell: [880],
            ping: [1046.5],
            marimba: [440]
        };

        const freqs = frequencies[tone] || frequencies.chime;
        freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = tone === 'marimba' ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
            gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + idx * 0.12);
            osc.stop(ctx.currentTime + idx * 0.12 + 0.4);
        });
    } catch (err) {
        console.warn('Audio synthesis failed:', err);
    }
}

export default function NotificationsSection() {
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
    const [permissionStatus, setPermissionStatus] = useState(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            return Notification.permission;
        }
        return 'default';
    });

    const values = draftSettings?.notifications || settings?.notifications || {
        enabled: true,
        allowNotifications: true,
        notifyNewMail: true,
        desktopStyle: 'browser',
        notificationStyle: 'browser',
        playSound: true,
        playNotificationSound: true,
        soundTone: 'chime',
        notificationSound: 'chime',
        notifyMentions: true,
        notifyProjectTaskMentions: true
    };

    const isDirty = isSliceDirty('notifications');
    const isMasterEnabled = values.enabled !== false;

    const handleMasterToggle = (e) => {
        const checked = e.target.checked;
        updateGeneralSettings('notifications', {
            enabled: checked,
            allowNotifications: checked
        });
    };

    const handleChildToggle = (key, value) => {
        const patch = { [key]: value };
        if (key === 'playSound') patch.playNotificationSound = value;
        if (key === 'notifyMentions') patch.notifyProjectTaskMentions = value;
        updateGeneralSettings('notifications', patch);
    };

    const handleDesktopStyleChange = async (e) => {
        const style = e.target.value;
        if (style === 'browser' && typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                const res = await Notification.requestPermission();
                setPermissionStatus(res);
                if (res === 'denied') {
                    // Fall back to toast if denied per contract
                    updateGeneralSettings('notifications', { desktopStyle: 'toast', notificationStyle: 'toast' });
                    return;
                }
            } else if (Notification.permission === 'denied') {
                updateGeneralSettings('notifications', { desktopStyle: 'toast', notificationStyle: 'toast' });
                return;
            }
        }
        updateGeneralSettings('notifications', {
            desktopStyle: style,
            notificationStyle: style
        });
    };

    const handleToneChange = (e) => {
        const tone = e.target.value;
        updateGeneralSettings('notifications', {
            soundTone: tone,
            notificationSound: tone
        });
    };

    const handleTestSound = () => {
        playSyntheticTone(values.soundTone || 'chime');
    };

    const handleSave = async () => {
        const res = await saveGeneralSettings('notifications');
        if (res?.success) {
            setToastMessage('Notification settings saved.');
            setTimeout(() => setToastMessage(null), 3000);
        }
    };

    const handleDiscard = () => {
        discardGeneralSettings('notifications');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
            {/* Header description */}
            <p className="settings-float-section-desc" style={{ margin: '0', color: 'var(--text-secondary, #616161)', fontSize: '13.5px' }}>
                Configure how and when Safemailz notifies you about incoming emails, sound alerts, and task updates.
            </p>

            {/* Master Toggle Card */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle, #e2e8f0)',
                    background: isMasterEnabled ? 'var(--surface-subtle, #f8fafc)' : 'var(--surface-card, #f1f5f9)',
                    maxWidth: '560px'
                }}
            >
                <div>
                    <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>
                        Notifications in Safemailz <span style={{ fontWeight: 400, color: 'var(--text-secondary, #64748b)', fontSize: '13px' }}>(Allow notifications)</span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-secondary, #64748b)', marginTop: '2px' }}>
                        Allow Safemailz to send alerts for incoming messages and important updates.
                    </div>
                </div>

                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={isMasterEnabled}
                        onChange={handleMasterToggle}
                        style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: isMasterEnabled ? 'var(--accent-primary, #0078d4)' : 'var(--border-subtle, #cbd5e1)',
                            borderRadius: '24px',
                            transition: '0.2s',
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
                        }}
                    >
                        <span
                            style={{
                                position: 'absolute',
                                left: isMasterEnabled ? '22px' : '3px',
                                top: '3px',
                                width: '18px',
                                height: '18px',
                                background: '#ffffff',
                                borderRadius: '50%',
                                transition: '0.2s',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                            }}
                        />
                    </span>
                </label>
            </div>

            {/* Sub-sections Container (dimmed if master is disabled) */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '22px',
                opacity: isMasterEnabled ? 1 : 0.45,
                pointerEvents: isMasterEnabled ? 'auto' : 'none',
                transition: 'opacity 0.2s ease'
            }}>
                {/* Mail Notifications Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '560px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #0f172a)', margin: 0, borderBottom: '1px solid var(--border-subtle, #e2e8f0)', paddingBottom: '6px' }}>
                        Mail notifications
                    </h4>

                    {/* Toggle: Notify me about new mail */}
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                        <div>
                            <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-primary, #334155)' }}>
                                Notify me about new mail
                            </span>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                                Display an alert whenever a new email arrives in your inbox.
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={!!values.notifyNewMail}
                            onChange={(e) => handleChildToggle('notifyNewMail', e.target.checked)}
                            style={{ accentColor: 'var(--accent-primary, #0078d4)', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                    </label>

                    {/* Dropdown: Desktop Notification Style */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary, #334155)' }}>
                            Desktop notification style
                        </label>
                        <select
                            value={values.desktopStyle || 'browser'}
                            onChange={handleDesktopStyleChange}
                            style={{
                                maxWidth: '380px',
                                padding: '8px 12px',
                                border: '1px solid var(--border-subtle, #cbd5e1)',
                                borderRadius: '4px',
                                fontSize: '13.5px',
                                color: 'var(--text-primary, #1e293b)',
                                background: 'var(--surface-card, #ffffff)',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="browser">Browser alert (System banner)</option>
                            <option value="toast">In-app toast (Safemailz popup)</option>
                            <option value="none">None (Silence desktop banners)</option>
                        </select>
                        {permissionStatus === 'denied' && values.desktopStyle === 'browser' && (
                            <small style={{ color: '#dc2626', fontSize: '12px' }}>
                                Browser notification permission is currently blocked. Alerts will degrade to in-app toasts.
                            </small>
                        )}
                    </div>

                    {/* Sound Settings */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                            <div>
                                <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-primary, #334155)' }}>
                                    Play a sound when a new email arrives
                                </span>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                                    Play an audible chime when new messages land in your mailbox.
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={!!values.playSound}
                                onChange={(e) => handleChildToggle('playSound', e.target.checked)}
                                style={{ accentColor: 'var(--accent-primary, #0078d4)', width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                        </label>

                        {/* Tone Selector & Test Button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                            <select
                                value={values.soundTone || 'chime'}
                                onChange={handleToneChange}
                                disabled={!values.playSound}
                                style={{
                                    maxWidth: '240px',
                                    padding: '6px 10px',
                                    border: '1px solid var(--border-subtle, #cbd5e1)',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    color: 'var(--text-primary, #1e293b)',
                                    background: 'var(--surface-card, #ffffff)',
                                    cursor: values.playSound ? 'pointer' : 'not-allowed',
                                    opacity: values.playSound ? 1 : 0.6
                                }}
                            >
                                <option value="chime">Chime (Classic C-G)</option>
                                <option value="bell">Bell (Crisp A5)</option>
                                <option value="ping">Ping (High C6)</option>
                                <option value="marimba">Marimba (Warm A4)</option>
                            </select>

                            <button
                                type="button"
                                onClick={handleTestSound}
                                style={{
                                    padding: '6px 14px',
                                    background: 'var(--surface-subtle, #f1f5f9)',
                                    color: 'var(--text-primary, #0f172a)',
                                    border: '1px solid var(--border-subtle, #cbd5e1)',
                                    borderRadius: '4px',
                                    fontSize: '12.5px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <span>🔊</span> Test sound
                            </button>
                        </div>
                    </div>
                </div>

                {/* Project & Task Mentions Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '560px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #0f172a)', margin: 0, borderBottom: '1px solid var(--border-subtle, #e2e8f0)', paddingBottom: '6px' }}>
                        Tasks & mentions
                    </h4>

                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                        <div>
                            <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-primary, #334155)' }}>
                                Notify me when assigned to a project or task
                            </span>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                                Receive alerts when teammates mention you or assign new action items.
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={!!values.notifyMentions}
                            onChange={(e) => handleChildToggle('notifyMentions', e.target.checked)}
                            style={{ accentColor: 'var(--accent-primary, #0078d4)', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                    </label>
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
