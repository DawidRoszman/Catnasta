import { Card, GameState, Joker, Player } from "./types/types";
import { getStartingCards, deck, getCardPoints } from "./cards";
const MIN_CARDS_FOR_MELD = 3;

export const startRound = (gameState: GameState): void => {
  const startingCards = getStartingCards(deck);
  dealCards(gameState, startingCards);

  gameState.discardPile = [];

  revealFirstCard(gameState);

  checkForRedThreeInPlayerHand(gameState.player1);
  if (gameState.player1.red_threes.length > 0) {
    gameState.player1.red_threes.forEach((_) => {
      drawCard(gameState.stock, gameState.player1);
    });
  }
  checkForRedThreeInPlayerHand(gameState.player2);
  if (gameState.player2.red_threes.length > 0) {
    gameState.player2.red_threes.forEach((_) => {
      drawCard(gameState.stock, gameState.player2);
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
    console.log(`Red three found in ${player.name} hand`);
    player.red_threes = player.red_threes.concat(redThrees);
    player.hand = remainingCards;
  }
};
//
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
      gameState.discardPile[gameState.discardPile.length - 1]?.rank === "3")
  ) {
    const card = gameState.stock.shift();
    if (card === undefined) {
      throw new Error("Stock is empty");
    }
    gameState.discardPile.push(card);
    console.log(gameState.discardPile);
    console.log(gameState.stock);
  }
};

export const drawCard = (
  cards: (Card | Joker)[],
  player: Player,
): Card | Joker | undefined => {
  if (cards.length === 0) {
    console.log("Stock is empty");
    return;
  }
  let card = cards.shift();
  if (card === undefined) {
    throw new Error("This should not happen");
  }
  //while card is a red three draw another and push three to player table
  while (card.rank === "3" && card.suit.match(/(HEART|DIAMOND)/)) {
    player.red_threes.push(card);
    card = cards.shift();
    if (card === undefined) {
      throw new Error("This should not happen");
    }
  }
  player.hand.push(card);
  return card;
};
//
export const meldCards = (
  playerHand: (Card | Joker)[],
  playerMelds: (Card | Joker)[][],
  cardsToMeld: (Card | Joker)[],
) => {
  // Check if there are at least three cards to meld
  if (cardsToMeld.length < MIN_CARDS_FOR_MELD) {
    console.log("At least three cards are required to meld");
    return { msg: "At least three cards are required to meld" };
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
    const msg =
      "A meld must have at least two natural cards and can have up to three wild cards";
    console.log(msg);
    return { msg };
  }

  // Check if all natural cards to meld have the same rank
  const naturalCards = cardsToMeld.filter(
    (card) => card.rank !== "2" && card.rank !== "JOKER",
  );
  const rank = naturalCards[0]?.rank;
  if (rank && !naturalCards.every((card) => card.rank === rank)) {
    console.log("All natural cards in a meld must have the same rank");
    return { msg: "All natural cards in a meld must have the same rank" };
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
      console.log("Card to meld not found in player's hand");
      return;
    }
    playerHand.splice(index, 1);
  });

  // Add the meld to the player's melds
  playerMelds.push(cardsToMeld);
};

