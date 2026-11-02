const express = require('express');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

// Factory keeps integration tests isolated from the application's database.
function createTasksRouter(client, secret) {
    const router = express.Router();
    let schema;
    const execute = (sql, args = []) => client.execute({ sql, args });
    const ensureSchema = () => schema || (schema = client.batch([
        `CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY, organization_id INTEGER NOT NULL, creator_id INTEGER NOT NULL,
            assignee_id INTEGER NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL CHECK(status IN ('todo','progress','done')),
            priority TEXT NOT NULL CHECK(priority IN ('low','medium','high')), due_date TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        'CREATE INDEX IF NOT EXISTS tasks_org_assignee ON tasks(organization_id, assignee_id)',
        'CREATE INDEX IF NOT EXISTS tasks_org_creator ON tasks(organization_id, creator_id)',
        `CREATE TABLE IF NOT EXISTS task_attachments (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, name TEXT NOT NULL, size INTEGER NOT NULL, data TEXT NOT NULL)`,
        'CREATE INDEX IF NOT EXISTS task_files_task ON task_attachments(task_id)'
    ], 'write').then(async () => {
        const columns=(await execute('PRAGMA table_info(tasks)')).rows;
        if(!columns.some(c=>c.name==='assigned_at')) await execute('ALTER TABLE tasks ADD COLUMN assigned_at TEXT');
    }).catch(err => { schema = null; throw err; }));
    const fail = (status, message) => { const err = new Error(message); err.status = status; throw err; };
    const normalizeRole = r => String(r || '').toLowerCase().trim().replace(/[-_\s]/g, '');
    const isOwnerRoleStr = r => {
        const n = normalizeRole(r);
        return n === 'owner' || n === 'orgowner' || n === 'organizationowner' || n.includes('owner');
    };
    const isAdminRoleStr = r => {
        const n = normalizeRole(r);
        return n === 'admin' || n === 'superadmin' || n === 'administrator' || n === 'manager' || n.includes('admin') || n.includes('manager');
    };
    const isOwnerOrAdmin = u => {
        if (!u) return false;
        const role = u.role || u.userRole || u.user_role || '';
        if (isOwnerRoleStr(role) || isAdminRoleStr(role)) return true;
        if (Boolean(u.is_owner || u.isOwner || u.isAdmin || u.is_admin || u.is_organization_owner)) return true;
        if (normalizeRole(role) === 'employee') {
            if (Number(u.perm_add_employees) === 1 || Number(u.perm_manage_projects) === 1 || Number(u.perm_create_projects) === 1 || Number(u.perm_delete_project) === 1) return true;
            if (u.permissions && (u.permissions.addEmployees || u.permissions.manageProjects || u.permissions.createProjects || u.permissions.deleteProject)) return true;
            return false;
        }
        if (Number(u.perm_make_admin) === 1 || Number(u.perm_add_employees) === 1 || Number(u.perm_manage_projects) === 1 || Number(u.perm_create_projects) === 1 || Number(u.perm_delete_project) === 1) return true;
        if (u.permissions && (u.permissions.makeAdmin || u.permissions.addEmployees || u.permissions.manageProjects || u.permissions.createProjects || u.permissions.deleteProject)) return true;
        return false;
    };
    const owner = u => {
        if (!u) return false;
        const role = u.role || u.userRole || u.user_role || '';
        if (isOwnerRoleStr(role)) return true;
        if (Boolean(u.is_owner || u.isOwner || u.is_organization_owner)) return true;
        return false;
    };
    const manager = u => isOwnerOrAdmin(u);
    const visible = (u, t) => {
        if (!t || t.organization_id !== u.organization_id) return false;
        if (isOwnerOrAdmin(u)) return true;
        const cleanEmail = typeof u.email === 'string' ? u.email.trim().toLowerCase() : '';
        const userIdStr = String(u.id);
        const taskAssignee = String(t.assignee_id ?? '');
        const taskEmail = typeof t.assignee_email === 'string' ? t.assignee_email.trim().toLowerCase() : '';
        if (taskAssignee === userIdStr) return true;
        if (cleanEmail) {
            if (taskAssignee.toLowerCase() === cleanEmail) return true;
            if (taskEmail && taskEmail === cleanEmail) return true;
        }
        return false;
    };
    const canManage = (u, t) => isOwnerOrAdmin(u) || (t.creator_id === u.id && visible(u, t));
    const map = (t, u) => ({ id:t.id, title:t.title, description:t.description, status:t.status, priority:t.priority, dueDate:t.due_date, assignedAt:t.assigned_at || t.created_at, attachments:JSON.parse(t.attachments || '[]'), assigneeId:String(t.assignee_id), assigneeName:t.assignee_name || 'Former employee', assigneeEmail:t.assignee_email || '', assigneePending:Boolean(t.pending_email), creatorId:t.creator_id, canManage:canManage(u,t) });
    // SQLite's INTEGER affinity also preserves invite_<id> text references until signup.
    const selection = `SELECT t.*, (SELECT json_group_array(json_object('id',a.id,'name',a.name,'size',a.size)) FROM task_attachments a WHERE a.task_id=t.id) AS attachments, COALESCE(u.admin_name,i.email) AS assignee_name,
        COALESCE(u.email,i.email) AS assignee_email, i.email AS pending_email
        FROM tasks t LEFT JOIN users u ON u.id=t.assignee_id AND u.organization_id=t.organization_id
        LEFT JOIN invitations i ON t.assignee_id=('invite_' || i.id) AND i.organization_id=t.organization_id`;
    router.use(async (req, res, next) => {
        try {
            const token = /^Bearer (.+)$/i.exec(req.headers.authorization || '')?.[1];
            let decoded;
            try { decoded = jwt.verify(token || '', secret, { algorithms:['HS256'] }); } catch { fail(401, 'Please sign in again to access tasks.'); }
            const user = (await execute('SELECT * FROM users WHERE id = ?', [decoded.id])).rows[0];
            if (!user || !user.organization_id || user.is_blocked || Number(decoded.tokenVersion ?? decoded.token_version ?? 0) !== Number(user.tokenVersion ?? user.token_version ?? 0)) fail(401, 'Your session is no longer valid. Please sign in again.');
            if (user.mustChangePassword || user.must_change_password) fail(403, 'Change your password before accessing tasks.');
            req.taskUser = user;
            await ensureSchema();
            // Resolve only invitations matching this authenticated account and organization.
            await execute(`UPDATE tasks SET assignee_id=?,updated_at=CURRENT_TIMESTAMP
                WHERE organization_id=? AND assignee_id IN
                (SELECT 'invite_' || id FROM invitations WHERE organization_id=? AND LOWER(TRIM(email))=LOWER(TRIM(?)))`,
                [user.id,user.organization_id,user.organization_id,user.email]);
            next();
        } catch (err) { next(err); }
    });
    const assignees = async u => {
        if (!manager(u)) return [{id:u.id,name:u.admin_name,email:u.email}];
        const excludeOwnersClause = owner(u) ? '' : "AND LOWER(TRIM(role)) NOT IN ('org_owner','owner','org owner','organization_owner','organization owner','org-owner','organization-owner','orgowner')";
        const employees = (await execute(`SELECT id, admin_name AS name, email, role,
            COALESCE(is_blocked,0) AS blocked FROM users
            WHERE organization_id=? ${excludeOwnersClause} ORDER BY admin_name`,[u.organization_id])).rows;
        const pending = (await execute(`SELECT 'invite_' || i.id AS id, i.email AS name, i.email, 'pending' AS role, 1 AS pending
            FROM invitations i WHERE i.organization_id=? AND i.status='pending'
            AND NOT EXISTS (SELECT 1 FROM users u WHERE u.organization_id=i.organization_id AND LOWER(TRIM(u.email))=LOWER(TRIM(i.email)))
            AND i.id=(SELECT MAX(j.id) FROM invitations j WHERE j.organization_id=i.organization_id AND j.status='pending' AND LOWER(TRIM(j.email))=LOWER(TRIM(i.email)))
            ORDER BY i.email`,[u.organization_id])).rows;
        return [{id:u.id,name:u.admin_name,email:u.email}, ...employees.filter(e=>e.id!==u.id), ...pending];
    };
    const validate = (t) => {
        if (!t || typeof t.title!=='string' || !t.title.trim() || t.title.length>160 || typeof t.description!=='string' || t.description.length>(t.description.startsWith('<!--task-rich-->')?20000:2000) || !['todo','progress','done'].includes(t.status) || !['low','medium','high'].includes(t.priority) || typeof t.dueDate!=='string' || (t.dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(t.dueDate) || !Number.isFinite(Date.parse(t.dueDate)) || new Date(t.dueDate).toISOString().slice(0,10)!==t.dueDate))) fail(400,'Provide a task name, valid status, priority and due date.');
    };
    const assignment = async (u, id) => {
        const assigned = String(id || u.id);
        if (!(await assignees(u)).some(e=>String(e.id)===assigned && !e.blocked)) fail(403,'Choose an active employee you are allowed to assign.');
        return assigned;
    };
    const attachmentStatements = async (taskId, files) => {
        if(files === undefined) return [];
        if(!Array.isArray(files) || files.length>5) fail(400,'Attach up to 5 files.');
        const existing=(await execute('SELECT id,name,size,data FROM task_attachments WHERE task_id=?',[taskId])).rows;
        let total=0;
        const normalized=files.map(f=>{
            if(!f || typeof f!=='object') fail(400,'Invalid attachment.');
            if(f.id) {const old=existing.find(a=>a.id===f.id);if(!old)fail(400,'Attachment does not belong to this task.');total+=old.size;return old;}
            if(typeof f.name!=='string' || !f.name.trim() || f.name.length>180 || /[\/\\\x00-\x1f]/.test(f.name) || typeof f.data!=='string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(f.data)) fail(400,'Invalid attachment name or content.');
            const size=Buffer.from(f.data,'base64').length;
            if(!size || size>2*1024*1024)fail(400,'Each attachment must be between 1 byte and 2 MB.');
            total+=size;return {id:randomUUID(),name:f.name.trim(),size,data:f.data};
        });
        if(total>6*1024*1024)fail(400,'Attachments must total 6 MB or less.');
        if(new Set(normalized.map(f=>f.id)).size!==normalized.length)fail(400,'Duplicate attachment.');
        return [{sql:'DELETE FROM task_attachments WHERE task_id=?',args:[taskId]},...normalized.map(f=>({sql:'INSERT INTO task_attachments(id,task_id,name,size,data) VALUES(?,?,?,?,?)',args:[f.id,taskId,f.name,f.size,f.data]}))];
    };
    router.get('/:id/attachments/:fileId',async(req,res,next)=>{
        try {
            const t=(await execute(`${selection} WHERE t.id=?`,[req.params.id])).rows[0];
            if(!t || !visible(req.taskUser,t))fail(404,'Task not found.');
            const file=(await execute('SELECT * FROM task_attachments WHERE id=? AND task_id=?',[req.params.fileId,t.id])).rows[0];
            if(!file)fail(404,'Attachment not found.');
            res.set({'Content-Type':'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`});
            res.send(Buffer.from(file.data,'base64'));
        }catch(err){next(err);}
    });
    router.get('/', async (req,res,next) => {
        try {
            const u=req.taskUser;
            if (isOwnerOrAdmin(u)) {
                const rows = (await execute(`${selection} WHERE t.organization_id=? ORDER BY t.created_at DESC,t.id`, [u.organization_id])).rows;
                return res.json({tasks:rows.map(t=>map(t,u)),assignees:await assignees(u),canAssign:true,currentUserId:String(u.id)});
            }
            const cleanEmail = typeof u.email === 'string' ? u.email.trim().toLowerCase() : '';
            const userIdStr = String(u.id);
            let whereClause = `WHERE t.organization_id=? AND (t.assignee_id=? OR CAST(t.assignee_id AS TEXT)=?`;
            const args = [u.organization_id, u.id, userIdStr];
            if (cleanEmail) {
                whereClause += ` OR LOWER(TRIM(CAST(t.assignee_id AS TEXT)))=? OR (u.email IS NOT NULL AND LOWER(TRIM(u.email))=?) OR (i.email IS NOT NULL AND LOWER(TRIM(i.email))=?)`;
                args.push(cleanEmail, cleanEmail, cleanEmail);
            }
            whereClause += `) ORDER BY t.created_at DESC,t.id`;
            const rows = (await execute(`${selection} ${whereClause}`, args)).rows;
            res.json({tasks:rows.map(t=>map(t,u)),assignees:await assignees(u),canAssign:false,currentUserId:userIdStr});
        } catch(err) {next(err);}
    });
    router.post('/', async (req,res,next) => {
        try {
            const u=req.taskUser,t=req.body;validate(t);
            const assigned=await assignment(u,t.assigneeId), id=randomUUID();
            await client.batch([{sql:'INSERT INTO tasks (id,organization_id,creator_id,assignee_id,title,description,status,priority,due_date) VALUES (?,?,?,?,?,?,?,?,?)',args:[id,u.organization_id,u.id,assigned,t.title.trim(),t.description,t.status,t.priority,t.dueDate]},...await attachmentStatements(id,t.attachments)],'write');
            res.status(201).json({task:map((await execute(`${selection} WHERE t.id=?`,[id])).rows[0],u)});
        } catch(err) {next(err);}
    });
    router.post('/import', async (req,res,next) => {
        try {
            const u=req.taskUser, list=req.body.tasks;
            if (!Array.isArray(list) || !list.length || list.length>500) fail(400,'Import between 1 and 500 tasks at a time.');
            const allowed=await assignees(u);
            // Validate the complete batch before writing; libSQL batch is atomic.
            const statements=list.map(t=>{
                validate(t);const assigned=String(t.assigneeId || u.id);
                if(!allowed.some(e=>String(e.id)===assigned && !e.blocked)) fail(403,'The import contains an employee you cannot assign.');
                // Stable IDs make repeat imports idempotent without overwriting existing tasks.
                const id=typeof t.id==='string' && t.id.length<=100 ? `import:${u.organization_id}:${u.id}:${t.id}` : randomUUID();
                return {sql:'INSERT OR IGNORE INTO tasks (id,organization_id,creator_id,assignee_id,title,description,status,priority,due_date) SELECT ?,?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE id=? AND organization_id=? AND (creator_id=? OR ?=1))',args:[id,u.organization_id,u.id,assigned,t.title.trim(),t.description,t.status,t.priority,t.dueDate,typeof t.id==='string'?t.id:'',u.organization_id,u.id,isOwnerOrAdmin(u)?1:0]};
            });
            const result=await client.batch(statements,'write');
            res.json({imported:result.reduce((n,r)=>n+r.rowsAffected,0)});
        } catch(err) {next(err);}
    });
    router.patch('/:id', async (req,res,next) => {
        try {
            const u=req.taskUser,t=(await execute(`${selection} WHERE t.id=?`,[req.params.id])).rows[0];
            if(!t || !visible(u,t)) fail(404,'Task not found.');
            if (!canManage(u,t)) {
                if(Object.keys(req.body).some(k=>k!=='status') || !['todo','progress','done'].includes(req.body.status)) fail(403,'You can only update the status of an assigned task.');
                await execute('UPDATE tasks SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',[req.body.status,t.id]);
            } else {
                const body=req.body;
                if(Object.keys(body).length===1 && body.status) {
                    if(!['todo','progress','done'].includes(body.status)) fail(400,'Invalid status.');
                    await execute('UPDATE tasks SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',[body.status,t.id]);
                } else {
                    validate(body);
                    const assigned=String(body.assigneeId)===String(t.assignee_id) ? t.assignee_id : await assignment(u,body.assigneeId);
                    await client.batch([{sql:'UPDATE tasks SET assigned_at=CASE WHEN ?=1 THEN CURRENT_TIMESTAMP ELSE assigned_at END,assignee_id=?,title=?,description=?,status=?,priority=?,due_date=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',args:[String(assigned)!==String(t.assignee_id)?1:0,assigned,body.title.trim(),body.description,body.status,body.priority,body.dueDate,t.id]},...await attachmentStatements(t.id,body.attachments)],'write');
                }
            }
            res.json({task:map((await execute(`${selection} WHERE t.id=?`,[t.id])).rows[0],u)});
        } catch(err) {next(err);}
    });
    router.delete('/:id', async (req,res,next) => {
        try {
            const u=req.taskUser,t=(await execute(`${selection} WHERE t.id=?`,[req.params.id])).rows[0];
            if(!t || !visible(u,t)) fail(404,'Task not found.');
            if(!canManage(u,t)) fail(403,'Only the task creator or manager can delete this task.');
            await client.batch([{sql:'DELETE FROM task_attachments WHERE task_id=?',args:[t.id]},{sql:'DELETE FROM tasks WHERE id=?',args:[t.id]}],'write');res.json({success:true});
        } catch(err) {next(err);}
    });
    router.use((err,req,res,next)=>{ if(res.headersSent) return next(err); if(!err.status) console.error('[tasks]',err.message);res.status(err.status||500).json({error:err.status?err.message:'Tasks could not be saved or loaded. Please try again.'}); });
    return router;
}
module.exports = { createTasksRouter };

