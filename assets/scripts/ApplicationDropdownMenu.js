//=============================================================================
// ApplicationDropdownMenu.js
//
//=============================================================================

export class ApplicationDropdownMenu {

    #menu = null;

    constructor(gameplay) {
        this.gameplay = gameplay;

        this.#menu = document.getElementById("dropdownMenu");
        const hamburger = document.getElementById("hamburger");

        hamburger.addEventListener("click", (e) => {
            e.stopPropagation();
            this.refresh();
            this.#menu.classList.toggle("hidden");
        });

        document.addEventListener("click", () => {
            this.#menu.classList.add("hidden");
        });

        this.#menu.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    }

    refresh() {
        const foreignItem = document.getElementById("foreignSoundToggle");
        if (foreignItem) {
            foreignItem.innerHTML = this.gameplay.sound.foreign
                ? "&#128266; Foreign Sound"
                : "&#128263; Foreign Sound";
        }

        const nativeItem = document.getElementById("nativeSoundToggle");
        if (nativeItem) {
            nativeItem.innerHTML = this.gameplay.sound.native
                ? "&#128266; Native Sound"
                : "&#128263; Native Sound";
        }

        const editItem = document.getElementById("editCardMenuItem");
        if (editItem) {
            if (this.gameplay.state && this.gameplay.state.card) {
                editItem.classList.remove("hidden");
            } else {
                editItem.classList.add("hidden");
            }
        }
    }

    toggleSound(type) {
        if (this.gameplay.sound.hasOwnProperty(type)) {
            this.gameplay.sound[type] = !this.gameplay.sound[type];
            this.#menu.classList.add("hidden");
        }
    }

}