export const getMeldPoints = (meld: (Card | Joker)[]): number => {
  return (
    meld.map((card) => getCardPoints(card)).sort((a, b) => a - b)[0] *
    meld.length
  );
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
  meldPoints: number,
): boolean => {
  const minimumPoints = getMinimumFirstMeldPoints(playerScore);
  return meldPoints >= minimumPoints;
};
export const getTotalMeldPoints = (melds: (Card | Joker)[][]): number => {
  return melds.reduce((sum, meld) => sum + getMeldPoints(meld), 0);
};
//
// export const canPickUpPile = (
//   playerHand: (Card | Joker)[],
//   topCard: Card | Joker,
// ): boolean => {
//   const topCardRank = topCard.rank;
//   const playerHandHasCard = playerHand.filter(
//     (card) => card.rank === topCardRank,
//   ).length;
//   if (playerHandHasCard > 1) {
//     return true;
//   }
//   return false;
// };
//
// export const pickUpPile = async (
//   discardPile: (Card | Joker)[],
//   playerHand: (Card | Joker)[],
//   playerMelds: (Card | Joker)[][],
// ) => {
//   if (discardPile.length === 0) {
//     console.log("The discard pile is empty");
//     return;
//   }
//
//   const topCard = discardPile[discardPile.length - 1];
//   if (!canPickUpPile(playerHand, topCard)) {
//     console.log("The player cannot pick up the pile");
//     return;
//   }
//   discardPile.pop();
//
//   await meldWithTopCard(playerHand, topCard, playerMelds);
//
//   playerHand.push(...discardPile);
//   discardPile.length = 0;
// };
//
// const meldWithTopCard = async (
//   playerHand: (Card | Joker)[],
//   topCard: Card | Joker,
//   playerMelds: (Card | Joker)[][],
// ) => {
//   let cardsToMeld: (Card | Joker)[] | number = 1;
//   while (cardsToMeld === 1) {
//     cardsToMeld = await promptPlayerToMeldWithTopCard(playerHand, topCard);
//   }
//   meldCards(playerHand, playerMelds, cardsToMeld as (Card | Joker)[]);
// };
//
// const promptPlayerToMeldWithTopCard = async (
//   playerHand: (Card | Joker)[],
//   topCard: Card | Joker,
// ) => {
//   const answer = await new Promise((resolve) => {
//     rl.question(
//       `Enter the ids of the cards you want to meld with the ${
//         (topCard.rank, topCard.suit)
//       } separated by commas (or "skip" to skip): `,
//       resolve,
//     );
//   });
//   try {
//     const cardsToMeld = (answer as string).split(",").map((id) => {
//       return playerHand[parseInt(id)];
//     });
//     return [...cardsToMeld, topCard];
//   } catch (error) {
//     console.log("Invalid meld. Try again.");
//     return 1;
//   }
// };
//
// export const isRoundFinished = (
//   players: Player[],
//   stack: (Card | Joker)[],
// ): boolean => {
//   return (
//     players.some((player) => player.hand.length === 0) || stack.length === 0
//   );
// };
//
export const calculatePlayerScore = (
  player: Player,
): { name: string; points: number } => {
  const meldPoints = player.melds
    .flatMap((c) => c)
    .reduce((sum, card) => sum + getCardPoints(card), 0);

  const handPoints = player.hand.reduce(
    (sum, card) => sum + getCardPoints(card),
    0,
  );

  const playerHadCatnasta = player.melds.some((meld) => {
    return meld.length >= 7;
  });

  if (!playerHadCatnasta) {
    const points = -meldPoints - handPoints + player.red_threes.length * 100;
    return { name: player.name, points };
  }

  const numOfNaturalCatnastas = player.melds.filter((meld) => {
    return (
      meld.length >= 7 &&
      meld.every((card) => card.rank !== "2" && card.rank !== "JOKER")
    );
  }).length;

  const numOfMixedCatnastas = player.melds.filter((meld) => {
    return (
      meld.length >= 7 &&
      meld.some((card) => card.rank === "2" || card.rank === "JOKER") &&
      meld.some((card) => card.rank !== "2" && card.rank !== "JOKER")
    );
  }).length;

  const numOfWildCatnastas = player.melds.filter((meld) => {
    return (
      meld.length >= 7 &&
      meld.every((card) => card.rank === "2" || card.rank === "JOKER")
    );
  }).length;

  const playerFinished = player.hand.length === 0;

  const points =
    meldPoints -
    handPoints +
    player.red_threes.length * 100 +
    numOfNaturalCatnastas * 500 +
    numOfMixedCatnastas * 300 +
    numOfWildCatnastas * 1000 +
    (playerFinished ? 100 : 0);
  // TODO: Calculate bonuses

  return { name: player.name, points };
};
//
// export const playRound = async (gameState: GameState): Promise<void> => {
//   let currentPlayer = gameState.player1;
//   let otherPlayer = gameState.player2;
//   let roundFinished = false;
//
//   while (!roundFinished) {
//     console.log("\n\n-----------------------------------------------\n\n");
//     console.log(
//       `The top card is: ${
//         gameState.discardPile[gameState.discardPile.length - 1].rank
//       } of ${gameState.discardPile[gameState.discardPile.length - 1].suit}`,
//     );
//     console.log(`${currentPlayer.name}'s turn\n`);
//
//     await playerMove(gameState, currentPlayer);
//
//     await promptPlayerToDiscard(currentPlayer, gameState.discardPile);
//
//     roundFinished = isRoundFinished(
//       [gameState.player1, gameState.player2],
//       gameState.stock,
//     );
//     if (roundFinished) {
//       console.log(
//         `${currentPlayer.name} has no cards left. The round is finished.`,
//       );
//     }
//     // Switch players
//     [currentPlayer, otherPlayer] = [otherPlayer, currentPlayer];
//   }
//   rl.close();
// };
//
// async function playerMove(gameState: GameState, currentPlayer: Player) {
//   const startingAction = await promptPlayerForStartingRoundAction();
//
//   if (startingAction === "1") {
//     const drawnCard = drawCard(gameState.stock, currentPlayer);
//     console.log(
//       `${currentPlayer.name} drew a card: ${drawnCard?.rank} of ${drawnCard?.suit}`,
//     );
//
//     await promptPlayerToMeld(currentPlayer);
//   } else if (startingAction === "2") {
//     if (canPickUpPile(currentPlayer.hand, gameState.discardPile[0])) {
//       await pickUpPile(
//         gameState.discardPile,
//         currentPlayer.hand,
//         currentPlayer.melds,
//       );
//     } else {
//       console.log("You cannot pick up the pile");
//       playerMove(gameState, currentPlayer);
//       return;
//     }
//   } else {
//     printPlayerHand(currentPlayer);
//     playerMove(gameState, currentPlayer);
//     return;
//   }
// }
//
// async function promptPlayerForStartingRoundAction() {
//   console.log(
//     "\nDo you want to: \n1. Draw a card\n2. Pick up the discard pile\n3. Display your cards\n",
//   );
//   const answer = (await new Promise((resolve) => {
//     rl.question("Enter the number of the action you want to take: ", resolve);
//   })) as string;
//   if (answer !== "1" && answer !== "2" && answer !== "3") {
//     console.log("Invalid action");
//     await promptPlayerForStartingRoundAction();
//     return;
//   }
//   return answer;
// }
//
// function printPlayerHand(currentPlayer: Player) {
//   console.log(
//     `\n${currentPlayer.name}, your hand is:\n${currentPlayer.hand
//       .map((card, idx) => `${idx}. ${card.rank} of ${card.suit}\n`)
//       .join("")}`,
//   );
// }
//
// async function promptPlayerToMeld(currentPlayer: Player) {
//   while (true) {
//     printPlayerHand(currentPlayer);
//     const answer = await new Promise((resolve) => {
//       rl.question(
//         'Enter the ids of the cards you want to meld (different melds should be separated by space), separated by commas (or "skip" to skip): ',
//         resolve,
//       );
//     });
//
//     if (answer !== "skip") {
//       const idsToMeld = (answer as string)
//         .split(" ")
//         .map((meld) => meld.split(",").map((rank) => rank.trim()));
//       console.log(idsToMeld);
//       const formattedCardsForMeld = formatCardsForMelding(
//         currentPlayer,
//         idsToMeld,
//       );
//       if (formattedCardsForMeld === undefined) {
//         console.log("Invalid meld. Try again.");
//         continue;
//       }
//       const meldPoints = formattedCardsForMeld.reduce(
//         (sum, meld) => sum + getMeldPoints(meld),
//         0,
//       );
//       if (checkIfIsFirstMeld(currentPlayer, meldPoints) === undefined) continue;
//       if (
//         formattedCardsForMeld.some(
//           (cardsToMeld) => checkIfIsWildMeld(cardsToMeld) === undefined,
//         )
//       )
//         continue;
//       formattedCardsForMeld.forEach((meld) => {
//         console.log("Meldding cards: ", meld);
//         meldCards(currentPlayer.hand, currentPlayer.melds, meld);
//       });
//       break;
//     } else {
//       console.log("Your turn is skipped.");
//       break;
//     }
//   }
// }

