import ClientAssignmentDialog from '../../components/dashboard/ClientAssignmentDialog';
import './ClientsLightPolish.css';
import React, { useState, useEffect } from 'react';
import { useClient } from '../../context/ClientContext';

const cardThemes = [
    {
        gradient: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #38bdf8 100%)',
        avatarBg: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)',
        ring: 'rgba(59, 130, 246, 0.2)',
        badgeBg: 'rgba(59, 130, 246, 0.12)',
        badgeText: '#60a5fa',
        name: 'blue'
    },
    {
        gradient: 'linear-gradient(90deg, #10b981 0%, #14b8a6 50%, #34d399 100%)',
        avatarBg: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
        ring: 'rgba(16, 185, 129, 0.2)',
        badgeBg: 'rgba(16, 185, 129, 0.12)',
        badgeText: '#34d399',
        name: 'emerald'
    },
    {
        gradient: 'linear-gradient(90deg, #8b5cf6 0%, #a855f7 50%, #c084fc 100%)',
        avatarBg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        ring: 'rgba(139, 92, 246, 0.2)',
        badgeBg: 'rgba(139, 92, 246, 0.12)',
        badgeText: '#c084fc',
        name: 'purple'
    },
    {
        gradient: 'linear-gradient(90deg, #f59e0b 0%, #f97316 50%, #fbbf24 100%)',
        avatarBg: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
        ring: 'rgba(245, 158, 11, 0.2)',
        badgeBg: 'rgba(245, 158, 11, 0.12)',
        badgeText: '#fbbf24',
        name: 'amber'
    },
    {
        gradient: 'linear-gradient(90deg, #06b6d4 0%, #0ea5e9 50%, #38bdf8 100%)',
        avatarBg: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
        ring: 'rgba(6, 182, 212, 0.2)',
        badgeBg: 'rgba(6, 182, 212, 0.12)',
        badgeText: '#38bdf8',
        name: 'cyan'
    },
    {
        gradient: 'linear-gradient(90deg, #ec4899 0%, #f43f5e 50%, #fb7185 100%)',
        avatarBg: 'linear-gradient(135deg, #ec4899 0%, #e11d48 100%)',
        ring: 'rgba(236, 72, 153, 0.2)',
        badgeBg: 'rgba(236, 72, 153, 0.12)',
        badgeText: '#fb7185',
        name: 'pink'
    }
];

