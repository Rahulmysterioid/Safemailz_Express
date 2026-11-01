/**
 * Conversation Threading Utilities for Safemailz
 * Implements Outlook-style expandable conversation threading logic.
 *
 * @module conversationThreading
 */

/**
 * @typedef {Object} ThreadChildMessage
 * @property {string} id
 * @property {string} threadId
 * @property {string} senderName
 * @property {string} senderEmail
 * @property {string} subject
 * @property {string} snippet
 * @property {string} [body]
 * @property {string | Date} timestamp
 * @property {string} formattedDate
 * @property {boolean} isSent          // true -> renders "Sent Items" badge on the right
 * @property {boolean} isRead
 * @property {boolean} [hasReplied]
 * @property {boolean} [pinned]
 * @property {boolean} [flagged]
 * @property {string} [emailNo]
 * @property {string} [folder]
 * @property {any} rawEmail            // Original email object for the reading pane
 */

/**
 * @typedef {Object} ConversationThreadGroup
 * @property {string} threadId
 * @property {string} subject          // Normalized subject (without Re:/Fwd:)
 * @property {string} primarySenderName
 * @property {string} primarySenderInitials
 * @property {string | Date} latestTimestamp
 * @property {string} formattedDate
 * @property {number} messageCount
 * @property {number} unreadCount
 * @property {boolean} isUnread
 * @property {boolean} [hasReplied]
 * @property {boolean} [isPinned]
 * @property {boolean} [isFlagged]
 * @property {string} [snippet]
 * @property {string[]} emailIds
 * @property {any[]} rawEmails
 * @property {ThreadChildMessage} latestMessage
 * @property {ThreadChildMessage[]} messages // Sorted chronologically (oldest to newest, like Outlook)
 */

/**
 * Normalizes email subject by removing leading prefixes (Re:, Fwd:, FW:, [External], etc.)
 * Returns '(No subject)' if empty.
 *
 * @param {string} subject
 * @returns {string}
 */
export function normalizeSubject(subject) {
    if (!subject || typeof subject !== 'string') {
        return '(No subject)';
    }

    let cleaned = subject.trim();
    if (!cleaned) return '(No subject)';

    // Regex matching prefixes like:
    // "Re:", "RE:", "re[2]:", "Fwd:", "FWD:", "FW:", "fwd[1]:", or bracket tags like "[External]", "[SECURE]"
    const prefixRegex = /^(\s*(re|fwd|fw)(\[\d+\])?\s*:\s*|\s*\[[^\]]+\]\s*)/i;

    let prev = '';
    while (cleaned !== prev) {
        prev = cleaned;
        cleaned = cleaned.replace(prefixRegex, '').trim();
    }

    return cleaned || '(No subject)';
}

/**
 * Computes or resolves a stable thread ID for an email.
 * Uses email.threadId or email.thread_id if present; otherwise generates
 * a stable slug/hash from the normalized subject.
 *
 * @param {Object} email
 * @returns {string}
 */
export function computeThreadId(email) {
    if (!email) return 'thread-unknown';
    if (email.threadId) return String(email.threadId);
    if (email.thread_id) return String(email.thread_id);

    const norm = normalizeSubject(email.subject);
    const slug = norm
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    // Compute stable 32-bit hash for uniqueness & collision avoidance
    let hash = 0;
    const strToHash = norm.toLowerCase();
    for (let i = 0; i < strToHash.length; i++) {
        hash = (hash << 5) - hash + strToHash.charCodeAt(i);
        hash |= 0;
    }
    const hashHex = Math.abs(hash).toString(16).padStart(8, '0');

    // For missing or "(No subject)" emails without an explicit threadId,
    // isolate per sender/id so distinct emails do not unintentionally collapse
    if (!slug || slug === 'no-subject') {
        const senderPart = (email.sender || email.sender_email || email.senderName || 'msg')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return `thread-no-subject-${senderPart || 'unknown'}-${email.id || hashHex}`;
    }

    return `thread-${slug.slice(0, 40)}-${hashHex}`;
}

/**
 * Formats a date/timestamp input to match Outlook:
 * - Today: hh:mm a (e.g. "1:48 PM", "07:53 pm")
 * - Other dates: M/D/YYYY (e.g. "7/16/2026", "6/28/2026")
 *
 * @param {string | number | Date} dateInput
 * @returns {string}
 */
