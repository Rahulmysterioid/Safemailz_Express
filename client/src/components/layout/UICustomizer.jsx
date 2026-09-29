import React, { useState } from 'react';
import { useUI, applySettingsToDOM, THEME_PRESETS, DEFAULT_UI_SETTINGS } from '../../context/UIContext';
import './UICustomizer.css';

const COMPONENTS = [
    { id: 'global', label: 'Global Settings' },
    { id: 'sidebar', label: 'Sidebar' },
    { id: 'topbar', label: 'Top Bar' },
    { id: 'mailList', label: 'Email List' },
    { id: 'toolbar', label: 'Toolbar' },
    { id: 'readingPane', label: 'Reading Pane' }
];

const SUBCATEGORIES = {
    sidebar: [
        { id: 'container', label: 'Container' },
        { id: 'items', label: 'Items & Interactions' }
    ],
    topbar: [
        { id: 'container', label: 'Container' }
    ],
    mailList: [
        { id: 'container', label: 'Container (Width/Spacing)' },
        { id: 'subheader', label: 'Subheader Bar' },
        { id: 'rows', label: 'Email Rows' },
        { id: 'typography', label: 'Typography' }
    ],
    toolbar: [
        { id: 'container', label: 'Container' },
        { id: 'buttons', label: 'Action Buttons' }
    ],
    readingPane: [
        { id: 'container', label: 'Container' },
        { id: 'typography', label: 'Text Styles' }
    ]
};



