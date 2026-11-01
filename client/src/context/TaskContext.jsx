import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const TaskContext = createContext(null);
export const useTasks = () => useContext(TaskContext);
export const taskDay = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

export function TaskProvider({ children }) {
    const { pathname } = useLocation();
    const [allTasks, setAllTasks] = useState([]);
    const [assignees, setAssignees] = useState([]);
    const [canAssign, setCanAssign] = useState(false);
    const [currentUserId, setCurrentUserId] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [assigneeFilter, setAssigneeFilter] = useState('all');
    const [editor, setEditor] = useState(null);
    const fileRef = useRef(null);
    const lock = useRef(false);
    const generation = useRef(0);

    const [currentUser, setCurrentUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('currentUser') || '{}'); } catch { return {}; }
    });

    useEffect(() => {
        const syncUser = () => {
            try { setCurrentUser(JSON.parse(localStorage.getItem('currentUser') || '{}')); } catch { setCurrentUser({}); }
        };
        window.addEventListener('storage', syncUser);
        window.addEventListener('focus', syncUser);
        return () => {
            window.removeEventListener('storage', syncUser);
            window.removeEventListener('focus', syncUser);
        };
    }, []);

    useEffect(() => {
        try { setCurrentUser(JSON.parse(localStorage.getItem('currentUser') || '{}')); } catch { setCurrentUser({}); }
    }, [pathname]);

    // Only the authenticated API response may grant team-wide task access.
    const isOwnerOrAdmin = canAssign && String(currentUser?.id || '') === currentUserId;
    const effectiveCanAssign = isOwnerOrAdmin;
    const visibleTasks = useMemo(() => {
        if (!currentUserId || String(currentUser?.id || '') !== currentUserId) return [];
        if (isOwnerOrAdmin) return allTasks;
        return allTasks.filter(task => String(task.assigneeId || '') === currentUserId);
    }, [allTasks, currentUser, isOwnerOrAdmin, currentUserId]);

    const [legacy] = useState(() => {
        try { const u=JSON.parse(localStorage.getItem('currentUser') || '{}'); const raw=localStorage.getItem(`safemailz.tasks.v1:${u.organization_id || 'local'}:${u.id || 'local'}`); const list=JSON.parse(raw||'[]'); return Array.isArray(list)?list:[]; } catch {return [];}
    });
    const [legacyImported,setLegacyImported] = useState(false);
    const request = useCallback(async (path='', options={}) => {
        const token=localStorage.getItem('token') || sessionStorage.getItem('token');
        const response=await fetch(`/api/tasks${path}`,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token || ''}`},signal:AbortSignal.timeout(15000)});
        let data; try {data=await response.json();} catch {throw new Error('Task service is unavailable. Restart the backend and retry.');}
        if(!response.ok) throw new Error(data.error || 'Unable to access tasks.');
        return data;
    },[]);
    const refresh = useCallback(async () => {
        const version=++generation.current;
        try {
            try {
                const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
                setCurrentUser(u);
            } catch {}
            const data=await request();
            if(version!==generation.current) return;
            const activeUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (!activeUser.id || String(data.currentUserId) !== String(activeUser.id)) {
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                window.location.replace('/signin?error=session_expired');
                throw new Error('Account session changed. Please sign in again.');
            }
            setAllTasks(Array.isArray(data.tasks) ? data.tasks : []);
            setAssignees(Array.isArray(data.assignees) ? data.assignees : []);
            setCanAssign(Boolean(data.canAssign));
            setCurrentUserId(String(data.currentUserId || ''));
            setError('');
        } catch(err) {if(version===generation.current) { setAllTasks([]); setCanAssign(false); setCurrentUserId(''); setError(err.message); }}
        finally {if(version===generation.current) setLoading(false);}
    },[request]);
    useEffect(()=>{
        if(!pathname.startsWith('/dashboard/tasks')) return;
        refresh();
        const check=()=>{if(!document.hidden && !lock.current) refresh();};
        const timer=setInterval(check,30000);window.addEventListener('focus',check);
        return ()=>{clearInterval(timer);window.removeEventListener('focus',check);generation.current++;};
    },[pathname,refresh]);
    const mutate = async (action,message) => {
        if(lock.current) return false;
        lock.current=true;setBusy(true);setError('');generation.current++;
        try {await action();setNotice(message);await refresh();return true;}
        catch(err) {setError(err.message);return false;}
        finally {lock.current=false;setBusy(false);}
    };
    const save = async task => {
        const body=task.canManage===false?{status:task.status}:{title:task.title.trim(),description:task.description,status:task.status,priority:task.priority,dueDate:task.dueDate,assigneeId:task.assigneeId || currentUserId || currentUser?.id,attachments:task.attachments};
        if(await mutate(()=>request(task.id?`/${encodeURIComponent(task.id)}`:'',{method:task.id?'PATCH':'POST',body:JSON.stringify(body)}),task.id?'Task updated.':'Task created and assigned.')) setEditor(null);
    };
    const downloadAttachment = async (taskId,file) => {
        try {
            const token=localStorage.getItem('token') || sessionStorage.getItem('token');
            const response=await fetch(`/api/tasks/${encodeURIComponent(taskId)}/attachments/${encodeURIComponent(file.id)}`,{headers:{Authorization:`Bearer ${token || ''}`},signal:AbortSignal.timeout(15000)});
            if(!response.ok)throw new Error('Attachment could not be downloaded. Please retry.');
            const url=URL.createObjectURL(await response.blob());const a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
        }catch(err){setError(err.message);}
    };
    const exportTasks = () => {
        const listToExport = isOwnerOrAdmin ? allTasks : visibleTasks;
        const url=URL.createObjectURL(new Blob([JSON.stringify(listToExport,null,2)],{type:'application/json'}));
        const a=document.createElement('a');a.href=url;a.download=`safemailz-tasks-${taskDay()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    const importList = list => mutate(async()=>{
        const result=await request('/import',{method:'POST',body:JSON.stringify({tasks:list})});
        setNotice(`${result.imported} tasks imported.`);
    },'Task import complete.');
    const importTasks=async e=>{
        const file=e.target.files?.[0];e.target.value='';if(!file)return;
        try {if(file.size>2*1024*1024)throw new Error('Choose a JSON file smaller than 2 MB.');await importList(JSON.parse(await file.text()));}
        catch(err){setError(err instanceof SyntaxError?'This file is not valid JSON.':err.message);}
    };
    return <TaskContext.Provider value={{
        downloadAttachment,
        tasks: visibleTasks,
        visibleTasks,
        allTasks,
        setTasks: setAllTasks,
        currentUser,
        isOwnerOrAdmin,
        assignees,
        canAssign: effectiveCanAssign,
        currentUserId,
        loading,
        busy,
        refresh,
        assigneeFilter,
        setAssigneeFilter,
        search,
        setSearch,
        filter,
        setFilter,
        editor,
        setEditor,
        error,
        notice,
        save,
        exportTasks,
        openImport:()=>fileRef.current?.click(),
        legacyCount:legacyImported?0:legacy.length,
        importLegacy:async()=>{if(await importList(legacy))setLegacyImported(true);},
        update:t=>mutate(()=>request(`/${encodeURIComponent(t.id)}`,{method:'PATCH',body:JSON.stringify({status:t.status})}),'Task status updated.'),
        remove:id=>mutate(()=>request(`/${encodeURIComponent(id)}`,{method:'DELETE'}),'Task deleted.')
    }}>
        {children}<input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importTasks}/>
    </TaskContext.Provider>;
}
