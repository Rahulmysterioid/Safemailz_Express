import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './HeaderBorderTweakPopover.css';

export const DEFAULT_HEADER_UI_CONFIG = {
    // Master Accent Controls
    enabled: true,
    borderWidth: 3.5,
    gradientWidth: 200,
    gradientHeight: 2,
    borderRadius: 0,
    rowGap: 0,
    rowMarginLeft: 0,
    rowMarginTop: 0,

    // Header Block & Container Vertical Positioning
    blockOffsetY: 0,
    containerPaddingTop: 4,
    containerPaddingBottom: 8,
    containerPaddingLeft: 24,
    containerPaddingRight: 24,

    // Row Accent Colors
    clientColor: '#2563EB',
    clientGradientEnd: '#6366F1',
    subjectColor: '#4F46E5',
    subjectGradientEnd: '#8B5CF6',
    emailNoColor: '#0284C7',
    emailNoGradientEnd: '#38BDF8',

    // Row 1 (Client) Surface & Style
    clientBorderWidth: 3.5,
    clientGradientWidth: 200,
    clientGradientHeight: 2,
    clientBorderRadius: 0,
    clientBgStyle: 'transparent', // 'solid' | 'tint' | 'glass' | 'transparent'
    clientBgColor: '#FFFFFF',
    clientBgOpacity: 100,
    clientPaddingY: 6,
    clientPaddingX: 10,
    clientMarginLeft: 0,
    clientMarginTop: 0,
    clientFontSize: 14,
    clientFontWeight: '600',
    clientTextColor: '#475569',

    // Row 2 (Subject) Surface & Style
    subjectBorderWidth: 3.5,
    subjectGradientWidth: 200,
    subjectGradientHeight: 2,
    subjectBorderRadius: 0,
    subjectBgStyle: 'transparent',
    subjectBgColor: '#FFFFFF',
    subjectBgOpacity: 100,
    subjectPaddingY: 6,
    subjectPaddingX: 10,
    subjectMarginLeft: 0,
    subjectMarginTop: 0,
    subjectFontSize: 16,
    subjectFontWeight: '700',
    subjectTextColor: '#0F172A',

    // Row 3 (Email No) Surface & Style
    emailNoBorderWidth: 3.5,
    emailNoGradientWidth: 200,
    emailNoGradientHeight: 2,
    emailNoBorderRadius: 4,
    emailNoDisplayMode: 'bar', // 'bar' | 'pill' | 'card'
    emailNoBgStyle: 'solid',
    emailNoBgColor: '#F1F5F9',
    emailNoBgOpacity: 100,
    emailNoPaddingY: 6,
    emailNoPaddingX: 12,
    emailNoMarginLeft: 0,
    emailNoMarginTop: 0,
    emailNoFontSize: 13,
    emailNoFontWeight: '700',
    emailNoTextColor: '#1D4ED8',
    emailNoFontStyle: 'sans', // 'sans' | 'mono'

    // Elevation
    boxShadowPreset: 'none' // 'none' | 'sm' | 'md' | 'glow'
};

// Backwards compatibility alias
export const DEFAULT_BORDER_ACCENT_SETTINGS = DEFAULT_HEADER_UI_CONFIG;

// Helper to resolve row-specific background style
export const getHeaderRowBg = (bgStyle, bgColor, opacity, accentColor) => {
    if (bgStyle === 'transparent') return 'transparent';
    if (bgStyle === 'tint') return `linear-gradient(90deg, ${accentColor}18, ${accentColor}06)`;
    if (bgStyle === 'glass') return 'rgba(255, 255, 255, 0.7)';
    if (opacity !== undefined && opacity < 100) {
        const hex = (bgColor || '#FFFFFF').replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) || 255;
        const g = parseInt(hex.substring(2, 4), 16) || 255;
        const b = parseInt(hex.substring(4, 6), 16) || 255;
        return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
    }
    return bgColor || '#FFFFFF';
};

// Helper to resolve box shadow preset
export const getHeaderBoxShadow = (boxShadowPreset, accentColor) => {
    if (boxShadowPreset === 'sm') return '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
    if (boxShadowPreset === 'md') return '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
    if (boxShadowPreset === 'glow') return `0 0 12px ${accentColor || '#3B82F6'}33`;
    return 'none';
};

export const ACCENT_PRESETS = [
    {
        id: 'default',
        name: 'Enterprise Blue',
        clientColor: '#2563EB',
        clientGradientEnd: '#6366F1',
        subjectColor: '#4F46E5',
        subjectGradientEnd: '#8B5CF6',
        emailNoColor: '#0284C7',
        emailNoGradientEnd: '#38BDF8',
        borderWidth: 3.5,
        gradientWidth: 200,
        gradientHeight: 2,
        emailNoBgColor: '#F1F5F9',
        emailNoTextColor: '#1D4ED8',
        borderRadius: 0,
        rowGap: 0
    },
    {
        id: 'ocean',
        name: 'Ocean Cyan',
        clientColor: '#0284C7',
        clientGradientEnd: '#06B6D4',
        subjectColor: '#0284C7',
        subjectGradientEnd: '#38BDF8',
        emailNoColor: '#0891B2',
        emailNoGradientEnd: '#22D3EE',
        borderWidth: 3.5,
        gradientWidth: 220,
        gradientHeight: 2,
        emailNoBgColor: '#ECFEFF',
        emailNoTextColor: '#0E7490',
        borderRadius: 0,
        rowGap: 0
    },
    {
        id: 'emerald',
        name: 'Emerald Mint',
        clientColor: '#059669',
        clientGradientEnd: '#10B981',
        subjectColor: '#0D9488',
        subjectGradientEnd: '#34D399',
        emailNoColor: '#059669',
        emailNoGradientEnd: '#6EE7B7',
        borderWidth: 3.5,
        gradientWidth: 200,
        gradientHeight: 2,
        emailNoBgColor: '#F0FDF4',
        emailNoTextColor: '#047857',
        borderRadius: 0,
        rowGap: 0
    },
    {
        id: 'purple',
        name: 'Cyber Purple',
        clientColor: '#7C3AED',
        clientGradientEnd: '#A855F7',
        subjectColor: '#6366F1',
        subjectGradientEnd: '#C084FC',
        emailNoColor: '#9333EA',
        emailNoGradientEnd: '#E879F9',
        borderWidth: 4,
        gradientWidth: 220,
        gradientHeight: 2.5,
        emailNoBgColor: '#FAF5FF',
        emailNoTextColor: '#7E22CE',
        borderRadius: 2,
        rowGap: 0
    },
    {
        id: 'sunset',
        name: 'Sunset Flame',
        clientColor: '#D97706',
        clientGradientEnd: '#EA580C',
        subjectColor: '#E11D48',
        subjectGradientEnd: '#FB7185',
        emailNoColor: '#EA580C',
        emailNoGradientEnd: '#F97316',
        borderWidth: 3.5,
        gradientWidth: 200,
        gradientHeight: 2,
        emailNoBgColor: '#FFFBEB',
        emailNoTextColor: '#B45309',
        borderRadius: 0,
        rowGap: 0
    },
    {
        id: 'minimal',
        name: 'Subtle Slate',
        clientColor: '#475569',
        clientGradientEnd: '#2563EB',
        subjectColor: '#334155',
        subjectGradientEnd: '#4F46E5',
        emailNoColor: '#475569',
        emailNoGradientEnd: '#94A3B8',
        borderWidth: 2,
        gradientWidth: 160,
        gradientHeight: 1.5,
        emailNoBgColor: '#F8FAFC',
        emailNoTextColor: '#334155',
        borderRadius: 0,
        rowGap: 0
    },
    {
        id: 'modern_cards',
        name: 'Floating Cards',
        clientColor: '#2563EB',
        clientGradientEnd: '#6366F1',
        subjectColor: '#4F46E5',
        subjectGradientEnd: '#8B5CF6',
        emailNoColor: '#2563EB',
        emailNoGradientEnd: '#38BDF8',
        borderWidth: 3.5,
        gradientWidth: 180,
        gradientHeight: 2,
        emailNoBgColor: '#EFF6FF',
        emailNoTextColor: '#1D4ED8',
        borderRadius: 6,
        rowGap: 4,
        boxShadowPreset: 'sm'
    },
    {
        id: 'glassy',
        name: 'Frosted Glass',
        clientColor: '#3B82F6',
        clientGradientEnd: '#60A5FA',
        subjectColor: '#6366F1',
        subjectGradientEnd: '#818CF8',
        emailNoColor: '#2563EB',
        emailNoGradientEnd: '#93C5FD',
        borderWidth: 3,
        gradientWidth: 180,
        gradientHeight: 2,
        clientBgStyle: 'glass',
        subjectBgStyle: 'glass',
        emailNoBgStyle: 'glass',
        emailNoBgColor: '#FFFFFF',
        emailNoTextColor: '#1D4ED8',
        borderRadius: 8,
        rowGap: 4,
        boxShadowPreset: 'sm'
    }
];

