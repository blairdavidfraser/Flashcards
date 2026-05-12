//=============================================================================
// ApplicationScreenDatasetEdit.js
//
//=============================================================================
import { Persistence } from './Persistence.js';
import { Dataset } from './Dataset.js';
import { GitHubService } from './GitHubService.js';

export class ApplicationScreenDatasetEdit {

    #backToMenu = null;
    #persistence = null;
    #name = null;
    #language = null;
    #searchPos = 0;
    #seenBefore = 0;

    constructor(logger = null, { backToMenu } = {}) {
        this.logger = logger;
        this.#backToMenu = backToMenu;
    }

    show(name, language) {
        this.#name = name;
        this.#language = language;
        this.#searchPos = 0;
        this.#persistence = new Persistence(name, language, this.logger);
        document.getElementById("gameMenu").classList.add("hidden");
        document.getElementById("editArea").classList.remove("hidden");
        document.getElementById("githubConfigSection").classList.add("hidden");
        document.getElementById("editTitle").innerText = `Edit ${language} / ${name}`;
        const serialized = Dataset.serialize(this.#persistence.loadDataset());
        document.getElementById("editBox").value = serialized;
        document.getElementById("editSearchInput").value = "";
        this.#seenBefore = this.#totalSeen(serialized);
    }

    #scrollTaToChar(ta, charPos) {
        const cs = getComputedStyle(ta);
        const clone = document.createElement('textarea');
        clone.style.cssText = [
            'position:fixed', 'top:-9999px', 'left:0', 'overflow:hidden',
            `width:${ta.clientWidth}px`, 'height:auto',
            `font-size:${cs.fontSize}`, `font-family:${cs.fontFamily}`,
            `line-height:${cs.lineHeight}`, `padding:${cs.padding}`,
            `border:${cs.border}`, `box-sizing:${cs.boxSizing}`,
            `white-space:${cs.whiteSpace}`, `overflow-wrap:${cs.overflowWrap}`
        ].join(';');
        clone.value = ta.value.slice(0, charPos);
        document.body.appendChild(clone);
        const offsetPx = clone.scrollHeight;
        document.body.removeChild(clone);
        ta.scrollTop = Math.max(0, offsetPx - ta.clientHeight / 2);
    }

