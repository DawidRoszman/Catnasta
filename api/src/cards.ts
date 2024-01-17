import { v4 as randomUUID } from "uuid";
import { Card, Joker, Rank, Suit } from "./types/types.ts";
const cardsWithoutJoker: Card[] = Array.from({ length: 52 }, (_, i) => {
  const rank = Object.values(Rank)[i % 13];
  const suit = Object.values(Suit)[Math.floor(i / 13)];
  const id = randomUUID();
  return { id, rank, suit };
});

export const deck: (Card | Joker)[] = [
  ...cardsWithoutJoker,
  ...cardsWithoutJoker,
  { id: randomUUID(), rank: "JOKER", suit: Suit.CLUB },
  { id: randomUUID(), rank: "JOKER", suit: Suit.DIAMOND },
  { id: randomUUID(), rank: "JOKER", suit: Suit.HEART },
  { id: randomUUID(), rank: "JOKER", suit: Suit.SPADE },
];

export const shuffle = (deck: (Card | Joker)[]) => {
  const shuffledDeck = [...deck];
  for (let i = shuffledDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
  }
  return shuffledDeck;
};

export const getStartingCards = (deck: (Card | Joker)[]) => {
  const shuffled = shuffle(deck).map(card => {
    return { ...card, id: randomUUID() };
  });
  return shuffled
};

export const getCardPoints = (card: Card | Joker): number => {
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
