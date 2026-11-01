import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { DEFAULT_CATEGORIES } from '../settings/CategoriesSection';

/**
 * Outlook-Style Floating Context Menu for Email Inbox
 * Matches Microsoft Outlook Web UI:
 * - Clean white card container: w-56 bg-white rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.14)] border border-gray-200 py-1.5
 * - Standard items: w-full flex items-center justify-between px-3 py-1.5 hover:bg-gray-100
 * - Left content: flex items-center gap-3 with w-4 h-4 icon + label
 * - Right content: ChevronRight (w-4 h-4 text-gray-400) for sub-menus
 * - 4 distinct groups separated by subtle dividers
 */
export default function EmailContextMenu({
    x,
    y,
    selectedEmails = [],
    projects = [],
    onClose,
    onAction
}) {
    const menuRef = useRef(null);
    const [adjustedPos, setAdjustedPos] = useState({ x, y });
    const [activeSubmenu, setActiveSubmenu] = useState(null);
    const [submenuDirection, setSubmenuDirection] = useState('right'); // 'right' or 'left'
    const closeTimeoutRef = useRef(null);

    const hasSelection = selectedEmails && selectedEmails.length > 0;
    const allRead = hasSelection && selectedEmails.every(e => e.read);
    const allPinned = hasSelection && selectedEmails.every(e => e.pinned || e.isPinned);
    const allFlagged = hasSelection && selectedEmails.every(e => e.flagged || e.isFlagged);

    const [availableCategories, setAvailableCategories] = useState(() => {
        try {
            const stored = localStorage.getItem("userCategories");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return DEFAULT_CATEGORIES;
    });

    useEffect(() => {
        const handler = (e) => {
            if (e.detail && Array.isArray(e.detail)) {
                setAvailableCategories(e.detail);
            } else {
                try {
                    const stored = localStorage.getItem("userCategories");
                    if (stored) setAvailableCategories(JSON.parse(stored));
                } catch (err) {}
            }
        };
        window.addEventListener("categoriesUpdated", handler);
        return () => window.removeEventListener("categoriesUpdated", handler);
    }, []);

    // Calculate viewport boundaries and auto-flip
    useEffect(() => {
        if (!menuRef.current) return;
        const rect = menuRef.current.getBoundingClientRect();
        const menuWidth = rect.width || 224;
        const menuHeight = rect.height || 480;

        let posX = x;
        let posY = y;

        // Horizontal flip: if menu would overflow right viewport edge
        if (posX + menuWidth > window.innerWidth - 10) {
            posX = Math.max(10, window.innerWidth - menuWidth - 12);
            setSubmenuDirection('left');
        } else if (posX + menuWidth + 200 > window.innerWidth - 10) {
            // Submenu would clip on right, open submenu to the left
            setSubmenuDirection('left');
        } else {
            setSubmenuDirection('right');
        }

        // Vertical flip: if menu would overflow bottom viewport edge
        if (posY + menuHeight > window.innerHeight - 10) {
            posY = Math.max(10, window.innerHeight - menuHeight - 12);
        }

        setAdjustedPos({ x: posX, y: posY });
    }, [x, y]);

    // Handle click outside & escape key
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside, true);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside, true);
            document.removeEventListener('keydown', handleKeyDown);
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        };
    }, [onClose]);

    const handleMouseEnterItem = (submenuKey) => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        setActiveSubmenu(submenuKey);
    };

    const handleMouseLeaveItem = () => {
        closeTimeoutRef.current = setTimeout(() => {
            setActiveSubmenu(null);
        }, 220);
    };

    const handleSubmenuMouseEnter = () => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };

    const triggerAction = (action, payload = null) => {
        onAction(action, payload);
        onClose();
    };

    const menuContent = (
        <div
            ref={menuRef}
            className="email-context-menu w-56 bg-white rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.14)] border border-gray-200 py-1.5 text-sm text-gray-800 select-none z-50"
            style={{
                position: 'fixed',
                top: `${adjustedPos.y}px`,
                left: `${adjustedPos.x}px`,
                zIndex: 99999,
                width: '224px',
                backgroundColor: 'var(--menu-card-bg, #ffffff)',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.14)',
                border: '1px solid var(--menu-card-border, #e5e7eb)',
                padding: '6px 0',
                fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                fontSize: '13px',
                color: 'var(--menu-card-text, #1f2937)'
            }}
        >
            {/* ═══ GROUP 1: Storage & Filing ═══ */}

            {/* 1. Delete */}
            <ContextMenuItem
                icon={
                    <svg className="w-4 h-4 shrink-0 text-gray-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                }
                label="Delete"
                onClick={() => triggerAction('DELETE')}
            />

            {/* 2. Archive */}
            <ContextMenuItem
                icon={
                    <svg className="w-4 h-4 shrink-0 text-gray-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="21 8 21 21 3 21 3 8" />
                        <rect x="1" y="3" width="22" height="5" stroke="#10b981" />
                        <line x1="10" y1="12" x2="14" y2="12" />
                    </svg>
                }
                label="Archive"
                onClick={() => triggerAction('ARCHIVE')}
            />

            {/* 3. Move > */}
            <ContextMenuItem
                icon={
                    <svg className="w-4 h-4 shrink-0 text-gray-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                }
                label="Move"
                hasSubmenu
                isActive={activeSubmenu === 'move'}
                onMouseEnter={() => handleMouseEnterItem('move')}
                onMouseLeave={handleMouseLeaveItem}
            >
                {activeSubmenu === 'move' && (
                    <ContextMenuSubmenu direction={submenuDirection} onMouseEnter={handleSubmenuMouseEnter} onMouseLeave={handleMouseLeaveItem}>
                        <ContextMenuSubmenuItem label="Inbox" icon="📥" onClick={() => triggerAction('MOVE', { targetFolderId: 'inbox' })} />
                        <ContextMenuSubmenuItem label="Archive" icon="📦" onClick={() => triggerAction('MOVE', { targetFolderId: 'archive' })} />
                        <ContextMenuSubmenuItem label="Junk Email" icon="🚫" onClick={() => triggerAction('MOVE', { targetFolderId: 'junk' })} />
                        <ContextMenuSubmenuItem label="Deleted Items" icon="🗑️" onClick={() => triggerAction('MOVE', { targetFolderId: 'deleted' })} />
                        {projects && projects.length > 0 && (
                            <>
                                <ContextMenuDivider />
                                <div className="email-context-group-title px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                    Projects
                                </div>
                                {projects.slice(0, 5).map(p => (
                                    <ContextMenuSubmenuItem
                                        key={p.project_id || p.id}
                                        label={p.project_name || p.name || p.project_id}
                                        icon="📁"
                                        onClick={() => triggerAction('MOVE', { targetFolderId: p.project_id || p.id })}
                                    />
                                ))}
                            </>
                        )}
                    </ContextMenuSubmenu>
                )}
            </ContextMenuItem>

            {/* 4. Copy > */}
            <ContextMenuItem
                icon={
                    <svg className="w-4 h-4 shrink-0 text-gray-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                }
                label="Copy"
                hasSubmenu
                isActive={activeSubmenu === 'copy'}
                onMouseEnter={() => handleMouseEnterItem('copy')}
                onMouseLeave={handleMouseLeaveItem}
            >
                {activeSubmenu === 'copy' && (
                    <ContextMenuSubmenu direction={submenuDirection} onMouseEnter={handleSubmenuMouseEnter} onMouseLeave={handleMouseLeaveItem}>
                        <ContextMenuSubmenuItem label="Inbox" icon="📥" onClick={() => triggerAction('COPY', { targetFolderId: 'inbox' })} />
                        <ContextMenuSubmenuItem label="Archive" icon="📦" onClick={() => triggerAction('COPY', { targetFolderId: 'archive' })} />
                        <ContextMenuSubmenuItem label="Junk Email" icon="🚫" onClick={() => triggerAction('COPY', { targetFolderId: 'junk' })} />
                        <ContextMenuSubmenuItem label="Deleted Items" icon="🗑️" onClick={() => triggerAction('COPY', { targetFolderId: 'deleted' })} />
                    </ContextMenuSubmenu>
                )}
            </ContextMenuItem>

            <ContextMenuDivider />

            {/* ═══ GROUP 2: Triage & Tags ═══ */}

            {/* 5. Mark as unread / Mark as read */}
            <ContextMenuItem
                icon={
                    <svg className="w-4 h-4 shrink-0 text-gray-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        {allRead ? (
                            <>
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                            </>
                        ) : (
                            <>
                                <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9" />
                                <polyline points="22,6 12,13 2,6" />
                                <line x1="16" y1="19" x2="22" y2="19" />
                            </>
                        )}
                    </svg>
                }
                label={allRead ? 'Mark as unread' : 'Mark as read'}
                onClick={() => triggerAction(allRead ? 'MARK_UNREAD' : 'MARK_READ')}
            />

            {/* 6. Pin / Unpin */}
            <ContextMenuItem
                icon={
                    <svg className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill={allPinned ? "#0078D4" : "none"} stroke="#0078D4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                }
                label={allPinned ? 'Unpin' : 'Pin'}
                onClick={() => triggerAction(allPinned ? 'UNPIN' : 'PIN')}
            />

            {/* 7. Categorize > (Filled Blue Tag Icon matching reference) */}
            <ContextMenuItem
                icon={
                    <svg className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="#0078D4" stroke="#0078D4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" stroke="#ffffff" strokeWidth="2.5" />
                    </svg>
                }
                label="Categorize"
                hasSubmenu
                isActive={activeSubmenu === 'categorize'}
                onMouseEnter={() => handleMouseEnterItem('categorize')}
                onMouseLeave={handleMouseLeaveItem}
            >
                {activeSubmenu === 'categorize' && (
                    <ContextMenuSubmenu direction={submenuDirection} onMouseEnter={handleSubmenuMouseEnter} onMouseLeave={handleMouseLeaveItem}>
                        {availableCategories.map(cat => (
                            <ContextMenuSubmenuItem
                                key={cat.id || cat.name}
                                label={cat.name}
                                icon={<span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: cat.color }} />}
                                onClick={() => triggerAction('CATEGORIZE', { categoryColor: cat.name })}
                            />
                        ))}
                        <ContextMenuDivider />
                        <ContextMenuSubmenuItem
                            label="Clear all categories"
                            icon="✖"
                            onClick={() => triggerAction('CATEGORIZE', { categoryColor: 'clear' })}
                        />
                    </ContextMenuSubmenu>
                )}
            </ContextMenuItem>

            {/* 8. Flag / Unflag */}
            <ContextMenuItem
                icon={
                    <svg className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill={allFlagged ? "#ef4444" : "none"} stroke={allFlagged ? "#ef4444" : "#64748b"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                        <line x1="4" y1="22" x2="4" y2="15" />
                    </svg>
                }
                label={allFlagged ? 'Unflag' : 'Flag'}
                onClick={() => triggerAction(allFlagged ? 'UNFLAG' : 'FLAG')}
            />

            {/* 9. Snooze > */}
            <ContextMenuItem
                icon={
                    <svg className="w-4 h-4 shrink-0 text-gray-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                }
                label="Snooze"
                hasSubmenu
                isActive={activeSubmenu === 'snooze'}
                onMouseEnter={() => handleMouseEnterItem('snooze')}
                onMouseLeave={handleMouseLeaveItem}
            >
                {activeSubmenu === 'snooze' && (
                    <ContextMenuSubmenu direction={submenuDirection} onMouseEnter={handleSubmenuMouseEnter} onMouseLeave={handleMouseLeaveItem}>
                        <ContextMenuSubmenuItem
                            label="Later today"
                            subtext="3 hrs"
                            icon="🕒"
                            onClick={() => {
                                const target = new Date(Date.now() + 3 * 60 * 60 * 1000);
                                triggerAction('SNOOZE', { snoozeUntil: target.toISOString() });
                            }}
                        />
                        <ContextMenuSubmenuItem
                            label="Tomorrow"
                            subtext="9:00 AM"
                            icon="🌅"
                            onClick={() => {
                                const target = new Date();
                                target.setDate(target.getDate() + 1);
                                target.setHours(9, 0, 0, 0);
                                triggerAction('SNOOZE', { snoozeUntil: target.toISOString() });
                            }}
                        />
                        <ContextMenuSubmenuItem
                            label="This weekend"
                            subtext="Sat 9 AM"
                            icon="🗓️"
                            onClick={() => {
                                const now = new Date();
                                const dayDiff = (6 - now.getDay() + 7) % 7 || 7;
                                const target = new Date();
                                target.setDate(now.getDate() + dayDiff);
                                target.setHours(9, 0, 0, 0);
                                triggerAction('SNOOZE', { snoozeUntil: target.toISOString() });
                            }}
                        />
                        <ContextMenuSubmenuItem
                            label="Next week"
                            subtext="Mon 9 AM"
                            icon="📅"
                            onClick={() => {
                                const now = new Date();
                                const dayDiff = (8 - now.getDay()) % 7 || 7;
                                const target = new Date();
                                target.setDate(now.getDate() + dayDiff);
                                target.setHours(9, 0, 0, 0);
                                triggerAction('SNOOZE', { snoozeUntil: target.toISOString() });
                            }}
                        />
                        <ContextMenuDivider />
                        <ContextMenuSubmenuItem
                            label="Pick a date..."
                            icon="📆"
                            onClick={() => triggerAction('SNOOZE_PICK_DATE')}
                        />
                    </ContextMenuSubmenu>
                )}
            </ContextMenuItem>

            {/* 10. Set quick actions */}
            <ContextMenuItem
                icon={
                    <svg className="w-4 h-4 shrink-0 text-gray-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                }
                label="Set quick actions"
                onClick={() => triggerAction('SET_QUICK_ACTIONS')}
            />

            <ContextMenuDivider />

            {/* ═══ GROUP 3: Safety & Filtering ═══ */}

            {/* 11. Report > */}
            <ContextMenuItem
                icon={
                    <svg className="w-4 h-4 shrink-0 text-red-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                }
                label="Report"
                hasSubmenu
                isActive={activeSubmenu === 'report'}
                onMouseEnter={() => handleMouseEnterItem('report')}
                onMouseLeave={handleMouseLeaveItem}
            >
                {activeSubmenu === 'report' && (
                    <ContextMenuSubmenu direction={submenuDirection} onMouseEnter={handleSubmenuMouseEnter} onMouseLeave={handleMouseLeaveItem}>
                        <ContextMenuSubmenuItem label="Report phishing" icon="🎣" onClick={() => triggerAction('REPORT', { reportType: 'phishing' })} />
                        <ContextMenuSubmenuItem label="Report junk" icon="⚠️" onClick={() => triggerAction('REPORT', { reportType: 'junk' })} />
                    </ContextMenuSubmenu>
                )}
            </ContextMenuItem>

            {/* 12. Block > */}
            <ContextMenuItem
                icon={
                    <svg className="w-4 h-4 shrink-0 text-red-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                }
                label="Block"
                hasSubmenu
                isActive={activeSubmenu === 'block'}
                onMouseEnter={() => handleMouseEnterItem('block')}
                onMouseLeave={handleMouseLeaveItem}
            >
                {activeSubmenu === 'block' && (
                    <ContextMenuSubmenu direction={submenuDirection} onMouseEnter={handleSubmenuMouseEnter} onMouseLeave={handleMouseLeaveItem}>
                        <ContextMenuSubmenuItem label="Block sender(s)" icon="🚫" onClick={() => triggerAction('BLOCK')} />
                    </ContextMenuSubmenu>
                )}
            </ContextMenuItem>

            {/* 13. Ignore */}
            <ContextMenuItem
                icon={
                    <svg className="w-4 h-4 shrink-0 text-red-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <line x1="23" y1="9" x2="17" y2="15" />
                        <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                }
                label="Ignore"
                onClick={() => triggerAction('IGNORE')}
            />

            <ContextMenuDivider />

            {/* ═══ GROUP 4: View Options ═══ */}

            {/* 14. View > */}
            <ContextMenuItem
                icon={
                    <svg className="w-4 h-4 shrink-0 text-gray-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                }
                label="View"
                hasSubmenu
                isActive={activeSubmenu === 'view'}
                onMouseEnter={() => handleMouseEnterItem('view')}
                onMouseLeave={handleMouseLeaveItem}
            >
                {activeSubmenu === 'view' && (
                    <ContextMenuSubmenu direction={submenuDirection} onMouseEnter={handleSubmenuMouseEnter} onMouseLeave={handleMouseLeaveItem}>
                        <ContextMenuSubmenuItem label="View message details" icon="ℹ️" onClick={() => triggerAction('VIEW_DETAILS')} />
                        <ContextMenuSubmenuItem label="View message source" icon="📄" onClick={() => triggerAction('VIEW_SOURCE')} />
                    </ContextMenuSubmenu>
                )}
            </ContextMenuItem>
        </div>
    );

    return ReactDOM.createPortal(menuContent, document.body);
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function ContextMenuItem({ icon, label, hasSubmenu = false, isActive = false, onClick, onMouseEnter, onMouseLeave, children }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="relative"
            onMouseEnter={() => {
                setIsHovered(true);
                if (onMouseEnter) onMouseEnter();
            }}
            onMouseLeave={() => {
                setIsHovered(false);
                if (onMouseLeave) onMouseLeave();
            }}
        >
            <button
                type="button"
                role="menuitem"
                className={`email-context-menu-item w-full flex items-center justify-between px-3 py-1.5 transition-colors cursor-pointer text-left border-0 ${
                    (isHovered || isActive) ? 'is-active bg-[#F3F2F1] text-gray-900' : 'bg-transparent text-gray-700'
                }`}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    backgroundColor: (isHovered || isActive) ? 'var(--menu-hover-bg, #F3F2F1)' : 'transparent',
                    color: (isHovered || isActive) ? 'var(--menu-hover-text, #111827)' : 'var(--menu-card-text, #374151)',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '13px',
                    transition: 'background-color 0.1s ease'
                }}
                onClick={onClick}
            >
                {/* Left content: Icon + Label */}
                <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="w-4 h-4 flex items-center justify-center shrink-0" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px' }}>
                        {icon}
                    </span>
                    <span className="truncate whitespace-nowrap" style={{ fontSize: '13px' }}>{label}</span>
                </div>

                {/* Right content: ChevronRight for submenus */}
                {hasSubmenu && (
                    <svg
                        className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: '#9ca3af' }}
                    >
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                )}
            </button>

            {children}
        </div>
    );
}

