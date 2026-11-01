import React, { useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import SidebarActionHeader from '../layout/SidebarActionHeader';
import './ProjectsSidebarCards.css';

const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
    'linear-gradient(135deg, #059669 0%, #047857 100%)',
    'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
    'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
    'linear-gradient(135deg, #DB2777 0%, #BE185D 100%)',
];

const getInitials = (name) => {
    if (!name) return 'PR';
    // Strip leading numbering like "1. " or "1) " before extracting initials
    const clean = name.trim().replace(/^\d+[.)]\s*/, '').trim();
    const parts = (clean || name.trim()).split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (clean || name.trim()).slice(0, 2).toUpperCase();
};

const getStatusDetails = (status) => {
    const s = (status || 'Active').toLowerCase();
    if (s === 'completed') {
        return {
            statusClass: 'completed active',
            label: 'Completed',
            badge: 'active completed project-badge-completed bg-emerald-50 text-emerald-700 border border-emerald-200/70',
            dot: 'bg-emerald-500'
        };
    }
    if (s === 'active' || s === 'in progress') {
        const isInProgress = s === 'in progress';
        return {
            statusClass: isInProgress ? 'in-progress' : 'active',
            label: isInProgress ? 'In Progress' : 'Active',
            badge: `${isInProgress ? 'in-progress' : 'active'} project-badge-active bg-blue-50 text-blue-700 border border-blue-200/70`,
            dot: 'bg-blue-500'
        };
    }
    if (s === 'on hold' || s === 'pending') {
        return {
            statusClass: 'on-hold pending',
            label: s === 'pending' ? 'Pending' : 'On Hold',
            badge: 'on-hold pending project-badge-onhold bg-amber-50 text-amber-700 border border-amber-200/70',
            dot: 'bg-amber-500'
        };
    }
    // Closed or fallback
    return {
        statusClass: 'closed',
        label: status ? (status.charAt(0).toUpperCase() + status.slice(1)) : 'Closed',
        badge: 'closed project-badge-closed bg-slate-100 text-slate-700 border border-slate-200/70',
        dot: 'bg-slate-500'
    };
};

