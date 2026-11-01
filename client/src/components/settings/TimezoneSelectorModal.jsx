import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TIMEZONES_LIST } from './timezonesData';

export default function TimezoneSelectorModal({ isOpen, currentTimeZone, onSelect, onClose }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIana, setSelectedIana] = useState(currentTimeZone || 'Asia/Kolkata');
    const searchInputRef = useRef(null);

    // Synchronize selected state with prop when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedIana(currentTimeZone || 'Asia/Kolkata');
            setSearchQuery('');
            setTimeout(() => {
                if (searchInputRef.current) searchInputRef.current.focus();
            }, 60);
        }
    }, [isOpen, currentTimeZone]);

    // Keyboard isolation: Escape closes this modal only and stops propagation
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isOpen, onClose]);

    const filteredTimezones = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return TIMEZONES_LIST;
        return TIMEZONES_LIST.filter(tz => (
            tz.label.toLowerCase().includes(q) ||
            tz.iana.toLowerCase().includes(q) ||
            tz.offset.toLowerCase().includes(q) ||
            (tz.searchKeywords && tz.searchKeywords.toLowerCase().includes(q))
        ));
    }, [searchQuery]);

    if (!isOpen) return null;

    const handleApply = () => {
        onSelect(selectedIana);
        onClose();
    };

    return (
        <div 
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(2px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10010,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div 
                style={{
                    background: 'var(--surface-card, #ffffff)',
                    borderRadius: '8px',
                    width: '580px',
                    maxWidth: '94vw',
                    height: '620px',
                    maxHeight: '88vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25.6px 57.6px rgba(0, 0, 0, 0.22), 0 4.8px 14.4px rgba(0, 0, 0, 0.18)',
                    border: '1px solid var(--border-subtle, #e1dfdd)',
                    overflow: 'hidden'
                }}
            >
                {/* Modal Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '18px 24px 14px',
                    borderBottom: '1px solid var(--border-subtle, #edebe9)',
                    background: 'var(--surface-card, #ffffff)'
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary, #242424)', lineHeight: 1.3 }}>
                            Select time zone
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary, #616161)' }}>
                            Choose your primary time zone from standard UTC offsets.
                        </p>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose}
                        title="Close"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '22px',
                            color: 'var(--text-secondary, #616161)',
                            lineHeight: 1,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            marginTop: '-4px',
                            marginRight: '-8px'
                        }}
                    >
                        &times;
                    </button>
                </div>

                {/* Search Bar */}
                <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border-subtle, #edebe9)', background: 'var(--surface-subtle, #faf9f8)' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <svg 
                            style={{ position: 'absolute', left: '12px', width: '16px', height: '16px', color: 'var(--text-secondary, #616161)', pointerEvents: 'none' }} 
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search by city, country, or UTC offset (e.g. London, India, +05:30)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 36px 8px 36px',
                                border: '1px solid var(--border-subtle, #d1d1d1)',
                                borderRadius: '4px',
                                fontSize: '0.875rem',
                                color: 'var(--text-primary, #242424)',
                                background: 'var(--surface-card, #ffffff)',
                                outline: 'none'
                            }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-secondary, #616161)',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    lineHeight: 1,
                                    padding: '4px'
                                }}
                            >
                                &times;
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-secondary, #616161)' }}>
                        <span>Showing {filteredTimezones.length} time zones</span>
                        {selectedIana && (
                            <span>Selected: <strong>{selectedIana}</strong></span>
                        )}
                    </div>
                </div>

                {/* Timezone List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }} role="listbox">
                    {filteredTimezones.length === 0 ? (
                        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary, #616161)' }}>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary, #242424)', marginBottom: '6px' }}>
                                No time zones found
                            </div>
                            <div style={{ fontSize: '13px', marginBottom: '16px' }}>
                                No results matching "{searchQuery}". Try a major city or UTC offset.
                            </div>
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                style={{
                                    padding: '6px 14px',
                                    background: 'var(--surface-card, #ffffff)',
                                    color: 'var(--text-primary, #242424)',
                                    border: '1px solid var(--border-subtle, #d1d1d1)',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                Clear search
                            </button>
                        </div>
                    ) : (
                        filteredTimezones.map((tz) => {
                            const isSelected = selectedIana === tz.iana;
                            return (
                                <div
                                    key={tz.iana}
                                    onClick={() => setSelectedIana(tz.iana)}
                                    onDoubleClick={() => {
                                        onSelect(tz.iana);
                                        onClose();
                                    }}
                                    role="option"
                                    aria-selected={isSelected}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '10px 24px',
                                        cursor: 'pointer',
                                        background: isSelected ? 'var(--accent-subtle, #eff6ff)' : 'transparent',
                                        borderLeft: isSelected ? '3px solid var(--accent-primary, #0078d4)' : '3px solid transparent',
                                        transition: 'background 0.1s ease',
                                        borderBottom: '1px solid var(--border-subtle, #f8f8f8)'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) e.currentTarget.style.background = 'var(--surface-subtle, #f8fafc)';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    <span style={{
                                        display: 'inline-block',
                                        minWidth: '88px',
                                        padding: '3px 8px',
                                        background: isSelected ? 'var(--accent-subtle, #dbeafe)' : 'var(--surface-subtle, #f1f5f9)',
                                        color: isSelected ? 'var(--accent-primary, #1e40af)' : 'var(--text-secondary, #475569)',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        fontFamily: 'monospace',
                                        marginRight: '14px',
                                        textAlign: 'center'
                                    }}>
                                        {tz.offset}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '13.5px',
                                            fontWeight: isSelected ? 600 : 500,
                                            color: isSelected ? 'var(--accent-primary, #0078d4)' : 'var(--text-primary, #242424)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {tz.cityLabel}
                                        </div>
                                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748b)', marginTop: '2px' }}>
                                            {tz.iana}
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <span style={{ color: 'var(--accent-primary, #0078d4)', fontSize: '16px', fontWeight: 'bold', marginLeft: '12px' }}>
                                            ✓
                                        </span>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Modal Footer */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 24px',
                    borderTop: '1px solid var(--border-subtle, #edebe9)',
                    background: 'var(--surface-card, #ffffff)'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '7px 18px',
                            background: 'var(--surface-card, #ffffff)',
                            color: 'var(--text-primary, #242424)',
                            border: '1px solid var(--border-subtle, #d1d1d1)',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        style={{
                            padding: '7px 22px',
                            background: 'var(--accent-primary, #0078d4)',
                            color: 'var(--accent-text, #ffffff)',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
}
