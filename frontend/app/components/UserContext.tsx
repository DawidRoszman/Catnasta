"use client";

import { useCookies } from "next-client-cookies";
import { createContext, useContext, useEffect, useReducer } from "react";
import { api } from "../lib/api";
import axios from "axios";
import { UserAction, UserActionType, UserState, userReducer } from "./userReduces";
import { useToast } from "./ui/Feedback";

export const UserContext = createContext<UserState | null>(null);
export const UserDispatchContext = createContext<React.Dispatch<UserAction> | null>(
  null,
);

export const useUserContext = () => {
  return useContext(UserContext);
};

export const useUserDispatch = () => {
  return useContext(UserDispatchContext);
};

export const UserContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const cookies = useCookies();
  const toast = useToast();
  const [state, dispatch] = useReducer(userReducer, {
    username: "",
    ready: cookies.get("token") === undefined,
  });

  useEffect(() => {
    const fetchUser = async () => {
      const token = cookies.get("token");
      if (token === undefined) {
        return;
      }
      try {
        const response = await axios.get(api + "/user", {
          headers: {
            Authorization: "Bearer " + token,
          },
        });
        const username = response.data;
        if (username.msg !== undefined) {
          toast(username.msg, { tone: "error" });
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
    };
    fetchUser();
  }, [cookies, toast]);

  return (
    <UserContext.Provider value={state}>
      <UserDispatchContext.Provider value={dispatch}>
        {children}
      </UserDispatchContext.Provider>
    </UserContext.Provider>
  );
};
