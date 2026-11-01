import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './LogoUiControllerPopover.css';

export const LOGO_CONFIG_STORAGE_KEY = 'safemailz_logo_ui_config';

export const DEFAULT_LOGO_CONFIG = {
    // Overall Position Shifts
    shiftX: -25,
    shiftY: 0,

    // Overall Scale
    scale: 0.8,

    // Shield Icon / Badge
    badgeSize: 34,
    iconSize: 19,
    badgeRadius: 8,

    // Spacing between badge & text
    gap: 10,

    // Text Content Shift (left/right & top/bottom)
    textShiftX: 0,
    textShiftY: 0,

    // Typography
    nameFontSize: 15.5,
    taglineFontSize: 10.5,
    taglineShiftY: 8,
    taglineSpacing: 0.1
};

export const LOGO_PRESETS = [
    {
        id: 'default',
        label: 'Default',
        config: { ...DEFAULT_LOGO_CONFIG }
    },
    {
        id: 'compact',
        label: 'Compact',
        config: {
            ...DEFAULT_LOGO_CONFIG,
            scale: 0.9,
            badgeSize: 30,
            iconSize: 17,
            gap: 8,
            nameFontSize: 13.5,
            taglineFontSize: 8.5
        }
    },
    {
        id: 'prominent',
        label: 'Prominent',
        config: {
            ...DEFAULT_LOGO_CONFIG,
            scale: 1.1,
            badgeSize: 38,
            iconSize: 21,
            gap: 12,
            nameFontSize: 16.5,
            taglineFontSize: 10.5
        }
    },
    {
        id: 'shift-right',
        label: 'Shifted Right (+20px)',
        config: {
            ...DEFAULT_LOGO_CONFIG,
            shiftX: 20
        }
    }
];

