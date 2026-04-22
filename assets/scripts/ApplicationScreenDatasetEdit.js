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
        document.getElementById("editBox").value = Dataset.serialize(this.#persistence.loadDataset());
        document.getElementById("editSearchInput").value = "";
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
        ta.focus();
        ta.setSelectionRange(pos, pos + query.length);
        const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 20;
        const line = ta.value.slice(0, pos).split('\n').length - 1;
        ta.scrollTop = line * lineHeight - ta.clientHeight / 2;
    }

    save() {
        this.#persistence.saveDataset(Dataset.parse(document.getElementById("editBox").value));
        this.#persistence = null;
        document.getElementById("editBox").value = "";
        this.#backToMenu();
    }

    selectAll() {
        document.getElementById("editBox").select();
    }

    async saveToGitHub() {
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
