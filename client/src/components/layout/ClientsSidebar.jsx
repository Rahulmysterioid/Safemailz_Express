import React from 'react';
import { useClient } from '../../context/ClientContext';
import SidebarActionHeader from './SidebarActionHeader';

const avatarPalettes = [
    { bg: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)', color: '#ffffff', ring: 'rgba(59, 130, 246, 0.22)' },
    { bg: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)', color: '#ffffff', ring: 'rgba(16, 185, 129, 0.22)' },
    { bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: '#ffffff', ring: 'rgba(139, 92, 246, 0.22)' },
    { bg: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)', color: '#ffffff', ring: 'rgba(245, 158, 11, 0.22)' },
    { bg: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)', color: '#ffffff', ring: 'rgba(6, 182, 212, 0.22)' },
    { bg: 'linear-gradient(135deg, #ec4899 0%, #e11d48 100%)', color: '#ffffff', ring: 'rgba(236, 72, 153, 0.22)' }
];

export default function ClientsSidebar() {
    const {
        clients,
        selectedClientId,
        setSelectedClientId,
        searchQuery: clientSearch,
        setSearchQuery: setClientSearch,
        openAddModal: openAddClientModal,
        handleImport: handleImportClients,
        handleExport: handleExportClients
    } = useClient();

    const filteredClients = clients.filter(c => {
        if (!clientSearch.trim()) return true;
        const q = clientSearch.toLowerCase().trim();
        return (
            (c.name || '').toLowerCase().includes(q) ||
            (c.displayName || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.phone || '').toLowerCase().includes(q) ||
            (c.address || '').toLowerCase().includes(q) ||
            (c.clientId || '').toLowerCase().includes(q)
        );
    });

    const getInitials = (name) => {
        if (!name) return 'C';
        const clean = name.trim().replace(/^\d+[.)]\s*/, '').trim();
        const parts = (clean || name.trim()).split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return (clean || name.trim()).slice(0, 2).toUpperCase();
    };

    return (
        <aside
            className="sidebar clients-sidebar w-72 shrink-0 border-r border-slate-200 dark:border-[#1e2636] bg-white dark:bg-[#0e121a] flex flex-col h-full font-inter"
            id="clientsSidebar"
        >
            {/* Top Control Header */}
            <SidebarActionHeader className="clients-sidebar-header">
                <button
                    type="button"
                    className="btn-add-client w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border-0"
                    id="btnAddClient"
                    onClick={openAddClientModal}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>Add Client</span>
                </button>

                {/* Total Counter Pill Bar */}
                <div className="sidebar-stats clients-sidebar-stats flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-[#141821] border border-slate-200/80 dark:border-[#222938] rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200">
                    <span className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 dark:text-sky-400" aria-hidden="true">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span>Total Clients</span>
                    </span>
                    <span
                        id="sidebarTotalClients"
                        className="bg-blue-50 dark:bg-[#132842] text-blue-600 dark:text-sky-400 font-bold px-2.5 py-0.5 rounded-full text-[11px]"
                    >
                        {clients.length}
                    </span>
                </div>

                {/* Secondary Action Row (2-column outline button grid) */}
                <div className="grid grid-cols-2 gap-2 w-full">
                    <button
                        type="button"
                        id="clientsImportBtn"
                        className="sidebar-action-btn clients-sidebar-action-btn h-8 px-2.5 rounded-lg border border-slate-200 dark:border-[#222938] bg-white dark:bg-[#141821] hover:bg-slate-50 dark:hover:bg-[#1c2230] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        aria-label="Import clients"
                        onClick={handleImportClients}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span>Import</span>
                    </button>

                    <button
                        type="button"
                        id="clientsExportBtn"
                        disabled={clients.length === 0}
                        className="sidebar-action-btn clients-sidebar-action-btn h-8 px-2.5 rounded-lg border border-slate-200 dark:border-[#222938] bg-white dark:bg-[#141821] hover:bg-slate-50 dark:hover:bg-[#1c2230] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-[#141821]"
                        aria-label="Export clients"
                        onClick={handleExportClients}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span>Export</span>
                    </button>
                </div>

                {/* Sidebar Search Input */}
                <div className="clients-sidebar-search-wrap relative w-full flex items-center">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={14}
                        height={14}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0"
                        style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', pointerEvents: 'none', flexShrink: 0 }}
                        aria-hidden="true"
                    >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search Client..."
                        id="clientsSidebarSearch"
                        aria-label="Search client"
                        disabled={clients.length === 0}
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-slate-200 dark:border-[#222938] bg-slate-50/60 dark:bg-[#141821] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#191f2b] focus:border-blue-500 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50/60 dark:disabled:bg-[#10141d]"
                        style={{ paddingLeft: '32px', paddingRight: clientSearch ? '28px' : '12px', boxSizing: 'border-box' }}
                    />
                    {clientSearch && (
                        <button
                            type="button"
                            onClick={() => setClientSearch('')}
                            aria-label="Clear search"
                            className="clients-search-clear-btn"
                            style={{
                                position: 'absolute',
                                right: '6px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: '18px',
                                height: '18px',
                                borderRadius: '4px',
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
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    )}
                </div>
            </SidebarActionHeader>

            {/* Sidebar Client Directory List */}
            <div className="flex-1 overflow-y-auto px-2.5 py-2" id="sidebarClientsList">
                <div
                    className="clients-directory-heading flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1.5 mt-3 mb-2.5"
                    style={{ marginTop: '12px', marginBottom: '10px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                >
                    <span>Client Directory</span>
                    {clientSearch && (
                        <span className="text-[10px] font-medium text-blue-500 dark:text-sky-400 normal-case">
                            {filteredClients.length} match{filteredClients.length === 1 ? '' : 'es'}
                        </span>
                    )}
                </div>

                {filteredClients.length === 0 ? (
                    <div className="clients-sidebar-empty py-8 px-4 text-center text-xs text-slate-400 dark:text-slate-400 bg-slate-50/60 dark:bg-[#141821]/60 rounded-xl border border-dashed border-slate-200 dark:border-[#222938]">
                        {clients.length === 0 ? (
                            <span>No clients in directory</span>
                        ) : (
                            <>
                                <p className="m-0 font-medium text-slate-500 dark:text-slate-400">No clients found</p>
                                {clientSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setClientSearch('')}
                                        className="mt-2 text-[11px] font-semibold text-blue-600 dark:text-sky-400 bg-transparent border-0 cursor-pointer underline"
                                    >
                                        Clear filter
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    filteredClients.map((c, idx) => {
                        const name = c.displayName || c.name || `Client ${idx + 1}`;
                        const initials = getInitials(name);
                        const cardKey = c.clientId || c.id || idx;
                        const isSelected = selectedClientId ? selectedClientId === cardKey : idx === 0;
                        const palette = avatarPalettes[idx % avatarPalettes.length];

                        return (
                            <div
                                key={c.id || c.clientId || idx}
                                role="button"
                                tabIndex={0}
                                aria-pressed={isSelected}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}
                                className={
                                    isSelected
                                        ? "sidebar-client-card active selected p-3 rounded-xl border transition-all cursor-pointer mb-2"
                                        : "sidebar-client-card p-3 rounded-xl border transition-all cursor-pointer mb-2"
                                }
                                style={{ padding: '11px 12px', marginBottom: '8px', cursor: 'pointer' }}
                                onClick={() => {
                                    setSelectedClientId(cardKey);
                                    const el =
                                        document.getElementById(`clientCard_${c.clientId || idx}`) ||
                                        (c.clientId && document.getElementById(`clientCard_${c.clientId}`)) ||
                                        document.getElementById(`clientCard_${idx}`);
                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }}
                            >
                                <div className="flex items-center justify-between gap-2.5" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                    <div className="flex items-center min-w-0 flex-1" style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1, gap: '10px' }}>
                                        <div
                                            className="sidebar-client-avatar w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0"
                                            style={{
                                                background: palette.bg,
                                                color: palette.color,
                                                boxShadow: `0 0 0 3px ${palette.ring}`,
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '50%',
                                                flexShrink: 0,
                                                fontWeight: 700,
                                                fontSize: '11.5px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {initials}
                                        </div>
                                        <div className="min-w-0 flex-1" style={{ minWidth: 0, flex: 1 }}>
                                            <div className="sidebar-client-name text-xs font-semibold text-slate-900 dark:text-slate-100 truncate" style={{ fontSize: '12.5px', fontWeight: 600 }}>
                                                <span className="sidebar-client-index text-slate-400 dark:text-slate-400 mr-1">{idx + 1}.</span>
                                                {name}
                                            </div>
                                            <div
                                                className={`sidebar-client-sub text-[11px] truncate mt-0.5 ${isSelected ? 'text-slate-600 dark:text-sky-200/80' : 'text-slate-500 dark:text-slate-400'}`}
                                                style={{ fontSize: '11px', marginTop: '2px' }}
                                            >
                                                {c.email || c.phone || c.clientId || 'No email provided'}
                                            </div>
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <span
                                            className="sidebar-client-active-dot shrink-0"
                                            style={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                backgroundColor: '#38bdf8',
                                                boxShadow: '0 0 8px rgba(56, 189, 248, 0.8)',
                                                flexShrink: 0
                                            }}
                                            aria-hidden="true"
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Subtle Brand Footer */}
            <div className="clients-sidebar-footer p-2.5 border-t border-slate-100 dark:border-[#1e2636] flex items-center justify-center gap-1.5 opacity-60 select-none">
                <span style={{ fontSize: '0.85rem', fontWeight: 900, background: 'linear-gradient(90deg,#38bdf8,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>M</span>
                <span className="text-[10px] font-bold tracking-widest text-slate-500 dark:text-slate-400">SAFEMAILZ</span>
            </div>
        </aside>
    );
}
