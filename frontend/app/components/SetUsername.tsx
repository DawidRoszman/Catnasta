"use client";
import { useCookies } from "next-client-cookies";
import React, { useEffect } from "react";

const SetUsername = () => {
  const [name, setName] = React.useState("");
  const modalRef = React.useRef<HTMLDialogElement>(null);
  const cookies = useCookies();
  useEffect(() => {
    const username = cookies.get("username");
    if (username === undefined) modalRef.current?.showModal();
    else setName(username);
  }, [cookies]);

  const handleClick = () => {
    if (name === "") {
      const username = "User-" + Math.random().toString(36).substr(2, 5);
      cookies.set("username", username);
      setName(username);
      return;
    }
    cookies.set("username", name);
    setName(name);
  };
  return (
    <>
      <div className="fixed top-0 right-0 p-4">
        <button
          className="btn btn-primary tooltip tooltip-bottom"
          data-tip="Edit nickname"
          onClick={() => modalRef.current?.showModal()}
        >
          {name || <div className="loading"></div>}
        </button>
      </div>
      <dialog ref={modalRef} id="setUsername" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">
            Please set your nickname before starting game
          </h3>
          <p className="py-4 text-center">
            <input
              className="input input-bordered"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </p>
          <div className="modal-action">
            <form method="dialog" onSubmit={handleClick}>
              {/* if there is a button in form, it will close the modal */}
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
};

export default SetUsername;
