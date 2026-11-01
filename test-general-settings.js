#!/usr/bin/env node
/**
 * Safemailz Outlook-Style General Settings Test Runner
 * Entry point for running 4-tier E2E acceptance tests.
 * 
 * Usage:
 *   node test-general-settings.js
 *   node test-general-settings.js --tier 1
 *   node test-general-settings.js --milestone M1
 *   node test-general-settings.js --bail
 *   node test-general-settings.js --baseline
 */

const { spawn } = require('child_process');
const path = require('path');

const testFile = path.resolve(__dirname, 'tests/e2e-general-settings.test.js');
const args = [testFile, ...process.argv.slice(2)];

const child = spawn(process.execPath, args, {
    stdio: 'inherit',
    env: process.env
});

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
    } else {
        process.exit(code || 0);
    }
});
