//=============================================================================
// GameTests.js
//
//=============================================================================
import { Card } from "./Card.js"
import { Game } from "./Game.js"
import { Persistence } from "./Persistence.js"

describe('Game', function () {
    let originalRandom;

    before(function () {
        originalRandom = Math.random;
    });

    after(function () {
        Math.random = originalRandom;
    });


});
