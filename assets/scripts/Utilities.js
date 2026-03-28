

export function parseDate(d) {
    if (!d) return Date.now()
    return new Date(d).getTime()
}

export function formatDate(epoch) {
    if (!epoch) return ""
    return new Date(epoch).toISOString().slice(0, 10)
}