export default function ProjectsSidebar({ user, effectivePermissions }) {
    const importFileInputRef = useRef(null);

    const {
        projects,
        selectedProjectId,
        setSelectedProjectId,
        searchQuery: projectSearch,
        setSearchQuery: setProjectSearch,
        statusFilter,
        setStatusFilter,
        openAddModal: openAddProjectModal,
        handleImportProjects,
        handleExportProjects
    } = useProject();

    const filteredProjects = projects.filter(p => {
        if (statusFilter && statusFilter.toLowerCase() !== 'all') {
            if ((p.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
        }
        if (projectSearch && projectSearch.trim()) {
            const q = projectSearch.toLowerCase().trim();
            const match = (p.projectName || '').toLowerCase().includes(q) ||
                (p.client || '').toLowerCase().includes(q) ||
                (p.leader || '').toLowerCase().includes(q) ||
                (p.employeeName || '').toLowerCase().includes(q) ||
                (p.projectEmailId || '').toLowerCase().includes(q) ||
                (p.projectEmail || '').toLowerCase().includes(q) ||
                (p.project_email_id || '').toLowerCase().includes(q);
            if (!match) return false;
        }
        return true;
    });

    const canAdd = !user || user.role?.toLowerCase() === 'org_owner' || user.role?.toLowerCase() !== 'employee' || effectivePermissions?.createProjects !== false;

    return (
        <aside className="sidebar w-72 min-w-[280px] max-w-[288px] border-r border-slate-200 dark:border-[#2b2b2b] bg-white dark:bg-[#181818] flex flex-col h-full shrink-0 font-inter" id="projectsSidebar">
            {/* Top Control Header */}
            <SidebarActionHeader>
                {canAdd && (
                    <button
                        type="button"
                        className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-0"
                        id="btnAddProject"
                        onClick={openAddProjectModal}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        <span>Add Project</span>
                    </button>
                )}

                {/* Total Counter Pill Bar */}
                <div className="sidebar-stats flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-[#202020] border border-slate-200/80 dark:border-[#303030] rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200">
                    <span>Total Projects</span>
                    <span id="sidebarTotalProjects" className="bg-blue-50 dark:bg-[#142338] text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full text-[11px]">
                        {projects.length}
                    </span>
                </div>

                {/* Secondary Action Toolbar: Import & Export buttons */}
                <div className="grid grid-cols-2 gap-2 w-full">
                    <input
                        type="file"
                        ref={importFileInputRef}
                        style={{ display: 'none' }}
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0] && handleImportProjects) {
                                handleImportProjects(e);
                            }
                        }}
                    />
                    <button
                        type="button"
                        id="projectsImportBtn"
                        className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#222222] hover:bg-slate-50 dark:hover:bg-[#292929] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                        aria-label="Import projects"
                        onClick={() => importFileInputRef.current?.click()}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span>Import</span>
                    </button>

                    <button
                        type="button"
                        id="projectsExportBtn"
                        className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#222222] hover:bg-slate-50 dark:hover:bg-[#292929] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                        aria-label="Export projects"
                        onClick={handleExportProjects}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span>Export</span>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="sidebar-search relative w-full">
                    <svg className="sidebar-search-icon absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search projects..."
                        id="projectsSidebarSearch"
                        aria-label="Search projects"
                        value={projectSearch || ''}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-slate-200 dark:border-[#303030] bg-slate-50/50 dark:bg-[#222222] dark:text-slate-100 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#1a1a1a] focus:border-blue-500 focus:outline-none transition-colors"
                    />
                    {projectSearch && (
                        <button
                            type="button"
                            onClick={() => setProjectSearch('')}
                            aria-label="Clear search"
                            className="sidebar-search-clear-btn absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer border-0 bg-transparent transition-colors"
                        >
                            &times;
                        </button>
                    )}
                </div>
            </SidebarActionHeader>

            {/* Sidebar Project Vertical List Container */}
            <div className="sidebar-project-list flex-1 overflow-y-auto px-3 py-3 space-y-2.5 scrollbar-thin" id="sidebarProjectList">
                {filteredProjects.length === 0 ? (
                    <div className="sidebar-empty-placeholder text-center py-8 px-3 text-xs text-slate-500 dark:text-slate-400" id="sidebarEmptyState">
                        No projects found
                    </div>
                ) : (
                    filteredProjects.map((p, idx) => {
                        const isSelected = p.id ? p.id === selectedProjectId : (!selectedProjectId && idx === 0);
                        const { statusClass, label: statusLabel, badge: statusBadgeClass, dot: statusDotClass } = getStatusDetails(p.status);
                        const rawName = p.projectName || p.name || 'Project';
                        const cleanName = rawName.trim().replace(/^\d+[.)]\s*/, '').trim() || 'Project';
                        const displayName = `${idx + 1}. ${cleanName}`;
                        const initials = getInitials(cleanName);
                        const avatarBg = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
                        const projectEmail = p.projectEmailId || p.projectEmail || p.project_email_id || '';
                        const leaderShort = (p.leader || '').split('(')[0].trim();

                        return (
                            <div
                                key={p.id || idx}
                                id={`sidebarProjectCard_${p.id || (idx + 1)}`}
                                data-project-id={p.id}
                                role="button"
                                tabIndex={0}
                                aria-pressed={isSelected}
                                aria-label={`${displayName}, ${statusLabel}`}
                                onKeyDown={event => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        event.currentTarget.click();
                                    }
                                }}
                                className={`sidebar-project-card w-full rounded-xl p-3 transition-all cursor-pointer ${
                                    isSelected
                                        ? 'selected active bg-blue-50/40 dark:bg-[#152438] border border-blue-500 ring-1 ring-blue-500/20 shadow-xs'
                                        : 'bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#303030] hover:border-slate-300 dark:hover:border-[#404040] hover:bg-slate-50/50 dark:hover:bg-[#262626]'
                                }`}
                                onClick={() => {
                                    if (setSelectedProjectId) {
                                        setSelectedProjectId(p.id);
                                    }
                                    if (setStatusFilter && statusFilter && statusFilter.toLowerCase() !== 'all') {
                                        const pStatus = (p.status || 'Active').toLowerCase();
                                        if (pStatus !== statusFilter.toLowerCase()) {
                                            setStatusFilter('all');
                                        }
                                    }
                                    const card = document.getElementById(p.id ? `projectCard_${p.id}` : `projectCard_${idx + 1}`);
                                    if (card) {
                                        card.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
                                    }
                                }}
                            >
                                {/* Top Status Row */}
                                <div className="sidebar-project-badges flex items-center justify-between w-full mb-2 gap-2">
                                    {leaderShort ? (
                                        <span className="sidebar-project-leader-tag text-[10px] font-medium text-slate-400 dark:text-slate-400 truncate max-w-[120px]" title={`Leader: ${p.leader}`}>
                                            {leaderShort}
                                        </span>
                                    ) : <span />}
                                    <span className={`sidebar-project-status-badge ${statusClass} ml-auto inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${statusBadgeClass}`}>
                                        <span className={`sidebar-project-status-dot w-1.5 h-1.5 rounded-full shrink-0 ${statusDotClass}`} aria-hidden="true"></span>
                                        <span>{statusLabel}</span>
                                    </span>
                                </div>

                                {/* Content Row: Avatar + Info */}
                                <div className="sidebar-project-header flex items-center gap-3 w-full mt-1">
                                    <div
                                        className="sidebar-project-avatar w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs"
                                        style={{ background: avatarBg }}
                                    >
                                        {initials}
                                    </div>
                                    <div className="sidebar-project-name-wrap flex flex-col min-w-0 flex-1">
                                        <span
                                            className="sidebar-project-title text-sm font-semibold text-slate-900 dark:text-slate-100 truncate leading-snug block"
                                            title={displayName}
                                        >
                                            <span className="sidebar-project-index text-slate-500 dark:text-slate-400">{idx + 1}.</span> {cleanName}
                                        </span>
                                        {projectEmail && (
                                            <span
                                                className="sidebar-project-email text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 block leading-tight"
                                                title={projectEmail}
                                            >
                                                {projectEmail}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Subtle Brand Footer */}
            <div className="sidebar-brand-footer p-2 border-t border-slate-100 dark:border-[#2b2b2b] flex items-center justify-center gap-1.5 opacity-40 scale-90 shrink-0">
                <span style={{ fontSize: '0.9rem', fontWeight: 900, background: 'linear-gradient(90deg,#3DA2F3,#68D1FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>M</span>
                <span className="sidebar-brand-text" style={{ fontSize: '0.65rem', fontWeight: 700, color: '#1A60A4', letterSpacing: '0.5px' }}>SAFEMAILZ</span>
            </div>
        </aside>
    );
}