const SpacingControl = ({ label, value, onChange }) => {
    const parseValue = (val) => {
        if (!val) return { t: 0, r: 0, b: 0, l: 0, unit: 'px' };
        const parts = val.trim().split(/\s+/);
        const match = parts[0].match(/(-?\d*\.?\d+)(.*)/);
        const unit = match && match[2] ? match[2] : 'px';
        const numParts = parts.map(p => parseFloat(p) || 0);
        
        let t=0, r=0, b=0, l=0;
        if (numParts.length === 1) {
            t = r = b = l = numParts[0];
        } else if (numParts.length === 2) {
            t = b = numParts[0];
            r = l = numParts[1];
        } else if (numParts.length === 3) {
            t = numParts[0];
            r = l = numParts[1];
            b = numParts[2];
        } else if (numParts.length === 4) {
            t = numParts[0];
            r = numParts[1];
            b = numParts[2];
            l = numParts[3];
        }
        return { t, r, b, l, unit };
    };

    const parsed = React.useMemo(() => parseValue(value), [value]);
    const [isLinked, setIsLinked] = React.useState(() => {
        return parsed.t === parsed.r && parsed.t === parsed.b && parsed.t === parsed.l;
    });

    const update = (newVals, linked) => {
        if (linked) {
            onChange(`${newVals.t}${parsed.unit}`);
        } else {
            onChange(`${newVals.t}${parsed.unit} ${newVals.r}${parsed.unit} ${newVals.b}${parsed.unit} ${newVals.l}${parsed.unit}`);
        }
    };

    const handleChange = (field, val) => {
        const num = parseFloat(val) || 0;
        if (isLinked) {
            update({ t: num, r: num, b: num, l: num }, true);
        } else {
            update({ ...parsed, [field]: num }, false);
        }
    };

    const toggleLink = () => {
        const newLinked = !isLinked;
        setIsLinked(newLinked);
        if (newLinked) {
            update({ t: parsed.t, r: parsed.t, b: parsed.t, l: parsed.t }, true);
        } else {
            update(parsed, false);
        }
    };

    return (
        <div className="ui-customizer-field spacing-control">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>{label}</label>
                <button type="button" onClick={toggleLink} style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:'12px', color: isLinked ? '#2563eb' : '#64748b' }}>
                    {isLinked ? '🔗 Linked' : '🔓 Unlinked'}
                </button>
            </div>
            {isLinked ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <input type="number" step={parsed.unit === 'rem' ? '0.1' : '1'} value={parsed.t} onChange={(e) => handleChange('t', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }} />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{parsed.unit}</span>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F8FAFC', padding: '2px 4px', borderRadius: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', width: '12px', textAlign: 'center' }}>T</span>
                        <input type="number" step={parsed.unit === 'rem' ? '0.1' : '1'} value={parsed.t} onChange={(e) => handleChange('t', e.target.value)} style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F8FAFC', padding: '2px 4px', borderRadius: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', width: '12px', textAlign: 'center' }}>R</span>
                        <input type="number" step={parsed.unit === 'rem' ? '0.1' : '1'} value={parsed.r} onChange={(e) => handleChange('r', e.target.value)} style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F8FAFC', padding: '2px 4px', borderRadius: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', width: '12px', textAlign: 'center' }}>B</span>
                        <input type="number" step={parsed.unit === 'rem' ? '0.1' : '1'} value={parsed.b} onChange={(e) => handleChange('b', e.target.value)} style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F8FAFC', padding: '2px 4px', borderRadius: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', width: '12px', textAlign: 'center' }}>L</span>
                        <input type="number" step={parsed.unit === 'rem' ? '0.1' : '1'} value={parsed.l} onChange={(e) => handleChange('l', e.target.value)} style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default function UICustomizer() {
    const { uiSettings, saveUiSettings, isLoaded } = useUI();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [localSettings, setLocalSettings] = useState(null);
    const [activeTab, setActiveTab] = useState('global');
    const [saveMessage, setSaveMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    React.useEffect(() => {
        if (activeTab !== 'global' && SUBCATEGORIES[activeTab]) {
            setActiveSubcategory(SUBCATEGORIES[activeTab][0].id);
        }
    }, [activeTab]);

    // Initialize local state when opening
    const handleOpen = () => {
        setLocalSettings(JSON.parse(JSON.stringify(uiSettings)));
        setIsOpen(true);
        setIsMinimized(false);
    };

    const handleChange = (key, value) => {
        setLocalSettings(prev => {
            const next = { ...prev };
            if (!next[activeTab]) next[activeTab] = {};
            next[activeTab] = { ...next[activeTab], [key]: value };
            applySettingsToDOM(next);
            return next;
        });
    };

    const handleApplyPreset = (preset) => {
        const next = JSON.parse(JSON.stringify(preset.settings));
        setLocalSettings(next);
        applySettingsToDOM(next);
    };

    const handleSave = async () => {
        if (!localSettings) return;
        setIsSaving(true);
        setSaveMessage('');
        try {
            const result = await saveUiSettings(localSettings);
            setSaveMessage(result?.localOnly ? 'Saved on this device' : 'Changes saved');
            setTimeout(() => {
                setIsOpen(false);
                setSaveMessage('');
                setIsSaving(false);
            }, 500);
        } catch (e) {
            setSaveMessage('Could not save. Try again.');
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        const next = JSON.parse(JSON.stringify(DEFAULT_UI_SETTINGS));
        setLocalSettings(next);
        applySettingsToDOM(next);
    };

    const handleCancel = () => {
        applySettingsToDOM(uiSettings);
        setIsOpen(false);
    };

    if (!isLoaded) return null;

    const currentSettings = localSettings?.[activeTab] || {};

    return (
        <>
            <button 
                className="btn-ui-customize-fab" 
                onClick={handleOpen}
                title="Customize UI"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            </button>

            {isOpen && localSettings && (
                <div className="ui-customizer-modal-overlay">
                    <div className="ui-customizer-modal" style={isMinimized ? { height: '54px' } : {}}>
                        <div className="ui-customizer-header" onClick={() => setIsMinimized(!isMinimized)}>
                            <div className="ui-customizer-header-title">
                                <span className="ui-customizer-badge">CSS</span>
                                <h3>Theme Customizer {isMinimized && "(Minimized)"}</h3>
                            </div>
                            <div>
                                <button className="ui-customizer-close" style={{ marginRight: '8px' }} onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}>
                                    {isMinimized ? '□' : '−'}
                                </button>
                                <button className="ui-customizer-close" onClick={(e) => { e.stopPropagation(); handleCancel(); }}>✕</button>
                            </div>
                        </div>
                        
                        {!isMinimized && (
                            <>
                                <div className="ui-customizer-body">
                                    <div className="ui-customizer-field">
                                        <label>Select Component</label>
                                        <select 
                                            className="ui-customizer-select"
                                            value={activeTab} 
                                            onChange={(e) => setActiveTab(e.target.value)}
                                        >
                                            {COMPONENTS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                        </select>
                                    </div>

                                    {activeTab !== 'global' && SUBCATEGORIES[activeTab] && (
                                        <div className="ui-customizer-subcategories">
                                            {SUBCATEGORIES[activeTab].map(sub => (
                                                <button
                                                    key={sub.id}
                                                    type="button"
                                                    className={`subcategory-pill ${activeSubcategory === sub.id ? 'active' : ''}`}
                                                    onClick={() => setActiveSubcategory(sub.id)}
                                                >
                                                    {sub.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}


                                    {activeTab === 'global' ? (
                                        <>
                                            {/* Quick Theme Presets */}
                                            <div className="ui-customizer-section-title">Quick Theme Presets</div>
                                            <div className="theme-presets-grid">
                                                {THEME_PRESETS.map(preset => (
                                                    <button
                                                        key={preset.id}
                                                        type="button"
                                                        className="theme-preset-btn"
                                                        onClick={() => handleApplyPreset(preset)}
                                                    >
                                                        <span className="preset-swatch" style={{ backgroundColor: preset.color }}></span>
                                                        <span>{preset.name}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="ui-customizer-section-title">Global Colors</div>
                                            <div className="ui-customizer-field color-field">
                                                <label>Primary Color</label>
                                                <div className="color-picker-wrap">
                                                    <input 
                                                        type="color" 
                                                        value={currentSettings.primaryColor || '#2563EB'} 
                                                        onChange={(e) => handleChange('primaryColor', e.target.value)}
                                                    />
                                                    <span>{currentSettings.primaryColor || '#2563EB'}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="ui-customizer-field color-field">
                                                <label>Global Background</label>
                                                <div className="color-picker-wrap">
                                                    <input 
                                                        type="color" 
                                                        value={currentSettings.globalBgColor || '#FFFFFF'} 
                                                        onChange={(e) => handleChange('globalBgColor', e.target.value)}
                                                    />
                                                    <span>{currentSettings.globalBgColor || '#FFFFFF'}</span>
                                                </div>
                                            </div>

                                            <div className="ui-customizer-field color-field">
                                                <label>Global Text Color</label>
                                                <div className="color-picker-wrap">
                                                    <input 
                                                        type="color" 
                                                        value={currentSettings.globalTextColor || '#1E293B'} 
                                                        onChange={(e) => handleChange('globalTextColor', e.target.value)}
                                                    />
                                                    <span>{currentSettings.globalTextColor || '#1E293B'}</span>
                                                </div>
                                            </div>

                                            <div className="ui-customizer-section-title">Typography</div>
                                            <div className="ui-customizer-field">
                                                <label>Font Family</label>
                                                <select 
                                                    className="ui-customizer-select"
                                                    value={currentSettings.fontFamily || "'Inter', sans-serif"} 
                                                    onChange={(e) => handleChange('fontFamily', e.target.value)}
                                                >
                                                    <option value="'Inter', sans-serif">Inter (Modern & Clean)</option>
                                                    <option value="'Roboto', sans-serif">Roboto</option>
                                                    <option value="'Open Sans', sans-serif">Open Sans</option>
                                                    <option value="'Segoe UI', sans-serif">Segoe UI</option>
                                                    <option value="Arial, sans-serif">Arial</option>
                                                    <option value="Georgia, serif">Georgia (Serif)</option>
                                                </select>
                                            </div>

                                            <div className="ui-customizer-field">
                                                <label>Font Weight</label>
                                                <select
                                                    className="ui-customizer-select"
                                                    value={currentSettings.fontWeight || '400'}
                                                    onChange={(e) => handleChange('fontWeight', e.target.value)}
                                                >
                                                    <option value="300">Light (300)</option>
                                                    <option value="400">Regular (400)</option>
                                                    <option value="500">Medium (500)</option>
                                                    <option value="600">Semi-Bold (600)</option>
                                                    <option value="700">Bold (700)</option>
                                                </select>
                                            </div>

                                            <div className="ui-customizer-field">
                                                <label>Base Font Size ({currentSettings.baseFontSize || '16px'})</label>
                                                <input 
                                                    type="range" 
                                                    min="12" 
                                                    max="22" 
                                                    step="1" 
                                                    value={parseInt(currentSettings.baseFontSize || '16')} 
                                                    onChange={(e) => handleChange('baseFontSize', `${e.target.value}px`)}
                                                />
                                            </div>

                                            <div className="ui-customizer-section-title">Layout & Atmosphere</div>
                                            <div className="ui-customizer-field">
                                                <label>Display Density</label>
                                                <div className="density-toggle-group">
                                                    <button
                                                        type="button"
                                                        className={`density-pill ${(currentSettings.density || 'comfortable') === 'compact' ? 'active' : ''}`}
                                                        onClick={() => handleChange('density', 'compact')}
                                                    >
                                                        Compact
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`density-pill ${(currentSettings.density || 'comfortable') === 'comfortable' ? 'active' : ''}`}
                                                        onClick={() => handleChange('density', 'comfortable')}
                                                    >
                                                        Comfortable
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`density-pill ${(currentSettings.density || 'comfortable') === 'spacious' ? 'active' : ''}`}
                                                        onClick={() => handleChange('density', 'spacious')}
                                                    >
                                                        Spacious
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="ui-customizer-field">
                                                <label>Card Border Radius ({currentSettings.cardBorderRadius || '12px'})</label>
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max="32" 
                                                    step="1" 
                                                    value={parseInt(currentSettings.cardBorderRadius || '12')} 
                                                    onChange={(e) => handleChange('cardBorderRadius', `${e.target.value}px`)}
                                                />
                                            </div>

                                            <div className="ui-customizer-field">
                                                <label>Global Shadow / Depth</label>
                                                <select
                                                    className="ui-customizer-select"
                                                    value={currentSettings.boxShadow || 'soft'}
                                                    onChange={(e) => handleChange('boxShadow', e.target.value)}
                                                >
                                                    <option value="none">None (Flat)</option>
                                                    <option value="soft">Soft Subtle Shadow</option>
                                                    <option value="medium">Medium Shadow</option>
                                                    <option value="floating">Floating / Elevated</option>
                                                </select>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* Component Specific Width / Dimensions */}
                                            {activeSubcategory === 'container' && activeTab === 'sidebar' && (
                                                <div className="ui-customizer-field">
                                                    <label>Sidebar Width ({currentSettings.width || '240px'})</label>
                                                    <input 
                                                        type="range" 
                                                        min="180" 
                                                        max="340" 
                                                        step="5" 
                                                        value={parseInt(currentSettings.width || '240')} 
                                                        onChange={(e) => handleChange('width', `${e.target.value}px`)}
                                                    />
                                                </div>
                                            )}

                                            {activeSubcategory === 'container' && activeTab === 'mailList' && (
                                                <div className="ui-customizer-field">
                                                    <label>Email List Width ({currentSettings.width || '420px'})</label>
                                                    <input 
                                                        type="range" 
                                                        min="260" 
                                                        max="750" 
                                                        step="5" 
                                                        value={parseInt(currentSettings.width || '420')} 
                                                        onChange={(e) => handleChange('width', `${e.target.value}px`)}
                                                    />
                                                </div>
                                            )}

                                            {activeSubcategory === 'typography' && activeTab === 'readingPane' && (
                                                <div className="ui-customizer-field">
                                                    <label>Reading Line Height ({currentSettings.lineHeight || '1.6'})</label>
                                                    <input 
                                                        type="range" 
                                                        min="1.2" 
                                                        max="2.2" 
                                                        step="0.1" 
                                                        value={parseFloat(currentSettings.lineHeight || 1.6)} 
                                                        onChange={(e) => handleChange('lineHeight', `${e.target.value}`)}
                                                    />
                                                </div>
                                            )}

                                            {activeSubcategory === 'container' && (<>
<div className="ui-customizer-section-title">Colors & Layout</div>
                                            <div className="ui-customizer-field color-field">
                                                <label>Background Color</label>
                                                <div className="color-picker-wrap">
                                                    <input 
                                                        type="color" 
                                                        value={currentSettings.backgroundColor || '#ffffff'} 
                                                        onChange={(e) => handleChange('backgroundColor', e.target.value)}
                                                    />
                                                    <span>{currentSettings.backgroundColor || '#ffffff'}</span>
                                                </div>
                                            </div>

                                            <div className="ui-customizer-field color-field">
                                                <label>Text Color</label>
                                                <div className="color-picker-wrap">
                                                    <input 
                                                        type="color" 
                                                        value={currentSettings.textColor || '#333333'} 
                                                        onChange={(e) => handleChange('textColor', e.target.value)}
                                                    />
                                                    <span>{currentSettings.textColor || '#333333'}</span>
                                                </div>
                                            </div>
                                            </>)}

                                            {activeSubcategory === 'items' && (activeTab === 'sidebar' || activeTab === 'mailList') && (
                                                <>
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Item Hover Color</label>
                                                        <div className="color-picker-wrap">
                                                            <input 
                                                                type="color" 
                                                                value={currentSettings.hoverColor || '#F1F5F9'} 
                                                                onChange={(e) => handleChange('hoverColor', e.target.value)}
                                                            />
                                                            <span>{currentSettings.hoverColor || '#F1F5F9'}</span>
                                                        </div>
                                                    </div>

                                                    <div className="ui-customizer-field color-field">
                                                        <label>Selected / Active Color</label>
                                                        <div className="color-picker-wrap">
                                                            <input 
                                                                type="color" 
                                                                value={currentSettings.activeColor || '#EFF6FF'} 
                                                                onChange={(e) => handleChange('activeColor', e.target.value)}
                                                            />
                                                            <span>{currentSettings.activeColor || '#EFF6FF'}</span>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {activeSubcategory === 'container' && (<>
<div className="ui-customizer-section-title">Spacing</div>
                                            <div className="ui-customizer-field">
                                                <label>Font Size ({currentSettings.fontSize || '0.875rem'})</label>
                                                <input 
                                                    type="range" 
                                                    min="0.5" 
                                                    max="1.5" 
                                                    step="0.025" 
                                                    value={parseFloat(currentSettings.fontSize || 0.875)} 
                                                    onChange={(e) => handleChange('fontSize', `${e.target.value}rem`)}
                                                />
                                            </div>

                                            <SpacingControl label="Padding" value={currentSettings.padding || '0rem'} onChange={(val) => handleChange('padding', val)} />

                                            <SpacingControl label="Margin" value={currentSettings.margin || '0rem'} onChange={(val) => handleChange('margin', val)} />

                                            <div className="ui-customizer-section-title">Borders & Elevation</div>
                                            <div className="ui-customizer-field color-field">
                                                <label>Border Color</label>
                                                <div className="color-picker-wrap">
                                                    <input 
                                                        type="color" 
                                                        value={currentSettings.borderColor || '#E0E0E0'} 
                                                        onChange={(e) => handleChange('borderColor', e.target.value)}
                                                    />
                                                    <span>{currentSettings.borderColor || '#E0E0E0'}</span>
                                                </div>
                                            </div>

                                            <div className="ui-customizer-field">
                                                <label>Border Style</label>
                                                <select
                                                    className="ui-customizer-select"
                                                    value={currentSettings.borderStyle || 'solid'}
                                                    onChange={(e) => handleChange('borderStyle', e.target.value)}
                                                >
                                                    <option value="solid">Solid</option>
                                                    <option value="dashed">Dashed</option>
                                                    <option value="dotted">Dotted</option>
                                                    <option value="none">None</option>
                                                </select>
                                            </div>

                                            <div className="ui-customizer-field">
                                                <label>Border Width ({currentSettings.borderWidth || '1px'})</label>
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max="8" 
                                                    step="1" 
                                                    value={parseInt(currentSettings.borderWidth || '1')} 
                                                    onChange={(e) => handleChange('borderWidth', `${e.target.value}px`)}
                                                />
                                            </div>

                                            <div className="ui-customizer-field">
                                                <label>Border Radius ({currentSettings.borderRadius || '0px'})</label>
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max="30" 
                                                    step="1" 
                                                    value={parseInt(currentSettings.borderRadius || '0')} 
                                                    onChange={(e) => handleChange('borderRadius', `${e.target.value}px`)}
                                                />
                                            </div>

                                            <div className="ui-customizer-field">
                                                <label>Box Shadow</label>
                                                <select
                                                    className="ui-customizer-select"
                                                    value={currentSettings.boxShadow || 'none'}
                                                    onChange={(e) => handleChange('boxShadow', e.target.value)}
                                                >
                                                    <option value="none">None</option>
                                                    <option value="soft">Soft Subtle Shadow</option>
                                                    <option value="medium">Medium Shadow</option>
                                                    <option value="floating">Floating / Elevated</option>
                                                </select>
                                            </div>
</>)}

                                            
                                            {/* ADVANCED GRANULAR CONTROLS */}
                                            {activeSubcategory === 'buttons' && activeTab === 'toolbar' && (
                                                <>
                                                    <div className="ui-customizer-section-title">Action Buttons</div>
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Button Background</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.btnBg || '#ffffff'} onChange={(e) => handleChange('btnBg', e.target.value)} />
                                                            <span>{currentSettings.btnBg || '#ffffff'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Button Text Color</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.btnTextColor || '#334155'} onChange={(e) => handleChange('btnTextColor', e.target.value)} />
                                                            <span>{currentSettings.btnTextColor || '#334155'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Button Border Color</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.btnBorderColor || '#E2E8F0'} onChange={(e) => handleChange('btnBorderColor', e.target.value)} />
                                                            <span>{currentSettings.btnBorderColor || '#E2E8F0'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Button Hover Background</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.btnHoverBg || '#F1F5F9'} onChange={(e) => handleChange('btnHoverBg', e.target.value)} />
                                                            <span>{currentSettings.btnHoverBg || '#F1F5F9'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="ui-customizer-field">
                                                        <label>Button Border Radius ({currentSettings.btnBorderRadius || '4px'})</label>
                                                        <input type="range" min="0" max="24" step="1" value={parseInt(currentSettings.btnBorderRadius || '4')} onChange={(e) => handleChange('btnBorderRadius', `${e.target.value}px`)} />
                                                    </div>
                                                </>
                                            )}

                                            {activeSubcategory === 'rows' && activeTab === 'mailList' && (
<>
<div className="ui-customizer-section-title">Row Dimensions</div>
                                                    <SpacingControl label="Row Padding" value={currentSettings.rowPadding || '8px 12px'} onChange={(val) => handleChange('rowPadding', val)} />
<SpacingControl label="Row Margin" value={currentSettings.rowMargin || '0px'} onChange={(val) => handleChange('rowMargin', val)} />
                                                    <div className="ui-customizer-field">
                                                        <label>Row Border Radius ({currentSettings.rowBorderRadius || '0px'})</label>
                                                        <input type="range" min="0" max="24" step="1" value={parseInt(currentSettings.rowBorderRadius || '0')} onChange={(e) => handleChange('rowBorderRadius', `${e.target.value}px`)} />
                                                    </div>
                                                    <div className="ui-customizer-section-title">Row States</div>
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Row Background (Normal)</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.rowBg || '#ffffff'} onChange={(e) => handleChange('rowBg', e.target.value)} />
                                                            <span>{currentSettings.rowBg || '#ffffff'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Row Background (Hover)</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.rowHoverBg || '#f1f5f9'} onChange={(e) => handleChange('rowHoverBg', e.target.value)} />
                                                            <span>{currentSettings.rowHoverBg || '#f1f5f9'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Row Background (Unread)</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.rowUnreadBg || '#EFF6FF'} onChange={(e) => handleChange('rowUnreadBg', e.target.value)} />
                                                            <span>{currentSettings.rowUnreadBg || '#EFF6FF'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Row Border Bottom</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.rowBorderColor || '#E2E8F0'} onChange={(e) => handleChange('rowBorderColor', e.target.value)} />
                                                            <span>{currentSettings.rowBorderColor || '#E2E8F0'}</span>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {activeSubcategory === 'typography' && activeTab === 'mailList' && (
                                                <>
                                                    <div className="ui-customizer-section-title">Typography & Avatar</div>
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Sender Text Color</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.senderColor || '#0f172a'} onChange={(e) => handleChange('senderColor', e.target.value)} />
                                                            <span>{currentSettings.senderColor || '#0f172a'}</span>
                                                        </div>
                                                    </div>
                                                    <div style={{display: 'flex', gap: '8px'}}>
                                                        <div className="ui-customizer-field" style={{flex: 1}}>
                                                            <label>Sender Size ({currentSettings.senderFontSize || '0.9rem'})</label>
                                                            <input type="range" min="0.75" max="1.25" step="0.05" value={parseFloat(currentSettings.senderFontSize || '0.9')} onChange={(e) => handleChange('senderFontSize', `${e.target.value}rem`)} />
                                                        </div>
                                                        <div className="ui-customizer-field" style={{flex: 1}}>
                                                            <label>Sender Weight</label>
                                                            <select className="ui-customizer-select" value={currentSettings.senderFontWeight || '600'} onChange={(e) => handleChange('senderFontWeight', e.target.value)}>
                                                                <option value="400">Normal</option>
                                                                <option value="500">Medium</option>
                                                                <option value="600">Semi-Bold</option>
                                                                <option value="700">Bold</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Subject Text Color</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.subjectColor || '#334155'} onChange={(e) => handleChange('subjectColor', e.target.value)} />
                                                            <span>{currentSettings.subjectColor || '#334155'}</span>
                                                        </div>
                                                    </div>
                                                    <div style={{display: 'flex', gap: '8px'}}>
                                                        <div className="ui-customizer-field" style={{flex: 1}}>
                                                            <label>Subject Size ({currentSettings.subjectFontSize || '0.875rem'})</label>
                                                            <input type="range" min="0.75" max="1.25" step="0.05" value={parseFloat(currentSettings.subjectFontSize || '0.875')} onChange={(e) => handleChange('subjectFontSize', `${e.target.value}rem`)} />
                                                        </div>
                                                        <div className="ui-customizer-field" style={{flex: 1}}>
                                                            <label>Subject Weight</label>
                                                            <select className="ui-customizer-select" value={currentSettings.subjectFontWeight || '500'} onChange={(e) => handleChange('subjectFontWeight', e.target.value)}>
                                                                <option value="400">Normal</option>
                                                                <option value="500">Medium</option>
                                                                <option value="600">Semi-Bold</option>
                                                                <option value="700">Bold</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="ui-customizer-field color-field">
                                                        <label>Preview Text Color</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.previewColor || '#64748B'} onChange={(e) => handleChange('previewColor', e.target.value)} />
                                                            <span>{currentSettings.previewColor || '#64748B'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="ui-customizer-field">
                                                        <label>Preview Size ({currentSettings.previewFontSize || '0.8rem'})</label>
                                                        <input type="range" min="0.7" max="1.1" step="0.05" value={parseFloat(currentSettings.previewFontSize || '0.8')} onChange={(e) => handleChange('previewFontSize', `${e.target.value}rem`)} />
                                                    </div>
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Date Text Color</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.dateColor || '#94a3b8'} onChange={(e) => handleChange('dateColor', e.target.value)} />
                                                            <span>{currentSettings.dateColor || '#94a3b8'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="ui-customizer-field">
                                                        <label>Avatar Border Radius ({currentSettings.avatarRadius || '50%'})</label>
                                                        <input type="range" min="0" max="50" step="5" value={parseInt(currentSettings.avatarRadius || '50')} onChange={(e) => handleChange('avatarRadius', `${e.target.value}%`)} />
                                                    </div>
                                                </>
                                            )}

                                            {activeSubcategory === 'subheader' && activeTab === 'mailList' && (
                                                <>
                                                    <div className="ui-customizer-section-title">Received / Sent Subheader Bar</div>
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Subheader Background</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.subheaderBg || '#f3f2f1'} onChange={(e) => handleChange('subheaderBg', e.target.value)} />
                                                            <span>{currentSettings.subheaderBg || '#f3f2f1'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Subheader Border Bottom</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.subheaderBorder || '#e1dfdd'} onChange={(e) => handleChange('subheaderBorder', e.target.value)} />
                                                            <span>{currentSettings.subheaderBorder || '#e1dfdd'}</span>
                                                        </div>
                                                    </div>
                                                    <SpacingControl label="Subheader Padding" value={currentSettings.subheaderPadding || '8px 10px'} onChange={(val) => handleChange('subheaderPadding', val)} />
<SpacingControl label="Subheader Margin" value={currentSettings.subheaderMargin || '0px'} onChange={(val) => handleChange('subheaderMargin', val)} />
                                                    <div className="ui-customizer-field">
                                                        <label>Tab Spacing / Gap ({currentSettings.tabGap || '4px'})</label>
                                                        <input type="range" min="0" max="24" step="1" value={parseInt(currentSettings.tabGap || '4')} onChange={(e) => handleChange('tabGap', `${e.target.value}px`)} />
                                                    </div>
                                                    <div className="ui-customizer-section-title">Tab Typography & States</div>
                                                    <div className="ui-customizer-field">
                                                        <label>Tab Font Size ({currentSettings.subheaderFontSize || '0.875rem'})</label>
                                                        <input type="range" min="0.7" max="1.2" step="0.05" value={parseFloat(currentSettings.subheaderFontSize || '0.875')} onChange={(e) => handleChange('subheaderFontSize', `${e.target.value}rem`)} />
                                                    </div>
                                                    <div className="ui-customizer-field">
                                                        <label>Tab Font Weight</label>
                                                        <select className="ui-customizer-select" value={currentSettings.subheaderFontWeight || '400'} onChange={(e) => handleChange('subheaderFontWeight', e.target.value)}>
                                                            <option value="400">Normal (400)</option>
                                                            <option value="500">Medium (500)</option>
                                                            <option value="600">Semi-Bold (600)</option>
                                                            <option value="700">Bold (700)</option>
                                                        </select>
                                                    </div>
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Active Tab Indicator Color</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.tabActiveColor || '#2563eb'} onChange={(e) => handleChange('tabActiveColor', e.target.value)} />
                                                            <span>{currentSettings.tabActiveColor || '#2563eb'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="ui-customizer-field">
                                                        <label>Active Tab Font Weight</label>
                                                        <select className="ui-customizer-select" value={currentSettings.tabActiveFontWeight || '600'} onChange={(e) => handleChange('tabActiveFontWeight', e.target.value)}>
                                                            <option value="400">Normal (400)</option>
                                                            <option value="500">Medium (500)</option>
                                                            <option value="600">Semi-Bold (600)</option>
                                                            <option value="700">Bold (700)</option>
                                                        </select>
                                                    </div>
                                                    <div className="ui-customizer-field">
                                                        <label>Active Tab Border Width ({currentSettings.tabActiveBorderWidth || '2px'})</label>
                                                        <input type="range" min="1" max="5" step="1" value={parseInt(currentSettings.tabActiveBorderWidth || '2')} onChange={(e) => handleChange('tabActiveBorderWidth', `${e.target.value}px`)} />
                                                    </div>
                                                </>
                                            )}

                                            {activeSubcategory === 'typography' && activeTab === 'readingPane' && (
                                                <>
                                                    <div className="ui-customizer-section-title">Reading Pane Text</div>
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Header Background</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.headerBg || '#ffffff'} onChange={(e) => handleChange('headerBg', e.target.value)} />
                                                            <span>{currentSettings.headerBg || '#ffffff'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Email Title Color</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.titleColor || '#0F172A'} onChange={(e) => handleChange('titleColor', e.target.value)} />
                                                            <span>{currentSettings.titleColor || '#0F172A'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Meta Details Color (Date, Sender)</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.metaColor || '#475569'} onChange={(e) => handleChange('metaColor', e.target.value)} />
                                                            <span>{currentSettings.metaColor || '#475569'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="ui-customizer-field color-field">
                                                        <label>Message Body Color</label>
                                                        <div className="color-picker-wrap">
                                                            <input type="color" value={currentSettings.bodyColor || '#334155'} onChange={(e) => handleChange('bodyColor', e.target.value)} />
                                                            <span>{currentSettings.bodyColor || '#334155'}</span>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="ui-customizer-footer">
                                    <button type="button" className="btn btn-outline" onClick={handleReset}>Reset Defaults</button>
                                    <div className="ui-customizer-footer-actions">
                                        {saveMessage && <span className="ui-customizer-save-msg">{saveMessage}</span>}
                                        <button type="button" className="btn btn-outline" onClick={handleCancel}>Cancel</button>
                                        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                                            {isSaving ? 'Saving…' : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
