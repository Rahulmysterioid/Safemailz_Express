import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { registerSettingsGetter } from '../utils/dateUtils';

// ==========================================
// 1. CONSTANTS & DEFAULTS
// ==========================================

export const GENERAL_SETTINGS_STORAGE_KEY = 'safemailz_general_settings';

export const ACCENT_COLORS = [
    { name: 'Classic Blue',  hex: '#0078d4', hover: '#106ebe', lightRgba: 'rgba(0, 120, 212, 0.12)' },
    { name: 'Emerald Green', hex: '#059669', hover: '#047857', lightRgba: 'rgba(5, 150, 105, 0.12)' },
    { name: 'Purple',        hex: '#7c3aed', hover: '#6d28d9', lightRgba: 'rgba(124, 58, 237, 0.12)' },
    { name: 'Slate',         hex: '#475569', hover: '#334155', lightRgba: 'rgba(71, 85, 105, 0.12)' },
    { name: 'Crimson',       hex: '#dc2626', hover: '#b91c1c', lightRgba: 'rgba(220, 38, 38, 0.12)' },
    { name: 'Teal',          hex: '#0d9488', hover: '#0f766e', lightRgba: 'rgba(13, 148, 136, 0.12)' }
];

export const DEFAULT_GENERAL_SETTINGS = {
    // 1. Language and time slice
    languageTime: {
        language: 'en-US',
        dateFormat: 'M/D/YYYY',
        timeFormat: '12h',
        timeZone: 'Asia/Kolkata'
    },

    // 2. Appearance slice
    appearance: {
        theme: 'light',
        mode: 'light',
        accentColor: 'Classic Blue',
        accentHex: '#0078d4',
        themeColor: 'classic-blue',
        density: 'cozy'
    },

    // 3. Notifications slice
    notifications: {
        enabled: true,
        allowNotifications: true,
        notifyNewMail: true,
        desktopStyle: 'browser',
        notificationStyle: 'browser',
        playSound: true,
        playNotificationSound: true,
        soundTone: 'chime',
        notificationSound: 'chime',
        notifyMentions: true,
        notifyProjectTaskMentions: true
    },

    // 4. Accessibility slice
    accessibility: {
        shortcutProfile: 'outlook',
        keyboardShortcutMode: 'outlook',
        highContrast: false,
        fontScale: 'default',
        reduceMotion: false,
        askEmptySubject: true
    },

    // 5. Privacy and data slice
    privacyData: {
        externalImages: 'proxy',
        readReceipts: true,
        allowReadReceipts: true,
        searchHistoryEnabled: true
    },

    // 6. Search slice
    search: {
        scope: 'all',
        searchScope: 'all_folders',
        includeDeleted: false,
        suggestions: true,
        showSuggestions: true,
        pageSize: 25
    }
};

/**
 * Deep merge utility for settings slices, ensuring missing keys fallback to defaults
 * while preserving existing values and preventing undefined/null overrides.
 */
export function mergeSettingsDeep(base, override) {
    if (!override || typeof override !== 'object') return JSON.parse(JSON.stringify(base));

    // Normalize top-level snake_case aliases to camelCase
    const normalized = { ...override };
    if (normalized.language_time && !normalized.languageTime) {
        normalized.languageTime = normalized.language_time;
    }
    if (normalized.privacy_data && !normalized.privacyData) {
        normalized.privacyData = normalized.privacy_data;
    }

    const result = { ...base };
    for (const key of Object.keys(base)) {
        if (normalized[key] !== undefined && normalized[key] !== null) {
            if (typeof base[key] === 'object' && !Array.isArray(base[key])) {
                result[key] = mergeSettingsDeep(base[key], normalized[key]);
            } else {
                result[key] = normalized[key];
            }
        }
    }

    // Include any forward-compatible extra keys
    for (const key of Object.keys(normalized)) {
        if (result[key] === undefined && normalized[key] !== undefined) {
            result[key] = normalized[key];
        }
    }
    return result;
}

// Synchronous memory cache for non-React code (e.g. dateUtils.js, audioDispatcher.js)
let memorySettingsCache = JSON.parse(JSON.stringify(DEFAULT_GENERAL_SETTINGS));

/**
 * Returns current general settings synchronously. Safe to call outside React tree.
 */
export const getGeneralSettings = () => {
    return memorySettingsCache;
};

// Wire synchronous getter into centralized date engine
registerSettingsGetter(getGeneralSettings);

/**
 * Web Audio synthesizer for Safemailz notification tones (chime, bell, ping, marimba)
 */
