import React, { useState } from 'react';
import ReactDOM from 'react-dom';

export default function EmailDetailsModal({ email, initialTab = 'details', onClose }) {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [copied, setCopied] = useState(false);

    if (!email) return null;

    const rawHeaders = `From: ${email.sender || ''} <${email.senderEmail || email.realSenderEmail || 'unknown@example.com'}>
To: ${email.to || 'Undisclosed recipients'}
Cc: ${email.cc || 'None'}
Bcc: ${email.bcc || 'None'}
Subject: ${email.subject || '(No Subject)'}
Date: ${email.date ? new Date(email.date).toUTCString() : new Date().toUTCString()}
Message-ID: <${email.emailNo || email.id}@safemailz.internal>
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8
X-Safemailz-Folder: ${email.folder || 'inbox'}
X-Safemailz-Project: ${email.projectId || 'None'}
X-Safemailz-Pinned: ${Boolean(email.pinned || email.isPinned)}
X-Safemailz-Flagged: ${Boolean(email.flagged || email.isFlagged)}
X-Safemailz-Categories: ${JSON.stringify(email.categories || [])}`;

    const rawSource = `${rawHeaders}

<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${email.subject || ''}</title></head>
<body>
${email.body || email.preview || '<p>No content provided</p>'}
</body>
</html>`;

    const handleCopy = () => {
        const textToCopy = activeTab === 'source' ? rawSource : rawHeaders;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
                    maxWidth: '640px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '85vh',
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
                        <span style={{ fontSize: '18px' }}>👁️</span>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                                {activeTab === 'source' ? 'Message Source & Headers' : 'Message Details'}
                            </h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                {email.subject || 'No Subject'}
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

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 20px' }}>
                    <button
                        style={{
                            padding: '10px 16px',
                            border: 'none',
                            background: 'transparent',
                            fontSize: '13px',
                            fontWeight: activeTab === 'details' ? 600 : 400,
                            color: activeTab === 'details' ? '#2563eb' : '#64748b',
                            borderBottom: activeTab === 'details' ? '2px solid #2563eb' : '2px solid transparent',
                            cursor: 'pointer'
                        }}
                        onClick={() => setActiveTab('details')}
                    >
                        Message Details
                    </button>
                    <button
                        style={{
                            padding: '10px 16px',
                            border: 'none',
                            background: 'transparent',
                            fontSize: '13px',
                            fontWeight: activeTab === 'source' ? 600 : 400,
                            color: activeTab === 'source' ? '#2563eb' : '#64748b',
                            borderBottom: activeTab === 'source' ? '2px solid #2563eb' : '2px solid transparent',
                            cursor: 'pointer'
                        }}
                        onClick={() => setActiveTab('source')}
                    >
                        Raw Source & Headers
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    {activeTab === 'details' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                            <DetailRow label="Subject" value={email.subject || '(No Subject)'} />
                            <DetailRow label="Sender" value={`${email.sender || ''} <${email.senderEmail || email.realSenderEmail || ''}>`} />
                            <DetailRow label="To" value={email.to || '(Undisclosed recipients)'} />
                            {email.cc && <DetailRow label="Cc" value={email.cc} />}
                            {email.bcc && <DetailRow label="Bcc" value={email.bcc} />}
                            <DetailRow label="Date" value={email.date ? new Date(email.date).toLocaleString() : 'N/A'} />
                            <DetailRow label="Email No." value={email.emailNo || email.id} />
                            <DetailRow label="Folder" value={email.folder || 'inbox'} />
                            <DetailRow label="Status" value={email.read ? 'Read' : 'Unread'} />
                            <DetailRow label="Pinned" value={email.pinned || email.isPinned ? 'Yes' : 'No'} />
                            <DetailRow label="Flagged" value={email.flagged || email.isFlagged ? 'Yes' : 'No'} />
                            {email.categories && email.categories.length > 0 && (
                                <DetailRow label="Categories" value={email.categories.join(', ')} />
                            )}
                        </div>
                    ) : (
                        <pre
                            style={{
                                margin: 0,
                                padding: '14px',
                                backgroundColor: '#0f172a',
                                color: '#e2e8f0',
                                borderRadius: '8px',
                                fontSize: '12px',
                                lineHeight: '1.5',
                                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                overflowX: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all'
                            }}
                        >
                            {rawSource}
                        </pre>
                    )}
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: '12px 20px',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#f8fafc'
                    }}
                >
                    <button
                        type="button"
                        onClick={handleCopy}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#334155',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>📋</span>
                        <span>{copied ? 'Copied to clipboard!' : 'Copy to clipboard'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '6px 18px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#2563eb',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

function DetailRow({ label, value }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
            <span style={{ fontWeight: 600, color: '#64748b' }}>{label}:</span>
            <span style={{ color: '#0f172a', wordBreak: 'break-word' }}>{value}</span>
        </div>
    );
}
