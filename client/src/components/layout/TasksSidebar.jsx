import React from 'react';
import { FiPlus, FiDownload, FiUpload, FiCheckCircle, FiCircle, FiClock, FiGrid, FiHardDrive } from 'react-icons/fi';
import { useTasks, taskDay } from '../../context/TaskContext';
import '../../pages/dashboard/TasksView.css';

export default function TasksSidebar() {
    const {tasks,visibleTasks: contextVisibleTasks,filter,setFilter,setEditor,openImport,exportTasks,canAssign,isOwnerOrAdmin,loading,busy}=useTasks();
    const activeTasks = contextVisibleTasks || tasks || [];
    const today = taskDay();
    const items=[['all','All tasks',FiGrid,activeTasks.length],['todo','To do',FiCircle,activeTasks.filter(t=>t.status==='todo').length],['progress','In progress',FiClock,activeTasks.filter(t=>t.status==='progress').length],['overdue','Overdue',FiClock,activeTasks.filter(t=>t.dueDate && t.dueDate<today && t.status!=='done').length],['done','Completed',FiCheckCircle,activeTasks.filter(t=>t.status==='done').length]];
    return <aside id="tasksSidebar" className="sidebar task-side task-scope">
        <div className="task-side-top"><span className="task-eyebrow">WORKSPACE</span><h2>{(isOwnerOrAdmin || canAssign)?'Team tasks':'My tasks'}</h2><button disabled={loading || busy} className="task-btn primary" onClick={()=>setEditor({})}><FiPlus aria-hidden="true"/> Create task</button></div>
        <nav className="task-side-nav" aria-label="Task views">{items.map(([id,label,Icon,count])=><button key={id} aria-pressed={filter===id} className={filter===id?'selected':''} onClick={()=>setFilter(id)}><Icon aria-hidden="true"/><span>{label}</span><b>{count}</b></button>)}</nav>
        <div className="task-side-bottom"><div className="task-storage"><FiHardDrive aria-hidden="true"/><div><strong>Connected to your team</strong><p>Tasks are saved to your account and shared with their assignee.</p></div></div><div className="task-actions"><button className="task-btn" onClick={openImport}><FiDownload aria-hidden="true"/> Import JSON</button><button className="task-btn" onClick={exportTasks}><FiUpload aria-hidden="true"/> Export</button></div></div>
    </aside>;
}
