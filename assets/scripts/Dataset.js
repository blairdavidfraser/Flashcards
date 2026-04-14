//=============================================================================
// Dataset.js
//
// Serialization and parsing of the pipe-separated dataset text format.
//=============================================================================
import { Card } from "./Card.js"
import { Comment } from "./Comment.js"
import { parseDate, formatDate } from "./Utilities.js"

export class Dataset {

    static serialize(items) {
        return items.map(item => {
            if (item.type === "Comment") return item.value;
            return [
                item.front,
                item.back,
                item.emoji || "",
                item.category || "",
                formatDate(item.added),
                formatDate(item.lastSeen),
                item.seen,
                item.penalty?.toFixed(4) || "",
                item.level,
                item.comment || ""
            ].join(" | ");
        }).join("\n");
    }

    static parse(text) {
        const items = [];
        for (const line of text.split("\n")) {
            const trimmed = line.trim();
            if (trimmed.startsWith("#") || !trimmed) {
                items.push(new Comment(trimmed));
                continue;
            }
            const parts = line.split("|");
            const card = new Card({
                front:    parts[0].trim(),
                back:     parts[1].trim(),
                emoji:    parts[2].trim() || "",
                category: parts[3].trim() || "",
                added:    parseDate(parts[4].trim()),
                lastSeen: parseDate(parts[5].trim()),
                seen:     parseInt(parts[6]) || 0,
                penalty:  parts[7]?.trim() ? parseFloat(parts[7]) : null,
                level:    parseInt(parts[8]) || 0,
                comment:  parts[9]?.trim() || ""
            });
            if (card.validate()) items.push(card);
        }
        return items;
    }

}