export function formatThreadDate(dateInput) {
    if (!dateInput) return '';

    // Fast path: if already a pre-formatted time like "1:48 PM" or "07:53 pm"
    if (typeof dateInput === 'string') {
        const trimmed = dateInput.trim();
        if (/^\d{1,2}:\d{2}\s*(am|pm)?$/i.test(trimmed)) {
            return trimmed;
        }
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
            return trimmed;
        }
    }

    let d;
    if (dateInput instanceof Date) {
        d = dateInput;
    } else if (typeof dateInput === 'number') {
        d = new Date(dateInput);
    } else if (typeof dateInput === 'string') {
        const trimmed = dateInput.trim();
        // Support SQL style YYYY-MM-DD HH:MM:SS
        const safeStr = (!trimmed.includes('T') && /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(trimmed))
            ? trimmed.replace(' ', 'T') + 'Z'
            : trimmed;
        d = new Date(safeStr);
    }

    if (!d || isNaN(d.getTime())) {
        return String(dateInput);
    }

    const now = new Date();
    const isToday = d.getDate() === now.getDate() &&
                    d.getMonth() === now.getMonth() &&
                    d.getFullYear() === now.getFullYear();

    if (isToday) {
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    }

    const m = d.getMonth() + 1;
    const day = d.getDate();
    const y = d.getFullYear();
    return `${m}/${day}/${y}`;
}

/**
 * Extracts 2-letter initials from sender name.
 * e.g. "Rahul Singh" -> "RS", "Yash Thakor" -> "YT", "LinkedIn Job Alerts" -> "LJ"
 *
 * @param {string} name
 * @returns {string}
 */
export function getSenderInitials(name) {
    if (!name || typeof name !== 'string') return 'U';
    const cleaned = name.trim();
    if (!cleaned) return 'U';

    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'U';
    if (words.length === 1) {
        return words[0].slice(0, words[0].length >= 2 ? 2 : 1).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Parses timestamp or date string into comparable numeric epoch milliseconds.
 *
 * @param {any} item
 * @param {number} fallbackIndex
 * @returns {number}
 */
export function getComparableTimestamp(item, fallbackIndex = 0) {
    if (!item) return fallbackIndex;
    const raw = typeof item === 'object'
        ? (item.timestamp || item.created_at || item.createdAt || item.date)
        : item;

    if (!raw) return fallbackIndex;

    if (raw instanceof Date) {
        const t = raw.getTime();
        return isNaN(t) ? fallbackIndex : t;
    }

    if (typeof raw === 'number') return raw;

    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        const safeStr = (!trimmed.includes('T') && /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(trimmed))
            ? trimmed.replace(' ', 'T') + 'Z'
            : trimmed;
        const parsed = Date.parse(safeStr);
        if (!isNaN(parsed)) return parsed;

        // "1:48 PM", "07:53 pm"
        const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
        if (timeMatch) {
            let h = parseInt(timeMatch[1], 10);
            const m = parseInt(timeMatch[2], 10);
            const s = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
            const ampm = timeMatch[4] ? timeMatch[4].toLowerCase() : null;
            if (ampm === 'pm' && h < 12) h += 12;
            if (ampm === 'am' && h === 12) h = 0;
            const now = new Date();
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s);
            return d.getTime();
        }

        // "Yesterday"
        if (/^yesterday$/i.test(trimmed)) {
            const now = new Date();
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0, 0);
            return d.getTime();
        }

        // "Jun 11", "Jul 16"
        const monthDayMatch = trimmed.match(/^([A-Za-z]{3})\s+(\d{1,2})$/);
        if (monthDayMatch) {
            const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
            const mIdx = months[monthDayMatch[1].toLowerCase()];
            if (mIdx !== undefined) {
                const now = new Date();
                const d = new Date(now.getFullYear(), mIdx, parseInt(monthDayMatch[2], 10), 12, 0, 0);
                return d.getTime();
            }
        }
    }

    return fallbackIndex;
}

/**
 * Checks whether a conversation thread group has any unread messages.
 *
 * @param {ConversationThreadGroup} group
 * @returns {boolean}
 */
