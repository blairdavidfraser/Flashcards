import { Card } from "./Card.js"
import { Comment } from "./Comment.js"


//=============================================================================
// Persistence
//
//=============================================================================
export class Persistence {

    constructor(name, language, logger = null) {
        this.name = name;
        this.language = language;
        this.logger = logger;
    }

    loadDataset() {
        const filename = this.#filename();
        const items = Persistence.deserialize(localStorage.getItem(filename));
        this.logger?.log(`Persistence.loadDataset: loaded '${items.length}' items from '${filename}'.`);
        return items;
    }

    saveDataset(items) {
        const filename = this.#filename();
        localStorage.setItem(filename, Persistence.serialize(items));
        this.logger?.log(`Persistence.saveDataset: saved '${items.length}' items to '${filename}'.`);
    }

    static serialize(items) {
        return JSON.stringify(items);
    }

    static deserialize(raw) {
        if (!raw) return [];
        return JSON.parse(raw).map(item => {
            if (item.type === "Comment") return new Comment(item.value);
            return new Card(item);
        });
    }

    #filename() { return `${this.name}_${this.language}` }

}

