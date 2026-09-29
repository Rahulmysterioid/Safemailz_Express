const express = require('express');
const router = express.Router();
const { db } = require('../db');
const XLSX = require('xlsx');

// Helper to get user context from headers
const getUserContext = (req) => {
    const userId = req.headers['x-user-id'];
    const orgId = req.headers['x-org-id'];
    if (!userId || !orgId) {
        return null;
    }
    return { userId: parseInt(userId, 10), orgId: parseInt(orgId, 10) };
};

// GET /api/projects
router.get('/', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    db.all(`SELECT * FROM projects WHERE organization_id = ? ORDER BY created_at DESC`, [context.orgId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch projects' });
        // Map to expected frontend format
        const projects = rows.map(r => ({
            id: r.project_id,
            projectName: r.project_name,
            leader: r.leader,
            client: r.client,
            employeeName: r.employee_name,
            projectEmailId: r.project_email_id,
            status: r.status
        }));
        res.json({ projects });
    });
});

// GET /api/projects/leaders
router.get('/leaders', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    db.all(
        'SELECT id, admin_name as name, email, role FROM users WHERE organization_id = ? AND role IN (?, ?) ORDER BY role DESC, admin_name ASC',
        [context.orgId, 'org_owner', 'admin'],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true, leaders: rows });
        }
    );
});

// POST /api/projects
router.post('/', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { id, projectName, leader, client, employeeName, projectEmailId, status } = req.body;
    if (!projectName || !id) {
        return res.status(400).json({ error: 'Project ID and Project Name are required' });
    }

    const query = `
        INSERT INTO projects (organization_id, project_id, project_name, leader, client, employee_name, project_email_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
        context.orgId,
        id,
        projectName,
        leader || '',
        client || '',
        employeeName || '',
        projectEmailId || '',
        status || 'Active'
    ];

    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: 'Failed to create project' });
        res.json({ success: true, project_id: id });
    });
});

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const projectId = req.params.id;
    const { projectName, leader, client, employeeName, projectEmailId, status } = req.body;

    let updateFields = [];
    let params = [];

    if (projectName !== undefined) { updateFields.push('project_name = ?'); params.push(projectName); }
    if (leader !== undefined) { updateFields.push('leader = ?'); params.push(leader); }
    if (client !== undefined) { updateFields.push('client = ?'); params.push(client); }
    if (employeeName !== undefined) { updateFields.push('employee_name = ?'); params.push(employeeName); }
    if (projectEmailId !== undefined) { updateFields.push('project_email_id = ?'); params.push(projectEmailId); }
    if (status !== undefined) { updateFields.push('status = ?'); params.push(status); }

    if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(context.orgId, projectId);

    const query = `UPDATE projects SET ${updateFields.join(', ')} WHERE organization_id = ? AND project_id = ?`;

    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: 'Failed to update project' });
        if (this.changes === 0) return res.status(404).json({ error: 'Project not found' });
        res.json({ success: true });
    });
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const projectId = req.params.id;

    db.run(`DELETE FROM projects WHERE organization_id = ? AND project_id = ?`, [context.orgId, projectId], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to delete project' });
        if (this.changes === 0) return res.status(404).json({ error: 'Project not found' });
        res.json({ success: true });
    });
});

// GET /api/projects/export
// Export all projects to Excel
router.get('/export', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    db.all(
        'SELECT project_id, project_name, leader, client, employee_name, project_email_id, status FROM projects WHERE organization_id = ? ORDER BY created_at DESC',
        [context.orgId],
        (err, rows) => {
            if (err) {
                console.error('[DB Error fetching projects for export]:', err);
                return res.status(500).json({ error: 'Failed to fetch projects for export' });
            }

            const exportData = rows.map(r => ({
                'Project ID': r.project_id || '',
                'Project Name': r.project_name || '',
                'Project Leader': r.leader || '',
                'Client': r.client || '',
                'Employee Name': r.employee_name || '',
                'Project Email ID': r.project_email_id || '',
                'Status': r.status || ''
            }));

            let worksheet;
            if (exportData.length === 0) {
                worksheet = XLSX.utils.aoa_to_sheet([["Project ID", "Project Name", "Project Leader", "Client", "Employee Name", "Project Email ID", "Status"]]);
            } else {
                worksheet = XLSX.utils.json_to_sheet(exportData, { header: ["Project ID", "Project Name", "Project Leader", "Client", "Employee Name", "Project Email ID", "Status"] });
            }
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Projects");

            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="Projects_Export.xlsx"');
            res.send(buffer);
        }
    );
});

// POST /api/projects/import
// Bulk import projects from JSON array
router.post('/import', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const projects = req.body.projects;
    if (!Array.isArray(projects)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    if (projects.length === 0) {
        return res.json({ success: true, message: 'No projects to import' });
    }

    let imported = 0;
    let errors = 0;
    let skipped = 0;

    const processNext = (index) => {
        if (index >= projects.length) {
            return res.json({ success: true, imported, skipped, errors, message: `Import complete. Imported: ${imported}, Skipped: ${skipped}, Errors: ${errors}` });
        }

        const row = projects[index];
        const projectName = row['Project Name'] || '';
        let projectId = row['Project ID'] || '';
        const leader = row['Project Leader'] || '';
        const client = row['Client'] || '';
        const employeeName = row['Employee Name'] || '';
        const projectEmailId = row['Project Email ID'] || '';
        const status = row['Status'] || 'Active';

        if (!projectName) {
            errors++;
            return processNext(index + 1);
        }

        // Generate ID if missing
        if (!projectId) {
            const randomNum = Math.floor(10000 + Math.random() * 90000);
            projectId = 'PROJ-' + randomNum;
        }

        db.get('SELECT id FROM projects WHERE (project_id = ? OR project_name = ?) AND organization_id = ?', [projectId, projectName, context.orgId], (err, existing) => {
            if (err) {
                errors++;
                return processNext(index + 1);
            }

            if (existing) {
                // Skip overwriting existing project
                skipped++;
                processNext(index + 1);
            } else {
                db.run(
                    'INSERT INTO projects (organization_id, project_id, project_name, leader, client, employee_name, project_email_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [context.orgId, projectId, projectName, leader, client, employeeName, projectEmailId, status],
                    (insertErr) => {
                        if (insertErr) errors++;
                        else imported++;
                        processNext(index + 1);
                    }
                );
            }
        });
    };

    processNext(0);
});

module.exports = router;
