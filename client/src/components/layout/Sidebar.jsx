import EmployeeSidebarCard from './EmployeeSidebarCard';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEmployee } from '../../context/EmployeeContext';
import { useClient } from '../../context/ClientContext';
import { useProject } from '../../context/ProjectContext';
import { useAdmin } from '../../context/AdminContext';
import SwitchAccountModal from './SwitchAccountModal';
import ImportExportButtons from '../common/ImportExportButtons';
import AdminsSidebar from './AdminsSidebar';
import ProjectsSidebar from './ProjectsSidebar';
import ClientsSidebar from './ClientsSidebar';
import EmailIdsSidebar from './EmailIdsSidebar';
import TasksSidebar from './TasksSidebar';
import SidebarActionHeader from './SidebarActionHeader';
import AutoCcModal from '../dashboard/AutoCcModal';
import { useSidebarUI } from '../../context/SidebarUIContext';
import SidebarCustomizerModal from './SidebarCustomizerModal';

const getInitials = (name) => {
    if (!name || name === 'Empty Seat') return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
};

const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
    'linear-gradient(135deg, #059669 0%, #047857 100%)',
    'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
    'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
    'linear-gradient(135deg, #DB2777 0%, #BE185D 100%)',
];

const PROJECT_PALETTES = [
    { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', iconBg: 'linear-gradient(135deg, #10B981, #059669)', name: 'emerald' },
    { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE', iconBg: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', name: 'purple' },
    { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', iconBg: 'linear-gradient(135deg, #F59E0B, #D97706)', name: 'amber' },
    { bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3', iconBg: 'linear-gradient(135deg, #F43F5E, #BE185D)', name: 'rose' },
    { bg: '#F0F9FF', text: '#0284C7', border: '#BAE6FD', iconBg: 'linear-gradient(135deg, #0EA5E9, #0284C7)', name: 'sky' }
];

export default function Sidebar({ collapsed = false }) {
    const location = useLocation();
    const navigate = useNavigate();
    const importFileInputRef = useRef(null);

    // Determine current active dashboard section
    const isEmployees = location.pathname.startsWith('/dashboard/employees');
    const isClients = location.pathname.startsWith('/dashboard/clients');
    const isProjects = location.pathname.startsWith('/dashboard/projects');
    const isAdmins = location.pathname.startsWith('/dashboard/admins');
    const isEmailIds = location.pathname.startsWith('/dashboard/emailIds');
    const isTasks = location.pathname.startsWith('/dashboard/tasks');
    const isSubscription = location.pathname.startsWith('/dashboard/subscription');
    // Email is for /dashboard/email/* and fallback / support

    // Custom Sidebar UI Context
    const { sidebarSettings, applyCustomColors, isCustomizerOpen, setIsCustomizerOpen } = useSidebarUI();

    // Shared state & context
    const [user, setUser] = useState(null);
    const [foldersOpen, setFoldersOpen] = useState(true);
    const [projectsOpen, setProjectsOpen] = useState(true);
    const [switchAccountOpen, setSwitchAccountOpen] = useState(false);
    const [isAutoCcOpen, setIsAutoCcOpen] = useState(false);
    const [isAutoCcActive, setIsAutoCcActive] = useState(false);
    const [isSnoozedActive, setIsSnoozedActive] = useState(false);
    const [snoozeHeldCount, setSnoozeHeldCount] = useState(0);
    const [myProjects, setMyProjects] = useState([]);
    const [myProjectsLoading, setMyProjectsLoading] = useState(false);

    // Section specific search states
    const [taskSearch, setTaskSearch] = useState('');

    // Admin Context
    const {
        admins,
        selectedAdminIndex,
        setSelectedAdminIndex,
        searchQuery: adminSearch,
        setSearchQuery: setAdminSearch,
        openAddAdminModal
    } = useAdmin();

    // Client Context
    const {
        clients,
        searchQuery: clientSearch,
        setSearchQuery: setClientSearch,
        openAddModal: openAddClientModal,
        handleImport: handleImportClients,
        handleExport: handleExportClients
    } = useClient();

    // Project Sidebar context
    const {
        projects,
        searchQuery: projectSearch,
        setSearchQuery: setProjectSearch,
        openAddModal: openAddProjectModal,
        handleImportProjects,
        handleExportProjects
    } = useProject();

    // Employee Sidebar context
    const {
        employees,
        filledEmployees,
        selectedEmployeeIndex,
        setSelectedEmployeeIndex,
        searchQuery,
        setSearchQuery,
        openAddModal,
        openQuantityModal,
        deleteEmployee,
        resendInvite,
        handleExportEmployees,
        handleImportEmployees
    } = useEmployee();

    const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);

    useEffect(() => {
        const loadUser = () => {
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                } catch (e) {
                    console.error("Error parsing user data:", e);
                }
            }
        };
        loadUser();

        window.addEventListener('storage', loadUser);
        return () => window.removeEventListener('storage', loadUser);
    }, []);

    const effectivePermissions = React.useMemo(() => {
        if (!user) return {};
        if (user.role?.toLowerCase() === 'admin') {
            const currentAdmin = admins.find(a => a.id === user.id || a.email === user.email);
            if (currentAdmin && currentAdmin.permissions) {
                return currentAdmin.permissions;
            }
        }
        return user.permissions || {};
    }, [user, admins]);

    // Refresh user profile from backend to pick up role changes (e.g., promotion/demotion)
    useEffect(() => {
        const refreshUserProfile = async () => {
            try {
                const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                if (!storedUser.id) return;

                const res = await fetch('/api/settings/me', {
                    headers: {
                        'x-user-id': String(storedUser.id),
                        'x-org-id': String(storedUser.organization_id || '1')
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.user) {
                        // Merge fresh backend data into the stored user object
                        const updatedUser = { ...storedUser, role: data.user.role, admin_name: data.user.admin_name, email: data.user.email, subscription_status: data.user.subscription_status };
                        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                        setUser(updatedUser);
                    }
                }
            } catch (e) {
                // Silently fail — localStorage data will be used as fallback
            }
        };

        refreshUserProfile();
    }, [location.pathname]);

    // Fetch projects assigned to the logged-in user for the "My Projects" sidebar section
    useEffect(() => {
        // Only fetch for the email/support sidebar (not employees/clients/projects/admins sections)
        if (isEmployees || isClients || isProjects || isAdmins || isEmailIds || isSubscription || isTasks) return;
        if (!user) return;

        const fetchMyProjects = async () => {
            setMyProjectsLoading(true);
            try {
                const headers = { 'Content-Type': 'application/json' };
                const token = localStorage.getItem('token');
                if (token) headers['Authorization'] = `Bearer ${token}`;
                if (user?.id) headers['x-user-id'] = String(user.id);
                if (user?.org_id || user?.organization_id) headers['x-org-id'] = String(user.org_id || user.organization_id);

                const res = await fetch('/api/projects/my-projects', { headers });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.projects)) {
                        setMyProjects(data.projects);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch my projects:', err);
            } finally {
                setMyProjectsLoading(false);
            }
        };

        fetchMyProjects();
    }, [user, location.pathname]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = () => setActiveDropdownIndex(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Sync Auto CC active status for sidebar indicator
    useEffect(() => {
        const fetchAutoCcStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                if (storedUser?.id) headers['x-user-id'] = String(storedUser.id);
                if (storedUser?.org_id || storedUser?.organization_id) {
                    headers['x-org-id'] = String(storedUser.org_id || storedUser.organization_id);
                }

                const res = await fetch('/api/email/settings/auto-cc', { headers });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.success) {
                        setIsAutoCcActive(Boolean(data.isAutoCcEnabled));
                    }
                }
            } catch (err) {
                console.error('Failed to fetch Auto CC status for sidebar:', err);
            }
        };

        fetchAutoCcStatus();

        const handleAutoCcUpdated = (e) => {
            if (e?.detail && typeof e.detail.isAutoCcEnabled === 'boolean') {
                setIsAutoCcActive(e.detail.isAutoCcEnabled);
            } else {
                fetchAutoCcStatus();
            }
        };

        window.addEventListener('autocc-settings-updated', handleAutoCcUpdated);

        const fetchSnoozeStatus = async () => {
            if (!user?.id) return;
            try {
                const res = await fetch('/api/email/snooze/status', {
                    headers: {
                        'x-user-id': String(user.id),
                        'x-org-id': String(user.organization_id || '1')
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.success) {
                        setIsSnoozedActive(Boolean(data.isInboxSnoozed));
                        setSnoozeHeldCount(data.heldEmailsCount || 0);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch Snooze status for sidebar:', err);
            }
        };

        fetchSnoozeStatus();

        const handleSnoozeUpdated = (e) => {
            if (e?.detail && typeof e.detail.isInboxSnoozed === 'boolean') {
                setIsSnoozedActive(e.detail.isInboxSnoozed);
                if (!e.detail.isInboxSnoozed) setSnoozeHeldCount(0);
            }
            fetchSnoozeStatus();
        };

        window.addEventListener('snoozeStatusChanged', handleSnoozeUpdated);

        return () => {
            window.removeEventListener('autocc-settings-updated', handleAutoCcUpdated);
            window.removeEventListener('snoozeStatusChanged', handleSnoozeUpdated);
        };
    }, [user]);

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.substring(0, 2).toUpperCase();
    };

    const handleImport = (type) => {
        alert(`Import ${type} feature: Select a CSV or Excel file to upload.`);
    };

    const handleExport = (type) => {
        if (type === 'employees') {
            exportEmployeesToCSV(filledEmployees, ADD_EMPLOYEE_MODAL_FIELDS);
            return;
        }
        alert(`Exporting ${type} as CSV...`);
    };

    // ─────────────────────────────────────────────────────────────
    // 1. EMPLOYEES SIDEBAR
    // ─────────────────────────────────────────────────────────────
    if (isEmployees) {
        const filteredEmployees = employees.filter(emp => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
            return fullName.includes(q) || (emp.email || '').toLowerCase().includes(q);
        });

        const isHorizontalDock = sidebarSettings?.position === 'top' || sidebarSettings?.position === 'bottom';

        const customSidebarStyle = {
            backgroundColor: applyCustomColors ? sidebarSettings?.bgColor : undefined,
            color: applyCustomColors ? sidebarSettings?.textColor : undefined,
            fontSize: sidebarSettings?.fontSize ? `${sidebarSettings.fontSize}px` : undefined,
            width: isHorizontalDock ? '100%' : (sidebarSettings?.width ? `${sidebarSettings.width}px` : undefined),
            minWidth: isHorizontalDock ? '100%' : (sidebarSettings?.width ? `${sidebarSettings.width}px` : undefined),
            maxWidth: isHorizontalDock ? '100%' : (sidebarSettings?.width ? `${sidebarSettings.width}px` : undefined),
            height: isHorizontalDock ? (sidebarSettings?.height ? `${sidebarSettings.height}px` : '185px') : '100%',
            maxHeight: isHorizontalDock ? (sidebarSettings?.height ? `${sidebarSettings.height}px` : '185px') : '100%',
            borderRadius: sidebarSettings?.borderRadius ? `${sidebarSettings.borderRadius}px` : undefined,
            borderWidth: sidebarSettings?.borderWidth != null ? `${sidebarSettings.borderWidth}px` : undefined,
            borderColor: applyCustomColors ? sidebarSettings?.borderColor : undefined,
            borderStyle: sidebarSettings?.borderStyle || 'solid',
            padding: sidebarSettings?.padding ? `${sidebarSettings.padding}px` : undefined,
            marginTop: sidebarSettings?.marginTop ? `${sidebarSettings.marginTop}px` : undefined,
            marginBottom: sidebarSettings?.marginBottom ? `${sidebarSettings.marginBottom}px` : undefined,
            marginLeft: sidebarSettings?.marginLeft ? `${sidebarSettings.marginLeft}px` : undefined,
            marginRight: sidebarSettings?.marginRight ? `${sidebarSettings.marginRight}px` : undefined,
            boxShadow: sidebarSettings?.boxShadow === 'soft' ? '0 4px 16px rgba(0, 0, 0, 0.12)' :
                       sidebarSettings?.boxShadow === 'medium' ? '0 8px 24px rgba(0, 0, 0, 0.22)' :
                       sidebarSettings?.boxShadow === 'floating' ? '0 16px 36px rgba(0, 0, 0, 0.32)' :
                       sidebarSettings?.boxShadow === 'glow' ? '0 0 24px rgba(59, 130, 246, 0.35)' : undefined
        };

        return (
            <>
            <aside
                className="sidebar bg-slate-50 dark:bg-[#181818] border-r border-slate-200 dark:border-[#2b2b2b] flex flex-col h-full shrink-0 transition-all duration-200"
                id="employeesSidebar"
                inert={collapsed}
                aria-hidden={collapsed || undefined}
                style={customSidebarStyle}
            >
                {/* Top Controls Container */}
                <SidebarActionHeader>
                    {user && user.role?.toLowerCase() !== 'employee' && (user.role?.toLowerCase() === 'org_owner' || effectivePermissions?.addEmployees !== false) && (
                        <button
                            className="btn-add-employee w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                            id="btnAddEmployee"
                            onClick={() => openQuantityModal()}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Add Employee
                        </button>
                    )}

                    <div className="sidebar-stats flex items-center justify-between px-3 py-1.5 bg-slate-100 dark:bg-[#202020] border border-slate-200 dark:border-[#303030] rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200">
                        <span>Total Employees</span>
                        <div className="flex items-center gap-1.5">
                            <span id="sidebarTotalEmployees" className="bg-white dark:bg-[#142338] border border-slate-200 dark:border-transparent text-slate-800 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full text-[11px]">
                                {filledEmployees.length}
                            </span>
                            
                        </div>
                    </div>

                    {/* Dedicated Button to change UI as requested */}
                    

                    {/* Single 3-column action row: Import, Export, Invite all */}
                    <div className="sidebar-actions-grid grid grid-cols-3 gap-1.5 w-full">
                        <input
                            type="file"
                            ref={importFileInputRef}
                            style={{ display: 'none' }}
                            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0] && handleImportEmployees) {
                                    handleImportEmployees(e);
                                }
                            }}
                        />
                        <button
                            type="button"
                            id="employeesImportBtn"
                            className="sidebar-action-btn h-8 px-2 rounded-lg border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#222222] hover:bg-slate-50 dark:hover:bg-[#292929] text-slate-700 dark:text-slate-200 text-[11px] font-medium flex items-center justify-center gap-1 transition shadow-2xs whitespace-nowrap"
                            aria-label="Import employees"
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
                            id="employeesExportBtn"
                            className="sidebar-action-btn h-8 px-2 rounded-lg border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#222222] hover:bg-slate-50 dark:hover:bg-[#292929] text-slate-700 dark:text-slate-200 text-[11px] font-medium flex items-center justify-center gap-1 transition shadow-2xs whitespace-nowrap"
                            aria-label="Export employees"
                            onClick={handleExportEmployees}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            <span>Export</span>
                        </button>

                        <button
                            type="button"
                            id="employeesInviteAllBtn"
                            className="sidebar-action-btn h-8 px-2 rounded-lg border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#222222] hover:bg-slate-50 dark:hover:bg-[#292929] text-slate-700 dark:text-slate-200 text-[11px] font-medium flex items-center justify-center gap-1 transition shadow-2xs whitespace-nowrap"
                            aria-label="Invite all employees"
                            onClick={() => alert('Invite sent to all active employees!')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                            <span>Invite all</span>
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="sidebar-search relative w-full">
                        <svg className="sidebar-search-icon absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            placeholder="Search employee"
                            id="sidebarSearch"
                            aria-label="Search employees"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#222222] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#1a1a1a] focus:border-blue-500 focus:outline-none transition-colors"
                        />
                    </div>
                </SidebarActionHeader>

                {/* Direct Scrollable Container - No nested double borders! */}
                <div className="sidebar-employee-list flex-1 overflow-y-auto px-3 py-2 space-y-2.5 scrollbar-thin" id="sidebarEmployeeList">
                    {filteredEmployees.map((seat, i) => {
                        const isFilled = seat && seat.status === 'filled';
                        const isSelected = selectedEmployeeIndex === i;
                        if (!isFilled) {
                            const canAdd = user?.role?.toLowerCase() === 'org_owner' || effectivePermissions?.addEmployees !== false;
                            if (!canAdd) return null;
                            return (
                                <div
                                    key={seat?.id || i}
                                    className="sidebar-emp-add w-full rounded-xl p-3 border-1.5 border-dashed border-slate-300 dark:border-[#3a3a3a] hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-[#152438] text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 min-h-[64px]"
                                    onClick={() => openAddModal(i)}
                                >
                                    <div className="plus-icon text-sm leading-none">+</div>
                                    <div className="text-xs font-medium">Add Seat #{i + 1}</div>
                                </div>
                            );
                        }

                        return <EmployeeSidebarCard key={seat?.id || i} seat={seat} i={i} isSelected={isSelected} onSelect={()=>setSelectedEmployeeIndex(i)} activeDropdownIndex={activeDropdownIndex} setActiveDropdownIndex={setActiveDropdownIndex} resendInvite={resendInvite} deleteEmployee={deleteEmployee}/>;
                    })}

                    {filteredEmployees.length === 0 && (
                        <div className="sidebar-empty-state text-slate-500 dark:text-slate-400" id="sidebarEmptyState" style={{ display: 'block' }}>
                            No employee
                        </div>
                    )}
                </div>
            </aside>
            <SidebarCustomizerModal
                isOpen={isCustomizerOpen}
                onClose={() => setIsCustomizerOpen(false)}
            />
            </>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // 2. CLIENTS SIDEBAR
    // ─────────────────────────────────────────────────────────────
    if (isClients) {
        return <ClientsSidebar />;
    }

    // ─────────────────────────────────────────────────────────────
    // 3. PROJECTS SIDEBAR
    // ─────────────────────────────────────────────────────────────
    if (isProjects) {
        return <ProjectsSidebar user={user} effectivePermissions={effectivePermissions} />;
    }

    // ─────────────────────────────────────────────────────────────
    // 4. ADMINS SIDEBAR
    // ─────────────────────────────────────────────────────────────
    if (isAdmins) {
        return <AdminsSidebar user={user} effectivePermissions={effectivePermissions} handleImport={handleImport} handleExport={handleExport} />;
    }

    // ─────────────────────────────────────────────────────────────
    // 5. EMAIL IDS SIDEBAR & SUBSCRIPTION SIDEBAR
    // ─────────────────────────────────────────────────────────────
    if (isEmailIds || isSubscription) {
        return (
            <EmailIdsSidebar
                user={user}
                effectivePermissions={effectivePermissions}
                handleImport={handleImport}
                handleExport={handleExport}
                openQuantityModal={openQuantityModal}
                filledEmployeesCount={filledEmployees.length}
            />
        );
    }

    // ─────────────────────────────────────────────────────────────
    // 6. TASKS SIDEBAR
    // ─────────────────────────────────────────────────────────────
    if (isTasks) {
        return (
            <TasksSidebar
                taskSearch={taskSearch}
                setTaskSearch={setTaskSearch}
                handleImport={handleImport}
                handleExport={handleExport}
                totalTasks={0}
            />
        );
    }

    // ─────────────────────────────────────────────────────────────
    // 7. EMAIL & SUPPORT SIDEBAR (Folders & Mail actions)
    // ─────────────────────────────────────────────────────────────
    return (
        <>
            <aside className="email-sidebar" id="emailSidebar" style={{ overflow: 'hidden', paddingBottom: 0 }}>
                <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
                    <div className="email-admin-panel">
                        <div className="email-admin-info">
                            <strong id="sidebarAdminName" className="email-admin-name" style={{ "display": "block", "maxWidth": "150px", "whiteSpace": "nowrap", "overflow": "hidden", "textOverflow": "ellipsis" }}>{user ? user.admin_name : 'Loading...'}</strong>
                            <span id="sidebarAdminEmail" className="email-admin-email" style={{ "display": "block", "maxWidth": "150px", "whiteSpace": "nowrap", "overflow": "hidden", "textOverflow": "ellipsis" }}>{user ? user.email : ''}</span>
                            {user?.role && (() => {
                                const roleDisplayMap = { 'org_owner': 'Owner', 'admin': 'Admin', 'employee': 'Employee' };
                                const displayRole = roleDisplayMap[user.role.toLowerCase()] || (user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase());
                                return (
                                    <span id="sidebarAdminRoleBadge" style={{ "display": "block", "fontSize": "10px", "fontWeight": "bold", "backgroundColor": "var(--primary)", "color": "white", "padding": "2px 6px", "borderRadius": "4px", "marginTop": "4px", "width": "fit-content" }}>{displayRole}</span>
                                );
                            })()}
                        </div>
                        <button className="btn-switch-account" type="button" onClick={() => setSwitchAccountOpen(true)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 3h5v5"></path>
                                <path d="M21 3l-7 7"></path>
                                <path d="M8 21H3v-5"></path>
                                <path d="M3 21l7-7"></path>
                            </svg>
                            Switch Account
                        </button>
                    </div>

                    <div className="email-sidebar-section">
                        <div className="email-sidebar-title"
                            onClick={() => setFoldersOpen(!foldersOpen)}
                            style={{ "display": "flex", "alignItems": "center", "justifyContent": "space-between", "cursor": "pointer" }}>
                            <div style={{ "display": "flex", "alignItems": "center" }}>
                                Folders
                                <span id="syncingStatus" style={{ "display": "none", "fontSize": "0.7rem", "color": "#3DA2F3", "fontWeight": "normal", "marginLeft": "8px" }}>Syncing...</span>
                            </div>
                            <svg className="toggle-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.2s ease", transform: foldersOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                        <ul className="email-folder-list" id="foldersList" style={{ transition: "max-height 0.3s ease", overflow: "hidden", maxHeight: foldersOpen ? "500px" : "0px" }}>
                            <li className={`email-folder ${(location.pathname === '/dashboard/email' || location.pathname === '/dashboard/email/' || location.pathname.includes('/email/inbox')) && !location.search.includes('project=') ? 'active' : ''}`} onClick={() => navigate('/dashboard/email/inbox')} data-email-filter="folder:inbox">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                                    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                                </svg>
                                Inbox
                                <span className="folder-badge" id="badgeInbox" style={{ "display": "none" }}>0</span>
                            </li>

                            <li className={`email-folder ${location.pathname.includes('/email/sent') ? 'active' : ''}`} onClick={() => navigate('/dashboard/email/sent')} data-email-filter="folder:sent">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                                Sent Items
                                <span className="folder-badge" id="badgeSent" style={{ "display": "none" }}>0</span>
                            </li>
                            <li className={`email-folder ${location.pathname.includes('/email/drafts') ? 'active' : ''}`} onClick={() => navigate('/dashboard/email/drafts')} data-email-filter="folder:drafts">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                </svg>
                                Drafts
                            </li>
                            <li className={`email-folder ${location.pathname.includes('/email/deleted') ? 'active' : ''}`} onClick={() => navigate('/dashboard/email/deleted')} data-email-filter="folder:deleted">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Deleted Items
                            </li>
                            <li className={`email-folder ${location.pathname.includes('/email/junk') ? 'active' : ''}`} onClick={() => navigate('/dashboard/email/junk')} data-email-filter="folder:junk">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                </svg>
                                Junk Email
                            </li>
                            <li className={`email-folder ${location.pathname.includes('/email/archive') ? 'active' : ''}`} onClick={() => navigate('/dashboard/email/archive')} data-email-filter="folder:archive">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="21 8 21 21 3 21 3 8"></polyline>
                                    <rect x="1" y="3" width="22" height="5"></rect>
                                    <line x1="10" y1="12" x2="14" y2="12"></line>
                                </svg>
                                Archive
                            </li>
                            <li className={`email-folder ${location.pathname.includes('/email/notes') ? 'active' : ''}`} onClick={() => navigate('/dashboard/email/notes')} data-email-filter="folder:notes">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                                Notes
                            </li>
                            <li className="email-folder" data-email-filter="folder:conversation">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                                Conversation...
                            </li>
                        </ul>
                    </div>

                    <div className="email-sidebar-section">
                        <div className="email-sidebar-title"
                            onClick={() => setProjectsOpen(!projectsOpen)}
                            style={{ "display": "flex", "justifyContent": "space-between", "cursor": "pointer", "alignItems": "center" }}>
                            My Projects
                            <svg className="toggle-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ "transition": "transform 0.2s ease", transform: projectsOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                        <ul className="email-project-list" id="projectsList" style={{ "transition": "max-height 0.3s ease", "overflow": "hidden", "maxHeight": projectsOpen ? "400px" : "0px" }}>
                            {myProjectsLoading && (
                                <li style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#94A3B8', fontStyle: 'italic' }}>
                                    Loading projects...
                                </li>
                            )}
                            {!myProjectsLoading && myProjects.length === 0 && (
                                <li style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#94A3B8', fontStyle: 'italic' }}>
                                    No projects assigned
                                </li>
                            )}
                            {!myProjectsLoading && myProjects.map((project, idx) => {
                                const palette = PROJECT_PALETTES[idx % PROJECT_PALETTES.length];
                                const searchParams = new URLSearchParams(location.search);
                                const currentProjectParam = searchParams.get('project');
                                const isActiveProject = currentProjectParam && (
                                    currentProjectParam.toLowerCase() === String(project.id).toLowerCase() ||
                                    currentProjectParam.toLowerCase() === String(project.projectName).toLowerCase()
                                );

                                return (
                                    <li
                                        key={project.id}
                                        className={`email-folder email-project-item ${isActiveProject ? 'active' : ''}`}
                                        onClick={() => navigate(`/dashboard/email/inbox?project=${encodeURIComponent(project.id || project.projectName)}`)}
                                        title={project.projectEmailId ? `Email: ${project.projectEmailId}` : project.projectName}
                                        style={{
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '6px 10px',
                                            borderRadius: '8px',
                                            fontWeight: isActiveProject ? 600 : 400,
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '6px',
                                                background: palette.iconBg,
                                                color: '#ffffff',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '11px',
                                                flexShrink: 0,
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                                            }}
                                        >
                                            📁
                                        </span>
                                        <span className="email-project-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontSize: '0.82rem' }}>
                                            {project.projectName}
                                        </span>
                                        {project.projectEmailId && (
                                            <span
                                                className="email-project-group-badge"
                                                style={{
                                                    fontSize: '9px',
                                                    padding: '1px 5px',
                                                    borderRadius: '4px',
                                                    backgroundColor: palette.bg,
                                                    color: palette.text,
                                                    border: `1px solid ${palette.border}`,
                                                    fontWeight: 600,
                                                    flexShrink: 0
                                                }}
                                                title={`Group: ${project.projectEmailId}`}
                                            >
                                                Group
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Quick Tools & Settings Section Header & Spacing Customizer Trigger */}
                    <div
                        className="email-quick-actions-header"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 16px 4px 16px',
                            borderTop: '1px solid #E2E8F0',
                            marginTop: '8px',
                            marginBottom: '2px'
                        }}
                    >
                        <span
                            className="email-quick-actions-title"
                            style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: '#64748B'
                            }}
                        >
                            Quick Actions
                        </span>

                    </div>

                    {/* Quick Tools & Settings Section with Dynamic Spacing */}
                    <div
                        className="email-sidebar-section email-quick-settings"
                        style={{
                            marginTop: 8,
                            marginRight: 0,
                            marginBottom: 8,
                            marginLeft: 0,
                            paddingTop: 4,
                            paddingRight: 8,
                            paddingBottom: 4,
                            paddingLeft: 8,
                            transition: 'margin 0.15s ease, padding 0.15s ease'
                        }}
                    >
                        <ul>
                            <li
                                id="sidebarAutoCcItem"
                                className="email-quick-nav-item"
                                onClick={() => setIsAutoCcOpen(true)}
                                style={{
                                    marginTop: 2,
                                    marginRight: 0,
                                    marginBottom: 2,
                                    marginLeft: 0,
                                    paddingTop: 8,
                                    paddingRight: 12,
                                    paddingBottom: 8,
                                    paddingLeft: 12,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'margin 0.15s ease, padding 0.15s ease'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    <span>Auto cc</span>
                                </div>
                                {isAutoCcActive && (
                                    <span
                                        className="email-quick-badge-on"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '1px 6px',
                                            borderRadius: '9999px',
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            backgroundColor: '#ECFDF5',
                                            color: '#059669',
                                            border: '1px solid #A7F3D0',
                                            lineHeight: '1.2'
                                        }}
                                        title="Auto CC is active"
                                    >
                                        <span
                                            style={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                backgroundColor: '#10B981',
                                                boxShadow: '0 0 4px #10B981',
                                                display: 'inline-block'
                                            }}
                                        ></span>
                                        ON
                                    </span>
                                )}
                            </li>
                            <li
                                className="email-quick-nav-item"
                                onClick={() => alert('Auto Reminder: Feature under construction')}
                                style={{
                                    marginTop: 2,
                                    marginRight: 0,
                                    marginBottom: 2,
                                    marginLeft: 0,
                                    paddingTop: 8,
                                    paddingRight: 12,
                                    paddingBottom: 8,
                                    paddingLeft: 12,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'margin 0.15s ease, padding 0.15s ease'
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                <span>Auto Reminder</span>
                            </li>
                            <li
                                className="email-quick-nav-item"
                                onClick={() => alert('Mail Forwarding: Feature under construction')}
                                style={{
                                    marginTop: 2,
                                    marginRight: 0,
                                    marginBottom: 2,
                                    marginLeft: 0,
                                    paddingTop: 8,
                                    paddingRight: 12,
                                    paddingBottom: 8,
                                    paddingLeft: 12,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'margin 0.15s ease, padding 0.15s ease'
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                                </svg>
                                <span>Mail Forwarding</span>
                            </li>
                            <li
                                className={`email-quick-nav-item ${location.pathname.includes('/email/snooze') ? 'active font-bold text-blue-600' : ''}`}
                                onClick={() => navigate('/dashboard/email/snooze')}
                                style={{
                                    marginTop: 2,
                                    marginRight: 0,
                                    marginBottom: 2,
                                    marginLeft: 0,
                                    paddingTop: 8,
                                    paddingRight: 12,
                                    paddingBottom: 8,
                                    paddingLeft: 12,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'margin 0.15s ease, padding 0.15s ease'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                    <span>Snooze</span>
                                </div>
                                {isSnoozedActive && (
                                    <span
                                        className="email-quick-badge-paused"
                                        style={{
                                            marginLeft: 'auto',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '1px 6px',
                                            borderRadius: '9999px',
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            backgroundColor: '#FEF3C7',
                                            color: '#B45309',
                                            border: '1px solid #FDE68A',
                                            lineHeight: '1.2'
                                        }}
                                        title={snoozeHeldCount > 0 ? `Inbox paused (${snoozeHeldCount} held)` : 'Inbox is paused'}
                                    >
                                        <span
                                            style={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                backgroundColor: '#F59E0B',
                                                boxShadow: '0 0 4px #F59E0B',
                                                display: 'inline-block'
                                            }}
                                        ></span>
                                        PAUSED
                                    </span>
                                )}
                            </li>
                            <li
                                className={`email-quick-nav-item ${location.pathname.includes('/email/pinned') ? 'active font-bold text-blue-600' : ''}`}
                                onClick={() => navigate('/dashboard/email/pinned')}
                                style={{
                                    marginTop: 2,
                                    marginRight: 0,
                                    marginBottom: 2,
                                    marginLeft: 0,
                                    paddingTop: 8,
                                    paddingRight: 12,
                                    paddingBottom: 8,
                                    paddingLeft: 12,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'margin 0.15s ease, padding 0.15s ease'
                                }}
                            >
                                <span style={{ fontSize: "16px", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px" }}>📍</span>
                                <span>Pinned</span>
                            </li>
                            <li
                                className="email-quick-nav-item"
                                onClick={() => {
                                    const gearBtn = document.getElementById('btnOpenSettingsModal');
                                    if (gearBtn) gearBtn.click();
                                    else alert('Settings');
                                }}
                                style={{
                                    marginTop: 2,
                                    marginRight: 0,
                                    marginBottom: 2,
                                    marginLeft: 0,
                                    paddingTop: 8,
                                    paddingRight: 12,
                                    paddingBottom: 8,
                                    paddingLeft: 12,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'margin 0.15s ease, padding 0.15s ease'
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                </svg>
                                <span>Settings</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Avatar Profile */}
                <div className="sidebar-user-profile" style={{
                    "marginTop": "auto",
                    "padding": "16px",
                    "borderTop": "1px solid var(--border-light)",
                    "display": "flex",
                    "alignItems": "center",
                    "gap": "12px",
                    "backgroundColor": "var(--sidebar-bg, #ffffff)",
                    "zIndex": "10"
                }}>
                    <div className="user-avatar" id="headerUserInitials" style={{ "width": "36px", "height": "36px", "borderRadius": "50%", "background": "linear-gradient(135deg, var(--primary), var(--primary-hover))", "color": "white", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontWeight": "700", "fontSize": "14px" }}>
                        {getInitials(user?.admin_name)}
                    </div>
                    <div style={{ "display": "flex", "flexDirection": "column", "overflow": "hidden" }}>
                        <span id="headerUserName" style={{ "fontSize": "14px", "fontWeight": "600", "color": "var(--text-primary)", "whiteSpace": "nowrap", "overflow": "hidden", "textOverflow": "ellipsis" }}>{user ? user.admin_name : 'User'}</span>
                        <span id="headerUserEmail" style={{ "fontSize": "12px", "color": "var(--text-secondary)", "whiteSpace": "nowrap", "overflow": "hidden", "textOverflow": "ellipsis" }}>{user ? user.email : ''}</span>
                    </div>
                </div>
            </aside>
            <SwitchAccountModal
                isOpen={switchAccountOpen}
                onClose={() => setSwitchAccountOpen(false)}
            />
            <AutoCcModal
                isOpen={isAutoCcOpen}
                onClose={() => setIsAutoCcOpen(false)}
                onSaved={(settings) => setIsAutoCcActive(Boolean(settings?.isAutoCcEnabled))}
            />
            <SidebarCustomizerModal
                isOpen={isCustomizerOpen}
                onClose={() => setIsCustomizerOpen(false)}
            />
        </>
    );
}