export function playNotificationTone(tone = 'chime') {
    try {
        if (typeof window === 'undefined') return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        const frequencies = {
            chime: [523.25, 783.99],
            bell: [880],
            ping: [1046.5],
            marimba: [440]
        };

        const freqs = frequencies[tone] || frequencies.chime;
        freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = tone === 'marimba' ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
            gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + idx * 0.12);
            osc.stop(ctx.currentTime + idx * 0.12 + 0.4);
        });
    } catch (err) {
        console.warn('Audio synthesis failed:', err);
    }
}

/**
 * Triggers sound/toast/system notification according to current user preferences
 */
export function triggerNotificationAlert({ title, body, type = 'mail' } = {}) {
    const curSettings = getGeneralSettings();
    const notif = curSettings?.notifications || {};
    if (notif.enabled === false || notif.allowNotifications === false) return;
    if (type === 'mail' && notif.notifyNewMail === false) return;
    if (type === 'mention' && notif.notifyMentions === false) return;

    if (notif.playSound !== false && notif.playNotificationSound !== false) {
        playNotificationTone(notif.soundTone || notif.notificationSound || 'chime');
    }

    const style = notif.desktopStyle || notif.notificationStyle || 'browser';
    if (style === 'browser' && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title || 'Safemailz', { body: body || '', icon: '/favicon.ico' });
            return;
        } catch {}
    }

    if (style !== 'none' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('safemailz-toast', {
            detail: { title: title || 'Safemailz', body: body || '', type }
        }));
    }
}

if (typeof window !== 'undefined') {
    window.__SAFEMAILZ_GET_GENERAL_SETTINGS__ = getGeneralSettings;
    window.__SAFEMAILZ_GENERAL_SETTINGS__ = memorySettingsCache;
    window.__SAFEMAILZ_PLAY_SOUND__ = playNotificationTone;
    window.__SAFEMAILZ_TRIGGER_NOTIFICATION__ = triggerNotificationAlert;
}

// Initial state loader from localStorage
const loadInitialSettings = () => {
    try {
        const stored = localStorage.getItem(GENERAL_SETTINGS_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') {
                const merged = mergeSettingsDeep(DEFAULT_GENERAL_SETTINGS, parsed);
                memorySettingsCache = merged;
                return merged;
            }
        }
    } catch (e) {
        console.warn('[GeneralSettings] Failed to parse stored general settings from localStorage', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_GENERAL_SETTINGS));
};

// Helper to construct authenticated headers
const getAuthHeaders = () => {
    const userStr = localStorage.getItem('currentUser');
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.id != null) headers['x-user-id'] = String(user.id);
            const orgId = user.organization_id || user.orgId || user.org_id || 1;
            headers['x-org-id'] = String(orgId);
            if (user.email) headers['x-active-email'] = String(user.email).trim();
        } catch {
            /* ignore JSON parse errors */
        }
    }
    return headers;
};

// ==========================================
// 2. CONTEXT & PROVIDER
// ==========================================

export const GeneralSettingsContext = createContext(null);

