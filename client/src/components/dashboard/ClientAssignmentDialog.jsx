import React, { useEffect, useRef, useState } from 'react';
import { FiUsers, FiX, FiSearch, FiCheck, FiUser } from 'react-icons/fi';
import './ClientAssignmentDialog.css';
export default function ClientAssignmentDialog({ client, onClose, onSaved }) {
    const dialog = useRef(null);
    const [employees, setEmployees] = useState([]);
    const [selected, setSelected] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [retry, setRetry] = useState(0);
    const headers = () => ({'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('token') || ''}`});
    useEffect(() => {
        const element=dialog.current;
        if (!element.open) element.showModal();
        setLoading(true); setLoaded(false); setError('');
        const controller = new AbortController();
        let active=true;
        fetch('/api/clients/assignments',{headers:headers(), signal:controller.signal}).then(async response=>{
            const data=await response.json();
            if(!response.ok) throw new Error(data.error || 'Unable to load employees.');
            if(active){setEmployees(data.employees);setSelected(data.assignments[client.id] || []);setLoaded(true);}
        }).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
        return ()=>{active=false;controller.abort();element.close();};
    },[client.id,retry]);
    const save=async()=>{
        setSaving(true);setError('');
        try {
            const response=await fetch(`/api/clients/assignments/${encodeURIComponent(client.id)}`,{method:'PUT',headers:headers(),body:JSON.stringify({employeeEmails:selected})});
            const data=await response.json();
            if(!response.ok)throw new Error(data.error || 'Unable to save assignment.');
            await onSaved();onClose();
        }catch(e){setError(e.message);}finally{setSaving(false);}
    };
    const filtered = employees.filter(e=>`${e.name} ${e.email}`.toLowerCase().includes(search.trim().toLowerCase()));
    const toggle = email => setSelected(prev=>prev.includes(email)?prev.filter(value=>value!==email):[...prev,email]);
    return <dialog ref={dialog} className="client-assignment-dialog" aria-labelledby="client-assignment-title" aria-describedby="client-assignment-description" onCancel={e=>{e.preventDefault();if(!saving)onClose();}}>
        <div className="ca-heading">
            <span className="ca-heading-icon"><FiUsers aria-hidden="true" /></span>
            <div className="ca-heading-copy"><h2 id="client-assignment-title">Assign employees</h2><p id="client-assignment-description">Choose who will manage this client.</p></div>
            <button className="ca-close" type="button" aria-label="Close assignment dialog" disabled={saving} onClick={onClose}><FiX /></button>
        </div>
        <div className="ca-client"><span className="ca-client-avatar"><FiUser aria-hidden="true" /></span><div><span className="ca-eyebrow">CLIENT</span><strong>{client.displayName || client.name}</strong><small>{client.email}</small></div></div>
        <div className="ca-body">
            <label className="ca-search"><span className="ca-sr-only">Search employees by name or email</span><FiSearch aria-hidden="true" /><input autoFocus disabled={saving} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email" /></label>
            <div className="ca-list-label"><span>EMPLOYEES <b>{employees.length}</b></span><span aria-live="polite">{selected.length} selected</span></div>
            {error && <div className="ca-error" role="alert">{error}{!loaded && <button type="button" onClick={()=>setRetry(n=>n+1)}>Try again</button>}</div>}
            <div className="ca-options" aria-busy={loading}>
                {loading ? <div className="ca-empty" role="status">Loading your team...</div> : !loaded ? null : filtered.length===0 ? <div className="ca-empty"><FiUsers aria-hidden="true" /><strong>{employees.length?'No employees found':'No employees yet'}</strong><p>{employees.length?'Try a different name or email.':'Add an employee to assign this client.'}</p>{search && <button type="button" onClick={()=>setSearch('')}>Clear search</button>}</div> : filtered.map(employee=>{
                    const checked=selected.includes(employee.email);
                    const name=employee.name?.includes('@')?employee.name.split('@')[0]:employee.name;
                    const initials=(name||employee.email).split(/[ ._-]+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
                    return <label className={`ca-employee ${checked?'is-selected':''}`} key={employee.email}>
                        <input type="checkbox" disabled={saving} checked={checked} onChange={()=>toggle(employee.email)} />
                        <span className="ca-employee-avatar" aria-hidden="true">{initials}</span>
                        <span className="ca-employee-copy"><strong>{name}</strong><small>{employee.email}</small></span>
                        <span className={`ca-status ${employee.pending?'is-pending':''}`}>{employee.pending?'Invited':'Active'}</span>
                    </label>;
                })}
            </div>
        </div>
        <div className="ca-footer"><span className="ca-selection"><FiCheck aria-hidden="true" />{selected.length} employee{selected.length===1?'':'s'} selected</span><div className="ca-actions"><button type="button" disabled={saving} onClick={onClose}>Cancel</button><button type="button" className="ca-primary" disabled={!loaded || loading || saving} onClick={save}>{saving?'Saving...':'Save assignment'}</button></div></div>
    </dialog>;
}
