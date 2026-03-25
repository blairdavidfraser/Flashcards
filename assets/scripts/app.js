

//=============================================================================
// Card.js
//
// A class representing a single flashcard, with front and back content.
//=============================================================================
class Card {
    constructor(data) {
        this.type = "Card";
        this.front = data.front.trim();
        this.back = data.back.trim();
        this.emoji = data.emoji.trim() || "";
        this.category = data.category.trim() || "uncategorized";
        this.added = data.added || Date.now();
        this.lastSeen = data.lastSeen || null;
        this.seen = data.seen || 0;
        this.penalty = data.penalty || 0;
        this.level = data.level || 0;
        this.comment = data.comment || null;
    }

    validate() {
        const okFront = this.front && this.front.trim().length > 0;
        const okBack = this.back && this.back.trim().length > 0;
        return okFront && okBack;
    }

    rate(difficulty, level) {
        this.seen++;
        this.lastSeen = Date.now();
        this.level = level;
        this.penalty += (3 - difficulty);
    }

    matches(level) {
        const fiveDaysAgo = Date.now() - (86400000 * 5);
        switch (level) {
            case 'normal':
                return this.level >= 0;
            case 'new':
                return this.level >= 0 && (this.seen < 3 || this.added > fiveDaysAgo);
            case 'hard':
                return this.level >= 1;
            case 'review':
                return this.level === -1;
            default:
                return this.level >= 0;
        }
    }

    priority() {
        const failRate = (this.penalty < 0) ? Math.abs(this.penalty) + 1 : 1;
        const isRecent = (Date.now() - this.added) < (86400000 * 7);
        const recentBoost = isRecent ? 3 : 1;
        const seenPenalty = Math.max(1, this.seen / 5);
        return (failRate * recentBoost) / seenPenalty;
    }

    summary() {
        let added = parseDate(game.state.card.added)
        let last = game.state.card.lastSeen ? new Date(game.state.card.lastSeen) : null
        let seen = game.state.card.seen || 0
        return `level ${game.state.card.level} (${game.state.card.penalty}), added ${formatDate(added)}, ` +
            `last seen ${last ? formatDate(last) : 'never'}, seen ${seen}`
    }
}


//=============================================================================
// Comment.js
//
// A class representing a single in the dataset file.
//=============================================================================
class Comment {
    constructor(value) {
        this.type = "Comment";
        this.value = value.trim();
    }
}

//=============================================================================
// Game.js
//
//=============================================================================
class Game {
    constructor(name = null, language = null) {
        this.name = name;
        this.language = language;
        this.direction = 'recall';
        this.rank = 'normal'; // normal, new, hard, review

        this.configuration = {
            sound: false, // will toggle to true on document load
            categories: new Set()
        };

        this.state = {
            card: null,
            questionText: null,
            questionEmoji: null,
            questionSpeach: null,
            answerText: null,
            answerEmoji: null,
            answerSpeach: null,
            answerComment: null
        }
    }

    load() {
        console.log(`Loading game name='${this.name}' in language='${this.language}'`)
        this.dataset = Persistence.loadDatasetFrom(this.name, this.language);
        this.deck = this.dataset.filter(item => item instanceof Card);
    }

    draw() {
        game.state.card = this.#pickCard()

        let round = this.direction === "shuffle"
            ? Math.random() < 0.5 ? 'recognition' : 'recall'
            : this.direction;

        if (round === 'recognition') {
            game.state.questionText = game.state.card.front; // Foreign shown first.
            game.state.questionEmoji = ''; // Emoji would be clue to meaning.
            game.state.questionSpeach = game.state.card.front; // Speak the foreign at question time.
            game.state.answerText = game.state.card.back; // Reveal native answer.
            game.state.answerEmoji = game.state.card.emoji || ''; // Reveal emoji if any.
            game.state.answerSpeach = null; // Don't speak the native text.
            game.state.answerComment = game.state.card.comment || null; // Show comment if any.
        }
        else { // recall
            game.state.questionText = game.state.card.back; // Native shown first.
            game.state.questionEmoji = game.state.card.emoji || ''; // Show emoji if any.
            game.state.questionSpeach = ''; // Don't speak the native text.
            game.state.answerText = game.state.card.front; // Reveal foreign answer.
            game.state.answerEmoji = game.state.card.emoji || ''; // Emoji still shows.
            game.state.answerSpeach = game.state.card.front; // Speak the foreign text.
            game.state.answerComment = game.state.card.comment || null; // Show comment if any.
        }
    }

