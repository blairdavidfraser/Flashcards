//=============================================================================
// ApplicationScreenStudy.js
//
//=============================================================================

export class ApplicationScreenStudy {

    _autopilot = false;
    _autopilotTimer = null;

    constructor(gameplay, { backToMenu } = {}) {
        this.gameplay = gameplay;
        this._backToMenu = backToMenu;
    }

    get autopilot() { return this._autopilot; }

    startGame(rank) {
        this.gameplay.initialize(rank);
        document.getElementById("configurationMenu").classList.add("hidden");
        document.getElementById("studyArea").classList.remove("hidden");
        this.startRound();
    }

    startRound() {
        clearTimeout(this._autopilotTimer);
        this.gameplay.draw();
        this._speakText(this.gameplay.state.questionSpeach, this.gameplay.state.questionLanguage);
        document.getElementById("cardHeader").innerText = this.gameplay.state.card.category || "";
        document.getElementById("cardTop").innerHTML = this._renderCardContent(this.gameplay.state.questionText);
        document.getElementById("cardEmoji").innerHTML = this.gameplay.state.questionEmoji;
        document.getElementById("cardBottom").innerHTML = "&nbsp;";
        document.getElementById("difficultyButtons").classList.add("hidden");
        document.getElementById("nextButtons").classList.add("hidden");
        document.getElementById("exitButton").classList.remove("hidden");
        document.getElementById("cardComment").innerHTML = "&nbsp;";
        document.getElementById("cardInfo").innerText = this.gameplay.state.card ? this.gameplay.state.card.summary() : '';
        if (this._autopilot) {
            this._autopilotTimer = setTimeout(() => this.finishRound(), 6000);
        }
    }

    finishRound() {
        clearTimeout(this._autopilotTimer);
        this.gameplay.reveal();
        this._speakText(this.gameplay.state.answerSpeach, this.gameplay.state.answerLanguage);
        document.getElementById("cardBottom").innerHTML = this._renderCardContent(this.gameplay.state.answerText);
        document.getElementById("cardEmoji").innerHTML = this.gameplay.state.answerEmoji;
        if (this.gameplay.state.direction === "recognition") {
            document.getElementById("difficultyButtons").classList.add("hidden");
            document.getElementById("nextButtons").classList.remove("hidden");
        } else {
            document.getElementById("difficultyButtons").classList.remove("hidden");
            document.getElementById("nextButtons").classList.add("hidden");
        }
        document.getElementById("exitButton").classList.add("hidden");
        document.getElementById("cardComment").innerText = this.gameplay.state.card ? this.gameplay.state.card.comment : '';
        document.getElementById("cardInfo").innerText = this.gameplay.state.card ? this.gameplay.state.card.summary() : '';
        if (this._autopilot) {
            this._autopilotTimer = setTimeout(() => this.cycleRound(), 4000);
        }
    }

    cycleRound(difficulty = null, level = null) {
        if (difficulty !== null) {
            this.gameplay.rate(difficulty, level ?? this.gameplay.state.card.level);
        }
        this.startRound();
    }

    endGame() {
        clearTimeout(this._autopilotTimer);
        this.gameplay.end();
        this._backToMenu();
    }

    toggleAutopilot() {
        this._autopilot = !this._autopilot;
        clearTimeout(this._autopilotTimer);
        if (this._autopilot && !document.getElementById("studyArea").classList.contains("hidden")) {
            if (document.getElementById("nextButtons").classList.contains("hidden") &&
                document.getElementById("difficultyButtons").classList.contains("hidden")) {
                this._autopilotTimer = setTimeout(() => this.finishRound(), 6000);
            } else {
                this._autopilotTimer = setTimeout(() => this.cycleRound(), 4000);
            }
        }
    }

    _speakText(text, lang) {
        if (!text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        if (lang === 'Spanish') utterance.lang = 'es-ES';
        else if (lang === 'French') utterance.lang = 'fr-FR';
        else if (lang === 'English') utterance.lang = 'en-CA';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    }

    _renderCardContent(text) {
        text = text.trim();
        if (text.startsWith("[") && text.endsWith("]")) {
            const inner = text.slice(1, -1).trim();
            const rows = inner.split(";").map(row => row.trim());
            let html = "<table style='width:100%; border-collapse: collapse;'>";
            rows.forEach(row => {
                const cells = row.split(",").map(cell => cell.trim());
                html += "<tr>";
                cells.forEach(cell => { html += `<td style="border: 1px solid #ddd; padding: 2px; text-align: center;">${cell}</td>`; });
                html += "</tr>";
            });
            html += "</table>";
            return html;
        }
        return text;
    }

}
