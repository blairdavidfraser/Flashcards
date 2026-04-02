//=============================================================================
// CardTests.js
//
//=============================================================================
import { Card } from './Card.js';

describe('Card', function () {

    // Construction
    describe('constructor', function () {

        it('should initialize properties from data', function () {
            const data = {
                front: '  Front text  ',
                back: '  Back text  ',
                emoji: '  😀  ',
                category: '  test category  ',
                added: 123456789,
                lastSeen: 987654321,
                seen: 5,
                penalty: 2,
                level: 1,
                comment: '  Test comment  '
            };
            const c = new Card(data);
            assert.equal(c.type, 'Card');
            assert.equal(c.front, 'Front text');
            assert.equal(c.back, 'Back text');
            assert.equal(c.emoji, '😀');
            assert.equal(c.category, 'test category');
            assert.equal(c.added, 123456789);
            assert.equal(c.lastSeen, 987654321);
            assert.equal(c.seen, 5);
            assert.equal(c.totalFailure, 10);
            assert.equal(c.penalty, 2);
            assert.equal(c.level, 1);
        });

        it('should set defaults for optional properties', function () {
            const data = { front: 'a', back: 'b' };
            const c = new Card(data);
            assert.equal(c.emoji, '');
            assert.equal(c.category, 'uncategorized');
            assert.isAtLeast(c.added, Date.now() - 1000);
            assert.isNull(c.lastSeen);
            assert.equal(c.seen, 0);
            assert.equal(c.totalFailure, 0);
            assert.equal(c.penalty, 0);
            assert.equal(c.level, 0);
            assert.equal(c.comment, '');
        });

        it('should trim optional fields', function () {
            const c = new Card({
                front: 'a',
                back: 'b',
                emoji: ' 😀 ',
                category: ' test ',
                comment: ' note '
            });

            assert.equal(c.emoji, '😀');
            assert.equal(c.category, 'test');
            assert.equal(c.comment, 'note');
        });

        it('should preserve provided numeric fields', function () {
            const c = new Card({
                front: 'a',
                back: 'b',
                seen: 5,
                penalty: 4,
                level: 3,
                added: 123
            });

            assert.equal(c.seen, 5);
            assert.equal(c.totalFailure, 20);
            assert.equal(c.penalty, 4);
            assert.equal(c.level, 3);
            assert.equal(c.added, 123);
        });
    });

    // Card.validate()
    describe('validate()', function () {

        it('should return true for valid card', function () {
            const c = new Card({ front: 'a', back: 'b' });
            assert.isTrue(c.validate());
        });

        it('should return false for empty front', function () {
            const c = new Card({ front: '   ', back: 'b' });
            assert.isFalse(c.validate());
        });

        it('should return false for empty back', function () {
            const c = new Card({ front: 'a', back: '   ' });
            assert.isFalse(c.validate());
        });
    });

    // Card.rate()
    describe('rate()', function () {

        it('should increment seen', function () {
            const c = new Card({ front: 'a', back: 'b' });
            c.rate(2, 1);
            assert.equal(c.seen, 1);
        });

        it('should update lastSeen to current time', function () {
            const c = new Card({ front: 'a', back: 'b' });
            c.rate(2, 1);
            assert.equal(c.lastSeen, Date.now());
        });

        it('should update level if in bounds', function () {
            const c = new Card({ front: 'a', back: 'b' });
            c.rate(2, -1);
            assert.equal(c.level, -1);
        });

        it('should update level to 1 if input is greater than 1', function () {
            const c = new Card({ front: 'a', back: 'b' });
            c.rate(2, 4);
            assert.equal(c.level, 1);
        });

        it('should update level to -1 if input is less than -1', function () {
            const c = new Card({ front: 'a', back: 'b' });
            c.rate(2, -5);
            assert.equal(c.level, -1);
        });

        it('should adjust penalty based on difficulty', function () {
            const c = new Card({ front: 'a', back: 'b', penalty: 0 });
            c.rate(3, 0); // failure = 3-1=2, totalFailure=2, penalty=2/1=2
            assert.equal(c.totalFailure, 2);
            assert.equal(c.penalty, 2);
        });
    });

    describe('matches()', function () {

        it('should match normal always when level >= 0', function () {
            const c = new Card({ front: 'a', back: 'b', level: 0 });
            assert.isTrue(c.matches('normal'));
        });

        it('should match rank is new when seen < 3', function () {
            const c = new Card({ front: 'a', back: 'b', seen: 2 });
            assert.isTrue(c.matches('new'));
        });

        it('should match rank is new when recent (even if seen plenty)', function () {
            const time = Date.now() - (86400000 * 2);
            const c = new Card({ front: 'a', back: 'b', seen: 10, added: time });
            assert.isTrue(c.matches('new'));
        });

        it('should match rank is new when seen little (even if old)', function () {
            const time = Date.now() - (86400000 * 10);
            const c = new Card({ front: 'a', back: 'b', seen: 1, added: time });
            assert.isTrue(c.matches('new'));
        });

        it('should not match rank is new when old and seen plenty', function () {
            const time = Date.now() - (86400000 * 10);
            const c = new Card({ front: 'a', back: 'b', seen: 10, added: time });
            assert.isFalse(c.matches('new'));
        });

        it('should match rank is hard when level >= 1', function () {
            const c = new Card({ front: 'a', back: 'b', level: 1 });
            assert.isTrue(c.matches('hard'));
        });

        it('should match rank is review when level === -1', function () {
            const c = new Card({ front: 'a', back: 'b', level: -1 });
            assert.isTrue(c.matches('review'));
        });

        it('should return false if rank is invalid', function () {
            const c = new Card({ front: 'a', back: 'b', level: 0 });
            assert.isFalse(c.matches('unknown'));
        });

    });
});
