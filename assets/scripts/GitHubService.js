//=============================================================================
// GitHubService.js
//
// Pushes dataset files to a GitHub repository via the Contents API.
// Config (token, repo, prefix) is stored in localStorage.
//=============================================================================

export class GitHubService {

    static getConfig() {
        return {
            token:  localStorage.getItem("github_token")  ?? "",
            repo:   localStorage.getItem("github_repo")   ?? "",
            prefix: localStorage.getItem("github_prefix") ?? ""
        };
    }

    static saveConfig(token, repo, prefix) {
        localStorage.setItem("github_token",  token.trim());
        localStorage.setItem("github_repo",   repo.trim());
        localStorage.setItem("github_prefix", prefix.trim());
    }

    static isConfigured() {
        const { token, repo } = GitHubService.getConfig();
        return !!(token && repo);
    }

    // Derives the repo-relative file path from language, deck name, and optional prefix.
    // e.g. language="Spanish", name="Verbs", prefix="Blair" → "assets/data/Blair-Spanish-Verbs.txt"
    static filePath(language, name, prefix) {
        const filename = prefix
            ? `${prefix}-${language}-${name}.txt`
            : `${language}-${name}.txt`;
        return `assets/data/${filename}`;
    }

    // Pushes content to path in repo. Creates the file if it doesn't exist.
    static async pushFile(token, repo, path, content, commitMessage) {
        const url = `https://api.github.com/repos/${repo}/contents/${path}`;
        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        };

        // Fetch current file SHA — required by GitHub to update an existing file.
        let sha = null;
        const getResponse = await fetch(url, { headers });
        if (getResponse.ok) {
            sha = (await getResponse.json()).sha;
        } else if (getResponse.status !== 404) {
            throw new Error(`Could not read file from GitHub (${getResponse.status})`);
        }

        const body = {
            message: commitMessage,
            content: GitHubService.#toBase64(content),
            ...(sha && { sha })
        };

        const putResponse = await fetch(url, {
            method: "PUT",
            headers,
            body: JSON.stringify(body)
        });

        if (!putResponse.ok) {
            const err = await putResponse.json().catch(() => ({}));
            throw new Error(err.message ?? `GitHub push failed (${putResponse.status})`);
        }

        return await putResponse.json();
    }

    // UTF-8-safe base64 encoding (handles accented characters in Spanish/French).
    static #toBase64(content) {
        return btoa(unescape(encodeURIComponent(content)));
    }

}