export function isThreadUnread(group) {
    if (!group) return false;
    if (typeof group.unreadCount === 'number') {
        return group.unreadCount > 0;
    }
    if (Array.isArray(group.messages)) {
        return group.messages.some(m => !m.isRead);
    }
    return false;
}

/**
 * Returns an array of all individual email IDs contained within a thread group.
 *
 * @param {ConversationThreadGroup} group
 * @returns {string[]}
 */
export function getThreadEmailIds(group) {
    if (!group) return [];
    if (Array.isArray(group.messages)) {
        return group.messages.map(m => String(m.id));
    }
    if (Array.isArray(group.emailIds)) {
        return group.emailIds.map(String);
    }
    if (Array.isArray(group.rawEmails)) {
        return group.rawEmails.map(e => String(e.id));
    }
    return [];
}

/**
 * Returns the latest (most recent) message in a thread group.
 *
 * @param {ConversationThreadGroup} group
 * @returns {ThreadChildMessage | null}
 */
export function getThreadLatestMessage(group) {
    if (!group || !Array.isArray(group.messages) || group.messages.length === 0) {
        return null;
    }
    return group.messages[group.messages.length - 1];
}

/**
 * Finds a conversation thread group that contains a given email ID.
 *
 * @param {ConversationThreadGroup[]} threads
 * @param {string} emailId
 * @returns {ConversationThreadGroup | null}
 */
export function findThreadByEmailId(threads, emailId) {
    if (!Array.isArray(threads) || !emailId) return null;
    const targetId = String(emailId);
    return threads.find(t =>
        t.threadId === targetId ||
        (Array.isArray(t.messages) && t.messages.some(m => String(m.id) === targetId))
    ) || null;
}

/**
 * Groups an array of emails into Outlook-style conversation thread groups.
 *
 * @param {Object[]} emails - Array of raw email objects
 * @param {Object} [options]
 * @param {string} [options.currentUserEmail] - Current logged-in user email
 * @param {string|number} [options.currentUserId] - Current logged-in user ID
 * @returns {ConversationThreadGroup[]} Sorted conversation thread groups
 */