    rate(difficulty, level) {
        if (!this.state.card) return;
        this.state.card.rate(difficulty, level);
        Persistence.saveDatasetTo(this.name, this.language, this.dataset);
    }

    #pickCard() {
        // Filter to ensure we only work with actual Card instances
        let enabled = this.deck.filter(c =>
            this.configuration.categories.has(c.category) &&
            c.matches(this.rank) // Note: fixed 'this.rate' to 'this.rank' which appears to be a bug in your original code
        );

        if (enabled.length === 0) return null;

        // Sort for Review mode specifically
        if (this.rank === 'review') {
            return enabled
                .sort((a, b) => a.lastSeen - b.lastSeen)
                .slice(0, 100)[Math.floor(Math.random() * Math.min(enabled.length, 100))];
        }

        // Weighted Random Selection using the class method
        let weights = enabled.map(c => c.priority());
        let total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < enabled.length; i++) {
            r -= weights[i];
            if (r <= 0) return enabled[i]; // Returns one card
        }

        return enabled[0]; // Fallback to first card, not the whole list
    }
}


//=============================================================================
// Persistence
//
//=============================================================================
class Persistence {

    constructor(name, language) {
        this.name = name;
        this.language = language;
    }

    loadDataset() { return Persistence.loadDatasetFrom(this.name, this.language) }
    saveDataset(items) { Persistence.saveDatasetTo(this.name, this.language, items) }

    static loadDatasetFrom(name, language) {
        let filename = Persistence.#filename(name, language);
        let raw = localStorage.getItem(filename);
        if (!raw) return [];

        let data = JSON.parse(raw);
        return data.map(item => {
            if (item.type === "Comment") return new Comment(item.value);
            return new Card(item);
        });
    }

    static saveDatasetTo(name, language, items) {
        let filename = Persistence.#filename(name, language)
        localStorage.setItem(filename, JSON.stringify(items))
        console.log(`Saved '${items.length}' items to '${filename}'.`);
    }

    static #filename(prefix, suffix) { return `${prefix}_${suffix}` }

}


//=============================================================================
// Globals
//
//=============================================================================
let game = new Game();

function selectGame(name, language) { game.name = name; game.language = language }
function selectGameRank(rank) { game.rank = rank }
function selectGameDirection(direction) { game.direction = direction }
function selectGameSound(sound) { game.configuration.sound = sound }

function selectToggleSound() {
    game.configuration.sound = !game.configuration.sound;
}




//=============================================================================
// UI Gameplay
//
//=============================================================================

function startGame(rank) {
    selectGameRank(rank)
    game.load();

    console.log(`Starting game in rank='${game.rank}', direction='${game.direction}'.`);
    document.getElementById("configurationMenu").style.display = "none"
    document.getElementById("studyArea").style.display = "block"
    startRound()
}

function startRound() {
    game.draw();

    console.log(`Start round: question='${game.state.questionSpeach}', answer='${game.state.answerSpeach}'.`)
    if (!game.state.card) {
        document.getElementById("cardTop").innerText = "No cards."
        document.getElementById("cardBottom").innerText = ""
        document.getElementById("cardHeader").innerText = ""
        document.getElementById("cardEmoji").innerHTML = ""
        return;
    }

    document.getElementById("cardHeader").innerText = game.state.card.category || "";
    document.getElementById("cardTop").innerHTML = renderCardContent(game.state.questionText);
    document.getElementById("cardEmoji").innerHTML = game.state.questionEmoji;
    document.getElementById("cardBottom").innerHTML = "";
    document.getElementById("difficultyButtons").style.display = "none"
    document.getElementById("exitButton").style.display = "inline-block";
    document.getElementById("cardInfo").innerText = game.state.card ? game.state.card.summary() : '';
    speakText(game.state.questionSpeach, game.language);
}

function finishRound() {
    console.log(`Flip: answer='${game.state.answerText}', speach='${game.state.answerSpeach}''`)
    document.getElementById("cardBottom").innerHTML = renderCardContent(game.state.answerText);
    document.getElementById("cardEmoji").innerHTML = game.state.answerEmoji;
    document.getElementById("difficultyButtons").style.display = "block";
    document.getElementById("exitButton").style.display = "none";
    document.getElementById("cardComment").innerText = game.state.card ? game.state.card.comment : '';
    document.getElementById("cardInfo").innerText = game.state.card ? game.state.card.summary() : '';
    speakText(game.state.answerSpeach, game.language);
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
            cells.forEach(cell => { html += `<td style=" border: 1px solid #ddd; padding: 4px; text-align: center; ">${cell}</td>`; });
            html += "</tr>";
        });
        html += "</table>";
        return html;
    }
    return text;
}

