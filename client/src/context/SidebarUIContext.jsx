import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SidebarUIContext = createContext(null);

export const COLOR_KEYS = [
    'bgColor',
    'textColor',
    'subtextColor',
    'cardBgColor',
    'cardBorderColor',
    'cardHoverBgColor',
    'cardHoverBorderColor',
    'activeCardBgColor',
    'activeCardBorderColor',
    'borderColor',
];

export const DEFAULT_DARK_COLORS = {
    bgColor: '#181818',
    textColor: '#f1f5f9',
    subtextColor: '#94a3b8',
    cardBgColor: '#202020',
    cardBorderColor: '#303030',
    cardHoverBgColor: '#282828',
    cardHoverBorderColor: '#454545',
    activeCardBgColor: '#152438',
    activeCardBorderColor: '#3b82f6',
    borderColor: '#2b2b2b',
};

export const DEFAULT_LIGHT_COLORS = {
    bgColor: '#ffffff',
    textColor: '#0f172a',
    subtextColor: '#64748b',
    cardBgColor: '#f8fafc',
    cardBorderColor: '#e2e8f0',
    cardHoverBgColor: '#f1f5f9',
    cardHoverBorderColor: '#cbd5e1',
    activeCardBgColor: '#eff6ff',
    activeCardBorderColor: '#2563eb',
    borderColor: '#e2e8f0',
};

export const DEFAULT_SIDEBAR_UI = {
    schemaVersion: 3,
    position: 'left', // 'left' | 'right' | 'top' | 'bottom'
    themeScope: 'dark_only', // 'dark_only' | 'all' | 'light_only'
    fontSize: 13,
    cardTitleFontSize: 13,
    cardSubFontSize: 11,
    width: 288,
    height: 185,
    borderRadius: 0,
    cardBorderRadius: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    padding: 0,
    boxShadow: 'none', // 'none' | 'soft' | 'medium' | 'floating' | 'glow'
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    darkConfig: { ...DEFAULT_DARK_COLORS },
    lightConfig: { ...DEFAULT_LIGHT_COLORS },
    ...DEFAULT_DARK_COLORS,
};

