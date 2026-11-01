const {test}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const jwt=require('jsonwebtoken');
const {createClient}=require('@libsql/client');
const {createClientAssignmentsRouter}=require('../routes/clientAssignments');
test('client assignments persist, support pending invitations, and enforce organization and role',async()=>{
 const db=createClient({url:':memory:'});
 await db.batch([
 'CREATE TABLE users(id INTEGER PRIMARY KEY,organization_id INTEGER,email TEXT,admin_name TEXT,role TEXT,is_blocked INTEGER DEFAULT 0,tokenVersion INTEGER DEFAULT 0)',
 'CREATE TABLE invitations(id INTEGER,organization_id INTEGER,email TEXT,status TEXT)',
 'CREATE TABLE clients(id INTEGER PRIMARY KEY,organization_id INTEGER)',
 "INSERT INTO users(id,organization_id,email,admin_name,role) VALUES(1,1,'owner@test','Owner','org_owner'),(2,1,'employee@test','Employee','employee'),(3,2,'foreign@test','Other','employee')",
 "INSERT INTO invitations VALUES(9,1,'pending@test','pending')",
 'INSERT INTO clients VALUES(10,1),(20,2)'
 ],'write');
 const app=express();app.use(express.json());app.use('/assignments',createClientAssignmentsRouter(db,'secret'));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const call=async(user,path='',body)=>{
 const response=await fetch(`http://127.0.0.1:${server.address().port}/assignments${path}`,{method:body?'PUT':'GET',headers:{Authorization:`Bearer ${jwt.sign({id:user},'secret')}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};};
 try {
 assert.equal((await call(1,'/c-10',{employeeEmails:['employee@test','pending@test']})).status,200);
 assert.deepEqual((await call(1)).data.assignments['c-10'].sort(),['employee@test','pending@test']);
 assert.equal((await call(2)).status,403);
 assert.equal((await call(1,'/c-20',{employeeEmails:[]})).status,404);
 assert.equal((await call(1,'/c-10',{employeeEmails:['foreign@test']})).status,400);
 assert.equal((await call(1)).data.assignments['c-10'].length,2);
 assert.equal((await call(1,'/c-10',{employeeEmails:[]})).status,200);
 assert.equal((await call(1)).data.assignments['c-10'],undefined);
 }finally{await new Promise(r=>server.close(r));db.close();}
});
