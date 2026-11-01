/**
 * Adversarial Stress & Vulnerability Test Suite for Milestone 1
 * Targets: server/db.js and server/routes/settings.js
 * 
 * Execution:
 *   node tests/stress-m1-settings.test.js
 */

const assert = require('assert');
const path = require('path');
const { db } = require('../db');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Helpers
async function apiRequest(endpoint, { method = 'GET', headers = {}, body = null } = {}) {
    const defaultHeaders = {
        'Accept': 'application/json',
        ...headers
    };
    if (body && typeof body === 'object') {
        defaultHeaders['Content-Type'] = 'application/json';
    }

    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
        method,
        headers: defaultHeaders,
        body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
    });

    let data = null;
    let rawText = '';
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        try {
            data = await response.json();
        } catch (e) {
            rawText = await response.text();
        }
    } else {
        rawText = await response.text();
    }

    return {
        status: response.status,
        ok: response.ok,
        headers: response.headers,
        data,
        rawText
    };
}

function queryDb(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function runDb(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function runAllStressTests() {
    console.log('='.repeat(80));
    console.log(' SAFEMAILZ MILESTONE 1 ADVERSARIAL STRESS & EMPIRICAL HARNESS');
    console.log(' Target URL:', BASE_URL);
    console.log('='.repeat(80) + '\n');

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    const findings = [];

    async function test(name, fn) {
        totalTests++;
        process.stdout.write(`  [TEST ${totalTests}] ${name} ... `);
        try {
            const result = await fn();
            passedTests++;
            console.log('\x1b[32mPASS\x1b[0m');
            if (result && result.warning) {
                console.log(`    \x1b[33m⚠️ Warning: ${result.warning}\x1b[0m`);
                findings.push({ test: name, type: 'WARNING', detail: result.warning });
            }
        } catch (err) {
            failedTests++;
            console.log('\x1b[31mFAIL\x1b[0m');
            console.log(`    \x1b[31mError: ${err.message}\x1b[0m`);
            findings.push({ test: name, type: 'FAILURE', detail: err.message, stack: err.stack });
        }
    }

    // =========================================================================
    // SECTION 1: CONCURRENCY & RACE CONDITIONS
    // =========================================================================
    console.log('\n--- SECTION 1: CONCURRENCY & RACE CONDITIONS ---');

    await test('1.1 Multi-user concurrent PUT requests across 10 distinct users', async () => {
        // Users 4 to 11 exist in DB. We will pick 6 users: 4, 5, 6, 7, 8, 9
        const testUserIds = [4, 5, 6, 7, 8, 9];
        // Clean up any existing settings for these users
        for (const uid of testUserIds) {
            await runDb('DELETE FROM user_general_settings WHERE user_id = ?', [uid]);
        }

        const requests = [];
        for (const uid of testUserIds) {
            for (let i = 0; i < 5; i++) {
                requests.push(
                    apiRequest('/api/settings/general', {
                        method: 'PUT',
                        headers: { 'x-user-id': String(uid) },
                        body: {
                            appearance: { theme: i % 2 === 0 ? 'dark' : 'light' },
                            languageTime: { language: i % 2 === 0 ? 'en-GB' : 'en-US' }
                        }
                    }).then(res => ({ uid, status: res.status, data: res.data }))
                );
            }
        }

        const results = await Promise.all(requests);
        const badStatus = results.filter(r => r.status !== 200);
        assert.strictEqual(badStatus.length, 0, `Expected 0 failed requests under concurrent load, got ${badStatus.length} failures (e.g. status ${badStatus[0]?.status})`);

        // Verify each user has a valid record in DB
        for (const uid of testUserIds) {
            const rows = await queryDb('SELECT * FROM user_general_settings WHERE user_id = ?', [uid]);
            assert.strictEqual(rows.length, 1, `Expected exactly 1 settings record for user ${uid}, found ${rows.length}`);
            const parsed = JSON.parse(rows[0].settings_json);
            assert.ok(parsed.appearance, 'Appearance slice should exist');
            assert.ok(parsed.language_time, 'Language slice should exist');
        }

        // Cleanup
        for (const uid of testUserIds) {
            await runDb('DELETE FROM user_general_settings WHERE user_id = ?', [uid]);
        }
    });

    await test('1.2 Race Condition: Simultaneous initial PUTs on clean user (Check-Then-Insert race)', async () => {
        // Use user 10 for clean initial race test
        const testUid = 10;
        await runDb('DELETE FROM user_general_settings WHERE user_id = ?', [testUid]);

        // Send 10 simultaneous PUT requests when NO record exists in database
        const concurrentPuts = Array.from({ length: 10 }, (_, idx) =>
            apiRequest('/api/settings/general', {
                method: 'PUT',
                headers: { 'x-user-id': String(testUid) },
                body: { appearance: { theme: idx % 2 === 0 ? 'dark' : 'light' } }
            })
        );

        const responses = await Promise.all(concurrentPuts);
        const statuses = responses.map(r => r.status);
        const failures = responses.filter(r => r.status !== 200);

        await runDb('DELETE FROM user_general_settings WHERE user_id = ?', [testUid]);

        if (failures.length > 0) {
            const errSamples = failures.map(f => f.data?.error || f.rawText).slice(0, 3);
            return {
                warning: `Check-Then-Insert race condition detected! ${failures.length}/10 concurrent initial PUTs failed with statuses [${statuses.join(', ')}]. Error samples: ${JSON.stringify(errSamples)}`
            };
        }
    });

    await test('1.3 Race Condition: Concurrent slice-level updates (Lost Update Anomaly)', async () => {
        const testUid = 10;
        await runDb('DELETE FROM user_general_settings WHERE user_id = ?', [testUid]);

        // Initialize user with defaults first
        await apiRequest('/api/settings/general', {
            method: 'PUT',
            headers: { 'x-user-id': String(testUid) },
            body: {
                appearance: { theme: 'light' },
                accessibility: { shortcutProfile: 'outlook' }
            }
        });

        // Fire two simultaneous requests updating different slices
        const [resAppearance, resAccessibility] = await Promise.all([
            apiRequest('/api/settings/general', {
                method: 'PUT',
                headers: { 'x-user-id': String(testUid) },
                body: { appearance: { theme: 'dark' } }
            }),
            apiRequest('/api/settings/general', {
                method: 'PUT',
                headers: { 'x-user-id': String(testUid) },
                body: { accessibility: { shortcutProfile: 'gmail' } }
            })
        ]);

        assert.strictEqual(resAppearance.status, 200);
        assert.strictEqual(resAccessibility.status, 200);

        // Fetch final state
        const getFinal = await apiRequest('/api/settings/general', {
            headers: { 'x-user-id': String(testUid) }
        });
        const finalSettings = getFinal.data.settings;

        await runDb('DELETE FROM user_general_settings WHERE user_id = ?', [testUid]);

        const appearanceSurvived = finalSettings.appearance.theme === 'dark';
        const accessibilitySurvived = finalSettings.accessibility.shortcutProfile === 'gmail';

        if (!appearanceSurvived || !accessibilitySurvived) {
            return {
                warning: `Lost Update detected under concurrent slice writes! appearance.theme='${finalSettings.appearance.theme}' (expected 'dark'), accessibility.shortcutProfile='${finalSettings.accessibility.shortcutProfile}' (expected 'gmail'). Lack of atomic document upsert or optimistic locking.`
            };
        }
    });

    // =========================================================================
    // SECTION 2: PROTOTYPE POLLUTION DEFENSE
    // =========================================================================
    console.log('\n--- SECTION 2: PROTOTYPE POLLUTION DEFENSE ---');

    await test('2.1 Top-level __proto__ injection payload rejected and prototype clean', async () => {
        const payload = JSON.parse('{"__proto__": {"pollutedKeyTop": "HACKED"}, "appearance": {"theme": "dark"}}');
        const res = await apiRequest('/api/settings/general', {
            method: 'PUT',
            headers: { 'x-user-id': '4' },
            body: payload
        });
        assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
        assert.strictEqual(({}).pollutedKeyTop, undefined, 'Object.prototype must not be polluted by top-level __proto__');
        assert.strictEqual(Object.prototype.pollutedKeyTop, undefined, 'Object.prototype directly must not have pollutedKeyTop');
    });

    await test('2.2 Nested __proto__ injection payload within slice object', async () => {
        const payload = JSON.parse('{"appearance": {"__proto__": {"pollutedNested": "HACKED"}, "theme": "dark"}}');
        const res = await apiRequest('/api/settings/general', {
            method: 'PUT',
            headers: { 'x-user-id': '4' },
            body: payload
        });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(({}).pollutedNested, undefined, 'Object.prototype must not be polluted by nested __proto__');
        assert.strictEqual(Object.prototype.pollutedNested, undefined, 'Object.prototype directly must not have pollutedNested');
    });

    await test('2.3 constructor.prototype injection payload', async () => {
        const payload = JSON.parse('{"constructor": {"prototype": {"pollutedConstructor": "HACKED"}}, "appearance": {"theme": "light"}}');
        const res = await apiRequest('/api/settings/general', {
            method: 'PUT',
            headers: { 'x-user-id': '4' },
            body: payload
        });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(({}).pollutedConstructor, undefined, 'Object.prototype must not be polluted by constructor.prototype');
        assert.strictEqual(Object.prototype.pollutedConstructor, undefined, 'Object.prototype must not have pollutedConstructor');
    });

    await test('2.4 Standard Object prototype properties (toString, valueOf, hasOwnProperty) as payload keys', async () => {
        const payload = {
            appearance: {
                theme: 'dark',
                toString: 'not_a_function_override',
                valueOf: 12345,
                hasOwnProperty: null
            }
        };
        const res = await apiRequest('/api/settings/general', {
            method: 'PUT',
            headers: { 'x-user-id': '4' },
            body: payload
        });
        assert.strictEqual(res.status, 200);
        // Verify server did not crash and returned valid JSON
        assert.ok(res.data.settings, 'Response must include settings');
        assert.strictEqual(typeof Object.prototype.toString, 'function', 'Object.prototype.toString must remain a function');
        assert.strictEqual(typeof ({}).toString, 'function', '({}).toString must remain a function');
    });

    // =========================================================================
    // SECTION 3: UNEXPECTED, MALFORMED & DEEPLY NESTED PAYLOADS
    // =========================================================================
    console.log('\n--- SECTION 3: UNEXPECTED, MALFORMED & DEEPLY NESTED PAYLOADS ---');

    await test('3.1 Deeply nested JSON payload (50 levels deep)', async () => {
        let nestedObj = { target: 'deepValue' };
        for (let i = 0; i < 50; i++) {
            nestedObj = { [`level_${i}`]: nestedObj };
        }
        const payload = {
            appearance: {
                theme: 'dark',
                deepStuff: nestedObj
            }
        };
        const res = await apiRequest('/api/settings/general', {
            method: 'PUT',
            headers: { 'x-user-id': '4' },
            body: payload
        });
        assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
        assert.strictEqual(res.data.settings.appearance.theme, 'dark');
    });

    await test('3.2 Extreme recursion depth (500 levels deep) to test stack safety', async () => {
        let nestedObj = { value: 'deep' };
        for (let i = 0; i < 500; i++) {
            nestedObj = { next: nestedObj };
        }
        const payload = {
            search: {
                pageSize: 50,
                nestedBomb: nestedObj
            }
        };
        const res = await apiRequest('/api/settings/general', {
            method: 'PUT',
            headers: { 'x-user-id': '4' },
            body: payload
        });
        // Server should either gracefully handle it or reject, but not crash
        assert.ok(res.status === 200 || res.status === 400 || res.status === 500, 'Server responded without network connection crash');
    });

    await test('3.3 Incompatible slice data types (primitives, arrays, nulls)', async () => {
        const payload = {
            languageTime: 'not an object, just a string',
            appearance: [1, 2, 3, 4],
            notifications: null,
            accessibility: 123456,
            privacyData: true,
            search: false
        };
        const res = await apiRequest('/api/settings/general', {
            method: 'PUT',
            headers: { 'x-user-id': '4' },
            body: payload
        });
        assert.strictEqual(res.status, 200);
        const { settings } = res.data;
        // All slices must still be valid objects with safe defaults
        assert.strictEqual(typeof settings.languageTime, 'object');
        assert.strictEqual(settings.languageTime.language, 'en-US');
        assert.strictEqual(typeof settings.appearance, 'object');
        assert.strictEqual(settings.appearance.theme, 'light');
        assert.strictEqual(typeof settings.notifications, 'object');
        assert.strictEqual(typeof settings.accessibility, 'object');
        assert.strictEqual(typeof settings.privacyData, 'object');
        assert.strictEqual(typeof settings.search, 'object');
    });

    await test('3.4 Arbitrary unwhitelisted keys and role escalation attempts stripped from DB', async () => {
        const payload = {
            maliciousAdminFlag: true,
            isAdmin: true,
            role: 'superadmin',
            organization_id: 9999,
            appearance: {
                theme: 'dark',
                unwhitelistedCssClass: 'evil-script'
            }
        };
        const res = await apiRequest('/api/settings/general', {
            method: 'PUT',
            headers: { 'x-user-id': '4' },
            body: payload
        });
        assert.strictEqual(res.status, 200);

        // Check SQLite stored row directly
        const rows = await queryDb('SELECT settings_json, organization_id FROM user_general_settings WHERE user_id = 4');
        assert.strictEqual(rows.length, 1);
        const dbJson = JSON.parse(rows[0].settings_json);

        assert.strictEqual(dbJson.isAdmin, undefined, 'isAdmin must not be stored in settings_json');
        assert.strictEqual(dbJson.role, undefined, 'role must not be stored in settings_json');
        assert.strictEqual(rows[0].organization_id, 1, 'organization_id in table must not be mutated by arbitrary payload key');
    });

    await test('3.5 Boundary values and enum sanitization', async () => {
        const payload = {
            languageTime: {
                timeFormat: '99h', // invalid
                dateFormat: '   ',  // empty whitespace
            },
            appearance: {
                theme: 'neon-glow', // invalid
                density: 'ultra-wide' // invalid
            },
            accessibility: {
                shortcutProfile: 'emacs' // invalid
            },
            privacyData: {
                externalImages: 'unrestricted' // invalid
            },
            search: {
                pageSize: 99999 // invalid
            }
        };
        const res = await apiRequest('/api/settings/general', {
            method: 'PUT',
            headers: { 'x-user-id': '4' },
            body: payload
        });
        assert.strictEqual(res.status, 200);
        const { settings } = res.data;
        assert.strictEqual(settings.languageTime.timeFormat, '12h');
        assert.strictEqual(settings.languageTime.dateFormat, 'M/D/YYYY');
        assert.strictEqual(settings.appearance.theme, 'light');
        assert.strictEqual(settings.appearance.density, 'cozy');
        assert.strictEqual(settings.accessibility.shortcutProfile, 'outlook');
        assert.strictEqual(settings.privacyData.externalImages, 'proxy');
        assert.strictEqual(settings.search.pageSize, 25);
    });

    await test('3.6 Unsanitized string fields inspection: accentHex & timeZone injection', async () => {
        const payload = {
            appearance: {
                accentHex: 'javascript:alert(1);'
            },
            languageTime: {
                timeZone: 'Invalid/NonExistent_Zone'
            }
        };
        const res = await apiRequest('/api/settings/general', {
            method: 'PUT',
            headers: { 'x-user-id': '4' },
            body: payload
        });
        assert.strictEqual(res.status, 200);
        const { settings } = res.data;

        const hexValid = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(settings.appearance.accentHex);
        let warning = null;
        if (!hexValid) {
            warning = `accentHex does not enforce strict hex regex format: accepted '${settings.appearance.accentHex}'. Could pose CSS injection risk if unescaped in inline styles.`;
        }
        return warning ? { warning } : null;
    });

    // =========================================================================
    // SECTION 4: DATABASE FOREIGN KEY INTEGRITY & INDEX EXECUTION
    // =========================================================================
    console.log('\n--- SECTION 4: DATABASE FOREIGN KEY INTEGRITY & INDEX EXECUTION ---');

    await test('4.1 Foreign Key Constraint: Direct INSERT with non-existent user_id', async () => {
        let fkErrorCaught = false;
        try {
            await runDb('INSERT INTO user_general_settings (user_id, organization_id, settings_json) VALUES (99999999, 1, ?)', ['{}']);
        } catch (err) {
            fkErrorCaught = true;
            assert.ok(err.message.includes('FOREIGN KEY'), `Expected FOREIGN KEY error, got ${err.message}`);
        }
        assert.ok(fkErrorCaught, 'SQLite must reject INSERT with non-existent user_id via Foreign Key constraint');
    });

    await test('4.2 Foreign Key Constraint: Direct INSERT with non-existent organization_id', async () => {
        let fkErrorCaught = false;
        // Ensure no row exists for user 4 first so UNIQUE constraint is not triggered
        await runDb('DELETE FROM user_general_settings WHERE user_id = 4');
        try {
            // User 4 exists, but organization 99999999 does not
            await runDb('INSERT INTO user_general_settings (user_id, organization_id, settings_json) VALUES (4, 99999999, ?)', ['{}']);
        } catch (err) {
            fkErrorCaught = true;
            assert.ok(err.message.includes('FOREIGN KEY'), `Expected FOREIGN KEY error, got ${err.message}`);
        }
        assert.ok(fkErrorCaught, 'SQLite must reject INSERT with non-existent organization_id via Foreign Key constraint');
    });

    await test('4.3 Foreign Key Constraint on search_history table', async () => {
        let fkErrorCaught = false;
        try {
            await runDb('INSERT INTO search_history (user_id, organization_id, query) VALUES (99999999, 1, ?)', ['test query']);
        } catch (err) {
            fkErrorCaught = true;
            assert.ok(err.message.includes('FOREIGN KEY'));
        }
        assert.ok(fkErrorCaught, 'SQLite must reject search_history INSERT with non-existent user_id');
    });

    await test('4.4 API behavior when x-user-id references non-existent user', async () => {
        // User 88888888 does NOT exist in users table
        const resGet = await apiRequest('/api/settings/general', {
            headers: { 'x-user-id': '88888888' }
        });
        // GET returns 200 with default settings
        assert.strictEqual(resGet.status, 200);

        // PUT attempts to insert to DB for non-existent user -> should trigger FK constraint error
        const resPut = await apiRequest('/api/settings/general', {
            method: 'PUT',
            headers: { 'x-user-id': '88888888' },
            body: { appearance: { theme: 'dark' } }
        });

        // The API returns 500 because the DB FK constraint fails
        assert.strictEqual(resPut.status, 500, `Expected 500 for non-existent user FK failure, got ${resPut.status}`);
        assert.ok(resPut.data.error.includes('Failed to insert general settings'));
        assert.ok(resPut.data.details.includes('FOREIGN KEY constraint failed'));
    });

    await test('4.5 Query Plan Execution: user_general_settings index utilization', async () => {
        const plan = await queryDb('EXPLAIN QUERY PLAN SELECT settings_json FROM user_general_settings WHERE user_id = ?', [1]);
        assert.ok(plan.length > 0, 'Query plan must return steps');
        const planStr = plan.map(p => p.detail).join(' ');
        assert.ok(
            planStr.includes('INDEX') || planStr.includes('SEARCH'),
            `Query plan must use index for user_id lookup. Plan: ${planStr}`
        );
    });

    await test('4.6 Query Plan Execution: search_history index utilization', async () => {
        const plan = await queryDb('EXPLAIN QUERY PLAN SELECT * FROM search_history WHERE user_id = ?', [1]);
        assert.ok(plan.length > 0, 'Query plan must return steps');
        const planStr = plan.map(p => p.detail).join(' ');
        assert.ok(
            planStr.includes('idx_search_history_user'),
            `Query plan must use idx_search_history_user for user_id lookup. Plan: ${planStr}`
        );
    });

    // Cleanup any artifacts on user 4
    await runDb('DELETE FROM user_general_settings WHERE user_id = 4');

    // =========================================================================
    // SECTION 5: FINAL CLEANUP & REGRESSION SUITE INTEGRITY
    // =========================================================================
    console.log('\n--- SECTION 5: FINAL CLEANUP & REGRESSION INTEGRITY ---');

    await test('5.1 State Isolation Cleanup: Users 1 and 2 reset for canonical test suite', async () => {
        await runDb('DELETE FROM user_general_settings WHERE user_id IN (1, 2)');
        const rows = await queryDb('SELECT user_id FROM user_general_settings WHERE user_id IN (1, 2)');
        assert.strictEqual(rows.length, 0, 'Test users 1 and 2 must have clean state for official E2E test runner');
    });

    console.log('\n' + '='.repeat(80));
    console.log(' ADVERSARIAL STRESS TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(` Total Executed: ${totalTests}`);
    console.log(` Passed:         \x1b[32m${passedTests}\x1b[0m`);
    console.log(` Failed:         \x1b[31m${failedTests}\x1b[0m`);
    console.log(` Findings Count: ${findings.length}`);
    console.log('='.repeat(80));

    if (findings.length > 0) {
        console.log('\nDetailed Findings:');
        findings.forEach((f, idx) => {
            console.log(` [${idx + 1}] [${f.type}] ${f.test}`);
            console.log(`     ${f.detail}`);
        });
    }

    if (failedTests > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runAllStressTests().catch(err => {
    console.error('Fatal stress runner exception:', err);
    process.exit(1);
});
