//=============================================================================
// Gameplay.js
//
//=============================================================================
import { Card } from "./Card.js"
import { Game } from "./Game.js"
import { Persistence } from "./Persistence.js"
import { DailyLog } from "./DailyLog.js"

export class Gameplay {

    constructor(logger = null) {
        this.logger = logger;
        this.game = new Game(null, null, logger);
        this.game.rank = "normal";
        this.timeout = 0; // seconds between auto-flip and auto-advance; 0 = off
    }

    get name() { return this.game.name; }
    set name(v) { this.game.name = v; }

    get language() { return this.game.language; }
    set language(v) { this.game.language = v; }

    get rank() { return this.game.rank; }
    set rank(v) { this.game.rank = v; }

    get direction() { return this.game.direction; }
    set direction(v) { this.game.direction = v; }

    get sound() { return this.game.configuration.sound; }
    set sound(v) { this.game.configuration.sound = v; }

    get categories() { return this.game.configuration.categories; }
    set categories(v) { this.game.configuration.categories = v; }

    get onlyFavourites() { return this.game.configuration.onlyFavourites; }
    set onlyFavourites(v) { this.game.configuration.onlyFavourites = v; }

    get cards() { return this.game.dataset.filter(item => item instanceof Card); }

    get state() { return this.game.state; }


    load() {
        this.game.dataset = new Persistence(this.name, this.language, this.logger).loadDataset();
        const counts = {};
        this.cards.forEach(card => {
            const cat = card.category || "Uncategorized";
            counts[cat] = (counts[cat] || 0) + 1;
        });
        const categories = Object.keys(counts).sort();
        this.categories = new Set(categories);
        return { counts, categories };
    }

    initialize(rank) {
        this.rank = rank;
        this.logger?.log(`Gameplay.initialize: language='${this.language}', name='${this.name}', rank='${this.rank}', direction='${this.direction}'.`);
    }

    save() {
        new Persistence(this.name, this.language, this.logger).saveDataset(this.game.dataset);
    }

    draw() {
        this.game.draw();
        this.logger?.log(`Gameplay.draw: question='${this.state.questionSpeech}', answer='${this.state.answerSpeech}'.`);
    }

    reveal() {
        this.logger?.log(`Gameplay.reveal (${this.state.direction}) answer='${this.state.answerText}', speech='${this.state.answerSpeech}'.`);
        if (this.state.direction === 'recognition') {
            DailyLog.record(this.name, this.language, 'recognition');
        }
    }

    rate(difficulty, level) {
        this.game.rate(difficulty, level);
        this.save();
        if (this.state.direction === 'recall' || this.state.direction === 'shuffle') {
            DailyLog.record(this.name, this.language, 'recall');
        }
    }

    end() {
        this.logger?.log(`Gameplay.end`);
        this.save();
    }


}