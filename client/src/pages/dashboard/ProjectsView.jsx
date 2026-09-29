import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';

export default function ProjectsView() {
    const { 
        projects, 
        searchQuery, 
        statusFilter, 
        setStatusFilter, 
        openEditModal, 
        deleteProject,
        updateProject,
        setEditingProject 
    } = useProject();

    const [activeActionMenuId, setActiveActionMenuId] = useState(null);

    // Compute status counts
    const activeCount = projects.filter(p => (p.status || '').toLowerCase() === 'active').length;
    const completedCount = projects.filter(p => (p.status || '').toLowerCase() === 'completed').length;
    const onHoldCount = projects.filter(p => (p.status || '').toLowerCase() === 'on hold').length;
    const closedCount = projects.filter(p => (p.status || '').toLowerCase() === 'closed').length;

    // Filter projects based on searchQuery and statusFilter
    const filteredProjects = projects.filter(p => {
        // Status filter
        if (statusFilter !== 'all' && (p.status || '').toLowerCase() !== statusFilter.toLowerCase()) {
            return false;
        }
        // Search query filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const match = (p.projectName || '').toLowerCase().includes(q) ||
                (p.client || '').toLowerCase().includes(q) ||
                (p.leader || '').toLowerCase().includes(q) ||
                (p.employeeName || '').toLowerCase().includes(q) ||
                (p.projectEmailId || '').toLowerCase().includes(q);
            if (!match) return false;
        }
        return true;
    });

    const handleToggleActionMenu = (e, id) => {
        e.stopPropagation();
        setActiveActionMenuId(prev => prev === id ? null : id);
    };

    // Close action menu on click outside
    React.useEffect(() => {
        const handleClick = () => setActiveActionMenuId(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    return (
        <div className="content-area" id="projectsView" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', boxSizing: 'border-box', padding: '1.5rem 2rem', overflowY: 'auto' }}>
            {projects.length === 0 ? (
                /* Empty State */
                <div className="empty-state" id="projectsEmptyState" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', textAlign: 'center', minHeight: '440px', padding: '3rem 1.5rem' }}>
                    <img src="/images/empty_state.png" alt="No projects illustration" className="empty-state-illustration" style={{ maxWidth: '340px', height: 'auto', marginBottom: '1.5rem', opacity: 0.95 }} onError={(e) => { e.target.style.display = 'none'; }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
                        No Projects added yet
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', maxWidth: '420px', margin: '0 0 1.75rem 0', lineHeight: 1.5 }}>
                        Create projects to track client communication, assign employees, and organize tasks.
                    </p>
                </div>
            ) : (
                /* Populated State */
                <div id="projectsPopulatedState" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>

                    {/* Projects Header Row */}
                    <div className="projects-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <h2 id="projectsCountHeaderTitle" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                Total Projects: <span id="projectsCountHeader">{statusFilter === 'all' ? projects.length : `${filteredProjects.length} of ${projects.length}`}</span>
                            </h2>
                            
                            {/* Selected filter indicator badge */}
                            {statusFilter !== 'all' && (
                                <span className="badge badge-info" id="activeFilterBadge" style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}>
                                    <span>Filter:</span>
                                    <span id="activeFilterLabel" style={{ fontWeight: 700 }}>{statusFilter}</span>
                                </span>
                            )}
                        </div>

                        {/* Back / Clear Filter button */}
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            {statusFilter !== 'all' && (
                                <button 
                                    id="clearFilterBtn" 
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setStatusFilter('all')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                    Clear Filter
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats Cards Row (Horizontal 4-card grid) */}
                    <div className="projects-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '0.25rem' }}>
                        {/* Active Projects Card */}
                        <div 
                            className="project-stat-card active-filter-active" 
                            id="cardActiveProjects"
                            onClick={() => setStatusFilter(statusFilter === 'Active' ? 'all' : 'Active')}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '1rem', 
                                background: '#fff', 
                                border: statusFilter === 'Active' ? '2px solid var(--primary, #3DA2F3)' : '1px solid var(--border-subtle, #E2E8F0)', 
                                borderRadius: 'var(--radius-md, 10px)', 
                                padding: '1.25rem 1.5rem', 
                                cursor: 'pointer' 
                            }}
                        >
                            <div style={{ background: '#EBF5FF', borderRadius: '8px', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary, #3DA2F3)' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                                </svg>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span id="statActiveProjectsCount" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary, #0F172A)', lineHeight: 1.2, fontFamily: "'Inter', sans-serif" }}>{activeCount}</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #64748B)', fontFamily: "'Inter', sans-serif" }}>Active Projects</span>
                            </div>
                        </div>

                        {/* Completed Card */}
                        <div 
                            className="project-stat-card active-filter-completed" 
                            id="cardCompleted"
                            onClick={() => setStatusFilter(statusFilter === 'Completed' ? 'all' : 'Completed')}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '1rem', 
                                background: '#fff', 
                                border: statusFilter === 'Completed' ? '2px solid var(--success, #10B981)' : '1px solid var(--border-subtle, #E2E8F0)', 
                                borderRadius: 'var(--radius-md, 10px)', 
                                padding: '1.25rem 1.5rem', 
                                cursor: 'pointer' 
                            }}
                        >
                            <div style={{ background: '#ECFDF5', borderRadius: '8px', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span id="statCompletedCount" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary, #0F172A)', lineHeight: 1.2, fontFamily: "'Inter', sans-serif" }}>{completedCount}</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #64748B)', fontFamily: "'Inter', sans-serif" }}>Completed</span>
                            </div>
                        </div>

                        {/* On Hold Card */}
                        <div 
                            className="project-stat-card active-filter-on-hold" 
                            id="cardOnHold"
                            onClick={() => setStatusFilter(statusFilter === 'On Hold' ? 'all' : 'On Hold')}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '1rem', 
                                background: '#fff', 
                                border: statusFilter === 'On Hold' ? '2px solid var(--warning, #F59E0B)' : '1px solid var(--border-subtle, #E2E8F0)', 
                                borderRadius: 'var(--radius-md, 10px)', 
                                padding: '1.25rem 1.5rem', 
                                cursor: 'pointer' 
                            }}
                        >
                            <div style={{ background: '#FFFBEB', borderRadius: '8px', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="10" y1="15" x2="10" y2="9"></line>
                                    <line x1="14" y1="15" x2="14" y2="9"></line>
                                </svg>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span id="statOnHoldCount" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary, #0F172A)', lineHeight: 1.2, fontFamily: "'Inter', sans-serif" }}>{onHoldCount}</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #64748B)', fontFamily: "'Inter', sans-serif" }}>On Hold</span>
                            </div>
                        </div>

                        {/* Closed Card */}
                        <div 
                            className="project-stat-card active-filter-closed" 
                            id="cardClosed"
                            onClick={() => setStatusFilter(statusFilter === 'Closed' ? 'all' : 'Closed')}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '1rem', 
                                background: '#fff', 
                                border: statusFilter === 'Closed' ? '2px solid #64748B' : '1px solid var(--border-subtle, #E2E8F0)', 
                                borderRadius: 'var(--radius-md, 10px)', 
                                padding: '1.25rem 1.5rem', 
                                cursor: 'pointer' 
                            }}
                        >
                            <div style={{ background: '#F1F5F9', borderRadius: '8px', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span id="statClosedCount" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary, #0F172A)', lineHeight: 1.2, fontFamily: "'Inter', sans-serif" }}>{closedCount}</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #64748B)', fontFamily: "'Inter', sans-serif" }}>Closed</span>
                            </div>
                        </div>
                    </div>

                    {/* Divider separating Summary Cards and Project List */}
                    <hr id="styler-project-list-hr" className="project-list-divider" style={{ border: 0, borderTop: '1px solid var(--border-subtle, #EEF0F2)', width: '100%', margin: '0.5rem 0 0 0' }} />

                    {/* Project List Heading */}
                    <div id="styler-project-list-heading" className="project-list-heading" style={{ width: '100%', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary, #0F172A)', fontFamily: "'Inter', sans-serif" }}>
                        Project Directory
                    </div>

                    {/* Project Cards List */}
                    <div id="projectsCardsList" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.25rem' }}>
                        {filteredProjects.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', border: '1px dashed var(--border-subtle, #CBD5E1)', borderRadius: 'var(--radius-md, 10px)', color: '#64748B' }}>
                                <p style={{ margin: 0, fontSize: '0.95rem' }}>No projects match your filter or search query.</p>
                            </div>
                        ) : (
                            filteredProjects.map((p, idx) => {
                                const statusClass = (p.status || 'Active').toLowerCase().replace(/\s+/g, '-');
                                return (
                                    <div className="project-list-card" key={p.id || idx} data-project-id={p.id}>
                                        <div className="project-card-header">
                                            <div className="project-card-title-group">
                                                <h3 className="project-card-title-text">{idx + 1}. {p.projectName}</h3>
                                                <span className={`project-status-badge ${statusClass}`}>{p.status}</span>
                                            </div>
                                            
                                            {/* Action Menu button (3 dots) */}
                                            <div style={{ position: 'relative' }}>
                                                <button 
                                                    type="button" 
                                                    onClick={(e) => handleToggleActionMenu(e, p.id)}
                                                    style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'background 0.15s ease' }}
                                                    aria-label="Project actions"
                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="12" cy="12" r="1"></circle>
                                                        <circle cx="12" cy="5" r="1"></circle>
                                                        <circle cx="12" cy="19" r="1"></circle>
                                                    </svg>
                                                </button>

                                                {/* Dropdown Menu */}
                                                {activeActionMenuId === p.id && (
                                                    <div 
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid var(--border-subtle, #E2E8F0)', borderRadius: '8px', boxShadow: 'var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.1))', zIndex: 100, minWidth: '160px', padding: '0.35rem 0', overflow: 'hidden' }}
                                                    >
                                                        <button 
                                                            type="button" 
                                                            onClick={() => { setActiveActionMenuId(null); openEditModal(p); }}
                                                            style={{ width: '100%', padding: '0.55rem 1rem', background: 'none', border: 'none', textAlign: 'left', fontSize: '0.82rem', color: '#1E293B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.1s ease' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                        >
                                                            ✏️ Edit
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => {
                                                                const nextStatus = p.status === 'Completed' ? 'Active' : 'Completed';
                                                                updateProject(p.id, { status: nextStatus });
                                                                setActiveActionMenuId(null);
                                                            }}
                                                            style={{ width: '100%', padding: '0.55rem 1rem', background: 'none', border: 'none', textAlign: 'left', fontSize: '0.82rem', color: '#1E293B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.1s ease' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                        >
                                                            🔄 Mark as {p.status === 'Completed' ? 'Active' : 'Completed'}
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => { setActiveActionMenuId(null); deleteProject(p.id); }}
                                                            style={{ width: '100%', padding: '0.55rem 1rem', background: 'none', border: 'none', textAlign: 'left', fontSize: '0.82rem', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.1s ease' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = '#FEF2F2'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                        >
                                                            🗑️ Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Project Details Grid */}
                                        <div className="project-details-grid">
                                            <div className="project-detail-row">
                                                <span className="project-detail-label">Project Leader:</span>
                                                <span className="project-detail-value">{p.leader}</span>
                                            </div>
                                            <div className="project-detail-row">
                                                <span className="project-detail-label">Client:</span>
                                                <span className="project-detail-value">{p.client}</span>
                                            </div>
                                            <div className="project-detail-row">
                                                <span className="project-detail-label">Employees:</span>
                                                <span className="project-detail-value">{p.employeeName}</span>
                                            </div>
                                            <div className="project-detail-row">
                                                <span className="project-detail-label">Project email Id:</span>
                                                <span className="project-detail-value">{p.projectEmailId}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}