export default function ClientsView() {
    const {
        clients,
        loading,
        loadError,
        fetchClients,
        filteredClients,
        searchQuery,
        setSearchQuery,
        selectedClientId,
        setSelectedClientId,
        openAddModal,
        openEditModal,
        deleteClient,
        handleImport,
        showToast
    } = useClient();

    const [assignmentClient, setAssignmentClient] = useState(null);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = () => setActiveDropdown(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const copyToClipboard = (text, label = 'Client ID', key = null) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            if (key) {
                setCopiedField(key);
                setTimeout(() => {
                    setCopiedField(curr => (curr === key ? null : curr));
                }, 2000);
            }
            showToast(`${label} copied to clipboard`, 'success');
        }).catch(err => console.error('Failed to copy', err));
    };

    const getInitials = (name) => {
        if (!name) return 'C';
        const clean = name.trim().replace(/^\d+[.)]\s*/, '').trim();
        const parts = (clean || name.trim()).split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return (clean || name.trim()).slice(0, 2).toUpperCase();
    };

    return (
        <div
            className="content-area clients-view-container flex-1 overflow-y-auto px-8 py-6 bg-slate-50/30 h-full font-inter"
            id="clientsView"
            style={{ boxSizing: 'border-box' }}
        >
            <div className="clients-view-inner w-full max-w-[1440px] mx-auto">
                {/* Top Header Bar */}
                <div className="clients-header-bar flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 w-full pb-4 border-b border-slate-200/80 dark:border-[#1e2636]">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2.5">
                            <h2 className="clients-page-title text-xl font-bold text-slate-900 dark:text-slate-100 m-0 tracking-tight">
                                All Clients
                            </h2>
                            <span
                                id="clientsCountHeader"
                                className="clients-count-pill bg-blue-50 dark:bg-[#132842] text-blue-600 dark:text-sky-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200/60 dark:border-sky-500/30"
                            >
                                {clients.length === 0 ? 0 : searchQuery ? `${filteredClients.length} of ${clients.length}` : filteredClients.length}
                            </span>
                        </div>
                        <p className="clients-page-subtitle max-w-md text-sm text-slate-500 dark:text-slate-400 mt-1 m-0">
                            Manage client profiles, contact directory, and organization identifiers
                        </p>
                    </div>

                    {/* Right-aligned Search & Quick Action */}
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div
                            className="clients-main-search-wrap relative w-full sm:w-80 flex items-center"
                            style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                        >
                            <svg
                                width={16}
                                height={16}
                                className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none shrink-0"
                                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', pointerEvents: 'none', flexShrink: 0 }}
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            <input
                                type="text"
                                placeholder="Search clients by name, email, or client ID..."
                                id="mainClientsSearchInput"
                                disabled={clients.length === 0}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="clients-main-search-input w-full h-9 pl-10 pr-8 text-xs rounded-lg bg-white dark:bg-[#141821] border border-slate-200 dark:border-[#242c3d] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs focus:border-blue-500 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-[#10141d]"
                                style={{ paddingLeft: '40px', paddingRight: searchQuery ? '32px' : '14px', boxSizing: 'border-box' }}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Clear search"
                                    title="Clear search"
                                    className="clients-main-search-clear"
                                    style={{
                                        position: 'absolute',
                                        right: '8px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '5px',
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#94a3b8',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        padding: 0
                                    }}
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Client Cards List */}
                <div
                    className="clients-cards-list space-y-4"
                    id="clientsCardsList"
                    style={{ maxHeight: 'none', overflowY: 'visible', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                >
                    {loading ? (
                        <p role="status" aria-live="polite">Loading clients...</p>
                    ) : loadError ? (
                        <div role="alert">
                            <p>{loadError}</p>
                            <button type="button" className="btn-add-client" onClick={fetchClients}>Retry</button>
                        </div>
                    ) : filteredClients.length === 0 ? (
                        clients.length === 0 ? (
                            <div className="clients-empty-state w-full min-h-[380px] bg-white dark:bg-[#141821] border border-dashed border-slate-200 dark:border-[#242c3d] rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-xs">
                                <div className="clients-empty-icon w-16 h-16 rounded-full bg-blue-50/80 dark:bg-[#132842] border border-blue-100 dark:border-sky-500/30 flex items-center justify-center text-blue-600 dark:text-sky-400 mb-5 shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                                    No clients added yet
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
                                    Get started by adding your first client to organize contact details and project assignments.
                                </p>
                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={openAddModal}
                                        className="btn-add-client inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-xs transition-all cursor-pointer border-0"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                        <span>Add First Client</span>
                                    </button>
                                    <button
                                        type="button"
                                        id="clientsEmptyImportBtn"
                                        onClick={handleImport}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white dark:bg-[#141821] hover:bg-slate-50 dark:hover:bg-[#1c2230] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#222938] text-sm font-medium shadow-2xs transition-all cursor-pointer"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="7 10 12 15 17 10"></polyline>
                                            <line x1="12" y1="15" x2="12" y2="3"></line>
                                        </svg>
                                        <span>or Import from CSV</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="clients-empty-state w-full min-h-[320px] bg-white dark:bg-[#141821] border border-dashed border-slate-200 dark:border-[#242c3d] rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center shadow-xs">
                                <div className="clients-empty-icon w-14 h-14 rounded-full bg-slate-100 dark:bg-[#1c2230] border border-slate-200/80 dark:border-[#2c364c] flex items-center justify-center mb-4 text-slate-400 dark:text-sky-400 shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                                    No matching clients found
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
                                    No client records match "{searchQuery}". Try adjusting or clearing your search filter.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-[#132842] hover:bg-blue-100 border border-blue-200/60 dark:border-sky-500/30 transition-colors cursor-pointer"
                                >
                                    <span>Clear search filter</span>
                                </button>
                            </div>
                        )
                    ) : (
                        filteredClients.map((c, index) => {
                            const name = c.displayName || c.name || `Client ${index + 1}`;
                            const initials = getInitials(name);
                            const cardId = `clientCard_${c.clientId || index}`;
                            const cardKey = c.clientId || c.id || index;
                            const isSelected = selectedClientId ? selectedClientId === cardKey : false;
                            const theme = cardThemes[index % cardThemes.length];

                            const idCopyKey = `id_${cardKey}`;
                            const emailCopyKey = `email_${cardKey}`;
                            const isIdCopied = copiedField === idCopyKey;
                            const isEmailCopied = copiedField === emailCopyKey;

                            return (
                                <div
                                    className={`client-card relative overflow-hidden p-5 rounded-xl bg-white dark:bg-[#141821] border border-slate-200/90 dark:border-[#242c3d] shadow-2xs transition-all duration-200 h-auto shrink-0 ${
                                        isSelected ? 'client-card-selected' : ''
                                    }`}
                                    key={c.id || c.clientId || index}
                                    id={cardId}
                                    onClick={() => setSelectedClientId(cardKey)}
                                >
                                    {/* Top Accent Gradient Bar */}
                                    <div
                                        className="client-card-accent-bar absolute top-0 left-0 right-0 h-[3px]"
                                        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: theme.gradient }}
                                    />

                                    {/* Card Header Row */}
                                    <div
                                        className="client-card-header flex items-center justify-between gap-4 pb-3.5 mb-4 border-b border-slate-100 dark:border-[#1f2737]"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', paddingBottom: '0.875rem', marginBottom: '1rem' }}
                                    >
                                        <div
                                            className="client-card-identity flex items-center flex-wrap gap-3 min-w-0"
                                            style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', minWidth: 0 }}
                                        >
                                            <div
                                                className="client-card-avatar w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0"
                                                style={{
                                                    width: '38px',
                                                    height: '38px',
                                                    borderRadius: '50%',
                                                    background: theme.avatarBg,
                                                    color: '#ffffff',
                                                    boxShadow: `0 0 0 4px ${theme.ring}`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    fontWeight: 700,
                                                    fontSize: '13px',
                                                    letterSpacing: '0.02em'
                                                }}
                                            >
                                                {initials}
                                            </div>
                                            <div className="flex items-center flex-wrap gap-2.5 min-w-0">
                                                <h3
                                                    className="client-card-title text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight whitespace-nowrap m-0"
                                                    style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}
                                                >
                                                    <span className="text-slate-400 dark:text-slate-400 font-semibold mr-1">{index + 1}.</span>
                                                    {name}
                                                </h3>
                                                {c.address && (
                                                    <span className="client-location-pill inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-[#1c2331] text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-[#2b3548]">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500 dark:text-purple-400 shrink-0" aria-hidden="true">
                                                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                                                            <circle cx="12" cy="10" r="3"></circle>
                                                        </svg>
                                                        <span className="truncate max-w-[140px]">{c.address}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right Action Controls: Quick Edit + Kebab Menu */}
                                        <div className="client-card-actions flex items-center gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditModal(index);
                                                }}
                                                className="client-quick-edit-btn h-7 px-2.5 rounded-lg bg-slate-50 dark:bg-[#1b2230] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#232c3d] border border-slate-200 dark:border-[#2a3447] text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer"
                                                title="Edit client details"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <path d="M12 20h9"></path>
                                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                                </svg>
                                                <span className="hidden sm:inline">Edit</span>
                                            </button>

                                            <button type="button" className="client-quick-edit-btn px-3 py-2 rounded-lg text-xs font-medium cursor-pointer" onClick={e=>{e.stopPropagation();setAssignmentClient(c);}} aria-label={`Assign employees to ${c.name} (${c.email})`}>
                                                Assign employees{c.assignedEmployeeEmails?.length ? ` (${c.assignedEmployeeEmails.length})` : ''}
                                            </button>

                                            {/* Action button & dropdown menu */}
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    className="client-kebab-btn w-7 h-7 rounded-lg bg-slate-50 dark:bg-[#1b2230] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#232c3d] border border-slate-200 dark:border-[#2a3447] flex items-center justify-center transition-colors cursor-pointer"
                                                    aria-label="Client actions"
                                                    aria-expanded={activeDropdown === index}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveDropdown(activeDropdown === index ? null : index);
                                                    }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <circle cx="12" cy="12" r="1"></circle>
                                                        <circle cx="12" cy="5" r="1"></circle>
                                                        <circle cx="12" cy="19" r="1"></circle>
                                                    </svg>
                                                </button>

                                                {activeDropdown === index && (
                                                    <div
                                                        className="client-dropdown-menu absolute right-0 top-full mt-1.5 w-36 bg-white dark:bg-[#181e2c] border border-slate-200 dark:border-[#2c364c] rounded-xl shadow-lg py-1.5 z-30"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveDropdown(null);
                                                                openEditModal(index);
                                                            }}
                                                            className="client-dropdown-item w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#232c3d] flex items-center gap-2 transition-colors cursor-pointer border-0 bg-transparent"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" aria-hidden="true">
                                                                <path d="M12 20h9"></path>
                                                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                                            </svg>
                                                            <span>Edit</span>
                                                        </button>
                                                        {c.clientId && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveDropdown(null);
                                                                    copyToClipboard(c.clientId, 'Client ID', idCopyKey);
                                                                }}
                                                                className="client-dropdown-item w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#232c3d] flex items-center gap-2 transition-colors cursor-pointer border-0 bg-transparent"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" aria-hidden="true">
                                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                                </svg>
                                                                <span>Copy ID</span>
                                                            </button>
                                                        )}
                                                        <div className="h-px bg-slate-100 dark:bg-[#252f42] my-1" />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveDropdown(null);
                                                                deleteClient(index);
                                                            }}
                                                            className="client-dropdown-item danger w-full px-3 py-1.5 text-left text-xs font-medium text-red-600 dark:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer border-0 bg-transparent"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 dark:text-rose-400" aria-hidden="true">
                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            </svg>
                                                            <span>Delete</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Single-Row Balanced Data Grid */}
                                    <div className="client-card-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 w-full" style={{ width: '100%' }}>
                                        {/* 1. CLIENT ID */}
                                        <div className="client-field-cell min-w-0">
                                            <label className="client-field-label text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="client-icon-indigo text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true">
                                                    <rect x="3" y="4" width="18" height="16" rx="3"></rect>
                                                    <circle cx="9" cy="10" r="2"></circle>
                                                    <line x1="15" y1="8" x2="17" y2="8"></line>
                                                    <line x1="15" y1="12" x2="17" y2="12"></line>
                                                    <line x1="7" y1="16" x2="17" y2="16"></line>
                                                </svg>
                                                <span>Client ID</span>
                                            </label>
                                            <div
                                                className="client-field-box min-h-[42px] px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0f131c] border border-slate-200 dark:border-[#232b3b] flex items-center justify-between gap-2"
                                                style={{ minHeight: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}
                                            >
                                                <span className="client-id-value font-mono text-xs sm:text-[13px] text-slate-900 dark:text-indigo-200 font-medium truncate" title={c.clientId || ''}>
                                                    {c.clientId || <span className="client-empty-val text-slate-400 dark:text-slate-500 italic text-xs leading-normal font-sans">— Not provided —</span>}
                                                </span>
                                                {c.clientId && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            copyToClipboard(c.clientId, 'Client ID', idCopyKey);
                                                        }}
                                                        className={`client-inline-copy-btn w-7 h-7 rounded-md bg-white dark:bg-[#1b2230] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#263044] border border-slate-200 dark:border-[#2e384d] transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                                                            isIdCopied ? 'copied' : ''
                                                        }`}
                                                        title={isIdCopied ? 'Copied!' : 'Copy Client ID'}
                                                        aria-label="Copy Client ID"
                                                    >
                                                        {isIdCopied ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="20 6 9 17 4 12"></polyline>
                                                            </svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                            </svg>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* 2. CLIENT NAME */}
                                        <div className="client-field-cell min-w-0">
                                            <label className="client-field-label text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="client-icon-blue text-blue-600 dark:text-sky-400 shrink-0" aria-hidden="true">
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                    <circle cx="12" cy="7" r="4"></circle>
                                                </svg>
                                                <span>Client Name</span>
                                            </label>
                                            <div
                                                className="client-field-box min-h-[42px] px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0f131c] border border-slate-200 dark:border-[#232b3b] flex items-center"
                                                style={{ minHeight: '42px', height: '42px', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}
                                            >
                                                {c.name || c.displayName ? (
                                                    <span className="client-field-value truncate text-slate-900 dark:text-slate-100 font-semibold text-sm leading-normal" title={c.name || c.displayName}>
                                                        {c.name || c.displayName}
                                                    </span>
                                                ) : (
                                                    <span className="client-empty-val text-slate-400 dark:text-slate-500 italic text-xs leading-normal">— Not provided —</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 3. CLIENT EMAIL ID */}
                                        <div className="client-field-cell min-w-0">
                                            <label className="client-field-label text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="client-icon-emerald text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true">
                                                    <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                                                </svg>
                                                <span>Client Email ID</span>
                                            </label>
                                            <div
                                                className="client-field-box min-h-[42px] px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0f131c] border border-slate-200 dark:border-[#232b3b] flex items-center justify-between gap-2"
                                                style={{ minHeight: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}
                                            >
                                                {c.email ? (
                                                    <>
                                                        <span className="client-field-value truncate text-slate-900 dark:text-sky-300 font-medium text-sm leading-normal" title={c.email}>
                                                            {c.email}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                copyToClipboard(c.email, 'Email ID', emailCopyKey);
                                                            }}
                                                            className={`client-inline-copy-btn w-7 h-7 rounded-md bg-white dark:bg-[#1b2230] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#263044] border border-slate-200 dark:border-[#2e384d] transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                                                                isEmailCopied ? 'copied' : ''
                                                            }`}
                                                            title={isEmailCopied ? 'Copied!' : 'Copy Email ID'}
                                                            aria-label="Copy Client Email ID"
                                                        >
                                                            {isEmailCopied ? (
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                                </svg>
                                                            ) : (
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="client-empty-val text-slate-400 dark:text-slate-500 italic text-xs leading-normal">— Not provided —</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 4. PHONE NUMBER */}
                                        <div className="client-field-cell min-w-0">
                                            <label className="client-field-label text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="client-icon-amber text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true">
                                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                                </svg>
                                                <span>Phone Number</span>
                                            </label>
                                            <div
                                                className="client-field-box min-h-[42px] px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0f131c] border border-slate-200 dark:border-[#232b3b] flex items-center"
                                                style={{ minHeight: '42px', height: '42px', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}
                                            >
                                                {c.phone ? (
                                                    <span className="client-field-value truncate text-slate-900 dark:text-slate-100 font-medium text-sm leading-normal" style={{ fontVariantNumeric: 'tabular-nums' }} title={c.phone}>
                                                        {c.phone}
                                                    </span>
                                                ) : (
                                                    <span className="client-empty-val text-slate-400 dark:text-slate-500 italic text-xs leading-normal">— Not provided —</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 5. ADDRESS */}
                                        <div className="client-field-cell min-w-0">
                                            <label className="client-field-label text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="client-icon-purple text-purple-600 dark:text-purple-400 shrink-0" aria-hidden="true">
                                                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                                                    <circle cx="12" cy="10" r="3"></circle>
                                                </svg>
                                                <span>Address</span>
                                            </label>
                                            <div
                                                className="client-field-box min-h-[42px] px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0f131c] border border-slate-200 dark:border-[#232b3b] flex items-center"
                                                style={{ minHeight: '42px', height: '42px', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}
                                            >
                                                {c.address ? (
                                                    <span className="client-field-value truncate text-slate-900 dark:text-slate-100 font-medium text-sm leading-normal" title={c.address}>
                                                        {c.address}
                                                    </span>
                                                ) : (
                                                    <span className="client-empty-val text-slate-400 dark:text-slate-500 italic text-xs leading-normal">— Not provided —</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div className="h-10 shrink-0" aria-hidden="true"></div>
                </div>
            </div>
            {assignmentClient && <ClientAssignmentDialog client={assignmentClient} onClose={()=>setAssignmentClient(null)} onSaved={async()=>{await fetchClients();showToast('Client assignment saved.', 'success');}} />}
        </div>
    );
}
