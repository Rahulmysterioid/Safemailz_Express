import React, { createContext, useContext, useState, useEffect } from 'react';

const ProjectContext = createContext(null);

const DEFAULT_PROJECTS = [
    {
        id: 'proj-1',
        projectName: 'Test Project',
        status: 'Completed',
        leader: 'Rahul Singh (singhrahuldrill@gmail.com)',
        client: 'rahul.awhognoida@gmail.com',
        employeeName: 'Rahul Singh (rahul.indianshelf99@gmail.com)',
        projectEmailId: 'testproject@yourcompanydomain.com'
    }
];

export function ProjectProvider({ children }) {
    const [projects, setProjects] = useState(() => {
        const stored = localStorage.getItem('safemailzProjects');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (e) {
                console.error("Error parsing projects from localStorage", e);
            }
        }
        return DEFAULT_PROJECTS;
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);

    useEffect(() => {
        localStorage.setItem('safemailzProjects', JSON.stringify(projects));
    }, [projects]);

    const addProject = async (projectData) => {
        const newProject = {
            id: projectData.id || `proj-${Date.now()}`,
            projectName: projectData.projectName || 'New Project',
            status: projectData.status || 'Active',
            leader: projectData.leader || '',
            client: projectData.client || '',
            employeeName: projectData.employeeName || '',
            projectEmailId: projectData.projectEmailId || `${(projectData.projectName || 'project').toLowerCase().replace(/\s+/g, '')}@yourcompanydomain.com`
        };

        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const token = localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (user?.id) headers['x-user-id'] = user.id;
            if (user?.org_id || user?.organization_id) headers['x-org-id'] = user.org_id || user.organization_id;

            const res = await fetch('/api/projects', {
                method: 'POST',
                headers,
                body: JSON.stringify(newProject)
            });
            if (res.ok) {
                const data = await res.json();
                if (data.project_id) newProject.id = data.project_id;
            } else {
                console.error('API create project failed, saving locally');
            }
        } catch (err) {
            console.error('API create project error:', err);
        }

        setProjects(prev => [newProject, ...prev]);
    };

    const updateProject = async (id, updatedFields) => {
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const token = localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (user?.id) headers['x-user-id'] = user.id;
            if (user?.org_id || user?.organization_id) headers['x-org-id'] = user.org_id || user.organization_id;

            const res = await fetch(`/api/projects/${id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(updatedFields)
            });
            if (!res.ok) {
                console.error('API update project failed, saving locally');
            }
        } catch (err) {
            console.error('API update project error:', err);
        }

        setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updatedFields } : p));
    };

    const deleteProject = (id) => {
        if (window.confirm('Are you sure you want to delete this project?')) {
            setProjects(prev => prev.filter(p => p.id !== id));
        }
    };

    const openAddModal = () => {
        setEditingProject(null);
        setIsAddModalOpen(true);
    };

    const openEditModal = (project) => {
        setEditingProject(project);
        setIsAddModalOpen(true);
    };

    const closeAddModal = () => {
        setIsAddModalOpen(false);
        setEditingProject(null);
    };

    const handleImportProjects = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const text = event.target.result;
                    if (file.name.endsWith('.json')) {
                        const imported = JSON.parse(text);
                        if (Array.isArray(imported)) {
                            setProjects(prev => [...imported, ...prev]);
                            alert(`Successfully imported ${imported.length} projects.`);
                        }
                    } else {
                        // Simple CSV parse
                        const lines = text.split('\n').filter(l => l.trim());
                        const imported = [];
                        for (let i = 1; i < lines.length; i++) {
                            const [projectName, leader, client, employeeName, projectEmailId, status] = lines[i].split(',').map(s => s.trim());
                            if (projectName) {
                                imported.push({
                                    id: `proj-${Date.now()}-${i}`,
                                    projectName,
                                    leader: leader || 'Yash',
                                    client: client || '',
                                    employeeName: employeeName || '',
                                    projectEmailId: projectEmailId || '',
                                    status: status || 'Active'
                                });
                            }
                        }
                        if (imported.length > 0) {
                            setProjects(prev => [...imported, ...prev]);
                            alert(`Successfully imported ${imported.length} projects.`);
                        }
                    }
                } catch (err) {
                    alert('Failed to parse import file: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const handleExportProjects = () => {
        const headers = ['Project Name', 'Project Leader', 'Client', 'Employee Name', 'Project Email ID', 'Status'];
        const rows = projects.map(p => [
            `"${(p.projectName || '').replace(/"/g, '""')}"`,
            `"${(p.leader || '').replace(/"/g, '""')}"`,
            `"${(p.client || '').replace(/"/g, '""')}"`,
            `"${(p.employeeName || '').replace(/"/g, '""')}"`,
            `"${(p.projectEmailId || '').replace(/"/g, '""')}"`,
            `"${(p.status || '').replace(/"/g, '""')}"`
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `safemailz_projects_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const value = {
        projects,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        isAddModalOpen,
        openAddModal,
        openEditModal,
        closeAddModal,
        editingProject,
        addProject,
        updateProject,
        deleteProject,
        handleImportProjects,
        handleExportProjects
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
}
