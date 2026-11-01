import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';

export default function ProjectsMainContent(props) {
    const context = useProject();

    // Consume props if passed, otherwise fallback to useProject() context
    const projects = props?.projects ?? context.projects ?? [];
    const selectedProjectId = props?.selectedProjectId ?? context.selectedProjectId;
    const selectedProject = props?.selectedProject ?? context.selectedProject;
    const statusFilter = props?.statusFilter ?? context.statusFilter ?? 'all';
    const setStatusFilter = props?.setStatusFilter ?? context.setStatusFilter;
    const openEditModal = props?.openEditModal ?? context.openEditModal;
    const openAddModal = props?.openAddModal ?? context.openAddModal;
    const deleteProject = props?.deleteProject ?? context.deleteProject;
    const updateProject = props?.updateProject ?? context.updateProject;

    // Kebab action menu popover state
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [copiedField, setCopiedField] = useState(null);
    const actionMenuRef = useRef(null);

    const handleCopyText = (e, text, fieldKey) => {
        e.stopPropagation();
        if (!text) return;
        try {
            navigator.clipboard?.writeText(text);
            setCopiedField(fieldKey);
            setTimeout(() => setCopiedField(null), 1800);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

    // Close action menu on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
                setIsActionMenuOpen(false);
            }
        };
        if (isActionMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isActionMenuOpen]);

    // KPI status counts
    const activeCount = useMemo(() => {
        return projects.filter(p => (p.status || '').toLowerCase() === 'active').length;
    }, [projects]);

    const completedCount = useMemo(() => {
        return projects.filter(p => (p.status || '').toLowerCase() === 'completed').length;
    }, [projects]);

    const onHoldCount = useMemo(() => {
        return projects.filter(p => (p.status || '').toLowerCase() === 'on hold').length;
    }, [projects]);

    const closedCount = useMemo(() => {
        return projects.filter(p => (p.status || '').toLowerCase() === 'closed').length;
    }, [projects]);

    // Filter projects based on current statusFilter
    const filteredProjects = useMemo(() => {
        if (!statusFilter || statusFilter.toLowerCase() === 'all') {
            return projects;
        }
        return projects.filter(p => (p.status || '').toLowerCase() === statusFilter.toLowerCase());
    }, [projects, statusFilter]);

    // Determine the active project to display
    const currentProject = useMemo(() => {
        if (!projects || projects.length === 0) return null;

        // If status filter is applied and selected project matches it
        if (statusFilter && statusFilter.toLowerCase() !== 'all') {
            if (selectedProject && (selectedProject.status || '').toLowerCase() === statusFilter.toLowerCase()) {
                return selectedProject;
            }
            if (selectedProjectId) {
                const found = filteredProjects.find(p => p.id === selectedProjectId);
                if (found) return found;
            }
            return filteredProjects[0] || null;
        }

        // If 'all', use selectedProject or match by selectedProjectId or fallback to first
        if (selectedProject) return selectedProject;
        if (selectedProjectId) {
            const found = projects.find(p => p.id === selectedProjectId);
            if (found) return found;
        }
        return projects[0] || null;
    }, [projects, selectedProject, selectedProjectId, statusFilter, filteredProjects]);

    // 1-based index of current project in the full projects list
    const currentProjectIndex = useMemo(() => {
        if (!currentProject) return 1;
        const idx = projects.findIndex(p => p.id === currentProject.id);
        return idx >= 0 ? idx + 1 : 1;
    }, [projects, currentProject]);

    const isFilterActive = (statusKey) => {
        return (statusFilter || '').toLowerCase() === statusKey.toLowerCase();
    };

    const handleFilterToggle = (statusKey) => {
        if (isFilterActive(statusKey)) {
            setStatusFilter('all');
        } else {
            setStatusFilter(statusKey);
        }
    };

    const getStatusBadgeClass = (status) => {
        const s = (status || 'Active').toLowerCase();
        if (s === 'completed') {
            return 'project-badge-completed bg-emerald-50 text-emerald-700 border border-emerald-200/70';
        }
        if (s === 'active') {
            return 'project-badge-active bg-blue-50 text-blue-700 border border-blue-200/70';
        }
        if (s === 'on hold') {
            return 'project-badge-onhold bg-amber-50 text-amber-700 border border-amber-200/70';
        }
        return 'project-badge-closed bg-slate-100 text-slate-700 border border-slate-200/70';
    };

    const getStatusDotClass = (status) => {
        const s = (status || 'Active').toLowerCase();
        if (s === 'completed') return 'bg-emerald-500';
        if (s === 'active') return 'bg-blue-500';
        if (s === 'on hold') return 'bg-amber-500';
        return 'bg-slate-500';
    };

    const getCardAccentGradient = (status) => {
        const s = (status || 'Active').toLowerCase();
        if (s === 'completed') return 'linear-gradient(90deg, #10b981 0%, #14b8a6 55%, rgba(20, 184, 166, 0.1) 100%)';
        if (s === 'on hold') return 'linear-gradient(90deg, #f59e0b 0%, #f97316 55%, rgba(249, 115, 22, 0.1) 100%)';
        if (s === 'closed') return 'linear-gradient(90deg, #64748b 0%, #94a3b8 55%, rgba(148, 163, 184, 0.1) 100%)';
        return 'linear-gradient(90deg, #2563eb 0%, #6366f1 55%, rgba(99, 102, 241, 0.1) 100%)';
    };

    // ── EMPTY STATE (No projects exist at all) ──────────────────────────────────
    if (projects.length === 0) {
        return (
            <div 
                className="empty-state projects-empty-state flex flex-col items-center justify-center w-full h-full text-center py-16 px-6 font-inter" 
                id="projectsEmptyState"
                style={{ minHeight: '440px' }}
            >
                <img 
                    src="/images/empty_state.png" 
                    alt="No projects illustration" 
                    className="empty-state-illustration" 
                    style={{ maxWidth: '340px', height: 'auto', marginBottom: '1.5rem', opacity: 0.95 }} 
                    onError={(e) => { e.target.style.display = 'none'; }} 
                />
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    No Projects added yet
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
                    Create projects to track client communication, assign employees, and organize tasks.
                </p>
                {openAddModal && (
                    <button
                        type="button"
                        onClick={openAddModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer border-0"
                        id="btnEmptyStateAddProject"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        <span>Add Project</span>
                    </button>
                )}
            </div>
        );
    }

    const totalProjectsCount = projects.length || 1;
    const activePercent = Math.round((activeCount / totalProjectsCount) * 100);
    const completedPercent = Math.round((completedCount / totalProjectsCount) * 100);
    const onHoldPercent = Math.round((onHoldCount / totalProjectsCount) * 100);
    const closedPercent = Math.round((closedCount / totalProjectsCount) * 100);

    // ── POPULATED OVERVIEW & DIRECTORY CARD ─────────────────────────────────────
    return (
        <div 
            className={props.className ? `projects-main-content ${props.className}` : "projects-main-content flex-1 overflow-y-auto px-8 py-6 bg-slate-50/30 font-inter"} 
            id="projectsMainContent"
            style={{ height: '100%', boxSizing: 'border-box', ...(props.style || {}) }}
        >
            <div className="flex flex-col w-full max-w-6xl mx-auto">
                {/* 1. Header Row */}
                <div className="projects-header-row flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 mb-6" style={{ marginBottom: '20px' }}>
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100" id="projectsHeaderTitle">
                                Projects Overview
                            </h1>
                            <span id="projectsCountHeaderTitle" className="inline-flex items-center">
                                <span id="projectsCountHeader" className="projects-count-pill bg-slate-100 dark:bg-[#262626] text-slate-600 dark:text-slate-300 font-bold px-2.5 py-0.5 rounded-full text-xs">
                                    {statusFilter === 'all' ? projects.length : `${filteredProjects.length} of ${projects.length}`}
                                </span>
                            </span>
                            {statusFilter !== 'all' && (
                                <span className="project-active-filter-badge bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1.5" id="activeFilterBadge">
                                    <span className="text-[11px] font-normal text-blue-600 dark:text-blue-300">Filter:</span>
                                    <span id="activeFilterLabel">{statusFilter}</span>
                                </span>
                            )}
                        </div>
                        <p className="projects-header-subtitle text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Monitor active workspaces, client assignments, and team allocation
                        </p>
                    </div>

                    {/* Right Header Actions: Clear Filter (when active) */}
                    {statusFilter !== 'all' && (
                        <div className="flex items-center gap-2">
                            <button 
                                id="clearFilterBtn" 
                                type="button" 
                                onClick={() => setStatusFilter('all')}
                                className="project-clear-filter-btn h-8 px-3 rounded-lg border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#222222] hover:bg-slate-50 dark:hover:bg-[#292929] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                                <span>Clear Filter</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. KPI Metric Stat Cards (4 cards: Active Projects, Completed, On Hold, Closed) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2 mb-8" id="projectsStatsRow">
                    {/* Active Projects Card */}
                    <div 
                        className={`project-kpi-card kpi-active border rounded-xl p-4 bg-white dark:bg-[#1e1e1e] shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            isFilterActive('Active') ? 'kpi-filter-selected border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-200/80 dark:border-[#303030]'
                        }`}
                        id="cardActiveProjects"
                        onClick={() => handleFilterToggle('Active')}
                    >
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="project-kpi-icon icon-active w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 dark:bg-[#142338] text-blue-600 dark:text-blue-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                                </svg>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span id="statActiveProjectsCount" className="project-kpi-value text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none">
                                    {activeCount}
                                </span>
                                <span className="project-kpi-label text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">Active Projects</span>
                            </div>
                        </div>
                        <span className="project-kpi-percent percent-active text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0">
                            {activePercent}%
                        </span>
                    </div>

                    {/* Completed Card */}
                    <div 
                        className={`project-kpi-card kpi-completed border rounded-xl p-4 bg-white dark:bg-[#1e1e1e] shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            isFilterActive('Completed') ? 'kpi-filter-selected border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-200/80 dark:border-[#303030]'
                        }`}
                        id="cardCompleted"
                        onClick={() => handleFilterToggle('Completed')}
                    >
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="project-kpi-icon icon-completed w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-[#0a2e1d] text-emerald-600 dark:text-emerald-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span id="statCompletedCount" className="project-kpi-value text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none">
                                    {completedCount}
                                </span>
                                <span className="project-kpi-label text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">Completed</span>
                            </div>
                        </div>
                        <span className="project-kpi-percent percent-completed text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0">
                            {completedPercent}%
                        </span>
                    </div>

                    {/* On Hold Card */}
                    <div 
                        className={`project-kpi-card kpi-onhold border rounded-xl p-4 bg-white dark:bg-[#1e1e1e] shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            isFilterActive('On Hold') ? 'kpi-filter-selected border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-200/80 dark:border-[#303030]'
                        }`}
                        id="cardOnHold"
                        onClick={() => handleFilterToggle('On Hold')}
                    >
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="project-kpi-icon icon-onhold w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 dark:bg-[#2d2208] text-amber-600 dark:text-amber-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="10" y1="15" x2="10" y2="9"></line>
                                    <line x1="14" y1="15" x2="14" y2="9"></line>
                                </svg>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span id="statOnHoldCount" className="project-kpi-value text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none">
                                    {onHoldCount}
                                </span>
                                <span className="project-kpi-label text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">On Hold</span>
                            </div>
                        </div>
                        <span className="project-kpi-percent percent-onhold text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0">
                            {onHoldPercent}%
                        </span>
                    </div>

                    {/* Closed Card */}
                    <div 
                        className={`project-kpi-card kpi-closed border rounded-xl p-4 bg-white dark:bg-[#1e1e1e] shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            isFilterActive('Closed') ? 'kpi-filter-selected border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-200/80 dark:border-[#303030]'
                        }`}
                        id="cardClosed"
                        onClick={() => handleFilterToggle('Closed')}
                    >
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="project-kpi-icon icon-closed w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 dark:bg-[#282828] text-slate-600 dark:text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span id="statClosedCount" className="project-kpi-value text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none">
                                    {closedCount}
                                </span>
                                <span className="project-kpi-label text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">Closed</span>
                            </div>
                        </div>
                        <span className="project-kpi-percent percent-closed text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0">
                            {closedPercent}%
                        </span>
                    </div>
                </div>

                {/* 3. Section Heading */}
                <h2 
                    id="projectDirectoryHeading" 
                    className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4" 
                    style={{ fontSize: '20px', fontWeight: 700 }}
                >
                    Project Directory
                </h2>

                {/* 4. Project Directory Detail Card or Filter Empty Placeholder */}
                {!currentProject ? (
                    <div className="project-filter-empty-card p-8 text-center bg-white dark:bg-[#1e1e1e] border border-dashed border-slate-200 dark:border-[#303030] rounded-2xl shadow-2xs">
                        <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-[#262626] border border-slate-200/80 dark:border-[#383838] flex items-center justify-center mx-auto mb-3 text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                            </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                            No projects match the "{statusFilter}" filter
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                            There are currently no projects with this status.
                        </p>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-[#142338] hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200/60"
                        >
                            <span>Clear filter</span>
                        </button>
                    </div>
                ) : (
                    <div 
                        className="project-directory-card rounded-2xl bg-white dark:bg-[#1e1e1e] border border-slate-200/80 dark:border-[#303030] shadow-xs mb-6 relative"
                        id={`projectCard_${currentProject.id || currentProjectIndex}`}
                        data-project-id={currentProject.id}
                    >
                        {/* Top Accent Gradient Bar */}
                        <div
                            className="project-card-top-accent"
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '3px',
                                borderTopLeftRadius: '16px',
                                borderTopRightRadius: '16px',
                                background: getCardAccentGradient(currentProject.status),
                                pointerEvents: 'none'
                            }}
                        />

                        {/* Card Top Bar */}
                        <div 
                            className="project-card-topbar flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#2b2b2b] rounded-t-2xl"
                            style={{ padding: '16px 20px' }}
                        >
                            {/* Left: Icon in blue box, Project Name with index, Status pill */}
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="project-card-icon-box w-10 h-10 rounded-lg bg-blue-50 dark:bg-[#142338] text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                                    </svg>
                                </div>
                                <div className="flex items-center gap-3 min-w-0 flex-wrap">
                                    <h3 
                                        className="project-card-title text-base font-bold text-slate-900 dark:text-slate-100 truncate min-w-0"
                                        title={`${currentProjectIndex}. ${currentProject.projectName}`}
                                    >
                                        {currentProjectIndex}. {currentProject.projectName}
                                    </h3>
                                    <span className={`project-status-pill inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold leading-none shrink-0 capitalize ${getStatusBadgeClass(currentProject.status)}`}>
                                        <span className={`project-status-dot w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDotClass(currentProject.status)}`} aria-hidden="true"></span>
                                        <span>{currentProject.status || 'Active'}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Right: Quick Edit + Kebab action menu button (3-dots) & dropdown */}
                            <div className="flex items-center gap-2 shrink-0" ref={actionMenuRef}>
                                {openEditModal && (
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(currentProject)}
                                        className="project-quick-edit-btn h-8 px-3 rounded-lg bg-slate-50 dark:bg-[#262626] hover:bg-slate-100 dark:hover:bg-[#303030] text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200/70 dark:border-[#363636]"
                                        title="Edit project details"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 20h9"></path>
                                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                        </svg>
                                        <span>Edit</span>
                                    </button>
                                )}

                                <div className="relative">
                                    <button 
                                        type="button" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsActionMenuOpen(prev => !prev);
                                        }}
                                        className="project-kebab-btn w-8 h-8 rounded-lg bg-slate-50 dark:bg-[#262626] hover:bg-slate-100 dark:hover:bg-[#303030] text-slate-400 dark:text-slate-300 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/50 dark:border-[#333333]"
                                        aria-label="Project actions"
                                        id="btnProjectActions"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="1"></circle>
                                            <circle cx="12" cy="5" r="1"></circle>
                                            <circle cx="12" cy="19" r="1"></circle>
                                        </svg>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isActionMenuOpen && (
                                        <div 
                                            onClick={(e) => e.stopPropagation()}
                                            className="project-action-dropdown absolute right-0 top-[calc(100%+6px)] bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-[#383838] rounded-xl shadow-lg z-50 min-w-[190px] p-1.5"
                                            style={{ zIndex: 100 }}
                                        >
                                            <button 
                                                type="button" 
                                                onClick={() => { 
                                                    setIsActionMenuOpen(false); 
                                                    if (openEditModal) openEditModal(currentProject); 
                                                }}
                                                className="project-dropdown-item w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#292929] flex items-center gap-2 cursor-pointer border-0 bg-transparent rounded-lg transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                                                    <path d="M12 20h9"></path>
                                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                                </svg>
                                                <span>Edit Project</span>
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => { 
                                                    const nextStatus = (currentProject.status || '').toLowerCase() === 'completed' ? 'Active' : 'Completed';
                                                    if (updateProject) updateProject(currentProject.id, { status: nextStatus });
                                                    setIsActionMenuOpen(false);
                                                }}
                                                className="project-dropdown-item w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#292929] flex items-center gap-2 cursor-pointer border-0 bg-transparent rounded-lg transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                                                    <polyline points="23 4 23 10 17 10"></polyline>
                                                    <polyline points="1 20 1 14 7 14"></polyline>
                                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                                </svg>
                                                <span>Mark as {(currentProject.status || '').toLowerCase() === 'completed' ? 'Active' : 'Completed'}</span>
                                            </button>
                                            {(currentProject.status || '').toLowerCase() !== 'on hold' && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => { 
                                                        if (updateProject) updateProject(currentProject.id, { status: 'On Hold' });
                                                        setIsActionMenuOpen(false);
                                                    }}
                                                    className="project-dropdown-item w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#292929] flex items-center gap-2 cursor-pointer border-0 bg-transparent rounded-lg transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <line x1="10" y1="15" x2="10" y2="9"></line>
                                                        <line x1="14" y1="15" x2="14" y2="9"></line>
                                                    </svg>
                                                    <span>Put On Hold</span>
                                                </button>
                                            )}
                                            <div className="project-dropdown-divider h-px bg-slate-100 dark:bg-[#2b2b2b] my-1"></div>
                                            <button 
                                                type="button" 
                                                onClick={() => { 
                                                    setIsActionMenuOpen(false); 
                                                    if (deleteProject) deleteProject(currentProject.id); 
                                                }}
                                                className="project-dropdown-item project-dropdown-delete w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-[#331818] flex items-center gap-2 cursor-pointer border-0 bg-transparent rounded-lg transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                                <span>Delete Project</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Balanced Metadata Grid (4 columns) */}
                        <div 
                            className="project-meta-grid px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 rounded-b-2xl"
                            style={{ padding: '18px 20px' }}
                        >
                            {/* 1. Project Leader */}
                            <div className="project-meta-box px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-[#262626] border border-slate-200/60 dark:border-[#383838] min-w-0 flex flex-col gap-1">
                                <span className="project-meta-label text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500 shrink-0">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                    </svg>
                                    <span className="truncate">Project Leader</span>
                                </span>
                                <span className="project-meta-value text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block" title={currentProject.leader}>
                                    {currentProject.leader || 'Not assigned'}
                                </span>
                            </div>

                            {/* 2. Client */}
                            <div className="project-meta-box px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-[#262626] border border-slate-200/60 dark:border-[#383838] min-w-0 flex flex-col gap-1">
                                <span className="project-meta-label text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 shrink-0">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                    <span className="truncate">Client</span>
                                </span>
                                <div className="flex items-center justify-between gap-2 min-w-0">
                                    <span className="project-meta-value text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block" title={currentProject.client}>
                                        {currentProject.client || 'Not assigned'}
                                    </span>
                                    {currentProject.client && (
                                        <button
                                            type="button"
                                            onClick={(e) => handleCopyText(e, currentProject.client, 'client')}
                                            className="project-meta-copy-btn w-6 h-6 rounded-md flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                                            title={copiedField === 'client' ? 'Copied!' : 'Copy Client'}
                                            aria-label="Copy Client"
                                        >
                                            {copiedField === 'client' ? (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            ) : (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                </svg>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 3. Employees */}
                            <div className="project-meta-box px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-[#262626] border border-slate-200/60 dark:border-[#383838] min-w-0 flex flex-col gap-1">
                                <span className="project-meta-label text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 shrink-0">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                    </svg>
                                    <span className="truncate">Employees</span>
                                </span>
                                <span className="project-meta-value text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block" title={currentProject.employeeName}>
                                    {currentProject.employeeName || 'None assigned'}
                                </span>
                            </div>

                            {/* 4. Project Email ID */}
                            <div className="project-meta-box px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-[#262626] border border-slate-200/60 dark:border-[#383838] min-w-0 flex flex-col gap-1">
                                <span className="project-meta-label text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500 shrink-0">
                                        <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                                    </svg>
                                    <span className="truncate">Project Email ID</span>
                                </span>
                                <div className="flex items-center justify-between gap-2 min-w-0">
                                    <span className="project-meta-email text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 truncate block" title={currentProject.projectEmailId}>
                                        {currentProject.projectEmailId || 'None'}
                                    </span>
                                    {currentProject.projectEmailId && (
                                        <button
                                            type="button"
                                            onClick={(e) => handleCopyText(e, currentProject.projectEmailId, 'projectEmail')}
                                            className="project-meta-copy-btn w-6 h-6 rounded-md flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                                            title={copiedField === 'projectEmail' ? 'Copied!' : 'Copy Project Email ID'}
                                            aria-label="Copy Project Email ID"
                                        >
                                            {copiedField === 'projectEmail' ? (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            ) : (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                </svg>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
