import React, { useState, useEffect } from 'react';
import { formatMailPreviewDate } from '../../utils/dateUtils';
import EmailAvatarCheckboxSlot from './EmailAvatarCheckboxSlot';

export default function EmailRow({
    email,
    isSelected = false,
    isActive = false,
    quickActions = ['read', 'delete', 'snooze', 'pin'],
    onSelect,
    onClick,
    onContextMenu,
    onToggleRead,
    onDelete,
    onArchive,
    onTogglePin,
    onToggleFlag,
    onSnooze,
    onUnsnooze,
    isThreadParent = false,
    isExpanded = false,
    onToggleExpand,
    messageCount = 1
}) {
    const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [userCategoryList, setUserCategoryList] = useState(() => {
        try {
            const stored = localStorage.getItem("userCategories");
            if (stored) return JSON.parse(stored);
        } catch (e) {}
        return [];
    });

    useEffect(() => {
        const handler = (e) => {
            if (e.detail && Array.isArray(e.detail)) {
                setUserCategoryList(e.detail);
            } else {
                try {
                    const stored = localStorage.getItem("userCategories");
                    if (stored) setUserCategoryList(JSON.parse(stored));
                } catch (err) {}
            }
        };
        window.addEventListener("categoriesUpdated", handler);
        return () => window.removeEventListener("categoriesUpdated", handler);
    }, []);

    const handleSnoozeOption = (type) => {
        if (!onSnooze) return;
        const now = new Date();
        let target = new Date();

        if (type === 'later') {
            target = new Date(Date.now() + 3 * 60 * 60 * 1000);
        } else if (type === 'tomorrow') {
            target.setDate(now.getDate() + 1);
            target.setHours(9, 0, 0, 0);
        } else if (type === 'weekend') {
            const dayDiff = (6 - now.getDay() + 7) % 7 || 7;
            target.setDate(now.getDate() + dayDiff);
            target.setHours(9, 0, 0, 0);
        } else if (type === 'nextweek') {
            const dayDiff = (8 - now.getDay()) % 7 || 7;
            target.setDate(now.getDate() + dayDiff);
            target.setHours(9, 0, 0, 0);
        }

        setShowSnoozeMenu(false);
        onSnooze(email.id, target.toISOString());
    };

    const senderName = email.sender || 'Unknown';
    const initials = senderName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'U';

    // Hash-based pastel color generator
    let hash = 0;
    for (let i = 0; i < senderName.length; i++) {
        hash = senderName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    const avatarBg = `hsl(${h}, 70%, 90%)`;
    const avatarColor = `hsl(${h}, 80%, 30%)`;

    const isPinned = Boolean(email.pinned || email.isPinned);
    const isFlagged = Boolean(email.flagged || email.isFlagged);
    const categories = Array.isArray(email.categories) ? email.categories : (email.categories ? [email.categories] : []);

    const categoryColorMap = {
        blue:   { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
        green:  { bg: '#d1fae5', color: '#065f46', border: '#a7f3d0' },
        orange: { bg: '#ffedd5', color: '#9a3412', border: '#fed7aa' },
        purple: { bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff' },
        red:    { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
        yellow: { bg: '#fef9c3', color: '#854d0e', border: '#fef08a' },
    };

    const getCategoryStyle = (catName) => {
        if (!catName) return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
        const raw = String(catName).toLowerCase().trim();

        // 1. Exact match against user custom / configured categories first
        const found = userCategoryList.find(c => 
            (c.name && c.name.toLowerCase().trim() === raw) || 
            (c.id && c.id.toLowerCase() === raw)
        );
        if (found) {
            return {
                bg: found.bg || '#f1f5f9',
                color: found.color || '#334155',
                border: found.border || '#cbd5e1'
            };
        }

        // 2. Exact match in standard color map
        const stripped = raw.replace(/\s+category$/i, '');
        if (categoryColorMap[raw]) return categoryColorMap[raw];
        if (categoryColorMap[stripped]) return categoryColorMap[stripped];

        return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    };

    // Render individual hover quick action button based on user settings
    const renderQuickActionBtn = (actionId) => {
        switch (actionId) {
            case 'read':
                return (
                    <button
                        key="read"
                        className="hover-action-btn"
                        title={email.read ? "Mark as Unread" : "Mark as Read"}
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleRead && onToggleRead(email.id);
                        }}
                    >
                        {email.read ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9" />
                                <polyline points="22,6 12,13 2,6" />
                                <line x1="16" y1="19" x2="22" y2="19" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                            </svg>
                        )}
                    </button>
                );
            case 'delete':
                return (
                    <button
                        key="delete"
                        className="hover-action-btn"
                        title="Delete"
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete && onDelete(email.id);
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                );
            case 'archive':
                return (
                    <button
                        key="archive"
                        className="hover-action-btn"
                        title="Archive"
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onArchive && onArchive(email.id);
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="21 8 21 21 3 21 3 8"></polyline>
                            <rect x="1" y="3" width="22" height="5"></rect>
                            <line x1="10" y1="12" x2="14" y2="12"></line>
                        </svg>
                    </button>
                );
            case 'snooze':
                return (
                    <div key="snooze" className="relative inline-block" style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                            className="hover-action-btn"
                            title="Snooze"
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowSnoozeMenu(!showSnoozeMenu);
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </button>

                        {showSnoozeMenu && (
                            <div
                                className="mail-snooze-dropdown"
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '100%',
                                    marginTop: '4px',
                                    width: '175px',
                                    backgroundColor: '#ffffff',
                                    borderRadius: '8px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                    border: '1px solid #e2e8f0',
                                    padding: '4px 0',
                                    zIndex: 9999
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="mail-snooze-dropdown-header" style={{ padding: '4px 12px', fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Snooze until...
                                </div>
                                <button
                                    type="button"
                                    style={{ width: '100%', textAlign: 'left', padding: '6px 12px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#334155' }}
                                    className="mail-snooze-option hover:bg-slate-50"
                                    onClick={() => handleSnoozeOption('later')}
                                >
                                    <span>🕒 Later today</span>
                                    <span className="mail-snooze-time" style={{ fontSize: '10px', color: '#94a3b8' }}>3 hrs</span>
                                </button>
                                <button
                                    type="button"
                                    style={{ width: '100%', textAlign: 'left', padding: '6px 12px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#334155' }}
                                    className="mail-snooze-option hover:bg-slate-50"
                                    onClick={() => handleSnoozeOption('tomorrow')}
                                >
                                    <span>🌅 Tomorrow</span>
                                    <span className="mail-snooze-time" style={{ fontSize: '10px', color: '#94a3b8' }}>9 AM</span>
                                </button>
                                <button
                                    type="button"
                                    style={{ width: '100%', textAlign: 'left', padding: '6px 12px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#334155' }}
                                    className="mail-snooze-option hover:bg-slate-50"
                                    onClick={() => handleSnoozeOption('weekend')}
                                >
                                    <span>🗓️ This weekend</span>
                                    <span className="mail-snooze-time" style={{ fontSize: '10px', color: '#94a3b8' }}>Sat 9 AM</span>
                                </button>
                                <button
                                    type="button"
                                    style={{ width: '100%', textAlign: 'left', padding: '6px 12px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#334155' }}
                                    className="mail-snooze-option hover:bg-slate-50"
                                    onClick={() => handleSnoozeOption('nextweek')}
                                >
                                    <span>📅 Next week</span>
                                    <span className="mail-snooze-time" style={{ fontSize: '10px', color: '#94a3b8' }}>Mon 9 AM</span>
                                </button>
                            </div>
                        )}
                    </div>
                );
            case 'flag':
                return (
                    <button
                        key="flag"
                        className="hover-action-btn"
                        title={isFlagged ? "Unflag" : "Flag"}
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFlag && onToggleFlag(email.id);
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={isFlagged ? "#ef4444" : "none"} stroke={isFlagged ? "#ef4444" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                            <line x1="4" y1="22" x2="4" y2="15"></line>
                        </svg>
                    </button>
                );
            case 'pin':
            default:
                return (
                    <button
                        key="pin"
                        className="hover-action-btn"
                        title={isPinned ? "Unpin" : "Pin"}
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin && onTogglePin(email.id);
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                    </button>
                );
        }
    };

    return (
        <div
            id={`emailRow-${email.id}`}
            data-date={email.date || ''}
            className={`mail-row ${email.read ? 'read' : 'unread'} ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''} ${isPinned ? 'pinned-mail' : 'unpinned-mail'}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onClick && onClick(email)}
            onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu && onContextMenu(e, email);
            }}
            tabIndex={0}
            role="button"
        >
            <div className="mail-from-cell">
                {isThreadParent && messageCount > 1 && (
                    <button
                        type="button"
                        className="mail-thread-chevron-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand && onToggleExpand();
                        }}
                        title={isExpanded ? "Collapse thread" : "Expand thread"}
                        aria-label={isExpanded ? "Collapse thread" : "Expand thread"}
                    >
                        {isExpanded ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        )}
                    </button>
                )}

                <EmailAvatarCheckboxSlot
                    email={email}
                    isHovered={isHovered}
                    isSelected={isSelected}
                    onToggleSelect={onSelect}
                    onAvatarClick={() => onClick && onClick(email)}
                    initials={initials}
                    avatarBg={avatarBg}
                    avatarColor={avatarColor}
                    avatarHue={h}
                />

                <div className="mail-content">
                    <div className="mail-header-row">
                        <div className="mail-sender" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{senderName}</span>
                            {isThreadParent && messageCount > 1 && (
                                <span className="mail-thread-count-badge" title={`${messageCount} messages in thread`}>
                                    {messageCount}
                                </span>
                            )}
                        </div>
                        <div className="mail-date">{formatMailPreviewDate(email.date)}</div>

                        <div className="mail-hover-actions" onClick={(e) => e.stopPropagation()}>
                            {quickActions.map(actionId => renderQuickActionBtn(actionId))}

                            {email.snoozedUntil && onUnsnooze && (
                                <button
                                    className="hover-action-btn"
                                    title="Unsnooze (Move to Inbox)"
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onUnsnooze(email.id);
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="9 14 4 9 9 4"></polyline>
                                        <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mail-subject">
                        <span className="mail-subject-text">{email.subject || 'No Subject'}</span>
                    </div>

                    <div className="mail-preview">
                        {email.preview || ''}
                    </div>

                    {/* Meta chips */}
                    <div className="mail-meta-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {!email.read && <span className="mail-status-chip unread-dot" title="Unread" aria-hidden="true"></span>}
                        {email.action && <span className="mail-status-chip action">Action</span>}
                        {email.replied && <span className="mail-status-chip replied">Replied</span>}
                        {isPinned && (
                            <span className="mail-status-chip pinned" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                📌 Pinned
                            </span>
                        )}
                        {isFlagged && (
                            <span
                                className="mail-status-chip flagged"
                                style={{
                                    padding: '1px 6px',
                                    fontSize: '10px',
                                    borderRadius: '9999px',
                                    backgroundColor: '#fee2e2',
                                    color: '#b91c1c',
                                    border: '1px solid #fecaca',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontWeight: 600
                                }}
                            >
                                🚩 Flagged
                            </span>
                        )}
                        {categories.map((cat, idx) => {
                            const cStyle = getCategoryStyle(cat);
                            return (
                                <span
                                    key={idx}
                                    className="mail-status-chip mail-category-chip"
                                    style={{
                                        padding: '1px 7px',
                                        fontSize: '10px',
                                        borderRadius: '9999px',
                                        backgroundColor: cStyle.bg,
                                        color: cStyle.color,
                                        border: `1px solid ${cStyle.border}`,
                                        fontWeight: 600,
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    ● {cat}
                                </span>
                            );
                        })}
                        {email.snoozedUntil && (
                            <span
                                className="mail-status-chip snooze"
                                title={`Snoozed until ${new Date(email.snoozedUntil).toLocaleString()}`}
                                style={{
                                    padding: '2px 7px',
                                    fontSize: '10px',
                                    borderRadius: '9999px',
                                    backgroundColor: '#fef3c7',
                                    color: '#b45309',
                                    border: '1px solid #fde68a',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontWeight: 600
                                }}
                            >
                                ⏰ Snoozed
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
