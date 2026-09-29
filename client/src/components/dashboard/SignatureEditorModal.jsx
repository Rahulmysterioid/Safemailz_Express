import React, { useState, useEffect, useRef } from 'react';

export default function SignatureEditorModal({ isOpen, signature, onClose, onSave }) {
    const [name, setName] = useState('');
    const [defaultNew, setDefaultNew] = useState(false);
    const [defaultReply, setDefaultReply] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    
    // Formatting & Dropdowns State
    const [openDropdown, setOpenDropdown] = useState(null);
    const [currentFont, setCurrentFont] = useState('Aptos');
    const [currentFontSize, setCurrentFontSize] = useState('12');
    const [textColor, setTextColor] = useState('#d93025');
    const [highlightColor, setHighlightColor] = useState('#ffff00');

    const editorRef = useRef(null);
    const fileInputRef = useRef(null);
    const modalRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            const userStr = localStorage.getItem('currentUser');
            if (userStr) {
                try {
                    const u = JSON.parse(userStr);
                    if (u.email) setUserEmail(u.email);
                } catch (e) {}
            }

            if (signature) {
                setName(signature.name || '');
                setDefaultNew(localStorage.getItem('defaultSignatureNew') === signature.id);
                setDefaultReply(localStorage.getItem('defaultSignatureReply') === signature.id);
                if (editorRef.current) {
                    editorRef.current.innerHTML = signature.content || '';
                }
            } else {
                setName('');
                setDefaultNew(false);
                setDefaultReply(false);
                if (editorRef.current) {
                    editorRef.current.innerHTML = '';
                }
            }
            setOpenDropdown(null);
        }
    }, [isOpen, signature]);

    // Click outside dropdown handler
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.email-composer-dropdown-menu') && !e.target.closest('.dropdown-select-btn') && !e.target.closest('.color-dropdown-btn')) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isOpen) return null;

    const formatDoc = (cmd, val = null) => {
        if (editorRef.current) {
            editorRef.current.focus();
        }
        document.execCommand(cmd, false, val);
        setOpenDropdown(null);
    };

    const changeFont = (fontName, displayName) => {
        setCurrentFont(displayName);
        formatDoc('fontName', fontName);
    };

    const changeFontSizePt = (pt) => {
        setCurrentFontSize(pt);
        // Map pt to execCommand font size (1-7)
        const sizeMap = { '8': '1', '10': '2', '11': '2', '12': '3', '14': '4', '18': '5', '24': '6', '36': '7' };
        formatDoc('fontSize', sizeMap[pt] || '3');
    };

    const changeLineSpacing = (spacing) => {
        if (editorRef.current) {
            editorRef.current.focus();
            editorRef.current.style.lineHeight = spacing;
        }
        setOpenDropdown(null);
    };

    const insertEmoji = (emoji) => {
        if (editorRef.current) {
            editorRef.current.focus();
            document.execCommand('insertText', false, emoji);
        }
        setOpenDropdown(null);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (editorRef.current) editorRef.current.focus();
                document.execCommand('insertImage', false, event.target.result);
            };
            reader.readAsDataURL(file);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleInsertLink = () => {
        const url = prompt('Enter URL for hyperlink:', 'https://');
        if (url) {
            if (editorRef.current) editorRef.current.focus();
            document.execCommand('createLink', false, url);
        }
    };

    const handleInsertTable = () => {
        const tableHtml = '<table border="1" style="border-collapse:collapse; width:100%; border:1px solid #CBD5E1; margin: 8px 0;"><tbody><tr><td style="padding:8px; border:1px solid #CBD5E1;">Cell 1</td><td style="padding:8px; border:1px solid #CBD5E1;">Cell 2</td></tr><tr><td style="padding:8px; border:1px solid #CBD5E1;">Cell 3</td><td style="padding:8px; border:1px solid #CBD5E1;">Cell 4</td></tr></tbody></table><p><br></p>';
        if (editorRef.current) editorRef.current.focus();
        document.execCommand('insertHTML', false, tableHtml);
    };

    const handleSave = () => {
        const signatureId = signature?.id || 'sig_' + Date.now();
        const signatureName = name.trim() || 'Untitled Signature';
        const signatureContent = editorRef.current ? editorRef.current.innerHTML : '';

        onSave({
            id: signatureId,
            name: signatureName,
            content: signatureContent,
            defaultNew,
            defaultReply
        });
    };

    const colorPalette = [
        '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
        '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
        '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
        '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
        '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
        '#a61c1c', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
        '#852020', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47',
        '#5b0f0f', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130'
    ];

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10002,
            fontFamily: "'Inter', sans-serif"
        }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div ref={modalRef} style={{
                background: '#ffffff',
                borderRadius: '8px',
                width: '1060px',
                maxWidth: '96vw',
                maxHeight: '94vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
                border: '1px solid #E2E8F0',
                overflow: 'hidden'
            }}>
                {/* Modal Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 20px',
                    borderBottom: '1px solid #E2E8F0',
                    background: '#F8FAFC'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
                            {signature ? 'Edit signature' : 'Add signature'}
                        </h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {userEmail && (
                            <span style={{
                                fontSize: '11px',
                                color: '#475569',
                                background: '#FFFFFF',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                border: '1px solid #CBD5E1',
                                fontWeight: 500
                            }}>
                                {userEmail}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '20px',
                                color: '#64748B',
                                lineHeight: 1,
                                padding: '2px 6px',
                                borderRadius: '4px'
                            }}
                            title="Close"
                        >
                            &times;
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
                    
                    {/* Hidden Picture Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleImageUpload}
                    />

                    {/* FULL COMPOSE EMAIL RIBBON TOOLBAR */}
                    <div className="email-composer-toolbar expanded-ribbon" style={{ display: "flex", width: '100%', overflowX: 'auto', border: '1px solid #CBD5E1', borderRadius: '6px', margin: 0 }}>
                        
                        {/* Group 1: Clipboard */}
                        <div className="ribbon-group">
                            <div className="ribbon-group-content">
                                <button className="email-composer-toolbar-btn stacked-btn" type="button"
                                    onClick={() => formatDoc('paste')} title="Paste">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                    </svg>
                                    <span className="stacked-btn-text">Paste</span>
                                </button>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <button className="email-composer-toolbar-btn" type="button"
                                        onClick={() => formatDoc('undo')} title="Undo">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 7v6h6" />
                                            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                                        </svg>
                                    </button>
                                    <button className="email-composer-toolbar-btn" type="button"
                                        onClick={() => formatDoc('copy')} title="Copy Format / Copy">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 14V8a6 6 0 0 0-12 0v6M12 2v6M5 14h14v3a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <span className="ribbon-group-label">Clipboard</span>
                        </div>

                        {/* Group 2: Basic Text */}
                        <div className="ribbon-group">
                            <div className="ribbon-group-content">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'center' }}>
                                    {/* Row 1: Font, Size & Clear */}
                                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                        <div style={{ position: 'relative' }}>
                                            <button className="email-composer-toolbar-btn dropdown-select-btn"
                                                type="button"
                                                onClick={() => setOpenDropdown(openDropdown === 'font' ? null : 'font')}
                                                title="Font Family"
                                                style={{ width: '85px', height: '22px', padding: '0 4px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '500', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentFont}</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9"
                                                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                    strokeWidth="2.5" strokeLinecap="round"
                                                    strokeLinejoin="round" style={{ color: '#64748b' }}>
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </button>
                                            {openDropdown === 'font' && (
                                                <div className="email-composer-dropdown-menu" style={{ width: '130px', display: 'block', position: 'absolute', top: '100%', left: 0, zIndex: 10005, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                                                    <button className="email-composer-dropdown-item" type="button" onClick={() => changeFont('Aptos', 'Aptos')} style={{ fontFamily: "Aptos, sans-serif" }}>Aptos</button>
                                                    <button className="email-composer-dropdown-item" type="button" onClick={() => changeFont('Inter', 'Inter')} style={{ fontFamily: "Inter, sans-serif" }}>Inter</button>
                                                    <button className="email-composer-dropdown-item" type="button" onClick={() => changeFont('Arial', 'Arial')} style={{ fontFamily: "Arial" }}>Arial</button>
                                                    <button className="email-composer-dropdown-item" type="button" onClick={() => changeFont('Calibri', 'Calibri')} style={{ fontFamily: "Calibri" }}>Calibri</button>
                                                    <button className="email-composer-dropdown-item" type="button" onClick={() => changeFont('Segoe UI', 'Segoe UI')} style={{ fontFamily: "Segoe UI, sans-serif" }}>Segoe UI</button>
                                                    <button className="email-composer-dropdown-item" type="button" onClick={() => changeFont('Times New Roman', 'Times New Roman')} style={{ fontFamily: "Times New Roman" }}>Times New Roman</button>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ position: 'relative' }}>
                                            <button className="email-composer-toolbar-btn dropdown-select-btn"
                                                type="button"
                                                onClick={() => setOpenDropdown(openDropdown === 'fontSize' ? null : 'fontSize')}
                                                title="Font Size"
                                                style={{ width: '40px', height: '22px', padding: '0 4px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '500', color: '#1e293b' }}>{currentFontSize}</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9"
                                                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                    strokeWidth="2.5" strokeLinecap="round"
                                                    strokeLinejoin="round" style={{ color: '#64748b' }}>
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </button>
                                            {openDropdown === 'fontSize' && (
                                                <div className="email-composer-dropdown-menu" style={{ width: '55px', display: 'block', position: 'absolute', top: '100%', left: 0, zIndex: 10005, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                                                    <button className="email-composer-dropdown-item" type="button" onClick={() => changeFontSizePt('10')}>10</button>
                                                    <button className="email-composer-dropdown-item" type="button" onClick={() => changeFontSizePt('11')}>11</button>
                                                    <button className="email-composer-dropdown-item" type="button" onClick={() => changeFontSizePt('12')}>12</button>
                                                    <button className="email-composer-dropdown-item" type="button" onClick={() => changeFontSizePt('14')}>14</button>
                                                    <button className="email-composer-dropdown-item" type="button" onClick={() => changeFontSizePt('18')}>18</button>
                                                    <button className="email-composer-dropdown-item" type="button" onClick={() => changeFontSizePt('24')}>24</button>
                                                </div>
                                            )}
                                        </div>

                                        <button className="email-composer-toolbar-btn" type="button"
                                            onClick={() => formatDoc('removeFormat')} title="Clear Formatting"
                                            style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Row 2: Formatting Toggles */}
                                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                        <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                                            <button className="email-composer-toolbar-btn" type="button"
                                                onClick={() => formatDoc('bold')} title="Bold"
                                                style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <strong style={{ fontFamily: "system-ui, sans-serif", fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>B</strong>
                                            </button>
                                            <button className="email-composer-toolbar-btn" type="button"
                                                onClick={() => formatDoc('italic')} title="Italic"
                                                style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <em style={{ fontFamily: "Georgia, serif", fontSize: '13px', fontWeight: '600', fontStyle: 'italic', color: '#1e293b' }}>I</em>
                                            </button>
                                            <button className="email-composer-toolbar-btn" type="button"
                                                onClick={() => formatDoc('underline')} title="Underline"
                                                style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ textDecoration: 'underline', fontFamily: "system-ui, sans-serif", fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>U</span>
                                            </button>
                                            <button className="email-composer-toolbar-btn" type="button"
                                                onClick={() => formatDoc('strikeThrough')} title="Strikethrough"
                                                style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ textDecoration: 'line-through', fontFamily: "system-ui, sans-serif", fontSize: '12px', fontWeight: '600', color: '#475569' }}>ab</span>
                                            </button>
                                        </div>

                                        <div style={{ height: '12px', width: '1px', background: '#cbd5e1', margin: '0 1px' }}></div>

                                        <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                                            <button className="email-composer-toolbar-btn" type="button"
                                                onClick={() => formatDoc('subscript')} title="Subscript"
                                                style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ fontFamily: "system-ui, sans-serif", fontSize: '11px', color: '#475569' }}>X<sub>2</sub></span>
                                            </button>
                                            <button className="email-composer-toolbar-btn" type="button"
                                                onClick={() => formatDoc('superscript')} title="Superscript"
                                                style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ fontFamily: "system-ui, sans-serif", fontSize: '11px', color: '#475569' }}>X<sup>2</sup></span>
                                            </button>
                                            <button className="email-composer-toolbar-btn" type="button"
                                                onClick={() => formatDoc('removeFormat')} title="Change Case"
                                                style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ fontWeight: '600', fontSize: '11px', color: '#475569' }}>Aa</span>
                                            </button>
                                        </div>

                                        <div style={{ height: '12px', width: '1px', background: '#cbd5e1', margin: '0 1px' }}></div>

                                        {/* Color Pickers */}
                                        <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                                            <div style={{ position: 'relative' }}>
                                                <button className="email-composer-toolbar-btn color-dropdown-btn"
                                                    type="button"
                                                    onClick={() => setOpenDropdown(openDropdown === 'highlight' ? null : 'highlight')}
                                                    title="Highlight Color"
                                                    style={{ width: '22px', height: '22px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                        viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 22C17.5 22 22 17.5 22 12S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z" />
                                                        <path d="M11 7l4 4-7.5 7.5H4v-3.5L11 7z" />
                                                    </svg>
                                                    <span className="color-underline-indicator highlight-indicator"
                                                        style={{ backgroundColor: highlightColor, position: 'absolute', bottom: '2px', left: '3px', right: '3px', height: '3px', borderRadius: '1px' }}></span>
                                                </button>
                                                {openDropdown === 'highlight' && (
                                                    <div className="email-composer-color-palette" style={{ display: 'block', position: 'absolute', top: '100%', left: 0, zIndex: 10005, background: '#fff', padding: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                                                        <div className="email-composer-color-grid-title" style={{ fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>Highlight Color</div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 16px)', gap: '3px' }}>
                                                            {['#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#0000ff', '#ff0000', '#000080', '#008080', '#008000', '#800080', '#800000', '#808000', '#808080', '#c0c0c0', '#ffffff', 'transparent'].map((c, i) => (
                                                                <div
                                                                    key={i}
                                                                    onClick={() => { setHighlightColor(c); formatDoc('hiliteColor', c); }}
                                                                    style={{ width: '16px', height: '16px', backgroundColor: c, border: '1px solid #ccc', cursor: 'pointer' }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ position: 'relative' }}>
                                                <button className="email-composer-toolbar-btn color-dropdown-btn"
                                                    type="button"
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
                                                {openDropdown === 'textColor' && (
                                                    <div className="email-composer-color-palette" style={{ display: 'block', position: 'absolute', top: '100%', left: 0, zIndex: 10005, background: '#fff', padding: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                                                        <div className="email-composer-color-grid-title" style={{ fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>Text Color</div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 16px)', gap: '3px', maxHeight: '180px', overflowY: 'auto' }}>
                                                            {colorPalette.map((c, i) => (
                                                                <div
                                                                    key={i}
                                                                    onClick={() => { setTextColor(c); formatDoc('foreColor', c); }}
                                                                    style={{ width: '16px', height: '16px', backgroundColor: c, border: '1px solid #ccc', cursor: 'pointer' }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <span className="ribbon-group-label" style={{ textAlign: 'center', width: '100%' }}>Basic Text</span>
                        </div>

                        {/* Group 3: Paragraph */}
                        <div className="ribbon-group">
                            <div className="ribbon-group-content">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    {/* Row 1: Lists & Indents */}
                                    <div style={{ display: 'flex', gap: '1px' }}>
                                        <button className="email-composer-toolbar-btn" type="button"
                                            onClick={() => formatDoc('insertUnorderedList')} title="Bullet List">
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
                                            onClick={() => formatDoc('insertOrderedList')} title="Numbered List">
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
                                            onClick={() => formatDoc('outdent')} title="Decrease Indent">
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
                                            onClick={() => formatDoc('indent')} title="Increase Indent">
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
                                            onClick={() => formatDoc('justifyLeft')} title="Align Left">
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
                                            onClick={() => formatDoc('justifyCenter')} title="Center">
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
                                            onClick={() => formatDoc('justifyRight')} title="Align Right">
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
                                            onClick={() => formatDoc('justifyFull')} title="Justify">
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
                                                type="button"
                                                onClick={() => setOpenDropdown(openDropdown === 'lineSpacing' ? null : 'lineSpacing')}
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
                                            {openDropdown === 'lineSpacing' && (
                                                <div className="email-composer-dropdown-menu" style={{ width: '90px', display: 'block', position: 'absolute', top: '100%', left: 0, zIndex: 10005, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                                                    <button className="email-composer-dropdown-item" type="button" onClick={() => changeLineSpacing('1.0')}>1.0</button>
                                                    <button className="email-composer-dropdown-item" type="button" onClick={() => changeLineSpacing('1.15')}>1.15</button>
                                                    <button className="email-composer-dropdown-item" type="button" onClick={() => changeLineSpacing('1.5')}>1.5</button>
                                                    <button className="email-composer-dropdown-item" type="button" onClick={() => changeLineSpacing('2.0')}>2.0</button>
                                                </div>
                                            )}
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
                                    onClick={() => fileInputRef.current?.click()} title="Attach File / Picture">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                    </svg>
                                    <span className="stacked-btn-text">Attach</span>
                                </button>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
                                            onClick={() => formatDoc('insertHorizontalRule')}
                                            title="Horizontal Line">
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
                                        onClick={() => fileInputRef.current?.click()} title="Pictures">
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
                                        {openDropdown === 'emoji' && (
                                            <div className="email-composer-dropdown-menu" style={{ width: '160px', padding: '5px', display: 'flex', flexWrap: 'wrap', gap: '3px', position: 'absolute', top: '100%', left: 0, zIndex: 10005, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                                                {['😊', '👍', '❤️', '🎉', '🙏', '🚀', '💡', '🔥', '✅', '⭐'].map((em, idx) => (
                                                    <button key={idx} className="email-composer-dropdown-item" type="button"
                                                        onClick={() => insertEmoji(em)}
                                                        style={{ fontSize: '15px', padding: '3px', textAlign: 'center', minWidth: '26px' }}>{em}</button>
                                                ))}
                                            </div>
                                        )}
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
                                <button className="email-composer-toolbar-btn stacked-btn" type="button"
                                    onClick={() => alert("Voice typing / dictation active")} title="Dictate">
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
                                    onClick={() => formatDoc('spellcheck')} title="Editor / Proofing">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
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
                                    onClick={() => alert("Add-ins panel")} title="Add-ins">
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
                                    <button className="email-composer-toolbar-btn" type="button"
                                        onClick={() => formatDoc('bold')} title="High Importance"
                                        style={{ padding: '1px 3px' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                            strokeLinecap="round" strokeLinejoin="round" style={{ color: '#d93025' }}>
                                            <line x1="12" y1="4" x2="12" y2="15" />
                                            <line x1="12" y1="19" x2="12.01" y2="19" />
                                        </svg>
                                    </button>
                                    <button className="email-composer-toolbar-btn" type="button"
                                        onClick={() => formatDoc('italic')} title="Low Importance"
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
                                    onClick={() => window.print()} title="Print">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 6 2 18 2 18 9" />
                                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                        <rect x="6" y="14" width="12" height="8" />
                                    </svg>
                                    <span className="stacked-btn-text">Print</span>
                                </button>
                            </div>
                            <span className="ribbon-group-label">Print</span>
                        </div>

                    </div>

                    {/* Signature Name Input */}
                    <div>
                        <input
                            type="text"
                            placeholder="Add a signature name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{
                                width: '100%',
                                border: '1px solid #CBD5E1',
                                borderRadius: '4px',
                                padding: '8px 12px',
                                fontSize: '13px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                fontFamily: "'Inter', sans-serif",
                                color: '#0F172A'
                            }}
                        />
                    </div>

                    {/* Contenteditable Rich Text Editor Area */}
                    <div
                        ref={editorRef}
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        style={{
                            width: '100%',
                            border: '1px solid #CBD5E1',
                            borderRadius: '4px',
                            padding: '12px',
                            minHeight: '160px',
                            maxHeight: '260px',
                            fontSize: '13px',
                            outline: 'none',
                            background: '#FFFFFF',
                            color: '#0F172A',
                            overflowY: 'auto',
                            boxSizing: 'border-box',
                            lineHeight: 1.5,
                            fontFamily: "'Inter', sans-serif"
                        }}
                    />

                    {/* Checkboxes for Default selection */}
                    <div style={{ display: 'flex', gap: '24px', marginTop: '2px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', fontWeight: 500 }}>
                            <input
                                type="checkbox"
                                checked={defaultNew}
                                onChange={(e) => setDefaultNew(e.target.checked)}
                                style={{ cursor: 'pointer' }}
                            />
                            Set default for new messages
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', fontWeight: 500 }}>
                            <input
                                type="checkbox"
                                checked={defaultReply}
                                onChange={(e) => setDefaultReply(e.target.checked)}
                                style={{ cursor: 'pointer' }}
                            />
                            Set default for replies and forwards
                        </label>
                    </div>

                </div>

                {/* Modal Footer Actions */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    padding: '12px 20px',
                    borderTop: '1px solid #E2E8F0',
                    background: '#F8FAFC'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '6px 16px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#475569',
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        style={{
                            padding: '6px 20px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#FFFFFF',
                            background: '#0078D4',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0, 120, 212, 0.2)'
                        }}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
