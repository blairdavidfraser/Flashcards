//=============================================================================
// DailyLog.js
//
//=============================================================================

const KEY = 'dotlingo-daily-log';

function today() {
    return new Date().toISOString().slice(0, 10);
}

function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
}

export const DailyLog = {

    record(name, language, direction) {
        const date = today();
        const entries = load();
        const entry = entries.find(e =>
            e.date === date && e.name === name &&
            e.language === language && e.direction === direction
        );
        if (entry) entry.count++;
        else entries.push({ date, name, language, direction, count: 1 });
        localStorage.setItem(KEY, JSON.stringify(entries));
    },

    // Returns entries from the last `days` days, newest first.
    recent(days = 14) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days + 1);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        return load()
            .filter(e => e.date >= cutoffStr)
            .sort((a, b) => b.date.localeCompare(a.date));
    },

};
