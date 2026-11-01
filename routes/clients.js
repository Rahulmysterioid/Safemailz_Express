const express = require('express');
const { db } = require('../db');
const XLSX = require('xlsx');
const getUserContext = (req) => {
    const userId = req.headers['x-user-id'];
    const orgId = req.headers['x-org-id'];
    if (!userId || !orgId) {
        return null;
    }
    return { userId: parseInt(userId, 10), orgId: parseInt(orgId, 10) };
};

const router = express.Router();
router.use('/assignments', require('./clientAssignments').createClientAssignmentsRouter(require('../db').client, process.env.JWT_SECRET || 'safemailz-jwt-secret-key'));

// GET /api/clients
// Fetch all clients for the logged-in user's organization
router.get('/', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    db.all(
        'SELECT id, client_id as clientId, display_name as displayName, name, email, phone, address, created_at as createdAt FROM clients WHERE organization_id = ? ORDER BY created_at DESC',
        [context.orgId],
        (err, rows) => {
            if (err) {
                console.error('[DB Error fetching clients]:', err);
                return res.status(500).json({ error: 'Failed to fetch clients' });
            }
            // Map id to be prefixed with 'c-' for UI compatibility
            const mappedRows = rows.map(r => ({
                ...r,
                id: 'c-' + r.id
            }));
            res.json({ success: true, clients: mappedRows });
        }
    );
});

// GET /api/clients/export
// Export all clients to Excel
router.get('/export', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    db.all(
        'SELECT client_id, name, email, address, phone FROM clients WHERE organization_id = ? ORDER BY created_at DESC',
        [context.orgId],
        (err, rows) => {
            if (err) {
                console.error('[DB Error fetching clients for export]:', err);
                return res.status(500).json({ error: 'Failed to fetch clients for export' });
            }

            // Define custom column names
            const exportData = rows.map(r => ({
                'Client Name': r.name || '',
                'Client Email ID': r.email || '',
                'Address': r.address || '',
                'Phone No': r.phone || ''
            }));

            let worksheet;
            if (exportData.length === 0) {
                worksheet = XLSX.utils.aoa_to_sheet([["Client Name", "Client Email ID", "Address", "Phone No"]]);
            } else {
                worksheet = XLSX.utils.json_to_sheet(exportData, { header: ["Client Name", "Client Email ID", "Address", "Phone No"] });
            }
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");

            // Generate buffer
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="Clients_Export.xlsx"');
            res.send(buffer);
        }
    );
});

// POST /api/clients
// Create a new client
router.post('/', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { displayName, name, email, phone, address, clientId } = req.body;
    if (!displayName || !name || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run(
        'INSERT INTO clients (organization_id, display_name, name, email, phone, address, client_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [context.orgId, displayName, name, email, phone || '', address || '', clientId || ''],
        function (err) {
            if (err) {
                console.error('[DB Error creating client]:', err);
                return res.status(500).json({ error: 'Failed to create client' });
            }
            res.json({ success: true, id: 'c-' + this.lastID, clientId: clientId, message: 'Client created successfully' });
        }
    );
});

