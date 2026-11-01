import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiPlus, FiSearch, FiCheck, FiCheckCircle, FiClock, FiList, FiArrowRight, FiDownload, FiEdit2, FiTrash2, FiX, FiCalendar } from 'react-icons/fi';
import { useTasks, taskDay } from '../../context/TaskContext';
import './TasksView.css';
import { DescriptionEditor, TaskDescription, TaskAttachments, AttachmentPreview } from './TaskDetails';
const statuses={todo:'To do',progress:'In progress',done:'Completed'};
const formatDate=value=>value ? new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric'}).format(new Date(`${value}T00:00:00`)) : 'No due date';
const formatAssigned=value=>value ? new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric'}).format(new Date(value.includes('T')?value:value.replace(' ','T')+'Z')) : 'Not recorded';
const checkOwnerOrAdminRole = (user, canAssign) => {
    if (canAssign) return true;
    const storedRole = localStorage.getItem('userRole') || localStorage.getItem('role') || '';
    const role = String(user?.role || user?.userRole || user?.user_role || storedRole || '').toLowerCase().trim();
    const normalized = role.replace(/[-_\s]/g, '');
    if (['owner', 'orgowner', 'organizationowner', 'admin', 'superadmin', 'administrator', 'manager'].includes(normalized) || normalized.includes('owner') || normalized.includes('admin') || normalized.includes('manager')) return true;
    if (Boolean(user?.isOwner || user?.is_owner || user?.isAdmin || user?.is_admin || user?.is_organization_owner)) return true;
    if (user?.perm_make_admin || user?.perm_add_employees || user?.perm_manage_projects || user?.perm_create_projects || user?.perm_delete_project) return true;
    if (user?.permissions?.makeAdmin || user?.permissions?.manageProjects || user?.permissions?.addEmployees || user?.permissions?.createProjects || user?.permissions?.deleteProject) return true;
    return false;
};
function TaskEditor() {
    const {editor,setEditor,save,error,assignees,currentUserId,canAssign,isOwnerOrAdmin: contextIsOwnerOrAdmin,busy,downloadAttachment,currentUser}=useTasks();
    const isOwnerOrAdmin = contextIsOwnerOrAdmin !== undefined
        ? contextIsOwnerOrAdmin
        : checkOwnerOrAdminRole(currentUser, canAssign);
    const canUserAssign = Boolean(canAssign || isOwnerOrAdmin);
    const myId = String(currentUserId || currentUser?.id || currentUser?._id || '');
    const myName = assignees.find(a=>String(a.id)===myId)?.name || currentUser?.name || currentUser?.admin_name || 'Me';
    const [form,setForm]=useState({title:'',description:'',dueDate:'',priority:'medium',status:'todo',attachments:[],assigneeId:myId,assigneeName:myName,...editor});
    const ref=useRef(null);
    const [reading,setReading]=useState(false);
    useEffect(()=>{ const dialog=ref.current; dialog.showModal(); return ()=>dialog.close(); },[]);
    const readOnly = form.canManage === false;
    const field=e=>setForm({...form,[e.target.name]:e.target.value});
    return <dialog className="task-dialog task-scope" ref={ref} onCancel={()=>setEditor(null)} aria-labelledby="task-editor-title"><form onSubmit={e=>{e.preventDefault(); if(form.title.trim() && !reading && !busy) save(form);}}>
        <div className="task-dialog-header"><div><span className="task-eyebrow">MAKE SPACE FOR WHAT MATTERS</span><h2 id="task-editor-title">{form.id?'Edit task':'Create a task'}</h2></div><button type="button" className="task-icon-btn" aria-label="Close task editor" onClick={()=>setEditor(null)}><FiX/></button></div>
        <label>Task name <span aria-hidden="true">*</span><input disabled={readOnly || busy} autoFocus required maxLength={160} name="title" value={form.title} onChange={field} placeholder="What needs to get done?"/></label>
        {form.assignedAt && <p className="task-assignment-date">Assigned on {formatAssigned(form.assignedAt)}</p>}
        <DescriptionEditor value={form.description} disabled={readOnly || busy} onChange={description=>setForm(prev=>({...prev,description}))}>
        <TaskAttachments files={form.attachments} disabled={readOnly || busy || reading} taskId={form.id} onDownload={downloadAttachment} onReading={setReading} onChange={attachments=>setForm(prev=>({...prev,attachments}))}/>
        </DescriptionEditor>

        <div className="task-form-grid"><label>Due date<input disabled={readOnly || busy} type="date" name="dueDate" value={form.dueDate} onChange={field}/></label><label>Priority<select disabled={readOnly || busy} name="priority" value={form.priority} onChange={field}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div>
        <label>Assign to<select name="assigneeId" value={form.assigneeId} onChange={field} disabled={readOnly || busy || !canUserAssign}>
            {!assignees.some(a=>String(a.id)===String(form.assigneeId)) && <option value={form.assigneeId}>{form.assigneeName || myName || 'Current assignee'}</option>}
            {assignees.map(a=><option key={a.id} value={String(a.id)} disabled={Boolean(a.blocked)}>{a.name}{String(a.id)===myId?' (Me)':a.pending?' (Pending invite)':a.blocked?' (Blocked)':a.role==='admin'?' (Admin)':''} — {a.email}</option>)}
        </select></label>
        <p className="task-assignment-hint">{readOnly?'You can update the status. Contact the task creator to change other details.':canUserAssign?'All team members are listed. Pending invitees will see assigned tasks after joining. Blocked accounts cannot receive new assignments.':'You can create tasks for yourself. Your manager can assign team tasks.'}</p>
        <label>Status<select disabled={busy} name="status" value={form.status} onChange={field}>{Object.entries(statuses).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
        {error && <p role="alert" className="task-error">{error}</p>}<div className="task-dialog-footer"><button type="button" className="task-btn" onClick={()=>setEditor(null)}>Cancel</button><button className="task-btn primary" disabled={busy || reading || !form.title.trim()} type="submit">{busy?'Saving…':form.id?'Save changes':'Create task'}<FiArrowRight aria-hidden="true"/></button></div>
    </form></dialog>;
}
export default function TasksView() {
    const {
        tasks: contextTasks,
        allTasks: contextAllTasks,
        visibleTasks: contextVisibleTasks,
        currentUser: contextCurrentUser,
        isOwnerOrAdmin: contextIsOwnerOrAdmin,
        search,setSearch,filter,setFilter,editor,setEditor,error,notice,openImport,exportTasks,update,remove,assignees,assigneeFilter,setAssigneeFilter,canAssign,loading,busy,refresh,legacyCount,importLegacy,downloadAttachment,currentUserId
    } = useTasks();
    const [sort,setSort] = useState('due');
    const [deleteId,setDeleteId] = useState(null);

    const currentUser = contextCurrentUser || (() => {
        try { return JSON.parse(localStorage.getItem('currentUser') || '{}'); } catch { return {}; }
    })();

    const isOwnerOrAdmin = contextIsOwnerOrAdmin !== undefined
        ? contextIsOwnerOrAdmin
        : checkOwnerOrAdminRole(currentUser, canAssign);

    const allTasks = contextAllTasks || contextTasks || [];

    const visibleTasks = useMemo(() => {
        if (contextVisibleTasks) return contextVisibleTasks;
        if (isOwnerOrAdmin) return allTasks;

        const userEmail = currentUser?.email?.toLowerCase()?.trim();
        const userId = String(currentUser?.id || currentUser?._id || currentUserId || '');
        const userName = (currentUser?.name || currentUser?.admin_name || '')?.toLowerCase()?.trim();

        return allTasks.filter((task) => {
            const taskAssigneeId = String(task.assignedTo || task.assigneeId || task.employeeId || '');
            const taskAssigneeEmail = (task.assignedToEmail || task.assigneeEmail || task.email || '')
                .toLowerCase()
                .trim();
            const taskAssigneeName = (task.assignedToName || task.assigneeName || task.assignee || '')
                .toLowerCase()
                .trim();

            return (
                (userId && taskAssigneeId === userId) ||
                (userEmail && taskAssigneeEmail === userEmail) ||
                (userName && taskAssigneeName === userName)
            );
        });
    }, [contextVisibleTasks, allTasks, currentUser, isOwnerOrAdmin, currentUserId]);

    const today = taskDay();
    const done = visibleTasks.filter(t => t.status === 'done').length;
    const inProgress = visibleTasks.filter(t => t.status === 'progress').length;
    const overdue = visibleTasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length;

    const filtered = useMemo(() => visibleTasks.filter(t => 
        (isOwnerOrAdmin ? (assigneeFilter === 'all' || String(t.assigneeId || t.assignedTo) === assigneeFilter) : true) &&
        (filter === 'all' || (filter === 'overdue' ? t.dueDate && t.dueDate < today && t.status !== 'done' : t.status === filter)) &&
        `${t.title} ${t.description || ''} ${t.assigneeName || ''}`.toLowerCase().includes(search.toLowerCase())
    ).sort((a,b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'priority' ? ({high:0,medium:1,low:2}[a.priority]-{high:0,medium:1,low:2}[b.priority]) : (a.dueDate || '9999').localeCompare(b.dueDate || '9999')),
    [visibleTasks, isOwnerOrAdmin, assigneeFilter, filter, search, sort, today]);

    return <section id="tasksView" className="task-page task-scope" aria-labelledby="task-page-title">
        <header className="task-page-header"><div><span className="task-eyebrow">{(isOwnerOrAdmin || canAssign)?'YOUR TEAM WORKSPACE':'YOUR WORKSPACE'}</span><h1 id="task-page-title">A little focus. A lot done.</h1><p>Assign clear responsibilities and keep every task moving forward.</p></div><button className="task-btn primary" disabled={loading || busy} onClick={()=>setEditor({})}><FiPlus aria-hidden="true"/> Create task</button></header>
        <div className="task-stats" aria-label="Task overview">{[[FiList,'Total tasks',visibleTasks.length,'all'],[FiClock,'In progress',inProgress,'progress'],[FiCalendar,'Overdue',overdue,'overdue'],[FiCheckCircle,'Completed',done,'done']].map(([Icon,label,count,id])=><button className={`task-stat ${id}`} key={id} onClick={()=>setFilter(id)} aria-pressed={filter===id}><span className="task-stat-icon"><Icon aria-hidden="true"/></span><span><span className="task-stat-label">{label}</span><strong>{count}</strong></span><FiArrowRight className="task-stat-arrow" aria-hidden="true"/></button>)}</div>
        <div aria-live="polite" className="task-notice">{notice}</div>{error && <p role="alert" className="task-error">{error} <button className="task-btn" onClick={refresh}>Retry</button></p>}
        {legacyCount>0 && <div className="task-legacy"><span>{legacyCount} tasks saved in this browser can be moved to your account.</span><button className="task-btn" disabled={busy || loading} onClick={importLegacy}>Import saved tasks</button></div>}
        <div className="task-board"><div className="task-board-heading"><div><h2>Task overview <span>{visibleTasks.length}</span></h2><p>Everything you need to stay on track.</p></div><div className="task-actions"><button className="task-btn" onClick={openImport}><FiDownload aria-hidden="true"/> Import JSON</button><button className="task-btn" onClick={exportTasks}>Export</button></div></div>
        <div className="task-assignee-filter"><label>Assigned to <select aria-label="Filter by assignee" value={isOwnerOrAdmin ? assigneeFilter : String(currentUser?.id || currentUser?._id || currentUserId || '')} onChange={e=>{if(isOwnerOrAdmin) setAssigneeFilter(e.target.value);}} disabled={!isOwnerOrAdmin}>{isOwnerOrAdmin ? <><option value="all">Everyone</option>{Array.from(new Map([...assignees.map(a=>[String(a.id),a.name]),...visibleTasks.map(t=>[String(t.assigneeId || t.assignedTo),t.assigneeName || t.assignedToName])]).entries()).filter(([id])=>Boolean(id) && id!=='undefined').map(([id,name])=><option key={id} value={id}>{name}</option>)}</> : <option value={String(currentUser?.id || currentUser?._id || currentUserId || '')}>{assignees.find(a=>String(a.id)===String(currentUser?.id || currentUserId))?.name || currentUser?.name || currentUser?.admin_name || 'Me'}</option>}</select></label><button className="task-text-btn" onClick={refresh} disabled={busy}>Refresh tasks</button></div>
        <div className="task-toolbar"><div className="task-filters" aria-label="Filter tasks">{[['all','All tasks'],['todo','To do'],['progress','In progress'],['overdue','Overdue'],['done','Completed']].map(([id,label])=><button key={id} aria-pressed={filter===id} className={filter===id?'selected':''} onClick={()=>setFilter(id)}>{label}</button>)}</div><div className="task-search"><FiSearch aria-hidden="true"/><input aria-label="Search tasks" placeholder="Search tasks…" value={search} onChange={e=>setSearch(e.target.value)}/>{search && <button className="task-icon-btn" aria-label="Clear search" onClick={()=>setSearch('')}><FiX/></button>}</div></div>
        {loading ? <div className="task-empty" role="status">Loading tasks…</div> : error && !visibleTasks.length ? <div className="task-empty">Tasks are unavailable. Use Retry above to reconnect.</div> : filtered.length ? <><div className="task-list-meta"><span>{filtered.length} {filtered.length===1?'task':'tasks'}</span><label>Sort by <select aria-label="Sort tasks" value={sort} onChange={e=>setSort(e.target.value)}><option value="due">Due date</option><option value="priority">Priority</option><option value="title">Task name</option></select></label></div><ul className="task-list">{filtered.map(t=><li key={t.id} className={`task-row ${t.status==='done'?'is-done':''}`}><button className="task-complete" disabled={busy} aria-label={`${t.status==='done'?'Reopen':'Complete'} ${t.title}`} aria-pressed={t.status==='done'} onClick={()=>update({...t,status:t.status==='done'?'todo':'done'})}>{t.status==='done' && <FiCheck/>}</button><div className="task-row-detail"><button className="task-title" onClick={()=>setEditor(t)}>{t.title}</button>{(t.description || t.attachments?.length>0) && <details className="task-description-details"><summary>Description{t.attachments?.length>0?` · ${t.attachments.length} attachment${t.attachments.length===1?'':'s'}`:''}</summary>{t.description && <TaskDescription text={t.description}/>}<div className="task-attachment-previews">{t.attachments?.map(file=><AttachmentPreview key={file.id} file={file} taskId={t.id} onDownload={downloadAttachment}/>)}</div></details>}<div className="task-row-tags"><span className={`task-priority ${t.priority}`}>{t.priority} priority</span><span className={`task-status-badge ${t.status}`}>{statuses[t.status]}</span><span className="task-assignee-chip" title={t.assigneeEmail}>Assigned to {t.assigneeName}{t.assigneePending?' · Pending invite':''}</span></div></div><div className="task-dates"><span className="task-assigned"><FiCalendar aria-hidden="true"/>Assigned {formatAssigned(t.assignedAt)}</span><span className={`task-due ${t.dueDate && t.dueDate<today && t.status!=='done'?'late':''}`}><FiCalendar aria-hidden="true"/>Due {formatDate(t.dueDate)}</span></div><div className="task-actions">{deleteId===t.id?<><button disabled={busy} className="task-btn danger" onClick={()=>{remove(t.id).then(ok=>{if(ok)setDeleteId(null);});}}>Delete task?</button><button className="task-btn" onClick={()=>setDeleteId(null)}>Cancel</button></>:<><button className="task-icon-btn" aria-label={`Edit ${t.title}`} onClick={()=>setEditor(t)}><FiEdit2/></button><button hidden={!t.canManage} disabled={busy} className="task-icon-btn" aria-label={`Delete ${t.title}`} onClick={()=>setDeleteId(t.id)}><FiTrash2/></button></>}</div></li>)}</ul></>:<div className="task-empty"><div className="task-empty-art" aria-hidden="true"><div className="task-art-card"><span/><div><i><FiCheck/></i><b/></div><div><i><FiCheck/></i><b/></div><div><i/><b/></div></div><span className="task-art-badge"><FiCheck/></span></div><span className="task-eyebrow">{visibleTasks.length?'A FRESH VIEW':'LESS CLUTTER. MORE CLARITY.'}</span><h2>{visibleTasks.length?'No matching tasks':'Big things start with one task'}</h2><p>{visibleTasks.length?'Try another view or search to find what you’re looking for.':'Give your ideas a next step. Add your first task, set a due date, and make room for a more organized day.'}</p>{visibleTasks.length?<button className="task-btn" onClick={()=>{setSearch('');setFilter('all');if(isOwnerOrAdmin)setAssigneeFilter('all');}}>Clear filters</button>:<><button className="task-btn primary" disabled={loading || busy} onClick={()=>setEditor({})}><FiPlus aria-hidden="true"/> Create your first task<FiArrowRight aria-hidden="true"/></button><button className="task-text-btn" onClick={openImport}>Already have a task export? Import JSON</button></>}</div>}
        <footer className="task-board-footer"><span><FiCheckCircle aria-hidden="true"/> {done} of {visibleTasks.length} tasks completed</span><span>One step at a time.</span></footer></div>
        <p className="task-local-note">Tasks are saved to your account · Refreshes every 30 seconds</p>
        {editor!==null && <TaskEditor key={editor.id||'new'}/>}
    </section>;
}
