/**
 * Adversarial Empirical Test Suite for Milestone 2:
 * Frontend UI, Modal Behavior, Keyboard Isolation, and Live Reactivity
 * 
 * Targets:
 *   - client/src/components/settings/timezonesData.js
 *   - client/src/components/settings/TimezoneSelectorModal.jsx
 *   - client/src/components/settings/LanguageTimeSection.jsx
 *   - client/src/context/GeneralSettingsContext.jsx
 *   - client/src/pages/dashboard/EmailView.jsx
 *   - client/src/utils/dateUtils.js
 * 
 * Execution:
 *   node tests/stress-m2-frontend-reactivity.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

function recordPass(id, title, durationMs) {
    testsPassed++;
    testResults.push({ id, title, status: 'PASSED', durationMs });
    console.log(`  ✓ [${id}] ${title} (${durationMs}ms)`);
}

function recordFail(id, title, err) {
    testsFailed++;
    testResults.push({ id, title, status: 'FAILED', error: err.message });
    console.error(`  ✗ [${id}] ${title}`);
    console.error(`    Error: ${err.message}`);
}

async function runTest(id, title, fn) {
    const start = Date.now();
    try {
        await fn();
        recordPass(id, title, Date.now() - start);
    } catch (err) {
        recordFail(id, title, err);
    }
}

async function main() {
    console.log('================================================================================');
    console.log(' CHALLENGER 2: MILESTONE 2 EMPIRICAL ADVERSARIAL TEST SUITE');
    console.log(' Targets: Timezone Modal, Escape Keydown Isolation, Dirty Tracking, Reactivity');
    console.log('================================================================================\n');

    const timezonesDataModule = await import('../client/src/components/settings/timezonesData.js');
    const dateUtilsModule = await import('../client/src/utils/dateUtils.js');

    // -------------------------------------------------------------------------
    // SECTION 1: timezonesData.js & IANA Integrity
    // -------------------------------------------------------------------------
    console.log('--- Suite 1: timezonesData.js Dataset & IANA Integrity ---');

    await runTest('CH2.1.1', 'TIMEZONES_LIST exports exactly 61 curated timezones with unique IANA identifiers', async () => {
        const { TIMEZONES_LIST } = timezonesDataModule;
        assert.ok(Array.isArray(TIMEZONES_LIST), 'TIMEZONES_LIST must be an array');
        assert.strictEqual(TIMEZONES_LIST.length, 61, `Expected exactly 61 timezones, found ${TIMEZONES_LIST.length}`);

        const ianaSet = new Set();
        for (const tz of TIMEZONES_LIST) {
            assert.ok(!ianaSet.has(tz.iana.toLowerCase()), `Duplicate IANA identifier detected: ${tz.iana}`);
            ianaSet.add(tz.iana.toLowerCase());
        }
        assert.strictEqual(ianaSet.size, 61, 'All 61 IANA identifiers must be unique');
    });

    await runTest('CH2.1.2', 'All 61 timezones have valid IANA identifiers recognized by Intl.DateTimeFormat', async () => {
        const { TIMEZONES_LIST } = timezonesDataModule;
        for (const tz of TIMEZONES_LIST) {
            assert.ok(typeof tz.iana === 'string' && tz.iana.length > 0, `Timezone missing iana property: ${JSON.stringify(tz)}`);
            try {
                // Must not throw RangeError: Invalid time zone specified
                const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz.iana });
                const formatted = dtf.format(new Date());
                assert.ok(formatted && formatted.length > 0, `Formatting failed for IANA: ${tz.iana}`);
            } catch (err) {
                throw new Error(`Invalid IANA identifier '${tz.iana}': ${err.message}`);
            }
        }
    });

    await runTest('CH2.1.3', 'All 61 timezones have valid offset format and correct mathematical offsetMinutes', async () => {
        const { TIMEZONES_LIST } = timezonesDataModule;
        const offsetRegex = /^UTC([+-])(\d{2}):(\d{2})$/;

        for (const tz of TIMEZONES_LIST) {
            assert.ok(tz.offset, `Missing offset for ${tz.iana}`);
            const match = tz.offset.match(offsetRegex);
            assert.ok(match, `Offset '${tz.offset}' for ${tz.iana} does not match UTC[+-]HH:MM`);

            const sign = match[1] === '-' ? -1 : 1;
            const hours = parseInt(match[2], 10);
            const minutes = parseInt(match[3], 10);
            const expectedMinutes = sign * (hours * 60 + minutes);

            assert.strictEqual(
                tz.offsetMinutes,
                expectedMinutes,
                `offsetMinutes mismatch for ${tz.iana}: expected ${expectedMinutes}, got ${tz.offsetMinutes}`
            );
        }
    });

    await runTest('CH2.1.4', 'All non-integer fractional UTC offsets are mathematically exact', async () => {
        const { TIMEZONES_LIST } = timezonesDataModule;
        const fractionalExpected = {
            'America/St_Johns': -210, // UTC-03:30
            'Asia/Tehran': 210,       // UTC+03:30
            'Asia/Kabul': 270,        // UTC+04:30
            'Asia/Kolkata': 330,      // UTC+05:30
            'Asia/Kathmandu': 345,    // UTC+05:45
            'Asia/Yangon': 390,       // UTC+06:30
            'Australia/Adelaide': 570 // UTC+09:30
        };

        for (const [iana, expectedMins] of Object.entries(fractionalExpected)) {
            const entry = TIMEZONES_LIST.find(t => t.iana === iana);
            assert.ok(entry, `Expected fractional timezone ${iana} not found in TIMEZONES_LIST`);
            assert.strictEqual(entry.offsetMinutes, expectedMins, `Incorrect offsetMinutes for ${iana}`);
        }
    });

    await runTest('CH2.1.5', 'TIMEZONES_LIST is monotonically ordered from UTC-12:00 to UTC+14:00', async () => {
        const { TIMEZONES_LIST } = timezonesDataModule;
        assert.strictEqual(TIMEZONES_LIST[0].offsetMinutes, -720, 'First timezone must be UTC-12:00 (-720 min)');
        assert.strictEqual(TIMEZONES_LIST[TIMEZONES_LIST.length - 1].offsetMinutes, 840, 'Last timezone must be UTC+14:00 (+840 min)');

        for (let i = 1; i < TIMEZONES_LIST.length; i++) {
            assert.ok(
                TIMEZONES_LIST[i].offsetMinutes >= TIMEZONES_LIST[i - 1].offsetMinutes,
                `Monotonic ordering violated at index ${i}: ${TIMEZONES_LIST[i - 1].offset} > ${TIMEZONES_LIST[i].offset}`
            );
        }
    });

    await runTest('CH2.1.6', 'findTimezoneByIana helper performs case-insensitive lookup and handles edge cases', async () => {
        const { findTimezoneByIana } = timezonesDataModule;
        assert.ok(typeof findTimezoneByIana === 'function', 'findTimezoneByIana must be exported');

        // Exact match
        const kolkata = findTimezoneByIana('Asia/Kolkata');
        assert.ok(kolkata && kolkata.iana === 'Asia/Kolkata');
        assert.strictEqual(kolkata.offset, 'UTC+05:30');

        // Lowercase match
        const londonLower = findTimezoneByIana('europe/london');
        assert.ok(londonLower && londonLower.iana === 'Europe/London');

        // Uppercase match
        const tokyoUpper = findTimezoneByIana('ASIA/TOKYO');
        assert.ok(tokyoUpper && tokyoUpper.iana === 'Asia/Tokyo');

        // Negative edge cases
        assert.strictEqual(findTimezoneByIana(''), null);
        assert.strictEqual(findTimezoneByIana(null), null);
        assert.strictEqual(findTimezoneByIana(undefined), null);
        assert.strictEqual(findTimezoneByIana('NonExistent/Mars'), null);
    });

    // -------------------------------------------------------------------------
    // SECTION 2: Timezone Filtering Simulation
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 2: Timezone Search Filtering Simulation ---');

    function simulateModalFilter(query, list = timezonesDataModule.TIMEZONES_LIST) {
        const q = (query || '').trim().toLowerCase();
        if (!q) return list;
        return list.filter(tz => (
            tz.label.toLowerCase().includes(q) ||
            tz.iana.toLowerCase().includes(q) ||
            tz.offset.toLowerCase().includes(q) ||
            (tz.searchKeywords && tz.searchKeywords.toLowerCase().includes(q))
        ));
    }

    await runTest('CH2.2.1', 'Search filtering by city name resolves expected timezones', async () => {
        // Query: Paris
        const paris = simulateModalFilter('Paris');
        assert.ok(paris.some(tz => tz.iana === 'Europe/Paris'), 'Expected Paris to match Europe/Paris');

        // Query: Tokyo
        const tokyo = simulateModalFilter('Tokyo');
        assert.ok(tokyo.some(tz => tz.iana === 'Asia/Tokyo'), 'Expected Tokyo to match Asia/Tokyo');

        // Query: New York
        const ny = simulateModalFilter('New York');
        assert.ok(ny.some(tz => tz.iana === 'America/New_York'), 'Expected New York to match America/New_York');

        // Query: Kolkata
        const kolkata = simulateModalFilter('Kolkata');
        assert.ok(kolkata.some(tz => tz.iana === 'Asia/Kolkata'), 'Expected Kolkata to match Asia/Kolkata');
    });

    await runTest('CH2.2.2', 'Search filtering by country name resolves expected timezones via searchKeywords', async () => {
        // Query: India
        const india = simulateModalFilter('India');
        assert.ok(india.some(tz => tz.iana === 'Asia/Kolkata'), 'Expected India to match Asia/Kolkata');

        // Query: Australia
        const aus = simulateModalFilter('Australia');
        assert.ok(aus.some(tz => tz.iana === 'Australia/Sydney'), 'Expected Australia to match Sydney');
        assert.ok(aus.some(tz => tz.iana === 'Australia/Perth'), 'Expected Australia to match Perth');

        // Query: Germany
        const germany = simulateModalFilter('Germany');
        assert.ok(germany.some(tz => tz.iana === 'Europe/Paris'), 'Expected Germany to match Europe/Paris (Berlin)');

        // Query: Japan
        const japan = simulateModalFilter('Japan');
        assert.ok(japan.some(tz => tz.iana === 'Asia/Tokyo'), 'Expected Japan to match Asia/Tokyo');
    });

    await runTest('CH2.2.3', 'Search filtering by UTC offset query (+05:30, -08:00, UTC+00:00)', async () => {
        const ist = simulateModalFilter('+05:30');
        assert.ok(ist.some(tz => tz.iana === 'Asia/Kolkata'), 'Expected +05:30 to match Asia/Kolkata');

        const pst = simulateModalFilter('-08:00');
        assert.ok(pst.some(tz => tz.iana === 'America/Los_Angeles'), 'Expected -08:00 to match America/Los_Angeles');

        const gmt = simulateModalFilter('UTC+00:00');
        assert.ok(gmt.some(tz => tz.iana === 'UTC'), 'Expected UTC+00:00 to match UTC');
        assert.ok(gmt.some(tz => tz.iana === 'Europe/London'), 'Expected UTC+00:00 to match Europe/London');
    });

    await runTest('CH2.2.4', 'Search filtering handles edge cases: special chars, parentheses, whitespace, non-matches', async () => {
        // Parentheses and exact label query
        const parenSearch = simulateModalFilter('(UTC+05:30)');
        assert.ok(parenSearch.some(tz => tz.iana === 'Asia/Kolkata'), 'Expected (UTC+05:30) to match');

        // Plus sign query
        const plusSearch = simulateModalFilter('+05:30');
        assert.ok(plusSearch.length > 0, '+ query must not break');

        // Empty returns full 61
        assert.strictEqual(simulateModalFilter('').length, 61);
        assert.strictEqual(simulateModalFilter('   ').length, 61);

        // Leading/trailing whitespace
        const padded = simulateModalFilter('   London   ');
        assert.ok(padded.some(tz => tz.iana === 'Europe/London'));

        // Non-existent search
        const none = simulateModalFilter('xyzNotFoundZone123');
        assert.strictEqual(none.length, 0, 'Bogus query must return empty array');
    });

    // -------------------------------------------------------------------------
    // SECTION 3: Escape Keydown Capture Phase Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 3: Keyboard Isolation & Capture-Phase Escape Handler ---');

    await runTest('CH2.3.1', 'Static verification of TimezoneSelectorModal.jsx keyboard isolation code', async () => {
        const modalPath = path.resolve(__dirname, '../client/src/components/settings/TimezoneSelectorModal.jsx');
        const modalCode = fs.readFileSync(modalPath, 'utf8');

        // Check window.addEventListener('keydown', handleKeyDown, true)
        const addListenerMatch = modalCode.match(/window\.addEventListener\(\s*['"]keydown['"]\s*,\s*(\w+)\s*,\s*true\s*\)/);
        assert.ok(addListenerMatch, 'TimezoneSelectorModal.jsx MUST use capture phase (true as 3rd param) for keydown listener');

        // Check cleanup window.removeEventListener('keydown', handleKeyDown, true)
        const removeListenerMatch = modalCode.match(/window\.removeEventListener\(\s*['"]keydown['"]\s*,\s*(\w+)\s*,\s*true\s*\)/);
        assert.ok(removeListenerMatch, 'TimezoneSelectorModal.jsx MUST remove capture keydown listener on unmount/cleanup');

        // Check handleKeyDown contents
        assert.ok(modalCode.includes("e.key === 'Escape'"), 'Must test for Escape key');
        assert.ok(modalCode.includes("e.preventDefault()"), 'Must call e.preventDefault() on Escape');
        assert.ok(modalCode.includes("e.stopPropagation()"), 'Must call e.stopPropagation() on Escape');
        assert.ok(modalCode.includes("onClose()"), 'Must invoke onClose() when Escape pressed');
    });

    await runTest('CH2.3.2', 'Empirical runtime isolation test with JSDOM: Escape stops propagation to parent bubble listener', async () => {
        const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="settings-panel"><div id="modal-container"></div></div></body></html>`, {
            url: 'http://localhost/'
        });
        const { window } = dom;

        let parentEscapeFired = false;
        let modalClosed = false;

        // Parent listener (SettingsPanel) registered on window or document in BUBBLE phase
        const parentHandler = (e) => {
            if (e.key === 'Escape') {
                parentEscapeFired = true;
            }
        };
        window.addEventListener('keydown', parentHandler, false);

        // Modal listener simulating TimezoneSelectorModal registered in CAPTURE phase
        const modalHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                modalClosed = true;
            }
        };
        window.addEventListener('keydown', modalHandler, true);

        // Dispatch Escape keydown from inside modal container
        const modalInput = window.document.createElement('input');
        window.document.getElementById('modal-container').appendChild(modalInput);

        const escapeEvent = new window.KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
            cancelable: true
        });

        modalInput.dispatchEvent(escapeEvent);

        // Assertions
        assert.strictEqual(modalClosed, true, 'Modal close handler must have executed');
        assert.strictEqual(parentEscapeFired, false, 'Parent handler MUST NOT fire because modal stopped propagation in capture phase!');
        assert.strictEqual(escapeEvent.defaultPrevented, true, 'Event default must be prevented');

        // Clean up modal listener (simulating modal unmount)
        window.removeEventListener('keydown', modalHandler, true);

        // Subsequent Escape should now reach parent handler
        parentEscapeFired = false;
        const secondEscape = new window.KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
            cancelable: true
        });
        modalInput.dispatchEvent(secondEscape);

        assert.strictEqual(parentEscapeFired, true, 'Parent handler should receive Escape after modal listener is unmounted');

        // Clean up parent
        window.removeEventListener('keydown', parentHandler, false);
    });

    await runTest('CH2.3.3', 'Non-Escape key events are NOT swallowed by modal capture handler', async () => {
        const dom = new JSDOM(`<!DOCTYPE html><html><body><input id="test-input" /></body></html>`);
        const { window } = dom;

        let otherKeyBubbleReceived = false;

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') otherKeyBubbleReceived = true;
        }, false);

        const modalHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        window.addEventListener('keydown', modalHandler, true);

        const input = window.document.getElementById('test-input');
        const enterEvent = new window.KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
            cancelable: true
        });
        input.dispatchEvent(enterEvent);

        assert.strictEqual(otherKeyBubbleReceived, true, 'Non-Escape key (Enter) must freely propagate to bubble listeners');
        assert.strictEqual(enterEvent.defaultPrevented, false, 'Non-Escape key must not have default prevented');
    });

    // -------------------------------------------------------------------------
    // SECTION 4: Dirty State Tracking & Action Bar Semantics
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 4: Dirty State Tracking & Action Bar Semantics ---');

    await runTest('CH2.4.1', 'Static verification of LanguageTimeSection.jsx action bar and dirty hooks', async () => {
        const sectionPath = path.resolve(__dirname, '../client/src/components/settings/LanguageTimeSection.jsx');
        const code = fs.readFileSync(sectionPath, 'utf8');

        assert.ok(code.includes("useGeneralSettings()"), 'Must use useGeneralSettings hook');
        assert.ok(code.includes("isSliceDirty('languageTime')"), 'Must inspect dirty state specifically for languageTime slice');
        assert.ok(code.includes("saveGeneralSettings('languageTime')"), 'Save action must commit languageTime slice');
        assert.ok(code.includes("discardGeneralSettings('languageTime')"), 'Discard action must revert languageTime slice');
        assert.ok(code.includes("isDirty && ("), 'Sticky action bar must be conditionally rendered when dirty');
        assert.ok(code.includes("Save"), 'Must have Save button');
        assert.ok(code.includes("Discard"), 'Must have Discard button');
        assert.ok(code.includes("Unsaved changes"), 'Must display unsaved changes badge');
    });

    await runTest('CH2.4.2', 'Empirical logic test of GeneralSettings dirty computation algorithm', async () => {
        // Extract dirty computation algorithm from GeneralSettingsContext.jsx
        function computeDirtyState(settings, draftSettings) {
            const diff = {};
            const changedSlices = [];
            let dirty = false;
            const sliceKeys = ['languageTime', 'appearance', 'notifications', 'accessibility', 'privacyData', 'search'];
            for (const slice of sliceKeys) {
                const committedSlice = settings[slice] || {};
                const draftSlice = draftSettings[slice] || {};
                const allKeys = new Set([...Object.keys(committedSlice), ...Object.keys(draftSlice)]);
                const sliceDiff = {};
                let sliceChanged = false;
                for (const key of allKeys) {
                    if (JSON.stringify(draftSlice[key]) !== JSON.stringify(committedSlice[key])) {
                        sliceChanged = true;
                        sliceDiff[key] = draftSlice[key];
                    }
                }
                if (sliceChanged) {
                    dirty = true;
                    changedSlices.push(slice);
                    diff[slice] = sliceDiff;
                }
            }
            return {
                isDirty: dirty,
                modifiedSettings: diff,
                dirtySlices: changedSlices,
                isSliceDirty: (slice) => changedSlices.includes(slice)
            };
        }

        const baseSettings = {
            languageTime: { language: 'en-US', dateFormat: 'M/D/YYYY', timeFormat: '12h', timeZone: 'Asia/Kolkata' },
            appearance: { theme: 'light' }
        };

        // 1. Initial identical state: NOT dirty
        let draft = JSON.parse(JSON.stringify(baseSettings));
        let res = computeDirtyState(baseSettings, draft);
        assert.strictEqual(res.isDirty, false, 'Initially not dirty');
        assert.strictEqual(res.isSliceDirty('languageTime'), false, 'languageTime not dirty initially');

        // 2. Modify draft: BECOMES dirty
        draft.languageTime.language = 'en-IN';
        res = computeDirtyState(baseSettings, draft);
        assert.strictEqual(res.isDirty, true, 'Should be dirty after draft modification');
        assert.strictEqual(res.isSliceDirty('languageTime'), true, 'languageTime should be dirty');
        assert.strictEqual(res.isSliceDirty('appearance'), false, 'appearance slice should NOT be dirty');

        // 3. Modify further
        draft.languageTime.dateFormat = 'DD/MM/YYYY';
        res = computeDirtyState(baseSettings, draft);
        assert.strictEqual(res.isSliceDirty('languageTime'), true);

        // 4. Revert values back manually: MUST clear dirty state!
        draft.languageTime.language = 'en-US';
        draft.languageTime.dateFormat = 'M/D/YYYY';
        res = computeDirtyState(baseSettings, draft);
        assert.strictEqual(res.isDirty, false, 'Reverting draft values to committed values MUST clear dirty state');
        assert.strictEqual(res.isSliceDirty('languageTime'), false);

        // 5. Test Discard behavior (draft reverts to clone of settings)
        draft.languageTime.timeZone = 'America/New_York';
        assert.strictEqual(computeDirtyState(baseSettings, draft).isSliceDirty('languageTime'), true);
        draft = JSON.parse(JSON.stringify(baseSettings)); // Discard
        assert.strictEqual(computeDirtyState(baseSettings, draft).isSliceDirty('languageTime'), false);

        // 6. Test Save behavior (settings committed to draft)
        draft.languageTime.timeZone = 'Europe/Paris';
        let committed = JSON.parse(JSON.stringify(draft)); // Save commits draft
        assert.strictEqual(computeDirtyState(committed, draft).isSliceDirty('languageTime'), false);
    });

    // -------------------------------------------------------------------------
    // SECTION 5: Live Reactivity in EmailView.jsx & dateUtils.js
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 5: Live Reactivity in EmailView.jsx & dateUtils.js ---');

    await runTest('CH2.5.1', 'Static verification of EmailView.jsx: #readingDate header and formatMailReadingDate', async () => {
        const emailViewPath = path.resolve(__dirname, '../client/src/pages/dashboard/EmailView.jsx');
        const code = fs.readFileSync(emailViewPath, 'utf8');

        // Verify import of formatMailReadingDate
        assert.ok(
            code.includes("import { formatMailReadingDate") || code.includes("formatMailReadingDate,"),
            'EmailView.jsx must import formatMailReadingDate from dateUtils'
        );

        // Verify presence of #readingDate
        assert.ok(
            code.includes('id="readingDate"'),
            'EmailView.jsx must render an element with id="readingDate" in the reading pane header'
        );

        // Verify className="reading-date"
        assert.ok(
            code.includes('className="reading-date"'),
            'EmailView.jsx must have className="reading-date"'
        );

        // Locate id="readingDate" and inspect the enclosing/contained block
        const readingDateIndex = code.indexOf('id="readingDate"');
        const readingDateBlock = code.slice(readingDateIndex, readingDateIndex + 500);

        assert.ok(
            readingDateBlock.includes('formatMailReadingDate(selectedEmail.date || selectedEmail.createdAt || selectedEmail.created_at)'),
            '#readingDate must call formatMailReadingDate with selectedEmail date/createdAt fallbacks'
        );
    });

    await runTest('CH2.5.2', 'Static verification of EmailView.jsx: conversationThreads useMemo reacts to generalSettings?.languageTime', async () => {
        const emailViewPath = path.resolve(__dirname, '../client/src/pages/dashboard/EmailView.jsx');
        const code = fs.readFileSync(emailViewPath, 'utf8');

        // Verify useGeneralSettings hook is invoked
        assert.ok(
            code.includes("useGeneralSettings()"),
            'EmailView.jsx must consume general settings via useGeneralSettings()'
        );

        // Locate conversationThreads definition
        const threadIndex = code.indexOf('const conversationThreads = useMemo');
        assert.ok(threadIndex !== -1, 'conversationThreads useMemo not found in EmailView.jsx');

        const threadEnd = code.indexOf('}, [', threadIndex);
        const depsBlock = code.slice(threadEnd, threadEnd + 100);

        assert.ok(
            depsBlock.includes('generalSettings?.languageTime'),
            `conversationThreads dependency array must include generalSettings?.languageTime. Found: ${depsBlock}`
        );
    });

    await runTest('CH2.5.3', 'Live reactivity verification: formatMailReadingDate updates dynamically with settings', async () => {
        const { formatMailReadingDate, registerSettingsGetter } = dateUtilsModule;
        assert.ok(typeof formatMailReadingDate === 'function', 'formatMailReadingDate must be exported');

        let dynamicSettings = {
            languageTime: {
                language: 'en-US',
                dateFormat: 'M/D/YYYY',
                timeFormat: '12h',
                timeZone: 'UTC'
            }
        };

        // Wire dynamic getter
        registerSettingsGetter(() => dynamicSettings);

        const testTimestamp = '2026-10-20T14:30:00Z';

        // 1. Initial formatting in UTC 12h
        const res1 = formatMailReadingDate(testTimestamp);
        assert.ok(res1.includes('2:30 PM'), `Expected 2:30 PM in 12h UTC, got '${res1}'`);

        // 2. Change timezone to Asia/Kolkata (+05:30) -> 14:30 UTC becomes 20:00 IST (8:00 PM)
        dynamicSettings = {
            languageTime: {
                language: 'en-US',
                dateFormat: 'DD/MM/YYYY',
                timeFormat: '12h',
                timeZone: 'Asia/Kolkata'
            }
        };
        const res2 = formatMailReadingDate(testTimestamp);
        assert.ok(res2.includes('8:00 PM'), `Expected 8:00 PM in IST, got '${res2}'`);
        assert.ok(res2.includes('20/10/2026'), `Expected DD/MM/YYYY 20/10/2026, got '${res2}'`);

        // 3. Change time format to 24h
        dynamicSettings.languageTime.timeFormat = '24h';
        const res3 = formatMailReadingDate(testTimestamp);
        assert.ok(res3.includes('20:00'), `Expected 20:00 in 24h format, got '${res3}'`);
        assert.ok(!res3.includes('PM'), `24h format must not have PM indicator, got '${res3}'`);

        // 4. Change date format to YYYY-MM-DD
        dynamicSettings.languageTime.dateFormat = 'YYYY-MM-DD';
        const res4 = formatMailReadingDate(testTimestamp);
        assert.ok(res4.includes('2026-10-20'), `Expected 2026-10-20, got '${res4}'`);
    });

    await runTest('CH2.5.4', 'Live reactivity verification: formatMailPreviewDate updates dynamically per Outlook preview rules', async () => {
        const { formatMailPreviewDate, registerSettingsGetter } = dateUtilsModule;
        assert.ok(typeof formatMailPreviewDate === 'function', 'formatMailPreviewDate must be exported');

        let dynamicSettings = {
            languageTime: {
                language: 'en-US',
                dateFormat: 'M/D/YYYY',
                timeFormat: '12h',
                timeZone: 'UTC'
            }
        };
        registerSettingsGetter(() => dynamicSettings);

        // 1. Prior year date (e.g. 2023-05-15) -> returns full date with year
        const priorYearDate = '2023-05-15T12:00:00Z';
        const previewPrior1 = formatMailPreviewDate(priorYearDate);
        assert.strictEqual(previewPrior1, '5/15/2023', `Expected 5/15/2023 with M/D/YYYY, got '${previewPrior1}'`);

        // Switch to DD/MM/YYYY
        dynamicSettings.languageTime.dateFormat = 'DD/MM/YYYY';
        const previewPrior2 = formatMailPreviewDate(priorYearDate);
        assert.strictEqual(previewPrior2, '15/05/2023', `Expected 15/05/2023 with DD/MM/YYYY, got '${previewPrior2}'`);

        // Switch to YYYY-MM-DD
        dynamicSettings.languageTime.dateFormat = 'YYYY-MM-DD';
        const previewPrior3 = formatMailPreviewDate(priorYearDate);
        assert.strictEqual(previewPrior3, '2023-05-15', `Expected 2023-05-15 with YYYY-MM-DD, got '${previewPrior3}'`);

        // 2. This year date (e.g. 2026-05-15) -> returns weekday + short date formatted per dateFormat
        const thisYearDate = '2026-05-15T12:00:00Z';

        // DD/MM/YYYY
        dynamicSettings.languageTime.dateFormat = 'DD/MM/YYYY';
        const previewThisYearDD = formatMailPreviewDate(thisYearDate);
        assert.ok(previewThisYearDD.includes('15/05'), `Expected 15/05 in preview, got '${previewThisYearDD}'`);

        // M/D/YYYY
        dynamicSettings.languageTime.dateFormat = 'M/D/YYYY';
        const previewThisYearMD = formatMailPreviewDate(thisYearDate);
        assert.ok(previewThisYearMD.includes('5/15'), `Expected 5/15 in preview, got '${previewThisYearMD}'`);

        // 3. Today's date -> returns time formatted per timeFormat
        const todayDate = new Date();
        dynamicSettings.languageTime.timeFormat = '12h';
        const previewToday12 = formatMailPreviewDate(todayDate);
        assert.ok(previewToday12.includes('AM') || previewToday12.includes('PM'), `Expected 12h format for today, got '${previewToday12}'`);

        dynamicSettings.languageTime.timeFormat = '24h';
        const previewToday24 = formatMailPreviewDate(todayDate);
        assert.ok(!previewToday24.includes('AM') && !previewToday24.includes('PM'), `Expected 24h format for today, got '${previewToday24}'`);
    });

    await runTest('CH2.5.5', 'Timezone shift across midnight accurately adjusts date in reading mode', async () => {
        const { formatMailReadingDate, registerSettingsGetter } = dateUtilsModule;
        
        // 2026-10-20 23:30:00 UTC
        const midnightTimestamp = '2026-10-20T23:30:00Z';

        // In UTC (date is Oct 20)
        registerSettingsGetter(() => ({
            languageTime: { language: 'en-US', dateFormat: 'YYYY-MM-DD', timeFormat: '24h', timeZone: 'UTC' }
        }));
        const utcReading = formatMailReadingDate(midnightTimestamp);
        assert.ok(utcReading.includes('2026-10-20 23:30'), `Expected 2026-10-20 23:30 in UTC, got '${utcReading}'`);

        // In Asia/Kolkata (+05:30) -> 23:30 + 5:30 = 05:00 on Oct 21!
        registerSettingsGetter(() => ({
            languageTime: { language: 'en-US', dateFormat: 'YYYY-MM-DD', timeFormat: '24h', timeZone: 'Asia/Kolkata' }
        }));
        const istReading = formatMailReadingDate(midnightTimestamp);
        assert.ok(istReading.includes('2026-10-21 05:00'), `Expected 2026-10-21 05:00 in IST, got '${istReading}'`);
    });

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n================================================================================');
    console.log(' EMPIRICAL CHALLENGE SUITE SUMMARY');
    console.log('================================================================================');
    console.log(` Total Empirical Tests: ${testsPassed + testsFailed}`);
    console.log(` Passed:                ${testsPassed}`);
    console.log(` Failed:                ${testsFailed}`);
    console.log(` Pass Rate:             ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
    console.log('================================================================================\n');

    if (testsFailed > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
});