export function buildConversationThreads(emails, options = {}) {
    if (!Array.isArray(emails) || emails.length === 0) {
        return [];
    }

    const currentUserEmail = options.currentUserEmail
        ? String(options.currentUserEmail).toLowerCase().trim()
        : null;
    const currentUserId = options.currentUserId
        ? String(options.currentUserId)
        : null;

    // 1. Group emails by computed threadId
    const groupsMap = new Map();

    emails.forEach((email, index) => {
        if (!email) return;
        const threadId = computeThreadId(email);

        if (!groupsMap.has(threadId)) {
            groupsMap.set(threadId, {
                threadId,
                rawList: []
            });
        }
        groupsMap.get(threadId).rawList.push({ email, originalIndex: index });
    });

    // 2. Build ConversationThreadGroup for each group
    const threadGroups = [];

    for (const [threadId, groupData] of groupsMap.entries()) {
        const { rawList } = groupData;

        // Map each email into ThreadChildMessage
        const childMessages = rawList.map(({ email, originalIndex }) => {
            const senderName = email.sender ||
                               email.sender_name ||
                               email.senderName ||
                               email.from ||
                               (email.sender_email ? email.sender_email.split('@')[0] : 'Unknown');

            const senderEmail = email.sender_email ||
                                email.senderEmail ||
                                email.from_email ||
                                email.email || '';

            const emailSubject = email.subject || '(No subject)';

            // Sent status logic
            const normalizedFolder = typeof email.folder === 'string' ? email.folder.toLowerCase() : '';
            const isSentByFolder = normalizedFolder === 'sent';
            const isSentByFlag = Boolean(email.isSent || email.is_sent);
            const isSentByUserEmail = currentUserEmail && (
                (senderEmail && senderEmail.toLowerCase() === currentUserEmail) ||
                (email.sender && email.sender.toLowerCase() === currentUserEmail) ||
                (email.from && email.from.toLowerCase() === currentUserEmail)
            );
            const isSentByUserId = currentUserId && (
                String(email.sender_id || email.userId) === currentUserId
            );
            const isSent = Boolean(isSentByFolder || isSentByFlag || isSentByUserEmail || isSentByUserId);

            // Read & Replied status
            const isRead = Boolean(
                email.read !== undefined ? email.read :
                email.isRead !== undefined ? email.isRead :
                email.is_read !== undefined ? email.is_read : false
            );

            const hasReplied = Boolean(
                email.replied || email.hasReplied || email.is_replied
            );

            // Snippet preview
            let snippet = email.snippet || email.preview || '';
            if (!snippet && email.body) {
                snippet = email.body
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .slice(0, 120);
            }

            const timestamp = email.timestamp ||
                              email.created_at ||
                              email.createdAt ||
                              email.date ||
                              email.time;

            const formattedDate = formatThreadDate(email.date || timestamp);
            const sortTimestamp = getComparableTimestamp(email, originalIndex);

            return {
                id: String(email.id !== undefined ? email.id : `msg-${originalIndex}`),
                threadId,
                senderName,
                senderEmail,
                subject: emailSubject,
                snippet: snippet || '',
                body: email.body || email.content || snippet || '',
                timestamp: timestamp || new Date().toISOString(),
                sortTimestamp,
                originalIndex,
                formattedDate,
                isSent,
                isRead,
                hasReplied,
                pinned: Boolean(email.pinned || email.isPinned),
                flagged: Boolean(email.flagged || email.isFlagged),
                emailNo: email.emailNo,
                folder: email.folder,
                action: Boolean(email.action),
                rawEmail: email
            };
        });

        // Sort child messages chronologically (oldest to newest, exactly like Outlook!)
        childMessages.sort((a, b) => {
            if (a.sortTimestamp !== b.sortTimestamp) {
                return a.sortTimestamp - b.sortTimestamp;
            }
            return a.originalIndex - b.originalIndex;
        });

        const messageCount = childMessages.length;
        const unreadCount = childMessages.filter(m => !m.isRead).length;
        const oldestMessage = childMessages[0];
        const latestMessage = childMessages[messageCount - 1];
        const latestTimestamp = latestMessage.timestamp;

        // Subject: normalized subject without Re:/Fwd: prefixes
        const subject = normalizeSubject(
            latestMessage.subject || oldestMessage.subject || rawList[0].email.subject
        );

        // Primary Participant Name:
        // In an incoming thread, show the other party (external sender).
        // If all messages were sent by user, show recipient or sender name.
        const externalMessages = childMessages.filter(m => !m.isSent);
        let primarySenderName = 'Unknown';
        if (externalMessages.length > 0) {
            primarySenderName = externalMessages[externalMessages.length - 1].senderName;
        } else if (childMessages.length > 0) {
            primarySenderName = latestMessage.rawEmail?.recipient ||
                                latestMessage.rawEmail?.to ||
                                latestMessage.rawEmail?.receiver ||
                                latestMessage.senderName;
        }

        const primarySenderInitials = getSenderInitials(primarySenderName);

        const isPinned = childMessages.some(m => m.pinned);
        const isFlagged = childMessages.some(m => m.flagged);
        const hasReplied = childMessages.some(m => m.hasReplied);

        // Aggregate unique categories
        const categoriesSet = new Set();
        childMessages.forEach(m => {
            if (Array.isArray(m.rawEmail?.categories)) {
                m.rawEmail.categories.forEach(c => categoriesSet.add(c));
            } else if (typeof m.rawEmail?.categories === 'string') {
                categoriesSet.add(m.rawEmail.categories);
            }
        });

        threadGroups.push({
            threadId,
            subject,
            primarySenderName,
            primarySenderInitials,
            latestTimestamp,
            latestSortTimestamp: latestMessage.sortTimestamp,
            formattedDate: formatThreadDate(latestTimestamp || latestMessage.formattedDate),
            messageCount,
            unreadCount,
            isUnread: unreadCount > 0,
            hasReplied,
            isPinned,
            isFlagged,
            snippet: latestMessage.snippet,
            categories: Array.from(categoriesSet),
            emailIds: childMessages.map(m => m.id),
            rawEmails: childMessages.map(m => m.rawEmail),
            latestMessage,
            messages: childMessages
        });
    }

    // Sort conversation groups by latestTimestamp descending (pinned threads first)
    threadGroups.sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
            return a.isPinned ? -1 : 1;
        }
        if (b.latestSortTimestamp !== a.latestSortTimestamp) {
            return b.latestSortTimestamp - a.latestSortTimestamp;
        }
        return 0;
    });

    return threadGroups;
}
