import React, { useState, useEffect, useRef } from 'react';
import { useSidebarUI, SIDEBAR_PRESETS, DEFAULT_SIDEBAR_UI } from '../../context/SidebarUIContext';
import './SidebarCustomizerModal.css';

const SWATCH_PALETTES = {
  backgrounds: [
    '#181818', '#0f172a', '#1e293b', '#0b192c', '#130c24', '#051d16',
    '#ffffff', '#f8fafc', '#f1f5f9', '#1c140c', '#1e1035', '#202024'
  ],
  cards: [
    '#202020', '#1e293b', '#334155', '#102a45', '#20153d', '#0a3227',
    '#ffffff', '#f8fafc', '#edf2f7', '#2b1f13', '#2d1b4e', '#27272a'
  ],
  actives: [
    '#152438', '#1e3a8a', '#2563eb', '#3b0764', '#064e3b', '#451a03',
    '#eff6ff', '#f0fdf4', '#faf5ff', '#fff7ed', '#0c4a6e', '#1e1b4b'
  ],
  texts: [
    '#f1f5f9', '#ffffff', '#e2e8f0', '#0f172a', '#1e293b', '#334155',
    '#60a5fa', '#38bdf8', '#c084fc', '#6ee7b7', '#fcd34d', '#f43f5e'
  ],
  subtexts: [
    '#94a3b8', '#cbd5e1', '#64748b', '#475569', '#7dd3fc', '#a855f7',
    '#34d399', '#fbbf24', '#f87171', '#9ca3af', '#a1a1aa', '#71717a'
  ],
  borders: [
    '#2b2b2b', '#303030', '#334155', '#1e3e62', '#3b2569', '#134e3f',
    '#e2e8f0', '#cbd5e1', '#45321f', '#3f3f46', '#2563eb', '#10b981'
  ],
  hovers: [
    '#282828', '#2e2e2e', '#334155', '#163554', '#2d1d4d', '#0e4234',
    '#362718', '#383838', '#1e293b', '#243447', '#3b1261', '#1f2937'
  ],
  hoverBorders: [
    '#454545', '#52525b', '#475569', '#2563eb', '#38bdf8', '#a855f7',
    '#10b981', '#f59e0b', '#60a5fa', '#cbd5e1', '#64748b', '#94a3b8'
  ]
};

