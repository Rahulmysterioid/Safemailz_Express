const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const adminsSidebarPath = path.resolve(__dirname, '../client/src/components/layout/AdminsSidebar.jsx');
const adminsViewPath = path.resolve(__dirname, '../client/src/pages/dashboard/AdminsView.jsx');
const subscriptionViewPath = path.resolve(__dirname, '../client/src/pages/dashboard/SubscriptionView.jsx');
const appJsxPath = path.resolve(__dirname, '../client/src/App.jsx');
const adminsCssPath = path.resolve(__dirname, '../client/src/pages/dashboard/AdminsLightPolish.css');
const subCssPath = path.resolve(__dirname, '../client/src/pages/dashboard/SubscriptionLightPolish.css');
const sidebarPath = path.resolve(__dirname, '../client/src/components/layout/Sidebar.jsx');
const emailIdsSidebarPath = path.resolve(__dirname, '../client/src/components/layout/EmailIdsSidebar.jsx');
const dashboardLayoutPath = path.resolve(__dirname, '../client/src/components/layout/DashboardLayout.jsx');

describe('Admin & Boost Search Circle Buttons Unfreeze Verification Suite', () => {
    const adminsSidebarCode = fs.readFileSync(adminsSidebarPath, 'utf8');
    const adminsViewCode = fs.readFileSync(adminsViewPath, 'utf8');
    const subscriptionViewCode = fs.readFileSync(subscriptionViewPath, 'utf8');
    const appJsxCode = fs.readFileSync(appJsxPath, 'utf8');
    const adminsCssCode = fs.readFileSync(adminsCssPath, 'utf8');
    const subCssCode = fs.readFileSync(subCssPath, 'utf8');
    const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');
    const emailIdsSidebarCode = fs.readFileSync(emailIdsSidebarPath, 'utf8');
    const dashboardLayoutCode = fs.readFileSync(dashboardLayoutPath, 'utf8');

    it('Step 1: AdminsSidebar search input is never frozen/disabled and circle search button is interactive', () => {
        // Search input should not have disabled attribute
        const searchInputMatch = adminsSidebarCode.match(/<input[^>]*id="adminsSidebarSearch"[^>]*>/s) ||
                                 adminsSidebarCode.match(/<input[^>]*placeholder="Search admin\.\.\."[^>]*>/s);
        assert.ok(searchInputMatch, 'Found adminsSidebarSearch input element');
        assert.ok(
            !searchInputMatch[0].includes('disabled'),
            'adminsSidebarSearch input must NOT have disabled attribute'
        );

        // Circular search button should exist
        assert.ok(
            adminsSidebarCode.includes('id="adminsSidebarSearchBtn"'),
            'AdminsSidebar must have id="adminsSidebarSearchBtn"'
        );
        assert.ok(
            adminsSidebarCode.includes("borderRadius: '9999px'"),
            'adminsSidebarSearchBtn must have circular border-radius (9999px)'
        );
        assert.ok(
            adminsSidebarCode.includes('<circle cx="11" cy="11" r="8"></circle>'),
            'adminsSidebarSearchBtn must contain the search circle SVG'
        );
        assert.ok(
            adminsSidebarCode.includes("searchInputRef.current.focus()"),
            'adminsSidebarSearchBtn must focus the search input via ref'
        );

        // Clear button should be circular
        assert.ok(
            adminsSidebarCode.includes('sidebar-search-clear-btn') &&
            adminsSidebarCode.includes("borderRadius: '9999px'"),
            'Clear button in AdminsSidebar must be circular'
        );
    });

    it('Step 2: AdminsView search input is not disabled and circle search button is interactive', () => {
        // Search input should not be disabled
        assert.ok(
            !adminsViewCode.includes('disabled={isEmpty}'),
            'mainAdminsSearchInput must NOT have disabled={isEmpty}'
        );

        // Circular search button should exist
        assert.ok(
            adminsViewCode.includes('id="mainAdminsSearchBtn"'),
            'AdminsView must have id="mainAdminsSearchBtn"'
        );
        assert.ok(
            adminsViewCode.includes('<circle cx="11" cy="11" r="8"></circle>'),
            'mainAdminsSearchBtn must contain the search circle SVG'
        );
        assert.ok(
            adminsViewCode.includes("mainSearchInputRef.current.focus()"),
            'mainAdminsSearchBtn must focus mainAdminsSearchInput via ref'
        );

        // Clear button should be circular
        assert.ok(
            adminsViewCode.includes('admins-main-search-clear') &&
            adminsViewCode.includes("borderRadius: '9999px'"),
            'Clear button in AdminsView must be circular'
        );
    });

    it('Step 3: SubscriptionView (Boost) search bar has interactive circle search button, dedicated circle admin button, and admin search integration', () => {
        // Circular search button should exist
        assert.ok(
            subscriptionViewCode.includes('id="subSearchBtn"'),
            'SubscriptionView must have id="subSearchBtn"'
        );
        assert.ok(
            subscriptionViewCode.includes('<circle cx="11" cy="11" r="8"></circle>'),
            'subSearchBtn must contain the search circle SVG'
        );
        assert.ok(
            subscriptionViewCode.includes("subSearchInputRef.current.focus()"),
            'subSearchBtn must focus subSearchBoxInput via ref'
        );

        // Dedicated circular Search Admin button should exist
        assert.ok(
            subscriptionViewCode.includes('id="subSearchAdminBtn"'),
            'SubscriptionView must have dedicated id="subSearchAdminBtn"'
        );
        assert.ok(
            subscriptionViewCode.includes("borderRadius: '9999px'"),
            'subSearchAdminBtn must have circular border-radius (9999px)'
        );

        // Admins should be integrated into allSeats for search and free tier filtering
        assert.ok(
            subscriptionViewCode.includes("import { useAdmin } from '../../context/AdminContext'"),
            'SubscriptionView must import useAdmin'
        );
        assert.ok(
            subscriptionViewCode.includes('const allSeats = useMemo('),
            'SubscriptionView must compute allSeats combining employees and admins'
        );
        assert.ok(
            subscriptionViewCode.includes('allSeats.filter('),
            'filteredEmployees must filter across allSeats to find admin accounts'
        );

        // Page count pill must use allSeats.length
        assert.ok(
            subscriptionViewCode.includes('${allSeats.length} Active Seats') &&
            subscriptionViewCode.includes('${allSeats.length} Seats'),
            'SubscriptionView page count pill must count against allSeats.length'
        );

        // Filter pill must clearly label Admin (Free)
        assert.ok(
            subscriptionViewCode.includes("label: 'Admin (Free)'"),
            'Toolbar filter pill must clearly display Admin (Free)'
        );
    });

    it('Step 4: App.jsx and layout navigation components provide /boost and boost routes with correct sidebar integration', () => {
        assert.ok(
            appJsxCode.includes('path="boost"'),
            'App.jsx must declare dashboard/boost route'
        );
        assert.ok(
            appJsxCode.includes('path="/boost"'),
            'App.jsx must declare top-level /boost route alias'
        );
        assert.ok(
            sidebarCode.includes("location.pathname.startsWith('/dashboard/boost')"),
            'Sidebar.jsx must recognize /dashboard/boost for subscription sidebar'
        );
        assert.ok(
            emailIdsSidebarCode.includes("location.pathname.startsWith('/dashboard/boost')"),
            'EmailIdsSidebar.jsx must recognize /dashboard/boost for provisioned seats'
        );
        assert.ok(
            dashboardLayoutCode.includes("window.location.pathname.includes('/boost')"),
            'DashboardLayout.jsx must keep Subscription tab active when on /boost'
        );
    });

    it('Step 5: Light & Dark CSS rules support interactive search circle buttons and prevent frozen inputs', () => {
        assert.ok(
            !adminsCssCode.includes('#adminsSidebarSearch:disabled'),
            'AdminsLightPolish.css must not style adminsSidebarSearch as disabled'
        );
        assert.ok(
            adminsCssCode.includes('#adminsSidebarSearchBtn:hover') &&
            adminsCssCode.includes('#mainAdminsSearchBtn:hover'),
            'AdminsLightPolish.css must provide hover styling for search circle buttons'
        );
        assert.ok(
            subCssCode.includes('#subSearchBtn:hover') &&
            subCssCode.includes('#subSearchAdminBtn:hover'),
            'SubscriptionLightPolish.css must provide hover styling for subSearchBtn and subSearchAdminBtn'
        );
        assert.ok(
            subCssCode.includes('html.dark #subscriptionView #subSearchBtn:hover'),
            'SubscriptionLightPolish.css must provide dark mode hover styling for subSearchBtn'
        );
        assert.ok(
            adminsCssCode.includes('html.dark #adminsSidebar #adminsSidebarSearchBtn:hover'),
            'AdminsLightPolish.css must provide dark mode hover styling for adminsSidebarSearchBtn'
        );
    });
});
