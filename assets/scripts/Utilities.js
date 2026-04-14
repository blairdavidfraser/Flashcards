export function parseDate(d) {
    if (!d) return Date.now();
    return new Date(d).getTime();
}

export function formatDate(epoch) {
    if (!epoch) return "";
    const d = new Date(epoch);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
