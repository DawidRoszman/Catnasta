export interface UserState {
  username: string;
}

export enum UserActionType {
  SET_USERNAME = "SET_USERNAME",
}

export interface UserAction {
  type: UserActionType;
  payload: string;
}

export const userReducer = (state: UserState, action: UserAction) => {
  const { type, payload } = action;
  switch (type) {
    case UserActionType.SET_USERNAME:
      return { ...state, username: payload };
    default:
      return state;
  }
};
