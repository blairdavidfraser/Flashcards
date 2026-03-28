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
        this.penalty = data.penalty || 0;
        this.level = data.level || 0;
        this.comment = data.comment?.trim() || "";
    }

    validate() {
        const okFront = this.front?.trim()?.length > 0;
        const okBack = this.back?.trim()?.length > 0;
        return okFront && okBack;
    }

    rate(difficulty, level) {
        this.seen++;
        this.lastSeen = Date.now();
        this.level = Math.max(Math.min(level, 1), -1);
        this.penalty += (3 - difficulty);
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
    isNew() { return this.level >= 0 && (this.seen < 3 || this.added >= Date.now() - 5 * 24 * 60 * 60 * 1000); }
    isReview() { return this.level === -1; }
    isNormal() { return this.level >= 0; }

    priority() {
        const failRate = (this.penalty < 0) ? Math.abs(this.penalty) + 1 : 1;
        const isRecent = (Date.now() - this.added) < (86400000 * 7);
        const recentBoost = isRecent ? 3 : 1;
        const seenPenalty = Math.max(1, this.seen / 5);
        return (failRate * recentBoost) / seenPenalty;
    }

    summary() {
        let added = parseDate(this.added)
        let last = this.lastSeen ? new Date(this.lastSeen) : null
        let seen = this.seen || 0
        return `level ${this.level} (${this.penalty}), added ${formatDate(added)}, ` +
            `last seen ${last ? formatDate(last) : 'never'}, seen ${seen}`
    }
}