export default function SidebarCustomizerModal({ isOpen, onClose }) {
  const { 
    sidebarSettings, 
    rawSettings, 
    isDarkTheme, 
    updateSidebarSettings, 
    updateModeColor, 
    resetSidebarSettings, 
    applyPreset 
  } = useSidebarUI();
  const [activeTab, setActiveTab] = useState('position');
  const [editingModeOverride, setEditingModeOverride] = useState(null);

  // Floating position - docked comfortably on the right so sidebar is visible
  const [pos, setPos] = useState(() => {
    const defaultX = typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 565) : 800;
    return { x: defaultX, y: 70 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, origX: 0, origY: 0 });

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Dragging support
  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPos({
        x: Math.max(10, Math.min(window.innerWidth - 320, dragRef.current.origX + dx)),
        y: Math.max(10, Math.min(window.innerHeight - 200, dragRef.current.origY + dy))
      });
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  const currentSettings = rawSettings || sidebarSettings || DEFAULT_SIDEBAR_UI;
  const themeScope = currentSettings.themeScope || 'dark_only';

  // Determine active editing mode for colors (Light vs Dark mode palette)
  const activeEditingMode = themeScope === 'light_only'
    ? 'light'
    : themeScope === 'dark_only'
      ? 'dark'
      : (editingModeOverride || (isDarkTheme ? 'dark' : 'light'));

  const activePalette = activeEditingMode === 'light'
    ? (currentSettings.lightConfig || DEFAULT_SIDEBAR_UI.lightConfig)
    : (currentSettings.darkConfig || DEFAULT_SIDEBAR_UI.darkConfig);

  const current = {
    ...currentSettings,
    ...activePalette,
  };

  const handleFieldChange = (field, value) => {
    updateSidebarSettings({ [field]: value });
  };

  const handleThemeScopeChange = (newScope) => {
    setEditingModeOverride(newScope === 'light_only' ? 'light' : newScope === 'dark_only' ? 'dark' : null);
    updateSidebarSettings({ themeScope: newScope });
  };

  const handleColorInput = (field, val) => {
    let formatted = (val || '').trim();
    if (formatted && !formatted.startsWith('#') && /^[0-9a-fA-F]{3,8}$/.test(formatted)) {
      formatted = '#' + formatted;
    }
    if (updateModeColor) {
      updateModeColor(activeEditingMode, field, formatted);
    } else {
      updateSidebarSettings({ [field]: formatted });
    }
  };

  return (
    <div className="sidebar-ui-modal-backdrop">
      <div
        className="sidebar-ui-modal-card"
        style={{ top: `${pos.y}px`, left: `${pos.x}px` }}
      >
        {/* Header (Draggable) */}
        <div
          className="sidebar-ui-modal-header"
          onMouseDown={handleMouseDown}
          title="Drag to reposition panel"
        >
          <div className="sidebar-ui-modal-title-wrap">
            <div className="sidebar-ui-modal-badge-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/>
                <path d="M7.07 14.94c-1.66 0-3 1.34-3 3 0 1.13.62 2.12 1.54 2.65.41.24.59.73.44 1.18l-.34 1.03c-.22.68.3 1.37 1.02 1.37h.67c2.2 0 4-1.8 4-4 0-1.66-1.34-3-3-3l-1.33-2.23Z"/>
              </svg>
            </div>
            <div>
              <div className="sidebar-ui-modal-title">Sidebar UI Customizer</div>
              <div className="sidebar-ui-modal-desc">Drag header to move • Changes apply live</div>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-ui-modal-close-btn"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="sidebar-ui-tabs">
          <button
            type="button"
            className={`sidebar-ui-tab-btn ${activeTab === 'position' ? 'active' : ''}`}
            onClick={() => setActiveTab('position')}
          >
            📍 Location & Size
          </button>
          <button
            type="button"
            className={`sidebar-ui-tab-btn ${activeTab === 'colors' ? 'active' : ''}`}
            onClick={() => setActiveTab('colors')}
          >
            🎨 Colors & Background
          </button>
          <button
            type="button"
            className={`sidebar-ui-tab-btn ${activeTab === 'typography' ? 'active' : ''}`}
            onClick={() => setActiveTab('typography')}
          >
            🔤 Text & Font Size
          </button>
          <button
            type="button"
            className={`sidebar-ui-tab-btn ${activeTab === 'presets' ? 'active' : ''}`}
            onClick={() => setActiveTab('presets')}
          >
            🌟 Themes & Presets
          </button>
        </div>

        {/* Body Content */}
        <div className="sidebar-ui-modal-body">
          {/* TAB 1: LOCATION & SIZE */}
          {activeTab === 'position' && (
            <>
              {/* Location Selector */}
              <div className="sidebar-ui-section">
                <div className="sidebar-ui-section-title">
                  <span>📍 Sidebar Location / Position</span>
                </div>
                <div className="sidebar-ui-position-grid">
                  <button
                    type="button"
                    className={`sidebar-ui-pos-btn ${current.position === 'left' ? 'active' : ''}`}
                    onClick={() => handleFieldChange('position', 'left')}
                  >
                    <span className="sidebar-ui-pos-icon">⬅️</span>
                    <span>Left Side</span>
                  </button>

                  <button
                    type="button"
                    className={`sidebar-ui-pos-btn ${current.position === 'right' ? 'active' : ''}`}
                    onClick={() => handleFieldChange('position', 'right')}
                  >
                    <span className="sidebar-ui-pos-icon">➡️</span>
                    <span>Right Side</span>
                  </button>

                  <button
                    type="button"
                    className={`sidebar-ui-pos-btn ${current.position === 'top' ? 'active' : ''}`}
                    onClick={() => handleFieldChange('position', 'top')}
                  >
                    <span className="sidebar-ui-pos-icon">⬆️</span>
                    <span>Top Dock</span>
                  </button>

                  <button
                    type="button"
                    className={`sidebar-ui-pos-btn ${current.position === 'bottom' ? 'active' : ''}`}
                    onClick={() => handleFieldChange('position', 'bottom')}
                  >
                    <span className="sidebar-ui-pos-icon">⬇️</span>
                    <span>Bottom Dock</span>
                  </button>
                </div>
              </div>

              {/* Dimensions: Width or Height */}
              <div className="sidebar-ui-section">
                <div className="sidebar-ui-section-title">
                  <span>📐 Dimensions</span>
                </div>

                {current.position === 'left' || current.position === 'right' ? (
                  <div className="sidebar-ui-slider-row">
                    <div className="sidebar-ui-slider-header">
                      <span>Sidebar Width</span>
                      <span className="sidebar-ui-slider-val">{current.width} px</span>
                    </div>
                    <input
                      type="range"
                      min="240"
                      max="450"
                      step="2"
                      value={current.width}
                      onChange={(e) => handleFieldChange('width', Number(e.target.value))}
                      className="sidebar-ui-range"
                    />
                  </div>
                ) : (
                  <div className="sidebar-ui-slider-row">
                    <div className="sidebar-ui-slider-header">
                      <span>Sidebar Height</span>
                      <span className="sidebar-ui-slider-val">{current.height} px</span>
                    </div>
                    <input
                      type="range"
                      min="130"
                      max="300"
                      step="2"
                      value={current.height}
                      onChange={(e) => handleFieldChange('height', Number(e.target.value))}
                      className="sidebar-ui-range"
                    />
                  </div>
                )}

                {/* Inner Padding */}
                <div className="sidebar-ui-slider-row">
                  <div className="sidebar-ui-slider-header">
                    <span>Inner Spacing / Padding</span>
                    <span className="sidebar-ui-slider-val">{current.padding} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="1"
                    value={current.padding}
                    onChange={(e) => handleFieldChange('padding', Number(e.target.value))}
                    className="sidebar-ui-range"
                  />
                </div>
              </div>

              {/* External Margins (Offsets) */}
              <div className="sidebar-ui-section">
                <div className="sidebar-ui-section-title">
                  <span>↔️ Outer Margins & Edge Offsets</span>
                </div>
                <div className="sidebar-ui-margin-grid">
                  <div className="sidebar-ui-margin-item">
                    <span className="sidebar-ui-margin-tag">Top Margin</span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={current.marginTop}
                      onChange={(e) => handleFieldChange('marginTop', Number(e.target.value))}
                      className="sidebar-ui-margin-input"
                    />
                  </div>

                  <div className="sidebar-ui-margin-item">
                    <span className="sidebar-ui-margin-tag">Bottom Margin</span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={current.marginBottom}
                      onChange={(e) => handleFieldChange('marginBottom', Number(e.target.value))}
                      className="sidebar-ui-margin-input"
                    />
                  </div>

                  <div className="sidebar-ui-margin-item">
                    <span className="sidebar-ui-margin-tag">Left Margin</span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={current.marginLeft}
                      onChange={(e) => handleFieldChange('marginLeft', Number(e.target.value))}
                      className="sidebar-ui-margin-input"
                    />
                  </div>

                  <div className="sidebar-ui-margin-item">
                    <span className="sidebar-ui-margin-tag">Right Margin</span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={current.marginRight}
                      onChange={(e) => handleFieldChange('marginRight', Number(e.target.value))}
                      className="sidebar-ui-margin-input"
                    />
                  </div>
                </div>
              </div>

              {/* Borders & Corners */}
              <div className="sidebar-ui-section">
                <div className="sidebar-ui-section-title">
                  <span>🔲 Corner Radii & Elevation</span>
                </div>

                <div className="sidebar-ui-slider-row">
                  <div className="sidebar-ui-slider-header">
                    <span>Sidebar Corner Radius</span>
                    <span className="sidebar-ui-slider-val">{current.borderRadius} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="28"
                    step="1"
                    value={current.borderRadius}
                    onChange={(e) => handleFieldChange('borderRadius', Number(e.target.value))}
                    className="sidebar-ui-range"
                  />
                </div>

                <div className="sidebar-ui-slider-row">
                  <div className="sidebar-ui-slider-header">
                    <span>Card Corner Radius</span>
                    <span className="sidebar-ui-slider-val">{current.cardBorderRadius} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="1"
                    value={current.cardBorderRadius}
                    onChange={(e) => handleFieldChange('cardBorderRadius', Number(e.target.value))}
                    className="sidebar-ui-range"
                  />
                </div>

                <div className="sidebar-ui-slider-row">
                  <div className="sidebar-ui-slider-header">
                    <span>Shadow / Elevation</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                    {['none', 'soft', 'medium', 'floating', 'glow'].map(shadow => (
                      <button
                        key={shadow}
                        type="button"
                        onClick={() => handleFieldChange('boxShadow', shadow)}
                        style={{
                          padding: '6px 4px',
                          borderRadius: '6px',
                          border: current.boxShadow === shadow ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                          background: current.boxShadow === shadow ? '#eff6ff' : 'transparent',
                          color: current.boxShadow === shadow ? '#1d4ed8' : 'inherit',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textTransform: 'capitalize'
                        }}
                      >
                        {shadow}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: COLORS & BACKGROUND */}
          {activeTab === 'colors' && (
            <>
              {/* Theme Scope Switcher (Answers user question: Dark vs Light mode) */}
              <div className="sidebar-ui-section">
                <div className="sidebar-ui-section-title">
                  <span>🌓 THEME SCOPE (DARK VS LIGHT MODE)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  <button
                    type="button"
                    className={`sidebar-ui-pos-btn ${themeScope === 'dark_only' ? 'active' : ''}`}
                    onClick={() => handleThemeScopeChange('dark_only')}
                    style={{ padding: '8px 4px' }}
                  >
                    <span style={{ fontSize: '15px' }}>🌙</span>
                    <span style={{ fontSize: '11px' }}>Dark Mode Only</span>
                  </button>
                  <button
                    type="button"
                    className={`sidebar-ui-pos-btn ${themeScope === 'all' ? 'active' : ''}`}
                    onClick={() => handleThemeScopeChange('all')}
                    style={{ padding: '8px 4px' }}
                  >
                    <span style={{ fontSize: '15px' }}>🌐</span>
                    <span style={{ fontSize: '11px' }}>Both Modes</span>
                  </button>
                  <button
                    type="button"
                    className={`sidebar-ui-pos-btn ${themeScope === 'light_only' ? 'active' : ''}`}
                    onClick={() => handleThemeScopeChange('light_only')}
                    style={{ padding: '8px 4px' }}
                  >
                    <span style={{ fontSize: '15px' }}>☀️</span>
                    <span style={{ fontSize: '11px' }}>Light Mode Only</span>
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>
                  {themeScope === 'dark_only'
                    ? '✓ Yeh custom colors sirf Dark Mode me apply honge. Light mode default rahega.'
                    : themeScope === 'all'
                    ? '✓ Yeh custom colors Dark aur Light donon modes me unke respective palettes ke sath apply honge.'
                    : '✓ Yeh custom colors sirf Light Mode me apply honge. Dark mode default rahega.'}
                </div>

                {/* Sub-selector when Both Modes is selected */}
                {themeScope === 'all' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', marginTop: '6px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb' }}>Editing Palette:</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setEditingModeOverride('light')}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          border: activeEditingMode === 'light' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                          background: activeEditingMode === 'light' ? '#eff6ff' : 'transparent',
                          color: activeEditingMode === 'light' ? '#1d4ed8' : 'inherit',
                          cursor: 'pointer'
                        }}
                      >
                        ☀️ Light Mode
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingModeOverride('dark')}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          border: activeEditingMode === 'dark' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                          background: activeEditingMode === 'dark' ? '#eff6ff' : 'transparent',
                          color: activeEditingMode === 'dark' ? '#1d4ed8' : 'inherit',
                          cursor: 'pointer'
                        }}
                      >
                        🌙 Dark Mode
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Background */}
              <div className="sidebar-ui-section">
                <div className="sidebar-ui-section-title">
                  <span>🎨 Sidebar Background Color</span>
                </div>
                <div className="sidebar-ui-color-row">
                  <div className="sidebar-ui-color-label-group">
                    <span className="sidebar-ui-color-label">Sidebar Container Background</span>
                    <div className="sidebar-ui-color-inputs">
                      <div className="sidebar-ui-color-preview-box" style={{ backgroundColor: current.bgColor }}>
                        <input
                          type="color"
                          value={current.bgColor && current.bgColor.startsWith('#') && current.bgColor.length === 7 ? current.bgColor : '#181818'}
                          onChange={(e) => handleColorInput('bgColor', e.target.value)}
                        />
                      </div>
                      <input
                        type="text"
                        value={current.bgColor}
                        onChange={(e) => handleColorInput('bgColor', e.target.value)}
                        className="sidebar-ui-hex-input"
                      />
                    </div>
                  </div>
                  <div className="sidebar-ui-swatches">
                    {SWATCH_PALETTES.backgrounds.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        className={`sidebar-ui-swatch-dot ${(current.bgColor || '').toLowerCase() === hex.toLowerCase() ? 'active' : ''}`}
                        style={{ backgroundColor: hex }}
                        onClick={() => handleColorInput('bgColor', hex)}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Backgrounds */}
              <div className="sidebar-ui-section">
                <div className="sidebar-ui-section-title">
                  <span>🗂️ Employee Card Colors</span>
                </div>

                {/* Normal Card BG */}
                <div className="sidebar-ui-color-row">
                  <div className="sidebar-ui-color-label-group">
                    <span className="sidebar-ui-color-label">Card Background Color</span>
                    <div className="sidebar-ui-color-inputs">
                      <div className="sidebar-ui-color-preview-box" style={{ backgroundColor: current.cardBgColor }}>
                        <input
                          type="color"
                          value={current.cardBgColor && current.cardBgColor.startsWith('#') && current.cardBgColor.length === 7 ? current.cardBgColor : '#202020'}
                          onChange={(e) => handleColorInput('cardBgColor', e.target.value)}
                        />
                      </div>
                      <input
                        type="text"
                        value={current.cardBgColor}
                        onChange={(e) => handleColorInput('cardBgColor', e.target.value)}
                        className="sidebar-ui-hex-input"
                      />
                    </div>
                  </div>
                  <div className="sidebar-ui-swatches">
                    {SWATCH_PALETTES.cards.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        className={`sidebar-ui-swatch-dot ${(current.cardBgColor || '').toLowerCase() === hex.toLowerCase() ? 'active' : ''}`}
                        style={{ backgroundColor: hex }}
                        onClick={() => handleColorInput('cardBgColor', hex)}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>

                {/* Card Hover BG */}
                <div className="sidebar-ui-color-row">
                  <div className="sidebar-ui-color-label-group">
                    <span className="sidebar-ui-color-label">Card Hover Background Color (Mouse Hover)</span>
                    <div className="sidebar-ui-color-inputs">
                      <div className="sidebar-ui-color-preview-box" style={{ backgroundColor: current.cardHoverBgColor || '#282828' }}>
                        <input
                          type="color"
                          value={current.cardHoverBgColor && current.cardHoverBgColor.startsWith('#') && current.cardHoverBgColor.length === 7 ? current.cardHoverBgColor : '#282828'}
                          onChange={(e) => handleColorInput('cardHoverBgColor', e.target.value)}
                        />
                      </div>
                      <input
                        type="text"
                        value={current.cardHoverBgColor || '#282828'}
                        onChange={(e) => handleColorInput('cardHoverBgColor', e.target.value)}
                        className="sidebar-ui-hex-input"
                      />
                    </div>
                  </div>
                  <div className="sidebar-ui-swatches">
                    {SWATCH_PALETTES.hovers.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        className={`sidebar-ui-swatch-dot ${(current.cardHoverBgColor || '').toLowerCase() === hex.toLowerCase() ? 'active' : ''}`}
                        style={{ backgroundColor: hex }}
                        onClick={() => handleColorInput('cardHoverBgColor', hex)}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>

                {/* Card Hover Border */}
                <div className="sidebar-ui-color-row">
                  <div className="sidebar-ui-color-label-group">
                    <span className="sidebar-ui-color-label">Card Hover Border Color</span>
                    <div className="sidebar-ui-color-inputs">
                      <div className="sidebar-ui-color-preview-box" style={{ backgroundColor: current.cardHoverBorderColor || '#454545' }}>
                        <input
                          type="color"
                          value={current.cardHoverBorderColor && current.cardHoverBorderColor.startsWith('#') && current.cardHoverBorderColor.length === 7 ? current.cardHoverBorderColor : '#454545'}
                          onChange={(e) => handleColorInput('cardHoverBorderColor', e.target.value)}
                        />
                      </div>
                      <input
                        type="text"
                        value={current.cardHoverBorderColor || '#454545'}
                        onChange={(e) => handleColorInput('cardHoverBorderColor', e.target.value)}
                        className="sidebar-ui-hex-input"
                      />
                    </div>
                  </div>
                  <div className="sidebar-ui-swatches">
                    {SWATCH_PALETTES.hoverBorders.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        className={`sidebar-ui-swatch-dot ${(current.cardHoverBorderColor || '').toLowerCase() === hex.toLowerCase() ? 'active' : ''}`}
                        style={{ backgroundColor: hex }}
                        onClick={() => handleColorInput('cardHoverBorderColor', hex)}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>

                {/* Selected / Active Card BG */}
                <div className="sidebar-ui-color-row">
                  <div className="sidebar-ui-color-label-group">
                    <span className="sidebar-ui-color-label">Selected Card Active Highlight</span>
                    <div className="sidebar-ui-color-inputs">
                      <div className="sidebar-ui-color-preview-box" style={{ backgroundColor: current.activeCardBgColor }}>
                        <input
                          type="color"
                          value={current.activeCardBgColor && current.activeCardBgColor.startsWith('#') && current.activeCardBgColor.length === 7 ? current.activeCardBgColor : '#152438'}
                          onChange={(e) => handleColorInput('activeCardBgColor', e.target.value)}
                        />
                      </div>
                      <input
                        type="text"
                        value={current.activeCardBgColor}
                        onChange={(e) => handleColorInput('activeCardBgColor', e.target.value)}
                        className="sidebar-ui-hex-input"
                      />
                    </div>
                  </div>
                  <div className="sidebar-ui-swatches">
                    {SWATCH_PALETTES.actives.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        className={`sidebar-ui-swatch-dot ${(current.activeCardBgColor || '').toLowerCase() === hex.toLowerCase() ? 'active' : ''}`}
                        style={{ backgroundColor: hex }}
                        onClick={() => handleColorInput('activeCardBgColor', hex)}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Borders */}
              <div className="sidebar-ui-section">
                <div className="sidebar-ui-section-title">
                  <span>📐 Border Color & Styling</span>
                </div>

                <div className="sidebar-ui-color-row">
                  <div className="sidebar-ui-color-label-group">
                    <span className="sidebar-ui-color-label">Border Color</span>
                    <div className="sidebar-ui-color-inputs">
                      <div className="sidebar-ui-color-preview-box" style={{ backgroundColor: current.borderColor }}>
                        <input
                          type="color"
                          value={current.borderColor && current.borderColor.startsWith('#') && current.borderColor.length === 7 ? current.borderColor : '#2b2b2b'}
                          onChange={(e) => handleColorInput('borderColor', e.target.value)}
                        />
                      </div>
                      <input
                        type="text"
                        value={current.borderColor}
                        onChange={(e) => handleColorInput('borderColor', e.target.value)}
                        className="sidebar-ui-hex-input"
                      />
                    </div>
                  </div>
                  <div className="sidebar-ui-swatches">
                    {SWATCH_PALETTES.borders.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        className={`sidebar-ui-swatch-dot ${(current.borderColor || '').toLowerCase() === hex.toLowerCase() ? 'active' : ''}`}
                        style={{ backgroundColor: hex }}
                        onClick={() => handleColorInput('borderColor', hex)}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>

                <div className="sidebar-ui-slider-row">
                  <div className="sidebar-ui-slider-header">
                    <span>Border Width</span>
                    <span className="sidebar-ui-slider-val">{current.borderWidth} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={current.borderWidth}
                    onChange={(e) => handleFieldChange('borderWidth', Number(e.target.value))}
                    className="sidebar-ui-range"
                  />
                </div>
              </div>
            </>
          )}

          {/* TAB 3: TYPOGRAPHY & TEXT SIZES */}
          {activeTab === 'typography' && (
            <>
              {/* Text Colors */}
              <div className="sidebar-ui-section">
                <div className="sidebar-ui-section-title">
                  <span>🎨 Text Colors</span>
                </div>

                {/* Primary Text Color */}
                <div className="sidebar-ui-color-row">
                  <div className="sidebar-ui-color-label-group">
                    <span className="sidebar-ui-color-label">Primary Text Color (Names, Titles)</span>
                    <div className="sidebar-ui-color-inputs">
                      <div className="sidebar-ui-color-preview-box" style={{ backgroundColor: current.textColor }}>
                        <input
                          type="color"
                          value={current.textColor && current.textColor.startsWith('#') && current.textColor.length === 7 ? current.textColor : '#f1f5f9'}
                          onChange={(e) => handleColorInput('textColor', e.target.value)}
                        />
                      </div>
                      <input
                        type="text"
                        value={current.textColor}
                        onChange={(e) => handleColorInput('textColor', e.target.value)}
                        className="sidebar-ui-hex-input"
                      />
                    </div>
                  </div>
                  <div className="sidebar-ui-swatches">
                    {SWATCH_PALETTES.texts.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        className={`sidebar-ui-swatch-dot ${(current.textColor || '').toLowerCase() === hex.toLowerCase() ? 'active' : ''}`}
                        style={{ backgroundColor: hex }}
                        onClick={() => handleColorInput('textColor', hex)}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>

                {/* Subtext Color */}
                <div className="sidebar-ui-color-row">
                  <div className="sidebar-ui-color-label-group">
                    <span className="sidebar-ui-color-label">Subtext & Meta Color (Emails, Storage)</span>
                    <div className="sidebar-ui-color-inputs">
                      <div className="sidebar-ui-color-preview-box" style={{ backgroundColor: current.subtextColor }}>
                        <input
                          type="color"
                          value={current.subtextColor && current.subtextColor.startsWith('#') && current.subtextColor.length === 7 ? current.subtextColor : '#94a3b8'}
                          onChange={(e) => handleColorInput('subtextColor', e.target.value)}
                        />
                      </div>
                      <input
                        type="text"
                        value={current.subtextColor}
                        onChange={(e) => handleColorInput('subtextColor', e.target.value)}
                        className="sidebar-ui-hex-input"
                      />
                    </div>
                  </div>
                  <div className="sidebar-ui-swatches">
                    {SWATCH_PALETTES.subtexts.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        className={`sidebar-ui-swatch-dot ${(current.subtextColor || '').toLowerCase() === hex.toLowerCase() ? 'active' : ''}`}
                        style={{ backgroundColor: hex }}
                        onClick={() => handleColorInput('subtextColor', hex)}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Font Size Sliders */}
              <div className="sidebar-ui-section">
                <div className="sidebar-ui-section-title">
                  <span>🔤 Text Sizes (Font Size)</span>
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  {[
                    { label: 'Small', base: 11, title: 11, sub: 9.5 },
                    { label: 'Normal', base: 13, title: 13, sub: 11 },
                    { label: 'Medium', base: 14.5, title: 15, sub: 12 },
                    { label: 'Large', base: 16, title: 17, sub: 13 },
                    { label: 'XL', base: 18, title: 19, sub: 14 }
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        updateSidebarSettings({
                          fontSize: preset.base,
                          cardTitleFontSize: preset.title,
                          cardSubFontSize: preset.sub
                        });
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        borderRadius: '6px',
                        border: current.fontSize === preset.base ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        background: current.fontSize === preset.base ? '#eff6ff' : 'transparent',
                        color: current.fontSize === preset.base ? '#1d4ed8' : 'inherit',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Base Font Size */}
                <div className="sidebar-ui-slider-row">
                  <div className="sidebar-ui-slider-header">
                    <span>Base Sidebar Font Size</span>
                    <span className="sidebar-ui-slider-val">{current.fontSize} px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="22"
                    step="0.5"
                    value={current.fontSize}
                    onChange={(e) => handleFieldChange('fontSize', Number(e.target.value))}
                    className="sidebar-ui-range"
                  />
                </div>

                {/* Card Title Font Size */}
                <div className="sidebar-ui-slider-row">
                  <div className="sidebar-ui-slider-header">
                    <span>Employee Name / Title Font Size</span>
                    <span className="sidebar-ui-slider-val">{current.cardTitleFontSize} px</span>
                  </div>
                  <input
                    type="range"
                    min="11"
                    max="24"
                    step="0.5"
                    value={current.cardTitleFontSize}
                    onChange={(e) => handleFieldChange('cardTitleFontSize', Number(e.target.value))}
                    className="sidebar-ui-range"
                  />
                </div>

                {/* Card Subtext Font Size */}
                <div className="sidebar-ui-slider-row">
                  <div className="sidebar-ui-slider-header">
                    <span>Email & Storage Subtext Font Size</span>
                    <span className="sidebar-ui-slider-val">{current.cardSubFontSize} px</span>
                  </div>
                  <input
                    type="range"
                    min="9"
                    max="18"
                    step="0.5"
                    value={current.cardSubFontSize}
                    onChange={(e) => handleFieldChange('cardSubFontSize', Number(e.target.value))}
                    className="sidebar-ui-range"
                  />
                </div>
              </div>
            </>
          )}

          {/* TAB 4: PRESETS */}
          {activeTab === 'presets' && (
            <div className="sidebar-ui-section">
              <div className="sidebar-ui-section-title">
                <span>🌟 1-Click Curated Themes</span>
              </div>
              <div className="sidebar-ui-presets-grid">
                {SIDEBAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="sidebar-ui-preset-card"
                    onClick={() => applyPreset(preset)}
                  >
                    <div className="sidebar-ui-preset-header">
                      <span className="sidebar-ui-preset-icon">{preset.icon}</span>
                      <span className="sidebar-ui-preset-name">{preset.name}</span>
                    </div>
                    <div className="sidebar-ui-preset-palette">
                      <div className="sidebar-ui-preset-color-block" style={{ backgroundColor: preset.settings.bgColor }} title="Sidebar BG" />
                      <div className="sidebar-ui-preset-color-block" style={{ backgroundColor: preset.settings.cardBgColor }} title="Card BG" />
                      <div className="sidebar-ui-preset-color-block" style={{ backgroundColor: preset.settings.activeCardBgColor }} title="Active BG" />
                      <div className="sidebar-ui-preset-color-block" style={{ backgroundColor: preset.settings.textColor }} title="Text Color" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-ui-modal-footer">
          <button
            type="button"
            className="sidebar-ui-reset-btn"
            onClick={resetSidebarSettings}
          >
            <span>↺</span>
            <span>Reset to Defaults</span>
          </button>

          <button
            type="button"
            className="sidebar-ui-save-btn"
            onClick={onClose}
          >
            <span>✓</span>
            <span>Done & Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
}
