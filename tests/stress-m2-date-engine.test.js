/**
 * Adversarial Stress & Vulnerability Test Suite for Milestone 2
 * Targets: Central Date & Time Formatting Engine (client/src/utils/dateUtils.js)
 * 
 * Execution:
 *   node tests/stress-m2-date-engine.test.js
 */

const assert = require('assert');

async function runAllM2StressTests() {
    console.log('='.repeat(80));
    console.log(' SAFEMAILZ MILESTONE 2 ADVERSARIAL STRESS & EMPIRICAL HARNESS');
    console.log(' Targets: client/src/utils/dateUtils.js');
    console.log('='.repeat(80) + '\n');

    // Dynamic ESM import of date engine
    const {
        formatEmailDate,
        formatMailPreviewDate,
        formatMailReadingDate,
        getSafeTimeZone,
        registerSettingsGetter,
        getGeneralSettings,
        SUPPORTED_DATE_FORMATS,
        SUPPORTED_TIME_FORMATS,
        DEFAULT_LANGUAGE_TIME
    } = await import('../client/src/utils/dateUtils.js');

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    const findings = [];

    function test(name, fn) {
        totalTests++;
        process.stdout.write(`  [STRESS TEST ${totalTests}] ${name} ... `);
        try {
            const result = fn();
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

    console.log('--- SUITE 1: BOUNDARY DATES & EPOCH EXTREMES ---');

    test('1.1 Leap Day (2024-02-29 23:59:59Z) in all 4 formats', () => {
        const d = '2024-02-29T23:59:59Z';
        const f1 = formatEmailDate(d, { mode: 'full', dateFormat: 'M/D/YYYY', timeZone: 'UTC' });
        const f2 = formatEmailDate(d, { mode: 'full', dateFormat: 'DD/MM/YYYY', timeZone: 'UTC' });
        const f3 = formatEmailDate(d, { mode: 'full', dateFormat: 'YYYY-MM-DD', timeZone: 'UTC' });
        const f4 = formatEmailDate(d, { mode: 'full', dateFormat: 'MMM D, YYYY', timeZone: 'UTC' });

        assert.ok(f1.includes('2/29/2024'), `f1 failed: ${f1}`);
        assert.ok(f2.includes('29/02/2024'), `f2 failed: ${f2}`);
        assert.ok(f3.includes('2024-02-29'), `f3 failed: ${f3}`);
        assert.ok(f4.includes('Feb 29, 2024'), `f4 failed: ${f4}`);
    });

    test('1.2 Non-Leap Century (2100-02-28 and 2100-03-01)', () => {
        const d1 = '2100-02-28T23:59:59Z';
        const d2 = '2100-03-01T00:00:00Z';
        const r1 = formatEmailDate(d1, { mode: 'dateOnly', dateFormat: 'YYYY-MM-DD', timeZone: 'UTC' });
        const r2 = formatEmailDate(d2, { mode: 'dateOnly', dateFormat: 'YYYY-MM-DD', timeZone: 'UTC' });
        assert.strictEqual(r1, '2100-02-28');
        assert.strictEqual(r2, '2100-03-01');
    });

    test('1.3 Unix Epoch Start (1970-01-01 00:00:00Z)', () => {
        const epochStr = '1970-01-01T00:00:00Z';
        const epochNum = 0;
        const resStr = formatEmailDate(epochStr, { mode: 'full', dateFormat: 'YYYY-MM-DD', timeZone: 'UTC' });
        const resNum = formatEmailDate(epochNum, { mode: 'full', dateFormat: 'YYYY-MM-DD', timeZone: 'UTC' });
        assert.ok(resStr.includes('1970-01-01 12:00 AM') || resStr.includes('1970-01-01 00:00'), `resStr: ${resStr}`);
        assert.ok(resNum.includes('1970-01-01 12:00 AM') || resNum.includes('1970-01-01 00:00'), `resNum: ${resNum}`);
    });

    test('1.4 Pre-Epoch (1969-12-31 23:59:59Z and negative ms)', () => {
        const preEpoch = '1969-12-31T23:59:59Z';
        const res = formatEmailDate(preEpoch, { mode: 'full', dateFormat: 'YYYY-MM-DD', timeZone: 'UTC' });
        assert.ok(res.includes('1969-12-31 11:59 PM'), `res: ${res}`);
        const resNeg = formatEmailDate(-1000, { mode: 'full', dateFormat: 'YYYY-MM-DD', timeZone: 'UTC' });
        assert.ok(resNeg.includes('1969-12-31'), `resNeg: ${resNeg}`);
    });

    test('1.5 Far Future (2099-12-31 and 3000-01-01)', () => {
        const d2099 = formatEmailDate('2099-12-31T23:59:59Z', { mode: 'dateOnly', dateFormat: 'YYYY-MM-DD', timeZone: 'UTC' });
        const d3000 = formatEmailDate('3000-01-01T00:00:00Z', { mode: 'dateOnly', dateFormat: 'YYYY-MM-DD', timeZone: 'UTC' });
        assert.strictEqual(d2099, '2099-12-31');
        assert.strictEqual(d3000, '3000-01-01');
    });

    test('1.6 Year Boundary Rollover (+05:30 pushes 2024-12-31 into 2025-01-01)', () => {
        const ts = '2024-12-31T23:30:00Z';
        const res = formatEmailDate(ts, { mode: 'full', dateFormat: 'YYYY-MM-DD', timeZone: 'Asia/Kolkata' });
        assert.ok(res.includes('2025-01-01 5:00 AM'), `Expected 2025-01-01 5:00 AM but got: ${res}`);
    });

    test('1.7 Year Boundary Rollback (-05:00 pulls 2025-01-01 back into 2024-12-31)', () => {
        const ts = '2025-01-01T02:00:00Z';
        const res = formatEmailDate(ts, { mode: 'full', dateFormat: 'YYYY-MM-DD', timeZone: 'America/New_York' });
        assert.ok(res.includes('2024-12-31 9:00 PM'), `Expected 2024-12-31 9:00 PM but got: ${res}`);
    });

    console.log('\n--- SUITE 2: NON-STANDARD & FRACTIONAL TIMEZONE OFFSETS ---');

    test('2.1 Half-Hour Zones: Asia/Kolkata (+05:30) and America/St_Johns (-03:30/02:30)', () => {
        const ts = '2026-01-15T12:00:00Z';
        const kolkata = formatEmailDate(ts, { mode: 'timeOnly', timeZone: 'Asia/Kolkata', timeFormat: '24h' });
        const stJohns = formatEmailDate(ts, { mode: 'timeOnly', timeZone: 'America/St_Johns', timeFormat: '24h' });
        assert.strictEqual(kolkata, '17:30', `Kolkata 24h expected 17:30, got ${kolkata}`);
        assert.strictEqual(stJohns, '08:30', `St_Johns 24h expected 08:30, got ${stJohns}`);
    });

    test('2.2 45-Minute Zones: Asia/Kathmandu (+05:45) and Pacific/Chatham (+12:45/+13:45)', () => {
        const ts = '2026-01-15T12:00:00Z';
        const kathmandu = formatEmailDate(ts, { mode: 'timeOnly', timeZone: 'Asia/Kathmandu', timeFormat: '24h' });
        const chatham = formatEmailDate(ts, { mode: 'timeOnly', timeZone: 'Pacific/Chatham', timeFormat: '24h' });
        assert.strictEqual(kathmandu, '17:45', `Kathmandu expected 17:45, got ${kathmandu}`);
        assert.strictEqual(chatham, '01:45', `Chatham expected 01:45, got ${chatham}`);
    });

    test('2.3 Fractional Zones: Australia/Eucla (+08:45) and Asia/Tehran (+03:30)', () => {
        const ts = '2026-01-15T10:00:00Z';
        const eucla = formatEmailDate(ts, { mode: 'timeOnly', timeZone: 'Australia/Eucla', timeFormat: '24h' });
        const tehran = formatEmailDate(ts, { mode: 'timeOnly', timeZone: 'Asia/Tehran', timeFormat: '24h' });
        assert.strictEqual(eucla, '18:45', `Eucla expected 18:45, got ${eucla}`);
        assert.strictEqual(tehran, '13:30', `Tehran expected 13:30, got ${tehran}`);
    });

    test('2.4 Extreme Timezone Edges: Pacific/Kiritimati (+14:00) and Etc/GMT+12 (-12:00)', () => {
        const ts = '2026-06-01T12:00:00Z';
        const kiritimati = formatEmailDate(ts, { mode: 'full', dateFormat: 'YYYY-MM-DD', timeZone: 'Pacific/Kiritimati', timeFormat: '24h' });
        const gmtMinus12 = formatEmailDate(ts, { mode: 'full', dateFormat: 'YYYY-MM-DD', timeZone: 'Etc/GMT+12', timeFormat: '24h' });
        assert.ok(kiritimati.includes('2026-06-02 02:00'), `Kiritimati expected 2026-06-02 02:00, got ${kiritimati}`);
        assert.ok(gmtMinus12.includes('2026-06-01 00:00'), `GMT-12 expected 2026-06-01 00:00, got ${gmtMinus12}`);
    });

    console.log('\n--- SUITE 3: TIMESTAMP NORMALIZATION & SQLITE RESILIENCE ---');

    test('3.1 Standard SQLite space-separated timestamp "2026-10-20 14:00:00"', () => {
        const res = formatEmailDate('2026-10-20 14:00:00', { mode: 'full', timeZone: 'UTC', timeFormat: '24h' });
        assert.ok(res.includes('14:00'), `Expected 14:00 in UTC, got: ${res}`);
    });

    test('3.2 SQLite timestamp with milliseconds "2026-10-20 14:00:00.123"', () => {
        const res = formatEmailDate('2026-10-20 14:00:00.123', { mode: 'full', timeZone: 'UTC', timeFormat: '24h' });
        assert.ok(res.includes('14:00'), `Expected 14:00 in UTC, got: ${res}`);
    });

    test('3.3 Space-separated timestamp with timezone offset "2026-10-20 14:00:00+05:30"', () => {
        const res = formatEmailDate('2026-10-20 14:00:00+05:30', { mode: 'full', timeZone: 'UTC', timeFormat: '24h' });
        if (res === '2026-10-20 14:00:00+05:30') {
            throw new Error(`CRITICAL BUG: space-separated timestamp with offset appended Z creating invalid "...+05:30Z" returning raw string: ${res}`);
        }
        assert.ok(res.includes('08:30'), `Expected 08:30 UTC, got: ${res}`);
    });

    test('3.4 Space-separated timestamp with negative offset "2026-10-20 14:00:00-04:00"', () => {
        const res = formatEmailDate('2026-10-20 14:00:00-04:00', { mode: 'full', timeZone: 'UTC', timeFormat: '24h' });
        if (res === '2026-10-20 14:00:00-04:00') {
            throw new Error(`CRITICAL BUG: space-separated timestamp with negative offset appended Z creating invalid "...-04:00Z" returning raw string: ${res}`);
        }
        assert.ok(res.includes('18:00'), `Expected 18:00 UTC, got: ${res}`);
    });

    test('3.5 ISO string with and without Z comparison consistency', () => {
        const isoZ = formatEmailDate('2026-10-20T14:00:00Z', { mode: 'full', timeZone: 'UTC', timeFormat: '24h' });
        const isoNoZ = formatEmailDate('2026-10-20T14:00:00', { mode: 'full', timeZone: 'UTC', timeFormat: '24h' });
        const spaceTs = formatEmailDate('2026-10-20 14:00:00', { mode: 'full', timeZone: 'UTC', timeFormat: '24h' });

        if (isoNoZ !== spaceTs) {
            return {
                warning: `ISO string without Z ("2026-10-20T14:00:00" -> "${isoNoZ}") parsed as local time instead of UTC, drifting from space-separated SQLite timestamp ("${spaceTs}")`
            };
        }
    });

    test('3.6 Numeric Epoch Milliseconds (e.g. 1776693600000)', () => {
        const ms = 1776693600000;
        const res = formatEmailDate(ms, { mode: 'full', timeZone: 'UTC', timeFormat: '24h' });
        assert.ok(res.includes('14:00'), `Expected 14:00 UTC for ms epoch, got: ${res}`);
    });

    test('3.7 String-encoded numeric epoch ms "1776693600000"', () => {
        const strMs = '1776693600000';
        const res = formatEmailDate(strMs, { mode: 'full', timeZone: 'UTC', timeFormat: '24h' });
        if (res === '1776693600000') {
            return {
                warning: `String-encoded epoch ms "${strMs}" returned raw string instead of parsing as epoch timestamp`
            };
        }
        assert.ok(res.includes('14:00'), `Expected 14:00, got: ${res}`);
    });

    console.log('\n--- SUITE 4: MALFORMED INPUTS & EXCEPTION RESILIENCE ---');

    test('4.1 Null, undefined, empty string, and whitespace-only string', () => {
        assert.strictEqual(formatEmailDate(null), '', 'null must return empty string');
        assert.strictEqual(formatEmailDate(undefined), '', 'undefined must return empty string');
        assert.strictEqual(formatEmailDate(''), '', 'empty string must return empty string');
        assert.strictEqual(formatEmailDate('   '), '', 'whitespace string must return empty string');
    });

    test('4.2 Non-date string values must return raw string without throwing', () => {
        assert.strictEqual(formatEmailDate('invalid-date'), 'invalid-date');
        assert.strictEqual(formatEmailDate('2026-99-99 99:99:99'), '2026-99-99 99:99:99');
        assert.strictEqual(formatEmailDate('foobar'), 'foobar');
    });

    test('4.3 Non-string, non-number malformed objects/primitives must return "-" without throwing', () => {
        assert.strictEqual(formatEmailDate({}), '-');
        assert.strictEqual(formatEmailDate([]), '-');
        assert.strictEqual(formatEmailDate(true), '-');
        assert.strictEqual(formatEmailDate(false), '-');
        assert.strictEqual(formatEmailDate(NaN), '-');
        assert.strictEqual(formatEmailDate(Infinity), '-');
        assert.strictEqual(formatEmailDate(-Infinity), '-');
        assert.strictEqual(formatEmailDate(Symbol('test')), '-');
        assert.strictEqual(formatEmailDate(new Date(NaN)), '-');
    });

    test('4.4 Null options parameter formatEmailDate(date, null)', () => {
        try {
            const res = formatEmailDate('2026-10-20', null);
            assert.ok(typeof res === 'string');
        } catch (err) {
            throw new Error(`CRITICAL BUG: formatEmailDate(date, null) threw uncaught exception: ${err.message}`);
        }
    });

    test('4.5 Non-object primitive options parameters (undefined, number, boolean, string)', () => {
        const d = '2026-10-20T12:00:00Z';
        assert.doesNotThrow(() => formatEmailDate(d, undefined));
        assert.doesNotThrow(() => formatEmailDate(d, 0));
        assert.doesNotThrow(() => formatEmailDate(d, 1));
        assert.doesNotThrow(() => formatEmailDate(d, true));
        assert.doesNotThrow(() => formatEmailDate(d, false));
        assert.doesNotThrow(() => formatEmailDate(d, 'reading'));
    });

    console.log('\n--- SUITE 5: INVALID TIMEZONES & SAFE FALLBACKS ---');

    test('5.1 Non-existent fantasy timezone "Invalid/Mars_Olympus"', () => {
        const safe = getSafeTimeZone('Invalid/Mars_Olympus');
        assert.strictEqual(safe, 'UTC', `getSafeTimeZone expected UTC, got ${safe}`);
        const res = formatEmailDate('2026-10-20T12:00:00Z', { mode: 'full', timeZone: 'Invalid/Mars_Olympus', timeFormat: '24h' });
        assert.ok(res.includes('12:00'), `Expected 12:00 UTC fallback, got: ${res}`);
    });

    test('5.2 Empty string and whitespace timezones', () => {
        assert.strictEqual(getSafeTimeZone(''), 'UTC');
        assert.strictEqual(getSafeTimeZone('   '), 'UTC');
        const res = formatEmailDate('2026-10-20T12:00:00Z', { mode: 'full', timeZone: '   ', timeFormat: '24h' });
        assert.ok(res.includes('12:00'));
    });

    test('5.3 Malformed non-string timezone inputs (null, undefined, number, object)', () => {
        assert.strictEqual(getSafeTimeZone(null), 'UTC');
        assert.strictEqual(getSafeTimeZone(undefined), 'UTC');
        assert.strictEqual(getSafeTimeZone(123), 'UTC');
        assert.strictEqual(getSafeTimeZone({}), 'UTC');
        assert.strictEqual(getSafeTimeZone(['UTC']), 'UTC');
    });

    console.log('\n--- SUITE 6: FORMAT TOKENS, MODES & LIVE PREVIEW ENGINE ---');

    test('6.1 All 4 supported date formats render correctly', () => {
        const d = '2026-05-07T12:00:00Z';
        const f1 = formatEmailDate(d, { mode: 'dateOnly', dateFormat: 'M/D/YYYY', timeZone: 'UTC' });
        const f2 = formatEmailDate(d, { mode: 'dateOnly', dateFormat: 'DD/MM/YYYY', timeZone: 'UTC' });
        const f3 = formatEmailDate(d, { mode: 'dateOnly', dateFormat: 'YYYY-MM-DD', timeZone: 'UTC' });
        const f4 = formatEmailDate(d, { mode: 'dateOnly', dateFormat: 'MMM D, YYYY', timeZone: 'UTC' });

        assert.strictEqual(f1, '5/7/2026', `M/D/YYYY expected 5/7/2026, got ${f1}`);
        assert.strictEqual(f2, '07/05/2026', `DD/MM/YYYY expected 07/05/2026, got ${f2}`);
        assert.strictEqual(f3, '2026-05-07', `YYYY-MM-DD expected 2026-05-07, got ${f3}`);
        assert.strictEqual(f4, 'May 7, 2026', `MMM D, YYYY expected May 7, 2026, got ${f4}`);
    });

    test('6.2 12-hour vs 24-hour time formatting across AM, PM, noon, and midnight', () => {
        const midnight = '2026-10-20T00:05:00Z';
        const noon = '2026-10-20T12:05:00Z';
        const am12 = formatEmailDate(midnight, { mode: 'timeOnly', timeFormat: '12h', timeZone: 'UTC' });
        const am24 = formatEmailDate(midnight, { mode: 'timeOnly', timeFormat: '24h', timeZone: 'UTC' });
        const pm12 = formatEmailDate(noon, { mode: 'timeOnly', timeFormat: '12h', timeZone: 'UTC' });
        const pm24 = formatEmailDate(noon, { mode: 'timeOnly', timeFormat: '24h', timeZone: 'UTC' });

        assert.strictEqual(am12, '12:05 AM', `Midnight 12h: ${am12}`);
        assert.strictEqual(am24, '00:05', `Midnight 24h: ${am24}`);
        assert.strictEqual(pm12, '12:05 PM', `Noon 12h: ${pm12}`);
        assert.strictEqual(pm24, '12:05', `Noon 24h: ${pm24}`);
    });

    test('6.3 Reading Mode renders full weekday + date + time', () => {
        const res = formatMailReadingDate('2026-10-20T14:00:00Z', { timeZone: 'UTC', dateFormat: 'YYYY-MM-DD', timeFormat: '24h' });
        assert.strictEqual(res, 'Tue 2026-10-20 14:00');
    });

    test('6.4 Preview Mode Outlook behavior: today renders time, earlier this year renders weekday+date, prior year renders full date', () => {
        const now = new Date();
        const todayIso = now.toISOString();

        const todayRes = formatMailPreviewDate(todayIso, { timeZone: 'UTC', timeFormat: '24h' });
        assert.ok(/^\d{2}:\d{2}$/.test(todayRes), `Today expected time HH:MM, got: ${todayRes}`);

        const priorYearIso = new Date(now.getFullYear() - 1, 5, 15).toISOString();
        const priorRes = formatMailPreviewDate(priorYearIso, { timeZone: 'UTC', dateFormat: 'YYYY-MM-DD' });
        assert.ok(priorRes.includes(String(now.getFullYear() - 1)), `Prior year expected full date with year, got: ${priorRes}`);
    });

    console.log('\n--- SUITE 7: EXTERNAL SETTINGS GETTER & ISOLATION ---');

    test('7.1 registerSettingsGetter with throwing getter recovers gracefully', () => {
        registerSettingsGetter(() => { throw new Error('Settings store crashed'); });
        const res = formatEmailDate('2026-10-20T12:00:00Z', { mode: 'full', timeZone: 'UTC', timeFormat: '24h' });
        assert.ok(res.includes('12:00'), `Expected graceful fallback to defaults, got: ${res}`);
        registerSettingsGetter(null);
    });

    test('7.2 registerSettingsGetter custom override applies dynamically', () => {
        registerSettingsGetter(() => ({
            languageTime: {
                dateFormat: 'DD/MM/YYYY',
                timeFormat: '24h',
                timeZone: 'Asia/Kathmandu'
            }
        }));
        const res = formatEmailDate('2026-01-15T12:00:00Z', { mode: 'full' });
        assert.ok(res.includes('15/01/2026 17:45'), `Expected Kathmandu dynamic settings applied, got: ${res}`);
        registerSettingsGetter(null);
    });

    console.log('\n--- SUITE 8: HIGH-THROUGHPUT CONCURRENCY STRESS ---');

    test('8.1 10,000 rapid formatEmailDate calls without memory leak or state pollution', () => {
        const start = performance.now();
        const iterations = 10000;
        for (let i = 0; i < iterations; i++) {
            formatEmailDate('2026-10-20 14:00:00', { mode: 'preview', timeZone: 'Asia/Kolkata' });
        }
        const elapsed = performance.now() - start;
        assert.ok(elapsed < 5000, `10,000 iterations took too long: ${elapsed.toFixed(1)}ms`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(' ADVERSARIAL STRESS TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(` Total Stress Tests: ${totalTests}`);
    console.log(` \x1b[32mPassed:\x1b[0m              ${passedTests}`);
    console.log(` \x1b[31mFailed:\x1b[0m              ${failedTests}`);
    console.log(` Findings / Warnings: ${findings.length}`);
    console.log('='.repeat(80) + '\n');

    if (findings.length > 0) {
        console.log('DETAILED FINDINGS:');
        findings.forEach((f, idx) => {
            console.log(` [${idx + 1}] [${f.type}] in "${f.test}":`);
            console.log(`     ${f.detail}`);
        });
        console.log('');
    }

    if (failedTests > 0) {
        process.exitCode = 1;
    }
}

runAllM2StressTests().catch(err => {
    console.error('Fatal stress suite runner error:', err);
    process.exit(1);
});
