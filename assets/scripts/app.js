import { parseDate, formatDate } from "./Utilities.js"
import { Card } from "./Card.js"
import { Comment } from "./Comment.js"
import { Persistence } from "./Persistence.js"
import { Gameplay } from "./Gameplay.js"

//=============================================================================
// Globals
//=============================================================================
export const gameplay = new Gameplay(console);
gameplay.direction = "Recognition";


//=============================================================================
// UI Gameplay
//=============================================================================

function startGame(rank) {
    gameplay.initialize(rank);

    document.getElementById("configurationMenu").classList.add("hidden")
    document.getElementById("studyArea").classList.remove("hidden");
    startRound()
}

function startRound() {
    clearTimeout(autopilotTimer);
    gameplay.draw();
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
    gameplay.reveal()
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
    gameplay.game.name = name;
    gameplay.language = language;

    document.getElementById("gameMenu").classList.add("hidden")
    document.getElementById("configurationMenu").classList.remove("hidden");
    document.getElementById("languageTitle").innerText = gameplay.language

    configureGame()
}

function configureGame() {
    gameplay.game.load();
    const container = document.getElementById("categoryFilters");

    // Build category counts
    const counts = {};
    gameplay.game.deck.forEach(card => {
        const cat = card.category || "Uncategorized";
        counts[cat] = (counts[cat] || 0) + 1;
    });

    const categories = Object.keys(counts).sort();

    // default: all selected
    gameplay.game.configuration.categories = new Set(categories);

    container.innerHTML = "";
    categories.forEach(cat => {
        const id = "cat_" + cat.replace(/\s+/g, "_");
        const label = document.createElement("label");
        label.innerHTML = `<p><input type="checkbox" id="${id}" checked>${cat} (${counts[cat]})</p>`;

        const checkbox = label.querySelector("input");
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                gameplay.game.configuration.categories.add(cat);
            } else {
                gameplay.game.configuration.categories.delete(cat);
            }
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
// Card edit form
//=============================================================================
function showCardEdit() {
    menu.classList.add("hidden"); // Close menu
    document.getElementById("studyArea").classList.add("hidden")
    document.getElementById("editCardArea").classList.remove("hidden");
    document.getElementById("editFront").value = gameplay.state.card.front
    document.getElementById("editBack").value = gameplay.state.card.back
    document.getElementById("editEmoji").value = gameplay.state.card.emoji || ""
    document.getElementById("editCategory").value = gameplay.state.card.category || ""
    document.getElementById("editComment").value = gameplay.state.card.comment || ""
}

function saveCardEdit() {
    gameplay.state.card.front = document.getElementById("editFront").value.trim()
    gameplay.state.card.back = document.getElementById("editBack").value.trim()
    gameplay.state.card.emoji = document.getElementById("editEmoji").value.trim()
    gameplay.state.card.category = document.getElementById("editCategory").value.trim()
    gameplay.state.card.comment = document.getElementById("editComment").value.trim()

    Persistence.saveDatasetTo(gameplay.game.name, gameplay.language, gameplay.game.dataset)

    document.getElementById("editCardArea").classList.add("hidden")
    document.getElementById("studyArea").classList.remove("hidden");
    startRound()
}

function cancelEdit() {
    document.getElementById("editCardArea").classList.add("hidden")
    document.getElementById("studyArea").classList.remove("hidden");
}


//=============================================================================
// Game Dataset load and save
//=============================================================================
let persistence = null;

function editGameDataset(name, language) {
    persistence = new Persistence(name, language);
    let items = persistence.loadDataset();

    let lines = [];
    items.forEach(item => {
        if (item.type === "Comment") {
            lines.push(item.value);
        } else {
            lines.push([
                item.front,
                item.back,
                item.emoji || "",
                item.category || "",
                formatDate(item.added),
                formatDate(item.lastSeen),
                item.seen,
                item.penalty.toFixed(4),
                item.level,
                item.comment || ""
            ].join(" | "));
        }
    });

    document.getElementById("gameMenu").classList.add("hidden")
    document.getElementById("editArea").classList.remove("hidden");
    document.getElementById("editTitle").innerText = `Edit ${language} / ${name}`;
    document.getElementById("editBox").value = lines.join("\n");
}

function saveGameDataset() {
    let text = document.getElementById("editBox").value;
    let lines = text.split("\n");
    let cards = [];

    for (let line of lines) {
        let trimmed = line.trim();

        if (trimmed.startsWith("#") || !trimmed) {
            cards.push(new Comment(trimmed));
            continue;
        }

        let parts = line.split("|");
        let card = new Card({
            front: parts[0].trim(),
            back: parts[1].trim(),
            emoji: parts[2].trim() || "",
            category: parts[3].trim() || "",
            added: parseDate(parts[4].trim()),
            lastSeen: parseDate(parts[5].trim()),
            seen: parseInt(parts[6]) || 0,
            penalty: parseFloat(parts[7]) || 0,
            level: parseInt(parts[8]) || 0,
            comment: parts[9]?.trim() || ""
        });

        if (card.validate()) {
            cards.push(card);
        }
    }

    persistence.saveDataset(cards);
    persistence = null;
    backToMenu();
}

function selectAllText() {
    document.getElementById("editBox").select()
}



//=============================================================================
// Language Statistics screen
//=============================================================================
function statistics(name, language) {
    const dataset = Persistence.loadDatasetFrom(name, language);
    const cards = dataset.filter(item => item instanceof Card);
    const stats = calculateStatistics(cards);
    const html = renderStatistics(stats, language);
    document.getElementById("gameMenu").classList.add("hidden")
    document.getElementById("statsArea").classList.remove("hidden");
    document.getElementById("statsTitle").innerText = `${language} Statistics`;
    document.getElementById("statsContent").innerHTML = html;
}

function renderStatistics(stats) {
    let html = `
        <p><strong>Total Cards:</strong> ${stats.total}</p>
        <p><strong>Never Seen:</strong> ${stats.unseen}</p>
        <p><strong>Today:</strong> ${stats.today}</p>
        <hr/>`;

    Object.keys(stats.levels)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach(level => {
            html += `<p><strong>Level ${level}:</strong> ${stats.levels[level]}</p>`;
        });

    html += '<hr/>';

    Object.keys(stats.categories)
        .sort()
        .forEach(cat => {
            html += `<p><strong>${cat}:</strong> ${stats.categories[cat]}</p>`;
        });

    return html;
}

function calculateStatistics(cards, now = new Date()) {
    const today = new Date(now).toISOString().slice(0, 10);
    return {
        total: cards.length,
        today: cards.filter(c => c.seen > 0 && c.lastSeen && new Date(c.lastSeen).toISOString().slice(0, 10) === today).length,
        unseen: cards.filter(c => c.seen === 0).length,
        levels: cards.reduce((a, c) => (a[c.level] = (a[c.level] || 0) + 1, a), {}),
        categories: cards.reduce((a, c) => (a[c.category] = (a[c.category] || 0) + 1, a), {})
    };
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
window.showCardEdit = showCardEdit
window.saveCardEdit = saveCardEdit
window.cancelEdit = cancelEdit
window.editGameDataset = editGameDataset
window.saveGameDataset = saveGameDataset
window.selectAllText = selectAllText
window.statistics = statistics

// Initial render of menu items
refreshMenu();