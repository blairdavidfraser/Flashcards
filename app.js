
const STORAGE_PREFIX = "flashcards_"

let currentLang = null
let currentMode = null
let filterMode = null
let soundEnabled = true
let deck = []
let currentCard = null
let showingAnswer = false
let shuffleFlip = false  // toggle for shuffle mode


function loadDeck(lang) {

    let raw = localStorage.getItem(STORAGE_PREFIX + lang)
    if (!raw) return []
    let arr = JSON.parse(raw)
    arr.forEach(c => {
        if (c.enabled !== undefined) {
            // old boolean format
            c.level = c.enabled ? 0 : -1
            delete c.enabled
        }
        if (c.level === undefined) {
            c.level = 0
        }
        if (c.penalty === undefined) {
            c.penalty = 0
        }
    })
    return arr
}

function saveDeck(lang) {
    localStorage.setItem(STORAGE_PREFIX + lang, JSON.stringify(deck))
}

function chooseLanguage(lang) {
    currentLang = lang
    currentMode = 'recall'

    document.getElementById("mainMenu").style.display = "none"
    document.getElementById("modeMenu").style.display = "block"

    document.getElementById("languageTitle").innerText =
        lang === "spanish" ? "Spanish" : "French"

    deck = loadDeck(lang)
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

    saveDeck(currentLang)
    backToMenu()

}

function pickCard() {

    let enabled = deck

    // Apply filter mode
    if (filterMode === 'normal') {
        enabled = enabled.filter(c => c.level >= 0)
    } else if (filterMode === 'new') {
        enabled = enabled.filter(c => c.level >= 0 && (c.seen < 3 || (Date.now() - parseDate(c.added)) < 86400000 * 5))
    } else if (filterMode === 'hard') {
        enabled = enabled.filter(c => c.level >= 1)
    } else if (filterMode === 'review') {
        enabled = enabled
            .filter(c => c.level === -1)
            .sort((a, b) => parseDate(a.lastSeen) - parseDate(b.lastSeen))
            .slice(0, 100)
    } else {
        // default to normal if no filter mode set
        enabled = enabled.filter(c => c.level >= 0)
    }

    if (enabled.length === 0) return null

    let weights = enabled.map(c => {

        let failRate = (c.penalty < 0) ? Math.abs(c.penalty) + 1 : 1
        let recentBoost = (Date.now() - c.added) < 86400000 * 7 ? 3 : 1
        let seenPenalty = Math.max(1, c.seen / 5)

        return failRate * recentBoost / seenPenalty

    })

    let total = weights.reduce((a, b) => a + b, 0)

    let r = Math.random() * total

    for (let i = 0; i < enabled.length; i++) {

        r -= weights[i]

        if (r <= 0) return enabled[i]

    }

    return enabled[0]

}

function nextCard() {

    currentCard = pickCard()

    if (!currentCard) {

        document.getElementById("cardTop").innerText = "No cards."
        document.getElementById("cardBottom").innerText = ""
        document.getElementById("cardHeader").innerText = ""
        document.getElementById("cardEmoji").innerHTML = ""
        return

    }

    showingAnswer = false

    // determine question text
    let question;
    if (currentMode === "recall") {
        question = currentCard.back
    } else if (currentMode === "recognition") {
        question = currentCard.front
    } else if (currentMode === "shuffle") {
        // alternate front/back first each card
        question = shuffleFlip ? currentCard.back : currentCard.front
        shuffleFlip = !shuffleFlip
    } else {
        // fallback
        question = currentCard.back
    }
    currentCard.showFront = question === currentCard.front

    document.getElementById("cardTop").innerText = question
    document.getElementById("cardBottom").innerText = ""
    document.getElementById("cardHeader").innerText = currentCard.category || ""
    document.getElementById("cardFooter").innerHTML = '<a href="#" onclick="showEditForm();return false;" style="color:#ccc;text-decoration:none;">edit</a>'

    // Emoji + sound behavior
    if (currentCard.showFront) {
        // If front (foreign) is shown first, no emoji and speak front immediately. The 
        // emoji would be a clue.
        document.getElementById("cardEmoji").innerHTML = ""
        speakAndShowSpeaker(currentCard.front)
    } else {
        // If back (native) is shown first, show emoji, but only speak when user clicks to 
        // reveal the front.
        document.getElementById("cardEmoji").innerHTML = currentCard.emoji || ""
    }

    updateCardInfo()
    document.getElementById("difficultyButtons").style.display = "none"
    document.getElementById("startBtn").style.display = "none"

}

