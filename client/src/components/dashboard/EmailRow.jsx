import React from 'react';
import { formatMailPreviewDate } from '../../utils/dateUtils';

export default function EmailRow({ 
    email, 
    isSelected = false, 
    isActive = false, 
    onSelect, 
    onClick, 
    onToggleRead, 
    onDelete, 
    onTogglePin 
}) {
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

    return (
        <div 
            id={`emailRow-${email.id}`}
            data-date={email.date || ''}
            className={`mail-row ${email.read ? 'read' : 'unread'} ${isActive ? 'active' : ''} ${email.pinned ? 'pinned-mail' : 'unpinned-mail'}`} 
            onClick={() => onClick && onClick(email)}
            tabIndex={0}
            role="button"
        >
            <div className="mail-from-cell">
                <input 
                    type="checkbox" 
                    className="email-select-cb" 
                    checked={isSelected}
                    onChange={(e) => {
                        e.stopPropagation();
                        onSelect && onSelect(email.id, e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()} 
                    aria-label={`Select email from ${senderName}`}
                />
                
                <span 
                    className="mail-avatar" 
                    style={{ backgroundColor: avatarBg, color: avatarColor }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {initials}
                </span>

                <div className="mail-content">
                    <div className="mail-header-row">
                        <div className="mail-sender" style={{ cursor: 'pointer' }}>
                            {senderName}
                        </div>
                        <div className="mail-date">{formatMailPreviewDate(email.date)}</div>
                        
                        <div className="mail-hover-actions" onClick={(e) => e.stopPropagation()}>
                            <button 
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
                                        <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9"/>
                                        <polyline points="22,6 12,13 2,6"/>
                                        <line x1="16" y1="19" x2="22" y2="19"/>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                        <polyline points="22,6 12,13 2,6"/>
                                    </svg>
                                )}
                            </button>

                            <button 
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

                            <button 
                                className="hover-action-btn" 
                                title={email.pinned ? "Unpin" : "Pin"}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTogglePin && onTogglePin(email.id);
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={email.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="mail-subject">
                        <span className="mail-subject-text">{email.subject || 'No Subject'}</span>
                    </div>

                    <div className="mail-preview">
                        {email.preview || ''}
                    </div>

                    {/* Meta chips */}
                    <div className="mail-meta-row">
                        {!email.read && <span className="mail-status-chip unread-dot" title="Unread" aria-hidden="true"></span>}
                        {email.emailNo && <span className="mail-status-chip email-no">#{email.emailNo}</span>}
                        {email.action && <span className="mail-status-chip action">Action</span>}
                        {email.replied && <span className="mail-status-chip replied">Replied</span>}
                        {email.pinned && <span className="mail-status-chip pinned">Pinned</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}