export const SIDEBAR_PRESETS = [
    {
        id: 'dark-default',
        name: 'Dark Slate (Default)',
        icon: '🌙',
        targetMode: 'dark',
        settings: {
            themeScope: 'dark_only',
            position: 'left',
            width: 288,
            height: 185,
            borderRadius: 0,
            cardBorderRadius: 12,
            borderWidth: 1,
            boxShadow: 'none',
            ...DEFAULT_DARK_COLORS
        }
    },
    {
        id: 'clean-white',
        name: 'Clean White',
        icon: '☀️',
        targetMode: 'light',
        settings: {
            themeScope: 'light_only',
            position: 'left',
            width: 288,
            height: 185,
            borderRadius: 0,
            cardBorderRadius: 12,
            borderWidth: 1,
            boxShadow: 'soft',
            ...DEFAULT_LIGHT_COLORS
        }
    },
    {
        id: 'ocean-navy',
        name: 'Ocean Navy',
        icon: '🌊',
        targetMode: 'dark',
        settings: {
            themeScope: 'dark_only',
            position: 'left',
            width: 295,
            height: 185,
            borderRadius: 8,
            cardBorderRadius: 12,
            borderWidth: 1,
            boxShadow: 'medium',
            bgColor: '#0b192c',
            textColor: '#f0f9ff',
            subtextColor: '#7dd3fc',
            cardBgColor: '#102a45',
            cardBorderColor: '#1e3e62',
            cardHoverBgColor: '#15395b',
            cardHoverBorderColor: '#1e3e62',
            activeCardBgColor: '#0c4a6e',
            activeCardBorderColor: '#38bdf8',
            borderColor: '#1e3e62',
        }
    },
    {
        id: 'cyber-purple',
        name: 'Cyber Purple',
        icon: '🔮',
        targetMode: 'dark',
        settings: {
            themeScope: 'dark_only',
            position: 'left',
            width: 290,
            height: 185,
            borderRadius: 8,
            cardBorderRadius: 14,
            borderWidth: 1,
            boxShadow: 'glow',
            bgColor: '#130c24',
            textColor: '#faf5ff',
            subtextColor: '#c084fc',
            cardBgColor: '#20153d',
            cardBorderColor: '#3b2569',
            cardHoverBgColor: '#2a1d4f',
            cardHoverBorderColor: '#3b2569',
            activeCardBgColor: '#3b0764',
            activeCardBorderColor: '#a855f7',
            borderColor: '#3b2569',
        }
    },
    {
        id: 'emerald-matrix',
        name: 'Emerald Minimal',
        icon: '🌿',
        targetMode: 'dark',
        settings: {
            themeScope: 'dark_only',
            position: 'left',
            width: 288,
            height: 185,
            borderRadius: 0,
            cardBorderRadius: 12,
            borderWidth: 1,
            boxShadow: 'soft',
            bgColor: '#051d16',
            textColor: '#ecfdf5',
            subtextColor: '#6ee7b7',
            cardBgColor: '#0a3227',
            cardBorderColor: '#134e3f',
            cardHoverBgColor: '#0e4234',
            cardHoverBorderColor: '#134e3f',
            activeCardBgColor: '#064e3b',
            activeCardBorderColor: '#10b981',
            borderColor: '#134e3f',
        }
    },
    {
        id: 'sunset-amber',
        name: 'Sunset Amber',
        icon: '🌇',
        targetMode: 'dark',
        settings: {
            themeScope: 'dark_only',
            position: 'left',
            width: 288,
            height: 185,
            borderRadius: 8,
            cardBorderRadius: 12,
            borderWidth: 1,
            boxShadow: 'medium',
            bgColor: '#1c140c',
            textColor: '#fffbeb',
            subtextColor: '#fcd34d',
            cardBgColor: '#2b1f13',
            cardBorderColor: '#45321f',
            cardHoverBgColor: '#362718',
            cardHoverBorderColor: '#45321f',
            activeCardBgColor: '#451a03',
            activeCardBorderColor: '#f59e0b',
            borderColor: '#45321f',
        }
    }
];

export const SIDEBAR_STORAGE_KEY = 'safemailz_sidebar_custom_ui';
export const SIDEBAR_SCHEMA_VERSION = 3;

export const isDarkThemeActive = () => {
    if (typeof document === 'undefined') return false;
    const root = document.documentElement;
    return root.classList.contains('dark') ||
        root.getAttribute('data-theme') === 'dark' ||
        (document.body?.classList.contains('dark') ?? false);
};

export const migrateSidebarSettings = (parsed) => {
    if (!parsed) return DEFAULT_SIDEBAR_UI;
    if (parsed.schemaVersion >= SIDEBAR_SCHEMA_VERSION && parsed.darkConfig && parsed.lightConfig) {
        return parsed;
    }

    const scope = parsed.themeScope || 'dark_only';

    const darkConfig = { ...DEFAULT_DARK_COLORS };
    const lightConfig = { ...DEFAULT_LIGHT_COLORS };

    if (parsed.darkConfig) {
        Object.assign(darkConfig, parsed.darkConfig);
    }
    if (parsed.lightConfig) {
        Object.assign(lightConfig, parsed.lightConfig);
    }

    // Migrate flat properties if they exist
    COLOR_KEYS.forEach(k => {
        if (parsed[k] !== undefined) {
            if (scope === 'light_only') {
                if (parsed[k] !== DEFAULT_DARK_COLORS[k]) {
                    lightConfig[k] = parsed[k];
                }
            } else {
                darkConfig[k] = parsed[k];
            }
        }
    });

    // Cleanup contaminated dark defaults in lightConfig
    if (lightConfig.cardBgColor === '#202020') {
        lightConfig.cardBgColor = DEFAULT_LIGHT_COLORS.cardBgColor;
    }
    if (lightConfig.activeCardBgColor === '#152438') {
        lightConfig.activeCardBgColor = DEFAULT_LIGHT_COLORS.activeCardBgColor;
    }
    if (lightConfig.textColor === '#f1f5f9') {
        lightConfig.textColor = DEFAULT_LIGHT_COLORS.textColor;
    }
    if (lightConfig.subtextColor === '#94a3b8') {
        lightConfig.subtextColor = DEFAULT_LIGHT_COLORS.subtextColor;
    }
    if (lightConfig.cardHoverBgColor === '#282828') {
        lightConfig.cardHoverBgColor = DEFAULT_LIGHT_COLORS.cardHoverBgColor;
    }
    if (lightConfig.cardBorderColor === '#303030') {
        lightConfig.cardBorderColor = DEFAULT_LIGHT_COLORS.cardBorderColor;
    }
    if (lightConfig.cardHoverBorderColor === '#454545') {
        lightConfig.cardHoverBorderColor = DEFAULT_LIGHT_COLORS.cardHoverBorderColor;
    }
    if (lightConfig.borderColor === '#2b2b2b') {
        lightConfig.borderColor = DEFAULT_LIGHT_COLORS.borderColor;
    }

    return {
        ...DEFAULT_SIDEBAR_UI,
        ...parsed,
        schemaVersion: SIDEBAR_SCHEMA_VERSION,
        themeScope: scope,
        darkConfig,
        lightConfig,
    };
};

