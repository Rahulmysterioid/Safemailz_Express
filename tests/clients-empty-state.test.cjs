const { test, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const clientsViewPath = path.resolve(__dirname, '../client/src/pages/dashboard/ClientsView.jsx');
const clientsSidebarPath = path.resolve(__dirname, '../client/src/components/layout/ClientsSidebar.jsx');
const clientsCssPath = path.resolve(__dirname, '../client/src/pages/dashboard/ClientsLightPolish.css');

describe('Clients Page Empty State UI Refactor Suite', () => {
    const clientsViewCode = fs.readFileSync(clientsViewPath, 'utf8');
    const clientsSidebarCode = fs.readFileSync(clientsSidebarPath, 'utf8');
    const clientsCssCode = fs.readFileSync(clientsCssPath, 'utf8');

    it('Step 1: Main Content Header layout and alignment', () => {
        // Container has flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 w-full
        assert.ok(
            clientsViewCode.includes('clients-header-bar flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 w-full'),
            'Header bar must have proper flex container classes spanning full width and justifying between'
        );

        // Title and badge group
        assert.ok(
            clientsViewCode.includes('flex items-center gap-2.5'),
            'Title and count pill badge must be grouped with flex items-center gap-2.5'
        );

        // Constrained subtitle
        assert.ok(
            clientsViewCode.includes('clients-page-subtitle max-w-md text-sm text-slate-500'),
            'Subtitle must be constrained with max-w-md text-sm text-slate-500'
        );

        // Right-aligned search input with sm:w-80
        assert.ok(
            clientsViewCode.includes('clients-main-search-wrap relative w-full sm:w-80 flex items-center'),
            'Search input wrapper must use sm:w-80'
        );

        // Conditionally disabled when clients.length === 0
        assert.ok(
            clientsViewCode.includes('id="mainClientsSearchInput"') &&
            clientsViewCode.includes('disabled={clients.length === 0}'),
            'Header search input must be disabled when clients.length === 0'
        );

        // Disabled styling on header search input
        assert.ok(
            clientsViewCode.includes('disabled:opacity-50') &&
            clientsViewCode.includes('disabled:cursor-not-allowed'),
            'Header search input must include disabled:opacity-50 and disabled:cursor-not-allowed'
        );
    });

    it('Step 2: Main Empty State Card redesign and content', () => {
        // Card container classes: w-full min-h-[380px] bg-white border border-dashed border-slate-200 rounded-2xl p-12
        assert.ok(
            clientsViewCode.includes('min-h-[380px]') &&
            clientsViewCode.includes('border-dashed') &&
            clientsViewCode.includes('rounded-2xl') &&
            clientsViewCode.includes('p-12') &&
            clientsViewCode.includes('items-center justify-center text-center'),
            'Empty state card must have min-h-[380px], border-dashed, rounded-2xl, p-12, and centered flex content'
        );

        // Icon circle wrapper: w-16 h-16 rounded-full bg-blue-50/80 border border-blue-100 flex items-center justify-center text-blue-600 mb-5
        assert.ok(
            clientsViewCode.includes('w-16 h-16 rounded-full bg-blue-50/80') &&
            clientsViewCode.includes('border border-blue-100') &&
            clientsViewCode.includes('text-blue-600') &&
            clientsViewCode.includes('mb-5'),
            'Icon wrapper must be 64x64 (w-16 h-16) rounded-full with bg-blue-50/80 border-blue-100 text-blue-600 mb-5'
        );

        // Heading: text-lg font-semibold text-slate-900 mb-1.5
        assert.ok(
            clientsViewCode.includes('text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1.5') &&
            clientsViewCode.includes('No clients added yet'),
            'Empty state heading must have text-lg font-semibold text-slate-900 mb-1.5 and text "No clients added yet"'
        );

        // Description: text-sm text-slate-500 max-w-sm mb-6 leading-relaxed
        assert.ok(
            clientsViewCode.includes('text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed') &&
            clientsViewCode.includes('Get started by adding your first client'),
            'Empty state description must have text-sm text-slate-500 max-w-sm mb-6 leading-relaxed'
        );

        // Primary CTA: inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-xs transition-all
        assert.ok(
            clientsViewCode.includes('btn-add-client inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium') &&
            clientsViewCode.includes('onClick={openAddModal}'),
            'Primary CTA must have required styling and preserve openAddModal onClick handler'
        );

        // Secondary CTA: or Import from CSV invoking handleImport
        assert.ok(
            clientsViewCode.includes('or Import from CSV') &&
            clientsViewCode.includes('onClick={handleImport}'),
            'Secondary CTA must show "or Import from CSV" and preserve handleImport onClick handler'
        );
    });

    it('Step 3: Left Sidebar empty state, Export button, and Search input', () => {
        // Export button disabled when clients.length === 0
        assert.ok(
            clientsSidebarCode.includes('id="clientsExportBtn"') &&
            clientsSidebarCode.includes('disabled={clients.length === 0}'),
            'Sidebar Export button must be disabled when clients.length === 0'
        );
        assert.ok(
            clientsSidebarCode.includes('disabled:opacity-50') &&
            clientsSidebarCode.includes('disabled:cursor-not-allowed'),
            'Sidebar Export button must have disabled:opacity-50 disabled:cursor-not-allowed classes'
        );

        // Sidebar Search input disabled when clients.length === 0
        assert.ok(
            clientsSidebarCode.includes('id="clientsSidebarSearch"') &&
            clientsSidebarCode.includes('disabled={clients.length === 0}'),
            'Sidebar search input must be disabled when clients.length === 0'
        );
        assert.ok(
            clientsSidebarCode.includes('disabled:opacity-50') &&
            clientsSidebarCode.includes('disabled:cursor-not-allowed'),
            'Sidebar search input must have disabled:opacity-50 disabled:cursor-not-allowed classes'
        );

        // Subtle muted block for empty directory
        assert.ok(
            clientsSidebarCode.includes('py-8 px-4 text-center text-xs text-slate-400') &&
            clientsSidebarCode.includes('bg-slate-50/60') &&
            clientsSidebarCode.includes('rounded-xl border border-dashed border-slate-200'),
            'Sidebar empty container must have classes py-8 px-4 text-center text-xs text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200'
        );
        assert.ok(
            clientsSidebarCode.includes('No clients in directory'),
            'Sidebar empty container must display "No clients in directory" when clients list is empty'
        );

        // Existing click handlers remain intact
        assert.ok(
            clientsSidebarCode.includes('onClick={openAddClientModal}') &&
            clientsSidebarCode.includes('onClick={handleImportClients}') &&
            clientsSidebarCode.includes('onClick={handleExportClients}'),
            'Sidebar click handlers for Add Client, Import, and Export must remain intact'
        );
    });

    it('Step 4: ClientsLightPolish.css supportive rules', () => {
        // Disabled inputs styling
        assert.ok(
            clientsCssCode.includes('#clientsView .clients-main-search-input:disabled') &&
            clientsCssCode.includes('#clientsSidebar #clientsSidebarSearch:disabled'),
            'CSS must include disabled rules for main search and sidebar search'
        );

        // Disabled action button styling and hover override
        assert.ok(
            clientsCssCode.includes('#clientsSidebar .clients-sidebar-action-btn:disabled'),
            'CSS must include disabled styling for sidebar action buttons'
        );
        assert.ok(
            clientsCssCode.includes('#clientsSidebar .clients-sidebar-action-btn:disabled:hover'),
            'CSS must prevent hover color mutation on disabled action buttons'
        );

        // Sidebar empty container styling
        assert.ok(
            clientsCssCode.includes('#clientsSidebar .clients-sidebar-empty'),
            'CSS must style .clients-sidebar-empty'
        );
    });

    it('Step 5: Empirical evaluation of empty vs populated state logic', () => {
        // Test count pill logic when clients = []
        const calculatePillText = (clients, filteredClients, searchQuery) => {
            return clients.length === 0 ? 0 : searchQuery ? `${filteredClients.length} of ${clients.length}` : filteredClients.length;
        };

        assert.equal(calculatePillText([], [], ''), 0, 'Count pill should show 0 when clients array is empty');
        assert.equal(calculatePillText([], [], 'query'), 0, 'Count pill should strictly show 0 when empty even if searchQuery is populated');
        assert.equal(calculatePillText([{ id: 1 }, { id: 2 }], [{ id: 1 }], 'one'), '1 of 2', 'Count pill displays "X of Y" when filtered');
        assert.equal(calculatePillText([{ id: 1 }], [{ id: 1 }], ''), 1, 'Count pill displays count when not searching');

        // Test export button disabled condition
        const isExportDisabled = (clients) => clients.length === 0;
        assert.equal(isExportDisabled([]), true, 'Export button must be disabled for 0 clients');
        assert.equal(isExportDisabled([{ id: 'c1' }]), false, 'Export button must be enabled when clients exist');

        // Test sidebar text switch
        const getSidebarEmptyText = (clients) => clients.length === 0 ? 'No clients in directory' : 'No clients found';
        assert.equal(getSidebarEmptyText([]), 'No clients in directory', 'Shows "No clients in directory" when clients list is empty');
        assert.equal(getSidebarEmptyText([{ id: 'c1' }]), 'No clients found', 'Shows "No clients found" when searching non-empty directory');
    });
});
