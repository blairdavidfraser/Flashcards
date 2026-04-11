//=============================================================================
// Card.js
//
// A class representing a single flashcard, with front and back content.
//=============================================================================
import { parseDate, formatDate } from "./Utilities.js"

export class Card {
    constructor(data) {
        this.type = "Card";
        this.front = data.front?.trim() || "";
        this.back = data.back?.trim() || "";
        this.emoji = data.emoji?.trim() || "";
        this.category = data.category?.trim() || "uncategorized";
        this.added = data.added || Date.now();
        this.lastSeen = data.lastSeen || null;
        this.seen = data.seen || 0;
        this.totalFailure = data.totalFailure || 0;
        this.level = data.level || 0;
        this.comment = data.comment?.trim() || "";

        // If a card has never been seen, then penalty is null, which
        // will be handled for in the priority calculation.
        this.penalty = this.seen == 0 ? null : this.totalFailure / this.seen;
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
        const failure = difficulty - 1;
        this.totalFailure = (this.totalFailure || 0) + failure;
        this.penalty = this.seen > 0 ? this.totalFailure / this.seen : 0;
    }

    matches(level) {
        switch (level) {
            case 'new':
                return this.isNew();
            case 'hard':
                return this.isHard();
            case 'review':
                return this.isReview();
            case 'normal':
                return this.isNormal();
            default:
                return false;
        }
    }

    isHard() { return this.level >= 1; }
    isReview() { return this.level <= -1; }
    isNormal() { return this.level === 0; }
    isNew() { return this.level >= 0 && (this.seen < 3 || this.added >= Date.now() - 5 * 24 * 60 * 60 * 1000); }

    summary() {
        let added = parseDate(this.added)
        let last = this.lastSeen ? new Date(this.lastSeen) : null
        let seen = this.seen || 0
        return `level ${this.level} (${this.penalty?.toFixed(2) || "null"} @ ${seen}x), +${formatDate(added)}, ` +
            `last ${last ? formatDate(last) : 'never'}`
    }
}