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

    static loadDatasetFrom(name, language) {
        let filename = Persistence.#filename(name, language);
        var raw = localStorage.getItem(filename);
        if (!raw) return []

        let data = JSON.parse(raw);
        var items = data.map(item => {
            if (item.type === "Comment") return new Comment(item.value);
            return new Card(item);
        });

        console.log(`Persistence.loadDatasetFrom: loaded '${items.length}' items from '${filename}'.`);
        return items;
    }

    static saveDatasetTo(name, language, items) {
        let filename = Persistence.#filename(name, language)
        localStorage.setItem(filename, JSON.stringify(items))
        console.log(`Persistence.saveDatasetTo: saved '${items.length}' items to '${filename}'.`);
    }

    static #filename(prefix, suffix) { return `${prefix}_${suffix}` }

}