export const COLOR_SWATCHES = [
    '#2563EB', // Blue
    '#4F46E5', // Indigo
    '#7C3AED', // Purple
    '#0284C7', // Sky
    '#0891B2', // Cyan
    '#059669', // Emerald
    '#16A34A', // Green
    '#D97706', // Amber
    '#EA580C', // Orange
    '#E11D48', // Rose
    '#EC4899', // Pink
    '#475569', // Slate
    '#0F172A', // Dark Navy
    '#F1F5F9', // Light Slate
    '#EFF6FF', // Soft Blue
    '#FFFFFF'  // White
];

const SWATCH_GRADIENT_PAIRS = {
    '#2563EB': '#6366F1',
    '#4F46E5': '#8B5CF6',
    '#7C3AED': '#A855F7',
    '#0284C7': '#06B6D4',
    '#0891B2': '#22D3EE',
    '#059669': '#10B981',
    '#16A34A': '#4ADE80',
    '#D97706': '#EA580C',
    '#EA580C': '#FB923C',
    '#E11D48': '#FB7185',
    '#EC4899': '#F472B6',
    '#475569': '#64748B',
    '#0F172A': '#334155',
    '#F1F5F9': '#CBD5E1',
    '#EFF6FF': '#BFDBFE',
    '#FFFFFF': '#F1F5F9'
};

