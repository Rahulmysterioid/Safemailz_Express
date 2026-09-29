import React, { createContext, useContext, useState, useEffect } from 'react';

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
    const [admins, setAdmins] = useState([]);
    const [selectedAdminIndex, setSelectedAdminIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);

    // Fetch real admins from backend on mount
    useEffect(() => {
        const fetchAdmins = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const token = localStorage.getItem('token');
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                if (user?.id) headers['x-user-id'] = String(user.id);
                if (user?.org_id || user?.organization_id) headers['x-org-id'] = String(user.org_id || user.organization_id);

                const res = await fetch('/api/settings/admins', { headers });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.admins)) {
                        setAdmins(data.admins);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch admins:', err);
            }
        };
        fetchAdmins();
    }, []);

    const selectedAdmin = admins[selectedAdminIndex] || admins[0] || null;

    const updateAdminField = (field, value) => {
        setAdmins(prev => {
            const next = [...prev];
            if (next[selectedAdminIndex]) {
                next[selectedAdminIndex] = {
                    ...next[selectedAdminIndex],
                    [field]: value
                };
            }
            return next;
        });
    };

    const updateAdminPermission = (permKey, value) => {
        setAdmins(prev => {
            const next = [...prev];
            if (next[selectedAdminIndex]) {
                next[selectedAdminIndex] = {
                    ...next[selectedAdminIndex],
                    permissions: {
                        ...(next[selectedAdminIndex].permissions || {}),
                        [permKey]: value
                    }
                };
            }
            return next;
        });
    };

    const addAdmin = (newAdminData) => {
        const newAdmin = {
            id: newAdminData.id || `admin-${Date.now()}`,
            name: newAdminData.name || 'New Admin',
            email: newAdminData.email || 'admin@safemailz.com',
            role: 'Admin',
            permissions: newAdminData.permissions || {
                addEmployees: true,
                createProjects: true,
                manageProjects: true,
                makeAdmin: false,
                deleteProject: false
            }
        };
        setAdmins(prev => [...prev, newAdmin]);
        setSelectedAdminIndex(admins.length);
    };

    const deleteAdmin = (index) => {
        const admin = admins[index];
        if (!admin) return;

        if (window.confirm(`Are you sure you want to demote ${admin.name} from Admin?`)) {
            // Demote on backend via role change to 'employee'
            const demoteOnBackend = async () => {
                try {
                    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                    const token = localStorage.getItem('token');
                    const headers = { 'Content-Type': 'application/json' };
                    if (token) headers['Authorization'] = `Bearer ${token}`;
                    if (user?.id) headers['x-user-id'] = String(user.id);
                    if (user?.org_id || user?.organization_id) headers['x-org-id'] = String(user.org_id || user.organization_id);

                    await fetch(`/api/settings/employee/${encodeURIComponent(admin.email)}/role`, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify({ role: 'employee' })
                    });
                } catch (err) {
                    console.error('Failed to demote admin on backend:', err);
                }
            };
            demoteOnBackend();

            setAdmins(prev => prev.filter((_, i) => i !== index));
            setSelectedAdminIndex(0);
        }
    };

    const openAddAdminModal = () => setIsAddAdminModalOpen(true);
    const closeAddAdminModal = () => setIsAddAdminModalOpen(false);

    // Re-fetch admins when modal closes (to pick up newly promoted admins)
    const refreshAdmins = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const token = localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (user?.id) headers['x-user-id'] = String(user.id);
            if (user?.org_id || user?.organization_id) headers['x-org-id'] = String(user.org_id || user.organization_id);

            const res = await fetch('/api/settings/admins', { headers });
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.admins)) {
                    setAdmins(data.admins);
                }
            }
        } catch (err) {
            console.error('Failed to refresh admins:', err);
        }
    };

    const value = {
        admins,
        selectedAdmin,
        selectedAdminIndex,
        setSelectedAdminIndex,
        searchQuery,
        setSearchQuery,
        updateAdminField,
        updateAdminPermission,
        addAdmin,
        deleteAdmin,
        isAddAdminModalOpen,
        openAddAdminModal,
        closeAddAdminModal,
        refreshAdmins
    };

    return (
        <AdminContext.Provider value={value}>
            {children}
        </AdminContext.Provider>
    );
}

export function useAdmin() {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
}
