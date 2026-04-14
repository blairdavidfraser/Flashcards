import { Gameplay } from "./Gameplay.js"
import { ApplicationScreenStatistics } from "./ApplicationScreenStatistics.js"
import { ApplicationScreenDatasetEdit } from "./ApplicationScreenDatasetEdit.js"
import { ApplicationScreenCardEdit } from "./ApplicationScreenCardEdit.js"

//=============================================================================
// Globals
//=============================================================================
export const gameplay = new Gameplay(console);
gameplay.direction = "recall";


//=============================================================================
// UI Gameplay
//=============================================================================

function startGame(rank) {
    gameplay.initialize(rank);

    document.getElementById("configurationMenu").classList.add("hidden")
    document.getElementById("studyArea").classList.remove("hidden");
    startRound()
}

function speakText(text, lang) {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    if (lang === 'Spanish') utterance.lang = 'es-ES';
    else if (lang === 'French') utterance.lang = 'fr-FR';
    else if (lang === 'English') utterance.lang = 'en-CA';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

function startRound() {
    clearTimeout(autopilotTimer);
    gameplay.draw();
    speakText(gameplay.state.questionSpeach, gameplay.state.questionLanguage);
    document.getElementById("cardHeader").innerText = gameplay.state.card.category || "";
    document.getElementById("cardTop").innerHTML = renderCardContent(gameplay.state.questionText);
    document.getElementById("cardEmoji").innerHTML = gameplay.state.questionEmoji;
    document.getElementById("cardBottom").innerHTML = "&nbsp;";
    document.getElementById("difficultyButtons").classList.add("hidden")
    document.getElementById("nextButtons").classList.add("hidden")
    document.getElementById("exitButton").classList.remove("hidden");

    document.getElementById("cardComment").innerHTML = "&nbsp;";
    document.getElementById("cardInfo").innerText = gameplay.state.card ? gameplay.state.card.summary() : '';
    if (autopilot) {
        autopilotTimer = setTimeout(finishRound, 6000);
    }
}

function finishRound() {
    clearTimeout(autopilotTimer); // Clear if triggered by user click
    gameplay.reveal();
    speakText(gameplay.state.answerSpeach, gameplay.state.answerLanguage);
    document.getElementById("cardBottom").innerHTML = renderCardContent(gameplay.state.answerText);
    document.getElementById("cardEmoji").innerHTML = gameplay.state.answerEmoji;
    if (gameplay.state.direction === "recognition") {
        document.getElementById("difficultyButtons").classList.add("hidden")
        document.getElementById("nextButtons").classList.remove("hidden");
    } else {
        document.getElementById("difficultyButtons").classList.remove("hidden");
        document.getElementById("nextButtons").classList.add("hidden")
    }

    document.getElementById("exitButton").classList.add("hidden")
    document.getElementById("cardComment").innerText = gameplay.state.card ? gameplay.state.card.comment : '';
    document.getElementById("cardInfo").innerText = gameplay.state.card ? gameplay.state.card.summary() : '';
    if (autopilot) {
        autopilotTimer = setTimeout(() => cycleRound(), 4000);
    }
}

function renderCardContent(text) {
    text = text.trim();
    if (text.startsWith("[") && text.endsWith("]")) {
        const inner = text.slice(1, -1).trim();
        const rows = inner.split(";").map(row => row.trim());

        let html = "<table style='width:100%; border-collapse: collapse;'>";
        rows.forEach(row => {
            const cells = row.split(",").map(cell => cell.trim());
            html += "<tr>";
            cells.forEach(cell => { html += `<td style=" border: 1px solid #ddd; padding: 2px; text-align: center; ">${cell}</td>`; });
            html += "</tr>";
        });
        html += "</table>";
        return html;
    }
    return text;
}

function cycleRound(difficulty = null, level = null) {
    if (difficulty !== null) {
        gameplay.rate(difficulty, level ?? gameplay.state.card.level);
    }
    startRound();
}

function endGame() {
    clearTimeout(autopilotTimer);
    gameplay.end();
    backToMenu()
}



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
        autoItem.innerHTML = autopilot
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

let autopilot = false;
let autopilotTimer = null;

function toggleAutopilot() {
    autopilot = !autopilot;
    clearTimeout(autopilotTimer); // Stop any active timers

    // If we are currently in a game and just turned it on, start the flow
    if (autopilot && !document.getElementById("studyArea").classList.contains("hidden")) {
        // If buttons are hidden, we are on the 'Question' side
        if (document.getElementById("nextButtons").classList.contains("hidden") &&
            document.getElementById("difficultyButtons").classList.contains("hidden")) {
            autopilotTimer = setTimeout(finishRound, 6000);
        } else {
            // We are on the 'Answer' side
            autopilotTimer = setTimeout(() => cycleRound(), 4000);
        }
    }

    refreshMenu();
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

window.startGame = startGame
window.startRound = startRound
window.finishRound = finishRound
window.cycleRound = cycleRound
window.endGame = endGame
window.toggleAutopilot = toggleAutopilot;
window.toggleSound = toggleSound // Updated global exposure
window.selectGame = selectGame
window.configureGame = configureGame
window.backToMenu = backToMenu
const screenCardEdit = new ApplicationScreenCardEdit(gameplay, { startRound, menu });
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