export default function LogoUiControllerPopover({
    isOpen,
    onClose,
    config,
    onChange,
    onReset
}) {
    const [activeTab, setActiveTab] = useState('position'); // 'position' | 'size' | 'typography'
    const popoverRef = useRef(null);

    // Draggable position state
    const [position, setPosition] = useState({ top: 68, left: 180 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Drag handlers
    const handleMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        setIsDragging(true);
        dragOffsetRef.current = {
            x: e.clientX - position.left,
            y: e.clientY - position.top
        };
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            const cardWidth = popoverRef.current?.offsetWidth || 370;
            const cardHeight = popoverRef.current?.offsetHeight || 420;
            const newLeft = Math.max(10, Math.min(window.innerWidth - cardWidth - 10, e.clientX - dragOffsetRef.current.x));
            const newTop = Math.max(10, Math.min(window.innerHeight - cardHeight - 10, e.clientY - dragOffsetRef.current.y));
            setPosition({ top: newTop, left: newLeft });
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

    const updateField = (key, val) => {
        onChange({ ...config, [key]: val });
    };

    const handleDpadShift = (dx, dy, e) => {
        const step = e?.shiftKey ? 5 : 1;
        onChange({
            ...config,
            shiftX: (config.shiftX || 0) + (dx * step),
            shiftY: (config.shiftY || 0) + (dy * step)
        });
    };

    return ReactDOM.createPortal(
        <div
            ref={popoverRef}
            className="logo-ctrl-popover"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                zIndex: 100060
            }}
        >
            {/* Draggable Header */}
            <div
                className="logo-ctrl-header"
                onMouseDown={handleMouseDown}
                title="Drag to reposition controller"
            >
                <div className="logo-ctrl-title-wrap">
                    <div className="logo-ctrl-title-icon">🎛️</div>
                    <div>
                        <h4 className="logo-ctrl-title">Logo & Brand Controller</h4>
                        <div className="logo-ctrl-subtitle">Shift position, size & typography in real-time</div>
                    </div>
                </div>
                <button
                    type="button"
                    className="logo-ctrl-close-btn"
                    onClick={onClose}
                    title="Close Controller"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="logo-ctrl-tabs">
                <button
                    type="button"
                    className={`logo-ctrl-tab-btn ${activeTab === 'position' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('position')}
                >
                    📍 Shift & Position
                </button>
                <button
                    type="button"
                    className={`logo-ctrl-tab-btn ${activeTab === 'size' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('size')}
                >
                    📐 Size & Scale
                </button>
                <button
                    type="button"
                    className={`logo-ctrl-tab-btn ${activeTab === 'typography' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('typography')}
                >
                    🔤 Typography
                </button>
            </div>

            {/* Body */}
            <div className="logo-ctrl-body">
                {/* ── TAB 1: POSITION & SHIFT ── */}
                {activeTab === 'position' && (
                    <>
                        {/* Directional D-Pad */}
                        <div className="logo-dpad-container">
                            <span className="logo-dpad-label">Directional Nudger (Hold Shift for ±5px)</span>
                            <div className="logo-dpad-row">
                                <button
                                    type="button"
                                    className="logo-dpad-btn"
                                    onClick={(e) => handleDpadShift(0, -1, e)}
                                    title="Shift Up (-1px, Shift: -5px)"
                                >
                                    ▲
                                </button>
                            </div>
                            <div className="logo-dpad-row">
                                <button
                                    type="button"
                                    className="logo-dpad-btn"
                                    onClick={(e) => handleDpadShift(-1, 0, e)}
                                    title="Shift Left (-1px, Shift: -5px)"
                                >
                                    ◀
                                </button>
                                <button
                                    type="button"
                                    className="logo-dpad-btn center-btn"
                                    onClick={() => onChange({ ...config, shiftX: 0, shiftY: 0 })}
                                    title="Center Shift (0, 0)"
                                >
                                    Center
                                </button>
                                <button
                                    type="button"
                                    className="logo-dpad-btn"
                                    onClick={(e) => handleDpadShift(1, 0, e)}
                                    title="Shift Right (+1px, Shift: +5px)"
                                >
                                    ▶
                                </button>
                            </div>
                            <div className="logo-dpad-row">
                                <button
                                    type="button"
                                    className="logo-dpad-btn"
                                    onClick={(e) => handleDpadShift(0, 1, e)}
                                    title="Shift Down (+1px, Shift: +5px)"
                                >
                                    ▼
                                </button>
                            </div>
                        </div>

                        {/* Shift X Slider */}
                        <div className="logo-ctrl-row">
                            <div className="logo-ctrl-label-wrap">
                                <span>Logo Shift Left / Right (X):</span>
                                <span className="logo-ctrl-val-badge">{config.shiftX > 0 ? `+${config.shiftX}` : config.shiftX}px</span>
                            </div>
                            <div className="logo-ctrl-inputs">
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('shiftX', (config.shiftX || 0) - 1)}
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="-60"
                                    max="120"
                                    step="1"
                                    value={config.shiftX}
                                    onChange={(e) => updateField('shiftX', parseInt(e.target.value, 10))}
                                    className="logo-ctrl-slider"
                                />
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('shiftX', (config.shiftX || 0) + 1)}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Shift Y Slider */}
                        <div className="logo-ctrl-row">
                            <div className="logo-ctrl-label-wrap">
                                <span>Logo Shift Top / Bottom (Y):</span>
                                <span className="logo-ctrl-val-badge">{config.shiftY > 0 ? `+${config.shiftY}` : config.shiftY}px</span>
                            </div>
                            <div className="logo-ctrl-inputs">
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('shiftY', (config.shiftY || 0) - 1)}
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="-30"
                                    max="30"
                                    step="1"
                                    value={config.shiftY}
                                    onChange={(e) => updateField('shiftY', parseInt(e.target.value, 10))}
                                    className="logo-ctrl-slider"
                                />
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('shiftY', (config.shiftY || 0) + 1)}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Text Content Shift X */}
                        <div className="logo-ctrl-row">
                            <div className="logo-ctrl-label-wrap">
                                <span>Text Content Shift X (Horizontal):</span>
                                <span className="logo-ctrl-val-badge">{config.textShiftX > 0 ? `+${config.textShiftX}` : config.textShiftX}px</span>
                            </div>
                            <div className="logo-ctrl-inputs">
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('textShiftX', (config.textShiftX || 0) - 1)}
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="-30"
                                    max="40"
                                    step="1"
                                    value={config.textShiftX}
                                    onChange={(e) => updateField('textShiftX', parseInt(e.target.value, 10))}
                                    className="logo-ctrl-slider"
                                />
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('textShiftX', (config.textShiftX || 0) + 1)}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Text Content Shift Y */}
                        <div className="logo-ctrl-row">
                            <div className="logo-ctrl-label-wrap">
                                <span>Text Content Shift Y (Vertical):</span>
                                <span className="logo-ctrl-val-badge">{config.textShiftY > 0 ? `+${config.textShiftY}` : config.textShiftY}px</span>
                            </div>
                            <div className="logo-ctrl-inputs">
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('textShiftY', (config.textShiftY || 0) - 1)}
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="-20"
                                    max="20"
                                    step="1"
                                    value={config.textShiftY}
                                    onChange={(e) => updateField('textShiftY', parseInt(e.target.value, 10))}
                                    className="logo-ctrl-slider"
                                />
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('textShiftY', (config.textShiftY || 0) + 1)}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* ── TAB 2: SIZE & SCALE ── */}
                {activeTab === 'size' && (
                    <>
                        {/* Overall Scale */}
                        <div className="logo-ctrl-row">
                            <div className="logo-ctrl-label-wrap">
                                <span>Master Overall Scale:</span>
                                <span className="logo-ctrl-val-badge">{(config.scale || 1).toFixed(2)}x</span>
                            </div>
                            <div className="logo-ctrl-inputs">
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('scale', Math.max(0.6, Number(((config.scale || 1) - 0.05).toFixed(2))))}
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="0.60"
                                    max="1.60"
                                    step="0.05"
                                    value={config.scale}
                                    onChange={(e) => updateField('scale', parseFloat(e.target.value))}
                                    className="logo-ctrl-slider"
                                />
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('scale', Math.min(1.6, Number(((config.scale || 1) + 0.05).toFixed(2))))}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Shield Badge Size */}
                        <div className="logo-ctrl-row">
                            <div className="logo-ctrl-label-wrap">
                                <span>Shield Badge Size:</span>
                                <span className="logo-ctrl-val-badge">{config.badgeSize}px</span>
                            </div>
                            <div className="logo-ctrl-inputs">
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('badgeSize', Math.max(20, (config.badgeSize || 34) - 1))}
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="20"
                                    max="54"
                                    step="1"
                                    value={config.badgeSize}
                                    onChange={(e) => updateField('badgeSize', parseInt(e.target.value, 10))}
                                    className="logo-ctrl-slider"
                                />
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('badgeSize', Math.min(54, (config.badgeSize || 34) + 1))}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Shield Icon Size */}
                        <div className="logo-ctrl-row">
                            <div className="logo-ctrl-label-wrap">
                                <span>Shield Icon Size:</span>
                                <span className="logo-ctrl-val-badge">{config.iconSize}px</span>
                            </div>
                            <div className="logo-ctrl-inputs">
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('iconSize', Math.max(10, (config.iconSize || 19) - 1))}
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="10"
                                    max="34"
                                    step="1"
                                    value={config.iconSize}
                                    onChange={(e) => updateField('iconSize', parseInt(e.target.value, 10))}
                                    className="logo-ctrl-slider"
                                />
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('iconSize', Math.min(34, (config.iconSize || 19) + 1))}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Gap between Icon & Text */}
                        <div className="logo-ctrl-row">
                            <div className="logo-ctrl-label-wrap">
                                <span>Spacing Gap (Icon to Text):</span>
                                <span className="logo-ctrl-val-badge">{config.gap}px</span>
                            </div>
                            <div className="logo-ctrl-inputs">
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('gap', Math.max(0, (config.gap || 10) - 1))}
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="28"
                                    step="1"
                                    value={config.gap}
                                    onChange={(e) => updateField('gap', parseInt(e.target.value, 10))}
                                    className="logo-ctrl-slider"
                                />
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('gap', Math.min(28, (config.gap || 10) + 1))}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Badge Corner Radius */}
                        <div className="logo-ctrl-row">
                            <div className="logo-ctrl-label-wrap">
                                <span>Badge Corner Radius:</span>
                                <span className="logo-ctrl-val-badge">{config.badgeRadius}px</span>
                            </div>
                            <div className="logo-ctrl-inputs">
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('badgeRadius', Math.max(0, (config.badgeRadius || 8) - 1))}
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="18"
                                    step="1"
                                    value={config.badgeRadius}
                                    onChange={(e) => updateField('badgeRadius', parseInt(e.target.value, 10))}
                                    className="logo-ctrl-slider"
                                />
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('badgeRadius', Math.min(18, (config.badgeRadius || 8) + 1))}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* ── TAB 3: TYPOGRAPHY ── */}
                {activeTab === 'typography' && (
                    <>
                        {/* Name Font Size */}
                        <div className="logo-ctrl-row">
                            <div className="logo-ctrl-label-wrap">
                                <span>"SAFEMAILZ" Font Size:</span>
                                <span className="logo-ctrl-val-badge">{config.nameFontSize}px</span>
                            </div>
                            <div className="logo-ctrl-inputs">
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('nameFontSize', Math.max(10, (config.nameFontSize || 15) - 0.5))}
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="10"
                                    max="24"
                                    step="0.5"
                                    value={config.nameFontSize}
                                    onChange={(e) => updateField('nameFontSize', parseFloat(e.target.value))}
                                    className="logo-ctrl-slider"
                                />
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('nameFontSize', Math.min(24, (config.nameFontSize || 15) + 0.5))}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Tagline Font Size */}
                        <div className="logo-ctrl-row">
                            <div className="logo-ctrl-label-wrap">
                                <span>"PROTECT YOUR CLIENTS" Font Size:</span>
                                <span className="logo-ctrl-val-badge">{config.taglineFontSize}px</span>
                            </div>
                            <div className="logo-ctrl-inputs">
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('taglineFontSize', Math.max(6, (config.taglineFontSize || 9.5) - 0.5))}
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="6"
                                    max="14"
                                    step="0.5"
                                    value={config.taglineFontSize}
                                    onChange={(e) => updateField('taglineFontSize', parseFloat(e.target.value))}
                                    className="logo-ctrl-slider"
                                />
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('taglineFontSize', Math.min(14, (config.taglineFontSize || 9.5) + 0.5))}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Tagline Vertical Offset */}
                        <div className="logo-ctrl-row">
                            <div className="logo-ctrl-label-wrap">
                                <span>Tagline Vertical Offset:</span>
                                <span className="logo-ctrl-val-badge">{config.taglineShiftY > 0 ? `+${config.taglineShiftY}` : config.taglineShiftY}px</span>
                            </div>
                            <div className="logo-ctrl-inputs">
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('taglineShiftY', (config.taglineShiftY || 0) - 1)}
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="-10"
                                    max="10"
                                    step="1"
                                    value={config.taglineShiftY}
                                    onChange={(e) => updateField('taglineShiftY', parseInt(e.target.value, 10))}
                                    className="logo-ctrl-slider"
                                />
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('taglineShiftY', (config.taglineShiftY || 0) + 1)}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Tagline Letter Spacing */}
                        <div className="logo-ctrl-row">
                            <div className="logo-ctrl-label-wrap">
                                <span>Tagline Letter Spacing:</span>
                                <span className="logo-ctrl-val-badge">{config.taglineSpacing}em</span>
                            </div>
                            <div className="logo-ctrl-inputs">
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('taglineSpacing', Math.max(0, Number(((config.taglineSpacing || 0.08) - 0.01).toFixed(2))))}
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="0.25"
                                    step="0.01"
                                    value={config.taglineSpacing}
                                    onChange={(e) => updateField('taglineSpacing', parseFloat(e.target.value))}
                                    className="logo-ctrl-slider"
                                />
                                <button
                                    type="button"
                                    className="logo-ctrl-stepper-btn"
                                    onClick={() => updateField('taglineSpacing', Math.min(0.25, Number(((config.taglineSpacing || 0.08) + 0.01).toFixed(2))))}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Presets */}
                <div className="logo-ctrl-row" style={{ marginTop: '4px' }}>
                    <div className="logo-ctrl-label-wrap">
                        <span>Quick Presets:</span>
                    </div>
                    <div className="logo-ctrl-presets-row">
                        {LOGO_PRESETS.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                className="logo-ctrl-preset-chip"
                                onClick={() => onChange({ ...p.config })}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="logo-ctrl-footer">
                <button
                    type="button"
                    className="logo-ctrl-btn-reset"
                    onClick={onReset}
                    title="Reset all settings to default"
                >
                    Reset Defaults
                </button>
                <button
                    type="button"
                    className="logo-ctrl-btn-done"
                    onClick={onClose}
                >
                    Done
                </button>
            </div>
        </div>,
        document.body
    );
}
