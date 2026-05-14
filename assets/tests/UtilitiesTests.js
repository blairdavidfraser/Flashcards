//=============================================================================
// UtilitiesTests.js
//
//=============================================================================
import { parseDate, formatDate } from '../scripts/Utilities.js';

describe('Utilities', function () {

    // =========================================================================
    describe('parseDate()', function () {

        it('returns null for null', function () {
            assert.isNull(parseDate(null));
        });

        it('returns null for undefined', function () {
            assert.isNull(parseDate(undefined));
        });

        it('returns null for empty string', function () {
            assert.isNull(parseDate(''));
        });

        it('returns null for 0 (falsy)', function () {
            assert.isNull(parseDate(0));
        });

        it('parses an ISO date string as local midnight (stable round-trip)', function () {
            const result = parseDate('2026-01-01');
            assert.equal(result, new Date(2026, 0, 1).getTime()); // local midnight
            assert.equal(formatDate(result), '2026-01-01');        // round-trips cleanly
        });

        it('round-trips an existing epoch number unchanged', function () {
            const epoch = new Date('2025-06-15T12:00:00Z').getTime();
            assert.equal(parseDate(epoch), epoch);
        });

    });

    // =========================================================================
    describe('formatDate()', function () {

        it('returns an empty string for null', function () {
            assert.equal(formatDate(null), '');
        });

        it('returns an empty string for 0 (falsy)', function () {
            assert.equal(formatDate(0), '');
        });

        it('returns an empty string for undefined', function () {
            assert.equal(formatDate(undefined), '');
        });

        it('formats an epoch to its local date string', function () {
            // Construct epoch at local noon to avoid any DST or midnight ambiguity
            const epoch = new Date(2026, 2, 15, 12, 0, 0).getTime(); // local Mar 15 2026
            assert.equal(formatDate(epoch), '2026-03-15');
        });

        it('returns a string in YYYY-MM-DD format', function () {
            const epoch = new Date(2025, 10, 1, 12, 0, 0).getTime(); // local Nov 1 2025
            assert.match(formatDate(epoch), /^\d{4}-\d{2}-\d{2}$/);
        });

    });

});
