import React, { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import { EmployeeProvider } from '../../context/EmployeeContext';
import { ClientProvider } from '../../context/ClientContext';
import { ProjectProvider } from '../../context/ProjectContext';
import { AdminProvider } from '../../context/AdminContext';
import AddClientModal from '../dashboard/AddClientModal';
import AddProjectModal from '../dashboard/AddProjectModal';
import AddAdminModal from '../dashboard/AddAdminModal';
import UICustomizer from './UICustomizer';

export default function DashboardLayout() {
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        document.body.classList.add('dashboard-body');
        return () => {
            document.body.classList.remove('dashboard-body');
        };
    }, []);

    // Get user role for RBAC
    const [userRole, setUserRole] = useState((JSON.parse(localStorage.getItem('currentUser') || '{}').role || localStorage.getItem('userRole') || 'employee').toLowerCase());
    const isEmployee = userRole.includes('employee');

    useEffect(() => {
        // Sync profile silently on load to catch role promotions
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
                const fetchedRole = data?.profile?.user?.role;
                if (fetchedRole) {
                    const latestRole = fetchedRole.toLowerCase();
                    if (latestRole !== userRole) {
                        currentUser.role = fetchedRole;
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                        
                        // Update in savedAccounts too
                        try {
                            const saved = JSON.parse(localStorage.getItem('savedAccounts') || '[]');
                            const updatedSaved = saved.map(a => a.id === currentUser.id ? currentUser : a);
                            localStorage.setItem('savedAccounts', JSON.stringify(updatedSaved));
                        } catch(e) {}
                        
                        setUserRole(latestRole);
                    }
                }
            }).catch(console.error);
        }
    }, []);

    return (
        <EmployeeProvider>
            <ClientProvider>
                <ProjectProvider>
                    <AdminProvider>
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
                            <Topbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                            <div className="dashboard-wrapper" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                                <Sidebar />
                                <main className="main-content" style={{ minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    {/* Top Level Tabs */}
                                    <div className="tabs-container" role="tablist">
                                        {!isEmployee && (
                                            <NavLink to="/dashboard/employees" className={({ isActive }) => isActive ? 'tab active' : 'tab'}>Employees</NavLink>
                                        )}
                                        <NavLink to="/dashboard/email/inbox" className={({ isActive }) => isActive || (window.location.pathname.includes('/email') && !window.location.pathname.includes('/email/support')) ? 'tab active' : 'tab'}>Email</NavLink>
                                        {!isEmployee && (
                                            <NavLink to="/dashboard/clients" className={({ isActive }) => isActive ? 'tab active' : 'tab'}>Clients</NavLink>
                                        )}
                                        <NavLink to="/dashboard/projects" className={({ isActive }) => isActive ? 'tab active' : 'tab'}>Projects</NavLink>
                                        {!isEmployee && (
                                            <>
                                                <NavLink to="/dashboard/admins" className={({ isActive }) => isActive ? 'tab active' : 'tab'}>Admins</NavLink>
                                                <NavLink to="/dashboard/emailIds" className={({ isActive }) => isActive ? 'tab active' : 'tab'}>Email ids</NavLink>
                                            </>
                                        )}
                                        <NavLink to="/dashboard/tasks" className={({ isActive }) => isActive ? 'tab active' : 'tab'}>Tasks</NavLink>
                                        {!isEmployee && (
                                            <NavLink to="/dashboard/subscription" className={({ isActive }) => isActive ? 'tab active' : 'tab'}>Subscription</NavLink>
                                        )}
                                        <NavLink to="/dashboard/email/support" className={({ isActive }) => isActive ? 'tab active' : 'tab'}>Support</NavLink>
                                    </div>
                                    {/* Child Views (Email, Employees, etc) */}
                                    <Outlet context={{ searchQuery }} />
                                </main>
                            </div>
                        </div>
                        <AddClientModal />
                        <AddProjectModal />
                        <AddAdminModal />
                        <UICustomizer />
                    </AdminProvider>
                </ProjectProvider>
            </ClientProvider>
        </EmployeeProvider>
    );
}