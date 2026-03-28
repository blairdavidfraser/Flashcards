//=============================================================================
// GameTests.js
//
//=============================================================================
import { Card } from "./Card.js"
import { Game } from "./Game.js"
import { Persistence } from "./Persistence.js"

describe('Game', function () {
    let originalRandom;

    before(function () {
        originalRandom = Math.random;
    });

    after(function () {
        Math.random = originalRandom;
    });


    describe('constructor', function () {
        it('should initialize defaults correctly', function () {
            const game = new Game();
            assert.equal(game.direction, 'recall');
            assert.equal(game.rank, 'normal');
            assert.isFalse(game.configuration.sound);
            assert.instanceOf(game.configuration.categories, Set);
        });
    });

    describe('load()', function () {
        it('should load dataset and filter cards', function () {
            const c1 = new Card({ front: "a", back: "b" });
            const c2 = new Comment("text");
            Persistence.loadDatasetFrom = () => [c1, c2];

            const game = new Game("Vocabulary", "Testing");
            game.load();
            assert.equal(game.dataset.length, 2);
            assert.equal(game.deck.length, 1);
            assert.equal(game.deck[0], c1);
        });
    });

    describe('draw()', function () {
        let card;

        beforeEach(function () {
            card = new Card({ front: 'hola', back: 'hello', emoji: '👋', comment: 'note' });
            card.matches = () => true;
            card.priority = () => 1;
        });

        it('should set recognition mode correctly', function () {
            const game = new Game("Vocabulary", "Testing");
            game.deck = [card];
            game.direction = 'recognition';
            game.draw();
            assert.equal(game.state.questionText, 'hola');
            assert.equal(game.state.questionEmoji, '');
            assert.equal(game.state.questionSpeach, 'hola');
            assert.equal(game.state.answerText, 'hello');
            assert.equal(game.state.answerEmoji, '👋');
            assert.equal(game.state.answerSpeach, '');
            assert.equal(game.state.answerComment, 'note');
        });

        it('should set recall mode correctly', function () {
            const game = new Game("Vocabulary", "Testing");
            game.deck = [card];
            game.direction = 'recall';
            game.draw();
            assert.equal(game.state.questionText, 'hello');
            assert.equal(game.state.questionEmoji, '👋');
            assert.equal(game.state.questionSpeach, '');
            assert.equal(game.state.answerText, 'hola');
            assert.equal(game.state.answerEmoji, '👋');
            assert.equal(game.state.answerSpeach, 'hola');
            assert.equal(game.state.answerComment, 'note');
        });

        it('should randomize in shuffle mode', function () {
            const game = new Game("Vocabulary", "Testing");
            game.deck = [card];
            game.direction = 'shuffle';

            Math.random = () => 0.3; // < 0.5 → recognition
            game.draw();
            assert.equal(game.state.questionText, 'hola');

            Math.random = () => 0.7; // > 0.5 → recall
            game.draw();
            assert.equal(game.state.questionText, 'hello');
        });

        it('should handle null card gracefully', function () {
            const game = new Game("Vocabulary", "Testing");
            game.deck = [];
            game.draw();
            assert.equal(game.state.card.front, 'No cards available.');
        });

    });

    describe('rate()', function () {

        it('should call card.rate and save dataset', function () {
            const game = new Game("Vocabulary", "Testing");
            let rateCalled = false;
            let saveCalled = false;
            game.state.card = { rate: () => { rateCalled = true; } };
            Persistence.saveDatasetTo = () => { saveCalled = true; };
            game.rate(2, 1);
            assert.isTrue(rateCalled);
            assert.isTrue(saveCalled);
        });

        it('should do nothing if no current card', function () {
            const game = new Game("Vocabulary", "Testing");
            game.state.card = null;
            let saveCalled = false;
            Persistence.saveDatasetTo = () => { saveCalled = true; };
            game.rate(2, 1);
            assert.isFalse(saveCalled);
        });
    });

    describe('card selection', function () {

        it('should filter by category and matches()', function () {
            const c1 = new Card({ front: 'a', back: 'b', category: 'x', matches: () => true, priority: () => 1 });
            const c2 = new Card({ front: 'c', back: 'd', category: 'y', matches: () => true, priority: () => 1 });

            const game = new Game("Vocabulary", "Testing");
            game.deck = [c1, c2];
            game.configuration.categories.add('x');
            game.draw();
            assert.equal(game.state.card, c1);
        });

        it('should return error card if no enabled cards', function () {
            const c = new Card({ front: 'a', back: 'b', category: 'x' });
            c.matches = () => false;

            const game = new Game("Vocabulary", "Testing");
            game.deck = [c];
            game.configuration.categories.add('x');
            game.draw();
            assert.equal(game.state.card.front, 'No cards available.');
        });

        it('should prioritize higher weight cards', function () {
            const c1 = new Card({ front: 'a', back: 'b', category: 'a', matches: () => true, priority: () => 1 });
            const c2 = new Card({ front: 'c', back: 'd', category: 'a', matches: () => true, priority: () => 100 });

            const game = new Game("Vocabulary", "Testing");
            game.deck = [c1, c2];
            game.configuration.categories.add('a');
            Math.random = () => 0.99; // bias toward high weight
            game.draw();
            assert.equal(game.state.card, c2);
        });

        it('should use review mode sorting', function () {
            const c1 = new Card({ front: 'a', back: 'b', category: 'a', level: -1, matches: () => true, lastSeen: new Date() - 1000 });
            const c2 = new Card({ front: 'c', back: 'd', category: 'a', level: -1, matches: () => true, lastSeen: new Date() - 2000 });

            const game = new Game("Vocabulary", "Testing");
            game.rank = 'review';
            game.deck = [c2, c1];
            game.configuration.categories.add('a');
            Math.random = () => 0;
            game.draw();
            assert.equal(game.state.card, c2); // oldest first
        });

    });

});
