import './EmailLightPolish.css';
import './ComposerRibbon.css';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import { useGeneralSettings } from '../../context/GeneralSettingsContext';
import { mockEmails } from '../../data/mockEmails';
import EmailRow from '../../components/dashboard/EmailRow';
import { buildConversationThreads } from '../../utils/conversationThreading';
import ConversationThreadRow from '../../components/dashboard/ConversationThreadRow';
import '../../components/dashboard/ConversationThreading.css';
import EmailContextMenu from '../../components/dashboard/EmailContextMenu';
import QuickActionsModal from '../../components/dashboard/QuickActionsModal';
import EmailDetailsModal from '../../components/dashboard/EmailDetailsModal';
import SnoozeDatePickerModal from '../../components/dashboard/SnoozeDatePickerModal';
import UndoToast from '../../components/dashboard/UndoToast';
import { formatMailReadingDate, formatMailPreviewDate } from '../../utils/dateUtils';
import ContentLockedOverlay from '../../components/common/ContentLockedOverlay';
import SnoozeControlCenter, { ActiveSnoozeBanner } from '../../components/dashboard/SnoozeControlCenter';
import HeaderBorderTweakPopover, {
    DEFAULT_HEADER_UI_CONFIG,
    DEFAULT_BORDER_ACCENT_SETTINGS,
    getHeaderRowBg,
    getHeaderBoxShadow
} from '../../components/dashboard/HeaderBorderTweakPopover';

// ─────────────────────────────────────────────────────────────
// Session-level email cache (survives route/page switches, cleared on full reload)
// Emails are fetched ONCE per (user, folder, project, search) per session.
// Switching to Employees/Clients/etc. and back re-uses the cache instantly.
// A silent background revalidation only happens if the cache is older than EMAIL_CACHE_TTL_MS.
// ─────────────────────────────────────────────────────────────
const EMAIL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const emailListCache = new Map(); // key -> { emails: [], fetchedAt: number }
const syncedUsersThisSession = new Set(); // userIds for which /api/sync/refresh already ran

const getCurrentUserId = () => {
    try {
        return JSON.parse(localStorage.getItem('currentUser') || 'null')?.id ?? 'anon';
    } catch { return 'anon'; }
};

const buildEmailCacheKey = (folder, projectParam, searchQuery) =>
    `${getCurrentUserId()}|${folder || 'inbox'}|${projectParam || ''}|${(searchQuery || '').trim()}`;

/** Clear cached email lists (e.g. after account switch or a manual refresh). */
export const invalidateEmailCache = () => {
    emailListCache.clear();
    syncedUsersThisSession.clear();
};

