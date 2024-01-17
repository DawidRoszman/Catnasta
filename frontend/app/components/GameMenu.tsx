"use client";
import axios from "axios";
import { useCookies } from "next-client-cookies";
import { useRouter } from "next/navigation";
import React from "react";
import client from "../lib/mqtt";

const GameMenu = () => {
  const [gameId, setGameId] = React.useState("");
  const cookies = useCookies();
  const createGame = async () => {
    const response = await axios.post("http://localhost:5000/create_game", {
      name: cookies.get("username"),
    });
    window.location.href = "/game/" + response.data.id;
  };
  const joinGame = async () => {
    const response = await axios.put("http://localhost:5000/join_game", {
      id: gameId,
      name: cookies.get("username"),
    });
    if (response.data.id === undefined) {
      console.log(response.data);
      alert(response.data.msg);
      return;
    }
    client.publish(
      "catnasta-game",
      JSON.stringify({
        type: "PLAYER_JOINED",
        id: response.data.id,
        name: cookies.get("username"),
      }),
    );
    window.location.href = "/game/" + response.data.id;
  };
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await joinGame();
  };

  return (
    <>
      <dialog id="my_modal_1" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Enter code below to join game</h3>
          <form className="p-5" onSubmit={handleSubmit}>
            <input
              className="input input-primary"
              type="text"
              required
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
            />
            <button className="btn btn-primary">Join Game</button>
          </form>
          <div className="modal-action">
            <form method="dialog">
              {/* if there is a button in form, it will close the modal */}
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
      </dialog>
      <button
        className="btn btn-wide btn-outline btn-primary"
        onClick={() => createGame()}
      >
        Create a new game
      </button>

      <div className="divider">OR</div>
      <button
        className="btn btn-wide btn-outline btn-primary"
        onClick={() =>
          (
            document.getElementById("my_modal_1") as HTMLDialogElement
          ).showModal()
        }
      >
        Join an existing game
      </button>
    </>
  );
};

export default GameMenu;
