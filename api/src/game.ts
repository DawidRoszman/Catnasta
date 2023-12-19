import readline from "readline";
import { Card, Joker, deck, getCardPoints, getStartingCards } from "./cards";

interface Player {
  hand: (Card | Joker)[];
  melds: (Card | Joker)[][];
  red_threes: (Card | Joker)[];
  score: number;
  name: string;
}

interface GameState {
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

const startRound = (gameState: GameState): void => {
  // Get the starting cards
  const startingCards = getStartingCards(deck);
  // Deal cards
  dealCards(gameState, startingCards);

  // Initialize the discard pile
  gameState.discardPile = [];
  revealFirstCard(gameState);

  // Check for red threes in each player's hand
  checkForRedThreeInPlayerHand(gameState.player1);
  checkForRedThreeInPlayerHand(gameState.player2);
};

const checkForRedThreeInPlayerHand = (player: Player) => {
  const redThrees = player.hand.filter(
    (card) => card.rank === "3" && card.suit.match(/(HEART|DIAMOND)/)
  );
  const remainingCards = player.hand.filter(
    (card) => card.rank !== "3" || !card.suit.match(/(HEART|DIAMOND)/)
  );

  if (redThrees.length > 0) {
    console.log(`Red three found in ${player} hand`);
    player.red_threes = player.red_threes.concat(redThrees);
    player.hand = remainingCards;
  }
};

const dealCards = (gameState: GameState, startingCards: (Card | Joker)[]) => {
  gameState.player1.hand = startingCards.slice(0, 15);
  gameState.player2.hand = startingCards.slice(15, 30);

  gameState.stock = startingCards.slice(30);
};

const revealFirstCard = (gameState: GameState) => {
  while (
    gameState.discardPile[gameState.discardPile.length - 1]?.rank.match(
      /(JOKER|2)/
    ) ||
    (gameState.discardPile[gameState.discardPile.length - 1]?.suit.match(
      /(HEART|DIAMOND)/
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

const drawCard = (
  cards: (Card | Joker)[],
  player: (Card | Joker)[]
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

const meldCards = (
  playerHand: (Card | Joker)[],
  playerMelds: (Card | Joker)[][],
  cardsToMeld: (Card | Joker)[]
): void => {
  // Check if there are at least three cards to meld
  if (cardsToMeld.length < 3) {
    throw new Error("At least three cards are required to meld");
  }

  // Check if there are at least two natural cards and at most three wild cards
  const wildCards = cardsToMeld.filter(
    (card) => card.rank === "2" || card.rank === "JOKER"
  );
  if (wildCards.length > 3 || wildCards.length > cardsToMeld.length - 2) {
    throw new Error(
      "A meld must have at least two natural cards and can have up to three wild cards"
    );
  }

  // Check if all natural cards to meld have the same rank
  const naturalCards = cardsToMeld.filter(
    (card) => card.rank !== "2" && card.rank !== "JOKER"
  );
  const rank = naturalCards[0]?.rank;
  if (rank && !naturalCards.every((card) => card.rank === rank)) {
    throw new Error("All natural cards in a meld must have the same rank");
  }

  // Remove the cards to meld from the player's hand
  cardsToMeld.forEach((cardToMeld) => {
    const index = playerHand.findIndex(
      (card) => card.rank === cardToMeld.rank && card.suit === cardToMeld.suit
    );
    if (index === -1) {
      throw new Error("Card to meld not found in player's hand");
    }
    playerHand.splice(index, 1);
  });

  // Add the meld to the player's melds
  playerMelds.push(cardsToMeld);
};

const getMeldPoints = (meld: (Card | Joker)[]): number => {
  return meld.reduce((sum, card) => sum + getCardPoints(card), 0);
};

const getMinimumFirstMeldPoints = (score: number): number => {
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

const isFirstMeldAboveMinimum = (
  playerScore: number,
  meld: (Card | Joker)[]
): boolean => {
  const meldPoints = getMeldPoints(meld);
  const minimumPoints = getMinimumFirstMeldPoints(playerScore);
  return meldPoints >= minimumPoints;
};
const getTotalMeldPoints = (melds: (Card | Joker)[][]): number => {
  return melds.reduce((sum, meld) => sum + getMeldPoints(meld), 0);
};

const canPickUpPile = (
  playerHand: (Card | Joker)[],
  topCard: Card | Joker
): boolean => {
  const topCardRank = topCard.rank;
  const playerHandHasCard = playerHand.filter(
    (card) => card.rank === topCardRank
  ).length;
  if (playerHandHasCard > 1) {
    return true;
  }
  return false;
};

const pickUpPile = (
  discardPile: (Card | Joker)[],
  playerHand: (Card | Joker)[]
): void => {
  // Check if the discard pile is empty
  if (discardPile.length === 0) {
    throw new Error("The discard pile is empty");
  }

  // Check if the player can pick up the pile
  const topCard = discardPile[discardPile.length - 1];
  if (!canPickUpPile(playerHand, topCard)) {
    throw new Error("The player cannot pick up the pile");
  }

  // TODO: Wait for player to meld top card with cards from his hand

  // Add the discard pile to the player's hand and clear the discard pile
  playerHand.push(...discardPile);
  discardPile.length = 0;
};

const isRoundFinished = (
  players: Player[],
  stack: (Card | Joker)[]
): boolean => {
  return (
    players.some((player) => player.hand.length === 0) || stack.length === 0
  );
};

const calculatePlayerScore = (player: {
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
    0
  );

  // Subtract hand points from meld points to get the final score
  const score = meldPoints - handPoints + player.red_threes.length * 100;

  return { name: player.name, score };
};

const playRound = async (gameState: GameState): Promise<void> => {
  let currentPlayer = gameState.player1;
  let otherPlayer = gameState.player2;
  let roundFinished = false;

  while (!roundFinished) {
    console.log(`${currentPlayer.name}'s turn`);

    // Draw a card
    const drawnCard = drawCard(gameState.stock, currentPlayer.hand);
    console.log(
      `${currentPlayer.name} drew a card: ${drawnCard?.rank} of ${drawnCard?.suit}`
    );

    while (true) {
      // Prompt the player to choose cards to meld
      console.log(
        `${currentPlayer.name}, your hand is:\n${currentPlayer.hand
          .map((card, idx) => `${idx}. ${card.rank} of ${card.suit}\n`)
          .join("")}`
      );
      const answer = await new Promise((resolve) => {
        rl.question(
          'Enter the ids of the cards you want to meld (different melds should be separated by space), separated by commas (or "skip" to skip): ',
          resolve
        );
      });

      if (answer !== "skip") {
        const idsToMeld = (answer as string)
          .split(" ")
          .map((meld) => meld.split(",").map((rank) => rank.trim()));
        console.log(idsToMeld);
        if (formatCardsForMelding(currentPlayer, idsToMeld)) {
          break;
        }
      } else break;
    }
    console.log(
      `${currentPlayer.name}, your hand is: ${currentPlayer.hand
        .map((card, idx) => `${idx}. ${card.rank} of ${card.suit}\n`)
        .join("")}`
    );
    while (true) {
      // Prompt the player to choose a card to discard
      const discardAnswer = await new Promise((resolve) => {
        rl.question(
          "Enter the index of the card you want to discard: ",
          resolve
        );
      });
      const discardAnswerString = discardAnswer as string;
      if (discardAnswerString) {
        const disacrdedCard = discardCard(
          currentPlayer.hand,
          gameState.discardPile,
          parseInt(discardAnswerString)
        );
        console.log(
          `${currentPlayer.name} discarded a ${disacrdedCard.rank} of ${disacrdedCard.suit}`
        );
        break;
      } else {
        console.log("Invalid card. Your turn is skipped.");
        continue;
      }
    }

    // Check if the round is finished
    roundFinished = isRoundFinished(
      [gameState.player1, gameState.player2],
      gameState.stock
    );
    if (roundFinished) {
      console.log(
        `${currentPlayer.name} has no cards left. The round is finished.`
      );

      // Switch players
      [currentPlayer, otherPlayer] = [otherPlayer, currentPlayer];
    }
  }
  rl.close();
};
function formatCardsForMelding(currentPlayer: Player, idsToMeld: string[][]) {
  let error = true;
  idsToMeld.forEach((meld) => {
    const cardsToMeld = meld.map((id) => currentPlayer.hand[parseInt(id)]);
    if (cardsToMeld.length >= MIN_CARDS_FOR_MELD) {
      // Check if it's the first meld
      if (currentPlayer.melds.length === 0) {
        // Check if the first meld is above the minimum
        if (!isFirstMeldAboveMinimum(currentPlayer.score, cardsToMeld)) {
          const minPoints = getMinimumFirstMeldPoints(currentPlayer.score);
          console.log(
            `Your first meld must be at least ${minPoints} points. Your turn is skipped.`
          );
          error = false;
        }
      }

      meldCards(currentPlayer.hand, currentPlayer.melds, cardsToMeld);
      console.log(
        `${currentPlayer.name} melded ${
          cardsToMeld.length
        } cards of ranks ${idsToMeld.join(", ")}`
      );
    } else {
      console.log(
        "You need at least 3 cards of the same rank to meld. Your turn is skipped."
      );
      error = false;
    }
  });
  return error;
}
function discardCard(
  hand: (Card | Joker)[],
  cards: (Card | Joker)[],
  cardToDiscard: number
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
function resetRound(gameState: GameState) {
  gameState.player1.hand = [];
  gameState.player1.melds = [];
  gameState.player2.hand = [];
  gameState.player2.melds = [];
  gameState.stock = [];
  gameState.discardPile = [];
}
async function playGame() {
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

    console.log(
      `Scores after this round: Player 1 - ${gameState.player1.score}, Player 2 - ${gameState.player2.score}`
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

playGame();
