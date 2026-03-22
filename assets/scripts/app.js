

//=============================================================================
// Card.js
//
// A class representing a single flashcard, with front and back content.
//=============================================================================
class Card {
    constructor(data) {
        this.front = data.front;
        this.back = data.back;
        this.emoji = data.emoji || "";
        this.category = data.category || "";
        this.added = data.added || Date.now();
        this.lastSeen = data.lastSeen || null;
        this.seen = data.seen || 0;
        this.penalty = data.penalty || 0;
        this.level = data.level || 0;
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
// Game.js
//
//=============================================================================
class Game {
    constructor(name = null, language = null) {
        this.name = name;
        this.language = language;
        this.mode = 'recall';
        this.rank = 'normal'; // normal, new, hard, review

        this.configuration = {
            sound: true,
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
            roundComplete: false,
        }

        this.deck = this.#load(this.name, this.language)
    }

    draw() {
        game.state.roundComplete = false;
        game.state.card = this.#pickCard()

        let round = this.mode === "shuffle"
            ? Math.random() < 0.5 ? 'recognition' : 'recall'
            : this.mode;

        if (round === 'recognition') {
            game.state.questionText = game.state.card.front; // Foreign shown first.
            game.state.questionEmoji = ''; // Emoji would be clue to meaning.
            game.state.questionSpeach = game.state.card.front; // Speak the foreign at question time.
            game.state.answerText = game.state.card.back; // Reveal native answer.
            game.state.answerEmoji = game.state.emoji || ''; // Reveal emoji if any.
            game.state.answerSpeach = null; // Don't speak the native text.
        }
        else { // recall
            game.state.questionText = game.state.card.back; // Native shown first.
            game.state.questionEmoji = game.state.card.emoji || ''; // Show emoji if any.
            game.state.questionSpeach = ''; // Don't speak the native text.
            game.state.answerText = game.state.card.front; // Reveal foreign answer.
            game.state.answerEmoji = game.state.card.emoji || ''; // Emoji still shows.
            game.state.answerSpeach = game.state.card.front; // Speak the foreign text.
        }
    }

    rate(difficulty, level) {
        game.state.roundComplete = true;
        if (!this.state.card) return;
        this.state.card.rate(difficulty, level);
        this.#save(this.name, this.language);
    }

    #load(prefix, language) {
        let file = prefix + "_" + language;
        let raw = localStorage.getItem(prefix + "_" + language);
        let deck = raw ? JSON.parse(raw).map(c => new Card(c)) : [];
        console.log(`Loaded '${deck.length}' cards from '${file}'.`);
        return deck;
    }

    #save(prefix, language) {
        localStorage.setItem(prefix + "_" + language, JSON.stringify(this.deck))
    }

    #pickCard() {
        let enabled = this.deck.filter(c =>
            this.configuration.categories.has(c.category) && c.matches(this.rate)
        );

        if (enabled.length === 0) return null;

        // Sort for Review mode specifically
        if (this.rate === 'review') {
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


function saveDeck(prefix, lang) {
    localStorage.setItem(prefix + "_" + lang, JSON.stringify(game.deck))
}

//=============================================================================
// Globals
//
//=============================================================================
let game = new Game();


//=============================================================================
// UI Gameplay
//
//=============================================================================

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

    document.getElementById("difficultyButtons").style.display = "none"
    document.getElementById("startBtn").style.display = "none"
    document.getElementById("cardHeader").innerText = game.state.card.category || "";
    document.getElementById("cardTop").innerText = game.state.questionText;
    document.getElementById("cardEmoji").innerHTML = game.state.questionEmoji;
    document.getElementById("cardBottom").innerText = "";
    document.getElementById("cardInfo").innerText = game.state.card ? game.state.card.summary() : '';
    speakAndShowSpeaker(game.state.questionSpeach);
}

function finishRound() {
    console.log(`Flip: answer='${game.state.answerText}', speach='${game.state.answerSpeach}''`)
    document.getElementById("cardBottom").innerText = game.state.answerText;
    document.getElementById("cardEmoji").innerHTML = game.state.answerEmoji;
    document.getElementById("cardInfo").innerText = game.state.card ? game.state.card.summary() : '';
    document.getElementById("difficultyButtons").style.display = "block";
    speakAndShowSpeaker(game.state.answerSpeach);


}

function cycleRound(difficulty, level) {
    game.rate(difficulty, level);
    startRound();
}



function chooseLanguage(name, language) {
    game.name = name;
    game.language = language;
    game.mode = game.name === "verbs" ? 'recall' : game.mode;

    document.getElementById("mainMenu").style.display = "none"
    document.getElementById("modeMenu").style.display = "block"

    document.getElementById("languageTitle").innerText =
        game.language === "spanish" ? "Spanish" : "French"

    renderCategoryFilters(game.deck)
}

function renderCategoryFilters(deck) {
    const container = document.getElementById("categoryFilters");

    // Build category counts
    const counts = {};

    deck.forEach(card => {
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
    document.getElementById("mainMenu").style.display = "block"
    document.getElementById("modeMenu").style.display = "none"
    document.getElementById("studyArea").style.display = "none"
    // hide editing and stats panels; old resetArea may not exist
    let edit = document.getElementById("editArea")
    if (edit) edit.style.display = "none"
    let reset = document.getElementById("resetArea")
    if (reset) reset.style.display = "none"
    document.getElementById("statsArea").style.display = "none"
    document.getElementById("editCardArea").style.display = "none"
}

function startStudy(mode) {
    console.log("Starting '" + mode + "' mode.");
    game.mode = mode

    document.getElementById("modeMenu").style.display = "none"
    document.getElementById("studyArea").style.display = "block"
    document.getElementById("startBtn").style.display = "none"

    startRound()
}

function selectMode(mode) {
    game.mode = mode
}

function selectSound(sound) {
    game.configuration.sound = sound
}

function start(rank) {
    game.rate = rank;
    if (!game.mode) return
    startStudy(game.mode)
}

function exitStudy() {
    saveDeck(game.name, game.language)
    backToMenu()
}





function speakAndShowSpeaker(text) {
    if (!text) return;
    console.log(`Speak: '${text}' in language='${game.language}'`)
    speakText(text, game.language)
}

function showEditForm() {
    if (!game.state.card) return

    document.getElementById("studyArea").style.display = "none"
    document.getElementById("editCardArea").style.display = "block"

    document.getElementById("editFront").value = game.state.card.front
    document.getElementById("editBack").value = game.state.card.back
    document.getElementById("editEmoji").value = game.state.card.emoji || ""
    document.getElementById("editCategory").value = game.state.card.category || ""
}

function saveCardEdit() {
    if (!game.state.card) return

    game.state.card.front = document.getElementById("editFront").value.trim()
    game.state.card.back = document.getElementById("editBack").value.trim()
    game.state.card.emoji = document.getElementById("editEmoji").value.trim()
    game.state.card.category = document.getElementById("editCategory").value.trim()

    game.update()

    document.getElementById("editCardArea").style.display = "none"
    document.getElementById("studyArea").style.display = "block"

    // Refresh the current card display
    startRound()
}

function cancelEdit() {
    document.getElementById("editCardArea").style.display = "none"
    document.getElementById("studyArea").style.display = "block"
}


//---------------------------------------------------------------------
// Language Reset screen
//---------------------------------------------------------------------

function editLanguage(name, language) {
    let game = new Game(name, language);

    document.getElementById("mainMenu").style.display = "none"
    document.getElementById("editArea").style.display = "block"
    document.getElementById("editTitle").innerText = "Edit " + language

    // Convert language data to pipeline-separated format for editing
    let lines = []
    lines.push("#front|back|emoji|category|added|lastSeen|seen|penalty|level")
    game.deck.forEach(c => {
        lines.push(
            [
                c.front,
                c.back,
                c.emoji || "",
                c.category || "",
                formatDate(c.added),
                formatDate(c.lastSeen),
                c.seen,
                c.penalty,
                c.level
            ].join(" | ")
        )
    })
    document.getElementById("editBox").value = lines.join("\n")
}

function saveEdit() {
    let text = document.getElementById("editBox").value;
    let lines = text.split("\n");
    let newDeck = [];

    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith("#")) continue;
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
            level: parseInt(parts[8]) || 0
        });

