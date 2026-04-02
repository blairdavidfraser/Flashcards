//=============================================================================
// Gameplay.js
//
//=============================================================================
import { Card } from "./Card.js"
import { Game } from "./Game.js"
import { Persistence } from "./Persistence.js"

export class Gameplay {
    constructor(logger = null) {
        this.logger = logger;
        this.game = new Game();
        this.game.deck = [new Card({ front: "Select a deck to begin.", back: "Select a deck to begin." })];
        this.game.rank = "normal"
        this.game.direction = "shuffle"
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

    get state() { return this.game.state; }

    initialize(rank) {
        this.rank = rank;
        this.game.load();
        this.logger?.log(`Gameplay.initialize: language='${this.language}', name='${this.name}', rank='${this.rank}', direction='${this.direction}, '${this.game.deck.length}' cards loaded.`)
    }

    draw() {
        this.game.draw();
        this.logger?.log(`Gameplay.draw: question='${this.state.questionSpeach}', answer='${this.state.answerSpeach}'.`)
        this.#speakText(this.state.questionSpeach, this.language);
    }

    reveal() {
        this.logger?.log(`Gameplay.reveal (${this.state.direction}) answer='${this.state.answerText}', speach='${this.state.answerSpeach}'`)
        this.#speakText(this.state.answerSpeach, this.language);
    }

    rate(difficulty, level) {
        this.game.rate(difficulty, level);
    }

    end() {
        this.logger?.log(`Gameplay.end`)
        Persistence.saveDatasetTo(this.name, this.language, this.game.dataset)
    }


    #speakText(text, lang) {
        if (!this.sound || !text) return

        // Create speech synthesis 
        const utterance = new SpeechSynthesisUtterance(text)

        // Set language based on current language
        if (lang === 'Spanish') {
            utterance.lang = 'es-ES' // Spanish (Spain) - you can adjust to 'es-MX' for Mexican Spanish, etc.
        } else if (lang === 'French') {
            utterance.lang = 'fr-FR' // French (France)
        }

        // Optional: adjust speech properties
        utterance.rate = 0.9 // Slightly slower for learning
        utterance.pitch = 1

        // Speak the text
        window.speechSynthesis.speak(utterance)
    }

}