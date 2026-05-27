//=============================================================================
// ApplicationScreenDailyLog.js
//
//=============================================================================
import { DailyLog } from "./DailyLog.js"
import { GitHubService } from "./GitHubService.js"

const LANGUAGES = ['Spanish', 'French'];

function escapeAttr(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseDuration(str) {
    const parts = (str || '').split(':').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return 0;
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function formatHours(seconds) {
    return (seconds / 3600).toFixed(1) + ' h';
}

export class ApplicationScreenDailyLog {

    constructor() {
        this._language = LANGUAGES[0];
    }

    show() {
        this._render();
    }

    _render() {
        const container = document.getElementById("dailyLogContent");
        if (!container) return;

        // Language tabs + push button
        let html = '<div class="log-lang-tabs">';
        LANGUAGES.forEach(lang => {
            const active = lang === this._language ? ' log-lang-active' : '';
            html += `<span class="log-lang-tab${active}" data-lang="${lang}">${lang}</span>`;
        });
        html += '<span class="log-push-btn" id="logPushBtn">⬆ GitHub</span>';
        html += '</div>';

        const entries = DailyLog.recent(365).filter(e => e.language === this._language);
        const otherList = DailyLog.recentOther(this._language, 365);

        const last7 = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().slice(0, 10);
        });

        const allDates = [...new Set([
            ...last7,
            ...entries.map(e => e.date),
            ...otherList.map(e => e.date),
        ])].sort((a, b) => b.localeCompare(a));

        // Aggregate game counts by date + direction
        const totals = {};
        entries.forEach(({ date, direction, count }) => {
            const key = `${date}|${direction}`;
            totals[key] = (totals[key] || 0) + count;
        });

        // Other totals by date
        const otherByDate = {};
        otherList.forEach(({ date, items }) => {
            const total = items.reduce((sum, { duration }) => sum + parseDuration(duration), 0);
            otherByDate[date] = total;
        });

        const totalRecog = Object.entries(totals).filter(([k]) => k.endsWith('|recognition')).reduce((s, [, v]) => s + v, 0);
        const totalRecall = Object.entries(totals).filter(([k]) => k.endsWith('|recall')).reduce((s, [, v]) => s + v, 0);
        const totalOther = Object.values(otherByDate).reduce((s, v) => s + v, 0);
        const gameSum = (totalRecog || totalRecall) ? `${totalRecog} / ${totalRecall}` : '–';
        const otherSum = totalOther ? formatHours(totalOther) : '–';

        html += '<table class="log-table"><thead>';
        html += '<tr><th>Date</th><th>Recognition / Recall</th><th>Other</th></tr>';
        html += `<tr><th class="log-subheader">Totals</th><th class="log-subheader">${gameSum}</th><th class="log-subheader">${otherSum}</th></tr>`;
        html += '</thead><tbody>';

        allDates.forEach(date => {
            const recog = totals[`${date}|recognition`] || 0;
            const recall = totals[`${date}|recall`] || 0;
            const gameCell = (recog || recall) ? `${recog} / ${recall}` : '–';

            const otherSecs = otherByDate[date];
            const otherCell = otherSecs != null
                ? `<a class="log-other-link" data-date="${date}" href="#">${formatDuration(otherSecs)}</a>`
                : `<a class="log-other-link log-other-add" data-date="${date}" href="#">+</a>`;

            html += `<tr><td>${date}</td><td>${gameCell}</td><td>${otherCell}</td></tr>`;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
        this._bindTabs(container);
        this._bindOtherLinks(container);
        container.querySelector('#logPushBtn').addEventListener('click', () => this._pushToGitHub());
    }

    _bindTabs(container) {
        container.querySelectorAll('.log-lang-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this._language = tab.dataset.lang;
                this._render();
            });
        });
    }

    _bindOtherLinks(container) {
        container.querySelectorAll('.log-other-link').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                this._showOtherModal(link.dataset.date);
            });
        });
    }

    _showOtherModal(date) {
        document.getElementById('log-other-modal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'log-other-modal';
        modal.className = 'log-modal-overlay';
        modal.innerHTML = `
            <div class="log-modal">
                <div class="log-modal-header">
                    <span>${date} — ${this._language}</span>
                    <button class="log-modal-close">✕</button>
                </div>
                <div class="log-modal-body">
                    <table class="log-table log-modal-table">
                        <thead><tr><th>Duration</th><th>Entry</th><th></th></tr></thead>
                        <tbody id="log-modal-tbody"></tbody>
                    </table>
                    <div class="log-modal-btns">
                        <button class="log-modal-add" id="log-modal-add-btn">+ Add Activity</button>
                        <button class="log-modal-add" id="log-modal-note-btn">+ Add Note</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const tbody = modal.querySelector('#log-modal-tbody');

        const renderRows = () => {
            const items = DailyLog.getOtherItems(date, this._language);
            tbody.innerHTML = '';
            items.forEach((item, i) => {
                const tr = document.createElement('tr');
                if (item.type === 'note') {
                    tr.innerHTML = `
                        <td colspan="2"><input type="text" class="log-note-input" value="${escapeAttr(item.text)}" placeholder="Note…" data-index="${i}"></td>
                        <td><button class="log-remove-btn" data-index="${i}">✕</button></td>
                    `;
                } else {
                    const parts = (item.duration || '00:00:00').split(':');
                    const isNew = !item.duration;
                    const h = parseInt(parts[0]) || 0;
                    const m = parseInt(parts[1]) || 0;
                    const hVal = isNew ? '' : String(h);
                    const mVal = isNew ? '' : String(m);
                    tr.innerHTML = `
                        <td><input type="number" class="log-hours-input" value="${hVal}" placeholder="HH" min="0" data-index="${i}"><span class="log-duration-sep">:</span><input type="number" class="log-minutes-input" value="${mVal}" placeholder="MM" min="0" max="59" data-index="${i}"></td>
                        <td><input type="text" class="log-activity-input" value="${escapeAttr(item.activity)}" placeholder="Activity…" data-index="${i}"></td>
                        <td><button class="log-remove-btn" data-index="${i}">✕</button></td>
                    `;
                }
                tbody.appendChild(tr);
            });
        };

        renderRows();

        tbody.addEventListener('change', e => {
            const input = e.target;
            if (input.dataset.index === undefined) return;
            const index = parseInt(input.dataset.index);
            const items = DailyLog.getOtherItems(date, this._language);
            if (!items[index]) return;
            const item = items[index];
            if (item.type === 'note') {
                if (input.classList.contains('log-note-input')) {
                    DailyLog.updateNoteItem(date, this._language, index, input.value);
                }
            } else {
                const { duration, activity } = item;
                if (input.classList.contains('log-hours-input') || input.classList.contains('log-minutes-input')) {
                    const tr = input.closest('tr');
                    const h = parseInt(tr.querySelector('.log-hours-input').value) || 0;
                    const m = parseInt(tr.querySelector('.log-minutes-input').value) || 0;
                    const newDuration = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
                    DailyLog.updateOtherItem(date, this._language, index, newDuration, activity);
                } else if (input.classList.contains('log-activity-input')) {
                    DailyLog.updateOtherItem(date, this._language, index, duration, input.value);
                }
            }
            this._render();
        });

        tbody.addEventListener('click', e => {
            if (!e.target.classList.contains('log-remove-btn')) return;
            DailyLog.removeOtherItem(date, this._language, parseInt(e.target.dataset.index));
            renderRows();
            this._render();
        });

        modal.querySelector('#log-modal-add-btn').addEventListener('click', () => {
            DailyLog.addOther(date, this._language, '', '');
            renderRows();
            this._render();
        });

        modal.querySelector('#log-modal-note-btn').addEventListener('click', () => {
            DailyLog.addNote(date, this._language, '');
            renderRows();
            this._render();
        });

        const close = () => { modal.remove(); this._render(); };
        modal.querySelector('.log-modal-close').addEventListener('click', close);
        modal.addEventListener('click', e => { if (e.target === modal) close(); });
    }

    _pushToGitHub() {
        if (!GitHubService.isConfigured()) {
            this._showGitHubConfigModal();
            return;
        }
        this._doPush();
    }

    async _doPush() {
        const btn = document.getElementById('logPushBtn');
        btn.textContent = 'Pushing…';
        try {
            const { token, repo } = GitHubService.getConfig();
            const content = JSON.stringify(DailyLog.export(), null, 2);
            await GitHubService.pushFile(token, repo, 'assets/data/Blair-DailyLog.json', content, 'Update Blair-DailyLog.json');
            btn.textContent = '✓ Pushed';
            setTimeout(() => { btn.textContent = '⬆ GitHub'; }, 2500);
        } catch (e) {
            btn.textContent = '✗ Failed';
            alert(`GitHub push failed: ${e.message}`);
            setTimeout(() => { btn.textContent = '⬆ GitHub'; }, 2500);
        }
    }

    _showGitHubConfigModal() {
        document.getElementById('log-github-modal')?.remove();

        const { repo, prefix } = GitHubService.getConfig();
        const modal = document.createElement('div');
        modal.id = 'log-github-modal';
        modal.className = 'log-modal-overlay';
        modal.innerHTML = `
            <div class="log-modal">
                <div class="log-modal-header">
                    <span>GitHub Configuration</span>
                    <button class="log-modal-close">✕</button>
                </div>
                <div class="log-modal-body" style="display:flex;flex-direction:column;gap:10px;font-size:13px">
                    <label>Personal access token:<br>
                        <input type="password" id="logGithubToken" class="log-config-input" placeholder="ghp_…"></label>
                    <label>Repository (owner/repo):<br>
                        <input type="text" id="logGithubRepo" class="log-config-input" placeholder="username/flashcards" value="${repo}"></label>
                    <label>Filename prefix (optional):<br>
                        <input type="text" id="logGithubPrefix" class="log-config-input" placeholder="e.g. Blair" value="${prefix}"></label>
                    <button class="log-modal-add" id="logGithubSaveBtn" style="align-self:flex-start">Save &amp; Push</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#logGithubSaveBtn').addEventListener('click', () => {
            const token  = modal.querySelector('#logGithubToken').value.trim();
            const repo   = modal.querySelector('#logGithubRepo').value.trim();
            const prefix = modal.querySelector('#logGithubPrefix').value.trim();
            if (!token || !repo) return;
            GitHubService.saveConfig(token, repo, prefix);
            modal.remove();
            this._doPush();
        });

        const close = () => modal.remove();
        modal.querySelector('.log-modal-close').addEventListener('click', close);
        modal.addEventListener('click', e => { if (e.target === modal) close(); });
    }

}
