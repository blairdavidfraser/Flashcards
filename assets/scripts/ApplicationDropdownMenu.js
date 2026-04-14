//=============================================================================
// ApplicationDropdownMenu.js
//
//=============================================================================

export class ApplicationDropdownMenu {

    constructor(gameplay, { getAutopilot } = {}) {
        this.gameplay = gameplay;
        this._getAutopilot = getAutopilot;

        this._menu = document.getElementById("dropdownMenu");
        const hamburger = document.getElementById("hamburger");

        hamburger.addEventListener("click", (e) => {
            e.stopPropagation();
            this.refresh();
            this._menu.classList.toggle("hidden");
        });

        document.addEventListener("click", () => {
            this._menu.classList.add("hidden");
        });

        this._menu.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    }

    refresh() {
        const autoItem = document.getElementById("autopilotToggle");
        if (autoItem) {
            autoItem.innerHTML = this._getAutopilot?.()
                ? "✅ Autopilot"
                : "❌ Autopilot";
        }

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
            this._menu.classList.add("hidden");
        }
    }

}
