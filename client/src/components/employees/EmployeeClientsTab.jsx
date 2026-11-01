import React, { useMemo, useState } from 'react';
import { FiUsers, FiSearch } from 'react-icons/fi';

export default function EmployeeClientsTab({ selectedEmployee, clients = [] }) {
  const [search, setSearch] = useState('');
  const name = selectedEmployee?.fullName || selectedEmployee?.name || [selectedEmployee?.firstName, selectedEmployee?.lastName].filter(Boolean).join(' ') || selectedEmployee?.email || 'Employee';
  const assigned = useMemo(() => {
    const email = String(selectedEmployee?.email || '').trim().toLowerCase();
    return email ? clients.filter(client => client.assignedEmployeeEmails?.some(value => String(value).trim().toLowerCase() === email)) : [];
  }, [clients, selectedEmployee?.email]);
  const filtered = assigned.filter(client => [client.name, client.displayName, client.email, client.phone, client.address, client.clientId].some(value => String(value || '').toLowerCase().includes(search.trim().toLowerCase())));
  return <div className="employee-clients-tab">
    <div className="project-page-header employee-clients-header">
      <div className="employee-clients-heading-group">
        <h2 className="employee-clients-heading">{name}</h2>
        <div className="employee-clients-count-badge"><span>Total clients</span><span className="count-pill">{assigned.length}</span></div>
      </div>
      <div className="project-search employee-clients-search-box">
        <FiSearch className="employee-clients-search-icon" aria-hidden="true" />
        <input aria-label="Search assigned clients" placeholder="Search clients by name, email or client ID..." value={search} onChange={event=>setSearch(event.target.value)} />
      </div>
    </div>
    {filtered.length === 0 ? <div className="empty-state" role="status">
      <p className="empty-title">{search ? 'No matching clients found' : 'No clients assigned yet'}</p>
      <p className="empty-subtitle">{search ? 'Try another name, email or client ID.' : 'Use Assign employees on the Clients page to assign a client to this employee.'}</p>
    </div> : filtered.map((client,index)=><section className="project-card client-card-elevated" key={client.id}>
      <div className="project-card-head client-card-topbar">
        <div className="client-meta-primary"><span className="client-avatar-icon"><FiUsers aria-hidden="true" /></span><h3 className="client-card-name">{index+1}. {client.displayName || client.name}</h3></div>
      </div>
      <div className="client-data-grid" style={{padding:'20px 0',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:20}}>
        {[['Client ID',client.clientId],['Client name',client.name || client.displayName],['Client email ID',client.email],['Phone number',client.phone],['Address',client.address]].map(([label,value])=><div className="client-data-cell" key={label}>
          <span className="client-data-label">{label}</span>
          <div className="client-data-value" style={{overflowWrap:'anywhere',whiteSpace:'normal'}}>{value || 'Not provided'}</div>
        </div>)}
      </div>
    </section>)}
  </div>;
}
