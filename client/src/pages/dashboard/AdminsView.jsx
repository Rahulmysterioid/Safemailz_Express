import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';

export default function AdminsView() {
    const { 
        admins, 
        selectedAdmin, 
        updateAdminField, 
        updateAdminPermission 
    } = useAdmin();

    const [isSavedToast, setIsSavedToast] = useState(false);

    if (!selectedAdmin || admins.length === 0) {
        return (
            <div className="content-area" id="adminsView" style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, minHeight: 0, overflowY: 'auto', boxSizing: 'border-box' }}>
                <div id="adminDetailsEmptyState" className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', textAlign: 'center', minHeight: '350px', position: 'relative' }}>
                    <img src="/images/empty_state.png" alt="No admin selected" className="empty-state-illustration" style={{ maxWidth: '380px', marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 500, color: '#333', margin: 0 }}>Select an admin</h2>
                    <p style={{ fontSize: '0.95rem', color: '#64748B', marginTop: '8px' }}>
                        Select an admin from the list to view and manage their permissions.
                    </p>
                </div>
            </div>
        );
    }

    const perms = selectedAdmin.permissions || {
        addEmployees: true,
        createProjects: true,
        manageProjects: true,
        makeAdmin: false,
        deleteProject: false
    };

    const handleSave = () => {
        setIsSavedToast(true);
        setTimeout(() => setIsSavedToast(false), 2500);
    };

    return (
        <div 
            className="content-area" 
            id="adminsView" 
            style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                width: '100%', 
                flex: 1, 
                minHeight: 0, 
                backgroundColor: '#fff', 
                overflowY: 'auto', 
                boxSizing: 'border-box',
                padding: '2rem 2.5rem 3rem'
            }}
        >
            <div 
                id="adminDetailsContent" 
                style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    width: '100%', 
                    maxWidth: '920px', 
                    boxSizing: 'border-box',
                    margin: '0 auto 0 0'
                }}
            >
                {/* Toast message if saved */}
                {isSavedToast && (
                    <div style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        ✅ Admin details and permissions saved successfully!
                    </div>
                )}

                {/* Top Fields: Admin name & Admin Email ID */}
                <div className="admin-top-fields" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '1.5rem', 
                    width: '100%', 
                    marginBottom: '1.5rem', 
                    textAlign: 'left'
                }}>
                    <div className="admin-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <label htmlFor="adminNameInput" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111' }}>Admin name</label>
                        <input 
                            type="text" 
                            id="adminNameInput" 
                            placeholder="Admin name"
                            value={selectedAdmin.name || ''}
                            onChange={(e) => updateAdminField('name', e.target.value)}
                            style={{ width: '100%', height: '40px', border: '1px solid #DADDE2', borderRadius: '6px', padding: '0 0.85rem', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', color: '#333', background: '#FAFAFA', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div className="admin-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <label htmlFor="adminEmailInput" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111' }}>Admin Email ID</label>
                        <input 
                            type="email" 
                            id="adminEmailInput" 
                            placeholder="Admin Email ID"
                            value={selectedAdmin.email || ''}
                            onChange={(e) => updateAdminField('email', e.target.value)}
                            style={{ width: '100%', height: '40px', border: '1px solid #DADDE2', borderRadius: '6px', padding: '0 0.85rem', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', color: '#333', background: '#fff', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>

                {/* 5 Permission Cards */}
                <div className="permission-list" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {/* Permission Card 1: Add employees */}
                    <div className={`permission-card ${perms.addEmployees ? 'is-enabled' : ''}`} id="adminCardAddEmployees">
                        <span className="permission-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <polyline points="17 8 22 12 17 16"></polyline>
                                <line x1="22" y1="12" x2="13" y2="12"></line>
                            </svg>
                        </span>
                        <span className="permission-copy">
                            <strong>Add employees</strong>
                            <span>Allow to add employess</span>
                        </span>
                        <button 
                            className={`toggle-switch ${perms.addEmployees ? 'is-on active' : ''}`} 
                            type="button" 
                            role="switch" 
                            aria-checked={perms.addEmployees}
                            id="switchAddEmployees"
                            onClick={() => updateAdminPermission('addEmployees', !perms.addEmployees)}
                        ></button>
                    </div>

                    {/* Permission Card 2: Create projects */}
                    <div className={`permission-card ${perms.createProjects ? 'is-enabled' : ''}`} id="adminCardCreateProjects">
                        <span className="permission-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 14 4 9 9 4"></polyline>
                                <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                            </svg>
                        </span>
                        <span className="permission-copy">
                            <strong>Create projects</strong>
                            <span>Allow to create projects</span>
                        </span>
                        <button 
                            className={`toggle-switch ${perms.createProjects ? 'is-on active' : ''}`} 
                            type="button" 
                            role="switch" 
                            aria-checked={perms.createProjects}
                            id="switchCreateProjects"
                            onClick={() => updateAdminPermission('createProjects', !perms.createProjects)}
                        ></button>
                    </div>

                    {/* Permission Card 3: Manage projects */}
                    <div className={`permission-card ${perms.manageProjects ? 'is-enabled' : ''}`} id="adminCardManageProjects">
                        <span className="permission-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 14 4 9 9 4"></polyline>
                                <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                            </svg>
                        </span>
                        <span className="permission-copy">
                            <strong>Manage projects</strong>
                            <span>Allow to manage the projects</span>
                        </span>
                        <button 
                            className={`toggle-switch ${perms.manageProjects ? 'is-on active' : ''}`} 
                            type="button" 
                            role="switch" 
                            aria-checked={perms.manageProjects}
                            id="switchManageProjects"
                            onClick={() => updateAdminPermission('manageProjects', !perms.manageProjects)}
                        ></button>
                    </div>

                    {/* Permission Card 4: make an admin */}
                    <div className={`permission-card ${perms.makeAdmin ? 'is-enabled' : ''}`} id="adminCardMakeAdmin">
                        <span className="permission-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 14 4 9 9 4"></polyline>
                                <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                            </svg>
                        </span>
                        <span className="permission-copy">
                            <strong>make an admin</strong>
                            <span>Allow an admin to Manage the employees</span>
                        </span>
                        <button 
                            className={`toggle-switch ${perms.makeAdmin ? 'is-on active' : ''}`} 
                            type="button" 
                            role="switch" 
                            aria-checked={perms.makeAdmin}
                            id="switchMakeAdmin"
                            onClick={() => updateAdminPermission('makeAdmin', !perms.makeAdmin)}
                        ></button>
                    </div>

                    {/* Permission Card 5: Delete project */}
                    <div className={`permission-card ${perms.deleteProject ? 'is-enabled' : ''}`} id="adminCardDeleteProject">
                        <span className="permission-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 14 4 9 9 4"></polyline>
                                <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                            </svg>
                        </span>
                        <span className="permission-copy">
                            <strong>Delete project</strong>
                            <span>Allow to delete the projects</span>
                        </span>
                        <button 
                            className={`toggle-switch ${perms.deleteProject ? 'is-on active' : ''}`} 
                            type="button" 
                            role="switch" 
                            aria-checked={perms.deleteProject}
                            id="switchDeleteProject"
                            onClick={() => updateAdminPermission('deleteProject', !perms.deleteProject)}
                        ></button>
                    </div>
                    </div>

                {/* Note Box */}
                <div className="admin-note-box" style={{ backgroundColor: '#EDF3F8', borderRadius: '6px', padding: '1.15rem 1.5rem', fontSize: '0.82rem', color: '#555', textAlign: 'center', lineHeight: 1.6, marginBottom: '1.75rem', fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box' }}>
                    <strong style={{ color: '#333', fontWeight: 700 }}>Note:</strong> If the user first purchases an employee account and then adds an account in the admin panel, the billing should not be charged starting from the next month.
                </div>

                {/* Action Buttons */}
                <div className="admin-actions-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', width: '100%' }}>
                    <button className="btn-admin-cancel" id="btnAdminCancel" type="button" onClick={() => alert('Changes discarded.')}>
                        cancle
                    </button>
                    <button className="btn-admin-save" id="btnAdminSave" type="button" onClick={handleSave}>
                        Save
                    </button>
                </div>

            </div>
        </div>
    );
}