// PUT /api/clients/:id
// Update an existing client
router.put('/:id', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const numericId = id.startsWith('c-') ? id.substring(2) : id;
    const { displayName, name, email, phone, address, clientId } = req.body;

    if (!displayName || !name || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run(
        'UPDATE clients SET display_name = ?, name = ?, email = ?, phone = ?, address = ?, client_id = COALESCE(client_id, ?) WHERE id = ? AND organization_id = ?',
        [displayName, name, email, phone || '', address || '', clientId || '', numericId, context.orgId],
        function (err) {
            if (err) {
                console.error('[DB Error updating client]:', err);
                return res.status(500).json({ error: 'Failed to update client' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Client not found or unauthorized' });
            }
            res.json({ success: true, message: 'Client updated successfully' });
        }
    );
});

// DELETE /api/clients/:id
// Delete a client
router.delete('/:id', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    // Extract actual numeric ID from 'c-XX' format
    const numericId = id.startsWith('c-') ? id.substring(2) : id;

    db.run(
        'DELETE FROM clients WHERE id = ? AND organization_id = ?',
        [numericId, context.orgId],
        function (err) {
            if (err) {
                console.error('[DB Error deleting client]:', err);
                return res.status(500).json({ error: 'Failed to delete client' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Client not found or unauthorized' });
            }
            res.json({ success: true, message: 'Client deleted successfully' });
        }
    );
});

// POST /api/clients/import
// Bulk import clients from JSON array with clean import and deduplication
router.post('/import', async (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { clients, replaceExisting = true } = req.body;

    if (!clients || !Array.isArray(clients) || clients.length === 0) {
        return res.status(400).json({ error: 'No client data provided in CSV.' });
    }

    try {
        // 1. If replace option is enabled, remove old client data
        if (replaceExisting) {
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM clients WHERE organization_id = ?', [context.orgId], function(err) {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        // 2. Fetch existing clients from DB matching imported emails
        const importedEmails = clients
            .map(c => (c.email || c["CLIENT EMAIL ID"] || c["Client Email ID"] || c["Client Email"] || c["Email"] || "").toLowerCase().trim())
            .filter(Boolean);

        let existingEmailSet = new Set();
        
        if (!replaceExisting && importedEmails.length > 0) {
            const placeholders = importedEmails.map(() => '?').join(',');
            const query = `SELECT email FROM clients WHERE organization_id = ? AND email IN (${placeholders})`;
            const existingClients = await new Promise((resolve, reject) => {
                db.all(query, [context.orgId, ...importedEmails], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
            existingClients.forEach(c => existingEmailSet.add(c.email.toLowerCase().trim()));
        }

        const newClientsToInsert = [];
        let skippedCount = 0;

        // 3. Filter out existing & in-file duplicate clients
        for (const clientData of clients) {
            const email = (
                clientData.email || 
                clientData["CLIENT EMAIL ID"] || 
                clientData["Client Email ID"] || 
                clientData["Client Email"] || 
                clientData["Email"] || 
                ""
            ).toLowerCase().trim();

            // Skip if email is missing OR already exists in DB / current batch
            if (!email || existingEmailSet.has(email)) {
                skippedCount++;
                continue;
            }

            // Add to set to prevent duplicate entries within the same CSV file
            existingEmailSet.add(email);

            const name = (
                clientData.name || 
                clientData["CLIENT NAME"] || 
                clientData["Client Name"] || 
                clientData.displayName || 
                clientData["Display Name"] || 
                "Client"
            ).trim();
            const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '');
            const randomDigits = Math.floor(10000 + Math.random() * 90000);
            
            newClientsToInsert.push({
                organization_id: context.orgId,
                display_name: name,
                name: name,
                email: email,
                phone: clientData.phone || clientData["PHONE NUMBER"] || clientData["Phone Number"] || clientData["Phone No"] || "",
                address: clientData.address || clientData["ADDRESS"] || clientData["Address"] || "",
                client_id: clientData.clientId || clientData["Client ID"] || clientData["CLIENT ID"] || `${sanitizedName}-Client-${randomDigits}`
            });
        }

        // 4. Insert only new unique records
        if (newClientsToInsert.length > 0) {
            const insertPromises = newClientsToInsert.map(client => {
                return new Promise((resolve, reject) => {
                    db.run(
                        'INSERT INTO clients (organization_id, display_name, name, email, phone, address, client_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [
                            client.organization_id,
                            client.display_name,
                            client.name,
                            client.email,
                            client.phone,
                            client.address,
                            client.client_id
                        ],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            });
            await Promise.all(insertPromises);
        }

        return res.status(200).json({
            success: true,
            importedCount: newClientsToInsert.length,
            skippedCount: skippedCount,
            errorCount: 0,
            message: `Import complete. Imported: ${newClientsToInsert.length}, Skipped (Duplicates): ${skippedCount}`,
            data: newClientsToInsert
        });

    } catch (error) {
        console.error('[DB Error importing clients]:', error);
        return res.status(500).json({ 
            success: false, 
            message: "Failed to process client import.", 
            error: error.message 
        });
    }
});

module.exports = router;