export const checkIfIsWildMeld = (cardsToMeld: (Card | Joker)[]) => {
  if (checkIfAllCardsAreWild(cardsToMeld)) {
    if (
      cardsToMeld.filter((card) => card.rank === "JOKER").length <
      cardsToMeld.filter((card) => card.rank === "2").length
    ) {
      console.log(
        "Invalid meld. Wild meld cannot have more Twos than Jokers. Try again.",
      );
      return true;
    }
  }
  return undefined;
};

export const checkIfAllCardsAreWild = (cardsToMeld: (Card | Joker)[]) => {
  return cardsToMeld.every(
    (card) => card.rank === "JOKER" || card.rank === "2",
  );
};

export const checkIfIsFirstMeld = (
  currentPlayer: Player,
  meldPoints: number,
) => {
  if (
    !isFirstMeldAboveMinimum(currentPlayer.score, meldPoints) &&
    currentPlayer.melds.length === 0
  ) {
    const minPoints = getMinimumFirstMeldPoints(currentPlayer.score);
    console.log(`Your first meld must be at least ${minPoints} points.`);
    return undefined;
  }
};

export const addToMeld = (
  currentPlayer: Player,
  meldId: number,
  cards: (Card | Joker)[],
) => {
  const meld = currentPlayer.melds[meldId];
  if (meld === undefined) {
    console.log("Invalid meld");
    return { msg: "Invalid meld" };
  }
  const newMeld = [...meld, ...cards];
  console.log(newMeld);
  const wildCards = newMeld.filter(
    (card) => card.rank === "2" || card.rank === "JOKER",
  );
  const naturalCards = newMeld.filter(
    (card) => card.rank !== "2" && card.rank !== "JOKER",
  );
  console.log(wildCards);
  console.log(naturalCards);
  if (wildCards.length === newMeld.length) {
    meld.push(...cards);
    currentPlayer.hand = currentPlayer.hand.filter(
      (card) => !cards.includes(card),
    );
    return;
  }
  const rank = naturalCards[0]?.rank;
  console.log(rank);
  if (rank && !naturalCards.every((card) => card.rank === rank)) {
    const msg = "All natural cards in a meld must have the same rank";
    console.log(msg);
    return { msg };
  }
  if (wildCards.length >= naturalCards.length) {
    const msg = "You have to have more natural cards than wild cards in meld";
    console.log(msg);
    return { msg };
  }
  meld.push(...cards);
  currentPlayer.hand = currentPlayer.hand.filter(
    (card) => !cards.includes(card),
  );
};
//
// async function promptPlayerToDiscard(
//   currentPlayer: Player,
//   discardPile: (Card | Joker)[],
// ) {
//   printPlayerHand(currentPlayer);
//   while (true) {
//     const discardAnswer = await new Promise((resolve) => {
//       rl.question("Enter the index of the card you want to discard: ", resolve);
//     });
//     const discardAnswerString = discardAnswer as string;
//     if (discardAnswerString) {
//       const disacrdedCard = discardCard(
//         currentPlayer.hand,
//         discardPile,
//         parseInt(discardAnswerString),
//       );
//       console.log(
//         `${currentPlayer.name} discarded a ${disacrdedCard.rank} of ${disacrdedCard.suit}`,
//       );
//       break;
//     } else {
//       console.log("Invalid card. Your turn is skipped.");
//       continue;
//     }
//   }
// }

