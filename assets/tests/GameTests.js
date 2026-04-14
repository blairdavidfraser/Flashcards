//=============================================================================
// GameTests.js
//
//=============================================================================
import { Card } from "../scripts/Card.js"
import { Game } from "../scripts/Game.js"

describe('Game', function () {

    let originalRandom;
    before(function () { originalRandom = Math.random; });
    after(function () { Math.random = originalRandom; });

    function makeCard(overrides = {}) {
        return new Card({
            front: 'hola', back: 'hello', emoji: '👋',
            category: 'test', level: 0, seen: 0,
            comment: 'a note', ...overrides
        });
    }

    function freshGame() {
        const g = new Game('Test', 'Spanish');
        g.direction = 'recall';
        return g;
    }

    // =========================================================================
    describe('constructor', function () {

        it('defaults direction to recall', function () {
            assert.equal(new Game().direction, 'recall');
        });

        it('defaults rank to normal', function () {
            assert.equal(new Game().rank, 'normal');
        });

        it('initializes state.card to null', function () {
            assert.isNull(new Game().state.card);
        });

        it('defaults sound.foreign to true and sound.native to false', function () {
            const g = new Game();
            assert.isTrue(g.configuration.sound.foreign);
            assert.isFalse(g.configuration.sound.native);
        });

        it('initializes categories as an empty Set', function () {
            assert.equal(new Game().configuration.categories.size, 0);
        });

    });

    // =========================================================================
    describe('dataset setter', function () {

        it('stores items accessible via getter', function () {
            const g = freshGame();
            const cards = [makeCard()];
            g.dataset = cards;
            assert.strictEqual(g.dataset, cards);
        });

        it('excludes Comments from the playable deck', function () {
            const g = freshGame();
            g.dataset = [{ type: 'Comment', value: '# header' }, makeCard()];
            g.draw();
            assert.equal(g.state.card.front, 'hola');
        });

        it('resets the enabled list so a rank change takes effect', function () {
            // rank='hard' with only a level=0 card → fallback drawn
            const g = freshGame();
            g.rank = 'hard';
            g.dataset = [makeCard({ level: 0 })];
            g.draw();
            assert.include(g.state.card.front, 'Please');

            // reassigning dataset resets #enabled; switching rank now works
            g.rank = 'normal';
            g.dataset = [makeCard({ level: 0 })];
            g.draw();
            assert.equal(g.state.card.front, 'hola');
        });

    });

    // =========================================================================
    describe('draw() — recall', function () {

        let g;
        beforeEach(function () {
            g = freshGame();
            g.dataset = [makeCard()];
            g.direction = 'recall';
            g.draw();
        });

        it('sets questionText to the native (back) side', function () {
            assert.equal(g.state.questionText, 'hello');
        });

        it('sets questionLanguage to English', function () {
            assert.equal(g.state.questionLanguage, 'English');
        });

        it('sets answerText to the foreign (front) side', function () {
            assert.equal(g.state.answerText, 'hola');
        });

        it('sets answerLanguage to the game language', function () {
            assert.equal(g.state.answerLanguage, 'Spanish');
        });

        it('shows emoji at question time', function () {
            assert.equal(g.state.questionEmoji, '👋');
        });

        it('shows emoji at answer time', function () {
            assert.equal(g.state.answerEmoji, '👋');
        });

        it('sets answerComment from the card', function () {
            assert.equal(g.state.answerComment, 'a note');
        });

    });

    // =========================================================================
    describe('draw() — recognition', function () {

        let g;
        beforeEach(function () {
            g = freshGame();
            g.dataset = [makeCard()];
            g.direction = 'recognition';
            g.draw();
        });

        it('sets questionText to the foreign (front) side', function () {
            assert.equal(g.state.questionText, 'hola');
        });

        it('sets questionLanguage to the game language', function () {
            assert.equal(g.state.questionLanguage, 'Spanish');
        });

        it('sets answerText to the native (back) side', function () {
            assert.equal(g.state.answerText, 'hello');
        });

        it('sets answerLanguage to English', function () {
            assert.equal(g.state.answerLanguage, 'English');
        });

        it('hides emoji at question time', function () {
            assert.equal(g.state.questionEmoji, '');
        });

        it('reveals emoji at answer time', function () {
            assert.equal(g.state.answerEmoji, '👋');
        });

    });

    // =========================================================================
    describe('draw() — shuffle', function () {

        it('resolves direction to recall or recognition, never shuffle', function () {
            const g = freshGame();
            g.dataset = [makeCard()];
            g.direction = 'shuffle';
            for (let i = 0; i < 20; i++) {
                g.draw();
                assert.include(['recall', 'recognition'], g.state.direction);
            }
        });

    });

    // =========================================================================
    describe('draw() — sound', function () {

        it('sets questionSpeach to foreign text when sound.foreign is on (recognition)', function () {
            const g = freshGame();
            g.dataset = [makeCard()];
            g.direction = 'recognition';
            g.configuration.sound.foreign = true;
            g.draw();
            assert.equal(g.state.questionSpeach, 'hola');
        });

        it('sets questionSpeach to null when sound.foreign is off (recognition)', function () {
            const g = freshGame();
            g.dataset = [makeCard()];
            g.direction = 'recognition';
            g.configuration.sound.foreign = false;
            g.draw();
            assert.isNull(g.state.questionSpeach);
        });

        it('sets answerSpeach to native text when sound.native is on (recognition)', function () {
            const g = freshGame();
            g.dataset = [makeCard()];
            g.direction = 'recognition';
            g.configuration.sound.native = true;
            g.draw();
            assert.equal(g.state.answerSpeach, 'hello');
        });

        it('sets answerSpeach to foreign text when sound.foreign is on (recall)', function () {
            const g = freshGame();
            g.dataset = [makeCard()];
            g.direction = 'recall';
            g.configuration.sound.foreign = true;
            g.draw();
            assert.equal(g.state.answerSpeach, 'hola');
        });

        it('sets questionSpeach to null when sound.native is off (recall)', function () {
            const g = freshGame();
            g.dataset = [makeCard()];
            g.direction = 'recall';
            g.configuration.sound.native = false;
            g.draw();
            assert.isNull(g.state.questionSpeach);
        });

    });

    // =========================================================================
    describe('draw() — fallback', function () {

        it('draws a fallback card when no cards match the rank filter', function () {
            const g = freshGame();
            g.dataset = [makeCard({ level: 0 })];
            g.rank = 'hard'; // no hard cards
            g.draw();
            assert.include(g.state.card.front, 'Please');
        });

    });

    // =========================================================================
    describe('rate()', function () {

        it('increments seen on the current card', function () {
            const g = freshGame();
            g.dataset = [makeCard()];
            g.draw();
            g.rate(2, 0);
            assert.equal(g.state.card.seen, 1);
        });

        it('does nothing if state.card is null', function () {
            const g = freshGame();
            assert.doesNotThrow(() => g.rate(2, 0));
        });

    });

    // =========================================================================
    describe('category filtering', function () {

        it('draws only cards from the selected category', function () {
            const g = freshGame();
            g.dataset = [
                makeCard({ front: 'hola',    back: 'hello',   category: 'A' }),
                makeCard({ front: 'bonjour', back: 'hello',   category: 'B' })
            ];
            g.configuration.categories = new Set(['A']);
            for (let i = 0; i < 10; i++) {
                g.draw();
                assert.equal(g.state.card.category, 'A');
            }
        });

        it('draws from all categories when the categories set is empty', function () {
            const g = freshGame();
            g.dataset = [
                makeCard({ front: 'hola',    back: 'hello',   category: 'A' }),
                makeCard({ front: 'bonjour', back: 'hello',   category: 'B' })
            ];
            // default empty set → no filter applied
            const seen = new Set();
            for (let i = 0; i < 20; i++) {
                g.draw();
                seen.add(g.state.card.category);
            }
            assert.isTrue(seen.has('A') && seen.has('B'));
        });

    });

    // =========================================================================
    describe('rank filtering', function () {

        it('draws only hard cards in hard mode', function () {
            const g = freshGame();
            g.dataset = [
                makeCard({ front: 'normal', back: 'normal', level: 0 }),
                makeCard({ front: 'hard',   back: 'hard',   level: 1 })
            ];
            g.rank = 'hard';
            for (let i = 0; i < 5; i++) {
                g.draw();
                assert.equal(g.state.card.front, 'hard');
            }
        });

        it('draws only review cards in review mode', function () {
            const g = freshGame();
            g.dataset = [
                makeCard({ front: 'normal', back: 'normal', level:  0 }),
                makeCard({ front: 'review', back: 'review', level: -1 })
            ];
            g.rank = 'review';
            for (let i = 0; i < 5; i++) {
                g.draw();
                assert.equal(g.state.card.front, 'review');
            }
        });

        it('excludes review cards from normal mode', function () {
            const g = freshGame();
            g.dataset = [
                makeCard({ front: 'normal', back: 'normal', level:  0 }),
                makeCard({ front: 'review', back: 'review', level: -1 })
            ];
            g.rank = 'normal';
            for (let i = 0; i < 10; i++) {
                g.draw();
                assert.notEqual(g.state.card.front, 'review');
            }
        });

    });

    // =========================================================================
    describe('recent exclusion', function () {

        it('does not draw the same card twice in a row when alternatives exist', function () {
            const g = freshGame();
            g.configuration.rececency = 1;
            g.dataset = [
                makeCard({ front: 'card-a', back: 'a' }),
                makeCard({ front: 'card-b', back: 'b' })
            ];
            g.draw();
            const first = g.state.card.front;
            g.draw();
            assert.notEqual(g.state.card.front, first);
        });

        it('falls back to the only card when everything is recent', function () {
            const g = freshGame();
            g.dataset = [makeCard()];
            g.draw();
            assert.doesNotThrow(() => g.draw());
            assert.equal(g.state.card.front, 'hola');
        });

    });

});
