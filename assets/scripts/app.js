import { Gameplay } from "./Gameplay.js"
import { ApplicationScreenStudy } from "./ApplicationScreenStudy.js"
import { ApplicationScreenStatistics } from "./ApplicationScreenStatistics.js"
import { ApplicationScreenDatasetEdit } from "./ApplicationScreenDatasetEdit.js"
import { ApplicationScreenCardEdit } from "./ApplicationScreenCardEdit.js"

//=============================================================================
// Globals
//=============================================================================
export const gameplay = new Gameplay(console);
gameplay.direction = "recall";





//=============================================================================
// Menu and Game Configuration
//=============================================================================
const menu = document.getElementById("dropdownMenu");
const hamburger = document.getElementById("hamburger");

// Toggle menu visibility
hamburger.addEventListener("click", (e) => {
    e.stopPropagation();
    // Refresh labels every time we open to ensure they match current state
    refreshMenu();
    menu.classList.toggle("hidden");
});

// Click outside = close
document.addEventListener("click", () => {
    menu.classList.add("hidden");
});

// Prevent clicks inside menu from closing it automatically 
// (unless it's one of our toggle items which has its own logic)
menu.addEventListener("click", (e) => {
    e.stopPropagation();
});

/**
 * Updates the text and emojis in the dropdown menu based on current state
 */
function refreshMenu() {
    const autoItem = document.getElementById("autopilotToggle");
    if (autoItem) {
        autoItem.innerHTML = screenStudy.autopilot
            ? "✅ Autopilot"
            : "❌ Autopilot";
    }

    const foreignItem = document.getElementById("foreignSoundToggle");
    const nativeItem = document.getElementById("nativeSoundToggle");

    if (foreignItem) {
        foreignItem.innerHTML = gameplay.sound.foreign
            ? "&#128266; Foreign Sound"
            : "&#128263; Foreign Sound";
    }

    if (nativeItem) {
        nativeItem.innerHTML = gameplay.sound.native
            ? "&#128266; Native Sound"
            : "&#128263; Native Sound";
    }

    const editItem = document.getElementById("editCardMenuItem");
    if (gameplay.state && gameplay.state.card) {
        editItem.classList.remove("hidden");
    } else {
        editItem.classList.add("hidden");
    }
}

/**
 * Toggles a specific sound setting and closes the menu
 * @param {string} type - 'foreign' or 'native'
 */
function toggleSound(type) {
    if (gameplay.sound.hasOwnProperty(type)) {
        gameplay.sound[type] = !gameplay.sound[type];
        console.log(`${type} sound is now: ${gameplay.sound[type]}`);

        // Close menu after selection
        menu.classList.add("hidden");
    }
}


function selectGame(name, language) {
    gameplay.name = name;
    gameplay.language = language;

    document.getElementById("gameMenu").classList.add("hidden")
    document.getElementById("configurationMenu").classList.remove("hidden");
    document.getElementById("languageTitle").innerText = gameplay.language

    configureGame()
}

function configureGame() {
    const { counts, categories } = gameplay.load();
    const container = document.getElementById("categoryFilters");
    container.innerHTML = "";
    categories.forEach(cat => {
        const id = "cat_" + cat.replace(/\s+/g, "_");
        const label = document.createElement("label");
        label.innerHTML = `<p><input type="checkbox" id="${id}" checked>${cat} (${counts[cat]})</p>`;

        const checkbox = label.querySelector("input");
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) gameplay.categories.add(cat);
            else gameplay.categories.delete(cat);
        });

        container.appendChild(label);
    });
}

function backToMenu() {
    document.getElementById("gameMenu").classList.remove("hidden");
    document.getElementById("configurationMenu").classList.add("hidden")
    document.getElementById("studyArea").classList.add("hidden")

    let edit = document.getElementById("editArea")
    if (edit) edit.classList.add("hidden")
    let reset = document.getElementById("resetArea")
    if (reset) reset.classList.add("hidden")
    document.getElementById("statsArea").classList.add("hidden")
    document.getElementById("editCardArea").classList.add("hidden")
}







//=============================================================================
// Utility functions 
//=============================================================================

window.selectGameRank = v => gameplay.rank = v
window.selectGameDirection = v => gameplay.direction = v

const screenStudy = new ApplicationScreenStudy(gameplay, { backToMenu });
window.startGame = (rank) => screenStudy.startGame(rank);
window.startRound = () => screenStudy.startRound();
window.finishRound = () => screenStudy.finishRound();
window.cycleRound = (difficulty, level) => screenStudy.cycleRound(difficulty, level);
window.endGame = () => screenStudy.endGame();
window.toggleAutopilot = () => { screenStudy.toggleAutopilot(); refreshMenu(); };
window.toggleSound = toggleSound;
window.selectGame = selectGame;
window.configureGame = configureGame;
window.backToMenu = backToMenu;
const screenCardEdit = new ApplicationScreenCardEdit(gameplay, { startRound: () => screenStudy.startRound(), menu });
window.showCardEdit = () => screenCardEdit.show();
window.saveCardEdit = () => screenCardEdit.save();
window.cancelEdit = () => screenCardEdit.cancel();
const screenStatistics = new ApplicationScreenStatistics(console);
window.statistics = (name, language) => screenStatistics.show(name, language);

const screenDatasetEdit = new ApplicationScreenDatasetEdit(console, { backToMenu });
window.editGameDataset = (name, language) => screenDatasetEdit.show(name, language);
window.saveGameDataset = () => screenDatasetEdit.save();
window.selectAllText = () => screenDatasetEdit.selectAll();

// Initial render of menu items
refreshMenu();