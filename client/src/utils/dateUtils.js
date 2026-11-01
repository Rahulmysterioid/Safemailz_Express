/**
 * Safemailz Central Date & Time Formatting Engine
 * 
 * Provides Outlook-style date and time formatting per user General Settings.
 * Supports:
 *   - Date formats: 'M/D/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'MMM D, YYYY'
 *   - Time formats: '12h', '24h'
 *   - Timezones: Standard IANA strings (e.g. 'Asia/Kolkata', 'UTC', 'America/New_York')
 *   - Modes: 'preview', 'reading', 'full', 'dateOnly', 'timeOnly'
 *   - Normalization of legacy SQLite space-separated timestamps
 *   - Graceful error resilience for null, undefined, invalid dates, and invalid timezones
 */

export const SUPPORTED_DATE_FORMATS = ['M/D/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'MMM D, YYYY'];
export const SUPPORTED_TIME_FORMATS = ['12h', '24h'];
export const DEFAULT_LANGUAGE_TIME = {
    language: 'en-US',
    dateFormat: 'M/D/YYYY',
    timeFormat: '12h',
    timeZone: 'Asia/Kolkata'
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let customSettingsGetter = null;

/**
 * Register an external settings getter function (e.g. from GeneralSettingsContext).
 * @param {Function} getter
 */
export function registerSettingsGetter(getter) {
    customSettingsGetter = getter;
}

/**
 * Safely retrieve current general settings without crashing outside React.
 * @returns {Object}
 */
export function getGeneralSettings() {
    if (typeof customSettingsGetter === 'function') {
        try {
            const s = customSettingsGetter();
            if (s) return s;
        } catch {}
    }
    if (typeof window !== 'undefined') {
        if (typeof window.__SAFEMAILZ_GET_GENERAL_SETTINGS__ === 'function') {
            try {
                const s = window.__SAFEMAILZ_GET_GENERAL_SETTINGS__();
                if (s) return s;
            } catch {}
        }
        if (window.__SAFEMAILZ_GENERAL_SETTINGS__) {
            return window.__SAFEMAILZ_GENERAL_SETTINGS__;
        }
        try {
            const raw = window.localStorage?.getItem('safemailz_general_settings');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed) return parsed;
            }
        } catch {}
    }
    return {
        languageTime: DEFAULT_LANGUAGE_TIME
    };
}

/**
 * Validate and sanitize IANA timezone strings, falling back safely on error.
 * @param {string} tz - IANA timezone identifier
 * @returns {string} Safe IANA timezone
 */
export function getSafeTimeZone(tz) {
    if (!tz || typeof tz !== 'string') return 'UTC';
    try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return tz;
    } catch {
        return 'UTC';
    }
}

/**
 * Normalize and parse arbitrary date inputs.
 * Normalizes legacy SQLite space-separated timestamps ('2026-10-20 14:00:00' -> '2026-10-20T14:00:00Z').
 *
 * @param {any} dateInput
 * @returns {Date | null | 'INVALID'}
 */
function parseInputDate(dateInput) {
    if (dateInput === null || dateInput === undefined || dateInput === '') return null;
    if (dateInput instanceof Date) {
        return isNaN(dateInput.getTime()) ? 'INVALID' : dateInput;
    }
    if (typeof dateInput === 'number') {
        const d = new Date(dateInput);
        return isNaN(d.getTime()) ? 'INVALID' : d;
    }
    if (typeof dateInput === 'string') {
        const trimmed = dateInput.trim();
        if (!trimmed) return null;
        let safeStr = trimmed;
        // String-encoded numeric epoch ms (e.g. "1776693600000")
        if (/^\d{10,15}$/.test(safeStr)) {
            const num = Number(safeStr);
            if (!isNaN(num)) return new Date(num);
        }
        // Normalize SQLite "YYYY-MM-DD HH:MM:SS" or ISO without T
        if (!safeStr.includes('T') && /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(safeStr)) {
            const hasOffset = /[+-]\d{2}(?::?\d{2})?$/.test(safeStr) || safeStr.endsWith('Z');
            safeStr = safeStr.replace(' ', 'T') + (hasOffset ? '' : 'Z');
        } else if (safeStr.includes('T') && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(safeStr)) {
            const hasOffset = /[+-]\d{2}(?::?\d{2})?$/.test(safeStr) || safeStr.endsWith('Z');
            if (!hasOffset) safeStr += 'Z';
        }
        const d = new Date(safeStr);
        if (isNaN(d.getTime())) return 'INVALID';
        return d;
    }
    return 'INVALID';
}

/**
 * Extract date and time parts in the specified target timezone using Intl.DateTimeFormat.
 * @param {Date} d
 * @param {string} timeZone
 * @returns {Object}
 */
function getDatePartsInZone(d, timeZone) {
    const safeTz = getSafeTimeZone(timeZone);
    const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: safeTz,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    const parts = {};
    for (const { type, value } of dtf.formatToParts(d)) {
        parts[type] = value;
    }
    return parts;
}

/**
 * Format date parts into the target date format string.
 * @param {Object} parts
 * @param {string} dateFormat
 * @returns {string}
 */
