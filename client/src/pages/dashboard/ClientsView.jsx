import React, { useState, useEffect } from 'react';
import { useClient } from '../../context/ClientContext';

export default function ClientsView() {
    const {
        filteredClients,
        searchQuery,
        setSearchQuery,
        openEditModal,
        deleteClient
    } = useClient();

    const [activeDropdown, setActiveDropdown] = useState(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = () => setActiveDropdown(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            alert('Client ID copied');
        }).catch(err => console.error('Failed to copy', err));
    };

    return (
        <div className="content-area" id="clientsView" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', padding: '1.75rem 1.75rem 6rem 1.75rem', boxSizing: 'border-box', overflowY: 'auto' }}>
            <div className="clients-header-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                            All Clients
                        </h2>
                        <span className="badge badge-neutral" id="clientsCountHeader" style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}>
                            {filteredClients.length}
                        </span>
                    </div>
                </div>

                {/* Search bar */}
                <div style={{ position: 'relative', width: '100%' }}>
                    <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-muted)', pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input 
                        type="text" 
                        placeholder="Search clients by name, email, or client ID..." 
                        id="mainClientsSearchInput" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="form-input"
                        style={{ height: '40px', paddingLeft: '2.5rem', backgroundColor: '#FFFFFF' }} 
                    />
                </div>
            </div>

            <div className="clients-cards-list" id="clientsCardsList" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredClients.length === 0 ? (
                    <div className="app-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: '#FFFFFF', border: '1.5px dashed var(--border-medium)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px auto', display: 'block', color: 'var(--text-subtle)' }}>
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>No clients found</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                            {searchQuery ? 'Try adjusting your search criteria.' : 'Get started by adding your first client.'}
                        </p>
                    </div>
                ) : (
                    filteredClients.map((c, index) => (
                        <div className="client-card app-card" key={c.id || c.clientId || index} style={{ padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                                        {index + 1}. {c.displayName || c.name}
                                    </h3>
                                    <span className="badge badge-success" style={{ fontSize: '0.725rem' }}>Active</span>
                                </div>
                                
                                <div 
                                    className="client-card-kebab" 
                                    style={{ position: 'relative', cursor: 'pointer', padding: '4px', borderRadius: 'var(--radius-sm)' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveDropdown(activeDropdown === index ? null : index);
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                                        <circle cx="12" cy="12" r="1"></circle>
                                        <circle cx="12" cy="5" r="1"></circle>
                                        <circle cx="12" cy="19" r="1"></circle>
                                    </svg>
                                    
                                    {activeDropdown === index && (
                                        <div className="client-dropdown" style={{ display: 'flex', flexDirection: 'column', position: 'absolute', right: 0, top: '100%', background: '#FFFFFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 100, minWidth: '140px', padding: '4px' }}>
                                            <div 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    setActiveDropdown(null); 
                                                    openEditModal(index); 
                                                }} 
                                                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: 'var(--radius-xs)', transition: 'background-color var(--transition-fast)' }} 
                                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-subtle)'} 
                                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 20h9"></path>
                                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                                </svg>
                                                Edit
                                            </div>
                                            <div 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    setActiveDropdown(null); 
                                                    deleteClient(index); 
                                                }} 
                                                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: 'var(--radius-xs)', transition: 'background-color var(--transition-fast)' }} 
                                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--danger-light)'} 
                                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                                Delete
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="client-fields-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div className="client-field-group form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Client ID</label>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <input 
                                            type="text" 
                                            value={c.clientId || ''} 
                                            readOnly 
                                            className="form-input"
                                            style={{ paddingRight: '36px', backgroundColor: 'var(--surface-subtle)', color: 'var(--text-primary)', fontWeight: 500, textOverflow: 'ellipsis' }} 
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => copyToClipboard(c.clientId)} 
                                            style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 'var(--radius-xs)', transition: 'all var(--transition-fast)' }} 
                                            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-primary)'; }} 
                                            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }} 
                                            title="Copy Client ID"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="client-field-group form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Client Name</label>
                                    <input type="text" value={c.name || ''} readOnly className="form-input" style={{ backgroundColor: 'var(--surface-subtle)' }} />
                                </div>

                                <div className="client-field-group form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Client Email ID</label>
                                    <input type="text" value={c.email || ''} readOnly className="form-input" style={{ backgroundColor: 'var(--surface-subtle)' }} />
                                </div>

                                <div className="client-field-group form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Address</label>
                                    <input type="text" value={c.address || ''} readOnly className="form-input" style={{ backgroundColor: 'var(--surface-subtle)' }} />
                                </div>

                                <div className="client-field-group form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number</label>
                                    <input type="text" value={c.phone || ''} readOnly className="form-input" style={{ backgroundColor: 'var(--surface-subtle)' }} />
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div style={{ height: '40px', flexShrink: 0 }} aria-hidden="true"></div>
            </div>
        </div>
    );
}