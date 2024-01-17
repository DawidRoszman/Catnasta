"use client";
import React from "react";
import { useGameContext } from "./GameContext";
import client from "@/app/lib/mqtt";
import { useCookies } from "next-client-cookies";

const Table = () => {
  const gameContext = useGameContext();
  const cookies = useCookies();
  const [selectedCards, setSelectedCards] = React.useState<string[]>([]);
  const [cardsToMeld, setCardsToMeld] = React.useState<string[][]>([]);

  const handleChecked = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCards([...selectedCards, e.target.value]);
    } else {
      setSelectedCards(selectedCards.filter((id) => id !== e.target.value));
    }
  };

  const drawFromStock = () => {
    console.log(gameContext?.gameState.turn);
    client.publish(
      `catnasta/game`,
      JSON.stringify({
        type: "DRAW_FROM_STOCK",
        id: gameContext?.gameId,
        name: gameContext?.gameState.player1.name,
      }),
    );
    gameContext!.gameState.canDraw = false;
    gameContext!.gameState.canDiscard = true;
    gameContext!.gameState.canMeld = true;
  };

  const discardCard = () => {
    console.log(selectedCards);
    if (selectedCards.length !== 1) {
      alert("Please select one card to discard");
      return;
    }
    if (!gameContext?.gameState.canDiscard) {
      alert("You can't discard now");
      return;
    }
    if (gameContext?.gameState.turn !== cookies.get("username")) {
      alert("Not your turn");
      return;
    }
    client.publish(
      `catnasta/game`,
      JSON.stringify({
        type: "DISCARD_CARD",
        id: gameContext?.gameId,
        name: gameContext?.gameState.player1.name,
        cardId: selectedCards[0],
      }),
    );
    gameContext!.gameState.canDiscard = false;
    gameContext!.gameState.canMeld = false;
    setSelectedCards([]);
  };

  const handleAddToMeld = () => {
    if (!gameContext?.gameState.canMeld) {
      alert("You can't meld now");
      return;
    }
    if (gameContext?.gameState.turn !== cookies.get("username")) {
      alert("Not your turn");
      return;
    }
    if (selectedCards.length < 3) {
      alert("Please select at least 3 cards to meld");
      return;
    }
    setCardsToMeld([...cardsToMeld, selectedCards]);
    setSelectedCards([]);
    document.querySelectorAll("input[type=checkbox]").forEach((el) => {
      const input = el as HTMLInputElement;
      input.checked = false;
    });
  };

  const cancelMeld = (id: number) => {
    setCardsToMeld(cardsToMeld.filter((_, index) => index !== id));
  };

  const meldCards = () => {
    console.log(cardsToMeld);
    if (cardsToMeld.length === 0) {
      alert("Please create at least one meld");
      return;
    }
    if (!gameContext?.gameState.canMeld) {
      alert("You can't meld now");
      return;
    }
    if (gameContext?.gameState.turn !== cookies.get("username")) {
      alert("Not your turn");
      return;
    }
    client.publish(
      `catnasta/game`,
      JSON.stringify({
        type: "MELD_CARDS",
        id: gameContext?.gameId,
        name: gameContext?.gameState.player1.name,
        melds: cardsToMeld,
      }),
    );
    setCardsToMeld([]);
  };

  const addSelectedCardsToMeld = (meldId: number) => {
    if (gameContext?.gameState.turn !== cookies.get("username")) {
      alert("Not your turn");
      return;
    }
    if (!gameContext?.gameState.canMeld) {
      alert("You can't meld now");
      return;
    }
    if (selectedCards.length === 0) {
      alert("You must select at least one card to add to meld");
      return;
    }
    client.publish(
      `catnasta/game`,
      JSON.stringify({
        type: "ADD_TO_MELD",
        id: gameContext?.gameId,
        name: gameContext?.gameState.player1.name,
        meldId: meldId,
        cardsIds: selectedCards,
      }),
    );
    setSelectedCards([]);
    document.querySelectorAll("input[type=checkbox]").forEach((el) => {
      const input = el as HTMLInputElement;
      input.checked = false;
    });
  };

  return (
    <div>
      {gameContext?.gameState.stockCardCount !== -1 && (
        <div className="grid place-items-center">
          Cards left in stock: {gameContext?.gameState.stockCardCount}
        </div>
      )}
      <div className="flex justify-between">
        <div className="flex flex-col gap-4">
          <div>
            {gameContext?.gameState.player1.hand.map((card) => {
              return (
                <div
                  key={card.id}
                  className={
                    cardsToMeld.flatMap((card) => card).includes(card.id)
                      ? "hidden"
                      : ""
                  }
                >
                  <label className="" htmlFor={card.id}>
                    <input
                      type="checkbox"
                      className="hidden peer"
                      id={card.id}
                      value={card.id}
                      onChange={handleChecked}
                    />
                    <div className="peer-checked:text-primary">
                      {card.rank} {card.suit}
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
          {gameContext?.gameState.player1.red_threes.length !== 0 && (
            <div className="flex flex-col gap-4">
              <div>
                Red threes:
                {gameContext?.gameState.player1.red_threes.map((card) => {
                  return (
                    <div className="text-error" key={card.id}>
                      {card.rank} {card.suit}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {cardsToMeld.map((cards, id) => {
            return (
              <div key={id} className="tooltip" data-tip="Cancel meld">
                <button
                  onClick={() => cancelMeld(id)}
                  className="join join-vertical"
                >
                  {cards.map((cardId) => {
                    const card = gameContext?.gameState.player1.hand.find(
                      (card) => card.id === cardId,
                    );
                    if (card === undefined) {
                      return (
                        <div className="badge-primary" key={cardId}>
                          Card not found
                        </div>
                      );
                    }

                    return (
                      <div
                        className="badge badge-primary w-36 join-item"
                        key={card.id}
                      >
                        {card.rank} {card.suit}
                      </div>
                    );
                  })}
                </button>
              </div>
            );
          })}
          {gameContext?.gameState.player1.melds.map((cards, id) => {
            const isCatnasta = cards.length >= 7;
            return (
              <div
                key={id}
                className="tooltip"
                data-tip="Add selected cards to meld"
              >
                <button
                  className="join join-vertical"
                  onClick={() => addSelectedCardsToMeld(id)}
                >
                  {cards.map((card) => {
                    return (
                      <div
                        className={`join-item p-1 w-36 ${
                          isCatnasta ? "badge-warning" : "badge-success"
                        }`}
                        key={card.id}
                      >
                        {card.rank} {card.suit}
                      </div>
                    );
                  })}
                </button>
              </div>
            );
          })}
        </div>
        {gameContext?.gameState.discardPileTopCard !== null && (
          <div className="flex flex-col align-middle justify-center">
            Discard Pile:
            <span className="text-center">
              {gameContext?.gameState.discardPileTopCard?.rank}{" "}
              {gameContext?.gameState.discardPileTopCard?.suit}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div>
            {Array.from(
              Array(gameContext?.gameState.player2.num_of_cards_in_hand),
            ).map((_, id) => {
              return <div key={id}>{id + 1}. Back of the card</div>;
            })}
          </div>
          {gameContext?.gameState.player2.red_threes.length !== 0 && (
            <div className="flex flex-col gap-4">
              <div>
                Red threes:
                {gameContext?.gameState.player2.red_threes.map((card) => {
                  return (
                    <div className="text-error" key={card.id}>
                      {card.rank} {card.suit}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {gameContext?.gameState.player2.melds.map((cards, id) => {
            const isCatnasta = cards.length >= 7;
            return (
              <div key={id} className="join join-vertical text-center">
                {cards.map((card) => {
                  return (
                    <div
                      className={`join-item p-1 w-36 ${
                        isCatnasta ? "badge-warning" : "badge-success"
                      }`}
                      key={card.id}
                    >
                      {card.rank} {card.suit}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid place-items-center">
        {gameContext?.gameState.turn === cookies.get("username") &&
          gameContext?.gameState.canDraw && (
            <button
              onClick={() => drawFromStock()}
              className="btn btn-primary btn-outline"
            >
              Draw from stock
            </button>
          )}
        {gameContext?.gameState.turn === cookies.get("username") &&
          !gameContext?.gameState.canDraw && (
            <>
              <button
                onClick={() => handleAddToMeld()}
                className="btn btn-primary btn-outline"
              >
                Create Meld From Selected Cards
              </button>
              {cardsToMeld.length !== 0 && (
                <button
                  onClick={() => meldCards()}
                  className="btn btn-primary btn-outline"
                >
                  Meld Selected Cards
                </button>
              )}
              <button
                onClick={() => discardCard()}
                className="btn btn-primary btn-outline"
              >
                Discard Selected Card
              </button>
            </>
          )}
      </div>
    </div>
  );
};

export default Table;