export default function HeaderBorderTweakPopover({
    isOpen,
    onClose,
    settings,
    config,
    onChange,
    onReset
}) {
    const popoverRef = useRef(null);
    const [position, setPosition] = useState({ top: 90, right: 26 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const [savedNotification, setSavedNotification] = useState(false);

    // Active Target Row: 'all' | 'client' | 'subject' | 'emailNo'
    const [targetTab, setTargetTab] = useState('all');
    // Active Customization Category: 'accents' | 'surface' | 'spacing' | 'typography' | 'emailNoMode'
    const [categoryTab, setCategoryTab] = useState('accents');

    // Support both `settings` or `config` prop
    const currentConfig = { ...DEFAULT_HEADER_UI_CONFIG, ...(config || settings || {}) };

    const updateConfig = (updates) => {
        onChange({ ...currentConfig, ...updates });
    };

    // Helper to update configuration based on targetTab ('all' | 'client' | 'subject' | 'emailNo')
    const updateRowConfig = (propKey, value) => {
        if (targetTab === 'all') {
            if (propKey === 'borderWidth') {
                updateConfig({ borderWidth: value, clientBorderWidth: value, subjectBorderWidth: value, emailNoBorderWidth: value });
            } else if (propKey === 'gradientWidth') {
                updateConfig({ gradientWidth: value, clientGradientWidth: value, subjectGradientWidth: value, emailNoGradientWidth: value });
            } else if (propKey === 'gradientHeight') {
                updateConfig({ gradientHeight: value, clientGradientHeight: value, subjectGradientHeight: value, emailNoGradientHeight: value });
            } else if (propKey === 'borderRadius') {
                updateConfig({ borderRadius: value, clientBorderRadius: value, subjectBorderRadius: value, emailNoBorderRadius: value });
            } else if (propKey === 'bgStyle') {
                updateConfig({ clientBgStyle: value, subjectBgStyle: value, emailNoBgStyle: value });
            } else if (propKey === 'bgColor') {
                updateConfig({ clientBgColor: value, subjectBgColor: value, emailNoBgColor: value });
            } else if (propKey === 'bgOpacity') {
                updateConfig({ clientBgOpacity: value, subjectBgOpacity: value, emailNoBgOpacity: value });
            } else if (propKey === 'paddingY') {
                updateConfig({ clientPaddingY: value, subjectPaddingY: value, emailNoPaddingY: value });
            } else if (propKey === 'paddingX') {
                updateConfig({ clientPaddingX: value, subjectPaddingX: value, emailNoPaddingX: value });
            } else if (propKey === 'marginTop') {
                updateConfig({ rowMarginTop: value, clientMarginTop: value, subjectMarginTop: value, emailNoMarginTop: value });
            } else if (propKey === 'marginLeft') {
                updateConfig({ rowMarginLeft: value, clientMarginLeft: value, subjectMarginLeft: value, emailNoMarginLeft: value });
            } else if (propKey === 'fontSize') {
                updateConfig({ clientFontSize: value, subjectFontSize: value + 2, emailNoFontSize: Math.max(11, value - 1) });
            } else if (propKey === 'fontWeight') {
                updateConfig({ clientFontWeight: value, subjectFontWeight: value, emailNoFontWeight: value });
            } else if (propKey === 'textColor') {
                updateConfig({ clientTextColor: value, subjectTextColor: value, emailNoTextColor: value });
            } else {
                updateConfig({ [propKey]: value });
            }
        } else {
            const specificKey = `${targetTab}${propKey.charAt(0).toUpperCase() + propKey.slice(1)}`;
            updateConfig({ [specificKey]: value });
        }
    };

    // Helper to get configuration value based on targetTab
    const getRowConfig = (propKey, fallback) => {
        if (targetTab === 'client') {
            const specificKey = `client${propKey.charAt(0).toUpperCase() + propKey.slice(1)}`;
            return currentConfig[specificKey] ?? currentConfig[propKey] ?? (propKey === 'marginLeft' ? currentConfig.rowMarginLeft : undefined) ?? (propKey === 'marginTop' ? currentConfig.rowMarginTop : undefined) ?? fallback;
        }
        if (targetTab === 'subject') {
            const specificKey = `subject${propKey.charAt(0).toUpperCase() + propKey.slice(1)}`;
            return currentConfig[specificKey] ?? currentConfig[propKey] ?? (propKey === 'marginLeft' ? currentConfig.rowMarginLeft : undefined) ?? (propKey === 'marginTop' ? currentConfig.rowMarginTop : undefined) ?? fallback;
        }
        if (targetTab === 'emailNo') {
            const specificKey = `emailNo${propKey.charAt(0).toUpperCase() + propKey.slice(1)}`;
            return currentConfig[specificKey] ?? currentConfig[propKey] ?? (propKey === 'marginLeft' ? currentConfig.rowMarginLeft : undefined) ?? (propKey === 'marginTop' ? currentConfig.rowMarginTop : undefined) ?? fallback;
        }
        return currentConfig[propKey] ?? (propKey === 'marginLeft' ? currentConfig.rowMarginLeft : undefined) ?? (propKey === 'marginTop' ? currentConfig.rowMarginTop : undefined) ?? currentConfig[`client${propKey.charAt(0).toUpperCase() + propKey.slice(1)}`] ?? fallback;
    };

    const handleSave = () => {
        onChange(currentConfig);
        try {
            localStorage.setItem('safemailz_header_ui_config', JSON.stringify(currentConfig));
            localStorage.setItem('safemailz_reading_border_accents', JSON.stringify(currentConfig));
        } catch (e) {}
        setSavedNotification(true);
        setTimeout(() => {
            setSavedNotification(false);
            onClose();
        }, 600);
    };

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Dragging support
    const handleMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.tweak-category-tabs')) {
            return;
        }
        setIsDragging(true);
        if (popoverRef.current) {
            const rect = popoverRef.current.getBoundingClientRect();
            dragOffsetRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            const width = popoverRef.current?.offsetWidth || 360;
            const height = popoverRef.current?.offsetHeight || 560;

            let newLeft = e.clientX - dragOffsetRef.current.x;
            let newTop = e.clientY - dragOffsetRef.current.y;

            newLeft = Math.max(10, Math.min(newLeft, window.innerWidth - width - 10));
            newTop = Math.max(10, Math.min(newTop, window.innerHeight - height - 10));

            const newRight = window.innerWidth - newLeft - width;
            setPosition({ top: newTop, right: newRight });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    if (!isOpen) return null;

    // Helper to resolve row-specific background preview
    const getPreviewBg = getHeaderRowBg;

    return ReactDOM.createPortal(
        <div
            ref={popoverRef}
            className="header-border-tweak-card"
            style={{
                position: 'fixed',
                top: `${position.top}px`,
                right: `${position.right}px`,
                zIndex: 100050
            }}
        >
            {/* Popover Header with Drag Handle */}
            <div
                className="tweak-card-header"
                onMouseDown={handleMouseDown}
                title="Drag to reposition this customizer"
            >
                <div className="tweak-header-title-row">
                    <span className="tweak-header-icon">🎨</span>
                    <div>
                        <h4 className="tweak-header-title">Header UI Customizer</h4>
                        <span className="tweak-header-subtitle">Client, Subject & Email No. Styling</span>
                    </div>
                </div>
                <button
                    type="button"
                    className="tweak-close-btn"
                    onClick={onClose}
                    title="Close (Esc)"
                    aria-label="Close customizer"
                >
                    ✕
                </button>
            </div>

            {/* Target Row Switcher Tabs */}
            <div className="tweak-target-row-bar">
                <span className="tweak-target-label">Target Row:</span>
                <div className="tweak-segmented-group">
                    <button
                        type="button"
                        className={`tweak-segment-btn ${targetTab === 'all' ? 'is-active' : ''}`}
                        onClick={() => setTargetTab('all')}
                    >
                        All Rows
                    </button>
                    <button
                        type="button"
                        className={`tweak-segment-btn ${targetTab === 'client' ? 'is-active' : ''}`}
                        onClick={() => setTargetTab('client')}
                    >
                        Client
                    </button>
                    <button
                        type="button"
                        className={`tweak-segment-btn ${targetTab === 'subject' ? 'is-active' : ''}`}
                        onClick={() => setTargetTab('subject')}
                    >
                        Subject
                    </button>
                    <button
                        type="button"
                        className={`tweak-segment-btn ${targetTab === 'emailNo' ? 'is-active' : ''}`}
                        onClick={() => {
                            setTargetTab('emailNo');
                            if (categoryTab !== 'emailNoMode' && categoryTab !== 'surface') {
                                setCategoryTab('emailNoMode');
                            }
                        }}
                    >
                        Email No.
                    </button>
                </div>
            </div>

            {/* Category Navigation Bar */}
            <div className="tweak-category-tabs">
                <button
                    type="button"
                    className={`tweak-cat-btn ${categoryTab === 'accents' ? 'is-active' : ''}`}
                    onClick={() => setCategoryTab('accents')}
                >
                    🎨 Accents
                </button>
                <button
                    type="button"
                    className={`tweak-cat-btn ${categoryTab === 'surface' ? 'is-active' : ''}`}
                    onClick={() => setCategoryTab('surface')}
                >
                    🖼️ Surface
                </button>
                <button
                    type="button"
                    className={`tweak-cat-btn ${categoryTab === 'spacing' ? 'is-active' : ''}`}
                    onClick={() => setCategoryTab('spacing')}
                >
                    📐 Spacing
                </button>
                <button
                    type="button"
                    className={`tweak-cat-btn ${categoryTab === 'typography' ? 'is-active' : ''}`}
                    onClick={() => setCategoryTab('typography')}
                >
                    ✏️ Text
                </button>
                <button
                    type="button"
                    className={`tweak-cat-btn ${categoryTab === 'emailNoMode' ? 'is-active' : ''}`}
                    onClick={() => setCategoryTab('emailNoMode')}
                >
                    🏷️ Email No.
                </button>
            </div>

            {/* Live Mini Preview Box */}
            <div
                className="tweak-live-preview-box"
                style={{
                    paddingTop: `${Math.max(2, (currentConfig.containerPaddingTop ?? 4) * 0.6)}px`,
                    paddingBottom: `${Math.max(2, (currentConfig.containerPaddingBottom ?? 8) * 0.6)}px`,
                    paddingLeft: `${Math.max(2, (currentConfig.containerPaddingLeft ?? 24) * 0.4)}px`,
                    overflow: 'hidden'
                }}
            >
                <div className="tweak-preview-badge">Live Preview</div>

                <div
                    style={{
                        marginTop: `${(currentConfig.blockOffsetY ?? 0) * 0.4}px`,
                        transition: 'all 0.15s ease'
                    }}
                >
                    {/* Row 1 Client Preview */}
                    <div
                        className="tweak-preview-row"
                        style={{
                            position: 'relative',
                            marginTop: `${(currentConfig.clientMarginTop ?? currentConfig.rowMarginTop ?? 0) * 0.4}px`,
                            padding: `${Math.max(1, (currentConfig.clientPaddingY ?? 6) - 2)}px ${Math.max(2, (currentConfig.clientPaddingX ?? 10) * 0.6)}px`,
                            marginLeft: `${((currentConfig.clientMarginLeft ?? currentConfig.rowMarginLeft ?? 0) * 0.4)}px`,
                            marginBottom: `${currentConfig.rowGap ?? 0}px`,
                            borderRadius: `${currentConfig.clientBorderRadius ?? currentConfig.borderRadius ?? 0}px`,
                            background: getPreviewBg(currentConfig.clientBgStyle, currentConfig.clientBgColor, currentConfig.clientBgOpacity, currentConfig.clientColor),
                            borderLeft: (currentConfig.enabled && (currentConfig.clientBorderWidth ?? currentConfig.borderWidth ?? 3.5) > 0) ? `${Math.min(currentConfig.clientBorderWidth ?? currentConfig.borderWidth ?? 3.5, 4)}px solid ${currentConfig.clientColor}` : 'none',
                            borderBottom: '1px solid #e2e8f0',
                            fontSize: `${Math.max(10, (currentConfig.clientFontSize ?? 14) - 3)}px`,
                            color: currentConfig.clientTextColor,
                            fontWeight: currentConfig.clientFontWeight
                        }}
                    >
                        Client Name:- <span style={{ textTransform: 'capitalize' }}>Pinterest</span>
                        {currentConfig.enabled && (currentConfig.clientGradientWidth ?? currentConfig.gradientWidth ?? 200) > 0 && (
                            <span
                                style={{
                                    position: 'absolute',
                                    bottom: '-1px',
                                    left: 0,
                                    height: `${currentConfig.clientGradientHeight ?? currentConfig.gradientHeight ?? 2}px`,
                                    width: `${Math.min(currentConfig.clientGradientWidth ?? currentConfig.gradientWidth ?? 200, 120)}px`,
                                    background: `linear-gradient(90deg, ${currentConfig.clientColor} 0%, ${currentConfig.clientGradientEnd} 60%, transparent 100%)`,
                                    pointerEvents: 'none'
                                }}
                            />
                        )}
                    </div>

                    {/* Row 2 Subject Preview */}
                    <div
                        className="tweak-preview-row"
                        style={{
                            position: 'relative',
                            marginTop: `${(currentConfig.subjectMarginTop ?? currentConfig.rowMarginTop ?? 0) * 0.4}px`,
                            padding: `${Math.max(1, (currentConfig.subjectPaddingY ?? 6) - 2)}px ${Math.max(2, (currentConfig.subjectPaddingX ?? 10) * 0.6)}px`,
                            marginLeft: `${((currentConfig.subjectMarginLeft ?? currentConfig.rowMarginLeft ?? 0) * 0.4)}px`,
                            marginBottom: `${currentConfig.rowGap ?? 0}px`,
                            borderRadius: `${currentConfig.subjectBorderRadius ?? currentConfig.borderRadius ?? 0}px`,
                            background: getPreviewBg(currentConfig.subjectBgStyle, currentConfig.subjectBgColor, currentConfig.subjectBgOpacity, currentConfig.subjectColor),
                            borderLeft: (currentConfig.enabled && (currentConfig.subjectBorderWidth ?? currentConfig.borderWidth ?? 3.5) > 0) ? `${Math.min(currentConfig.subjectBorderWidth ?? currentConfig.borderWidth ?? 3.5, 4)}px solid ${currentConfig.subjectColor}` : 'none',
                            borderBottom: '1px solid #e2e8f0',
                            fontSize: `${Math.max(11, (currentConfig.subjectFontSize ?? 16) - 3)}px`,
                            color: currentConfig.subjectTextColor,
                            fontWeight: currentConfig.subjectFontWeight
                        }}
                    >
                        Subject: <b style={{ fontWeight: currentConfig.subjectFontWeight }}>Singhrahuldrill, this is gold</b>
                        {currentConfig.enabled && (currentConfig.subjectGradientWidth ?? currentConfig.gradientWidth ?? 200) > 0 && (
                            <span
                                style={{
                                    position: 'absolute',
                                    bottom: '-1px',
                                    left: 0,
                                    height: `${currentConfig.subjectGradientHeight ?? currentConfig.gradientHeight ?? 2}px`,
                                    width: `${Math.min(currentConfig.subjectGradientWidth ?? currentConfig.gradientWidth ?? 200, 120)}px`,
                                    background: `linear-gradient(90deg, ${currentConfig.subjectColor} 0%, ${currentConfig.subjectGradientEnd} 60%, transparent 100%)`,
                                    pointerEvents: 'none'
                                }}
                            />
                        )}
                    </div>

                    {/* Row 3 Email No Preview */}
                    <div
                        className="tweak-preview-row"
                        style={{
                            position: 'relative',
                            display: currentConfig.emailNoDisplayMode === 'pill' ? 'inline-flex' : 'block',
                            marginTop: `${(currentConfig.emailNoMarginTop ?? currentConfig.rowMarginTop ?? 0) * 0.4}px`,
                            padding: `${Math.max(1, (currentConfig.emailNoPaddingY ?? 6) - 2)}px ${Math.max(2, (currentConfig.emailNoPaddingX ?? 12) * 0.6)}px`,
                            marginLeft: `${((currentConfig.emailNoMarginLeft ?? currentConfig.rowMarginLeft ?? 0) * 0.4)}px`,
                            borderRadius: currentConfig.emailNoDisplayMode === 'pill' ? '9999px' : `${currentConfig.emailNoBorderRadius ?? currentConfig.borderRadius ?? 4}px`,
                            background: getPreviewBg(currentConfig.emailNoBgStyle, currentConfig.emailNoBgColor, currentConfig.emailNoBgOpacity, currentConfig.emailNoColor),
                            borderLeft: (currentConfig.enabled && currentConfig.emailNoDisplayMode === 'bar' && (currentConfig.emailNoBorderWidth ?? currentConfig.borderWidth ?? 3.5) > 0) ? `${Math.min(currentConfig.emailNoBorderWidth ?? currentConfig.borderWidth ?? 3.5, 4)}px solid ${currentConfig.emailNoColor}` : 'none',
                            border: currentConfig.emailNoDisplayMode === 'card' ? '1px solid #cbd5e1' : (currentConfig.emailNoDisplayMode === 'pill' ? `1px solid ${currentConfig.emailNoColor}40` : 'none'),
                            fontSize: `${Math.max(10, (currentConfig.emailNoFontSize ?? 13) - 3)}px`,
                            color: currentConfig.emailNoTextColor,
                            fontWeight: currentConfig.emailNoFontWeight,
                            fontFamily: currentConfig.emailNoFontStyle === 'mono' ? 'monospace' : 'inherit'
                        }}
                    >
                        Email No. : 14333
                    </div>
                </div>
            </div>

            {/* Popover Body Content */}
            <div className="tweak-card-body">

                {/* ========================================================
                    CATEGORY 1: ACCENTS & PRESETS
                   ======================================================== */}
                {categoryTab === 'accents' && (
                    <>
                        {/* Master Toggle */}
                        <div className="tweak-field-row">
                            <div className="tweak-label-block">
                                <span className="tweak-label">Enable Colorful Accents</span>
                                <span className="tweak-hint">Applies to Client, Subject & Email No.</span>
                            </div>
                            <label className="tweak-switch">
                                <input
                                    type="checkbox"
                                    checked={currentConfig.enabled}
                                    onChange={(e) => updateConfig({ enabled: e.target.checked })}
                                />
                                <span className="tweak-slider-round" />
                            </label>
                        </div>

                        {/* Quick Presets */}
                        <div className="tweak-section">
                            <span className="tweak-section-label">Quick Harmonious Presets</span>
                            <div className="tweak-presets-grid">
                                {ACCENT_PRESETS.map((preset) => {
                                    const isActive =
                                        currentConfig.clientColor === preset.clientColor &&
                                        currentConfig.subjectColor === preset.subjectColor;
                                    return (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() =>
                                                updateConfig({
                                                    enabled: true,
                                                    ...preset,
                                                    clientBorderWidth: preset.borderWidth,
                                                    subjectBorderWidth: preset.borderWidth,
                                                    emailNoBorderWidth: preset.borderWidth,
                                                    clientGradientWidth: preset.gradientWidth,
                                                    subjectGradientWidth: preset.gradientWidth,
                                                    emailNoGradientWidth: preset.gradientWidth,
                                                    clientGradientHeight: preset.gradientHeight,
                                                    subjectGradientHeight: preset.gradientHeight,
                                                    emailNoGradientHeight: preset.gradientHeight,
                                                    clientBorderRadius: preset.borderRadius,
                                                    subjectBorderRadius: preset.borderRadius,
                                                    emailNoBorderRadius: preset.borderRadius
                                                })
                                            }
                                            className={`tweak-preset-chip ${isActive ? 'is-active' : ''}`}
                                        >
                                            <span
                                                className="tweak-preset-dot"
                                                style={{
                                                    background: `linear-gradient(135deg, ${preset.clientColor}, ${preset.subjectColor})`
                                                }}
                                            />
                                            <span>{preset.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Left Border Width Slider */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">
                                    Left Border Accent Width {targetTab !== 'all' ? `(${targetTab === 'client' ? 'Client' : (targetTab === 'subject' ? 'Subject' : 'Email No.')})` : ''}
                                </span>
                                <span className="tweak-val-badge">{getRowConfig('borderWidth', 3.5)}px</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="8"
                                step="0.5"
                                value={getRowConfig('borderWidth', 3.5)}
                                onChange={(e) => updateRowConfig('borderWidth', parseFloat(e.target.value))}
                                className="tweak-range-slider"
                            />
                            <div className="tweak-slider-ticks">
                                <span>0px (Off)</span>
                                <span>3.5px (Default)</span>
                                <span>8px (Bold)</span>
                            </div>
                        </div>

                        {/* Bottom Gradient Length Slider */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">
                                    Bottom Gradient Length {targetTab !== 'all' ? `(${targetTab === 'client' ? 'Client' : (targetTab === 'subject' ? 'Subject' : 'Email No.')})` : ''}
                                </span>
                                <span className="tweak-val-badge">{getRowConfig('gradientWidth', 200)}px</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="400"
                                step="10"
                                value={getRowConfig('gradientWidth', 200)}
                                onChange={(e) => updateRowConfig('gradientWidth', parseInt(e.target.value, 10))}
                                className="tweak-range-slider"
                            />
                            <div className="tweak-slider-ticks">
                                <span>0px (Off)</span>
                                <span>200px (Default)</span>
                                <span>400px (Wide)</span>
                            </div>
                        </div>

                        {/* Gradient Line Thickness */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">
                                    Gradient Line Thickness {targetTab !== 'all' ? `(${targetTab === 'client' ? 'Client' : (targetTab === 'subject' ? 'Subject' : 'Email No.')})` : ''}
                                </span>
                                <span className="tweak-val-badge">{getRowConfig('gradientHeight', 2)}px</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="4"
                                step="0.5"
                                value={getRowConfig('gradientHeight', 2)}
                                onChange={(e) => updateRowConfig('gradientHeight', parseFloat(e.target.value))}
                                className="tweak-range-slider"
                            />
                        </div>

                        {/* Corner Radius */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">
                                    Corner Radius (border-radius) {targetTab !== 'all' ? `(${targetTab === 'client' ? 'Client' : (targetTab === 'subject' ? 'Subject' : 'Email No.')})` : ''}
                                </span>
                                <span className="tweak-val-badge">{getRowConfig('borderRadius', 0)}px</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="16"
                                step="1"
                                value={getRowConfig('borderRadius', 0)}
                                onChange={(e) => updateRowConfig('borderRadius', parseInt(e.target.value, 10))}
                                className="tweak-range-slider"
                            />
                            <div className="tweak-slider-ticks">
                                <span>0px (Flush)</span>
                                <span>6px (Rounded)</span>
                                <span>16px (Card)</span>
                            </div>
                        </div>

                        {/* Row 1 Accent Color */}
                        {(targetTab === 'all' || targetTab === 'client') && (
                            <div className="tweak-section">
                                <div className="tweak-section-header-flex">
                                    <span className="tweak-section-label">Client Row Accent Color (Row 1)</span>
                                    <div className="tweak-color-preview-box" style={{ backgroundColor: currentConfig.clientColor }} />
                                </div>
                                <div className="tweak-swatch-row">
                                    {COLOR_SWATCHES.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => {
                                                const gradEnd = SWATCH_GRADIENT_PAIRS[color] || color;
                                                updateConfig({ clientColor: color, clientGradientEnd: gradEnd });
                                            }}
                                            className={`tweak-swatch-btn ${currentConfig.clientColor === color ? 'is-selected' : ''}`}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                    <label className="tweak-custom-color-picker" title="Pick custom color">
                                        <input
                                            type="color"
                                            value={currentConfig.clientColor}
                                            onChange={(e) => updateConfig({ clientColor: e.target.value, clientGradientEnd: e.target.value })}
                                        />
                                        <span>Pick</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Row 2 Accent Color */}
                        {(targetTab === 'all' || targetTab === 'subject') && (
                            <div className="tweak-section">
                                <div className="tweak-section-header-flex">
                                    <span className="tweak-section-label">Subject Row Accent Color (Row 2)</span>
                                    <div className="tweak-color-preview-box" style={{ backgroundColor: currentConfig.subjectColor }} />
                                </div>
                                <div className="tweak-swatch-row">
                                    {COLOR_SWATCHES.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => {
                                                const gradEnd = SWATCH_GRADIENT_PAIRS[color] || color;
                                                updateConfig({ subjectColor: color, subjectGradientEnd: gradEnd });
                                            }}
                                            className={`tweak-swatch-btn ${currentConfig.subjectColor === color ? 'is-selected' : ''}`}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                    <label className="tweak-custom-color-picker" title="Pick custom color">
                                        <input
                                            type="color"
                                            value={currentConfig.subjectColor}
                                            onChange={(e) => updateConfig({ subjectColor: e.target.value, subjectGradientEnd: e.target.value })}
                                        />
                                        <span>Pick</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Row 3 Accent Color */}
                        {(targetTab === 'all' || targetTab === 'emailNo') && (
                            <div className="tweak-section">
                                <div className="tweak-section-header-flex">
                                    <span className="tweak-section-label">Email No. Accent Color (Row 3)</span>
                                    <div className="tweak-color-preview-box" style={{ backgroundColor: currentConfig.emailNoColor }} />
                                </div>
                                <div className="tweak-swatch-row">
                                    {COLOR_SWATCHES.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => {
                                                const gradEnd = SWATCH_GRADIENT_PAIRS[color] || color;
                                                updateConfig({ emailNoColor: color, emailNoGradientEnd: gradEnd });
                                            }}
                                            className={`tweak-swatch-btn ${currentConfig.emailNoColor === color ? 'is-selected' : ''}`}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                    <label className="tweak-custom-color-picker" title="Pick custom color">
                                        <input
                                            type="color"
                                            value={currentConfig.emailNoColor}
                                            onChange={(e) => updateConfig({ emailNoColor: e.target.value, emailNoGradientEnd: e.target.value })}
                                        />
                                        <span>Pick</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ========================================================
                    CATEGORY 2: BACKGROUND & SURFACE STYLING
                   ======================================================== */}
                {categoryTab === 'surface' && (
                    <>
                        {/* Target Row Context Badge */}
                        <div className="tweak-context-badge">
                            Editing Background for: <b>{targetTab === 'all' ? 'All Rows' : (targetTab === 'client' ? 'Client Row' : (targetTab === 'subject' ? 'Subject Row' : 'Email No.'))}</b>
                        </div>

                        {/* Fill Style Selector */}
                        <div className="tweak-section">
                            <span className="tweak-section-label">Surface Fill Style</span>
                            <div className="tweak-segmented-group">
                                {['solid', 'tint', 'glass', 'transparent'].map((styleKey) => {
                                    const currentStyle = getRowConfig('bgStyle', 'transparent');
                                    return (
                                        <button
                                            key={styleKey}
                                            type="button"
                                            className={`tweak-segment-btn ${currentStyle === styleKey ? 'is-active' : ''}`}
                                            onClick={() => updateRowConfig('bgStyle', styleKey)}
                                        >
                                            {styleKey.charAt(0).toUpperCase() + styleKey.slice(1)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Background Color Picker */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">Background Base Color</span>
                                <div
                                    className="tweak-color-preview-box"
                                    style={{
                                        backgroundColor: getRowConfig('bgColor', '#FFFFFF')
                                    }}
                                />
                            </div>
                            <div className="tweak-swatch-row">
                                {COLOR_SWATCHES.map((color) => {
                                    const currentColor = getRowConfig('bgColor', '#FFFFFF');
                                    return (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => updateRowConfig('bgColor', color)}
                                            className={`tweak-swatch-btn ${currentColor === color ? 'is-selected' : ''}`}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    );
                                })}
                                <label className="tweak-custom-color-picker" title="Pick custom color">
                                    <input
                                        type="color"
                                        value={getRowConfig('bgColor', '#FFFFFF')}
                                        onChange={(e) => updateRowConfig('bgColor', e.target.value)}
                                    />
                                    <span>Pick</span>
                                </label>
                            </div>
                        </div>

                        {/* Background Opacity Slider */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">Background Opacity</span>
                                <span className="tweak-val-badge">
                                    {getRowConfig('bgOpacity', 100)}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={getRowConfig('bgOpacity', 100)}
                                onChange={(e) => updateRowConfig('bgOpacity', parseInt(e.target.value, 10))}
                                className="tweak-range-slider"
                            />
                        </div>

                        {/* Elevation / Shadow Preset */}
                        <div className="tweak-section">
                            <span className="tweak-section-label">Elevation & Box Shadow</span>
                            <div className="tweak-segmented-group">
                                {[
                                    { key: 'none', label: 'None' },
                                    { key: 'sm', label: 'Subtle' },
                                    { key: 'md', label: 'Elevated' },
                                    { key: 'glow', label: 'Glow' }
                                ].map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        className={`tweak-segment-btn ${currentConfig.boxShadowPreset === item.key ? 'is-active' : ''}`}
                                        onClick={() => updateConfig({ boxShadowPreset: item.key })}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* ========================================================
                    CATEGORY 3: SPACING & BOX MODEL
                   ======================================================== */}
                {categoryTab === 'spacing' && (
                    <>
                        {/* Target Context */}
                        <div className="tweak-context-badge">
                            Editing Spacing for: <b>{targetTab === 'all' ? 'All Rows' : (targetTab === 'client' ? 'Client Row' : (targetTab === 'subject' ? 'Subject Row' : 'Email No.'))}</b>
                        </div>

                        {/* 1. Header Block Vertical Offset (Entire 3-row group move up/down) */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">Header Block Upward Offset (Move Up / Down)</span>
                                <span className="tweak-val-badge">
                                    {(currentConfig.blockOffsetY ?? 0) > 0 ? `+${currentConfig.blockOffsetY}px (Down)` : ((currentConfig.blockOffsetY ?? 0) < 0 ? `${currentConfig.blockOffsetY}px (Up)` : '0px (Default)')}
                                </span>
                            </div>

                            {/* Quick Preset Pills */}
                            <div className="tweak-preset-pills-row">
                                {[
                                    { label: 'Move Up Max (-24px)', val: -24 },
                                    { label: 'Tight Top (-12px)', val: -12 },
                                    { label: 'Default (0px)', val: 0 },
                                    { label: 'Move Down (+12px)', val: 12 }
                                ].map((pill) => (
                                    <button
                                        key={pill.val}
                                        type="button"
                                        className={`tweak-preset-pill ${(currentConfig.blockOffsetY ?? 0) === pill.val ? 'is-active' : ''}`}
                                        onClick={() => updateConfig({ blockOffsetY: pill.val })}
                                    >
                                        {pill.label}
                                    </button>
                                ))}
                            </div>

                            <input
                                type="range"
                                min="-48"
                                max="40"
                                step="1"
                                value={currentConfig.blockOffsetY ?? 0}
                                onChange={(e) => updateConfig({ blockOffsetY: parseInt(e.target.value, 10) })}
                                className="tweak-range-slider"
                            />
                            <div className="tweak-slider-ticks">
                                <span>-48px (Max Top)</span>
                                <span>0px (Default)</span>
                                <span>+40px (Down)</span>
                            </div>
                        </div>

                        {/* 2. Container Top Padding (paddingTop of parent header) */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">Container Top Padding (padding-top)</span>
                                <span className="tweak-val-badge">{currentConfig.containerPaddingTop ?? 4}px</span>
                            </div>
                            <div className="tweak-preset-pills-row">
                                {[
                                    { label: 'Flush Top (0px)', val: 0 },
                                    { label: 'Tight (4px)', val: 4 },
                                    { label: 'Default (10px)', val: 10 },
                                    { label: 'Spacious (20px)', val: 20 }
                                ].map((pill) => (
                                    <button
                                        key={pill.val}
                                        type="button"
                                        className={`tweak-preset-pill ${(currentConfig.containerPaddingTop ?? 4) === pill.val ? 'is-active' : ''}`}
                                        onClick={() => updateConfig({ containerPaddingTop: pill.val })}
                                    >
                                        {pill.label}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="32"
                                step="1"
                                value={currentConfig.containerPaddingTop ?? 4}
                                onChange={(e) => updateConfig({ containerPaddingTop: parseInt(e.target.value, 10) })}
                                className="tweak-range-slider"
                            />
                            <div className="tweak-slider-ticks">
                                <span>0px (Flush Top)</span>
                                <span>4px (Tight)</span>
                                <span>32px (Spacious)</span>
                            </div>
                        </div>

                        {/* 3. Container Left Padding (Moves entire 3-row block left / peeche) */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">Container Left Padding (Peeche / Flush Left)</span>
                                <span className="tweak-val-badge">{currentConfig.containerPaddingLeft ?? 24}px</span>
                            </div>
                            <div className="tweak-preset-pills-row">
                                {[
                                    { label: 'Flush Left (0px)', val: 0 },
                                    { label: 'Compact (8px)', val: 8 },
                                    { label: 'Default (24px)', val: 24 },
                                    { label: 'Spacious (36px)', val: 36 }
                                ].map((pill) => (
                                    <button
                                        key={pill.val}
                                        type="button"
                                        className={`tweak-preset-pill ${(currentConfig.containerPaddingLeft ?? 24) === pill.val ? 'is-active' : ''}`}
                                        onClick={() => updateConfig({ containerPaddingLeft: pill.val })}
                                    >
                                        {pill.label}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="48"
                                step="1"
                                value={currentConfig.containerPaddingLeft ?? 24}
                                onChange={(e) => updateConfig({ containerPaddingLeft: parseInt(e.target.value, 10) })}
                                className="tweak-range-slider"
                            />
                            <div className="tweak-slider-ticks">
                                <span>0px (Full Edge / Flush)</span>
                                <span>24px (Default)</span>
                                <span>48px (Wide Inset)</span>
                            </div>
                        </div>

                        {/* 4. Horizontal Shift / Left Margin (Peeche / Aage) */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">Horizontal Shift / Left Margin (Peeche / Aage)</span>
                                <span className="tweak-val-badge">
                                    {getRowConfig('marginLeft', 0) > 0 ? `+${getRowConfig('marginLeft', 0)}px (Aage)` : (getRowConfig('marginLeft', 0) < 0 ? `${getRowConfig('marginLeft', 0)}px (Peeche)` : '0px (Default)')}
                                </span>
                            </div>
                            <div className="tweak-preset-pills-row">
                                {[
                                    { label: 'Full Left (-24px)', val: -24 },
                                    { label: 'Slight Left (-10px)', val: -10 },
                                    { label: 'Default (0px)', val: 0 },
                                    { label: 'Aage Inset (+16px)', val: 16 }
                                ].map((pill) => (
                                    <button
                                        key={pill.val}
                                        type="button"
                                        className={`tweak-preset-pill ${getRowConfig('marginLeft', 0) === pill.val ? 'is-active' : ''}`}
                                        onClick={() => updateRowConfig('marginLeft', pill.val)}
                                    >
                                        {pill.label}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="range"
                                min="-48"
                                max="48"
                                step="1"
                                value={getRowConfig('marginLeft', 0)}
                                onChange={(e) => updateRowConfig('marginLeft', parseInt(e.target.value, 10))}
                                className="tweak-range-slider"
                            />
                            <div className="tweak-slider-ticks">
                                <span>-48px (Full Left / Peeche)</span>
                                <span>0px (Default)</span>
                                <span>+48px (Aage / Inset)</span>
                            </div>
                        </div>

                        {/* 5. Horizontal Padding (Left/Right - Text Inset) */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">Horizontal Padding (Left/Right - Text Inset)</span>
                                <span className="tweak-val-badge">
                                    {getRowConfig('paddingX', 10)}px
                                </span>
                            </div>
                            <div className="tweak-preset-pills-row">
                                {[
                                    { label: 'Flush (0px)', val: 0 },
                                    { label: 'Compact (4px)', val: 4 },
                                    { label: 'Default (10px)', val: 10 },
                                    { label: 'Spacious (20px)', val: 20 }
                                ].map((pill) => (
                                    <button
                                        key={pill.val}
                                        type="button"
                                        className={`tweak-preset-pill ${getRowConfig('paddingX', 10) === pill.val ? 'is-active' : ''}`}
                                        onClick={() => updateRowConfig('paddingX', pill.val)}
                                    >
                                        {pill.label}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="40"
                                step="1"
                                value={getRowConfig('paddingX', 10)}
                                onChange={(e) => updateRowConfig('paddingX', parseInt(e.target.value, 10))}
                                className="tweak-range-slider"
                            />
                            <div className="tweak-slider-ticks">
                                <span>0px (Flush to Accent)</span>
                                <span>10px (Default)</span>
                                <span>40px (Spacious)</span>
                            </div>
                        </div>

                        {/* 6. Per-Row Top Margin (Supports Negative Values to pull rows upward) */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">Row Top Margin (Pull Up / Push Down)</span>
                                <span className="tweak-val-badge">
                                    {getRowConfig('marginTop', 0) > 0 ? `+${getRowConfig('marginTop', 0)}px` : `${getRowConfig('marginTop', 0)}px`}
                                </span>
                            </div>
                            <div className="tweak-preset-pills-row">
                                {[
                                    { label: 'Pull Up (-12px)', val: -12 },
                                    { label: 'Slight Up (-6px)', val: -6 },
                                    { label: 'Normal (0px)', val: 0 },
                                    { label: 'Push Down (+10px)', val: 10 }
                                ].map((pill) => (
                                    <button
                                        key={pill.val}
                                        type="button"
                                        className={`tweak-preset-pill ${getRowConfig('marginTop', 0) === pill.val ? 'is-active' : ''}`}
                                        onClick={() => updateRowConfig('marginTop', pill.val)}
                                    >
                                        {pill.label}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="range"
                                min="-24"
                                max="32"
                                step="1"
                                value={getRowConfig('marginTop', 0)}
                                onChange={(e) => updateRowConfig('marginTop', parseInt(e.target.value, 10))}
                                className="tweak-range-slider"
                            />
                            <div className="tweak-slider-ticks">
                                <span>-24px (Pull Up)</span>
                                <span>0px (Normal)</span>
                                <span>+32px (Push Down)</span>
                            </div>
                        </div>

                        {/* 7. Vertical Padding (Top/Bottom) */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">Vertical Padding (Top/Bottom)</span>
                                <span className="tweak-val-badge">
                                    {getRowConfig('paddingY', 6)}px
                                </span>
                            </div>
                            <div className="tweak-preset-pills-row">
                                {[
                                    { label: 'Compact (2px)', val: 2 },
                                    { label: 'Default (6px)', val: 6 },
                                    { label: 'Spacious (12px)', val: 12 }
                                ].map((pill) => (
                                    <button
                                        key={pill.val}
                                        type="button"
                                        className={`tweak-preset-pill ${getRowConfig('paddingY', 6) === pill.val ? 'is-active' : ''}`}
                                        onClick={() => updateRowConfig('paddingY', pill.val)}
                                    >
                                        {pill.label}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="24"
                                step="1"
                                value={getRowConfig('paddingY', 6)}
                                onChange={(e) => updateRowConfig('paddingY', parseInt(e.target.value, 10))}
                                className="tweak-range-slider"
                            />
                            <div className="tweak-slider-ticks">
                                <span>0px (Ultra Compact)</span>
                                <span>6px (Default)</span>
                                <span>24px (Spacious)</span>
                            </div>
                        </div>

                        {/* 8. Gap Between Rows Slider (min -8 to max 20) */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">Row Separation Gap (Margin-Bottom)</span>
                                <span className="tweak-val-badge">{currentConfig.rowGap ?? 0}px</span>
                            </div>
                            <div className="tweak-preset-pills-row">
                                {[
                                    { label: 'Overlap (-4px)', val: -4 },
                                    { label: 'Flush (0px)', val: 0 },
                                    { label: 'Default (4px)', val: 4 },
                                    { label: 'Separated (+10px)', val: 10 }
                                ].map((pill) => (
                                    <button
                                        key={pill.val}
                                        type="button"
                                        className={`tweak-preset-pill ${(currentConfig.rowGap ?? 0) === pill.val ? 'is-active' : ''}`}
                                        onClick={() => updateConfig({ rowGap: pill.val })}
                                    >
                                        {pill.label}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="range"
                                min="-8"
                                max="20"
                                step="1"
                                value={currentConfig.rowGap ?? 0}
                                onChange={(e) => updateConfig({ rowGap: parseInt(e.target.value, 10) })}
                                className="tweak-range-slider"
                            />
                            <div className="tweak-slider-ticks">
                                <span>-8px (Super Tight)</span>
                                <span>0px (Flush)</span>
                                <span>20px (Cards)</span>
                            </div>
                        </div>

                        {/* 9. Container Bottom Padding (paddingBottom of parent header) */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">Container Bottom Padding (padding-bottom)</span>
                                <span className="tweak-val-badge">{currentConfig.containerPaddingBottom ?? 8}px</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="32"
                                step="1"
                                value={currentConfig.containerPaddingBottom ?? 8}
                                onChange={(e) => updateConfig({ containerPaddingBottom: parseInt(e.target.value, 10) })}
                                className="tweak-range-slider"
                            />
                        </div>
                    </>
                )}

                {/* ========================================================
                    CATEGORY 4: TYPOGRAPHY & TEXT CONTROLS
                   ======================================================== */}
                {categoryTab === 'typography' && (
                    <>
                        {/* Target Context */}
                        <div className="tweak-context-badge">
                            Editing Typography for: <b>{targetTab === 'all' ? 'All Rows' : (targetTab === 'client' ? 'Client Row' : (targetTab === 'subject' ? 'Subject Row' : 'Email No.'))}</b>
                        </div>

                        {/* Font Size Slider */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">Font Size</span>
                                <span className="tweak-val-badge">
                                    {getRowConfig('fontSize', 14)}px
                                </span>
                            </div>
                            <input
                                type="range"
                                min="11"
                                max="20"
                                step="1"
                                value={getRowConfig('fontSize', 14)}
                                onChange={(e) => updateRowConfig('fontSize', parseInt(e.target.value, 10))}
                                className="tweak-range-slider"
                            />
                        </div>

                        {/* Font Weight Selector */}
                        <div className="tweak-section">
                            <span className="tweak-section-label">Font Weight</span>
                            <div className="tweak-segmented-group">
                                {['400', '500', '600', '700'].map((weight) => {
                                    const currentWeight = String(getRowConfig('fontWeight', '600'));
                                    return (
                                        <button
                                            key={weight}
                                            type="button"
                                            className={`tweak-segment-btn ${currentWeight === weight ? 'is-active' : ''}`}
                                            onClick={() => updateRowConfig('fontWeight', weight)}
                                        >
                                            {weight}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Text Color Picker */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">Text Color</span>
                                <div
                                    className="tweak-color-preview-box"
                                    style={{
                                        backgroundColor: getRowConfig('textColor', '#475569')
                                    }}
                                />
                            </div>
                            <div className="tweak-swatch-row">
                                {COLOR_SWATCHES.map((color) => {
                                    const currentColor = getRowConfig('textColor', '#475569');
                                    return (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => updateRowConfig('textColor', color)}
                                            className={`tweak-swatch-btn ${currentColor === color ? 'is-selected' : ''}`}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    );
                                })}
                                <label className="tweak-custom-color-picker" title="Pick custom color">
                                    <input
                                        type="color"
                                        value={getRowConfig('textColor', '#475569')}
                                        onChange={(e) => updateRowConfig('textColor', e.target.value)}
                                    />
                                    <span>Pick</span>
                                </label>
                            </div>
                        </div>

                        {/* Email No Font Style */}
                        {(targetTab === 'all' || targetTab === 'emailNo') && (
                            <div className="tweak-section">
                                <span className="tweak-section-label">Email No. Font Family</span>
                                <div className="tweak-segmented-group">
                                    <button
                                        type="button"
                                        className={`tweak-segment-btn ${currentConfig.emailNoFontStyle === 'sans' ? 'is-active' : ''}`}
                                        onClick={() => updateConfig({ emailNoFontStyle: 'sans' })}
                                    >
                                        Default Sans
                                    </button>
                                    <button
                                        type="button"
                                        className={`tweak-segment-btn ${currentConfig.emailNoFontStyle === 'mono' ? 'is-active' : ''}`}
                                        onClick={() => updateConfig({ emailNoFontStyle: 'mono' })}
                                    >
                                        Monospace 14333
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ========================================================
                    CATEGORY 5: EMAIL NO. SPECIAL LAYOUT MODE
                   ======================================================== */}
                {categoryTab === 'emailNoMode' && (
                    <>
                        <div className="tweak-context-badge">
                            Dedicated Controls for: <b>Email No. : 14333</b>
                        </div>

                        {/* Layout Mode Selector */}
                        <div className="tweak-section">
                            <span className="tweak-section-label">Display Mode</span>
                            <div className="tweak-segmented-group">
                                {[
                                    { key: 'bar', label: 'Full Bar' },
                                    { key: 'pill', label: 'Inline Pill' },
                                    { key: 'card', label: 'Bordered Card' }
                                ].map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        className={`tweak-segment-btn ${currentConfig.emailNoDisplayMode === item.key ? 'is-active' : ''}`}
                                        onClick={() => updateConfig({ emailNoDisplayMode: item.key })}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Email No Background Color */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">Box Background Color</span>
                                <div className="tweak-color-preview-box" style={{ backgroundColor: currentConfig.emailNoBgColor }} />
                            </div>
                            <div className="tweak-swatch-row">
                                {COLOR_SWATCHES.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => updateConfig({ emailNoBgColor: color })}
                                        className={`tweak-swatch-btn ${currentConfig.emailNoBgColor === color ? 'is-selected' : ''}`}
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                                <label className="tweak-custom-color-picker" title="Pick custom color">
                                    <input
                                        type="color"
                                        value={currentConfig.emailNoBgColor}
                                        onChange={(e) => updateConfig({ emailNoBgColor: e.target.value })}
                                    />
                                    <span>Pick</span>
                                </label>
                            </div>
                        </div>

                        {/* Email No Text Color */}
                        <div className="tweak-section">
                            <div className="tweak-section-header-flex">
                                <span className="tweak-section-label">Number & Text Color</span>
                                <div className="tweak-color-preview-box" style={{ backgroundColor: currentConfig.emailNoTextColor }} />
                            </div>
                            <div className="tweak-swatch-row">
                                {COLOR_SWATCHES.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => updateConfig({ emailNoTextColor: color })}
                                        className={`tweak-swatch-btn ${currentConfig.emailNoTextColor === color ? 'is-selected' : ''}`}
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                                <label className="tweak-custom-color-picker" title="Pick custom color">
                                    <input
                                        type="color"
                                        value={currentConfig.emailNoTextColor}
                                        onChange={(e) => updateConfig({ emailNoTextColor: e.target.value })}
                                    />
                                    <span>Pick</span>
                                </label>
                            </div>
                        </div>

                        {/* Email No Font Style */}
                        <div className="tweak-section">
                            <span className="tweak-section-label">Typography Style</span>
                            <div className="tweak-segmented-group">
                                <button
                                    type="button"
                                    className={`tweak-segment-btn ${currentConfig.emailNoFontStyle === 'sans' ? 'is-active' : ''}`}
                                    onClick={() => updateConfig({ emailNoFontStyle: 'sans' })}
                                >
                                    Default Sans
                                </button>
                                <button
                                    type="button"
                                    className={`tweak-segment-btn ${currentConfig.emailNoFontStyle === 'mono' ? 'is-active' : ''}`}
                                    onClick={() => updateConfig({ emailNoFontStyle: 'mono' })}
                                >
                                    Monospace (14333)
                                </button>
                            </div>
                        </div>
                    </>
                )}

            </div>

            {/* Popover Footer */}
            <div className="tweak-card-footer">
                <button
                    type="button"
                    onClick={onReset}
                    className="tweak-btn-secondary"
                    title="Reset to default clean settings"
                >
                    Reset Defaults
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    className="tweak-btn-primary"
                    style={{ minWidth: '105px' }}
                >
                    {savedNotification ? 'Saved ✓' : 'Save & Done'}
                </button>
            </div>
        </div>,
        document.body
    );
}
