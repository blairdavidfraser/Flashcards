//=============================================================================
// ApplicationScreenDatasetEdit.js
//
//=============================================================================
import { Persistence } from './Persistence.js';
import { Dataset } from './Dataset.js';

export class ApplicationScreenDatasetEdit {

    constructor(logger = null, { backToMenu } = {}) {
        this.logger = logger;
        this._backToMenu = backToMenu;
        this._persistence = null;
    }

    show(name, language) {
        this._persistence = new Persistence(name, language, this.logger);
        document.getElementById("gameMenu").classList.add("hidden");
        document.getElementById("editArea").classList.remove("hidden");
        document.getElementById("editTitle").innerText = `Edit ${language} / ${name}`;
        document.getElementById("editBox").value = Dataset.serialize(this._persistence.loadDataset());
    }

    save() {
        this._persistence.saveDataset(Dataset.parse(document.getElementById("editBox").value));
        this._persistence = null;
        this._backToMenu();
    }

    selectAll() {
        document.getElementById("editBox").select();
    }

}
