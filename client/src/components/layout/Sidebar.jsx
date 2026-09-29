import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEmployee } from '../../context/EmployeeContext';
import { useClient } from '../../context/ClientContext';
import { useProject } from '../../context/ProjectContext';
import { useAdmin } from '../../context/AdminContext';
import SwitchAccountModal from './SwitchAccountModal';

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();

    // Determine current active dashboard section
    const isEmployees = location.pathname.startsWith('/dashboard/employees');
    const isClients = location.pathname.startsWith('/dashboard/clients');
    const isProjects = location.pathname.startsWith('/dashboard/projects');
    const isAdmins = location.pathname.startsWith('/dashboard/admins');
    const isEmailIds = location.pathname.startsWith('/dashboard/emailIds');
    const isTasks = location.pathname.startsWith('/dashboard/tasks');
    const isSubscription = location.pathname.startsWith('/dashboard/subscription');
    // Email is for /dashboard/email/* and fallback / support

    // Shared state & context
    const [user, setUser] = useState(null);
    const [foldersOpen, setFoldersOpen] = useState(true);
    const [projectsOpen, setProjectsOpen] = useState(true);
    const [switchAccountOpen, setSwitchAccountOpen] = useState(false);

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
        resendInvite
    } = useEmployee();

    const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Error parsing user data:", e);
            }
        }
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = () => setActiveDropdownIndex(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.substring(0, 2).toUpperCase();
    };

    const handleImport = (type) => {
        alert(`Import ${type} feature: Select a CSV or Excel file to upload.`);
    };

    const handleExport = (type) => {
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

        return (
            <aside className="sidebar" id="employeesSidebar" style={{ display: 'flex', flexDirection: 'column' }}>
                <button className="btn-add-employee" id="btnAddEmployee" onClick={() => openQuantityModal()}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Employee
                </button>

                <div className="sidebar-stats">
                    Total employees - <span id="sidebarTotalEmployees">{filledEmployees.length}</span>
                </div>

                <div className="sidebar-actions">
                    <button className="btn-import" aria-label="Import employees" onClick={() => handleImport('employees')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Import
                    </button>
                    <button className="btn-export" aria-label="Export employees" onClick={() => handleExport('employees')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Export
                    </button>
                </div>

                <div className="sidebar-invite">
                    <button className="btn-invite-all" onClick={() => alert('Invite sent to all active employees!')}>Invite all</button>
                </div>

                <div className="sidebar-search">
                    <svg className="sidebar-search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    />
                </div>

                <div className="sidebar-employee-list" id="sidebarEmployeeList" style={{ flex: 1, overflowY: 'auto' }}>
                    {filteredEmployees.map((seat, i) => {
                        const isFilled = seat && seat.status === 'filled';
                        const isSelected = selectedEmployeeIndex === i;
                        const fullName = isFilled ? `${seat.firstName || ''} ${seat.lastName || ''}`.trim() : 'Empty Seat';
                        const usedStorage = seat?.usedStorage || 0;
                        const totalStorage = seat?.totalStorage || 15;
                        const storagePct = Math.min(100, Math.round((usedStorage / totalStorage) * 100));

                        let daysLeftText = "Expire in 30 days";
                        if (seat?.joined_date) {
                            const joined = new Date(seat.joined_date);
                            if (!isNaN(joined.getTime())) {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                let nextBilling = new Date(joined);
                                nextBilling.setHours(0, 0, 0, 0);

                                while (nextBilling <= today) {
                                    nextBilling.setMonth(nextBilling.getMonth() + 1);
                                }
                                const diffTime = nextBilling - today;
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                daysLeftText = `Expire in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                            }
                        }

                        if (!isFilled) {
                            return (
                                <div
                                    key={seat?.id || i}
                                    className="sidebar-emp-add"
                                    onClick={() => openAddModal(i)}
                                >
                                    <div className="plus-icon">+</div>
                                    <div>Add</div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={seat?.id || i}
                                className={`sidebar-emp-card ${isSelected ? 'selected active' : ''}`}
                                data-seat-index={i}
                                onClick={() => {
                                    setSelectedEmployeeIndex(i);
                                }}
                            >
                                <div className="sidebar-emp-badges">
                                    <span className="sidebar-emp-expiry">{daysLeftText}</span>
                                    <span className={`sidebar-emp-status-badge ${seat?.permissions?.blocked ? 'blocked' : (seat.isPending ? 'pending' : 'active')}`}>
                                        {seat?.permissions?.blocked ? 'Blocked' : (seat.isPending ? 'Pending' : 'Active')}
                                    </span>
                                </div>
                                <div className="sidebar-emp-header">
                                    <span className="name-placeholder">{i + 1}. {fullName}</span>
                                    <div
                                        className="sidebar-emp-kebab"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveDropdownIndex(activeDropdownIndex === i ? null : i);
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="1"></circle>
                                            <circle cx="12" cy="5" r="1"></circle>
                                            <circle cx="12" cy="19" r="1"></circle>
                                        </svg>
                                        {activeDropdownIndex === i && (
                                            <div className="sidebar-dropdown" style={{ display: 'block' }}>
                                                <div className="sidebar-dropdown-item" onClick={(e) => { e.stopPropagation(); setActiveDropdownIndex(null); resendInvite(i); }}>
                                                    Invite
                                                </div>
                                                <div className="sidebar-dropdown-item danger" onClick={(e) => { e.stopPropagation(); setActiveDropdownIndex(null); deleteEmployee(i); }}>
                                                    Delete
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="sidebar-emp-storage">
                                    <div className="sidebar-emp-storage-meta">
                                        <span>Storage</span>
                                        <span>{usedStorage} GB of {totalStorage} GB</span>
                                    </div>
                                    <div className="sidebar-emp-storage-track">
                                        <div className="sidebar-emp-storage-fill" style={{ width: `${storagePct}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {filteredEmployees.length === 0 && (
                        <div className="sidebar-empty-state" id="sidebarEmptyState" style={{ display: 'block' }}>
                            No employee
                        </div>
                    )}
                </div>
            </aside>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // 2. CLIENTS SIDEBAR
    // ─────────────────────────────────────────────────────────────
    if (isClients) {
        return (
            <aside className="sidebar" id="clientsSidebar" style={{ display: 'flex', flexDirection: 'column' }}>
                <button className="btn-add-employee" id="btnAddClient" onClick={openAddClientModal}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Clients
                </button>

                <div className="sidebar-stats" id="clientsStatsBox" style={{ marginTop: '1rem', border: '1px solid #D9D9D9', background: '#F5F5F5', borderRadius: '6px', padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: 600, color: '#333' }}>
                    Total Clients - <span id="sidebarTotalClients">{clients.length}</span>
                </div>

                <div className="sidebar-actions">
                    <button className="btn-import" aria-label="Import clients" onClick={handleImportClients}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Import
                    </button>
                    <button className="btn-export" aria-label="Export clients" onClick={handleExportClients}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Export
                    </button>
                </div>

                <div className="sidebar-search">
                    <svg className="sidebar-search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search Client"
                        id="clientsSidebarSearch"
                        aria-label="Search Client"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                    />
                </div>

                <div className="sidebar-logo-branding" style={{ marginTop: 'auto', paddingBottom: '1rem' }}>
                    <span style={{ fontSize: '2.2rem', fontWeight: 900, background: 'linear-gradient(90deg,#3DA2F3,#68D1FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>M</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A60A4', letterSpacing: '0.5px' }}>SAFEMAILZ</span>
                    <span style={{ fontSize: '0.4rem', textTransform: 'uppercase', color: '#333', letterSpacing: '1.5px' }}>PROTECT YOUR CLIENTS</span>
                </div>
            </aside>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // 3. PROJECTS SIDEBAR
    // ─────────────────────────────────────────────────────────────
    if (isProjects) {
        return (
            <aside className="sidebar" id="projectsSidebar" style={{ display: 'flex', flexDirection: 'column' }}>
                <button className="btn-add-employee" id="btnAddProject" onClick={openAddProjectModal}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Project
                </button>

                <div className="sidebar-stats" id="projectsStatsBox" style={{ marginTop: '1rem', border: '1px solid #D9D9D9', background: '#F5F5F5', borderRadius: '6px', padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: 600, color: '#333' }}>
                    Total projects - <span id="sidebarTotalProjects">{projects.length}</span>
                </div>

                <div className="sidebar-actions">
                    <button className="btn-import" aria-label="Import projects" onClick={handleImportProjects}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Import
                    </button>
                    <button className="btn-export" aria-label="Export projects" onClick={handleExportProjects}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Export
                    </button>
                </div>

                <div className="sidebar-search">
                    <svg className="sidebar-search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search projects"
                        id="projectsSidebarSearch"
                        aria-label="Search projects"
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                    />
                </div>

                <div className="sidebar-logo-branding" style={{ marginTop: 'auto', paddingBottom: '1rem' }}>
                    <span style={{ fontSize: '2.2rem', fontWeight: 900, background: 'linear-gradient(90deg,#3DA2F3,#68D1FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>M</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A60A4', letterSpacing: '0.5px' }}>SAFEMAILZ</span>
                    <span style={{ fontSize: '0.4rem', textTransform: 'uppercase', color: '#333', letterSpacing: '1.5px' }}>PROTECT YOUR CLIENTS</span>
                </div>
            </aside>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // 4. ADMINS SIDEBAR
    // ─────────────────────────────────────────────────────────────
    if (isAdmins) {
        const filteredAdmins = admins.filter(adm => {
            if (!adminSearch.trim()) return true;
            const q = adminSearch.toLowerCase().trim();
            return (adm.name || '').toLowerCase().includes(q) || (adm.email || '').toLowerCase().includes(q);
        });

        return (
            <aside className="sidebar" id="adminsSidebar" style={{ display: 'flex', flexDirection: 'column' }}>
                <button className="btn-add-admin" id="btnAddAdmin" onClick={openAddAdminModal}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add admin
                </button>

                <div className="sidebar-stats-admins" id="adminsStatsBox">
                    Total admin - <span id="sidebarTotalAdmins">{admins.length}</span>
                </div>

                <div className="sidebar-search">
                    <svg className="sidebar-search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search admin"
                        id="adminsSidebarSearch"
                        aria-label="Search admin"
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                    />
                </div>

                <div className="sidebar-admin-list" id="sidebarAdminList" style={{ flex: 1, overflowY: 'auto' }}>
                    {filteredAdmins.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748B', fontSize: '0.85rem' }}>
                            No admins found.
                        </div>
                    ) : (
                        filteredAdmins.map((adm, idx) => (
                            <div
                                key={adm.id || idx}
                                className={`admin-card ${selectedAdminIndex === idx ? 'active-admin' : ''}`}
                                onClick={() => setSelectedAdminIndex(idx)}
                                style={{
                                    position: 'relative',
                                    margin: '0.35rem 0',
                                    border: selectedAdminIndex === idx ? '1.5px solid #3DA2F3' : '1px solid #D9DDE2',
                                    background: selectedAdminIndex === idx ? '#EDF5FB' : '#fff',
                                    borderRadius: '6px',
                                    padding: '0.75rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <span className="admin-card-expiry">Expire in {adm.expiryDays || 10} days</span>
                                <div className="admin-card-header">
                                    <span className="admin-card-name">{idx + 1}. {adm.name}</span>
                                    <span style={{ color: '#64748B', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>⋮</span>
                                </div>
                                <div className="admin-card-storage-label">
                                    <span>Storage</span>
                                    <span>{adm.storageUsed || '1.18 GB'} of {adm.storageLimit || '50 GB'}</span>
                                </div>
                                <div className="admin-card-progress">
                                    <div className="admin-card-progress-bar" style={{ width: '15%' }}></div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {admins.length === 0 && (
                    <div className="sidebar-logo-branding" style={{ marginTop: 'auto', paddingBottom: '1rem' }}>
                        <span style={{ fontSize: '2.2rem', fontWeight: 900, background: 'linear-gradient(90deg,#3DA2F3,#68D1FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>M</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A60A4', letterSpacing: '0.5px' }}>SAFEMAILZ</span>
                        <span style={{ fontSize: '0.4rem', textTransform: 'uppercase', color: '#333', letterSpacing: '1.5px' }}>PROTECT YOUR CLIENTS</span>
                    </div>
                )}
            </aside>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // 5. EMAIL IDS SIDEBAR & SUBSCRIPTION SIDEBAR
    // ─────────────────────────────────────────────────────────────
    if (isEmailIds || isSubscription) {
        return (
            <aside className="sidebar" id="emailIdsSidebar" style={{ display: 'flex', flexDirection: 'column' }}>
                <button className="btn-add-employee" id="btnEmailIdsAddEmployee" onClick={() => openQuantityModal()}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add employee
                </button>

                <div className="sidebar-stats" id="emailIdsSidebarStatsBox">
                    Total employee - <span id="sidebarTotalEmailIdsEmployees">{filledEmployees.length}</span>
                </div>

                <div className="email-ids-sidebar-actions">
                    <button className="btn-sidebar-blue" onClick={() => handleImport('email IDs')} aria-label="Import email ids">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Import
                    </button>
                    <button className="btn-sidebar-blue" onClick={() => handleExport('email IDs')} aria-label="Export email ids">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Export
                    </button>
                </div>

                <div className="sidebar-logo-branding" style={{ marginTop: 'auto', paddingBottom: '1rem' }}>
                    <div className="sidebar-logo-m">
                        <span style={{ fontSize: '2.2rem', fontWeight: 900, background: 'linear-gradient(90deg,#3DA2F3,#68D1FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>M</span>
                    </div>
                    <span className="sidebar-logo-text-large">SAFEMAILZ</span>
                    <span className="sidebar-logo-subtext-large">PROTECT YOUR CLIENTS</span>
                </div>
            </aside>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // 6. TASKS SIDEBAR
    // ─────────────────────────────────────────────────────────────
    if (isTasks) {
        return (
            <aside className="sidebar" id="tasksSidebar" style={{ display: 'flex', flexDirection: 'column' }}>
                <button className="btn-add-employee" id="btnTasksCreateTask" onClick={() => alert('Create Task modal')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', width: '100%', fontFamily: "'Inter', sans-serif" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>create Task</span>
                </button>

                <div id="tasksSidebarEmptyContent" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Empty placeholder area */}
                </div>

                <div className="sidebar-logo-branding" style={{ marginTop: 'auto', paddingBottom: '1rem' }}>
                    <div className="sidebar-logo-m">
                        <span style={{ fontSize: '2.2rem', fontWeight: 900, background: 'linear-gradient(90deg,#3DA2F3,#68D1FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>M</span>
                    </div>
                    <span className="sidebar-logo-text-large">SAFEMAILZ</span>
                    <span className="sidebar-logo-subtext-large">PROTECT YOUR CLIENTS</span>
                </div>
            </aside>
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
                            {user?.role && (
                                <span id="sidebarAdminRoleBadge" style={{ "display": "block", "fontSize": "10px", "fontWeight": "bold", "backgroundColor": "var(--primary)", "color": "white", "padding": "2px 6px", "borderRadius": "4px", "marginTop": "4px", "width": "fit-content", "textTransform": "capitalize" }}>{user.role.replace('_', ' ')}</span>
                            )}
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
                            <li className="email-folder" onClick={() => navigate('/dashboard/email/inbox')} data-email-filter="folder:inbox">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                                    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                                </svg>
                                Inbox
                                <span className="folder-badge" id="badgeInbox" style={{ "display": "none" }}>0</span>
                            </li>

                            <li className="email-folder" onClick={() => navigate('/dashboard/email/sent')} data-email-filter="folder:sent">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                                Sent Items
                                <span className="folder-badge" id="badgeSent" style={{ "display": "none" }}>0</span>
                            </li>
                            <li className="email-folder" onClick={() => navigate('/dashboard/email/drafts')} data-email-filter="folder:drafts">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                </svg>
                                Drafts
                            </li>
                            <li className="email-folder" onClick={() => navigate('/dashboard/email/deleted')} data-email-filter="folder:deleted">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Deleted Items
                            </li>
                            <li className="email-folder" onClick={() => navigate('/dashboard/email/junk')} data-email-filter="folder:junk">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                </svg>
                                Junk Email
                            </li>
                            <li className="email-folder" onClick={() => navigate('/dashboard/email/archive')} data-email-filter="folder:archive">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="21 8 21 21 3 21 3 8"></polyline>
                                    <rect x="1" y="3" width="22" height="5"></rect>
                                    <line x1="10" y1="12" x2="14" y2="12"></line>
                                </svg>
                                Archive
                            </li>
                            <li className="email-folder" onClick={() => navigate('/dashboard/email/notes')} data-email-filter="folder:notes">
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
                        <div className="email-sidebar-title" style={{ "display": "flex", "justifyContent": "space-between", "cursor": "pointer" }}>
                            My Projects
                            <svg className="toggle-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ "transition": "transform 0.2s ease" }}>
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                        <ul className="email-project-list" id="projectsList" style={{ "transition": "max-height 0.3s ease", "overflow": "hidden", "maxHeight": "200px" }}>
                        </ul>
                    </div>

                    {/* Quick Tools & Settings Section */}
                    <div className="email-sidebar-section email-quick-settings">
                        <ul>
                            <li id="sidebarAutoCcItem" className="email-quick-nav-item" onClick={() => alert('Auto CC Configuration')}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Auto cc
                            </li>
                            <li onClick={() => alert('Auto Reminder: Feature under construction')}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Auto Reminder
                            </li>
                            <li onClick={() => alert('Mail Forwarding: Feature under construction')}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                                </svg>
                                Mail Forwarding
                            </li>
                            <li onClick={() => alert('Snooze: Feature under construction')}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                </svg>
                                Snooze
                            </li>
                            <li onClick={() => alert('Pinned: Feature under construction')}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                </svg>
                                Pinned
                            </li>
                            <li onClick={() => {
                                const gearBtn = document.getElementById('btnOpenSettingsModal');
                                if (gearBtn) gearBtn.click();
                                else alert('Settings');
                            }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                </svg>
                                Settings
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
        </>
    );
}