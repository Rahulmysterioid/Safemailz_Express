# Safemailz General Settings E2E Test Infrastructure (TEST_INFRA.md)

**Version:** 1.0.0  
**Target Milestone:** Outlook-Style 6-Tab General Settings (M1 - M8)  
**Author:** E2E Test Writer (`test_writer_e2e_1`)  
**Status:** Active Test Specification & Execution Framework  

---

## 1. Test Philosophy & Engineering Principles

The Safemailz Outlook-Style General Settings test infrastructure is engineered according to four fundamental tenets:

1. **Opaque-Box Verification**: Tests validate the system solely through observable, public surface areas:
   - REST API HTTP endpoints (`GET/PUT /api/settings/general`, `DELETE /api/settings/search-history`, `GET /api/settings/export-data`, `GET /api/emails/search`).
   - SQLite database table schemas and persistent records (`user_general_settings`, `search_history`).
   - Client exported utilities (`formatEmailDate` in `client/src/utils/dateUtils.js`).
   - Document Object Model (DOM) and styling contracts (CSS custom properties, body class lists, Web Audio synthesizer contracts, and keyboard event routing).
2. **Progressive Testability**:
   - Tests are structured across implementation milestones (M1 through M7).
   - Before a milestone is implemented, tests fail gracefully with clear diagnostic messages indicating which milestone is pending (e.g. `Milestone M1 pending: /api/settings/general returned 404`).
   - As each subagent implements their assigned milestone, corresponding tests transition from failing to passing without modifying test assertions.
3. **Test Integrity & Anti-Facade Guarantee**:
   - Zero facade tests: Every test performs strict behavioral assertions against real data structures, HTTP response codes, JSON schemas, and DOM state.
   - Tests do NOT mock or bypass real application logic. If a route returns HTML instead of JSON or misses a required slice, the test fails immediately.
4. **Zero Production Contamination**:
   - The test infrastructure lives exclusively in `tests/` and dedicated runner scripts (`test-general-settings.js`).
   - Production source files in `client/src/` and `routes/` are strictly unmodified by the test writer.

---

## 2. 4-Tier Test Architecture

The test suite contains **93 test cases** organized across four comprehensive tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Tier 4: Real-World Scenarios (5)                     │
│    Full end-to-end user workflows: Onboarding, Accessibility Setup,    │
│    GDPR Data Audit, Executive Search, and Dirty State / Save Cycles    │
├────────────────────────────────────────────────────────────────────────┤
│                Tier 3: Cross-Feature Combinations (10)                 │
│    Pairwise feature interactions: Dark Theme + High Contrast,          │
│    24h Time + Timezone Shift + Date Display, Scope vs IncludeDeleted,  │
│    Notifications Master Off + Audio Test Sound, Shortcut + Input Focus │
├────────────────────────────────────────────────────────────────────────┤
│              Tier 2: Boundary & Corner Cases (35 tests)                │
│    >=5 test cases per feature slice: empty payloads, invalid timezones, │
│    corrupted inputs, SQL injection attempts, null dates, user isolation│
├────────────────────────────────────────────────────────────────────────┤
│                 Tier 1: Feature Coverage (43 tests)                    │
│    Complete coverage of all 43 inventoried features across R1 - R7:    │
│    Navigation (6), Language/Time (7), Appearance (5), Notifications (7),│
│    Accessibility (7), Privacy & Data (5), Search Query Engine (6)      │
└────────────────────────────────────────────────────────────────────────┘
```

### Tier 1: Feature Coverage (43 tests)
Validates the happy path and primary functional contracts of each feature slice defined in `PROJECT.md` and `survey_spec.md`.
- **R1. Submenu Navigation & Shared Architecture**: 6-item menu structure, `#0078d4` active indicator, layout tab migration to Mail, SQLite `user_general_settings` table, `GET /api/settings/general` default fallbacks, `PUT /api/settings/general` deep merge.
- **R2. Language & Time Panel & Date Formatting Engine**: Locale selection, 4 standard date formats, 12h/24h time format, IANA timezone selector, `formatEmailDate` preview/reading modes, save/discard dirty state.
- **R3. Appearance Panel & Dynamic Theme Engine**: Theme cards (light/dark/system), OS theme listener (`prefers-color-scheme`), 6 accent color swatches, `--primary-color` CSS token synchronization, display density modes (roomy/cozy/compact).
- **R4. Notifications Panel & Audio Dispatcher**: Master switch, new mail toggle, desktop style (browser/toast/none), 4 audio tones, Web Audio API chime synthesis, task mentions toggle, HTML5 permission lifecycle.
- **R5. Accessibility Panel & Accessibility Controller**: Shortcut profiles (Outlook/Gmail/Off), global keydown dispatcher (`n`, `c`, `/`, `Esc`), input focus suppression, high contrast body class, font scale classes (100%, 110%, 125%), reduce motion class, empty subject warning prompt.
- **R6. Privacy & Data Panel & Data Lifecycle Endpoints**: External image proxy vs ask, read receipts toggle, search history logging toggle, `DELETE /api/settings/search-history`, `GET /api/settings/export-data` downloadable JSON attachment.
- **R7. Search Panel & Query Engine**: Folder scope (all/current/exclude_deleted_junk), include deleted items toggle, query suggestions toggle, page size limit (25/50/100), `GET /api/emails/search` SQL filtering and query logging.

