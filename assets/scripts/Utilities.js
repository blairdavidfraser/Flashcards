export function parseDate(d) {
    if (!d) return null;
    if (typeof d === 'number') return d;
    // ISO date-only strings (YYYY-MM-DD) must be parsed as local midnight,
    // not UTC midnight, to prevent a one-day shift on every save cycle for
    // users in UTC-offset timezones.
    const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
    return new Date(d).getTime();
}

export function formatDate(epoch) {
    if (!epoch) return "";
    const d = new Date(epoch);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
