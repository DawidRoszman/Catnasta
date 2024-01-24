"use client";
import Link from "next/link";
import React, { FormEvent } from "react";
import { useUserContext, useUserDispatch } from "./UserContext";
import { useCookies } from "next-client-cookies";
import axios from "axios";
import { api } from "../lib/api";

const Auth = () => {
  const userContext = useUserContext();
  const userDispatch = useUserDispatch();
  const cookies = useCookies();
  if (userContext === null || userDispatch === null) {
    return <div>Loading...</div>;
  }
  const handleSignOut = () => {
    cookies.remove("token");
    window.location.reload();
  };
  return (
    <div className="fixed right-0 top-0 flex gap-3 m-4">
      {cookies.get("token") !== undefined ? (
        <div className="flex align-middle text-center gap-3">
          <button
            className="btn btn-outline"
            onClick={() => {
              const modal = document.getElementById(
                "edit_name",
              )! as HTMLDialogElement;
              modal.showModal();
            }}
          >
            {userContext?.username}
          </button>
          <button onClick={() => handleSignOut()} className="btn btn-warning">
            Sign out
          </button>
          <EditName token={cookies.get("token")!} />
        </div>
      ) : (
        <div className="flex gap-3">
          <Link className="btn btn-primary" href="/login">
            Login
          </Link>
          <Link className="btn btn-primary" href="/register">
            Register
          </Link>
        </div>
      )}
    </div>
  );
};

const EditName = ({ token }: { token: string }) => {
  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");

  const handleUpdatePassword = async () => {
    const response = await axios.put(
      api + "/user/edit_password",
      {
        oldPassword: oldPassword,
        newPassword: newPassword,
      },
      {
        headers: {
          Authorization: "Bearer " + token,
        },
      },
    );
    const data = response.data;
    alert(data.msg);
  };
  return (
    <dialog id="edit_name" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Edit your name</h3>
        <label className="label" htmlFor="oldPassword">
          Old password
        </label>
        <input
          id="oldPassword"
          type="password"
          className="input input-primary"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          required
        />
        <label className="label" htmlFor="newPassword">
          New password
        </label>
        <input
          id="newPassword"
          type="password"
          className="input input-primary"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <div className="modal-action">
          <form method="dialog">
            {/* if there is a button in form, it will close the modal */}
            <button className="btn">Close</button>
            <button
              className="btn btn-primary"
              onClick={() => handleUpdatePassword()}
            >
              Save
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
};

export default Auth;
