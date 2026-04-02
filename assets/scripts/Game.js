//=============================================================================
// Game.js
//
//=============================================================================
import { Card } from "./Card.js"
import { Persistence } from "./Persistence.js"

export class Game {
    constructor(name = null, language = null) {
        this.name = name;
        this.language = language;
        this.direction = 'recall';
        this.rank = 'normal'; // normal, new, hard, review

        this.configuration = {
            sound: false, // will toggle to true on document load
            categories: new Set()
        };

        this.state = {
            card: null,
            direction: null,
            questionText: null,
            questionEmoji: null,
            questionSpeach: null,
            answerText: null,
            answerEmoji: null,
            answerSpeach: null,
            answerComment: null
        }

        this.dataset = [];
        this.deck = [];
    }

    load() {
        this.dataset = Persistence.loadDatasetFrom(this.name, this.language);
        this.deck = this.dataset.filter(item => item instanceof Card);
    }

    draw() {
        this.state.card = this.#pickCard() || new Card({ front: `Please add some cards to start playing (count=${this.deck.length}).` });

        this.state.direction = this.direction === "shuffle"
            ? Math.random() < 0.5 ? 'recognition' : 'recall'
            : this.direction;

        if (this.state.direction === 'recognition') {
            this.state.questionText = this.state.card?.front; // Foreign shown first.
            this.state.questionEmoji = ''; // Emoji would be clue to meaning.
            this.state.questionSpeach = this.state.card.front; // Speak the foreign at question time.
            this.state.answerText = this.state.card.back; // Reveal native answer.
            this.state.answerEmoji = this.state.card.emoji || ''; // Reveal emoji if any.
            this.state.answerSpeach = ''; // Don't speak the native text.
            this.state.answerComment = this.state.card.comment || ''; // Show comment if any.
        }
        else { // recall
            this.state.questionText = this.state.card.back; // Native shown first.
            this.state.questionEmoji = this.state.card.emoji || ''; // Show emoji if any.
            this.state.questionSpeach = ''; // Don't speak the native text.
            this.state.answerText = this.state.card.front; // Reveal foreign answer.
            this.state.answerEmoji = this.state.card.emoji || ''; // Emoji still shows.
            this.state.answerSpeach = this.state.card.front; // Speak the foreign text.
            this.state.answerComment = this.state.card.comment || ''; // Show comment if any.
        }
    }

    rate(difficulty, level) {
        if (!this.state.card) return;
        this.state.card.rate(difficulty, level);
        Persistence.saveDatasetTo(this.name, this.language, this.dataset);
    }

    #pickCard() {
        let enabled = this.#filterByCategory(this.deck, this.configuration.categories);
        switch (this.rank) {

            case 'review':
                // Review just picks the 100 rank === -1 cards not seen in longest time
                enabled = this.#filterByRank(enabled, this.rank, 100);
                break;

            case 'normal':
                // Normal picks non-easy cards, but limits the number of hard cards to max 20.
                let hard = this.#filterByRank(enabled, 'hard', 20);
                let normal = this.#filterByRank(enabled, 'normal');
                enabled = hard.concat(normal);
                break;

            default:
                // For default, just pick by rank.
                enabled = this.#filterByRank(enabled, this.rank);
                break;
        }
        enabled = this.#filterByRank(enabled, this.rank, this.rank === 'review' ? 100 : null);
        console.log(`Game.#pickCard: ${enabled.length} cards match category and rank filters.`);
        return this.#weightedRandom(enabled);

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
