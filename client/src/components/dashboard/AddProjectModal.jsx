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

    // Common input style
    const inputStyle = {
        width: '100%',
        height: '40px',
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        background: '#fff',
        color: '#0F172A',
        fontSize: '0.875rem',
        padding: '0 0.85rem',
        fontFamily: "'Inter', sans-serif",
        boxSizing: 'border-box',
        outline: 'none'
    };

    const labelStyle = {
        color: '#111827',
        fontSize: '0.8rem',
        fontWeight: 600
    };

    return (
        <div
            className="modal-overlay"
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
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                opacity: 1,
                visibility: 'visible'
            }}
        >
            <div
                className="modal-card form-modal-content"
                style={{
                    maxWidth: '640px',
                    padding: '2rem 2.25rem',
                    borderRadius: '12px',
                    background: '#fff',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
                    border: '1px solid #E2E8F0',
                    textAlign: 'left',
                    width: '100%',
                    maxHeight: '92vh',
                    overflowY: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        <h2 id="addProjectTitle" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                            {editingProject ? 'Edit Project Details' : 'Project Details'}
                        </h2>
                        <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '0.35rem 0 0 0', fontFamily: "'Inter', sans-serif" }}>
                            please provide the necessary information related to your project
                        </p>
                    </div>
                    <button
                        onClick={closeAddModal}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '1.35rem',
                            cursor: 'pointer',
                            color: '#6B7280',
                            lineHeight: 1,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        aria-label="Close modal"
                    >
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSave}>
                    {/* Project Name */}
                    <div className="form-modal-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.15rem' }}>
                        <label htmlFor="addProjName" style={labelStyle}>
                            Project Name
                        </label>
                        <input
                            type="text"
                            id="addProjName"
                            className="form-input"
                            placeholder="Write project name"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            style={inputStyle}
                            required
                        />
                    </div>

                    {/* Select Client */}
                    <div className="form-modal-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.15rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label htmlFor="addProjClient" style={labelStyle}>
                                Select client
                            </label>
                            <a
                                href="#add-client"
                                onClick={(e) => { e.preventDefault(); openAddClientModal(); }}
                                style={{ color: '#2563EB', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            >
                                <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>+</span> Add Client
                            </a>
                        </div>
                        <select
                            id="addProjClient"
                            className="form-input"
                            value={client}
                            onChange={(e) => setClient(e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">Select client</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.email || c.name}>{c.name ? `${c.name} (${c.email || ''})` : c.email}</option>
                            ))}
                        </select>
                    </div>

                    {/* Project Leader */}
                    <div className="form-modal-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.15rem' }}>
                        <label htmlFor="addProjLeader" style={labelStyle}>
                            Project leader
                        </label>
                        <select
                            id="addProjLeader"
                            className="form-input"
                            value={leader}
                            onChange={(e) => setLeader(e.target.value)}
                            style={inputStyle}
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
                            <label htmlFor="addProjEmployee" style={labelStyle}>
                                Employee name
                            </label>
                            <a
                                href="#add-employee"
                                onClick={(e) => { e.preventDefault(); openAddEmployeeModal(); }}
                                style={{ color: '#2563EB', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            >
                                <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>+</span> Add Employ
                            </a>
                        </div>
                        <select
                            id="addProjEmployee"
                            className="form-input"
                            value={employeeName}
                            onChange={(e) => setEmployeeName(e.target.value)}
                            style={inputStyle}
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
                    <div className="form-modal-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.5rem' }}>
                        <label htmlFor="addProjEmailPrefix" style={labelStyle}>
                            Projects email ID
                        </label>
                        <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', width: '100%' }}>
                            <input
                                type="text"
                                id="addProjEmailPrefix"
                                className="form-input"
                                placeholder="Project email id"
                                value={emailPrefix}
                                onChange={(e) => setEmailPrefix(e.target.value)}
                                style={{ ...inputStyle, flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none' }}
                            />
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0 0.85rem',
                                    background: '#F9FAFB',
                                    border: '1px solid #D1D5DB',
                                    borderTopRightRadius: '8px',
                                    borderBottomRightRadius: '8px',
                                    color: '#6B7280',
                                    fontSize: '0.82rem',
                                    fontFamily: "'Inter', sans-serif",
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                @yourcompanydomain.com
                            </div>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <button
                            type="button"
                            onClick={handleGenerateEmail}
                            style={{
                                height: '32px',
                                padding: '0 1rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: "'Inter', sans-serif",
                                background: '#fff',
                                color: '#2563EB',
                                border: '1.5px solid #2563EB',
                                transition: 'background-color 0.15s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#EFF6FF'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                        >
                            Generate
                        </button>
                    </div>

                    {/* Modal Footer Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={closeAddModal}
                            style={{
                                height: '38px',
                                padding: '0 1.5rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: "'Inter', sans-serif",
                                background: '#fff',
                                color: '#2563EB',
                                border: '1.5px solid #2563EB',
                                transition: 'background-color 0.15s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#EFF6FF'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            id="btnSaveProject"
                            style={{
                                height: '38px',
                                padding: '0 1.75rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: "'Inter', sans-serif",
                                background: '#2563EB',
                                color: '#fff',
                                border: 'none',
                                transition: 'background-color 0.15s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
                        >
                            {editingProject ? 'Update' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
