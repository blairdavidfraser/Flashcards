//=============================================================================
// ApplicationScreenDailyLog.js
//
//=============================================================================
import { DailyLog } from "./DailyLog.js"

const LANGUAGES = ['Spanish', 'French'];

export class ApplicationScreenDailyLog {

    show() {
        const container = document.getElementById("dailyLogContent");
        if (!container) return;

        const entries = DailyLog.recent(14);

        if (entries.length === 0) {
            container.innerHTML = "<p style='color:#555;font-size:14px;padding:8px 0'>No activity yet.</p>";
            return;
        }

        // Aggregate by date + language + direction (summing across all decks).
        const totals = {};
        entries.forEach(({ date, language, direction, count }) => {
            const key = `${date}|${language}|${direction}`;
            totals[key] = (totals[key] || 0) + count;
        });

        const dates = [...new Set(entries.map(e => e.date))].sort((a, b) => b.localeCompare(a));

        let html = '<table class="log-table"><thead>';

        // Row 1: language headers
        html += '<tr><th rowspan="2">Date</th>';
        LANGUAGES.forEach(lang => { html += `<th>${lang}</th>`; });
        html += '</tr>';

        // Row 2: Recall/Recognition sub-headers
        html += '<tr>';
        LANGUAGES.forEach(() => { html += '<th class="log-subheader">Recall / Recognition</th>'; });
        html += '</tr>';

        html += '</thead><tbody>';

        dates.forEach(date => {
            html += `<tr><td>${date}</td>`;
            LANGUAGES.forEach(lang => {
                const r = totals[`${date}|${lang}|recall`]       || 0;
                const s = totals[`${date}|${lang}|recognition`]  || 0;
                html += `<td>${r || '–'} / ${s || '–'}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

}
