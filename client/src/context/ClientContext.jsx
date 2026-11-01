import React, { createContext, useContext, useState, useEffect } from 'react';

export const ClientContext = createContext(null);

export function ClientProvider({ children }) {
    // Load authoritative data for the current session; never flash another account's cache.
    const [clients, setClients] = useState([]);
    const [loadError, setLoadError] = useState('');
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClientIndex, setEditingClientIndex] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        email: '',
        phone: ''
    });

    const [toastMsg, setToastMsg] = useState(null);
    const showToast = (msg, type = 'info') => {
        setToastMsg({ msg, type });
        setTimeout(() => setToastMsg(null), 4000);
    };

    const fetchClients = async () => {
        try {
            setLoading(true);
            setLoadError('');
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json'
            };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (user?.id) headers['x-user-id'] = user.id;
            if (user?.org_id || user?.organization_id) headers['x-org-id'] = user.org_id || user.organization_id;

            const res = await fetch('/api/clients', { headers });
            if (!res.ok) {
                throw new Error(res.status === 401
                    ? 'Your session has expired. Please sign in again.'
                    : 'Unable to load clients. Please retry.');
            }
            const data = await res.json();
            if (!Array.isArray(data.clients)) throw new Error('Unable to load clients. Please retry.');
            const assignmentHeaders = { ...headers, Authorization: `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token') || ''}` };
            const assignmentResponse = await fetch('/api/clients/assignments', { headers: assignmentHeaders });
            const assignmentData = assignmentResponse.ok ? await assignmentResponse.json() : {};
            setClients(data.clients.map(client => ({ ...client, assignedEmployeeEmails: assignmentData.assignments?.[client.id] || [] })));
        } catch (err) {
            console.error('Failed to fetch clients:', err);
            setLoadError(err.message || 'Unable to load clients. Please retry.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const filteredClients = clients.filter(c => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
            (c.displayName || '').toLowerCase().includes(q) ||
            (c.name || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.address || '').toLowerCase().includes(q) ||
            (c.phone || '').toLowerCase().includes(q) ||
            (c.clientId || '').toLowerCase().includes(q)
        );
    });

    const openAddModal = () => {
        setEditingClientIndex(null);
        setFormData({ name: '', address: '', email: '', phone: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (index) => {
        const client = filteredClients[index];
        if (!client) return;
        const actualIndex = clients.findIndex(c => c.id === client.id || c.clientId === client.clientId);
        setEditingClientIndex(actualIndex !== -1 ? actualIndex : index);
        setFormData({
            name: client.name || client.displayName || '',
            address: client.address || '',
            email: client.email || '',
            phone: client.phone || ''
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingClientIndex(null);
        setFormData({ name: '', address: '', email: '', phone: '' });
    };

    const saveClient = async () => {
        const { name, address, email, phone } = formData;
        if (!name.trim()) {
            showToast('Client name is required.', 'error');
            return;
        }

        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (user?.id) headers['x-user-id'] = user.id;
        if (user?.org_id || user?.organization_id) headers['x-org-id'] = user.org_id || user.organization_id;

        if (editingClientIndex !== null) {
            // Edit existing client
            const existing = clients[editingClientIndex];
            const updatedClient = {
                ...existing,
                name: name.trim(),
                displayName: name.trim(),
                address: address.trim(),
                email: email.trim(),
                phone: phone.trim()
            };

            try {
                const res = await fetch(`/api/clients/${existing.id}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({
                        displayName: updatedClient.displayName,
                        name: updatedClient.name,
                        email: updatedClient.email,
                        phone: updatedClient.phone,
                        address: updatedClient.address,
                        clientId: updatedClient.clientId
                    })
                });
                if (!res.ok) {
                    console.error('API update failed, saving locally');
                }
            } catch (err) {
                console.error('API update error, saving locally:', err);
            }

            setClients(prev => {
                const updated = [...prev];
                updated[editingClientIndex] = updatedClient;
                return updated;
            });
            closeModal();
        } else {
            // Generate unique client ID like "Rahul-Client-52880"
            const baseName = name.replace(/\s+/g, ' ').trim() || 'Client';
            let generatedClientId = '';
            while (true) {
                const randomNum = Math.floor(10000 + Math.random() * 90000);
                generatedClientId = `${baseName}-Client-${randomNum}`;
                if (!clients.some(c => c.clientId === generatedClientId)) break;
            }

            const newClient = {
                id: `c-${Date.now()}`,
                clientId: generatedClientId,
                displayName: name.trim(),
                name: name.trim(),
                email: email.trim(),
                address: address.trim(),
                phone: phone.trim()
            };

            try {
                const res = await fetch('/api/clients', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        displayName: newClient.displayName,
                        name: newClient.name,
                        email: newClient.email,
                        phone: newClient.phone,
                        address: newClient.address,
                        clientId: newClient.clientId
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    // Use server-assigned ID if available
                    if (data.id) newClient.id = data.id;
                    if (data.clientId) newClient.clientId = data.clientId;
                } else {
                    console.error('API create failed, saving locally');
                }
            } catch (err) {
                console.error('API create error, saving locally:', err);
            }

            setClients(prev => [newClient, ...prev]);
            closeModal();
        }
    };

    const deleteClient = async (index) => {
        const client = filteredClients[index];
        if (!client) return;
        if (window.confirm(`Are you sure you want to delete ${client.name}?`)) {
            if (client.id && client.id.startsWith('c-')) {
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const token = localStorage.getItem('token');
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                if (user?.id) headers['x-user-id'] = user.id;
                if (user?.org_id || user?.organization_id) headers['x-org-id'] = user.org_id || user.organization_id;

                try {
                    const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE', headers });
                    if (!res.ok) {
                        console.error('Failed to delete client on server');
                        showToast('Failed to delete client', 'error');
                        return;
                    }
                } catch (err) {
                    console.error('Error deleting client:', err);
                    showToast('Error deleting client', 'error');
                    return;
                }
            }
            setClients(prev => prev.filter(c => (c.id ? c.id !== client.id : c.clientId !== client.clientId)));
        }
    };

    const handleExport = () => {
        const headers = ['Client Name', 'Client Email ID', 'Address', 'Phone Number'];
        let csvContent = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n';
        let fileName = 'clients_template.csv';

        if (clients.length > 0) {
            const rows = clients.map(c => [
                `"${(c.name || '').replace(/"/g, '""')}"`,
                `"${(c.email || '').replace(/"/g, '""')}"`,
                `"${(c.address || '').replace(/"/g, '""')}"`,
                `"${(c.phone || '').replace(/"/g, '""')}"`
            ]);
            csvContent += rows.map(e => e.join(',')).join('\n');
            fileName = 'clients_export.csv';
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (event) => {
                const text = (event.target.result || '').replace(/^\uFEFF/, '');
                const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
                if (lines.length <= 1) {
                    showToast('File is empty or invalid format.', 'error');
                    return;
                }

                // Robust parser for CSV rows supporting quotes and commas inside quotes
                const parseCSVRow = (rowStr) => {
                    const result = [];
                    let insideQuote = false;
                    let entry = '';
                    for (let i = 0; i < rowStr.length; i++) {
                        const char = rowStr[i];
                        if (char === '"') {
                            if (insideQuote && rowStr[i + 1] === '"') {
                                entry += '"';
                                i++;
                            } else {
                                insideQuote = !insideQuote;
                            }
                        } else if (char === ',' && !insideQuote) {
                            result.push(entry.trim());
                            entry = '';
                        } else {
                            entry += char;
                        }
                    }
                    result.push(entry.trim());
                    return result;
                };

                // Detect headers dynamically
                const headerRow = parseCSVRow(lines[0]);
                const headerMap = {};
                headerRow.forEach((h, idx) => {
                    const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (cleanH.includes('name')) headerMap.name = idx;
                    else if (cleanH.includes('email') || cleanH.includes('mail')) headerMap.email = idx;
                    else if (cleanH.includes('phone') || cleanH.includes('mobile')) headerMap.phone = idx;
                    else if (cleanH.includes('address')) headerMap.address = idx;
                });

                const nameIdx = headerMap.name !== undefined ? headerMap.name : 0;
                const emailIdx = headerMap.email !== undefined ? headerMap.email : 1;
                const addressIdx = headerMap.address !== undefined ? headerMap.address : 2;
                const phoneIdx = headerMap.phone !== undefined ? headerMap.phone : 3;

                const newClients = [];
                for (let i = 1; i < lines.length; i++) {
                    const parts = parseCSVRow(lines[i]);
                    const name = (parts[nameIdx] || '').trim();
                    const email = (parts[emailIdx] || '').trim();
                    const address = (parts[addressIdx] || '').trim();
                    const phone = (parts[phoneIdx] || '').trim();

                    if (name || email) {
                        const baseName = name.replace(/\s+/g, '-').trim() || 'Client';
                        const randomNum = Math.floor(10000 + Math.random() * 90000);
                        const clientId = `${baseName}-Client-${randomNum}`;

                        newClients.push({
                            id: `c-${Date.now()}-${i}`,
                            clientId: clientId,
                            name: name,
                            displayName: name,
                            email: email,
                            address: address,
                            phone: phone,
                            // Send all header variations so both old and new backend endpoints succeed:
                            'Client Name': name,
                            'CLIENT NAME': name,
                            'Client Email ID': email,
                            'CLIENT EMAIL ID': email,
                            'Email': email,
                            'Address': address,
                            'ADDRESS': address,
                            'Phone No': phone,
                            'Phone Number': phone,
                            'PHONE NUMBER': phone,
                            'Client ID': clientId
                        });
                    }
                }

                if (newClients.length > 0) {
                    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                    const token = localStorage.getItem('token');
                    const headers = { 'Content-Type': 'application/json' };
                    if (token) headers['Authorization'] = `Bearer ${token}`;
                    if (user?.id) headers['x-user-id'] = String(user.id);
                    if (user?.org_id || user?.organization_id) headers['x-org-id'] = String(user.org_id || user.organization_id);

                    const replaceExisting = window.confirm("Do you want to overwrite all existing clients with this file? (Click OK to replace, Cancel to merge)");

                    // If replacing existing, also clear existing clients proactively
                    if (replaceExisting && clients.length > 0) {
                        try {
                            await Promise.all(clients.map(c => 
                                fetch(`/api/clients/${c.id}`, { method: 'DELETE', headers }).catch(() => {})
                            ));
                        } catch (e) {
                            console.error('Error clearing old clients:', e);
                        }
                    }

                    fetch('/api/clients/import', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ clients: newClients, replaceExisting })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success || !data.error) {
                            const imported = data.importedCount ?? data.imported ?? newClients.length;
                            const skipped = data.skippedCount ?? data.skipped ?? 0;
                            const errors = data.errorCount ?? data.errors ?? 0;
                            if (errors === 0) {
                                showToast(`Import complete! Imported: ${imported}${skipped > 0 ? `, Skipped: ${skipped}` : ''}`, 'success');
                            } else {
                                showToast(data.message || `Import complete. Imported: ${imported}, Errors: ${errors}`, 'success');
                            }
                            fetchClients(); // Refresh from backend
                        } else {
                            showToast(data.error || 'Failed to import clients', 'error');
                        }
                    })
                    .catch(err => {
                        console.error('Import error:', err);
                        showToast('Error importing clients', 'error');
                    });
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    return (
        <ClientContext.Provider
            value={{
                clients,
                loading,
                loadError,
                fetchClients,
                filteredClients,
                searchQuery,
                setSearchQuery,
                selectedClientId,
                setSelectedClientId,
                isModalOpen,
                editingClientIndex,
                formData,
                setFormData,
                openAddModal,
                openEditModal,
                closeModal,
                saveClient,
                deleteClient,
                handleExport,
                handleImport,
                showToast
            }}
        >
            {children}
            {toastMsg && (
                <div
                    className="client-toast-banner"
                    role="status"
                    aria-live="polite"
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: toastMsg.type === 'success' ? '#059669' : toastMsg.type === 'error' ? '#dc2626' : '#2563eb',
                        color: '#ffffff',
                        padding: '10px 18px',
                        borderRadius: '10px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.12)',
                        zIndex: 9999,
                        fontSize: '13px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        backdropFilter: 'blur(8px)',
                        animation: 'fadeUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                    }}
                >
                    {toastMsg.type === 'success' && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    )}
                    {toastMsg.type === 'error' && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    )}
                    <span>{toastMsg.msg}</span>
                </div>
            )}
        </ClientContext.Provider>
    );
}

export function useClient() {
    const context = useContext(ClientContext);
    if (!context) {
        throw new Error('useClient must be used within a ClientProvider');
    }
    return context;
}
