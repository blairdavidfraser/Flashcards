//=============================================================================
// UtilitiesTests.js
//
//=============================================================================
import { parseDate, formatDate } from '../scripts/Utilities.js';

describe('Utilities', function () {

    // =========================================================================
    describe('parseDate()', function () {

        it('returns a number close to Date.now() for null', function () {
            const before = Date.now();
            const result = parseDate(null);
            const after = Date.now();
            assert.isNumber(result);
            assert.isAtLeast(result, before);
            assert.isAtMost(result, after);
        });

        it('returns a number close to Date.now() for undefined', function () {
            const before = Date.now();
            const result = parseDate(undefined);
            const after = Date.now();
            assert.isAtLeast(result, before);
            assert.isAtMost(result, after);
        });

        it('returns a number close to Date.now() for 0 (falsy)', function () {
            const before = Date.now();
            const result = parseDate(0);
            const after = Date.now();
            assert.isAtLeast(result, before);
            assert.isAtMost(result, after);
        });

        it('parses an ISO date string to a UTC epoch number', function () {
            const result = parseDate('2026-01-01');
            assert.equal(result, new Date('2026-01-01').getTime());
        });

        it('round-trips an existing epoch number', function () {
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
