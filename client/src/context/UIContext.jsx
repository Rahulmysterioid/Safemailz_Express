import React, { createContext, useContext, useState, useEffect } from 'react';

const UIContext = createContext();

export const useUI = () => useContext(UIContext);

export const THEME_PRESETS = [
    {
        name: 'Default Light',
        id: 'default',
        color: '#2563EB',
        settings: {
            global: {
                primaryColor: '#2563EB',
                cardBorderRadius: '12px',
                globalBgColor: '#FFFFFF',
                globalTextColor: '#1E293B',
                fontFamily: "'Inter', sans-serif",
                baseFontSize: '16px',
                fontWeight: '400',
                density: 'comfortable',
                boxShadow: 'soft'
            },
            sidebar: { padding: '0.5rem', margin: '0rem', backgroundColor: '#F8FAFC', textColor: '#334155', fontSize: '0.875rem', borderColor: '#E2E8F0', borderWidth: '1px', borderRadius: '0px', borderStyle: 'solid', width: '240px', hoverColor: '#F1F5F9', activeColor: '#EFF6FF', boxShadow: 'none' },
            topbar: { padding: '0 1.5rem', margin: '0rem', backgroundColor: '#FFFFFF', textColor: '#1E293B', fontSize: '0.875rem', borderColor: '#E2E8F0', borderWidth: '1px', borderRadius: '0px', borderStyle: 'solid', boxShadow: 'soft' },
            toolbar: { padding: '8px 16px', margin: '0rem', backgroundColor: '#FFFFFF', textColor: '#1E293B', fontSize: '0.875rem', borderColor: '#E2E8F0', borderWidth: '1px', borderRadius: '0px', borderStyle: 'solid', boxShadow: 'none', btnBg: '#FFFFFF', btnTextColor: '#475569', btnBorderColor: '#E2E8F0', btnBorderRadius: '4px', btnHoverBg: '#F8FAFC' },
            mailList: { padding: '0rem', margin: '0rem', backgroundColor: '#FFFFFF', textColor: '#1E293B', fontSize: '0.875rem', borderColor: '#E2E8F0', borderWidth: '1px', borderRadius: '0px', borderStyle: 'solid', width: '360px', hoverColor: '#F8FAFC', activeColor: '#EFF6FF', boxShadow: 'none', rowBg: '#FFFFFF', rowHoverBg: '#F8FAFC', rowUnreadBg: '#F1F5F9', rowBorderColor: '#E2E8F0', senderColor: '#0F172A', subjectColor: '#334155', previewColor: '#64748B', dateColor: '#94A3B8', avatarRadius: '50%' },
            readingPane: { padding: '0rem', margin: '0rem', backgroundColor: '#FFFFFF', textColor: '#1E293B', fontSize: '0.925rem', borderColor: '#E2E8F0', borderWidth: '0px', borderRadius: '0px', borderStyle: 'solid', lineHeight: '1.6', boxShadow: 'none', headerBg: '#FFFFFF', titleColor: '#0F172A', metaColor: '#475569', bodyColor: '#334155' }
        }
    },
    {
        name: 'Dark Slate',
        id: 'dark-slate',
        color: '#38BDF8',
        settings: {
            global: {
                primaryColor: '#38BDF8',
                cardBorderRadius: '12px',
                globalBgColor: '#0F172A',
                globalTextColor: '#F1F5F9',
                fontFamily: "'Inter', sans-serif",
                baseFontSize: '16px',
                fontWeight: '400',
                density: 'comfortable',
                boxShadow: 'medium'
            },
            sidebar: { padding: '0.5rem', margin: '0rem', backgroundColor: '#1E293B', textColor: '#94A3B8', fontSize: '0.875rem', borderColor: '#334155', borderWidth: '1px', borderRadius: '0px', borderStyle: 'solid', width: '240px', hoverColor: '#334155', activeColor: '#0F172A', boxShadow: 'none' },
            topbar: { padding: '0 1.5rem', margin: '0rem', backgroundColor: '#1E293B', textColor: '#F1F5F9', fontSize: '0.875rem', borderColor: '#334155', borderWidth: '1px', borderRadius: '0px', borderStyle: 'solid', boxShadow: 'soft' },
            toolbar: { padding: '8px 16px', margin: '0rem', backgroundColor: '#1E293B', textColor: '#F1F5F9', fontSize: '0.875rem', borderColor: '#334155', borderWidth: '1px', borderRadius: '0px', borderStyle: 'solid', boxShadow: 'none', btnBg: '#1E293B', btnTextColor: '#94A3B8', btnBorderColor: '#334155', btnBorderRadius: '4px', btnHoverBg: '#334155' },
            mailList: { padding: '0rem', margin: '0rem', backgroundColor: '#0F172A', textColor: '#F1F5F9', fontSize: '0.875rem', borderColor: '#334155', borderWidth: '1px', borderRadius: '0px', borderStyle: 'solid', width: '360px', hoverColor: '#1E293B', activeColor: '#1E3A8A', boxShadow: 'none', rowBg: '#0F172A', rowHoverBg: '#1E293B', rowUnreadBg: '#1E3A8A', rowBorderColor: '#334155', senderColor: '#F8FAFC', subjectColor: '#F1F5F9', previewColor: '#94A3B8', dateColor: '#64748B', avatarRadius: '50%' },
            readingPane: { padding: '0rem', margin: '0rem', backgroundColor: '#0F172A', textColor: '#F1F5F9', fontSize: '0.925rem', borderColor: '#334155', borderWidth: '0px', borderRadius: '0px', borderStyle: 'solid', lineHeight: '1.6', boxShadow: 'none', headerBg: '#0F172A', titleColor: '#F8FAFC', metaColor: '#94A3B8', bodyColor: '#F1F5F9' }
        }
    },
    {
        name: 'Forest Emerald',
        id: 'emerald',
        color: '#059669',
        settings: {
            global: {
                primaryColor: '#059669',
                cardBorderRadius: '14px',
                globalBgColor: '#F0FDF4',
                globalTextColor: '#064E3B',
                fontFamily: "'Inter', sans-serif",
                baseFontSize: '16px',
                fontWeight: '400',
                density: 'comfortable',
                boxShadow: 'soft'
            },
            sidebar: { padding: '0.5rem', margin: '0rem', backgroundColor: '#DCFCE7', textColor: '#065F46', fontSize: '0.875rem', borderColor: '#BBF7D0', borderWidth: '1px', borderRadius: '0px', borderStyle: 'solid', width: '240px', hoverColor: '#D1FAE5', activeColor: '#A7F3D0', boxShadow: 'none' },
            topbar: { padding: '0 1.5rem', margin: '0rem', backgroundColor: '#FFFFFF', textColor: '#064E3B', fontSize: '0.875rem', borderColor: '#BBF7D0', borderWidth: '1px', borderRadius: '0px', borderStyle: 'solid', boxShadow: 'soft' },
            toolbar: { padding: '8px 16px', margin: '0rem', backgroundColor: '#FFFFFF', textColor: '#064E3B', fontSize: '0.875rem', borderColor: '#BBF7D0', borderWidth: '1px', borderRadius: '0px', borderStyle: 'solid', boxShadow: 'none', btnBg: '#FFFFFF', btnTextColor: '#065F46', btnBorderColor: '#BBF7D0', btnBorderRadius: '4px', btnHoverBg: '#DCFCE7' },
            mailList: { padding: '0rem', margin: '0rem', backgroundColor: '#F0FDF4', textColor: '#064E3B', fontSize: '0.875rem', borderColor: '#BBF7D0', borderWidth: '1px', borderRadius: '0px', borderStyle: 'solid', width: '360px', hoverColor: '#E8FDF0', activeColor: '#DCFCE7', boxShadow: 'none', rowBg: '#F0FDF4', rowHoverBg: '#E8FDF0', rowUnreadBg: '#DCFCE7', rowBorderColor: '#BBF7D0', senderColor: '#022C22', subjectColor: '#064E3B', previewColor: '#065F46', dateColor: '#047857', avatarRadius: '50%' },
            readingPane: { padding: '0rem', margin: '0rem', backgroundColor: '#FFFFFF', textColor: '#064E3B', fontSize: '0.925rem', borderColor: '#BBF7D0', borderWidth: '0px', borderRadius: '0px', borderStyle: 'solid', lineHeight: '1.6', boxShadow: 'none', headerBg: '#FFFFFF', titleColor: '#022C22', metaColor: '#065F46', bodyColor: '#064E3B' }
        }
    },
    {
        name: 'Royal Purple',
        id: 'royal-purple',
        color: '#7C3AED',
        settings: {
            global: {
                primaryColor: '#7C3AED',
                cardBorderRadius: '16px',
                globalBgColor: '#FAF5FF',
                globalTextColor: '#4C1D95',
                fontFamily: "'Inter', sans-serif",
                baseFontSize: '16px',
                fontWeight: '400',
                density: 'comfortable',
                boxShadow: 'soft'
            },
            sidebar: { padding: '0.5rem', margin: '0rem', backgroundColor: '#F3E8FF', textColor: '#581C87', fontSize: '0.875rem', borderColor: '#E9D5FF', borderWidth: '1px', borderRadius: '0px', borderStyle: 'solid', width: '240px', hoverColor: '#EDE9FE', activeColor: '#DDD6FE', boxShadow: 'none' },
            topbar: { padding: '0 1.5rem', margin: '0rem', backgroundColor: '#FFFFFF', textColor: '#4C1D95', fontSize: '0.875rem', borderColor: '#E9D5FF', borderWidth: '1px', borderRadius: '0px', borderStyle: 'solid', boxShadow: 'soft' },
            toolbar: { padding: '8px 16px', margin: '0rem', backgroundColor: '#FFFFFF', textColor: '#4C1D95', fontSize: '0.875rem', borderColor: '#E9D5FF', borderWidth: '1px', borderRadius: '0px', borderStyle: 'solid', boxShadow: 'none', btnBg: '#FFFFFF', btnTextColor: '#581C87', btnBorderColor: '#E9D5FF', btnBorderRadius: '4px', btnHoverBg: '#F3E8FF' },
            mailList: { padding: '0rem', margin: '0rem', backgroundColor: '#FAF5FF', textColor: '#4C1D95', fontSize: '0.875rem', borderColor: '#E9D5FF', borderWidth: '1px', borderRadius: '0px', borderStyle: 'solid', width: '360px', hoverColor: '#F3E8FF', activeColor: '#EDE9FE', boxShadow: 'none', rowBg: '#FAF5FF', rowHoverBg: '#F3E8FF', rowUnreadBg: '#EDE9FE', rowBorderColor: '#E9D5FF', senderColor: '#2E1065', subjectColor: '#4C1D95', previewColor: '#581C87', dateColor: '#7C3AED', avatarRadius: '50%' },
            readingPane: { padding: '0rem', margin: '0rem', backgroundColor: '#FFFFFF', textColor: '#4C1D95', fontSize: '0.925rem', borderColor: '#E9D5FF', borderWidth: '0px', borderRadius: '0px', borderStyle: 'solid', lineHeight: '1.6', boxShadow: 'none', headerBg: '#FFFFFF', titleColor: '#2E1065', metaColor: '#581C87', bodyColor: '#4C1D95' }
        }
    }
];

