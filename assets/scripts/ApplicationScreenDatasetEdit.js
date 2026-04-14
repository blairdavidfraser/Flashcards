//=============================================================================
// ApplicationScreenDatasetEdit.js
//
//=============================================================================
import { Persistence } from './Persistence.js';
import { Dataset } from './Dataset.js';

export class ApplicationScreenDatasetEdit {

    #backToMenu = null;
    #persistence = null;

    constructor(logger = null, { backToMenu } = {}) {
        this.logger = logger;
        this.#backToMenu = backToMenu;
    }

    show(name, language) {
        this.#persistence = new Persistence(name, language, this.logger);
        document.getElementById("gameMenu").classList.add("hidden");
        document.getElementById("editArea").classList.remove("hidden");
        document.getElementById("editTitle").innerText = `Edit ${language} / ${name}`;
        document.getElementById("editBox").value = Dataset.serialize(this.#persistence.loadDataset());
    }

    save() {
        this.#persistence.saveDataset(Dataset.parse(document.getElementById("editBox").value));
        this.#persistence = null;
        this.#backToMenu();
    }

    selectAll() {
        document.getElementById("editBox").select();
    }

}
