"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCardPoints = exports.getStartingCards = exports.shuffle = exports.deck = exports.Suit = exports.Rank = void 0;
var crypto_1 = require("crypto");
var Rank;
(function (Rank) {
    Rank["ACE"] = "A";
    Rank["KING"] = "K";
    Rank["QUEEN"] = "Q";
    Rank["JACK"] = "J";
    Rank["TEN"] = "10";
    Rank["NINE"] = "9";
    Rank["EIGHT"] = "8";
    Rank["SEVEN"] = "7";
    Rank["SIX"] = "6";
    Rank["FIVE"] = "5";
    Rank["FOUR"] = "4";
    Rank["THREE"] = "3";
    Rank["TWO"] = "2";
})(Rank || (exports.Rank = Rank = {}));
var Suit;
(function (Suit) {
    Suit["HEART"] = "HEART";
    Suit["DIAMOND"] = "DIAMOND";
    Suit["CLUB"] = "CLUB";
    Suit["SPADE"] = "SPADE";
})(Suit || (exports.Suit = Suit = {}));
var cardsWithoutJoker = Array.from({ length: 52 }, function (_, i) {
    var rank = Object.values(Rank)[i % 13];
    var suit = Object.values(Suit)[Math.floor(i / 13)];
    var id = (0, crypto_1.randomUUID)();
    return { id: id, rank: rank, suit: suit };
});
exports.deck = __spreadArray(__spreadArray([], cardsWithoutJoker, true), [
    { id: (0, crypto_1.randomUUID)(), rank: "JOKER", suit: "RED" },
    { id: (0, crypto_1.randomUUID)(), rank: "JOKER", suit: "BLACK" },
], false);
var shuffle = function (deck) {
    var _a;
    var shuffledDeck = __spreadArray([], deck, true);
    for (var i = shuffledDeck.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        _a = [shuffledDeck[j], shuffledDeck[i]], shuffledDeck[i] = _a[0], shuffledDeck[j] = _a[1];
    }
    return shuffledDeck;
};
exports.shuffle = shuffle;
var getStartingCards = function (deck) {
    return (0, exports.shuffle)(__spreadArray(__spreadArray([], deck, true), deck, true));
};
exports.getStartingCards = getStartingCards;
var getCardPoints = function (card) {
    switch (card.rank) {
        case "JOKER":
            return 50;
        case "2":
        case "A":
            return 20;
        case "K":
        case "Q":
        case "J":
        case "10":
        case "9":
        case "8":
            return 10;
        case "7":
        case "6":
        case "5":
        case "4":
        case "3":
            return 5;
        default:
            return 0;
    }
};
exports.getCardPoints = getCardPoints;
