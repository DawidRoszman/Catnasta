import axios from "axios";
import { api } from "./api";
import client from "./mqtt";

export const joinGame = async (
  gameId: string,
  username: string,
  router: any,
) => {
  const response = await axios.put(api + "/join_game", {
    id: gameId,
    name: username,
  });
  if (response.data.id === undefined) {
    alert(response.data.msg);
    return;
  }
  client.publish(
    "catnasta-game",
    JSON.stringify({
      type: "PLAYER_JOINED",
      id: response.data.id,
      name: username,
    }),
  );
  router.push("/game/" + response.data.id);
};
