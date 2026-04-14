//=============================================================================
// PersistenceTests.js
//
//=============================================================================
import { Persistence } from './Persistence.js';
import { Card } from './Card.js';
import { Comment } from './Comment.js';

describe('Persistence', function () {

    // =========================================================================
    describe('deserialize()', function () {

        it('returns an empty array for null input', function () {
            assert.deepEqual(Persistence.deserialize(null), []);
        });

        it('returns an empty array for an empty JSON array', function () {
            assert.deepEqual(Persistence.deserialize('[]'), []);
        });

        it('reconstructs Card instances from plain card data', function () {
            const raw = JSON.stringify([{ type: 'Card', front: 'hola', back: 'hello', category: 'test', seen: 0, level: 0 }]);
            const items = Persistence.deserialize(raw);
            assert.equal(items.length, 1);
            assert.instanceOf(items[0], Card);
        });

        it('reconstructs Comment instances from plain comment data', function () {
            const raw = JSON.stringify([{ type: 'Comment', value: '# header' }]);
            const items = Persistence.deserialize(raw);
            assert.equal(items.length, 1);
            assert.instanceOf(items[0], Comment);
            assert.equal(items[0].value, '# header');
        });

        it('preserves Card field values', function () {
            const raw = JSON.stringify([{
                type: 'Card', front: 'hola', back: 'hello', emoji: '👋',
                category: 'greetings', seen: 3, penalty: 1.5, level: 1, comment: 'a note'
            }]);
            const card = Persistence.deserialize(raw)[0];
            assert.equal(card.front, 'hola');
            assert.equal(card.back, 'hello');
            assert.equal(card.emoji, '👋');
            assert.equal(card.category, 'greetings');
            assert.equal(card.seen, 3);
            assert.approximately(card.penalty, 1.5, 0.0001);
            assert.equal(card.level, 1);
            assert.equal(card.comment, 'a note');
        });

        it('preserves null penalty as null, not coercing to 0', function () {
            const raw = JSON.stringify([{ type: 'Card', front: 'hola', back: 'hello', penalty: null }]);
            const card = Persistence.deserialize(raw)[0];
            assert.isNull(card.penalty);
        });

        it('preserves mixed Cards and Comments in order', function () {
            const raw = JSON.stringify([
                { type: 'Comment', value: '# section' },
                { type: 'Card', front: 'hola', back: 'hello' },
                { type: 'Comment', value: '' }
            ]);
            const items = Persistence.deserialize(raw);
            assert.equal(items.length, 3);
            assert.instanceOf(items[0], Comment);
            assert.instanceOf(items[1], Card);
            assert.instanceOf(items[2], Comment);
        });

    });

    // =========================================================================
    describe('serialize()', function () {

        it('returns a JSON string', function () {
            assert.isString(Persistence.serialize([]));
            assert.doesNotThrow(() => JSON.parse(Persistence.serialize([])));
        });

        it('serializes an empty array to "[]"', function () {
            assert.equal(Persistence.serialize([]), '[]');
        });

        it('includes Card fields in the output', function () {
            const card = new Card({ front: 'hola', back: 'hello' });
            const json = Persistence.serialize([card]);
            assert.include(json, 'hola');
            assert.include(json, 'hello');
        });

    });

    // =========================================================================
    describe('round-trip', function () {

        it('preserves Cards through serialize then deserialize', function () {
            const original = new Card({
                front: 'hola', back: 'hello', emoji: '👋', category: 'greetings',
                seen: 5, penalty: 1.75, level: 1, comment: 'a note'
            });
            const result = Persistence.deserialize(Persistence.serialize([original]))[0];
            assert.instanceOf(result, Card);
            assert.equal(result.front, original.front);
            assert.equal(result.back, original.back);
            assert.equal(result.category, original.category);
            assert.equal(result.seen, original.seen);
            assert.approximately(result.penalty, original.penalty, 0.0001);
            assert.equal(result.level, original.level);
            assert.equal(result.comment, original.comment);
        });

        it('preserves null penalty through serialize then deserialize', function () {
            const original = new Card({ front: 'hola', back: 'hello' });
            assert.isNull(original.penalty);
            const result = Persistence.deserialize(Persistence.serialize([original]))[0];
            assert.isNull(result.penalty);
        });

        it('preserves Comments through serialize then deserialize', function () {
            const original = new Comment('# Section header');
            const result = Persistence.deserialize(Persistence.serialize([original]))[0];
            assert.instanceOf(result, Comment);
            assert.equal(result.value, original.value);
        });

    });

});