export const DEFAULT_UI_SETTINGS = THEME_PRESETS[0].settings;

export const UI_SETTINGS_STORAGE_KEY = 'safemailzUiSettings';

const cloneSettings = (settings) => JSON.parse(JSON.stringify(settings || DEFAULT_UI_SETTINGS));

const hexToRgb = (hex) => {
    if (!hex || typeof hex !== 'string') return null;
    let h = hex.trim().replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const darkenHex = (hex, amount = 0.14) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const f = 1 - amount;
    const to = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return `#${[to(rgb.r), to(rgb.g), to(rgb.b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

const rgbaFromHex = (hex, alpha) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const luminance = (hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return 1;
    return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
};

export const applySettingsToDOM = (settings) => {
    if (!settings) return;
    const root = document.documentElement;

    if (settings.global) {
        const g = settings.global;
        if (g.primaryColor) {
            root.style.setProperty('--custom-primary-color', g.primaryColor);
            root.style.setProperty('--primary', g.primaryColor);
            root.style.setProperty('--primary-color', g.primaryColor);
            root.style.setProperty('--primary-hover', darkenHex(g.primaryColor));
            root.style.setProperty('--primary-light', rgbaFromHex(g.primaryColor, 0.12));
            root.style.setProperty('--border-accent', g.primaryColor);
        }
        if (g.cardBorderRadius) root.style.setProperty('--custom-border-radius', g.cardBorderRadius);
        if (g.globalBgColor) {
            root.style.setProperty('--global-bg-color', g.globalBgColor);
            root.style.setProperty('--custom-bg-color', g.globalBgColor);
            root.style.setProperty('--surface', g.globalBgColor);
        }
        if (g.globalTextColor) {
            root.style.setProperty('--global-text-color', g.globalTextColor);
            root.style.setProperty('--text-primary', g.globalTextColor);
            root.style.setProperty('--text-dark', g.globalTextColor);
        }
        if (g.fontFamily) {
            root.style.setProperty('--global-font-family', g.fontFamily);
            root.style.setProperty('--font-main', g.fontFamily);
        }
        if (g.baseFontSize) {
            root.style.setProperty('--global-base-font-size', g.baseFontSize);
            root.style.fontSize = g.baseFontSize;
            if (document.body) document.body.style.fontSize = g.baseFontSize;
        }
        if (g.fontWeight) root.style.setProperty('--global-font-weight', g.fontWeight);

        if (g.density) {
            let rowPadding = '12px 16px';
            let itemPadding = '8px 12px';
            if (g.density === 'compact') {
                rowPadding = '6px 12px';
                itemPadding = '4px 8px';
            } else if (g.density === 'spacious') {
                rowPadding = '16px 20px';
                itemPadding = '12px 16px';
            }
            root.style.setProperty('--mail-row-padding', rowPadding);
            root.style.setProperty('--mail-list-row-padding', rowPadding);
            root.style.setProperty('--sidebar-item-padding', itemPadding);
        }

        if (g.boxShadow) {
            const shadowVal = g.boxShadow === 'soft' ? '0 2px 8px rgba(0, 0, 0, 0.06)'
                : g.boxShadow === 'medium' ? '0 4px 14px rgba(0, 0, 0, 0.1)'
                : g.boxShadow === 'floating' ? '0 10px 25px rgba(0, 0, 0, 0.15)'
                : 'none';
            root.style.setProperty('--global-box-shadow', shadowVal);
        }

        const bg = g.globalBgColor || '#ffffff';
        if (luminance(bg) < 0.45) root.setAttribute('data-theme', 'dark');
        else root.removeAttribute('data-theme');
    }

    // Components
    const components = ['sidebar', 'topbar', 'mailList', 'toolbar', 'readingPane'];
    components.forEach(comp => {
        if (settings[comp]) {
            const prefix = comp.replace(/([A-Z])/g, '-$1').toLowerCase();
            const s = settings[comp];
            if (s.padding !== undefined) root.style.setProperty(`--${prefix}-padding`, s.padding);
            if (s.margin !== undefined) root.style.setProperty(`--${prefix}-margin`, s.margin);
            if (s.backgroundColor !== undefined) root.style.setProperty(`--${prefix}-bg`, s.backgroundColor);
            if (s.textColor !== undefined) root.style.setProperty(`--${prefix}-text-color`, s.textColor);
            if (s.fontSize !== undefined) root.style.setProperty(`--${prefix}-font-size`, s.fontSize);
            if (s.borderColor !== undefined) root.style.setProperty(`--${prefix}-border-color`, s.borderColor);
            if (s.borderWidth !== undefined) root.style.setProperty(`--${prefix}-border-width`, s.borderWidth);
            if (s.borderRadius !== undefined) root.style.setProperty(`--${prefix}-border-radius`, s.borderRadius);
            if (s.borderStyle !== undefined) root.style.setProperty(`--${prefix}-border-style`, s.borderStyle);
            if (s.width !== undefined) root.style.setProperty(`--${prefix}-width`, s.width);
            if (s.hoverColor !== undefined) root.style.setProperty(`--${prefix}-hover-bg`, s.hoverColor);
            if (s.activeColor !== undefined) root.style.setProperty(`--${prefix}-active-bg`, s.activeColor);
            if (s.lineHeight !== undefined) root.style.setProperty(`--${prefix}-line-height`, s.lineHeight);
            
            // Advanced Granular Settings
            // Toolbar specific
            if (s.btnBg !== undefined) root.style.setProperty(`--${prefix}-btn-bg`, s.btnBg);
            if (s.btnTextColor !== undefined) root.style.setProperty(`--${prefix}-btn-text`, s.btnTextColor);
            if (s.btnBorderColor !== undefined) root.style.setProperty(`--${prefix}-btn-border-color`, s.btnBorderColor);
            if (s.btnBorderRadius !== undefined) root.style.setProperty(`--${prefix}-btn-radius`, s.btnBorderRadius);
            if (s.btnHoverBg !== undefined) root.style.setProperty(`--${prefix}-btn-hover-bg`, s.btnHoverBg);

            // MailList specific
            if (s.rowBg !== undefined) root.style.setProperty(`--${prefix}-row-bg`, s.rowBg);
            if (s.rowHoverBg !== undefined) root.style.setProperty(`--${prefix}-row-hover-bg`, s.rowHoverBg);
            if (s.rowUnreadBg !== undefined) root.style.setProperty(`--${prefix}-row-unread-bg`, s.rowUnreadBg);
            if (s.rowBorderColor !== undefined) root.style.setProperty(`--${prefix}-row-border`, s.rowBorderColor);
            if (s.senderColor !== undefined) root.style.setProperty(`--${prefix}-sender-color`, s.senderColor);
            if (s.subjectColor !== undefined) root.style.setProperty(`--${prefix}-subject-color`, s.subjectColor);
            if (s.previewColor !== undefined) root.style.setProperty(`--${prefix}-preview-color`, s.previewColor);
            if (s.dateColor !== undefined) root.style.setProperty(`--${prefix}-date-color`, s.dateColor);
            if (s.avatarRadius !== undefined) root.style.setProperty(`--${prefix}-avatar-radius`, s.avatarRadius);
            if (s.subheaderBg !== undefined) root.style.setProperty(`--${prefix}-subheader-bg`, s.subheaderBg);
            if (s.subheaderBorder !== undefined) root.style.setProperty(`--${prefix}-subheader-border`, s.subheaderBorder);
            if (s.tabActiveColor !== undefined) root.style.setProperty(`--${prefix}-tab-active-color`, s.tabActiveColor);

            if (s.subheaderPadding !== undefined) root.style.setProperty(`--${prefix}-tab-padding`, s.subheaderPadding);
            if (s.subheaderMargin !== undefined) root.style.setProperty(`--${prefix}-tab-margin`, s.subheaderMargin);
            if (s.subheaderFontSize !== undefined) root.style.setProperty(`--${prefix}-tab-font-size`, s.subheaderFontSize);
            if (s.subheaderFontWeight !== undefined) root.style.setProperty(`--${prefix}-tab-font-weight`, s.subheaderFontWeight);
            if (s.tabActiveFontWeight !== undefined) root.style.setProperty(`--${prefix}-tab-active-font-weight`, s.tabActiveFontWeight);
            if (s.tabActiveBorderWidth !== undefined) root.style.setProperty(`--${prefix}-tab-active-border-width`, s.tabActiveBorderWidth);
            if (s.tabGap !== undefined) root.style.setProperty(`--${prefix}-tab-gap`, s.tabGap);
            
            if (s.rowPadding !== undefined) root.style.setProperty(`--${prefix}-row-padding`, s.rowPadding);
            if (s.rowMargin !== undefined) root.style.setProperty(`--${prefix}-row-margin`, s.rowMargin);
            if (s.rowBorderRadius !== undefined) root.style.setProperty(`--${prefix}-row-radius`, s.rowBorderRadius);

            if (s.senderFontSize !== undefined) root.style.setProperty(`--${prefix}-sender-font-size`, s.senderFontSize);
            if (s.senderFontWeight !== undefined) root.style.setProperty(`--${prefix}-sender-font-weight`, s.senderFontWeight);
            if (s.subjectFontSize !== undefined) root.style.setProperty(`--${prefix}-subject-font-size`, s.subjectFontSize);
            if (s.subjectFontWeight !== undefined) root.style.setProperty(`--${prefix}-subject-font-weight`, s.subjectFontWeight);
            if (s.previewFontSize !== undefined) root.style.setProperty(`--${prefix}-preview-font-size`, s.previewFontSize);


            // Reading Pane specific
            if (s.headerBg !== undefined) root.style.setProperty(`--${prefix}-header-bg`, s.headerBg);
            if (s.titleColor !== undefined) root.style.setProperty(`--${prefix}-title-color`, s.titleColor);
            if (s.metaColor !== undefined) root.style.setProperty(`--${prefix}-meta-color`, s.metaColor);
            if (s.bodyColor !== undefined) root.style.setProperty(`--${prefix}-body-color`, s.bodyColor);

            if (s.boxShadow !== undefined) {
                const shadowVal = s.boxShadow === 'soft' ? '0 2px 8px rgba(0, 0, 0, 0.06)'
                    : s.boxShadow === 'medium' ? '0 4px 14px rgba(0, 0, 0, 0.1)'
                    : s.boxShadow === 'floating' ? '0 10px 25px rgba(0, 0, 0, 0.15)'
                    : 'none';
                root.style.setProperty(`--${prefix}-shadow`, shadowVal);
            }

            if (comp === 'sidebar' && s.backgroundColor) {
                root.style.setProperty('--surface-sidebar', s.backgroundColor);
            }
            if (comp === 'mailList' && s.backgroundColor) {
                root.style.setProperty('--surface-list', s.backgroundColor);
            }
        }
    });
};

export const UIProvider = ({ children }) => {
    const [uiSettings, setUiSettings] = useState(() => {
        try {
            const stored = localStorage.getItem(UI_SETTINGS_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && parsed.global) {
                    return {
                        global: { ...DEFAULT_UI_SETTINGS.global, ...parsed.global },
                        sidebar: { ...DEFAULT_UI_SETTINGS.sidebar, ...parsed.sidebar },
                        topbar: { ...DEFAULT_UI_SETTINGS.topbar, ...parsed.topbar },
                        toolbar: { ...DEFAULT_UI_SETTINGS.toolbar, ...parsed.toolbar },
                        mailList: { ...DEFAULT_UI_SETTINGS.mailList, ...parsed.mailList },
                        readingPane: { ...DEFAULT_UI_SETTINGS.readingPane, ...parsed.readingPane }
                    };
                }
            }
        } catch (e) { /* ignore */ }
        return cloneSettings(DEFAULT_UI_SETTINGS);
    });
    const [isLoaded, setIsLoaded] = useState(false);

    const persistLocal = (settings) => {
        try {
            localStorage.setItem(UI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        } catch (e) { /* ignore quota */ }
    };

    const authHeaders = () => {
        const userStr = localStorage.getItem('currentUser');
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.id != null) headers['x-user-id'] = String(user.id);
                const orgId = user.organization_id || user.orgId || user.org_id || 1;
                headers['x-org-id'] = String(orgId);
            } catch (e) { /* ignore */ }
        }
        return headers;
    };

    useEffect(() => {
        const fetchSettings = async () => {
            applySettingsToDOM(uiSettings);
            const userStr = localStorage.getItem('currentUser');
            const token = localStorage.getItem('token');
            if (!userStr || !token) {
                setIsLoaded(true);
                return;
            }

            try {
                const res = await fetch('/api/settings/ui', { headers: authHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    if (data.settings && Object.keys(data.settings).length > 0) {
                        setUiSettings(prev => {
                            const merged = cloneSettings(prev);
                            for (const key of Object.keys(data.settings)) {
                                if (merged[key] && typeof data.settings[key] === 'object') {
                                    merged[key] = { ...merged[key], ...data.settings[key] };
                                } else {
                                    merged[key] = data.settings[key];
                                }
                            }
                            persistLocal(merged);
                            return merged;
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to fetch UI settings", err);
            } finally {
                setIsLoaded(true);
            }
        };

        fetchSettings();
    }, []);

    useEffect(() => {
        applySettingsToDOM(uiSettings);
    }, [uiSettings]);

    const saveUiSettings = async (newSettings) => {
        const updatedSettings = cloneSettings({
            global: { ...uiSettings.global, ...(newSettings.global || {}) },
            sidebar: { ...uiSettings.sidebar, ...(newSettings.sidebar || {}) },
            topbar: { ...uiSettings.topbar, ...(newSettings.topbar || {}) },
            toolbar: { ...uiSettings.toolbar, ...(newSettings.toolbar || {}) },
            mailList: { ...uiSettings.mailList, ...(newSettings.mailList || {}) },
            readingPane: { ...uiSettings.readingPane, ...(newSettings.readingPane || {}) }
        });
        // If caller passed a full settings object, prefer those nested keys entirely
        ['global', 'sidebar', 'topbar', 'toolbar', 'mailList', 'readingPane'].forEach((key) => {
            if (newSettings[key]) updatedSettings[key] = { ...updatedSettings[key], ...newSettings[key] };
        });

        setUiSettings(updatedSettings);
        applySettingsToDOM(updatedSettings);
        persistLocal(updatedSettings);

        try {
            const res = await fetch('/api/settings/ui', {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify(updatedSettings)
            });
            if (!res.ok) {
                console.warn('UI settings saved locally; server returned', res.status);
                return { ok: true, localOnly: true };
            }
            return { ok: true };
        } catch (err) {
            console.error("Failed to save UI settings to server", err);
            return { ok: true, localOnly: true };
        }
    };

    return (
        <UIContext.Provider value={{ uiSettings, setUiSettings, saveUiSettings, isLoaded }}>
            {children}
        </UIContext.Provider>
    );
};
