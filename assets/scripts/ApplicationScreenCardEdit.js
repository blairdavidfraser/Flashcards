//=============================================================================
// ApplicationScreenCardEdit.js
//
//=============================================================================

export class ApplicationScreenCardEdit {

    #startRound = null;
    #menu = null;

    constructor(gameplay, { startRound, menu } = {}) {
        this.gameplay = gameplay;
        this.#startRound = startRound;
        this.#menu = menu;
    }

    show() {
        this.#menu.classList.add("hidden");
        document.getElementById("studyArea").classList.add("hidden");
        document.getElementById("editCardArea").classList.remove("hidden");
        document.getElementById("editFront").value = this.gameplay.state.card.front;
        document.getElementById("editBack").value = this.gameplay.state.card.back;
        document.getElementById("editEmoji").value = this.gameplay.state.card.emoji || "";
        document.getElementById("editCategory").value = this.gameplay.state.card.category || "";
        document.getElementById("editComment").value = this.gameplay.state.card.comment || "";
    }

    save() {
        this.gameplay.state.card.front = document.getElementById("editFront").value.trim();
        this.gameplay.state.card.back = document.getElementById("editBack").value.trim();
        this.gameplay.state.card.emoji = document.getElementById("editEmoji").value.trim();
        this.gameplay.state.card.category = document.getElementById("editCategory").value.trim();
        this.gameplay.state.card.comment = document.getElementById("editComment").value.trim();
        this.gameplay.save();
        this.#clearFields();
        document.getElementById("editCardArea").classList.add("hidden");
        document.getElementById("studyArea").classList.remove("hidden");
        this.#startRound();
    }

    cancel() {
        this.#clearFields();
        document.getElementById("editCardArea").classList.add("hidden");
        document.getElementById("studyArea").classList.remove("hidden");
    }

    #clearFields() {
        ["editFront", "editBack", "editEmoji", "editCategory", "editComment"]
            .forEach(id => { document.getElementById(id).value = ""; });
    }

}
