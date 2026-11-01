import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { useClient } from '../../context/ClientContext';
import { useEmployee } from '../../context/EmployeeContext';

export default function AddProjectModal() {
    const { isAddModalOpen, closeAddModal, editingProject, addProject, updateProject } = useProject();
    const { clients, openAddModal: openAddClientModal } = useClient();
    const { employees, openAddModal: openAddEmployeeModal } = useEmployee();

    const [projectName, setProjectName] = useState('');
    const [client, setClient] = useState('');
    const [leader, setLeader] = useState('');
    const [employeeName, setEmployeeName] = useState('');
    const [emailPrefix, setEmailPrefix] = useState('');
    const [status, setStatus] = useState('Active');
    const [leaders, setLeaders] = useState([]);

    // Fetch project leaders from backend
    useEffect(() => {
        const fetchLeaders = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const token = localStorage.getItem('token');
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                if (user?.id) headers['x-user-id'] = user.id;
                if (user?.org_id || user?.organization_id) headers['x-org-id'] = user.org_id || user.organization_id;

                const res = await fetch('/api/projects/leaders', { headers });
                if (res.ok) {
                    const data = await res.json();
                    if (data.leaders && data.leaders.length > 0) {
                        setLeaders(data.leaders);
                    }
                }
            } catch (err) {
                // Silently fail, dropdown will be empty or use fallback
            }
        };
        if (isAddModalOpen) fetchLeaders();
    }, [isAddModalOpen]);

    // Close on Esc key
    useEffect(() => {
        if (!isAddModalOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') closeAddModal();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isAddModalOpen, closeAddModal]);

    useEffect(() => {
        if (editingProject) {
            setProjectName(editingProject.projectName || '');
            setClient(editingProject.client || '');
            setLeader(editingProject.leader || '');
            setEmployeeName(editingProject.employeeName || '');
            setStatus(editingProject.status || 'Active');

            if (editingProject.projectEmailId) {
                const parts = editingProject.projectEmailId.split('@');
                setEmailPrefix(parts[0] || '');
            } else {
                setEmailPrefix('');
            }
        } else {
            setProjectName('');
            setClient('');
            setLeader('');
            setEmployeeName('');
            setEmailPrefix('');
            setStatus('Active');
        }
    }, [editingProject, isAddModalOpen]);

    if (!isAddModalOpen) return null;

    const handleGenerateEmail = () => {
        if (projectName) {
            const clean = projectName.toLowerCase().replace(/[^a-z0-9]/g, '');
            setEmailPrefix(clean || 'project');
        } else {
            setEmailPrefix('project' + Math.floor(100 + Math.random() * 900));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!projectName.trim()) {
            alert('Please enter a project name');
            return;
        }

        const projectEmailId = emailPrefix.trim()
            ? `${emailPrefix.trim()}@yourcompanydomain.com`
            : `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '')}@yourcompanydomain.com`;

        const projectData = {
            projectName: projectName.trim(),
            client: client.trim(),
            leader,
            employeeName: employeeName.trim(),
            projectEmailId,
            status
        };

        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (user?.id) headers['x-user-id'] = user.id;
        if (user?.org_id || user?.organization_id) headers['x-org-id'] = user.org_id || user.organization_id;

        if (editingProject) {
            // Update existing project
            try {
                const res = await fetch(`/api/projects/${editingProject.id}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(projectData)
                });
                if (!res.ok) {
                    console.error('API update project failed, saving locally');
                }
            } catch (err) {
                console.error('API update project error:', err);
            }
            updateProject(editingProject.id, projectData);
        } else {
            // Create new project
            const newId = `proj-${Date.now()}`;
            try {
                const res = await fetch('/api/projects', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ id: newId, ...projectData })
                });
                if (!res.ok) {
                    console.error('API create project failed, saving locally');
                }
            } catch (err) {
                console.error('API create project error:', err);
            }
            addProject({ id: newId, ...projectData });
        }

        closeAddModal();
    };

    return (
        <div
            className="modal-overlay project-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="addProjectTitle"
            onClick={(e) => { if (e.target === e.currentTarget) closeAddModal(); }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.55)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                opacity: 1,
                visibility: 'visible'
            }}
        >
            <div
                className="modal-card form-modal-content project-modal-card"
                style={{
                    maxWidth: '640px',
                    padding: '2rem 2.25rem',
                    borderRadius: '16px',
                    textAlign: 'left',
                    width: '100%',
                    maxHeight: '92vh',
                    overflowY: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                        <h2 id="addProjectTitle" className="project-modal-title" style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, fontFamily: "'Inter', sans-serif" }}>
                            {editingProject ? 'Edit Project Details' : 'Project Details'}
                        </h2>
                        <p className="project-modal-subtitle" style={{ fontSize: '0.8rem', margin: '0.35rem 0 0 0', fontFamily: "'Inter', sans-serif" }}>
                            Please provide the necessary information related to your project
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={closeAddModal}
                        className="project-modal-close-btn"
                        aria-label="Close modal"
                    >
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSave}>
                    {/* Project Name & Status Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5" style={{ marginBottom: '1.15rem' }}>
                        <div className="form-modal-row sm:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: 0 }}>
                            <label htmlFor="addProjName" className="project-modal-label">
                                Project Name
                            </label>
                            <input
                                type="text"
                                id="addProjName"
                                className="form-input project-modal-input"
                                placeholder="Write project name"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-modal-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: 0 }}>
                            <label htmlFor="addProjStatus" className="project-modal-label">
                                Status
                            </label>
                            <select
                                id="addProjStatus"
                                className="form-input project-modal-input"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="Active">Active</option>
                                <option value="Completed">Completed</option>
                                <option value="On Hold">On Hold</option>
                                <option value="Closed">Closed</option>
                            </select>
                        </div>
                    </div>

                    {/* Select Client */}
                    <div className="form-modal-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.15rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label htmlFor="addProjClient" className="project-modal-label">
                                Select client
                            </label>
                            <a
                                href="#add-client"
                                className="project-modal-link"
                                onClick={(e) => { e.preventDefault(); openAddClientModal(); }}
                            >
                                <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>+</span> Add Client
                            </a>
                        </div>
                        <select
                            id="addProjClient"
                            className="form-input project-modal-input"
                            value={client}
                            onChange={(e) => setClient(e.target.value)}
                        >
                            <option value="">Select client</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.email || c.name}>{c.name ? `${c.name} (${c.email || ''})` : c.email}</option>
                            ))}
                        </select>
                    </div>

                    {/* Project Leader */}
                    <div className="form-modal-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.15rem' }}>
                        <label htmlFor="addProjLeader" className="project-modal-label">
                            Project leader
                        </label>
                        <select
                            id="addProjLeader"
                            className="form-input project-modal-input"
                            value={leader}
                            onChange={(e) => setLeader(e.target.value)}
                        >
                            <option value="">Select project leader</option>
                            {leaders.length > 0 ? (
                                leaders.map(l => (
                                    <option key={l.id} value={`${l.name} (${l.email})`}>{l.name} ({l.email})</option>
                                ))
                            ) : (
                                <>
                                    <option value="Yash">Yash</option>
                                    <option value="Rahul Singh">Rahul Singh</option>
                                    <option value="Nouman Azam">Nouman Azam</option>
                                    <option value="Sayem uddin">Sayem uddin</option>
                                </>
                            )}
                        </select>
                    </div>

                    {/* Employee Name */}
                    <div className="form-modal-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.15rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label htmlFor="addProjEmployee" className="project-modal-label">
                                Employee name
                            </label>
                            <a
                                href="#add-employee"
                                className="project-modal-link"
                                onClick={(e) => { e.preventDefault(); openAddEmployeeModal(); }}
                            >
                                <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>+</span> Add Employee
                            </a>
                        </div>
                        <select
                            id="addProjEmployee"
                            className="form-input project-modal-input"
                            value={employeeName}
                            onChange={(e) => setEmployeeName(e.target.value)}
                        >
                            <option value="">Select employee</option>
                            {employees.filter(e => e && e.status === 'filled').map(emp => {
                                const val = `${emp.firstName || ''} ${emp.lastName || ''} (${emp.email || ''})`.trim();
                                return (
                                    <option key={emp.id} value={val}>{val}</option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Projects Email ID */}
                    <div className="form-modal-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.6rem' }}>
                        <label htmlFor="addProjEmailPrefix" className="project-modal-label">
                            Projects email ID
                        </label>
                        <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', width: '100%' }}>
                            <input
                                type="text"
                                id="addProjEmailPrefix"
                                className="form-input project-modal-input project-modal-input-prefix"
                                placeholder="Project email id"
                                value={emailPrefix}
                                onChange={(e) => setEmailPrefix(e.target.value)}
                                style={{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none' }}
                            />
                            <div className="project-modal-suffix">
                                @yourcompanydomain.com
                            </div>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <button
                            type="button"
                            onClick={handleGenerateEmail}
                            className="project-modal-btn-outline project-modal-btn-sm"
                        >
                            Generate
                        </button>
                    </div>

                    {/* Modal Footer Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={closeAddModal}
                            className="project-modal-btn-outline"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            id="btnSaveProject"
                            className="project-modal-btn-primary"
                        >
                            {editingProject ? 'Update' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
