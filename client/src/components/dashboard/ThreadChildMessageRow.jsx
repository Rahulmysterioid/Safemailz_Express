import React from 'react';
import { formatMailPreviewDate } from '../../utils/dateUtils';
import './ConversationThreading.css';

/**
 * ThreadChildMessageRow
 * Renders an indented child message row inside an expanded conversation thread,
 * matching Outlook Web's threaded email list specification.
 *
 * @param {Object} props
 * @param {import('../../types').ThreadChildMessage} props.message
 * @param {boolean} props.isActive - True if this message is currently loaded in the reading pane
 * @param {boolean} props.isSelected - True if checkbox is checked
 * @param {function} props.onSelectMessage - Called with (rawEmail) when row is clicked
 * @param {function} props.onToggleSelect - Called with (id, checked) when checkbox changes
 * @param {function} props.onContextMenu - Called with (e, rawEmail) on right-click
 */
export default function ThreadChildMessageRow({
    message,
    isActive = false,
    isSelected = false,
    onSelectMessage,
    onToggleSelect,
    onContextMenu
}) {
    if (!message) return null;

    const senderDisplayName = message.senderName || message.senderEmail || 'Unknown';
    const displaySnippet = message.snippet || message.subject || '';
    const displayDate = message.formattedDate || (message.timestamp ? formatMailPreviewDate(message.timestamp) : '');
    const isSent = Boolean(message.isSent);
    const isRead = Boolean(message.isRead);

    const handleRowClick = () => {
        if (onSelectMessage) {
            onSelectMessage(message.rawEmail || message);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleRowClick();
        }
    };

    const handleCheckboxChange = (e) => {
        e.stopPropagation();
        if (onToggleSelect) {
            onToggleSelect(message.id, e.target.checked);
        }
    };

    const handleCheckboxClick = (e) => {
        e.stopPropagation();
    };

    const handleContextMenu = (e) => {
        if (onContextMenu) {
            e.preventDefault();
            onContextMenu(e, message.rawEmail || message);
        }
    };

    return (
        <div
            id={`threadChild-${message.id}`}
            className={`thread-child-row group ${isActive ? 'active border-[#0078D4] bg-[#eff6ff] shadow-sm' : 'border-transparent hover:border-slate-300 hover:bg-slate-50/80'} ${isRead ? 'read' : 'unread'} rounded px-3 py-2 cursor-pointer transition-all flex items-center gap-3`}
            onClick={handleRowClick}
            onContextMenu={handleContextMenu}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-selected={isActive}
            aria-label={`Message from ${senderDisplayName}: ${displaySnippet}`}
        >
            {/* Left: Individual Selection Checkbox */}
            <div className="thread-child-left flex items-center justify-center shrink-0" onClick={handleCheckboxClick}>
                <input
                    type="checkbox"
                    className="child-checkbox w-[15px] h-[15px] accent-[#0078D4] cursor-pointer rounded"
                    checked={Boolean(isSelected)}
                    onChange={handleCheckboxChange}
                    onClick={handleCheckboxClick}
                    aria-label={`Select message from ${senderDisplayName}`}
                />
            </div>

            {/* Middle: Sender Name & Single-Line Snippet Preview */}
            <div className="thread-child-middle flex flex-col min-w-0 flex-1 overflow-hidden">
                <div className="thread-child-sender-row flex items-center gap-1.5 min-w-0">
                    <span className={`thread-child-sender text-[13px] truncate ${isRead ? 'font-medium text-slate-800' : 'font-bold text-slate-900'}`}>
                        {senderDisplayName}
                    </span>
                    {!isRead && (
                        <span className="thread-child-unread-dot w-1.5 h-1.5 rounded-full bg-[#0078D4] shrink-0" title="Unread message" aria-hidden="true" />
                    )}
                </div>

                <div
                    className="thread-child-snippet text-xs text-slate-500 truncate mt-0.5"
                    title={displaySnippet}
                >
                    {displaySnippet}
                </div>
            </div>

            {/* Right Metadata */}
            <div className="thread-child-right flex items-center justify-end shrink-0 ml-auto min-h-[30px]">
                {isSent ? (
                    /* Sent Items Badge */
                    <span className="sent-items-badge px-2 py-0.5 text-[11px] font-medium bg-[#f1f5f9] text-[#475569] rounded border border-[#e2e8f0] whitespace-nowrap">
                        Sent Items
                    </span>
                ) : (
                    /* Incoming/Received Meta: Top-right Reply Icon, Bottom-right Formatted Date */
                    <div className="thread-child-meta-stack flex flex-col items-end justify-between min-h-[30px] gap-0.5">
                        <div className="thread-child-icon-slot flex items-center justify-end">
                            <svg
                                className="thread-child-reply-icon w-3.5 h-3.5 text-slate-400"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <polyline points="9 14 4 9 9 4" />
                                <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                            </svg>
                        </div>

                        {displayDate && (
                            <span className="thread-child-date text-[11px] text-slate-400 whitespace-nowrap leading-none">
                                {displayDate}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
