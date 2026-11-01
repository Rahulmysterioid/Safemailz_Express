import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Format milliseconds into HH:MM:SS or days + HH:MM:SS
 */
function formatRemainingTime(ms) {
    if (ms <= 0) return { formatted: '00:00:00', hours: '00', minutes: '00', seconds: '00', days: 0 };
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    const pad = (n) => String(n).padStart(2, '0');
    const formatted = days > 0
        ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
        : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    return {
        days,
        hours: pad(hours),
        minutes: pad(minutes),
        seconds: pad(seconds),
        formatted
    };
}

/**
 * Helper to get current user from localStorage
 */
function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('currentUser') || '{}');
    } catch {
        return {};
    }
}

/**
 * Active Snooze Alert Banner
 * Rendered at the top of Inbox / EmailView when snooze is active
 */
export function ActiveSnoozeBanner({ onResumeSuccess }) {
    const navigate = useNavigate();
    const [status, setStatus] = useState({
        isInboxSnoozed: false,
        snoozeUntil: null,
        heldEmailsCount: 0,
        remainingMs: 0
    });
    const [remainingStr, setRemainingStr] = useState('00:00:00');
    const [isResuming, setIsResuming] = useState(false);

    const fetchStatus = async () => {
        const user = getCurrentUser();
        if (!user?.id) return;
        try {
            const res = await fetch('/api/email/snooze/status', {
                headers: {
                    'x-user-id': String(user.id),
                    'x-org-id': String(user.organization_id || '1')
                }
            });
            const data = await res.json();
            if (data.success) {
                setStatus({
                    isInboxSnoozed: data.isInboxSnoozed,
                    snoozeUntil: data.snoozeUntil,
                    heldEmailsCount: data.heldEmailsCount || 0,
                    remainingMs: data.remainingMs || 0
                });
            }
        } catch (e) {
            console.error('Error fetching snooze status in banner:', e);
        }
    };

    useEffect(() => {
        fetchStatus();
        const handleStatusChange = (e) => {
            if (e.detail) {
                setStatus(prev => ({
                    ...prev,
                    isInboxSnoozed: e.detail.isInboxSnoozed,
                    snoozeUntil: e.detail.snoozeUntil
                }));
            }
            fetchStatus();
        };

        window.addEventListener('snoozeStatusChanged', handleStatusChange);
        const poll = setInterval(fetchStatus, 15000);

        return () => {
            window.removeEventListener('snoozeStatusChanged', handleStatusChange);
            clearInterval(poll);
        };
    }, []);

    // Live ticking countdown
    useEffect(() => {
        if (!status.isInboxSnoozed || !status.snoozeUntil) return;

        const updateTimer = () => {
            const target = new Date(status.snoozeUntil).getTime();
            const now = Date.now();
            const diff = Math.max(0, target - now);
            if (diff <= 0) {
                setStatus(prev => ({ ...prev, isInboxSnoozed: false }));
                window.dispatchEvent(new CustomEvent('snoozeStatusChanged', { detail: { isInboxSnoozed: false } }));
            }
            const formatted = formatRemainingTime(diff);
            setRemainingStr(formatted.formatted);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [status.isInboxSnoozed, status.snoozeUntil]);

    if (!status.isInboxSnoozed) return null;

    const handleResume = async () => {
        const user = getCurrentUser();
        if (!user?.id) return;
        setIsResuming(true);
        try {
            const res = await fetch('/api/email/snooze/resume', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(user.id),
                    'x-org-id': String(user.organization_id || '1')
                }
            });
            const data = await res.json();
            if (data.success) {
                setStatus(prev => ({ ...prev, isInboxSnoozed: false, heldEmailsCount: 0 }));
                window.dispatchEvent(new CustomEvent('snoozeStatusChanged', {
                    detail: { isInboxSnoozed: false, releasedCount: data.releasedCount }
                }));
                if (onResumeSuccess) onResumeSuccess(data.releasedCount);
            }
        } catch (err) {
            console.error('Failed to resume inbox:', err);
        } finally {
            setIsResuming(false);
        }
    };

    const formattedUntil = status.snoozeUntil
        ? new Date(status.snoozeUntil).toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        })
        : '';

    return (
        <div
            className="snooze-active-banner"
            style={{
                background: 'linear-gradient(90deg, #fef3c7 0%, #ede9fe 100%)',
                borderBottom: '1px solid #fcd34d',
                padding: '10px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 2px 4px rgba(217, 119, 6, 0.08)',
                zIndex: 40,
                position: 'relative',
                animation: 'slideDownBanner 0.25s ease-out'
            }}
        >
            <style>{`
                @keyframes slideDownBanner {
                    from { transform: translateY(-100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes pulseDot {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(1.15); }
                }
            `}</style>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
                <span
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: '#f59e0b',
                        color: '#ffffff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)',
                        flexShrink: 0
                    }}
                >
                    ⏸️
                </span>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#78350f' }}>
                            Inbox is Snoozed until {formattedUntil}
                        </span>
                        <span
                            style={{
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                background: 'rgba(255, 255, 255, 0.8)',
                                border: '1px solid #fde68a',
                                color: '#92400e',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706', animation: 'pulseDot 1.5s infinite' }}></span>
                            {remainingStr} left
                        </span>
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6b21a8' }}>
                        New incoming emails are safely held in the cloud and paused from your inbox.
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {status.heldEmailsCount > 0 && (
                    <span
                        style={{
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: '#7c3aed',
                            color: '#ffffff',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            boxShadow: '0 1px 3px rgba(124, 58, 237, 0.25)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                        title={`${status.heldEmailsCount} emails waiting to be delivered`}
                    >
                        📬 {status.heldEmailsCount} Held {status.heldEmailsCount === 1 ? 'Mail' : 'Mails'}
                    </span>
                )}

                <button
                    type="button"
                    onClick={handleResume}
                    disabled={isResuming}
                    style={{
                        background: '#047857',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: isResuming ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 3px rgba(4, 120, 87, 0.3)',
                        transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#065f46'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#047857'}
                >
                    {isResuming ? 'Resuming...' : '▶ Resume Inbox Now'}
                </button>

                <button
                    type="button"
                    onClick={() => navigate('/dashboard/email/snooze')}
                    style={{
                        background: 'transparent',
                        color: '#4338ca',
                        border: '1px solid #c7d2fe',
                        borderRadius: '6px',
                        padding: '5px 12px',
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    Control Center ⚙️
                </button>
            </div>
        </div>
    );
}

/**
 * SnoozeControlCenter
 * Full-screen modern dashboard view for managing Global Inbox Snooze / Pause
 */
export default function SnoozeControlCenter() {
    const navigate = useNavigate();
    const [user] = useState(() => getCurrentUser());
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState({
        isInboxSnoozed: false,
        snoozeUntil: null,
        snoozedAt: null,
        remainingMs: 0,
        heldEmailsCount: 0
    });
    const [heldEmails, setHeldEmails] = useState([]);
    const [remainingObj, setRemainingObj] = useState(formatRemainingTime(0));
    const [customDateTime, setCustomDateTime] = useState(() => {
        const d = new Date(Date.now() + 2 * 3600000);
        // Format to YYYY-MM-DDTHH:mm for datetime-local input
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    });
    const [actionMessage, setActionMessage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('presets'); // 'presets' | 'custom' | 'held'

    const fetchStatusAndHeld = async () => {
        if (!user?.id) {
            setIsLoading(false);
            return;
        }
        try {
            const headers = {
                'x-user-id': String(user.id),
                'x-org-id': String(user.organization_id || '1')
            };
            const [statusRes, heldRes] = await Promise.all([
                fetch('/api/email/snooze/status', { headers }),
                fetch('/api/email/snooze/held-emails', { headers }).catch(() => null)
            ]);

            const statusData = await statusRes.json();
            if (statusData.success) {
                setStatus({
                    isInboxSnoozed: statusData.isInboxSnoozed,
                    snoozeUntil: statusData.snoozeUntil,
                    snoozedAt: statusData.snoozedAt,
                    remainingMs: statusData.remainingMs || 0,
                    heldEmailsCount: statusData.heldEmailsCount || 0
                });
            }

            if (heldRes && heldRes.ok) {
                const heldData = await heldRes.json();
                if (heldData.success) {
                    setHeldEmails(heldData.emails || []);
                }
            }
        } catch (err) {
            console.error('Failed to fetch snooze center status:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStatusAndHeld();
        const handleStatusChange = () => fetchStatusAndHeld();
        window.addEventListener('snoozeStatusChanged', handleStatusChange);

        const poll = setInterval(fetchStatusAndHeld, 12000);
        return () => {
            window.removeEventListener('snoozeStatusChanged', handleStatusChange);
            clearInterval(poll);
        };
    }, []);

    // Live ticking countdown
    useEffect(() => {
        if (!status.isInboxSnoozed || !status.snoozeUntil) return;

        const updateClock = () => {
            const target = new Date(status.snoozeUntil).getTime();
            const now = Date.now();
            const diff = Math.max(0, target - now);
            if (diff <= 0) {
                setStatus(prev => ({ ...prev, isInboxSnoozed: false }));
                fetchStatusAndHeld();
                window.dispatchEvent(new CustomEvent('snoozeStatusChanged', { detail: { isInboxSnoozed: false } }));
            }
            setRemainingObj(formatRemainingTime(diff));
        };

        updateClock();
        const t = setInterval(updateClock, 1000);
        return () => clearInterval(t);
    }, [status.isInboxSnoozed, status.snoozeUntil]);

    const activateSnooze = async (targetIsoString, label) => {
        if (!user?.id) return;
        setIsSubmitting(true);
        setActionMessage(null);
        try {
            const res = await fetch('/api/email/snooze/activate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(user.id),
                    'x-org-id': String(user.organization_id || '1')
                },
                body: JSON.stringify({ snoozeUntil: targetIsoString })
            });
            const data = await res.json();
            if (data.success) {
                setStatus(prev => ({
                    ...prev,
                    isInboxSnoozed: true,
                    snoozeUntil: data.snoozeUntil
                }));
                setActionMessage({
                    type: 'success',
                    text: `Inbox paused successfully until ${new Date(data.snoozeUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}!`
                });
                window.dispatchEvent(new CustomEvent('snoozeStatusChanged', {
                    detail: { isInboxSnoozed: true, snoozeUntil: data.snoozeUntil }
                }));
                await fetchStatusAndHeld();
            } else {
                setActionMessage({ type: 'error', text: data.error || 'Failed to activate snooze' });
            }
        } catch (err) {
            setActionMessage({ type: 'error', text: 'Network error activating snooze.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resumeInbox = async () => {
        if (!user?.id) return;
        setIsSubmitting(true);
        setActionMessage(null);
        try {
            const res = await fetch('/api/email/snooze/resume', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(user.id),
                    'x-org-id': String(user.organization_id || '1')
                }
            });
            const data = await res.json();
            if (data.success) {
                setStatus(prev => ({
                    ...prev,
                    isInboxSnoozed: false,
                    snoozeUntil: null,
                    heldEmailsCount: 0
                }));
                setHeldEmails([]);
                setActionMessage({
                    type: 'success',
                    text: `Inbox resumed! ${data.releasedCount || 0} held email(s) released to your inbox.`
                });
                window.dispatchEvent(new CustomEvent('snoozeStatusChanged', {
                    detail: { isInboxSnoozed: false, releasedCount: data.releasedCount }
                }));
            } else {
                setActionMessage({ type: 'error', text: data.error || 'Failed to resume inbox' });
            }
        } catch (err) {
            setActionMessage({ type: 'error', text: 'Network error resuming inbox.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Preset calculations
    const getPresetTimes = () => {
        const now = new Date();

        // 1 Hour
        const oneHour = new Date(now.getTime() + 60 * 60 * 1000);

        // 4 Hours
        const fourHours = new Date(now.getTime() + 4 * 60 * 60 * 1000);

        // Tomorrow Morning (9:00 AM)
        const tomorrowMorning = new Date(now);
        tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
        tomorrowMorning.setHours(9, 0, 0, 0);

        // Next Week (Next Monday at 9:00 AM)
        const nextWeek = new Date(now);
        const day = nextWeek.getDay();
        const daysUntilMonday = ((8 - day) % 7) || 7;
        nextWeek.setDate(nextWeek.getDate() + daysUntilMonday);
        nextWeek.setHours(9, 0, 0, 0);

        return [
            {
                id: '1h',
                title: 'For 1 Hour',
                subtitle: 'Quick Deep Work focus session',
                time: oneHour.toISOString(),
                displayTime: oneHour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                icon: '⚡',
                badge: '1 hr',
                bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                borderColor: '#93c5fd',
                accentColor: '#2563eb'
            },
            {
                id: '4h',
                title: 'For 4 Hours',
                subtitle: 'Half-day uninterrupted flow',
                time: fourHours.toISOString(),
                displayTime: fourHours.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                icon: '🎯',
                badge: '4 hrs',
                bgGradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                borderColor: '#c4b5fd',
                accentColor: '#7c3aed'
            },
            {
                id: 'tomorrow',
                title: 'Until Tomorrow Morning',
                subtitle: 'Recharge and resume at 9:00 AM',
                time: tomorrowMorning.toISOString(),
                displayTime: `Tomorrow, 9:00 AM`,
                icon: '🌅',
                badge: '9:00 AM',
                bgGradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                borderColor: '#fcd34d',
                accentColor: '#d97706'
            },
            {
                id: 'nextweek',
                title: 'Until Next Week',
                subtitle: 'Next Monday morning at 9:00 AM',
                time: nextWeek.toISOString(),
                displayTime: `${nextWeek.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}, 9:00 AM`,
                icon: '🗓️',
                badge: 'Next Week',
                bgGradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                borderColor: '#6ee7b7',
                accentColor: '#059669'
            }
        ];
    };

    const presets = getPresetTimes();

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        if (!customDateTime) return;
        const targetDate = new Date(customDateTime);
        if (isNaN(targetDate.getTime()) || targetDate.getTime() <= Date.now()) {
            setActionMessage({ type: 'error', text: 'Please select a future date and time.' });
            return;
        }
        activateSnooze(targetDate.toISOString(), 'Custom Duration');
    };

    return (
        <div
            className="snooze-control-center-container"
            style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                backgroundColor: '#f8fafc',
                padding: '24px 32px',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
        >
            <style>{`
                @keyframes pulseBadge {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.08); opacity: 0.8; }
                }
                .snooze-preset-card {
                    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
                }
                .snooze-preset-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
                }
            `}</style>

            {/* Header Breadcrumb & Title */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#64748b', marginBottom: '4px' }}>
                        <span style={{ cursor: 'pointer', color: '#2563eb' }} onClick={() => navigate('/dashboard/email/inbox')}>Email</span>
                        <span>/</span>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>Global Inbox Snooze / Pause</span>
                    </div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span>Global Inbox Snooze & Pause</span>
                        <span
                            style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                padding: '4px 10px',
                                borderRadius: '9999px',
                                background: status.isInboxSnoozed ? '#fef3c7' : '#ecfdf5',
                                color: status.isInboxSnoozed ? '#b45309' : '#047857',
                                border: `1px solid ${status.isInboxSnoozed ? '#fcd34d' : '#a7f3d0'}`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <span
                                style={{
                                    width: '7px',
                                    height: '7px',
                                    borderRadius: '50%',
                                    background: status.isInboxSnoozed ? '#d97706' : '#10b981',
                                    animation: status.isInboxSnoozed ? 'pulseBadge 1.5s infinite' : 'none'
                                }}
                            ></span>
                            {status.isInboxSnoozed ? 'Inbox Paused' : 'Inbox Active'}
                        </span>
                    </h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/email/inbox')}
                        style={{
                            background: '#ffffff',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontSize: '0.86rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        ← Back to Inbox
                    </button>
                    {status.isInboxSnoozed && (
                        <button
                            type="button"
                            onClick={resumeInbox}
                            disabled={isSubmitting}
                            style={{
                                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 18px',
                                fontSize: '0.86rem',
                                fontWeight: 600,
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 2px 4px rgba(4, 120, 87, 0.25)'
                            }}
                        >
                            {isSubmitting ? 'Resuming...' : '▶ Resume Inbox Now'}
                        </button>
                    )}
                </div>
            </div>

            {/* Notification Alert Message */}
            {actionMessage && (
                <div
                    style={{
                        padding: '12px 18px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        fontSize: '0.88rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: actionMessage.type === 'success' ? '#ecfdf5' : '#fff1f2',
                        color: actionMessage.type === 'success' ? '#065f46' : '#9f1239',
                        border: `1px solid ${actionMessage.type === 'success' ? '#a7f3d0' : '#fecdd3'}`
                    }}
                >
                    <span>{actionMessage.text}</span>
                    <button
                        type="button"
                        onClick={() => setActionMessage(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'inherit' }}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* MAIN STATUS & LIVE COUNTDOWN HERO CARD */}
            <div
                style={{
                    background: status.isInboxSnoozed
                        ? 'linear-gradient(135deg, #fffbeb 0%, #f5f3ff 100%)'
                        : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    borderRadius: '16px',
                    border: `1px solid ${status.isInboxSnoozed ? '#fde68a' : '#e2e8f0'}`,
                    padding: '28px',
                    marginBottom: '28px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                }}
            >
                {status.isInboxSnoozed ? (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    ⏸️ Focus Mode Active
                                </span>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e1b4b', margin: '4px 0 2px' }}>
                                    Inbox is Paused until {status.snoozeUntil ? new Date(status.snoozeUntil).toLocaleString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                                </h2>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                                    New incoming emails will be held silently in the cloud and released automatically when the timer reaches zero.
                                </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Held in Cloud</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7c3aed' }}>
                                        {status.heldEmailsCount} {status.heldEmailsCount === 1 ? 'Email' : 'Emails'}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={resumeInbox}
                                    disabled={isSubmitting}
                                    style={{
                                        background: '#047857',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '10px 20px',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 2px 6px rgba(4, 120, 87, 0.3)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {isSubmitting ? 'Releasing...' : '▶ Resume & Release Mail'}
                                </button>
                            </div>
                        </div>

                        {/* LIVE DIGITAL COUNTDOWN CARDS */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            {remainingObj.days > 0 && (
                                <div style={{
                                    background: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '12px 20px',
                                    textAlign: 'center',
                                    minWidth: '80px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                                }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', fontFamily: 'monospace' }}>
                                        {remainingObj.days}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Days</div>
                                </div>
                            )}

                            <div style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                padding: '12px 20px',
                                textAlign: 'center',
                                minWidth: '80px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                            }}>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', fontFamily: 'monospace' }}>
                                    {remainingObj.hours}
                                </div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Hours</div>
                            </div>

                            <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#94a3b8' }}>:</span>

                            <div style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                padding: '12px 20px',
                                textAlign: 'center',
                                minWidth: '80px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                            }}>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', fontFamily: 'monospace' }}>
                                    {remainingObj.minutes}
                                </div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Minutes</div>
                            </div>

                            <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#94a3b8' }}>:</span>

                            <div style={{
                                background: '#ffffff',
                                border: '1px solid #fde68a',
                                borderRadius: '12px',
                                padding: '12px 20px',
                                textAlign: 'center',
                                minWidth: '80px',
                                boxShadow: '0 2px 4px rgba(245, 158, 11, 0.1)'
                            }}>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#d97706', fontFamily: 'monospace' }}>
                                    {remainingObj.seconds}
                                </div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#d97706', textTransform: 'uppercase' }}>Seconds</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                        <div style={{ maxWidth: '650px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                                Normal Delivery Mode Active
                            </div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
                                Take Control of Your Attention & Inflow
                            </h2>
                            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                                Need quiet focus to finish a high-priority task or lead a client meeting?
                                Snooze your inbox to temporarily hold new incoming emails. When your snooze period expires, all held emails are automatically delivered to your inbox without any lost data.
                            </p>
                        </div>

                        <div style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '12px',
                            padding: '16px 22px',
                            textAlign: 'center',
                            minWidth: '220px'
                        }}>
                            <div style={{ fontSize: '26px', marginBottom: '4px' }}>🛡️ 100% Safe</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e40af' }}>Cloud Mail Hold</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Senders receive normal delivery confirmation.</div>
                        </div>
                    </div>
                )}
            </div>

            {/* TAB SELECTOR: Quick Presets vs Custom vs Held Mails */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('presets')}
                    style={{
                        padding: '10px 18px',
                        border: 'none',
                        borderBottom: activeTab === 'presets' ? '2px solid #2563eb' : '2px solid transparent',
                        background: 'transparent',
                        fontWeight: activeTab === 'presets' ? 700 : 500,
                        color: activeTab === 'presets' ? '#2563eb' : '#64748b',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    ⚡ Quick Duration Presets
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('custom')}
                    style={{
                        padding: '10px 18px',
                        border: 'none',
                        borderBottom: activeTab === 'custom' ? '2px solid #2563eb' : '2px solid transparent',
                        background: 'transparent',
                        fontWeight: activeTab === 'custom' ? 700 : 500,
                        color: activeTab === 'custom' ? '#2563eb' : '#64748b',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    🗓️ Custom Date & Time
                </button>
                {status.heldEmailsCount > 0 && (
                    <button
                        type="button"
                        onClick={() => setActiveTab('held')}
                        style={{
                            padding: '10px 18px',
                            border: 'none',
                            borderBottom: activeTab === 'held' ? '2px solid #7c3aed' : '2px solid transparent',
                            background: 'transparent',
                            fontWeight: activeTab === 'held' ? 700 : 500,
                            color: activeTab === 'held' ? '#7c3aed' : '#64748b',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        📬 Held Emails Preview ({status.heldEmailsCount})
                    </button>
                )}
            </div>

            {/* TAB CONTENT: PRESETS */}
            {activeTab === 'presets' && (
                <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
                        Choose a Snooze Duration Preset
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '18px' }}>
                        {presets.map(preset => (
                            <div
                                key={preset.id}
                                className="snooze-preset-card"
                                style={{
                                    background: preset.bgGradient,
                                    border: `1px solid ${preset.borderColor}`,
                                    borderRadius: '14px',
                                    padding: '20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: '180px',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer'
                                }}
                                onClick={() => !isSubmitting && activateSnooze(preset.time, preset.title)}
                            >
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '28px' }}>{preset.icon}</span>
                                        <span
                                            style={{
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                background: '#ffffff',
                                                color: preset.accentColor,
                                                border: `1px solid ${preset.borderColor}`,
                                                padding: '3px 8px',
                                                borderRadius: '9999px',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                            }}
                                        >
                                            {preset.badge}
                                        </span>
                                    </div>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                                        {preset.title}
                                    </h4>
                                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 12px', lineHeight: 1.4 }}>
                                        {preset.subtitle}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid rgba(0,0,0,0.06)`, paddingTop: '12px' }}>
                                    <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                                        Until {preset.displayTime}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        style={{
                                            background: preset.accentColor,
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            padding: '6px 12px',
                                            fontSize: '0.78rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                        }}
                                    >
                                        Select →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: CUSTOM DATE & TIME PICKER */}
            {activeTab === 'custom' && (
                <div
                    style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '24px',
                        maxWidth: '540px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}
                >
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>
                        Custom Snooze Schedule
                    </h3>
                    <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 20px' }}>
                        Set a specific date and time when you want your inbox to automatically resume receiving new emails.
                    </p>

                    <form onSubmit={handleCustomSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                                Snooze Until Date & Time:
                            </label>
                            <input
                                type="datetime-local"
                                value={customDateTime}
                                onChange={(e) => setCustomDateTime(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    fontFamily: 'inherit'
                                }}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                style={{
                                    background: '#2563eb',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px 20px',
                                    fontSize: '0.88rem',
                                    fontWeight: 600,
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
                                }}
                            >
                                {isSubmitting ? 'Activating...' : '⏰ Activate Custom Snooze'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('presets')}
                                style={{
                                    background: 'transparent',
                                    color: '#64748b',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    padding: '10px 16px',
                                    fontSize: '0.88rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* TAB CONTENT: HELD EMAILS PREVIEW */}
            {activeTab === 'held' && (
                <div
                    style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '24px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                Currently Held Emails ({heldEmails.length})
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0' }}>
                                These messages arrived while snooze was active. They are held safely and will be delivered to your inbox upon resume.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={resumeInbox}
                            disabled={isSubmitting}
                            style={{
                                background: '#047857',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                fontSize: '0.84rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Release All to Inbox Now
                        </button>
                    </div>

                    {heldEmails.length === 0 ? (
                        <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                            <strong>No held emails yet</strong>
                            <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>New inbound messages will be listed here while your inbox is paused.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {heldEmails.map(mail => (
                                <div
                                    key={mail.id}
                                    style={{
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '16px'
                                    }}
                                >
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>
                                                {mail.external_sender_name || mail.external_sender_email || 'Unknown Sender'}
                                            </span>
                                            <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                HELD
                                            </span>
                                        </div>
                                        <div style={{ fontWeight: 500, fontSize: '0.84rem', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {mail.subject || '(No Subject)'}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {mail.preview || ''}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                        {mail.created_at ? new Date(mail.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Informational Guidance Footer */}
            <div
                style={{
                    marginTop: '36px',
                    padding: '20px 24px',
                    borderRadius: '12px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px'
                }}
            >
                <span style={{ fontSize: '24px' }}>💡</span>
                <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
                    <strong style={{ color: '#1e293b' }}>How Global Inbox Snooze Works:</strong>
                    <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                        <li>When snooze is activated, new incoming emails via webhooks or OAuth sync are intercepted and flagged as <code>HELD_BY_SNOOZE</code>.</li>
                        <li>They do not clutter your Inbox list or trigger notifications during your focus session.</li>
                        <li>When the countdown timer expires, the background auto-resume engine automatically restores your inbox and delivers all held emails together.</li>
                        <li>You can click <strong>"Resume Inbox Now"</strong> at any time to immediately receive all pending emails.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