function cycleRound(difficulty, level) {
    game.rate(difficulty, level);
    startRound();
}

function endGame() {
    Persistence.saveDatasetTo(game.name, game.language, game.dataset)
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
    item.innerHTML = game.configuration.sound
        ? "&#128263; Mute Sound"
        : "&#128266; Enable Sound";
    document.getElementById("dropdownMenu").style.display = "none";
}

function selectGame(name, language) {
    game.name = name;
    game.language = language;

    document.getElementById("gameMenu").style.display = "none"
    document.getElementById("configurationMenu").style.display = "block"
    document.getElementById("languageTitle").innerText = game.language

    configureGame()
}

function configureGame() {
    game.load();
    const container = document.getElementById("categoryFilters");

    // Build category counts
    const counts = {};
    game.deck.forEach(card => {
        const cat = card.category || "Uncategorized";
        counts[cat] = (counts[cat] || 0) + 1;
    });

    const categories = Object.keys(counts).sort();

    // default: all selected
    game.configuration.categories = new Set(categories);

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
                game.configuration.categories.add(cat);
            } else {
                game.configuration.categories.delete(cat);
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
    document.getElementById("editFront").value = game.state.card.front
    document.getElementById("editBack").value = game.state.card.back
    document.getElementById("editEmoji").value = game.state.card.emoji || ""
    document.getElementById("editCategory").value = game.state.card.category || ""
}

function saveCardEdit() {
    game.state.card.front = document.getElementById("editFront").value.trim()
    game.state.card.back = document.getElementById("editBack").value.trim()
    game.state.card.emoji = document.getElementById("editEmoji").value.trim()
    game.state.card.category = document.getElementById("editCategory").value.trim()

    Persistence.saveDatasetTo(game.name, game.language, game.dataset)

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
    let items = persistence.loadDataset(); // This now returns mixed objects

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
    document.getElementById("editTitle").innerText = "Edit " + language;
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
            comment: parts[9].trim()
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
    let dataset = Persistence.loadDatasetFrom(name, language);
    let cards = dataset.filter(item => item instanceof Card);

    let nTotal = cards.length
    let nToday = cards.filter(c => c.seen > 0 && formatDate(c.lastSeen) === today()).length;
    let nUnseen = cards.filter(c => c.seen === 0).length;
    let nLevels = cards.reduce((a, c) => (a[c.level] = (a[c.level] || 0) + 1, a), {});
    let nCategories = cards.reduce((a, c) => (a[c.category] = (a[c.category] || 0) + 1, a), {});

    // Build stats display
    let html = `
                <p><strong>Total Cards:</strong> ${nTotal}</p>
                <p><strong>Never Seen:</strong> ${nUnseen}</p>
                <p><strong>Today:</strong> ${nToday}</p>
                <hr/>
            `

    // Sort levels numerically
    let levels = Object.keys(nLevels).sort((a, b) => parseInt(a) - parseInt(b))
    levels.forEach(level => {
        html += `<p><strong>Level ${level}:</strong> ${nLevels[level]}</p>`
    })
    html += '<hr/>'

    // Show category counts alphabetically
    let cats = Object.keys(nCategories).sort()
    cats.forEach(cat => {
        html += `<p><strong>${cat}:</strong> ${nCategories[cat]}</p>`
    })

    document.getElementById("gameMenu").style.display = "none"
    document.getElementById("statsArea").style.display = "block"
    document.getElementById("statsTitle").innerText = `${language} Statistics`
    document.getElementById("statsContent").innerHTML = html
}



//=============================================================================
// Utility functions 
//
//=============================================================================

function today() {
    return new Date().toISOString().slice(0, 10)
}

function formatDate(epoch) {
    if (!epoch) return ""
    return new Date(epoch).toISOString().slice(0, 10)
}

function parseDate(d) {
    if (!d) return Date.now()
    return new Date(d).getTime()
}

function speakText(text, lang) {
    if (!game.configuration.sound || !text) return

    // Create speech synthesis utterance
    const utterance = new SpeechSynthesisUtterance(text)

    // Set language based on current language
    if (lang === 'Spanish') {
        utterance.lang = 'es-ES' // Spanish (Spain) - you can adjust to 'es-MX' for Mexican Spanish, etc.
    } else if (lang === 'French') {
        utterance.lang = 'fr-FR' // French (France)
    }

    // Optional: adjust speech properties
    utterance.rate = 0.9 // Slightly slower for learning
    utterance.pitch = 1

    // Speak the text
    window.speechSynthesis.speak(utterance)
}




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