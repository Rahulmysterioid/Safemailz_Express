import React, { useState, useEffect, useRef } from 'react';
import { useAdmin } from '../../context/AdminContext';
import SidebarActionHeader from './SidebarActionHeader';

const AVATAR_PALETTES = [
    { bg: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', ring: 'rgba(59, 130, 246, 0.24)' },
    { bg: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', ring: 'rgba(14, 165, 233, 0.24)' },
    { bg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', ring: 'rgba(139, 92, 246, 0.24)' },
    { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', ring: 'rgba(16, 185, 129, 0.24)' },
    { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', ring: 'rgba(245, 158, 11, 0.24)' },
    { bg: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', ring: 'rgba(236, 72, 153, 0.24)' }
];

export default function AdminsSidebar({ user, effectivePermissions, handleImport, handleExport }) {
    const {
        admins,
        selectedAdminIndex,
        setSelectedAdminIndex,
        searchQuery: adminSearch,
        setSearchQuery: setAdminSearch,
        openAddAdminModal,
        deleteAdmin
    } = useAdmin();

    const [openMenuId, setOpenMenuId] = useState(null);
    const searchInputRef = useRef(null);
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        const handleOutsideClick = () => setOpenMenuId(null);
        if (openMenuId !== null) {
            document.addEventListener('click', handleOutsideClick);
        }
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [openMenuId]);

    const filteredAdmins = admins.filter(adm => {
        if (!adminSearch.trim()) return true;
        const q = adminSearch.toLowerCase().trim();
        return (adm.name || '').toLowerCase().includes(q) || (adm.email || '').toLowerCase().includes(q);
    });

    const getInitials = (name) => {
        if (!name) return 'AD';
        const clean = name.trim().replace(/^\d+[.)]\s*/, '').trim();
        const parts = (clean || name.trim()).split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return (clean || name.trim()).slice(0, 2).toUpperCase();
    };

    const handleCopyEmail = (e, adm) => {
        e.stopPropagation();
        if (adm.email) {
            navigator.clipboard?.writeText(adm.email);
            setCopiedId(adm.id || adm.email);
            setTimeout(() => setCopiedId(null), 1800);
        }
        setOpenMenuId(null);
    };

    const canManageAdmins = !user || (user.role?.toLowerCase() !== 'employee' && (user.role?.toLowerCase() === 'org_owner' || effectivePermissions?.makeAdmin !== false));

    return (
        <aside
            className="sidebar admins-sidebar w-72 shrink-0 border-r border-slate-200 dark:border-[#1e2636] bg-white dark:bg-[#0e121a] flex flex-col h-full font-inter"
            id="adminsSidebar"
        >
            {/* Top Control Header */}
            <SidebarActionHeader className="admins-sidebar-header">
                {canManageAdmins && (
                    <button
                        type="button"
                        className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border-0"
                        id="btnAddAdmin"
                        onClick={openAddAdminModal}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        <span>Add Admin</span>
                    </button>
                )}

                {/* Total Counter Pill Bar */}
                <div className="sidebar-stats admins-sidebar-stats flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-[#141821] border border-slate-200/80 dark:border-[#222938] rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200">
                    <span className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 dark:text-sky-400" aria-hidden="true">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                            <path d="m9 12 2 2 4-4" />
                        </svg>
                        <span>Total Admins</span>
                    </span>
                    <span
                        id="sidebarTotalAdmins"
                        className="bg-blue-50 dark:bg-[#132842] text-blue-600 dark:text-sky-400 font-bold px-2.5 py-0.5 rounded-full text-[11px]"
                    >
                        {admins.length}
                    </span>
                </div>

                {/* Secondary Action Row (2-column outline button grid) */}
                <div className="grid grid-cols-2 gap-2 w-full">
                    <button
                        type="button"
                        id="adminsImportBtn"
                        className="sidebar-action-btn h-8 px-2.5 rounded-lg border border-slate-200 dark:border-[#222938] bg-white dark:bg-[#141821] hover:bg-slate-50 dark:hover:bg-[#1c2230] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        aria-label="Import admins"
                        onClick={() => handleImport && handleImport('admins')}
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
                        id="adminsExportBtn"
                        disabled={admins.length === 0}
                        className="sidebar-action-btn h-8 px-2.5 rounded-lg border border-slate-200 dark:border-[#222938] bg-white dark:bg-[#141821] hover:bg-slate-50 dark:hover:bg-[#1c2230] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                        aria-label="Export admins"
                        onClick={() => admins.length > 0 && handleExport && handleExport('admins')}
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
                <div className="relative w-full flex items-center">
                    <button
                        type="button"
                        id="adminsSidebarSearchBtn"
                        aria-label="Search admin"
                        title="Search admin"
                        onClick={() => {
                            if (searchInputRef.current) {
                                searchInputRef.current.focus();
                            } else {
                                document.getElementById('adminsSidebarSearch')?.focus();
                            }
                        }}
                        style={{
                            position: 'absolute',
                            left: '6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '24px',
                            height: '24px',
                            borderRadius: '9999px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            background: 'transparent',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: 0,
                            zIndex: 2
                        }}
                    >
                        <svg
                            style={{ width: '13px', height: '13px' }}
                            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </button>
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search admin..."
                        id="adminsSidebarSearch"
                        aria-label="Search admin"
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') setAdminSearch('');
                        }}
                        className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-slate-200 dark:border-[#222938] bg-slate-50/50 dark:bg-[#141821] dark:text-slate-100 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#181d28] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 focus:outline-none transition-all"
                        style={{ paddingLeft: '32px', paddingRight: adminSearch ? '28px' : '12px', boxSizing: 'border-box' }}
                    />
                    {adminSearch && (
                        <button
                            type="button"
                            onClick={() => setAdminSearch('')}
                            aria-label="Clear search"
                            title="Clear search"
                            className="sidebar-search-clear-btn"
                            style={{
                                position: 'absolute',
                                right: '6px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: '18px',
                                height: '18px',
                                borderRadius: '9999px',
                                border: 'none',
                                background: 'rgba(148, 163, 184, 0.2)',
                                color: '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                                zIndex: 2
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

            {/* Admin Directory List */}
            <div className="sidebar-admin-list flex-1 overflow-y-auto px-2.5 py-2 space-y-2" id="sidebarAdminList">
                <div
                    className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1.5 mt-2 mb-2"
                    style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                >
                    <span>Admin Directory</span>
                    {adminSearch && (
                        <span className="text-[10px] font-medium text-blue-500 dark:text-sky-400 normal-case">
                            {filteredAdmins.length} match{filteredAdmins.length === 1 ? '' : 'es'}
                        </span>
                    )}
                </div>

                {admins.length === 0 ? (
                    <div
                        className="sidebar-empty-box mt-2 py-8 px-4 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50/60 dark:bg-[#141821]/60 rounded-xl border border-dashed border-slate-200 dark:border-[#222938] flex flex-col items-center justify-center gap-1.5"
                        style={{ padding: '32px 16px', borderStyle: 'dashed', minHeight: '96px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" aria-hidden="true">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <span>No admins in directory</span>
                    </div>
                ) : filteredAdmins.length === 0 ? (
                    <div
                        className="sidebar-empty-box text-center py-8 px-4 text-slate-500 dark:text-slate-400 text-xs rounded-xl border border-dashed border-slate-200 dark:border-[#222938]"
                        style={{ padding: '32px 16px', borderStyle: 'dashed', minHeight: '96px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                        <p className="m-0 font-medium">No admins found</p>
                        {adminSearch && (
                            <button
                                type="button"
                                onClick={() => setAdminSearch('')}
                                className="mt-2 text-[11px] font-semibold text-blue-600 dark:text-sky-400 bg-transparent border-0 cursor-pointer hover:underline"
                            >
                                Clear search filter
                            </button>
                        )}
                    </div>
                ) : (
                    filteredAdmins.map((adm, idx) => {
                        const actualIndex = admins.findIndex(a => (a.id && adm.id ? a.id === adm.id : a.email === adm.email));
                        const resolvedIndex = actualIndex >= 0 ? actualIndex : idx;
                        const isSelected = selectedAdminIndex === resolvedIndex;
                        const initials = getInitials(adm.name);
                        const palette = AVATAR_PALETTES[resolvedIndex % AVATAR_PALETTES.length];
                        const menuKey = adm.id || resolvedIndex;
                        const isMenuOpen = openMenuId === menuKey;
                        const isCopied = copiedId === (adm.id || adm.email);

                        const enabledPermsCount = adm.permissions
                            ? Object.values(adm.permissions).filter(Boolean).length
                            : 3;

                        return (
                            <div
                                key={adm.id || idx}
                                onClick={() => setSelectedAdminIndex(resolvedIndex)}
                                className={`sidebar-admin-card flex flex-col gap-3 p-3.5 rounded-xl cursor-pointer transition-all ${isSelected ? 'selected active border-blue-500/40' : ''}`}
                            >
                                {/* Top Row: Status Badges & Action Menu */}
                                <div className="flex items-center justify-between gap-2 w-full">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="admin-expiry-badge px-2 py-0.5 text-[11px] font-medium leading-tight rounded-md flex items-center gap-1 whitespace-nowrap">
                                            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-current" />
                                            <span>Expire in {adm.expiryDays || 10} days</span>
                                        </span>
                                        <span
                                            className="admin-role-mini-badge px-2 py-0.5 text-[11px] font-medium leading-tight rounded-md flex items-center gap-1 whitespace-nowrap"
                                            title={`${enabledPermsCount} of 5 privileges enabled`}
                                        >
                                            {enabledPermsCount}/5 Perms
                                        </span>
                                    </div>

                                    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            className="admin-kebab-btn shrink-0 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-md transition-colors"
                                            aria-label={`More options for ${adm.name}`}
                                            onClick={() => setOpenMenuId(isMenuOpen ? null : menuKey)}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="5" r="1" />
                                                <circle cx="12" cy="12" r="1" />
                                                <circle cx="12" cy="19" r="1" />
                                            </svg>
                                        </button>

                                        {isMenuOpen && (
                                            <div
                                                className="project-action-dropdown"
                                                style={{
                                                    position: 'absolute',
                                                    right: 0,
                                                    top: 'calc(100% + 4px)',
                                                    minWidth: '165px',
                                                    backgroundColor: '#ffffff',
                                                    borderRadius: '10px',
                                                    border: '1px solid #e2e8f0',
                                                    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
                                                    padding: '4px',
                                                    zIndex: 50
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    className="project-dropdown-item"
                                                    onClick={(e) => handleCopyEmail(e, adm)}
                                                    style={{
                                                        width: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        padding: '6px 10px',
                                                        fontSize: '11px',
                                                        fontWeight: 500,
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        background: 'transparent',
                                                        cursor: 'pointer',
                                                        textAlign: 'left'
                                                    }}
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                                    </svg>
                                                    <span>{isCopied ? 'Copied Email!' : 'Copy Email'}</span>
                                                </button>

                                                {canManageAdmins && (
                                                    <>
                                                        <div className="project-dropdown-divider" style={{ height: '1px', margin: '3px 4px', backgroundColor: '#f1f5f9' }} />
                                                        <button
                                                            type="button"
                                                            className="project-dropdown-item project-dropdown-delete"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenMenuId(null);
                                                                deleteAdmin(resolvedIndex);
                                                            }}
                                                            style={{
                                                                width: '100%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                padding: '6px 10px',
                                                                fontSize: '11px',
                                                                fontWeight: 600,
                                                                borderRadius: '6px',
                                                                border: 'none',
                                                                background: 'transparent',
                                                                color: '#e11d48',
                                                                cursor: 'pointer',
                                                                textAlign: 'left'
                                                            }}
                                                        >
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                                                <circle cx="9" cy="7" r="4" />
                                                                <line x1="22" y1="11" x2="16" y2="11" />
                                                            </svg>
                                                            <span>Demote to Employee</span>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Middle Row: Avatar, Admin Name & Email */}
                                <div className="flex items-center gap-3 w-full min-w-0">
                                    <div
                                        className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold"
                                        style={{
                                            background: palette.bg,
                                            color: '#ffffff',
                                            boxShadow: `0 0 0 2px ${palette.ring}`
                                        }}
                                    >
                                        {initials}
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                                        <div className="sidebar-admin-name text-sm font-semibold text-slate-900 dark:text-white truncate leading-snug">
                                            {resolvedIndex + 1}. {adm.name}
                                        </div>
                                        {adm.email && (
                                            <div className="sidebar-admin-email text-xs text-slate-500 dark:text-slate-400 truncate leading-normal">
                                                {adm.email}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Row: Storage Indicator */}
                                <div className="sidebar-admin-storage-wrap pt-2 border-t border-slate-100 dark:border-white/5 flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between text-[11px] leading-none">
                                        <span className="text-slate-500 dark:text-slate-400 font-medium">Storage</span>
                                        <span className="text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                                            {adm.storageUsed || '1.18 GB'} <span className="font-normal text-slate-400 dark:text-slate-500">of</span> {adm.storageLimit || adm.storageTotal || '50 GB'}
                                        </span>
                                    </div>
                                    <div className="sidebar-admin-storage-track w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="sidebar-admin-storage-fill h-full bg-blue-500 rounded-full transition-all"
                                            style={{ width: adm.storagePercentage || '15%' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </aside>
    );
}
