import { parseDate, formatDate } from "./Utilities.js"
import { Card } from "./Card.js"
import { Comment } from "./Comment.js"
import { Persistence } from "./Persistence.js"
import { Gameplay } from "./Gameplay.js"

//=============================================================================
// Globals
//
//=============================================================================
export const gameplay = new Gameplay(console);
gameplay.direction = "Recognition"; // Same default as in html


//=============================================================================
// UI Gameplay
//
//=============================================================================

function startGame(rank) {
    gameplay.initialize(rank);

    document.getElementById("configurationMenu").style.display = "none"
    document.getElementById("studyArea").style.display = "block"
    startRound()
}

function startRound() {
    gameplay.draw();
    document.getElementById("cardHeader").innerText = gameplay.state.card.category || "";
    document.getElementById("cardTop").innerHTML = renderCardContent(gameplay.state.questionText);
    document.getElementById("cardEmoji").innerHTML = gameplay.state.questionEmoji;
    document.getElementById("cardBottom").innerHTML = "";
    document.getElementById("difficultyButtons").style.display = "none"
    document.getElementById("nextButtons").style.display = "none"
    document.getElementById("exitButton").style.display = "inline-block";
    document.getElementById("cardInfo").innerText = gameplay.state.card ? gameplay.state.card.summary() : '';
}

function finishRound() {
    gameplay.reveal()
    document.getElementById("cardBottom").innerHTML = renderCardContent(gameplay.state.answerText);
    document.getElementById("cardEmoji").innerHTML = gameplay.state.answerEmoji;
    document.getElementById("difficultyButtons").style.display = gameplay.state.direction === "recall" ? "block" : "none";
    document.getElementById("nextButtons").style.display = gameplay.state.direction === "recognition" ? "block" : "none";
    document.getElementById("exitButton").style.display = "none";
    document.getElementById("cardComment").innerText = gameplay.state.card ? gameplay.state.card.comment : '';
    document.getElementById("cardInfo").innerText = gameplay.state.card ? gameplay.state.card.summary() : '';
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
    gameplay.end();
    backToMenu()
}



//=============================================================================
// Menu and Game Configuration
//
//=============================================================================
function toggleMenu() {
    const menu = document.getElementById("dropdownMenu");
    menu.style.display = (menu.style.display === "none") ? "block" : "none";
}

function toggleSoundMenuItem() {
    selectToggleSound();
    const item = document.getElementById("soundToggleItem");
    if (item) {
        item.innerHTML = gameplay.game.configuration.sound
            ? "&#128263; Mute Sound"
            : "&#128266; Enable Sound";
        document.getElementById("dropdownMenu").style.display = "none";
    }
}

function selectGame(name, language) {
    gameplay.game.name = name;
    gameplay.language = language;

    document.getElementById("gameMenu").style.display = "none"
    document.getElementById("configurationMenu").style.display = "block"
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
        label.innerHTML = `
            <input type="checkbox" id="${id}" checked>
            ${cat} (${counts[cat]})
        `;

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
    document.getElementById("gameMenu").style.display = "block"
    document.getElementById("configurationMenu").style.display = "none"
    document.getElementById("studyArea").style.display = "none"
    // hide editing and stats panels; old resetArea may not exist
    let edit = document.getElementById("editArea")
    if (edit) edit.style.display = "none"
    let reset = document.getElementById("resetArea")
    if (reset) reset.style.display = "none"
    document.getElementById("statsArea").style.display = "none"
    document.getElementById("editCardArea").style.display = "none"
}


//=============================================================================
// Card edit form
//
// Allows for a card to be edited in-game, when an error is found. Doing so
// abandons the card after edit and moves on to the next round - which is
// something that can be reconsidered in the future.
//=============================================================================
function showCardEdit() {
    document.getElementById("studyArea").style.display = "none"
    document.getElementById("editCardArea").style.display = "block"
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

    document.getElementById("editCardArea").style.display = "none"
    document.getElementById("studyArea").style.display = "block"
    startRound()
}

