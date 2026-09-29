import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployee } from '../../context/EmployeeContext';
import { mockEmails } from '../../data/mockEmails';
import { formatMailPreviewDate } from '../../utils/dateUtils';

export default function EmployeesView() {
    const navigate = useNavigate();
    const {
        employees,
        filledEmployees,
        selectedEmployeeIndex,
        selectedEmployee,
        isAddModalOpen,
        openAddModal,
        closeAddModal,
        isQuantityModalOpen,
        openQuantityModal,
        closeQuantityModal,
        employeeQuantity,
        updateQuantity,
        proceedToPlan,
        isPlanModalOpen,
        closePlanModal,
        billingCycle,
        setBillingCycle,
        handleProceedPayment,
        addEmployee,
        updatePermissions,
        updateProfile,
        resendInvite
    } = useEmployee();

    const [activeSubtab, setActiveSubtab] = useState('profile');
    const [emailSearchQuery, setEmailSearchQuery] = useState('');
    const [dashboardCardFilter, setDashboardCardFilter] = useState('all');
    const [dashboardPreviewSearch, setDashboardPreviewSearch] = useState('');
    const [isCardsCollapsed, setIsCardsCollapsed] = useState(false);
    const [emailIdsSearchQuery, setEmailIdsSearchQuery] = useState('');

    // Email Management / Manage tab states
    const [specificEmailInputValue, setSpecificEmailInputValue] = useState('');
    const [allowedEmailInputValue, setAllowedEmailInputValue] = useState('');
    const [editingAllowedEmailIdx, setEditingAllowedEmailIdx] = useState(null);

    // Projects subtab state
    const [projectSearchQuery, setProjectSearchQuery] = useState('');

    // Backup & Restore subtab state
    const [isStorageAccordionOpen, setIsStorageAccordionOpen] = useState(false);

    const handleMailPreviewScroll = (e) => {
        const scrollTop = e.currentTarget.scrollTop;
        if (scrollTop > 30) {
            setIsCardsCollapsed(true);
        } else {
            setIsCardsCollapsed(false);
        }
    };

    // Dynamic Employee Dashboard Emails & Stats
    const allDashboardEmails = useMemo(() => {
        const stored = localStorage.getItem('safemailzEmails');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (e) {}
        }
        return mockEmails;
    }, []);

    const totalCount = allDashboardEmails.length;
    const readCount = allDashboardEmails.filter(m => m.read).length;
    const unreadCount = allDashboardEmails.filter(m => !m.read).length;
    const draftCount = allDashboardEmails.filter(m => m.folder === 'drafts').length;
    const actionCount = allDashboardEmails.filter(m => m.action).length;
    const replyCount = allDashboardEmails.filter(m => m.replied).length;

    const readPercent = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;
    const unreadPercent = totalCount > 0 ? Math.round((unreadCount / totalCount) * 100) : 0;
    const draftPercent = totalCount > 0 ? Math.round((draftCount / totalCount) * 100) : 0;
    const actionPercent = totalCount > 0 ? Math.round((actionCount / totalCount) * 100) : 0;
    const replyPercent = totalCount > 0 ? Math.round((replyCount / totalCount) * 100) : 0;

    const dashboardFilteredEmails = allDashboardEmails.filter(m => {
        if (dashboardCardFilter === 'read' && !m.read) return false;
        if (dashboardCardFilter === 'unread' && m.read) return false;
        if (dashboardCardFilter === 'draft' && m.folder !== 'drafts') return false;
        if (dashboardCardFilter === 'action' && !m.action) return false;
        if (dashboardCardFilter === 'reply' && !m.replied) return false;

        if (dashboardPreviewSearch) {
            const q = dashboardPreviewSearch.toLowerCase();
            const haystack = `${m.sender || ''} ${m.subject || ''} ${m.preview || ''} ${m.emailNo || ''}`.toLowerCase();
            if (!haystack.includes(q)) return false;
        }
        return true;
    });

    const getAvatarStyle = (name) => {
        let hash = 0;
        for (let i = 0; i < (name || '').length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash) % 360;
        return {
            backgroundColor: `hsl(${h}, 70%, 90%)`,
            color: `hsl(${h}, 80%, 30%)`
        };
    };

    // Modal Form State
    const [newFirstName, setNewFirstName] = useState('');
    const [newLastName, setNewLastName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [sendInviteEmail, setSendInviteEmail] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedInviteUrl, setGeneratedInviteUrl] = useState('');

    const handleSaveNewEmployee = async () => {
        if (!newFirstName.trim() || !newEmail.trim()) {
            alert('First Name and Email are required.');
            return;
        }
        setIsSubmitting(true);
        const res = await addEmployee(newFirstName.trim(), newLastName.trim(), newEmail.trim(), sendInviteEmail);
        setIsSubmitting(false);
        if (sendInviteEmail) {
            if (res?.inviteUrl) {
                setGeneratedInviteUrl(res.inviteUrl);
                alert(`Employee added and invited successfully!\nInvite link: ${res.inviteUrl}`);
            } else {
                alert('Employee added and invite sent successfully!');
            }
        } else {
            if (res?.inviteUrl) {
                setGeneratedInviteUrl(res.inviteUrl);
            }
            alert('Employee added silently.');
        }
        setNewFirstName('');
        setNewLastName('');
        setNewEmail('');
        setSendInviteEmail(true);
    };

    const handleCopyInviteLink = async () => {
        const link = generatedInviteUrl || `http://${window.location.host}/signup-invite.html?invite=${encodeURIComponent(newEmail || 'employee')}`;
        try {
            await navigator.clipboard.writeText(link);
            alert('✅ Invite link copied to clipboard:\n' + link);
        } catch (e) {
            prompt('Copy invite link:', link);
        }
    };

    // Current employee data
    const emp = selectedEmployee && selectedEmployee.status === 'filled' ? selectedEmployee : null;
    const initial = emp ? (emp.firstName ? emp.firstName.charAt(0).toUpperCase() : 'E') : 'E';
    const fullName = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : '';

    const permissions = emp?.permissions || {
        sendEmails: true,
        replyEmails: true,
        viewRealEmailIds: true,
        sendSpecificEmails: true,
        projectBasedEmails: false,
        blocked: false,
        allowedEmails: [
            'David Lee@gmail.com',
            'Davin company@gmail.com',
            'join hulk@gmail.com'
        ]
    };

    const handleAddSpecificEmail = () => {
        const val = specificEmailInputValue.trim();
        if (!val) return;
        const currentAllowed = [...(permissions.allowedEmails || [])];
        if (!currentAllowed.some(e => e.toLowerCase() === val.toLowerCase())) {
            currentAllowed.push(val);
        }
        updatePermissions(selectedEmployeeIndex, 'allowedEmails', currentAllowed);
        updatePermissions(selectedEmployeeIndex, 'sendSpecificEmails', true);
        setSpecificEmailInputValue('');
    };

    const handleAddAllowedEmail = () => {
        const val = allowedEmailInputValue.trim();
        if (!val) return;
        const currentAllowed = [...(permissions.allowedEmails || [])];
        if (editingAllowedEmailIdx !== null) {
            currentAllowed[editingAllowedEmailIdx] = val;
            setEditingAllowedEmailIdx(null);
        } else if (!currentAllowed.some(e => e.toLowerCase() === val.toLowerCase())) {
            currentAllowed.push(val);
        }
        updatePermissions(selectedEmployeeIndex, 'allowedEmails', currentAllowed);
        setAllowedEmailInputValue('');
    };

    const handleEditAllowedEmail = (idx) => {
        const currentAllowed = permissions.allowedEmails || [];
        if (currentAllowed[idx]) {
            setEditingAllowedEmailIdx(idx);
            setAllowedEmailInputValue(currentAllowed[idx]);
        }
    };

    const handleDeleteAllowedEmail = (idx) => {
        const currentAllowed = (permissions.allowedEmails || []).filter((_, i) => i !== idx);
        updatePermissions(selectedEmployeeIndex, 'allowedEmails', currentAllowed);
    };

    // Projects for Employee (Matching Screenshot)
    const [employeeProjects, setEmployeeProjects] = useState(() => {
        const stored = localStorage.getItem('safemailzEmployeeProjects');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (e) {}
        }
        return [
            {
                id: 'proj-1',
                projectName: 'Test Project',
                employeeName: 'Rahul Singh (rahul.indianshelf99@gmail.com)',
                client: 'rahul.awhognoida@gmail.com',
                projectEmailId: 'testproject@yourcompanydomain.com',
                leader: 'Yash'
            }
        ];
    });

    const handleRemoveEmployeeFromProject = (projectId) => {
        if (window.confirm('Are you sure you want to remove this employee from the project?')) {
            const next = employeeProjects.filter(p => p.id !== projectId);
            setEmployeeProjects(next);
            localStorage.setItem('safemailzEmployeeProjects', JSON.stringify(next));
        }
    };

    const handleUpdateProjectField = (projectId, field, value) => {
        const next = employeeProjects.map(p => p.id === projectId ? { ...p, [field]: value } : p);
        setEmployeeProjects(next);
        localStorage.setItem('safemailzEmployeeProjects', JSON.stringify(next));
    };

    const filteredEmployeeProjects = employeeProjects.filter(project => {
        if (!projectSearchQuery.trim()) return true;
        const query = projectSearchQuery.trim().toLowerCase();
        return `${project.projectName || ''} ${project.client || ''} ${project.leader || ''} ${project.employeeName || ''} ${project.projectEmailId || ''}`.toLowerCase().includes(query);
    });

    // Mock Email accounts for Employee
    const employeeEmailIds = [
        { id: 'eid-1', email: `${emp?.firstName?.toLowerCase() || 'emp'}@safemailz.com`, type: 'Primary SMTP', status: 'Active' },
        { id: 'eid-2', email: 'support@safemailz.com', type: 'Shared Alias', status: 'Active' }
    ];

    // Email IDs Management Records (Matching Screenshot & vanilla dashboard)
    const emailIdRecords = useMemo(() => [
        {
            id: 'eid-rec-1',
            realEmail: emp?.email || 'singhrahuldrill1@outlook.com',
            cloneEmail: emp?.firstName?.toLowerCase() || 'test1',
            leader: 'Yash',
            projectName: 'Serpix lab LLC',
            emailNo: '17620',
            signature: 'Best regards, ' + (emp?.firstName || 'Rahul'),
            status: 'Active'
        },
        {
            id: 'eid-rec-2',
            realEmail: 'jessica@serpix.com',
            cloneEmail: 'serpix-c102',
            leader: 'Yash',
            projectName: 'Serpix lab LLC',
            emailNo: '88412',
            signature: 'Best regards, Jessica',
            status: 'Active'
        },
        {
            id: 'eid-rec-3',
            realEmail: 'david@ravyrv.com',
            cloneEmail: 'ravyrv-c205',
            leader: 'Rahul Singh',
            projectName: 'Ravyrv Lab LLC',
            emailNo: '56234',
            signature: 'Best regards, David',
            status: 'Active'
        },
        {
            id: 'eid-rec-4',
            realEmail: 'jonas@vsalon.org',
            cloneEmail: 'vsalon-c301',
            leader: 'Rahul Singh',
            projectName: 'Vsalon Cloud',
            emailNo: '63445',
            signature: 'Best regards, Jonas',
            status: 'Pending'
        },
        {
            id: 'eid-rec-5',
            realEmail: 'thomas@compliance.io',
            cloneEmail: 'comp-c408',
            leader: 'Yash',
            projectName: 'Compliance Tech',
            emailNo: '64376',
            signature: 'Best regards, Thomas',
            status: 'Active'
        }
    ], [emp]);

    const filteredEmailIdRecords = emailIdRecords.filter(r => {
        if (!emailIdsSearchQuery) return true;
        const q = emailIdsSearchQuery.toLowerCase();
        return `${r.realEmail} ${r.cloneEmail} ${r.leader} ${r.projectName} ${r.emailNo} ${r.signature} ${r.status}`.toLowerCase().includes(q);
    });

    // Mock Emails for Employee
    const mockEmpEmails = [
        { id: 'm1', sender: 'Jessica Williams', senderEmail: 'jessica@serpix.com', subject: 'Updated Requirements Document', preview: 'Please find attached the latest project specification updates...', emailNo: '88412', date: '10:45 AM' },
        { id: 'm2', sender: 'David Lee', senderEmail: 'david@ravyrv.com', subject: 'Security Policy Clarification', preview: 'We reviewed the GDPR and NDA clauses, looks good to proceed.', emailNo: '88411', date: 'Yesterday' },
        { id: 'm3', sender: 'System Notification', senderEmail: 'noreply@safemailz.com', subject: 'Weekly Safety Scan Complete', preview: 'Zero sensitive data leaks detected in your outbound communication.', emailNo: '88410', date: '24 Aug' }
    ];

    const filteredEmpEmails = mockEmpEmails.filter(m => {
        if (!emailSearchQuery) return true;
        const q = emailSearchQuery.toLowerCase();
        return m.subject.toLowerCase().includes(q) || m.sender.toLowerCase().includes(q) || m.preview.toLowerCase().includes(q);
    });

    return (
        <div className="content-area has-table" id="employeesView" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflowY: 'auto' }}>
            
            {/* If no filled employees exist */}
            {!emp && (
                <div className="empty-state" id="employeesEmptyState" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', minHeight: '440px', padding: '3rem 1.5rem', textAlign: 'center' }}>
                    <img src="/images/empty_state.png" alt="No employees illustration" className="empty-state-illustration" style={{ maxWidth: '340px', height: 'auto', marginBottom: '1.5rem', opacity: 0.95 }} onError={(e) => { e.target.style.display = 'none'; }} />
                    <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 700, margin: '0 0 0.5rem 0' }}>No Employee added yet</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', maxWidth: '420px', margin: '0 0 1.75rem 0', lineHeight: 1.5 }}>Add employees to grant access, configure permissions, and manage client confidentiality.</p>
                    <button className="btn btn-primary" onClick={() => openQuantityModal()} style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add Employee
                    </button>
                </div>
            )}

            {/* Profile View Container */}
            {emp && (
                <div className="profile-view-container" id="profileViewContainer" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    
                    {/* Sub Navigation Bar */}
                    <div className="profile-subnav">
                        <button className="profile-hamburger" type="button" aria-label="Menu">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        </button>

                        <button 
                            className={`profile-tab ${activeSubtab === 'profile' ? 'active' : ''}`} 
                            type="button" 
                            onClick={() => setActiveSubtab('profile')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            Profile
                        </button>

                        <button 
                            className={`profile-tab ${activeSubtab === 'dashboard' ? 'active' : ''}`} 
                            type="button" 
                            onClick={() => setActiveSubtab('dashboard')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7"></rect>
                                <rect x="14" y="3" width="7" height="7"></rect>
                                <rect x="14" y="14" width="7" height="7"></rect>
                                <rect x="3" y="14" width="7" height="7"></rect>
                            </svg>
                            Dashboard
                        </button>

                        <button 
                            className={`profile-tab ${activeSubtab === 'emails' ? 'active' : ''}`} 
                            type="button" 
                            onClick={() => setActiveSubtab('emails')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                            Emails
                        </button>

                        <button 
                            className={`profile-tab ${activeSubtab === 'manage' ? 'active' : ''}`} 
                            type="button" 
                            onClick={() => setActiveSubtab('manage')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                            Manage
                        </button>

                        <button 
                            className={`profile-tab ${activeSubtab === 'projects' ? 'active' : ''}`} 
                            type="button" 
                            onClick={() => setActiveSubtab('projects')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                            </svg>
                            Projects
                        </button>

                        <button 
                            className={`profile-tab ${activeSubtab === 'emailIds' ? 'active' : ''}`} 
                            type="button" 
                            onClick={() => setActiveSubtab('emailIds')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect>
                                <line x1="7" y1="15" x2="11" y2="15"></line>
                                <circle cx="9" cy="9" r="2"></circle>
                                <line x1="15" y1="9" x2="17" y2="9"></line>
                                <line x1="15" y1="13" x2="17" y2="13"></line>
                            </svg>
                            Email IDs
                        </button>

                        <button 
                            className={`profile-tab ${activeSubtab === 'backup' ? 'active' : ''}`} 
                            type="button" 
                            onClick={() => setActiveSubtab('backup')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
                                <path d="M12 12v9"></path>
                                <path d="M8 17l4-4 4 4"></path>
                            </svg>
                            Backup and Restore
                        </button>
                    </div>

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* SUBTAB 1: PROFILE INFORMATION */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {activeSubtab === 'profile' && (
                        <div>
                            {/* Profile Cover Banner */}
                            <div className="profile-cover">
                                <button className="btn-edit-cover" type="button" onClick={() => alert('Edit cover image feature')}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 20h9"></path>
                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                    </svg> 
                                    Edit cover
                                </button>
                                <div className="profile-avatar-large">
                                    <span id="profileAvatarInitial">{initial}</span>
                                </div>
                            </div>

                            <div className="profile-details-section">
                                <h3>Profile Information</h3>
                                <p className="profile-subtitle">Changes are saved automatically</p>

                                <div className="profile-form">
                                    <div className="form-row">
                                        <label>First Name</label>
                                        <div className="input-with-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="12" cy="7" r="4"></circle>
                                            </svg>
                                            <input 
                                                type="text" 
                                                id="profFirstName" 
                                                value={fullName}
                                                onChange={(e) => updateProfile(selectedEmployeeIndex, 'firstName', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <label>Email Address</label>
                                        <div className="input-with-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                                <polyline points="22,6 12,13 2,6"></polyline>
                                            </svg>
                                            <input 
                                                type="text" 
                                                id="profEmail" 
                                                value={emp.email || ''} 
                                                readOnly 
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <label>Joined on</label>
                                        <div className="input-with-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                                <line x1="3" y1="10" x2="21" y2="10"></line>
                                            </svg>
                                            <input 
                                                type="text" 
                                                id="profJoined" 
                                                value={emp.joined_date ? new Date(emp.joined_date).toLocaleDateString('en-GB').replace(/\//g, ' - ') : (emp.isPending ? 'Pending Signup' : '')} 
                                                readOnly 
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <label>Date of birth</label>
                                        <div style={{ display: 'flex', gap: '10px', flex: 1, alignItems: 'center' }}>
                                            <div className="input-with-icon" style={{ flex: 1 }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                                </svg>
                                                <input 
                                                    type="text" 
                                                    id="profDob" 
                                                    value={emp.dob && emp.dob !== 'Pending Signup' ? new Date(emp.dob).toLocaleDateString('en-GB').replace(/\//g, ' - ') : (emp.isPending ? 'Pending Signup' : '')} 
                                                    readOnly 
                                                />
                                            </div>
                                            {emp.isPending && (
                                                <button 
                                                    onClick={() => resendInvite(selectedEmployeeIndex)}
                                                    className="btn-send-invite"
                                                    style={{
                                                        padding: '0 16px',
                                                        height: '42px',
                                                        backgroundColor: 'var(--primary, #1A6BA8)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        whiteSpace: 'nowrap',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                                        <polyline points="22,6 12,13 2,6"></polyline>
                                                    </svg>
                                                    Send Invite Email
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <label>Work Days</label>
                                        <div className="work-days">
                                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className={`work-day ${idx < 6 ? 'active' : ''}`}
                                                >
                                                    {day}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <label>Work Mode</label>
                                        <div className="input-with-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="12" cy="7" r="4"></circle>
                                            </svg>
                                            <input type="text" defaultValue={emp.workMode || 'Remote'} readOnly />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <label>Work Location</label>
                                        <div className="input-with-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="12" cy="7" r="4"></circle>
                                            </svg>
                                            <input type="text" defaultValue={emp.workLocation || 'Gilgit Baltistan, Pakistan'} readOnly />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <label>Short bio</label>
                                        <textarea 
                                            className="bio-textarea" 
                                            defaultValue={emp.bio || 'Untoward person'} 
                                            onChange={(e) => updateProfile(selectedEmployeeIndex, 'bio', e.target.value)}
                                        />
                                        <div className="char-count">0 / 280 characters</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* SUBTAB 2: DASHBOARD */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {activeSubtab === 'dashboard' && (
                        <div className="mail-dashboard-panel" id="mailDashboardPanel" style={{ display: 'block', padding: '1.25rem 1.75rem' }}>
                            {/* 6 Circular Progress Summary Cards (Auto-collapse on scroll) */}
                            <div className={`mail-summary-grid ${isCardsCollapsed ? 'cards-collapsed' : ''}`} id="mailSummaryCards" style={{ overflow: 'hidden', transition: 'max-height 0.3s ease, opacity 0.25s ease, transform 0.25s ease, margin 0.25s ease' }}>
                                <button
                                    className={`mail-summary-card ${dashboardCardFilter === 'all' ? 'active' : ''}`}
                                    type="button"
                                    onClick={() => setDashboardCardFilter('all')}
                                >
                                    <span className="mail-progress" style={{ '--percent': 100 }} data-percent="100">
                                        <span>100%</span>
                                    </span>
                                    <span className="mail-card-text">
                                        <strong>Total Mails</strong>
                                        <span id="mailCountAll">{totalCount}</span>
                                    </span>
                                </button>
                                <button
                                    className={`mail-summary-card ${dashboardCardFilter === 'read' ? 'active' : ''}`}
                                    type="button"
                                    onClick={() => setDashboardCardFilter('read')}
                                >
                                    <span className="mail-progress" style={{ '--percent': readPercent }} data-percent={readPercent}>
                                        <span>{readPercent}%</span>
                                    </span>
                                    <span className="mail-card-text">
                                        <strong>Read</strong>
                                        <span id="mailCountRead">{readCount}</span>
                                    </span>
                                </button>
                                <button
                                    className={`mail-summary-card ${dashboardCardFilter === 'unread' ? 'active' : ''}`}
                                    type="button"
                                    onClick={() => setDashboardCardFilter('unread')}
                                >
                                    <span className="mail-progress" style={{ '--percent': unreadPercent }} data-percent={unreadPercent}>
                                        <span>{unreadPercent}%</span>
                                    </span>
                                    <span className="mail-card-text">
                                        <strong>Unread</strong>
                                        <span id="mailCountUnread">{unreadCount}</span>
                                    </span>
                                </button>
                                <button
                                    className={`mail-summary-card ${dashboardCardFilter === 'draft' ? 'active' : ''}`}
                                    type="button"
                                    onClick={() => setDashboardCardFilter('draft')}
                                >
                                    <span className="mail-progress" style={{ '--percent': draftPercent }} data-percent={draftPercent}>
                                        <span>{draftPercent}%</span>
                                    </span>
                                    <span className="mail-card-text">
                                        <strong>Draft</strong>
                                        <span id="mailCountDraft">{draftCount}</span>
                                    </span>
                                </button>
                                <button
                                    className={`mail-summary-card ${dashboardCardFilter === 'action' ? 'active' : ''}`}
                                    type="button"
                                    onClick={() => setDashboardCardFilter('action')}
                                >
                                    <span className="mail-progress" style={{ '--percent': actionPercent }} data-percent={actionPercent}>
                                        <span>{actionPercent}%</span>
                                    </span>
                                    <span className="mail-card-text">
                                        <strong>Action</strong>
                                        <span id="mailCountAction">{actionCount}</span>
                                    </span>
                                </button>
                                <button
                                    className={`mail-summary-card ${dashboardCardFilter === 'reply' ? 'active' : ''}`}
                                    type="button"
                                    onClick={() => setDashboardCardFilter('reply')}
                                >
                                    <span className="mail-progress" style={{ '--percent': replyPercent }} data-percent={replyPercent}>
                                        <span>{replyPercent}%</span>
                                    </span>
                                    <span className="mail-card-text">
                                        <strong>Reply</strong>
                                        <span id="mailCountReply">{replyCount}</span>
                                    </span>
                                </button>
                            </div>

                            {/* Mail Preview Section */}
                            <div className="mail-preview-section" id="mailPreviewSection">
                                <div className="mail-preview-header">
                                    <div className="mail-preview-search-bar">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        </svg>
                                        <input
                                            type="text"
                                            id="mailPreviewSearchInput"
                                            placeholder="Search email"
                                            value={dashboardPreviewSearch}
                                            onChange={(e) => setDashboardPreviewSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="mail-preview-toolbar">
                                        <button className="mail-preview-toolbar-btn" type="button" title="Select">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                        </button>
                                        <button className="mail-preview-toolbar-btn" type="button" title="Refresh" onClick={() => setDashboardPreviewSearch('')}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21.5 2v6h-6"></path>
                                                <path d="M2.5 22v-6h6"></path>
                                                <path d="M2 11.5a10 10 0 0 1 18.8-4.3"></path>
                                                <path d="M22 12.5a10 10 0 0 1-18.8 4.2"></path>
                                            </svg>
                                        </button>
                                        <button className="mail-preview-toolbar-btn" type="button" title="More options">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="5" r="1"></circle>
                                                <circle cx="12" cy="12" r="1"></circle>
                                                <circle cx="12" cy="19" r="1"></circle>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="mail-preview-table-header">
                                    <div className="mail-preview-col-avatar-spacer"></div>
                                    <span className="mail-preview-col-from">FROM</span>
                                    <span className="mail-preview-col-emailno">EMAIL NO</span>
                                    <div className="mail-preview-col-space"></div>
                                    <div style={{ width: '5px', flexShrink: 0 }}></div>
                                </div>
                                <div className="mail-preview-list" id="mailPreviewList" onScroll={handleMailPreviewScroll} style={{ maxHeight: isCardsCollapsed ? 'calc(100vh - 220px)' : '420px', overflowY: 'auto', transition: 'max-height 0.3s ease' }}>
                                    {dashboardFilteredEmails.length === 0 ? (
                                        <div className="mail-preview-empty" style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 8px', display: 'block' }}>
                                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                                <polyline points="22,6 12,13 2,6"></polyline>
                                            </svg>
                                            <span>No emails to preview</span>
                                        </div>
                                    ) : (
                                        dashboardFilteredEmails.map(mail => {
                                            const initials = mail.sender ? mail.sender.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() : 'U';
                                            const avatarStyle = getAvatarStyle(mail.sender);
                                            return (
                                                <div key={mail.id} className={`mail-preview-row ${!mail.read ? 'unread' : ''}`} role="button" tabIndex={0}>
                                                    <div className="mail-preview-avatar" style={avatarStyle}>
                                                        {initials}
                                                    </div>
                                                    <div className="mail-preview-content">
                                                        <div className="mail-preview-sender-name">{mail.sender}</div>
                                                        <div className="mail-preview-subject">{mail.subject}</div>
                                                        <div className="mail-preview-snippet">{mail.preview}</div>
                                                    </div>
                                                    <div className="mail-preview-emailno-cell">
                                                        {mail.emailNo || '-'}
                                                    </div>
                                                    <div className="mail-preview-right-cell">
                                                        <span className="mail-preview-time">{formatMailPreviewDate(mail.date)}</span>
                                                        <button className="mail-preview-more-btn" type="button" title="More options" onClick={(e) => e.stopPropagation()}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <circle cx="12" cy="5" r="1"></circle>
                                                                <circle cx="12" cy="12" r="1"></circle>
                                                                <circle cx="12" cy="19" r="1"></circle>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* SUBTAB 3: EMAILS */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {activeSubtab === 'emails' && (
                        <div style={{ padding: '1.5rem 2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Employee Emails ({filteredEmpEmails.length})</h3>
                                <input 
                                    type="text" 
                                    placeholder="Search emails..." 
                                    value={emailSearchQuery} 
                                    onChange={(e) => setEmailSearchQuery(e.target.value)} 
                                    style={{ padding: '0.45rem 0.9rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem', width: '250px' }}
                                />
                            </div>
                            <table className="employee-table" style={{ width: '100%', background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
                                <thead>
                                    <tr>
                                        <th>Sender</th>
                                        <th>Subject & Preview</th>
                                        <th>Email No.</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEmpEmails.map(mail => (
                                        <tr key={mail.id} style={{ cursor: 'pointer' }}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#E0F2FE', color: '#0369A1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                                                        {mail.sender.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '13px' }}>{mail.sender}</div>
                                                        <div style={{ color: '#64748B', fontSize: '11px' }}>{mail.senderEmail}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '13px' }}>{mail.subject}</div>
                                                <div style={{ color: '#64748B', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '380px' }}>{mail.preview}</div>
                                            </td>
                                            <td style={{ color: '#475569', fontSize: '13px' }}>{mail.emailNo}</td>
                                            <td style={{ color: '#64748B', fontSize: '12px' }}>{formatMailPreviewDate(mail.date)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* SUBTAB 4: MANAGE PERMISSIONS & ACCESS CONTROL (Exact Screenshot Match) */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {activeSubtab === 'manage' && (
                        <div className="mail-manage-panel" id="mailManagePanel" style={{ display: 'block', padding: '1.5rem 2rem', overflowY: 'auto' }}>
                            {/* 1. Admin Access Control */}
                            <section className="email-management-card" style={{ marginBottom: '1.5rem' }}>
                                <h2>Admin Access Control</h2>
                                <p>Manage the administrative access for this employee. Granting admin access allows them to manage users, projects, and billing.</p>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid #e2e8f0' }}>
                                    <div>
                                        <strong style={{ display: 'block', color: '#1e293b', marginBottom: '0.25rem', fontSize: '0.92rem' }} id="currentRoleDisplayTitle">
                                            Current Role: {emp?.role || 'Employee'}
                                        </strong>
                                        <span style={{ color: '#64748b', fontSize: '0.85rem' }} id="currentRoleDisplayDesc">
                                            {emp?.role === 'Admin' ? 'This user has full administrative privileges.' : 'This user has limited access based on permissions.'}
                                        </span>
                                    </div>
                                    <button 
                                        type="button" 
                                        id="btnRoleUpgrade" 
                                        className="btn-outline-blue" 
                                        style={{ minWidth: '160px', height: '36px', cursor: 'pointer' }}
                                        onClick={async () => {
                                            const currentRole = emp?.role?.toLowerCase() === 'admin' ? 'admin' : 'employee';
                                            const nextRoleApi = currentRole === 'admin' ? 'employee' : 'admin';
                                            const nextRoleUi = nextRoleApi === 'admin' ? 'Admin' : 'Employee';
                                            try {
                                                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                                                const endpoint = nextRoleApi === 'admin' 
                                                    ? `/api/settings/employee/${emp.id}/promote` 
                                                    : `/api/settings/employee/${emp.id}/revoke-admin`;
                                                    
                                                const res = await fetch(endpoint, {
                                                    method: 'PATCH',
                                                    headers: { 
                                                        'Content-Type': 'application/json',
                                                        'x-user-id': String(currentUser.id || '1'),
                                                        'x-org-id': String(currentUser.organization_id || '1')
                                                    },
                                                    body: JSON.stringify({ role: nextRoleUi })
                                                });
                                                
                                                if (res.ok) {
                                                    updateProfile(selectedEmployeeIndex, 'role', nextRoleUi);
                                                    if (currentUser.id === emp.id || currentUser.email === emp.email) {
                                                        currentUser.role = nextRoleUi;
                                                        if (nextRoleUi === 'Employee') {
                                                            currentUser.isAdmin = false;
                                                        }
                                                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                                                        
                                                        // Dispatch custom event for dynamic navbar update without full page reload
                                                        window.dispatchEvent(new Event('storage'));
                                                        
                                                        // Fallback reload if needed for complete layout reset
                                                        setTimeout(() => window.location.reload(), 100);
                                                    }
                                                } else {
                                                    const data = await res.json().catch(() => ({}));
                                                    alert(data.error || 'Failed to update role');
                                                }
                                            } catch (error) {
                                                console.error('Failed to change role', error);
                                                alert('Failed to connect to server');
                                            }
                                        }}
                                    >
                                        {emp?.role === 'Admin' ? 'Revoke Admin Access' : 'Grant Admin Access'}
                                    </button>
                                </div>
                            </section>

                            {/* 2. Employee Email Management */}
                            <section className="email-management-card">
                                <h2>Employee Email Management</h2>
                                <p>You can manage the employee email permissions from here. Control what employees can do with their email accounts.</p>

                                <div className="permission-list" id="permissionList">
                                    {/* 1. Send Emails */}
                                    <div className={`permission-card ${permissions.sendEmails ? 'is-enabled' : ''}`}>
                                        <span className="permission-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                                                <path d="m3 7 9 6 9-6"></path>
                                            </svg>
                                        </span>
                                        <span className="permission-copy">
                                            <strong>Send Emails</strong>
                                            <span>Employee can send an email</span>
                                        </span>
                                        <button 
                                            className={`toggle-switch ${permissions.sendEmails ? 'is-on' : ''}`} 
                                            type="button" 
                                            role="switch" 
                                            aria-checked={permissions.sendEmails}
                                            onClick={() => updatePermissions(selectedEmployeeIndex, 'sendEmails', !permissions.sendEmails)}
                                        ></button>
                                    </div>

                                    {/* 2. Reply to Emails */}
                                    <div className={`permission-card ${permissions.replyEmails ? 'is-enabled' : ''}`}>
                                        <span className="permission-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="9 14 4 9 9 4"></polyline>
                                                <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                                            </svg>
                                        </span>
                                        <span className="permission-copy">
                                            <strong>Reply to Emails</strong>
                                            <span>Employee can reply to an email</span>
                                        </span>
                                        <button 
                                            className={`toggle-switch ${permissions.replyEmails ? 'is-on' : ''}`} 
                                            type="button" 
                                            role="switch" 
                                            aria-checked={permissions.replyEmails}
                                            onClick={() => updatePermissions(selectedEmployeeIndex, 'replyEmails', !permissions.replyEmails)}
                                        ></button>
                                    </div>

                                    {/* 3. View Real Email Ids & Signatures */}
                                    <div className={`permission-card ${permissions.viewRealEmailIds ? 'is-enabled' : ''}`}>
                                        <span className="permission-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                        </span>
                                        <span className="permission-copy">
                                            <strong>View Real Email Ids & Signatures</strong>
                                            <span>Employee can see real email ids and signatures</span>
                                        </span>
                                        <button 
                                            className={`toggle-switch ${permissions.viewRealEmailIds ? 'is-on' : ''}`} 
                                            type="button" 
                                            role="switch" 
                                            aria-checked={permissions.viewRealEmailIds}
                                            onClick={() => updatePermissions(selectedEmployeeIndex, 'viewRealEmailIds', !permissions.viewRealEmailIds)}
                                        ></button>
                                    </div>

                                    {/* 4. Send specific emails */}
                                    <div className={`permission-card ${permissions.sendSpecificEmails ? 'is-enabled' : ''}`}>
                                        <span className="permission-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                                                <path d="m3 7 9 6 9-6"></path>
                                            </svg>
                                        </span>
                                        <span className="permission-copy">
                                            <strong>Send specific emails</strong>
                                            <span>Allow an Employee to send only specific emails</span>
                                        </span>
                                        <button 
                                            className={`toggle-switch ${permissions.sendSpecificEmails ? 'is-on' : ''}`} 
                                            type="button" 
                                            role="switch" 
                                            aria-checked={permissions.sendSpecificEmails}
                                            onClick={() => updatePermissions(selectedEmployeeIndex, 'sendSpecificEmails', !permissions.sendSpecificEmails)}
                                        ></button>
                                        
                                        {/* Nested specific input */}
                                        <div className="permission-specific" style={{ width: '100%' }}>
                                            <input 
                                                type="email" 
                                                id="specificEmailInput" 
                                                placeholder="David Lee@gmail.com" 
                                                value={specificEmailInputValue}
                                                onChange={(e) => setSpecificEmailInputValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleAddSpecificEmail();
                                                }}
                                                aria-label="Specific allowed email" 
                                            />
                                            <button className="btn-outline-blue" type="button" onClick={handleAddSpecificEmail}>
                                                + Add Emails
                                            </button>
                                        </div>
                                    </div>

                                    {/* 5. Project-Based Emails */}
                                    <div className={`permission-card ${permissions.projectBasedEmails ? 'is-enabled' : ''}`}>
                                        <span className="permission-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="2" y="7" width="20" height="14" rx="2"></rect>
                                                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path>
                                            </svg>
                                        </span>
                                        <span className="permission-copy">
                                            <strong>Project-Based Emails</strong>
                                            <span>Enable only project based mails</span>
                                        </span>
                                        <button 
                                            className={`toggle-switch ${permissions.projectBasedEmails ? 'is-on' : ''}`} 
                                            type="button" 
                                            role="switch" 
                                            aria-checked={permissions.projectBasedEmails}
                                            onClick={() => updatePermissions(selectedEmployeeIndex, 'projectBasedEmails', !permissions.projectBasedEmails)}
                                        ></button>
                                    </div>

                                    {/* 6. Block | unblock user */}
                                    <div className={`permission-card ${permissions.blocked ? 'is-enabled' : ''}`}>
                                        <span className="permission-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="9"></circle>
                                                <path d="m5.7 5.7 12.6 12.6"></path>
                                            </svg>
                                        </span>
                                        <span className="permission-copy">
                                            <strong>Block | unblock user</strong>
                                            <span>{permissions.blocked ? 'Blocked - Employee is logged out and cannot login' : 'Unblocked - Employee can login and use allowed access'}</span>
                                        </span>
                                        <button 
                                            className={`toggle-switch ${permissions.blocked ? 'is-on' : ''}`} 
                                            type="button" 
                                            role="switch" 
                                            aria-checked={permissions.blocked}
                                            onClick={async () => {
                                                const newBlockedState = !permissions.blocked;
                                                try {
                                                    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                                                    const res = await fetch(`/api/settings/employee/${encodeURIComponent(emp.email)}/block`, {
                                                        method: 'PATCH',
                                                        headers: { 
                                                            'Content-Type': 'application/json',
                                                            'x-user-id': String(currentUser.id || '1'),
                                                            'x-org-id': String(currentUser.organization_id || '1')
                                                        },
                                                        body: JSON.stringify({ isBlocked: newBlockedState })
                                                    });
                                                    
                                                    if (res.ok) {
                                                        updatePermissions(selectedEmployeeIndex, 'blocked', newBlockedState);
                                                    } else {
                                                        const data = await res.json();
                                                        alert(data.error || 'Failed to update block status');
                                                    }
                                                } catch (error) {
                                                    console.error('Failed to change block status', error);
                                                    alert('Failed to connect to server');
                                                }
                                            }}
                                        ></button>
                                    </div>
                                </div>

                                {/* 3. Email Configuration Box */}
                                <div className="email-config-card">
                                    <h3>Email Configuration</h3>
                                    <div className="email-config-add">
                                        <input 
                                            type="email" 
                                            id="allowedEmailInput" 
                                            placeholder="David Lee@gmail.com"
                                            value={allowedEmailInputValue}
                                            onChange={(e) => setAllowedEmailInputValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleAddAllowedEmail();
                                            }}
                                            aria-label="Allowed email address" 
                                        />
                                        <button className="btn-outline-blue" type="button" onClick={handleAddAllowedEmail}>
                                            <span>+</span>
                                            {editingAllowedEmailIdx !== null ? 'Update Email' : 'Add Emails'}
                                        </button>
                                    </div>
                                    <div className="email-config-list" id="emailConfigList">
                                        {(permissions.allowedEmails || []).map((email, idx) => (
                                            <div className="email-config-row" key={idx}>
                                                <span>{email}</span>
                                                <span className="email-row-actions">
                                                    <button className="icon-action-btn" type="button" onClick={() => handleEditAllowedEmail(idx)} aria-label="Edit email" title="Edit email">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                                                    </button>
                                                    <button className="icon-action-btn" type="button" onClick={() => handleDeleteAllowedEmail(idx)} aria-label="Delete email" title="Delete email">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
                                                    </button>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* SUBTAB 5: PROJECTS (Exact Screenshot Match) */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {activeSubtab === 'projects' && (
                        <div className="mail-projects-panel" id="mailProjectsPanel" style={{ display: 'block', padding: '1.5rem 2rem', overflowY: 'auto' }}>
                            <div className="project-page-header">
                                <div>
                                    <h2 id="projectEmployeeName" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111', margin: '0 0 0.35rem' }}>
                                        {fullName || 'Rahul Singh'}
                                    </h2>
                                    <p style={{ fontSize: '0.86rem', color: '#111', fontWeight: 600, margin: 0 }}>
                                        Total projects - <span id="projectTotalCount">{employeeProjects.length}</span>
                                    </p>
                                </div>
                                <div className="project-search">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                    <input 
                                        type="text" 
                                        id="projectSearchInput" 
                                        placeholder="Search projects" 
                                        aria-label="Search projects"
                                        value={projectSearchQuery}
                                        onChange={(e) => setProjectSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="project-card-list" id="projectCardList">
                                {filteredEmployeeProjects.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', border: '1px dashed #DDE2E8', borderRadius: '6px', color: '#64748B' }}>
                                        <p style={{ margin: 0, fontSize: '0.95rem' }}>No assigned projects found for this employee.</p>
                                    </div>
                                ) : (
                                    filteredEmployeeProjects.map((project, index) => (
                                        <section className="project-card" key={project.id || index} data-project-id={project.id}>
                                            <div className="project-card-head">
                                                <h3>{index + 1}. Project Details</h3>
                                                <button 
                                                    className="btn-remove-employee" 
                                                    type="button" 
                                                    onClick={() => handleRemoveEmployeeFromProject(project.id)}
                                                >
                                                    <span>&times;</span>
                                                    Remove employee
                                                </button>
                                            </div>
                                            <div className="project-form-grid">
                                                <div className="project-field">
                                                    <label>Project name</label>
                                                    <input 
                                                        type="text" 
                                                        value={project.projectName || ''} 
                                                        placeholder="Enter project name" 
                                                        onChange={(e) => handleUpdateProjectField(project.id, 'projectName', e.target.value)}
                                                    />
                                                </div>
                                                <div className="project-field">
                                                    <label>Employee name</label>
                                                    <input 
                                                        type="text" 
                                                        value={project.employeeName || ''} 
                                                        placeholder="Employee name" 
                                                        onChange={(e) => handleUpdateProjectField(project.id, 'employeeName', e.target.value)}
                                                    />
                                                </div>
                                                <div className="project-field">
                                                    <label>Select client</label>
                                                    <input 
                                                        type="text" 
                                                        value={project.client || ''} 
                                                        placeholder="Select client" 
                                                        onChange={(e) => handleUpdateProjectField(project.id, 'client', e.target.value)}
                                                    />
                                                </div>
                                                <div className="project-field">
                                                    <label>Projects email ID</label>
                                                    <input 
                                                        type="email" 
                                                        value={project.projectEmailId || ''} 
                                                        placeholder="Project email id" 
                                                        onChange={(e) => handleUpdateProjectField(project.id, 'projectEmailId', e.target.value)}
                                                    />
                                                </div>
                                                <div className="project-field full">
                                                    <label>Project leader</label>
                                                    <select 
                                                        value={project.leader || 'Yash'} 
                                                        onChange={(e) => handleUpdateProjectField(project.id, 'leader', e.target.value)}
                                                        style={{ width: '100%', height: '36px', border: '1px solid #DADDE2', borderRadius: '4px', padding: '0 0.65rem', fontSize: '0.78rem', background: '#fff', color: '#333', fontFamily: "'Inter', sans-serif" }}
                                                    >
                                                        {['Yash', 'Rahul Singh', 'Nouman Azam', 'Sayem uddin'].map(name => (
                                                            <option key={name} value={name}>{name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </section>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* SUBTAB 6: EMAIL IDS MANAGEMENT (Exact Screenshot Match) */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {activeSubtab === 'emailIds' && (
                        <div className="mail-email-ids-panel" id="mailEmailIdsPanel" style={{ display: 'block', padding: '1.5rem 2rem' }}>
                            <div className="email-ids-header" style={{ marginBottom: '1.25rem' }}>
                                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111', margin: '0 0 0.35rem' }}>
                                    Email IDs Management
                                </h2>
                                <p style={{ fontSize: '0.86rem', color: '#111', fontWeight: 600, margin: 0 }}>
                                    Manage client email IDs, project details, and signatures
                                </p>
                            </div>

                            <div className="email-ids-search" style={{ position: 'relative', marginBottom: '1rem', background: '#EEF4FA', padding: '0.8rem 1rem', borderRadius: '4px' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '1.65rem', top: '50%', transform: 'translateY(-50%)', color: '#777' }}>
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <input
                                    type="text"
                                    id="emailIdsSearchInput"
                                    placeholder="Search email"
                                    aria-label="Search email IDs"
                                    value={emailIdsSearchQuery}
                                    onChange={(e) => setEmailIdsSearchQuery(e.target.value)}
                                    style={{ width: 'min(100%, 540px)', height: '36px', border: 'none', background: 'transparent', padding: '0 0.75rem 0 2.2rem', fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: '#333', outline: 'none' }}
                                />
                            </div>

                            <div className="email-ids-table-wrap" style={{ width: '100%', overflowX: 'auto', borderRadius: '4px', border: '1px solid #DDE2E8' }}>
                                <table className="email-ids-table" style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                    <thead style={{ background: '#1F1F1F' }}>
                                        <tr>
                                            <th style={{ color: '#fff', padding: '0.9rem 0.75rem', textAlign: 'left', fontWeight: 800, whiteSpace: 'nowrap' }}>Real Email ID</th>
                                            <th style={{ color: '#fff', padding: '0.9rem 0.75rem', textAlign: 'left', fontWeight: 800, whiteSpace: 'nowrap' }}>Client ID</th>
                                            <th style={{ color: '#fff', padding: '0.9rem 0.75rem', textAlign: 'left', fontWeight: 800, whiteSpace: 'nowrap' }}>Project Leader</th>
                                            <th style={{ color: '#fff', padding: '0.9rem 0.75rem', textAlign: 'left', fontWeight: 800, whiteSpace: 'nowrap' }}>Project Name</th>
                                            <th style={{ color: '#fff', padding: '0.9rem 0.75rem', textAlign: 'left', fontWeight: 800, whiteSpace: 'nowrap' }}>Email No</th>
                                            <th style={{ color: '#fff', padding: '0.9rem 0.75rem', textAlign: 'left', fontWeight: 800, whiteSpace: 'nowrap' }}>Signature</th>
                                            <th style={{ color: '#fff', padding: '0.9rem 0.75rem', textAlign: 'left', fontWeight: 800, whiteSpace: 'nowrap' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="emailIdsTableBody">
                                        {filteredEmailIdRecords.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
                                                    No email ID records found matching your search.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredEmailIdRecords.map(rec => (
                                                <tr key={rec.id} style={{ cursor: 'pointer' }}>
                                                    <td style={{ padding: '0.85rem 0.75rem', borderBottom: '1px solid #DDE2E8', color: '#111', fontWeight: 600 }}>
                                                        {permissions.viewRealEmailIds ? rec.realEmail : '******@gmail.com'}
                                                    </td>
                                                    <td style={{ padding: '0.85rem 0.75rem', borderBottom: '1px solid #DDE2E8', color: '#111', fontWeight: 600 }}>
                                                        {rec.cloneEmail}
                                                    </td>
                                                    <td style={{ padding: '0.85rem 0.75rem', borderBottom: '1px solid #DDE2E8', color: '#111', fontWeight: 600 }}>
                                                        {rec.leader}
                                                    </td>
                                                    <td style={{ padding: '0.85rem 0.75rem', borderBottom: '1px solid #DDE2E8', color: '#111', fontWeight: 600 }}>
                                                        {rec.projectName}
                                                    </td>
                                                    <td className="cell-email-no" style={{ padding: '0.85rem 0.75rem', borderBottom: '1px solid #DDE2E8', color: '#fff', background: '#2E5B82', fontWeight: 700, textAlign: 'center' }}>
                                                        {rec.emailNo}
                                                    </td>
                                                    <td style={{ padding: '0.85rem 0.75rem', borderBottom: '1px solid #DDE2E8', color: '#111', fontWeight: 600 }}>
                                                        {permissions.viewRealEmailIds ? (
                                                            <div className="signature-card-dark" style={{ background: '#5B5B5B', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', display: 'inline-block' }}>
                                                                {rec.signature}
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: '#94A3B8' }}>******</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '0.85rem 0.75rem', borderBottom: '1px solid #DDE2E8', verticalAlign: 'middle' }}>
                                                        <span style={{ background: rec.status === 'Active' ? '#DCFCE7' : '#FEF3C7', color: rec.status === 'Active' ? '#166534' : '#92400E', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                                                            {rec.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* SUBTAB 7: BACKUP AND RESTORE (Exact Screenshot Match) */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {activeSubtab === 'backup' && (
                        <div className="mail-backup-panel" id="mailBackupPanel" style={{ display: 'block', padding: '1.5rem 2rem', overflowY: 'auto' }}>
                            {/* Card 1: Profile & New Backups */}
                            <section className="email-management-card backup-profile-card" style={{ marginBottom: '1rem', width: '100%', maxWidth: '940px' }}>
                                <div className="backup-profile-main">
                                    <img 
                                        src="/images/avatar_1.png" 
                                        alt="Employee profile" 
                                        className="backup-avatar"
                                        onError={(e) => {
                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'Rahul Singh')}&background=E8F2FA&color=1A6BA8`;
                                        }}
                                    />
                                    <div>
                                        <h2 id="backupEmployeeName">{fullName || 'Rahul Singh'}</h2>
                                        <p id="backupEmployeeEmail">{emp?.email || 'rahul.indianshelf99@gmail.com'}</p>
                                        <div className="backup-profile-stats">
                                            <span><strong id="backupProjectsCount">12</strong> Projects</span>
                                            <span><strong id="backupStorageUsed">20 GB</strong> Storage used</span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    className="btn-outline-blue backup-new-btn" 
                                    type="button" 
                                    onClick={() => alert('Backup process initiated for ' + (fullName || 'Rahul Singh'))}
                                >
                                    + New Backups
                                </button>
                            </section>

                            {/* Card 2: Storage Overview */}
                            <section className="email-management-card storage-overview-card" style={{ marginBottom: '1rem', width: '100%', maxWidth: '940px' }}>
                                <div className="storage-overview-head">
                                    <h3>Storage Overview</h3>
                                    <span id="backupStoragePercent">80% Used</span>
                                </div>
                                <div className="storage-value">
                                    <strong id="storageUsedValue">15 GB</strong> / <span id="storageTotalValue">20 GB</span>
                                </div>
                                <div className="storage-progress">
                                    <span id="storageProgressFill" style={{ width: '80%' }}></span>
                                </div>
                                <p id="storageUpgradeMessage" style={{ margin: '0 0 1.15rem', color: '#333', fontSize: '0.78rem', fontWeight: 600 }}>
                                    You have used 15 GB of your 20 GB storage capacity. Consider upgrading your plan for more space.
                                </p>
                                <button 
                                    className="btn-modal btn-modal-proceed storage-upgrade-btn" 
                                    type="button" 
                                    onClick={() => openPlanModal()}
                                    style={{ background: '#1A6BA8', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.55rem 0.95rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
                                >
                                    Get more storage
                                </button>
                            </section>

                            {/* Card 3: Collapsible Email Storage Accordion */}
                            <section className={`email-management-card backup-accordion ${isStorageAccordionOpen ? 'open' : ''}`} style={{ width: '100%', maxWidth: '940px' }}>
                                <button 
                                    className="backup-accordion-toggle" 
                                    type="button" 
                                    id="emailStorageToggle"
                                    aria-expanded={isStorageAccordionOpen}
                                    onClick={() => setIsStorageAccordionOpen(!isStorageAccordionOpen)}
                                >
                                    <span>
                                        <strong>Email storage</strong>
                                        <small>You have 20GB of free storage with this account which includes attachments and messages across all folders</small>
                                    </span>
                                    <svg className="backup-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ transform: isStorageAccordionOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }}>
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </button>
                                {isStorageAccordionOpen && (
                                    <div className="backup-accordion-body" id="emailStorageBody">
                                        <div className="backup-detail-row">
                                            <span>Messages</span>
                                            <strong id="backupMessagesUsage">8.2 GB</strong>
                                        </div>
                                        <div className="backup-detail-row">
                                            <span>Attachments</span>
                                            <strong id="backupAttachmentsUsage">4.8 GB</strong>
                                        </div>
                                        <div className="backup-detail-row">
                                            <span>Archived backups</span>
                                            <strong id="backupArchiveUsage">2 GB</strong>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>
                    )}

                </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* ADD EMPLOYEE MODAL (Exact match with Vanilla JS Dashboard) */}
            {/* ───────────────────────────────────────────────────────────── */}
            {isAddModalOpen && (
                <div className="modal-overlay active" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) closeAddModal(); }}>
                    <div className="modal-card form-modal-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h2 className="form-modal-title" style={{ margin: 0 }}>Add Employee</h2>
                            <button 
                                type="button" 
                                onClick={closeAddModal} 
                                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#94A3B8' }}
                            >
                                &times;
                            </button>
                        </div>

                        <div className="form-modal-row">
                            <label htmlFor="newEmpFirstName">First Name</label>
                            <input 
                                type="text" 
                                id="newEmpFirstName" 
                                placeholder="Enter first name" 
                                value={newFirstName} 
                                onChange={(e) => setNewFirstName(e.target.value)} 
                            />
                        </div>

                        <div className="form-modal-row">
                            <label htmlFor="newEmpLastName">Last Name</label>
                            <input 
                                type="text" 
                                id="newEmpLastName" 
                                placeholder="Enter Last name" 
                                value={newLastName} 
                                onChange={(e) => setNewLastName(e.target.value)} 
                            />
                        </div>

                        <div className="form-modal-row">
                            <label htmlFor="newEmpEmail">Email</label>
                            <input 
                                type="email" 
                                id="newEmpEmail" 
                                placeholder="Enter email" 
                                value={newEmail} 
                                onChange={(e) => setNewEmail(e.target.value)} 
                                style={{ width: '100%', height: '42px', border: '1px solid #D9DDE2', borderRadius: '4px', padding: '0 1rem', fontSize: '0.85rem' }}
                            />
                        </div>

                        <div className="form-modal-row" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', marginBottom: '1.5rem' }}>
                            <input 
                                type="checkbox" 
                                id="sendInviteCheckbox" 
                                checked={sendInviteEmail} 
                                onChange={(e) => setSendInviteEmail(e.target.checked)} 
                                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
                            />
                            <label htmlFor="sendInviteCheckbox" style={{ margin: 0, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#333' }}>
                                Send invitation email to this employee
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button 
                                className="btn-modal btn-modal-proceed" 
                                type="button" 
                                onClick={handleSaveNewEmployee} 
                                disabled={isSubmitting}
                                style={{ flex: 1, height: '42px', fontSize: '0.9rem' }}
                            >
                                {isSubmitting ? 'Saving...' : 'Add Employee'}
                            </button>
                            <button 
                                className="copy-link" 
                                type="button" 
                                aria-label="Copy employee invite link" 
                                onClick={handleCopyInviteLink} 
                                style={{ flex: 1, height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: 0, border: '1px solid #D9DDE2' }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.35rem' }}>
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                </svg>
                                <span>Copy Link</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* ADD EMPLOYEES (QUANTITY / SEATS) MODAL */}
            {/* ───────────────────────────────────────────────────────────── */}
            {isQuantityModalOpen && (
                <div 
                    className="modal-overlay active" 
                    id="addEmployeesModal" 
                    role="dialog" 
                    aria-modal="true" 
                    aria-labelledby="addEmpTitle"
                    onClick={(e) => { if (e.target === e.currentTarget) closeQuantityModal(); }}
                >
                    <div className="modal-card">
                        <button 
                            className="modal-close" 
                            onClick={closeQuantityModal}
                            aria-label="Close modal"
                        >
                            &times;
                        </button>
                        <h2 className="modal-title" id="addEmpTitle">Add Employees</h2>
                        <p className="modal-subtitle">How many employees would you like to add?</p>

                        <div className="quantity-selector">
                            <button 
                                className="quantity-btn" 
                                onClick={() => updateQuantity(-1)}
                                aria-label="Decrease quantity"
                            >
                                &minus;
                            </button>
                            <div className="quantity-value" id="employeeQuantity" aria-live="polite">
                                {employeeQuantity}
                            </div>
                            <button 
                                className="quantity-btn" 
                                onClick={() => updateQuantity(1)} 
                                aria-label="Increase quantity"
                            >
                                +
                            </button>
                        </div>

                        <div className="modal-actions">
                            <button 
                                className="btn-modal btn-modal-cancel" 
                                onClick={closeQuantityModal}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn-modal btn-modal-proceed" 
                                onClick={proceedToPlan}
                            >
                                Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* CHOOSE YOUR PLAN MODAL */}
            {/* ───────────────────────────────────────────────────────────── */}
            {isPlanModalOpen && (
                <div 
                    className="modal-overlay active" 
                    id="planModal" 
                    role="dialog" 
                    aria-modal="true" 
                    aria-labelledby="planTitle"
                    onClick={(e) => { if (e.target === e.currentTarget) closePlanModal(); }}
                >
                    <div className="modal-card plan-modal">
                        <button 
                            className="modal-close" 
                            onClick={closePlanModal} 
                            aria-label="Close modal"
                        >
                            &times;
                        </button>
                        <h2 className="modal-title" id="planTitle">Choose Your Plan</h2>
                        <p className="modal-subtitle">Select the billing cycle that works best for you</p>

                        {/* Toggle */}
                        <div className="billing-toggle" role="tablist">
                            <div 
                                className={`toggle-option ${billingCycle === 'monthly' ? 'active' : ''}`} 
                                id="toggleMonthly" 
                                role="tab" 
                                aria-selected={billingCycle === 'monthly'}
                                onClick={() => setBillingCycle('monthly')}
                            >
                                Monthly
                            </div>
                            <div 
                                className={`toggle-option ${billingCycle === 'yearly' ? 'active' : ''}`} 
                                id="toggleYearly" 
                                role="tab" 
                                aria-selected={billingCycle === 'yearly'}
                                onClick={() => setBillingCycle('yearly')}
                            >
                                Yearly
                            </div>
                        </div>

                        {/* Plan Card */}
                        <div className="plan-card">
                            <h3 id="planCardTitle">{billingCycle === 'monthly' ? 'Monthly Plan' : 'Yearly Plan'}</h3>
                            <div className="price">Rs <span id="planCardPrice">{billingCycle === 'monthly' ? 100 : 1000}</span></div>
                            <div className="period" id="planCardPeriod">{billingCycle === 'monthly' ? 'Per month per employee' : 'Per year per employee'}</div>
                            <div className="plan-card-total" id="planCardTotal">Total: Rs {(billingCycle === 'monthly' ? 100 : 1000) * employeeQuantity}</div>
                        </div>

                        {/* Summary */}
                        <div className="plan-summary-box">
                            <div className="employees-badge">
                                <svg className="badge-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px', color: 'var(--primary-color)' }}>
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                <span className="badge-text">For <span id="summaryEmployeesBadge">{employeeQuantity}</span> Employees</span>
                            </div>
                            <div className="summary-subtitle" style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.25rem 0 1rem' }}>Perfect for small teams</div>

                            <table className="summary-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #DBEAFE', height: '32px' }}>
                                        <td style={{ color: '#64748B', fontSize: '0.85rem' }}>Plan:</td>
                                        <td id="summaryPlanName" style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.85rem' }}>{billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #DBEAFE', height: '32px' }}>
                                        <td style={{ color: '#64748B', fontSize: '0.85rem' }}>Employees:</td>
                                        <td id="summaryEmployeeCount" style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.85rem' }}>{employeeQuantity} Users</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #DBEAFE', height: '32px' }}>
                                        <td style={{ color: '#64748B', fontSize: '0.85rem' }}>Amount:</td>
                                        <td id="summaryAmount" style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.85rem' }}>Rs{(billingCycle === 'monthly' ? 100 : 1000) * employeeQuantity}</td>
                                    </tr>
                                    <tr className="total-row" style={{ height: '36px' }}>
                                        <td style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.9rem' }}>Total:</td>
                                        <td id="summaryTotal" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.9rem' }}>Rs{(billingCycle === 'monthly' ? 100 : 1000) * employeeQuantity}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <button 
                            className="btn-payment" 
                            id="btnProceedPayment" 
                            onClick={() => handleProceedPayment(navigate)}
                            style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--primary-color, #1A6BA8)', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', marginTop: '1.25rem' }}
                        >
                            Proceed Payment
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}