function formatCustomDate(parts, dateFormat) {
    const year = parts.year;
    const monthNum = parseInt(parts.month, 10);
    const dayNum = parseInt(parts.day, 10);
    const mm = String(monthNum).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    const monthShort = MONTH_NAMES[monthNum - 1] || mm;

    switch (dateFormat) {
        case 'DD/MM/YYYY':
            return `${dd}/${mm}/${year}`;
        case 'YYYY-MM-DD':
            return `${year}-${mm}-${dd}`;
        case 'MMM D, YYYY':
            return `${monthShort} ${dayNum}, ${year}`;
        case 'M/D/YYYY':
        default:
            return `${monthNum}/${dayNum}/${year}`;
    }
}

/**
 * Format time parts into 12-hour or 24-hour time string.
 * @param {Object} parts
 * @param {'12h' | '24h'} timeFormat
 * @returns {string}
 */
function formatCustomTime(parts, timeFormat) {
    let h24 = parseInt(parts.hour, 10);
    if (h24 === 24) h24 = 0;
    const mm = parts.minute.padStart(2, '0');

    if (timeFormat === '24h') {
        return `${String(h24).padStart(2, '0')}:${mm}`;
    } else {
        const h12 = h24 % 12 || 12;
        const ampm = h24 >= 12 ? 'PM' : 'AM';
        return `${h12}:${mm} ${ampm}`;
    }
}

/**
 * Formats a date string, timestamp, or Date object per user General Settings.
 *
 * @param {string | number | Date | null | undefined} dateInput - ISO string, SQLite timestamp, or Date
 * @param {Object} [options={}]
 * @param {'preview' | 'reading' | 'full' | 'dateOnly' | 'timeOnly'} [options.mode='preview']
 * @param {'M/D/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MMM D, YYYY'} [options.format]
 * @param {'M/D/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MMM D, YYYY'} [options.dateFormat]
 * @param {'12h' | '24h'} [options.timeFormat]
 * @param {string} [options.timeZone]
 * @param {string} [options.language]
 * @param {Object} [options.settings]
 * @returns {string} Formatted date/time string
 */
export function formatEmailDate(dateInput, options = {}) {
    const parsed = parseInputDate(dateInput);
    if (parsed === null) return '';
    if (parsed === 'INVALID') {
        return typeof dateInput === 'string' ? dateInput : '-';
    }

    const opt = (options && typeof options === 'object') ? options : {};

    // Resolve settings dynamically
    const dynamicSettings = getGeneralSettings()?.languageTime || {};
    const nestedSettings = opt.settings || {};

    const dateFormat = opt.format || opt.dateFormat || nestedSettings.dateFormat || dynamicSettings.dateFormat || 'M/D/YYYY';
    const timeFormat = opt.timeFormat || nestedSettings.timeFormat || dynamicSettings.timeFormat || '12h';
    const timeZone = opt.timeZone || nestedSettings.timeZone || dynamicSettings.timeZone || 'Asia/Kolkata';
    const mode = opt.mode || 'preview';

    const parts = getDatePartsInZone(parsed, timeZone);
    const formattedDate = formatCustomDate(parts, dateFormat);
    const formattedTime = formatCustomTime(parts, timeFormat);
    const weekday = parts.weekday;

    // Direct Single-Mode Returns
    if (mode === 'dateOnly') return formattedDate;
    if (mode === 'timeOnly') return formattedTime;
    if (mode === 'reading' || mode === 'full') {
        return `${weekday} ${formattedDate} ${formattedTime}`;
    }

    // Default 'preview' mode logic:
    // 1. If today in target timezone -> return formatted time
    const nowParts = getDatePartsInZone(new Date(), timeZone);
    const isToday = (parts.year === nowParts.year && parts.month === nowParts.month && parts.day === nowParts.day);
    if (isToday) {
        return formattedTime;
    }

    // 2. If this year in target timezone -> return weekday + short date
    const isThisYear = (parts.year === nowParts.year);
    if (isThisYear) {
        const monthNum = parseInt(parts.month, 10);
        const dayNum = parseInt(parts.day, 10);
        const mm = String(monthNum).padStart(2, '0');
        const dd = String(dayNum).padStart(2, '0');
        const monthShort = MONTH_NAMES[monthNum - 1] || mm;

        let shortDate = `${monthNum}/${dayNum}`;
        if (dateFormat === 'DD/MM/YYYY') shortDate = `${dd}/${mm}`;
        else if (dateFormat === 'YYYY-MM-DD') shortDate = `${mm}-${dd}`;
        else if (dateFormat === 'MMM D, YYYY') shortDate = `${monthShort} ${dayNum}`;
        return `${weekday} ${shortDate}`;
    }

    // 3. Different / prior year -> return full date
    return formattedDate;
}

/**
 * Format mail preview timestamp (e.g. for mail list rows).
 * Delegates to formatEmailDate in 'preview' mode.
 *
 * @param {string | number | Date} dateStr
 * @param {Object} [options={}]
 * @returns {string}
 */
export function formatMailPreviewDate(dateStr, options = {}) {
    return formatEmailDate(dateStr, { mode: 'preview', ...options });
}

/**
 * Format mail reading pane timestamp (e.g. for message headers).
 * Delegates to formatEmailDate in 'reading' mode.
 *
 * @param {string | number | Date} dateStr
 * @param {Object} [options={}]
 * @returns {string}
 */
export function formatMailReadingDate(dateStr, options = {}) {
    return formatEmailDate(dateStr, { mode: 'reading', ...options });
}
