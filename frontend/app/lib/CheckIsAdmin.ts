import axios from "axios";
import { api } from "./api";

export const CheckIsAdmin = async (token: string) => {
  try {
    const response = await axios.get(`${api}/user/isAdmin`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = response.data;
    return data.isAdmin;
  } catch (error) {
    console.log(error);
    return false;
  }
};
