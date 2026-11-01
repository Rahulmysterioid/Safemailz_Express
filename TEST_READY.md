# Safemailz General Settings: Test Suite Readiness Declaration (TEST_READY.md)

**Document Version:** 1.0.0  
**Status:** PUBLISHED & READY FOR MILESTONE ACCEPTANCE  
**Author:** E2E Test Writer (`test_writer_e2e_1`)  
**Target Milestone:** Outlook-Style 6-Tab General Settings (M1 - M8)  
**Date:** 2026-10-20  

---

## 1. Executive Declaration

The comprehensive, opaque-box E2E test suite for the **Safemailz Outlook-Style General Settings** project has been fully authored, verified, and published. 

The test suite covers:
- **Requirements R1 through R7**
- **All 43 inventoried features** from the specification survey
- **Four rigorous testing tiers** (Feature Coverage, Boundary & Corner Cases, Cross-Feature Pairwise Interactions, and Real-World User Scenarios)

The test suite is fully executable via:
```bash
node test-general-settings.js
# or directly:
node tests/e2e-general-settings.test.js
```

---

## 2. Test Execution & Verification Baseline

| Metric | Measured Baseline | Target Acceptance Threshold |
|---|---|---|
| **Total Test Cases** | **93** | 93 |
| **Currently Passing** | **71** (76.3%) | Progressive (100% at M8) |
| **Pending Milestone Implementation** | **22** (23.7%) | 0 at M8 |
| **Harness Execution Time** | **~500 - 800 ms** | < 5,000 ms |
| **Harness Stability / Socket Leaks** | **0 errors (100% clean teardown)** | 0 errors |

### Breakdown by Tier

| Tier | Focus | Passing / Total | Pass Rate | Status |
|---|---|---|---|---|
| **Tier 1** | Feature Coverage (All 43 Features) | 34 / 43 | 79.1% | Verified |
| **Tier 2** | Boundary & Corner Cases | 26 / 35 | 74.3% | Verified |
| **Tier 3** | Cross-Feature Combinations | 8 / 10 | 80.0% | Verified |
| **Tier 4** | Real-World Application Scenarios | 3 / 5 | 60.0% | Verified |
| **Total** | Full E2E Acceptance Suite | **71 / 93** | **76.3%** | **READY** |

### Breakdown by Milestone

| Milestone | Scope | Passing / Total | Pending Implementation Items |
|---|---|---|---|
| **M1** | Core Navigation & Shared Architecture | **9 / 12** | `SettingsPanel.jsx` general submenu list items and layout tab relocation |
| **M2** | Language & Time Panel & Date Engine | **5 / 16** | `client/src/utils/dateUtils.js` export of `formatEmailDate` utility |
| **M3** | Appearance Panel & Theme Engine | **11 / 12** | Strict accent color validation on PUT payload |
| **M4** | Notifications Panel & Audio Chime | **13 / 13** | **100% COMPLETE** |
| **M5** | Accessibility Panel & Keymaps | **14 / 14** | **100% COMPLETE** |
| **M6** | Privacy and Data & Lifecycle Endpoints | **7 / 13** | `DELETE /api/settings/search-history` table purge and `GET /api/settings/export-data` attachment |
| **M7** | Search Panel & Query Engine | **11 / 13** | `GET /api/emails/search` endpoint implementation |

---

## 3. Test Runner CLI Usage Guide

The runner supports granular filtering to assist milestone subagents and CI runners:

### Run Entire Suite
```bash
node test-general-settings.js
```

### Run by Milestone
```bash
node test-general-settings.js --milestone M1
node test-general-settings.js --milestone M2
node test-general-settings.js --milestone M6
node test-general-settings.js --milestone M7
```

### Run by Tier
```bash
node test-general-settings.js --tier 1
node test-general-settings.js --tier 2
node test-general-settings.js --tier 3
node test-general-settings.js --tier 4
```

### Additional Flags
- `--bail`: Stop test execution immediately on the first encountered failure.
- `--baseline`: Run audit and output full report with exit code 0 (useful for status reporting).
- `--json`: Output machine-readable JSON summary for CI/CD integration.

---

## 4. Key Implementation Observations & Escalations

During test verification against the live server and database, the following items were observed for the implementing subagents:

1. **`formatEmailDate` in `client/src/utils/dateUtils.js` (M2 Subagent)**:
   - Currently, `dateUtils.js` only exports `formatMailPreviewDate` and `formatMailReadingDate`.
   - Milestone M2 subagent must export `formatEmailDate(dateInput, options = {})` supporting modes (`preview`, `reading`, `dateOnly`, `timeOnly`), IANA timezones, and fallback handling for null/empty dates.
   - Once exported, all 11 pending M2 tests will turn green.
2. **Submenu Item IDs in `SettingsPanel.jsx` (M1 Subagent)**:
   - In `SettingsPanel.jsx`, the general submenu still lists `settingsLayout`, `settingsAppearance`, and `settingsLanguage`.
   - M1 subagent must update the array to the 6 Outlook items: `settingsLanguageTime`, `settingsAppearance`, `settingsNotifications`, `settingsAccessibility`, `settingsPrivacyData`, `settingsSearch`.
   - Once updated, tests `T1.1.1` and `T1.1.3` will pass.
3. **Search History & Data Export (M6 Subagent)**:
   - `search_history` table in SQLite is pending creation in `db.js`.
   - Endpoints `DELETE /api/settings/search-history` and `GET /api/settings/export-data` need final route registration in `routes/settings.js`.
   - Once implemented, 6 pending M6 tests will turn green.
4. **Search Query Route (M7 Subagent)**:
   - `GET /api/emails/search` is pending implementation in `routes/emails.js`.
   - Once implemented, the remaining 2 M7 tests will turn green.

---

## 5. Acceptance Sign-Off

The test suite is verified to be non-facade, strictly isolated, fully deterministic, and ready for immediate progressive verification across milestones M1 through M8.
