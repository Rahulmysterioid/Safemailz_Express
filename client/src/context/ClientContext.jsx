import React, { createContext, useContext, useState, useEffect } from 'react';

const ClientContext = createContext(null);

const DEFAULT_CLIENTS = [
    {
        id: 'c-1',
        clientId: 'Rahul-Client-52880',
        displayName: 'Rahul',
        name: 'Rahul',
        email: 'Rahul@gmail.com',
        address: 'Noida',
        phone: '8869666828'
    },
    {
        id: 'c-2',
        clientId: 'Tahul-Client-14923',
        displayName: 'Tahul',
        name: 'Tahul',
        email: 'tahul@gmail.com',
        address: 'Delhi',
        phone: '9876543210'
    },
    {
        id: 'c-3',
        clientId: 'Aman-Client-39481',
        displayName: 'Aman',
        name: 'Aman',
        email: 'aman@gmail.com',
        address: 'Gurugram',
        phone: '9123456780'
    }
];

export function ClientProvider({ children }) {
    const [clients, setClients] = useState(() => {
        const saved = localStorage.getItem('safemailzClients');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (e) {
                console.error("Error loading safemailzClients:", e);
            }
        }
        return DEFAULT_CLIENTS;
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClientIndex, setEditingClientIndex] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        email: '',
        phone: ''
    });

    // Save to localStorage whenever clients change
    useEffect(() => {
        localStorage.setItem('safemailzClients', JSON.stringify(clients));
    }, [clients]);

    // Optional API fetch
    useEffect(() => {
        const fetchClients = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const token = localStorage.getItem('token');
                const headers = {
                    'Content-Type': 'application/json'
                };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                if (user?.id) headers['x-user-id'] = user.id;
                if (user?.org_id || user?.organization_id) headers['x-org-id'] = user.org_id || user.organization_id;

                const res = await fetch('/api/clients', { headers });
                if (res.ok) {
                    const data = await res.json();
                    if (data.clients && data.clients.length > 0) {
                        setClients(data.clients);
                    }
                }
            } catch (err) {
                // Silently fallback to localStorage / default
            }
        };
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
            alert('Client name is required.');
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

    const deleteClient = (index) => {
        const client = filteredClients[index];
        if (!client) return;
        if (window.confirm(`Are you sure you want to delete ${client.name}?`)) {
            setClients(prev => prev.filter(c => (c.id ? c.id !== client.id : c.clientId !== client.clientId)));
        }
    };

    const handleExport = () => {
        if (clients.length === 0) {
            alert('No clients to export.');
            return;
        }
        const headers = ['Client ID', 'Client Name', 'Client Email ID', 'Address', 'Phone No'];
        const rows = clients.map(c => [
            `"${c.clientId || ''}"`,
            `"${c.name || ''}"`,
            `"${c.email || ''}"`,
            `"${c.address || ''}"`,
            `"${c.phone || ''}"`
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'safemailz_clients.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.xlsx,.xls';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                const lines = text.split('\n').filter(l => l.trim());
                if (lines.length <= 1) {
                    alert('File is empty or invalid format.');
                    return;
                }
                const newClients = [];
                for (let i = 1; i < lines.length; i++) {
                    const parts = lines[i].split(',').map(s => s.replace(/^"|"$/g, '').trim());
                    if (parts[1]) {
                        const randomNum = Math.floor(10000 + Math.random() * 90000);
                        newClients.push({
                            id: `c-${Date.now()}-${i}`,
                            clientId: parts[0] || `${parts[1]}-Client-${randomNum}`,
                            name: parts[1],
                            displayName: parts[1],
                            email: parts[2] || '',
                            address: parts[3] || '',
                            phone: parts[4] || ''
                        });
                    }
                }
                if (newClients.length > 0) {
                    setClients(prev => [...newClients, ...prev]);
                    alert(`Successfully imported ${newClients.length} clients!`);
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
                filteredClients,
                searchQuery,
                setSearchQuery,
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
                handleImport
            }}
        >
            {children}
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