### Tier 2: Boundary & Corner Cases (35 tests)
Exhaustively stresses edge conditions, malformed data, and fault tolerance:
- **Authentication & Security**: Missing `X-User-Id` returns HTTP 401; cross-user isolation prevents User A from seeing or deleting User B's settings or query history; SQL injection payloads (`' OR '1'='1' --`) in search queries are safely sanitized via parameterized queries.
- **Payload Integrity**: Non-JSON payloads return HTTP 400; empty JSON body `{}` preserves stored settings; partial payloads deep-merge without wiping siblings; invalid enums fall back to specification defaults.
- **Date & Time Boundaries**: `formatEmailDate` gracefully handles `null`, `undefined`, empty strings, and non-date garbage (`"not-a-date"`); legacy SQLite space-separated timestamps (`"YYYY-MM-DD HH:MM:SS"`) are normalized to UTC ISO-8601; leap years (`2024-02-29`) and epoch timestamps (`1970-01-01`) format reliably.
- **Audio & Browser APIs**: Handled when Web Audio `AudioContext` is suspended or blocked by browser autoplay policies; Notification permission `'denied'` gracefully degrades to `'toast'`.
- **Keyboard & DOM Boundaries**: Shortcut keys pressed while typing in `<input>`, `<textarea>`, or contenteditable fields are suppressed; `Esc` with stacked dialogs closes only the topmost modal; switching font scale strips prior scale classes cleanly.
- **Data Lifecycle Boundaries**: `DELETE /api/settings/search-history` is idempotent when history is empty; `GET /api/settings/export-data` for a brand new user with 0 emails outputs valid JSON without 500 crashes.

### Tier 3: Cross-Feature Combinations (10 tests)
Verifies multi-feature interactions and state synergies:
- `T3.1`: Dark Theme + High Contrast Mode (verifies `.dark` and `.high-contrast` coexistence and accessibility contrast).
- `T3.2`: 24-Hour Format + Timezone Shift + Email Date Preview (verifies UTC midnight rollover into local date and `HH:mm` format).
- `T3.3`: Master Notifications OFF + Test Sound Click (master toggle mutes background notifications, but interactive Test Sound button still functions).
- `T3.4`: Search Scope `exclude_deleted_junk` + `includeDeleted: true` (explicit exclusion scope strictly overrides includeDeleted toggle).
- `T3.5`: Shortcut Profile `gmail` + High Contrast + Input Focus (typing `c` inside search input types letter without compose action; outside input triggers compose).
- `T3.6`: Density `compact` + Font Scale `extralarge` (spacing tokens and font scale tokens applied simultaneously without layout collision).
- `T3.7`: Language `en-GB` + Date Format `DD/MM/YYYY` + Timezone `Europe/London` (full internationalization profile synchronization).
- `T3.8`: External Images `ask` + Theme `dark` (image placeholder banner styling in dark mode).
- `T3.9`: Clear Search History + Query Logging Disabled (`searchHistoryEnabled: false`) (purges history; subsequent searches do not re-populate `search_history`).
- `T3.10`: Multi-Slice Atomic PUT (updating `appearance`, `accessibility`, and `privacyData` in a single PUT request).

### Tier 4: Real-World Application Scenarios (5 tests)
Simulates end-to-end user workflows:
- `T4.1`: **Scenario 1 - Fresh User Onboarding & Personalization**: Register -> GET default settings -> Customize language/date/time/timezone -> Save -> Verify persistence -> Verify email date formatting.
- `T4.2`: **Scenario 2 - Accessibility & Ergonomics Setup for Low-Vision User**: Enable high contrast + extra large font + reduce motion + Gmail shortcuts -> Verify DOM body classes -> Test compose shortcut -> Intercept empty subject -> Confirm send with valid subject.
- `T4.3`: **Scenario 3 - Privacy Audit, Query Purge, and Account Data Export (GDPR Compliance)**: Perform searches -> Confirm logs saved -> Call DELETE history -> Confirm database purged -> Toggle off history logging -> Call GET export-data attachment -> Validate exported JSON structure.
- `T4.4`: **Scenario 4 - Focused Executive Search Workflow Across Mailbox Folders**: Populate emails across 5 folders -> Configure scope to `exclude_deleted_junk` -> Search common term -> Verify deleted/junk items excluded -> Change scope to `current` folder -> Verify single-folder constraint.
- `T4.5`: **Scenario 5 - Multi-Tab Dirty State Tracking, Selective Save, and Discard Cycle**: Edit Appearance -> `isDirty` triggers -> Edit Language/Time -> Discard Language/Time changes -> Save Appearance changes -> Verify database deep-merged cleanly and `isDirty` cleared.

---

## 3. Feature Checklist & Test ID Mapping

| Feature # | Feature Name | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Scenario) | Milestone |
|---|---|---|---|---|---|---|
| 1 | 6-Item Submenu | `T1.1.1` | `T2.1.3` | `T3.10` | `T4.5` | M1 |
| 2 | Blue Left Indicator | `T1.1.2` | — | — | — | M1 |
| 3 | Layout Tab Relocation | `T1.1.3` | — | — | — | M1 |
| 4 | Unified General Settings Schema | `T1.1.4` | `T2.1.4` | `T3.10` | `T4.1` | M1 |
| 5 | GET /api/settings/general | `T1.1.5` | `T2.1.1` | `T3.10` | `T4.1` | M1 |
| 6 | PUT /api/settings/general | `T1.1.6` | `T2.1.2`, `T2.1.4` | `T3.10` | `T4.1`, `T4.5` | M1 |
| 7 | Language Selection | `T1.2.1` | — | `T3.7` | `T4.1` | M2 |
| 8 | Date Format Selector | `T1.2.2` | `T2.2.4` | `T3.7` | `T4.1` | M2 |
| 9 | Time Format Selector | `T1.2.3` | — | `T3.2` | `T4.1` | M2 |
| 10 | Timezone Display & Inline Change | `T1.2.4` | `T2.2.5` | `T3.2`, `T3.7` | `T4.1` | M2 |
| 11 | Timezone Selector Modal | `T1.2.4` | `T2.2.5` | — | `T4.1` | M2 |
| 12 | Save / Discard Bar | `T1.2.7` | — | — | `T4.5` | M2 |
| 13 | Date Formatting Engine | `T1.2.5`, `T1.2.6` | `T2.2.1` - `T2.2.4`| `T3.2`, `T3.7` | `T4.1` | M2 |
| 14 | Theme Radio Cards | `T1.3.1` | `T2.3.1`, `T2.3.4`| `T3.1`, `T3.8` | `T4.5` | M3 |
| 15 | System Theme Listener | `T1.3.2` | — | — | — | M3 |
| 16 | Accent Color Swatches | `T1.3.3`, `T1.3.4` | `T2.3.2` | `T3.1` | `T4.5` | M3 |
| 17 | Display Density Mode | `T1.3.5` | `T2.3.3` | `T3.6` | — | M3 |
| 18 | Master Notification Toggle | `T1.4.1` | `T2.4.1` | `T3.3` | — | M4 |
| 19 | New Mail Notification | `T1.4.2` | `T2.4.1` | `T3.3` | — | M4 |
| 20 | Desktop Notification Style | `T1.4.3` | `T2.4.5` | — | — | M4 |
| 21 | Sound Toggle & Tone Selector | `T1.4.4` | `T2.4.3` | `T3.3` | — | M4 |
| 22 | Test Sound Button | `T1.4.5` | `T2.4.2` | `T3.3` | — | M4 |
| 23 | Task & Mentions Toggle | `T1.4.6` | — | — | — | M4 |
| 24 | HTML5 Permission Manager | `T1.4.7` | `T2.4.5` | — | — | M4 |
| 25 | Keyboard Shortcut Profiles | `T1.5.1` | `T2.5.1` | `T3.5` | `T4.2` | M5 |
| 26 | Global Keydown Dispatcher | `T1.5.2`, `T1.5.3` | `T2.5.4` | `T3.5` | `T4.2` | M5 |
| 27 | High Contrast Mode | `T1.5.4` | — | `T3.1`, `T3.5` | `T4.2` | M5 |
| 28 | Font Scale Selector | `T1.5.5` | `T2.5.5` | `T3.6` | `T4.2` | M5 |
| 29 | Reduce Motion Toggle | `T1.5.6` | — | — | `T4.2` | M5 |
| 30 | Empty Subject Confirmation | `T1.5.7` | `T2.5.2`, `T2.5.3`| — | `T4.2` | M5 |
| 31 | External Images Handling | `T1.6.1` | — | `T3.8` | — | M6 |
| 32 | Read Receipts Toggle | `T1.6.2` | — | — | — | M6 |
| 33 | Search History Toggle | `T1.6.3` | — | `T3.9` | `T4.3` | M6 |
| 34 | Clear Search History Button | `T1.6.4` | `T2.6.1`, `T2.6.2`| `T3.9` | `T4.3` | M6 |
| 35 | Export Search History Button | `T1.6.4` | `T2.6.1` | — | `T4.3` | M6 |
| 36 | Download Account Data Button | `T1.6.5` | `T2.6.3`, `T2.6.4`| — | `T4.3` | M6 |
| 37 | DELETE /api/settings/search-history | `T1.6.4` | `T2.6.1`, `T2.6.2`| `T3.9` | `T4.3` | M6 |
| 38 | GET /api/settings/export-data | `T1.6.5` | `T2.6.3`, `T2.6.4`| — | `T4.3` | M6 |
| 39 | Folder Scope Selection | `T1.7.1` | `T2.7.4` | `T3.4` | `T4.4` | M7 |
| 40 | Include Deleted Items Toggle | `T1.7.2` | — | `T3.4` | `T4.4` | M7 |
| 41 | Search Suggestions Toggle | `T1.7.3` | — | — | — | M7 |
| 42 | Search Page Size Limit | `T1.7.4` | `T2.7.3` | — | `T4.4` | M7 |
| 43 | Search Query Engine | `T1.7.5`, `T1.7.6` | `T2.7.1` - `T2.7.5`| `T3.4`, `T3.9` | `T4.4` | M7 |

---

## 4. Runner Invocation & CLI Reference

### Running the Full Test Suite
```bash
# Using standalone test runner in root:
node test-general-settings.js

