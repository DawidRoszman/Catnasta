import axios from "axios";
import { api } from "./api";

export const CheckIsAdmin = async (token: string) => {
  const response = axios.get(`${api}/user/isAdmin`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response).data;
  return data.isAdmin;
};