function ContextMenuSubmenu({ direction = 'right', onMouseEnter, onMouseLeave, children }) {
    return (
        <div
            className="email-context-submenu w-48 bg-white rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.14)] border border-gray-200 py-1.5 text-sm text-gray-800 z-50 select-none"
            style={{
                position: 'absolute',
                top: '-4px',
                left: direction === 'right' ? '100%' : 'auto',
                right: direction === 'left' ? '100%' : 'auto',
                marginLeft: direction === 'right' ? '4px' : '0',
                marginRight: direction === 'left' ? '4px' : '0',
                zIndex: 100000,
                width: '196px',
                backgroundColor: 'var(--menu-card-bg, #ffffff)',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.14)',
                border: '1px solid var(--menu-card-border, #e5e7eb)',
                padding: '4px 0',
                fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                fontSize: '12px'
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {children}
        </div>
    );
}

function ContextMenuSubmenuItem({ label, icon, subtext, onClick }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            role="menuitem"
            className="email-context-submenu-item w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#F3F2F1] cursor-pointer text-left text-xs transition-colors"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                cursor: 'pointer',
                backgroundColor: isHovered ? 'var(--menu-hover-bg, #F3F2F1)' : 'transparent',
                color: isHovered ? 'var(--menu-hover-text, #111827)' : 'var(--menu-card-text, #374151)',
                fontSize: '12px'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {typeof icon === 'string' ? (
                    <span style={{ fontSize: '13px', display: 'inline-flex', width: '16px', justifyContent: 'center' }}>{icon}</span>
                ) : (
                    <span style={{ display: 'inline-flex', width: '16px', justifyContent: 'center' }}>{icon}</span>
                )}
                <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {subtext && (
                <span className="email-context-subtext" style={{ fontSize: '10px', color: '#9ca3af', marginLeft: '8px' }}>{subtext}</span>
            )}
        </div>
    );
}

function ContextMenuDivider() {
    return (
        <div
            className="email-context-divider my-1 border-t border-gray-200"
            style={{
                height: '1px',
                borderTop: '1px solid var(--menu-divider, #e5e7eb)',
                margin: '4px 0',
                width: '100%'
            }}
        />
    );
}
