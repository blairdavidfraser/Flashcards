//=============================================================================
// DatasetTests.js
//
//=============================================================================
import { Dataset } from '../scripts/Dataset.js';
import { Card } from './Card.js';
import { Comment } from './Comment.js';
import { parseDate } from './Utilities.js';

describe('Dataset', function () {

    describe('parse()', function () {

        it('should parse a hash line as a Comment', function () {
            const items = Dataset.parse('# Section header');
            assert.equal(items.length, 1);
            assert.equal(items[0].type, 'Comment');
            assert.equal(items[0].value, '# Section header');
        });

        it('should parse an empty line as a Comment with empty value', function () {
            const items = Dataset.parse('');
            assert.equal(items.length, 1);
            assert.equal(items[0].type, 'Comment');
            assert.equal(items[0].value, '');
        });

        it('should parse a pipe-separated line as a Card with correct fields', function () {
            const items = Dataset.parse('hola | hello | 👋 | greetings | 2026-01-01 | 2026-04-01 | 5 | 1.5000 | 1 | a note');
            assert.equal(items.length, 1);
            const card = items[0];
            assert.equal(card.front, 'hola');
            assert.equal(card.back, 'hello');
            assert.equal(card.emoji, '👋');
            assert.equal(card.category, 'greetings');
            assert.equal(card.seen, 5);
            assert.approximately(card.penalty, 1.5, 0.0001);
            assert.equal(card.level, 1);
            assert.equal(card.comment, 'a note');
        });

        it('should set penalty to null when the penalty field is empty', function () {
            const items = Dataset.parse('hola | hello |  | greetings | 2026-01-01 |  | 0 |  | 0 | ');
            assert.isNull(items[0].penalty);
        });

        it('should exclude a card with an empty front', function () {
            const items = Dataset.parse(' | hello |  | greetings | 2026-01-01 |  | 0 |  | 0 | ');
            assert.equal(items.length, 0);
        });

        it('should exclude a card with an empty back', function () {
            const items = Dataset.parse('hola |  |  | greetings | 2026-01-01 |  | 0 |  | 0 | ');
            assert.equal(items.length, 0);
        });

        it('should parse mixed lines preserving order', function () {
            const text = '# header\nhola | hello |  | test | 2026-01-01 |  | 0 |  | 0 | \n# footer';
            const items = Dataset.parse(text);
            assert.equal(items.length, 3);
            assert.equal(items[0].type, 'Comment');
            assert.equal(items[1].front, 'hola');
            assert.equal(items[2].type, 'Comment');
        });

    });

    describe('serialize()', function () {

        it('should serialize a Comment to its value string', function () {
            const text = Dataset.serialize([new Comment('# Section header')]);
            assert.equal(text, '# Section header');
        });

        it('should serialize a Card with fields in the correct order', function () {
            const card = new Card({
                front: 'hola', back: 'hello', emoji: '👋', category: 'greetings',
                added: parseDate('2026-01-01'), lastSeen: parseDate('2026-04-01'),
                seen: 3, penalty: 1.5, level: 0, comment: 'a note'
            });
            const parts = Dataset.serialize([card]).split(' | ');
            assert.equal(parts[0], 'hola');
            assert.equal(parts[1], 'hello');
            assert.equal(parts[2], '👋');
            assert.equal(parts[3], 'greetings');
            assert.equal(parts[4], '2026-01-01');
            assert.equal(parts[5], '2026-04-01');
            assert.equal(parts[6], '3');
            assert.equal(parts[7], '1.5000');
            assert.equal(parts[8], '0');
            assert.equal(parts[9], 'a note');
        });

        it('should serialize a null penalty as an empty field', function () {
            const card = new Card({ front: 'hola', back: 'hello' });
            const parts = Dataset.serialize([card]).split(' | ');
            assert.equal(parts[7], '');
        });

        it('should join multiple items with newlines', function () {
            const items = [new Comment('# header'), new Card({ front: 'hola', back: 'hello' })];
            const lines = Dataset.serialize(items).split('\n');
            assert.equal(lines.length, 2);
        });

    });

    describe('round-trip', function () {

        it('should preserve Card fields through serialize then parse', function () {
            const original = new Card({
                front: 'hola', back: 'hello', emoji: '👋', category: 'greetings',
                added: parseDate('2026-01-01'), lastSeen: parseDate('2026-04-01'),
                seen: 5, penalty: 1.75, level: 1, comment: 'a note'
            });
            const parsed = Dataset.parse(Dataset.serialize([original]))[0];
            assert.equal(parsed.front, original.front);
            assert.equal(parsed.back, original.back);
            assert.equal(parsed.emoji, original.emoji);
            assert.equal(parsed.category, original.category);
            assert.equal(parsed.seen, original.seen);
            assert.approximately(parsed.penalty, original.penalty, 0.0001);
            assert.equal(parsed.level, original.level);
            assert.equal(parsed.comment, original.comment);
        });

        it('should preserve a Comment through serialize then parse', function () {
            const original = new Comment('# Section header');
            const parsed = Dataset.parse(Dataset.serialize([original]))[0];
            assert.equal(parsed.type, 'Comment');
            assert.equal(parsed.value, original.value);
        });

    });

});
