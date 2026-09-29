/**
 * Safemailz Date Formatting Utilities
 * Exact replication of dashboard.html date formatting functions
 */

export function formatMailPreviewDate(dateStr) {
    if (!dateStr) return '';
    try {
        const safeDateStr = (typeof dateStr === 'string' && !dateStr.includes('T') && /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(dateStr))
            ? dateStr.replace(' ', 'T') + 'Z'
            : dateStr;
        const d = new Date(safeDateStr);
        if (isNaN(d.getTime())) return dateStr;

        const now = new Date();
        const isToday = d.getDate() === now.getDate() && 
                        d.getMonth() === now.getMonth() && 
                        d.getFullYear() === now.getFullYear();

        if (isToday) {
            let hours = d.getHours();
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // 0 hour becomes 12
            return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
        } else {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayName = days[d.getDay()];
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            return `${dayName} ${dd}-${mm}`;
        }
    } catch (e) {
        return dateStr;
    }
}

export function formatMailReadingDate(dateStr) {
    if (!dateStr) return '';
    try {
        const safeDateStr = (typeof dateStr === 'string' && !dateStr.includes('T') && /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(dateStr))
            ? dateStr.replace(' ', 'T') + 'Z'
            : dateStr;
        const d = new Date(safeDateStr);
        if (isNaN(d.getTime())) return dateStr;
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayName = days[d.getDay()];
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${dayName} ${dd}-${mm}-${yyyy} ${hh}:${min}`;
    } catch (e) {
        return dateStr;
    }
}