// Whether the user's custom sidebar colors should be applied for the current theme.
export const shouldApplySidebarColors = (settings, isDark = isDarkThemeActive()) => {
    const scope = settings?.themeScope || 'dark_only';
    if (scope === 'all') return true;
    if (scope === 'dark_only') return isDark;
    if (scope === 'light_only') return !isDark;
    return false;
};

export const resolveActiveColors = (settings, isDark = isDarkThemeActive()) => {
    if (!settings) return isDark ? DEFAULT_DARK_COLORS : DEFAULT_LIGHT_COLORS;
    const config = isDark
        ? (settings.darkConfig || DEFAULT_DARK_COLORS)
        : (settings.lightConfig || DEFAULT_LIGHT_COLORS);
    return {
        ...(isDark ? DEFAULT_DARK_COLORS : DEFAULT_LIGHT_COLORS),
        ...config,
    };
};

// Theme-level surface variables that the base light/dark CSS also relies on.
const THEME_SURFACE_VARS = ['--sidebar-bg', '--surface-sidebar', '--sidebar-text-color'];

export const applySidebarSettingsToDOM = (settings) => {
    if (!settings) return;
    const root = document.documentElement;
    const body = document.body;
    const isDark = isDarkThemeActive();
    const applyColors = shouldApplySidebarColors(settings, isDark);
    const activeColors = resolveActiveColors(settings, isDark);

    // Set position and theme scope data attributes on root and body
    const pos = settings.position || 'left';
    root.setAttribute('data-sidebar-position', pos);
    const scope = settings.themeScope || 'dark_only';
    root.setAttribute('data-sidebar-theme-scope', scope);
    if (body) {
        body.setAttribute('data-sidebar-position', pos);
        body.setAttribute('data-sidebar-theme-scope', scope);
    }

    // Set CSS custom properties on root
    root.style.setProperty('--sidebar-custom-bg', activeColors.bgColor);
    if (applyColors) {
        root.style.setProperty('--sidebar-bg', activeColors.bgColor);
        root.style.setProperty('--surface-sidebar', activeColors.bgColor);
        root.style.setProperty('--sidebar-text-color', activeColors.textColor);
    } else {
        // Fall back to the theme's own sidebar surface (e.g. light mode background)
        THEME_SURFACE_VARS.forEach(v => root.style.removeProperty(v));
    }

    root.style.setProperty('--sidebar-custom-card-bg', activeColors.cardBgColor);
    root.style.setProperty('--sidebar-custom-card-border', activeColors.cardBorderColor);
    root.style.setProperty('--sidebar-custom-card-hover', activeColors.cardHoverBgColor || '#282828');
    root.style.setProperty('--sidebar-custom-card-hover-border', activeColors.cardHoverBorderColor || '#454545');
    root.style.setProperty('--sidebar-custom-card-active', activeColors.activeCardBgColor);
    root.style.setProperty('--sidebar-custom-card-active-border', activeColors.activeCardBorderColor);

    root.style.setProperty('--sidebar-custom-text', activeColors.textColor);
    root.style.setProperty('--sidebar-custom-subtext', activeColors.subtextColor);

    root.style.setProperty('--sidebar-custom-font-size', `${settings.fontSize}px`);
    root.style.setProperty('--sidebar-font-size', `${settings.fontSize}px`);
    root.style.setProperty('--sidebar-custom-card-title-size', `${settings.cardTitleFontSize}px`);
    root.style.setProperty('--sidebar-custom-card-sub-size', `${settings.cardSubFontSize}px`);

    root.style.setProperty('--sidebar-custom-width', `${settings.width}px`);
    root.style.setProperty('--sidebar-width', `${settings.width}px`);
    root.style.setProperty('--sidebar-custom-height', `${settings.height}px`);
    root.style.setProperty('--sidebar-custom-radius', `${settings.borderRadius}px`);
    root.style.setProperty('--sidebar-custom-card-radius', `${settings.cardBorderRadius}px`);
    root.style.setProperty('--sidebar-custom-border-width', `${settings.borderWidth}px`);
    root.style.setProperty('--sidebar-custom-border-color', activeColors.borderColor);
    root.style.setProperty('--sidebar-custom-border-style', settings.borderStyle || 'solid');
    root.style.setProperty('--sidebar-custom-padding', `${settings.padding}px`);
    root.style.setProperty('--sidebar-custom-margin-top', `${settings.marginTop}px`);
    root.style.setProperty('--sidebar-custom-margin-bottom', `${settings.marginBottom}px`);
    root.style.setProperty('--sidebar-custom-margin-left', `${settings.marginLeft}px`);
    root.style.setProperty('--sidebar-custom-margin-right', `${settings.marginRight}px`);

    let shadowValue = 'none';
    if (settings.boxShadow === 'soft') shadowValue = '0 4px 16px rgba(0, 0, 0, 0.12)';
    else if (settings.boxShadow === 'medium') shadowValue = '0 8px 24px rgba(0, 0, 0, 0.22)';
    else if (settings.boxShadow === 'floating') shadowValue = '0 16px 36px rgba(0, 0, 0, 0.32)';
    else if (settings.boxShadow === 'glow') shadowValue = '0 0 24px rgba(59, 130, 246, 0.35)';
    root.style.setProperty('--sidebar-custom-shadow', shadowValue);
};

