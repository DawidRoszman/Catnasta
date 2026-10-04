export interface UserState {
  username: string;
  /** False until we know whether the stored token belongs to a user. */
  ready: boolean;
}

export enum UserActionType {
  SET_USERNAME = "SET_USERNAME",
}

export interface UserAction {
  type: UserActionType;
  payload: string;
}

export const userReducer = (state: UserState, action: UserAction): UserState => {
  const { type, payload } = action;
  switch (type) {
    case UserActionType.SET_USERNAME:
      return { ...state, username: payload, ready: true };
    default:
      return state;
  }
};
