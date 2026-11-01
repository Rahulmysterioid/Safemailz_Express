import './EmployeesLightPolish.css';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useEmployee } from '../../context/EmployeeContext';
import { useAdmin } from '../../context/AdminContext';
import { useClient } from '../../context/ClientContext';
import { useProject } from '../../context/ProjectContext';
import { mockEmails } from '../../data/mockEmails';
import { formatMailPreviewDate } from '../../utils/dateUtils';
import OwnerResetPasswordModal from '../../components/dashboard/OwnerResetPasswordModal';
import EmployeeClientsTab from '../../components/employees/EmployeeClientsTab';

export default function EmployeesView() {
    const navigate = useNavigate();
    const { sidebarCollapsed, toggleSidebar } = useOutletContext();
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
        updateEmployeeCover,
        resendInvite
    } = useEmployee();

    const { admins } = useAdmin();
    const { clients, loading: clientsLoading } = useClient();
    const { projects: globalProjects } = useProject();
    const [isProjectsLoading, setIsProjectsLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    React.useEffect(() => {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try { setCurrentUser(JSON.parse(storedUser)); } catch (e) {}
        }
    }, []);

    const effectivePermissions = React.useMemo(() => {
        if (!currentUser) return {};
        if (currentUser.role?.toLowerCase() === 'admin') {
            const currentAdmin = admins.find(a => a.id === currentUser.id || a.email === currentUser.email);
            if (currentAdmin && currentAdmin.permissions) {
                return currentAdmin.permissions;
            }
        }
        return currentUser.permissions || {};
    }, [currentUser, admins]);

    const canMakeAdmin = currentUser?.role?.toLowerCase() === 'org_owner' || effectivePermissions?.makeAdmin !== false;

    const [activeSubtab, setActiveSubtab] = useState('profile');
    const [emailSearchQuery, setEmailSearchQuery] = useState('');
    const [dashboardCardFilter, setDashboardCardFilter] = useState('all');
    const [dashboardPreviewSearch, setDashboardPreviewSearch] = useState('');
    const [isCardsCollapsed, setIsCardsCollapsed] = useState(false);
    const [emailIdsSearchQuery, setEmailIdsSearchQuery] = useState('');
    const [copiedEmailId, setCopiedEmailId] = useState(null);

    const handleCopyEmail = (e, email) => {
        e.stopPropagation();
        if (!email || email === '-') return;
        try {
            navigator.clipboard?.writeText(email);
            setCopiedEmailId(email);
            setTimeout(() => setCopiedEmailId(null), 1800);
        } catch (err) {
            console.error('Failed to copy email:', err);
        }
    };

    // Email Management / Manage tab states
    const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
    const [specificEmailInputValue, setSpecificEmailInputValue] = useState('');
    const [allowedEmailInputValue, setAllowedEmailInputValue] = useState('');
    const [editingAllowedEmailIdx, setEditingAllowedEmailIdx] = useState(null);
    const [togglingPerm, setTogglingPerm] = useState({});
    const [permToast, setPermToast] = useState(null);

    const handleTogglePermission = async (permKey, nextValue) => {
        setTogglingPerm(prev => ({ ...prev, [permKey]: true }));
        try {
            const res = await updatePermissions(selectedEmployeeIndex, permKey, nextValue);
            const labelMap = {
                sendEmails: 'Send Emails',
                replyEmails: 'Reply to Emails',
                viewRealEmailIds: 'View Real Email IDs',
                sendSpecificEmails: 'Send Specific Emails',
                projectBasedEmails: 'Project Based Emails'
            };
            const label = labelMap[permKey] || permKey;
            if (res && res.success === false) {
                setPermToast({ type: 'error', text: res.error || `Failed to update ${label}` });
            } else {
                setPermToast({
                    type: 'success',
                    text: `${label} ${nextValue ? 'enabled' : 'disabled'} successfully.`
                });
            }
        } catch (e) {
            setPermToast({ type: 'error', text: 'Error updating permission' });
        } finally {
            setTogglingPerm(prev => ({ ...prev, [permKey]: false }));
            setTimeout(() => setPermToast(null), 3000);
        }
    };

    // Cover photo and preset themes state
    const fileInputRef = useRef(null);
    const coverMenuRef = useRef(null);
    const [isCoverMenuOpen, setIsCoverMenuOpen] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (coverMenuRef.current && !coverMenuRef.current.contains(e.target)) {
                setIsCoverMenuOpen(false);
            }
        };
        if (isCoverMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isCoverMenuOpen]);

    const PRESET_COVERS = [
        {
            id: 'ocean-blue',
            name: 'Ocean Breeze',
            style: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #93c5fd 100%)'
        },
        {
            id: 'royal-indigo',
            name: 'Royal Indigo',
            style: 'linear-gradient(135deg, #312e81 0%, #6366f1 50%, #a5b4fc 100%)'
        },
        {
            id: 'emerald-forest',
            name: 'Emerald Forest',
            style: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #6ee7b7 100%)'
        },
        {
            id: 'sunset-coral',
            name: 'Sunset Coral',
            style: 'linear-gradient(135deg, #881337 0%, #e11d48 50%, #fda4af 100%)'
        },
        {
            id: 'midnight-slate',
            name: 'Midnight Slate',
            style: 'linear-gradient(135deg, #0f172a 0%, #334155 50%, #64748b 100%)'
        },
        {
            id: 'amber-horizon',
            name: 'Amber Horizon',
            style: 'linear-gradient(135deg, #78350f 0%, #d97706 50%, #fcd34d 100%)'
        }
    ];

    const handleCoverFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (e.target) e.target.value = '';
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setPermToast({
                type: 'error',
                text: 'Invalid format. Please upload JPG, PNG or WebP.'
            });
            setTimeout(() => setPermToast(null), 3500);
            return;
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setPermToast({
                type: 'error',
                text: 'File size exceeds 5MB limit. Please choose a smaller photo.'
            });
            setTimeout(() => setPermToast(null), 3500);
            return;
        }

        setIsUploadingCover(true);
        setIsCoverMenuOpen(false);

        try {
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(new Error('Failed to read image file.'));
                reader.onload = (loadEvent) => {
                    const img = new Image();
                    img.onerror = () => reject(new Error('Failed to parse image.'));
                    img.onload = () => {
                        const maxDim = 1920;
                        let { width, height } = img;
                        if (width > maxDim || height > maxDim) {
                            if (width > height) {
                                height = Math.round((height * maxDim) / width);
                                width = maxDim;
                            } else {
                                width = Math.round((width * maxDim) / height);
                                height = maxDim;
                            }
                        }
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                        const compressed = canvas.toDataURL(mime, 0.88);
                        resolve(compressed);
                    };
                    img.src = loadEvent.target.result;
                };
                reader.readAsDataURL(file);
            });

            await updateEmployeeCover(selectedEmployeeIndex, dataUrl);
            setPermToast({
                type: 'success',
                text: 'Cover updated automatically'
            });
        } catch (err) {
            console.error('Error uploading cover:', err);
            setPermToast({
                type: 'error',
                text: err.message || 'Failed to upload cover'
            });
        } finally {
            setIsUploadingCover(false);
            setTimeout(() => setPermToast(null), 3000);
        }
    };

    const handleSelectPresetCover = async (preset) => {
        setIsCoverMenuOpen(false);
        setIsUploadingCover(true);
        try {
            await updateEmployeeCover(selectedEmployeeIndex, preset.style);
            setPermToast({
                type: 'success',
                text: 'Cover updated automatically'
            });
        } catch (err) {
            console.error('Error applying preset cover:', err);
            setPermToast({
                type: 'error',
                text: 'Failed to update cover'
            });
        } finally {
            setIsUploadingCover(false);
            setTimeout(() => setPermToast(null), 3000);
        }
    };

    const handleRemoveCover = async () => {
        setIsCoverMenuOpen(false);
        setIsUploadingCover(true);
        try {
            await updateEmployeeCover(selectedEmployeeIndex, null);
            setPermToast({
                type: 'success',
                text: 'Cover removed and reset to default'
            });
        } catch (err) {
            console.error('Error removing cover:', err);
            setPermToast({
                type: 'error',
                text: 'Failed to remove cover'
            });
        } finally {
            setIsUploadingCover(false);
            setTimeout(() => setPermToast(null), 3000);
        }
    };

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

    // Current employee data: accepts any employee seat that is not empty
    const emp = selectedEmployee && selectedEmployee.status !== 'empty' && (selectedEmployee.email || selectedEmployee.firstName || selectedEmployee.name || selectedEmployee.status === 'filled') ? selectedEmployee : null;
    const fullName = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || '' : '';
    const firstInitial = (
        emp?.firstName?.trim()?.charAt(0) ||
        emp?.name?.trim()?.charAt(0) ||
        fullName?.trim()?.charAt(0) ||
        emp?.email?.trim()?.charAt(0) ||
        '?'
    ).toUpperCase();
    const initial = firstInitial;

    // Dynamic Employee Dashboard Emails & Stats (Scoped strictly to selected employee)
    const [employeeEmails, setEmployeeEmails] = useState([]);
    const [isEmailsLoading, setIsEmailsLoading] = useState(false);

    // Helper: extract all email addresses from a string or header, preventing substring collisions
    const extractEmailsFromText = (text) => {
        if (!text) return [];
        const matches = String(text).toLowerCase().match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        return matches || [];
    };

    // Client-side guard / filtering fallback function
    const filterEmailsForEmployee = (emailsList, targetEmployee) => {
        if (!targetEmployee || !targetEmployee.email) return [];
        const empEmail = String(targetEmployee.email).toLowerCase().trim();
        if (!empEmail) return [];
        const empId = targetEmployee.id != null ? String(targetEmployee.id) : null;
        const empDbId = targetEmployee._id != null ? String(targetEmployee._id) : null;

        return (emailsList || []).filter(mail => {
            if (!mail) return false;

            const ownerEmail = (mail.ownerEmail || mail.owner_email || '').toLowerCase().trim();
            if (ownerEmail && ownerEmail === empEmail) return true;

            const fromCandidates = [
                mail.from,
                mail.senderEmail,
                mail.realSenderEmail,
                mail.sender_email,
                mail.external_sender_email,
                (mail.sender && mail.sender.includes('@')) ? mail.sender : ''
            ].filter(Boolean);

            for (const f of fromCandidates) {
                if (f.toLowerCase().trim() === empEmail) return true;
                const extracted = extractEmailsFromText(f);
                if (extracted.includes(empEmail)) return true;
            }

            const toCandidates = [
                mail.to,
                mail.to_address,
                mail.recipient_email,
                mail.recipientEmail
            ].filter(Boolean);

            for (const t of toCandidates) {
                if (t.toLowerCase().trim() === empEmail) return true;
                const extracted = extractEmailsFromText(t);
                if (extracted.includes(empEmail)) return true;
            }

            if (extractEmailsFromText(mail.cc).includes(empEmail)) return true;
            if (extractEmailsFromText(mail.bcc).includes(empEmail)) return true;

            // Strict user/employee ID matching (do NOT match mail.recipient_id as it refers to email_recipients row ID)
            const mailEmpId = (
                mail.employeeId ||
                mail.employee_id ||
                mail.userId ||
                mail.user_id ||
                mail.recipientUserId ||
                mail.recipient_user_id
            ) != null ? String(mail.employeeId || mail.employee_id || mail.userId || mail.user_id || mail.recipientUserId || mail.recipient_user_id) : null;

            if (empDbId && mailEmpId && empDbId === mailEmpId) return true;
            if (empId && mailEmpId && empId === mailEmpId) return true;

            return false;
        });
    };

    // Accepts either an employee object or { employeeId, email }
    const fetchEmployeeEmails = async (target, signal) => {
        const targetEmp = (target && target.employeeId !== undefined && !target.id)
            ? { id: target.employeeId, _id: target.employeeId, email: target.email, ...target }
            : target;

        if (!targetEmp || !targetEmp.email) {
            setEmployeeEmails([]);
            setIsEmailsLoading(false);
            return;
        }

        setIsEmailsLoading(true);

        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const token = localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (user?.id) headers['x-user-id'] = String(user.id);
            if (user?.org_id || user?.organization_id) headers['x-org-id'] = String(user.org_id || user.organization_id);

            const empIdParam = targetEmp._id || targetEmp.id || targetEmp.employeeId;
            if (empIdParam) headers['x-employee-id'] = String(empIdParam);
            if (targetEmp.email) {
                headers['x-employee-email'] = String(targetEmp.email);
                headers['x-email'] = String(targetEmp.email);
            }

            const queryParams = new URLSearchParams({
                folder: 'all',
                filter: 'all',
                employeeEmail: targetEmp.email,
                email: targetEmp.email
            });
            if (empIdParam) queryParams.set('employeeId', String(empIdParam));

            const res = await fetch(`/api/emails?${queryParams.toString()}`, {
                headers,
                signal
            });

            if (signal?.aborted) return;

            if (res.ok) {
                const data = await res.json();
                if (signal?.aborted) return;
                if (data && Array.isArray(data.emails)) {
                    // Strict client-side filter guard on loaded array
                    const strictlyFiltered = filterEmailsForEmployee(data.emails, targetEmp);
                    if (signal?.aborted) return;
                    setEmployeeEmails(strictlyFiltered);
                    return;
                }
            }

            if (signal?.aborted) return;

            // Fallback: check cached localStorage emails and mock data strictly filtered by this employee
            let fallbackPool = [];
            const stored = localStorage.getItem(`safemailzEmails_${targetEmp.id}`) || localStorage.getItem('safemailzEmails');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) fallbackPool = parsed;
                } catch (e) {}
            }
            if (fallbackPool.length === 0 && Array.isArray(mockEmails)) {
                fallbackPool = mockEmails;
            }
            const filtered = filterEmailsForEmployee(fallbackPool, targetEmp);
            if (signal?.aborted) return;
            setEmployeeEmails(filtered);
        } catch (err) {
            if (err?.name === 'AbortError' || signal?.aborted) return;
            console.error('Failed to fetch employee emails:', err);
            // Strict fallback filter
            const filtered = filterEmailsForEmployee(mockEmails, targetEmp);
            if (signal?.aborted) return;
            setEmployeeEmails(filtered);
        } finally {
            if (!signal?.aborted) {
                setIsEmailsLoading(false);
            }
        }
    };

    // Trigger backend sync refresh for this specific employee then re-fetch
    const syncEmployeeEmails = async (target) => {
        const targetEmp = (target && target.employeeId !== undefined && !target.id)
            ? { id: target.employeeId, _id: target.employeeId, email: target.email, ...target }
            : target;

        if (!targetEmp || !targetEmp.email) return;

        setIsEmailsLoading(true);

        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (user?.id) headers['x-user-id'] = String(user.id);

            const empIdParam = targetEmp._id || targetEmp.id || targetEmp.employeeId;
            if (empIdParam) headers['x-employee-id'] = String(empIdParam);
            if (targetEmp.email) {
                headers['x-employee-email'] = String(targetEmp.email);
                headers['x-email'] = String(targetEmp.email);
            }

            await fetch('/api/sync/refresh', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    employeeId: empIdParam,
                    email: targetEmp.email,
                    employeeEmail: targetEmp.email
                })
            }).catch(e => console.warn('Sync trigger skipped or failed:', e));
        } catch (e) {
            console.warn('Sync refresh error:', e);
        } finally {
            await fetchEmployeeEmails(targetEmp);
        }
    };

    // Reactive Re-fetching when selected employee changes
    useEffect(() => {
        const controller = new AbortController();

        // Immediately clear stale data so switching between employees does NOT leak previous data
        setEmployeeEmails([]);
        setDashboardCardFilter('all');
        setDashboardPreviewSearch('');
        setEmailSearchQuery('');

        if (emp && emp.email) {
            fetchEmployeeEmails(emp, controller.signal);
        } else {
            setIsEmailsLoading(false);
        }

        return () => {
            controller.abort();
        };
    }, [selectedEmployeeIndex, emp?.id, emp?.email]);

    // Helpers to classify emails consistently
    const isMailRead = m => !!(m.read || m.is_read || m.isRead);
    const isMailDraft = m => (m.folder === 'drafts' || m.folder === 'draft' || !!m.isDraft);
    const isMailAction = m => !!(m.action || m.is_action || m.isAction);
    const isMailReplied = m => !!(m.replied || m.is_replied || m.isReplied);

    // Dynamically recalculate Dashboard metrics strictly from selected employee's emails
    const totalCount = employeeEmails.length;
    const readCount = employeeEmails.filter(isMailRead).length;
    const unreadCount = employeeEmails.filter(m => !isMailRead(m)).length;
    const draftCount = employeeEmails.filter(isMailDraft).length;
    const actionCount = employeeEmails.filter(isMailAction).length;
    const replyCount = employeeEmails.filter(isMailReplied).length;

    const readPercent = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;
    const unreadPercent = totalCount > 0 ? Math.round((unreadCount / totalCount) * 100) : 0;
    const draftPercent = totalCount > 0 ? Math.round((draftCount / totalCount) * 100) : 0;
    const actionPercent = totalCount > 0 ? Math.round((actionCount / totalCount) * 100) : 0;
    const replyPercent = totalCount > 0 ? Math.round((replyCount / totalCount) * 100) : 0;

    const dashboardFilteredEmails = employeeEmails.filter(m => {
        if (dashboardCardFilter === 'read' && !isMailRead(m)) return false;
        if (dashboardCardFilter === 'unread' && isMailRead(m)) return false;
        if (dashboardCardFilter === 'draft' && !isMailDraft(m)) return false;
        if (dashboardCardFilter === 'action' && !isMailAction(m)) return false;
        if (dashboardCardFilter === 'reply' && !isMailReplied(m)) return false;

        if (dashboardPreviewSearch) {
            const q = dashboardPreviewSearch.toLowerCase();
            const haystack = `${m.sender || ''} ${m.subject || ''} ${m.preview || ''} ${m.emailNo || ''}`.toLowerCase();
            if (!haystack.includes(q)) return false;
        }
        return true;
    });

    const filteredEmpEmails = employeeEmails.filter(m => {
        if (!emailSearchQuery) return true;
        const q = emailSearchQuery.toLowerCase();
        return (m.subject || '').toLowerCase().includes(q) ||
            (m.sender || '').toLowerCase().includes(q) ||
            (m.preview || '').toLowerCase().includes(q) ||
            (m.emailNo || '').toLowerCase().includes(q) ||
            (m.to || m.to_address || '').toLowerCase().includes(q);
    });

    const currentCover = useMemo(() => {
        if (!emp) return null;
        if (emp.coverImage) return emp.coverImage;
        try {
            const storedCovers = JSON.parse(localStorage.getItem('safemailz_employee_covers') || '{}');
            return (emp.id && storedCovers[String(emp.id)]) || (emp.email && storedCovers[String(emp.email).toLowerCase()]) || null;
        } catch {
            return null;
        }
    }, [emp, employees]);

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
            } catch (e) { }
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

    useEffect(() => {
        let isMounted = true;
        const fetchBackendProjects = async () => {
            try {
                setIsProjectsLoading(true);
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const token = localStorage.getItem('token');
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                if (user?.id) headers['x-user-id'] = user.id;
                if (user?.org_id || user?.organization_id) headers['x-org-id'] = user.org_id || user.organization_id;

                const res = await fetch('/api/projects', { headers });
                if (res.ok && isMounted) {
                    const data = await res.json();
                    if (data.projects && Array.isArray(data.projects) && data.projects.length > 0) {
                        setEmployeeProjects(prev => {
                            const merged = [...prev];
                            data.projects.forEach(bp => {
                                const exists = merged.some(p => p.id === bp.id || (p.projectName === bp.projectName && p.projectEmailId === bp.projectEmailId));
                                if (!exists) {
                                    merged.push(bp);
                                }
                            });
                            localStorage.setItem('safemailzEmployeeProjects', JSON.stringify(merged));
                            return merged;
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to fetch projects from backend:', err);
            } finally {
                if (isMounted) setIsProjectsLoading(false);
            }
        };
        fetchBackendProjects();
        return () => { isMounted = false; };
    }, []);

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

    const isProjectAssignedToEmployee = (project, employee) => {
        if (!project || !employee) return false;
        const empEmail = (employee.email || '').toLowerCase().trim();
        const empFullName = `${employee.firstName || ''} ${employee.lastName || ''}`.toLowerCase().trim();
        const empFirst = (employee.firstName || '').toLowerCase().trim();
        const projEmpName = (project.employeeName || '').toLowerCase().trim();
        const projEmpEmail = (project.employeeEmail || '').toLowerCase().trim();
        const projLeader = (project.leader || project.projectLeader || '').toLowerCase().trim();
        const projEmpId = project.employeeId != null ? String(project.employeeId) : null;
        const empId = employee.id != null ? String(employee.id) : null;

        if (projEmpId && empId && projEmpId === empId) return true;
        if (empEmail && projEmpEmail && projEmpEmail === empEmail) return true;
        if (empEmail && projEmpName.includes(empEmail)) return true;
        if (empFullName && projEmpName.includes(empFullName)) return true;
        if (empFirst && projEmpName.includes(empFirst)) return true;
        if (empEmail && projLeader.includes(empEmail)) return true;
        if (empFullName && projLeader === empFullName) return true;

        return false;
    };

    const getProjectEmailNo = (project) => {
        if (!project) return '—';
        if (project.emailNo) return String(project.emailNo);
        if (project.emailNumber) return String(project.emailNumber);
        if (project.code) return String(project.code);
        if (project.id) {
            const digits = String(project.id).replace(/\D/g, '');
            if (digits.length >= 5) return digits.slice(-5);
            if (digits.length > 0) return digits.padStart(5, '0');
            let hash = 0;
            const str = String(project.id);
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash |= 0;
            }
            return String((Math.abs(hash) % 90000) + 10000);
        }
        return '—';
    };

    const maskEmailAddress = (email) => {
        if (!email || email === '—') return '—';
        const parts = email.split('@');
        if (parts.length === 2) {
            return `******@${parts[1]}`;
        }
        return '******';
    };

    const allAvailableProjects = useMemo(() => {
        const list = [...employeeProjects];
        if (globalProjects && Array.isArray(globalProjects)) {
            globalProjects.forEach(gp => {
                const alreadyInList = list.some(
                    p => p.id === gp.id ||
                    (p.projectName && gp.projectName && p.projectName.toLowerCase() === gp.projectName.toLowerCase() &&
                     p.projectEmailId && gp.projectEmailId && p.projectEmailId.toLowerCase() === gp.projectEmailId.toLowerCase())
                );
                if (!alreadyInList) {
                    list.push(gp);
                }
            });
        }
        return list;
    }, [employeeProjects, globalProjects]);

    const assignedEmployeeProjects = useMemo(() => {
        if (!emp) return [];
        return allAvailableProjects.filter(project => isProjectAssignedToEmployee(project, emp));
    }, [allAvailableProjects, emp]);

    const filteredEmployeeProjects = useMemo(() => {
        return assignedEmployeeProjects.filter(project => {
            if (!projectSearchQuery.trim()) return true;
            const query = projectSearchQuery.trim().toLowerCase();
            return `${project.projectName || ''} ${project.client || ''} ${project.leader || ''} ${project.employeeName || ''} ${project.projectEmailId || ''}`.toLowerCase().includes(query);
        });
    }, [assignedEmployeeProjects, projectSearchQuery]);

    // Check if permission to view real email IDs is granted
    const canViewRealEmail = permissions?.viewRealEmailIds !== false;

    // Derive real rows strictly from the selected employee's real Projects & Clients
    const realEmailIdRows = useMemo(() => {
        if (!emp || !assignedEmployeeProjects?.length) return [];

        return assignedEmployeeProjects.map((project) => {
            // Match linked client from real clients list if available
            const matchedClient = (clients || []).find((c) => {
                const cId = c.clientId || c.clientCode || c.id;
                const pClientId = project.clientId || project.clientCode || project.client;
                if (pClientId && (c.id === pClientId || c.clientId === pClientId || c.client_id === pClientId)) return true;
                if (project.client && (c.email?.toLowerCase() === project.client.toLowerCase() || c.name?.toLowerCase() === project.client.toLowerCase())) return true;
                if (project.clientName && (c.name?.toLowerCase() === project.clientName.toLowerCase() || c.email?.toLowerCase() === project.clientName.toLowerCase())) return true;
                return false;
            });

            // Show client's real email ID (not project email ID)
            const clientRealEmail =
                matchedClient?.email ||
                (project.client && project.client.includes('@') ? project.client : null) ||
                project.clientEmail ||
                project.projectEmailId ||
                project.emailId ||
                project.email ||
                '—';

            const emailNo = getProjectEmailNo(project);
            const rawSignature = project.signature || emp.signature || matchedClient?.signature || (fullName ? `Best regards, ${fullName}` : '—');
            const rowStatus = (project.status && project.status !== 'filled')
                ? project.status
                : (emp.status && emp.status !== 'filled' ? emp.status : 'Active');

            return {
                id: project.id || project._id || `email-row-${emailNo}`,
                rawEmail: clientRealEmail,
                realEmailId: clientRealEmail, // Real unmasked client email ID in admin panel
                clientId:
                    matchedClient?.clientId ||
                    matchedClient?.clientCode ||
                    matchedClient?.client_id ||
                    matchedClient?.name ||
                    project.client ||
                    project.clientName ||
                    '—',
                projectLeader: project.projectLeader || project.leader || '—',
                projectName: project.projectName || project.name || '—',
                emailNo: emailNo,
                rawSignature,
                signature: rawSignature, // Real unmasked signature in admin panel
                status: rowStatus
            };
        });
    }, [emp, assignedEmployeeProjects, clients, fullName]);

    const filteredEmailIdRecords = useMemo(() => {
        if (!emailIdsSearchQuery.trim()) return realEmailIdRows;
        const q = emailIdsSearchQuery.trim().toLowerCase();
        return realEmailIdRows.filter(r => {
            return (
                (r.realEmailId || '').toLowerCase().includes(q) ||
                (r.rawEmail || '').toLowerCase().includes(q) ||
                (r.clientId || '').toLowerCase().includes(q) ||
                (r.projectLeader || '').toLowerCase().includes(q) ||
                (r.projectName || '').toLowerCase().includes(q) ||
                String(r.emailNo || '').toLowerCase().includes(q)
            );
        });
    }, [realEmailIdRows, emailIdsSearchQuery]);


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
                        <button className="profile-hamburger" type="button" onClick={toggleSidebar} aria-label={sidebarCollapsed ? "Show employee sidebar" : "Hide employee sidebar"} title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"} aria-expanded={!sidebarCollapsed} aria-controls="employeesSidebar">
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

                        {canMakeAdmin && (
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
                        )}

                        <button
                            className={`profile-tab ${activeSubtab === 'clients' ? 'active' : ''}`}
                            type="button"
                            onClick={() => setActiveSubtab('clients')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            Clients
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
                        <div className="profile-tab-view">
                            {/* Profile Cover Banner */}
                            <div
                                className="profile-cover"
                                style={{
                                    position: 'relative',
                                    height: '140px',
                                    backgroundColor: '#EAF2F8',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    overflow: 'visible'
                                }}
                            >
                                {/* Cover Background Image or Preset Gradient */}
                                <div
                                    className="profile-cover-bg"
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        overflow: 'hidden',
                                        backgroundColor: '#EAF2F8',
                                        zIndex: 1,
                                        transition: 'background 0.3s ease'
                                    }}
                                >
                                    {currentCover ? (
                                        currentCover.startsWith('linear-gradient') || currentCover.startsWith('#') ? (
                                            <div style={{ width: '100%', height: '100%', background: currentCover, transition: 'background 0.3s ease' }} />
                                        ) : (
                                            <img
                                                src={currentCover}
                                                alt="Cover"
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    objectPosition: 'center',
                                                    display: 'block'
                                                }}
                                            />
                                        )
                                    ) : null}
                                    <div className="profile-cover-overlay" />
                                </div>

                                {/* Hidden File Input */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/png,image/jpeg,image/webp"
                                    style={{ display: 'none' }}
                                    onChange={handleCoverFileUpload}
                                />

                                {/* Edit Cover Action & Dropdown Popover */}
                                <div ref={coverMenuRef} style={{ position: 'absolute', top: '1rem', right: '1.25rem', zIndex: 20 }}>
                                    <button
                                        className="btn-edit-cover"
                                        type="button"
                                        disabled={isUploadingCover}
                                        onClick={() => setIsCoverMenuOpen(prev => !prev)}
                                        aria-expanded={isCoverMenuOpen}
                                        aria-label="Edit cover"
                                    >
                                        {isUploadingCover ? (
                                            <>
                                                <svg
                                                    style={{ animation: 'spin 1s linear infinite' }}
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" stroke="currentColor"></circle>
                                                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path>
                                                </svg>
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 20h9"></path>
                                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                                </svg>
                                                <span>Edit cover</span>
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    style={{
                                                        marginLeft: '2px',
                                                        transform: isCoverMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                                        transition: 'transform 0.15s ease'
                                                    }}
                                                >
                                                    <polyline points="6 9 12 15 18 9"></polyline>
                                                </svg>
                                            </>
                                        )}
                                    </button>

                                    {/* Dropdown Popover */}
                                    {isCoverMenuOpen && (
                                        <div
                                            className="profile-cover-popover"
                                            style={{
                                                position: 'absolute',
                                                top: 'calc(100% + 8px)',
                                                right: 0,
                                                width: '270px',
                                                background: '#ffffff',
                                                borderRadius: '12px',
                                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                                                border: '1px solid #e2e8f0',
                                                padding: '8px',
                                                zIndex: 50,
                                                animation: 'fadeIn 0.15s ease-out'
                                            }}
                                        >
                                            {/* 1. Upload Cover Image */}
                                            <button
                                                className="cover-popover-upload-btn"
                                                type="button"
                                                onClick={() => {
                                                    setIsCoverMenuOpen(false);
                                                    fileInputRef.current?.click();
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    width: '100%',
                                                    padding: '9px 12px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    transition: 'background 0.15s ease'
                                                }}
                                            >
                                                <div
                                                    className="cover-popover-upload-icon"
                                                    style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '6px',
                                                        background: '#eff6ff',
                                                        color: '#2563eb',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                        <polyline points="21 15 16 10 5 21"></polyline>
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="cover-popover-item-title" style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1e293b' }}>Upload cover image</div>
                                                    <div className="cover-popover-item-sub" style={{ fontSize: '0.72rem', color: '#64748b' }}>JPG, PNG or WebP (max 5MB)</div>
                                                </div>
                                            </button>

                                            {/* Divider */}
                                            <div className="cover-popover-divider" style={{ height: '1px', background: '#f1f5f9', margin: '8px 4px' }} />

                                            {/* 2. Choose Preset Theme */}
                                            <div style={{ padding: '4px 8px 6px 8px' }}>
                                                <div className="cover-popover-section-title" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', marginBottom: '8px' }}>
                                                    Preset Themes
                                                </div>
                                                <div
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                                        gap: '8px'
                                                    }}
                                                >
                                                    {PRESET_COVERS.map((preset) => {
                                                        const isSelected = currentCover === preset.style;
                                                        return (
                                                            <button
                                                                key={preset.id}
                                                                type="button"
                                                                title={preset.name}
                                                                onClick={() => handleSelectPresetCover(preset)}
                                                                style={{
                                                                    position: 'relative',
                                                                    height: '42px',
                                                                    borderRadius: '6px',
                                                                    background: preset.style,
                                                                    border: isSelected ? '2px solid #2563eb' : '1px solid rgba(0,0,0,0.1)',
                                                                    boxShadow: isSelected ? '0 0 0 2px rgba(37,99,235,0.3)' : 'none',
                                                                    cursor: 'pointer',
                                                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                                                    padding: 0,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    overflow: 'hidden'
                                                                }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                                            >
                                                                {isSelected && (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>
                                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* 3. Remove Cover Option */}
                                            {currentCover && (
                                                <>
                                                    <div className="cover-popover-divider" style={{ height: '1px', background: '#f1f5f9', margin: '8px 4px' }} />
                                                    <button
                                                        className="cover-popover-remove-btn"
                                                        type="button"
                                                        onClick={handleRemoveCover}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px',
                                                            width: '100%',
                                                            padding: '8px 12px',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            textAlign: 'left',
                                                            color: '#ef4444',
                                                            transition: 'background 0.15s ease'
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                                        </svg>
                                                        <span style={{ fontSize: '0.84rem', fontWeight: 500 }}>Remove cover</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Profile Avatar */}
                                <div className="profile-avatar-large" style={{ zIndex: 10 }}>
                                    <span id="profileAvatarInitial">{initial}</span>
                                </div>
                            </div>

                            <div className="profile-details-section">
                                {/* Employee Identity Summary Bar */}
                                <div className="profile-identity-bar">
                                    <div className="profile-identity-meta">
                                        <div className="profile-identity-title-row">
                                            <h2 className="profile-identity-name">{fullName || 'Employee'}</h2>
                                            <span className={`profile-status-pill ${permissions?.blocked ? 'is-blocked' : emp?.isPending ? 'is-pending' : 'is-active'}`}>
                                                <span className="status-dot" />
                                                {permissions?.blocked ? 'Blocked' : emp?.isPending ? 'Pending Invite' : 'Active'}
                                            </span>
                                            <span className="profile-role-pill">
                                                {emp?.role || 'Employee'}
                                            </span>
                                        </div>
                                        <p className="profile-identity-email">{emp?.email || 'No email assigned'}</p>
                                    </div>
                                    {emp?.isPending && (
                                        <div className="profile-identity-actions">
                                            <button
                                                type="button"
                                                onClick={() => resendInvite(selectedEmployeeIndex)}
                                                className="btn-send-invite"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                                    <polyline points="22,6 12,13 2,6"></polyline>
                                                </svg>
                                                Send Invite Email
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Elevated Card Container for Profile Information */}
                                <div className="profile-details-card">
                                    <div className="profile-card-header">
                                        <div>
                                            <h3>Profile Information</h3>
                                            <p className="profile-subtitle">Changes are saved automatically</p>
                                        </div>
                                        <span className="profile-autosave-badge">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                            Auto-save enabled
                                        </span>
                                    </div>

                                    <div className="profile-form profile-form-grid">
                                        <div className="form-row">
                                            <label htmlFor="profFirstName">First Name</label>
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
                                            <label htmlFor="profEmail">Email Address</label>
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
                                            <label htmlFor="profJoined">Joined on</label>
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
                                            <label htmlFor="profDob">Date of birth</label>
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
                                                        type="button"
                                                        onClick={() => resendInvite(selectedEmployeeIndex)}
                                                        className="btn-send-invite"
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
                                            <label>Work Mode</label>
                                            <div className="input-with-icon">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                                                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                                                </svg>
                                                <input type="text" defaultValue={emp.workMode || 'Remote'} readOnly />
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <label>Work Location</label>
                                            <div className="input-with-icon">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                                    <circle cx="12" cy="10" r="3"></circle>
                                                </svg>
                                                <input type="text" defaultValue={emp.workLocation || 'Gilgit Baltistan, Pakistan'} readOnly />
                                            </div>
                                        </div>

                                        <div className="form-row form-row-full">
                                            <label>Work Days</label>
                                            <div className="work-days">
                                                {[
                                                    { short: 'M', full: 'Mon' },
                                                    { short: 'T', full: 'Tue' },
                                                    { short: 'W', full: 'Wed' },
                                                    { short: 'T', full: 'Thu' },
                                                    { short: 'F', full: 'Fri' },
                                                    { short: 'S', full: 'Sat' },
                                                    { short: 'S', full: 'Sun' }
                                                ].map((day, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`work-day ${idx < 6 ? 'active' : ''}`}
                                                        title={day.full}
                                                    >
                                                        {day.short}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="form-row form-row-full">
                                            <label>Short bio</label>
                                            <textarea
                                                className="bio-textarea"
                                                defaultValue={emp.bio || 'Untoward person'}
                                                maxLength={280}
                                                onChange={(e) => updateProfile(selectedEmployeeIndex, 'bio', e.target.value)}
                                            />
                                            <div className="char-count">
                                                {String(emp.bio || 'Untoward person').length} / 280 characters
                                            </div>
                                        </div>
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
                                    <span className="mail-progress" style={{ '--percent': totalCount > 0 ? 100 : 0 }} data-percent={totalCount > 0 ? 100 : 0}>
                                        <span>{totalCount > 0 ? '100%' : '0%'}</span>
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
                                        <button className="mail-preview-toolbar-btn" type="button" title="Refresh" onClick={() => { setDashboardPreviewSearch(''); if (emp) syncEmployeeEmails(emp); }}>
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
                                            <span>{isEmailsLoading ? 'Loading emails...' : (totalCount === 0 ? 'No emails synced for this employee' : 'No matching emails to preview')}</span>
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
                        <div className="emp-emails-wrapper" style={{ padding: '1.5rem 2rem' }}>
                            {/* 1. Section Header & Search Area */}
                            <div className="emp-emails-header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>
                                        Employee Emails
                                    </h3>
                                    <span
                                        className="emp-emails-counter-badge bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 text-xs font-medium"
                                        style={{
                                            backgroundColor: '#EFF6FF',
                                            color: '#1D4ED8',
                                            borderRadius: '9999px',
                                            padding: '2px 10px',
                                            fontSize: '0.75rem',
                                            fontWeight: 500,
                                            border: '1px solid rgba(191, 219, 254, 0.7)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minWidth: '22px'
                                        }}
                                    >
                                        {filteredEmpEmails.length}
                                    </span>
                                </div>

                                {/* Search Bar & Sync Button */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div className="emp-emails-search-box" style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            style={{
                                                position: 'absolute',
                                                left: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                width: '15px',
                                                height: '15px',
                                                color: '#94A3B8',
                                                pointerEvents: 'none'
                                            }}
                                        >
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        </svg>
                                        <input
                                            type="text"
                                            placeholder="Search emails..."
                                            value={emailSearchQuery}
                                            onChange={(e) => setEmailSearchQuery(e.target.value)}
                                            className="emp-emails-search-input border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                                            style={{
                                                width: '100%',
                                                padding: '0.55rem 0.85rem 0.55rem 2.25rem',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '8px',
                                                fontSize: '0.875rem',
                                                color: '#1E293B',
                                                backgroundColor: '#FFFFFF',
                                                outline: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        title="Sync & Refresh emails"
                                        onClick={() => { if (emp) syncEmployeeEmails(emp); }}
                                        disabled={isEmailsLoading}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '0.55rem 0.95rem',
                                            border: '1px solid #E2E8F0',
                                            borderRadius: '8px',
                                            backgroundColor: '#FFFFFF',
                                            color: '#475569',
                                            fontSize: '0.85rem',
                                            fontWeight: 500,
                                            cursor: isEmailsLoading ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <svg
                                            style={{ animation: isEmailsLoading ? 'spin 1s linear infinite' : 'none' }}
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M21.5 2v6h-6"></path>
                                            <path d="M2.5 22v-6h6"></path>
                                            <path d="M2 11.5a10 10 0 0 1 18.8-4.3"></path>
                                            <path d="M22 12.5a10 10 0 0 1-18.8 4.2"></path>
                                        </svg>
                                        <span>{isEmailsLoading ? 'Syncing...' : 'Sync'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* 2. Isolated Email List Container Wrapper */}
                            <div
                                className="emp-emails-card-container rounded-xl border border-gray-200/80 bg-white shadow-sm overflow-hidden"
                                style={{
                                    borderRadius: '12px',
                                    border: '1px solid rgba(226, 232, 240, 0.8)',
                                    backgroundColor: '#FFFFFF',
                                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{ overflowX: 'auto', width: '100%' }}>
                                    <table
                                        className="emp-emails-modern-table"
                                        style={{
                                            width: '100%',
                                            borderCollapse: 'collapse',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <thead>
                                            <tr
                                                className="emp-emails-header-row text-xs font-semibold tracking-wider text-gray-500 bg-gray-50/60 py-3 px-4 rounded-t-lg"
                                                style={{
                                                    backgroundColor: 'rgba(249, 250, 251, 0.75)',
                                                    borderBottom: '1px solid #F1F5F9'
                                                }}
                                            >
                                                <th style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    letterSpacing: '0.05em',
                                                    color: '#64748B',
                                                    textTransform: 'uppercase',
                                                    padding: '12px 16px',
                                                    textAlign: 'left',
                                                    width: '28%',
                                                    minWidth: '220px'
                                                }}>
                                                    Sender
                                                </th>
                                                <th style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    letterSpacing: '0.05em',
                                                    color: '#64748B',
                                                    textTransform: 'uppercase',
                                                    padding: '12px 16px',
                                                    textAlign: 'left',
                                                    width: '44%'
                                                }}>
                                                    Subject & Preview
                                                </th>
                                                <th style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    letterSpacing: '0.05em',
                                                    color: '#64748B',
                                                    textTransform: 'uppercase',
                                                    padding: '12px 16px',
                                                    textAlign: 'left',
                                                    width: '14%'
                                                }}>
                                                    Email No.
                                                </th>
                                                <th style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    letterSpacing: '0.05em',
                                                    color: '#64748B',
                                                    textTransform: 'uppercase',
                                                    padding: '12px 16px',
                                                    textAlign: 'right',
                                                    width: '14%'
                                                }}>
                                                    Date
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredEmpEmails.length === 0 ? (
                                                <tr className="emp-emails-empty-state">
                                                    <td colSpan={4} style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#64748B' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                                            <div className="emp-emails-empty-icon" style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.25rem' }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                                                    <rect width="20" height="16" x="2" y="4" rx="2" />
                                                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                                                </svg>
                                                            </div>
                                                            <div className="emp-emails-empty-title" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                                                                {isEmailsLoading ? 'Loading emails...' : (emailSearchQuery ? 'No matching emails found' : 'No emails synced for this employee')}
                                                            </div>
                                                            <div className="emp-emails-empty-desc" style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                                                {isEmailsLoading ? 'Fetching employee email records...' : (emailSearchQuery ? `No results for "${emailSearchQuery}". Clear search to view all emails.` : 'Emails received or sent by this employee will appear here once synced.')}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredEmpEmails.map((mail, idx) => {
                                                    const senderName = mail.sender || 'Unknown';
                                                    const initial = (senderName.trim().charAt(0) || 'U').toUpperCase();
                                                    return (
                                                        <tr
                                                            key={mail.id || idx}
                                                            className="emp-email-row hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-gray-100 last:border-none"
                                                            style={{
                                                                cursor: 'pointer',
                                                                borderBottom: idx === filteredEmpEmails.length - 1 ? 'none' : '1px solid #F1F5F9'
                                                            }}
                                                        >
                                                            {/* 1. SENDER */}
                                                            <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'left' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                    {/* Avatar */}
                                                                    <div
                                                                        className="emp-sender-avatar w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm flex items-center justify-center"
                                                                        style={{
                                                                            width: '36px',
                                                                            height: '36px',
                                                                            minWidth: '36px',
                                                                            borderRadius: '9999px',
                                                                            background: 'linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%)',
                                                                            color: '#1D4ED8',
                                                                            fontWeight: 600,
                                                                            fontSize: '0.875rem',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            boxShadow: 'inset 0 0 0 1px rgba(191, 219, 254, 0.6)'
                                                                        }}
                                                                    >
                                                                        {initial}
                                                                    </div>
                                                                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                                                        <div className="font-medium text-gray-900 text-sm" style={{ fontWeight: 500, color: '#111827', fontSize: '0.875rem', lineHeight: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                            {senderName}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500" style={{ color: '#6B7280', fontSize: '0.75rem', lineHeight: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                            {mail.senderEmail || `${(mail.sender || 'unknown').toLowerCase().replace(/\\s+/g, '')}@example.com`}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* 2. SUBJECT & PREVIEW */}
                                                            <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'left' }}>
                                                                <div className="font-medium text-gray-800 text-sm" style={{ fontWeight: 500, color: '#1F2937', fontSize: '0.875rem', lineHeight: '1.25rem' }}>
                                                                    {mail.subject || '(No Subject)'}
                                                                </div>
                                                                <div className="text-xs text-gray-500 truncate max-w-md" style={{ color: '#6B7280', fontSize: '0.75rem', lineHeight: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '440px', marginTop: '2px' }}>
                                                                    {mail.preview || ''}
                                                                </div>
                                                            </td>

                                                            {/* 3. EMAIL NO. */}
                                                            <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'left' }}>
                                                                <span
                                                                    className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200/50"
                                                                    style={{
                                                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
                                                                        fontSize: '0.75rem',
                                                                        color: '#4B5563',
                                                                        backgroundColor: '#F3F4F6',
                                                                        padding: '2px 8px',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid rgba(229, 231, 235, 0.8)',
                                                                        display: 'inline-block',
                                                                        fontWeight: 500
                                                                    }}
                                                                >
                                                                    {mail.emailNo || mail.id || '-'}
                                                                </span>
                                                            </td>

                                                            {/* 4. DATE / TIME */}
                                                            <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                                                                <span className="text-xs font-medium text-gray-500" style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6B7280', whiteSpace: 'nowrap' }}>
                                                                    {formatMailPreviewDate(mail.date)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* SUBTAB 4: MANAGE PERMISSIONS & ACCESS CONTROL (Exact Screenshot Match) */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {activeSubtab === 'manage' && canMakeAdmin && (
                        <div className="mail-manage-panel" id="mailManagePanel" style={{ display: 'block', padding: '1.5rem 2rem', overflowY: 'auto' }}>
                            {/* 1. Admin Access Control */}
                            <section className="email-management-card" style={{ marginBottom: '1.5rem' }}>
                                <h2>Admin Access Control</h2>
                                <p>Manage the administrative access for this employee. Granting admin access allows them to manage users, projects, and billing.</p>

                                <div className="admin-access-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid #e2e8f0' }}>
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
                                            className={`toggle-switch ${permissions.sendEmails ? 'is-on' : ''} ${togglingPerm.sendEmails ? 'is-loading' : ''}`}
                                            type="button"
                                            role="switch"
                                            disabled={!!togglingPerm.sendEmails}
                                            aria-checked={permissions.sendEmails}
                                            style={togglingPerm.sendEmails ? { opacity: 0.5, cursor: 'wait' } : {}}
                                            onClick={() => handleTogglePermission('sendEmails', !permissions.sendEmails)}
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
                                            className={`toggle-switch ${permissions.replyEmails ? 'is-on' : ''} ${togglingPerm.replyEmails ? 'is-loading' : ''}`}
                                            type="button"
                                            role="switch"
                                            disabled={!!togglingPerm.replyEmails}
                                            aria-checked={permissions.replyEmails}
                                            style={togglingPerm.replyEmails ? { opacity: 0.5, cursor: 'wait' } : {}}
                                            onClick={() => handleTogglePermission('replyEmails', !permissions.replyEmails)}
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
                                            className={`toggle-switch ${permissions.viewRealEmailIds ? 'is-on' : ''} ${togglingPerm.viewRealEmailIds ? 'is-loading' : ''}`}
                                            type="button"
                                            role="switch"
                                            disabled={!!togglingPerm.viewRealEmailIds}
                                            aria-checked={permissions.viewRealEmailIds}
                                            style={togglingPerm.viewRealEmailIds ? { opacity: 0.5, cursor: 'wait' } : {}}
                                            onClick={() => handleTogglePermission('viewRealEmailIds', !permissions.viewRealEmailIds)}
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

                                    {/* 7. Reset Employee Password (Owner / Org Owner only) */}
                                    {((currentUser?.role?.toUpperCase() === 'OWNER' || currentUser?.role?.toLowerCase() === 'org_owner') && selectedEmployee && selectedEmployee.status !== 'empty') && (
                                        <div className="permission-card">
                                            <span className="permission-icon">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="7.5" cy="15.5" r="5.5"></circle>
                                                    <path d="m21 2-9.6 9.6"></path>
                                                    <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
                                                </svg>
                                            </span>
                                            <span className="permission-copy">
                                                <strong>Reset Employee Password</strong>
                                                <span>Reset password, force password change on next login, or revoke active sessions.</span>
                                            </span>
                                            <button
                                                className="btn-outline-blue"
                                                type="button"
                                                onClick={() => setIsResetPasswordModalOpen(true)}
                                            >
                                                Reset Password
                                            </button>
                                        </div>
                                    )}
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
                    {/* SUBTAB: CLIENTS (Left of Projects) */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {activeSubtab === 'clients' && (
                        <div className="mail-projects-panel mail-clients-panel" id="mailClientsPanel" style={{ display: 'block', padding: '1.5rem 2rem', overflowY: 'auto' }}>
                            <EmployeeClientsTab
                                selectedEmployee={selectedEmployee || emp}
                                clients={clients}
                            />
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
                                        Total projects - <span id="projectTotalCount">{assignedEmployeeProjects.length}</span>
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
                        <div className="mail-email-ids-panel" id="mailEmailIdsPanel" style={{ display: 'block', padding: '1.5rem 2rem', overflowY: 'auto' }}>
                            <div className="email-ids-header">
                                <h2 className="email-ids-title">
                                    Email IDs Management
                                </h2>
                                <p className="email-ids-subtitle">
                                    Manage client email IDs, project details, and signatures
                                </p>
                            </div>

                            <div className="email-ids-search relative flex items-center w-full max-w-[560px]">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="email-ids-search-icon shrink-0 pointer-events-none"
                                    style={{ position: 'static', transform: 'none' }}
                                >
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <input
                                    type="text"
                                    id="emailIdsSearchInput"
                                    placeholder="Search email IDs, clients, or projects..."
                                    aria-label="Search email IDs"
                                    value={emailIdsSearchQuery}
                                    onChange={(e) => setEmailIdsSearchQuery(e.target.value)}
                                    className="flex-1 bg-transparent border-0 outline-none p-0 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                                {emailIdsSearchQuery && (
                                    <button
                                        type="button"
                                        className="btn-clear-search shrink-0"
                                        onClick={() => setEmailIdsSearchQuery('')}
                                        aria-label="Clear search"
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>

                            <div className="email-ids-table-wrap">
                                <div className="email-ids-table-accent-bar" />
                                <table className="email-ids-table">
                                    <thead>
                                        <tr>
                                            <th>Real Email ID</th>
                                            <th>Client ID</th>
                                            <th>Project Leader</th>
                                            <th>Project Name</th>
                                            <th style={{ textAlign: 'center' }}>Email No</th>
                                            <th>Signature</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="emailIdsTableBody">
                                        {(clientsLoading || isProjectsLoading) && realEmailIdRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="email-ids-empty-msg">
                                                    <div className="email-ids-loading-state">
                                                        <svg className="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                                            <path d="M12 2a10 10 0 0 1 10 10" />
                                                        </svg>
                                                        <span>Loading email IDs...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : realEmailIdRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="email-ids-empty-msg">
                                                    <p className="email-ids-empty-text">
                                                        No email IDs or projects assigned to this employee yet.
                                                    </p>
                                                </td>
                                            </tr>
                                        ) : filteredEmailIdRecords.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="email-ids-empty-msg">
                                                    <p className="email-ids-empty-text">
                                                        No email ID records found matching "{emailIdsSearchQuery}".
                                                    </p>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredEmailIdRecords.map(rec => (
                                                <tr key={rec.id} className="email-ids-row">
                                                    <td className="cell-real-email">
                                                        <div className="real-email-content">
                                                            <span className="real-email-icon-box" aria-hidden="true">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                                                                </svg>
                                                            </span>
                                                            <span className="real-email-text">{rec.realEmailId}</span>
                                                            {rec.realEmailId && rec.realEmailId !== '-' && (
                                                                <button
                                                                    type="button"
                                                                    className={`btn-copy-email ${copiedEmailId === rec.realEmailId ? 'copied' : ''}`}
                                                                    title={copiedEmailId === rec.realEmailId ? "Copied!" : "Copy Email ID"}
                                                                    aria-label="Copy Email ID"
                                                                    onClick={(e) => handleCopyEmail(e, rec.realEmailId)}
                                                                >
                                                                    {copiedEmailId === rec.realEmailId ? (
                                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                            <polyline points="20 6 9 17 4 12" />
                                                                        </svg>
                                                                    ) : (
                                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                        </svg>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="cell-secondary">
                                                        <span className="client-id-chip" title={rec.clientId}>
                                                            {rec.clientId}
                                                        </span>
                                                    </td>
                                                    <td className="cell-secondary">{rec.projectLeader}</td>
                                                    <td className="cell-secondary">{rec.projectName}</td>
                                                    <td className="cell-center">
                                                        <span className="email-no-badge">
                                                            {rec.emailNo}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="signature-chip">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="signature-chip-icon shrink-0">
                                                                <path d="M12 20h9"></path>
                                                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                                            </svg>
                                                            <span>{rec.signature}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`email-id-status-pill status-${(rec.status || 'active').toLowerCase().replace(/\s+/g, '-')}`}>
                                                            <span className="email-id-status-dot" aria-hidden="true" />
                                                            <span>{rec.status || 'Active'}</span>
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
                                    <div
                                        className="profile-avatar-large backup-avatar select-none"
                                        id="backupEmployeeAvatar"
                                        style={{
                                            position: 'relative',
                                            bottom: 'auto',
                                            left: 'auto',
                                            flexShrink: 0,
                                            zIndex: 1
                                        }}
                                    >
                                        <span id="backupEmployeeInitial">{firstInitial}</span>
                                    </div>
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

            {/* Permission update toast notification */}
            {permToast && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        zIndex: 99999,
                        background: permToast.type === 'error' ? '#ef4444' : '#10b981',
                        color: '#ffffff',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                        fontWeight: '500',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <span>{permToast.type === 'error' ? '❌' : '✅'}</span>
                    <span>{permToast.text}</span>
                </div>
            )}

            {/* Owner Reset Password Modal */}
            <OwnerResetPasswordModal
                isOpen={isResetPasswordModalOpen}
                onClose={() => setIsResetPasswordModalOpen(false)}
                employee={emp || selectedEmployee}
                currentUser={currentUser}
            />
        </div>
    );
}