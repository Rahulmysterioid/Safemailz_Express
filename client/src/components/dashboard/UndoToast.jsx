import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

export default function UndoToast({ message, onUndo, onDismiss, duration = 6000 }) {
    useEffect(() => {
        if (!duration) return;
        const timer = setTimeout(() => {
            onDismiss();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onDismiss]);

    return ReactDOM.createPortal(
        <div
            style={{
                position: 'fixed',
                bottom: '24px',
                left: '24px',
                zIndex: 100020,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: '#1e293b',
                color: '#ffffff',
                padding: '10px 16px',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
                fontSize: '13px',
                fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
        >
            <span style={{ color: '#f8fafc' }}>{message}</span>

            {onUndo && (
                <button
                    type="button"
                    onClick={onUndo}
                    style={{
                        background: '#38bdf8',
                        color: '#0f172a',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    Undo
                </button>
            )}

            <button
                type="button"
                onClick={onDismiss}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '16px',
                    lineHeight: 1,
                    cursor: 'pointer',
                    padding: '2px'
                }}
            >
                ×
            </button>
        </div>,
        document.body
    );
}
