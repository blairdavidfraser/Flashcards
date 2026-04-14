import { Card } from "./Card.js"
import { Comment } from "./Comment.js"


//=============================================================================
// Persistence
//
//=============================================================================
export class Persistence {

    constructor(name, language) {
        this.name = name;
        this.language = language;
    }

    loadDataset() { return Persistence.loadDatasetFrom(this.name, this.language) }
    saveDataset(items) { Persistence.saveDatasetTo(this.name, this.language, items) }

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

    static loadDatasetFrom(name, language) {
        const filename = Persistence.#filename(name, language);
        const items = Persistence.deserialize(localStorage.getItem(filename));
        console.log(`Persistence.loadDatasetFrom: loaded '${items.length}' items from '${filename}'.`);
        return items;
    }

    static saveDatasetTo(name, language, items) {
        const filename = Persistence.#filename(name, language);
        localStorage.setItem(filename, Persistence.serialize(items));
        console.log(`Persistence.saveDatasetTo: saved '${items.length}' items to '${filename}'.`);
    }

    static #filename(prefix, suffix) { return `${prefix}_${suffix}` }

}

