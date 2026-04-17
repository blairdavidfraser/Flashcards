import { Statistics } from '../scripts/Statistics.js';

describe('Statistics.calculate', function () {

    it('should count total cards', function () {
        const cards = [{}, {}, {}];
        const stats = Statistics.calculate(cards);
        assert.equal(stats.total, 3);
    });

    it('should count unseen cards', function () {
        const cards = [
            { seen: 0 },
            { seen: 1 },
            { seen: 0 }
        ];
        const stats = Statistics.calculate(cards);
        assert.equal(stats.unseen, 2);
    });

    it('should count today cards correctly', function () {
        const cards = [
            { seen: 1, lastSeen: new Date(2026, 6, 1) },
            { seen: 2, lastSeen: new Date(2026, 6, 1) },
            { seen: 1, lastSeen: new Date(2026, 6, 2) },
            { seen: 0, lastSeen: new Date(2026, 6, 1) } // Unseen card, should not count as today
        ];
        const stats = Statistics.calculate(cards, new Date(2026, 6, 1));
        assert.equal(stats.today, 2);
    });

    it('should compute level distribution', function () {
        const cards = [
            { level: 0 },
            { level: 1 },
            { level: 1 }
        ];
        const stats = Statistics.calculate(cards);
        assert.deepEqual(stats.levels, { 0: 1, 1: 2 });
    });

    it('should compute category distribution', function () {
        const cards = [
            { category: 'a' },
            { category: 'b' },
            { category: 'a' }
        ];
        const stats = Statistics.calculate(cards);
        assert.deepEqual(stats.categories, { a: 2, b: 1 });
    });

    it('should exclude cards with a future added date', function () {
        const now = new Date(2026, 6, 1);
        const nowMs = now.getTime();
        const cards = [
            { added: nowMs - 1000 }, // past — included
            { added: nowMs },         // exactly now — included
            { added: nowMs + 1000 }  // future — excluded
        ];
        const stats = Statistics.calculate(cards, now);
        assert.equal(stats.total, 2);
    });

    it('should handle empty input', function () {
        const stats = Statistics.calculate([]);
        assert.equal(stats.total, 0);
        assert.equal(stats.today, 0);
        assert.equal(stats.unseen, 0);
        assert.deepEqual(stats.levels, {});
        assert.deepEqual(stats.categories, {});
    });

    it('should not count a card as today if lastSeen is null', function () {
        const cards = [{ seen: 1, lastSeen: null }];
        const stats = Statistics.calculate(cards, new Date(2026, 6, 1));
        assert.equal(stats.today, 0);
    });

    it('should include negative levels in the level distribution', function () {
        const cards = [
            { level: -1 },
            { level: -1 },
            { level: 0 }
        ];
        const stats = Statistics.calculate(cards);
        assert.deepEqual(stats.levels, { '-1': 2, 0: 1 });
    });
});

describe('Statistics.render', function () {

    it('should render basic stats', function () {
        const stats = {
            total: 10,
            unseen: 3,
            today: 5,
            levels: {},
            categories: {}
        };
        const html = Statistics.render(stats);
        assert.include(html, 'Current Cards:</strong> 10');
        assert.include(html, 'Never Seen:</strong> 3');
        assert.include(html, 'Today:</strong> 5');
    });

    it('should render levels sorted numerically', function () {
        const stats = {
            total: 0,
            unseen: 0,
            today: 0,
            levels: { 10: 1, 2: 1, 1: 1 },
            categories: {}
        };
        const html = Statistics.render(stats);
        const order = [
            html.indexOf('Level 1'),
            html.indexOf('Level 2'),
            html.indexOf('Level 10')
        ];
        assert.isTrue(order[0] < order[1] && order[1] < order[2]);
    });

    it('should render categories alphabetically', function () {
        const stats = {
            total: 0,
            unseen: 0,
            today: 0,
            levels: {},
            categories: { banana: 1, apple: 1 }
        };
        const html = Statistics.render(stats);
        const order = [
            html.indexOf('apple'),
            html.indexOf('banana')
        ];
        assert.isTrue(order[0] < order[1]);
    });

    it('should render level counts correctly', function () {
        const stats = { total: 3, unseen: 0, today: 0, levels: { 0: 2, 1: 1 }, categories: {} };
        const html = Statistics.render(stats);
        assert.include(html, 'Level 0:</strong> 2');
        assert.include(html, 'Level 1:</strong> 1');
    });

    it('should render category counts correctly', function () {
        const stats = { total: 3, unseen: 0, today: 0, levels: {}, categories: { greetings: 3 } };
        const html = Statistics.render(stats);
        assert.include(html, 'greetings:</strong> 3');
    });

    it('should render negative levels correctly', function () {
        const stats = { total: 2, unseen: 0, today: 0, levels: { '-1': 2 }, categories: {} };
        const html = Statistics.render(stats);
        assert.include(html, 'Level -1:</strong> 2');
    });

});