export function GeneralSettingsProvider({ children }) {
    // Committed settings (persisted in DB and localStorage)
    const [settings, setSettings] = useState(loadInitialSettings);

    // Working draft settings (uncommitted edits made by user in settings sections)
    const [draftSettings, setDraftSettings] = useState(loadInitialSettings);

    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Sync memory cache whenever committed settings change
    useEffect(() => {
        memorySettingsCache = settings;
        if (typeof window !== 'undefined') {
            window.__SAFEMAILZ_GENERAL_SETTINGS__ = settings;
        }
    }, [settings]);

    // Live DOM synchronization for theme, accent color, density, accessibility, and shortcuts
    useEffect(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;

        const currentAppearance = draftSettings?.appearance || settings?.appearance || {};
        const currentAccessibility = draftSettings?.accessibility || settings?.accessibility || {};

        // 1. Theme (light, dark, system)
        const themeMode = currentAppearance.theme || currentAppearance.mode || 'light';
        const applyTheme = () => {
            let isDark = false;
            if (themeMode === 'dark') {
                isDark = true;
            } else if (themeMode === 'system') {
                isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
            document.documentElement.classList.toggle('dark', isDark);
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            if (document.body) {
                document.body.classList.toggle('dark', isDark);
                document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
            }
        };
        applyTheme();

        let mql = null;
        const handleMqlChange = () => {
            if (themeMode === 'system') applyTheme();
        };
        if (themeMode === 'system' && window.matchMedia) {
            mql = window.matchMedia('(prefers-color-scheme: dark)');
            if (mql.addEventListener) {
                mql.addEventListener('change', handleMqlChange);
            } else if (mql.addListener) {
                mql.addListener(handleMqlChange);
            }
        }

        // 2. Dynamic Accent Color Variables
        const accentName = currentAppearance.accentColor || 'Classic Blue';
        const matchedSwatch = ACCENT_COLORS.find(c => c.name.toLowerCase() === accentName.toLowerCase()) || ACCENT_COLORS[0];
        const accentHex = currentAppearance.accentHex || matchedSwatch.hex || '#0078d4';
        const accentHover = matchedSwatch.hover || '#106ebe';
        const accentSoftBg = matchedSwatch.lightRgba || 'rgba(0, 120, 212, 0.12)';

        document.documentElement.setAttribute('data-accent', accentName);
        document.documentElement.style.setProperty('--primary-color', accentHex);
        document.documentElement.style.setProperty('--primary', accentHex);
        document.documentElement.style.setProperty('--primary-hover', accentHover);
        document.documentElement.style.setProperty('--primary-light', accentSoftBg);
        document.documentElement.style.setProperty('--accent-primary', accentHex);
        document.documentElement.style.setProperty('--accent-hover', accentHover);
        document.documentElement.style.setProperty('--accent-soft-bg', accentSoftBg);
        document.documentElement.style.setProperty('--accent-text', accentHex);
        if (document.body) {
            document.body.style.setProperty('--primary-color', accentHex);
            document.body.style.setProperty('--primary', accentHex);
            document.body.style.setProperty('--primary-hover', accentHover);
            document.body.style.setProperty('--primary-light', accentSoftBg);
            document.body.style.setProperty('--accent-primary', accentHex);
            document.body.style.setProperty('--accent-hover', accentHover);
            document.body.style.setProperty('--accent-soft-bg', accentSoftBg);
            document.body.style.setProperty('--accent-text', accentHex);
        }

        // 3. Display Density
        const density = currentAppearance.density || 'cozy';
        document.documentElement.setAttribute('data-density', density);
        if (document.body) {
            document.body.classList.remove('density-roomy', 'density-cozy', 'density-compact');
            document.body.classList.add(`density-${density}`);
            document.body.setAttribute('data-density', density);
        }

        // 3b. Anti-FOUC Local Storage Cache for instantaneous reloads
        try {
            localStorage.setItem('safemailz_theme', JSON.stringify({
                theme: themeMode,
                mode: themeMode,
                accentColor: accentName,
                accentHex: accentHex,
                density: density
            }));
        } catch (e) {}

        // 4. Accessibility: High Contrast
        document.body.classList.toggle('high-contrast', !!currentAccessibility.highContrast);

        // 5. Accessibility: Font Scale
        const scale = currentAccessibility.fontScale || 'default';
        document.body.classList.remove('font-scale-default', 'font-scale-large', 'font-scale-extralarge', 'text-scale-lg');
        document.body.classList.add(`font-scale-${scale}`);
        if (scale === 'large' || scale === 'extralarge') {
            document.body.classList.add('text-scale-lg');
        }

        // 6. Accessibility: Reduce Motion
        document.body.classList.toggle('reduce-motion', !!currentAccessibility.reduceMotion);

        // 7. Global Keyboard Shortcuts Listener
        const handleKeyDown = (e) => {
            const target = e.target;
            const tagName = target?.tagName?.toUpperCase();
            if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target?.isContentEditable) {
                return;
            }
            if (e.key === 'Escape') {
                window.dispatchEvent(new CustomEvent('safemailz-close-modal'));
                return;
            }
            const profile = currentAccessibility.shortcutProfile || currentAccessibility.keyboardShortcutMode || 'outlook';
            if (profile === 'off') return;

            if (profile === 'outlook' && (e.key === 'n' || e.key === 'N')) {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('safemailz-compose'));
            } else if (profile === 'gmail' && (e.key === 'c' || e.key === 'C')) {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('safemailz-compose'));
            } else if (e.key === '/') {
                e.preventDefault();
                const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]');
                if (searchInput) searchInput.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (mql) {
                if (mql.removeEventListener) {
                    mql.removeEventListener('change', handleMqlChange);
                } else if (mql.removeListener) {
                    mql.removeListener(handleMqlChange);
                }
            }
        };
    }, [draftSettings.appearance, settings.appearance, draftSettings.accessibility, settings.accessibility]);

    // Compute dirty state & per-slice diffs (key-order independent)
    const { isDirty, modifiedSettings, dirtySlices } = useMemo(() => {
        const diff = {};
        const changedSlices = [];
        let dirty = false;

        const sliceKeys = ['languageTime', 'appearance', 'notifications', 'accessibility', 'privacyData', 'search'];
        for (const slice of sliceKeys) {
            const committedSlice = settings[slice] || {};
            const draftSlice = draftSettings[slice] || {};
            const allKeys = new Set([...Object.keys(committedSlice), ...Object.keys(draftSlice)]);
            const sliceDiff = {};
            let sliceChanged = false;

            for (const key of allKeys) {
                if (JSON.stringify(draftSlice[key]) !== JSON.stringify(committedSlice[key])) {
                    sliceChanged = true;
                    sliceDiff[key] = draftSlice[key];
                }
            }

            if (sliceChanged) {
                dirty = true;
                changedSlices.push(slice);
                diff[slice] = sliceDiff;
            }
        }

        return {
            isDirty: dirty,
            modifiedSettings: diff,
            dirtySlices: changedSlices
        };
    }, [settings, draftSettings]);

    /**
     * Check if a specific slice has unsaved draft changes
     * @param {string} slice - e.g. 'languageTime', 'appearance'
     * @returns {boolean}
     */
    const isSliceDirty = useCallback((slice) => {
        if (!slice) return isDirty;
        return dirtySlices.includes(slice);
    }, [isDirty, dirtySlices]);

    /**
     * Fetch settings from GET /api/settings/general
     */
    const fetchGeneralSettings = useCallback(async () => {
        const userStr = localStorage.getItem('currentUser');
        const token = localStorage.getItem('token');
        if (!userStr && !token) {
            setIsLoaded(true);
            return { success: false, reason: 'unauthenticated' };
        }

        try {
            setLoading(true);
            const res = await fetch('/api/settings/general', {
                headers: getAuthHeaders()
            });

            if (res.ok) {
                const data = await res.json();
                if (data && data.settings) {
                    const merged = mergeSettingsDeep(DEFAULT_GENERAL_SETTINGS, data.settings);
                    setSettings(merged);
                    setDraftSettings(merged);
                    memorySettingsCache = merged;
                    try {
                        localStorage.setItem(GENERAL_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
                    } catch (e) {
                        console.warn('[GeneralSettings] localStorage quota exceeded', e);
                    }
                    return { success: true, settings: merged };
                }
            } else {
                console.warn('[GeneralSettings] GET /api/settings/general returned status', res.status);
            }
        } catch (err) {
            console.error('[GeneralSettings] Network error fetching general settings:', err);
        } finally {
            setLoading(false);
            setIsLoaded(true);
        }
        return { success: false, settings: memorySettingsCache };
    }, []);

    // Initial load from backend on mount
    useEffect(() => {
        let isMounted = true;
        fetchGeneralSettings().then(() => {
            if (!isMounted) return;
        });
        return () => { isMounted = false; };
    }, [fetchGeneralSettings]);

    /**
     * Update active draft state for a slice. Tracks changes against committed settings.
     * @param {string} slice - One of 6 slices: 'languageTime' | 'appearance' | 'notifications' | 'accessibility' | 'privacyData' | 'search'
     * @param {Object} patch - Partial object to merge into the slice
     */
    const updateGeneralSettings = useCallback((slice, patch) => {
        if (!slice || !patch || typeof patch !== 'object' || Array.isArray(patch)) return;

        setDraftSettings(prev => {
            const currentSlice = prev[slice] || DEFAULT_GENERAL_SETTINGS[slice] || {};
            const updatedSlice = { ...currentSlice, ...patch };

            // Special convenience: if accentColor changed without accentHex, lookup hex automatically
            if (slice === 'appearance' && patch.accentColor && !patch.accentHex) {
                const match = ACCENT_COLORS.find(c => c.name === patch.accentColor);
                if (match) {
                    updatedSlice.accentHex = match.hex;
                }
            }

            return {
                ...prev,
                [slice]: updatedSlice
            };
        });
    }, []);

    /**
     * Save general settings.
     * @param {string} [targetSlice] - Optional specific slice to save. If omitted, saves all modified slices.
     * @param {Object} [overridePayload] - Optional explicit payload override to bypass closure state (e.g. factory reset)
     */
    const saveGeneralSettings = useCallback(async (targetSlice = null, overridePayload = null) => {
        try {
            setIsSaving(true);
            let payload = {};

            if (overridePayload && typeof overridePayload === 'object') {
                payload = overridePayload;
            } else if (targetSlice) {
                payload = { [targetSlice]: draftSettings[targetSlice] };
            } else {
                // If specific slice not provided, save all modified slices (or full draft if diff empty)
                payload = Object.keys(modifiedSettings).length > 0 ? modifiedSettings : draftSettings;
            }

            const res = await fetch('/api/settings/general', {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                const serverSettings = data?.settings || payload;
                const nextSettings = mergeSettingsDeep(settings, serverSettings);

                setSettings(nextSettings);
                if (targetSlice && !overridePayload) {
                    setDraftSettings(prev => ({
                        ...prev,
                        [targetSlice]: nextSettings[targetSlice]
                    }));
                } else {
                    setDraftSettings(nextSettings);
                }

                memorySettingsCache = nextSettings;
                try {
                    localStorage.setItem(GENERAL_SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
                } catch (e) {
                    console.warn('[GeneralSettings] localStorage write failure', e);
                }

                return { success: true, settings: nextSettings };
            } else {
                console.warn('[GeneralSettings] PUT /api/settings/general failed with status', res.status);
                return { success: false, status: res.status };
            }
        } catch (err) {
            console.error('[GeneralSettings] Network error during save; applying local-only fallback:', err);
            // Graceful offline fallback: persist locally
            const nextSettings = overridePayload
                ? mergeSettingsDeep(settings, overridePayload)
                : targetSlice
                ? { ...settings, [targetSlice]: draftSettings[targetSlice] }
                : { ...settings, ...draftSettings };

            setSettings(nextSettings);
            if (targetSlice && !overridePayload) {
                setDraftSettings(prev => ({ ...prev, [targetSlice]: nextSettings[targetSlice] }));
            } else {
                setDraftSettings(nextSettings);
            }

            memorySettingsCache = nextSettings;
            try {
                localStorage.setItem(GENERAL_SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
            } catch {}

            return { success: true, localOnly: true, settings: nextSettings };
        } finally {
            setIsSaving(false);
        }
    }, [draftSettings, modifiedSettings, settings]);

    /**
     * Discard pending uncommitted draft changes, reverting draft state back to committed settings.
     * @param {string} [targetSlice] - Optional slice to revert. If omitted, reverts all slices.
     */
    const discardGeneralSettings = useCallback((targetSlice = null) => {
        if (targetSlice) {
            setDraftSettings(prev => ({
                ...prev,
                [targetSlice]: JSON.parse(JSON.stringify(settings[targetSlice] || DEFAULT_GENERAL_SETTINGS[targetSlice]))
            }));
        } else {
            setDraftSettings(JSON.parse(JSON.stringify(settings)));
        }
    }, [settings]);

    /**
     * Reset all settings to factory system defaults
     */
    const resetAllSettings = useCallback(async () => {
        const defaults = JSON.parse(JSON.stringify(DEFAULT_GENERAL_SETTINGS));
        setDraftSettings(defaults);
        return saveGeneralSettings(null, defaults);
    }, [saveGeneralSettings]);

    const value = useMemo(() => ({
        settings,                  // Committed persisted settings (6 slices)
        draftSettings,             // Working uncommitted draft settings
        isDirty,                   // True if any draft slice differs from committed settings
        isSliceDirty,              // (slice) => boolean
        modifiedSettings,          // Object containing only dirty slices & fields
        dirtySlices,               // Array of dirty slice names: ['languageTime', ...]
        loading,                   // True while GET /api/settings/general is in flight
        isSaving,                  // True while PUT /api/settings/general is in flight
        isLoaded,                  // True once initial fetch / localStorage read has completed
        fetchGeneralSettings,      // Manual refetch
        updateGeneralSettings,     // (slice, patch) => void
        saveGeneralSettings,       // (slice?, overridePayload?) => Promise<{ success, settings, localOnly? }>
        discardGeneralSettings,    // (slice?) => void
        resetAllSettings,          // () => Promise<{ success, settings }>
        triggerNotification: triggerNotificationAlert,
        playNotificationSound: playNotificationTone
    }), [
        settings,
        draftSettings,
        isDirty,
        isSliceDirty,
        modifiedSettings,
        dirtySlices,
        loading,
        isSaving,
        isLoaded,
        fetchGeneralSettings,
        updateGeneralSettings,
        saveGeneralSettings,
        discardGeneralSettings,
        resetAllSettings
    ]);

    return (
        <GeneralSettingsContext.Provider value={value}>
            {children}
        </GeneralSettingsContext.Provider>
    );
}

// ==========================================
// 3. CUSTOM HOOK
// ==========================================

export function useGeneralSettings() {
    const context = useContext(GeneralSettingsContext);
    if (!context) {
        throw new Error('useGeneralSettings must be used within a GeneralSettingsProvider');
    }
    return context;
}
