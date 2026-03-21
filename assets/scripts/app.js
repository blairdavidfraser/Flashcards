
let currentGame = null
let currentLang = null
let currentMode = 'recall'  // default to recall mode
let currentQuestionSide = 'front';
let filterMode = null
let soundEnabled = true
let selectedCategories = new Set();
let deck = []
let currentCard = null
let showingAnswer = false
let shuffleFlip = false  // toggle for shuffle mode


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

    rate(difficulty, newLevel) {
        this.seen++;
        this.lastSeen = Date.now();
        this.level = newLevel;
        this.penalty += (3 - difficulty);
    }

    matches(mode) {
        const fiveDaysAgo = Date.now() - (86400000 * 5);
        switch (mode) {
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
        let added = parseDate(currentCard.added)
        let last = currentCard.lastSeen ? new Date(currentCard.lastSeen) : null
        let seen = currentCard.seen || 0
        return `level ${currentCard.level} (${currentCard.penalty}), added ${formatDate(added)}, ` +
            `last seen ${last ? formatDate(last) : 'never'}, seen ${seen}`
    }
}










function loadDeck(game, lang) {
    let raw = localStorage.getItem(game + "_" + lang);
    if (!raw) return [];
    let arr = JSON.parse(raw);
    // Convert plain objects from JSON into Card class instances
    return arr.map(c => new Card(c));
}

function saveDeck(game, lang) {
    localStorage.setItem(game + "_" + lang, JSON.stringify(deck))
}

function chooseLanguage(game, lang) {
    currentLang = lang
    currentGame = game
    currentMode = currentGame === "verbs" ? 'recall' : currentMode;

    document.getElementById("mainMenu").style.display = "none"
    document.getElementById("modeMenu").style.display = "block"

    document.getElementById("languageTitle").innerText =
        lang === "spanish" ? "Spanish" : "French"

    deck = loadDeck(game, lang)
    renderCategoryFilters(deck)
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
    selectedCategories = new Set(categories);

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
                selectedCategories.add(cat);
            } else {
                selectedCategories.delete(cat);
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
    currentMode = mode

    document.getElementById("modeMenu").style.display = "none"
    document.getElementById("studyArea").style.display = "block"

    document.getElementById("startBtn").style.display = "none"

    nextCard()

}

function selectMode(mode) {
    currentMode = mode
    filterMode = null
}

function selectSound(enabled) {
    soundEnabled = enabled
}

function startNormal() {
    filterMode = 'normal'
    if (!currentMode) return
    startStudy(currentMode)
}

function startNew() {
    filterMode = 'new'
    if (!currentMode) return
    startStudy(currentMode)
}

function startHard() {
    filterMode = 'hard'
    if (!currentMode) return
    startStudy(currentMode)
}

function startReview() {
    filterMode = 'review'
    if (!currentMode) return
    startStudy(currentMode)
}

function exitStudy() {

    saveDeck(currentGame, currentLang)
    backToMenu()

}

function pickCard() {
    let enabled = deck.filter(c =>
        selectedCategories.has(c.category) && c.matches(filterMode)
    );

    if (enabled.length === 0) return null;

    // 2. Sort for Review mode specifically
    if (filterMode === 'review') {
        return enabled
            .sort((a, b) => a.lastSeen - b.lastSeen)
            .slice(0, 100)[Math.floor(Math.random() * Math.min(enabled.length, 100))];
    }

    // 3. Weighted Random Selection using the class method
    let weights = enabled.map(c => c.priority());
    let total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;

    for (let i = 0; i < enabled.length; i++) {
        r -= weights[i];
        if (r <= 0) return enabled[i]; // Returns one card
    }

    return enabled[0]; // Fallback to first card, not the whole list
}

function handleCardFlip() {
    if (!currentCard || showingAnswer) return;

    showingAnswer = true;
    const answerSide = (currentQuestionSide === 'front') ? 'back' : 'front';
    const answerText = currentCard[answerSide];

    document.getElementById("cardBottom").innerText = answerText;

    if (answerSide === 'front') {
        speakAndShowSpeaker(currentCard.front);
    } else {
        document.getElementById("cardEmoji").innerHTML = currentCard.emoji || "";
    }

    document.getElementById("cardInfo").innerText = currentCard ? currentCard.summary() : '';
    document.getElementById("difficultyButtons").style.display = "block";
}

