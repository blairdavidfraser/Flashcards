//=============================================================================
// Card.js
//
// A class representing a single flashcard, with front and back content.
//=============================================================================
import { parseDate, formatDate } from "./Utilities.js"
import { CardRank } from "./CardRank.js"

export class Card {

    constructor(data) {
        this.type = "Card";
        this.front = data.front?.trim() || "";
        this.back = data.back?.trim() || "";
        this.emoji = data.emoji?.trim() || "";
        this.category = data.category?.trim() || "uncategorized";
        this.favourite = data.favourite || false;
        this.added = data.added || Date.now();
        this.lastSeen = data.lastSeen || null;
        this.seen = data.seen || 0;
        this.level = data.level || 0;
        this.comment = data.comment?.trim() || "";
        this.penalty = data.penalty ?? null;
    }

    validate() {
        const okFront = this.front?.trim()?.length > 0;
        const okBack = this.back?.trim()?.length > 0;
        return okFront && okBack;
    }

    priority() {
        // Use a default penalty of 1 for new cards.
        const penalty = this.penalty == null ? 1 : this.penalty;
        return penalty / (1 + this.seen * 0.2);
    }

    rate(difficulty, level) {
        this.seen++;
        this.lastSeen = Date.now();
        this.level = Math.max(Math.min(level, 1), -1);

        if (difficulty === 4) {
            this.added = Date.now() + 5 * 24 * 60 * 60 * 1000;
        }

        // Difficulty is converted to zero-based measure and blended
        // with existing penalty using exponential moving average.
        // Clamped to 0 so that rating Easy (difficulty=0) decays toward 0, never negative.
        const alpha = 0.3; // Weight of the new result
        const contribution = Math.max(0, difficulty - 1);
        this.penalty = this.penalty == null
            ? contribution
            : (1 - alpha) * this.penalty + alpha * contribution;
    }

    rankName() {
        switch (this.level) {
            case  1: return CardRank.Hard;
            case -1: return CardRank.Easy;
            case  2: return CardRank.Cold;
            default: return CardRank.Core;
        }
    }

    matches(rank) {
        switch (rank) {
            case 'new':           return this.isNew();
            case 'hard':
            case CardRank.Hard:   return this.isHard();
            case 'normal':
            case CardRank.Core:   return this.isCore();
            case 'review':
            case 'easy':
            case CardRank.Easy:   return this.isEasy();
            case 'cold':
            case CardRank.Cold:   return this.isCold();
            case 'all':           return !this.isCold();
            default:              return false;
        }
    }

    isHard()   { return this.level === 1; }
    isCore()   { return this.level === 0; }
    isEasy()   { return this.level === -1; }
    isCold()   { return this.level === 2; }
    isNew()    { return !this.isCold() && this.level >= 0 && (this.seen < 3 || this.added >= Date.now() - 5 * 24 * 60 * 60 * 1000); }

    summary() {
        const added = parseDate(this.added);
        const last = this.lastSeen ? new Date(this.lastSeen) : null;
        const seen = this.seen || 0;
        return `${this.rankName()} (${this.penalty?.toFixed(2) || "null"} @ ${seen}x), +${formatDate(added)}, ` +
            `last ${last ? formatDate(last) : 'never'}`
    }
}
