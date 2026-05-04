//=============================================================================
// Dataset.js
//
// Serialization and parsing of the pipe-separated dataset text format.
//=============================================================================
import { Card } from "./Card.js"
import { Comment } from "./Comment.js"
import { parseDate, formatDate } from "./Utilities.js"

const RANK_TO_LEVEL = Object.freeze({ Hard: 1, Core: 0, Easy: -1, Cold: 2 });
const LEVEL_TO_RANK = Object.freeze({ 1: 'Hard', 0: 'Core', '-1': 'Easy', 2: 'Cold' });

export class Dataset {

    static serialize(items) {
        return items.map(item => {
            if (item.type === "Comment") return item.value;
            return [
                item.front,
                item.back,
                item.emoji || "",
                item.category || "",
                item.favourite || false,
                formatDate(item.added),
                formatDate(item.lastSeen),
                item.seen,
                item.penalty?.toFixed(4) || "",
                LEVEL_TO_RANK[item.level] ?? item.level,
                item.comment || ""
            ].join(" | ");
        }).join("\n");
    }

    static validate(text) {
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const parts = line.split('|').map(p => p.trim());
            const lineNum = i + 1;
            if (parts.length !== 11)
                return { lineNum, message: `Expected 11 columns, found ${parts.length}`, data: line };
            if (!parts[0])
                return { lineNum, message: 'Front (column 1) is empty', data: line };
            if (!parts[1])
                return { lineNum, message: 'Back (column 2) is empty', data: line };
            if (parts[4] && parts[4] !== 'true' && parts[4] !== 'false')
                return { lineNum, message: `Favourite (column 5) must be "true", "false", or empty — got "${parts[4]}"`, data: line };
            if (parts[5] && isNaN(new Date(parts[5]).getTime()))
                return { lineNum, message: `Added date (column 6) is invalid: "${parts[5]}"`, data: line };
            if (parts[6] && isNaN(new Date(parts[6]).getTime()))
                return { lineNum, message: `Last seen (column 7) is invalid: "${parts[6]}"`, data: line };
            if (parts[7] !== '' && (isNaN(parseInt(parts[7])) || parseInt(parts[7]) < 0))
                return { lineNum, message: `Seen count (column 8) must be a non-negative integer — got "${parts[7]}"`, data: line };
            if (parts[8] !== '' && isNaN(parseFloat(parts[8])))
                return { lineNum, message: `Penalty (column 9) must be a number or empty — got "${parts[8]}"`, data: line };
            if (parts[9] !== '' && !(parts[9] in RANK_TO_LEVEL))
                return { lineNum, message: `Level (column 10) must be Hard, Core, Easy, or Cold — got "${parts[9]}"`, data: line };
        }
        return null;
    }

    static parse(text) {
        const items = [];
        for (const line of text.split("\n")) {
            const trimmed = line.trim();
            if (trimmed.startsWith("#") || !trimmed) {
                items.push(new Comment(trimmed));
                continue;
            }
            const parts = line.split("|").map(p => p.trim());
            const card = new Card({
                front: parts[0]?.trim(),
                back: parts[1]?.trim(),
                emoji: parts[2]?.trim() || "",
                category: parts[3]?.trim() || "",
                favourite: parts[4]?.trim() === "true" ? true : false,
                added: parseDate(parts[5]),
                lastSeen: parseDate(parts[6]),
                seen: parseInt(parts[7]) || 0,
                penalty: parts[8] ? parseFloat(parts[8]) : null,
                level: RANK_TO_LEVEL[parts[9]] ?? 0,
                comment: parts[10]?.trim() || ""
            });
            if (card.validate()) items.push(card);
        }
        return items;
    }

}