    #showValidationError({ lineNum, message, data }) {
        const ta = document.getElementById("editBox");
        const lines = ta.value.split('\n');
        const charPos = lines.slice(0, lineNum - 1).reduce((acc, l) => acc + l.length + 1, 0);
        const lineLen = lines[lineNum - 1]?.length || 0;
        ta.focus();
        ta.setSelectionRange(charPos, charPos + lineLen);
        this.#scrollTaToChar(ta, charPos);
        setTimeout(() => alert(`Validation error on line ${lineNum}:\n${message}\n\n${data}`), 50);
    }

    search(direction = 1) {
        const query = document.getElementById("editSearchInput").value;
        if (!query) return;
        const ta = document.getElementById("editBox");
        const text = ta.value.toLowerCase();
        const q = query.toLowerCase();
        let pos;
        if (direction >= 0) {
            pos = text.indexOf(q, this.#searchPos);
            if (pos === -1) pos = text.indexOf(q, 0); // wrap forward
        } else {
            const searchTo = Math.max(0, this.#searchPos - q.length - 1);
            pos = text.lastIndexOf(q, searchTo);
            if (pos === -1) pos = text.lastIndexOf(q); // wrap backward
        }
        if (pos === -1) return;
        this.#searchPos = direction >= 0 ? pos + q.length : pos;
        const start = pos;
        const len = query.length;
        setTimeout(() => {
            ta.focus();
            ta.setSelectionRange(start, start + len);
            const cs = getComputedStyle(ta);
            const clone = document.createElement('textarea');
            clone.style.cssText = [
                'position:fixed', 'top:-9999px', 'left:0', 'overflow:hidden',
                `width:${ta.clientWidth}px`, 'height:auto',
                `font-size:${cs.fontSize}`, `font-family:${cs.fontFamily}`,
                `line-height:${cs.lineHeight}`, `padding:${cs.padding}`,
                `border:${cs.border}`, `box-sizing:${cs.boxSizing}`,
                `white-space:${cs.whiteSpace}`, `overflow-wrap:${cs.overflowWrap}`
            ].join(';');
            clone.value = ta.value.slice(0, start);
            document.body.appendChild(clone);
            const offsetPx = clone.scrollHeight;
            document.body.removeChild(clone);
            ta.scrollTop = Math.max(0, offsetPx - ta.clientHeight / 2);
        }, 0);
    }

    save() {
        const text = document.getElementById("editBox").value;
        const error = Dataset.validate(text);
        if (error) { this.#showValidationError(error); return; }
        const drop = this.#seenBefore - this.#totalSeen(text);
        if (drop > 0) {
            this.#confirmSeenDrop(drop,
                () => this.#doSave(text),
                () => { this.#persistence = null; this.#clearEditBox(); this.#backToMenu(); }
            );
            return;
        }
        this.#doSave(text);
    }

    #doSave(text) {
        this.#persistence.saveDataset(Dataset.parse(text));
        this.#persistence = null;
        this.#clearEditBox();
        this.#backToMenu();
    }

    #clearEditBox() {
        const ta = document.getElementById("editBox");
        ta.value = "";
        ta.readOnly = true;
        ta.readOnly = false;
    }

    #totalSeen(text) {
        return text.split('\n').reduce((sum, line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return sum;
            const seen = parseInt(line.split('|')[7]);
            return sum + (isNaN(seen) ? 0 : seen);
        }, 0);
    }

    #confirmSeenDrop(drop, onYes, onNo) {
        const overlay = document.createElement('div');
        overlay.className = 'log-modal-overlay';
        overlay.innerHTML = `
            <div class="log-modal">
                <div class="log-modal-header">Confirm Save</div>
                <p style="margin:0 0 16px; font-size:14px; color:#444;">
                    Total seen card count has dropped by ${drop}. Are you sure?
                </p>
                <div style="display:flex; justify-content:center; gap:12px;">
                    <button id="seenConfirmYes">Yes</button>
                    <button id="seenConfirmNo">No</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#seenConfirmYes').onclick = () => { overlay.remove(); onYes(); };
        overlay.querySelector('#seenConfirmNo').onclick  = () => { overlay.remove(); onNo(); };
    }

    selectAll() {
        document.getElementById("editBox").select();
    }

    async saveToGitHub() {
        const text = document.getElementById("editBox").value;
        const error = Dataset.validate(text);
        if (error) { this.#showValidationError(error); return; }
        if (!GitHubService.isConfigured()) {
            this.#showGithubConfig();
            return;
        }
        await this.#push();
    }

    saveGithubConfig() {
        const token  = document.getElementById("githubToken").value.trim();
        const repo   = document.getElementById("githubRepo").value.trim();
        const prefix = document.getElementById("githubPrefix").value.trim();
        if (!token || !repo) return;
        GitHubService.saveConfig(token, repo, prefix);
        document.getElementById("githubToken").value = "";
        document.getElementById("githubConfigSection").classList.add("hidden");
        this.#push();
    }

    cancelGithubConfig() {
        document.getElementById("githubConfigSection").classList.add("hidden");
    }

    #showGithubConfig() {
        const { repo, prefix } = GitHubService.getConfig();
        document.getElementById("githubRepo").value = repo;
        document.getElementById("githubPrefix").value = prefix;
        document.getElementById("githubToken").value = "";
        document.getElementById("githubConfigSection").classList.remove("hidden");
        document.getElementById("githubToken").focus();
    }

    async #push() {
        const { token, repo, prefix } = GitHubService.getConfig();
        const content = document.getElementById("editBox").value;
        const path    = GitHubService.filePath(this.#language, this.#name, prefix);
        const message = `Update ${this.#language} ${this.#name}`;

        this.#persistence.saveDataset(Dataset.parse(content));
        const button  = document.getElementById("saveToGithubButton");

        button.disabled = true;
        button.textContent = "Saving…";

        try {
            await GitHubService.pushFile(token, repo, path, content, message);
            button.textContent = "Saved ✓";
            setTimeout(() => { button.textContent = "Save to GitHub"; }, 2500);
        } catch (e) {
            button.textContent = "Save to GitHub";
            alert("GitHub push failed: " + e.message);
        } finally {
            button.disabled = false;
        }
    }

}
