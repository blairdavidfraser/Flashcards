//=============================================================================
// Game.js
//
//=============================================================================
import { Card } from "./Card.js"
import { Persistence } from "./Persistence.js"

export class Game {
    dataset = [];
    #deck = [new Card({ front: "Select a deck to begin.", back: "Select a deck to begin." })];
    #enabled = null;
    #recent = [];

    constructor(name = null, language = null) {
        this.name = name;
        this.language = language;
        this.direction = 'recall';
        this.rank = 'normal'; // normal, new, hard, review

        this.configuration = {
            sound: {
                foreign: true,
                native: false
            },
            categories: new Set(),
            rececency: 5 // number of recent cards to exclude from selection
        };

        this.state = {
            card: null,
            direction: null,
            questionLanguage: null,
            questionText: null,
            questionEmoji: null,
            questionSpeach: null,
            answerLanguage: null,
            answerText: null,
            answerEmoji: null,
            answerSpeach: null,
            answerComment: null
        }
    }

    load() {
        this.dataset = Persistence.loadDatasetFrom(this.name, this.language);
        this.#deck = this.dataset.filter(item => item instanceof Card);
        this.#enabled = null;
    }

    draw() {
        this.state.card = this.#pickCard() || new Card({ front: `Please add some cards to start playing (count=${this.#deck.length}).` });

        this.state.direction = this.direction === "shuffle"
            ? Math.random() < 0.5 ? 'recognition' : 'recall'
            : this.direction;

        if (this.state.direction === 'recognition') {
            this.state.questionLanguage = this.language; // Question is foreign
            this.state.questionText = this.state.card?.front; // Foreign shown at question time.
            this.state.questionEmoji = ''; // Emoji would be clue to meaning.
            this.state.questionSpeach = this.configuration.sound.foreign ? this.state.card.front : null;
            this.state.answerLanguage = 'English'; // Answer is English
            this.state.answerText = this.state.card.back; // Native shown at reveal time.
            this.state.answerEmoji = this.state.card.emoji || ''; // Reveal emoji if any.
            this.state.answerSpeach = this.configuration.sound.native ? this.state.card.back : null;
            this.state.answerComment = this.state.card.comment || ''; // Show comment if any.
        }
        else { // recall
            this.state.questionLanguage = 'English';
            this.state.questionText = this.state.card.back; // Native shown at question time.
            this.state.questionEmoji = this.state.card.emoji || ''; // Show emoji if any.
            this.state.questionSpeach = this.configuration.sound.native ? this.state.card.back : null;
            this.state.answerLanguage = this.language; // Answer is foreign
            this.state.answerText = this.state.card.front; // Reveal shown at reveal time.
            this.state.answerEmoji = this.state.card.emoji || ''; // Emoji still shows.
            this.state.answerSpeach = this.configuration.sound.foreign ? this.state.card.front : null;
            this.state.answerComment = this.state.card.comment || ''; // Show comment if any.
        }
    }

    rate(difficulty, level) {
        if (!this.state.card) return;
        this.state.card.rate(difficulty, level);
        Persistence.saveDatasetTo(this.name, this.language, this.dataset);
    }



    #initialize() {
        this.#enabled = this.#filterByCategory(this.#deck, this.configuration.categories);
        switch (this.rank) {

            case 'review':
                // Review just picks the 100 rank === -1 cards not seen in longest time
                this.#enabled = this.#filterByRank(this.#enabled, this.rank, 100);
                break;

            case 'normal':
                // Normal picks non-easy cards, but limits the number of hard cards to max 10.
                let hard = this.#filterByRank(this.#enabled, 'hard', 10);
                let normal = this.#filterByRank(this.#enabled, 'normal');
                this.#enabled = hard.concat(normal);
                break;

            default:
                // For default, just pick by rank.
                this.#enabled = this.#filterByRank(this.#enabled, this.rank);
                break;
        }
        console.log(`Game.#initialize: ${this.#enabled.length} cards match category and rank filters.`);
    }

    #pickCard() {
        if (this.#enabled == null)
            this.#initialize();
        const card = this.#weightedRandom(this.#filterRecent(this.#enabled, this.#recent));
        if (card) {
            this.#recent.push(card);
            if (this.#recent.length > this.configuration.rececency) {
                this.#recent.shift();
            }
        }

        return card;
    }

    #filterRecent(cards, recent) {
        const exclude = new Set(recent);
        const filtered = cards.filter(c => !exclude.has(c));

        // Fallback: if everything is filtered out, allow all
        return filtered.length > 0 ? filtered : cards;
    }

    #filterByCategory(cards, categories, n = null) {
        return cards.filter(c => categories.size === 0 || categories.has(c.category))
            .slice(0, n || cards.length);
    }

    #filterByRank(cards, rank, n = null) {
        return cards.filter(c => c.matches(rank))
            .sort((a, b) => a.lastSeen - b.lastSeen)
            .slice(0, n || cards.length);
    }

    #weightedRandom(cards) {
        let weights = cards.map(c => c.priority());
        let total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < cards.length; i++) {
            r -= weights[i];
            if (r <= 0) {
                return cards[i];
            }
        }
        return null;
    }

}
