//=============================================================================
// DailyLog.js
//
//=============================================================================

const KEY = 'dotlingo-daily-log';
const OTHER_KEY = 'dotlingo-daily-log-other';

function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
}

function loadOther() {
    try { return JSON.parse(localStorage.getItem(OTHER_KEY)) || []; }
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

    todayCounts(name, language) {
        const date = today();
        return load()
            .filter(e => e.date === date && e.name === name && e.language === language)
            .reduce((acc, e) => {
                if (e.direction === 'recognition') acc.recognition += e.count;
                if (e.direction === 'recall')      acc.recall      += e.count;
                return acc;
            }, { recognition: 0, recall: 0 });
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

    // --- Other activities (duration + activity label per day/language) ---

    addOther(date, language, duration, activity) {
        const entries = loadOther();
        let entry = entries.find(e => e.date === date && e.language === language);
        if (!entry) {
            entry = { date, language, items: [] };
            entries.push(entry);
        }
        entry.items.push({ duration, activity });
        localStorage.setItem(OTHER_KEY, JSON.stringify(entries));
    },

    getOtherItems(date, language) {
        const entry = loadOther().find(e => e.date === date && e.language === language);
        return entry ? entry.items : [];
    },

    updateOtherItem(date, language, index, duration, activity) {
        const entries = loadOther();
        const entry = entries.find(e => e.date === date && e.language === language);
        if (entry && entry.items[index] !== undefined) {
            entry.items[index] = { duration, activity };
            localStorage.setItem(OTHER_KEY, JSON.stringify(entries));
        }
    },

    removeOtherItem(date, language, index) {
        const entries = loadOther();
        const entry = entries.find(e => e.date === date && e.language === language);
        if (entry) {
            entry.items.splice(index, 1);
            localStorage.setItem(OTHER_KEY, JSON.stringify(entries));
        }
    },

    // Returns other-activity entries for a language within the last `days` days, newest first.
    recentOther(language, days = 14) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days + 1);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        return loadOther()
            .filter(e => e.language === language && e.date >= cutoffStr)
            .sort((a, b) => b.date.localeCompare(a.date));
    },

    // Returns a full snapshot of all stored data for export.
    export() {
        return { game: load(), other: loadOther() };
    },

};