function nextCard() {
    showingAnswer = false;
    currentCard = pickCard()

    if (!currentCard) {

        document.getElementById("cardTop").innerText = "No cards."
        document.getElementById("cardBottom").innerText = ""
        document.getElementById("cardHeader").innerText = ""
        document.getElementById("cardEmoji").innerHTML = ""
        return

    }


    // Logic to determine which side is the question
    if (currentMode === "recall") {
        currentQuestionSide = 'back';
    } else if (currentMode === "recognition") {
        currentQuestionSide = 'front';
    } else if (currentMode === "shuffle") {
        currentQuestionSide = shuffleFlip ? 'back' : 'front';
        shuffleFlip = !shuffleFlip;
    }

    const questionText = currentCard[currentQuestionSide]; // Dynamic access

    document.getElementById("cardTop").innerText = questionText;
    document.getElementById("cardBottom").innerText = "";
    document.getElementById("cardHeader").innerText = currentCard.category || "";

    // If the question is the foreign side (front), speak it and hide emoji
    if (currentQuestionSide === 'front') {
        document.getElementById("cardEmoji").innerHTML = "";
        speakAndShowSpeaker(currentCard.front);
    } else {
        document.getElementById("cardEmoji").innerHTML = currentCard.emoji || "";
    }

    document.getElementById("cardInfo").innerText = currentCard ? currentCard.summary() : '';
    document.getElementById("difficultyButtons").style.display = "none"
    document.getElementById("startBtn").style.display = "none"

}

function rate(d, l) {
    if (!currentCard) return;

    // Use the method defined in the Card class
    currentCard.rate(d, l);

    saveDeck(currentGame, currentLang);
    nextCard();
}

function speakAndShowSpeaker(text) {

    speakText(text, currentLang)

    const footer = document.getElementById("cardFooter")

    footer.innerHTML =
        '<span style="float:left;cursor:pointer;" onclick="speakText(currentCard.front,currentLang)">&#x1F508;</span>' +
        '<a href="#" onclick="showEditForm();return false;" style="color:#ccc;text-decoration:none;">edit</a>'
}

function showEditForm() {
    if (!currentCard) return

    document.getElementById("studyArea").style.display = "none"
    document.getElementById("editCardArea").style.display = "block"

    document.getElementById("editFront").value = currentCard.front
    document.getElementById("editBack").value = currentCard.back
    document.getElementById("editEmoji").value = currentCard.emoji || ""
    document.getElementById("editCategory").value = currentCard.category || ""
}

function saveCardEdit() {
    if (!currentCard) return

    currentCard.front = document.getElementById("editFront").value.trim()
    currentCard.back = document.getElementById("editBack").value.trim()
    currentCard.emoji = document.getElementById("editEmoji").value.trim()
    currentCard.category = document.getElementById("editCategory").value.trim()

    saveDeck(currentGame, currentLang)

    document.getElementById("editCardArea").style.display = "none"
    document.getElementById("studyArea").style.display = "block"

    // Refresh the current card display
    nextCard()
}

function cancelEdit() {
    document.getElementById("editCardArea").style.display = "none"
    document.getElementById("studyArea").style.display = "block"
}


//---------------------------------------------------------------------
// Language Reset screen
//---------------------------------------------------------------------

function editLanguage(game, lang) {
    currentLang = lang
    currentGame = game
    deck = loadDeck(game, lang)

    document.getElementById("mainMenu").style.display = "none"
    document.getElementById("editArea").style.display = "block"
    document.getElementById("editTitle").innerText = "Edit " + lang

    // Convert language data to pipeline-separated format for editing
    let lines = []
    lines.push("#front|back|emoji|category|added|lastSeen|seen|penalty|level")
    deck.forEach(c => {
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
    deck = newDeck;
    saveDeck(currentGame, currentLang);
    backToMenu();
}

function selectAllText() {
    document.getElementById("editBox").select()
}


//---------------------------------------------------------------------
// Language Statistics screen
//---------------------------------------------------------------------

function showStats(game, lang) {
    deck = loadDeck(game, lang)

    let total = deck.length
    let levelCounts = {}
    let categoryCounts = {}
    let neverSeen = 0

    deck.forEach(c => {

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
    let todayCount = deck.filter(c => c.seen > 0 && formatDate(c.lastSeen) === today()).length;
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
    document.getElementById("statsTitle").innerText = lang.charAt(0).toUpperCase() + lang.slice(1) + " Statistics"
    document.getElementById("statsContent").innerHTML = html
}


function speakText(text, lang) {
    if (!soundEnabled || !text) return

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