document.getElementById("card").onclick = function () {

    if (!currentCard) return

    if (showingAnswer) return

    showingAnswer = true

    let answer = currentCard.showFront
        ? currentCard.back
        : currentCard.front

    document.getElementById("cardBottom").innerText = answer

    // If the front (foreign) is revealed now, speak it. If back (native) is
    // revealed now, show the emoji.
    if (!currentCard.showFront) {
        speakAndShowSpeaker(currentCard.front)
    } else {
        document.getElementById("cardEmoji").innerHTML = currentCard.emoji || ""
    }

    updateCardInfo()
    document.getElementById("difficultyButtons").style.display = "block"

}

function rate(d, l) {
    if (!currentCard) return

    currentCard.seen++
    currentCard.lastSeen = Date.now()
    currentCard.level = l
    currentCard.penalty += (3 - d)

    saveDeck(currentLang)
    nextCard()
}

function speakAndShowSpeaker(text) {

    speakText(text, currentLang)

    const footer = document.getElementById("cardFooter")

    footer.innerHTML =
        '<span style="float:left;cursor:pointer;" onclick="speakText(currentCard.front,currentLang)">&#x1F508;</span>' +
        '<a href="#" onclick="showEditForm();return false;" style="color:#ccc;text-decoration:none;">edit</a>'
}

function updateCardInfo() {
    if (!currentCard) {
        document.getElementById("cardInfo").innerText = ''
        return
    }
    let added = parseDate(currentCard.added)
    let last = currentCard.lastSeen ? new Date(currentCard.lastSeen) : null
    let seen = currentCard.seen || 0
    document.getElementById("cardInfo").innerText =
        `level ${currentCard.level} (${currentCard.penalty}), added ${formatDate(added)}, ` +
        `last seen ${last ? formatDate(last) : 'never'}, seen ${seen}`
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

    saveDeck(currentLang)

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

function editLanguage(lang) {
    currentLang = lang
    deck = loadDeck(lang)

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
    let text = document.getElementById("editBox").value
    let lines = text.split("\n")
    let newDeck = []

    // Convert pipeline-separated format back to language data structure
    for (let line of lines) {
        line = line.trim()
        if (!line || line.startsWith("#")) continue

        let parts = line.split("|")
        // support both old format and new with emoji/category
        let card = {
            front: parts[0].trim(),
            back: parts[1].trim(),
            emoji: parts[2].trim() || "",
            category: parts[3].trim() || "",
            added: parseDate(parts[4].trim() || today()),
            lastSeen: parseDate(parts[5].trim() || today()),
            seen: parseInt(parts[6]) || 0,
            penalty: parseInt(parts[7]) || 0,
            level: parseInt(parts[8]) || 0
        }
        newDeck.push(card)
    }

    deck = newDeck
    saveDeck(currentLang)
    backToMenu()
}

function selectAllText() {
    document.getElementById("editBox").select()
}


//---------------------------------------------------------------------
// Language Statistics screen
//---------------------------------------------------------------------

function showStats(lang) {
    currentLang = lang
    deck = loadDeck(lang)

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
            `

    // Sort levels numerically
    let levels = Object.keys(levelCounts).sort((a, b) => parseInt(a) - parseInt(b))
    levels.forEach(level => {
        let count = levelCounts[level]
        html += `<p><strong>Level ${level}:</strong> ${count}</p>`
    })

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