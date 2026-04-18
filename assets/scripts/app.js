import { Gameplay } from "./Gameplay.js"
import { ApplicationScreenStudy } from "./ApplicationScreenStudy.js"
import { ApplicationScreenStatistics } from "./ApplicationScreenStatistics.js"
import { ApplicationScreenDatasetEdit } from "./ApplicationScreenDatasetEdit.js"
import { ApplicationScreenCardEdit } from "./ApplicationScreenCardEdit.js"
import { ApplicationDropdownMenu } from "./ApplicationDropdownMenu.js"

//=============================================================================
// Globals
//=============================================================================
export const gameplay = new Gameplay(console);
gameplay.direction = "recall";





//=============================================================================
// Menu and Game Configuration
//=============================================================================


function selectGame(name, language) {
    gameplay.name = name;
    gameplay.language = language;

    document.getElementById("gameMenu").classList.add("hidden")
    document.getElementById("configurationMenu").classList.remove("hidden");
    document.getElementById("languageTitle").innerText = gameplay.language

    configureGame()
}

function configureGame() {
    const dirEl = document.querySelector(`input[name="direction"][value="${gameplay.direction}"]`);
    if (dirEl) dirEl.checked = true;
    const timeoutEl = document.querySelector(`input[name="timeout"][value="${gameplay.timeout}"]`);
    if (timeoutEl) timeoutEl.checked = true;

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
window.selectGameTimeout = v => gameplay.timeout = parseInt(v)
window.selectOnlyFavourites = v => gameplay.onlyFavourites = v

const screenStudy = new ApplicationScreenStudy(gameplay, { backToMenu });
window.startGame = (rank) => screenStudy.startGame(rank);
window.startRound = () => screenStudy.startRound();
window.finishRound = () => screenStudy.finishRound();
window.cycleRound = (difficulty, level) => screenStudy.cycleRound(difficulty, level);
window.endGame = () => screenStudy.endGame();
window.toggleFavourite = (event) => screenStudy.toggleFavourite(event);

const dropdownMenu = new ApplicationDropdownMenu(gameplay);
window.toggleSound = (type) => dropdownMenu.toggleSound(type);

window.selectGame = selectGame;
window.configureGame = configureGame;
window.backToMenu = backToMenu;

const screenCardEdit = new ApplicationScreenCardEdit(gameplay, { startRound: () => screenStudy.startRound(), menu: document.getElementById("dropdownMenu") });
window.showCardEdit = () => screenCardEdit.show();
window.saveCardEdit = () => screenCardEdit.save();
window.cancelEdit = () => screenCardEdit.cancel();

const screenStatistics = new ApplicationScreenStatistics(console);
window.statistics = (name, language) => screenStatistics.show(name, language);

const screenDatasetEdit = new ApplicationScreenDatasetEdit(console, { backToMenu });
window.editGameDataset = (name, language) => screenDatasetEdit.show(name, language);
window.saveGameDataset = () => screenDatasetEdit.save();
window.selectAllText = () => screenDatasetEdit.selectAll();
window.saveToGitHub = () => screenDatasetEdit.saveToGitHub();
window.saveGithubConfig = () => screenDatasetEdit.saveGithubConfig();
window.cancelGithubConfig = () => screenDatasetEdit.cancelGithubConfig();

// Initial render of menu items
dropdownMenu.refresh();