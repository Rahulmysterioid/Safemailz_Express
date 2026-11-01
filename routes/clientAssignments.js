const express = require('express');
const jwt = require('jsonwebtoken');
function createClientAssignmentsRouter(db, secret) {
    const router = express.Router();
    let schema;
    const query = (sql,args=[]) => db.execute({sql,args});
    const options = async org => (await query(`SELECT LOWER(TRIM(email)) AS email, admin_name AS name, 0 AS pending FROM users WHERE organization_id=? AND role='employee' AND COALESCE(is_blocked,0)=0
        UNION SELECT LOWER(TRIM(i.email)), i.email, 1 FROM invitations i WHERE i.organization_id=? AND i.status='pending' AND NOT EXISTS (SELECT 1 FROM users u WHERE u.organization_id=i.organization_id AND LOWER(TRIM(u.email))=LOWER(TRIM(i.email)))`,[org,org])).rows;
    router.use(async(req,res,next)=>{
        try {
            let claims;
            try { claims=jwt.verify((req.headers.authorization||'').replace(/^Bearer /i,''),secret,{algorithms:['HS256']}); }
            catch { return res.status(401).json({error:'Please sign in again.'}); }
            const user=(await query('SELECT * FROM users WHERE id=?',[claims.id])).rows[0];
            if(!user || user.is_blocked || Number(user.tokenVersion||0)!==Number(claims.tokenVersion||0)) return res.status(401).json({error:'Please sign in again.'});
            if(!['org_owner','admin'].includes(user.role) || user.mustChangePassword) return res.status(403).json({error:'Only owners and admins can assign clients.'});
            req.assignmentUser=user;
            if(!schema) schema=query(`CREATE TABLE IF NOT EXISTS client_employee_assignments (organization_id INTEGER NOT NULL,client_id INTEGER NOT NULL,employee_email TEXT NOT NULL,PRIMARY KEY(organization_id,client_id,employee_email))`).catch(e=>{schema=null;throw e;});
            await schema; next();
        } catch(e){next(e);}
    });
    router.get('/',async(req,res,next)=>{
        try {
            const org=req.assignmentUser.organization_id;
            const rows=(await query('SELECT a.client_id,a.employee_email FROM client_employee_assignments a JOIN clients c ON c.id=a.client_id AND c.organization_id=a.organization_id WHERE a.organization_id=?',[org])).rows;
            const assignments={};
            rows.forEach(r=>{(assignments['c-'+r.client_id] ||= []).push(r.employee_email);});
            res.set('Cache-Control','no-store').json({assignments,employees:await options(org)});
        }catch(e){next(e);}
    });
    router.put('/:id',async(req,res,next)=>{
        try {
            const org=req.assignmentUser.organization_id,id=String(req.params.id).replace(/^c-/,'');
            const emails=req.body.employeeEmails;
            if(!Array.isArray(emails)||emails.length>500||emails.some(e=>typeof e!=='string')) return res.status(400).json({error:'Choose valid employees.'});
            if(!(await query('SELECT id FROM clients WHERE id=? AND organization_id=?',[id,org])).rows.length) return res.status(404).json({error:'Client not found.'});
            const selected=[...new Set(emails.map(e=>e.trim().toLowerCase()))];
            const allowed=new Set((await options(org)).map(e=>e.email));
            if(selected.some(e=>!allowed.has(e))) return res.status(400).json({error:'Choose employees from your organization.'});
            await db.batch([{sql:'DELETE FROM client_employee_assignments WHERE organization_id=? AND client_id=?',args:[org,id]},...selected.map(email=>({sql:'INSERT INTO client_employee_assignments(organization_id,client_id,employee_email) VALUES(?,?,?)',args:[org,id,email]}))],'write');
            res.json({success:true,employeeEmails:selected});
        }catch(e){next(e);}
    });
    router.use((err,req,res,next)=>{console.error('[client assignments]',err.message);res.status(500).json({error:'Unable to save client assignments. Please retry.'});});
    return router;
}
module.exports={createClientAssignmentsRouter};
