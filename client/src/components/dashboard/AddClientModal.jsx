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

    const handleSubmit = (e) => {
        e.preventDefault();
        saveClient();
    };

    return (
        <div
            className="modal-overlay client-modal-overlay"
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
                backgroundColor: 'rgba(10, 14, 23, 0.65)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '1rem',
                opacity: 1,
                visibility: 'visible'
            }}
        >
            <div
                className="modal-card form-modal-content client-modal-card"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top Accent Bar */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #38bdf8 100%)'
                    }}
                />

                {/* Modal Header */}
                <div className="client-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="client-modal-header-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <line x1="19" y1="8" x2="19" y2="14"></line>
                                <line x1="22" y1="11" x2="16" y2="11"></line>
                            </svg>
                        </div>
                        <div>
                            <h2 id="addClientTitle" className="client-modal-title">
                                {isEdit ? 'Edit client details' : 'Enter clients details'}
                            </h2>
                            <p className="client-modal-subtitle">
                                {isEdit ? 'Update contact information for this client record' : 'Add a new client to your organization directory'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={closeModal}
                        className="client-modal-close-btn"
                        aria-label="Close modal"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSubmit} className="client-modal-form">
                    <div className="form-modal-row client-modal-field">
                        <label htmlFor="newClientName" className="client-modal-label">
                            Client name <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="text"
                            id="newClientName"
                            className="form-input client-modal-input"
                            placeholder="Enter client name (e.g. Rahul Singh)"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            autoFocus
                        />
                    </div>

                    <div className="form-modal-row client-modal-field">
                        <label htmlFor="newClientEmail" className="client-modal-label">
                            Client Email ID
                        </label>
                        <input
                            type="email"
                            id="newClientEmail"
                            className="form-input client-modal-input"
                            placeholder="Enter email address (e.g. client@company.com)"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="client-modal-two-col">
                        <div className="form-modal-row client-modal-field">
                            <label htmlFor="newClientPhone" className="client-modal-label">
                                Phone number
                            </label>
                            <input
                                type="tel"
                                id="newClientPhone"
                                className="form-input client-modal-input"
                                placeholder="Enter phone number"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div className="form-modal-row client-modal-field">
                            <label htmlFor="newClientAddress" className="client-modal-label">
                                Address / Location
                            </label>
                            <input
                                type="text"
                                id="newClientAddress"
                                className="form-input client-modal-input"
                                placeholder="Enter city or address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="client-modal-footer">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="client-modal-btn-cancel"
                        >
                            Cancel
                        </button>
                        <button
                            id="saveClientBtn"
                            type="submit"
                            className="client-modal-btn-save"
                        >
                            {isEdit ? 'Update' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
