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

        let round = this.direction === "shuffle"
            ? Math.random() < 0.5 ? 'recognition' : 'recall'
            : this.direction;

        if (round === 'recognition') {
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
        // Filter to ensure we only work with actual Card instances
        let enabled = this.deck.filter(c =>
            (this.configuration.categories.size === 0 || this.configuration.categories.has(c.category)) &&
            c.matches(this.rank)
        );

        let result = null;

        // Sort for Review mode specifically
        if (this.rank === 'review') {
            return enabled
                .sort((a, b) => a.lastSeen - b.lastSeen)
                .slice(0, 100)[Math.floor(Math.random() * Math.min(enabled.length, 100))];
        }

        // Weighted Random Selection using the class method
        let weights = enabled.map(c => c.priority());
        let total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < enabled.length; i++) {
            r -= weights[i];
            if (r <= 0) {
                return enabled[i];
            }
        }

        return result;
    }
}
