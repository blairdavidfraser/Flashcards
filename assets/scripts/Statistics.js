//=============================================================================
// Statistics.js
//
//=============================================================================
import { formatDate } from './Utilities.js';

export class Statistics {

    static calculate(cards, now = new Date()) {
        const nowMs = now.getTime();
        const today = formatDate(now);
        const current = cards.filter(c => !c.added || c.added <= nowMs);
        return {
            total: cards.length,
            current: current.length,
            today: current.filter(c => c.seen > 0 && c.lastSeen && formatDate(c.lastSeen) === today).length,
            unseen: current.filter(c => c.seen === 0).length,
            levels: current.reduce((a, c) => (a[c.level] = (a[c.level] || 0) + 1, a), {}),
            categories: current.reduce((a, c) => (a[c.category] = (a[c.category] || 0) + 1, a), {})
        };
    }

    static render(stats) {
        let html = `
        <p><strong>Total Cards:</strong> ${stats.total}</p>
        <p><strong>Current Cards:</strong> ${stats.current}</p>
        <p><strong>Never Seen:</strong> ${stats.unseen}</p>
        <p><strong>Today:</strong> ${stats.today}</p>
        <hr/>`;

        Object.keys(stats.levels)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .forEach(level => {
                html += `<p><strong>Level ${level}:</strong> ${stats.levels[level]}</p>`;
            });

        html += '<hr/>';

        Object.keys(stats.categories)
            .sort()
            .forEach(cat => {
                html += `<p><strong>${cat}:</strong> ${stats.categories[cat]}</p>`;
            });

        return html;
    }

}
