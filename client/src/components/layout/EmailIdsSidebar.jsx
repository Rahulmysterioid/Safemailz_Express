import EmployeeSidebarCard from './EmployeeSidebarCard';
import './SubscriptionSidebarCards.css';
import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import SidebarActionHeader from './SidebarActionHeader';
import { useProject } from '../../context/ProjectContext';
import { useEmployee } from '../../context/EmployeeContext';

export default function EmailIdsSidebar({
    user,
    effectivePermissions,
    filledEmployeesCount = 0,
    openQuantityModal = () => {},
    handleImport = () => {},
    handleExport = () => {}
}) {
    const location = useLocation();
    const isEmailIdsPage = location.pathname.startsWith('/dashboard/emailIds');
    const isSubscriptionPage = location.pathname.startsWith('/dashboard/subscription') || location.pathname.startsWith('/dashboard/boost');
    const projectCtx = useProject();
    const employeeCtx = useEmployee();
    const globalProjects = projectCtx?.projects || [];
    const filledEmployees = employeeCtx?.filledEmployees || [];
    const [copiedId, setCopiedId] = useState(null);
    const [activeDropdownIndex,setActiveDropdownIndex]=useState(null);

    const canAddEmployee = !user || (user.role?.toLowerCase() !== 'employee' && (user.role?.toLowerCase() === 'org_owner' || effectivePermissions?.addEmployees !== false));

    const sidebarEmailRoutes = useMemo(() => {
        if (!isEmailIdsPage) return [];
        try {
            const stored = localStorage.getItem('safemailzEmployeeProjects');
            const parsed = stored ? JSON.parse(stored) : [];
            const list = Array.isArray(parsed) ? [...parsed] : [];
            if (Array.isArray(globalProjects)) {
                globalProjects.forEach(gp => {
                    const exists = list.some(
                        p => (p.id && gp.id && p.id === gp.id) ||
                            (p.projectName && gp.projectName &&
                                p.projectName.toLowerCase() === gp.projectName.toLowerCase() &&
                                (p.projectEmailId || '').toLowerCase() === (gp.projectEmailId || '').toLowerCase())
                    );
                    if (!exists) list.push(gp);
                });
            }
            return list.map((p, idx) => ({
                id: p.id || `route-${idx}`,
                email: p.projectEmailId || p.emailId || p.email || p.clientEmail || '-',
                projectName: p.projectName || p.name || `Project ${idx + 1}`,
                clientId: p.clientId || (p.client && p.client.includes('@') ? p.client.split('@')[0] : p.client) || `CL-${1000 + idx}`,
                emailNo: p.emailNo || p.emailNumber || (idx + 1),
                status: p.status || 'Active'
            }));
        } catch (e) {
            return [];
        }
    }, [isEmailIdsPage, globalProjects]);

    const handleQuickCopy = (e, email, id) => {
        e.stopPropagation();
        if (!email || email === '-') return;
        navigator.clipboard?.writeText(email);
        setCopiedId(id);
        setTimeout(() => setCopiedId(curr => (curr === id ? null : curr)), 1600);
    };

    const handleScrollToEmployeeCard = (fullName) => {
        const container = document.getElementById('subscriptionView');
        if (!container) return;
        const card = container.querySelector(`[data-emp-name="${CSS.escape(fullName)}"]`);
        if (card) {
            // NOTE: scrollIntoView() also scrolls every ancestor (including the
            // overflow:hidden 100vh layout wrapper), which pushed the Topbar
            // out of view. Scroll only the subscription container instead.
            const containerRect = container.getBoundingClientRect();
            const cardRect = card.getBoundingClientRect();
            const offset = cardRect.top - containerRect.top - (container.clientHeight - cardRect.height) / 2;
            container.scrollTo({ top: Math.max(0, container.scrollTop + offset), behavior: 'smooth' });
        }
    };

    return (
        <aside
            className={`sidebar email-ids-sidebar ${isSubscriptionPage ? 'subscription-sidebar' : ''} w-72 shrink-0 border-r border-slate-200 dark:border-[#1e2636] bg-white dark:bg-[#0e121a] flex flex-col h-full font-inter`}
            id="emailIdsSidebar"
            style={{ minHeight: 0, maxHeight: '100%', overflow: 'hidden' }}
        >
            {/* Top Control Header */}
            <SidebarActionHeader id="emailIdsSidebarActionHeader" className="email-ids-sidebar-header">
                {canAddEmployee && (
                    <button
                        type="button"
                        className="btn-email-ids-add w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border-0"
                        id="btnEmailIdsAddEmployee"
                        onClick={() => openQuantityModal && openQuantityModal()}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        <span>Add Employee</span>
                    </button>
                )}

                {/* Total Counter Pill Bar */}
                <div
                    className="email-ids-sidebar-stats flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-[#141821] border border-slate-200/80 dark:border-[#222938] rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200"
                    id="emailIdsSidebarStatsBox"
                >
                    <span className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 dark:text-sky-400">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span>Total Employees</span>
                    </span>
                    <span
                        id="sidebarTotalEmailIdsEmployees"
                        className="bg-blue-50 dark:bg-[#132842] text-blue-600 dark:text-sky-400 font-bold px-2.5 py-0.5 rounded-full text-[11px]"
                    >
                        {filledEmployeesCount}
                    </span>
                </div>

                {/* Secondary Action Row (2-column outline button grid) */}
                <div className="grid grid-cols-2 gap-2 w-full">
                    <button
                        type="button"
                        id="emailIdsImportBtn"
                        className="email-ids-sidebar-btn h-8 px-2.5 rounded-lg border border-slate-200 dark:border-[#222938] bg-white dark:bg-[#141821] hover:bg-slate-50 dark:hover:bg-[#1c2230] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        aria-label="Import email ids"
                        onClick={() => handleImport && handleImport('email IDs')}
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
                        id="emailIdsExportBtn"
                        className="email-ids-sidebar-btn h-8 px-2.5 rounded-lg border border-slate-200 dark:border-[#222938] bg-white dark:bg-[#141821] hover:bg-slate-50 dark:hover:bg-[#1c2230] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        aria-label="Export email ids"
                        onClick={() => handleExport && handleExport('email IDs')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span>Export</span>
                    </button>
                </div>
            </SidebarActionHeader>

            {/* Middle Directory / Quick Routes Content */}
            <div
                id="emailIdsSidebarEmptyContent"
                className="flex-1 overflow-y-auto px-3 py-2.5 flex flex-col gap-2"
                style={{ minHeight: 0 }}
            >
                {isEmailIdsPage && sidebarEmailRoutes.length > 0 && (
                    <div className="email-ids-sidebar-directory">
                        <div className="email-ids-sidebar-section-head">
                            <span>Configured Routes</span>
                            <span className="email-ids-sidebar-route-count">{sidebarEmailRoutes.length}</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            {sidebarEmailRoutes.map((item, index) => {
                                const isCopied = copiedId === item.id;
                                const words=item.projectName.trim().replace(/^\d+[.)]\s*/, '').split(/\s+/);
                                const initials=(words.length>1?words[0][0]+words[1][0]:words[0].slice(0,2)).toUpperCase();
                                const palette=[['#3b82f6','#4f46e5'],['#10b981','#0d9488'],['#8b5cf6','#7c3aed'],['#f59e0b','#ea580c'],['#06b6d4','#0284c7'],['#ec4899','#e11d48']][index%6];
                                const isActive = (item.status || 'Active').toLowerCase() === 'active';
                                return (
                                    <div
                                        key={item.id}
                                        className={`email-ids-sidebar-route-card email-route-item client-style-route ${isCopied ? 'route-copied' : ''}`}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`Copy ${item.email}`}
                                        onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleQuickCopy(e,item.email,item.id);}}}
                                        onClick={(e) => handleQuickCopy(e, item.email, item.id)}
                                        title="Click to copy Email ID"
                                    >
                                        <span className="route-client-avatar" style={{background:`linear-gradient(135deg, ${palette[0]}, ${palette[1]})`,boxShadow:`0 0 0 3px ${palette[0]}33`}} aria-hidden="true">{initials}</span>
                                        <div className="route-client-info">
                                            <span className="route-card-project" title={item.projectName}><span className="route-card-num">{item.emailNo}.</span>{item.projectName}</span>
                                            <span className="route-card-email" title={item.email}>{item.email}</span>
                                        </div>
                                        <span className="route-client-actions">
                                            <span className={`route-card-dot ${isActive ? 'is-active' : 'is-other'}`} title={item.status}/>
                                            <span className={`route-card-copy-tag ${isCopied ? 'copied' : ''}`} aria-live="polite">{isCopied?'Copied':'Copy'}</span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {isSubscriptionPage && filledEmployees.length > 0 && (
                    <div className="email-ids-sidebar-directory">
                        <div className="email-ids-sidebar-section-head">
                            <span>Provisioned Seats</span>
                            <span className="email-ids-sidebar-route-count">{filledEmployees.length}</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            {filledEmployees.map((emp) => {
                                const index=employeeCtx.employees.indexOf(emp);
                                const fullName=`${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee';
                                return <EmployeeSidebarCard key={emp.id || index} seat={emp} i={index} isSelected={employeeCtx.selectedEmployeeIndex===index} onSelect={()=>{employeeCtx.setSelectedEmployeeIndex(index);handleScrollToEmployeeCard(fullName);}} activeDropdownIndex={activeDropdownIndex} setActiveDropdownIndex={setActiveDropdownIndex} resendInvite={employeeCtx.resendInvite} deleteEmployee={employeeCtx.deleteEmployee}/>;
                            })}
                        </div>
                    </div>
                )}

                {/* Confidentiality Protection Card */}
                <div className="email-ids-protection-card" style={{ marginTop: 'auto' }}>
                    <div className="protection-card-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            <path d="m9 12 2 2 4-4"></path>
                        </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="protection-card-title">Identity Shield Active</div>
                        <div className="protection-card-desc">
                            Client email addresses are masked for restricted employee seats.
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom branding */}
            <div className="sidebar-logo-branding email-ids-brand-footer py-2.5 px-4 border-t border-slate-100 dark:border-[#1e2636]">
                <div className="sidebar-logo-m">
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, background: 'linear-gradient(90deg,#38bdf8,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>M</span>
                </div>
                <span className="sidebar-logo-text-large">SAFEMAILZ</span>
                <span className="sidebar-logo-subtext-large">PROTECT YOUR CLIENTS</span>
            </div>
        </aside>
    );
}