# Or invoking the test file directly:
node tests/e2e-general-settings.test.js
```

### Command Line Flags & Options
- `--tier <1|2|3|4>`: Run only tests from a specific tier (e.g. `node test-general-settings.js --tier 1`).
- `--slice <name>`: Filter by slice (`languageTime`, `appearance`, `notifications`, `accessibility`, `privacyData`, `search`).
- `--milestone <M1|M2|...|M7>`: Run only tests mapped to a given milestone.
- `--bail`: Stop test execution immediately upon encountering the first failure.
- `--port <number>`: Specify custom port for test target server (default: `3000`).
- `--json`: Output test results in structured JSON format for CI reporting.

### Environment Variables
- `TEST_BASE_URL`: Base URL of the Safemailz server (default: `http://localhost:3000`).
- `TEST_USER_ID`: Test user ID for API authentication headers (default: `1`).
- `TEST_ORG_ID`: Test organization ID for API headers (default: `1`).

---

## 5. Coverage & Quality Thresholds

| Milestone | Target Feature Slices | Min Pass Rate | Acceptance Sign-Off |
|---|---|---|---|
| M1 | Submenu Navigation & Architecture (Features 1-6) | 100% on M1 tests | M1 subagent & Orchestrator |
| M2 | Language & Time Panel & Date Engine (Features 7-13) | 100% on M2 tests | M2 subagent & Orchestrator |
| M3 | Appearance Panel & Dynamic Theme (Features 14-17) | 100% on M3 tests | M3 subagent & Orchestrator |
| M4 | Notifications Panel & Audio Chime (Features 18-24) | 100% on M4 tests | M4 subagent & Orchestrator |
| M5 | Accessibility Panel & Shortcuts (Features 25-30) | 100% on M5 tests | M5 subagent & Orchestrator |
| M6 | Privacy and Data & Endpoints (Features 31-38) | 100% on M6 tests | M6 subagent & Orchestrator |
| M7 | Search Panel & Query Engine (Features 39-43) | 100% on M7 tests | M7 subagent & Orchestrator |
| M8 (Final) | Complete 4-Tier Suite (All 93 tests) | 100% (93/93 pass) | Quality Assurance Sign-Off |

---

## 6. Execution Lifecycle & Self-Healing Harness

1. **Auto-Server Detection**:
   - The test runner attempts to connect to `http://localhost:3000/api/status`.
   - If a live server is active, tests execute against the live HTTP instance.
   - If no server is running, the runner spins up an ephemeral Express instance on an available random port, mounts the application routes, runs the suite, and cleanly tears down upon completion.
2. **Database State Isolation**:
   - Tests execute with isolated user IDs (`TEST_USER_ID = 9999` or test user `1`).
   - SQLite queries verify schema definitions and table constraints directly.
   - Created test records are safely rolled back or cleaned up post-test run.
3. **Browser Simulation via JSDOM**:
   - Client DOM reactivity tests simulate `window`, `document`, `localStorage`, `matchMedia`, and `AudioContext` using `jsdom`.
   - Ensures visual theme classes (`.dark`), high contrast (`.high-contrast`), and density custom properties can be tested deterministically in headless Node.js environments.
