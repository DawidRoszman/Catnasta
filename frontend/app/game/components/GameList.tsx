"use client";
import React, { useEffect } from "react";
import { Game } from "../page";
import client from "@/app/lib/mqtt";
import { joinGame } from "@/app/lib/joinGame";
import { useUserContext } from "@/app/components/UserContext";
import { useRouter } from "next/navigation";

const GameList = ({ games }: { games: Game[] }) => {
  const [gameList, setGameList] = React.useState<Game[]>(games);
  const router = useRouter();

  useEffect(() => {
    client.subscribe("catnasta/game_list");

    const handleMessage = (topic: any, msg: any) => {
      if (topic !== "catnasta/game_list") {
        return;
      }
      console.log(msg.toString());
      const games = JSON.parse(msg.toString());
      setGameList(games);
    };
    client.on("message", handleMessage);
  }, []);
  const userContext = useUserContext();
  if (userContext === null) {
    return <div>Loading...</div>;
  }
  return (
    <div>
      {gameList.map((game) => (
        <div key={game.id} className="card w-96 bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Game {game.id}</h2>
            <p>Players in game: {game.players_in_game}</p>
            <div className="card-actions justify-end">
              <button
                disabled={game.players_in_game === 2}
                className="btn btn-primary"
                onClick={() => {
                  joinGame(game.id, userContext.username, router);
                }}
              >
                Join game
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GameList;
