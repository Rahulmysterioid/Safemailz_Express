import React, { useEffect } from 'react';
import { useClient } from '../../context/ClientContext';

export default function AddClientModal() {
    const { isModalOpen, editingClientIndex, formData, setFormData, closeModal, saveClient } = useClient();

    // Close on Esc key
    useEffect(() => {
        if (!isModalOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') closeModal();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isModalOpen, closeModal]);

    if (!isModalOpen) return null;

    const isEdit = editingClientIndex !== null;

    return (
        <div 
            className="modal-overlay" 
            id="addClientModal" 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="addClientTitle"
            onClick={closeModal}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                opacity: 1,
                visibility: 'visible'
            }}
        >
            <div 
                className="modal-card form-modal-content"
                style={{ 
                    width: '100%', 
                    maxWidth: '520px', 
                    padding: '1.75rem 2rem', 
                    borderRadius: '12px', 
                    background: '#fff', 
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
                    border: '1px solid #E2E8F0',
                    position: 'relative'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 
                        id="addClientTitle"
                        style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: 0, fontFamily: "'Inter', sans-serif" }}
                    >
                        {isEdit ? 'Edit client details' : 'Enter clients details'}
                    </h2>
                    <button 
                        onClick={closeModal}
                        style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            fontSize: '1.35rem', 
                            cursor: 'pointer', 
                            color: '#6B7280', 
                            lineHeight: 1, 
                            padding: '4px 8px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        aria-label="Close modal"
                    >
                        &times;
                    </button>
                </div>

                {/* Form Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-modal-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label htmlFor="newClientName" style={{ color: '#111827', fontSize: '0.8rem', fontWeight: 600 }}>
                            Client name
                        </label>
                        <input 
                            type="text" 
                            id="newClientName" 
                            className="form-input"
                            placeholder="Enter client name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            style={{ width: '100%', height: '40px', border: '1px solid #D1D5DB', borderRadius: '8px', background: '#fff', color: '#0F172A', fontSize: '0.875rem', padding: '0 0.85rem', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box', outline: 'none' }} 
                        />
                    </div>

                    <div className="form-modal-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label htmlFor="newClientAddress" style={{ color: '#111827', fontSize: '0.8rem', fontWeight: 600 }}>
                            Address
                        </label>
                        <input 
                            type="text" 
                            id="newClientAddress" 
                            className="form-input"
                            placeholder="Enter address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            style={{ width: '100%', height: '40px', border: '1px solid #D1D5DB', borderRadius: '8px', background: '#fff', color: '#0F172A', fontSize: '0.875rem', padding: '0 0.85rem', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box', outline: 'none' }} 
                        />
                    </div>

                    <div className="form-modal-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label htmlFor="newClientEmail" style={{ color: '#111827', fontSize: '0.8rem', fontWeight: 600 }}>
                            Client Email ID
                        </label>
                        <input 
                            type="email" 
                            id="newClientEmail" 
                            className="form-input"
                            placeholder="Enter email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            style={{ width: '100%', height: '40px', border: '1px solid #D1D5DB', borderRadius: '8px', background: '#fff', color: '#0F172A', fontSize: '0.875rem', padding: '0 0.85rem', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box', outline: 'none' }} 
                        />
                    </div>

                    <div className="form-modal-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label htmlFor="newClientPhone" style={{ color: '#111827', fontSize: '0.8rem', fontWeight: 600 }}>
                            Phone number
                        </label>
                        <input 
                            type="tel" 
                            id="newClientPhone" 
                            className="form-input"
                            placeholder="Enter phone number"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            style={{ width: '100%', height: '40px', border: '1px solid #D1D5DB', borderRadius: '8px', background: '#fff', color: '#0F172A', fontSize: '0.875rem', padding: '0 0.85rem', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box', outline: 'none' }} 
                        />
                    </div>
                </div>

                {/* Actions Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                    <button 
                        type="button"
                        onClick={closeModal}
                        style={{ 
                            height: '38px', 
                            padding: '0 1.5rem', 
                            borderRadius: '8px', 
                            fontSize: '0.85rem', 
                            fontWeight: 600, 
                            cursor: 'pointer', 
                            fontFamily: "'Inter', sans-serif",
                            background: '#fff',
                            color: '#2563EB',
                            border: '1.5px solid #2563EB',
                            transition: 'background-color 0.15s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#EFF6FF'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                    >
                        Cancel
                    </button>
                    <button 
                        id="saveClientBtn" 
                        type="button"
                        onClick={saveClient}
                        style={{ 
                            height: '38px', 
                            padding: '0 1.75rem', 
                            borderRadius: '8px', 
                            fontSize: '0.85rem', 
                            fontWeight: 600, 
                            cursor: 'pointer', 
                            fontFamily: "'Inter', sans-serif",
                            background: '#2563EB',
                            color: '#fff',
                            border: 'none',
                            transition: 'background-color 0.15s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
                    >
                        {isEdit ? 'Update' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
