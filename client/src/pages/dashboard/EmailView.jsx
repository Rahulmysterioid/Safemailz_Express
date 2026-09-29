import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import { mockEmails } from '../../data/mockEmails';
import EmailRow from '../../components/dashboard/EmailRow';
import { formatMailReadingDate, formatMailPreviewDate } from '../../utils/dateUtils';
import ContentLockedOverlay from '../../components/common/ContentLockedOverlay';

export default function EmailView() {
    const { folder = 'inbox' } = useParams();
    const navigate = useNavigate();
    const { searchQuery } = useOutletContext() || {};
    const { uiSettings, saveUiSettings } = useUI() || {};

    const [user, setUser] = useState(null);
    const [emails, setEmails] = useState(() => {
        const stored = localStorage.getItem('safemailzEmails');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (e) {
                console.error(e);
            }
        }
        return mockEmails;
    });
    const [isLoading, setIsLoading] = useState(true);

    const [activeFilter, setActiveFilter] = useState('All');
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [selectedEmailIds, setSelectedEmailIds] = useState(new Set());
    const [activeMailTab, setActiveMailTab] = useState(folder === 'sent' ? 'sent' : 'received');

    // Mail List Toolbar States
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isJumpToOpen, setIsJumpToOpen] = useState(false);
    const [jumpMenuPos, setJumpMenuPos] = useState({ top: 0, left: 0 });
    const [jumpToPreset, setJumpToPreset] = useState('');
    const [customJumpDate, setCustomJumpDate] = useState(() => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    });
    const [showFilterBar, setShowFilterBar] = useState(true);
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'
    const [toolbarMenu, setToolbarMenu] = useState(null); // 'newmail' | 'move' | 'more' | 'reply' | null
    const [toolbarMenuPos, setToolbarMenuPos] = useState({ top: 0, left: 0 });
    const jumpToRef = useRef(null);
    const jumpBtnRef = useRef(null);
    const newMailMenuBtnRef = useRef(null);
    const moveMenuBtnRef = useRef(null);
    const moreMenuBtnRef = useRef(null);
    const replyMenuBtnRef = useRef(null);

    const getJumpTargetDate = (presetOrIso) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (presetOrIso === 'Today') return now;
        if (presetOrIso === 'Yesterday') {
            const d = new Date(now);
            d.setDate(d.getDate() - 1);
            return d;
        }
        if (presetOrIso === 'Last week') {
            const d = new Date(now);
            d.setDate(d.getDate() - 7);
            return d;
        }
        if (presetOrIso === 'Last month') {
            const d = new Date(now);
            d.setMonth(d.getMonth() - 1);
            return d;
        }
        if (presetOrIso === 'Last year') {
            const d = new Date(now);
            d.setFullYear(d.getFullYear() - 1);
            return d;
        }
        if (presetOrIso) {
            const custom = new Date(presetOrIso + 'T00:00:00');
            if (!isNaN(custom.getTime())) return custom;
        }
        return null;
    };

    const performJumpToDate = (targetDate) => {
        if (!targetDate) return;
        const dayStart = new Date(targetDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23, 59, 59, 999);

        const rows = Array.from(document.querySelectorAll('.mail-row'));
        if (!rows.length) return;

        let match = rows.find((row) => {
            const dStr = row.getAttribute('data-date') || '';
            const t = new Date(dStr).getTime();
            return !isNaN(t) && t >= dayStart.getTime() && t <= dayEnd.getTime();
        });

        if (!match) {
            match = rows.find((row) => {
                const dStr = row.getAttribute('data-date') || '';
                const t = new Date(dStr).getTime();
                return !isNaN(t) && t <= dayEnd.getTime();
            });
        }

        if (!match) {
            match = rows[0];
        }

        if (match) {
            match.scrollIntoView({ behavior: 'smooth', block: 'center' });
            match.classList.add('jump-to-flash');
            setTimeout(() => match.classList.remove('jump-to-flash'), 1200);
        }
    };

    // Composer State
    const [isComposing, setIsComposing] = useState(false);
    const [composeTo, setComposeTo] = useState('');
    const [composeCc, setComposeCc] = useState('');
    const [composeBcc, setComposeBcc] = useState('');
    const [showCc, setShowCc] = useState(false);
    const [showBcc, setShowBcc] = useState(false);
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Dropdown toggles for format toolbar
    const [openDropdown, setOpenDropdown] = useState(null);

    // Resizable Splitter State - synchronized with UIContext and local storage
    const [listColumnWidth, setListColumnWidth] = useState(() => {
        if (uiSettings?.mailList?.width) {
            const parsed = parseInt(uiSettings.mailList.width, 10);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        const saved = localStorage.getItem('mailListColumnWidth');
        const parsedSaved = saved ? parseInt(saved, 10) : 360;
        return !isNaN(parsedSaved) && parsedSaved > 0 ? parsedSaved : 360;
    });
    const [isResizing, setIsResizing] = useState(false);
    const splitViewRef = useRef(null);
    const isResizingRef = useRef(false);
    const latestWidthRef = useRef(listColumnWidth);

    // Sync when UI customizer updates mailList.width
    useEffect(() => {
        if (uiSettings?.mailList?.width) {
            const parsed = parseInt(uiSettings.mailList.width, 10);
            if (!isNaN(parsed) && parsed !== listColumnWidth) {
                setListColumnWidth(parsed);
                latestWidthRef.current = parsed;
            }
        }
    }, [uiSettings?.mailList?.width]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizingRef.current || !splitViewRef.current) return;
            const splitViewRect = splitViewRef.current.getBoundingClientRect();
            let newWidth = e.clientX - splitViewRect.left;
            const minWidth = 260;
            const maxWidth = Math.max(minWidth, splitViewRect.width - 320);

            if (newWidth < minWidth) newWidth = minWidth;
            if (newWidth > maxWidth) newWidth = maxWidth;

            latestWidthRef.current = newWidth;
            setListColumnWidth(newWidth);
        };

        const handleTouchMove = (e) => {
            if (!isResizingRef.current || !splitViewRef.current || !e.touches || !e.touches[0]) return;
            const splitViewRect = splitViewRef.current.getBoundingClientRect();
            let newWidth = e.touches[0].clientX - splitViewRect.left;
            const minWidth = 260;
            const maxWidth = Math.max(minWidth, splitViewRect.width - 320);

            if (newWidth < minWidth) newWidth = minWidth;
            if (newWidth > maxWidth) newWidth = maxWidth;

            latestWidthRef.current = newWidth;
            setListColumnWidth(newWidth);
        };

        const handleEndResize = () => {
            if (!isResizingRef.current) return;
            isResizingRef.current = false;
            setIsResizing(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.querySelectorAll('iframe').forEach(f => {
                f.style.pointerEvents = '';
            });

            if (latestWidthRef.current && saveUiSettings && uiSettings?.mailList) {
                saveUiSettings({
                    mailList: {
                        ...uiSettings.mailList,
                        width: `${latestWidthRef.current}px`
                    }
                });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleEndResize);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleEndResize);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleEndResize);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleEndResize);
        };
    }, [saveUiSettings, uiSettings]);

    useEffect(() => {
        if (listColumnWidth) {
            localStorage.setItem('mailListColumnWidth', listColumnWidth.toString());
        }
    }, [listColumnWidth]);

    const startResize = (e) => {
        isResizingRef.current = true;
        setIsResizing(true);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.querySelectorAll('iframe').forEach(f => {
            f.style.pointerEvents = 'none';
        });
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
    };

    // Load current user and refresh subscription status
    useEffect(() => {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);

                // Fetch fresh profile from backend
                const fetchMe = async () => {
                    if (!parsedUser?.id) return;
                    try {
                        const res = await fetch('/api/settings/me?t=' + Date.now(), {
                            headers: {
                                'x-user-id': String(parsedUser.id),
                                'x-org-id': String(parsedUser.organization_id)
                            }
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data.success && data.user) {
                                const updatedUser = { ...parsedUser, subscription_status: data.user.subscription_status };
                                setUser(updatedUser);
                                localStorage.setItem('currentUser', JSON.stringify(updatedUser));

                                // Also update savedAccounts if it's there
                                try {
                                    const saved = JSON.parse(localStorage.getItem('savedAccounts') || '[]');
                                    const idx = saved.findIndex(a => a.id === updatedUser.id);
                                    if (idx !== -1) {
                                        saved[idx] = updatedUser;
                                        localStorage.setItem('savedAccounts', JSON.stringify(saved));
                                    }
                                } catch (e) {
                                    console.error("Error setting selection position", e);
                                }
                            }
                        }
                    } catch (err) {
                        console.error('Failed to fetch fresh user details:', err);
                    }
                };
                fetchMe();
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    // Click outside handler for Jump To Date + toolbar menus
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (jumpToRef.current && !jumpToRef.current.contains(e.target) && jumpBtnRef.current && !jumpBtnRef.current.contains(e.target)) {
                setIsJumpToOpen(false);
            }
            const menuEl = document.getElementById('mailToolbarMenu');
            const inMenu = menuEl && menuEl.contains(e.target);
            const inTrigger = [newMailMenuBtnRef, moveMenuBtnRef, moreMenuBtnRef, replyMenuBtnRef].some(
                (r) => r.current && r.current.contains(e.target)
            );
            if (!inMenu && !inTrigger) setToolbarMenu(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Save emails to localStorage
    useEffect(() => {
        localStorage.setItem('safemailzEmails', JSON.stringify(emails));
    }, [emails]);

    // Update activeMailTab when route param changes
    useEffect(() => {
        if (folder === 'sent') {
            setActiveMailTab('sent');
        } else {
            setActiveMailTab('received');
        }

        if (folder === 'support') {
            setIsComposing(true);
            setComposeTo('Support@safemailz.com');
            setComposeSubject('');
        }

        const params = new URLSearchParams(window.location.search);
        if (params.get('compose') === '1') {
            setIsComposing(true);
            setComposeTo('');
            setComposeSubject('');
        }
    }, [folder]);

    // Fetch real emails from backend and trigger sync
    useEffect(() => {
        let isMounted = true;

        const fetchEmails = async (isBackgroundRefresh = false) => {
            if (!isBackgroundRefresh) setIsLoading(true);
            const userStr = localStorage.getItem("currentUser");
            const token = localStorage.getItem("token");
            const headers = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            if (userStr) {
                try {
                    const parsedUser = JSON.parse(userStr);
                    headers["X-User-Id"] = parsedUser.id;
                    headers["X-Org-Id"] = parsedUser.organization_id;
                    if (parsedUser.email) headers["X-Active-Email"] = String(parsedUser.email).trim();
                } catch (e) {
                    console.error("Failed to parse user string", e);
                }
            }

            try {
                const response = await fetch(`/api/emails?filter=${encodeURIComponent(folder || 'inbox')}&search=${encodeURIComponent(searchQuery || '')}`, {
                    headers
                });
                if (response.ok && isMounted) {
                    const data = await response.json();
                    if (data.emails && Array.isArray(data.emails)) {
                        setEmails(data.emails);
                    } else {
                        setEmails([]);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch real emails:", err);
            } finally {
                if (isMounted && !isBackgroundRefresh) {
                    setIsLoading(false);
                }
            }

            // If this is the initial load, trigger background sync
            if (!isBackgroundRefresh) {
                try {
                    const syncResponse = await fetch('/api/sync/refresh', { method: 'POST', headers });
                    if (syncResponse.ok && isMounted) {
                        // After sync completes, fetch emails again to show new ones
                        fetchEmails(true);
                    }
                } catch (syncErr) {
                    console.error("Background sync failed:", syncErr);
                }
            }
        };

        fetchEmails(false);

        return () => { isMounted = false; };
    }, [folder, searchQuery]);

    // Filtered list
    let filteredEmails = emails.filter(e => {
        // Folder match
        let matchesFolder = false;
        if (activeMailTab === 'sent') {
            matchesFolder = e.folder === 'sent';
        } else {
            if (folder === 'sent') matchesFolder = e.folder === 'sent';
            else if (folder === 'drafts') matchesFolder = e.folder === 'drafts';
            else if (folder === 'deleted') matchesFolder = e.folder === 'deleted';
            else if (folder === 'junk') matchesFolder = e.folder === 'junk';
            else if (folder === 'archive') matchesFolder = e.folder === 'archive';
            else if (folder === 'notes') matchesFolder = e.folder === 'notes';
            else matchesFolder = e.folder === 'inbox' || e.folder === 'received' || !e.folder;
        }
        if (!matchesFolder) return false;

        // Search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch = (e.subject || '').toLowerCase().includes(query) ||
                (e.sender || '').toLowerCase().includes(query) ||
                (e.preview || '').toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }

        // Sub filter pills
        if (activeFilter === 'Unread') return !e.read;
        if (activeFilter === 'Flagged') return !!e.pinned;
        if (activeFilter === 'To Me') return true;
        if (activeFilter === 'Has Files') return false;
        if (activeFilter === 'Mentioned Me' || activeFilter === 'Mentions') return false;

        return true;
    });

    if (sortOrder === 'asc') {
        filteredEmails = [...filteredEmails].reverse();
    }

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedEmailIds(new Set(filteredEmails.map(m => m.id)));
            setIsSelectionMode(true);
        } else {
            setSelectedEmailIds(new Set());
            setIsSelectionMode(false);
        }
    };

    const handleSelectEmail = (id, checked) => {
        setSelectedEmailIds(prev => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
        if (checked) setIsSelectionMode(true);
    };

    const handleEmailClick = async (email) => {
        setIsComposing(false);
        setSelectedEmail(email);
        if (!email.read) {
            setEmails(prev => prev.map(m => m.id === email.id ? { ...m, read: true } : m));
        }

        // Fetch full email content
        const userStr = localStorage.getItem("currentUser");
        const headers = { "Content-Type": "application/json" };
        if (userStr) {
            try {
                const parsedUser = JSON.parse(userStr);
                headers["X-User-Id"] = parsedUser.id;
                headers["X-Org-Id"] = parsedUser.organization_id;
                if (parsedUser.email) headers["X-Active-Email"] = String(parsedUser.email).trim();
            } catch (e) {
                console.error("Failed to parse user string", e);
            }
        }

        try {
            const response = await fetch(`/api/emails/${email.id}`, { headers });
            if (response.ok) {
                const data = await response.json();
                if (data.email) {
                    setSelectedEmail(prev => prev && prev.id === email.id ? { ...prev, body: data.email.body, attachments: data.email.attachments } : prev);
                    setEmails(prev => prev.map(m => m.id === email.id ? { ...m, body: data.email.body, attachments: data.email.attachments } : m));
                }
            }
        } catch (err) {
            console.error("Failed to fetch full email:", err);
        }
    };

    const handleToggleRead = (id) => {
        setEmails(prev => prev.map(m => m.id === id ? { ...m, read: !m.read } : m));
    };

    const handleDeleteEmail = (id) => {
        setEmails(prev => prev.map(m => m.id === id ? { ...m, folder: 'deleted' } : m));
        if (selectedEmail?.id === id) {
            setSelectedEmail(null);
        }
    };

    const handleTogglePin = (id) => {
        setEmails(prev => prev.map(m => m.id === id ? { ...m, pinned: !m.pinned } : m));
    };

    const getSelectedEmails = () => emails.filter(m => selectedEmailIds.has(m.id));

    const clearSelectionAfterAction = () => {
        setSelectedEmailIds(new Set());
        setIsSelectionMode(false);
        setToolbarMenu(null);
    };

    const moveSelectedTo = (nextFolder) => {
        if (selectedEmailIds.size === 0) return;
        setEmails(prev => prev.map(m => selectedEmailIds.has(m.id) ? { ...m, folder: nextFolder } : m));
        if (selectedEmail && selectedEmailIds.has(selectedEmail.id)) {
            setSelectedEmail(null);
        }
        clearSelectionAfterAction();
    };

    const handleBulkDelete = () => {
        if (selectedEmailIds.size === 0) return;
        moveSelectedTo('deleted');
    };

    const handleBulkArchive = () => moveSelectedTo('archive');
    const handleBulkReport = () => moveSelectedTo('junk');
    const handleBulkRestore = () => moveSelectedTo('inbox');
    const handleBulkSweep = () => moveSelectedTo('deleted');

    const handleBulkMarkRead = () => {
        if (selectedEmailIds.size === 0) return;
        const selected = getSelectedEmails();
        const shouldMarkRead = selected.some(m => !m.read);
        setEmails(prev => prev.map(m => selectedEmailIds.has(m.id) ? { ...m, read: shouldMarkRead } : m));
        setToolbarMenu(null);
    };

    const openToolbarMenu = (id, btnRef) => {
        if (toolbarMenu === id) {
            setToolbarMenu(null);
            return;
        }
        if (btnRef?.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const menuWidth = 220;
            let left = rect.left;
            if (left + menuWidth > window.innerWidth - 8) {
                left = Math.max(8, rect.right - menuWidth);
            }
            setToolbarMenuPos({ top: Math.round(rect.bottom + 4), left: Math.round(left) });
        }
        setToolbarMenu(id);
    };

    const handleOpenComposerWindow = () => {
        setToolbarMenu(null);
        const url = `${window.location.origin}/dashboard/email/inbox?compose=1`;
        const popup = window.open(url, 'safemailz-compose', 'noopener,width=980,height=720');
        if (!popup) handleOpenComposer();
    };

    const getDefaultSignatureText = (mode = 'new') => {
        try {
            const sigs = JSON.parse(localStorage.getItem('userSignatures') || '[]');
            const defId = (mode === 'reply' || mode === 'forward')
                ? localStorage.getItem('defaultSignatureReply')
                : localStorage.getItem('defaultSignatureNew');
            if (defId) {
                const sig = sigs.find(s => s.id === defId);
                if (sig && sig.content) {
                    const plain = sig.content.replace(/<br\s*[\/]?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]*>?/gm, '').trim();
                    return plain ? `\n\n--\n${plain}` : '';
                }
            }
        } catch (e) {
            console.error("Failed to fetch signature", e);
        }
        return '';
    };

    // Open Composer
    const handleOpenComposer = () => {
        setIsComposing(true);
        setSelectedEmail(null);
        setComposeTo('');
        setComposeSubject('');
        setComposeBody(getDefaultSignatureText('new'));
    };

    const [isExpanded, setIsExpanded] = useState(false);

    const handleReply = (email) => {
        setIsComposing(true);
        setComposeTo(email.senderEmail || `${email.sender.toLowerCase().replace(/\s+/g, '')}@safemailz.com`);
        setComposeSubject(`Re: ${email.subject}`);
        setComposeBody(`\n\n--- Original Message from ${email.sender} ---\n${email.preview || email.body || ''}${getDefaultSignatureText('reply')}`);
    };

    const handleReplyAll = (email) => {
        setIsComposing(true);
        setComposeTo(email.senderEmail || `${email.sender.toLowerCase().replace(/\s+/g, '')}@safemailz.com`);
        setComposeSubject(`Re: ${email.subject}`);
        setComposeBody(`\n\n--- Original Message from ${email.sender} ---\n${email.preview || email.body || ''}${getDefaultSignatureText('reply')}`);
    };

    const handleForward = (email) => {
        setIsComposing(true);
        setComposeTo('');
        setComposeSubject(`Fwd: ${email.subject}`);
        setComposeBody(`\n\n--- Forwarded Message from ${email.sender} ---\n${email.preview || email.body || ''}${getDefaultSignatureText('forward')}`);
    };

    // Send Email
    const handleSendEmail = async () => {
        if (!composeTo.trim()) {
            alert('Please specify at least one recipient in To field.');
            return;
        }
        setIsSending(true);

        const newSentMail = {
            id: `m-${Date.now()}`,
            sender: user?.admin_name || 'Rahul Singh',
            senderEmail: user?.email || 'singhrahuldrill1@outlook.com',
            subject: composeSubject.trim() || '(No Subject)',
            preview: composeBody.trim() || 'No text in email body.',
            folder: 'sent',
            read: true,
            replied: false,
            action: false,
            emailNo: `${Math.floor(10000 + Math.random() * 90000)}`,
            date: new Date().toISOString()
        };

        try {
            await fetch('/api/emails/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: composeTo, subject: composeSubject, body: composeBody })
            });
        } catch (err) {
            console.log('Sending email locally', err);
        }

        setEmails(prev => [newSentMail, ...prev]);
        setIsSending(false);
        setIsComposing(false);
        alert('✅ Email sent successfully!');
    };

    // Format doc command
    const formatDoc = (cmd, val = null) => {
        document.execCommand(cmd, false, val);
    };

    const insertEmoji = (emoji) => {
        setComposeBody(prev => prev + emoji);
        setOpenDropdown(null);
    };

    const getSenderInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
    };

    const hasSelection = selectedEmailIds.size > 0;
    const selectedCount = selectedEmailIds.size;
    const selectedHasUnread = getSelectedEmails().some(m => !m.read);
    const isDeletedFolder = folder === 'deleted';
    const isJunkFolder = folder === 'junk';

    const renderToolbarMenu = () => {
        if (!toolbarMenu) return null;
        return ReactDOM.createPortal(
            <div
                id="mailToolbarMenu"
                className="mail-toolbar-menu"
                role="menu"
                style={{ top: toolbarMenuPos.top, left: toolbarMenuPos.left }}
            >
                {toolbarMenu === 'newmail' && (
                    <>
                        <button type="button" role="menuitem" onClick={() => { setToolbarMenu(null); handleOpenComposer(); }}>
                            New mail
                        </button>
                        <button type="button" role="menuitem" onClick={handleOpenComposerWindow}>
                            New mail in new window
                        </button>
                    </>
                )}
                {toolbarMenu === 'move' && (
                    <>
                        <button type="button" role="menuitem" onClick={() => moveSelectedTo('inbox')}>Inbox</button>
                        <button type="button" role="menuitem" onClick={() => moveSelectedTo('archive')}>Archive</button>
                        <button type="button" role="menuitem" onClick={() => moveSelectedTo('junk')}>Junk Email</button>
                        <button type="button" role="menuitem" onClick={() => moveSelectedTo('deleted')}>Deleted Items</button>
                    </>
                )}
                {toolbarMenu === 'reply' && selectedEmail && (
                    <>
                        <button type="button" role="menuitem" onClick={() => { setToolbarMenu(null); handleReply(selectedEmail); }}>Reply</button>
                        <button type="button" role="menuitem" onClick={() => { setToolbarMenu(null); handleReplyAll(selectedEmail); }}>Reply all</button>
                        <button type="button" role="menuitem" onClick={() => { setToolbarMenu(null); handleForward(selectedEmail); }}>Forward</button>
                    </>
                )}
                {toolbarMenu === 'more' && (
                    <>
                        <button type="button" role="menuitem" disabled={!hasSelection} onClick={handleBulkReport}>Report junk</button>
                        <button type="button" role="menuitem" disabled={!hasSelection} onClick={handleBulkSweep}>Sweep</button>
                        {(isDeletedFolder || isJunkFolder) && (
                            <button type="button" role="menuitem" disabled={!hasSelection} onClick={handleBulkRestore}>Restore to Inbox</button>
                        )}
                        <button type="button" role="menuitem" disabled={!selectedEmail} onClick={() => selectedEmail && handleReply(selectedEmail)}>Reply</button>
                        <button type="button" role="menuitem" disabled={!selectedEmail} onClick={() => selectedEmail && handleForward(selectedEmail)}>Forward</button>
                    </>
                )}
            </div>,
            document.body
        );
    };

    return (
        <div className="mail-list-panel" id="mailListPanel" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }}>

            {/* Top Toolbar Container */}
            <div className="mail-toolbar-container">

                {/* 1. Main Mail Action Toolbar (Shown when NOT composing) */}
                {!isComposing && (
                    <div className={`mail-main-toolbar ${hasSelection ? 'is-selecting' : ''}`}>
                        <div className="mail-newmail-split">
                            <button
                                className="mail-toolbar-btn btn-new-mail"
                                type="button"
                                title="New mail"
                                onClick={handleOpenComposer}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>New Mail</span>
                            </button>
                            <button
                                ref={newMailMenuBtnRef}
                                className={`mail-toolbar-btn btn-new-mail-caret ${toolbarMenu === 'newmail' ? 'is-open' : ''}`}
                                type="button"
                                title="More compose options"
                                aria-label="More compose options"
                                aria-haspopup="true"
                                aria-expanded={toolbarMenu === 'newmail'}
                                onClick={() => openToolbarMenu('newmail', newMailMenuBtnRef)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                        </div>

                        {hasSelection && (
                            <div className="mail-selection-chip">
                                <span>{selectedCount} selected</span>
                                <button
                                    type="button"
                                    className="mail-selection-clear"
                                    title="Clear selection"
                                    onClick={() => { setSelectedEmailIds(new Set()); setIsSelectionMode(false); }}
                                >
                                    ×
                                </button>
                            </div>
                        )}

                        <div className="toolbar-divider"></div>

                        <button
                            className="mail-toolbar-btn"
                            type="button"
                            title="Delete"
                            disabled={!hasSelection}
                            onClick={handleBulkDelete}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Delete</span>
                        </button>

                        {isDeletedFolder || isJunkFolder ? (
                            <button
                                className="mail-toolbar-btn"
                                type="button"
                                title="Restore to Inbox"
                                disabled={!hasSelection}
                                onClick={handleBulkRestore}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                                    <path d="M3 3v5h5"></path>
                                </svg>
                                <span>Restore</span>
                            </button>
                        ) : (
                            <button
                                className="mail-toolbar-btn"
                                type="button"
                                title="Archive"
                                disabled={!hasSelection}
                                onClick={handleBulkArchive}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="21 8 21 21 3 21 3 8"></polyline>
                                    <rect x="1" y="3" width="22" height="5"></rect>
                                    <line x1="10" y1="12" x2="14" y2="12"></line>
                                </svg>
                                <span>Archive</span>
                            </button>
                        )}

                        <button
                            className={`mail-toolbar-btn ${toolbarMenu === 'move' ? 'is-active' : ''}`}
                            type="button"
                            title="Move to folder"
                            disabled={!hasSelection}
                            ref={moveMenuBtnRef}
                            aria-haspopup="true"
                            aria-expanded={toolbarMenu === 'move'}
                            onClick={() => hasSelection && openToolbarMenu('move', moveMenuBtnRef)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                            </svg>
                            <span>Move</span>
                            <svg className="chevron" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>

                        <button
                            className="mail-toolbar-btn"
                            type="button"
                            title={selectedHasUnread ? 'Mark as read' : 'Mark as unread'}
                            disabled={!hasSelection}
                            onClick={handleBulkMarkRead}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                            <span>{hasSelection && !selectedHasUnread ? 'Unread' : 'Read'}</span>
                        </button>

                        <button
                            className={`mail-toolbar-btn ${toolbarMenu === 'reply' ? 'is-active' : ''}`}
                            type="button"
                            title="Reply"
                            disabled={!selectedEmail}
                            ref={replyMenuBtnRef}
                            aria-haspopup="true"
                            aria-expanded={toolbarMenu === 'reply'}
                            onClick={() => selectedEmail && openToolbarMenu('reply', replyMenuBtnRef)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 14 4 9 9 4"></polyline>
                                <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                            </svg>
                            <span>Reply</span>
                            <svg className="chevron" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>

                        <button
                            className={`mail-toolbar-btn ${toolbarMenu === 'more' ? 'is-active' : ''}`}
                            type="button"
                            title="More actions"
                            ref={moreMenuBtnRef}
                            aria-haspopup="true"
                            aria-expanded={toolbarMenu === 'more'}
                            onClick={() => openToolbarMenu('more', moreMenuBtnRef)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="1"></circle>
                                <circle cx="19" cy="12" r="1"></circle>
                                <circle cx="5" cy="12" r="1"></circle>
                            </svg>
                            <span>More</span>
                        </button>

                        {renderToolbarMenu()}
                    </div>
                )}

                {/* 2. Format Ribbon Toolbar (Shown when COMPOSING) */}
                {isComposing && (
                    <div className="email-composer-toolbar expanded-ribbon" id="formatToolbar" style={{ display: "flex" }}>
                        <input type="file" id="editorPictureInput" accept="image/*" style={{ display: "none" }}
                            onChange={() => alert("Not implemented")} />

                        {/* Group 1: Clipboard */}
                        <div className="ribbon-group">
                            <div className="ribbon-group-content">
                                <button className="email-composer-toolbar-btn stacked-btn" type="button"
                                    onClick={() => alert("Not implemented")} title="Paste">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <path
                                            d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />

                                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                    </svg>
                                    <span className="stacked-btn-text">Paste</span>
                                </button>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <button className="email-composer-toolbar-btn" type="button"
                                        onClick={() => { formatDoc('undo') }} title="Undo">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 7v6h6" />
                                            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                                        </svg>
                                    </button>
                                    <button className="email-composer-toolbar-btn" type="button"
                                        onClick={() => alert("Not implemented")} title="Format Painter">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round">
                                            <path
                                                d="M18 14V8a6 6 0 0 0-12 0v6M12 2v6M5 14h14v3a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3z" />

                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <span className="ribbon-group-label">Clipboard</span>
                        </div>

                        {/* Group 2: Basic Text */}
                        <div className="ribbon-group">
                            <div className="ribbon-group-content">
                                <div
                                    style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'center' }}>
                                    {/* Row 1: Font, Size & Clear */}
                                    <div
                                        style={{ display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                        <div style={{ position: 'relative' }}>
                                            <button className="email-composer-toolbar-btn dropdown-select-btn"
                                                type="button" id="editorFontBtn"
                                                onClick={() => alert("Not implemented")}
                                                title="Font Family"
                                                style={{ width: '85px', height: '22px', padding: '0 4px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span id="currentFontName"
                                                    style={{ fontSize: '11px', fontWeight: '500', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Aptos</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9"
                                                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                    strokeWidth="2.5" strokeLinecap="round"
                                                    strokeLinejoin="round" style={{ color: '#64748b' }}>
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </button>
                                            <div className="email-composer-dropdown-menu" id="editorFontMenu"
                                                style={{ width: '130px' }}>
                                                <button className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { changeFont('Aptos', 'Aptos') }}
                                                    style={{ fontFamily: "Aptos, sans-serif" }}>Aptos</button>
                                                <button className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { changeFont('Arial', 'Arial') }}
                                                    style={{ fontFamily: "Arial" }}>Arial</button>
                                                <button className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { changeFont('Calibri', 'Calibri') }}
                                                    style={{ fontFamily: "Calibri" }}>Calibri</button>
                                                <button className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { changeFont('Times New Roman', 'Times New Roman') }}
                                                    style={{ fontFamily: "Times New Roman" }}>Times New Roman</button>
                                            </div>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <button className="email-composer-toolbar-btn dropdown-select-btn"
                                                type="button" id="editorFontSizeBtn"
                                                onClick={() => alert("Not implemented")}
                                                title="Font Size"
                                                style={{ width: '40px', height: '22px', padding: '0 4px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span id="currentFontSize"
                                                    style={{ fontSize: '11px', fontWeight: '500', color: '#1e293b' }}>12</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9"
                                                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                    strokeWidth="2.5" strokeLinecap="round"
                                                    strokeLinejoin="round" style={{ color: '#64748b' }}>
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </button>
                                            <div className="email-composer-dropdown-menu" id="editorFontSizeMenu"
                                                style={{ width: '55px' }}>
                                                <button className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { changeFontSizePt('10') }}>10</button>
                                                <button className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { changeFontSizePt('11') }}>11</button>
                                                <button className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { changeFontSizePt('12') }}>12</button>
                                                <button className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { changeFontSizePt('14') }}>14</button>
                                            </div>
                                        </div>
                                        <button className="email-composer-toolbar-btn" type="button"
                                            onClick={() => { formatDoc('removeFormat') }} title="Clear Formatting"
                                            style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />

                                            </svg>
                                        </button>
                                    </div>
                                    {/* Row 2: Formatting Toggles with Sub-group Dividers & Clean Spacing */}
                                    <div
                                        style={{ display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                        {/* Sub-group 1: Basic Styles (B, I, U, S) */}
                                        <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                                            <button className="email-composer-toolbar-btn" type="button"
                                                onClick={() => { formatDoc('bold') }} title="Bold"
                                                style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><strong
                                                    style={{ fontFamily: "system-ui, sans-serif", fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>B</strong></button>
                                            <button className="email-composer-toolbar-btn" type="button"
                                                onClick={() => { formatDoc('italic') }} title="Italic"
                                                style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><em
                                                    style={{ fontFamily: "Georgia, serif", fontSize: '13px', fontWeight: '600', fontStyle: 'italic', color: '#1e293b' }}>I</em></button>
                                            <button className="email-composer-toolbar-btn" type="button"
                                                onClick={() => { formatDoc('underline') }} title="Underline"
                                                style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><span
                                                    style={{ textDecoration: 'underline', fontFamily: "system-ui, sans-serif", fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>U</span></button>
                                            <button className="email-composer-toolbar-btn" type="button"
                                                onClick={() => { formatDoc('strikeThrough') }} title="Strikethrough"
                                                style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span
                                                    style={{ textDecoration: 'line-through', fontFamily: "system-ui, sans-serif", fontSize: '12px', fontWeight: '600', color: '#475569' }}>ab</span>
                                            </button>
                                        </div>

                                        <div style={{ height: '12px', width: '1px', background: '#cbd5e1', margin: '0 1px' }}>
                                        </div>

                                        {/* Sub-group 2: Script & Case (X2, X2, Aa) */}
                                        <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                                            <button className="email-composer-toolbar-btn" type="button"
                                                onClick={() => { formatDoc('subscript') }} title="Subscript"
                                                style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span
                                                    style={{ fontFamily: "system-ui, sans-serif", fontSize: '11px', color: '#475569' }}>X<sub>2</sub></span>
                                            </button>
                                            <button className="email-composer-toolbar-btn" type="button"
                                                onClick={() => { formatDoc('superscript') }} title="Superscript"
                                                style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span
                                                    style={{ fontFamily: "system-ui, sans-serif", fontSize: '11px', color: '#475569' }}>X<sup>2</sup></span>
                                            </button>
                                            <button className="email-composer-toolbar-btn" type="button"
                                                onClick={() => alert("Not implemented")} title="Change Case"
                                                style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span
                                                    style={{ fontWeight: '600', fontSize: '11px', color: '#475569' }}>Aa</span>
                                            </button>
                                        </div>

                                        <div style={{ height: '12px', width: '1px', background: '#cbd5e1', margin: '0 1px' }}>
                                        </div>

                                        {/* Sub-group 3: Color Pickers */}
                                        <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                                            <button className="email-composer-toolbar-btn color-dropdown-btn"
                                                type="button" id="editorHighlightColorBtn"
                                                onClick={() => alert("Not implemented")}
                                                title="Highlight Color"
                                                style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path
                                                        d="M12 22C17.5 22 22 17.5 22 12S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z" />

                                                    <path d="M11 7l4 4-7.5 7.5H4v-3.5L11 7z" />
                                                </svg>
                                                <span className="color-underline-indicator highlight-indicator"
                                                    style={{ backgroundColor: 'yellow', position: 'absolute', bottom: '2px', left: '3px', right: '3px', height: '3px', borderRadius: '1px' }}></span>
                                            </button>
                                            <div className="email-composer-color-palette" id="editorHighlightColorMenu">
                                                <div className="email-composer-color-grid-title">Highlight Color</div>
                                                <div className="email-composer-color-grid" id="highlightColorGrid2">
                                                </div>
                                            </div>
                                            <button className="email-composer-toolbar-btn color-dropdown-btn"
                                                type="button" id="editorTextColorBtn"
                                                onClick={() => alert("Not implemented")}
                                                title="Font Color"
                                                style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 20l8-16 8 16M6 16h12M12 4v16" />
                                                </svg>
                                                <span className="color-underline-indicator text-indicator"
                                                    style={{ backgroundColor: 'red', position: 'absolute', bottom: '2px', left: '3px', right: '3px', height: '3px', borderRadius: '1px' }}></span>
                                            </button>
                                            <div className="email-composer-color-palette" id="editorTextColorMenu">
                                                <div className="email-composer-color-grid-title">Text Color</div>
                                                <div className="email-composer-color-grid" id="textColorGrid2"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <span className="ribbon-group-label" style={{ textAlign: 'center', width: '100%' }}>Basic
                                Text</span>
                        </div>

                        {/* Group 3: Paragraph */}
                        <div className="ribbon-group">
                            <div className="ribbon-group-content">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    {/* Row 1: Lists & Indents */}
                                    <div style={{ display: 'flex', gap: '1px' }}>
                                        <button className="email-composer-toolbar-btn" type="button"
                                            onClick={() => { formatDoc('insertUnorderedList') }} title="Bullet List">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="8" y1="6" x2="21" y2="6" />
                                                <line x1="8" y1="12" x2="21" y2="12" />
                                                <line x1="8" y1="18" x2="21" y2="18" />
                                                <line x1="3" y1="6" x2="3.01" y2="6" />
                                                <line x1="3" y1="12" x2="3.01" y2="12" />
                                                <line x1="3" y1="18" x2="3.01" y2="18" />
                                            </svg>
                                        </button>
                                        <button className="email-composer-toolbar-btn" type="button"
                                            onClick={() => { formatDoc('insertOrderedList') }} title="Numbered List">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="10" y1="6" x2="21" y2="6" />
                                                <line x1="10" y1="12" x2="21" y2="12" />
                                                <line x1="10" y1="18" x2="21" y2="18" />
                                                <path d="M4 6H5V10M4 10H6" />
                                                <path d="M4 14H6C6 14 6 15 5 16C4.5 16.5 4 17 4 18H6" />
                                            </svg>
                                        </button>
                                        <button className="email-composer-toolbar-btn" type="button"
                                            onClick={() => { formatDoc('outdent') }} title="Decrease Indent">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="11 17 6 12 11 7" />
                                                <line x1="21" y1="18" x2="9" y2="18" />
                                                <line x1="21" y1="12" x2="6" y2="12" />
                                                <line x1="21" y1="6" x2="9" y2="6" />
                                            </svg>
                                        </button>
                                        <button className="email-composer-toolbar-btn" type="button"
                                            onClick={() => { formatDoc('indent') }} title="Increase Indent">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="13 17 18 12 13 7" />
                                                <line x1="21" y1="18" x2="9" y2="18" />
                                                <line x1="21" y1="12" x2="6" y2="12" />
                                                <line x1="21" y1="6" x2="9" y2="6" />
                                            </svg>
                                        </button>
                                    </div>
                                    {/* Row 2: Alignments */}
                                    <div style={{ display: 'flex', gap: '1px' }}>
                                        <button className="email-composer-toolbar-btn" type="button"
                                            onClick={() => { formatDoc('justifyLeft') }} title="Align Left">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="17" y1="10" x2="3" y2="10" />
                                                <line x1="21" y1="6" x2="3" y2="6" />
                                                <line x1="21" y1="14" x2="3" y2="14" />
                                                <line x1="17" y1="18" x2="3" y2="18" />
                                            </svg>
                                        </button>
                                        <button className="email-composer-toolbar-btn" type="button"
                                            onClick={() => { formatDoc('justifyCenter') }} title="Center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="10" x2="6" y2="10" />
                                                <line x1="21" y1="6" x2="3" y2="6" />
                                                <line x1="21" y1="14" x2="3" y2="14" />
                                                <line x1="18" y1="18" x2="6" y2="18" />
                                            </svg>
                                        </button>
                                        <button className="email-composer-toolbar-btn" type="button"
                                            onClick={() => { formatDoc('justifyRight') }} title="Align Right">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="21" y1="10" x2="7" y2="10" />
                                                <line x1="21" y1="6" x2="3" y2="6" />
                                                <line x1="21" y1="14" x2="3" y2="14" />
                                                <line x1="21" y1="18" x2="7" y2="18" />
                                            </svg>
                                        </button>
                                        <button className="email-composer-toolbar-btn" type="button"
                                            onClick={() => { formatDoc('justifyFull') }} title="Justify">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="21" y1="10" x2="3" y2="10" />
                                                <line x1="21" y1="6" x2="3" y2="6" />
                                                <line x1="21" y1="14" x2="3" y2="14" />
                                                <line x1="21" y1="18" x2="3" y2="18" />
                                            </svg>
                                        </button>
                                        <div style={{ position: 'relative' }}>
                                            <button className="email-composer-toolbar-btn dropdown-select-btn"
                                                type="button" id="editorLineSpacingBtn"
                                                onClick={() => alert("Not implemented")}
                                                title="Line Spacing" style={{ padding: '1px 3px' }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="21" y1="10" x2="7" y2="10" />
                                                    <line x1="21" y1="6" x2="3" y2="6" />
                                                    <line x1="21" y1="14" x2="7" y2="14" />
                                                    <line x1="21" y1="18" x2="3" y2="18" />
                                                </svg>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9"
                                                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                                    style={{ marginLeft: '1px' }}>
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </button>
                                            <div className="email-composer-dropdown-menu" id="editorLineSpacingMenu"
                                                style={{ width: '90px' }}>
                                                <button className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { changeLineSpacing('1.0') }}>1.0</button>
                                                <button className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { changeLineSpacing('1.15') }}>1.15</button>
                                                <button className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { changeLineSpacing('1.5') }}>1.5</button>
                                                <button className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { changeLineSpacing('2.0') }}>2.0</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <span className="ribbon-group-label">Paragraph</span>
                        </div>

                        {/* Group 4: Insert */}
                        <div className="ribbon-group">
                            <div className="ribbon-group-content">
                                <button className="email-composer-toolbar-btn stacked-btn" type="button"
                                    onClick={() => alert("Not implemented")} title="Attach File">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <path
                                            d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />

                                    </svg>
                                    <span className="stacked-btn-text">Attach</span>
                                </button>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <button className="email-composer-toolbar-btn" type="button" onClick={() => alert("Not implemented")}
                                        title="Insert Link">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />

                                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />

                                        </svg>
                                    </button>
                                    <div style={{ position: 'relative' }}>
                                        <button className="email-composer-toolbar-btn" type="button"
                                            id="editorTemplateBtn" onClick={() => {
                                                const sig = getDefaultSignatureText('new');
                                                if (sig) {
                                                    setComposeBody(prev => prev + sig);
                                                } else {
                                                    alert("No default signature configured. You can create one in Settings > Signatures.");
                                                }
                                            }}
                                            title="Insert Signature">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 20h9" />
                                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <button className="email-composer-toolbar-btn" type="button"
                                        onClick={() => alert("Not implemented")} title="Pictures">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                            <polyline points="21 15 16 10 5 21" />
                                        </svg>
                                    </button>
                                    <div style={{ position: 'relative' }}>
                                        <button className="email-composer-toolbar-btn" type="button"
                                            onClick={() => alert("Not implemented")} title="Emoji">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10" />
                                                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                                                <line x1="9" y1="9" x2="9.01" y2="9" />
                                                <line x1="15" y1="9" x2="15.01" y2="9" />
                                            </svg>
                                        </button>
                                        <div className="email-composer-dropdown-menu" id="editorEmojiMenu"
                                            style={{ width: '160px', padding: '5px', display: 'none', flexWrap: 'wrap', gap: '3px' }}>
                                            <button className="email-composer-dropdown-item" type="button"
                                                onClick={() => { insertEmoji('😊') }}
                                                style={{ fontSize: '15px', padding: '3px', textAlign: 'center', minWidth: '26px' }}>😊</button>
                                            <button className="email-composer-dropdown-item" type="button"
                                                onClick={() => { insertEmoji('👍') }}
                                                style={{ fontSize: '15px', padding: '3px', textAlign: 'center', minWidth: '26px' }}>👍</button>
                                            <button className="email-composer-dropdown-item" type="button"
                                                onClick={() => { insertEmoji('❤️') }}
                                                style={{ fontSize: '15px', padding: '3px', textAlign: 'center', minWidth: '26px' }}>❤️</button>
                                            <button className="email-composer-dropdown-item" type="button"
                                                onClick={() => { insertEmoji('🎉') }}
                                                style={{ fontSize: '15px', padding: '3px', textAlign: 'center', minWidth: '26px' }}>🎉</button>
                                            <button className="email-composer-dropdown-item" type="button"
                                                onClick={() => { insertEmoji('🙏') }}
                                                style={{ fontSize: '15px', padding: '3px', textAlign: 'center', minWidth: '26px' }}>🙏</button>
                                            <button className="email-composer-dropdown-item" type="button"
                                                onClick={() => { insertEmoji('🚀') }}
                                                style={{ fontSize: '15px', padding: '3px', textAlign: 'center', minWidth: '26px' }}>🚀</button>
                                            <button className="email-composer-dropdown-item" type="button"
                                                onClick={() => { insertEmoji('💡') }}
                                                style={{ fontSize: '15px', padding: '3px', textAlign: 'center', minWidth: '26px' }}>💡</button>
                                            <button className="email-composer-dropdown-item" type="button"
                                                onClick={() => { insertEmoji('🔥') }}
                                                style={{ fontSize: '15px', padding: '3px', textAlign: 'center', minWidth: '26px' }}>🔥</button>
                                            <button className="email-composer-dropdown-item" type="button"
                                                onClick={() => { insertEmoji('✅') }}
                                                style={{ fontSize: '15px', padding: '3px', textAlign: 'center', minWidth: '26px' }}>✅</button>
                                            <button className="email-composer-dropdown-item" type="button"
                                                onClick={() => { insertEmoji('⭐') }}
                                                style={{ fontSize: '15px', padding: '3px', textAlign: 'center', minWidth: '26px' }}>⭐</button>
                                        </div>
                                    </div>
                                </div>
                                <button className="email-composer-toolbar-btn stacked-btn" type="button"
                                    onClick={() => alert("Not implemented")} title="Table">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                        <line x1="3" y1="9" x2="21" y2="9" />
                                        <line x1="3" y1="15" x2="21" y2="15" />
                                        <line x1="9" y1="3" x2="9" y2="21" />
                                        <line x1="15" y1="3" x2="15" y2="21" />
                                    </svg>
                                    <span className="stacked-btn-text">Table</span>
                                </button>
                            </div>
                            <span className="ribbon-group-label">Insert</span>
                        </div>

                        {/* Group 5: Voice */}
                        <div className="ribbon-group">
                            <div className="ribbon-group-content">
                                <button className="email-composer-toolbar-btn stacked-btn" type="button"
                                    id="editorDictationBtn" onClick={() => alert("Not implemented")}
                                    title="Dictation (Voice Typing)">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                        <line x1="12" y1="19" x2="12" y2="22" />
                                    </svg>
                                    <span className="stacked-btn-text">Dictate</span>
                                </button>
                            </div>
                            <span className="ribbon-group-label">Voice</span>
                        </div>

                        {/* Group 6: Proofing */}
                        <div className="ribbon-group">
                            <div className="ribbon-group-content">
                                <button className="email-composer-toolbar-btn stacked-btn" type="button"
                                    onClick={() => alert("Not implemented")} title="Editor / Spell Check">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <path
                                            d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />

                                        <path d="M9 12l2 2 4-4" />
                                    </svg>
                                    <span className="stacked-btn-text">Editor</span>
                                </button>
                            </div>
                            <span className="ribbon-group-label">Proofing</span>
                        </div>

                        {/* Group 7: Add-ins */}
                        <div className="ribbon-group">
                            <div className="ribbon-group-content">
                                <button className="email-composer-toolbar-btn stacked-btn" type="button"
                                    onClick={() => alert("Not implemented")} title="Add-ins">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="7" height="7" />
                                        <rect x="14" y="3" width="7" height="7" />
                                        <rect x="14" y="14" width="7" height="7" />
                                        <rect x="3" y="14" width="7" height="7" />
                                    </svg>
                                    <span className="stacked-btn-text">Add-ins</span>
                                </button>
                            </div>
                            <span className="ribbon-group-label">Add-ins</span>
                        </div>

                        {/* Group 8: Tags */}
                        <div className="ribbon-group">
                            <div className="ribbon-group-content">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <button className="email-composer-toolbar-btn" type="button" id="importanceHighBtn"
                                        onClick={() => alert("Not implemented")} title="High Importance"
                                        style={{ padding: '1px 3px' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                            strokeLinecap="round" strokeLinejoin="round" style={{ color: '#d93025' }}>
                                            <line x1="12" y1="4" x2="12" y2="15" />
                                            <line x1="12" y1="19" x2="12.01" y2="19" />
                                        </svg>
                                    </button>
                                    <button className="email-composer-toolbar-btn" type="button" id="importanceLowBtn"
                                        onClick={() => alert("Not implemented")} title="Low Importance"
                                        style={{ padding: '1px 3px' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round" style={{ color: '#1a73e8' }}>
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <polyline points="19 12 12 19 5 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <span className="ribbon-group-label">Tags</span>
                        </div>

                        {/* Group 9: Print */}
                        <div className="ribbon-group">
                            <div className="ribbon-group-content">
                                <button className="email-composer-toolbar-btn stacked-btn" type="button"
                                    onClick={() => alert("Not implemented")} title="Print Draft">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 6 2 18 2 18 9" />
                                        <path
                                            d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />

                                        <rect x="6" y="14" width="12" height="8" />
                                    </svg>
                                    <span className="stacked-btn-text">Print</span>
                                </button>
                            </div>
                            <span className="ribbon-group-label">Print</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Split View (Left: Mail List, Right: Reading Pane / Composer) */}
            <div
                className="mail-split-view"
                id="mailSplitView"
                ref={splitViewRef}
                style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}
            >

                {/* Left: Email List Panel */}
                <div
                    className={`mail-list-column ${isSelectionMode ? 'selection-mode' : ''}`}
                    style={{
                        width: listColumnWidth ? `${listColumnWidth}px` : '360px',
                        minWidth: '320px',
                        maxWidth: '580px',
                        flex: `0 0 ${listColumnWidth || 400}px`,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0,
                        overflow: 'hidden',
                        transition: isResizing ? 'none' : undefined
                    }}
                >

                    {/* Subheader: Received/Sent Switcher & Outlook Actions Toolbar */}
                    <div className="mail-top-header-row">
                        <div className="mail-top-header-left">
                            <label className="mail-select-all-header is-visible" htmlFor="selectAllEmails" title="Select all">
                                <input
                                    type="checkbox"
                                    id="selectAllEmails"
                                    aria-label="Select all emails"
                                    checked={filteredEmails.length > 0 && selectedEmailIds.size === filteredEmails.length && selectedEmailIds.size > 0}
                                    onChange={handleSelectAll}
                                />
                            </label>
                            <div id="mailTabsContainer" className="mail-tabs">
                                <button
                                    className={`mail-tab ${activeMailTab === 'received' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveMailTab('received');
                                        navigate('/dashboard/email/inbox');
                                    }}
                                >
                                    Received
                                </button>
                                <button
                                    className={`mail-tab ${activeMailTab === 'sent' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveMailTab('sent');
                                        navigate('/dashboard/email/sent');
                                    }}
                                >
                                    Sent
                                </button>
                            </div>
                            <span className="mail-list-count">{filteredEmails.length}</span>
                        </div>

                        {/* 4 Outlook Action Buttons */}
                        <div className="mail-list-outlook-actions">
                            <div className="jump-to-container mail-outlook-sort-wrap">
                                <button
                                    type="button"
                                    ref={jumpBtnRef}
                                    className={`mail-outlook-icon-btn ${isJumpToOpen ? 'is-active' : ''}`}
                                    id="jumpToBtn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isJumpToOpen && jumpBtnRef.current) {
                                            const rect = jumpBtnRef.current.getBoundingClientRect();
                                            const menuWidth = 180;
                                            let left = rect.left;
                                            if (left + menuWidth > window.innerWidth - 8) {
                                                left = Math.max(8, rect.right - menuWidth);
                                            }
                                            setJumpMenuPos({
                                                top: Math.round(rect.bottom + 4),
                                                left: Math.round(left)
                                            });
                                            setIsJumpToOpen(true);
                                        } else {
                                            setIsJumpToOpen(false);
                                        }
                                    }}
                                    title="Jump to"
                                    aria-label="Jump to"
                                    aria-haspopup="true"
                                    aria-expanded={isJumpToOpen}
                                >
                                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" width="18" height="18">
                                        <path d="M8 4.2c2.8 0 4.5 1.2 4.5 3.6v6.5" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
                                        <path d="M9.4 11.6L12.5 15l3.1-3.4" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>

                                {isJumpToOpen && ReactDOM.createPortal(
                                    <div
                                        id="jumpToDropdown"
                                        className="jump-to-menu is-open"
                                        role="menu"
                                        aria-label="Jump to date"
                                        ref={jumpToRef}
                                        style={{
                                            position: 'fixed',
                                            top: `${jumpMenuPos.top}px`,
                                            left: `${jumpMenuPos.left}px`,
                                            zIndex: 2147483000,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            minWidth: '176px',
                                            padding: '6px',
                                            background: '#fff',
                                            border: '1px solid #d1d1d1',
                                            borderRadius: '4px',
                                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {['Today', 'Yesterday', 'Last week', 'Last month', 'Last year'].map(preset => (
                                            <button
                                                key={preset}
                                                type="button"
                                                className={`jump-to-item ${jumpToPreset === preset ? 'is-selected' : ''}`}
                                                role="menuitem"
                                                onClick={() => {
                                                    setJumpToPreset(jumpToPreset === preset ? '' : preset);
                                                    const target = getJumpTargetDate(preset);
                                                    performJumpToDate(target);
                                                    setIsJumpToOpen(false);
                                                }}
                                            >
                                                {preset}
                                            </button>
                                        ))}
                                        <div className="jump-to-date-row" style={{ padding: '8px 4px 4px' }}>
                                            <div className="jump-to-date-field" style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #8a8886', borderRadius: '2px', padding: '2px 4px 2px 6px' }}>
                                                <input
                                                    type="date"
                                                    id="jumpToDateInput"
                                                    aria-label="Jump to custom date"
                                                    value={customJumpDate}
                                                    onChange={(e) => setCustomJumpDate(e.target.value)}
                                                    style={{ border: 'none', outline: 'none', fontSize: '12px', width: '100%' }}
                                                />
                                            </div>
                                        </div>
                                        <div className="jump-to-go-row" style={{ padding: '4px', textAlign: 'right' }}>
                                            <button
                                                type="button"
                                                className="jump-to-go-btn"
                                                style={{ padding: '3px 12px', background: '#fff', border: '1px solid #8a8886', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', color: '#242424' }}
                                                onClick={() => {
                                                    if (customJumpDate) {
                                                        const target = getJumpTargetDate(customJumpDate);
                                                        performJumpToDate(target);
                                                    }
                                                    setIsJumpToOpen(false);
                                                }}
                                            >
                                                Go
                                            </button>
                                        </div>
                                    </div>,
                                    document.body
                                )}
                            </div>

                            {/* 3. Filter Bar Toggle */}
                            <button
                                type="button"
                                className={`mail-outlook-icon-btn ${!showFilterBar ? 'is-active' : ''}`}
                                id="mailFilterBtn"
                                title="Filter"
                                aria-label="Filter"
                                onClick={() => setShowFilterBar(!showFilterBar)}
                            >
                                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" width="18" height="18">
                                    <path d="M3.5 5.5h13M5.5 10h9M7.5 14.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                </svg>
                            </button>

                            {/* 4. Sort Order */}
                            <button
                                type="button"
                                className={`mail-outlook-icon-btn ${sortOrder === 'asc' ? 'is-active' : ''}`}
                                id="mailSortBtn"
                                title={sortOrder === 'desc' ? 'Sorted: Newest first' : 'Sorted: Oldest first'}
                                aria-label="Sort"
                                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                            >
                                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" width="18" height="18">
                                    <path d="M7 4.5v11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                    <path d="M4.5 12.5L7 15.5l2.5-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M13 15.5v-11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                    <path d="M10.5 7.5L13 4.5l2.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Filter Pills */}
                    {showFilterBar && (
                        <div className="mail-filters-bar" id="mailFiltersBar">
                            {['All', 'Unread', 'Flagged', 'To Me', 'Has Files', 'Mentions'].map(filter => (
                                <button
                                    key={filter}
                                    className={`mail-filter-pill ${activeFilter === filter ? 'active' : ''}`}
                                    onClick={() => setActiveFilter(filter)}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Emails Scroll List */}
                    <div className="mail-list-scroll-shell">
                        <div className="mail-table-wrap" id="mailTableWrap">
                            <div id="emailListBody" className="email-list-container">
                                {isLoading ? (
                                    <div className="mail-empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                                        <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid #cbd5e1', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
                                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                                        <strong>Loading emails...</strong>
                                    </div>
                                ) : (
                                    filteredEmails.map(email => (
                                        <EmailRow
                                            key={email.id}
                                            email={email}
                                            isSelected={selectedEmailIds.has(email.id)}
                                            isActive={!isComposing && selectedEmail?.id === email.id}
                                            onSelect={handleSelectEmail}
                                            onClick={handleEmailClick}
                                            onToggleRead={handleToggleRead}
                                            onDelete={handleDeleteEmail}
                                            onTogglePin={handleTogglePin}
                                        />
                                    ))
                                )}
                            </div>
                            {!isLoading && filteredEmails.length === 0 && (
                                <div className="mail-empty-state" id="mailEmptyState">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                    <strong>No emails found</strong>
                                    <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>Try another folder or clear your filters.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Resizable Splitter */}
                <div
                    className={`mail-splitter ${isResizing ? 'active' : ''}`}
                    id="mailSplitter"
                    title="Drag to resize"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize email panes"
                    tabIndex={0}
                    onMouseDown={startResize}
                    onTouchStart={startResize}
                ></div>

                {/* Right: Reading Pane OR Inline Composer */}
                <div className={`mail-reading-column ${isComposing ? 'composing' : ''}`} id="mailReadingColumn" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

                    {/* 1. INLINE COMPOSER VIEW */}
                    {isComposing && (
                        <div id="inlineComposerContent" className="inline-composer-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            {user?.subscription_status === 'expired' && (
                                <ContentLockedOverlay subtitle="Your organization's subscription has expired. Please renew your access to compose new emails." />
                            )}

                            {/* Composer Action Bar */}
                            <div className="email-composer-header">
                                <div className="composer-header-action-bar">
                                    <div style={{ display: 'flex', alignContent: 'center', alignItems: 'center', gap: '8px' }}>

                                        {/* Send Split Button */}
                                        <div className="composer-send-split-btn">
                                            <button
                                                className="btn-composer-send"
                                                type="button"
                                                onClick={handleSendEmail}
                                                disabled={isSending}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                                </svg>
                                                <span>{isSending ? 'Sending...' : 'Send'}</span>
                                            </button>
                                            <div className="split-divider"></div>
                                            <button className="btn-composer-send-options" type="button">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="6 9 12 15 18 9"></polyline>
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Attach */}
                                        <button
                                            className="composer-top-attachment-btn"
                                            type="button"
                                            onClick={() => alert('Attach file')}
                                            title="Attach Files"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                                            </svg>
                                            <span>Attach</span>
                                        </button>
                                    </div>

                                    {/* Discard Draft / Open in Window */}
                                    <div className="composer-header-actions-right">
                                        <button
                                            className="composer-top-delete-btn"
                                            title="Discard draft"
                                            type="button"
                                            onClick={() => setIsComposing(false)}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Composer Form Fields */}
                            <div className="email-composer-fields-wrap">

                                {/* From Row */}
                                <div className="email-composer-field from-row-wrapper">
                                    <button type="button" className="composer-field-label-btn" disabled>From</button>
                                    <span className="composer-from-email-val">{user?.email || 'singhrahuldrill1@outlook.com'}</span>
                                </div>

                                {/* To Row */}
                                <div className="email-composer-field to-row-wrapper">
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
                                        <button type="button" className="composer-field-label-btn">To</button>
                                        <input
                                            type="email"
                                            placeholder="Add recipients"
                                            value={composeTo}
                                            onChange={(e) => setComposeTo(e.target.value)}
                                            readOnly={folder === 'support'}
                                            style={{ border: 'none', outline: 'none', flex: 1, fontSize: '0.85rem', padding: '6px 0', backgroundColor: 'transparent' }}
                                        />
                                        <div className="cc-bcc-triggers" style={{ display: 'flex', gap: '8px', fontSize: '0.85rem', color: '#64748B' }}>
                                            <span className="cc-bcc-trigger-btn" style={{ cursor: 'pointer', fontWeight: 500, padding: '2px 6px' }} onClick={() => setShowCc(!showCc)}>Cc</span>
                                            <span className="cc-bcc-trigger-btn" style={{ cursor: 'pointer', fontWeight: 500, padding: '2px 6px' }} onClick={() => setShowBcc(!showBcc)}>Bcc</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Cc Row */}
                                {showCc && (
                                    <div className="email-composer-field cc-row-wrapper">
                                        <button type="button" className="composer-field-label-btn">Cc</button>
                                        <input
                                            type="email"
                                            placeholder="Add Cc recipients"
                                            value={composeCc}
                                            onChange={(e) => setComposeCc(e.target.value)}
                                            style={{ border: 'none', outline: 'none', flex: 1, fontSize: '0.85rem', padding: '6px 0' }}
                                        />
                                    </div>
                                )}

                                {/* Bcc Row */}
                                {showBcc && (
                                    <div className="email-composer-field bcc-row-wrapper">
                                        <button type="button" className="composer-field-label-btn">Bcc</button>
                                        <input
                                            type="email"
                                            placeholder="Add Bcc recipients"
                                            value={composeBcc}
                                            onChange={(e) => setComposeBcc(e.target.value)}
                                            style={{ border: 'none', outline: 'none', flex: 1, fontSize: '0.85rem', padding: '6px 0' }}
                                        />
                                    </div>
                                )}

                                {/* Subject Row */}
                                <div className="email-composer-field subject-row-wrapper">
                                    <input
                                        type="text"
                                        placeholder={folder === 'support' ? 'Reason' : 'Add a subject'}
                                        value={composeSubject}
                                        onChange={(e) => setComposeSubject(e.target.value)}
                                        className="compose-subject-input"
                                    />
                                </div>

                                {/* Body Editor Textarea */}
                                <div className="email-composer-editor-wrap">
                                    <textarea
                                        className="email-composer-editor"
                                        placeholder="Type / to insert files and more"
                                        value={composeBody}
                                        onChange={(e) => setComposeBody(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. EMPTY STATE (When no email is selected and not composing) */}
                    {!isComposing && !selectedEmail && (
                        <div id="readingPaneEmptyState" className="reading-pane-empty">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                            <p className="reading-empty-title">Select a message to read</p>
                            <p className="reading-empty-sub">Choose an email from the list, or start a new conversation.</p>
                            <button type="button" className="reading-empty-cta" onClick={handleOpenComposer}>
                                New Mail
                            </button>
                        </div>
                    )}

                    {/* 3. READING PANE VIEW (When email is selected) */}
                    {!isComposing && selectedEmail && (
                        <div id="readingPaneContent" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minHeight: '0', overflowY: 'auto', background: '#fff' }}>
                            {user?.subscription_status === 'expired' && (
                                <ContentLockedOverlay />
                            )}
                            {/* Top Header */}
                            <div className="reading-header" style={{ padding: '14px 24px 8px 24px', borderBottom: 'none' }}>
                                <div className="reading-thread-header" id="readingThreadHeader" style={{ fontSize: '0.95rem', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>
                                    {selectedEmail.sender}
                                </div>
                                <div className="reading-subject-line" id="readingSubjectLine" style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                                    Subject: <b>{selectedEmail.subject}</b>
                                </div>
                                <div className="reading-email-no" id="readingEmailNo" style={{ fontSize: '0.85rem', color: '#1D4ED8', fontWeight: 700, background: '#F1F5F9', padding: '6px 12px', borderRadius: '4px', display: 'inline-block' }}>
                                    Email No. : {selectedEmail.emailNo || selectedEmail.id || '17620'}
                                </div>
                            </div>

                            {/* Sender Meta Bar */}
                            <div className="reading-meta" style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid #F1F5F9', gap: '12px' }}>
                                <div className="reading-sender-avatar" id="readingAvatar" style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#1A6BA8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                                    {getSenderInitials(selectedEmail.sender)}
                                </div>
                                <div className="reading-sender-details" style={{ flex: 1, minWidth: 0 }}>
                                    <div className="reading-sender-name" id="readingSenderName" style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.92rem' }}>
                                        {selectedEmail.sender}
                                    </div>
                                    <div className="reading-sender-email" id="readingSenderEmail" style={{ fontSize: '0.8rem', color: '#475569' }}>
                                        &lt;{selectedEmail.senderEmail || `${selectedEmail.sender.toLowerCase().replace(/\s+/g, '')}@example.com`}&gt;
                                    </div>
                                    <div className="reading-to" id="readingTo" style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '1px' }}>
                                        To: Me
                                    </div>
                                </div>

                                {/* Top Pill Action Toolbar (6 buttons) */}
                                <div className="reading-actions-top" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F8FAFC', padding: '3px 8px', borderRadius: '100px', border: '1px solid #E2E8F0' }}>
                                    <button className="icon-btn" title="Expand View" onClick={() => setIsExpanded(!isExpanded)} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '50%' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="15 3 21 3 21 9"></polyline>
                                            <polyline points="9 21 3 21 3 15"></polyline>
                                            <line x1="21" y1="3" x2="14" y2="10"></line>
                                            <line x1="3" y1="21" x2="10" y2="14"></line>
                                        </svg>
                                    </button>
                                    <button className="icon-btn" title="Reply" onClick={() => handleReply(selectedEmail)} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '50%' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A6BA8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 14 4 9 9 4"></polyline>
                                            <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                                        </svg>
                                    </button>
                                    <button className="icon-btn" title="Reply All" onClick={() => handleReplyAll(selectedEmail)} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '50%' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A6BA8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="7 17 2 12 7 7"></polyline>
                                            <polyline points="13 17 8 12 13 7"></polyline>
                                            <path d="M22 18v-2a4 4 0 0 0-4-4H4"></path>
                                        </svg>
                                    </button>
                                    <button className="icon-btn" title="Forward" onClick={() => handleForward(selectedEmail)} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '50%' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A6BA8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="15 14 20 9 15 4"></polyline>
                                            <path d="M4 20v-7a4 4 0 0 1 4-4h12"></path>
                                        </svg>
                                    </button>
                                    <button className="icon-btn" title="Comments" onClick={() => alert('Comments panel')} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '50%' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                                            <line x1="9" y1="9" x2="9.01" y2="9"></line>
                                            <line x1="15" y1="9" x2="15.01" y2="9"></line>
                                        </svg>
                                    </button>
                                    <button className="icon-btn" title={selectedEmail.read ? "Mark as unread" : "Mark as read"} onClick={() => handleToggleRead(selectedEmail.id)} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '50%' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A6BA8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                            <polyline points="22,6 12,13 2,6"></polyline>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Threaded Message Card */}
                            <div className="reading-body" id="readingBody" style={{ flex: 1, padding: '16px 24px', background: '#f8fafc', overflowY: 'auto' }}>
                                <div className="threaded-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div className="threaded-card" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
                                        <div className="threaded-card-header" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <div className="threaded-avatar alt" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#E2E8F0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                                                {getSenderInitials(selectedEmail.sender)}
                                            </div>
                                            <div className="threaded-meta-details" style={{ flex: 1, minWidth: 0 }}>
                                                <div className="threaded-sender-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                    <span className="threaded-sender-name" style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>
                                                        {selectedEmail.sender}{' '}
                                                        <span className="threaded-sender-email" style={{ fontWeight: 400, color: '#64748B', fontSize: '0.8rem' }}>
                                                            &lt;&lt;{selectedEmail.senderEmail || `${selectedEmail.sender.toLowerCase().replace(/\s+/g, '')}@example.com`}&gt;&gt;
                                                        </span>
                                                    </span>
                                                    <span className="threaded-date" style={{ fontSize: '0.8rem', color: '#64748B', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                                                        {formatMailReadingDate(selectedEmail.date) || 'Mon 06-07-2026 16:29'}
                                                    </span>
                                                </div>
                                                <div className="threaded-to" style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                                                    To: Me
                                                </div>
                                                <div className="threaded-client-id" style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '1px' }}>
                                                    Me
                                                </div>
                                            </div>
                                            <div className="threaded-card-actions" style={{ display: 'flex', gap: '4px' }}>
                                                <button className="icon-btn" title="Reply" onClick={() => handleReply(selectedEmail)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="9 14 4 9 9 4"></polyline>
                                                        <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                                                    </svg>
                                                </button>
                                                <button className="icon-btn" title="Reply All" onClick={() => handleReplyAll(selectedEmail)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="7 17 2 12 7 7"></polyline>
                                                        <polyline points="13 17 8 12 13 7"></polyline>
                                                        <path d="M22 18v-2a4 4 0 0 0-4-4H4"></path>
                                                    </svg>
                                                </button>
                                                <button className="icon-btn" title="Forward" onClick={() => handleForward(selectedEmail)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="15 14 20 9 15 4"></polyline>
                                                        <path d="M4 20v-7a4 4 0 0 1 4-4h12"></path>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="threaded-body" style={{ marginTop: '16px', lineHeight: '1.6', fontSize: '13px', color: '#1E293B' }}>
                                            {selectedEmail.body ? (
                                                <div dangerouslySetInnerHTML={{ __html: selectedEmail.body }} />
                                            ) : (
                                                <div>{selectedEmail.preview}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}