        if (card.validate()) {
            newDeck.push(card);
        }
    }
    game.deck = newDeck;
    saveDeck(game.name, game.language)
    backToMenu();
}

function selectAllText() {
    document.getElementById("editBox").select()
}


//---------------------------------------------------------------------
// Language Statistics screen
//---------------------------------------------------------------------

function showStats(name, language) {
    var game = new Game(name, language);

    let total = game.deck.length
    let levelCounts = {}
    let categoryCounts = {}
    let neverSeen = 0

    game.deck.forEach(c => {

        let level = c.level
        if (levelCounts[level] === undefined) {
            levelCounts[level] = 0
        }
        levelCounts[level]++

        if (c.seen === 0) {
            neverSeen++
        }

        let cat = (c.category || "uncategorized").trim()
        if (!categoryCounts[cat]) {
            categoryCounts[cat] = 0
        }

        categoryCounts[cat]++
    })

    // Build stats display
    let todayCount = game.deck.filter(c => c.seen > 0 && formatDate(c.lastSeen) === today()).length;
    let html = `
                <p><strong>Total Cards:</strong> ${total}</p>
                <p><strong>Never Seen:</strong> ${neverSeen}</p>
                <p><strong>Today:</strong> ${todayCount}</p>
                <hr/>
            `

    // Sort levels numerically
    let levels = Object.keys(levelCounts).sort((a, b) => parseInt(a) - parseInt(b))
    levels.forEach(level => {
        let count = levelCounts[level]
        html += `<p><strong>Level ${level}:</strong> ${count}</p>`
    })
    html += '<hr/>'

    // Show category counts alphabetically
    let cats = Object.keys(categoryCounts).sort()
    cats.forEach(cat => {

        html += `<p><strong>${cat}:</strong> ${categoryCounts[cat]}</p>`

    })

    document.getElementById("mainMenu").style.display = "none"
    document.getElementById("statsArea").style.display = "block"
    document.getElementById("statsTitle").innerText = game.language.charAt(0).toUpperCase() + game.language.slice(1) + " Statistics"
    document.getElementById("statsContent").innerHTML = html
}


function speakText(text, lang) {
    if (!game.configuration.sound || !text) return

    // Create speech synthesis utterance
    const utterance = new SpeechSynthesisUtterance(text)

    // Set language based on current language
    if (lang === 'spanish') {
        utterance.lang = 'es-ES' // Spanish (Spain) - you can adjust to 'es-MX' for Mexican Spanish, etc.
    } else if (lang === 'french') {
        utterance.lang = 'fr-FR' // French (France)
    }

    // Optional: adjust speech properties
    utterance.rate = 0.9 // Slightly slower for learning
    utterance.pitch = 1

    // Speak the text
    window.speechSynthesis.speak(utterance)
}


//---------------------------------------------------------------------
// Utility functions 
//---------------------------------------------------------------------

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

function decodeHtmlEntities(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}


