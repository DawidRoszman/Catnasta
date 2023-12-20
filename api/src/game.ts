import readline from "readline";
import { Card, Joker, deck, getCardPoints, getStartingCards } from "./cards";

export interface Player {
  hand: (Card | Joker)[];
  melds: (Card | Joker)[][];
  red_threes: (Card | Joker)[];
  score: number;
  name: string;
}

export interface GameState {
  player1: Player;
  player2: Player;
  discardPile: (Card | Joker)[];
  stock: (Card | Joker)[];
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const MIN_CARDS_FOR_MELD = 3;

export const startRound = (gameState: GameState): void => {
  // Get the starting cards
  const startingCards = getStartingCards(deck);
  // Deal cards
  dealCards(gameState, startingCards);

  // Initialize the discard pile
  gameState.discardPile = [];
  revealFirstCard(gameState);

  // Check for red threes in each player's hand
  checkForRedThreeInPlayerHand(gameState.player1);
  if (gameState.player1.red_threes.length > 0) {
    gameState.player1.red_threes.forEach((_) => {
      drawCard(gameState.stock, gameState.player1.hand);
    });
  }
  checkForRedThreeInPlayerHand(gameState.player2);
  if (gameState.player2.red_threes.length > 0) {
    gameState.player2.red_threes.forEach((_) => {
      drawCard(gameState.stock, gameState.player2.hand);
    });
  }
};

export const checkForRedThreeInPlayerHand = (player: Player) => {
  const redThrees = player.hand.filter(
    (card) => card.rank === "3" && card.suit.match(/(HEART|DIAMOND)/),
  );
  const remainingCards = player.hand.filter(
    (card) => card.rank !== "3" || !card.suit.match(/(HEART|DIAMOND)/),
  );

  if (redThrees.length > 0) {
    console.log(`Red three found in ${player} hand`);
    player.red_threes = player.red_threes.concat(redThrees);
    player.hand = remainingCards;
  }
};

export const dealCards = (
  gameState: GameState,
  startingCards: (Card | Joker)[],
) => {
  gameState.player1.hand = startingCards.slice(0, 15);
  gameState.player2.hand = startingCards.slice(15, 30);

  gameState.stock = startingCards.slice(30);
};

export const revealFirstCard = (gameState: GameState) => {
  if (gameState.stock.length === 0) {
    throw new Error("Stock is empty");
  }
  while (
    gameState.discardPile.length === 0 ||
    gameState.discardPile[gameState.discardPile.length - 1]?.rank.match(
      /(JOKER|2)/,
    ) ||
    (gameState.discardPile[gameState.discardPile.length - 1]?.suit.match(
      /(HEART|DIAMOND)/,
    ) &&
      gameState.discardPile[gameState.discardPile.length - 1].rank === "3")
  ) {
    const card = gameState.stock.shift();
    if (card === undefined) {
      throw new Error("Stock is empty");
    }
    gameState.discardPile.push(card);
  }
};

export const drawCard = (
  cards: (Card | Joker)[],
  player: (Card | Joker)[],
): Card | Joker | undefined => {
  if (cards.length === 0) {
    console.log("Stock is empty");
    return;
  }
  const card = cards.shift();
  if (card === undefined) {
    throw new Error("This should not happen");
  }
  player.push(card);
  return card;
};

export const meldCards = (
  playerHand: (Card | Joker)[],
  playerMelds: (Card | Joker)[][],
  cardsToMeld: (Card | Joker)[],
): void => {
  // Check if there are at least three cards to meld
  if (cardsToMeld.length < MIN_CARDS_FOR_MELD) {
    throw new Error("At least three cards are required to meld");
  }

  // Check if there are at least two natural cards and at most three wild cards
  const wildCards = cardsToMeld.filter(
    (card) => card.rank === "2" || card.rank === "JOKER",
  );
  //Check for wild canasta
  if (wildCards.length === cardsToMeld.length) {
    console.log("Wild canasta");
    playMeld(cardsToMeld, playerHand, playerMelds);
    return;
  }

  if (wildCards.length > 3 || wildCards.length > cardsToMeld.length - 2) {
    throw new Error(
      "A meld must have at least two natural cards and can have up to three wild cards",
    );
  }

  // Check if all natural cards to meld have the same rank
  const naturalCards = cardsToMeld.filter(
    (card) => card.rank !== "2" && card.rank !== "JOKER",
  );
  const rank = naturalCards[0]?.rank;
  if (rank && !naturalCards.every((card) => card.rank === rank)) {
    throw new Error("All natural cards in a meld must have the same rank");
  }

  playMeld(cardsToMeld, playerHand, playerMelds);
};

export const playMeld = (
  cardsToMeld: (Card | Joker)[],
  playerHand: (Card | Joker)[],
  playerMelds: (Card | Joker)[][],
) => {
  // Remove the cards to meld from the player's hand
  cardsToMeld.forEach((cardToMeld) => {
    const index = playerHand.findIndex(
      (card) => card.rank === cardToMeld.rank && card.suit === cardToMeld.suit,
    );
    if (index === -1) {
      throw new Error("Card to meld not found in player's hand");
    }
    playerHand.splice(index, 1);
  });

  // Add the meld to the player's melds
  playerMelds.push(cardsToMeld);
};

export const getMeldPoints = (meld: (Card | Joker)[]): number => {
  return meld.reduce((sum, card) => sum + getCardPoints(card), 0);
};

export const getMinimumFirstMeldPoints = (score: number): number => {
  if (score < 0) {
    return 15;
  } else if (score < 1500) {
    return 50;
  } else if (score < 3000) {
    return 90;
  } else {
    return 120;
  }
};

export const isFirstMeldAboveMinimum = (
  playerScore: number,
  meld: (Card | Joker)[],
): boolean => {
  const meldPoints = getMeldPoints(meld);
  const minimumPoints = getMinimumFirstMeldPoints(playerScore);
  return meldPoints >= minimumPoints;
};
export const getTotalMeldPoints = (melds: (Card | Joker)[][]): number => {
  return melds.reduce((sum, meld) => sum + getMeldPoints(meld), 0);
};

export const canPickUpPile = (
  playerHand: (Card | Joker)[],
  topCard: Card | Joker,
): boolean => {
  const topCardRank = topCard.rank;
  const playerHandHasCard = playerHand.filter(
    (card) => card.rank === topCardRank,
  ).length;
  if (playerHandHasCard > 1) {
    return true;
  }
  return false;
};

export const pickUpPile = async (
  discardPile: (Card | Joker)[],
  playerHand: (Card | Joker)[],
  playerMelds: (Card | Joker)[][],
) => {
  // Check if the discard pile is empty
  if (discardPile.length === 0) {
    throw new Error("The discard pile is empty");
  }

  // Check if the player can pick up the pile
  const topCard = discardPile[discardPile.length - 1];
  if (!canPickUpPile(playerHand, topCard)) {
    throw new Error("The player cannot pick up the pile");
  }
  discardPile.pop();

  await meldWithTopCard(playerHand, topCard, playerMelds);

  // Add the discard pile to the player's hand and clear the discard pile
  playerHand.push(...discardPile);
  discardPile.length = 0;
};

const meldWithTopCard = async (
  playerHand: (Card | Joker)[],
  topCard: Card | Joker,
  playerMelds: (Card | Joker)[][],
) => {
  const cardsToMeld = await promptPlayerToMeldWithTopCard(playerHand, topCard);
  meldCards(playerHand, playerMelds, cardsToMeld);
};

const promptPlayerToMeldWithTopCard = async (
  playerHand: (Card | Joker)[],
  topCard: Card | Joker,
) => {
  const answer = await new Promise((resolve) => {
    rl.question(
      `Enter the ids of the cards you want to meld with the ${
        (topCard.rank, topCard.suit)
      } separated by commas (or "skip" to skip): `,
      resolve,
    );
  });
  try {
    const cardsToMeld = (answer as string).split(",").map((id) => {
      return playerHand[parseInt(id)];
    });
    return [...cardsToMeld, topCard];
  } catch (error) {
    throw new Error("Invalid input");
  }
};

export const isRoundFinished = (
  players: Player[],
  stack: (Card | Joker)[],
): boolean => {
  return (
    players.some((player) => player.hand.length === 0) || stack.length === 0
  );
};

export const calculatePlayerScore = (player: {
  hand: (Card | Joker)[];
  melds: (Card | Joker)[][];
  red_threes: (Card | Joker)[];
  name: string;
}): { name: string; score: number } => {
  // Calculate points from melds
  const meldPoints = getTotalMeldPoints(player.melds);

  // Calculate points from cards left in hand
  const handPoints = player.hand.reduce(
    (sum, card) => sum + getCardPoints(card),
    0,
  );

  // Subtract hand points from meld points to get the final score
  const score = meldPoints - handPoints + player.red_threes.length * 100;

  return { name: player.name, score };
};

export const playRound = async (gameState: GameState): Promise<void> => {
  let currentPlayer = gameState.player1;
  let otherPlayer = gameState.player2;
  let roundFinished = false;

  while (!roundFinished) {
    console.log(`${currentPlayer.name}'s turn`);

    const startingAction = await promptPlayerForStartingRoundAction();

    if (startingAction === "1") {
      // Draw a card
      const drawnCard = drawCard(gameState.stock, currentPlayer.hand);
      console.log(
        `${currentPlayer.name} drew a card: ${drawnCard?.rank} of ${drawnCard?.suit}`,
      );

      promptPlayerToMeld(currentPlayer);
    } else {
      // Pick up the discard pile
      // Check if the player can pick up the pile
      if (canPickUpPile(currentPlayer.hand, gameState.discardPile[0])) {
        await pickUpPile(
          gameState.discardPile,
          currentPlayer.hand,
          currentPlayer.melds,
        );
      } else {
        console.log("You cannot pick up the pile");
      }
    }
    promptPlayerToDiscard(currentPlayer, gameState.discardPile);

    // Check if the round is finished
    roundFinished = isRoundFinished(
      [gameState.player1, gameState.player2],
      gameState.stock,
    );
    if (roundFinished) {
      console.log(
        `${currentPlayer.name} has no cards left. The round is finished.`,
      );

      // Switch players
      [currentPlayer, otherPlayer] = [otherPlayer, currentPlayer];
    }
  }
  rl.close();
};

async function promptPlayerForStartingRoundAction() {
  console.log("Do you want to: \n1. Draw a card\n2. Pick up the discard pile");
  const answer = (await new Promise((resolve) => {
    rl.question("Enter the number of the action you want to take: ", resolve);
  })) as string;
  if (answer !== "1" && answer !== "2") {
    promptPlayerForStartingRoundAction();
    return;
  }
  return answer;
}

function printPlayerHand(currentPlayer: Player) {
  console.log(
    `${currentPlayer.name}, your hand is:\n${currentPlayer.hand
      .map((card, idx) => `${idx}. ${card.rank} of ${card.suit}\n`)
      .join("")}`,
  );
}

async function promptPlayerToMeld(currentPlayer: Player) {
  while (true) {
    // Prompt the player to choose cards to meld
    printPlayerHand(currentPlayer);
    const answer = await new Promise((resolve) => {
      rl.question(
        'Enter the ids of the cards you want to meld (different melds should be separated by space), separated by commas (or "skip" to skip): ',
        resolve,
      );
    });

    if (answer !== "skip") {
      const idsToMeld = (answer as string)
        .split(" ")
        .map((meld) => meld.split(",").map((rank) => rank.trim()));
      console.log(idsToMeld);
      const formattedCardsForMeld = formatCardsForMelding(
        currentPlayer,
        idsToMeld,
      );
      if (formattedCardsForMeld === undefined) continue;
      meldCards(currentPlayer.hand, currentPlayer.melds, formattedCardsForMeld);
      break;
    } else break;
  }
}

async function promptPlayerToDiscard(
  currentPlayer: Player,
  discardPile: (Card | Joker)[],
) {
  printPlayerHand(currentPlayer);
  while (true) {
    // Prompt the player to choose a card to discard
    const discardAnswer = await new Promise((resolve) => {
      rl.question("Enter the index of the card you want to discard: ", resolve);
    });
    const discardAnswerString = discardAnswer as string;
    if (discardAnswerString) {
      const disacrdedCard = discardCard(
        currentPlayer.hand,
        discardPile,
        parseInt(discardAnswerString),
      );
      console.log(
        `${currentPlayer.name} discarded a ${disacrdedCard.rank} of ${disacrdedCard.suit}`,
      );
      break;
    } else {
      console.log("Invalid card. Your turn is skipped.");
      continue;
    }
  }
}

function formatCardsForMelding(
  currentPlayer: Player,
  cardIdsToBeMelded: string[][],
) {
  cardIdsToBeMelded.forEach((meld) => {
    const cardsToMeld = meld.map((id) => currentPlayer.hand[parseInt(id)]);
    if (cardsToMeld.length < MIN_CARDS_FOR_MELD) {
      console.log("At least three cards are required to meld");
      return undefined;
    }
    // Check if it's the first meld
    // Check if the first meld is above the minimum
    if (
      !isFirstMeldAboveMinimum(currentPlayer.score, cardsToMeld) &&
      currentPlayer.melds.length === 0
    ) {
      const minPoints = getMinimumFirstMeldPoints(currentPlayer.score);
      console.log(`Your first meld must be at least ${minPoints} points.`);
      return undefined;
    }

    return cardsToMeld;
  });
}
export function discardCard(
  hand: (Card | Joker)[],
  cards: (Card | Joker)[],
  cardToDiscard: number,
) {
  const cardAtIndex = hand[cardToDiscard];

  // If the card is in the player's hand, remove it and add it to the discard pile
  if (cardToDiscard !== -1) {
    hand.splice(cardToDiscard, 1);
    cards.push(cardAtIndex);
  } else {
    throw new Error("Card not found in hand");
  }
  return cardAtIndex;
}
export function resetRound(gameState: GameState) {
  gameState.player1.hand = [];
  gameState.player1.melds = [];
  gameState.player2.hand = [];
  gameState.player2.melds = [];
  gameState.stock = [];
  gameState.discardPile = [];
}
export async function playGame() {
  // Initialize game state
  const gameState: GameState = {
    player1: {
      name: "Player 1",
      hand: [],
      melds: [],
      red_threes: [],
      score: 0,
    },
    player2: {
      name: "Player 2",
      hand: [],
      melds: [],
      red_threes: [],
      score: 0,
    },
    stock: [],
    discardPile: [],
  };

  // Start the round
  startRound(gameState);

  // Play rounds until one player reaches 5000 points
  while (gameState.player1.score < 5000 && gameState.player2.score < 5000) {
    await playRound(gameState);

    // Calculate scores
    gameState.player1.score = calculatePlayerScore(gameState.player1).score;
    gameState.player2.score = calculatePlayerScore(gameState.player2).score;

    console.log(
      `Scores after this round: Player 1 - ${gameState.player1.score}, Player 2 - ${gameState.player2.score}`,
    );

    // Prepare for the next round
    resetRound(gameState);
  }

  // Determine the winner
  const winner =
    gameState.player1.score >= 5000
      ? gameState.player1.name
      : gameState.player2.name;
  console.log(`${winner} wins the game!`);
}
