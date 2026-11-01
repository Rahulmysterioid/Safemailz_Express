import React from 'react';
import EmailRow from './EmailRow';
import ThreadChildMessageRow from './ThreadChildMessageRow';
import './ConversationThreading.css';

/**
 * ConversationThreadRow
 * Outlook-Style Expandable Conversation Threading parent component for Safemailz.
 * Uses Safemailz's native EmailRow component for the parent row to 100% preserve
 * the original UI (pastel avatars, 3-line layout, hover actions, meta chips).
 * When expanded, renders nested child message rows matching the Outlook UI.
 */
export default function ConversationThreadRow({
    thread,
    isExpanded = false,
    onToggleExpand,
    activeEmailId = null,
    selectedEmailIds = new Set(),
    onSelectEmail,
    onSelectCheckbox,
    onSelectThreadCheckbox,
    onContextMenu,
    quickActions = ['read', 'delete', 'snooze', 'pin'],
    onToggleRead,
    onDelete,
    onArchive,
    onTogglePin,
    onToggleFlag,
    onSnooze,
    onUnsnooze
}) {
    if (!thread) return null;

    const messages = Array.isArray(thread.messages) ? thread.messages : [];
    const messageCount = thread.messageCount || messages.length || 1;
    const hasMultipleMessages = messageCount > 1;

    // Latest message is the last one (chronological order: oldest to newest)
    const latestChild = messages.length > 0 ? messages[messages.length - 1] : null;
    const rawEmail = latestChild?.rawEmail || (messages.length > 0 ? messages[0].rawEmail : null) || thread;

    // Construct parent email object retaining all original EmailRow fields
    const parentEmail = {
        ...rawEmail,
        id: latestChild?.id || rawEmail.id || thread.threadId,
        sender: thread.primarySenderName || rawEmail.sender || 'Unknown',
        subject: thread.subject || rawEmail.subject || 'No Subject',
        preview: rawEmail.preview || latestChild?.snippet || '',
        date: rawEmail.date || rawEmail.created_at || latestChild?.timestamp,
        read: thread.unreadCount === 0,
        replied: Boolean(rawEmail.replied || messages.some(m => m.hasReplied || m.isSent)),
        pinned: Boolean(rawEmail.pinned || rawEmail.isPinned),
        flagged: Boolean(rawEmail.flagged || rawEmail.isFlagged),
        categories: rawEmail.categories || [],
        action: rawEmail.action,
        snoozedUntil: rawEmail.snoozedUntil
    };

    const isEmailSelected = (id) => {
        if (!selectedEmailIds) return false;
        if (selectedEmailIds instanceof Set) return selectedEmailIds.has(id);
        if (Array.isArray(selectedEmailIds)) return selectedEmailIds.includes(id);
        return false;
    };

    const selectedChildCount = messages.filter(m => isEmailSelected(m.id)).length;
    const isAllSelected = messages.length > 0 && selectedChildCount === messages.length;

    // Active status: collapsed thread is active if any child or parent is active
    const hasActiveChild = messages.some(m => m.id === activeEmailId) || parentEmail.id === activeEmailId;
    const isParentActive = !isExpanded && hasActiveChild;

    const handleParentClick = () => {
        if (hasMultipleMessages && !isExpanded) {
            onToggleExpand && onToggleExpand(thread.threadId);
        }
        if (onSelectEmail) {
            onSelectEmail(rawEmail);
        }
    };

    const handleParentSelect = (emailId, checked) => {
        if (onSelectThreadCheckbox) {
            onSelectThreadCheckbox(thread.threadId, checked);
        } else if (onSelectCheckbox) {
            onSelectCheckbox(emailId, checked);
        }
    };

    return (
        <div className={`conversation-thread-wrap ${isExpanded ? 'is-expanded' : ''}`}>
            {/* Native Safemailz EmailRow for the Parent Row - 100% original UI preserved */}
            <EmailRow
                email={parentEmail}
                isSelected={isAllSelected || isEmailSelected(parentEmail.id)}
                isActive={isParentActive}
                quickActions={quickActions}
                onSelect={handleParentSelect}
                onClick={handleParentClick}
                onContextMenu={onContextMenu}
                onToggleRead={onToggleRead}
                onDelete={onDelete}
                onArchive={onArchive}
                onTogglePin={onTogglePin}
                onToggleFlag={onToggleFlag}
                onSnooze={onSnooze}
                onUnsnooze={onUnsnooze}
                isThreadParent={hasMultipleMessages}
                isExpanded={isExpanded}
                onToggleExpand={() => onToggleExpand && onToggleExpand(thread.threadId)}
                messageCount={messageCount}
            />

            {/* When expanded and has multiple messages, render nested child rows */}
            {isExpanded && hasMultipleMessages && (
                <div className="thread-children-container">
                    {messages.map((child) => (
                        <ThreadChildMessageRow
                            key={child.id}
                            message={child}
                            isActive={child.id === activeEmailId}
                            isSelected={isEmailSelected(child.id)}
                            onSelectMessage={onSelectEmail}
                            onToggleSelect={onSelectCheckbox}
                            onContextMenu={onContextMenu}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
