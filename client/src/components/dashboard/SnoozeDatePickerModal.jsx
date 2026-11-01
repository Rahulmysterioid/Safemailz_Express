import React, { useState } from 'react';
import ReactDOM from 'react-dom';

export default function SnoozeDatePickerModal({ onClose, onSnooze }) {
    // Default to tomorrow 9:00 AM
    const getDefaultDateTime = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        const iso = d.toISOString();
        return iso.substring(0, 16); // YYYY-MM-DDTHH:mm
    };

    const [selectedDateTime, setSelectedDateTime] = useState(getDefaultDateTime());

    const handleSubmit = (e) => {
        e.preventDefault();
        const target = new Date(selectedDateTime);
        if (isNaN(target.getTime())) {
            alert('Please select a valid date and time.');
            return;
        }
        if (target <= new Date()) {
            alert('Please select a future date and time.');
            return;
        }
        onSnooze(target.toISOString());
        onClose();
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
                    maxWidth: '380px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                    fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif'
                }}
                onClick={(e) => e.stopPropagation()}
            >
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
                        <span style={{ fontSize: '18px' }}>🕒</span>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                            Snooze until...
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ padding: '20px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                            Choose Date & Time:
                        </label>
                        <input
                            type="datetime-local"
                            value={selectedDateTime}
                            min={new Date().toISOString().substring(0, 16)}
                            onChange={(e) => setSelectedDateTime(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px',
                                color: '#0f172a',
                                outline: 'none'
                            }}
                            required
                        />
                        <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                            The email(s) will be temporarily moved to Snooze and will reappear at the top of your inbox at this time.
                        </p>
                    </div>

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
                                padding: '6px 14px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#475569',
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '6px 18px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#2563eb',
                                color: '#ffffff',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            Snooze
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
