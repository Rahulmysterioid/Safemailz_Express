import React, { useState, useRef, useEffect } from 'react';

/**
 * Outlook-style Reading Pane Multi-Select Summary
 * Displayed in the reading pane when one or more email conversations are selected.
 * Matches Microsoft Outlook Web UI:
 * - Centered envelope checkmark illustration
 * - Crisp title ("X conversations selected" or "Everything in Inbox is selected")
 * - Compact borderless blue action list (#0078D4) with hover effect (#F3F2F1)
 * - Subtle divider before Cancel
 */
export default function MultiSelectReadingPaneSummary({
    selectedCount = 2,
    currentFolder = 'inbox',
    isAllSelected = false,
    allRead = false,
    allFlagged = false,
    onDelete,
    onFlag,
    onToggleRead,
    onMove,
    onCancel,
    projects = []
}) {
    const [showMoveMenu, setShowMoveMenu] = useState(false);
    const moveBtnRef = useRef(null);

    const folderDisplay = currentFolder.charAt(0).toUpperCase() + currentFolder.slice(1);

    // Close move menu on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (moveBtnRef.current && !moveBtnRef.current.contains(e.target)) {
                setShowMoveMenu(false);
            }
        };
        if (showMoveMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMoveMenu]);

    // Strict guard: Multi-select bulk actions MUST ONLY be displayed when 2 or more emails are selected
    if (selectedCount <= 1) {
        return null;
    }

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-white px-4 py-8 select-none text-center" style={{ fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif' }}>
            {/* Outlook-Style Envelope Graphic with Checkmark Badge */}
            <div className="mb-4 relative" style={{ width: '96px', height: '96px' }}>
                <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Shadow underneath */}
                    <ellipse cx="48" cy="84" rx="36" ry="6" fill="#000000" fillOpacity="0.06" />

                    {/* Back Envelope flap */}
                    <path
                        d="M20 36C20 33.7909 21.7909 32 24 32H72C74.2091 32 76 33.7909 76 36V70C76 72.2091 74.2091 74 72 74H24C21.7909 74 20 72.2091 20 70V36Z"
                        fill="#E2E8F0"
                    />

                    {/* Letter Paper inside */}
                    <path
                        d="M26 28C26 26.8954 26.8954 26 28 26H68C69.1046 26 70 26.8954 70 28V52H26V28Z"
                        fill="#FFFFFF"
                        stroke="#CBD5E1"
                        strokeWidth="1.5"
                    />

                    {/* Green Accent Banner on Paper */}
                    <path d="M26 28C26 26.8954 26.8954 26 28 26H68C69.1046 26 70 26.8954 70 28V33H26V28Z" fill="#10B981" />

                    {/* Front Envelope Body */}
                    <path
                        d="M20 44L44.8 59.5C46.7556 60.7222 49.2444 60.7222 51.2 59.5L76 44V70C76 72.2091 74.2091 74 72 74H24C21.7909 74 20 72.2091 20 70V44Z"
                        fill="#F8FAFC"
                        stroke="#CBD5E1"
                        strokeWidth="1.5"
                    />

                    {/* Envelope Left/Right Fold Lines */}
                    <path d="M20 73L43 56" stroke="#E2E8F0" strokeWidth="1.5" />
                    <path d="M76 73L53 56" stroke="#E2E8F0" strokeWidth="1.5" />

                    {/* Floating Blue Circle with White Checkmark */}
                    <circle cx="48" cy="46" r="16" fill="#0078D4" />
                    <path
                        d="M42 46.5L46 50.5L54 41.5"
                        stroke="#FFFFFF"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>

            {/* Selected Heading */}
            <h3 className="text-[15px] font-semibold text-gray-900 text-center m-0">
                {isAllSelected
                    ? `Everything in ${folderDisplay} is selected`
                    : `${selectedCount} ${selectedCount === 1 ? 'conversation' : 'conversations'} selected`}
            </h3>

            {/* Outlook-Style Borderless Blue Action List */}
            <div className="w-44 mt-5 flex flex-col items-start space-y-0.5 mx-auto">
                {/* 1. Delete */}
                <BlueActionButton
                    icon={
                        <svg className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                    }
                    label={isAllSelected ? `Empty ${folderDisplay}` : "Delete"}
                    onClick={onDelete}
                />

                {/* 2. Flag */}
                <BlueActionButton
                    icon={
                        <svg className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill={allFlagged ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                            <line x1="4" y1="22" x2="4" y2="15" />
                        </svg>
                    }
                    label={allFlagged ? "Unflag" : "Flag"}
                    onClick={onFlag}
                />

                {/* 3. Mark as read / unread */}
                <BlueActionButton
                    icon={
                        <svg className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                    label={allRead ? "Mark as unread" : "Mark as read"}
                    onClick={onToggleRead}
                />

                {/* 4. Move with Dropdown */}
                <div ref={moveBtnRef} className="relative w-full">
                    <BlueActionButton
                        icon={
                            <svg className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                        }
                        label="Move"
                        hasChevron
                        onClick={() => setShowMoveMenu(!showMoveMenu)}
                    />

                    {showMoveMenu && (
                        <div
                            className="absolute top-full left-0 w-48 mt-1 bg-white rounded-md shadow-[0_8px_20px_rgba(0,0,0,0.12)] border border-gray-200 py-1 z-50 text-left"
                            style={{
                                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)',
                                border: '1px solid #e2e8f0',
                                backgroundColor: '#ffffff',
                                borderRadius: '6px'
                            }}
                        >
                            <MoveDropdownItem label="Inbox" icon="📥" onClick={() => { onMove('inbox'); setShowMoveMenu(false); }} />
                            <MoveDropdownItem label="Archive" icon="📦" onClick={() => { onMove('archive'); setShowMoveMenu(false); }} />
                            <MoveDropdownItem label="Junk Email" icon="🚫" onClick={() => { onMove('junk'); setShowMoveMenu(false); }} />
                            <MoveDropdownItem label="Deleted Items" icon="🗑️" onClick={() => { onMove('deleted'); setShowMoveMenu(false); }} />
                            {projects && projects.length > 0 && (
                                <>
                                    <div className="w-full border-t border-gray-100 my-1" />
                                    <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">PROJECTS</div>
                                    {projects.slice(0, 5).map(p => (
                                        <MoveDropdownItem
                                            key={p.project_id || p.id}
                                            label={p.project_name || p.name || p.project_id}
                                            icon="📁"
                                            onClick={() => { onMove(p.project_id || p.id); setShowMoveMenu(false); }}
                                        />
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Subtle Horizontal Divider */}
                <div className="w-full border-t border-gray-200 my-2" style={{ borderTop: '1px solid #e5e7eb', margin: '8px 0', width: '100%' }} />

                {/* 5. Cancel Selection */}
                <BlueActionButton
                    icon={
                        <svg className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    }
                    label="Cancel"
                    onClick={onCancel}
                />
            </div>
        </div>
    );
}

/**
 * Clean Outlook Ghost Button in Microsoft Outlook Blue (#0078D4)
 */
function BlueActionButton({ icon, label, hasChevron = false, onClick }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            type="button"
            className="w-full flex items-center gap-3 px-2.5 py-1.5 text-sm font-normal text-[#0078D4] hover:bg-[#F3F2F1] hover:text-[#005A9E] rounded transition-colors text-left cursor-pointer border-0 bg-transparent"
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '6px 10px',
                fontSize: '14px',
                fontWeight: 400,
                color: isHovered ? '#005A9E' : '#0078D4',
                backgroundColor: isHovered ? '#F3F2F1' : 'transparent',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.12s ease, color 0.12s ease'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', color: 'inherit' }}>
                {icon}
            </span>
            <span style={{ flex: 1, whiteSpace: 'nowrap', color: 'inherit' }}>{label}</span>
            {hasChevron && (
                <svg className="w-3.5 h-3.5 ml-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'inherit' }}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            )}
        </button>
    );
}

function MoveDropdownItem({ label, icon, onClick }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            role="menuitem"
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-[#F3F2F1] hover:text-gray-900 cursor-pointer transition-colors"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                backgroundColor: isHovered ? '#F3F2F1' : 'transparent',
                color: isHovered ? '#0f172a' : '#334155'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            <span style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', width: '16px', justifyContent: 'center' }}>{icon}</span>
            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        </div>
    );
}
