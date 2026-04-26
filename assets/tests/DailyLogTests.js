//=============================================================================
// DailyLogTests.js
//
//=============================================================================
import { DailyLog } from '../scripts/DailyLog.js';

// Minimal localStorage mock for Node environment
const store = {};
globalThis.localStorage = {
    getItem:    key       => store[key] ?? null,
    setItem:    (key, v)  => { store[key] = String(v); },
    removeItem: key       => { delete store[key]; },
    clear:      ()        => { Object.keys(store).forEach(k => delete store[k]); }
};

describe('DailyLog', function () {

    beforeEach(function () { localStorage.clear(); });

    // =========================================================================
    describe('record()', function () {

        it('creates a new entry on first call', function () {
            DailyLog.record('Vocabulary', 'Spanish', 'recall');
            const entries = DailyLog.recent(1);
            assert.equal(entries.length, 1);
            assert.equal(entries[0].name, 'Vocabulary');
            assert.equal(entries[0].language, 'Spanish');
            assert.equal(entries[0].direction, 'recall');
            assert.equal(entries[0].count, 1);
        });

        it('increments count on repeat call for same key', function () {
            DailyLog.record('Vocabulary', 'Spanish', 'recall');
            DailyLog.record('Vocabulary', 'Spanish', 'recall');
            DailyLog.record('Vocabulary', 'Spanish', 'recall');
            const entries = DailyLog.recent(1);
            assert.equal(entries.length, 1);
            assert.equal(entries[0].count, 3);
        });

        it('creates separate entries for different directions', function () {
            DailyLog.record('Vocabulary', 'Spanish', 'recall');
            DailyLog.record('Vocabulary', 'Spanish', 'recognition');
            const entries = DailyLog.recent(1);
            assert.equal(entries.length, 2);
        });

        it('creates separate entries for different names', function () {
            DailyLog.record('Vocabulary', 'Spanish', 'recall');
            DailyLog.record('Verbs', 'Spanish', 'recall');
            const entries = DailyLog.recent(1);
            assert.equal(entries.length, 2);
        });

        it('creates separate entries for different languages', function () {
            DailyLog.record('Vocabulary', 'Spanish', 'recall');
            DailyLog.record('Vocabulary', 'French', 'recall');
            const entries = DailyLog.recent(1);
            assert.equal(entries.length, 2);
        });

        it('stores today\'s date in YYYY-MM-DD format', function () {
            DailyLog.record('Vocabulary', 'Spanish', 'recall');
            const today = new Date().toISOString().slice(0, 10);
            assert.equal(DailyLog.recent(1)[0].date, today);
        });

    });

    // =========================================================================
    describe('recent()', function () {

        it('returns empty array when storage is empty', function () {
            assert.deepEqual(DailyLog.recent(), []);
        });

        it('returns entries within the last N days', function () {
            DailyLog.record('Vocabulary', 'Spanish', 'recall');
            assert.equal(DailyLog.recent(7).length, 1);
        });

        it('excludes entries older than N days', function () {
            // Inject an old entry directly
            const old = [{ date: '2000-01-01', name: 'Vocabulary', language: 'Spanish', direction: 'recall', count: 1 }];
            localStorage.setItem('dotlingo-daily-log', JSON.stringify(old));
            assert.equal(DailyLog.recent(14).length, 0);
        });

        it('returns newest entries first', function () {
            const today     = new Date().toISOString().slice(0, 10);
            const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            const entries = [
                { date: yesterday, name: 'V', language: 'Spanish', direction: 'recall', count: 1 },
                { date: today,     name: 'V', language: 'Spanish', direction: 'recall', count: 2 }
            ];
            localStorage.setItem('dotlingo-daily-log', JSON.stringify(entries));
            const result = DailyLog.recent(7);
            assert.equal(result[0].date, today);
            assert.equal(result[1].date, yesterday);
        });

        it('defaults to 14 days window', function () {
            const withinWindow  = new Date(Date.now() - 86400000 * 13).toISOString().slice(0, 10);
            const outsideWindow = new Date(Date.now() - 86400000 * 14).toISOString().slice(0, 10);
            const entries = [
                { date: withinWindow,  name: 'V', language: 'Spanish', direction: 'recall', count: 1 },
                { date: outsideWindow, name: 'V', language: 'Spanish', direction: 'recall', count: 1 }
            ];
            localStorage.setItem('dotlingo-daily-log', JSON.stringify(entries));
            assert.equal(DailyLog.recent().length, 1);
        });

        it('returns all matching entries across decks and directions', function () {
            DailyLog.record('Vocabulary', 'Spanish', 'recall');
            DailyLog.record('Vocabulary', 'Spanish', 'recognition');
            DailyLog.record('Verbs', 'Spanish', 'recall');
            DailyLog.record('Vocabulary', 'French', 'recall');
            assert.equal(DailyLog.recent(1).length, 4);
        });

    });

});
