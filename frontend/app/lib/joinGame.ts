import axios from "axios";
import { api } from "./api";

/** Joins a table and returns its id, or an error message to show. */
export const joinGame = async (
  gameId: string,
  username: string,
): Promise<{ id: string } | { error: string }> => {
  try {
    const response = await axios.put(api + "/join_game", {
      id: gameId.trim(),
      name: username,
    });
    if (response.data.id === undefined) {
      return { error: response.data.msg ?? "Couldn't join that table." };
    }
    return { id: response.data.id };
  } catch {
    return { error: "We couldn't reach the server. Try again in a moment." };
  }
};

export const createGame = async (
  username: string,
): Promise<{ id: string } | { error: string }> => {
  try {
    const response = await axios.post(api + "/create_game", { name: username });
    if (response.data.id === undefined) {
      return { error: response.data.msg ?? "Couldn't create a table." };
    }
    return { id: response.data.id };
  } catch {
    return { error: "We couldn't reach the server. Try again in a moment." };
  }
};