export function formatCardsForMelding(
  currentPlayer: Player,
  cardIdsToBeMelded: string[][],
) {
  return cardIdsToBeMelded.reduce((acc: (Card | Joker)[][], meld) => {
    const cardsToMeld = currentPlayer.hand.filter((card) => {
      return meld.includes(card.id);
    });
    acc.push(cardsToMeld);
    return acc;
  }, []);
}
export function discardCard(
  hand: (Card | Joker)[],
  cards: (Card | Joker)[],
  cardId: string,
) {
  const cardToDiscard = hand.find((card) => card.id === cardId);
  const cardIndex = hand.findIndex((card) => card.id === cardId);

  if (cardToDiscard !== undefined) {
    hand.splice(cardIndex, 1);
    cards.push(cardToDiscard);
  } else {
    throw new Error("Card not found in hand");
  }
  return cardToDiscard;
}
// export function resetRound(gameState: GameState) {
//   gameState.player1.hand = [];
//   gameState.player1.melds = [];
//   gameState.player2.hand = [];
//   gameState.player2.melds = [];
//   gameState.stock = [];
//   gameState.discardPile = [];
// }
// export async function playGame() {
//   const gameState: GameState = {
//     player1: {
//       name: "Player 1",
//       hand: [],
//       melds: [],
//       red_threes: [],
//       score: 0,
//     },
//     player2: {
//       name: "Player 2",
//       hand: [],
//       melds: [],
//       red_threes: [],
//       score: 0,
//     },
//     stock: [],
//     discardPile: [],
//   };
//
//   console.log("Starting a new game");
//   startRound(gameState);
//
//   while (gameState.player1.score < 5000 && gameState.player2.score < 5000) {
//     await playRound(gameState);
//
//     gameState.player1.score = calculatePlayerScore(gameState.player1).score;
//     gameState.player2.score = calculatePlayerScore(gameState.player2).score;
//
//     console.log(
//       `Scores after this round: Player 1 - ${gameState.player1.score}, Player 2 - ${gameState.player2.score}`,
//     );
//
//     resetRound(gameState);
//   }
//
//   const winner =
//     gameState.player1.score >= 5000
//       ? gameState.player1.name
//       : gameState.player2.name;
//   console.log(`${winner} wins the game!`);
// }
// playGame();
