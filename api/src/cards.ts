import { randomUUID } from "crypto";

export enum Rank {
  ACE = "A",
  KING = "K",
  QUEEN = "Q",
  JACK = "J",
  TEN = "10",
  NINE = "9",
  EIGHT = "8",
  SEVEN = "7",
  SIX = "6",
  FIVE = "5",
  FOUR = "4",
  THREE = "3",
  TWO = "2",
}

export enum Suit {
  HEART = "HEART",
  DIAMOND = "DIAMOND",
  CLUB = "CLUB",
  SPADE = "SPADE",
}

export type Card = {
  id: string;
  rank: Rank;
  suit: Suit;
};

export type Joker = {
  id: string;
  rank: "JOKER";
  suit: "RED" | "BLACK";
};

const cardsWithoutJoker: Card[] = Array.from({ length: 52 }, (_, i) => {
  const rank = Object.values(Rank)[i % 13];
  const suit = Object.values(Suit)[Math.floor(i / 13)];
  const id = randomUUID();
  return { id, rank, suit };
});

export const deck: (Card | Joker)[] = [
  ...cardsWithoutJoker,
  { id: randomUUID(), rank: "JOKER", suit: "RED" },
  { id: randomUUID(), rank: "JOKER", suit: "BLACK" },
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
  return [...shuffle(deck), ...shuffle(deck)];
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