export default function EmailView({ folder: folderProp, searchQuery: searchQueryProp } = {}) {
    const params = useParams();
    const folder = folderProp || params.folder || 'inbox';
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentProjectParam = searchParams.get('project');
    const outletCtx = useOutletContext() || {};
    const searchQuery = searchQueryProp !== undefined ? searchQueryProp : outletCtx.searchQuery;
    const initialCacheKey = buildEmailCacheKey(folder, currentProjectParam, searchQuery);
    // Tracks which cache key the current `emails` state belongs to
    const emailsOwnerKeyRef = useRef(emailListCache.has(initialCacheKey) ? initialCacheKey : null);
    const { uiSettings, saveUiSettings } = useUI() || {};
    const { settings: generalSettings } = useGeneralSettings() || {};

    const [activeProject, setActiveProject] = useState(null);
    const [activeProjectMembers, setActiveProjectMembers] = useState([]);
    const [composeProjectId, setComposeProjectId] = useState(null);
    const [allProjects, setAllProjects] = useState([]);

    // Context Menu & Quick Action States
    const [contextMenu, setContextMenu] = useState(null); // { x: number, y: number, emailIds: string[] } | null
    const [isQuickActionsModalOpen, setIsQuickActionsModalOpen] = useState(false);
    const [quickActions, setQuickActions] = useState(['read', 'delete', 'snooze', 'pin']);
    const [detailsModalEmail, setDetailsModalEmail] = useState(null);
    const [detailsModalTab, setDetailsModalTab] = useState('details');
    const [isSnoozeDateModalOpen, setIsSnoozeDateModalOpen] = useState(false);
    const [pendingSnoozeIds, setPendingSnoozeIds] = useState([]);
    const [undoToast, setUndoToast] = useState(null);

    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('currentUser') || 'null');
        } catch { return null; }
    });
    const [emails, setEmails] = useState(() => {
        const cached = emailListCache.get(initialCacheKey);
        if (cached && Array.isArray(cached.emails)) return cached.emails;
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            const cacheKey = currentUser?.id ? `safemailzEmails_${currentUser.id}` : 'safemailzEmails';
            const stored = localStorage.getItem(cacheKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error(e);
        }
        return [];
    });
    const [isLoading, setIsLoading] = useState(() => !emailListCache.has(initialCacheKey));

    const [activeFilter, setActiveFilter] = useState('All');
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [selectedEmailIds, setSelectedEmailIds] = useState(new Set());
    const [activeMailTab, setActiveMailTab] = useState(folder === 'sent' ? 'sent' : 'received');

    // Conversation Threading State & Toggle
    const [expandedThreadIds, setExpandedThreadIds] = useState(() => new Set(['thread-test-rahul']));

    const handleToggleThreadExpand = (threadId, e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setExpandedThreadIds(prev => {
            const next = new Set(prev);
            if (next.has(threadId)) {
                next.delete(threadId);
            } else {
                next.add(threadId);
            }
            return next;
        });
    };

    // Header UI Customizer & Border Accent State
    const [isBorderTweakOpen, setIsBorderTweakOpen] = useState(false);
    const [headerUiConfig, setHeaderUiConfig] = useState(() => {
        try {
            const savedNew = localStorage.getItem('safemailz_header_ui_config');
            if (savedNew) {
                return {
                    ...DEFAULT_HEADER_UI_CONFIG,
                    ...JSON.parse(savedNew)
                };
            }
            const savedOld = localStorage.getItem('safemailz_reading_border_accents');
            if (savedOld) {
                return {
                    ...DEFAULT_HEADER_UI_CONFIG,
                    ...JSON.parse(savedOld)
                };
            }
            return DEFAULT_HEADER_UI_CONFIG;
        } catch (e) {
            return DEFAULT_HEADER_UI_CONFIG;
        }
    });

    const handleHeaderUiConfigChange = (newConfig) => {
        setHeaderUiConfig(newConfig);
        try {
            localStorage.setItem('safemailz_header_ui_config', JSON.stringify(newConfig));
            localStorage.setItem('safemailz_reading_border_accents', JSON.stringify(newConfig));
        } catch (e) {}
    };

    const handleHeaderUiConfigReset = () => {
        setHeaderUiConfig(DEFAULT_HEADER_UI_CONFIG);
        try {
            localStorage.setItem('safemailz_header_ui_config', JSON.stringify(DEFAULT_HEADER_UI_CONFIG));
            localStorage.setItem('safemailz_reading_border_accents', JSON.stringify(DEFAULT_HEADER_UI_CONFIG));
        } catch (e) {}
    };

    // Aliases for backwards compatibility
    const borderAccentSettings = headerUiConfig;
    const handleBorderAccentChange = handleHeaderUiConfigChange;
    const handleBorderAccentReset = handleHeaderUiConfigReset;

    // Sync headerUiConfig directly to DOM CSS variables for real-time reactivity across the reading pane
    useEffect(() => {
        const root = document.documentElement;
        if (!headerUiConfig) return;

        const clientBWidth = headerUiConfig.clientBorderWidth !== undefined ? headerUiConfig.clientBorderWidth : (headerUiConfig.borderWidth ?? 3.5);
        const subjectBWidth = headerUiConfig.subjectBorderWidth !== undefined ? headerUiConfig.subjectBorderWidth : (headerUiConfig.borderWidth ?? 3.5);
        const emailNoBWidth = headerUiConfig.emailNoBorderWidth !== undefined ? headerUiConfig.emailNoBorderWidth : (headerUiConfig.borderWidth ?? 3.5);

        const clientGWidth = headerUiConfig.clientGradientWidth !== undefined ? headerUiConfig.clientGradientWidth : (headerUiConfig.gradientWidth ?? 200);
        const subjectGWidth = headerUiConfig.subjectGradientWidth !== undefined ? headerUiConfig.subjectGradientWidth : (headerUiConfig.gradientWidth ?? 200);
        const emailNoGWidth = headerUiConfig.emailNoGradientWidth !== undefined ? headerUiConfig.emailNoGradientWidth : (headerUiConfig.gradientWidth ?? 200);

        const clientGHeight = headerUiConfig.clientGradientHeight !== undefined ? headerUiConfig.clientGradientHeight : (headerUiConfig.gradientHeight ?? 2);
        const subjectGHeight = headerUiConfig.subjectGradientHeight !== undefined ? headerUiConfig.subjectGradientHeight : (headerUiConfig.gradientHeight ?? 2);
        const emailNoGHeight = headerUiConfig.emailNoGradientHeight !== undefined ? headerUiConfig.emailNoGradientHeight : (headerUiConfig.gradientHeight ?? 2);

        const cColor = headerUiConfig.clientColor || '#2563EB';
        const cGradEnd = headerUiConfig.clientGradientEnd || '#6366F1';
        const sColor = headerUiConfig.subjectColor || '#4F46E5';
        const sGradEnd = headerUiConfig.subjectGradientEnd || '#8B5CF6';
        const eColor = headerUiConfig.emailNoColor || '#0284C7';
        const eGradEnd = headerUiConfig.emailNoGradientEnd || '#38BDF8';

        // Master Layout & Header Block Positioning
        root.style.setProperty('--reading-border-radius', `${headerUiConfig.borderRadius || 0}px`);
        root.style.setProperty('--reading-row-gap', `${headerUiConfig.rowGap ?? 0}px`);
        root.style.setProperty('--reading-block-offset-y', `${headerUiConfig.blockOffsetY ?? 0}px`);
        root.style.setProperty('--reading-header-padding-top', `${headerUiConfig.containerPaddingTop ?? 4}px`);
        root.style.setProperty('--reading-header-padding-bottom', `${headerUiConfig.containerPaddingBottom ?? 8}px`);
        root.style.setProperty('--reading-header-padding-left', `${headerUiConfig.containerPaddingLeft ?? 24}px`);
        root.style.setProperty('--reading-header-padding-right', `${headerUiConfig.containerPaddingRight ?? 24}px`);
        root.style.setProperty('--reading-row-margin-left', `${headerUiConfig.rowMarginLeft ?? 0}px`);
        root.style.setProperty('--reading-row-margin-top', `${headerUiConfig.rowMarginTop ?? 0}px`);

        // Row 1 (Client)
        const clientBg = getHeaderRowBg(headerUiConfig.clientBgStyle, headerUiConfig.clientBgColor, headerUiConfig.clientBgOpacity, cColor);
        const clientShadow = getHeaderBoxShadow(headerUiConfig.boxShadowPreset, cColor);
        const clientPadY = headerUiConfig.clientPaddingY !== undefined ? headerUiConfig.clientPaddingY : (headerUiConfig.paddingY ?? 6);
        const clientPadX = headerUiConfig.clientPaddingX !== undefined ? headerUiConfig.clientPaddingX : (headerUiConfig.paddingX ?? 10);
        const clientMarginLeft = headerUiConfig.clientMarginLeft !== undefined ? headerUiConfig.clientMarginLeft : (headerUiConfig.rowMarginLeft ?? 0);
        const clientMarginTop = headerUiConfig.clientMarginTop !== undefined ? headerUiConfig.clientMarginTop : (headerUiConfig.rowMarginTop ?? 0);
        const clientMarginRight = headerUiConfig.clientMarginRight ?? 0;

        root.style.setProperty('--reading-client-font-size', `${headerUiConfig.clientFontSize || 14}px`);
        root.style.setProperty('--reading-client-font-weight', String(headerUiConfig.clientFontWeight || '600'));
        root.style.setProperty('--reading-client-text-color', headerUiConfig.clientTextColor || '#475569');
        root.style.setProperty('--reading-client-bg', clientBg);
        root.style.setProperty('--reading-client-padding-y', `${clientPadY}px`);
        root.style.setProperty('--reading-client-padding-left', headerUiConfig.enabled ? `${clientPadX}px` : '0px');
        root.style.setProperty('--reading-client-padding-right', `${Math.max(clientPadX, 110)}px`);
        root.style.setProperty('--reading-client-margin-left', `${clientMarginLeft}px`);
        root.style.setProperty('--reading-client-margin-top', `${clientMarginTop}px`);
        root.style.setProperty('--reading-client-margin-right', `${clientMarginRight}px`);
        root.style.setProperty('--reading-client-border-radius', `${headerUiConfig.clientBorderRadius ?? headerUiConfig.borderRadius ?? 0}px`);
        root.style.setProperty('--reading-client-box-shadow', clientShadow);
        root.style.setProperty('--reading-client-backdrop-filter', headerUiConfig.clientBgStyle === 'glass' ? 'blur(8px)' : 'none');

        // Row 2 (Subject)
        const subjectBg = getHeaderRowBg(headerUiConfig.subjectBgStyle, headerUiConfig.subjectBgColor, headerUiConfig.subjectBgOpacity, sColor);
        const subjectShadow = getHeaderBoxShadow(headerUiConfig.boxShadowPreset, sColor);
        const subjectPadY = headerUiConfig.subjectPaddingY !== undefined ? headerUiConfig.subjectPaddingY : (headerUiConfig.paddingY ?? 6);
        const subjectPadX = headerUiConfig.subjectPaddingX !== undefined ? headerUiConfig.subjectPaddingX : (headerUiConfig.paddingX ?? 10);
        const subjectMarginLeft = headerUiConfig.subjectMarginLeft !== undefined ? headerUiConfig.subjectMarginLeft : (headerUiConfig.rowMarginLeft ?? 0);
        const subjectMarginTop = headerUiConfig.subjectMarginTop !== undefined ? headerUiConfig.subjectMarginTop : (headerUiConfig.rowMarginTop ?? 0);
        const subjectMarginRight = headerUiConfig.subjectMarginRight ?? 0;

        root.style.setProperty('--reading-subject-font-size', `${headerUiConfig.subjectFontSize || 16}px`);
        root.style.setProperty('--reading-subject-font-weight', String(headerUiConfig.subjectFontWeight || '700'));
        root.style.setProperty('--reading-subject-text-color', headerUiConfig.subjectTextColor || '#0F172A');
        root.style.setProperty('--reading-subject-bg', subjectBg);
        root.style.setProperty('--reading-subject-padding-y', `${subjectPadY}px`);
        root.style.setProperty('--reading-subject-padding-left', headerUiConfig.enabled ? `${subjectPadX}px` : '0px');
        root.style.setProperty('--reading-subject-padding-right', `${Math.max(subjectPadX, 24)}px`);
        root.style.setProperty('--reading-subject-margin-left', `${subjectMarginLeft}px`);
        root.style.setProperty('--reading-subject-margin-top', `${subjectMarginTop}px`);
        root.style.setProperty('--reading-subject-margin-right', `${subjectMarginRight}px`);
        root.style.setProperty('--reading-subject-border-radius', `${headerUiConfig.subjectBorderRadius ?? headerUiConfig.borderRadius ?? 0}px`);
        root.style.setProperty('--reading-subject-box-shadow', subjectShadow);
        root.style.setProperty('--reading-subject-backdrop-filter', headerUiConfig.subjectBgStyle === 'glass' ? 'blur(8px)' : 'none');

        // Row 3 (Email No.)
        const emailNoBg = getHeaderRowBg(headerUiConfig.emailNoBgStyle, headerUiConfig.emailNoBgColor, headerUiConfig.emailNoBgOpacity, eColor);
        const emailNoShadow = getHeaderBoxShadow(headerUiConfig.boxShadowPreset, eColor);
        const emailNoMode = headerUiConfig.emailNoDisplayMode || 'bar';
        const emailNoPadY = headerUiConfig.emailNoPaddingY !== undefined ? headerUiConfig.emailNoPaddingY : (headerUiConfig.paddingY ?? 6);
        const emailNoPadX = headerUiConfig.emailNoPaddingX !== undefined ? headerUiConfig.emailNoPaddingX : (headerUiConfig.paddingX ?? 12);
        const emailNoMarginLeft = headerUiConfig.emailNoMarginLeft !== undefined ? headerUiConfig.emailNoMarginLeft : (headerUiConfig.rowMarginLeft ?? 0);
        const emailNoMarginTop = headerUiConfig.emailNoMarginTop !== undefined ? headerUiConfig.emailNoMarginTop : (headerUiConfig.rowMarginTop ?? 0);
        const emailNoMarginRight = headerUiConfig.emailNoMarginRight ?? 0;

        root.style.setProperty('--reading-emailno-display', emailNoMode === 'pill' ? 'inline-flex' : 'block');
        root.style.setProperty('--reading-emailno-width', emailNoMode === 'pill' ? 'fit-content' : '100%');
        root.style.setProperty('--reading-emailno-font-size', `${headerUiConfig.emailNoFontSize || 13}px`);
        root.style.setProperty('--reading-emailno-font-weight', String(headerUiConfig.emailNoFontWeight || '700'));
        root.style.setProperty('--reading-emailno-font-family', headerUiConfig.emailNoFontStyle === 'mono' ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' : 'inherit');
        root.style.setProperty('--reading-emailno-text-color', headerUiConfig.emailNoTextColor || '#1D4ED8');
        root.style.setProperty('--reading-emailno-bg', emailNoBg);
        root.style.setProperty('--reading-emailno-padding-y', `${emailNoPadY}px`);
        root.style.setProperty('--reading-emailno-padding-x', `${emailNoPadX}px`);
        root.style.setProperty('--reading-emailno-margin-left', `${emailNoMarginLeft}px`);
        root.style.setProperty('--reading-emailno-margin-top', `${emailNoMarginTop}px`);
        root.style.setProperty('--reading-emailno-margin-right', `${emailNoMarginRight}px`);
        root.style.setProperty('--reading-emailno-border-radius', emailNoMode === 'pill' ? '9999px' : `${headerUiConfig.emailNoBorderRadius ?? headerUiConfig.borderRadius ?? 4}px`);
        root.style.setProperty('--reading-emailno-border', emailNoMode === 'card' ? '1px solid #CBD5E1' : (emailNoMode === 'pill' ? `1px solid ${eColor}40` : 'none'));
        root.style.setProperty('--reading-emailno-box-shadow', emailNoShadow);
        root.style.setProperty('--reading-emailno-backdrop-filter', headerUiConfig.emailNoBgStyle === 'glass' ? 'blur(8px)' : 'none');

        // Accent Borders & Bottom Gradients
        if (!headerUiConfig.enabled) {
            root.style.setProperty('--reading-client-border-left', 'none');
            root.style.setProperty('--reading-client-accent-display', 'none');
            root.style.setProperty('--reading-client-gradient-display', 'none');

            root.style.setProperty('--reading-subject-border-left', 'none');
            root.style.setProperty('--reading-subject-accent-display', 'none');
            root.style.setProperty('--reading-subject-gradient-display', 'none');

            root.style.setProperty('--reading-emailno-border-left', emailNoMode === 'card' ? '1px solid #CBD5E1' : (emailNoMode === 'pill' ? `1px solid ${eColor}40` : 'none'));
            root.style.setProperty('--reading-emailno-accent-display', 'none');
            root.style.setProperty('--reading-emailno-gradient-display', 'none');
        } else {
            root.style.setProperty('--reading-client-border-left', clientBWidth > 0 ? `${clientBWidth}px solid ${cColor}` : 'none');
            root.style.setProperty('--reading-client-border-width', `${clientBWidth}px`);
            root.style.setProperty('--reading-client-color', cColor);
            root.style.setProperty('--reading-client-accent-display', clientBWidth > 0 ? 'block' : 'none');
            root.style.setProperty('--reading-client-gradient-width', `${clientGWidth}px`);
            root.style.setProperty('--reading-client-gradient-height', `${clientGHeight}px`);
            root.style.setProperty('--reading-client-gradient-bg', `linear-gradient(90deg, ${cColor} 0%, ${cGradEnd} 60%, transparent 100%)`);
            root.style.setProperty('--reading-client-gradient-display', clientGWidth > 0 ? 'block' : 'none');

            root.style.setProperty('--reading-subject-border-left', subjectBWidth > 0 ? `${subjectBWidth}px solid ${sColor}` : 'none');
            root.style.setProperty('--reading-subject-border-width', `${subjectBWidth}px`);
            root.style.setProperty('--reading-subject-color', sColor);
            root.style.setProperty('--reading-subject-accent-display', subjectBWidth > 0 ? 'block' : 'none');
            root.style.setProperty('--reading-subject-gradient-width', `${subjectGWidth}px`);
            root.style.setProperty('--reading-subject-gradient-height', `${subjectGHeight}px`);
            root.style.setProperty('--reading-subject-gradient-bg', `linear-gradient(90deg, ${sColor} 0%, ${sGradEnd} 60%, transparent 100%)`);
            root.style.setProperty('--reading-subject-gradient-display', subjectGWidth > 0 ? 'block' : 'none');

            root.style.setProperty('--reading-emailno-border-left', emailNoMode === 'bar' ? (emailNoBWidth > 0 ? `${emailNoBWidth}px solid ${eColor}` : 'none') : (emailNoMode === 'card' ? '1px solid #CBD5E1' : (emailNoMode === 'pill' ? `1px solid ${eColor}40` : 'none')));
            root.style.setProperty('--reading-emailno-border-width', `${emailNoBWidth}px`);
            root.style.setProperty('--reading-emailno-color', eColor);
            root.style.setProperty('--reading-emailno-accent-display', (emailNoMode === 'bar' && emailNoBWidth > 0) ? 'block' : 'none');
            root.style.setProperty('--reading-emailno-gradient-width', `${emailNoGWidth}px`);
            root.style.setProperty('--reading-emailno-gradient-height', `${emailNoGHeight}px`);
            root.style.setProperty('--reading-emailno-gradient-bg', `linear-gradient(90deg, ${eColor} 0%, ${eGradEnd} 60%, transparent 100%)`);
            root.style.setProperty('--reading-emailno-gradient-display', (emailNoMode === 'bar' && emailNoGWidth > 0) ? 'block' : 'none');
        }
    }, [headerUiConfig]);

    // Mail List Toolbar States
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isJumpToOpen, setIsJumpToOpen] = useState(false);
    const [jumpMenuPos, setJumpMenuPos] = useState({ top: 0, left: 0 });
    const [appliedDatePreset, setAppliedDatePreset] = useState(null); // 'Today' | 'Yesterday' | 'Last week' | 'Last month' | 'Last year' | null
    const [appliedCustomDate, setAppliedCustomDate] = useState(null); // 'YYYY-MM-DD' | null
    const [customDateInput, setCustomDateInput] = useState(() => {
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

    // jump-to-date logic replaced with actual filtering

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
    const [autoCcConfig, setAutoCcConfig] = useState({ isAutoCcEnabled: false, autoCcEmails: [] });

    // Dropdown toggles & formatting states for format toolbar
    const [openDropdown, setOpenDropdown] = useState(null);
    const [currentFont, setCurrentFont] = useState('Aptos');
    const [currentFontSize, setCurrentFontSize] = useState('12');
    const [currentLineSpacing, setCurrentLineSpacing] = useState('1.5');
    const [highlightColor, setHighlightColor] = useState('#facc15');
    const [textColor, setTextColor] = useState('#ef4444');
    const [composeImportance, setComposeImportance] = useState('normal');
    const [composerAttachments, setComposerAttachments] = useState([]);
    const [isDictating, setIsDictating] = useState(false);
    const [isSpellcheckEnabled, setIsSpellcheckEnabled] = useState(true);
    const [isFormatPainterActive, setIsFormatPainterActive] = useState(false);
    const [composerToast, setComposerToast] = useState(null);

    const composerEditorRef = useRef(null);
    const composerPictureInputRef = useRef(null);
    const composerAttachInputRef = useRef(null);
    const recognitionRef = useRef(null);
    const caseModeRef = useRef(0);
    const copiedStylesRef = useRef(null);
    const lastSyncedBodyRef = useRef('');
    const composerRangeRef = useRef(null);
    const [isReadingAttachments,setIsReadingAttachments]=useState(false);
    const attachmentReadLock=useRef(false);
    const escapeComposerText = text => String(text || '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const restoreComposerSelection = () => {
        const editor=composerEditorRef.current;if(!editor)return;
        editor.focus();const selection=window.getSelection();const range=composerRangeRef.current;
        if(range && editor.contains(range.commonAncestorContainer)){selection.removeAllRanges();selection.addRange(range);}
    };
    useEffect(()=>{
        if(!isComposing){composerRangeRef.current=null;recognitionRef.current?.stop();return;}
        const remember=()=>{
            const sel=window.getSelection(),editor=composerEditorRef.current;
            if(sel?.rangeCount && editor?.contains(sel.anchorNode) && editor.contains(sel.focusNode)){
                composerRangeRef.current=sel.getRangeAt(0).cloneRange();
                const commands={Bold:'bold',Italic:'italic',Underline:'underline',Strikethrough:'strikeThrough',Subscript:'subscript',Superscript:'superscript','Bullet List':'insertUnorderedList','Numbered List':'insertOrderedList','Align Left':'justifyLeft',Center:'justifyCenter','Align Right':'justifyRight',Justify:'justifyFull'};
                document.querySelectorAll('#formatToolbar button[title]').forEach(btn=>{if(commands[btn.title])btn.setAttribute('aria-pressed',String(document.queryCommandState(commands[btn.title])));});
            }
        };
        document.addEventListener('selectionchange',remember);
        return ()=>{document.removeEventListener('selectionchange',remember);recognitionRef.current?.stop();};
    },[isComposing]);
    useEffect(()=>{
        const toolbar=document.getElementById('formatToolbar');if(!toolbar)return;
        toolbar.querySelectorAll('button[title]').forEach(button=>button.setAttribute('aria-label',button.title));
        toolbar.querySelectorAll('.ribbon-group').forEach(group=>{group.setAttribute('role','group');group.setAttribute('aria-label',group.querySelector('.ribbon-group-label')?.textContent.trim() || 'Formatting');});
        const menus={editorFontBtn:['font','editorFontMenu'],editorFontSizeBtn:['fontSize','editorFontSizeMenu'],editorHighlightColorBtn:['highlight','editorHighlightColorMenu'],editorTextColorBtn:['textColor','editorTextColorMenu'],editorLineSpacingBtn:['lineSpacing','editorLineSpacingMenu']};
        Object.entries(menus).forEach(([id,[key,menu]])=>{const btn=document.getElementById(id);if(btn){btn.setAttribute('aria-expanded',String(openDropdown===key));btn.setAttribute('aria-controls',menu);}});
        const escape=e=>{if(e.key==='Escape' && openDropdown){e.preventDefault();setOpenDropdown(null);}};
        document.addEventListener('keydown',escape);return ()=>document.removeEventListener('keydown',escape);
    },[isComposing,openDropdown]);


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
                        } else if (res.status === 404) {
                            // Invalid/deleted user ID cached, auto logout
                            console.warn("User not found (stale cache), logging out");
                            localStorage.removeItem('currentUser');
                            window.location.href = '/signin';
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

    // Save emails to localStorage scoped to current user
    useEffect(() => {
        // Keep the session cache in sync with local (optimistic) updates: read/pin/delete/send etc.
        const ownerKey = emailsOwnerKeyRef.current;
        if (ownerKey && Array.isArray(emails)) {
            const existing = emailListCache.get(ownerKey);
            emailListCache.set(ownerKey, { emails, fetchedAt: existing?.fetchedAt ?? Date.now() });
        }
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (currentUser?.id && Array.isArray(emails) && emails.length > 0) {
                localStorage.setItem(`safemailzEmails_${currentUser.id}`, JSON.stringify(emails));
            }
        } catch (e) { }
    }, [emails]);

    // Helper to apply Auto CC settings to composer
    const applyAutoCcToComposer = (existingCc = '', configOverride = null) => {
        const config = configOverride || autoCcConfig;
        if (config.isAutoCcEnabled && Array.isArray(config.autoCcEmails) && config.autoCcEmails.length > 0) {
            setShowCc(true);
            const existingList = existingCc ? existingCc.split(/[,;\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean) : [];
            const merged = [...existingList];
            for (const em of config.autoCcEmails) {
                const clean = String(em || '').trim().toLowerCase();
                if (clean && !merged.includes(clean)) {
                    merged.push(clean);
                }
            }
            setComposeCc(merged.join(', '));
        } else {
            setComposeCc(existingCc || '');
            if (!existingCc) {
                setShowCc(false);
            }
        }
    };

    // Load and listen for Auto CC settings
    useEffect(() => {
        const fetchAutoCcSettings = async () => {
            try {
                const token = localStorage.getItem('token');
                const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                if (storedUser?.id) headers['x-user-id'] = String(storedUser.id);
                if (storedUser?.org_id || storedUser?.organization_id) {
                    headers['x-org-id'] = String(storedUser.org_id || storedUser.organization_id);
                }

                const res = await fetch('/api/email/settings/auto-cc', { headers });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.success) {
                        setAutoCcConfig({
                            isAutoCcEnabled: Boolean(data.isAutoCcEnabled),
                            autoCcEmails: Array.isArray(data.autoCcEmails) ? data.autoCcEmails : []
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to load Auto CC settings in EmailView:', err);
            }
        };

        fetchAutoCcSettings();

        const handleAutoCcUpdated = (e) => {
            if (e?.detail) {
                setAutoCcConfig({
                    isAutoCcEnabled: Boolean(e.detail.isAutoCcEnabled),
                    autoCcEmails: Array.isArray(e.detail.autoCcEmails) ? e.detail.autoCcEmails : []
                });
            } else {
                fetchAutoCcSettings();
            }
        };

        window.addEventListener('autocc-settings-updated', handleAutoCcUpdated);
        return () => window.removeEventListener('autocc-settings-updated', handleAutoCcUpdated);
    }, []);

    // Update activeMailTab when route param changes
    useEffect(() => {
        if (folder === 'sent') {
            setActiveMailTab('sent');
        } else {
            setActiveMailTab('received');
        }

        const params = new URLSearchParams(window.location.search);
        if (folder === 'support') {
            setIsComposing(true);
            setComposeTo('Support@safemailz.com');
            setComposeSubject('');
            setComposeBody(getDefaultSignatureText('new'));
            setComposerAttachments([]);
            setComposeImportance('normal');
            applyAutoCcToComposer('');
        } else if (params.get('compose') === '1') {
            setIsComposing(true);
            setComposeTo('');
            setComposeSubject('');
            setComposeBody(getDefaultSignatureText('new'));
            setComposerAttachments([]);
            setComposeImportance('normal');
            applyAutoCcToComposer('');
        } else {
            setIsComposing(false);
            setOpenDropdown(null);
        }
    }, [folder]);

    // Close formatting ribbon dropdowns on outside click
    useEffect(() => {
        if (!openDropdown) return;
        const handleDocMouseDown = (e) => {
            if (
                !e.target.closest('.email-composer-dropdown-menu') &&
                !e.target.closest('.email-composer-color-palette') &&
                !e.target.closest('.dropdown-select-btn') &&
                !e.target.closest('.color-dropdown-btn') &&
                !e.target.closest('[data-ribbon-dropdown-trigger]')
            ) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleDocMouseDown);
        return () => document.removeEventListener('mousedown', handleDocMouseDown);
    }, [openDropdown]);

    // Sync composeBody state with contentEditable editor when opened or updated externally
    useEffect(() => {
        if (!isComposing || !composerEditorRef.current) return;
        if (lastSyncedBodyRef.current !== composeBody) {
            const formatted = composeBody && !/<[a-z][\s\S]*>/i.test(composeBody)
                ? composeBody.replace(/\n/g, '<br>')
                : (composeBody || '');
            if (composerEditorRef.current.innerHTML !== formatted) {
                composerEditorRef.current.innerHTML = formatted;
            }
            lastSyncedBodyRef.current = composeBody;
        }
    }, [isComposing, composeBody]);

    // Load Active Project & Members when project query param is set
    useEffect(() => {
        if (!currentProjectParam) {
            setActiveProject(null);
            setActiveProjectMembers([]);
            return;
        }

        let isMounted = true;
        const fetchProjectDetails = async () => {
            const token = localStorage.getItem("token");
            const headers = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const userStr = localStorage.getItem("currentUser");
            if (userStr) {
                try {
                    const parsedUser = JSON.parse(userStr);
                    headers["X-User-Id"] = parsedUser.id;
                    headers["X-Org-Id"] = parsedUser.organization_id || '1';
                } catch (e) {}
            }

            try {
                // Fetch members
                const memRes = await fetch(`/api/projects/${encodeURIComponent(currentProjectParam)}/members`, { headers });
                if (memRes.ok) {
                    const memData = await memRes.json();
                    if (isMounted && memData.members) {
                        setActiveProjectMembers(memData.members);
                    }
                }

                // Fetch project metadata
                const projRes = await fetch(`/api/projects/my-projects`, { headers });
                if (projRes.ok) {
                    const projData = await projRes.json();
                    if (isMounted && Array.isArray(projData.projects)) {
                        const target = projData.projects.find(p =>
                            String(p.id) === String(currentProjectParam) ||
                            String(p.projectId) === String(currentProjectParam) ||
                            String(p.projectName).toLowerCase() === String(currentProjectParam).toLowerCase()
                        );
                        if (target) {
                            setActiveProject(target);
                        } else {
                            setActiveProject({
                                id: currentProjectParam,
                                projectName: currentProjectParam,
                                projectEmailId: `${currentProjectParam.toLowerCase().replace(/\s+/g, '-')}@safemailz.com`,
                                status: 'Active'
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load project group data:", err);
            }
        };

        fetchProjectDetails();
        return () => { isMounted = false; };
    }, [currentProjectParam]);

    // Fetch quick actions settings and projects on mount
    useEffect(() => {
        let isMounted = true;
        const fetchSettingsAndProjects = async () => {
            const userStr = localStorage.getItem("currentUser");
            const token = localStorage.getItem("token");
            const headers = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            if (userStr) {
                try {
                    const parsed = JSON.parse(userStr);
                    headers["X-User-Id"] = parsed.id;
                    headers["X-Org-Id"] = parsed.organization_id || '1';
                } catch (e) {}
            }
            try {
                const qaRes = await fetch('/api/email/settings/quick-actions', { headers });
                if (qaRes.ok) {
                    const qaData = await qaRes.json();
                    if (isMounted && Array.isArray(qaData.quickActions) && qaData.quickActions.length === 4) {
                        setQuickActions(qaData.quickActions);
                    }
                }
                const pRes = await fetch('/api/projects/my-projects', { headers });
                if (pRes.ok) {
                    const pData = await pRes.json();
                    if (isMounted && Array.isArray(pData.projects)) {
                        setAllProjects(pData.projects);
                    }
                }
            } catch (err) {
                console.error("Failed to load settings or projects:", err);
            }
        };
        fetchSettingsAndProjects();
        return () => { isMounted = false; };
    }, []);

    const handleSaveQuickActions = async (newActions) => {
        const userStr = localStorage.getItem("currentUser");
        const token = localStorage.getItem("token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        if (userStr) {
            try {
                const parsed = JSON.parse(userStr);
                headers["X-User-Id"] = parsed.id;
                headers["X-Org-Id"] = parsed.organization_id || '1';
            } catch (e) {}
        }
        try {
            const res = await fetch('/api/email/settings/quick-actions', {
                method: 'PUT',
                headers,
                body: JSON.stringify({ actions: newActions })
            });
            if (res.ok) {
                setQuickActions(newActions);
                setUndoToast({
                    message: 'Quick actions updated successfully'
                });
            }
        } catch (e) {
            console.error('Failed to save quick actions:', e);
        }
    };

    // Fetch real emails from backend and trigger sync (cached per session — loads only once)
    useEffect(() => {
        let isMounted = true;
        const cacheKey = buildEmailCacheKey(folder, currentProjectParam, searchQuery);

        const fetchEmails = async (isBackgroundRefresh = false, allowSync = true) => {
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
                    headers["X-Org-Id"] = parsedUser.organization_id || '1';
                    if (parsedUser.email) headers["X-Active-Email"] = String(parsedUser.email).trim();
                } catch (e) {
                    console.error("Failed to parse user string", e);
                }
            }

            try {
                let response;
                if (searchQuery && searchQuery.trim()) {
                    response = await fetch(`/api/emails/search?q=${encodeURIComponent(searchQuery.trim())}&folder=${encodeURIComponent(folder || 'inbox')}`, {
                        headers
                    });
                } else {
                    const projectQuery = currentProjectParam ? `&project=${encodeURIComponent(currentProjectParam)}` : '';
                    response = await fetch(`/api/emails?filter=${encodeURIComponent(folder || 'inbox')}${projectQuery}`, {
                        headers
                    });
                }
                if (response.ok && isMounted) {
                    const data = await response.json();
                    const freshEmails = (data.emails && Array.isArray(data.emails)) ? data.emails : [];
                    emailListCache.set(cacheKey, { emails: freshEmails, fetchedAt: Date.now() });
                    emailsOwnerKeyRef.current = cacheKey;
                    setEmails(freshEmails);
                }
            } catch (err) {
                console.error("Failed to fetch real emails:", err);
            } finally {
                if (isMounted && !isBackgroundRefresh) {
                    setIsLoading(false);
                }
            }

            // Trigger the backend mailbox sync only once per user per session
            const userId = getCurrentUserId();
            if (allowSync && !syncedUsersThisSession.has(userId)) {
                syncedUsersThisSession.add(userId);
                try {
                    const syncResponse = await fetch('/api/sync/refresh', { method: 'POST', headers });
                    if (syncResponse.ok && isMounted) {
                        // After sync completes, fetch emails again (silently) to show new ones
                        fetchEmails(true, false);
                    }
                } catch (syncErr) {
                    syncedUsersThisSession.delete(userId);
                    console.error("Background sync failed:", syncErr);
                }
            }
        };

        const cached = emailListCache.get(cacheKey);
        if (cached) {
            // Instant render from cache — no spinner, no network on page switch
            emailsOwnerKeyRef.current = cacheKey;
            setEmails(cached.emails);
            setIsLoading(false);
            // Silent revalidation only when the cache is stale
            if (Date.now() - cached.fetchedAt > EMAIL_CACHE_TTL_MS) {
                fetchEmails(true, false);
            }
        } else {
            fetchEmails(false);
        }

        const handleSnoozeStatusChanged = () => {
            if (isMounted) fetchEmails(true, false);
        };
        const handleOpenCompose = () => {
            setIsComposing(true);
            setComposeTo('');
            setComposeSubject('');
            setComposeBody('');
            setComposeBcc('');
        };
        const handleCloseModal = () => {
            setIsComposing(false);
            setSelectedEmail(null);
        };

        window.addEventListener('snoozeStatusChanged', handleSnoozeStatusChanged);
        window.addEventListener('safemailz-compose', handleOpenCompose);
        window.addEventListener('safemailz-close-modal', handleCloseModal);

        return () => {
            isMounted = false;
            window.removeEventListener('snoozeStatusChanged', handleSnoozeStatusChanged);
            window.removeEventListener('safemailz-compose', handleOpenCompose);
            window.removeEventListener('safemailz-close-modal', handleCloseModal);
        };
    }, [folder, searchQuery, currentProjectParam]);

    const getDateFilterRange = () => {
        if (!appliedDatePreset && !appliedCustomDate) return null;
        const now = new Date();

        if (appliedDatePreset === 'Today') {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            return { start, end };
        } else if (appliedDatePreset === 'Yesterday') {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
            return { start, end };
        } else if (appliedDatePreset === 'Last week') {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            return { start, end };
        } else if (appliedDatePreset === 'Last month') {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            return { start, end };
        } else if (appliedDatePreset === 'Last year') {
            const start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            return { start, end };
        } else if (appliedCustomDate) {
            const parts = appliedCustomDate.split('-');
            if (parts.length === 3) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const d = parseInt(parts[2], 10);
                const start = new Date(y, m, d, 0, 0, 0, 0);
                const end = new Date(y, m, d, 23, 59, 59, 999);
                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    return { start, end };
                }
            }
        }
        return null;
    };

    const isDateFilterActive = !!(appliedDatePreset || appliedCustomDate);
    const dateRange = getDateFilterRange();

    const parseEmailDate = (email) => {
        if (!email) return null;
        const raw = email.createdAt || email.created_at || email.date;
        if (!raw) return null;
        if (raw instanceof Date) return raw;
        if (typeof raw === 'number') return new Date(raw);
        const str = String(raw).trim();
        if (!str) return null;
        const now = new Date();

        if (str.toLowerCase() === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
        if (str.toLowerCase() === 'yesterday') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0, 0);

        const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = parseInt(timeMatch[2], 10);
            const ampm = timeMatch[4] ? timeMatch[4].toLowerCase() : null;
            if (ampm === 'pm' && hours < 12) hours += 12;
            if (ampm === 'am' && hours === 12) hours = 0;
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
        }

        if (!/\b\d{4}\b/.test(str)) {
            const withYear = new Date(str + ' ' + now.getFullYear());
            if (!isNaN(withYear.getTime())) return withYear;
        }

        const isoCandidate = str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') + 'Z' : str;
        const directDate = new Date(isoCandidate);
        if (!isNaN(directDate.getTime())) return directDate;

        return null;
    };

    // Filtered list
    let filteredEmails = emails.filter(e => {
        // Date range filter
        if (dateRange) {
            const eDate = parseEmailDate(e);
            if (!eDate || eDate.getTime() < dateRange.start.getTime() || eDate.getTime() > dateRange.end.getTime()) {
                return false;
            }
        }

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
            else if (folder === 'pinned') matchesFolder = Boolean(e.pinned || e.isPinned);
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
        if (activeFilter === 'Flagged') return Boolean(e.flagged || e.isFlagged);
        if (activeFilter === 'To Me') return true;
        if (activeFilter === 'Has Files') return false;
        if (activeFilter === 'Mentioned Me' || activeFilter === 'Mentions') return false;

        return true;
    });

    // Pinned emails always sort to top
    filteredEmails.sort((a, b) => {
        const aPinned = Boolean(a.pinned || a.isPinned);
        const bPinned = Boolean(b.pinned || b.isPinned);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return 0;
    });

    if (sortOrder === 'asc') {
        filteredEmails = [...filteredEmails].reverse();
    }

    // Convert filtered emails into Outlook-style conversation threads
    const conversationThreads = useMemo(() => {
        if (typeof buildConversationThreads === 'function') {
            return buildConversationThreads(filteredEmails, {
                currentUserEmail: user?.email,
                currentUserId: user?.id
            });
        }
        return filteredEmails.map(email => ({
            threadId: email.id,
            subject: email.subject,
            messages: [email],
            messageCount: 1,
            latestEmail: email,
            hasUnread: !email.read,
            isPinned: Boolean(email.pinned || email.isPinned),
            isFlagged: Boolean(email.flagged || email.isFlagged),
            senders: [email.sender || email.from]
        }));
    }, [filteredEmails, user?.email, user?.id, generalSettings?.languageTime]);

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
                    setSelectedEmail(prev => prev && prev.id === email.id ? { ...prev, ...data.email } : data.email);
                    setEmails(prev => prev.map(m => m.id === email.id ? { ...m, ...data.email } : m));
                }
            }
        } catch (err) {
            console.error("Failed to fetch full email:", err);
        }
    };

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
            if (checked) {
                next.add(id);
            } else {
                next.delete(id);
            }
            if (next.size === 0) {
                setIsSelectionMode(false);
            }
            return next;
        });

        if (checked) {
            setIsSelectionMode(true);
        }
    };

    const handleSelectThreadCheckbox = (threadId, checked) => {
        const thread = conversationThreads.find(t => t.threadId === threadId);
        if (!thread) return;
        const msgIds = (thread.messages || []).map(m => m.id);
        setSelectedEmailIds(prev => {
            const next = new Set(prev);
            msgIds.forEach(id => {
                if (checked) {
                    next.add(id);
                } else {
                    next.delete(id);
                }
            });
            setIsSelectionMode(next.size > 0);
            return next;
        });
    };

    const getSelectedEmails = () => emails.filter(m => selectedEmailIds.has(m.id));

    // Unified Bulk Action Handler with Optimistic Updates & Undo
    const handleBulkAction = async (action, payload = null, explicitIds = null) => {
        let targetIds = explicitIds ? [...explicitIds] : Array.from(selectedEmailIds);
        if (targetIds.length === 0) {
            if (selectedEmail) {
                targetIds = [selectedEmail.id];
            } else {
                return;
            }
        }

        // Modals
        if (action === 'SET_QUICK_ACTIONS') {
            setIsQuickActionsModalOpen(true);
            setContextMenu(null);
            return;
        }
        if (action === 'VIEW_DETAILS') {
            const targetEmail = emails.find(e => e.id === targetIds[0]) || selectedEmail;
            setDetailsModalEmail(targetEmail);
            setDetailsModalTab('details');
            setContextMenu(null);
            return;
        }
        if (action === 'VIEW_SOURCE') {
            const targetEmail = emails.find(e => e.id === targetIds[0]) || selectedEmail;
            setDetailsModalEmail(targetEmail);
            setDetailsModalTab('source');
            setContextMenu(null);
            return;
        }
        if (action === 'SNOOZE_PICK_DATE') {
            setPendingSnoozeIds(targetIds);
            setIsSnoozeDateModalOpen(true);
            setContextMenu(null);
            return;
        }

        // Snapshot previous state for Undo
        const previousEmails = [...emails];
        const targetSet = new Set(targetIds);
        const count = targetIds.length;

        let toastMsg = `${count} conversation${count > 1 ? 's' : ''} updated`;
        let reverseAction = null;
        let reversePayload = null;

        if (action === 'DELETE') {
            setEmails(prev => prev.map(m => targetSet.has(m.id) ? { ...m, folder: 'deleted' } : m));
            if (selectedEmail && targetSet.has(selectedEmail.id)) setSelectedEmail(null);
            toastMsg = `${count} conversation${count > 1 ? 's' : ''} moved to Deleted Items`;
            reverseAction = 'RESTORE';
        } else if (action === 'RESTORE') {
            setEmails(prev => prev.map(m => targetSet.has(m.id) ? { ...m, folder: 'inbox' } : m));
            toastMsg = `${count} conversation${count > 1 ? 's' : ''} restored to Inbox`;
            reverseAction = 'DELETE';
        } else if (action === 'ARCHIVE') {
            setEmails(prev => prev.map(m => targetSet.has(m.id) ? { ...m, folder: 'archive' } : m));
            if (selectedEmail && targetSet.has(selectedEmail.id)) setSelectedEmail(null);
            toastMsg = `${count} conversation${count > 1 ? 's' : ''} moved to Archive`;
            reverseAction = 'RESTORE';
        } else if (action === 'MOVE') {
            const targetFolder = payload?.targetFolderId || 'inbox';
            setEmails(prev => prev.map(m => targetSet.has(m.id) ? { ...m, folder: targetFolder } : m));
            if (selectedEmail && targetSet.has(selectedEmail.id)) setSelectedEmail(null);
            toastMsg = `${count} conversation${count > 1 ? 's' : ''} moved to ${targetFolder}`;
            reverseAction = 'MOVE';
            reversePayload = { targetFolderId: folder };
        } else if (action === 'COPY') {
            toastMsg = `${count} conversation${count > 1 ? 's' : ''} copied to ${payload?.targetFolderId || 'folder'}`;
        } else if (action === 'MARK_READ') {
            setEmails(prev => prev.map(m => targetSet.has(m.id) ? { ...m, read: true } : m));
            toastMsg = `${count} conversation${count > 1 ? 's' : ''} marked as read`;
            reverseAction = 'MARK_UNREAD';
        } else if (action === 'MARK_UNREAD') {
            setEmails(prev => prev.map(m => targetSet.has(m.id) ? { ...m, read: false } : m));
            toastMsg = `${count} conversation${count > 1 ? 's' : ''} marked as unread`;
            reverseAction = 'MARK_READ';
        } else if (action === 'PIN') {
            setEmails(prev => prev.map(m => targetSet.has(m.id) ? { ...m, pinned: true, isPinned: true } : m));
            toastMsg = `${count} conversation${count > 1 ? 's' : ''} pinned to top`;
            reverseAction = 'UNPIN';
        } else if (action === 'UNPIN') {
            setEmails(prev => prev.map(m => targetSet.has(m.id) ? { ...m, pinned: false, isPinned: false } : m));
            toastMsg = `${count} conversation${count > 1 ? 's' : ''} unpinned`;
            reverseAction = 'PIN';
        } else if (action === 'FLAG') {
            setEmails(prev => prev.map(m => targetSet.has(m.id) ? { ...m, flagged: true, isFlagged: true } : m));
            toastMsg = `${count} conversation${count > 1 ? 's' : ''} flagged for follow up`;
            reverseAction = 'UNFLAG';
        } else if (action === 'UNFLAG') {
            setEmails(prev => prev.map(m => targetSet.has(m.id) ? { ...m, flagged: false, isFlagged: false } : m));
            toastMsg = `${count} conversation${count > 1 ? 's' : ''} flag removed`;
            reverseAction = 'FLAG';
        } else if (action === 'CATEGORIZE') {
            const color = payload?.categoryColor;
            if (!color || color === 'clear') {
                setEmails(prev => prev.map(m => targetSet.has(m.id) ? { ...m, categories: [] } : m));
                toastMsg = 'Categories cleared';
            } else {
                setEmails(prev => prev.map(m => {
                    if (!targetSet.has(m.id)) return m;
                    const existing = Array.isArray(m.categories) ? m.categories : (m.categories ? [m.categories] : []);
                    const exists = existing.includes(color);
                    const updated = exists ? existing.filter(c => c !== color) : [...existing, color];
                    return { ...m, categories: updated };
                }));
                toastMsg = `Categorized as ${color}`;
            }
        } else if (action === 'SNOOZE') {
            const until = payload?.snoozeUntil;
            setEmails(prev => prev.map(m => targetSet.has(m.id) ? { ...m, folder: 'snooze', snoozedUntil: until } : m));
            if (selectedEmail && targetSet.has(selectedEmail.id)) setSelectedEmail(null);
            toastMsg = `${count} conversation${count > 1 ? 's' : ''} snoozed`;
            reverseAction = 'UNSNOOZE';
        } else if (action === 'UNSNOOZE') {
            setEmails(prev => prev.map(m => targetSet.has(m.id) ? { ...m, folder: 'inbox', snoozedUntil: null } : m));
            toastMsg = `${count} conversation${count > 1 ? 's' : ''} restored to Inbox`;
        } else if (action === 'REPORT') {
            setEmails(prev => prev.map(m => targetSet.has(m.id) ? { ...m, folder: 'junk' } : m));
            if (selectedEmail && targetSet.has(selectedEmail.id)) setSelectedEmail(null);
            toastMsg = `${count} conversation${count > 1 ? 's' : ''} reported as ${payload?.reportType || 'junk'} and moved to Junk Email`;
        } else if (action === 'BLOCK') {
            setEmails(prev => prev.map(m => targetSet.has(m.id) ? { ...m, folder: 'junk' } : m));
            if (selectedEmail && targetSet.has(selectedEmail.id)) setSelectedEmail(null);
            toastMsg = `Sender(s) blocked and ${count} conversation${count > 1 ? 's' : ''} moved to Junk Email`;
        } else if (action === 'IGNORE') {
            setEmails(prev => prev.map(m => targetSet.has(m.id) ? { ...m, isIgnored: true, folder: 'deleted' } : m));
            if (selectedEmail && targetSet.has(selectedEmail.id)) setSelectedEmail(null);
            toastMsg = `Conversation thread ignored and moved to Deleted Items`;
            reverseAction = 'RESTORE';
        }

        // Clear selection and close popups
        setSelectedEmailIds(new Set());
        setIsSelectionMode(false);
        setContextMenu(null);
        setToolbarMenu(null);

        // Toast with Undo callback
        if (reverseAction) {
            setUndoToast({
                message: toastMsg,
                onUndo: async () => {
                    setEmails(previousEmails);
                    setUndoToast(null);
                    try {
                        const userStr = localStorage.getItem("currentUser");
                        const token = localStorage.getItem("token");
                        const headers = { "Content-Type": "application/json" };
                        if (token) headers["Authorization"] = `Bearer ${token}`;
                        if (userStr) {
                            const parsed = JSON.parse(userStr);
                            headers["X-User-Id"] = parsed.id;
                            headers["X-Org-Id"] = parsed.organization_id || '1';
                        }
                        await fetch('/api/email/bulk-action', {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({ emailIds: targetIds, action: reverseAction, payload: reversePayload })
                        });
                    } catch (e) {
                        console.error('Failed to execute undo on backend:', e);
                    }
                }
            });
        } else {
            setUndoToast({ message: toastMsg });
        }

        // Execute on Backend API
        try {
            const userStr = localStorage.getItem("currentUser");
            const token = localStorage.getItem("token");
            const headers = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            if (userStr) {
                const parsed = JSON.parse(userStr);
                headers["X-User-Id"] = parsed.id;
                headers["X-Org-Id"] = parsed.organization_id || '1';
            }
            await fetch('/api/email/bulk-action', {
                method: 'POST',
                headers,
                body: JSON.stringify({ emailIds: targetIds, action, payload })
            });
        } catch (e) {
            console.error('Backend bulk-action error:', e);
        }
    };

    // Right-Click Context Menu Trigger
    const handleRowContextMenu = (e, email) => {
        e.preventDefault();
        e.stopPropagation();
        let targetIds = [];
        if (selectedEmailIds.has(email.id)) {
            targetIds = Array.from(selectedEmailIds);
        } else {
            setSelectedEmailIds(new Set([email.id]));
            setIsSelectionMode(true);
            setSelectedEmail(email);
            targetIds = [email.id];
        }
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            emailIds: targetIds
        });
    };

    // Top Toolbar '... More' Button Trigger
    const handleMoreToolbarClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (contextMenu) {
            setContextMenu(null);
            return;
        }
        const rect = moreMenuBtnRef.current?.getBoundingClientRect();
        const x = rect ? rect.left : e.clientX;
        const y = rect ? rect.bottom + 4 : e.clientY;
        const targetIds = selectedEmailIds.size > 0 
            ? Array.from(selectedEmailIds) 
            : (selectedEmail ? [selectedEmail.id] : (filteredEmails.length > 0 ? [filteredEmails[0].id] : []));

        if (targetIds.length === 0) return;
        setContextMenu({
            x: Math.round(x),
            y: Math.round(y),
            emailIds: targetIds
        });
    };

    const handleToggleRead = (id) => {
        const em = emails.find(e => e.id === id);
        handleBulkAction(em?.read ? 'MARK_UNREAD' : 'MARK_READ', null, [id]);
    };

    const handleDeleteEmail = (id) => {
        handleBulkAction('DELETE', null, [id]);
    };

    const handleArchiveEmail = (id) => {
        handleBulkAction('ARCHIVE', null, [id]);
    };

    const handleTogglePin = (id) => {
        const em = emails.find(e => e.id === id);
        const isPinned = Boolean(em?.pinned || em?.isPinned);
        handleBulkAction(isPinned ? 'UNPIN' : 'PIN', null, [id]);
    };

    const handleToggleFlag = (id) => {
        const em = emails.find(e => e.id === id);
        const isFlagged = Boolean(em?.flagged || em?.isFlagged);
        handleBulkAction(isFlagged ? 'UNFLAG' : 'FLAG', null, [id]);
    };

    const handleSnooze = (id, until) => {
        handleBulkAction('SNOOZE', { snoozeUntil: until }, [id]);
    };

    const handleUnsnooze = (id) => {
        handleBulkAction('UNSNOOZE', null, [id]);
    };

    const moveSelectedTo = (nextFolder) => {
        handleBulkAction('MOVE', { targetFolderId: nextFolder });
    };

    const handleBulkDelete = () => handleBulkAction('DELETE');
    const handleBulkArchive = () => handleBulkAction('ARCHIVE');
    const handleBulkReport = () => handleBulkAction('REPORT', { reportType: 'junk' });
    const handleBulkRestore = () => handleBulkAction('RESTORE');
    const handleBulkSweep = () => handleBulkAction('DELETE');

    const handleBulkMarkRead = () => {
        const selected = getSelectedEmails();
        const shouldMarkRead = selected.some(m => !m.read);
        handleBulkAction(shouldMarkRead ? 'MARK_READ' : 'MARK_UNREAD');
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
        if (user?.role === 'employee' && user?.permissions?.canSendEmails === false) {
            alert('Action blocked: Your admin has disabled this feature.');
            return;
        }
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
        if (user?.role === 'employee' && user?.permissions?.canSendEmails === false) {
            alert('Action blocked: Your admin has disabled this feature.');
            return;
        }
        setIsComposing(true);
        setSelectedEmail(null);
        if (currentProjectParam && activeProject) {
            setComposeTo(activeProject.projectEmailId || `${(activeProject.projectName || currentProjectParam).toLowerCase().replace(/\s+/g, '-')}@safemailz.com`);
            setComposeProjectId(activeProject.projectId || activeProject.id || currentProjectParam);
            setComposeSubject(`[${activeProject.projectName || currentProjectParam}] `);
        } else {
            setComposeTo('');
            setComposeProjectId(null);
            setComposeSubject('');
        }
        setComposeBody(getDefaultSignatureText('new'));
        setComposeBcc('');
        applyAutoCcToComposer('');
    };



    const [isExpanded, setIsExpanded] = useState(false);

    const handleReply = (email) => {
        if (user?.role === 'employee' && user?.permissions?.canReplyToEmails === false) {
            alert('Action blocked: Your admin has disabled this feature.');
            return;
        }
        setIsComposing(true);
        setComposeTo(email.senderEmail || `${email.sender.toLowerCase().replace(/\s+/g, '')}@safemailz.com`);
        setComposeSubject(`Re: ${email.subject}`);
        setComposeBody(`\n\n--- Original Message from ${email.sender} ---\n${email.preview || email.body || ''}${getDefaultSignatureText('reply')}`);
        setComposeBcc('');
        applyAutoCcToComposer('');
    };

    const handleReplyAll = (email) => {
        if (user?.role === 'employee' && user?.permissions?.canReplyToEmails === false) {
            alert('Action blocked: Your admin has disabled this feature.');
            return;
        }
        setIsComposing(true);
        setComposeTo(email.senderEmail || `${email.sender.toLowerCase().replace(/\s+/g, '')}@safemailz.com`);
        setComposeSubject(`Re: ${email.subject}`);
        setComposeBody(`\n\n--- Original Message from ${email.sender} ---\n${email.preview || email.body || ''}${getDefaultSignatureText('reply')}`);
        setComposeBcc('');
        applyAutoCcToComposer(email.cc || '');
    };

    const handleForward = (email) => {
        setIsComposing(true);
        setComposeTo('');
        setComposeSubject(`Fwd: ${email.subject}`);
        setComposeBody(`\n\n--- Forwarded Message from ${email.sender} ---\n${email.preview || email.body || ''}${getDefaultSignatureText('forward')}`);
        setComposeBcc('');
        applyAutoCcToComposer('');
    };

    // Send Email
    const handleSendEmail = async () => {
        if(isSending || isReadingAttachments)return;
        if (!composeTo.trim()) {
            alert('Please specify at least one recipient in To field.');
            return;
        }

        // Accessibility preference check: Ask before sending emails with empty subject line
        try {
            const generalSettings = (typeof window !== 'undefined' && typeof window.__SAFEMAILZ_GET_GENERAL_SETTINGS__ === 'function')
                ? window.__SAFEMAILZ_GET_GENERAL_SETTINGS__()
                : null;
            const askEmpty = generalSettings?.accessibility?.askEmptySubject !== false;
            if (askEmpty && !composeSubject.trim()) {
                const proceed = window.confirm("Send this message without a subject?");
                if (!proceed) {
                    return;
                }
            }
        } catch (e) {}

        setIsSending(true);

        const plainPreview = (composeBody || '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const newSentMail = {
            id: `m-${Date.now()}`,
            sender: user?.admin_name || 'Rahul Singh',
            senderEmail: user?.email || 'singhrahuldrill1@outlook.com',
            subject: composeSubject.trim() || '(No Subject)',
            preview: plainPreview || 'No text in email body.',
            body: composeBody,
            folder: 'sent',
            read: true,
            replied: false,
            action: false,
            importance: composeImportance,
            emailNo: `${Math.floor(10000 + Math.random() * 90000)}`,
            date: new Date().toISOString()
        };

        const reqHeaders = { 'Content-Type': 'application/json' };
        let sendUser = user;
        try {
            const lsUser = JSON.parse(localStorage.getItem('currentUser'));
            if (lsUser) sendUser = lsUser;
        } catch (e) { }

        if (sendUser) {
            reqHeaders['X-User-Id'] = String(sendUser.id || '');
            reqHeaders['X-Org-Id'] = String(sendUser.organization_id || '1');
            reqHeaders['X-Active-Email'] = String(sendUser.email || '');
        }

        try {
            const res = await fetch('/api/emails/send', {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify({
                    to: composeTo,
                    cc: composeCc,
                    bcc: composeBcc,
                    subject: composeSubject,
                    body: composeBody,
                    importance: composeImportance,
                    attachments: composerAttachments.map(a=>({filename:a.name,contentType:a.contentType,content:a.content})),
                    projectId: composeProjectId || currentProjectParam || undefined
                })
            });

            if (!res.ok) {
                let errorMsg = 'Failed to send email.';
                try {
                    const data = await res.json();
                    if (data && data.error) {
                        errorMsg = data.error;
                    }
                } catch (e) {
                    // ignore json parse error
                }
                alert(errorMsg);
                setIsSending(false);
                return;
            }
        } catch (err) {
            console.error('Error sending email:', err);
            alert('An error occurred while sending the email.');
            setIsSending(false);
            return;
        }

        setEmails(prev => [newSentMail, ...prev]);
        setIsSending(false);
        setComposerAttachments([]);
        setComposeImportance('normal');
        if (folder === 'support') {
            setIsComposing(true);
            setComposeTo('Support@safemailz.com');
            setComposeSubject('');
            setComposeBody(getDefaultSignatureText('new'));
            applyAutoCcToComposer('');
        } else {
            setIsComposing(false);
            setComposeTo('');
            setComposeCc('');
            setComposeBcc('');
            setComposeSubject('');
            setComposeBody('');
            setShowCc(false);
            setShowBcc(false);
        }
        alert('✅ Email sent successfully!');
    };

    const showComposerToast = (msg) => {
        setComposerToast(msg);
        setTimeout(() => {
            setComposerToast(prev => (prev === msg ? null : prev));
        }, 2600);
    };

    const syncEditorToState = () => {
        if (composerEditorRef.current) {
            const html = composerEditorRef.current.innerHTML;
            lastSyncedBodyRef.current = html;
            setComposeBody(html);
        }
    };

    // Format doc command
    const formatDoc = (cmd, val = null) => {
        if (composerEditorRef.current) {
            restoreComposerSelection();
            document.execCommand(cmd, false, val);
            syncEditorToState();
        }
        setOpenDropdown(null);
    };

    const changeFont = (fontName, displayName) => {
        setCurrentFont(displayName || fontName);
        formatDoc('fontName', fontName);
    };

    const changeFontSizePt = (pt) => {
        setCurrentFontSize(pt);
        restoreComposerSelection();
        document.execCommand('fontSize',false,'7');
        composerEditorRef.current?.querySelectorAll('font[size="7"]').forEach(node=>{node.removeAttribute('size');node.style.fontSize=`${pt}pt`;});
        syncEditorToState();setOpenDropdown(null);
    };

    const changeLineSpacing = (spacing) => {
        setCurrentLineSpacing(spacing);
        if (composerEditorRef.current) {
            restoreComposerSelection();
            const editor=composerEditorRef.current,selection=window.getSelection();
            let node=selection?.anchorNode?.nodeType===3?selection.anchorNode.parentElement:selection?.anchorNode;
            while(node && node!==editor && !/^(P|DIV|LI|BLOCKQUOTE|TD)$/.test(node.tagName))node=node.parentElement;
            if(!node || node===editor){document.execCommand('formatBlock',false,'div');node=window.getSelection()?.anchorNode;node=node?.nodeType===3?node.parentElement:node;}
            if(node && node!==editor && editor.contains(node))node.style.lineHeight=spacing;
            syncEditorToState();
        }
        setOpenDropdown(null);
    };

    const handlePaste = async () => {
        if (composerEditorRef.current) {
            restoreComposerSelection();
        }
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                const text = await navigator.clipboard.readText();
                if (text) {
                    document.execCommand('insertText', false, text);
                    syncEditorToState();
                    return;
                }
            }
        } catch (err) {
            // Fallback to execCommand
        }
        showComposerToast('Clipboard access unavailable. Press Ctrl+V (Mac: Cmd+V) in the message to paste.');
    };

    const handleFormatPainter = () => {
        if (!composerEditorRef.current) return;
        const sel = window.getSelection();
        if (!isFormatPainterActive) {
            let anchorEl = sel && sel.anchorNode ? (sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode) : composerEditorRef.current;
            if (anchorEl && composerEditorRef.current.contains(anchorEl)) {
                const cs = window.getComputedStyle(anchorEl);
                copiedStylesRef.current = {
                    fontWeight: cs.fontWeight,
                    fontStyle: cs.fontStyle,
                    textDecorationLine: cs.textDecorationLine,
                    color: cs.color,
                    backgroundColor: cs.backgroundColor,
                    fontFamily: cs.fontFamily,
                    fontSize: cs.fontSize
                };
                setIsFormatPainterActive(true);
                showComposerToast('Format copied — select text to apply');
            }
        } else {
            setIsFormatPainterActive(false);
            copiedStylesRef.current = null;
        }
    };

    const applyCopiedFormatIfActive = () => {
        if (!isFormatPainterActive || !copiedStylesRef.current) return;
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return;
        const selectedText = sel.toString();
        if (!selectedText) return;
        const st = copiedStylesRef.current;
        const spanHtml = `<span style="font-weight:${st.fontWeight};font-style:${st.fontStyle};text-decoration:${st.textDecorationLine};color:${st.color};background-color:${st.backgroundColor};font-family:${st.fontFamily};font-size:${st.fontSize};">${escapeComposerText(selectedText)}</span>`;
        document.execCommand('insertHTML', false, spanHtml);
        syncEditorToState();
        setIsFormatPainterActive(false);
        copiedStylesRef.current = null;
    };

    const handleChangeCase = () => {
        if (!composerEditorRef.current) return;
        restoreComposerSelection();
        const sel = window.getSelection();
        const selectedText = sel && !sel.isCollapsed ? sel.toString() : '';
        caseModeRef.current = (caseModeRef.current + 1) % 3;
        const transformText = (txt) => {
            if (caseModeRef.current === 1) return txt.toUpperCase();
            if (caseModeRef.current === 2) return txt.toLowerCase();
            return txt.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
        };
        if (selectedText) {
            document.execCommand('insertText', false, transformText(selectedText));
            syncEditorToState();
        } else {
            showComposerToast('Select the text you want to change case.');
        }
    };

    const insertEmoji = (emoji) => {
        if (composerEditorRef.current) {
            restoreComposerSelection();
            document.execCommand('insertText', false, emoji);
            syncEditorToState();
        } else {
            setComposeBody(prev => prev + emoji);
        }
        setOpenDropdown(null);
    };

    const handleInsertLink = () => {
        const url=window.prompt('Enter a web or email link:', 'https://');
        if(!url)return;
        const clean=url.trim();
        if(!/^(https?:\/\/|mailto:)/i.test(clean) || clean==='https://'){showComposerToast('Enter a valid https://, http:// or mailto: link.');return;}
        restoreComposerSelection();
        if(window.getSelection()?.toString())document.execCommand('createLink',false,clean);
        else {const link=document.createElement('a');link.href=clean;link.textContent=clean;link.target='_blank';link.rel='noopener noreferrer';document.execCommand('insertHTML',false,link.outerHTML);}
        syncEditorToState();setOpenDropdown(null);
    };

    const handleInsertTable = () => {
        const tableHtml = '<table style="border-collapse:collapse;width:100%;margin:8px 0;border:1px solid rgba(148,163,184,0.35);"><tbody><tr><td style="padding:8px 10px;border:1px solid rgba(148,163,184,0.35);">Header 1</td><td style="padding:8px 10px;border:1px solid rgba(148,163,184,0.35);">Header 2</td></tr><tr><td style="padding:8px 10px;border:1px solid rgba(148,163,184,0.35);">Cell 1</td><td style="padding:8px 10px;border:1px solid rgba(148,163,184,0.35);">Cell 2</td></tr></tbody></table><p><br></p>';
        if (composerEditorRef.current) {
            restoreComposerSelection();
            document.execCommand('insertHTML', false, tableHtml);
            syncEditorToState();
        }
        setOpenDropdown(null);
    };

    const handlePictureUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if(!/^image\/(png|jpeg|gif|webp)$/.test(file.type) || file.size>2*1024*1024){showComposerToast('Choose a PNG, JPEG, GIF or WebP image under 2 MB.');e.target.value='';return;}
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (composerEditorRef.current) {
                    restoreComposerSelection();
                    document.execCommand('insertHTML', false, `<img src="${ev.target.result}" alt="${escapeComposerText(file.name)}" style="max-width:100%;height:auto;border-radius:6px;margin:6px 0;" />`);
                    syncEditorToState();
                }
            };
            reader.readAsDataURL(file);
        }
        if (e.target) e.target.value = '';
    };

    const handleFileAttach = async (e) => {
        const files=Array.from(e.target.files || []);e.target.value='';
        if(!files.length || attachmentReadLock.current)return;
        if(files.length+composerAttachments.length>10 || files.some(f=>!f.size || f.size>2*1024*1024) || files.reduce((n,f)=>n+f.size,0)+composerAttachments.reduce((n,f)=>n+(f.bytes||0),0)>6*1024*1024){showComposerToast('Attach up to 10 files: 2 MB each, 6 MB total. Empty files are not supported.');return;}
        attachmentReadLock.current=true;setIsReadingAttachments(true);
        try {
            const added=await Promise.all(files.map(file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Could not read attachment.'));reader.onload=()=>resolve({id:crypto.randomUUID(),name:file.name,bytes:file.size,size:`${Math.max(1,Math.round(file.size/1024))} KB`,contentType:file.type||'application/octet-stream',content:String(reader.result).split(',')[1]});reader.readAsDataURL(file);})));setComposerAttachments(prev=>[...prev,...added]);showComposerToast(`${added.length} file(s) attached`);
        }catch(err){showComposerToast(err.message);}finally{attachmentReadLock.current=false;setIsReadingAttachments(false);}
    };

    const handleRemoveAttachment = (attId) => {
        setComposerAttachments(prev => prev.filter(a => a.id !== attId));
    };

    const handleDictationToggle = () => {
        const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
        if (!SpeechRecognition) {
            showComposerToast('Voice dictation is not supported in this browser');
            return;
        }
        if (isDictating && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsDictating(false);
            showComposerToast('Voice dictation stopped');
            return;
        }
        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            recognition.onresult = (event) => {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        transcript += event.results[i][0].transcript + ' ';
                    }
                }
                if (transcript && composerEditorRef.current) {
                    restoreComposerSelection();
                    document.execCommand('insertText', false, transcript);
                    syncEditorToState();
                }
            };
            recognition.onerror = event => {setIsDictating(false);showComposerToast(event.error==='not-allowed'?'Microphone permission was denied. Enable it in browser settings.':'Dictation stopped. Check microphone access and connection.');};
            recognition.onend = () => setIsDictating(false);
            recognitionRef.current = recognition;
            recognition.start();
            setIsDictating(true);
            showComposerToast('Listening... Speak now');
        } catch (err) {
            setIsDictating(false);
            showComposerToast('Unable to start microphone');
        }
    };

    const handleProofingCheck = () => {
        const nextSpell = !isSpellcheckEnabled;
        setIsSpellcheckEnabled(nextSpell);
        const text = composerEditorRef.current ? (composerEditorRef.current.innerText || '').trim() : '';
        const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
        const chars = text.length;
        showComposerToast(`Editor Proofing: ${words} words, ${chars} chars • Spellcheck ${nextSpell ? 'ON' : 'OFF'}`);
    };

    const handleInsertAddinTemplate = (templateType) => {
        const templates = {
            support_issue: `<p><strong>Issue Summary:</strong> </p><p><strong>Steps to Reproduce:</strong></p><ol><li></li><li></li></ol><p><strong>Expected Outcome:</strong> </p>`,
            account_help: `<p>Hello Support Team,</p><p>I need assistance regarding my Safemailz account settings and permissions.</p><p><strong>Account Email:</strong> ${escapeComposerText(user?.email)}</p><p>Thank you,<br>${escapeComposerText(user?.admin_name || 'User')}</p>`,
            followup: `<p>Hi,</p><p>Following up on my previous message regarding this thread. Please let me know if any additional details are needed.</p><p>Best regards,<br>${escapeComposerText(user?.admin_name || 'User')}</p>`,
            meeting: `<p>Hi,</p><p>Would you be available for a quick sync call to review the current project milestones?</p><p>Best regards,<br>${escapeComposerText(user?.admin_name || 'User')}</p>`
        };
        const html = templates[templateType];
        if (html && composerEditorRef.current) {
            restoreComposerSelection();
            document.execCommand('insertHTML', false, html);
            syncEditorToState();
        }
        setOpenDropdown(null);
    };

    const handlePrintDraft = () => {
        const printWin = window.open('', '_blank', 'width=800,height=650');
        if (!printWin) {showComposerToast('Allow pop-ups to print this draft.');return;}
        const contentHtml = composerEditorRef.current ? composerEditorRef.current.innerHTML : composeBody;
        printWin.document.write(`<!DOCTYPE html><html><head><title>${escapeComposerText(composeSubject || 'Email Draft')}</title><style>body{font-family:system-ui,-apple-system,sans-serif;padding:32px;color:#0f172a;line-height:1.6}.meta{border-bottom:1px solid #cbd5e1;padding-bottom:12px;margin-bottom:20px;font-size:13px;color:#475569}.meta div{margin-bottom:4px}</style></head><body><div class="meta"><div><strong>From:</strong> ${escapeComposerText(user?.email)}</div><div><strong>To:</strong> ${escapeComposerText(composeTo)}</div>${composeCc ? `<div><strong>Cc:</strong> ${escapeComposerText(composeCc)}</div>` : ''}<div><strong>Subject:</strong> ${escapeComposerText(composeSubject || '(No Subject)')}</div></div><div>${contentHtml || ''}</div></body></html>`);
        printWin.document.close();
        printWin.focus();
        printWin.print();
    };

    const composerHighlightColors = [
        '#fef08a', '#bbf7d0', '#bae6fd', '#f5d0fe', '#fecaca', '#fed7aa', '#e9d5ff', '#cbd5e1',
        '#facc15', '#4ade80', '#38bdf8', '#e879f9', '#f87171', '#fb923c', '#c084fc', 'transparent'
    ];

    const composerTextColors = [
        '#f8fafc', '#cbd5e1', '#94a3b8', '#64748b', '#334155', '#0f172a', '#ef4444', '#f97316',
        '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#38bdf8', '#3b82f6', '#6366f1',
        '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#fca5a5', '#fdba74', '#fde047'
    ];

    const getSenderInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
    };

    const getUnknownClientIdentifier = (identifier) => {
        const key = String(identifier || 'unknown').toLowerCase().trim();
        const storageKey = `safemailz_unknown_client_${key}`;
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored && /^unknown client - \d{5}$/.test(stored)) {
                return stored;
            }
        } catch { }

        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = (hash * 31 + key.charCodeAt(i)) % 90000;
        }
        const code = 10000 + Math.abs(hash);
        const result = `unknown client - ${code}`;
        try {
            localStorage.setItem(storageKey, result);
        } catch { }
        return result;
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

    if (folder === 'snooze') {
        return (
            <div className="mail-list-panel" id="mailListPanel" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }}>
                <SnoozeControlCenter />
            </div>
        );
    }

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
                            className={`mail-toolbar-btn ${contextMenu ? 'is-active' : ''}`}
                            type="button"
                            title="More actions"
                            ref={moreMenuBtnRef}
                            aria-haspopup="true"
                            aria-expanded={Boolean(contextMenu)}
                            onClick={handleMoreToolbarClick}
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
                    <div className="email-composer-toolbar expanded-ribbon" id="formatToolbar" aria-label="Message formatting" onMouseDownCapture={e=>{if(e.target.closest('button'))e.preventDefault();}} style={{ display: "flex" }}>
                        <input
                            type="file"
                            id="editorPictureInput"
                            ref={composerPictureInputRef}
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={handlePictureUpload}
                        />
                        <input
                            type="file"
                            id="composerAttachmentInput"
                            ref={composerAttachInputRef}
                            multiple
                            style={{ display: "none" }}
                            onChange={handleFileAttach}
                        />

                        {/* Group 1: Clipboard */}
                        <div className="ribbon-group">
                            <div className="ribbon-group-content">
                                <button className="email-composer-toolbar-btn stacked-btn" type="button"
                                    onClick={handlePaste} title="Paste">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <path
                                            d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />

                                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                    </svg>
                                    <span className="stacked-btn-text">Paste</span>
                                </button>
                                <div className="ribbon-vertical-pair" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <button className="email-composer-toolbar-btn" type="button"
                                        onClick={() => { formatDoc('undo') }} title="Undo">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 7v6h6" />
                                            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                                        </svg>
                                    </button>
                                    <button className={`email-composer-toolbar-btn ${isFormatPainterActive ? 'active' : ''}`} type="button"
                                        onClick={handleFormatPainter} title="Format Painter">
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
                                        style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                        <div style={{ position: 'relative' }}>
                                            <button className="email-composer-toolbar-btn dropdown-select-btn"
                                                type="button" id="editorFontBtn"
                                                onClick={() => setOpenDropdown(openDropdown === 'font' ? null : 'font')}
                                                title="Font Family"
                                                style={{ width: '92px', height: '22px', padding: '0 6px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span id="currentFontName"
                                                    style={{ fontSize: '11px', fontWeight: '500', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentFont}</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9"
                                                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                    strokeWidth="2.5" strokeLinecap="round"
                                                    strokeLinejoin="round" style={{ color: '#64748b', flexShrink: 0 }}>
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </button>
                                            <div className={`email-composer-dropdown-menu ${openDropdown === 'font' ? 'active' : ''}`} id="editorFontMenu"
                                                style={{ width: '150px', display: openDropdown === 'font' ? 'flex' : 'none' }}>
                                                <button className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { changeFont('Aptos', 'Aptos') }}
                                                    style={{ fontFamily: "Aptos, sans-serif" }}>Aptos</button>
                                                <button className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { changeFont('Inter', 'Inter') }}
                                                    style={{ fontFamily: "Inter, sans-serif" }}>Inter</button>
                                                <button className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { changeFont('Arial', 'Arial') }}
                                                    style={{ fontFamily: "Arial, sans-serif" }}>Arial</button>
                                                <button className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { changeFont('Calibri', 'Calibri') }}
                                                    style={{ fontFamily: "Calibri, sans-serif" }}>Calibri</button>
                                                <button className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { changeFont('Segoe UI', 'Segoe UI') }}
                                                    style={{ fontFamily: "Segoe UI, sans-serif" }}>Segoe UI</button>
                                                <button className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { changeFont('Times New Roman', 'Times New Roman') }}
                                                    style={{ fontFamily: "Times New Roman, serif" }}>Times New Roman</button>
                                            </div>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <button className="email-composer-toolbar-btn dropdown-select-btn"
                                                type="button" id="editorFontSizeBtn"
                                                onClick={() => setOpenDropdown(openDropdown === 'fontSize' ? null : 'fontSize')}
                                                title="Font Size"
                                                style={{ width: '46px', height: '22px', padding: '0 6px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span id="currentFontSize"
                                                    style={{ fontSize: '11px', fontWeight: '500', color: '#1e293b' }}>{currentFontSize}</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9"
                                                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                    strokeWidth="2.5" strokeLinecap="round"
                                                    strokeLinejoin="round" style={{ color: '#64748b', flexShrink: 0 }}>
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </button>
                                            <div className={`email-composer-dropdown-menu ${openDropdown === 'fontSize' ? 'active' : ''}`} id="editorFontSizeMenu"
                                                style={{ width: '68px', minWidth: '68px', display: openDropdown === 'fontSize' ? 'flex' : 'none' }}>
                                                {['10', '11', '12', '14', '16', '18', '24'].map(sz => (
                                                    <button key={sz} className="email-composer-dropdown-item" type="button"
                                                        onClick={() => { changeFontSizePt(sz) }}>{sz}</button>
                                                ))}
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

                                        <div className="ribbon-subgroup-divider" style={{ height: '12px', width: '1px', background: '#cbd5e1', margin: '0 2px' }}>
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
                                                onClick={handleChangeCase} title="Change Case (UPPER / lower / Title)"
                                                style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span
                                                    style={{ fontWeight: '600', fontSize: '11px', color: '#475569' }}>Aa</span>
                                            </button>
                                        </div>

                                        <div className="ribbon-subgroup-divider" style={{ height: '12px', width: '1px', background: '#cbd5e1', margin: '0 2px' }}>
                                        </div>

                                        {/* Sub-group 3: Color Pickers */}
                                        <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                                            <div style={{ position: 'relative' }}>
                                                <button className="email-composer-toolbar-btn color-dropdown-btn"
                                                    type="button" id="editorHighlightColorBtn"
                                                    onClick={() => setOpenDropdown(openDropdown === 'highlight' ? null : 'highlight')}
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
                                                        style={{ backgroundColor: highlightColor === 'transparent' ? '#facc15' : highlightColor, position: 'absolute', bottom: '2px', left: '3px', right: '3px', height: '3px', borderRadius: '1px' }}></span>
                                                </button>
                                                <div className={`email-composer-color-palette ${openDropdown === 'highlight' ? 'active' : ''}`} id="editorHighlightColorMenu"
                                                    style={{ display: openDropdown === 'highlight' ? 'flex' : 'none' }}>
                                                    <div className="email-composer-color-grid-title">Highlight Color</div>
                                                    <div className="email-composer-color-grid" id="highlightColorGrid2">
                                                        {composerHighlightColors.map((c, idx) => (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                className="email-composer-color-box"
                                                                title={c === 'transparent' ? 'No Highlight' : c}
                                                                style={{ backgroundColor: c === 'transparent' ? 'transparent' : c, position: 'relative' }}
                                                                onClick={() => {
                                                                    setHighlightColor(c);
                                                                    formatDoc('hiliteColor', c);
                                                                }}
                                                            >
                                                                {c === 'transparent' && <span style={{ fontSize: '10px', color: '#ef4444', lineHeight: 1 }}>✕</span>}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                <button className="email-composer-toolbar-btn color-dropdown-btn"
                                                    type="button" id="editorTextColorBtn"
                                                    onClick={() => setOpenDropdown(openDropdown === 'textColor' ? null : 'textColor')}
                                                    title="Font Color"
                                                    style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                        viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M4 20l8-16 8 16M6 16h12M12 4v16" />
                                                    </svg>
                                                    <span className="color-underline-indicator text-indicator"
                                                        style={{ backgroundColor: textColor, position: 'absolute', bottom: '2px', left: '3px', right: '3px', height: '3px', borderRadius: '1px' }}></span>
                                                </button>
                                                <div className={`email-composer-color-palette ${openDropdown === 'textColor' ? 'active' : ''}`} id="editorTextColorMenu"
                                                    style={{ display: openDropdown === 'textColor' ? 'flex' : 'none' }}>
                                                    <div className="email-composer-color-grid-title">Text Color</div>
                                                    <div className="email-composer-color-grid" id="textColorGrid2">
                                                        {composerTextColors.map((c, idx) => (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                className="email-composer-color-box"
                                                                title={c}
                                                                style={{ backgroundColor: c }}
                                                                onClick={() => {
                                                                    setTextColor(c);
                                                                    formatDoc('foreColor', c);
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
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
                                            <button className="email-composer-toolbar-btn line-spacing-trigger-btn"
                                                type="button" id="editorLineSpacingBtn"
                                                data-ribbon-dropdown-trigger="lineSpacing"
                                                onClick={() => setOpenDropdown(openDropdown === 'lineSpacing' ? null : 'lineSpacing')}
                                                title={`Line Spacing (${currentLineSpacing})`} style={{ padding: '1px 3px' }}>
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
                                            <div className={`email-composer-dropdown-menu ${openDropdown === 'lineSpacing' ? 'active' : ''}`} id="editorLineSpacingMenu"
                                                style={{ width: '90px', minWidth: '90px', display: openDropdown === 'lineSpacing' ? 'flex' : 'none' }}>
                                                {['1.0', '1.15', '1.5', '2.0'].map(sp => (
                                                    <button key={sp} className="email-composer-dropdown-item" type="button"
                                                        onClick={() => { changeLineSpacing(sp) }}>
                                                        {sp} {currentLineSpacing === sp ? '✓' : ''}
                                                    </button>
                                                ))}
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
                                    onClick={() => composerAttachInputRef.current?.click()} title="Attach File">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <path
                                            d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />

                                    </svg>
                                    <span className="stacked-btn-text">Attach</span>
                                </button>
                                <div className="ribbon-vertical-pair" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <button className="email-composer-toolbar-btn" type="button" onClick={handleInsertLink}
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
                                                    if (composerEditorRef.current) {
                                                        restoreComposerSelection();
                                                        document.execCommand('insertHTML', false, sig.replace(/\n/g, '<br>'));
                                                        syncEditorToState();
                                                    } else {
                                                        setComposeBody(prev => prev + sig);
                                                    }
                                                } else {
                                                    showComposerToast('No default signature configured in Settings > Signatures');
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
                                <div className="ribbon-vertical-pair" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <button className="email-composer-toolbar-btn" type="button"
                                        onClick={() => composerPictureInputRef.current?.click()} title="Pictures">
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
                                            data-ribbon-dropdown-trigger="emoji"
                                            onClick={() => setOpenDropdown(openDropdown === 'emoji' ? null : 'emoji')} title="Emoji">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10" />
                                                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                                                <line x1="9" y1="9" x2="9.01" y2="9" />
                                                <line x1="15" y1="9" x2="15.01" y2="9" />
                                            </svg>
                                        </button>
                                        <div className={`email-composer-dropdown-menu ${openDropdown === 'emoji' ? 'active' : ''}`} id="editorEmojiMenu"
                                            style={{ width: '164px', padding: '6px', display: openDropdown === 'emoji' ? 'flex' : 'none', flexDirection: 'row', flexWrap: 'wrap', gap: '3px' }}>
                                            {['😊', '👍', '❤️', '🎉', '🙏', '🚀', '💡', '🔥', '✅', '⭐'].map((em, idx) => (
                                                <button key={idx} className="email-composer-dropdown-item" type="button"
                                                    onClick={() => { insertEmoji(em) }}
                                                    style={{ fontSize: '15px', padding: '3px', textAlign: 'center', minWidth: '28px', width: 'auto' }}>{em}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button className="email-composer-toolbar-btn stacked-btn" type="button"
                                    onClick={handleInsertTable} title="Table">
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
                                <button className={`email-composer-toolbar-btn stacked-btn ${isDictating ? 'active' : ''}`} type="button"
                                    id="editorDictationBtn" onClick={handleDictationToggle}
                                    aria-pressed={isDictating} title="Dictation (Voice Typing)">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                        <line x1="12" y1="19" x2="12" y2="22" />
                                    </svg>
                                    <span className="stacked-btn-text">{isDictating ? 'Listening' : 'Dictate'}</span>
                                </button>
                            </div>
                            <span className="ribbon-group-label">Voice</span>
                        </div>

                        {/* Group 6: Proofing */}
                        <div className="ribbon-group">
                            <div className="ribbon-group-content">
                                <button className={`email-composer-toolbar-btn stacked-btn ${isSpellcheckEnabled ? 'active' : ''}`} type="button"
                                    aria-pressed={isSpellcheckEnabled} onClick={handleProofingCheck} title="Editor / Spell Check">
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
                            <div className="ribbon-group-content" style={{ position: 'relative' }}>
                                <button className={`email-composer-toolbar-btn stacked-btn ${openDropdown === 'addins' ? 'active' : ''}`} type="button"
                                    data-ribbon-dropdown-trigger="addins"
                                    onClick={() => setOpenDropdown(openDropdown === 'addins' ? null : 'addins')} title="Quick Templates & Add-ins">
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
                                <div className={`email-composer-dropdown-menu ${openDropdown === 'addins' ? 'active' : ''}`} id="editorAddinsMenu"
                                    style={{ width: '185px', display: openDropdown === 'addins' ? 'flex' : 'none', right: 0, left: 'auto' }}>
                                    <button className="email-composer-dropdown-item" type="button"
                                        onClick={() => handleInsertAddinTemplate('support_issue')}>Support Issue Template</button>
                                    <button className="email-composer-dropdown-item" type="button"
                                        onClick={() => handleInsertAddinTemplate('account_help')}>Account Assistance</button>
                                    <button className="email-composer-dropdown-item" type="button"
                                        onClick={() => handleInsertAddinTemplate('followup')}>Quick Follow-up</button>
                                    <button className="email-composer-dropdown-item" type="button"
                                        onClick={() => handleInsertAddinTemplate('meeting')}>Meeting Request</button>
                                </div>
                            </div>
                            <span className="ribbon-group-label">Add-ins</span>
                        </div>

                        {/* Group 8: Tags */}
                        <div className="ribbon-group">
                            <div className="ribbon-group-content">
                                <div className="ribbon-vertical-pair" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <button className={`email-composer-toolbar-btn ${composeImportance === 'high' ? 'active' : ''}`} type="button" aria-pressed={composeImportance === 'high'} id="importanceHighBtn"
                                        onClick={() => {
                                            const next = composeImportance === 'high' ? 'normal' : 'high';
                                            setComposeImportance(next);
                                            showComposerToast(next === 'high' ? 'Marked as High Importance' : 'Importance set to Normal');
                                        }} title="High Importance"
                                        style={{ padding: '1px 3px' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                            strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ef4444' }}>
                                            <line x1="12" y1="4" x2="12" y2="15" />
                                            <line x1="12" y1="19" x2="12.01" y2="19" />
                                        </svg>
                                    </button>
                                    <button className={`email-composer-toolbar-btn ${composeImportance === 'low' ? 'active' : ''}`} type="button" aria-pressed={composeImportance === 'low'} id="importanceLowBtn"
                                        onClick={() => {
                                            const next = composeImportance === 'low' ? 'normal' : 'low';
                                            setComposeImportance(next);
                                            showComposerToast(next === 'low' ? 'Marked as Low Importance' : 'Importance set to Normal');
                                        }} title="Low Importance"
                                        style={{ padding: '1px 3px' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round" style={{ color: '#38bdf8' }}>
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
                                    onClick={handlePrintDraft} title="Print Draft">
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

            {/* Active Global Snooze / Pause Alert Banner */}
            <ActiveSnoozeBanner onResumeSuccess={() => {
                window.dispatchEvent(new CustomEvent('snoozeStatusChanged', { detail: { isInboxSnoozed: false } }));
            }} />

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
                            <span className="mail-list-count">{conversationThreads.length}</span>
                        </div>

                        {/* 4 Outlook Action Buttons */}
                        <div className="mail-list-outlook-actions">
                            <div className="jump-to-container mail-outlook-sort-wrap">
                                <button
                                    type="button"
                                    ref={jumpBtnRef}
                                    className={`mail-outlook-icon-btn ${isJumpToOpen || isDateFilterActive ? 'is-active' : ''}`}
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
                                    title={isDateFilterActive ? `Date filter active: ${appliedDatePreset || appliedCustomDate}` : "Filter by date"}
                                    aria-label="Filter by date"
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
                                                className={`jump-to-item ${appliedDatePreset === preset ? 'is-selected' : ''}`}
                                                role="menuitem"
                                                onClick={() => {
                                                    if (appliedDatePreset === preset) {
                                                        setAppliedDatePreset(null);
                                                    } else {
                                                        setAppliedDatePreset(preset);
                                                        setAppliedCustomDate(null);
                                                    }
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
                                                    value={customDateInput}
                                                    onChange={(e) => setCustomDateInput(e.target.value)}
                                                    style={{ border: 'none', outline: 'none', fontSize: '12px', width: '100%' }}
                                                />
                                            </div>
                                        </div>
                                        <div className="jump-to-go-row" style={{ padding: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            {isDateFilterActive ? (
                                                <button
                                                    type="button"
                                                    className="jump-to-clear-btn"
                                                    style={{ padding: '3px 6px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#d13438', textDecoration: 'underline' }}
                                                    onClick={() => {
                                                        setAppliedDatePreset(null);
                                                        setAppliedCustomDate(null);
                                                        setIsJumpToOpen(false);
                                                    }}
                                                >
                                                    Clear filter
                                                </button>
                                            ) : <span />}
                                            <button
                                                type="button"
                                                className="jump-to-go-btn"
                                                style={{ padding: '3px 12px', background: '#fff', border: '1px solid #8a8886', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', color: '#242424', fontWeight: 600 }}
                                                onClick={() => {
                                                    if (customDateInput) {
                                                        setAppliedCustomDate(customDateInput);
                                                        setAppliedDatePreset(null);
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

                    {/* Active Project Group Banner */}
                    {currentProjectParam && (
                        <div
                            className="project-group-banner"
                            style={{
                                margin: '8px 12px 10px',
                                padding: '12px 14px',
                                borderRadius: '10px',
                                backgroundColor: 'var(--surface-card, #f8faff)',
                                border: '1px solid var(--border-subtle, #dbeafe)',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                    <div
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '6px',
                                            background: 'var(--accent-primary, #3b82f6)',
                                            color: '#ffffff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
                                        </svg>
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #0f172a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {activeProject?.projectName || currentProjectParam}
                                            </h4>
                                            <span
                                                style={{
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    padding: '1px 6px',
                                                    borderRadius: '9999px',
                                                    backgroundColor: activeProject?.status === 'Completed' ? '#dcfce7' : 'var(--accent-soft-bg, #e0e7ff)',
                                                    color: activeProject?.status === 'Completed' ? '#15803d' : 'var(--accent-primary, #4338ca)',
                                                    border: '1px solid rgba(0,0,0,0.05)'
                                                }}
                                            >
                                                {activeProject?.status || 'Active'}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                            <span>📁</span>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 500, color: 'var(--accent-primary, #2563eb)' }}>
                                                {activeProject?.projectEmailId || `${(activeProject?.projectName || currentProjectParam).toLowerCase().replace(/\s+/g, '-')}@safemailz.com`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                    <button
                                        type="button"
                                        onClick={handleOpenComposer}
                                        title="Compose email to this project group"
                                        style={{
                                            padding: '4px 10px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            backgroundColor: 'var(--accent-primary, #2563eb)',
                                            color: '#ffffff',
                                            borderRadius: '6px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                        <span>New Mail</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            searchParams.delete('project');
                                            setSearchParams(searchParams);
                                        }}
                                        title="Exit project group view and view all emails"
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '11px',
                                            fontWeight: 500,
                                            backgroundColor: 'var(--surface-card, #ffffff)',
                                            color: 'var(--text-secondary, #64748b)',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-medium, #cbd5e1)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✕ View All
                                    </button>
                                </div>
                            </div>

                            {/* Members row with stacked avatars */}
                            {activeProjectMembers && activeProjectMembers.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle, #e2e8f0)', paddingTop: '8px', marginTop: '2px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>
                                            Group Members ({activeProjectMembers.length}):
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
                                            {activeProjectMembers.slice(0, 5).map((m, idx) => (
                                                <div
                                                    key={m.email || idx}
                                                    title={`${m.name} (${m.role}): ${m.email}`}
                                                    style={{
                                                        width: '22px',
                                                        height: '22px',
                                                        borderRadius: '50%',
                                                        backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'][idx % 5],
                                                        color: '#ffffff',
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '2px solid #ffffff',
                                                        marginLeft: idx === 0 ? '0' : '-6px',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    {m.initials || m.name?.slice(0, 2).toUpperCase() || 'U'}
                                                </div>
                                            ))}
                                            {activeProjectMembers.length > 5 && (
                                                <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', marginLeft: '6px' }}>
                                                    +{activeProjectMembers.length - 5} more
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                                        Synced across members
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Snooze Category Info Banner */}
                    {folder === 'snooze' && (
                        <div
                            style={{
                                margin: '8px 12px 10px',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                backgroundColor: '#fffbeb',
                                border: '1px solid #fde68a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '12px',
                                color: '#92400e'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '16px' }}>⏰</span>
                                <div>
                                    <strong>Snoozed Messages</strong>
                                    <p style={{ margin: 0, fontSize: '11px', color: '#b45309' }}>These emails will return to your inbox at their scheduled times.</p>
                                </div>
                            </div>
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
                                    conversationThreads.map(thread => (
                                        <ConversationThreadRow
                                            key={thread.threadId}
                                            thread={thread}
                                            isExpanded={expandedThreadIds.has(thread.threadId)}
                                            onToggleExpand={handleToggleThreadExpand}
                                            activeEmailId={selectedEmail?.id}
                                            selectedEmailIds={selectedEmailIds}
                                            onSelectEmail={handleEmailClick}
                                            onSelectCheckbox={handleSelectEmail}
                                            onSelectThreadCheckbox={handleSelectThreadCheckbox}
                                            onContextMenu={handleRowContextMenu}
                                            quickActions={quickActions}
                                            onToggleRead={handleToggleRead}
                                            onDelete={handleDeleteEmail}
                                            onArchive={handleArchiveEmail}
                                            onTogglePin={handleTogglePin}
                                            onToggleFlag={handleToggleFlag}
                                            onSnooze={handleSnooze}
                                            onUnsnooze={handleUnsnooze}
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
                                    <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
                                        {isDateFilterActive
                                            ? `No emails found for "${appliedDatePreset || appliedCustomDate}".`
                                            : "Try another folder or clear your filters."}
                                    </p>
                                    {isDateFilterActive && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAppliedDatePreset(null);
                                                setAppliedCustomDate(null);
                                            }}
                                            style={{
                                                marginTop: '12px',
                                                padding: '6px 14px',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                color: '#0078d4',
                                                background: '#f0f6ff',
                                                border: '1px solid #c7e0f4',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Clear date filter
                                        </button>
                                    )}
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
                                                disabled={isSending || isReadingAttachments}
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
                                            onClick={() => composerAttachInputRef.current?.click()}
                                            title="Attach Files"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                                            </svg>
                                            <span>Attach</span>
                                        </button>

                                        {composeImportance !== 'normal' && (
                                            <span
                                                className={`composer-importance-badge is-${composeImportance}`}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '3px 8px',
                                                    borderRadius: '9999px',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    backgroundColor: composeImportance === 'high' ? 'rgba(239, 68, 68, 0.14)' : 'rgba(56, 189, 248, 0.14)',
                                                    color: composeImportance === 'high' ? '#f87171' : '#38bdf8',
                                                    border: `1px solid ${composeImportance === 'high' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(56, 189, 248, 0.35)'}`
                                                }}
                                            >
                                                {composeImportance === 'high' ? '! High Importance' : '↓ Low Importance'}
                                            </span>
                                        )}

                                        {composerToast && (
                                            <span
                                                className="composer-status-toast"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    padding: '3px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '11.5px',
                                                    fontWeight: 500,
                                                    backgroundColor: 'rgba(56, 189, 248, 0.14)',
                                                    color: '#38bdf8',
                                                    border: '1px solid rgba(56, 189, 248, 0.28)'
                                                }}
                                            >
                                                {composerToast}
                                            </span>
                                        )}
                                    </div>

                                    {/* Discard Draft / Open in Window */}
                                    <div className="composer-header-actions-right">
                                        <button
                                            className="composer-top-delete-btn"
                                            title={folder === 'support' ? 'Clear support message' : 'Discard draft'}
                                            type="button"
                                            onClick={() => {
                                                if (folder === 'support') {
                                                    setComposeSubject('');
                                                    setComposeBody(getDefaultSignatureText('new'));
                                                    setComposerAttachments([]);
                                                    setComposeImportance('normal');
                                                    showComposerToast('Support draft cleared');
                                                } else {
                                                    setIsComposing(false);
                                                }
                                            }}
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
                            <div className="email-composer-fields-wrap" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

                                {/* From Row */}
                                <div className="email-composer-field from-row-wrapper">
                                    <button type="button" className="composer-field-label-btn" disabled>From</button>
                                    <span className="composer-from-email-val">{user?.email || 'singhrahuldrill1@outlook.com'}</span>
                                </div>

                                {/* To Row */}
                                <div className="email-composer-field to-row-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {(composeProjectId || currentProjectParam) && activeProject && (
                                        <div className="project-group-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '11px', color: '#1d4ed8' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontWeight: 700 }}>📁 {activeProject.projectName || currentProjectParam}</span>
                                                <span style={{ color: '#93c5fd' }}>•</span>
                                                <span style={{ color: '#2563eb' }}>{activeProjectMembers.length || 0} Members</span>
                                                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#60a5fa' }}>({activeProject.projectEmailId || 'group sync'})</span>
                                            </div>
                                            <span style={{ fontSize: '10px', backgroundColor: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                Auto-Distributed via SMTP
                                            </span>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
                                        <button type="button" className="composer-field-label-btn">To</button>
                                        <input
                                            type="text"
                                            placeholder="Add recipients"
                                            value={composeTo}
                                            onChange={(e) => setComposeTo(e.target.value)}
                                            readOnly={folder === 'support'}
                                            style={{ border: 'none', outline: 'none', flex: 1, fontSize: '0.85rem', padding: '6px 0', backgroundColor: 'transparent' }}
                                        />
                                        <div className="cc-bcc-triggers" style={{ display: 'flex', gap: '8px', fontSize: '0.85rem', color: '#64748B' }}>
                                            <span className={`cc-bcc-trigger-btn ${showCc ? 'cc-bcc-active' : ''}`} style={{ cursor: 'pointer', fontWeight: 500, padding: '2px 6px', borderRadius: '4px' }} onClick={() => setShowCc(!showCc)}>Cc</span>
                                            <span className={`cc-bcc-trigger-btn ${showBcc ? 'cc-bcc-active' : ''}`} style={{ cursor: 'pointer', fontWeight: 500, padding: '2px 6px', borderRadius: '4px' }} onClick={() => setShowBcc(!showBcc)}>Bcc</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Cc Row */}
                                {showCc && (
                                    <div className="email-composer-field cc-row-wrapper">
                                        <button type="button" className="composer-field-label-btn">Cc</button>
                                        <input
                                            type="text"
                                            placeholder="Add Cc recipients (comma separated)"
                                            value={composeCc}
                                            onChange={(e) => setComposeCc(e.target.value)}
                                            style={{ border: 'none', outline: 'none', flex: 1, fontSize: '0.85rem', padding: '6px 0', backgroundColor: 'transparent' }}
                                        />
                                    </div>
                                )}

                                {/* Bcc Row */}
                                {showBcc && (
                                    <div className="email-composer-field bcc-row-wrapper">
                                        <button type="button" className="composer-field-label-btn">Bcc</button>
                                        <input
                                            type="text"
                                            placeholder="Add Bcc recipients (comma separated)"
                                            value={composeBcc}
                                            onChange={(e) => setComposeBcc(e.target.value)}
                                            style={{ border: 'none', outline: 'none', flex: 1, fontSize: '0.85rem', padding: '6px 0', backgroundColor: 'transparent' }}
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
                                        style={{ border: 'none', outline: 'none', flex: 1, width: '100%', fontSize: '0.88rem', padding: '4px 0', backgroundColor: 'transparent' }}
                                    />
                                </div>

                                {/* Attached Files Bar */}
                                {composerAttachments.length > 0 && (
                                    <div className="email-composer-attachments">
                                        {composerAttachments.map(att => (
                                            <div key={att.id} className="email-attachment-card" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                                                <span>📎 {att.name}</span>
                                                <span style={{ opacity: 0.65, fontSize: '11px' }}>({att.size})</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveAttachment(att.id)}
                                                    title="Remove attachment"
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '14px', lineHeight: 1, padding: '0 2px' }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Rich Body Editor */}
                                <div className="email-composer-editor-wrap" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                    <div
                                        ref={composerEditorRef}
                                        className="email-composer-editor"
                                        contentEditable={true}
                                        suppressContentEditableWarning={true}
                                        spellCheck={isSpellcheckEnabled}
                                        role="textbox" aria-label="Message body" aria-multiline="true" placeholder="Write your message…"
                                        onInput={syncEditorToState}
                                        onMouseUp={applyCopiedFormatIfActive}
                                        style={{ flex: 1, minHeight: '180px', maxHeight: 'none', overflowY: 'auto' }}
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

                    {/* 3. READING PANE VIEW (When email is selected and not composing) */}
                    {!isComposing && selectedEmail && (
                        <div id="readingPaneContent" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minHeight: '0', overflowY: 'auto' }}>
                            {user?.subscription_status === 'expired' && (
                                <ContentLockedOverlay />
                            )}
                            {/* 1. Top Subject Header Block */}
                            <div
                                className="reading-header relative transition-all"
                                id="readingHeaderWrapper"
                                style={{
                                    position: 'relative',
                                    paddingTop: `${headerUiConfig.containerPaddingTop ?? 4}px`,
                                    paddingBottom: `${headerUiConfig.containerPaddingBottom ?? 8}px`,
                                    paddingLeft: `${headerUiConfig.containerPaddingLeft ?? 24}px`,
                                    paddingRight: `${headerUiConfig.containerPaddingRight ?? 24}px`,
                                    borderBottom: 'none',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {/* Floating Tweak UI Button (Non-blocking, does NOT push rows down) */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '16px',
                                        zIndex: 30,
                                        pointerEvents: 'auto'
                                    }}
                                >
                                    <button
                                        type="button"
                                        id="btnTweakBorderAccent"
                                        onClick={() => setIsBorderTweakOpen(prev => !prev)}
                                        title="Tweak Header Borders, Surfaces, Spacing & Typography"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            padding: '4px 9px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            color: isBorderTweakOpen ? '#1D4ED8' : '#475569',
                                            backgroundColor: isBorderTweakOpen ? '#EFF6FF' : '#F8FAFC',
                                            border: isBorderTweakOpen ? '1px solid #93C5FD' : '1px solid #CBD5E1',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                        }}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <line x1="4" y1="21" x2="4" y2="14"></line>
                                            <line x1="4" y1="10" x2="4" y2="3"></line>
                                            <line x1="12" y1="21" x2="12" y2="12"></line>
                                            <line x1="12" y1="8" x2="12" y2="3"></line>
                                            <line x1="20" y1="21" x2="20" y2="16"></line>
                                            <line x1="20" y1="12" x2="20" y2="3"></line>
                                            <line x1="1" y1="14" x2="7" y2="14"></line>
                                            <line x1="9" y1="8" x2="15" y2="8"></line>
                                            <line x1="17" y1="16" x2="23" y2="16"></line>
                                        </svg>
                                        <span>Tweak UI</span>
                                    </button>
                                </div>

                                {/* 3-Row Header Block Wrapper (Moves Up/Down via blockOffsetY Slider) */}
                                <div
                                    className="reading-header-block transition-all"
                                    id="readingHeaderBlock"
                                    style={{
                                        marginTop: `${headerUiConfig.blockOffsetY ?? 0}px`,
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {(() => {
                                        const clientBWidth = headerUiConfig.clientBorderWidth !== undefined ? headerUiConfig.clientBorderWidth : (headerUiConfig.borderWidth ?? 3.5);
                                        const clientGWidth = headerUiConfig.clientGradientWidth !== undefined ? headerUiConfig.clientGradientWidth : (headerUiConfig.gradientWidth ?? 200);
                                        const clientGHeight = headerUiConfig.clientGradientHeight !== undefined ? headerUiConfig.clientGradientHeight : (headerUiConfig.gradientHeight ?? 2);
                                        const clientBRadius = headerUiConfig.clientBorderRadius !== undefined ? headerUiConfig.clientBorderRadius : (headerUiConfig.borderRadius ?? 0);
                                        const clientPadY = headerUiConfig.clientPaddingY !== undefined ? headerUiConfig.clientPaddingY : (headerUiConfig.paddingY ?? 6);
                                        const clientPadX = headerUiConfig.clientPaddingX !== undefined ? headerUiConfig.clientPaddingX : (headerUiConfig.paddingX ?? 10);
                                        const clientMarginLeft = headerUiConfig.clientMarginLeft !== undefined ? headerUiConfig.clientMarginLeft : (headerUiConfig.rowMarginLeft ?? 0);
                                        const clientMarginTop = headerUiConfig.clientMarginTop !== undefined ? headerUiConfig.clientMarginTop : (headerUiConfig.rowMarginTop ?? 0);

                                        const subjectBWidth = headerUiConfig.subjectBorderWidth !== undefined ? headerUiConfig.subjectBorderWidth : (headerUiConfig.borderWidth ?? 3.5);
                                        const subjectGWidth = headerUiConfig.subjectGradientWidth !== undefined ? headerUiConfig.subjectGradientWidth : (headerUiConfig.gradientWidth ?? 200);
                                        const subjectGHeight = headerUiConfig.subjectGradientHeight !== undefined ? headerUiConfig.subjectGradientHeight : (headerUiConfig.gradientHeight ?? 2);
                                        const subjectBRadius = headerUiConfig.subjectBorderRadius !== undefined ? headerUiConfig.subjectBorderRadius : (headerUiConfig.borderRadius ?? 0);
                                        const subjectPadY = headerUiConfig.subjectPaddingY !== undefined ? headerUiConfig.subjectPaddingY : (headerUiConfig.paddingY ?? 6);
                                        const subjectPadX = headerUiConfig.subjectPaddingX !== undefined ? headerUiConfig.subjectPaddingX : (headerUiConfig.paddingX ?? 10);
                                        const subjectMarginLeft = headerUiConfig.subjectMarginLeft !== undefined ? headerUiConfig.subjectMarginLeft : (headerUiConfig.rowMarginLeft ?? 0);
                                        const subjectMarginTop = headerUiConfig.subjectMarginTop !== undefined ? headerUiConfig.subjectMarginTop : (headerUiConfig.rowMarginTop ?? 0);

                                        const emailNoBWidth = headerUiConfig.emailNoBorderWidth !== undefined ? headerUiConfig.emailNoBorderWidth : (headerUiConfig.borderWidth ?? 3.5);
                                        const emailNoGWidth = headerUiConfig.emailNoGradientWidth !== undefined ? headerUiConfig.emailNoGradientWidth : (headerUiConfig.gradientWidth ?? 200);
                                        const emailNoGHeight = headerUiConfig.emailNoGradientHeight !== undefined ? headerUiConfig.emailNoGradientHeight : (headerUiConfig.gradientHeight ?? 2);
                                        const emailNoBRadius = headerUiConfig.emailNoDisplayMode === 'pill' ? 9999 : (headerUiConfig.emailNoBorderRadius !== undefined ? headerUiConfig.emailNoBorderRadius : (headerUiConfig.borderRadius ?? 4));
                                        const emailNoPadY = headerUiConfig.emailNoPaddingY !== undefined ? headerUiConfig.emailNoPaddingY : (headerUiConfig.paddingY ?? 6);
                                        const emailNoPadX = headerUiConfig.emailNoPaddingX !== undefined ? headerUiConfig.emailNoPaddingX : (headerUiConfig.paddingX ?? 12);
                                        const emailNoMarginLeft = headerUiConfig.emailNoMarginLeft !== undefined ? headerUiConfig.emailNoMarginLeft : (headerUiConfig.rowMarginLeft ?? 0);
                                        const emailNoMarginTop = headerUiConfig.emailNoMarginTop !== undefined ? headerUiConfig.emailNoMarginTop : (headerUiConfig.rowMarginTop ?? 0);

                                        return (
                                            <>
                                                <div
                                                    className="reading-thread-header relative"
                                                    id="readingThreadHeader"
                                                    style={{
                                                        position: 'relative',
                                                        fontSize: `${headerUiConfig.clientFontSize || 14}px`,
                                                        color: headerUiConfig.clientTextColor || '#475569',
                                                        fontWeight: headerUiConfig.clientFontWeight || 600,
                                                        marginTop: `${clientMarginTop}px`,
                                                        marginBottom: `${headerUiConfig.rowGap ?? 0}px`,
                                                        marginLeft: `${clientMarginLeft}px`,
                                                        borderRadius: `${clientBRadius}px`,
                                                    boxShadow: getHeaderBoxShadow(headerUiConfig.boxShadowPreset, headerUiConfig.clientColor),
                                                    background: getHeaderRowBg(headerUiConfig.clientBgStyle, headerUiConfig.clientBgColor, headerUiConfig.clientBgOpacity, headerUiConfig.clientColor),
                                                    backdropFilter: headerUiConfig.clientBgStyle === 'glass' ? 'blur(8px)' : undefined,
                                                    WebkitBackdropFilter: headerUiConfig.clientBgStyle === 'glass' ? 'blur(8px)' : undefined,
                                                    borderLeft: headerUiConfig.enabled && clientBWidth > 0 ? `${clientBWidth}px solid ${headerUiConfig.clientColor}` : 'none',
                                                    borderBottom: '1px solid #E5E7EB',
                                                    paddingTop: `${clientPadY}px`,
                                                    paddingBottom: `${clientPadY}px`,
                                                    paddingLeft: headerUiConfig.enabled ? `${clientPadX}px` : '0px',
                                                    paddingRight: `${Math.max(clientPadX, 110)}px`,
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                {(() => {
                                                    const clientName = selectedEmail?.clientName || selectedEmail?.client?.name;
                                                    const projectName = selectedEmail?.projectName || selectedEmail?.project?.name;
                                                    const senderDisplayName = selectedEmail?.senderName || selectedEmail?.fromName || (selectedEmail?.sender ? String(selectedEmail.sender).replace(/^To:\s*/i, '') : '') || selectedEmail?.sourceName || 'Unknown';

                                                    const formatCapitalized = (val) => {
                                                        if (!val) return '';
                                                        return String(val)
                                                            .split(' ')
                                                            .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '')
                                                            .join(' ');
                                                    };

                                                    if (clientName) {
                                                        return (
                                                            <span style={{ color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}>
                                                                Client Name:- <span className="capitalize">{formatCapitalized(clientName)}</span>
                                                            </span>
                                                        );
                                                    }
                                                    if (projectName) {
                                                        return (
                                                            <span style={{ color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}>
                                                                Project Name:- <span className="capitalize">{formatCapitalized(projectName)}</span>
                                                            </span>
                                                        );
                                                    }
                                                    return (
                                                        <span style={{ color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}>
                                                            Client Name:- <span className="capitalize">{formatCapitalized(senderDisplayName)}</span>
                                                        </span>
                                                    );
                                                })()}
                                                {headerUiConfig.enabled && clientBWidth > 0 && (
                                                    <span
                                                        className="client-row-left-accent absolute top-0 bottom-0 left-0 pointer-events-none"
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            bottom: 0,
                                                            left: 0,
                                                            width: `${clientBWidth}px`,
                                                            backgroundColor: headerUiConfig.clientColor,
                                                            pointerEvents: 'none'
                                                        }}
                                                        aria-hidden="true"
                                                    />
                                                )}
                                                {headerUiConfig.enabled && clientGWidth > 0 && (
                                                    <span
                                                        className="client-row-bottom-gradient absolute bottom-[-1px] left-0 pointer-events-none"
                                                        style={{
                                                            position: 'absolute',
                                                            bottom: '-1px',
                                                            left: 0,
                                                            height: `${clientGHeight}px`,
                                                            width: `${clientGWidth}px`,
                                                            pointerEvents: 'none',
                                                            background: `linear-gradient(90deg, ${headerUiConfig.clientColor} 0%, ${headerUiConfig.clientGradientEnd} 60%, transparent 100%)`
                                                        }}
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </div>

                                            <div
                                                className="reading-subject-line relative"
                                                id="readingSubjectLine"
                                                style={{
                                                    position: 'relative',
                                                    fontSize: `${headerUiConfig.subjectFontSize || 16}px`,
                                                    fontWeight: headerUiConfig.subjectFontWeight || 700,
                                                    color: headerUiConfig.subjectTextColor || '#0F172A',
                                                    marginTop: `${subjectMarginTop}px`,
                                                    marginBottom: `${headerUiConfig.rowGap || 0}px`,
                                                    marginLeft: `${subjectMarginLeft}px`,
                                                    borderRadius: `${subjectBRadius}px`,
                                                    boxShadow: getHeaderBoxShadow(headerUiConfig.boxShadowPreset, headerUiConfig.subjectColor),
                                                    background: getHeaderRowBg(headerUiConfig.subjectBgStyle, headerUiConfig.subjectBgColor, headerUiConfig.subjectBgOpacity, headerUiConfig.subjectColor),
                                                    backdropFilter: headerUiConfig.subjectBgStyle === 'glass' ? 'blur(8px)' : undefined,
                                                    WebkitBackdropFilter: headerUiConfig.subjectBgStyle === 'glass' ? 'blur(8px)' : undefined,
                                                    borderLeft: headerUiConfig.enabled && subjectBWidth > 0 ? `${subjectBWidth}px solid ${headerUiConfig.subjectColor}` : 'none',
                                                    borderBottom: '1px solid #E5E7EB',
                                                    paddingTop: `${subjectPadY}px`,
                                                    paddingBottom: `${subjectPadY}px`,
                                                    paddingLeft: headerUiConfig.enabled ? `${subjectPadX}px` : '0px',
                                                    paddingRight: `${Math.max(subjectPadX, 24)}px`,
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                Subject: <b style={{ fontWeight: headerUiConfig.subjectFontWeight || 'inherit' }}>{selectedEmail.subject}</b>
                                                {headerUiConfig.enabled && subjectBWidth > 0 && (
                                                    <span
                                                        className="subject-row-left-accent absolute top-0 bottom-0 left-0 pointer-events-none"
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            bottom: 0,
                                                            left: 0,
                                                            width: `${subjectBWidth}px`,
                                                            backgroundColor: headerUiConfig.subjectColor,
                                                            pointerEvents: 'none'
                                                        }}
                                                        aria-hidden="true"
                                                    />
                                                )}
                                                {headerUiConfig.enabled && subjectGWidth > 0 && (
                                                    <span
                                                        className="subject-row-bottom-gradient absolute bottom-[-1px] left-0 pointer-events-none"
                                                        style={{
                                                            position: 'absolute',
                                                            bottom: '-1px',
                                                            left: 0,
                                                            height: `${subjectGHeight}px`,
                                                            width: `${subjectGWidth}px`,
                                                            pointerEvents: 'none',
                                                            background: `linear-gradient(90deg, ${headerUiConfig.subjectColor} 0%, ${headerUiConfig.subjectGradientEnd} 60%, transparent 100%)`
                                                        }}
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </div>

                                            <div
                                                className="reading-email-no relative"
                                                id="readingEmailNo"
                                                style={{
                                                    position: 'relative',
                                                    display: headerUiConfig.emailNoDisplayMode === 'pill' ? 'inline-flex' : 'block',
                                                    width: headerUiConfig.emailNoDisplayMode === 'pill' ? 'fit-content' : '100%',
                                                    boxSizing: 'border-box',
                                                    fontSize: `${headerUiConfig.emailNoFontSize || 13}px`,
                                                    color: headerUiConfig.emailNoTextColor || '#1D4ED8',
                                                    fontWeight: headerUiConfig.emailNoFontWeight || 700,
                                                    fontFamily: headerUiConfig.emailNoFontStyle === 'mono' ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' : 'inherit',
                                                    background: getHeaderRowBg(headerUiConfig.emailNoBgStyle, headerUiConfig.emailNoBgColor, headerUiConfig.emailNoBgOpacity, headerUiConfig.emailNoColor),
                                                    backdropFilter: headerUiConfig.emailNoBgStyle === 'glass' ? 'blur(8px)' : undefined,
                                                    WebkitBackdropFilter: headerUiConfig.emailNoBgStyle === 'glass' ? 'blur(8px)' : undefined,
                                                    paddingTop: `${emailNoPadY}px`,
                                                    paddingBottom: `${emailNoPadY}px`,
                                                    paddingLeft: `${emailNoPadX}px`,
                                                    paddingRight: `${emailNoPadX}px`,
                                                    marginLeft: `${emailNoMarginLeft}px`,
                                                    borderRadius: `${emailNoBRadius}px`,
                                                    border: headerUiConfig.emailNoDisplayMode === 'card'
                                                        ? '1px solid #CBD5E1'
                                                        : (headerUiConfig.emailNoDisplayMode === 'pill' ? `1px solid ${headerUiConfig.emailNoColor}40` : 'none'),
                                                    borderLeft: (headerUiConfig.enabled && headerUiConfig.emailNoDisplayMode === 'bar' && emailNoBWidth > 0)
                                                        ? `${emailNoBWidth}px solid ${headerUiConfig.emailNoColor}`
                                                        : (headerUiConfig.emailNoDisplayMode === 'card' ? '1px solid #CBD5E1' : (headerUiConfig.emailNoDisplayMode === 'pill' ? `1px solid ${headerUiConfig.emailNoColor}40` : 'none')),
                                                    boxShadow: getHeaderBoxShadow(headerUiConfig.boxShadowPreset, headerUiConfig.emailNoColor),
                                                    marginTop: `${emailNoMarginTop !== undefined && emailNoMarginTop !== 0 ? emailNoMarginTop : (headerUiConfig.rowGap ? headerUiConfig.rowGap : 0)}px`,
                                                    transition: 'all 0.15s ease',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                Email No. : {selectedEmail.emailNo || selectedEmail.id || '17620'}
                                                {headerUiConfig.enabled && headerUiConfig.emailNoDisplayMode === 'bar' && emailNoBWidth > 0 && (
                                                    <span
                                                        className="email-no-row-left-accent absolute top-0 bottom-0 left-0 pointer-events-none"
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            bottom: 0,
                                                            left: 0,
                                                            width: `${emailNoBWidth}px`,
                                                            backgroundColor: headerUiConfig.emailNoColor,
                                                            pointerEvents: 'none'
                                                        }}
                                                        aria-hidden="true"
                                                    />
                                                )}
                                                {headerUiConfig.enabled && headerUiConfig.emailNoDisplayMode === 'bar' && emailNoGWidth > 0 && (
                                                    <span
                                                        className="email-no-row-bottom-gradient absolute bottom-[-1px] left-0 pointer-events-none"
                                                        style={{
                                                            position: 'absolute',
                                                            bottom: '-1px',
                                                            left: 0,
                                                            height: `${emailNoGHeight}px`,
                                                            width: `${emailNoGWidth}px`,
                                                            pointerEvents: 'none',
                                                            background: `linear-gradient(90deg, ${headerUiConfig.emailNoColor} 0%, ${headerUiConfig.emailNoGradientEnd} 60%, transparent 100%)`
                                                        }}
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </div>
                                        </>
                                    );
                                })()}
                                </div>
                            </div>

                            {/* 2. Sender Meta Bar */}
                            <div className="reading-meta" style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid var(--border-subtle, #F1F5F9)', gap: '12px' }}>
                                <div className="reading-sender-avatar" id="readingAvatar" style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#1A6BA8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                                    {getSenderInitials(selectedEmail.sender)}
                                </div>
                                <div className="reading-sender-details" style={{ flex: 1, minWidth: 0 }}>
                                    <div className="reading-sender-name" id="readingSenderName" style={{ fontWeight: 700, color: 'var(--text-primary, #0F172A)', fontSize: '0.92rem' }}>
                                        {selectedEmail.sender}
                                    </div>
                                    <div className="reading-sender-email" id="readingSenderEmail" style={{ fontSize: '0.8rem', color: '#475569' }}>
                                        {(() => {
                                            const isRegisteredClient = Boolean(selectedEmail.isClient || selectedEmail.senderClientId || selectedEmail.clientId);
                                            const canViewReal = selectedEmail.canViewRealEmailIds !== undefined
                                                ? Boolean(selectedEmail.canViewRealEmailIds)
                                                : (user?.role !== 'employee' || Boolean(user?.canViewRealEmailsAndSignatures || user?.permissions?.viewRealEmailIds));

                                            // 1. If permission toggle is ON -> Always display real sender email / Gmail ID
                                            if (canViewReal) {
                                                const realEmail = selectedEmail.senderEmail || selectedEmail.realSenderEmail || '';
                                                return realEmail ? `<${realEmail}>` : (selectedEmail.sender ? `<${selectedEmail.sender.toLowerCase().replace(/\s+/g, '')}@example.com>` : '');
                                            }

                                            // 2. Permission toggle is OFF:
                                            // Condition A (Registered Client): Display generated Client ID
                                            if (isRegisteredClient) {
                                                return selectedEmail.senderClientId || selectedEmail.clientId || 'Client ID';
                                            }

                                            // Condition B (Unknown / Non-Client Sender): Display unknown client - XXXXX
                                            const senderKey = selectedEmail.senderEmail || selectedEmail.realSenderEmail || selectedEmail.sender || String(selectedEmail.id || '');
                                            return getUnknownClientIdentifier(senderKey);
                                        })()}
                                    </div>
                                    <div className="reading-to" id="readingTo" style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '1px' }}>
                                        To: Me
                                    </div>
                                    <div className="reading-date" id="readingDate" style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                                        {formatMailReadingDate(selectedEmail.date || selectedEmail.createdAt || selectedEmail.created_at)}
                                    </div>
                                </div>

                                {/* Top Pill Action Toolbar (6 buttons) */}
                                <div className="reading-actions-top" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--surface-subtle, #F8FAFC)', padding: '3px 8px', borderRadius: '100px', border: '1px solid var(--border-subtle, #E2E8F0)' }}>
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

                            {/* 3. Message Body */}
                            <div
                                className="reading-body w-full flex-1 max-w-full"
                                id="readingBody"
                                style={{
                                    flex: 1,
                                    width: '100%',
                                    maxWidth: '100%',
                                    minWidth: 0,
                                    margin: 0,
                                    padding: '20px 24px',
                                    background: 'inherit',
                                    border: 'none',
                                    borderRadius: 0,
                                    boxShadow: 'none',
                                    overflowY: 'auto',
                                    overflowX: 'auto',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <div
                                    className="threaded-container w-full max-w-full"
                                    style={{
                                        width: '100%',
                                        maxWidth: '100%',
                                        minWidth: 0,
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <div
                                        className="threaded-card w-full max-w-full"
                                        style={{
                                            background: 'transparent',
                                            width: '100%',
                                            maxWidth: '100%',
                                            minWidth: 0,
                                            border: 'none',
                                            borderRadius: 0,
                                            padding: 0,
                                            margin: 0
                                        }}
                                    >
                                        <div
                                            className="threaded-body email-html-content w-full max-w-full"
                                            style={{
                                                lineHeight: '1.6',
                                                fontSize: '13px',
                                                color: 'inherit',
                                                width: '100%',
                                                maxWidth: '100%',
                                                minWidth: 0,
                                                wordBreak: 'break-word',
                                                overflowWrap: 'anywhere'
                                            }}
                                        >
                                            {selectedEmail.body ? (
                                                <div
                                                    className="email-rendered-body w-full max-w-full"
                                                    style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}
                                                    dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                                                />
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

            {/* Outlook-Style Context Menu */}
            {contextMenu && (
                <EmailContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    selectedEmails={emails.filter(e => contextMenu.emailIds.includes(e.id))}
                    projects={allProjects}
                    onClose={() => setContextMenu(null)}
                    onAction={(action, payload) => handleBulkAction(action, payload, contextMenu.emailIds)}
                />
            )}

            {/* Quick Actions Configuration Modal */}
            {isQuickActionsModalOpen && (
                <QuickActionsModal
                    currentActions={quickActions}
                    onClose={() => setIsQuickActionsModalOpen(false)}
                    onSave={handleSaveQuickActions}
                />
            )}

            {/* View Message Details / Source Modal */}
            {detailsModalEmail && (
                <EmailDetailsModal
                    email={detailsModalEmail}
                    initialTab={detailsModalTab}
                    onClose={() => setDetailsModalEmail(null)}
                />
            )}

            {/* Snooze Pick Date Modal */}
            {isSnoozeDateModalOpen && (
                <SnoozeDatePickerModal
                    onClose={() => setIsSnoozeDateModalOpen(false)}
                    onSnooze={(until) => handleBulkAction('SNOOZE', { snoozeUntil: until }, pendingSnoozeIds)}
                />
            )}

            {/* Undo Toast Notification */}
            {undoToast && (
                <UndoToast
                    message={undoToast.message}
                    onUndo={undoToast.onUndo}
                    onDismiss={() => setUndoToast(null)}
                />
            )}

            {/* Header Border Accent & UI Customizer Popover */}
            <HeaderBorderTweakPopover
                isOpen={isBorderTweakOpen}
                onClose={() => setIsBorderTweakOpen(false)}
                config={headerUiConfig}
                settings={headerUiConfig}
                onChange={handleHeaderUiConfigChange}
                onReset={handleHeaderUiConfigReset}
            />
        </div>
    );
}