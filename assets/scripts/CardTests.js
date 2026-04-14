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
            assert.equal(c.type, 'Card', "Type should be 'Card'");
            assert.equal(c.front, 'Front text', "Front should be trimmed");
            assert.equal(c.back, 'Back text', "Back should be trimmed");
            assert.equal(c.emoji, '😀', "Emoji should be trimmed");
            assert.equal(c.category, 'test category', "Category should be trimmed");
            assert.equal(c.added, 123456789, "Added should be set");
            assert.equal(c.lastSeen, 987654321, "LastSeen should be set");
            assert.equal(c.seen, 5, "Seen should be set");
            assert.equal(c.penalty, 2, "Penalty should be set");
            assert.equal(c.level, 1, "Level should be set");
        });

        it('should set defaults for optional properties', function () {
            const data = { front: 'a', back: 'b' };
            const c = new Card(data);
            assert.equal(c.emoji, '', "Default emoji should be empty string");
            assert.equal(c.category, 'uncategorized', "Default category should be 'uncategorized'");
            assert.isAtLeast(c.added, Date.now() - 1000, "Added should be set to current time");
            assert.isNull(c.lastSeen, "LastSeen should be null");
            assert.equal(c.seen, 0, "Seen should be set to 0");
            assert.isNull(c.penalty, "Penalty should be null by default");
            assert.equal(c.level, 0, "Level should be set to 0");
            assert.equal(c.comment, '', "Comment should be set to empty string");
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

        it('should set penalty to difficulty-1 on first rating', function () {
            const c = new Card({ front: 'a', back: 'b' });
            c.rate(3, 0); // first rating: penalty = 3-1 = 2
            assert.equal(c.penalty, 2);
        });

        it('should set penalty to 0 when first rating is easiest', function () {
            const c = new Card({ front: 'a', back: 'b' });
            c.rate(1, 0); // difficulty - 1 = 0
            assert.equal(c.penalty, 0);
        });

        it('should blend penalty via EMA on subsequent ratings', function () {
            const c = new Card({ front: 'a', back: 'b' });
            c.rate(3, 0); // first: penalty = 2
            c.rate(1, 0); // second: (0.7 * 2) + (0.3 * 0) = 1.4
            assert.approximately(c.penalty, 1.4, 0.001);
        });
    });

    describe('priority()', function () {

        it('should return 1 for a new unseen card (null penalty)', function () {
            const c = new Card({ front: 'a', back: 'b' });
            assert.equal(c.priority(), 1); // penalty defaults to 1, seen = 0
        });

        it('should decrease as seen count increases', function () {
            const c1 = new Card({ front: 'a', back: 'b', seen: 0, penalty: 2 });
            const c2 = new Card({ front: 'a', back: 'b', seen: 4, penalty: 2 });
            assert.isAbove(c1.priority(), c2.priority());
        });

        it('should scale with penalty', function () {
            const easy = new Card({ front: 'a', back: 'b', seen: 0, penalty: 1 });
            const hard = new Card({ front: 'a', back: 'b', seen: 0, penalty: 3 });
            assert.isAbove(hard.priority(), easy.priority());
        });

        it('should use penalty=1 default when penalty is null', function () {
            const c = new Card({ front: 'a', back: 'b', seen: 4 }); // priority = 1/(1+0.8) ≈ 0.556
            assert.approximately(c.priority(), 1 / 1.8, 0.001);
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

    describe('summary()', function () {

        it('should return a string', function () {
            const c = new Card({ front: 'a', back: 'b' });
            assert.isString(c.summary());
        });

        it('should include "never" for an unseen card', function () {
            const c = new Card({ front: 'a', back: 'b' });
            assert.include(c.summary(), 'never');
        });

        it('should include the level', function () {
            const c = new Card({ front: 'a', back: 'b', level: 1 });
            assert.include(c.summary(), 'level 1');
        });

        it('should include a date after being rated', function () {
            const c = new Card({ front: 'a', back: 'b' });
            c.rate(2, 0);
            const today = new Date().toISOString().slice(0, 10);
            assert.include(c.summary(), today);
        });

    });
});
