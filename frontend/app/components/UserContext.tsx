"use client";

import { useCookies } from "next-client-cookies";
import { createContext, useContext, useEffect, useReducer } from "react";
import { api } from "../lib/api";
import axios from "axios";
import { UserActionType, userReducer } from "./userReduces";

interface User {
  username: string;
}

export const UserContext = createContext<User | null>(null);
export const UserDispatchContext = createContext<React.Dispatch<any> | null>(
  null,
);

export const useUserContext = () => {
  return useContext(UserContext);
};

export const useUserDispatch = () => {
  return useContext(UserDispatchContext);
};

const initialUser = {
  username: "",
};

export const UserContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [state, dispatch] = useReducer(userReducer, initialUser);

  const cookies = useCookies();
  useEffect(() => {
    const fetchUser = async () => {
      if (cookies.get("token") !== undefined) {
        try {
          const response = await axios.get(api + "/user", {
            headers: {
              Authorization: "Bearer " + cookies.get("token"),
            },
          });
          const username = response.data;
          if (username.msg !== undefined) {
            alert(username.msg);
            cookies.remove("token");
            dispatch({ type: UserActionType.SET_USERNAME, payload: "" });
            return;
          }
          dispatch({ type: UserActionType.SET_USERNAME, payload: username });
        } catch (error) {
          console.log(error);
          cookies.remove("token");
          dispatch({ type: UserActionType.SET_USERNAME, payload: "" });
        }
      }
    };
    fetchUser();
  }, [cookies.get("token")]);

  return (
    <UserContext.Provider value={state}>
      <UserDispatchContext.Provider value={dispatch}>
        {children}
      </UserDispatchContext.Provider>
    </UserContext.Provider>
  );
};