function cancelEdit() {
    document.getElementById("editCardArea").style.display = "none"
    document.getElementById("studyArea").style.display = "block"
}


//=============================================================================
// Game Dataset load and save
//
// Allows for the full export and re-load of game dataset in a pipe-separated
// file format. Currently has no error checking or validation on the file
// contents during upload - which is something to fix in the future.
//=============================================================================
let persistence = null;

function editGameDataset(name, language) {
    console.log(`Editing game=${name}, language=${language}.`)
    persistence = new Persistence(name, language);
    let items = persistence.loadDataset();


    let lines = [];
    items.forEach(item => {
        if (item.type === "Comment") {
            lines.push(item.value);
        } else {
            // It's a Card object
            lines.push([
                item.front,
                item.back,
                item.emoji || "",
                item.category || "",
                formatDate(item.added),
                formatDate(item.lastSeen),
                item.seen,
                item.penalty,
                item.level,
                item.comment || ""
            ].join(" | "));
        }
    });

    document.getElementById("gameMenu").style.display = "none";
    document.getElementById("editArea").style.display = "block";
    document.getElementById("editTitle").innerText = `Edit ${language} / ${name}`;
    document.getElementById("editBox").value = lines.join("\n");
}

function saveGameDataset() {
    let text = document.getElementById("editBox").value;
    let lines = text.split("\n");
    let cards = []; // This will now hold both Cards and Comment objects

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
            penalty: parseInt(parts[7]) || 0,
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
//
//=============================================================================
function statistics(name, language) {
    const dataset = Persistence.loadDatasetFrom(name, language);
    const cards = dataset.filter(item => item instanceof Card);
    const stats = calculateStatistics(cards);
    const html = renderStatistics(stats, language);
    document.getElementById("gameMenu").style.display = "none";
    document.getElementById("statsArea").style.display = "block";
    document.getElementById("statsTitle").innerText = `${language} Statistics`;
    document.getElementById("statsContent").innerHTML = html;
}

function renderStatistics(stats) {
    let html = `
        <p><strong>Total Cards:</strong> ${stats.total}</p>
        <p><strong>Never Seen:</strong> ${stats.unseen}</p>
        <p><strong>Today:</strong> ${stats.today}</p>
        <hr/>`;

    Object.keys(stats.levels) // Levels (numeric sort)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach(level => {
            html += `<p><strong>Level ${level}:</strong> ${stats.levels[level]}</p>`;
        });

    html += '<hr/>';

    Object.keys(stats.categories) // Categories (alphabetical)
        .sort()
        .forEach(cat => {
            html += `<p><strong>${cat}:</strong> ${stats.categories[cat]}</p>`;
        });

    return html;
}

function calculateStatistics(cards, now = new Date()) {
    const today = new Date(now).toISOString().slice(0, 10);
    console.log(`Calculate statistics for today='${today}'.`);
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
//
//=============================================================================




window.selectGameRank = v => gameplay.rank = v
window.selectGameDirection = v => gameplay.direction = v
window.selectGameSound = v => gameplay.sound = v;
window.selectToggleSound = () => gameplay.sound = !gameplay.sound;

window.startGame = startGame
window.startRound = startRound
window.finishRound = finishRound
window.cycleRound = cycleRound
window.endGame = endGame
window.toggleMenu = toggleMenu
window.toggleSoundMenuItem = toggleSoundMenuItem
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

// Add this to your Menu and Game Configuration section
window.addEventListener("click", function (event) {
    const menu = document.getElementById("dropdownMenu");
    const hamburger = document.getElementById("hamburger");

    // If the menu is open AND the click was NOT on the hamburger 
    // AND the click was NOT inside the menu itself...
    if (menu.style.display === "block" &&
        event.target !== hamburger &&
        !menu.contains(event.target)) {
        document.getElementById("dropdownMenu").style.display = "none";
    }
});

toggleSoundMenuItem();


