import React, { useState } from 'react';
import ReactDOM from 'react-dom';

const AVAILABLE_ACTIONS = [
    { id: 'read', label: 'Mark as read / unread', icon: '✉️' },
    { id: 'delete', label: 'Delete', icon: '🗑️' },
    { id: 'archive', label: 'Archive', icon: '📦' },
    { id: 'flag', label: 'Flag / Follow up', icon: '🚩' },
    { id: 'pin', label: 'Pin to top', icon: '📌' },
    { id: 'snooze', label: 'Snooze', icon: '🕒' },
    { id: 'move', label: 'Move to folder', icon: '📁' }
];

export default function QuickActionsModal({ currentActions = ['read', 'delete', 'snooze', 'pin'], onClose, onSave }) {
    const [selected, setSelected] = useState([...currentActions]);
    const [saving, setSaving] = useState(false);

    const toggleAction = (id) => {
        if (selected.includes(id)) {
            if (selected.length <= 1) {
                alert('You must keep at least 1 quick action.');
                return;
            }
            setSelected(selected.filter(item => item !== id));
        } else {
            if (selected.length >= 4) {
                alert('You can select a maximum of 4 quick actions for email row hover.');
                return;
            }
            setSelected([...selected, id]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(selected);
            onClose();
        } catch (e) {
            console.error('Failed to save quick actions:', e);
            alert('Failed to save quick actions settings.');
        } finally {
            setSaving(false);
        }
    };

    return ReactDOM.createPortal(
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100010,
                padding: '16px'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    width: '100%',
                    maxWidth: '460px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                    fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>⚙️</span>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                                Set Quick Actions
                            </h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                Choose up to 4 actions to show when hovering over an email in your inbox.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            fontSize: '20px',
                            cursor: 'pointer',
                            color: '#94a3b8'
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '16px 20px', maxHeight: '380px', overflowY: 'auto' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                        Selected: {selected.length} / 4 actions
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {AVAILABLE_ACTIONS.map(action => {
                            const isChecked = selected.includes(action.id);
                            return (
                                <label
                                    key={action.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: isChecked ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                                        backgroundColor: isChecked ? '#eff6ff' : '#ffffff',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '16px' }}>{action.icon}</span>
                                        <span style={{ fontSize: '13px', fontWeight: isChecked ? 600 : 400, color: isChecked ? '#1e40af' : '#334155' }}>
                                            {action.label}
                                        </span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleAction(action.id)}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: '12px 20px',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '10px',
                        backgroundColor: '#f8fafc'
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#475569',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            padding: '8px 20px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#2563eb',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: saving ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {saving ? 'Saving...' : 'Save Quick Actions'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
