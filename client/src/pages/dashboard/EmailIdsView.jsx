import './EmailIdsPolish.css';
import React, { useState, useMemo, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { useClient } from '../../context/ClientContext';

const LEADER_AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)',
    'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
    'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
    'linear-gradient(135deg, #ec4899 0%, #e11d48 100%)'
];

const parseLeaderInfo = (rawLeader) => {
    if (!rawLeader || rawLeader === '-') {
        return { name: 'Unassigned', email: '', initials: 'UN' };
    }
    const str = String(rawLeader).trim();
    const match = str.match(/^([^(]+)\(([^)]+)\)$/);
    const name = (match ? match[1] : str).trim() || 'Leader';
    const email = match ? match[2].trim() : '';
    const parts = name.split(/\s+/).filter(Boolean);
    const initials = parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
    return { name, email, initials };
};

export default function EmailIdsView() {
    const projectCtx = useProject();
    const clientCtx = useClient();
    const globalProjects = projectCtx?.projects || [];
    const globalClients = clientCtx?.clients || [];

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [copiedKey, setCopiedKey] = useState(null);
    const [emailIdRecords, setEmailIdRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const storedProjects = localStorage.getItem('safemailzEmployeeProjects');
            const parsedStored = storedProjects ? JSON.parse(storedProjects) : [];
            const combined = Array.isArray(parsedStored) ? [...parsedStored] : [];

            if (Array.isArray(globalProjects) && globalProjects.length > 0) {
                globalProjects.forEach(gp => {
                    const exists = combined.some(
                        p => (p.id && gp.id && p.id === gp.id) ||
                            (p.projectName && gp.projectName &&
                                p.projectName.toLowerCase() === gp.projectName.toLowerCase() &&
                                (p.projectEmailId || '').toLowerCase() === (gp.projectEmailId || '').toLowerCase())
                    );
                    if (!exists) combined.push(gp);
                });
            }

            if (combined.length > 0) {
                const rows = combined.map((p, idx) => {
                    const matchedClient = (globalClients || []).find(c => {
                        const pClient = (p.client || p.clientId || '').toLowerCase().trim();
                        if (!pClient) return false;
                        return (
                            (c.email && c.email.toLowerCase() === pClient) ||
                            (c.clientId && c.clientId.toLowerCase() === pClient) ||
                            (c.name && c.name.toLowerCase() === pClient)
                        );
                    });

                    const realEmail = p.projectEmailId || p.emailId || p.email || p.clientEmail || matchedClient?.email || '-';
                    const clientId =
                        p.clientId ||
                        p.clientCode ||
                        matchedClient?.clientId ||
                        (p.client && p.client.includes('@') ? p.client.split('@')[0] : p.client) ||
                        `CL-${1000 + idx}`;
                    const projectLeader = p.leader || p.projectLeader || 'Yash';
                    const projectName = p.projectName || p.name || 'Main Project';
                    const emailNo = p.emailNo || p.emailNumber || (idx + 1);
                    const signature = p.signature || (p.employeeName ? `${p.employeeName.split(' ')[0]} Sign` : 'Rahul Sign');
                    const status = p.status || 'Active';

                    return {
                        id: p.id || `rec-${idx}`,
                        realEmailId: realEmail,
                        clientId,
                        projectLeader,
                        projectName,
                        emailNo,
                        signature,
                        status
                    };
                });
                setEmailIdRecords(rows);
            } else {
                setEmailIdRecords([]);
            }
        } catch (e) {
            console.error('Error loading email records:', e);
        } finally {
            setIsLoading(false);
        }
    }, [globalProjects, globalClients]);

    const handleCopyValue = (e, value, key) => {
        e.stopPropagation();
        if (!value || value === '-') return;
        try {
            navigator.clipboard?.writeText(value);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(curr => (curr === key ? null : curr)), 1800);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleExportCsv = () => {
        if (!filteredRecords.length) return;
        const headers = ['Real Email ID', 'Client ID', 'Project Leader', 'Project Name', 'Email No', 'Signature', 'Status'];
        const csvRows = [
            headers.join(','),
            ...filteredRecords.map(r =>
                [r.realEmailId, r.clientId, r.projectLeader, r.projectName, r.emailNo, r.signature, r.status]
                    .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
                    .join(',')
            )
        ];
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'safemailz-email-ids.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // KPI counts
    const stats = useMemo(() => {
        const total = emailIdRecords.length;
        const active = emailIdRecords.filter(r => (r.status || 'Active').toLowerCase() === 'active').length;
        const completed = emailIdRecords.filter(r => (r.status || '').toLowerCase() === 'completed').length;
        const pending = emailIdRecords.filter(r => ['pending', 'on hold'].includes((r.status || '').toLowerCase())).length;
        const uniqueClients = new Set(emailIdRecords.map(r => (r.clientId || '').toLowerCase()).filter(Boolean)).size;
        const signatures = emailIdRecords.filter(r => r.signature && r.signature !== '-').length;
        return { total, active, completed, pending, uniqueClients, signatures };
    }, [emailIdRecords]);

    const filteredRecords = useMemo(() => {
        return emailIdRecords.filter(r => {
            if (statusFilter !== 'all') {
                const rowStatus = (r.status || 'Active').toLowerCase();
                if (statusFilter === 'pending') {
                    if (!['pending', 'on hold'].includes(rowStatus)) return false;
                } else if (rowStatus !== statusFilter.toLowerCase()) {
                    return false;
                }
            }
            if (!searchQuery.trim()) return true;
            const q = searchQuery.trim().toLowerCase();
            return (
                (r.realEmailId || '').toLowerCase().includes(q) ||
                (r.clientId || '').toLowerCase().includes(q) ||
                (r.projectLeader || '').toLowerCase().includes(q) ||
                (r.projectName || '').toLowerCase().includes(q) ||
                String(r.emailNo || '').toLowerCase().includes(q) ||
                (r.signature || '').toLowerCase().includes(q) ||
                (r.status || '').toLowerCase().includes(q)
            );
        });
    }, [emailIdRecords, searchQuery, statusFilter]);

    const activePercent = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

    return (
        <div
            className="content-area has-table mail-email-ids-panel font-inter"
            id="emailIdsView"
            style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                flex: '1',
                minHeight: '0',
                overflowY: 'auto',
                padding: '1.75rem 2.25rem',
                boxSizing: 'border-box'
            }}
        >
            <div className="email-ids-view-inner w-full max-w-[1440px] mx-auto flex flex-col">
                {/* 1. Top Header Bar */}
                <div className="email-ids-header email-ids-header-bar flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-200/80 dark:border-[#1e2636]">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h2 className="email-ids-title text-xl font-bold text-slate-900 dark:text-slate-100 m-0 tracking-tight">
                                Email IDs Management
                            </h2>
                            <span
                                id="emailIdsCountHeader"
                                className="email-ids-count-pill bg-blue-50 dark:bg-[#132842] text-blue-600 dark:text-sky-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200/60 dark:border-sky-500/30"
                            >
                                {searchQuery || statusFilter !== 'all'
                                    ? `${filteredRecords.length} of ${emailIdRecords.length}`
                                    : emailIdRecords.length}
                            </span>
                            {statusFilter !== 'all' && (
                                <span className="email-ids-active-filter-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25">
                                    <span>Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</span>
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter('all')}
                                        className="border-0 bg-transparent text-current cursor-pointer p-0 leading-none hover:opacity-80"
                                        aria-label="Clear status filter"
                                    >
                                        &times;
                                    </button>
                                </span>
                            )}
                        </div>
                        <p className="email-ids-subtitle text-xs text-slate-500 dark:text-slate-400 m-0">
                            Search and manage client email IDs, project details, and signatures
                        </p>
                    </div>

                    {/* Right Header Quick Actions */}
                    <div className="flex items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={handleExportCsv}
                            disabled={filteredRecords.length === 0}
                            className="email-ids-export-btn h-9 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Export filtered Email IDs to CSV"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>

                {/* 2. KPI Summary Strip */}
                <div className="email-ids-kpi-grid grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5" id="emailIdsStatsRow">
                    {/* Total Email IDs */}
                    <div
                        className={`email-ids-kpi-card kpi-blue ${statusFilter === 'all' ? 'kpi-selected' : ''}`}
                        onClick={() => setStatusFilter('all')}
                        role="button"
                        tabIndex={0}
                        aria-pressed={statusFilter === 'all'}
                        onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatusFilter('all'); } }}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="email-ids-kpi-icon icon-blue">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                                </svg>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="email-ids-kpi-value">{stats.total}</span>
                                <span className="email-ids-kpi-label">Total Email IDs</span>
                            </div>
                        </div>
                        <span className="email-ids-kpi-badge badge-blue">All Routes</span>
                    </div>

                    {/* Active Routes */}
                    <div
                        className={`email-ids-kpi-card kpi-emerald ${statusFilter === 'active' ? 'kpi-selected' : ''}`}
                        onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
                        role="button"
                        tabIndex={0}
                        aria-pressed={statusFilter === 'active'}
                        onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatusFilter(statusFilter === 'active' ? 'all' : 'active'); } }}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="email-ids-kpi-icon icon-emerald">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="email-ids-kpi-value">{stats.active}</span>
                                <span className="email-ids-kpi-label">Active Routes</span>
                            </div>
                        </div>
                        <span className="email-ids-kpi-badge badge-emerald">{activePercent}%</span>
                    </div>

                    {/* Linked Clients */}
                    <div className="email-ids-kpi-card kpi-purple">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="email-ids-kpi-icon icon-purple">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="email-ids-kpi-value">{stats.uniqueClients}</span>
                                <span className="email-ids-kpi-label">Linked Clients</span>
                            </div>
                        </div>
                        <span className="email-ids-kpi-badge badge-purple">Verified</span>
                    </div>

                    {/* Active Signatures */}
                    <div className="email-ids-kpi-card kpi-amber">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="email-ids-kpi-icon icon-amber">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 20h9"></path>
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                </svg>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="email-ids-kpi-value">{stats.signatures}</span>
                                <span className="email-ids-kpi-label">Signatures Ready</span>
                            </div>
                        </div>
                        <span className="email-ids-kpi-badge badge-amber">Assigned</span>
                    </div>
                </div>

                {/* 3. Search & Filter Toolbar */}
                <div className="email-ids-toolbar flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                    {/* Search box */}
                    <div className="email-ids-search relative flex items-center w-full max-w-[540px]" style={{ marginBottom: 0 }}>
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
                            id="emailIdsSearchBoxInput"
                            placeholder="Search real email IDs, Client IDs, project leaders, email numbers..."
                            aria-label="Search email IDs"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent border-0 outline-none p-0 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="btn-clear-search shrink-0"
                                onClick={() => setSearchQuery('')}
                                aria-label="Clear search"
                                title="Clear search"
                            >
                                &times;
                            </button>
                        )}
                    </div>

                    {/* Status Segmented Filter Pills */}
                    <div className="email-ids-filter-group flex items-center gap-1.5 flex-wrap">
                        {[
                            { key: 'all', label: 'All', count: stats.total },
                            { key: 'active', label: 'Active', count: stats.active },
                            { key: 'completed', label: 'Completed', count: stats.completed },
                            { key: 'pending', label: 'Pending', count: stats.pending }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setStatusFilter(tab.key)}
                                className={`email-ids-filter-pill ${statusFilter === tab.key ? 'active' : ''}`}
                            >
                                <span>{tab.label}</span>
                                <span className="email-ids-filter-count">{tab.count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4. Data Table Card */}
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
                        <tbody id="emailIdsTabTableBody">
                            {isLoading ? (
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
                            ) : emailIdRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="email-ids-empty-msg">
                                        <div className="email-ids-empty-box">
                                            <div className="email-ids-empty-icon">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                                                </svg>
                                            </div>
                                            <p className="email-ids-empty-title">No Email IDs Configured Yet</p>
                                            <p className="email-ids-empty-text">
                                                No email IDs found. Manage projects and email IDs in the Employees or Projects tab.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="email-ids-empty-msg">
                                        <div className="email-ids-empty-box">
                                            <div className="email-ids-empty-icon">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="11" cy="11" r="8"></circle>
                                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                                </svg>
                                            </div>
                                            <p className="email-ids-empty-title">No Matching Email IDs</p>
                                            <p className="email-ids-empty-text">
                                                No email ID records found matching "{searchQuery || statusFilter}".
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    setStatusFilter('all');
                                                }}
                                                className="email-ids-reset-filter-btn"
                                            >
                                                Reset search &amp; filters
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((rec, idx) => {
                                    const leaderInfo = parseLeaderInfo(rec.projectLeader);
                                    const avatarGradient = LEADER_AVATAR_GRADIENTS[idx % LEADER_AVATAR_GRADIENTS.length];
                                    const emailCopyKey = `email_${rec.id}`;
                                    const clientCopyKey = `client_${rec.id}`;
                                    const isEmailCopied = copiedKey === emailCopyKey;
                                    const isClientCopied = copiedKey === clientCopyKey;
                                    const statusSlug = (rec.status || 'active').toLowerCase().replace(/\s+/g, '-');

                                    return (
                                        <tr key={rec.id} className="email-ids-row">
                                            {/* 1. Real Email ID */}
                                            <td className="cell-real-email" data-label="Real Email ID">
                                                <div className="real-email-content">
                                                    <span className="real-email-icon-box" aria-hidden="true">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                                                        </svg>
                                                    </span>
                                                    <span className="real-email-text" title={rec.realEmailId}>
                                                        {rec.realEmailId}
                                                    </span>
                                                    {rec.realEmailId && rec.realEmailId !== '-' && (
                                                        <button
                                                            type="button"
                                                            className={`btn-copy-email ${isEmailCopied ? 'copied' : ''}`}
                                                            title={isEmailCopied ? 'Copied!' : 'Copy Email ID'}
                                                            aria-label="Copy Email ID"
                                                            onClick={(e) => handleCopyValue(e, rec.realEmailId, emailCopyKey)}
                                                        >
                                                            {isEmailCopied ? (
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

                                            {/* 2. Client ID */}
                                            <td className="cell-secondary cell-client-id" data-label="Client ID">
                                                <div className="client-id-chip-wrap">
                                                    <span className="client-id-chip" title={rec.clientId}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-75">
                                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                            <circle cx="12" cy="7" r="4"></circle>
                                                        </svg>
                                                        <span className="truncate">{rec.clientId}</span>
                                                    </span>
                                                    {rec.clientId && rec.clientId !== '-' && (
                                                        <button
                                                            type="button"
                                                            className={`btn-copy-email btn-copy-subtle ${isClientCopied ? 'copied' : ''}`}
                                                            title={isClientCopied ? 'Copied Client ID!' : 'Copy Client ID'}
                                                            aria-label="Copy Client ID"
                                                            onClick={(e) => handleCopyValue(e, rec.clientId, clientCopyKey)}
                                                        >
                                                            {isClientCopied ? (
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                            ) : (
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* 3. Project Leader */}
                                            <td className="cell-secondary cell-project-leader" data-label="Project Leader">
                                                <div className="leader-cell-content">
                                                    <span
                                                        className="leader-avatar-badge"
                                                        style={{ background: avatarGradient }}
                                                        aria-hidden="true"
                                                    >
                                                        {leaderInfo.initials}
                                                    </span>
                                                    <div className="leader-text-stack">
                                                        <span className="leader-name-primary">{leaderInfo.name}</span>
                                                        {leaderInfo.email && (
                                                            <span className="leader-email-sub" title={leaderInfo.email}>
                                                                {leaderInfo.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 4. Project Name */}
                                            <td className="cell-secondary cell-project-name" data-label="Project Name">
                                                <div className="project-name-cell">
                                                    <span className="project-folder-icon" aria-hidden="true">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                                        </svg>
                                                    </span>
                                                    <span className="project-name-text">{rec.projectName}</span>
                                                </div>
                                            </td>

                                            {/* 5. Email No */}
                                            <td className="cell-center" data-label="Email No">
                                                <span className="email-no-badge">
                                                    {rec.emailNo}
                                                </span>
                                            </td>

                                            {/* 6. Signature */}
                                            <td className="cell-signature" data-label="Signature">
                                                <div className="signature-chip" title={rec.signature}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="signature-chip-icon shrink-0">
                                                        <path d="M12 20h9"></path>
                                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                                    </svg>
                                                    <span>{rec.signature}</span>
                                                </div>
                                            </td>

                                            {/* 7. Status */}
                                            <td className="cell-status" data-label="Status">
                                                <span className={`email-id-status-pill status-${statusSlug}`}>
                                                    <span className="email-id-status-dot" aria-hidden="true" />
                                                    <span>{rec.status || 'Active'}</span>
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {/* Table Footer Summary Bar */}
                    {!isLoading && emailIdRecords.length > 0 && (
                        <div className="email-ids-table-footer">
                            <span className="email-ids-footer-count">
                                Showing <strong>{filteredRecords.length}</strong> of <strong>{emailIdRecords.length}</strong> email ID record{emailIdRecords.length === 1 ? '' : 's'}
                            </span>
                            <div className="email-ids-footer-legend">
                                <span className="legend-item">
                                    <span className="legend-dot dot-active" />
                                    Active ({stats.active})
                                </span>
                                {stats.completed > 0 && (
                                    <span className="legend-item">
                                        <span className="legend-dot dot-completed" />
                                        Completed ({stats.completed})
                                    </span>
                                )}
                                {stats.pending > 0 && (
                                    <span className="legend-item">
                                        <span className="legend-dot dot-pending" />
                                        Pending ({stats.pending})
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
