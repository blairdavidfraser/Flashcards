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

    constructor(logger = null, { backToMenu } = {}) {
        this.logger = logger;
        this.#backToMenu = backToMenu;
    }

    show(name, language) {
        this.#name = name;
        this.#language = language;
        this.#persistence = new Persistence(name, language, this.logger);
        document.getElementById("gameMenu").classList.add("hidden");
        document.getElementById("editArea").classList.remove("hidden");
        document.getElementById("githubConfigSection").classList.add("hidden");
        document.getElementById("editTitle").innerText = `Edit ${language} / ${name}`;
        document.getElementById("editBox").value = Dataset.serialize(this.#persistence.loadDataset());
    }

    save() {
        this.#persistence.saveDataset(Dataset.parse(document.getElementById("editBox").value));
        this.#persistence = null;
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