export const SidebarUIProvider = ({ children }) => {
    const [rawSettings, setRawSettings] = useState(() => {
        try {
            const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                const migrated = migrateSidebarSettings(parsed);
                if (migrated !== parsed) {
                    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(migrated));
                }
                return migrated;
            }
        } catch (e) {
            console.error('Failed to parse sidebar custom UI from storage:', e);
        }
        return DEFAULT_SIDEBAR_UI;
    });

    const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
    const [isDarkTheme, setIsDarkTheme] = useState(isDarkThemeActive);

    // Track light/dark theme switches so sidebar colors re-sync instantly
    useEffect(() => {
        if (typeof MutationObserver === 'undefined') return;
        const update = () => setIsDarkTheme(isDarkThemeActive());
        const observer = new MutationObserver(update);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
        if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        update();
        return () => observer.disconnect();
    }, []);

    // Synchronize settings with DOM upon mounting, changes and theme switches
    useEffect(() => {
        applySidebarSettingsToDOM(rawSettings);
    }, [rawSettings, isDarkTheme]);

    const applyCustomColors = shouldApplySidebarColors(rawSettings, isDarkTheme);
    const activeColors = resolveActiveColors(rawSettings, isDarkTheme);

    // Resolved view: layout attributes + active theme colors at root
    const resolvedSidebarSettings = {
        ...rawSettings,
        ...activeColors,
    };

    const updateSidebarSettings = useCallback((updates) => {
        setRawSettings(prev => {
            let next = { ...prev };

            if (updates.darkConfig) {
                next.darkConfig = { ...(next.darkConfig || {}), ...updates.darkConfig };
            }
            if (updates.lightConfig) {
                next.lightConfig = { ...(next.lightConfig || {}), ...updates.lightConfig };
            }

            Object.keys(updates).forEach(key => {
                if (key === 'darkConfig' || key === 'lightConfig') return;

                if (COLOR_KEYS.includes(key)) {
                    const targetMode = updates.targetMode ||
                        (prev.themeScope === 'light_only' ? 'light' : prev.themeScope === 'dark_only' ? 'dark' : (isDarkThemeActive() ? 'dark' : 'light'));
                    const configKey = targetMode === 'light' ? 'lightConfig' : 'darkConfig';
                    next[configKey] = {
                        ...(next[configKey] || {}),
                        [key]: updates[key]
                    };
                } else {
                    next[key] = updates[key];
                }
            });

            try {
                localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(next));
            } catch (err) {
                console.error('Failed to save sidebar custom UI:', err);
            }
            applySidebarSettingsToDOM(next);
            return next;
        });
    }, []);

    const updateModeColor = useCallback((mode, field, value) => {
        setRawSettings(prev => {
            const configKey = mode === 'light' ? 'lightConfig' : 'darkConfig';
            const updatedConfig = {
                ...(prev[configKey] || (mode === 'light' ? DEFAULT_LIGHT_COLORS : DEFAULT_DARK_COLORS)),
                [field]: value
            };
            const next = {
                ...prev,
                [configKey]: updatedConfig
            };
            try {
                localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(next));
            } catch (err) {
                console.error('Failed to save sidebar custom UI:', err);
            }
            applySidebarSettingsToDOM(next);
            return next;
        });
    }, []);

    const resetSidebarSettings = useCallback(() => {
        setRawSettings(DEFAULT_SIDEBAR_UI);
        try {
            localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(DEFAULT_SIDEBAR_UI));
        } catch (err) {
            console.error('Failed to reset sidebar custom UI:', err);
        }
        applySidebarSettingsToDOM(DEFAULT_SIDEBAR_UI);
    }, []);

    const applyPreset = useCallback((preset) => {
        if (!preset || !preset.settings) return;
        setRawSettings(prev => {
            const targetMode = preset.targetMode || (preset.id === 'clean-white' ? 'light' : 'dark');
            const configKey = targetMode === 'light' ? 'lightConfig' : 'darkConfig';

            const colorUpdates = {};
            COLOR_KEYS.forEach(k => {
                if (preset.settings[k] !== undefined) colorUpdates[k] = preset.settings[k];
            });

            const next = {
                ...prev,
                ...preset.settings,
                themeScope: preset.settings.themeScope || (targetMode === 'light' ? 'light_only' : 'dark_only'),
                [configKey]: {
                    ...(prev[configKey] || {}),
                    ...colorUpdates,
                }
            };
            try {
                localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(next));
            } catch (err) {
                console.error('Failed to save preset sidebar custom UI:', err);
            }
            applySidebarSettingsToDOM(next);
            return next;
        });
    }, []);

    // Listen for custom open event
    useEffect(() => {
        const handleOpen = () => setIsCustomizerOpen(prev => !prev);
        window.addEventListener('safemailz-open-sidebar-customizer', handleOpen);
        return () => window.removeEventListener('safemailz-open-sidebar-customizer', handleOpen);
    }, []);

    return (
        <SidebarUIContext.Provider
            value={{
                sidebarSettings: resolvedSidebarSettings,
                rawSettings,
                isDarkTheme,
                applyCustomColors,
                updateSidebarSettings,
                updateModeColor,
                resetSidebarSettings,
                applyPreset,
                isCustomizerOpen,
                setIsCustomizerOpen,
            }}
        >
            {children}
        </SidebarUIContext.Provider>
    );
};

export const useSidebarUI = () => {
    const context = useContext(SidebarUIContext);
    if (!context) {
        return {
            sidebarSettings: DEFAULT_SIDEBAR_UI,
            rawSettings: DEFAULT_SIDEBAR_UI,
            isDarkTheme: isDarkThemeActive(),
            applyCustomColors: shouldApplySidebarColors(DEFAULT_SIDEBAR_UI),
            updateSidebarSettings: () => {},
            updateModeColor: () => {},
            resetSidebarSettings: () => {},
            applyPreset: () => {},
            isCustomizerOpen: false,
            setIsCustomizerOpen: () => {},
        };
    }
    return context;
};
