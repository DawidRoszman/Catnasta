import axios from "axios";
import { api } from "./api";

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
  router.push("/game/" + response.data.id);
};
