//=============================================================================
// ApplicationScreenStatistics.js
//
//=============================================================================
import { Card } from './Card.js';
import { Persistence } from './Persistence.js';
import { Statistics } from './Statistics.js';

export class ApplicationScreenStatistics {

    constructor(logger = null) {
        this.logger = logger;
    }

    show(name, language) {
        const dataset = new Persistence(name, language, this.logger).loadDataset();
        const cards = dataset.filter(item => item instanceof Card);
        const stats = Statistics.calculate(cards);
        document.getElementById("gameMenu").classList.add("hidden");
        document.getElementById("statsArea").classList.remove("hidden");
        document.getElementById("statsTitle").innerText = `${language} ${name} Statistics`;
        document.getElementById("statsContent").innerHTML = Statistics.render(stats);
    }

}
