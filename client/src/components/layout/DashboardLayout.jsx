import './SidebarCollapse.css';
import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Topbar from './Topbar';
import { TaskProvider } from '../../context/TaskContext';
import Sidebar from './Sidebar';
import { EmployeeProvider } from '../../context/EmployeeContext';
import { ClientProvider } from '../../context/ClientContext';
import { ProjectProvider } from '../../context/ProjectContext';
import { AdminProvider } from '../../context/AdminContext';
import AddClientModal from '../dashboard/AddClientModal';
import AddProjectModal from '../dashboard/AddProjectModal';
import AddAdminModal from '../dashboard/AddAdminModal';
import { useSidebarUI } from '../../context/SidebarUIContext';

export default function DashboardLayout() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    useEffect(() => { setMobileMenuOpen(false); }, [pathname]);
    useEffect(() => {
        const close = e => { if (e.key === 'Escape') setMobileMenuOpen(false); };
        window.addEventListener('keydown', close);
        return () => window.removeEventListener('keydown', close);
    }, []);
    const [employeeSidebarCollapsed, setEmployeeSidebarCollapsed] = useState(false);
    const isEmployeePage = pathname.replace(/\/$/, '') === '/dashboard/employees';
    const sidebarCollapsed = isEmployeePage && employeeSidebarCollapsed;
    useEffect(() => { setEmployeeSidebarCollapsed(false); }, [pathname]);
    const toggleSidebar = () => {
        const sidebar = document.getElementById('employeesSidebar');
        const wrapper = sidebar?.closest('.dashboard-wrapper');
        if (sidebar && wrapper) {
            wrapper.style.setProperty('--collapsed-sidebar-width', `${sidebar.offsetWidth}px`);
            wrapper.style.setProperty('--collapsed-sidebar-height', `${sidebar.offsetHeight}px`);
        }
        setEmployeeSidebarCollapsed(value => !value);
    };

    const [searchQuery, setSearchQuery] = useState('');
    const { sidebarSettings } = useSidebarUI();

    const getWrapperDirection = () => {
        const pos = sidebarSettings?.position;
        if (pos === 'right') return 'row-reverse';
        if (pos === 'top') return 'column';
        if (pos === 'bottom') return 'column-reverse';
        return 'row';
    };

    useEffect(() => {
        document.body.classList.add('dashboard-body');
        return () => {
            document.body.classList.remove('dashboard-body');
        };
    }, []);

    // Get user role for RBAC
    const [userRole, setUserRole] = useState((JSON.parse(localStorage.getItem('currentUser') || '{}').role || localStorage.getItem('userRole') || 'employee').toLowerCase());
    const isEmployee = userRole.includes('employee');
    const pages = [
        ...(!isEmployee ? [{label:'Employees',path:'/dashboard/employees'}] : []),
        {label:'Email',path:'/dashboard/email/inbox'},
        ...(!isEmployee ? [{label:'Clients',path:'/dashboard/clients'}] : []),
        {label:'Projects',path:'/dashboard/projects'},
        ...(!isEmployee ? [{label:'Admins',path:'/dashboard/admins'},{label:'Email IDs',path:'/dashboard/emailIds'}] : []),
        {label:'Tasks',path:'/dashboard/tasks'},
        ...(!isEmployee ? [{label:'Subscription',path:'/dashboard/subscription'}] : []),
        {label:'Support',path:'/dashboard/email/support'}
    ];
    const activePage = pathname.startsWith('/dashboard/email/support') ? '/dashboard/email/support'
        : pathname.startsWith('/dashboard/email/') ? '/dashboard/email/inbox'
        : pathname.startsWith('/dashboard/boost') ? '/dashboard/subscription'
        : pages.find(page=>pathname.startsWith(page.path))?.path || pages[0].path;


    useEffect(() => {
        // Sync profile silently on load to catch role promotions and update details
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (currentUser.id) {
            fetch('/api/settings/profile', {
                headers: { 
                    'x-user-id': String(currentUser.id),
                    'x-org-id': String(currentUser.organization_id || '1')
                }
            })
            .then(res => res.json())
            .then(data => {
                const fetchedUser = data?.profile?.user;
                if (fetchedUser) {
                    const latestRole = (fetchedUser.role || '').toLowerCase();
                    const updatedUser = {
                        ...currentUser,
                        ...fetchedUser,
                        name: fetchedUser.name || fetchedUser.admin_name || currentUser.name,
                        admin_name: fetchedUser.admin_name || currentUser.admin_name,
                        firstName: fetchedUser.firstName || fetchedUser.first_name || currentUser.firstName,
                        lastName: fetchedUser.lastName || fetchedUser.last_name || currentUser.lastName,
                        first_name: fetchedUser.first_name || currentUser.first_name,
                        last_name: fetchedUser.last_name || currentUser.last_name,
                        dob: fetchedUser.dob || currentUser.dob,
                        workDays: fetchedUser.workDays || fetchedUser.work_days || currentUser.workDays,
                        work_days: fetchedUser.work_days || fetchedUser.workDays || currentUser.work_days,
                        role: fetchedUser.role || currentUser.role,
                        workMode: fetchedUser.work_mode || fetchedUser.workMode || currentUser.workMode || 'Remote',
                        work_mode: fetchedUser.work_mode || fetchedUser.workMode || currentUser.work_mode || 'Remote',
                        workLocation: fetchedUser.work_location || fetchedUser.workLocation || currentUser.workLocation || 'Gilgit Baltistan, Pakistan',
                        work_location: fetchedUser.work_location || fetchedUser.workLocation || currentUser.work_location || 'Gilgit Baltistan, Pakistan',
                        bio: fetchedUser.bio !== undefined ? fetchedUser.bio : (currentUser.bio || '')
                    };
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                    
                    // Update in savedAccounts too
                    try {
                        const saved = JSON.parse(localStorage.getItem('savedAccounts') || '[]');
                        const updatedSaved = saved.map(a => a.id === currentUser.id ? updatedUser : a);
                        localStorage.setItem('savedAccounts', JSON.stringify(updatedSaved));
                    } catch(e) {}
                    
                    window.dispatchEvent(new Event('storage'));
                    window.dispatchEvent(new Event('employeeStateUpdate'));

                    if (latestRole && latestRole !== userRole) {
                        setUserRole(latestRole);
                    }
                }
            }).catch(console.error);
        }
    }, []);

    return (
        <TaskProvider><EmployeeProvider>
            <ClientProvider>
                <ProjectProvider>
                    <AdminProvider>
                        {/* overflow: 'clip' (not 'hidden') so programmatic scrolls (e.g. scrollIntoView in sidebars) can never shift the Topbar out of view */}
                        {/* height: 100% (not 100vh) because html has zoom: 1.1 — 100vh would overflow the viewport and push the Topbar off-screen */}
                        <div className="dashboard-shell" style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, overflow: 'clip' }}>
                            <Topbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} mobileMenuOpen={mobileMenuOpen} onToggleMobileMenu={()=>setMobileMenuOpen(open=>!open)} />
                            <div
                                className={`dashboard-wrapper ${sidebarCollapsed ? 'employee-sidebar-collapsed' : ''}`}
                                data-sidebar-position={sidebarSettings?.position || 'left'}
                                style={{
                                    display: 'flex',
                                    flex: 1,
                                    overflow: 'hidden',
                                    flexDirection: getWrapperDirection()
                                }}
                            >
                                {mobileMenuOpen && <button className="responsive-sidebar-backdrop" aria-label="Close navigation" onClick={()=>setMobileMenuOpen(false)} />}
                                <div id="responsiveSidebar" className={`responsive-sidebar-host ${mobileMenuOpen ? 'is-open' : ''}`}>
                                    <button className="responsive-sidebar-close" onClick={()=>setMobileMenuOpen(false)} aria-label="Close navigation">Close menu ×</button>
                                    <Sidebar collapsed={sidebarCollapsed} />
                                </div>
                                <main className="main-content" style={{ minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    {/* Top Level Tabs */}
                                    <nav className="dashboard-page-nav" aria-label="Dashboard pages">
                                        <label className="mobile-page-selector">
                                            <span>Workspace</span>
                                            <select aria-label="Go to dashboard page" value={activePage} onChange={event=>navigate(event.target.value)}>
                                                {pages.map(page=><option key={page.path} value={page.path}>{page.label}</option>)}
                                            </select>
                                        </label>
                                        <div className="tabs-container">
                                            {pages.map(page=><NavLink key={page.path} to={page.path} className={activePage===page.path?'tab active':'tab'} aria-current={activePage===page.path?'page':undefined}>{page.label}</NavLink>)}
                                        </div>
                                    </nav>
                                    {/* Child Views (Email, Employees, etc) */}
                                    <Outlet context={{ searchQuery, sidebarCollapsed, toggleSidebar }} />
                                </main>
                            </div>
                        </div>
                        <AddClientModal />
                        <AddProjectModal />
                        <AddAdminModal />
                    </AdminProvider>
                </ProjectProvider>
            </ClientProvider>
        </EmployeeProvider></TaskProvider>
    );
}
